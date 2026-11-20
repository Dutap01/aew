package com.example.webapp;

import static com.example.webapp.jooq.Tables.CLASSES;
import static com.example.webapp.jooq.Tables.CLASS_SCHEDULES;
import static com.example.webapp.jooq.Tables.ENROLLMENTS;
import static com.example.webapp.jooq.Tables.PROFILES;
import static com.example.webapp.jooq.Tables.STUDENTS;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

import org.jooq.DSLContext;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import com.example.webapp.jooq.enums.StudentStatus;
import com.example.webapp.jooq.enums.UserRole;
import com.example.webapp.security.AppUser;

/**
 * 개인 시간표: 반 소속 기간에 맞춘 날짜별 수업, 강사 담당 반, 본인만 보기.
 * 기준 주: 2026-11-16(월) ~ 11-22(일)
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class TimetableTests {

    @Autowired MockMvc mvc;
    @Autowired DSLContext dsl;

    private AppUser counselor;
    private AppUser teacher;
    private AppUser studentUser;
    private UUID studentId;
    private UUID classA;
    private UUID classB;

    @BeforeEach
    void data() {
        counselor = account("tt-counselor", UserRole.counselor);
        teacher = account("tt-teacher", UserRole.teacher);
        studentUser = account("S-9901", UserRole.student);

        // A반: 월·수 16:00~17:30 (담당 tt-teacher) / B반: 금 18:00~19:00 (담당 tt-teacher) / C반: 운영 종료
        classA = clazz("시간표A", true, 1, 3);
        classB = clazz("시간표B", true, 5);
        clazz("시간표C", false, 2);
        dsl.update(CLASS_SCHEDULES).set(CLASS_SCHEDULES.START_TIME, LocalTime.of(18, 0)).set(CLASS_SCHEDULES.END_TIME, LocalTime.of(19, 0))
                .where(CLASS_SCHEDULES.CLASS_ID.eq(classB)).execute();

        studentId = dsl.insertInto(STUDENTS).set(STUDENTS.NAME, "시간표학생").set(STUDENTS.SCHOOL, "한빛중").set(STUDENTS.GRADE, "중1")
                .set(STUDENTS.STATUS, StudentStatus.enrolled).set(STUDENTS.PROFILE_ID, studentUser.id())
                .returning(STUDENTS.ID).fetchOne(STUDENTS.ID);
        // A반은 이번 주 수요일부터, B반은 이번 주 목요일까지 (금요일 수업 없음)
        enroll(classA, LocalDate.of(2026, 11, 18), null);
        enroll(classB, LocalDate.of(2026, 10, 1), LocalDate.of(2026, 11, 19));
    }

    private AppUser account(String loginId, UserRole role) {
        UUID id = dsl.insertInto(PROFILES).set(PROFILES.LOGIN_ID, loginId).set(PROFILES.PASSWORD_HASH, "x")
                .set(PROFILES.ROLE, role).set(PROFILES.NAME, loginId).returning(PROFILES.ID).fetchOne(PROFILES.ID);
        return new AppUser(id, loginId, null, loginId, role, true);
    }

    private UUID clazz(String name, boolean active, int... weekdays) {
        UUID id = dsl.insertInto(CLASSES).set(CLASSES.NAME, name).set(CLASSES.LEVEL, "M1").set(CLASSES.TEACHER_ID, teacher.id())
                .set(CLASSES.ACTIVE, active).returning(CLASSES.ID).fetchOne(CLASSES.ID);
        for (int d : weekdays) {
            dsl.insertInto(CLASS_SCHEDULES).set(CLASS_SCHEDULES.CLASS_ID, id).set(CLASS_SCHEDULES.WEEKDAY, (short) d)
                    .set(CLASS_SCHEDULES.START_TIME, LocalTime.of(16, 0)).set(CLASS_SCHEDULES.END_TIME, LocalTime.of(17, 30)).execute();
        }
        return id;
    }

    private void enroll(UUID classId, LocalDate start, LocalDate end) {
        dsl.insertInto(ENROLLMENTS).set(ENROLLMENTS.STUDENT_ID, studentId).set(ENROLLMENTS.CLASS_ID, classId)
                .set(ENROLLMENTS.START_DATE, start).set(ENROLLMENTS.END_DATE, end).execute();
    }

    @Test
    void studentWeekFollowsEnrollmentDates() throws Exception {
        // 이번 주: A반 월요일은 시작 전이라 빠지고 수요일만, B반 금요일은 종료 후라 빠짐
        mvc.perform(get("/api/admin/timetables/students/" + studentId + "?week=2026-11-20").with(user(counselor)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.weekStart").value("2026-11-16"))
                .andExpect(jsonPath("$.owner.detail").value(org.hamcrest.Matchers.startsWith("S-")))
                .andExpect(jsonPath("$.entries.length()").value(1))
                .andExpect(jsonPath("$.entries[0].date").value("2026-11-18"))
                .andExpect(jsonPath("$.entries[0].className").value("시간표A"))
                .andExpect(jsonPath("$.entries[0].teacherName").value("tt-teacher"))
                .andExpect(jsonPath("$.entries[0].studentCount").doesNotExist());
        // 지난주: B반 금요일만
        mvc.perform(get("/api/admin/timetables/students/" + studentId + "?week=2026-11-09").with(user(counselor)))
                .andExpect(jsonPath("$.entries.length()").value(1))
                .andExpect(jsonPath("$.entries[0].date").value("2026-11-13"))
                .andExpect(jsonPath("$.entries[0].startTime").value("18:00:00"));
        // 다음 주: A반 월·수
        mvc.perform(get("/api/admin/timetables/students/" + studentId + "?week=2026-11-23").with(user(counselor)))
                .andExpect(jsonPath("$.entries.length()").value(2))
                .andExpect(jsonPath("$.entries[0].weekday").value(1));
    }

    @Test
    void teacherSeesActiveClassesWithCounts() throws Exception {
        mvc.perform(get("/api/admin/timetables/teachers/" + teacher.id() + "?week=2026-11-16").with(user(counselor)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.owner.kind").value("teacher"))
                .andExpect(jsonPath("$.entries.length()").value(3)) // A 월·수 + B 금 (운영 종료 C 제외)
                .andExpect(jsonPath("$.entries[0].studentCount").value(1)) // A반 현재 1명
                .andExpect(jsonPath("$.entries[2].studentCount").value(0)); // B반은 종료되어 0명
        mvc.perform(get("/api/t/timetable?week=2026-11-16").with(user(teacher)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.entries.length()").value(3));
        // 강사가 아닌 계정은 강사 시간표 조회 대상이 아님
        mvc.perform(get("/api/admin/timetables/teachers/" + counselor.id()).with(user(counselor)))
                .andExpect(status().isNotFound());
    }

    @Test
    void studentSeesOnlyOwnAndPermissions() throws Exception {
        mvc.perform(get("/api/s/timetable?week=2026-11-23").with(user(studentUser)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.owner.name").value("시간표학생"))
                .andExpect(jsonPath("$.entries.length()").value(2));
        // 학생 정보와 연결되지 않은 학생 계정
        AppUser orphan = account("S-9902", UserRole.student);
        mvc.perform(get("/api/s/timetable").with(user(orphan))).andExpect(status().isNotFound());
        // 역할별 차단
        mvc.perform(get("/api/admin/timetables/students/" + studentId).with(user(teacher))).andExpect(status().isForbidden());
        mvc.perform(get("/api/admin/timetables/students/" + studentId).with(user(studentUser))).andExpect(status().isForbidden());
        mvc.perform(get("/api/t/timetable").with(user(studentUser))).andExpect(status().isForbidden());
        mvc.perform(get("/api/s/timetable").with(user(teacher))).andExpect(status().isForbidden());
    }
}
