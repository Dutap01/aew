package com.example.webapp.repository;

import static com.example.webapp.jooq.Tables.AUDIT_LOGS;
import static com.example.webapp.jooq.Tables.CLASSES;
import static com.example.webapp.jooq.Tables.CONSULT_APPOINTMENTS;
import static com.example.webapp.jooq.Tables.CONSULT_NOTES;
import static com.example.webapp.jooq.Tables.ENROLLMENTS;
import static com.example.webapp.jooq.Tables.INQUIRIES;
import static com.example.webapp.jooq.Tables.PROFILES;
import static com.example.webapp.jooq.Tables.STUDENTS;
import static org.jooq.impl.DSL.arrayAgg;
import static org.jooq.impl.DSL.field;
import static org.jooq.impl.DSL.noCondition;
import static org.jooq.impl.DSL.regexpReplaceAll;
import static org.jooq.impl.DSL.select;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.jooq.Condition;
import org.jooq.DSLContext;
import org.jooq.Field;
import org.springframework.stereotype.Repository;

import com.example.webapp.dto.StudentSummary;
import com.example.webapp.dto.classes.ClassScheduleSlot;
import com.example.webapp.dto.student.StudentDetail;
import com.example.webapp.dto.student.StudentDetail.TimelineEvent;
import com.example.webapp.dto.student.StudentDetail.TimelineKind;
import com.example.webapp.jooq.enums.AppointmentStatus;
import com.example.webapp.jooq.enums.InquiryType;
import com.example.webapp.jooq.enums.StudentStatus;
import com.example.webapp.jooq.tables.records.StudentsRecord;

@Repository
public class StudentRepository {

    private final DSLContext dsl;

    public StudentRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    /**
     * 검색 조건.
     * q: 이름·학생 코드·학교 부분 일치 (대소문자 무시). 숫자 4자리 이상이면 학부모 연락처(숫자만 비교)도 찾는다.
     *    "12" 처럼 숫자만 넣으면 학생 코드 S-0012 도 찾는다.
     */
    public static Condition searchCondition(String q, StudentStatus status) {
        Condition c = noCondition();
        if (status != null) {
            c = c.and(STUDENTS.STATUS.eq(status));
        }
        if (q != null && !q.isBlank()) {
            String term = q.trim();
            Condition text = STUDENTS.NAME.containsIgnoreCase(term)
                    .or(STUDENTS.STUDENT_CODE.containsIgnoreCase(term))
                    .or(STUDENTS.SCHOOL.containsIgnoreCase(term));
            String digits = term.replaceAll("\\D", "");
            if (digits.length() >= 4) {
                text = text.or(regexpReplaceAll(STUDENTS.PARENT_PHONE, "\\D", "").contains(digits));
            }
            c = c.and(text);
        }
        return c;
    }

    public long count(Condition condition) {
        return dsl.fetchCount(STUDENTS, condition);
    }

    public List<StudentSummary> find(Condition condition, int offset, int limit) {
        // 현재 소속 반 이름 (이름순)
        Field<String[]> classes = field(
                select(arrayAgg(CLASSES.NAME).orderBy(CLASSES.NAME))
                        .from(ENROLLMENTS).join(CLASSES).on(CLASSES.ID.eq(ENROLLMENTS.CLASS_ID))
                        .where(ENROLLMENTS.STUDENT_ID.eq(STUDENTS.ID).and(ENROLLMENTS.END_DATE.isNull())))
                .as("classes");

        return dsl.select(STUDENTS.ID, STUDENTS.STUDENT_CODE, STUDENTS.NAME, STUDENTS.SCHOOL, STUDENTS.GRADE,
                        STUDENTS.STATUS, STUDENTS.PARENT_PHONE, classes)
                .from(STUDENTS)
                .where(condition)
                .orderBy(STUDENTS.NAME, STUDENTS.STUDENT_CODE)
                .offset(offset).limit(limit)
                .fetch(r -> new StudentSummary(
                        r.value1(), r.value2(), r.value3(), r.value4(), r.value5(), r.value6(), r.value7(),
                        r.value8() == null ? List.of() : Arrays.asList(r.value8())));
    }

    public Optional<StudentsRecord> findById(UUID id) {
        return dsl.selectFrom(STUDENTS).where(STUDENTS.ID.eq(id)).fetchOptional();
    }

    /** 수정용 행 잠금 */
    public Optional<StudentsRecord> lockById(UUID id) {
        return dsl.selectFrom(STUDENTS).where(STUDENTS.ID.eq(id)).forUpdate().fetchOptional();
    }

    public Optional<String> loginId(UUID profileId) {
        if (profileId == null) return Optional.empty();
        return dsl.select(PROFILES.LOGIN_ID).from(PROFILES).where(PROFILES.ID.eq(profileId)).fetchOptional(PROFILES.LOGIN_ID);
    }

    /** 반 소속: 지금 소속(종료일 없음) 먼저 시작일 순, 그다음 지난 소속 최근 종료 먼저. 수업 시간은 ClassRepository 에서 채운다 */
    public List<StudentDetail.Enrollment> enrollments(UUID studentId, Map<UUID, List<ClassScheduleSlot>> schedules) {
        return dsl.select(ENROLLMENTS.ID, CLASSES.ID, CLASSES.NAME, CLASSES.LEVEL, PROFILES.NAME,
                        ENROLLMENTS.START_DATE, ENROLLMENTS.END_DATE)
                .from(ENROLLMENTS)
                .join(CLASSES).on(CLASSES.ID.eq(ENROLLMENTS.CLASS_ID))
                .leftJoin(PROFILES).on(PROFILES.ID.eq(CLASSES.TEACHER_ID))
                .where(ENROLLMENTS.STUDENT_ID.eq(studentId))
                .orderBy(ENROLLMENTS.END_DATE.isNull().desc(), ENROLLMENTS.END_DATE.desc(), ENROLLMENTS.START_DATE, CLASSES.NAME)
                .fetch(r -> new StudentDetail.Enrollment(r.value1(), r.value2(), r.value3(), r.value4(), r.value5(),
                        schedules.getOrDefault(r.value2(), List.of()), r.value6(), r.value7()));
    }

    public List<UUID> enrolledClassIds(UUID studentId) {
        return dsl.selectDistinct(ENROLLMENTS.CLASS_ID).from(ENROLLMENTS)
                .where(ENROLLMENTS.STUDENT_ID.eq(studentId)).fetch(ENROLLMENTS.CLASS_ID);
    }

    /**
     * 학생 타임라인 (최신 먼저): 학생 등록, 접수, 상담 기록, 상담·레벨테스트 일정, 반 시작·종료, 상태 변경.
     * 일정은 학생에 직접 연결된 것과 이 학생의 접수로 잡은 것을 모두 보여준다.
     * 3주차 이후 레벨테스트·진단서·숙제·리포트도 여기에 더한다.
     */
    public List<TimelineEvent> timeline(StudentsRecord student, ZoneId zone) {
        UUID id = student.getId();
        List<TimelineEvent> events = new ArrayList<>();
        events.add(new TimelineEvent(TimelineKind.created, student.getCreatedAt(), "학생 등록", null, null, null));

        dsl.selectFrom(INQUIRIES).where(INQUIRIES.STUDENT_ID.eq(id)).fetch().forEach(q -> events.add(new TimelineEvent(
                TimelineKind.inquiry, q.getCreatedAt(),
                (q.getType() == InquiryType.level_test ? "레벨테스트" : "상담") + " 신청 (" + q.getApplicantName() + ")",
                q.getMessage(), null, q.getId())));

        dsl.select(CONSULT_NOTES.CREATED_AT, CONSULT_NOTES.CONTENT, PROFILES.NAME, CONSULT_NOTES.INQUIRY_ID)
                .from(CONSULT_NOTES).join(PROFILES).on(PROFILES.ID.eq(CONSULT_NOTES.AUTHOR_ID))
                .where(CONSULT_NOTES.STUDENT_ID.eq(id))
                .forEach(r -> events.add(new TimelineEvent(TimelineKind.note, r.value1(), "상담 기록", r.value2(), r.value3(), r.value4())));

        var counselor = PROFILES.as("counselor");
        dsl.select(CONSULT_APPOINTMENTS.ID, CONSULT_APPOINTMENTS.STARTS_AT, CONSULT_APPOINTMENTS.TITLE,
                        CONSULT_APPOINTMENTS.STATUS, CONSULT_APPOINTMENTS.MEMO, counselor.NAME)
                .from(CONSULT_APPOINTMENTS)
                .leftJoin(counselor).on(counselor.ID.eq(CONSULT_APPOINTMENTS.COUNSELOR_ID))
                .where(CONSULT_APPOINTMENTS.STUDENT_ID.eq(id).or(CONSULT_APPOINTMENTS.INQUIRY_ID.in(
                        dsl.select(INQUIRIES.ID).from(INQUIRIES).where(INQUIRIES.STUDENT_ID.eq(id)))))
                .forEach(r -> events.add(new TimelineEvent(TimelineKind.appointment, r.value2(),
                        r.value3() + " · " + appointmentLabel(r.value4()), r.value5(), r.value6(), r.value1())));

        dsl.select(ENROLLMENTS.START_DATE, ENROLLMENTS.END_DATE, CLASSES.NAME, ENROLLMENTS.CREATED_AT)
                .from(ENROLLMENTS).join(CLASSES).on(CLASSES.ID.eq(ENROLLMENTS.CLASS_ID))
                .where(ENROLLMENTS.STUDENT_ID.eq(id))
                .forEach(r -> {
                    // 시작일이 넣은 날과 같으면 실제로 넣은 시각 (자정으로 두면 같은 날 학생 등록보다 앞에 나온다)
                    OffsetDateTime startAt = r.value4().atZoneSameInstant(zone).toLocalDate().equals(r.value1())
                            ? r.value4() : atDay(r.value1(), zone);
                    events.add(new TimelineEvent(TimelineKind.enrollment_start, startAt,
                            r.value3() + " 반 수업 시작", null, null, null));
                    if (r.value2() != null) {
                        events.add(new TimelineEvent(TimelineKind.enrollment_end, atDay(r.value2(), zone),
                                r.value3() + " 반 소속 종료", null, null, null));
                    }
                });

        var fromStatus = field("{0}->>'status'", String.class, AUDIT_LOGS.BEFORE);
        var toStatus = field("{0}->>'status'", String.class, AUDIT_LOGS.AFTER);
        dsl.select(AUDIT_LOGS.CREATED_AT, fromStatus, toStatus, PROFILES.NAME)
                .from(AUDIT_LOGS).leftJoin(PROFILES).on(PROFILES.ID.eq(AUDIT_LOGS.ACTOR_ID))
                .where(AUDIT_LOGS.TABLE_NAME.eq("students").and(AUDIT_LOGS.RECORD_ID.eq(id))
                        .and(AUDIT_LOGS.ACTION.eq("status_change")))
                .forEach(r -> events.add(new TimelineEvent(TimelineKind.status_change, r.value1(),
                        "상태 변경: " + statusLabel(r.value2()) + " → " + statusLabel(r.value3()),
                        null, r.value4(), null)));

        // 같은 시각이면 학생 등록이 가장 먼저 일어난 일 (enum 순서가 늦을수록 나중 일)
        events.sort(Comparator.comparing(TimelineEvent::at).thenComparing(TimelineEvent::kind).reversed());
        return events;
    }

    private static OffsetDateTime atDay(LocalDate date, ZoneId zone) {
        return date.atStartOfDay(zone).toOffsetDateTime();
    }

    public static String statusLabel(String status) {
        if (status == null) return "-";
        return switch (status) {
            case "consulting" -> "상담중";
            case "test_scheduled" -> "테스트예정";
            case "enrolled" -> "재원";
            case "paused" -> "휴원";
            case "withdrawn" -> "퇴원";
            default -> status;
        };
    }

    private static String appointmentLabel(AppointmentStatus s) {
        return switch (s) {
            case scheduled -> "예약";
            case done -> "완료";
            case canceled -> "취소";
            case no_show -> "불참";
        };
    }
}
