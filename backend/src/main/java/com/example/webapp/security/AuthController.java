package com.example.webapp.security;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.webapp.dto.MeResponse;

/** 로그인·로그아웃은 SecurityConfig 의 필터가 처리하고, 여기서는 현재 사용자만 돌려준다. */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    /** 로그인 안 되어 있으면 401 (SecurityConfig 에서 처리) */
    @GetMapping("/me")
    public MeResponse me(@AuthenticationPrincipal AppUser user) {
        return MeResponse.of(user);
    }
}
