package com.example.webapp;

import static com.example.webapp.jooq.Tables.ATTEMPTS;
import static com.example.webapp.jooq.Tables.ITEMS;
import static com.example.webapp.jooq.Tables.PROFILES;
import static com.example.webapp.jooq.Tables.STUDENTS;
import static com.example.webapp.jooq.Tables.TESTS;
import static com.example.webapp.jooq.Tables.TEST_ITEMS;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

import org.jooq.DSLContext;
import org.jooq.JSONB;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;

import com.example.webapp.jooq.enums.AttemptStatus;
import com.example.webapp.jooq.enums.ItemType;
import com.example.webapp.jooq.enums.StudentStatus;
import com.example.webapp.jooq.enums.TestKind;
import com.example.webapp.jooq.enums.UserRole;
import com.example.webapp.security.AppUser;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

/** 레벨테스트: 발급(계정 생성) → 시작 → 답 저장 → 제출 자동채점 → 서술형 채점, 본인만 응시 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class LevelTestTests {

    @Autowired MockMvc mvc;
    @Autowired DSLContext dsl;
    @Autowired ObjectMapper mapper;
    @Autowired PasswordEncoder encoder;

    private AppUser counselor;
    private UUID testId;
    private UUID studentId;
    private UUID choiceItem;
    private UUID shortItem;
    private UUID essayItem;

    @BeforeEach
    void data() {
        counselor = staff("lt-counselor", UserRole.counselor);
        testId = dsl.insertInto(TESTS).set(TESTS.KIND, TestKind.level).set(TESTS.TITLE, "테스트용 레벨테스트")
                .set(TESTS.TIME_LIMIT_MINUTES, 30).returning(TESTS.ID).fetchOne(TESTS.ID);
        choiceItem = item(1, "LTT-1", ItemType.choice, "문법", "{\"stem\":\"She ___ to school.\",\"choices\":[\"go\",\"goes\"]}", "{\"choice\":2}");
        shortItem = item(2, "LTT-2", ItemType.short_, "문법", "{\"stem\":\"past of go\"}", "{\"accepted\":[\"went\"]}");
        essayItem = item(3, "LTT-3", ItemType.essay, "쓰기", "{\"stem\":\"Introduce yourself.\"}", "{\"rubric\":\"문장 3개 이상\"}");
        studentId = dsl.insertInto(STUDENTS).set(STUDENTS.NAME, "응시학생").set(STUDENTS.STATUS, StudentStatus.consulting)
                .returning(STUDENTS.ID).fetchOne(STUDENTS.ID);
    }

    private AppUser staff(String loginId, UserRole role) {
        UUID id = dsl.insertInto(PROFILES).set(PROFILES.LOGIN_ID, loginId).set(PROFILES.PASSWORD_HASH, "x")
                .set(PROFILES.ROLE, role).set(PROFILES.NAME, loginId).returning(PROFILES.ID).fetchOne(PROFILES.ID);
        return new AppUser(id, loginId, null, loginId, role, true);
    }

    private UUID item(int seq, String code, ItemType type, String area, String content, String answer) {
        UUID id = dsl.insertInto(ITEMS).set(ITEMS.ITEM_CODE, code).set(ITEMS.TYPE, type).set(ITEMS.AREA, area)
                .set(ITEMS.CONTENT, JSONB.valueOf(content)).set(ITEMS.ANSWER, JSONB.valueOf(answer))
                .set(ITEMS.POINTS, BigDecimal.valueOf(5)).returning(ITEMS.ID).fetchOne(ITEMS.ID);
        dsl.insertInto(TEST_ITEMS).set(TEST_ITEMS.TEST_ID, testId).set(TEST_ITEMS.SEQ, seq).set(TEST_ITEMS.ITEM_ID, id).execute();
        return id;
    }

    private MockHttpServletRequestBuilder json(MockHttpServletRequestBuilder b, String body) {
        return b.contentType(MediaType.APPLICATION_JSON).content(body).with(csrf());
    }

    private JsonNode call(MockHttpServletRequestBuilder b) throws Exception {
        String body = mvc.perform(b).andReturn().getResponse().getContentAsString();
        return body.isEmpty() ? null : mapper.readTree(body);
    }

    /** 발급하고 (발급 응답, 레벨테스트 계정) */
    private Object[] issue() throws Exception {
        JsonNode res = call(json(post("/api/admin/attempts"), "{\"studentId\":\"" + studentId + "\",\"testId\":\"" + testId + "\"}")
                .with(user(counselor)));
        UUID takerId = dsl.select(ATTEMPTS.TAKER_ID).from(ATTEMPTS).where(ATTEMPTS.ID.eq(UUID.fromString(res.at("/attempt/id").asText())))
                .fetchOne(ATTEMPTS.TAKER_ID);
        var p = dsl.selectFrom(PROFILES).where(PROFILES.ID.eq(takerId)).fetchOne();
        return new Object[] {res, new AppUser(p.getId(), p.getLoginId(), null, p.getName(), p.getRole(), true)};
    }

    private String answer(UUID itemId, String extra) {
        return "{\"itemId\":\"" + itemId + "\"," + extra + "}";
    }

    @Test
    void fullFlowWithAutoAndManualScoring() throws Exception {
        Object[] issued = issue();
        JsonNode res = (JsonNode) issued[0];
        AppUser student = (AppUser) issued[1];
        String id = res.at("/attempt/id").asText();

        // 학생 정식 계정과 별도인 레벨테스트 계정 (T + 6자리, 비밀번호 6자리는 한 번만, DB 에는 해시)
        assertThat(res.get("loginId").asText()).matches("T\\d{6}");
        assertThat(student.role()).isEqualTo(UserRole.test_taker);
        assertThat(dsl.select(STUDENTS.PROFILE_ID).from(STUDENTS).where(STUDENTS.ID.eq(studentId)).fetchOne(STUDENTS.PROFILE_ID)).isNull();
        assertThat(OffsetDateTime.parse(res.get("expiresAt").asText()))
                .isBetween(OffsetDateTime.now().plusMinutes(29), OffsetDateTime.now().plusMinutes(31)); // 기본 30분
        String pw = res.get("password").asText();
        assertThat(pw).matches("\\d{6}");
        assertThat(encoder.matches(pw, dsl.select(PROFILES.PASSWORD_HASH).from(PROFILES).where(PROFILES.ID.eq(student.id())).fetchOne(PROFILES.PASSWORD_HASH))).isTrue();
        assertThat(dsl.select(STUDENTS.STATUS).from(STUDENTS).where(STUDENTS.ID.eq(studentId)).fetchOne(STUDENTS.STATUS))
                .isEqualTo(StudentStatus.test_scheduled);

        // 시작 전: 문항 없음, 답 저장 불가
        mvc.perform(get("/api/s/attempts/" + id).with(user(student)))
                .andExpect(jsonPath("$.status").value("issued"))
                .andExpect(jsonPath("$.itemCount").value(3))
                .andExpect(jsonPath("$.items.length()").value(0));
        mvc.perform(json(put("/api/s/attempts/" + id + "/answers"), answer(choiceItem, "\"choice\":2")).with(user(student)))
                .andExpect(status().isConflict());

        // 레벨테스트 계정은 다른 학생 화면에 못 들어간다
        mvc.perform(get("/api/s/timetable").with(user(student))).andExpect(status().isForbidden());

        mvc.perform(post("/api/s/attempts/" + id + "/start").with(csrf()).with(user(student)))
                .andExpect(jsonPath("$.status").value("in_progress"))
                .andExpect(jsonPath("$.deadline").exists())
                .andExpect(jsonPath("$.items[0].choices[1]").value("goes"))
                .andExpect(jsonPath("$.items[0].answer").doesNotExist()); // 정답은 내려주지 않음

        mvc.perform(json(put("/api/s/attempts/" + id + "/answers"), answer(choiceItem, "\"choice\":1")).with(user(student)))
                .andExpect(status().isNoContent());
        mvc.perform(json(put("/api/s/attempts/" + id + "/answers"), answer(choiceItem, "\"choice\":2")).with(user(student))); // 고쳐 쓰기
        mvc.perform(json(put("/api/s/attempts/" + id + "/answers"), answer(shortItem, "\"text\":\" Went. \"")).with(user(student)));
        mvc.perform(json(put("/api/s/attempts/" + id + "/answers"), answer(essayItem, "\"text\":\"I am a student.\"")).with(user(student)));
        mvc.perform(json(put("/api/s/attempts/" + id + "/answers"), answer(choiceItem, "\"choice\":9")).with(user(student)))
                .andExpect(status().isConflict()); // 없는 보기

        mvc.perform(get("/api/s/attempts/" + id).with(user(student)))
                .andExpect(jsonPath("$.items[0].savedChoice").value(2))
                .andExpect(jsonPath("$.items[1].savedText").value(" Went. "));

        mvc.perform(post("/api/s/attempts/" + id + "/submit").with(csrf()).with(user(student)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("submitted")) // 서술형 채점 대기
                .andExpect(jsonPath("$.items.length()").value(0));
        mvc.perform(post("/api/s/attempts/" + id + "/submit").with(csrf()).with(user(student))).andExpect(status().isConflict());

        // 운영자 결과: 객관식·단답 자동채점 10점, 서술형 대기
        mvc.perform(get("/api/admin/attempts/" + id).with(user(counselor)))
                .andExpect(jsonPath("$.summary.status").value("submitted"))
                .andExpect(jsonPath("$.summary.score").value(10))
                .andExpect(jsonPath("$.summary.maxScore").value(15))
                .andExpect(jsonPath("$.ruleVersion").value("scoring-v1"))
                .andExpect(jsonPath("$.items[0].correctAnswer").value("② goes"))
                .andExpect(jsonPath("$.items[0].studentAnswer").value("② goes"))
                .andExpect(jsonPath("$.items[1].isCorrect").value(true))
                .andExpect(jsonPath("$.items[2].score").doesNotExist())
                .andExpect(jsonPath("$.areas[?(@.area == '쓰기')].pending").value(1));

        // 서술형 채점 → 채점완료
        mvc.perform(json(put("/api/admin/attempts/" + id + "/items/" + shortItem + "/score"), "{\"score\":1}").with(user(counselor)))
                .andExpect(status().isConflict()); // 자동채점 문항은 안 됨
        mvc.perform(json(put("/api/admin/attempts/" + id + "/items/" + essayItem + "/score"), "{\"score\":6}").with(user(counselor)))
                .andExpect(status().isConflict()); // 배점 초과
        mvc.perform(json(put("/api/admin/attempts/" + id + "/items/" + essayItem + "/score"), "{\"score\":3}").with(user(counselor)))
                .andExpect(jsonPath("$.summary.status").value("graded"))
                .andExpect(jsonPath("$.summary.score").value(13));

        // 학생 타임라인에 발급·제출이 남는다
        mvc.perform(get("/api/admin/students/" + studentId).with(user(counselor)))
                .andExpect(jsonPath("$.timeline[?(@.kind == 'level_test')]").isNotEmpty());
    }

    @Test
    void onlyOwnAttemptAndPermissions() throws Exception {
        Object[] issued = issue();
        String id = ((JsonNode) issued[0]).at("/attempt/id").asText();
        AppUser other = staff("S-OTHER", UserRole.student);
        dsl.insertInto(STUDENTS).set(STUDENTS.NAME, "다른학생").set(STUDENTS.PROFILE_ID, other.id()).execute();

        mvc.perform(get("/api/s/attempts/" + id).with(user(other))).andExpect(status().isNotFound());
        mvc.perform(post("/api/s/attempts/" + id + "/start").with(csrf()).with(user(other))).andExpect(status().isNotFound());
        mvc.perform(get("/api/admin/attempts").with(user(staff("lt-teacher", UserRole.teacher)))).andExpect(status().isForbidden());
        mvc.perform(get("/api/s/attempts").with(user(counselor))).andExpect(status().isForbidden());

        // 같은 테스트를 끝나기 전에 또 발급할 수 없다
        mvc.perform(json(post("/api/admin/attempts"), "{\"studentId\":\"" + studentId + "\",\"testId\":\"" + testId + "\"}")
                        .with(user(counselor)))
                .andExpect(status().isConflict());
        // 발급 취소하면 그 레벨테스트 계정도 바로 끝나고, 다시 발급하면 새 계정
        AppUser taker = (AppUser) issued[1];
        mvc.perform(delete("/api/admin/attempts/" + id).with(csrf()).with(user(counselor))).andExpect(status().isNoContent());
        assertThat(dsl.select(PROFILES.EXPIRES_AT).from(PROFILES).where(PROFILES.ID.eq(taker.id())).fetchOne(PROFILES.EXPIRES_AT))
                .isBeforeOrEqualTo(OffsetDateTime.now());
        JsonNode again = call(json(post("/api/admin/attempts"), "{\"studentId\":\"" + studentId + "\",\"testId\":\"" + testId + "\"}")
                .with(user(counselor)));
        assertThat(again.get("loginId").asText()).isNotEqualTo(taker.loginId());
    }

    @Test
    void timeOverSubmitsSavedAnswers() throws Exception {
        Object[] issued = issue();
        String id = ((JsonNode) issued[0]).at("/attempt/id").asText();
        AppUser student = (AppUser) issued[1];
        mvc.perform(post("/api/s/attempts/" + id + "/start").with(csrf()).with(user(student)));
        mvc.perform(json(put("/api/s/attempts/" + id + "/answers"), answer(choiceItem, "\"choice\":2")).with(user(student)));
        // 32분 전에 시작한 것으로 (제한 30분 + 여유 1분 지남)
        dsl.update(ATTEMPTS).set(ATTEMPTS.STARTED_AT, OffsetDateTime.now().minusMinutes(32))
                .where(ATTEMPTS.ID.eq(UUID.fromString(id))).execute();

        mvc.perform(json(put("/api/s/attempts/" + id + "/answers"), answer(shortItem, "\"text\":\"went\"")).with(user(student)))
                .andExpect(status().isConflict());
        mvc.perform(get("/api/s/attempts/" + id).with(user(student)))
                .andExpect(jsonPath("$.status").value("graded")); // 서술형 무응답 0점 → 채점완료
        assertThat(dsl.select(ATTEMPTS.SCORE).from(ATTEMPTS).where(ATTEMPTS.ID.eq(UUID.fromString(id))).fetchOne(ATTEMPTS.SCORE))
                .isEqualByComparingTo("5");
        assertThat(dsl.select(ATTEMPTS.STATUS).from(ATTEMPTS).where(ATTEMPTS.ID.eq(UUID.fromString(id))).fetchOne(ATTEMPTS.STATUS))
                .isEqualTo(AttemptStatus.graded);
    }

    @Test
    void forgotAccountWhileTestIsOpen() throws Exception {
        Object[] issued = issue();
        AppUser taker = (AppUser) issued[1];
        String id = ((JsonNode) issued[0]).at("/attempt/id").asText();
        String oldHash = dsl.select(PROFILES.PASSWORD_HASH).from(PROFILES).where(PROFILES.ID.eq(taker.id())).fetchOne(PROFILES.PASSWORD_HASH);

        // 아이디·사용 기한은 결과 화면과 접수 상세에서 다시 볼 수 있다
        mvc.perform(get("/api/admin/attempts/" + id).with(user(counselor)))
                .andExpect(jsonPath("$.summary.takerLoginId").value(taker.loginId()))
                .andExpect(jsonPath("$.summary.takerExpiresAt").exists());

        // 사용 시간이 지나 버린 계정도 다시 발급: 같은 아이디, 새 비밀번호, 사용 시간 다시
        dsl.update(PROFILES).set(PROFILES.EXPIRES_AT, OffsetDateTime.now().minusMinutes(1)).where(PROFILES.ID.eq(taker.id())).execute();
        JsonNode res = call(post("/api/admin/attempts/" + id + "/account").with(csrf()).with(user(counselor)));
        assertThat(res.get("loginId").asText()).isEqualTo(taker.loginId());
        String pw = res.get("password").asText();
        String newHash = dsl.select(PROFILES.PASSWORD_HASH).from(PROFILES).where(PROFILES.ID.eq(taker.id())).fetchOne(PROFILES.PASSWORD_HASH);
        assertThat(newHash).isNotEqualTo(oldHash);
        assertThat(encoder.matches(pw, newHash)).isTrue();
        assertThat(OffsetDateTime.parse(res.get("expiresAt").asText())).isAfter(OffsetDateTime.now().plusMinutes(29));
        mvc.perform(get("/api/s/attempts/" + id).with(user(taker))).andExpect(status().isOk());

        mvc.perform(post("/api/admin/attempts/" + id + "/account").with(csrf()).with(user(staff("lt-t2", UserRole.teacher))))
                .andExpect(status().isForbidden());
    }

    @Test
    void expiredAccountCannotLoginAndIsSignedOut() throws Exception {
        Object[] issued = issue();
        JsonNode res = (JsonNode) issued[0];
        AppUser taker = (AppUser) issued[1];
        String id = res.at("/attempt/id").asText();
        dsl.update(PROFILES).set(PROFILES.EXPIRES_AT, OffsetDateTime.now().minusSeconds(1)).where(PROFILES.ID.eq(taker.id())).execute();

        // 로그인 불가 (비밀번호가 맞아도)
        mvc.perform(post("/api/auth/login").param("loginId", taker.loginId()).param("password", res.get("password").asText()).with(csrf()))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("레벨테스트 계정 사용 시간이 끝났습니다. 선생님께 다시 발급받으세요."));
        // 이미 로그인한 상태여도 다음 요청에서 끊긴다
        mvc.perform(get("/api/s/attempts/" + id).with(user(taker)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").exists());
    }

    @Test
    void startingExtendsAccountUntilTestEnds() throws Exception {
        // 사용 시간 10분, 시험 30분: 시작하면 시험이 끝날 때까지 쓸 수 있어야 한다
        mvc.perform(json(put("/api/admin/settings/level-test"), "{\"accountMinutes\":10}").with(user(counselor)))
                .andExpect(jsonPath("$.accountMinutes").value(10));
        Object[] issued = issue();
        AppUser taker = (AppUser) issued[1];
        String id = ((JsonNode) issued[0]).at("/attempt/id").asText();
        assertThat(OffsetDateTime.parse(((JsonNode) issued[0]).get("expiresAt").asText())).isBefore(OffsetDateTime.now().plusMinutes(11));

        mvc.perform(post("/api/s/attempts/" + id + "/start").with(csrf()).with(user(taker))).andExpect(status().isOk());
        assertThat(dsl.select(PROFILES.EXPIRES_AT).from(PROFILES).where(PROFILES.ID.eq(taker.id())).fetchOne(PROFILES.EXPIRES_AT))
                .isAfter(OffsetDateTime.now().plusMinutes(30));
    }

    @Test
    void settingsPermissionsAndValidation() throws Exception {
        mvc.perform(get("/api/admin/settings/level-test").with(user(counselor)))
                .andExpect(jsonPath("$.accountMinutes").value(30));
        mvc.perform(json(put("/api/admin/settings/level-test"), "{\"accountMinutes\":5}").with(user(counselor)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.accountMinutes").exists());
        mvc.perform(json(put("/api/admin/settings/level-test"), "{\"accountMinutes\":60}").with(user(staff("lt-t3", UserRole.teacher))))
                .andExpect(status().isForbidden());

        mvc.perform(json(put("/api/admin/settings/level-test"), "{\"accountMinutes\":45}").with(user(counselor)))
                .andExpect(status().isOk());
        Object[] issued = issue();
        assertThat(OffsetDateTime.parse(((JsonNode) issued[0]).get("expiresAt").asText()))
                .isBetween(OffsetDateTime.now().plusMinutes(44), OffsetDateTime.now().plusMinutes(46));
        mvc.perform(get("/api/admin/settings/level-test/accounts").with(user(counselor)))
                .andExpect(jsonPath("$[?(@.loginId == '" + ((AppUser) issued[1]).loginId() + "')]").isNotEmpty());

        // 학생 정식 계정은 따로: 없으면 학생 상세에서 만든다
        JsonNode created = call(post("/api/admin/students/" + studentId + "/reset-password").with(csrf()).with(user(counselor)));
        assertThat(created.get("loginId").asText()).startsWith("S-");
        assertThat(created.get("initialPassword").asText()).matches("\\d{6}");
    }
}
