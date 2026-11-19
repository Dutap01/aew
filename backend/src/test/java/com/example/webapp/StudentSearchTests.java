package com.example.webapp;

import static com.example.webapp.jooq.Tables.CLASSES;
import static com.example.webapp.jooq.Tables.ENROLLMENTS;
import static com.example.webapp.jooq.Tables.STUDENTS;
import static org.assertj.core.api.Assertions.assertThat;

import java.util.UUID;

import org.jooq.DSLContext;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import com.example.webapp.dto.StudentSummary;
import com.example.webapp.jooq.enums.StudentStatus;
import com.example.webapp.service.StudentService;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class StudentSearchTests {

    @Autowired DSLContext dsl;
    @Autowired StudentService service;

    private String code;

    @BeforeEach
    void data() {
        dsl.deleteFrom(ENROLLMENTS).execute();
        dsl.deleteFrom(STUDENTS).execute();
        UUID classId = dsl.insertInto(CLASSES).set(CLASSES.NAME, "검색반").set(CLASSES.LEVEL, "M1")
                .returning(CLASSES.ID).fetchOne(CLASSES.ID);
        UUID kim = student("김검색", "한빛중", "010-1234-5678", StudentStatus.enrolled);
        student("김검색", "새솔중", "010-9999-0000", StudentStatus.consulting); // 동명이인
        student("이다른", "푸른중", "010-5555-1111", StudentStatus.paused);
        dsl.insertInto(ENROLLMENTS).set(ENROLLMENTS.STUDENT_ID, kim).set(ENROLLMENTS.CLASS_ID, classId).execute();
        code = dsl.select(STUDENTS.STUDENT_CODE).from(STUDENTS).where(STUDENTS.ID.eq(kim)).fetchOne(STUDENTS.STUDENT_CODE);
    }

    private UUID student(String name, String school, String phone, StudentStatus status) {
        return dsl.insertInto(STUDENTS).set(STUDENTS.NAME, name).set(STUDENTS.SCHOOL, school)
                .set(STUDENTS.PARENT_PHONE, phone).set(STUDENTS.STATUS, status)
                .returning(STUDENTS.ID).fetchOne(STUDENTS.ID);
    }

    @Test
    void searchByNameFindsSameNameStudents() {
        var result = service.search("검색", null, 0, 20);
        assertThat(result.total()).isEqualTo(2);
        assertThat(result.items()).extracting(StudentSummary::name).containsOnly("김검색");
    }

    @Test
    void searchByCodeCaseInsensitive() {
        var result = service.search(code.toLowerCase(), null, 0, 20);
        assertThat(result.items()).extracting(StudentSummary::studentCode).containsExactly(code);
        assertThat(result.items().get(0).classes()).containsExactly("검색반");
    }

    @Test
    void searchByPhoneDigitsAndSchool() {
        assertThat(service.search("5678", null, 0, 20).total()).isEqualTo(1);
        assertThat(service.search("01055551111", null, 0, 20).items()).extracting(StudentSummary::name).containsExactly("이다른");
        assertThat(service.search("새솔", null, 0, 20).total()).isEqualTo(1);
    }

    @Test
    void statusFilterAndPaging() {
        assertThat(service.search(null, StudentStatus.paused, 0, 20).total()).isEqualTo(1);
        var page = service.search(null, null, 1, 2);
        assertThat(page.total()).isEqualTo(3);
        assertThat(page.items()).hasSize(1);
        assertThat(service.search(null, null, 0, 10_000).size()).isEqualTo(StudentService.MAX_PAGE_SIZE);
    }
}
