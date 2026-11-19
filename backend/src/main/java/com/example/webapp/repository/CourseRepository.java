package com.example.webapp.repository;

import static com.example.webapp.jooq.Tables.CLASSES;
import static com.example.webapp.jooq.Tables.CLASS_SCHEDULES;
import static com.example.webapp.jooq.Tables.CURRICULUM_ITEMS;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeSet;
import java.util.UUID;

import org.jooq.DSLContext;
import org.springframework.stereotype.Repository;

import com.example.webapp.dto.course.CourseLevel;

@Repository
public class CourseRepository {

    private final DSLContext dsl;

    public CourseRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    /** 운영 중인 반과 레벨별 커리큘럼. 레벨 코드 순 (반이나 커리큘럼 중 하나라도 있는 레벨) */
    public List<CourseLevel> levels() {
        var classes = dsl.selectFrom(CLASSES).where(CLASSES.ACTIVE.isTrue()).orderBy(CLASSES.LEVEL, CLASSES.NAME).fetch();
        Map<UUID, List<CourseLevel.CourseSchedule>> schedules = new LinkedHashMap<>();
        dsl.selectFrom(CLASS_SCHEDULES)
                .where(CLASS_SCHEDULES.CLASS_ID.in(classes.map(c -> c.getId())))
                .orderBy(CLASS_SCHEDULES.WEEKDAY, CLASS_SCHEDULES.START_TIME)
                .forEach(s -> schedules.computeIfAbsent(s.getClassId(), k -> new ArrayList<>())
                        .add(new CourseLevel.CourseSchedule(s.getWeekday(), s.getStartTime(), s.getEndTime())));

        Map<String, List<CourseLevel.CurriculumItem>> curriculum = new LinkedHashMap<>();
        dsl.selectFrom(CURRICULUM_ITEMS).orderBy(CURRICULUM_ITEMS.LEVEL, CURRICULUM_ITEMS.SEQ)
                .forEach(i -> curriculum.computeIfAbsent(i.getLevel(), k -> new ArrayList<>())
                        .add(new CourseLevel.CurriculumItem(i.getSeq(), i.getTitle(), i.getDescription())));

        var levelCodes = new TreeSet<String>();
        classes.forEach(c -> levelCodes.add(c.getLevel()));
        levelCodes.addAll(curriculum.keySet());

        return levelCodes.stream().map(level -> new CourseLevel(
                level,
                classes.stream().filter(c -> c.getLevel().equals(level))
                        .map(c -> new CourseLevel.CourseClass(c.getName(), c.getCapacity(),
                                schedules.getOrDefault(c.getId(), List.of())))
                        .toList(),
                curriculum.getOrDefault(level, List.of())))
                .toList();
    }
}
