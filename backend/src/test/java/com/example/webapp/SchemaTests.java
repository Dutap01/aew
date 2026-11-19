package com.example.webapp;

import static com.example.webapp.jooq.Tables.AI_JOBS;
import static com.example.webapp.jooq.Tables.CLASSES;
import static com.example.webapp.jooq.Tables.CONSULT_APPOINTMENTS;
import static com.example.webapp.jooq.Tables.ENROLLMENTS;
import static com.example.webapp.jooq.Tables.FEEDBACKS;
import static com.example.webapp.jooq.Tables.PROFILES;
import static com.example.webapp.jooq.Tables.RULE_SETS;
import static com.example.webapp.jooq.Tables.STUDENTS;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.OffsetDateTime;
import java.util.UUID;

import org.jooq.DSLContext;
import org.jooq.JSONB;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import com.example.webapp.jooq.enums.InquiryType;
import com.example.webapp.jooq.enums.StudentStatus;
import com.example.webapp.jooq.enums.UserRole;

/**
 * V1 스키마의 규칙(기본값·enum·유일성·CHECK)이 DB 에서 실제로 지켜지는지 확인한다.
 * 각 테스트는 트랜잭션 안에서 실행되고 끝나면 롤백된다.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class SchemaTests {

    @Autowired
    private DSLContext dsl;

    private UUID newStudent(String name) {
        return dsl.insertInto(STUDENTS).set(STUDENTS.NAME, name)
                .returning(STUDENTS.ID).fetchOne(STUDENTS.ID);
    }

    private UUID newProfile(String loginId, UserRole role) {
        return dsl.insertInto(PROFILES)
                .set(PROFILES.LOGIN_ID, loginId)
                .set(PROFILES.PASSWORD_HASH, "x")
                .set(PROFILES.ROLE, role)
                .set(PROFILES.NAME, loginId)
                .returning(PROFILES.ID).fetchOne(PROFILES.ID);
    }

    @Test
    void studentGetsCodeAndDefaultStatus() {
        var student = dsl.insertInto(STUDENTS).set(STUDENTS.NAME, "테스트")
                .returning().fetchOne();

        assertThat(student.getStudentCode()).matches("S-\\d{4,}");
        assertThat(student.getStatus()).isEqualTo(StudentStatus.consulting);
        assertThat(student.getId()).isNotNull();
    }

    @Test
    void loginIdIsUnique() {
        newProfile("dup", UserRole.teacher);
        assertThatThrownBy(() -> newProfile("dup", UserRole.counselor))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void aiJobIdempotencyKeyIsUnique() {
        UUID studentId = newStudent("AI");
        Runnable insert = () -> dsl.insertInto(AI_JOBS)
                .set(AI_JOBS.JOB_TYPE, "diagnosis_narrative")
                .set(AI_JOBS.PIPELINE, "mock")
                .set(AI_JOBS.STUDENT_ID, studentId)
                .set(AI_JOBS.IDEMPOTENCY_KEY, "diagnosis_narrative:" + studentId + ":v1")
                .set(AI_JOBS.INPUT, JSONB.valueOf("{}"))
                .execute();
        insert.run();
        assertThatThrownBy(insert::run).isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void onlyOneActiveEnrollmentPerClass() {
        UUID studentId = newStudent("반 소속");
        UUID classId = dsl.insertInto(CLASSES).set(CLASSES.NAME, "중2A").set(CLASSES.LEVEL, "M2")
                .returning(CLASSES.ID).fetchOne(CLASSES.ID);
        Runnable enroll = () -> dsl.insertInto(ENROLLMENTS)
                .set(ENROLLMENTS.STUDENT_ID, studentId).set(ENROLLMENTS.CLASS_ID, classId).execute();
        enroll.run();
        assertThatThrownBy(enroll::run).isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void feedbackNeedsExactlyOneTarget() {
        UUID studentId = newStudent("피드백");
        assertThatThrownBy(() -> dsl.insertInto(FEEDBACKS).set(FEEDBACKS.STUDENT_ID, studentId).execute())
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void onlyOneActiveRuleSetPerName() {
        Runnable activate = () -> dsl.insertInto(RULE_SETS)
                .set(RULE_SETS.NAME, "scoring")
                .set(RULE_SETS.VERSION, (int) (Math.random() * 100000))
                .set(RULE_SETS.CONTENT, JSONB.valueOf("{}"))
                .set(RULE_SETS.IS_ACTIVE, true)
                .execute();
        activate.run();
        assertThatThrownBy(activate::run).isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void appointmentMustEndAfterStart() {
        OffsetDateTime start = OffsetDateTime.now();
        assertThatThrownBy(() -> dsl.insertInto(CONSULT_APPOINTMENTS)
                .set(CONSULT_APPOINTMENTS.KIND, InquiryType.consult)
                .set(CONSULT_APPOINTMENTS.TITLE, "상담")
                .set(CONSULT_APPOINTMENTS.STARTS_AT, start)
                .set(CONSULT_APPOINTMENTS.ENDS_AT, start.minusMinutes(30))
                .execute())
                .isInstanceOf(DataIntegrityViolationException.class);
    }
}
