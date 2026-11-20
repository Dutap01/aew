package com.example.webapp.dto.test;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import com.example.webapp.jooq.enums.AttemptStatus;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * 학생 응시 화면. 정답·점수는 내려주지 않는다.
 * items 는 응시를 시작한 뒤(in_progress)에만 채운다. deadline: 시작 시각 + 제한 시간 (제한 없으면 null)
 */
public record StudentAttempt(
        UUID id,
        String testTitle,
        AttemptStatus status,
        @Schema(types = {"integer", "null"}) Integer timeLimitMinutes,
        int itemCount,
        @Schema(types = {"string", "null"}, format = "date-time") OffsetDateTime startedAt,
        @Schema(types = {"string", "null"}, format = "date-time") OffsetDateTime deadline,
        @Schema(types = {"string", "null"}, format = "date-time") OffsetDateTime submittedAt,
        List<Question> items) {

    /** 저장된 답: 객관식은 savedChoice(1부터), 나머지는 savedText */
    public record Question(
            int seq,
            UUID itemId,
            /** 문항 유형: choice 객관식 · short 단답형 · essay 서술형 */
            @Schema(allowableValues = {"choice", "short", "essay"}) String type,
            String area,
            String stem,
            @Schema(types = {"string", "null"}) String passage,
            List<String> choices,
            @Schema(types = {"integer", "null"}) Integer savedChoice,
            @Schema(types = {"string", "null"}) String savedText) {
    }
}
