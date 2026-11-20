package com.example.webapp.dto.test;

import java.util.UUID;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

/** 레벨테스트 발급. 응시마다 레벨테스트 전용 계정(T123456)을 새로 만든다 */
public record AttemptIssueRequest(
        @NotNull(message = "학생을 선택하세요.") UUID studentId,
        @NotNull(message = "테스트를 선택하세요.") UUID testId,
        @Schema(types = {"string", "null"}, format = "uuid") UUID inquiryId) {
}
