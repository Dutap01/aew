package com.example.webapp.seed;

import static com.example.webapp.jooq.Tables.PROFILES;

import org.jooq.DSLContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import com.example.webapp.jooq.enums.UserRole;

/**
 * 운영 서버 최초 실행 시 대표 계정 만들기.
 * 환경변수 OWNER_LOGIN_ID / OWNER_PASSWORD (/ OWNER_NAME) 가 있고 대표 계정이 하나도 없을 때만 만든다.
 * 계정이 생긴 뒤에는 환경변수를 지워도 된다. 비밀번호는 로그인 후 바꾼다.
 */
@Component
@Order(0)
public class OwnerBootstrap implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(OwnerBootstrap.class);

    private final DSLContext dsl;
    private final PasswordEncoder encoder;
    private final String loginId;
    private final String password;
    private final String name;

    public OwnerBootstrap(DSLContext dsl, PasswordEncoder encoder,
            @Value("${app.bootstrap.owner-login-id:}") String loginId,
            @Value("${app.bootstrap.owner-password:}") String password,
            @Value("${app.bootstrap.owner-name:대표}") String name) {
        this.dsl = dsl;
        this.encoder = encoder;
        this.loginId = loginId;
        this.password = password;
        this.name = name;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!StringUtils.hasText(loginId) || !StringUtils.hasText(password)) {
            return;
        }
        if (dsl.fetchExists(PROFILES, PROFILES.ROLE.eq(UserRole.owner))) {
            return;
        }
        if (password.length() < 8) {
            log.error("OWNER_PASSWORD 는 8자 이상이어야 합니다. 대표 계정을 만들지 않았습니다.");
            return;
        }
        dsl.insertInto(PROFILES)
                .set(PROFILES.LOGIN_ID, loginId)
                .set(PROFILES.PASSWORD_HASH, encoder.encode(password))
                .set(PROFILES.ROLE, UserRole.owner)
                .set(PROFILES.NAME, name)
                .execute();
        log.info("대표 계정 생성: {}", loginId);
    }
}
