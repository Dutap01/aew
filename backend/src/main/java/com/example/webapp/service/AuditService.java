package com.example.webapp.service;

import static com.example.webapp.jooq.Tables.AUDIT_LOGS;

import java.util.UUID;

import org.jooq.DSLContext;
import org.jooq.JSONB;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

/** 감사 로그: 누가·언제·어떤 레코드를·어떻게 바꿨는지 (같은 트랜잭션 안에서 기록) */
@Service
public class AuditService {

    private final DSLContext dsl;
    private final ObjectMapper mapper;

    public AuditService(DSLContext dsl, ObjectMapper mapper) {
        this.dsl = dsl;
        this.mapper = mapper;
    }

    public void record(UUID actorId, String action, String table, UUID recordId, Object before, Object after) {
        dsl.insertInto(AUDIT_LOGS)
                .set(AUDIT_LOGS.ACTOR_ID, actorId)
                .set(AUDIT_LOGS.ACTION, action)
                .set(AUDIT_LOGS.TABLE_NAME, table)
                .set(AUDIT_LOGS.RECORD_ID, recordId)
                .set(AUDIT_LOGS.BEFORE, json(before))
                .set(AUDIT_LOGS.AFTER, json(after))
                .execute();
    }

    private JSONB json(Object value) {
        if (value == null) return null;
        try {
            return JSONB.valueOf(mapper.writeValueAsString(value));
        } catch (JsonProcessingException e) {
            throw new IllegalStateException(e);
        }
    }
}
