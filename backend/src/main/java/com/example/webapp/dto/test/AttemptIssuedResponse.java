package com.example.webapp.dto.test;

import java.time.OffsetDateTime;

/**
 * 레벨테스트 계정 발급 결과 (처음 발급·다시 발급). password 는 이때 한 번만 내려준다 (DB 에는 해시).
 * expiresAt: 계정 사용 기한 (응시를 시작하면 시험이 끝날 때까지 늘어날 수 있음)
 */
public record AttemptIssuedResponse(AttemptSummary attempt, String loginId, String password, OffsetDateTime expiresAt) {
}
