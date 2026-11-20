package com.example.webapp.dto.test;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

import com.example.webapp.jooq.enums.AttemptStatus;

import io.swagger.v3.oas.annotations.media.Schema;

/** 응시 한 건 (운영자 목록). status: 발급 issued · 응시중 in_progress · 채점대기 submitted · 채점완료 graded */
public record AttemptSummary(
        UUID id,
        UUID studentId,
        String studentCode,
        String studentName,
        /** 이 응시의 레벨테스트 계정 아이디와 사용 기한 (예전 방식으로 발급한 응시는 null) */
        @Schema(types = {"string", "null"}) String takerLoginId,
        @Schema(types = {"string", "null"}, format = "date-time") OffsetDateTime takerExpiresAt,
        @Schema(types = {"string", "null"}) String grade,
        UUID testId,
        String testTitle,
        AttemptStatus status,
        @Schema(types = {"number", "null"}) BigDecimal score,
        @Schema(types = {"number", "null"}) BigDecimal maxScore,
        @Schema(types = {"string", "null"}, format = "uuid") UUID inquiryId,
        @Schema(types = {"string", "null"}) String issuedByName,
        OffsetDateTime issuedAt,
        @Schema(types = {"string", "null"}, format = "date-time") OffsetDateTime startedAt,
        @Schema(types = {"string", "null"}, format = "date-time") OffsetDateTime submittedAt) {
}
