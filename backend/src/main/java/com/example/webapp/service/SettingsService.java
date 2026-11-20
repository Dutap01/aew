package com.example.webapp.service;

import static com.example.webapp.jooq.Tables.APP_SETTINGS;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

import org.jooq.DSLContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** 운영 설정 (app_settings). 값이 없으면 기본값을 쓴다 */
@Service
public class SettingsService {

    public static final String LEVEL_TEST_ACCOUNT_MINUTES = "level_test_account_minutes";
    public static final int DEFAULT_LEVEL_TEST_ACCOUNT_MINUTES = 30;

    private final DSLContext dsl;
    private final AuditService audit;

    public SettingsService(DSLContext dsl, AuditService audit) {
        this.dsl = dsl;
        this.audit = audit;
    }

    public int levelTestAccountMinutes() {
        String v = dsl.select(APP_SETTINGS.VALUE).from(APP_SETTINGS).where(APP_SETTINGS.KEY.eq(LEVEL_TEST_ACCOUNT_MINUTES))
                .fetchOne(APP_SETTINGS.VALUE);
        try {
            return v == null ? DEFAULT_LEVEL_TEST_ACCOUNT_MINUTES : Integer.parseInt(v);
        } catch (NumberFormatException e) {
            return DEFAULT_LEVEL_TEST_ACCOUNT_MINUTES;
        }
    }

    @Transactional
    public void setLevelTestAccountMinutes(int minutes, UUID actorId) {
        int before = levelTestAccountMinutes();
        dsl.insertInto(APP_SETTINGS)
                .set(APP_SETTINGS.KEY, LEVEL_TEST_ACCOUNT_MINUTES)
                .set(APP_SETTINGS.VALUE, String.valueOf(minutes))
                .set(APP_SETTINGS.UPDATED_BY, actorId)
                .onConflict(APP_SETTINGS.KEY).doUpdate()
                .set(APP_SETTINGS.VALUE, String.valueOf(minutes))
                .set(APP_SETTINGS.UPDATED_BY, actorId)
                .set(APP_SETTINGS.UPDATED_AT, OffsetDateTime.now())
                .execute();
        audit.record(actorId, "update", "app_settings", null, Map.of(LEVEL_TEST_ACCOUNT_MINUTES, before),
                Map.of(LEVEL_TEST_ACCOUNT_MINUTES, minutes));
    }
}
