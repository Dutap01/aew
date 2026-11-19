package com.example.webapp.service;

import static com.example.webapp.jooq.Tables.CONSULT_APPOINTMENTS;
import static com.example.webapp.jooq.Tables.INQUIRIES;
import static com.example.webapp.jooq.Tables.STUDENTS;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.jooq.DSLContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.webapp.dto.appointment.AppointmentCreateRequest;
import com.example.webapp.dto.appointment.AppointmentResponse;
import com.example.webapp.dto.appointment.AppointmentUpdateRequest;
import com.example.webapp.dto.appointment.StaffOption;
import com.example.webapp.jooq.enums.AppointmentStatus;
import com.example.webapp.jooq.enums.InquiryStatus;
import com.example.webapp.jooq.enums.InquiryType;
import com.example.webapp.repository.AppointmentRepository;

/**
 * 상담 달력.
 * 접수와 연결된 일정은 접수 상태를 함께 바꾼다:
 *   일정 등록 → 접수 예약확정 / 일정 완료 → 접수 완료 / 일정 취소·불참(남은 예약 없음) → 접수 연락완료
 */
@Service
public class AppointmentService {

    static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");
    static final Duration MAX_LENGTH = Duration.ofHours(4);
    static final Duration MAX_RANGE = Duration.ofDays(62);
    private static final DateTimeFormatter HM = DateTimeFormatter.ofPattern("M/d HH:mm");

    private final DSLContext dsl;
    private final AppointmentRepository appointments;
    private final InquiryService inquiryService;
    private final AuditService audit;

    public AppointmentService(DSLContext dsl, AppointmentRepository appointments, InquiryService inquiryService,
            AuditService audit) {
        this.dsl = dsl;
        this.appointments = appointments;
        this.inquiryService = inquiryService;
        this.audit = audit;
    }

    @Transactional(readOnly = true)
    public List<AppointmentResponse> range(OffsetDateTime from, OffsetDateTime to, UUID counselorId) {
        if (!to.isAfter(from)) throw new ConflictException("조회 기간이 올바르지 않습니다.");
        if (Duration.between(from, to).compareTo(MAX_RANGE) > 0) throw new ConflictException("한 번에 62일까지 조회할 수 있습니다.");
        return appointments.findInRange(from, to, counselorId);
    }

    @Transactional(readOnly = true)
    public List<StaffOption> counselors() {
        return appointments.counselors();
    }

    @Transactional
    public AppointmentResponse create(AppointmentCreateRequest req, UUID actorId) {
        checkTimes(req.startsAt(), req.endsAt());
        UUID counselorId = req.counselorId() != null ? req.counselorId() : actorId;
        checkCounselor(counselorId);
        checkOverlap(counselorId, req.startsAt(), req.endsAt(), null);

        InquiryType kind = req.kind();
        UUID studentId = req.studentId();
        String title = blankToNull(req.title());
        if (req.inquiryId() != null) {
            var inquiry = dsl.selectFrom(INQUIRIES).where(INQUIRIES.ID.eq(req.inquiryId())).fetchOptional()
                    .orElseThrow(() -> new NotFoundException("접수를 찾을 수 없습니다."));
            if (inquiry.getStatus() == InquiryStatus.completed || inquiry.getStatus() == InquiryStatus.canceled) {
                throw new ConflictException("완료되었거나 취소된 접수에는 일정을 잡을 수 없습니다.");
            }
            kind = kind != null ? kind : inquiry.getType();
            studentId = studentId != null ? studentId : inquiry.getStudentId();
            if (title == null) {
                title = inquiry.getStudentName() + (kind == InquiryType.level_test ? " 레벨테스트" : " 상담");
            }
        }
        if (kind == null) throw new ConflictException("일정 종류를 선택하세요.");
        if (title == null && studentId != null) {
            String name = dsl.select(STUDENTS.NAME).from(STUDENTS).where(STUDENTS.ID.eq(studentId)).fetchOne(STUDENTS.NAME);
            if (name == null) throw new NotFoundException("학생을 찾을 수 없습니다.");
            title = name + (kind == InquiryType.level_test ? " 레벨테스트" : " 상담");
        }
        if (title == null) throw new ConflictException("제목을 입력하세요.");

        UUID id = dsl.insertInto(CONSULT_APPOINTMENTS)
                .set(CONSULT_APPOINTMENTS.KIND, kind)
                .set(CONSULT_APPOINTMENTS.INQUIRY_ID, req.inquiryId())
                .set(CONSULT_APPOINTMENTS.STUDENT_ID, studentId)
                .set(CONSULT_APPOINTMENTS.COUNSELOR_ID, counselorId)
                .set(CONSULT_APPOINTMENTS.TITLE, title)
                .set(CONSULT_APPOINTMENTS.STARTS_AT, req.startsAt())
                .set(CONSULT_APPOINTMENTS.ENDS_AT, req.endsAt())
                .set(CONSULT_APPOINTMENTS.MEMO, blankToNull(req.memo()))
                .set(CONSULT_APPOINTMENTS.CREATED_BY, actorId)
                .returning(CONSULT_APPOINTMENTS.ID).fetchOne(CONSULT_APPOINTMENTS.ID);
        audit.record(actorId, "create", "consult_appointments", id, null,
                Map.of("startsAt", req.startsAt().toString(), "title", title));

        if (req.inquiryId() != null) {
            moveInquiry(req.inquiryId(), InquiryStatus.scheduled, actorId);
        }
        return find(id);
    }

    @Transactional
    public AppointmentResponse update(UUID id, AppointmentUpdateRequest req, UUID actorId) {
        var a = appointments.lockById(id).orElseThrow(AppointmentService::notFound);
        if (a.getStatus() != AppointmentStatus.scheduled) {
            throw new ConflictException("예약 상태인 일정만 변경할 수 있습니다.");
        }
        checkTimes(req.startsAt(), req.endsAt());
        UUID counselorId = req.counselorId() != null ? req.counselorId() : a.getCounselorId();
        checkCounselor(counselorId);
        checkOverlap(counselorId, req.startsAt(), req.endsAt(), id);

        var before = Map.of("startsAt", a.getStartsAt().toString(), "endsAt", a.getEndsAt().toString());
        a.setTitle(req.title().trim());
        a.setStartsAt(req.startsAt());
        a.setEndsAt(req.endsAt());
        a.setCounselorId(counselorId);
        a.setMemo(blankToNull(req.memo()));
        a.setUpdatedAt(OffsetDateTime.now());
        a.store();
        audit.record(actorId, "update", "consult_appointments", id, before,
                Map.of("startsAt", req.startsAt().toString(), "endsAt", req.endsAt().toString()));
        return find(id);
    }

    @Transactional
    public AppointmentResponse changeStatus(UUID id, AppointmentStatus to, UUID actorId) {
        var a = appointments.lockById(id).orElseThrow(AppointmentService::notFound);
        AppointmentStatus from = a.getStatus();
        if (from == to) return find(id);
        // 완료·취소·불참은 예약에서만, 되돌리기(→ 예약)는 시간이 겹치지 않을 때만
        if (to == AppointmentStatus.scheduled) {
            checkOverlap(a.getCounselorId(), a.getStartsAt(), a.getEndsAt(), id);
        } else if (from != AppointmentStatus.scheduled) {
            throw new ConflictException("예약 상태인 일정만 완료·취소·불참으로 바꿀 수 있습니다.");
        }
        a.setStatus(to);
        a.setUpdatedAt(OffsetDateTime.now());
        a.store();
        audit.record(actorId, "status_change", "consult_appointments", id, Map.of("status", from), Map.of("status", to));

        if (a.getInquiryId() != null) {
            switch (to) {
                case done -> {
                    // 같은 접수에 예약이 더 남아 있으면 접수는 예약확정 그대로
                    if (!appointments.hasOtherScheduled(a.getInquiryId(), id)) {
                        moveInquiry(a.getInquiryId(), InquiryStatus.completed, actorId);
                    }
                }
                case scheduled -> moveInquiry(a.getInquiryId(), InquiryStatus.scheduled, actorId);
                case canceled, no_show -> {
                    if (!appointments.hasOtherScheduled(a.getInquiryId(), id)) {
                        moveInquiry(a.getInquiryId(), InquiryStatus.contacted, actorId);
                    }
                }
            }
        }
        return find(id);
    }

    /** 접수 상태를 규칙이 허용할 때만 바꾼다 (이미 그 상태거나 허용되지 않으면 그대로 둔다) */
    private void moveInquiry(UUID inquiryId, InquiryStatus to, UUID actorId) {
        InquiryStatus current = dsl.select(INQUIRIES.STATUS).from(INQUIRIES).where(INQUIRIES.ID.eq(inquiryId))
                .fetchOne(INQUIRIES.STATUS);
        if (current != null && current != to && InquiryService.TRANSITIONS.get(current).contains(to)) {
            inquiryService.changeStatus(inquiryId, to, actorId);
        }
    }

    private void checkTimes(OffsetDateTime start, OffsetDateTime end) {
        if (!end.isAfter(start)) throw new ConflictException("끝 시각은 시작 시각보다 뒤여야 합니다.");
        if (Duration.between(start, end).compareTo(MAX_LENGTH) > 0) throw new ConflictException("일정은 4시간을 넘을 수 없습니다.");
    }

    private void checkCounselor(UUID counselorId) {
        if (!appointments.isCounselor(counselorId)) throw new ConflictException("담당자는 대표 또는 상담실장이어야 합니다.");
    }

    private void checkOverlap(UUID counselorId, OffsetDateTime start, OffsetDateTime end, UUID exceptId) {
        appointments.findOverlap(counselorId, start, end, exceptId).ifPresent(o -> {
            throw new ConflictException("같은 담당자의 다른 일정과 시간이 겹칩니다: " + o.title() + " ("
                    + o.startsAt().atZoneSameInstant(SEOUL).format(HM) + "~"
                    + o.endsAt().atZoneSameInstant(SEOUL).toLocalTime() + ")");
        });
    }

    private AppointmentResponse find(UUID id) {
        return appointments.findResponse(id).orElseThrow(AppointmentService::notFound);
    }

    private static NotFoundException notFound() {
        return new NotFoundException("일정을 찾을 수 없습니다.");
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
