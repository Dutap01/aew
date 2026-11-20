package com.example.webapp.security;

import static com.example.webapp.jooq.Tables.PROFILES;

import java.io.IOException;
import java.time.OffsetDateTime;
import java.util.Map;

import org.jooq.DSLContext;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import com.example.webapp.jooq.enums.UserRole;
import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * 로그인한 레벨테스트 계정이 사용 기한을 넘기면 세션을 끝내고 401.
 * 기한은 응시를 시작하면 늘어날 수 있어 세션 값이 아니라 매 요청 DB 에서 확인한다 (레벨테스트 계정만, 다른 역할은 그대로 통과).
 */
public class TestAccountExpiryFilter extends OncePerRequestFilter {

    public static final String EXPIRED_MESSAGE = "레벨테스트 계정 사용 시간이 끝났습니다. 선생님께 다시 발급받으세요.";

    private final DSLContext dsl;
    private final ObjectMapper mapper;

    public TestAccountExpiryFilter(DSLContext dsl, ObjectMapper mapper) {
        this.dsl = dsl;
        this.mapper = mapper;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof AppUser user && user.role() == UserRole.test_taker) {
            OffsetDateTime expiresAt = dsl.select(PROFILES.EXPIRES_AT).from(PROFILES).where(PROFILES.ID.eq(user.id()))
                    .fetchOne(PROFILES.EXPIRES_AT);
            if (expiresAt != null && !OffsetDateTime.now().isBefore(expiresAt)) {
                SecurityContextHolder.clearContext();
                var session = request.getSession(false);
                if (session != null) session.invalidate();
                response.setStatus(HttpStatus.UNAUTHORIZED.value());
                response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                response.setCharacterEncoding("UTF-8");
                mapper.writeValue(response.getWriter(), Map.of("message", EXPIRED_MESSAGE));
                return;
            }
        }
        chain.doFilter(request, response);
    }
}
