package com.example.webapp.rule;

import java.math.BigDecimal;
import java.text.Normalizer;
import java.util.Locale;

import com.example.webapp.jooq.enums.ItemType;
import com.fasterxml.jackson.databind.JsonNode;

/**
 * 자동채점 룰 (판단은 코드, docs/v1-plan.md "1인 개발 원칙 2").
 * 채점 기준이 바뀌면 VERSION 을 올린다. attempts.rule_version 에 남아 어떤 기준으로 채점했는지 알 수 있다.
 *
 * <pre>
 * 문항 정답(items.answer)      학생 답(responses.answer)
 *   객관식 {"choice": 2}         {"choice": 2}        번호(1부터) 일치
 *   단답형 {"accepted": [..]}    {"text": "went"}     허용 답 중 하나와 일치 (대소문자·앞뒤 공백·여러 칸 공백·끝 문장부호·따옴표 모양 무시)
 *   서술형 {"rubric": ".."}      {"text": ".."}       사람이 채점 (무응답은 0점)
 * </pre>
 */
public final class ScoringRule {

    public static final String VERSION = "scoring-v1";

    /** correct·score 가 null 이면 사람이 채점해야 한다 */
    public record Result(Boolean correct, BigDecimal score) {
        public boolean needsManual() {
            return score == null;
        }
    }

    private ScoringRule() {
    }

    public static Result grade(ItemType type, JsonNode key, JsonNode response, BigDecimal points) {
        boolean blank = isBlank(type, response);
        if (type == ItemType.essay) {
            return blank ? new Result(false, BigDecimal.ZERO) : new Result(null, null);
        }
        if (blank) {
            return new Result(false, BigDecimal.ZERO);
        }
        boolean correct = switch (type) {
            case choice -> key.path("choice").asInt(-1) == response.path("choice").asInt(-2);
            case short_ -> matchesAny(key.path("accepted"), response.path("text").asText(""));
            default -> false;
        };
        return new Result(correct, correct ? points : BigDecimal.ZERO);
    }

    public static boolean isBlank(ItemType type, JsonNode response) {
        if (response == null || response.isNull() || response.isMissingNode()) return true;
        return type == ItemType.choice ? !response.path("choice").isInt() : response.path("text").asText("").isBlank();
    }

    private static boolean matchesAny(JsonNode accepted, String text) {
        String given = normalize(text);
        for (JsonNode a : accepted) {
            if (normalize(a.asText()).equals(given)) return true;
        }
        return false;
    }

    /** "  He  WENT. " → "he went" */
    public static String normalize(String s) {
        return Normalizer.normalize(s, Normalizer.Form.NFKC)
                .replace('’', '\'').replace('‘', '\'').replace('“', '"').replace('”', '"')
                .trim()
                .replaceAll("[.!?]+$", "")
                .replaceAll("\\s+", " ")
                .toLowerCase(Locale.ROOT)
                .trim();
    }
}
