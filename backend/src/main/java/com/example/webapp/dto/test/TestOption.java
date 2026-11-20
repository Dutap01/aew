package com.example.webapp.dto.test;

import java.util.UUID;

import io.swagger.v3.oas.annotations.media.Schema;

/** 발급할 수 있는 레벨테스트 */
public record TestOption(UUID id, String title, @Schema(types = {"string", "null"}) String level,
        @Schema(types = {"integer", "null"}) Integer timeLimitMinutes, int itemCount) {
}
