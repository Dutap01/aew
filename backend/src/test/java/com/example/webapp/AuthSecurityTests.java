package com.example.webapp;

import static com.example.webapp.jooq.Tables.PROFILES;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.jooq.DSLContext;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import com.example.webapp.jooq.enums.UserRole;

/**
 * 로그인·로그아웃과 역할별 API 경로 차단.
 * "보면 안 되는 데이터를 요청하면 403" 을 역할마다 확인한다 (계획서 권한 테스트).
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class AuthSecurityTests {

    private static final String PW = "test-pass-1";

    @Autowired MockMvc mvc;
    @Autowired DSLContext dsl;
    @Autowired PasswordEncoder encoder;

    @BeforeEach
    void users() {
        account("t-owner", UserRole.owner, true);
        account("t-counselor", UserRole.counselor, true);
        account("t-teacher", UserRole.teacher, true);
        account("S-9001", UserRole.student, true);
        account("t-disabled", UserRole.teacher, false);
    }

    private void account(String loginId, UserRole role, boolean active) {
        dsl.insertInto(PROFILES)
                .set(PROFILES.LOGIN_ID, loginId)
                .set(PROFILES.PASSWORD_HASH, encoder.encode(PW))
                .set(PROFILES.ROLE, role)
                .set(PROFILES.NAME, loginId)
                .set(PROFILES.ACTIVE, active)
                .execute();
    }

    /** 로그인 후 세션 */
    private MockHttpSession login(String loginId) throws Exception {
        var session = new MockHttpSession();
        mvc.perform(post("/api/auth/login").session(session).with(csrf())
                        .param("loginId", loginId).param("password", PW))
                .andExpect(status().isOk());
        return session;
    }

    @Test
    void loginReturnsMeAndSessionWorks() throws Exception {
        var session = new MockHttpSession();
        mvc.perform(post("/api/auth/login").session(session).with(csrf())
                        .param("loginId", "t-counselor").param("password", PW))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.loginId").value("t-counselor"))
                .andExpect(jsonPath("$.role").value("counselor"))
                .andExpect(jsonPath("$.passwordHash").doesNotExist());

        mvc.perform(get("/api/auth/me").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("counselor"));
    }

    @Test
    void studentLogsInWithCodeIgnoringCase() throws Exception {
        mvc.perform(post("/api/auth/login").with(csrf()).param("loginId", "s-9001").param("password", PW))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("student"));
    }

    @Test
    void wrongPasswordAndDisabledAccountAre401() throws Exception {
        mvc.perform(post("/api/auth/login").with(csrf()).param("loginId", "t-owner").param("password", "nope"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").exists());
        mvc.perform(post("/api/auth/login").with(csrf()).param("loginId", "nobody").param("password", PW))
                .andExpect(status().isUnauthorized());
        mvc.perform(post("/api/auth/login").with(csrf()).param("loginId", "t-disabled").param("password", PW))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("사용이 중지된 계정입니다."));
    }

    @Test
    void loginWithoutCsrfIsRejected() throws Exception {
        mvc.perform(post("/api/auth/login").param("loginId", "t-owner").param("password", PW))
                .andExpect(status().isForbidden());
    }

    @Test
    void anonymousGets401AndCsrfCookie() throws Exception {
        mvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(cookie().exists("XSRF-TOKEN"));
        mvc.perform(get("/api/admin/students")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/health")).andExpect(status().isOk());
    }

    @Test
    void logoutEndsSession() throws Exception {
        var session = login("t-owner");
        mvc.perform(post("/api/auth/logout").session(session).with(csrf())).andExpect(status().isNoContent());
        mvc.perform(get("/api/auth/me").session(session)).andExpect(status().isUnauthorized());
    }

    @Test
    void rolePathRules() throws Exception {
        // /api/admin/** : 대표·상담실장만
        mvc.perform(get("/api/admin/students").session(login("t-owner"))).andExpect(status().isOk());
        mvc.perform(get("/api/admin/students").session(login("t-counselor"))).andExpect(status().isOk());
        mvc.perform(get("/api/admin/students").session(login("t-teacher"))).andExpect(status().isForbidden());
        mvc.perform(get("/api/admin/students").session(login("S-9001"))).andExpect(status().isForbidden());

        // /api/t/** : 강사·대표 (아직 API 가 없어 통과하면 404)
        mvc.perform(get("/api/t/anything").session(login("t-teacher"))).andExpect(status().isNotFound());
        mvc.perform(get("/api/t/anything").session(login("t-owner"))).andExpect(status().isNotFound());
        mvc.perform(get("/api/t/anything").session(login("t-counselor"))).andExpect(status().isForbidden());
        mvc.perform(get("/api/t/anything").session(login("S-9001"))).andExpect(status().isForbidden());

        // /api/s/** : 학생만 (대표도 불가)
        mvc.perform(get("/api/s/anything").session(login("S-9001"))).andExpect(status().isNotFound());
        mvc.perform(get("/api/s/anything").session(login("t-owner"))).andExpect(status().isForbidden());
        mvc.perform(get("/api/s/anything").session(login("t-teacher"))).andExpect(status().isForbidden());
    }

    @Test
    void spaLoginPageIsNotSpringDefault() throws Exception {
        // React 의 /login 화면이 나와야 한다 (Spring Security 기본 로그인 페이지 X)
        mvc.perform(get("/login"))
                .andExpect(status().isOk())
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.content()
                        .string(org.hamcrest.Matchers.containsString("SPA_TEST_INDEX")));
    }
}
