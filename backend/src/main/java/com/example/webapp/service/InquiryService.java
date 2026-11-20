package com.example.webapp.service;

import static com.example.webapp.jooq.Tables.CONSULT_NOTES;
import static com.example.webapp.jooq.Tables.INQUIRIES;
import static com.example.webapp.jooq.Tables.STUDENTS;

import java.time.OffsetDateTime;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import org.jooq.DSLContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.webapp.dto.PageResponse;
import com.example.webapp.dto.inquiry.InquiryCounts;
import com.example.webapp.dto.inquiry.InquiryCreateRequest;
import com.example.webapp.dto.inquiry.InquiryDetail;
import com.example.webapp.dto.inquiry.InquirySummary;
import com.example.webapp.jooq.enums.InquiryStatus;
import com.example.webapp.jooq.enums.InquiryType;
import com.example.webapp.jooq.enums.StudentStatus;
import com.example.webapp.jooq.tables.records.InquiriesRecord;
import com.example.webapp.notification.NotificationService;
import com.example.webapp.notification.NotificationTemplate;
import com.example.webapp.repository.AppointmentRepository;
import com.example.webapp.repository.InquiryRepository;

/**
 * 상담·레벨테스트 접수.
 * 상태 흐름: 접수 → 연락완료 → 예약확정 → 완료 (어느 단계에서든 취소, 취소는 다시 접수로 되돌릴 수 있음)
 */
@Service
public class InquiryService {

    /** 지금 상태 → 바꿀 수 있는 상태 */
    static final Map<InquiryStatus, List<InquiryStatus>> TRANSITIONS = new EnumMap<>(Map.of(
            InquiryStatus.received, List.of(InquiryStatus.contacted, InquiryStatus.scheduled, InquiryStatus.canceled),
            InquiryStatus.contacted, List.of(InquiryStatus.scheduled, InquiryStatus.canceled),
            InquiryStatus.scheduled, List.of(InquiryStatus.completed, InquiryStatus.contacted, InquiryStatus.canceled),
            InquiryStatus.completed, List.of(),
            InquiryStatus.canceled, List.of(InquiryStatus.received)));

    private static final Set<StudentStatus> PRE_ENROLL = Set.of(StudentStatus.consulting, StudentStatus.test_scheduled);

    private final DSLContext dsl;
    private final InquiryRepository inquiries;
    private final AppointmentRepository appointments;
    private final AuditService audit;
    private final NotificationService notifications;

    public InquiryService(DSLContext dsl, InquiryRepository inquiries, AppointmentRepository appointments, AuditService audit,
            NotificationService notifications) {
        this.dsl = dsl;
        this.inquiries = inquiries;
        this.appointments = appointments;
        this.audit = audit;
        this.notifications = notifications;
    }

    /** 공개 신청서 접수 (로그인 없음) */
    @Transactional
    public UUID create(InquiryCreateRequest req) {
        return dsl.insertInto(INQUIRIES)
                .set(INQUIRIES.TYPE, req.type())
                .set(INQUIRIES.APPLICANT_NAME, req.applicantName().trim())
                .set(INQUIRIES.APPLICANT_PHONE, normalizePhone(req.applicantPhone()))
                .set(INQUIRIES.STUDENT_NAME, req.studentName().trim())
                .set(INQUIRIES.SCHOOL, blankToNull(req.school()))
                .set(INQUIRIES.GRADE, blankToNull(req.grade()))
                .set(INQUIRIES.PREFERRED_SLOTS, inquiries.toJson(req.preferredSlots()))
                .set(INQUIRIES.MESSAGE, blankToNull(req.message()))
                .set(INQUIRIES.PRIVACY_AGREED, true)
                .returning(INQUIRIES.ID)
                .fetchOne(INQUIRIES.ID);
    }

    @Transactional(readOnly = true)
    public PageResponse<InquirySummary> search(String q, InquiryStatus status, InquiryType type, int page, int size) {
        int safeSize = Math.clamp(size, 1, StudentService.MAX_PAGE_SIZE);
        int safePage = Math.max(page, 0);
        var condition = InquiryRepository.searchCondition(q, status, type);
        var items = inquiries.find(condition, safePage * safeSize, safeSize).stream().map(this::summary).toList();
        return new PageResponse<>(items, inquiries.count(condition), safePage, safeSize);
    }

    @Transactional(readOnly = true)
    public InquiryCounts counts(String q, InquiryType type) {
        var map = inquiries.countByStatus(InquiryRepository.searchCondition(q, null, type));
        return new InquiryCounts(
                map.getOrDefault(InquiryStatus.received, 0), map.getOrDefault(InquiryStatus.contacted, 0),
                map.getOrDefault(InquiryStatus.scheduled, 0), map.getOrDefault(InquiryStatus.completed, 0),
                map.getOrDefault(InquiryStatus.canceled, 0));
    }

    @Transactional(readOnly = true)
    public InquiryDetail detail(UUID id) {
        return toDetail(inquiries.findById(id).orElseThrow(() -> notFound()));
    }

    @Transactional
    public InquiryDetail changeStatus(UUID id, InquiryStatus to, UUID actorId) {
        InquiriesRecord inquiry = inquiries.lockById(id).orElseThrow(() -> notFound());
        InquiryStatus from = inquiry.getStatus();
        if (from == to) {
            return toDetail(inquiry);
        }
        if (!TRANSITIONS.get(from).contains(to)) {
            throw new ConflictException("'" + label(from) + "' 상태에서 '" + label(to) + "'(으)로 바꿀 수 없습니다.");
        }
        // 접수 상태와 상담 달력이 어긋나지 않게: 예약확정은 일정이 있어야 하고, 예약이 남아 있으면 되돌리거나 완료할 수 없다
        boolean hasScheduled = appointments.hasScheduled(id);
        if (to == InquiryStatus.scheduled && !hasScheduled) {
            throw new ConflictException("예약확정은 일정을 잡으면 자동으로 바뀝니다. '일정 잡기'로 상담 달력에 일정을 넣으세요.");
        }
        if ((to == InquiryStatus.contacted || to == InquiryStatus.completed) && hasScheduled) {
            throw new ConflictException(to == InquiryStatus.completed
                    ? "예약된 일정이 있습니다. 일정을 완료 처리하면 접수도 완료됩니다."
                    : "예약된 일정이 있습니다. 일정을 취소하면 연락완료로 돌아갑니다.");
        }
        if (to == InquiryStatus.canceled && hasScheduled) {
            var canceled = appointments.cancelScheduled(id);
            audit.record(actorId, "cancel_with_inquiry", "consult_appointments", id, null, Map.of("count", canceled.size()));
            String eventKey = OffsetDateTime.now().toInstant().toString();
            canceled.forEach(a -> notifications.enqueueForAppointment(a, NotificationTemplate.APPOINTMENT_CANCELED, eventKey));
        }
        inquiry.setStatus(to);
        inquiry.setUpdatedAt(OffsetDateTime.now());
        inquiry.store();
        audit.record(actorId, "status_change", "inquiries", id, Map.of("status", from), Map.of("status", to));
        return toDetail(inquiry);
    }

    @Transactional
    public InquiryDetail addNote(UUID id, String content, UUID actorId) {
        InquiriesRecord inquiry = inquiries.findById(id).orElseThrow(() -> notFound());
        dsl.insertInto(CONSULT_NOTES)
                .set(CONSULT_NOTES.INQUIRY_ID, id)
                .set(CONSULT_NOTES.STUDENT_ID, inquiry.getStudentId())
                .set(CONSULT_NOTES.AUTHOR_ID, actorId)
                .set(CONSULT_NOTES.CONTENT, content.trim())
                .execute();
        return toDetail(inquiry);
    }

    /**
     * 접수에 학생 연결. existingStudentId 가 없으면 신청 내용으로 새 학생을 만든다
     * (상태: 상담 접수 → 상담중, 레벨테스트 접수 → 테스트예정).
     * 이미 쓴 상담 기록도 학생에 연결해 학생 타임라인에 보이게 한다.
     */
    @Transactional
    public InquiryDetail linkStudent(UUID id, UUID existingStudentId, UUID actorId) {
        InquiriesRecord inquiry = inquiries.lockById(id).orElseThrow(() -> notFound());
        if (inquiry.getStudentId() != null) {
            throw new ConflictException("이미 학생이 연결된 접수입니다.");
        }
        UUID studentId;
        if (existingStudentId != null) {
            var student = dsl.selectFrom(STUDENTS).where(STUDENTS.ID.eq(existingStudentId)).fetchOptional()
                    .orElseThrow(() -> new NotFoundException("학생을 찾을 수 없습니다."));
            studentId = student.getId();
            // 아직 등록 전 학생이 레벨테스트를 신청했으면 테스트예정으로
            if (inquiry.getType() == InquiryType.level_test && PRE_ENROLL.contains(student.getStatus())) {
                student.setStatus(StudentStatus.test_scheduled);
                student.setUpdatedAt(OffsetDateTime.now());
                student.store();
            }
        } else {
            studentId = dsl.insertInto(STUDENTS)
                    .set(STUDENTS.NAME, inquiry.getStudentName())
                    .set(STUDENTS.SCHOOL, inquiry.getSchool())
                    .set(STUDENTS.GRADE, inquiry.getGrade())
                    .set(STUDENTS.PARENT_NAME, inquiry.getApplicantName())
                    .set(STUDENTS.PARENT_PHONE, inquiry.getApplicantPhone())
                    .set(STUDENTS.STATUS, inquiry.getType() == InquiryType.level_test
                            ? StudentStatus.test_scheduled : StudentStatus.consulting)
                    .returning(STUDENTS.ID).fetchOne(STUDENTS.ID);
            audit.record(actorId, "create_from_inquiry", "students", studentId, null, Map.of("inquiryId", id));
        }
        inquiry.setStudentId(studentId);
        inquiry.setUpdatedAt(OffsetDateTime.now());
        inquiry.store();
        dsl.update(CONSULT_NOTES).set(CONSULT_NOTES.STUDENT_ID, studentId)
                .where(CONSULT_NOTES.INQUIRY_ID.eq(id)).and(CONSULT_NOTES.STUDENT_ID.isNull()).execute();
        audit.record(actorId, "link_student", "inquiries", id, null, Map.of("studentId", studentId));
        return toDetail(inquiry);
    }

    private InquirySummary summary(InquiriesRecord r) {
        return new InquirySummary(r.getId(), r.getType(), r.getStatus(), r.getApplicantName(), r.getApplicantPhone(),
                r.getStudentName(), r.getSchool(), r.getGrade(), inquiries.slots(r.getPreferredSlots()),
                r.getStudentId(), r.getCreatedAt());
    }

    private InquiryDetail toDetail(InquiriesRecord r) {
        var student = r.getStudentId() == null ? null : inquiries.student(r.getStudentId()).orElse(null);
        return new InquiryDetail(r.getId(), r.getType(), r.getStatus(), r.getApplicantName(), r.getApplicantPhone(),
                r.getStudentName(), r.getSchool(), r.getGrade(), inquiries.slots(r.getPreferredSlots()), r.getMessage(),
                r.getCreatedAt(), r.getUpdatedAt(), TRANSITIONS.get(r.getStatus()), student,
                student == null ? inquiries.similarStudents(r) : List.of(),
                inquiries.notes(r.getId()),
                appointments.findByInquiry(r.getId()));
    }

    /** 01012345678 / 010-1234-5678 → 010-1234-5678 */
    static String normalizePhone(String phone) {
        String d = phone.replaceAll("\\D", "");
        return d.length() == 11 ? d.substring(0, 3) + "-" + d.substring(3, 7) + "-" + d.substring(7)
                : d.substring(0, 3) + "-" + d.substring(3, 6) + "-" + d.substring(6);
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }

    private static NotFoundException notFound() {
        return new NotFoundException("접수를 찾을 수 없습니다.");
    }

    private static String label(InquiryStatus s) {
        return switch (s) {
            case received -> "접수";
            case contacted -> "연락완료";
            case scheduled -> "예약확정";
            case completed -> "완료";
            case canceled -> "취소";
        };
    }
}
