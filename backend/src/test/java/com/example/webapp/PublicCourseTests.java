package com.example.webapp;

import static com.example.webapp.jooq.Tables.CLASSES;
import static com.example.webapp.jooq.Tables.CLASS_SCHEDULES;
import static com.example.webapp.jooq.Tables.CURRICULUM_ITEMS;
import static com.example.webapp.jooq.Tables.PROFILES;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalTime;
import java.util.UUID;

import org.jooq.DSLContext;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import com.example.webapp.jooq.enums.UserRole;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class PublicCourseTests {

    @Autowired MockMvc mvc;
    @Autowired DSLContext dsl;

    @Test
    void publicCoursesWithoutLoginAndNoTeacherInfo() throws Exception {
        UUID teacher = dsl.insertInto(PROFILES).set(PROFILES.LOGIN_ID, "c-teacher").set(PROFILES.PASSWORD_HASH, "x")
                .set(PROFILES.ROLE, UserRole.teacher).set(PROFILES.NAME, "비공개강사").returning(PROFILES.ID).fetchOne(PROFILES.ID);
        UUID open = dsl.insertInto(CLASSES).set(CLASSES.NAME, "Z9A").set(CLASSES.LEVEL, "Z9").set(CLASSES.TEACHER_ID, teacher)
                .returning(CLASSES.ID).fetchOne(CLASSES.ID);
        dsl.insertInto(CLASSES).set(CLASSES.NAME, "Z9-closed").set(CLASSES.LEVEL, "Z9").set(CLASSES.ACTIVE, false).execute();
        dsl.insertInto(CLASS_SCHEDULES).set(CLASS_SCHEDULES.CLASS_ID, open).set(CLASS_SCHEDULES.WEEKDAY, (short) 2)
                .set(CLASS_SCHEDULES.START_TIME, LocalTime.of(16, 0)).set(CLASS_SCHEDULES.END_TIME, LocalTime.of(17, 30)).execute();
        dsl.insertInto(CURRICULUM_ITEMS).set(CURRICULUM_ITEMS.LEVEL, "Z9").set(CURRICULUM_ITEMS.SEQ, 1)
                .set(CURRICULUM_ITEMS.TITLE, "첫 회차").execute();

        String level = "$[?(@.level == 'Z9')]";
        mvc.perform(get("/api/public/courses"))
                .andExpect(status().isOk())
                .andExpect(jsonPath(level + ".classes.length()").value(1)) // 운영 중인 반만
                .andExpect(jsonPath(level + ".classes[0].name").value("Z9A"))
                .andExpect(jsonPath(level + ".classes[0].schedules[0].startTime").value("16:00:00"))
                .andExpect(jsonPath(level + ".curriculum[0].title").value("첫 회차"))
                .andExpect(jsonPath("$..teacherId").doesNotExist());
    }
}
