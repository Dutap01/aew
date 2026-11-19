package com.example.webapp.dto.appointment;

import java.time.OffsetDateTime;
import java.util.UUID;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** 일정 변경 (시간·담당자·제목·메모). 상태는 따로 바꾼다 */
public record AppointmentUpdateRequest(
        @NotBlank(message = "제목을 입력하세요.") @Size(max = 60, message = "60자 이내로 입력하세요.") String title,
        @NotNull(message = "시작 시각을 입력하세요.") OffsetDateTime startsAt,
        @NotNull(message = "끝 시각을 입력하세요.") OffsetDateTime endsAt,
        @Schema(types = {"string", "null"}, format = "uuid") UUID counselorId,
        @Schema(types = {"string", "null"}) @Size(max = 1000, message = "1000자 이내로 입력하세요.") String memo) {
}
