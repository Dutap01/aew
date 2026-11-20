package com.example.webapp.service;

import static com.example.webapp.jooq.Tables.ATTEMPTS;
import static com.example.webapp.jooq.Tables.INQUIRIES;
import static com.example.webapp.jooq.Tables.STUDENTS;
import static com.example.webapp.jooq.Tables.TESTS;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.StreamSupport;

import org.jooq.DSLContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.webapp.dto.PageResponse;
import com.example.webapp.dto.test.AttemptCounts;
import com.example.webapp.dto.test.AttemptDetail;
import com.example.webapp.dto.test.AttemptIssuedResponse;
import com.example.webapp.dto.test.AttemptSummary;
import com.example.webapp.dto.test.TestOption;
import com.example.webapp.jooq.enums.AttemptStatus;
import com.example.webapp.jooq.enums.InquiryType;
import com.example.webapp.jooq.enums.ItemType;
import com.example.webapp.jooq.enums.StudentStatus;
import com.example.webapp.jooq.enums.TestKind;
import com.example.webapp.jooq.tables.records.StudentsRecord;
import com.example.webapp.repository.AttemptRepository;
import com.fasterxml.jackson.databind.JsonNode;

/**
 * 레벨테스트 발급·결과 (대표·상담실장).
 * 발급할 때 응시마다 레벨테스트 전용 계정(T123456, 사용 기한 있음)을 만들고 비밀번호를 한 번만 보여준다 (TestAccountService).
 */
@Service
public class AttemptService {

    private static final String[] CIRCLED = {"①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧"};

    private final DSLContext dsl;
    private final AttemptRepository attempts;
    private final AttemptGrader grader;
    private final AuditService audit;
    private final TestAccountService testAccounts;

    public AttemptService(DSLContext dsl, AttemptRepository attempts, AttemptGrader grader, AuditService audit,
            TestAccountService testAccounts) {
        this.dsl = dsl;
        this.attempts = attempts;
        this.grader = grader;
        this.audit = audit;
        this.testAccounts = testAccounts;
    }

    @Transactional(readOnly = true)
    public List<TestOption> levelTests() {
        return attempts.levelTests();
    }

    @Transactional(readOnly = true)
    public PageResponse<AttemptSummary> search(String q, AttemptStatus status, int page, int size) {
        int safeSize = Math.clamp(size, 1, StudentService.MAX_PAGE_SIZE);
        int safePage = Math.max(page, 0);
        var condition = AttemptRepository.searchCondition(q, status);
        return new PageResponse<>(attempts.summaries(condition, safePage * safeSize, safeSize),
                attempts.count(condition), safePage, safeSize);
    }

    @Transactional(readOnly = true)
    public AttemptCounts counts(String q) {
        var map = attempts.countByStatus(AttemptRepository.searchCondition(q, null));
        return new AttemptCounts(map.getOrDefault(AttemptStatus.issued, 0), map.getOrDefault(AttemptStatus.in_progress, 0),
                map.getOrDefault(AttemptStatus.submitted, 0), map.getOrDefault(AttemptStatus.graded, 0));
    }

    @Transactional(readOnly = true)
    public List<AttemptSummary> byStudent(UUID studentId) {
        return attempts.byStudent(studentId);
    }

    @Transactional
    public AttemptIssuedResponse issue(UUID studentId, UUID testId, UUID inquiryId, UUID actorId) {
        StudentsRecord s = dsl.selectFrom(STUDENTS).where(STUDENTS.ID.eq(studentId)).forUpdate().fetchOptional()
                .orElseThrow(() -> new NotFoundException("학생을 찾을 수 없습니다."));
        if (s.getStatus() == StudentStatus.withdrawn) {
            throw new ConflictException("퇴원한 학생에게는 발급할 수 없습니다.");
        }
        var test = dsl.selectFrom(TESTS).where(TESTS.ID.eq(testId)).fetchOptional()
                .orElseThrow(() -> new NotFoundException("테스트를 찾을 수 없습니다."));
        if (test.getKind() != TestKind.level || !test.getActive()) {
            throw new ConflictException("발급할 수 없는 테스트입니다.");
        }
        if (attempts.testItems(testId).isEmpty()) {
            throw new ConflictException("문항이 없는 테스트입니다.");
        }
        if (dsl.fetchExists(ATTEMPTS, ATTEMPTS.STUDENT_ID.eq(studentId).and(ATTEMPTS.TEST_ID.eq(testId))
                .and(ATTEMPTS.STATUS.in(AttemptStatus.issued, AttemptStatus.in_progress)))) {
            throw new ConflictException("이 학생에게 아직 끝나지 않은 같은 테스트가 있습니다.");
        }
        if (inquiryId != null) {
            var inquiry = dsl.selectFrom(INQUIRIES).where(INQUIRIES.ID.eq(inquiryId)).fetchOptional()
                    .orElseThrow(() -> new NotFoundException("접수를 찾을 수 없습니다."));
            if (inquiry.getType() != InquiryType.level_test || !studentId.equals(inquiry.getStudentId())) {
                throw new ConflictException("이 학생의 레벨테스트 접수가 아닙니다.");
            }
        }

        // 레벨테스트 전용 계정 (학생 정식 계정과 별도, 사용 기한 있음)
        var account = testAccounts.create(s.getName(), actorId);

        UUID id = dsl.insertInto(ATTEMPTS)
                .set(ATTEMPTS.TEST_ID, testId)
                .set(ATTEMPTS.STUDENT_ID, studentId)
                .set(ATTEMPTS.INQUIRY_ID, inquiryId)
                .set(ATTEMPTS.ISSUED_BY, actorId)
                .set(ATTEMPTS.TAKER_ID, account.profileId())
                .returning(ATTEMPTS.ID).fetchOne(ATTEMPTS.ID);
        if (s.getStatus() == StudentStatus.consulting) {
            audit.record(actorId, "status_change", "students", studentId, Map.of("status", s.getStatus()),
                    Map.of("status", StudentStatus.test_scheduled));
            s.setStatus(StudentStatus.test_scheduled);
        }
        s.setUpdatedAt(OffsetDateTime.now());
        s.store();
        audit.record(actorId, "issue", "attempts", id, null, Map.of("studentId", studentId, "testId", testId));
        return new AttemptIssuedResponse(attempts.summary(id).orElseThrow(), account.loginId(), account.password(), account.expiresAt());
    }

    /** 잘못 발급한 응시 취소 (아직 시작하지 않은 것만) */
    @Transactional
    public void cancel(UUID id, UUID actorId) {
        var a = attempts.lockById(id).orElseThrow(AttemptService::notFound);
        if (a.getStatus() != AttemptStatus.issued) {
            throw new ConflictException("이미 시작한 응시는 취소할 수 없습니다.");
        }
        UUID takerId = a.getTakerId();
        a.delete();
        if (takerId != null) testAccounts.expireNow(takerId);
        audit.record(actorId, "delete", "attempts", id, Map.of("studentId", a.getStudentId()), null);
    }

    /**
     * 레벨테스트 계정 다시 발급: 아이디·비밀번호를 잊었거나 사용 시간이 지나 로그인할 수 없을 때.
     * 같은 아이디에 새 비밀번호, 사용 시간은 지금부터 다시. 제출한 응시는 다시 발급할 필요가 없다
     */
    @Transactional
    public AttemptIssuedResponse reissueAccount(UUID id, UUID actorId) {
        var a = attempts.lockById(id).orElseThrow(AttemptService::notFound);
        if (a.getStatus() == AttemptStatus.submitted || a.getStatus() == AttemptStatus.graded) {
            throw new ConflictException("이미 제출한 테스트입니다.");
        }
        TestAccountService.Created account;
        if (a.getTakerId() == null) {
            String name = dsl.select(STUDENTS.NAME).from(STUDENTS).where(STUDENTS.ID.eq(a.getStudentId())).fetchOne(STUDENTS.NAME);
            account = testAccounts.create(name, actorId);
            a.setTakerId(account.profileId());
            a.store();
        } else {
            account = testAccounts.reissue(a.getTakerId(), actorId);
        }
        return new AttemptIssuedResponse(attempts.summary(id).orElseThrow(), account.loginId(), account.password(), account.expiresAt());
    }

    /** 응시 중인 것을 운영자가 대신 제출 (학생이 제출하지 못하고 나간 경우) */
    @Transactional
    public AttemptDetail forceSubmit(UUID id, UUID actorId) {
        var a = attempts.lockById(id).orElseThrow(AttemptService::notFound);
        if (a.getStatus() != AttemptStatus.in_progress) {
            throw new ConflictException("응시 중인 테스트만 제출할 수 있습니다.");
        }
        grader.submit(a, actorId, "staff");
        return detail(id);
    }

    /** 서술형 채점 */
    @Transactional
    public AttemptDetail manualScore(UUID id, UUID itemId, BigDecimal score, UUID actorId) {
        var a = attempts.lockById(id).orElseThrow(AttemptService::notFound);
        if (a.getStatus() != AttemptStatus.submitted && a.getStatus() != AttemptStatus.graded) {
            throw new ConflictException("제출된 응시만 채점할 수 있습니다.");
        }
        var item = attempts.testItems(a.getTestId()).stream().filter(t -> t.item().getId().equals(itemId)).findFirst()
                .orElseThrow(() -> new NotFoundException("이 테스트의 문항이 아닙니다."))
                .item();
        if (item.getType() != ItemType.essay) {
            throw new ConflictException("서술형만 직접 채점합니다. 객관식·단답형은 자동채점됩니다.");
        }
        if (score.compareTo(item.getPoints()) > 0) {
            throw new ConflictException("배점(" + item.getPoints().stripTrailingZeros().toPlainString() + "점)보다 클 수 없습니다.");
        }
        var r = attempts.responses(id).get(itemId);
        if (r == null) throw new NotFoundException("응답을 찾을 수 없습니다.");
        var before = r.getScore();
        r.setScore(score);
        r.setIsCorrect(score.compareTo(item.getPoints()) == 0);
        r.store();
        grader.recompute(a, OffsetDateTime.now());
        audit.record(actorId, "manual_score", "responses", r.getId(), Map.of("score", String.valueOf(before)),
                Map.of("score", score.toPlainString()));
        return detail(id);
    }

    @Transactional(readOnly = true)
    public AttemptDetail detail(UUID id) {
        var summary = attempts.summary(id).orElseThrow(AttemptService::notFound);
        var a = attempts.findById(id).orElseThrow();
        var test = dsl.selectFrom(TESTS).where(TESTS.ID.eq(a.getTestId())).fetchOne();
        var responses = attempts.responses(id);
        boolean finished = a.getStatus() == AttemptStatus.submitted || a.getStatus() == AttemptStatus.graded;

        List<AttemptDetail.ItemResult> items = new ArrayList<>();
        Map<String, AreaAcc> areas = new LinkedHashMap<>();
        for (var ti : attempts.testItems(a.getTestId())) {
            var item = ti.item();
            JsonNode content = attempts.json(item.getContent());
            JsonNode key = attempts.json(item.getAnswer());
            List<String> choices = StreamSupport.stream(content.path("choices").spliterator(), false).map(JsonNode::asText).toList();
            var r = responses.get(item.getId());
            JsonNode answer = r == null ? null : attempts.json(r.getAnswer());
            Boolean correct = finished && r != null ? r.getIsCorrect() : null;
            BigDecimal score = finished && r != null ? r.getScore() : null;
            items.add(new AttemptDetail.ItemResult(ti.seq(), item.getId(), item.getItemCode(), item.getType().getLiteral(), item.getArea(),
                    content.path("stem").asText(), textOrNull(content.path("passage")), choices,
                    describeKey(item.getType(), key, choices), describeAnswer(item.getType(), answer, choices),
                    correct, score, item.getPoints()));
            var acc = areas.computeIfAbsent(item.getArea(), k -> new AreaAcc());
            acc.max = acc.max.add(item.getPoints());
            acc.total++;
            if (score != null) acc.score = acc.score.add(score);
            if (Boolean.TRUE.equals(correct)) acc.correct++;
            if (finished && score == null) acc.pending++;
        }
        var areaScores = areas.entrySet().stream()
                .map(e -> new AttemptDetail.AreaScore(e.getKey(), e.getValue().score, e.getValue().max,
                        e.getValue().correct, e.getValue().total, e.getValue().pending))
                .toList();
        return new AttemptDetail(summary, test.getTimeLimitMinutes(), a.getRuleVersion(), areaScores, items);
    }

    private static final class AreaAcc {
        BigDecimal score = BigDecimal.ZERO;
        BigDecimal max = BigDecimal.ZERO;
        int correct;
        int total;
        int pending;
    }

    static String describeKey(ItemType type, JsonNode key, List<String> choices) {
        return switch (type) {
            case choice -> describeChoice(key.path("choice").asInt(), choices);
            case short_ -> String.join(" / ", StreamSupport.stream(key.path("accepted").spliterator(), false).map(JsonNode::asText).toList());
            case essay -> key.path("rubric").asText("서술형 (직접 채점)");
        };
    }

    static String describeAnswer(ItemType type, JsonNode answer, List<String> choices) {
        if (answer == null || answer.isNull()) return null;
        if (type == ItemType.choice) {
            return answer.path("choice").isInt() ? describeChoice(answer.path("choice").asInt(), choices) : null;
        }
        String text = answer.path("text").asText("");
        return text.isBlank() ? null : text;
    }

    private static String describeChoice(int n, List<String> choices) {
        String mark = n >= 1 && n <= CIRCLED.length ? CIRCLED[n - 1] : n + "번";
        return n >= 1 && n <= choices.size() ? mark + " " + choices.get(n - 1) : mark;
    }

    private static String textOrNull(JsonNode n) {
        return n.isMissingNode() || n.isNull() || n.asText().isBlank() ? null : n.asText();
    }

    private static NotFoundException notFound() {
        return new NotFoundException("응시를 찾을 수 없습니다.");
    }
}
