package com.example.webapp.repository;

import static com.example.webapp.jooq.Tables.CLASSES;
import static com.example.webapp.jooq.Tables.CLASS_SCHEDULES;
import static com.example.webapp.jooq.Tables.ENROLLMENTS;
import static com.example.webapp.jooq.Tables.PROFILES;
import static com.example.webapp.jooq.Tables.STUDENTS;
import static org.jooq.impl.DSL.noCondition;

import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.jooq.Condition;
import org.jooq.DSLContext;
import org.springframework.stereotype.Repository;

import com.example.webapp.dto.appointment.StaffOption;
import com.example.webapp.dto.classes.ClassDetail;
import com.example.webapp.dto.classes.ClassScheduleSlot;
import com.example.webapp.dto.classes.ClassSummary;
import com.example.webapp.jooq.enums.UserRole;
import com.example.webapp.jooq.tables.records.ClassesRecord;

@Repository
public class ClassRepository {

    private final DSLContext dsl;

    public ClassRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    /** 반 목록: 운영 중 먼저, 레벨·이름순 */
    public List<ClassSummary> summaries(Condition condition) {
        var studentCount = dsl.selectCount().from(ENROLLMENTS)
                .where(ENROLLMENTS.CLASS_ID.eq(CLASSES.ID).and(ENROLLMENTS.END_DATE.isNull()))
                .<Integer>asField("student_count");
        var rows = dsl.select(CLASSES.asterisk(), PROFILES.NAME, studentCount)
                .from(CLASSES)
                .leftJoin(PROFILES).on(PROFILES.ID.eq(CLASSES.TEACHER_ID))
                .where(condition)
                .orderBy(CLASSES.ACTIVE.desc(), CLASSES.LEVEL, CLASSES.NAME)
                .fetch();
        var schedules = schedules(rows.map(r -> r.get(CLASSES.ID)));
        return rows.map(r -> {
            var c = r.into(CLASSES);
            return new ClassSummary(c.getId(), c.getName(), c.getLevel(), c.getTeacherId(), r.get(PROFILES.NAME),
                    c.getCapacity(), c.getActive(), schedules.getOrDefault(c.getId(), List.of()), r.get(studentCount));
        });
    }

    public Optional<ClassSummary> summary(UUID id) {
        return summaries(CLASSES.ID.eq(id)).stream().findFirst();
    }

    /** 반별 수업 시간 (요일·시작 시각순) */
    public Map<UUID, List<ClassScheduleSlot>> schedules(Collection<UUID> classIds) {
        Map<UUID, List<ClassScheduleSlot>> map = new LinkedHashMap<>();
        if (classIds.isEmpty()) return map;
        dsl.selectFrom(CLASS_SCHEDULES)
                .where(CLASS_SCHEDULES.CLASS_ID.in(classIds))
                .orderBy(CLASS_SCHEDULES.WEEKDAY, CLASS_SCHEDULES.START_TIME)
                .forEach(s -> map.computeIfAbsent(s.getClassId(), k -> new ArrayList<>())
                        .add(new ClassScheduleSlot(s.getWeekday(), s.getStartTime(), s.getEndTime())));
        return map;
    }

    /** 지금 소속 학생 (이름순) */
    public List<ClassDetail.ClassStudent> currentStudents(UUID classId) {
        return dsl.select(ENROLLMENTS.ID, STUDENTS.ID, STUDENTS.STUDENT_CODE, STUDENTS.NAME, STUDENTS.SCHOOL,
                        STUDENTS.GRADE, STUDENTS.STATUS, ENROLLMENTS.START_DATE)
                .from(ENROLLMENTS).join(STUDENTS).on(STUDENTS.ID.eq(ENROLLMENTS.STUDENT_ID))
                .where(ENROLLMENTS.CLASS_ID.eq(classId).and(ENROLLMENTS.END_DATE.isNull()))
                .orderBy(STUDENTS.NAME, STUDENTS.STUDENT_CODE)
                .fetch(r -> new ClassDetail.ClassStudent(r.value1(), r.value2(), r.value3(), r.value4(), r.value5(),
                        r.value6(), r.value7(), r.value8()));
    }

    public int currentStudentCount(UUID classId) {
        return dsl.fetchCount(ENROLLMENTS, ENROLLMENTS.CLASS_ID.eq(classId).and(ENROLLMENTS.END_DATE.isNull()));
    }

    /** 수정·정원 확인용 행 잠금 (같은 반에 동시에 학생을 넣어 정원을 넘지 않게) */
    public Optional<ClassesRecord> lockById(UUID id) {
        return dsl.selectFrom(CLASSES).where(CLASSES.ID.eq(id)).forUpdate().fetchOptional();
    }

    public boolean nameTaken(String name, UUID exceptId) {
        return dsl.fetchExists(CLASSES, CLASSES.NAME.equalIgnoreCase(name)
                .and(exceptId == null ? noCondition() : CLASSES.ID.ne(exceptId)));
    }

    public void replaceSchedules(UUID classId, List<ClassScheduleSlot> slots) {
        dsl.deleteFrom(CLASS_SCHEDULES).where(CLASS_SCHEDULES.CLASS_ID.eq(classId)).execute();
        for (var s : slots) {
            dsl.insertInto(CLASS_SCHEDULES)
                    .set(CLASS_SCHEDULES.CLASS_ID, classId)
                    .set(CLASS_SCHEDULES.WEEKDAY, (short) s.weekday())
                    .set(CLASS_SCHEDULES.START_TIME, s.startTime())
                    .set(CLASS_SCHEDULES.END_TIME, s.endTime())
                    .execute();
        }
    }

    /** 같은 강사의 다른 운영 중 반 수업 시간 (반 이름과 함께). 시간 겹침 검사용 */
    public List<Map.Entry<String, ClassScheduleSlot>> teacherSchedules(UUID teacherId, UUID exceptClassId) {
        return dsl.select(CLASSES.NAME, CLASS_SCHEDULES.WEEKDAY, CLASS_SCHEDULES.START_TIME, CLASS_SCHEDULES.END_TIME)
                .from(CLASS_SCHEDULES).join(CLASSES).on(CLASSES.ID.eq(CLASS_SCHEDULES.CLASS_ID))
                .where(CLASSES.TEACHER_ID.eq(teacherId).and(CLASSES.ACTIVE.isTrue())
                        .and(exceptClassId == null ? noCondition() : CLASSES.ID.ne(exceptClassId)))
                .fetch(r -> Map.entry(r.value1(), new ClassScheduleSlot(r.value2(), r.value3(), r.value4())));
    }

    /** 담당 강사로 고를 수 있는 사람: 사용 중인 강사 */
    public List<StaffOption> teachers() {
        return dsl.select(PROFILES.ID, PROFILES.NAME, PROFILES.ROLE).from(PROFILES)
                .where(PROFILES.ROLE.eq(UserRole.teacher).and(PROFILES.ACTIVE.isTrue()))
                .orderBy(PROFILES.NAME)
                .fetch(r -> new StaffOption(r.value1(), r.value2(), r.value3()));
    }

    public boolean isActiveTeacher(UUID profileId) {
        return dsl.fetchExists(PROFILES, PROFILES.ID.eq(profileId)
                .and(PROFILES.ROLE.eq(UserRole.teacher)).and(PROFILES.ACTIVE.isTrue()));
    }

    /** 레벨 코드 목록 (반·커리큘럼 입력 도우미) */
    public List<String> levels() {
        return dsl.selectDistinct(CLASSES.LEVEL).from(CLASSES).orderBy(CLASSES.LEVEL).fetch(CLASSES.LEVEL);
    }
}
