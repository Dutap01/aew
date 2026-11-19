package com.example.webapp.repository;

import static com.example.webapp.jooq.Tables.CONSULT_NOTES;
import static com.example.webapp.jooq.Tables.INQUIRIES;
import static com.example.webapp.jooq.Tables.PROFILES;
import static com.example.webapp.jooq.Tables.STUDENTS;
import static org.jooq.impl.DSL.noCondition;
import static org.jooq.impl.DSL.regexpReplaceAll;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.jooq.Condition;
import org.jooq.DSLContext;
import org.jooq.JSONB;
import org.springframework.stereotype.Repository;

import com.example.webapp.dto.inquiry.InquiryDetail;
import com.example.webapp.dto.inquiry.PreferredSlot;
import com.example.webapp.jooq.enums.InquiryStatus;
import com.example.webapp.jooq.enums.InquiryType;
import com.example.webapp.jooq.tables.records.InquiriesRecord;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

@Repository
public class InquiryRepository {

    private static final TypeReference<List<PreferredSlot>> SLOTS = new TypeReference<>() {};

    private final DSLContext dsl;
    private final ObjectMapper mapper;

    public InquiryRepository(DSLContext dsl, ObjectMapper mapper) {
        this.dsl = dsl;
        this.mapper = mapper;
    }

    public JSONB toJson(List<PreferredSlot> slots) {
        try {
            return JSONB.valueOf(mapper.writeValueAsString(slots));
        } catch (JsonProcessingException e) {
            throw new IllegalStateException(e);
        }
    }

    public List<PreferredSlot> slots(JSONB json) {
        try {
            return json == null ? List.of() : mapper.readValue(json.data(), SLOTS);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException(e);
        }
    }

    /** q: 학생 이름·신청자 이름·학교·연락처 숫자 */
    public static Condition searchCondition(String q, InquiryStatus status, InquiryType type) {
        Condition c = noCondition();
        if (status != null) c = c.and(INQUIRIES.STATUS.eq(status));
        if (type != null) c = c.and(INQUIRIES.TYPE.eq(type));
        if (q != null && !q.isBlank()) {
            String term = q.trim();
            Condition text = INQUIRIES.STUDENT_NAME.containsIgnoreCase(term)
                    .or(INQUIRIES.APPLICANT_NAME.containsIgnoreCase(term))
                    .or(INQUIRIES.SCHOOL.containsIgnoreCase(term));
            String digits = term.replaceAll("\\D", "");
            if (digits.length() >= 4) {
                text = text.or(regexpReplaceAll(INQUIRIES.APPLICANT_PHONE, "\\D", "").contains(digits));
            }
            c = c.and(text);
        }
        return c;
    }

    public long count(Condition condition) {
        return dsl.fetchCount(INQUIRIES, condition);
    }

    /** 최신 접수 먼저 */
    public List<InquiriesRecord> find(Condition condition, int offset, int limit) {
        return dsl.selectFrom(INQUIRIES).where(condition)
                .orderBy(INQUIRIES.CREATED_AT.desc(), INQUIRIES.ID)
                .offset(offset).limit(limit)
                .fetch();
    }

    /** 상태별 건수 (검색어·유형 조건 반영, 상태 조건은 제외) */
    public Map<InquiryStatus, Integer> countByStatus(Condition withoutStatus) {
        var total = org.jooq.impl.DSL.count();
        return dsl.select(INQUIRIES.STATUS, total).from(INQUIRIES).where(withoutStatus)
                .groupBy(INQUIRIES.STATUS)
                .fetchMap(INQUIRIES.STATUS, total);
    }

    public Optional<InquiriesRecord> findById(UUID id) {
        return dsl.selectFrom(INQUIRIES).where(INQUIRIES.ID.eq(id)).fetchOptional();
    }

    /** 수정용: 같은 접수를 동시에 바꾸지 않도록 행 잠금 */
    public Optional<InquiriesRecord> lockById(UUID id) {
        return dsl.selectFrom(INQUIRIES).where(INQUIRIES.ID.eq(id)).forUpdate().fetchOptional();
    }

    public List<InquiryDetail.InquiryNote> notes(UUID inquiryId) {
        return dsl.select(CONSULT_NOTES.ID, CONSULT_NOTES.CONTENT, PROFILES.NAME, CONSULT_NOTES.CREATED_AT)
                .from(CONSULT_NOTES).join(PROFILES).on(PROFILES.ID.eq(CONSULT_NOTES.AUTHOR_ID))
                .where(CONSULT_NOTES.INQUIRY_ID.eq(inquiryId))
                .orderBy(CONSULT_NOTES.CREATED_AT.desc())
                .fetch(r -> new InquiryDetail.InquiryNote(r.value1(), r.value2(), r.value3(), r.value4()));
    }

    public Optional<InquiryDetail.LinkedStudent> student(UUID studentId) {
        return dsl.select(STUDENTS.ID, STUDENTS.STUDENT_CODE, STUDENTS.NAME, STUDENTS.SCHOOL, STUDENTS.GRADE, STUDENTS.STATUS)
                .from(STUDENTS).where(STUDENTS.ID.eq(studentId))
                .fetchOptional(r -> new InquiryDetail.LinkedStudent(r.value1(), r.value2(), r.value3(), r.value4(), r.value5(), r.value6()));
    }

    /** 같은 학생으로 보이는 기존 학생: 학부모 연락처(숫자) 일치, 또는 이름 + 학교 일치. 최대 5명 */
    public List<InquiryDetail.LinkedStudent> similarStudents(InquiriesRecord inquiry) {
        String digits = inquiry.getApplicantPhone().replaceAll("\\D", "");
        Condition samePhone = regexpReplaceAll(STUDENTS.PARENT_PHONE, "\\D", "").eq(digits);
        Condition sameNameSchool = STUDENTS.NAME.eq(inquiry.getStudentName())
                .and(inquiry.getSchool() == null ? noCondition() : STUDENTS.SCHOOL.eq(inquiry.getSchool()));
        return dsl.select(STUDENTS.ID, STUDENTS.STUDENT_CODE, STUDENTS.NAME, STUDENTS.SCHOOL, STUDENTS.GRADE, STUDENTS.STATUS)
                .from(STUDENTS)
                .where(samePhone.or(sameNameSchool))
                .orderBy(STUDENTS.NAME.eq(inquiry.getStudentName()).desc(), STUDENTS.STUDENT_CODE)
                .limit(5)
                .fetch(r -> new InquiryDetail.LinkedStudent(r.value1(), r.value2(), r.value3(), r.value4(), r.value5(), r.value6()));
    }
}
