package com.example.webapp.dto.appointment;

import java.time.OffsetDateTime;
import java.util.UUID;

import com.example.webapp.jooq.enums.InquiryType;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * 일정 등록. inquiryId 가 있으면 종류·학생·제목을 접수에서 가져오고(직접 준 값이 우선), 접수는 예약확정이 된다.
 * 접수 없이 등록할 때는 kind·title 이 필요하다.
 */
public record AppointmentCreateRequest(
        @Schema(types = {"string", "null"}, format = "uuid") UUID inquiryId,
        @Schema(types = {"string", "null"}, format = "uuid") UUID studentId,
        @Schema(types = {"string", "null"}) InquiryType kind,
        @Schema(types = {"string", "null"}) @Size(max = 60, message = "60자 이내로 입력하세요.") String title,
        @NotNull(message = "시작 시각을 입력하세요.") OffsetDateTime startsAt,
        @NotNull(message = "끝 시각을 입력하세요.") OffsetDateTime endsAt,
        @Schema(types = {"string", "null"}, format = "uuid") UUID counselorId,
        @Schema(types = {"string", "null"}) @Size(max = 1000, message = "1000자 이내로 입력하세요.") String memo) {
}
