package com.example.webapp.security;

import java.io.IOException;
import java.util.Map;
import java.util.function.Supplier;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.logout.HttpStatusReturningLogoutSuccessHandler;
import org.springframework.security.web.authentication.www.BasicAuthenticationFilter;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.security.web.csrf.CsrfTokenRequestHandler;
import org.springframework.security.web.csrf.XorCsrfTokenRequestAttributeHandler;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import com.example.webapp.dto.MeResponse;
import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * 세션 로그인 + 역할별 API 경로 보호.
 *
 * <ul>
 *   <li>로그인: POST /api/auth/login (form: loginId, password) → 200 MeResponse / 401</li>
 *   <li>로그아웃: POST /api/auth/logout → 204</li>
 *   <li>CSRF: XSRF-TOKEN 쿠키를 읽어 X-XSRF-TOKEN 헤더로 보낸다 (React 같은 SPA 방식)</li>
 *   <li>/api/admin/** 대표·상담실장 (반 구성 수정·반 배정은 대표만), /api/t/** 강사·대표, /api/s/** 학생, /api/public/**·/api/r/** 로그인 없이</li>
 * </ul>
 * 화면(React 라우터)의 가드는 편의용이고 실제 보호는 여기서 한다.
 * "담당 반만", "본인만" 같은 행 단위 검사는 서비스 계층에서 한다.
 */
@Configuration
public class SecurityConfig {

    @Bean
    PasswordEncoder passwordEncoder() {
        // 기본 bcrypt. 저장 형식 "{bcrypt}..." 이라 나중에 알고리즘을 바꿔도 기존 해시를 읽을 수 있다
        return PasswordEncoderFactories.createDelegatingPasswordEncoder();
    }

    @Bean
    SecurityContextRepository securityContextRepository() {
        return new HttpSessionSecurityContextRepository();
    }

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http, ObjectMapper objectMapper,
            ProfileUserDetailsService users, SecurityContextRepository contextRepository) throws Exception {
        http
            .securityContext(sc -> sc.securityContextRepository(contextRepository))
            .csrf(csrf -> csrf
                .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
                .csrfTokenRequestHandler(new SpaCsrfTokenRequestHandler()))
            .addFilterAfter(new CsrfCookieFilter(), BasicAuthenticationFilter.class)
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/health", "/actuator/health/**").permitAll()
                .requestMatchers("/api/public/**", "/api/r/**").permitAll()
                .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()
                // 반 구성 수정·반 배정(반 소속 추가·종료)은 대표만. 조회는 아래 /api/admin/** 규칙
                .requestMatchers(HttpMethod.POST, "/api/admin/classes", "/api/admin/classes/**",
                        "/api/admin/students/*/enrollments", "/api/admin/students/*/enrollments/**").hasRole("OWNER")
                .requestMatchers(HttpMethod.PUT, "/api/admin/classes/**",
                        "/api/admin/students/*/enrollments/**").hasRole("OWNER")
                .requestMatchers("/api/admin/**").hasAnyRole("OWNER", "COUNSELOR")
                .requestMatchers("/api/t/**").hasAnyRole("TEACHER", "OWNER")
                .requestMatchers("/api/s/**").hasRole("STUDENT")
                .requestMatchers("/api/**", "/actuator/**").authenticated()
                .anyRequest().permitAll()) // React 정적 파일·화면 경로
            .formLogin(form -> form
                // loginPage 를 지정해야 Spring 기본 로그인 페이지가 React 의 /login 을 가로채지 않는다
                .loginPage("/login")
                .loginProcessingUrl("/api/auth/login")
                .usernameParameter("loginId")
                .passwordParameter("password")
                .successHandler((req, res, auth) -> {
                    AppUser user = ((AppUser) auth.getPrincipal()).withoutPassword();
                    // 세션에는 비밀번호 해시 없는 principal 을 저장
                    var cleaned = UsernamePasswordAuthenticationToken.authenticated(user, null, user.getAuthorities());
                    var context = SecurityContextHolder.createEmptyContext();
                    context.setAuthentication(cleaned);
                    SecurityContextHolder.setContext(context);
                    contextRepository.saveContext(context, req, res);
                    users.markLoggedIn(user.id());
                    writeJson(res, objectMapper, HttpStatus.OK, MeResponse.of(user));
                })
                .failureHandler((req, res, ex) -> writeJson(res, objectMapper, HttpStatus.UNAUTHORIZED,
                        Map.of("message", ex instanceof DisabledException
                                ? "사용이 중지된 계정입니다."
                                : "아이디 또는 비밀번호가 올바르지 않습니다."))))
            .logout(logout -> logout
                .logoutUrl("/api/auth/logout") // CSRF 가 켜져 있어 POST 만 허용된다
                .logoutSuccessHandler(new HttpStatusReturningLogoutSuccessHandler(HttpStatus.NO_CONTENT)))
            .exceptionHandling(ex -> ex
                // API 는 로그인 화면으로 리다이렉트하지 않고 401
                .authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
            .httpBasic(basic -> basic.disable());
        return http.build();
    }

    private static void writeJson(HttpServletResponse res, ObjectMapper mapper, HttpStatus status, Object body)
            throws IOException {
        res.setStatus(status.value());
        res.setContentType(MediaType.APPLICATION_JSON_VALUE);
        res.setCharacterEncoding("UTF-8");
        mapper.writeValue(res.getWriter(), body);
    }

    /**
     * SPA 용 CSRF 처리 (Spring Security 레퍼런스 "Single-Page Applications").
     * 헤더로 온 토큰은 쿠키 원문 그대로 비교하고, 서버가 렌더링하는 폼 파라미터는 BREACH 보호(XOR)를 쓴다.
     */
    static final class SpaCsrfTokenRequestHandler implements CsrfTokenRequestHandler {
        private final CsrfTokenRequestHandler plain = new CsrfTokenRequestAttributeHandler();
        private final CsrfTokenRequestHandler xor = new XorCsrfTokenRequestAttributeHandler();

        @Override
        public void handle(HttpServletRequest request, HttpServletResponse response, Supplier<CsrfToken> csrfToken) {
            xor.handle(request, response, csrfToken);
            csrfToken.get(); // 지연 생성된 토큰을 꺼내 쿠키가 응답에 실리게 한다
        }

        @Override
        public String resolveCsrfTokenValue(HttpServletRequest request, CsrfToken csrfToken) {
            String header = request.getHeader(csrfToken.getHeaderName());
            return StringUtils.hasText(header)
                    ? plain.resolveCsrfTokenValue(request, csrfToken)
                    : xor.resolveCsrfTokenValue(request, csrfToken);
        }
    }

    /** 모든 응답에 XSRF-TOKEN 쿠키를 싣는다 (첫 요청부터 프론트가 토큰을 읽을 수 있게) */
    static final class CsrfCookieFilter extends OncePerRequestFilter {
        @Override
        protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
                throws ServletException, IOException {
            CsrfToken token = (CsrfToken) request.getAttribute(CsrfToken.class.getName());
            if (token != null) {
                token.getToken();
            }
            chain.doFilter(request, response);
        }
    }
}
