package com.example.webapp.dto.classes;

import java.time.LocalTime;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/** 반 수업 요일·시간 하나. weekday: ISO 1=월 … 7=일 */
public record ClassScheduleSlot(
        @Min(value = 1, message = "요일이 올바르지 않습니다.") @Max(value = 7, message = "요일이 올바르지 않습니다.") int weekday,
        @NotNull(message = "시작 시각을 입력하세요.") @Schema(type = "string", example = "16:00") LocalTime startTime,
        @NotNull(message = "끝 시각을 입력하세요.") @Schema(type = "string", example = "17:30") LocalTime endTime) {
}
