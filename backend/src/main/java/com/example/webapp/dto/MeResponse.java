package com.example.webapp.dto;

import java.util.UUID;

import com.example.webapp.jooq.enums.UserRole;
import com.example.webapp.security.AppUser;

/** 로그인한 사용자 정보 (GET /api/auth/me, 로그인 성공 응답) */
public record MeResponse(UUID id, String loginId, String name, UserRole role) {

    public static MeResponse of(AppUser user) {
        return new MeResponse(user.id(), user.loginId(), user.name(), user.role());
    }
}
