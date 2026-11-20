package com.example.webapp.dto.test;

import java.util.UUID;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** 답 저장 (자동 저장). 객관식은 choice(1부터), 단답·서술은 text. 둘 다 없으면 답 지우기 */
public record AnswerRequest(
        @NotNull UUID itemId,
        @Schema(types = {"integer", "null"}) Integer choice,
        @Schema(types = {"string", "null"}) @Size(max = 2000, message = "2000자 이내로 입력하세요.") String text) {
}
