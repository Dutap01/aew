package com.example.webapp.dto.student;

import java.time.LocalDate;
import java.util.UUID;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

/** 반에 넣기 (대표). startDate 가 없으면 오늘 */
public record EnrollmentCreateRequest(
        @NotNull(message = "반을 선택하세요.") UUID classId,
        @Schema(types = {"string", "null"}, format = "date") LocalDate startDate) {
}
