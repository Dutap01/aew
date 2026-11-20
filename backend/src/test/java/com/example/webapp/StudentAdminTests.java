package com.example.webapp;

import static com.example.webapp.jooq.Tables.ENROLLMENTS;
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

import com.example.webapp.jooq.Tables;
import com.example.webapp.jooq.enums.UserRole;
import com.example.webapp.security.AppUser;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

/** 학생 등록·수정·상담 기록·반 넣기/종료와 타임라인 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class StudentAdminTests {

    @Autowired MockMvc mvc;
    @Autowired DSLContext dsl;
    @Autowired ObjectMapper mapper;

    private AppUser owner;
    private AppUser counselor;
    private UUID classId;

    private static final String NEW_STUDENT = """
            {"name":"한등록","school":"한빛중","grade":"중1","parentName":"한보호자","parentPhone":"01098765432"}""";

    @BeforeEach
    void data() {
        owner = account("s-owner", UserRole.owner);
        counselor = account("s-counselor", UserRole.counselor);
        classId = dsl.insertInto(Tables.CLASSES).set(Tables.CLASSES.NAME, "학생테스트반").set(Tables.CLASSES.LEVEL, "M1")
                .set(Tables.CLASSES.CAPACITY, 1).returning(Tables.CLASSES.ID).fetchOne(Tables.CLASSES.ID);
    }

    private AppUser account(String loginId, UserRole role) {
        UUID id = dsl.insertInto(PROFILES).set(PROFILES.LOGIN_ID, loginId).set(PROFILES.PASSWORD_HASH, "x")
                .set(PROFILES.ROLE, role).set(PROFILES.NAME, loginId).returning(PROFILES.ID).fetchOne(PROFILES.ID);
        return new AppUser(id, loginId, null, loginId, role, true);
    }

    private MockHttpServletRequestBuilder json(MockHttpServletRequestBuilder b, String body) {
        return b.contentType(MediaType.APPLICATION_JSON).content(body).with(csrf());
    }

    private JsonNode call(MockHttpServletRequestBuilder b) throws Exception {
        return mapper.readTree(mvc.perform(b).andReturn().getResponse().getContentAsString());
    }

    private String createStudent() throws Exception {
        return call(json(post("/api/admin/students"), NEW_STUDENT).with(user(counselor))).get("id").asText();
    }

    @Test
    void counselorCreatesAndEditsStudent() throws Exception {
        mvc.perform(json(post("/api/admin/students"), NEW_STUDENT).with(user(counselor)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("consulting"))
                .andExpect(jsonPath("$.parentPhone").value("010-9876-5432"))
                .andExpect(jsonPath("$.studentCode").exists())
                .andExpect(jsonPath("$.timeline[0].kind").value("created"));

        String id = createStudent();
        mvc.perform(json(put("/api/admin/students/" + id),
                        "{\"name\":\"한수정\",\"grade\":\"중2\",\"parentPhone\":\"\",\"status\":\"test_scheduled\"}").with(user(counselor)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("한수정"))
                .andExpect(jsonPath("$.school").doesNotExist())
                .andExpect(jsonPath("$.parentPhone").doesNotExist())
                .andExpect(jsonPath("$.status").value("test_scheduled"))
                .andExpect(jsonPath("$.timeline[0].kind").value("status_change"))
                .andExpect(jsonPath("$.timeline[0].title").value("상태 변경: 상담중 → 테스트예정"));
    }

    @Test
    void validationAndEnrolledStatusRules() throws Exception {
        mvc.perform(json(post("/api/admin/students"), "{\"name\":\" \",\"parentPhone\":\"02-123\"}").with(user(counselor)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.name").exists())
                .andExpect(jsonPath("$.fieldErrors.parentPhone").exists());
        // 재원은 반에 넣어야 된다
        mvc.perform(json(post("/api/admin/students"), "{\"name\":\"바로재원\",\"status\":\"enrolled\"}").with(user(counselor)))
                .andExpect(status().isConflict());
        String id = createStudent();
        mvc.perform(json(put("/api/admin/students/" + id), "{\"name\":\"한등록\",\"status\":\"enrolled\"}").with(user(counselor)))
                .andExpect(status().isConflict());
    }

    @Test
    void notesShowInTimeline() throws Exception {
        String id = createStudent();
        mvc.perform(json(post("/api/admin/students/" + id + "/notes"), "{\"content\":\"학부모 통화\"}").with(user(counselor)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.timeline[0].kind").value("note"))
                .andExpect(jsonPath("$.timeline[0].detail").value("학부모 통화"))
                .andExpect(jsonPath("$.timeline[0].actorName").value("s-counselor"));
    }

    @Test
    void ownerEnrollsCapacityAndWithdraw() throws Exception {
        String id = createStudent();
        String enroll = "{\"classId\":\"" + classId + "\"}";
        // 실장은 반 배정 불가
        mvc.perform(json(post("/api/admin/students/" + id + "/enrollments"), enroll).with(user(counselor)))
                .andExpect(status().isForbidden());

        JsonNode d = call(json(post("/api/admin/students/" + id + "/enrollments"), enroll).with(user(owner)));
        assertThat(d.get("status").asText()).isEqualTo("enrolled");
        assertThat(d.at("/enrollments/0/className").asText()).isEqualTo("학생테스트반");
        assertThat(d.at("/enrollments/0/endDate").isNull()).isTrue();

        // 같은 반 두 번 불가
        mvc.perform(json(post("/api/admin/students/" + id + "/enrollments"), enroll).with(user(owner)))
                .andExpect(status().isConflict());
        // 정원 1명: 다른 학생은 못 들어간다
        String other = createStudent();
        mvc.perform(json(post("/api/admin/students/" + other + "/enrollments"), enroll).with(user(owner)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("'학생테스트반' 반 정원(1명)이 찼습니다."));
        // 학생이 있는 반은 운영 종료 불가
        mvc.perform(json(put("/api/admin/classes/" + classId),
                        "{\"name\":\"학생테스트반\",\"level\":\"M1\",\"capacity\":1,\"active\":false,\"schedules\":[]}").with(user(owner)))
                .andExpect(status().isConflict());

        // 퇴원하면 반 소속이 종료된다
        mvc.perform(json(put("/api/admin/students/" + id), "{\"name\":\"한등록\",\"status\":\"withdrawn\"}").with(user(counselor)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("withdrawn"))
                .andExpect(jsonPath("$.enrollments[0].endDate").exists());
        assertThat(dsl.fetchCount(ENROLLMENTS, ENROLLMENTS.CLASS_ID.eq(classId).and(ENROLLMENTS.END_DATE.isNull()))).isZero();
        // 자리가 났으니 다른 학생이 들어갈 수 있다
        mvc.perform(json(post("/api/admin/students/" + other + "/enrollments"), enroll).with(user(owner)))
                .andExpect(status().isOk());
    }

    @Test
    void endEnrollmentKeepsStatus() throws Exception {
        String id = createStudent();
        JsonNode d = call(json(post("/api/admin/students/" + id + "/enrollments"),
                "{\"classId\":\"" + classId + "\",\"startDate\":\"2026-11-02\"}").with(user(owner)));
        String enrollmentId = d.at("/enrollments/0/id").asText();

        mvc.perform(json(put("/api/admin/students/" + id + "/enrollments/" + enrollmentId + "/end"), "{\"endDate\":\"2026-11-01\"}")
                        .with(user(owner)))
                .andExpect(status().isConflict()); // 시작일 이전
        mvc.perform(json(put("/api/admin/students/" + id + "/enrollments/" + enrollmentId + "/end"), "{\"endDate\":\"2026-11-20\"}")
                        .with(user(counselor)))
                .andExpect(status().isForbidden());
        mvc.perform(json(put("/api/admin/students/" + id + "/enrollments/" + enrollmentId + "/end"), "{\"endDate\":\"2026-11-20\"}")
                        .with(user(owner)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("enrolled"))
                .andExpect(jsonPath("$.enrollments[0].endDate").value("2026-11-20"))
                .andExpect(jsonPath("$.timeline[?(@.kind == 'enrollment_end')]").exists());
        mvc.perform(json(put("/api/admin/students/" + id + "/enrollments/" + enrollmentId + "/end"), "{}").with(user(owner)))
                .andExpect(status().isConflict()); // 이미 종료
    }

    @Test
    void notFound() throws Exception {
        mvc.perform(get("/api/admin/students/" + UUID.randomUUID()).with(user(counselor))).andExpect(status().isNotFound());
        assertThat(dsl.fetchCount(STUDENTS, STUDENTS.NAME.eq("없는학생"))).isZero();
    }
}
