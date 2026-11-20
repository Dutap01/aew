package com.example.webapp;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;

import org.junit.jupiter.api.Test;

import com.example.webapp.jooq.enums.ItemType;
import com.example.webapp.rule.ScoringRule;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

class ScoringRuleTests {

    private static final ObjectMapper M = new ObjectMapper();
    private static final BigDecimal FIVE = BigDecimal.valueOf(5);

    private static JsonNode j(String json) throws Exception {
        return M.readTree(json);
    }

    @Test
    void choice() throws Exception {
        assertThat(ScoringRule.grade(ItemType.choice, j("{\"choice\":2}"), j("{\"choice\":2}"), FIVE))
                .isEqualTo(new ScoringRule.Result(true, FIVE));
        assertThat(ScoringRule.grade(ItemType.choice, j("{\"choice\":2}"), j("{\"choice\":3}"), FIVE))
                .isEqualTo(new ScoringRule.Result(false, BigDecimal.ZERO));
        assertThat(ScoringRule.grade(ItemType.choice, j("{\"choice\":2}"), null, FIVE).correct()).isFalse();
    }

    @Test
    void shortAnswerIgnoresCaseSpacesPunctuationAndQuoteStyle() throws Exception {
        JsonNode key = j("{\"accepted\":[\"doesn't\",\"does not\"]}");
        for (String given : new String[] {"doesn't", "  Does  NOT. ", "doesn’t", "DOESN'T!"}) {
            assertThat(ScoringRule.grade(ItemType.short_, key, j("{\"text\":" + M.writeValueAsString(given) + "}"), FIVE).correct())
                    .as(given).isTrue();
        }
        assertThat(ScoringRule.grade(ItemType.short_, key, j("{\"text\":\"don't\"}"), FIVE).correct()).isFalse();
        assertThat(ScoringRule.grade(ItemType.short_, key, j("{\"text\":\"   \"}"), FIVE).score()).isEqualByComparingTo("0");
    }

    @Test
    void essayNeedsManualUnlessBlank() throws Exception {
        assertThat(ScoringRule.grade(ItemType.essay, j("{\"rubric\":\"x\"}"), j("{\"text\":\"I like cats.\"}"), FIVE).needsManual()).isTrue();
        assertThat(ScoringRule.grade(ItemType.essay, j("{\"rubric\":\"x\"}"), null, FIVE))
                .isEqualTo(new ScoringRule.Result(false, BigDecimal.ZERO));
    }
}
