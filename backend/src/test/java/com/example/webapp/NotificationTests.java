package com.example.webapp;

import static com.example.webapp.jooq.Tables.INQUIRIES;
import static com.example.webapp.jooq.Tables.NOTIFICATIONS;
import static com.example.webapp.jooq.Tables.PROFILES;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.OffsetDateTime;
import java.util.List;
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
import com.example.webapp.jooq.enums.NotificationStatus;
import com.example.webapp.jooq.enums.UserRole;
import com.example.webapp.jooq.tables.records.NotificationsRecord;
import com.example.webapp.security.AppUser;
import com.example.webapp.worker.NotificationWorker;
import com.fasterxml.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class NotificationTests {

    @Autowired MockMvc mvc;
    @Autowired DSLContext dsl;
    @Autowired ObjectMapper mapper;
    @Autowired NotificationWorker worker;

    private AppUser counselor;

    @BeforeEach
    void data() {
        UUID id = dsl.insertInto(PROFILES).set(PROFILES.LOGIN_ID, "n-counselor").set(PROFILES.PASSWORD_HASH, "x")
                .set(PROFILES.ROLE, UserRole.counselor).set(PROFILES.NAME, "n-counselor").returning(PROFILES.ID).fetchOne(PROFILES.ID);
        counselor = new AppUser(id, "n-counselor", null, "n-counselor", UserRole.counselor, true);
    }

    private UUID inquiry(String phone) {
        return dsl.insertInto(INQUIRIES).set(INQUIRIES.TYPE, InquiryType.level_test)
                .set(INQUIRIES.APPLICANT_NAME, "보호자").set(INQUIRIES.APPLICANT_PHONE, phone)
                .set(INQUIRIES.STUDENT_NAME, "알림학생").set(INQUIRIES.PREFERRED_SLOTS, JSONB.valueOf("[]"))
                .set(INQUIRIES.STATUS, InquiryStatus.contacted)
                .returning(INQUIRIES.ID).fetchOne(INQUIRIES.ID);
    }

    private MockHttpServletRequestBuilder json(MockHttpServletRequestBuilder b, String body) {
        return b.contentType(MediaType.APPLICATION_JSON).content(body).with(csrf()).with(user(counselor));
    }

    private String schedule(UUID inquiryId, String start, String end) throws Exception {
        var res = mvc.perform(json(post("/api/admin/appointments"),
                "{\"inquiryId\":\"%s\",\"startsAt\":\"%s\",\"endsAt\":\"%s\"}".formatted(inquiryId, start, end)))
                .andExpect(status().isCreated()).andReturn();
        return mapper.readTree(res.getResponse().getContentAsString()).get("id").asText();
    }

    private List<NotificationsRecord> notices(String appointmentId) {
        return dsl.selectFrom(NOTIFICATIONS).where(NOTIFICATIONS.APPOINTMENT_ID.eq(UUID.fromString(appointmentId)))
                .orderBy(NOTIFICATIONS.CREATED_AT, NOTIFICATIONS.ID).fetch();
    }

    @Test
    void confirmedNoticeIsQueuedAndMockSent() throws Exception {
        String a = schedule(inquiry("010-1111-2222"), "2026-12-01T16:00:00+09:00", "2026-12-01T17:00:00+09:00");
        var n = notices(a);
        assertThat(n).hasSize(1);
        assertThat(n.get(0).getTemplateCode()).isEqualTo("appointment_confirmed");
        assertThat(n.get(0).getToPhone()).isEqualTo("010-1111-2222");
        assertThat(n.get(0).getBody()).contains("알림학생 학생 레벨테스트", "12/1(화) 16:00", "예약되었습니다");
        assertThat(n.get(0).getStatus()).isEqualTo(NotificationStatus.queued);

        assertThat(worker.runOnce()).isEqualTo(1);
        var sent = notices(a).get(0);
        assertThat(sent.getStatus()).isEqualTo(NotificationStatus.succeeded);
        assertThat(sent.getProviderMsgId()).startsWith("mock-");
        assertThat(sent.getSentAt()).isNotNull();
        assertThat(worker.runOnce()).isZero(); // 다시 보내지 않음
    }

    @Test
    void changeAndCancelNotices() throws Exception {
        String a = schedule(inquiry("010-1111-3333"), "2026-12-02T16:00:00+09:00", "2026-12-02T17:00:00+09:00");
        // 메모만 바꾸면 안내 없음, 시간을 바꾸면 변경 안내
        mvc.perform(json(put("/api/admin/appointments/" + a),
                "{\"title\":\"t\",\"startsAt\":\"2026-12-02T16:00:00+09:00\",\"endsAt\":\"2026-12-02T17:00:00+09:00\",\"memo\":\"메모\"}"))
                .andExpect(status().isOk());
        assertThat(notices(a)).hasSize(1);
        mvc.perform(json(put("/api/admin/appointments/" + a),
                "{\"title\":\"t\",\"startsAt\":\"2026-12-03T10:00:00+09:00\",\"endsAt\":\"2026-12-03T11:00:00+09:00\"}"))
                .andExpect(status().isOk());
        // (테스트는 한 트랜잭션이라 created_at 이 같아 순서 대신 내용으로 확인)
        assertThat(notices(a)).extracting(NotificationsRecord::getTemplateCode)
                .containsExactlyInAnyOrder("appointment_confirmed", "appointment_changed");
        assertThat(notices(a)).filteredOn(n -> n.getTemplateCode().equals("appointment_changed"))
                .singleElement().satisfies(n -> assertThat(n.getBody()).contains("12/3(목) 10:00", "변경되었습니다"));

        mvc.perform(json(put("/api/admin/appointments/" + a + "/status"), "{\"status\":\"canceled\"}")).andExpect(status().isOk());
        assertThat(notices(a)).extracting(NotificationsRecord::getTemplateCode)
                .containsExactlyInAnyOrder("appointment_confirmed", "appointment_changed", "appointment_canceled");
    }

    @Test
    void inquiryCancelSendsCancelNotice() throws Exception {
        UUID q = inquiry("010-1111-4444");
        String a = schedule(q, "2026-12-04T16:00:00+09:00", "2026-12-04T17:00:00+09:00");
        mvc.perform(json(put("/api/admin/inquiries/" + q + "/status"), "{\"status\":\"canceled\"}")).andExpect(status().isOk());
        assertThat(notices(a)).extracting(NotificationsRecord::getTemplateCode)
                .containsExactlyInAnyOrder("appointment_confirmed", "appointment_canceled");
    }

    @Test
    void failureRetriesThenFailsAndResend() throws Exception {
        String a = schedule(inquiry("010-1234-0000"), "2026-12-05T16:00:00+09:00", "2026-12-05T17:00:00+09:00");
        UUID id = notices(a).get(0).getId();
        for (int i = 1; i <= NotificationWorker.MAX_ATTEMPTS; i++) {
            // 재시도 시각을 기다리지 않도록 당겨 둔다
            dsl.update(NOTIFICATIONS).set(NOTIFICATIONS.NEXT_ATTEMPT_AT, OffsetDateTime.now().minusSeconds(1))
                    .where(NOTIFICATIONS.ID.eq(id)).execute();
            worker.runOnce();
            var n = dsl.selectFrom(NOTIFICATIONS).where(NOTIFICATIONS.ID.eq(id)).fetchOne();
            assertThat(n.getAttempts()).isEqualTo(i);
            assertThat(n.getError()).contains("가짜 발송 실패");
            assertThat(n.getStatus()).isEqualTo(i < NotificationWorker.MAX_ATTEMPTS ? NotificationStatus.queued : NotificationStatus.failed);
        }
        mvc.perform(post("/api/admin/notifications/" + id + "/resend").with(csrf()).with(user(counselor))).andExpect(status().isNoContent());
        var n = dsl.selectFrom(NOTIFICATIONS).where(NOTIFICATIONS.ID.eq(id)).fetchOne();
        assertThat(n.getStatus()).isEqualTo(NotificationStatus.queued);
        assertThat(n.getAttempts()).isZero();

        mvc.perform(get("/api/admin/notifications/counts").with(user(counselor)))
                .andExpect(jsonPath("$.sender").value("mock"));
        mvc.perform(get("/api/admin/notifications").param("q", "0000").with(user(counselor)))
                .andExpect(jsonPath("$.items[0].id").value(id.toString()))
                .andExpect(jsonPath("$.items[0].templateLabel").value("예약 확정"));
    }

    @Test
    void noPhoneNoNoticeAndTeacherBlocked() throws Exception {
        var res = mvc.perform(json(post("/api/admin/appointments"),
                "{\"kind\":\"consult\",\"title\":\"번호 없는 일정\",\"startsAt\":\"2026-12-06T10:00:00+09:00\",\"endsAt\":\"2026-12-06T10:30:00+09:00\"}"))
                .andExpect(status().isCreated()).andReturn();
        String a = mapper.readTree(res.getResponse().getContentAsString()).get("id").asText();
        assertThat(notices(a)).isEmpty();

        UUID t = dsl.insertInto(PROFILES).set(PROFILES.LOGIN_ID, "n-teacher").set(PROFILES.PASSWORD_HASH, "x")
                .set(PROFILES.ROLE, UserRole.teacher).set(PROFILES.NAME, "t").returning(PROFILES.ID).fetchOne(PROFILES.ID);
        mvc.perform(get("/api/admin/notifications").with(user(new AppUser(t, "n-teacher", null, "t", UserRole.teacher, true))))
                .andExpect(status().isForbidden());
    }
}
