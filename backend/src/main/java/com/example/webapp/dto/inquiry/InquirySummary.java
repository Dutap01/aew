package com.example.webapp.dto.inquiry;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import com.example.webapp.jooq.enums.InquiryStatus;
import com.example.webapp.jooq.enums.InquiryType;

import io.swagger.v3.oas.annotations.media.Schema;

/** 접수 목록 한 줄 */
public record InquirySummary(
        UUID id,
        InquiryType type,
        InquiryStatus status,
        String applicantName,
        String applicantPhone,
        String studentName,
        @Schema(types = {"string", "null"}) String school,
        @Schema(types = {"string", "null"}) String grade,
        List<PreferredSlot> preferredSlots,
        @Schema(types = {"string", "null"}, format = "uuid") UUID studentId,
        OffsetDateTime createdAt) {
}
