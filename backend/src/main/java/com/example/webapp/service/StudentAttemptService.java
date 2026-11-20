package com.example.webapp.service;

import static com.example.webapp.jooq.Tables.ATTEMPTS;
import static com.example.webapp.jooq.Tables.RESPONSES;
import static com.example.webapp.jooq.Tables.STUDENTS;
import static com.example.webapp.jooq.Tables.TESTS;
import static org.jooq.impl.DSL.select;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.StreamSupport;

import org.jooq.Condition;
import org.jooq.DSLContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.webapp.dto.test.AnswerRequest;
import com.example.webapp.dto.test.StudentAttempt;
import com.example.webapp.jooq.enums.AttemptStatus;
import com.example.webapp.jooq.enums.ItemType;
import com.example.webapp.jooq.tables.records.AttemptsRecord;
import com.example.webapp.repository.AttemptRepository;
import com.fasterxml.jackson.databind.JsonNode;

/**
 * 학생 응시 (본인 것만: 레벨테스트 계정 또는 학생 정식 계정). 흐름: 발급 → 시작(타이머 시작) → 답 자동 저장 → 제출(자동채점).
 * 제한 시간이 지나면 1분 여유 뒤 답 저장을 막고, 다음에 열 때 저장된 답으로 자동 제출한다.
 * 정답·점수는 학생에게 보여주지 않는다 (결과는 진단서로 안내).
 */
@Service
public class StudentAttemptService {

    static final Duration GRACE = Duration.ofMinutes(1);

    private final DSLContext dsl;
    private final AttemptRepository attempts;
    private final AttemptGrader grader;
    private final TestAccountService testAccounts;

    public StudentAttemptService(DSLContext dsl, AttemptRepository attempts, AttemptGrader grader, TestAccountService testAccounts) {
        this.dsl = dsl;
        this.attempts = attempts;
        this.grader = grader;
        this.testAccounts = testAccounts;
    }

    /** 내 레벨테스트 (최근 발급 먼저). 레벨테스트 계정은 그 응시 하나, 학생 정식 계정은 본인 응시 전부 */
    @Transactional
    public List<StudentAttempt> mine(UUID profileId) {
        return dsl.select(ATTEMPTS.ID).from(ATTEMPTS).where(mineCondition(profileId))
                .orderBy(ATTEMPTS.CREATED_AT.desc()).fetch(ATTEMPTS.ID).stream()
                .map(id -> view(expireIfNeeded(attempts.lockById(id).orElseThrow(), profileId), false))
                .toList();
    }

    @Transactional
    public StudentAttempt get(UUID id, UUID profileId) {
        var a = expireIfNeeded(own(id, profileId), profileId);
        return view(a, a.getStatus() == AttemptStatus.in_progress);
    }

    @Transactional
    public StudentAttempt start(UUID id, UUID profileId) {
        var a = own(id, profileId);
        if (a.getStatus() == AttemptStatus.issued) {
            a.setStatus(AttemptStatus.in_progress);
            a.setStartedAt(OffsetDateTime.now());
            a.store();
            // 계정 사용 시간이 시험 중간에 끝나지 않게: 시험이 끝날 때(+여유)까지는 쓸 수 있게 한다
            var deadline = deadline(a);
            if (a.getTakerId() != null) {
                testAccounts.extendTo(a.getTakerId(), (deadline != null ? deadline : OffsetDateTime.now().plusHours(3)).plus(GRACE));
            }
        } else if (a.getStatus() != AttemptStatus.in_progress) {
            throw new ConflictException("이미 제출한 테스트입니다.");
        }
        return get(id, profileId);
    }

    @Transactional
    public void answer(UUID id, AnswerRequest req, UUID profileId) {
        var a = own(id, profileId);
        if (a.getStatus() != AttemptStatus.in_progress) {
            throw new ConflictException(a.getStatus() == AttemptStatus.issued ? "먼저 테스트를 시작하세요." : "이미 제출한 테스트입니다.");
        }
        var deadline = deadline(a);
        if (deadline != null && OffsetDateTime.now().isAfter(deadline.plus(GRACE))) {
            throw new ConflictException("시험 시간이 끝났습니다. 저장된 답으로 제출됩니다.");
        }
        var item = attempts.testItems(a.getTestId()).stream().filter(t -> t.item().getId().equals(req.itemId())).findFirst()
                .orElseThrow(() -> new NotFoundException("이 테스트의 문항이 아닙니다.")).item();
        Object value;
        if (item.getType() == ItemType.choice) {
            int count = attempts.json(item.getContent()).path("choices").size();
            if (req.choice() != null && (req.choice() < 1 || req.choice() > count)) {
                throw new ConflictException("보기 번호가 올바르지 않습니다.");
            }
            value = req.choice() == null ? null : Map.of("choice", req.choice());
        } else {
            value = req.text() == null || req.text().isBlank() ? null : Map.of("text", req.text());
        }
        var json = value == null ? null : attempts.jsonb(value);
        dsl.insertInto(RESPONSES)
                .set(RESPONSES.ATTEMPT_ID, id)
                .set(RESPONSES.ITEM_ID, item.getId())
                .set(RESPONSES.ANSWER, json)
                .onConflict(RESPONSES.ATTEMPT_ID, RESPONSES.ITEM_ID)
                .doUpdate()
                .set(RESPONSES.ANSWER, json)
                .set(RESPONSES.ANSWERED_AT, OffsetDateTime.now())
                .execute();
    }

    @Transactional
    public StudentAttempt submit(UUID id, UUID profileId) {
        var a = own(id, profileId);
        if (a.getStatus() != AttemptStatus.in_progress) {
            throw new ConflictException(a.getStatus() == AttemptStatus.issued ? "먼저 테스트를 시작하세요." : "이미 제출한 테스트입니다.");
        }
        grader.submit(a, profileId, "student");
        return view(a, false);
    }

    /** 시간이 지났는데 제출하지 않은 응시는 저장된 답으로 제출 */
    private AttemptsRecord expireIfNeeded(AttemptsRecord a, UUID profileId) {
        var deadline = deadline(a);
        if (a.getStatus() == AttemptStatus.in_progress && deadline != null && OffsetDateTime.now().isAfter(deadline.plus(GRACE))) {
            grader.submit(a, profileId, "time_over");
        }
        return a;
    }

    private OffsetDateTime deadline(AttemptsRecord a) {
        Integer limit = dsl.select(TESTS.TIME_LIMIT_MINUTES).from(TESTS).where(TESTS.ID.eq(a.getTestId())).fetchOne(TESTS.TIME_LIMIT_MINUTES);
        return limit == null || a.getStartedAt() == null ? null : a.getStartedAt().plusMinutes(limit);
    }

    private StudentAttempt view(AttemptsRecord a, boolean withItems) {
        var test = dsl.selectFrom(TESTS).where(TESTS.ID.eq(a.getTestId())).fetchOne();
        var items = attempts.testItems(a.getTestId());
        List<StudentAttempt.Question> questions = List.of();
        if (withItems) {
            var saved = attempts.responses(a.getId());
            questions = items.stream().map(ti -> {
                var item = ti.item();
                JsonNode content = attempts.json(item.getContent());
                var r = saved.get(item.getId());
                JsonNode ans = r == null ? null : attempts.json(r.getAnswer());
                Integer choice = ans != null && ans.path("choice").isInt() ? ans.path("choice").asInt() : null;
                String text = ans != null && ans.hasNonNull("text") ? ans.path("text").asText() : null;
                String passage = content.path("passage").asText("");
                return new StudentAttempt.Question(ti.seq(), item.getId(), item.getType().getLiteral(), item.getArea(),
                        content.path("stem").asText(), passage.isBlank() ? null : passage,
                        StreamSupport.stream(content.path("choices").spliterator(), false).map(JsonNode::asText).toList(),
                        choice, text);
            }).toList();
        }
        return new StudentAttempt(a.getId(), test.getTitle(), a.getStatus(), test.getTimeLimitMinutes(), items.size(),
                a.getStartedAt(), deadline(a), a.getSubmittedAt(), questions);
    }

    /** 로그인한 계정의 응시만 (다른 사람 것은 없는 것처럼 404). 수정용으로 행을 잠근다 */
    private AttemptsRecord own(UUID id, UUID profileId) {
        if (!dsl.fetchExists(ATTEMPTS, ATTEMPTS.ID.eq(id).and(mineCondition(profileId)))) throw notFound();
        return attempts.lockById(id).orElseThrow(StudentAttemptService::notFound);
    }

    /** 레벨테스트 계정이면 그 계정의 응시, 학생 정식 계정이면 그 학생의 응시 */
    private static Condition mineCondition(UUID profileId) {
        return ATTEMPTS.TAKER_ID.eq(profileId)
                .or(ATTEMPTS.STUDENT_ID.in(select(STUDENTS.ID).from(STUDENTS).where(STUDENTS.PROFILE_ID.eq(profileId))));
    }

    private static NotFoundException notFound() {
        return new NotFoundException("테스트를 찾을 수 없습니다.");
    }
}
