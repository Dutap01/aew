package com.example.webapp.service;

import static com.example.webapp.jooq.Tables.CLASSES;
import static com.example.webapp.jooq.Tables.CLASS_SCHEDULES;
import static com.example.webapp.jooq.Tables.ENROLLMENTS;
import static com.example.webapp.jooq.Tables.PROFILES;
import static com.example.webapp.jooq.Tables.STUDENTS;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.jooq.DSLContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.webapp.dto.timetable.Timetable;
import com.example.webapp.dto.timetable.Timetable.OwnerKind;
import com.example.webapp.dto.timetable.Timetable.TimetableEntry;
import com.example.webapp.dto.timetable.Timetable.TimetableOwner;
import com.example.webapp.jooq.enums.UserRole;
import com.example.webapp.jooq.tables.records.StudentsRecord;

/**
 * 개인 주간 시간표 (docs/v1-plan.md "추가 범위: 시간표").
 * 학생: 반 소속(enrollments) 기간 안에 있는 날의 수업만. 그래서 주를 넘겨 보면 반 이동·종료가 날짜대로 반영된다.
 * 강사: 담당하는 운영 중 반의 수업.
 */
@Service
public class TimetableService {

    private final DSLContext dsl;

    public TimetableService(DSLContext dsl) {
        this.dsl = dsl;
    }

    /** 그 날짜가 있는 주의 월요일 (없으면 오늘 기준) */
    public static LocalDate weekStart(LocalDate week) {
        return (week != null ? week : LocalDate.now(StudentService.SEOUL)).with(DayOfWeek.MONDAY);
    }

    @Transactional(readOnly = true)
    public Timetable forStudent(UUID studentId, LocalDate week) {
        var s = dsl.selectFrom(STUDENTS).where(STUDENTS.ID.eq(studentId)).fetchOptional()
                .orElseThrow(() -> new NotFoundException("학생을 찾을 수 없습니다."));
        return studentTimetable(s, weekStart(week));
    }

    /** 학생 본인 (로그인 계정에 연결된 학생) */
    @Transactional(readOnly = true)
    public Timetable forStudentProfile(UUID profileId, LocalDate week) {
        var s = dsl.selectFrom(STUDENTS).where(STUDENTS.PROFILE_ID.eq(profileId)).fetchOptional()
                .orElseThrow(() -> new NotFoundException("계정에 연결된 학생 정보가 없습니다. 학원에 문의하세요."));
        return studentTimetable(s, weekStart(week));
    }

    @Transactional(readOnly = true)
    public Timetable forTeacher(UUID teacherId, LocalDate week) {
        var t = dsl.selectFrom(PROFILES).where(PROFILES.ID.eq(teacherId).and(PROFILES.ROLE.eq(UserRole.teacher)))
                .fetchOptional()
                .orElseThrow(() -> new NotFoundException("강사를 찾을 수 없습니다."));
        return teacherTimetable(t.getId(), t.getName(), weekStart(week));
    }

    /** 강사 본인. 대표가 /t/** 로 열면 대표가 담당하는 반 (보통 없음) */
    @Transactional(readOnly = true)
    public Timetable forTeacherProfile(UUID profileId, String name, LocalDate week) {
        return teacherTimetable(profileId, name, weekStart(week));
    }

    private Timetable studentTimetable(StudentsRecord s, LocalDate monday) {
        LocalDate sunday = monday.plusDays(6);
        List<TimetableEntry> entries = new ArrayList<>();
        dsl.select(CLASSES.ID, CLASSES.NAME, CLASSES.LEVEL, PROFILES.NAME,
                        CLASS_SCHEDULES.WEEKDAY, CLASS_SCHEDULES.START_TIME, CLASS_SCHEDULES.END_TIME,
                        ENROLLMENTS.START_DATE, ENROLLMENTS.END_DATE)
                .from(ENROLLMENTS)
                .join(CLASSES).on(CLASSES.ID.eq(ENROLLMENTS.CLASS_ID))
                .join(CLASS_SCHEDULES).on(CLASS_SCHEDULES.CLASS_ID.eq(CLASSES.ID))
                .leftJoin(PROFILES).on(PROFILES.ID.eq(CLASSES.TEACHER_ID))
                .where(ENROLLMENTS.STUDENT_ID.eq(s.getId())
                        .and(ENROLLMENTS.START_DATE.le(sunday))
                        .and(ENROLLMENTS.END_DATE.isNull().or(ENROLLMENTS.END_DATE.ge(monday))))
                .forEach(r -> {
                    LocalDate date = monday.plusDays(r.value5() - 1);
                    boolean inRange = !date.isBefore(r.value8()) && (r.value9() == null || !date.isAfter(r.value9()));
                    if (inRange) {
                        entries.add(new TimetableEntry(r.value1(), r.value2(), r.value3(), date, r.value5(),
                                r.value6(), r.value7(), r.value4(), null));
                    }
                });
        String detail = Stream.of(s.getStudentCode(), s.getSchool(), s.getGrade())
                .filter(v -> v != null && !v.isBlank()).collect(Collectors.joining(" · "));
        return new Timetable(new TimetableOwner(OwnerKind.student, s.getId(), s.getName(), detail), monday, sorted(entries));
    }

    private Timetable teacherTimetable(UUID teacherId, String name, LocalDate monday) {
        var studentCount = dsl.selectCount().from(ENROLLMENTS)
                .where(ENROLLMENTS.CLASS_ID.eq(CLASSES.ID).and(ENROLLMENTS.END_DATE.isNull()))
                .asField("student_count");
        List<TimetableEntry> entries = dsl.select(CLASSES.ID, CLASSES.NAME, CLASSES.LEVEL,
                        CLASS_SCHEDULES.WEEKDAY, CLASS_SCHEDULES.START_TIME, CLASS_SCHEDULES.END_TIME, studentCount)
                .from(CLASSES)
                .join(CLASS_SCHEDULES).on(CLASS_SCHEDULES.CLASS_ID.eq(CLASSES.ID))
                .where(CLASSES.TEACHER_ID.eq(teacherId).and(CLASSES.ACTIVE.isTrue()))
                .fetch(r -> new TimetableEntry(r.value1(), r.value2(), r.value3(), monday.plusDays(r.value4() - 1),
                        r.value4(), r.value5(), r.value6(), null, (Integer) r.value7()));
        return new Timetable(new TimetableOwner(OwnerKind.teacher, teacherId, name, null), monday, sorted(entries));
    }

    private static List<TimetableEntry> sorted(List<TimetableEntry> entries) {
        return entries.stream()
                .sorted(Comparator.comparingInt(TimetableEntry::weekday).thenComparing(TimetableEntry::startTime)
                        .thenComparing(TimetableEntry::className))
                .toList();
    }
}
