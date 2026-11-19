package com.example.webapp.repository;

import static com.example.webapp.jooq.Tables.CLASSES;
import static com.example.webapp.jooq.Tables.ENROLLMENTS;
import static com.example.webapp.jooq.Tables.STUDENTS;
import static org.jooq.impl.DSL.arrayAgg;
import static org.jooq.impl.DSL.field;
import static org.jooq.impl.DSL.noCondition;
import static org.jooq.impl.DSL.regexpReplaceAll;
import static org.jooq.impl.DSL.select;

import java.util.Arrays;
import java.util.List;

import org.jooq.Condition;
import org.jooq.DSLContext;
import org.jooq.Field;
import org.springframework.stereotype.Repository;

import com.example.webapp.dto.StudentSummary;
import com.example.webapp.jooq.enums.StudentStatus;

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
}
