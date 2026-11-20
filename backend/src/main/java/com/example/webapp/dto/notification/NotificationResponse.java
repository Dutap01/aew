package com.example.webapp.dto.notification;

import java.time.OffsetDateTime;
import java.util.UUID;

import com.example.webapp.jooq.enums.NotificationStatus;

import io.swagger.v3.oas.annotations.media.Schema;

/** 발송 이력 한 줄 */
public record NotificationResponse(
        UUID id,
        String templateCode,
        String templateLabel,
        String toPhone,
        String body,
        NotificationStatus status,
        int attempts,
        @Schema(types = {"string", "null"}) String error,
        @Schema(types = {"string", "null"}) String providerMessageId,
        @Schema(types = {"string", "null"}, format = "date-time") OffsetDateTime sentAt,
        OffsetDateTime nextAttemptAt,
        OffsetDateTime createdAt,
        @Schema(types = {"string", "null"}, format = "uuid") UUID appointmentId,
        @Schema(types = {"string", "null"}, format = "uuid") UUID inquiryId) {
}
