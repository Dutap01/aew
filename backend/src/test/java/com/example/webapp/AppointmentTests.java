package com.example.webapp;

import static com.example.webapp.jooq.Tables.INQUIRIES;
import static com.example.webapp.jooq.Tables.PROFILES;
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
import org.jooq.JSONB;
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

import com.example.webapp.jooq.enums.InquiryStatus;
import com.example.webapp.jooq.enums.InquiryType;
import com.example.webapp.jooq.enums.UserRole;
import com.example.webapp.security.AppUser;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class AppointmentTests {

    @Autowired MockMvc mvc;
    @Autowired DSLContext dsl;
    @Autowired ObjectMapper mapper;

    private AppUser counselor;
    private AppUser teacher;
    private UUID inquiryId;

    @BeforeEach
    void data() {
        counselor = account("a-counselor", UserRole.counselor);
        teacher = account("a-teacher", UserRole.teacher);
        inquiryId = dsl.insertInto(INQUIRIES).set(INQUIRIES.TYPE, InquiryType.level_test)
                .set(INQUIRIES.APPLICANT_NAME, "보호자").set(INQUIRIES.APPLICANT_PHONE, "010-1111-2222")
                .set(INQUIRIES.STUDENT_NAME, "달력학생").set(INQUIRIES.PREFERRED_SLOTS, JSONB.valueOf("[]"))
                .set(INQUIRIES.STATUS, InquiryStatus.contacted)
                .returning(INQUIRIES.ID).fetchOne(INQUIRIES.ID);
    }

    private AppUser account(String loginId, UserRole role) {
        UUID id = dsl.insertInto(PROFILES).set(PROFILES.LOGIN_ID, loginId).set(PROFILES.PASSWORD_HASH, "x")
                .set(PROFILES.ROLE, role).set(PROFILES.NAME, loginId).returning(PROFILES.ID).fetchOne(PROFILES.ID);
        return new AppUser(id, loginId, null, loginId, role, true);
    }

    private MockHttpServletRequestBuilder json(MockHttpServletRequestBuilder b, String body) {
        return b.contentType(MediaType.APPLICATION_JSON).content(body).with(csrf()).with(user(counselor));
    }

    private JsonNode create(String body) throws Exception {
        var res = mvc.perform(json(post("/api/admin/appointments"), body)).andExpect(status().isCreated()).andReturn();
        return mapper.readTree(res.getResponse().getContentAsString());
    }

    private InquiryStatus inquiryStatus() {
        return dsl.select(INQUIRIES.STATUS).from(INQUIRIES).where(INQUIRIES.ID.eq(inquiryId)).fetchOne(INQUIRIES.STATUS);
    }

    @Test
    void scheduleFromInquiryThenComplete() throws Exception {
        JsonNode a = create("""
                {"inquiryId":"%s","startsAt":"2026-12-01T16:00:00+09:00","endsAt":"2026-12-01T17:00:00+09:00"}"""
                .formatted(inquiryId));
        assertThat(a.get("title").asText()).isEqualTo("달력학생 레벨테스트");
        assertThat(a.get("kind").asText()).isEqualTo("level_test");
        assertThat(a.get("counselorName").asText()).isEqualTo("a-counselor"); // 담당자 기본값: 등록한 사람
        assertThat(inquiryStatus()).isEqualTo(InquiryStatus.scheduled);

        mvc.perform(get("/api/admin/inquiries/" + inquiryId).with(user(counselor)))
                .andExpect(jsonPath("$.appointments[0].id").value(a.get("id").asText()));

        mvc.perform(json(put("/api/admin/appointments/" + a.get("id").asText() + "/status"), "{\"status\":\"done\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("done"));
        assertThat(inquiryStatus()).isEqualTo(InquiryStatus.completed);
    }

    @Test
    void cancelReturnsInquiryToContacted() throws Exception {
        JsonNode a = create("""
                {"inquiryId":"%s","startsAt":"2026-12-02T16:00:00+09:00","endsAt":"2026-12-02T16:30:00+09:00"}"""
                .formatted(inquiryId));
        mvc.perform(json(put("/api/admin/appointments/" + a.get("id").asText() + "/status"), "{\"status\":\"canceled\"}"))
                .andExpect(status().isOk());
        assertThat(inquiryStatus()).isEqualTo(InquiryStatus.contacted);
        // 취소된 일정은 변경 불가
        mvc.perform(json(put("/api/admin/appointments/" + a.get("id").asText()),
                        "{\"title\":\"x\",\"startsAt\":\"2026-12-02T17:00:00+09:00\",\"endsAt\":\"2026-12-02T17:30:00+09:00\"}"))
                .andExpect(status().isConflict());
    }

    @Test
    void overlapForSameCounselorIsRejected() throws Exception {
        create("""
                {"kind":"consult","title":"학부모 상담 A","startsAt":"2026-12-03T14:00:00+09:00","endsAt":"2026-12-03T15:00:00+09:00"}""");
        mvc.perform(json(post("/api/admin/appointments"), """
                {"kind":"consult","title":"학부모 상담 B","startsAt":"2026-12-03T14:30:00+09:00","endsAt":"2026-12-03T15:30:00+09:00"}"""))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("학부모 상담 A (12/3 14:00~15:00)")));
        // 바로 이어지는 시간은 가능
        create("""
                {"kind":"consult","title":"학부모 상담 C","startsAt":"2026-12-03T15:00:00+09:00","endsAt":"2026-12-03T15:30:00+09:00"}""");
    }

    @Test
    void validationAndRange() throws Exception {
        mvc.perform(json(post("/api/admin/appointments"), """
                {"kind":"consult","title":"거꾸로","startsAt":"2026-12-04T15:00:00+09:00","endsAt":"2026-12-04T14:00:00+09:00"}"""))
                .andExpect(status().isConflict());
        mvc.perform(json(post("/api/admin/appointments"), """
                {"kind":"consult","startsAt":"2026-12-04T15:00:00+09:00","endsAt":"2026-12-04T16:00:00+09:00"}"""))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("제목을 입력하세요."));
        mvc.perform(json(post("/api/admin/appointments"), """
                {"kind":"consult","title":"강사 담당 불가","counselorId":"%s","startsAt":"2026-12-04T15:00:00+09:00","endsAt":"2026-12-04T16:00:00+09:00"}"""
                .formatted(teacher.id())))
                .andExpect(status().isConflict());

        create("""
                {"kind":"consult","title":"범위 안","startsAt":"2026-12-05T10:00:00+09:00","endsAt":"2026-12-05T10:30:00+09:00"}""");
        mvc.perform(get("/api/admin/appointments").param("from", "2026-12-05T00:00:00+09:00").param("to", "2026-12-06T00:00:00+09:00").with(user(counselor)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].title").value("범위 안"));
        mvc.perform(get("/api/admin/appointments").param("from", "2026-12-06T00:00:00+09:00").param("to", "2026-12-07T00:00:00+09:00").with(user(counselor)))
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void inquiryStatusMustMatchCalendar() throws Exception {
        // 일정 없이 예약확정 불가
        mvc.perform(json(put("/api/admin/inquiries/" + inquiryId + "/status"), "{\"status\":\"scheduled\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("일정 잡기")));
        assertThat(inquiryStatus()).isEqualTo(InquiryStatus.contacted);

        JsonNode a = create("""
                {"inquiryId":"%s","startsAt":"2026-12-08T16:00:00+09:00","endsAt":"2026-12-08T17:00:00+09:00"}"""
                .formatted(inquiryId));
        // 예약이 남아 있으면 접수만 완료·되돌리기 불가
        mvc.perform(json(put("/api/admin/inquiries/" + inquiryId + "/status"), "{\"status\":\"completed\"}"))
                .andExpect(status().isConflict());
        mvc.perform(json(put("/api/admin/inquiries/" + inquiryId + "/status"), "{\"status\":\"contacted\"}"))
                .andExpect(status().isConflict());

        // 일정 2개 중 1개 완료 → 접수는 예약확정 유지
        JsonNode b = create("""
                {"inquiryId":"%s","startsAt":"2026-12-09T16:00:00+09:00","endsAt":"2026-12-09T17:00:00+09:00"}"""
                .formatted(inquiryId));
        mvc.perform(json(put("/api/admin/appointments/" + a.get("id").asText() + "/status"), "{\"status\":\"done\"}"))
                .andExpect(status().isOk());
        assertThat(inquiryStatus()).isEqualTo(InquiryStatus.scheduled);

        // 접수 취소 → 남은 예약 일정도 취소
        mvc.perform(json(put("/api/admin/inquiries/" + inquiryId + "/status"), "{\"status\":\"canceled\"}"))
                .andExpect(status().isOk());
        mvc.perform(get("/api/admin/inquiries/" + inquiryId).with(user(counselor)))
                .andExpect(jsonPath("$.appointments[?(@.id == '" + b.get("id").asText() + "')].status").value("canceled"))
                .andExpect(jsonPath("$.appointments[?(@.id == '" + a.get("id").asText() + "')].status").value("done"));
    }

    @Test
    void teacherCannotAccess() throws Exception {
        mvc.perform(get("/api/admin/appointments/counselors").with(user(teacher))).andExpect(status().isForbidden());
        mvc.perform(get("/api/admin/appointments/counselors").with(user(counselor)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.name == 'a-counselor')]").exists())
                .andExpect(jsonPath("$[?(@.name == 'a-teacher')]").doesNotExist());
    }
}
