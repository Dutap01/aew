package com.example.webapp.dto.test;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

/** 서술형 채점 (0 ~ 문항 배점) */
public record ManualScoreRequest(
        @NotNull(message = "점수를 입력하세요.") @DecimalMin(value = "0", message = "0점 이상이어야 합니다.") BigDecimal score) {
}
