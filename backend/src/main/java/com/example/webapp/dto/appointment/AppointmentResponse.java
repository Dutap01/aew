package com.example.webapp.dto.appointment;

import java.time.OffsetDateTime;
import java.util.UUID;

import com.example.webapp.jooq.enums.AppointmentStatus;
import com.example.webapp.jooq.enums.InquiryType;

import io.swagger.v3.oas.annotations.media.Schema;

/** 상담 달력 일정 하나 */
public record AppointmentResponse(
        UUID id,
        InquiryType kind,
        AppointmentStatus status,
        String title,
        OffsetDateTime startsAt,
        OffsetDateTime endsAt,
        @Schema(types = {"string", "null"}) String memo,
        @Schema(types = {"string", "null"}, format = "uuid") UUID counselorId,
        @Schema(types = {"string", "null"}) String counselorName,
        @Schema(types = {"string", "null"}, format = "uuid") UUID inquiryId,
        @Schema(types = {"string", "null"}, format = "uuid") UUID studentId,
        @Schema(types = {"string", "null"}) String studentName,
        @Schema(types = {"string", "null"}) String studentCode) {
}
