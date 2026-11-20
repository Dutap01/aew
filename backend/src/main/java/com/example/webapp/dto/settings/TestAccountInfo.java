package com.example.webapp.dto.settings;

import java.time.OffsetDateTime;
import java.util.UUID;

import com.example.webapp.jooq.enums.AttemptStatus;

/** 사용 중인 레벨테스트 계정 (설정 화면 목록) */
public record TestAccountInfo(UUID attemptId, String loginId, UUID studentId, String studentName, String studentCode,
        AttemptStatus status, OffsetDateTime createdAt, OffsetDateTime expiresAt) {
}
