package com.example.webapp.repository;

import static com.example.webapp.jooq.Tables.CONSULT_APPOINTMENTS;
import static com.example.webapp.jooq.Tables.PROFILES;
import static com.example.webapp.jooq.Tables.STUDENTS;
import static org.jooq.impl.DSL.noCondition;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.jooq.Condition;
import org.jooq.DSLContext;
import org.jooq.Record;
import org.springframework.stereotype.Repository;

import com.example.webapp.dto.appointment.AppointmentResponse;
import com.example.webapp.dto.appointment.StaffOption;
import com.example.webapp.jooq.enums.AppointmentStatus;
import com.example.webapp.jooq.enums.UserRole;
import com.example.webapp.jooq.tables.records.ConsultAppointmentsRecord;

@Repository
public class AppointmentRepository {

    private final DSLContext dsl;

    public AppointmentRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    /** [from, to) 와 겹치는 일정. counselorId 가 있으면 그 담당자만 */
    public List<AppointmentResponse> findInRange(OffsetDateTime from, OffsetDateTime to, UUID counselorId) {
        return select(CONSULT_APPOINTMENTS.STARTS_AT.lt(to).and(CONSULT_APPOINTMENTS.ENDS_AT.gt(from))
                .and(counselorId == null ? noCondition() : CONSULT_APPOINTMENTS.COUNSELOR_ID.eq(counselorId)));
    }

    public List<AppointmentResponse> findByInquiry(UUID inquiryId) {
        return select(CONSULT_APPOINTMENTS.INQUIRY_ID.eq(inquiryId));
    }

    public Optional<AppointmentResponse> findResponse(UUID id) {
        return select(CONSULT_APPOINTMENTS.ID.eq(id)).stream().findFirst();
    }

    public Optional<ConsultAppointmentsRecord> lockById(UUID id) {
        return dsl.selectFrom(CONSULT_APPOINTMENTS).where(CONSULT_APPOINTMENTS.ID.eq(id)).forUpdate().fetchOptional();
    }

    /** 같은 담당자의 예약 일정 중 시간이 겹치는 것 (자기 자신 제외) */
    public Optional<AppointmentResponse> findOverlap(UUID counselorId, OffsetDateTime start, OffsetDateTime end, UUID exceptId) {
        if (counselorId == null) return Optional.empty();
        return select(CONSULT_APPOINTMENTS.COUNSELOR_ID.eq(counselorId)
                .and(CONSULT_APPOINTMENTS.STATUS.eq(AppointmentStatus.scheduled))
                .and(CONSULT_APPOINTMENTS.STARTS_AT.lt(end))
                .and(CONSULT_APPOINTMENTS.ENDS_AT.gt(start))
                .and(exceptId == null ? noCondition() : CONSULT_APPOINTMENTS.ID.ne(exceptId)))
                .stream().findFirst();
    }

    /** 이 접수에 예약 상태 일정이 남아 있는지 (자기 자신 제외) */
    public boolean hasOtherScheduled(UUID inquiryId, UUID exceptId) {
        return dsl.fetchExists(CONSULT_APPOINTMENTS, CONSULT_APPOINTMENTS.INQUIRY_ID.eq(inquiryId)
                .and(CONSULT_APPOINTMENTS.STATUS.eq(AppointmentStatus.scheduled))
                .and(CONSULT_APPOINTMENTS.ID.ne(exceptId)));
    }

    /** 이 접수에 예약 상태 일정이 있는지 */
    public boolean hasScheduled(UUID inquiryId) {
        return dsl.fetchExists(CONSULT_APPOINTMENTS, CONSULT_APPOINTMENTS.INQUIRY_ID.eq(inquiryId)
                .and(CONSULT_APPOINTMENTS.STATUS.eq(AppointmentStatus.scheduled)));
    }

    /** 접수 취소 시 남은 예약 일정도 취소. 취소한 일정 id */
    public List<UUID> cancelScheduled(UUID inquiryId) {
        return dsl.update(CONSULT_APPOINTMENTS)
                .set(CONSULT_APPOINTMENTS.STATUS, AppointmentStatus.canceled)
                .set(CONSULT_APPOINTMENTS.UPDATED_AT, java.time.OffsetDateTime.now())
                .where(CONSULT_APPOINTMENTS.INQUIRY_ID.eq(inquiryId)
                        .and(CONSULT_APPOINTMENTS.STATUS.eq(AppointmentStatus.scheduled)))
                .returning(CONSULT_APPOINTMENTS.ID)
                .fetch(CONSULT_APPOINTMENTS.ID);
    }

    /** 담당자로 고를 수 있는 사람: 사용 중인 대표·상담실장 */
    public List<StaffOption> counselors() {
        return dsl.select(PROFILES.ID, PROFILES.NAME, PROFILES.ROLE).from(PROFILES)
                .where(PROFILES.ROLE.in(UserRole.owner, UserRole.counselor).and(PROFILES.ACTIVE.isTrue()))
                .orderBy(PROFILES.ROLE.desc(), PROFILES.NAME)
                .fetch(r -> new StaffOption(r.value1(), r.value2(), r.value3()));
    }

    public boolean isCounselor(UUID profileId) {
        return dsl.fetchExists(PROFILES, PROFILES.ID.eq(profileId)
                .and(PROFILES.ROLE.in(UserRole.owner, UserRole.counselor)).and(PROFILES.ACTIVE.isTrue()));
    }

    private List<AppointmentResponse> select(Condition condition) {
        var counselor = PROFILES.as("counselor");
        return dsl.select(CONSULT_APPOINTMENTS.asterisk(), counselor.NAME, STUDENTS.NAME, STUDENTS.STUDENT_CODE)
                .from(CONSULT_APPOINTMENTS)
                .leftJoin(counselor).on(counselor.ID.eq(CONSULT_APPOINTMENTS.COUNSELOR_ID))
                .leftJoin(STUDENTS).on(STUDENTS.ID.eq(CONSULT_APPOINTMENTS.STUDENT_ID))
                .where(condition)
                .orderBy(CONSULT_APPOINTMENTS.STARTS_AT, CONSULT_APPOINTMENTS.ID)
                .fetch(r -> toResponse(r, r.get(counselor.NAME), r.get(STUDENTS.NAME), r.get(STUDENTS.STUDENT_CODE)));
    }

    private static AppointmentResponse toResponse(Record r, String counselorName, String studentName, String studentCode) {
        var a = r.into(CONSULT_APPOINTMENTS);
        return new AppointmentResponse(a.getId(), a.getKind(), a.getStatus(), a.getTitle(), a.getStartsAt(), a.getEndsAt(),
                a.getMemo(), a.getCounselorId(), counselorName, a.getInquiryId(), a.getStudentId(), studentName, studentCode);
    }
}
