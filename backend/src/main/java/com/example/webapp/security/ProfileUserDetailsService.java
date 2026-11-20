package com.example.webapp.security;

import static com.example.webapp.jooq.Tables.PROFILES;

import java.time.OffsetDateTime;
import java.util.UUID;

import org.jooq.DSLContext;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

/** profiles 테이블에서 로그인 계정을 찾는다. 운영자는 아이디, 학생은 학생 코드, 레벨테스트 계정은 T123456 (대소문자 무시). */
@Service
public class ProfileUserDetailsService implements UserDetailsService {

    private final DSLContext dsl;

    public ProfileUserDetailsService(DSLContext dsl) {
        this.dsl = dsl;
    }

    @Override
    public AppUser loadUserByUsername(String loginId) {
        var p = dsl.selectFrom(PROFILES)
                .where(PROFILES.LOGIN_ID.equalIgnoreCase(loginId.trim()))
                .fetchOne();
        if (p == null) {
            throw new UsernameNotFoundException("계정 없음");
        }
        return new AppUser(p.getId(), p.getLoginId(), p.getPasswordHash(), p.getName(), p.getRole(), p.getActive(),
                p.getExpiresAt());
    }

    public void markLoggedIn(UUID profileId) {
        dsl.update(PROFILES).set(PROFILES.LAST_LOGIN_AT, OffsetDateTime.now())
                .where(PROFILES.ID.eq(profileId)).execute();
    }
}
