package com.example.webapp;

import static com.example.webapp.jooq.Tables.PROFILES;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;

import org.jooq.DSLContext;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;

import com.example.webapp.jooq.enums.UserRole;
import com.example.webapp.security.AppUser;
import com.fasterxml.jackson.databind.ObjectMapper;

/** 반 구성: 대표만 수정, 수업 시간 겹침·이름 중복·정원 규칙 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class ClassAdminTests {

    @Autowired MockMvc mvc;
    @Autowired DSLContext dsl;
    @Autowired ObjectMapper mapper;

    private AppUser owner;
    private AppUser counselor;
    private AppUser teacherUser;
    private UUID teacher;

    @BeforeEach
    void users() {
        owner = account("c-owner", UserRole.owner);
        counselor = account("c-counselor", UserRole.counselor);
        teacherUser = account("c-teacher", UserRole.teacher);
        teacher = teacherUser.id();
    }

    private AppUser account(String loginId, UserRole role) {
        UUID id = dsl.insertInto(PROFILES).set(PROFILES.LOGIN_ID, loginId).set(PROFILES.PASSWORD_HASH, "x")
                .set(PROFILES.ROLE, role).set(PROFILES.NAME, loginId).returning(PROFILES.ID).fetchOne(PROFILES.ID);
        return new AppUser(id, loginId, null, loginId, role, true);
    }

    private MockHttpServletRequestBuilder json(MockHttpServletRequestBuilder b, String body) {
        return b.contentType(MediaType.APPLICATION_JSON).content(body).with(csrf());
    }

    private String body(String name, String teacherId, String schedules) {
        return """
                {"name":"%s","level":"m1","teacherId":%s,"capacity":2,"active":true,"schedules":%s}"""
                .formatted(name, teacherId == null ? "null" : "\"" + teacherId + "\"", schedules);
    }

    private String create(String name, String schedules) throws Exception {
        String res = mvc.perform(json(post("/api/admin/classes"), body(name, teacher.toString(), schedules)).with(user(owner)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return mapper.readTree(res).at("/info/id").asText();
    }

    @Test
    void ownerCreatesClassWithSortedSchedules() throws Exception {
        mvc.perform(json(post("/api/admin/classes"), body("테스트반A", teacher.toString(),
                        "[{\"weekday\":3,\"startTime\":\"16:00\",\"endTime\":\"17:30\"},{\"weekday\":1,\"startTime\":\"16:00\",\"endTime\":\"17:30\"}]"))
                        .with(user(owner)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.info.level").value("M1")) // 대문자로 정리
                .andExpect(jsonPath("$.info.teacherName").value("c-teacher"))
                .andExpect(jsonPath("$.info.schedules[0].weekday").value(1))
                .andExpect(jsonPath("$.info.studentCount").value(0));
    }

    @Test
    void counselorCanReadButNotWrite() throws Exception {
        String id = create("읽기반", "[]");
        mvc.perform(get("/api/admin/classes").with(user(counselor))).andExpect(status().isOk());
        mvc.perform(get("/api/admin/classes/" + id).with(user(counselor))).andExpect(status().isOk());
        mvc.perform(json(post("/api/admin/classes"), body("실장반", null, "[]")).with(user(counselor)))
                .andExpect(status().isForbidden());
        mvc.perform(json(put("/api/admin/classes/" + id), body("읽기반", null, "[]")).with(user(counselor)))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/admin/classes").with(user(teacherUser))).andExpect(status().isForbidden());
    }

    @Test
    void scheduleOverlapAndDuplicateName() throws Exception {
        // 같은 반 안에서 겹침
        mvc.perform(json(post("/api/admin/classes"), body("겹침반", null,
                        "[{\"weekday\":2,\"startTime\":\"16:00\",\"endTime\":\"17:30\"},{\"weekday\":2,\"startTime\":\"17:00\",\"endTime\":\"18:00\"}]"))
                        .with(user(owner)))
                .andExpect(status().isConflict());
        // 끝 시각이 시작보다 빠름
        mvc.perform(json(post("/api/admin/classes"), body("역순반", null,
                        "[{\"weekday\":2,\"startTime\":\"18:00\",\"endTime\":\"17:00\"}]")).with(user(owner)))
                .andExpect(status().isConflict());

        create("강사반1", "[{\"weekday\":4,\"startTime\":\"16:00\",\"endTime\":\"17:30\"}]");
        // 같은 강사의 다른 반과 겹침
        mvc.perform(json(post("/api/admin/classes"), body("강사반2", teacher.toString(),
                        "[{\"weekday\":4,\"startTime\":\"17:00\",\"endTime\":\"18:00\"}]")).with(user(owner)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("담당 강사가 같은 시간에 '강사반1' 반 수업이 있습니다 (목 16:00~17:30)."));
        // 바로 이어지는 시간은 괜찮다
        create("강사반3", "[{\"weekday\":4,\"startTime\":\"17:30\",\"endTime\":\"19:00\"}]");
        // 이름 중복
        mvc.perform(json(post("/api/admin/classes"), body("강사반1", null, "[]")).with(user(owner)))
                .andExpect(status().isConflict());
    }

    @Test
    void validation() throws Exception {
        mvc.perform(json(post("/api/admin/classes"),
                        "{\"name\":\"\",\"level\":\"M1\",\"capacity\":0,\"active\":true,\"schedules\":[{\"weekday\":8,\"startTime\":\"16:00\",\"endTime\":\"17:00\"}]}")
                        .with(user(owner)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.name").exists())
                .andExpect(jsonPath("$.fieldErrors.capacity").exists())
                .andExpect(jsonPath("$.fieldErrors['schedules[0].weekday']").exists());
    }
}
