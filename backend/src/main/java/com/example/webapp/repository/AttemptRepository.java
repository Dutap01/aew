package com.example.webapp.repository;

import static com.example.webapp.jooq.Tables.ATTEMPTS;
import static com.example.webapp.jooq.Tables.ITEMS;
import static com.example.webapp.jooq.Tables.PROFILES;
import static com.example.webapp.jooq.Tables.RESPONSES;
import static com.example.webapp.jooq.Tables.STUDENTS;
import static com.example.webapp.jooq.Tables.TESTS;
import static com.example.webapp.jooq.Tables.TEST_ITEMS;
import static org.jooq.impl.DSL.noCondition;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.jooq.Condition;
import org.jooq.DSLContext;
import org.jooq.JSONB;
import org.jooq.Record;
import org.springframework.stereotype.Repository;

import com.example.webapp.dto.test.AttemptSummary;
import com.example.webapp.dto.test.TestOption;
import com.example.webapp.jooq.enums.AttemptStatus;
import com.example.webapp.jooq.enums.TestKind;
import com.example.webapp.jooq.tables.Profiles;
import com.example.webapp.jooq.tables.records.AttemptsRecord;
import com.example.webapp.jooq.tables.records.ItemsRecord;
import com.example.webapp.jooq.tables.records.ResponsesRecord;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

@Repository
public class AttemptRepository {

    /** 시험지의 문항 하나 (순서 포함) */
    public record TestItem(int seq, ItemsRecord item) {
    }

    /** 레벨테스트 계정 (발급자 PROFILES 와 구분) */
    private static final Profiles STUDENT_ACCOUNT = PROFILES.as("student_account");

    private final DSLContext dsl;
    private final ObjectMapper mapper;

    public AttemptRepository(DSLContext dsl, ObjectMapper mapper) {
        this.dsl = dsl;
        this.mapper = mapper;
    }

    public JsonNode json(JSONB value) {
        if (value == null) return null;
        try {
            return mapper.readTree(value.data());
        } catch (JsonProcessingException e) {
            throw new IllegalStateException(e);
        }
    }

    public JSONB jsonb(Object value) {
        try {
            return JSONB.valueOf(mapper.writeValueAsString(value));
        } catch (JsonProcessingException e) {
            throw new IllegalStateException(e);
        }
    }

    /** 발급할 수 있는 레벨테스트 (운영 중, 문항 1개 이상) */
    public List<TestOption> levelTests() {
        var itemCount = dsl.selectCount().from(TEST_ITEMS).where(TEST_ITEMS.TEST_ID.eq(TESTS.ID)).<Integer>asField("item_count");
        return dsl.select(TESTS.ID, TESTS.TITLE, TESTS.LEVEL, TESTS.TIME_LIMIT_MINUTES, itemCount)
                .from(TESTS)
                .where(TESTS.KIND.eq(TestKind.level).and(TESTS.ACTIVE.isTrue()))
                .orderBy(TESTS.LEVEL.nullsFirst(), TESTS.TITLE)
                .fetch(r -> new TestOption(r.value1(), r.value2(), r.value3(), r.value4(), r.value5()))
                .stream().filter(t -> t.itemCount() > 0).toList();
    }

    /** 시험지 문항 (순서대로) */
    public List<TestItem> testItems(UUID testId) {
        return dsl.select(TEST_ITEMS.SEQ, ITEMS.asterisk())
                .from(TEST_ITEMS).join(ITEMS).on(ITEMS.ID.eq(TEST_ITEMS.ITEM_ID))
                .where(TEST_ITEMS.TEST_ID.eq(testId))
                .orderBy(TEST_ITEMS.SEQ)
                .fetch(r -> new TestItem(r.get(TEST_ITEMS.SEQ), r.into(ITEMS)));
    }

    public Map<UUID, ResponsesRecord> responses(UUID attemptId) {
        return dsl.selectFrom(RESPONSES).where(RESPONSES.ATTEMPT_ID.eq(attemptId)).fetch()
                .stream().collect(Collectors.toMap(ResponsesRecord::getItemId, Function.identity()));
    }

    public Optional<AttemptsRecord> lockById(UUID id) {
        return dsl.selectFrom(ATTEMPTS).where(ATTEMPTS.ID.eq(id)).forUpdate().fetchOptional();
    }

    public Optional<AttemptsRecord> findById(UUID id) {
        return dsl.selectFrom(ATTEMPTS).where(ATTEMPTS.ID.eq(id)).fetchOptional();
    }

    /** q: 학생 이름·학생 코드 */
    public static Condition searchCondition(String q, AttemptStatus status) {
        Condition c = noCondition();
        if (status != null) c = c.and(ATTEMPTS.STATUS.eq(status));
        if (q != null && !q.isBlank()) {
            c = c.and(STUDENTS.NAME.containsIgnoreCase(q.trim()).or(STUDENTS.STUDENT_CODE.containsIgnoreCase(q.trim())));
        }
        return c;
    }

    public long count(Condition condition) {
        return dsl.fetchCount(dsl.select(ATTEMPTS.ID).from(ATTEMPTS).join(STUDENTS).on(STUDENTS.ID.eq(ATTEMPTS.STUDENT_ID)).where(condition));
    }

    public Map<AttemptStatus, Integer> countByStatus(Condition withoutStatus) {
        var total = org.jooq.impl.DSL.count();
        return dsl.select(ATTEMPTS.STATUS, total).from(ATTEMPTS).join(STUDENTS).on(STUDENTS.ID.eq(ATTEMPTS.STUDENT_ID))
                .where(withoutStatus).groupBy(ATTEMPTS.STATUS).fetchMap(ATTEMPTS.STATUS, total);
    }

    /** 최근 발급 먼저 */
    public List<AttemptSummary> summaries(Condition condition, int offset, int limit) {
        return select(condition).orderBy(ATTEMPTS.CREATED_AT.desc(), ATTEMPTS.ID).offset(offset).limit(limit)
                .fetch(AttemptRepository::toSummary);
    }

    public Optional<AttemptSummary> summary(UUID id) {
        return select(ATTEMPTS.ID.eq(id)).fetchOptional(AttemptRepository::toSummary);
    }

    public List<AttemptSummary> byInquiry(UUID inquiryId) {
        return select(ATTEMPTS.INQUIRY_ID.eq(inquiryId)).orderBy(ATTEMPTS.CREATED_AT.desc()).fetch(AttemptRepository::toSummary);
    }

    public List<AttemptSummary> byStudent(UUID studentId) {
        return select(ATTEMPTS.STUDENT_ID.eq(studentId)).orderBy(ATTEMPTS.CREATED_AT.desc()).fetch(AttemptRepository::toSummary);
    }

    private org.jooq.SelectConditionStep<Record> select(Condition condition) {
        return dsl.select(ATTEMPTS.asterisk(), STUDENTS.STUDENT_CODE, STUDENTS.NAME, STUDENTS.GRADE, TESTS.TITLE, PROFILES.NAME,
                        STUDENT_ACCOUNT.LOGIN_ID, STUDENT_ACCOUNT.EXPIRES_AT)
                .from(ATTEMPTS)
                .join(STUDENTS).on(STUDENTS.ID.eq(ATTEMPTS.STUDENT_ID))
                .join(TESTS).on(TESTS.ID.eq(ATTEMPTS.TEST_ID))
                .leftJoin(PROFILES).on(PROFILES.ID.eq(ATTEMPTS.ISSUED_BY))
                .leftJoin(STUDENT_ACCOUNT).on(STUDENT_ACCOUNT.ID.eq(ATTEMPTS.TAKER_ID))
                .where(condition);
    }

    private static AttemptSummary toSummary(Record r) {
        var a = r.into(ATTEMPTS);
        return new AttemptSummary(a.getId(), a.getStudentId(), r.get(STUDENTS.STUDENT_CODE), r.get(STUDENTS.NAME),
                r.get(STUDENT_ACCOUNT.LOGIN_ID), r.get(STUDENT_ACCOUNT.EXPIRES_AT), r.get(STUDENTS.GRADE), a.getTestId(), r.get(TESTS.TITLE), a.getStatus(), a.getScore(), a.getMaxScore(),
                a.getInquiryId(), r.get(PROFILES.NAME), a.getCreatedAt(), a.getStartedAt(), a.getSubmittedAt());
    }
}
