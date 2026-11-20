package com.example.webapp.dto.test;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;


import io.swagger.v3.oas.annotations.media.Schema;

/** 응시 결과 (운영자): 영역별 점수 + 문항별 정오 */
public record AttemptDetail(
        AttemptSummary summary,
        @Schema(types = {"integer", "null"}) Integer timeLimitMinutes,
        @Schema(types = {"string", "null"}) String ruleVersion,
        List<AreaScore> areas,
        List<ItemResult> items) {

    /** 영역(어휘·문법·독해 …)별 점수. 사람이 채점할 문항이 남았으면 pending 에 개수 */
    public record AreaScore(String area, BigDecimal score, BigDecimal maxScore, int correct, int total, int pending) {
    }

    /**
     * 문항 하나. correctAnswer·studentAnswer 는 화면에 그대로 보여줄 글 (객관식은 "② went").
     * isCorrect·score 가 null 이면 채점 전 (응시 중이거나 서술형 채점 대기)
     */
    public record ItemResult(
            int seq,
            UUID itemId,
            String itemCode,
            /** 문항 유형: choice 객관식 · short 단답형 · essay 서술형 */
            @Schema(allowableValues = {"choice", "short", "essay"}) String type,
            String area,
            String stem,
            @Schema(types = {"string", "null"}) String passage,
            List<String> choices,
            String correctAnswer,
            @Schema(types = {"string", "null"}) String studentAnswer,
            @Schema(types = {"boolean", "null"}) Boolean isCorrect,
            @Schema(types = {"number", "null"}) BigDecimal score,
            BigDecimal points) {
    }
}
