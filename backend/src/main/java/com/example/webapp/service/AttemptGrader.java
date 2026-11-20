package com.example.webapp.service;

import static com.example.webapp.jooq.Tables.RESPONSES;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

import org.jooq.DSLContext;
import org.springframework.stereotype.Component;

import com.example.webapp.jooq.enums.AttemptStatus;
import com.example.webapp.jooq.tables.records.AttemptsRecord;
import com.example.webapp.repository.AttemptRepository;
import com.example.webapp.rule.ScoringRule;

/**
 * 제출된 응시를 ScoringRule 로 채점하고 총점을 계산한다.
 * 사람이 채점할 서술형이 남으면 submitted(채점대기), 모두 채점되면 graded(채점완료).
 */
@Component
public class AttemptGrader {

    private final DSLContext dsl;
    private final AttemptRepository attempts;
    private final AuditService audit;

    public AttemptGrader(DSLContext dsl, AttemptRepository attempts, AuditService audit) {
        this.dsl = dsl;
        this.attempts = attempts;
        this.audit = audit;
    }

    /** 제출: 답하지 않은 문항도 응답 행을 만들어(0점) 문항마다 결과가 남게 한다. a 는 잠근 행이어야 한다 */
    public void submit(AttemptsRecord a, UUID actorId, String reason) {
        var saved = attempts.responses(a.getId());
        for (var ti : attempts.testItems(a.getTestId())) {
            var item = ti.item();
            var response = saved.get(item.getId());
            var result = ScoringRule.grade(item.getType(), attempts.json(item.getAnswer()),
                    response == null ? null : attempts.json(response.getAnswer()), item.getPoints());
            if (response == null) {
                dsl.insertInto(RESPONSES)
                        .set(RESPONSES.ATTEMPT_ID, a.getId())
                        .set(RESPONSES.ITEM_ID, item.getId())
                        .set(RESPONSES.IS_CORRECT, result.correct())
                        .set(RESPONSES.SCORE, result.score())
                        .execute();
            } else {
                response.setIsCorrect(result.correct());
                response.setScore(result.score());
                response.store();
            }
        }
        OffsetDateTime now = OffsetDateTime.now();
        a.setSubmittedAt(now);
        a.setRuleVersion(ScoringRule.VERSION);
        recompute(a, now);
        audit.record(actorId, "submit", "attempts", a.getId(), null,
                Map.of("reason", reason, "status", a.getStatus(), "score", String.valueOf(a.getScore())));
    }

    /** 응답 점수로 총점·만점·상태를 다시 계산하고 저장한다 */
    public void recompute(AttemptsRecord a, OffsetDateTime now) {
        var items = attempts.testItems(a.getTestId());
        var responses = attempts.responses(a.getId());
        BigDecimal score = BigDecimal.ZERO;
        BigDecimal max = BigDecimal.ZERO;
        boolean pending = false;
        for (var ti : items) {
            max = max.add(ti.item().getPoints());
            var r = responses.get(ti.item().getId());
            if (r == null || r.getScore() == null) pending = true;
            else score = score.add(r.getScore());
        }
        a.setScore(score);
        a.setMaxScore(max);
        a.setStatus(pending ? AttemptStatus.submitted : AttemptStatus.graded);
        a.setGradedAt(pending ? null : now);
        a.store();
    }
}
