package com.example.webapp.dto.inquiry;

import java.time.LocalDate;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

/** 희망 일정 하나 (날짜 + 시각 HH:mm) */
public record PreferredSlot(
        @NotNull(message = "날짜를 선택하세요.") LocalDate date,
        @NotNull(message = "시간을 선택하세요.")
        @Pattern(regexp = "^([01]\\d|2[0-3]):[0-5]\\d$", message = "시간 형식이 올바르지 않습니다.") String time) {
}
