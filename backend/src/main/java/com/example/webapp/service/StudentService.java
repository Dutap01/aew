package com.example.webapp.service;

import static com.example.webapp.jooq.Tables.CONSULT_NOTES;
import static com.example.webapp.jooq.Tables.ENROLLMENTS;
import static com.example.webapp.jooq.Tables.STUDENTS;
import static org.jooq.impl.DSL.greatest;
import static org.jooq.impl.DSL.val;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import org.jooq.DSLContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.webapp.dto.PageResponse;
import com.example.webapp.dto.StudentSummary;
import com.example.webapp.dto.student.StudentDetail;
import com.example.webapp.dto.student.StudentUpsertRequest;
import com.example.webapp.jooq.enums.StudentStatus;
import com.example.webapp.jooq.tables.records.StudentsRecord;
import com.example.webapp.repository.ClassRepository;
import com.example.webapp.repository.StudentRepository;

/**
 * 학생 관리 (대표·상담실장).
 * 반 소속(enrollments) 추가·종료는 반 배정이라 대표만 한다 (SecurityConfig).
 * 상태 규칙:
 *   반에 넣으면 재원이 된다 / 퇴원으로 바꾸면 지금 반 소속을 오늘 날짜로 모두 종료한다.
 */
@Service
public class StudentService {

    public static final int MAX_PAGE_SIZE = 100;
    static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");

    private final DSLContext dsl;
    private final StudentRepository students;
    private final ClassRepository classes;
    private final AuditService audit;

    public StudentService(DSLContext dsl, StudentRepository students, ClassRepository classes, AuditService audit) {
        this.dsl = dsl;
        this.students = students;
        this.classes = classes;
        this.audit = audit;
    }

    /** 대표·상담실장용 학생 검색 (전체 학생, 연락처 포함) */
    @Transactional(readOnly = true)
    public PageResponse<StudentSummary> search(String q, StudentStatus status, int page, int size) {
        int safeSize = Math.clamp(size, 1, MAX_PAGE_SIZE);
        int safePage = Math.max(page, 0);
        var condition = StudentRepository.searchCondition(q, status);
        long total = students.count(condition);
        var items = students.find(condition, safePage * safeSize, safeSize);
        return new PageResponse<>(items, total, safePage, safeSize);
    }

    @Transactional(readOnly = true)
    public StudentDetail detail(UUID id) {
        return toDetail(students.findById(id).orElseThrow(StudentService::notFound));
    }

    @Transactional
    public StudentDetail create(StudentUpsertRequest req, UUID actorId) {
        StudentStatus status = req.status() != null ? req.status() : StudentStatus.consulting;
        if (status == StudentStatus.enrolled || status == StudentStatus.paused) {
            throw new ConflictException("재원·휴원 상태는 반에 넣으면서 정합니다. 상담중·테스트예정으로 등록하세요.");
        }
        UUID id = dsl.insertInto(STUDENTS)
                .set(STUDENTS.NAME, req.name().trim())
                .set(STUDENTS.SCHOOL, blankToNull(req.school()))
                .set(STUDENTS.GRADE, blankToNull(req.grade()))
                .set(STUDENTS.PARENT_NAME, blankToNull(req.parentName()))
                .set(STUDENTS.PARENT_PHONE, phoneOrNull(req.parentPhone()))
                .set(STUDENTS.STATUS, status)
                .set(STUDENTS.MEMO, blankToNull(req.memo()))
                .returning(STUDENTS.ID).fetchOne(STUDENTS.ID);
        audit.record(actorId, "create", "students", id, null, Map.of("name", req.name().trim(), "status", status));
        return detail(id);
    }

    @Transactional
    public StudentDetail update(UUID id, StudentUpsertRequest req, UUID actorId) {
        StudentsRecord s = students.lockById(id).orElseThrow(StudentService::notFound);
        StudentStatus from = s.getStatus();
        StudentStatus to = req.status() != null ? req.status() : from;

        Map<String, Object> before = new HashMap<>();
        before.put("name", s.getName());
        before.put("school", s.getSchool());
        before.put("grade", s.getGrade());
        before.put("parentName", s.getParentName());
        before.put("parentPhone", s.getParentPhone());

        s.setName(req.name().trim());
        s.setSchool(blankToNull(req.school()));
        s.setGrade(blankToNull(req.grade()));
        s.setParentName(blankToNull(req.parentName()));
        s.setParentPhone(phoneOrNull(req.parentPhone()));
        s.setMemo(blankToNull(req.memo()));
        s.setUpdatedAt(OffsetDateTime.now());
        s.store();
        audit.record(actorId, "update", "students", id, before, Map.of("name", s.getName()));

        if (to != from) {
            changeStatus(s, from, to, actorId);
        }
        return toDetail(s);
    }

    /** 상담 기록 (접수와 상관없이 학생에 직접) */
    @Transactional
    public StudentDetail addNote(UUID id, String content, UUID actorId) {
        StudentsRecord s = students.findById(id).orElseThrow(StudentService::notFound);
        dsl.insertInto(CONSULT_NOTES)
                .set(CONSULT_NOTES.STUDENT_ID, id)
                .set(CONSULT_NOTES.AUTHOR_ID, actorId)
                .set(CONSULT_NOTES.CONTENT, content.trim())
                .execute();
        return toDetail(s);
    }

    /** 반에 넣기 (대표). 정원·운영 여부·중복 소속을 확인하고, 학생은 재원이 된다 */
    @Transactional
    public StudentDetail enroll(UUID id, UUID classId, LocalDate startDate, UUID actorId) {
        StudentsRecord s = students.lockById(id).orElseThrow(StudentService::notFound);
        var c = classes.lockById(classId).orElseThrow(() -> new NotFoundException("반을 찾을 수 없습니다."));
        if (!c.getActive()) {
            throw new ConflictException("운영 종료한 반에는 넣을 수 없습니다.");
        }
        if (dsl.fetchExists(ENROLLMENTS, ENROLLMENTS.STUDENT_ID.eq(id).and(ENROLLMENTS.CLASS_ID.eq(classId))
                .and(ENROLLMENTS.END_DATE.isNull()))) {
            throw new ConflictException("이미 '" + c.getName() + "' 반 학생입니다.");
        }
        int current = classes.currentStudentCount(classId);
        if (c.getCapacity() != null && current >= c.getCapacity()) {
            throw new ConflictException("'" + c.getName() + "' 반 정원(" + c.getCapacity() + "명)이 찼습니다.");
        }
        LocalDate start = startDate != null ? startDate : LocalDate.now(SEOUL);
        UUID enrollmentId = dsl.insertInto(ENROLLMENTS)
                .set(ENROLLMENTS.STUDENT_ID, id)
                .set(ENROLLMENTS.CLASS_ID, classId)
                .set(ENROLLMENTS.START_DATE, start)
                .set(ENROLLMENTS.CREATED_BY, actorId)
                .returning(ENROLLMENTS.ID).fetchOne(ENROLLMENTS.ID);
        audit.record(actorId, "create", "enrollments", enrollmentId, null,
                Map.of("studentId", id, "classId", classId, "startDate", start.toString()));
        if (s.getStatus() != StudentStatus.enrolled) {
            changeStatus(s, s.getStatus(), StudentStatus.enrolled, actorId);
        }
        return toDetail(s);
    }

    /** 반 소속 종료 (대표). 학생 상태는 그대로 둔다 (반 이동일 수 있음) */
    @Transactional
    public StudentDetail endEnrollment(UUID id, UUID enrollmentId, LocalDate endDate, UUID actorId) {
        StudentsRecord s = students.findById(id).orElseThrow(StudentService::notFound);
        var e = dsl.selectFrom(ENROLLMENTS).where(ENROLLMENTS.ID.eq(enrollmentId).and(ENROLLMENTS.STUDENT_ID.eq(id)))
                .forUpdate().fetchOptional()
                .orElseThrow(() -> new NotFoundException("반 소속을 찾을 수 없습니다."));
        if (e.getEndDate() != null) {
            throw new ConflictException("이미 종료된 반 소속입니다.");
        }
        LocalDate end = endDate != null ? endDate : LocalDate.now(SEOUL);
        if (end.isBefore(e.getStartDate())) {
            throw new ConflictException("종료일은 시작일(" + e.getStartDate() + ") 이후여야 합니다.");
        }
        e.setEndDate(end);
        e.store();
        audit.record(actorId, "end", "enrollments", enrollmentId, null, Map.of("endDate", end.toString()));
        return toDetail(s);
    }

    private void changeStatus(StudentsRecord s, StudentStatus from, StudentStatus to, UUID actorId) {
        if (to == StudentStatus.enrolled && !hasCurrentClass(s.getId())) {
            throw new ConflictException("재원은 반에 넣으면 자동으로 바뀝니다. '반에 넣기'를 쓰세요.");
        }
        if (to == StudentStatus.withdrawn) {
            LocalDate today = LocalDate.now(SEOUL);
            // 오늘 시작한 소속도 있을 수 있으니 종료일은 시작일보다 앞서지 않게
            int ended = dsl.update(ENROLLMENTS)
                    .set(ENROLLMENTS.END_DATE, greatest(val(today), ENROLLMENTS.START_DATE))
                    .where(ENROLLMENTS.STUDENT_ID.eq(s.getId()).and(ENROLLMENTS.END_DATE.isNull()))
                    .execute();
            if (ended > 0) {
                audit.record(actorId, "end_with_withdraw", "enrollments", s.getId(), null, Map.of("count", ended));
            }
        }
        s.setStatus(to);
        s.setUpdatedAt(OffsetDateTime.now());
        s.store();
        audit.record(actorId, "status_change", "students", s.getId(), Map.of("status", from), Map.of("status", to));
    }

    private boolean hasCurrentClass(UUID studentId) {
        return dsl.fetchExists(ENROLLMENTS, ENROLLMENTS.STUDENT_ID.eq(studentId).and(ENROLLMENTS.END_DATE.isNull()));
    }

    private StudentDetail toDetail(StudentsRecord s) {
        var schedules = classes.schedules(students.enrolledClassIds(s.getId()));
        return new StudentDetail(s.getId(), s.getStudentCode(), s.getName(), s.getSchool(), s.getGrade(),
                s.getParentName(), s.getParentPhone(), s.getStatus(), s.getMemo(),
                students.loginId(s.getProfileId()).orElse(null), s.getCreatedAt(), s.getUpdatedAt(),
                students.enrollments(s.getId(), schedules),
                students.timeline(s, SEOUL));
    }

    private static String phoneOrNull(String phone) {
        return phone == null || phone.isBlank() ? null : InquiryService.normalizePhone(phone);
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }

    private static NotFoundException notFound() {
        return new NotFoundException("학생을 찾을 수 없습니다.");
    }
}
