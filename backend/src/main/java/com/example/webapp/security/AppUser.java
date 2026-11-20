package com.example.webapp.security;

import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import com.example.webapp.jooq.enums.UserRole;

/**
 * 로그인한 사용자 (세션에 저장되는 principal).
 * 권한은 ROLE_OWNER / ROLE_COUNSELOR / ROLE_TEACHER / ROLE_STUDENT / ROLE_TEST_TAKER 하나.
 * expiresAt: 레벨테스트 계정의 사용 기한 (로그인할 때 값. 로그인 뒤에는 TestAccountExpiryFilter 가 DB 값으로 다시 확인)
 */
public record AppUser(UUID id, String loginId, String passwordHash, String name, UserRole role, boolean active,
        OffsetDateTime expiresAt) implements UserDetails {

    /** 기한 없는 계정 */
    public AppUser(UUID id, String loginId, String passwordHash, String name, UserRole role, boolean active) {
        this(id, loginId, passwordHash, name, role, active, null);
    }

    public static String authorityOf(UserRole role) {
        return "ROLE_" + role.getLiteral().toUpperCase();
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority(authorityOf(role)));
    }

    @Override
    public String getPassword() {
        return passwordHash;
    }

    @Override
    public String getUsername() {
        return loginId;
    }

    @Override
    public boolean isEnabled() {
        return active;
    }

    @Override
    public boolean isAccountNonExpired() {
        return expiresAt == null || OffsetDateTime.now().isBefore(expiresAt);
    }

    /** 세션에 비밀번호 해시를 남기지 않는다 */
    public AppUser withoutPassword() {
        return new AppUser(id, loginId, null, name, role, active, expiresAt);
    }
}
