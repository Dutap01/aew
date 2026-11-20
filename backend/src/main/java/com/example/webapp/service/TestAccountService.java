package com.example.webapp.service;

import static com.example.webapp.jooq.Tables.ATTEMPTS;
import static com.example.webapp.jooq.Tables.PROFILES;
import static com.example.webapp.jooq.Tables.STUDENTS;

import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.jooq.DSLContext;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.example.webapp.dto.settings.TestAccountInfo;
import com.example.webapp.jooq.enums.UserRole;

/**
 * 레벨테스트 전용 계정 (학생 정식 계정 S-0001 과 별도).
 * 아이디 T + 6자리 숫자, 비밀번호 6자리 숫자. 응시 하나에 계정 하나 (attempts.taker_id).
 * 사용 기한: 발급 시각 + 설정한 분 (SettingsService). 응시를 시작하면 시험이 끝날 때(+1분)까지는 쓸 수 있게 늘린다.
 * 기한이 지나면 로그인이 막히고(AppUser.isAccountNonExpired), 로그인 중이면 다음 요청에서 끊긴다(TestAccountExpiryFilter).
 * 응답·감사 로그가 계정을 참조하므로 행은 지우지 않는다.
 */
@Service
public class TestAccountService {

    public record Created(UUID profileId, String loginId, String password, OffsetDateTime expiresAt) {
    }

    private static final SecureRandom RANDOM = new SecureRandom();

    private final DSLContext dsl;
    private final PasswordEncoder encoder;
    private final SettingsService settings;
    private final AuditService audit;

    public TestAccountService(DSLContext dsl, PasswordEncoder encoder, SettingsService settings, AuditService audit) {
        this.dsl = dsl;
        this.encoder = encoder;
        this.settings = settings;
        this.audit = audit;
    }

    public Created create(String studentName, UUID actorId) {
        String loginId = newLoginId();
        String password = sixDigits();
        OffsetDateTime expiresAt = OffsetDateTime.now().plusMinutes(settings.levelTestAccountMinutes());
        UUID id = dsl.insertInto(PROFILES)
                .set(PROFILES.LOGIN_ID, loginId)
                .set(PROFILES.PASSWORD_HASH, encoder.encode(password))
                .set(PROFILES.ROLE, UserRole.test_taker)
                .set(PROFILES.NAME, studentName)
                .set(PROFILES.EXPIRES_AT, expiresAt)
                .returning(PROFILES.ID).fetchOne(PROFILES.ID);
        audit.record(actorId, "create_test_account", "profiles", id, null, Map.of("loginId", loginId));
        return new Created(id, loginId, password, expiresAt);
    }

    /** 같은 계정에 새 비밀번호, 기한은 지금부터 다시 */
    public Created reissue(UUID profileId, UUID actorId) {
        var p = dsl.selectFrom(PROFILES).where(PROFILES.ID.eq(profileId)).forUpdate().fetchOne();
        String password = sixDigits();
        p.setPasswordHash(encoder.encode(password));
        p.setExpiresAt(OffsetDateTime.now().plusMinutes(settings.levelTestAccountMinutes()));
        p.setActive(true);
        p.setUpdatedAt(OffsetDateTime.now());
        p.store();
        audit.record(actorId, "reissue_test_account", "profiles", profileId, null, Map.of("expiresAt", p.getExpiresAt().toString()));
        return new Created(profileId, p.getLoginId(), password, p.getExpiresAt());
    }

    /** 기한을 최소 until 까지 (이미 더 길면 그대로) */
    public void extendTo(UUID profileId, OffsetDateTime until) {
        dsl.update(PROFILES).set(PROFILES.EXPIRES_AT, until)
                .where(PROFILES.ID.eq(profileId).and(PROFILES.EXPIRES_AT.lt(until)))
                .execute();
    }

    /** 바로 사용 끝 (발급 취소 등) */
    public void expireNow(UUID profileId) {
        dsl.update(PROFILES).set(PROFILES.EXPIRES_AT, OffsetDateTime.now())
                .where(PROFILES.ID.eq(profileId).and(PROFILES.EXPIRES_AT.gt(OffsetDateTime.now())))
                .execute();
    }

    /** 지금 쓸 수 있는 레벨테스트 계정 (기한이 많이 남은 순) */
    public List<TestAccountInfo> active() {
        return dsl.select(ATTEMPTS.ID, PROFILES.LOGIN_ID, STUDENTS.ID, STUDENTS.NAME, STUDENTS.STUDENT_CODE, ATTEMPTS.STATUS,
                        PROFILES.CREATED_AT, PROFILES.EXPIRES_AT)
                .from(ATTEMPTS)
                .join(PROFILES).on(PROFILES.ID.eq(ATTEMPTS.TAKER_ID))
                .join(STUDENTS).on(STUDENTS.ID.eq(ATTEMPTS.STUDENT_ID))
                .where(PROFILES.EXPIRES_AT.gt(OffsetDateTime.now()))
                .orderBy(PROFILES.EXPIRES_AT.desc())
                .fetch(r -> new TestAccountInfo(r.value1(), r.value2(), r.value3(), r.value4(), r.value5(), r.value6(),
                        r.value7(), r.value8()));
    }

    /** T + 6자리. 지난 계정과도 겹치지 않게 (아이디는 영구히 유일) */
    private String newLoginId() {
        for (int i = 0; i < 20; i++) {
            String id = "T" + sixDigits();
            if (!dsl.fetchExists(PROFILES, PROFILES.LOGIN_ID.equalIgnoreCase(id))) return id;
        }
        throw new IllegalStateException("레벨테스트 계정 아이디를 만들지 못했습니다.");
    }

    private static String sixDigits() {
        return String.format("%06d", RANDOM.nextInt(1_000_000));
    }
}
