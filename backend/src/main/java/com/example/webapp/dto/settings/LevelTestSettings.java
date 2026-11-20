package com.example.webapp.dto.settings;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

/** 레벨테스트 설정. accountMinutes: 레벨테스트 계정 사용 시간 (발급 시각부터, 분) */
public record LevelTestSettings(
        @Min(value = 10, message = "10분 이상으로 정하세요.") @Max(value = 1440, message = "24시간(1440분) 이하로 정하세요.") int accountMinutes) {
}
