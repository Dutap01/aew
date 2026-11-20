package com.example.webapp.notification;

import static com.example.webapp.jooq.Tables.CONSULT_APPOINTMENTS;
import static com.example.webapp.jooq.Tables.INQUIRIES;
import static com.example.webapp.jooq.Tables.NOTIFICATIONS;
import static com.example.webapp.jooq.Tables.STUDENTS;

import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.TextStyle;
import java.util.Locale;
import java.util.UUID;

import org.jooq.DSLContext;
import org.jooq.JSONB;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.webapp.jooq.enums.InquiryType;

/**
 * 알림 쌓기. 실제 발송은 NotificationWorker 가 한다 (화면·업무 처리는 발송을 기다리지 않는다).
 * 같은 dedupe_key 는 한 번만 쌓인다.
 */
@Service
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);
    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");
    private static final DateTimeFormatter HM = DateTimeFormatter.ofPattern("HH:mm");

    private final DSLContext dsl;
    private final String academyName;
    private final String academyPhone;

    public NotificationService(DSLContext dsl,
            @Value("${app.academy.name:학원}") String academyName,
            @Value("${app.academy.phone:}") String academyPhone) {
        this.dsl = dsl;
        this.academyName = academyName;
        this.academyPhone = academyPhone;
    }

    /**
     * 상담 일정 안내를 쌓는다. 받는 사람: 접수 신청자 번호, 접수가 없으면 학생의 학부모 번호.
     * 번호가 없으면 쌓지 않는다. dedupeSuffix 가 같으면 다시 쌓지 않는다.
     * @return 쌓았으면 true
     */
    @Transactional
    public boolean enqueueForAppointment(UUID appointmentId, NotificationTemplate template, String dedupeSuffix) {
        var row = dsl.select(CONSULT_APPOINTMENTS.KIND, CONSULT_APPOINTMENTS.STARTS_AT,
                        INQUIRIES.APPLICANT_PHONE, INQUIRIES.STUDENT_NAME, STUDENTS.PARENT_PHONE, STUDENTS.NAME)
                .from(CONSULT_APPOINTMENTS)
                .leftJoin(INQUIRIES).on(INQUIRIES.ID.eq(CONSULT_APPOINTMENTS.INQUIRY_ID))
                .leftJoin(STUDENTS).on(STUDENTS.ID.eq(CONSULT_APPOINTMENTS.STUDENT_ID))
                .where(CONSULT_APPOINTMENTS.ID.eq(appointmentId))
                .fetchOne();
        if (row == null) return false;

        String phone = row.get(INQUIRIES.APPLICANT_PHONE) != null ? row.get(INQUIRIES.APPLICANT_PHONE) : row.get(STUDENTS.PARENT_PHONE);
        if (phone == null || phone.isBlank()) {
            log.info("알림 생략: 받는 번호 없음 (일정 {})", appointmentId);
            return false;
        }
        String name = row.get(INQUIRIES.STUDENT_NAME) != null ? row.get(INQUIRIES.STUDENT_NAME) : row.get(STUDENTS.NAME);
        String who = name == null ? "" : name + " 학생";
        String what = row.get(CONSULT_APPOINTMENTS.KIND) == InquiryType.level_test ? "레벨테스트" : "상담";
        String body = template.render(academyName, academyPhone, who, what, when(row.get(CONSULT_APPOINTMENTS.STARTS_AT))).replace("  ", " ");

        int inserted = dsl.insertInto(NOTIFICATIONS)
                .set(NOTIFICATIONS.APPOINTMENT_ID, appointmentId)
                .set(NOTIFICATIONS.TEMPLATE_CODE, template.code)
                .set(NOTIFICATIONS.TO_PHONE, phone)
                .set(NOTIFICATIONS.BODY, body)
                .set(NOTIFICATIONS.PAYLOAD, JSONB.valueOf("{\"appointmentId\":\"" + appointmentId + "\"}"))
                .set(NOTIFICATIONS.DEDUPE_KEY, "appt:" + appointmentId + ":" + template.code + ":" + dedupeSuffix)
                .onConflict(NOTIFICATIONS.DEDUPE_KEY).doNothing()
                .execute();
        return inserted > 0;
    }

    /** 11/20(금) 16:30 (한국 시각) */
    static String when(OffsetDateTime t) {
        var z = t.atZoneSameInstant(SEOUL);
        return z.getMonthValue() + "/" + z.getDayOfMonth() + "(" + z.getDayOfWeek().getDisplayName(TextStyle.SHORT, Locale.KOREAN) + ") "
                + z.format(HM);
    }
}
