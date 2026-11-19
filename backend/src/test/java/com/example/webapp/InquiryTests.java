package com.example.webapp;

import static com.example.webapp.jooq.Tables.AUDIT_LOGS;
import static com.example.webapp.jooq.Tables.PROFILES;
import static com.example.webapp.jooq.Tables.STUDENTS;
import static org.assertj.core.api.Assertions.assertThat;
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

import com.example.webapp.jooq.enums.StudentStatus;
import com.example.webapp.jooq.enums.UserRole;
import com.example.webapp.security.AppUser;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class InquiryTests {

    @Autowired MockMvc mvc;
    @Autowired DSLContext dsl;
    @Autowired ObjectMapper mapper;

    private AppUser counselor;
    private AppUser teacher;

    private static final String VALID = """
            {"type":"level_test","applicantName":"김보호자","applicantPhone":"01012345678",
             "studentName":"김신청","school":"한빛중","grade":"중2",
             "preferredSlots":[{"date":"2026-11-25","time":"16:00"}],
             "message":"문법 상담","privacyAgreed":true}""";

    @BeforeEach
    void users() {
        counselor = account("i-counselor", UserRole.counselor);
        teacher = account("i-teacher", UserRole.teacher);
    }

    private AppUser account(String loginId, UserRole role) {
        UUID id = dsl.insertInto(PROFILES).set(PROFILES.LOGIN_ID, loginId).set(PROFILES.PASSWORD_HASH, "x")
                .set(PROFILES.ROLE, role).set(PROFILES.NAME, loginId).returning(PROFILES.ID).fetchOne(PROFILES.ID);
        return new AppUser(id, loginId, null, loginId, role, true);
    }

    private MockHttpServletRequestBuilder json(MockHttpServletRequestBuilder b, String body) {
        return b.contentType(MediaType.APPLICATION_JSON).content(body).with(csrf());
    }

    private JsonNode body(MockHttpServletRequestBuilder b) throws Exception {
        return mapper.readTree(mvc.perform(b).andReturn().getResponse().getContentAsString());
    }

    private String createInquiry() throws Exception {
        return body(json(post("/api/public/inquiries"), VALID)).get("id").asText();
    }

    @Test
    void publicSubmitWithoutLogin() throws Exception {
        mvc.perform(json(post("/api/public/inquiries"), VALID)).andExpect(status().isCreated());
        String id = createInquiry();
        mvc.perform(get("/api/admin/inquiries/" + id).with(user(counselor)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("received"))
                .andExpect(jsonPath("$.applicantPhone").value("010-1234-5678")) // 하이픈 정리
                .andExpect(jsonPath("$.preferredSlots[0].time").value("16:00"))
                .andExpect(jsonPath("$.nextStatuses.length()").value(3));
    }

    @Test
    void publicSubmitValidation() throws Exception {
        String bad = VALID.replace("01012345678", "02-123").replace("\"privacyAgreed\":true", "\"privacyAgreed\":false")
                .replace("[{\"date\":\"2026-11-25\",\"time\":\"16:00\"}]", "[]");
        mvc.perform(json(post("/api/public/inquiries"), bad))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.applicantPhone").exists())
                .andExpect(jsonPath("$.fieldErrors.privacyAgreed").exists())
                .andExpect(jsonPath("$.fieldErrors.preferredSlots").exists());
    }

    @Test
    void statusFlowAndInvalidTransition() throws Exception {
        String id = createInquiry();
        mvc.perform(json(put("/api/admin/inquiries/" + id + "/status"), "{\"status\":\"completed\"}").with(user(counselor)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("'접수' 상태에서 '완료'(으)로 바꿀 수 없습니다."));
        mvc.perform(json(put("/api/admin/inquiries/" + id + "/status"), "{\"status\":\"contacted\"}").with(user(counselor)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("contacted"));
        assertThat(dsl.fetchCount(AUDIT_LOGS, AUDIT_LOGS.RECORD_ID.eq(UUID.fromString(id)))).isEqualTo(1);
    }

    @Test
    void notesAndNewStudent() throws Exception {
        String id = createInquiry();
        mvc.perform(json(post("/api/admin/inquiries/" + id + "/notes"), "{\"content\":\"통화 완료\"}").with(user(counselor)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.notes[0].content").value("통화 완료"))
                .andExpect(jsonPath("$.notes[0].authorName").value("i-counselor"));

        JsonNode detail = body(json(post("/api/admin/inquiries/" + id + "/student"), "{}").with(user(counselor)));
        assertThat(detail.at("/student/name").asText()).isEqualTo("김신청");
        assertThat(detail.at("/student/status").asText()).isEqualTo("test_scheduled");
        assertThat(detail.at("/student/studentCode").asText()).startsWith("S-");

        var student = dsl.selectFrom(STUDENTS).where(STUDENTS.ID.eq(UUID.fromString(detail.at("/student/id").asText()))).fetchOne();
        assertThat(student.getParentPhone()).isEqualTo("010-1234-5678");

        // 두 번 연결 불가
        mvc.perform(json(post("/api/admin/inquiries/" + id + "/student"), "{}").with(user(counselor)))
                .andExpect(status().isConflict());
    }

    @Test
    void similarStudentAndLinkExisting() throws Exception {
        UUID existing = dsl.insertInto(STUDENTS).set(STUDENTS.NAME, "김신청").set(STUDENTS.SCHOOL, "한빛중")
                .set(STUDENTS.PARENT_PHONE, "010-1234-5678").set(STUDENTS.STATUS, StudentStatus.consulting)
                .returning(STUDENTS.ID).fetchOne(STUDENTS.ID);
        String id = createInquiry();
        mvc.perform(get("/api/admin/inquiries/" + id).with(user(counselor)))
                .andExpect(jsonPath("$.similarStudents[0].id").value(existing.toString()));

        mvc.perform(json(post("/api/admin/inquiries/" + id + "/student"), "{\"existingStudentId\":\"" + existing + "\"}")
                        .with(user(counselor)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.student.id").value(existing.toString()))
                .andExpect(jsonPath("$.student.status").value("test_scheduled"))
                .andExpect(jsonPath("$.similarStudents.length()").value(0));
    }

    @Test
    void listCountsAndPermissions() throws Exception {
        createInquiry();
        createInquiry();
        mvc.perform(get("/api/admin/inquiries?q=김신청").with(user(counselor)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(2));
        mvc.perform(get("/api/admin/inquiries/counts?q=5678").with(user(counselor)))
                .andExpect(jsonPath("$.received").value(2));
        mvc.perform(get("/api/admin/inquiries").with(user(teacher))).andExpect(status().isForbidden());
        mvc.perform(get("/api/admin/inquiries/" + UUID.randomUUID()).with(user(counselor)))
                .andExpect(status().isNotFound());
    }
}
