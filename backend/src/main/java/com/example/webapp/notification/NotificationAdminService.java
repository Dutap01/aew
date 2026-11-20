package com.example.webapp.notification;

import static com.example.webapp.jooq.Tables.CONSULT_APPOINTMENTS;
import static com.example.webapp.jooq.Tables.NOTIFICATIONS;
import static org.jooq.impl.DSL.noCondition;

import java.time.OffsetDateTime;
import java.util.Arrays;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.jooq.Condition;
import org.jooq.DSLContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.webapp.dto.PageResponse;
import com.example.webapp.dto.notification.NotificationCounts;
import com.example.webapp.dto.notification.NotificationResponse;
import com.example.webapp.jooq.enums.NotificationStatus;
import com.example.webapp.service.AuditService;
import com.example.webapp.service.ConflictException;
import com.example.webapp.service.NotFoundException;
import com.example.webapp.service.StudentService;

/** 발송 이력 조회·재발송 (운영 화면) */
@Service
public class NotificationAdminService {

    private static final Map<String, String> LABELS = Arrays.stream(NotificationTemplate.values())
            .collect(Collectors.toMap(t -> t.code, t -> t.label));

    private final DSLContext dsl;
    private final NotificationSender sender;
    private final AuditService audit;

    public NotificationAdminService(DSLContext dsl, NotificationSender sender, AuditService audit) {
        this.dsl = dsl;
        this.sender = sender;
        this.audit = audit;
    }

    /** q: 받는 번호 숫자·문장 내용 */
    private static Condition search(String q) {
        if (q == null || q.isBlank()) return noCondition();
        String term = q.trim();
        String digits = term.replaceAll("\\D", "");
        Condition c = NOTIFICATIONS.BODY.containsIgnoreCase(term);
        if (digits.length() >= 4) {
            c = c.or(org.jooq.impl.DSL.regexpReplaceAll(NOTIFICATIONS.TO_PHONE, "\\D", "").contains(digits));
        }
        return c;
    }

    @Transactional(readOnly = true)
    public PageResponse<NotificationResponse> search(String q, NotificationStatus status, int page, int size) {
        int safeSize = Math.clamp(size, 1, StudentService.MAX_PAGE_SIZE);
        int safePage = Math.max(page, 0);
        Condition c = search(q).and(status == null ? noCondition() : NOTIFICATIONS.STATUS.eq(status));
        var items = dsl.select(NOTIFICATIONS.asterisk(), CONSULT_APPOINTMENTS.INQUIRY_ID)
                .from(NOTIFICATIONS)
                .leftJoin(CONSULT_APPOINTMENTS).on(CONSULT_APPOINTMENTS.ID.eq(NOTIFICATIONS.APPOINTMENT_ID))
                .where(c)
                .orderBy(NOTIFICATIONS.CREATED_AT.desc(), NOTIFICATIONS.ID)
                .offset(safePage * safeSize).limit(safeSize)
                .fetch(r -> {
                    var n = r.into(NOTIFICATIONS);
                    return new NotificationResponse(n.getId(), n.getTemplateCode(), LABELS.getOrDefault(n.getTemplateCode(), n.getTemplateCode()),
                            n.getToPhone(), n.getBody(), n.getStatus(), n.getAttempts(), n.getError(), n.getProviderMsgId(),
                            n.getSentAt(), n.getNextAttemptAt(), n.getCreatedAt(), n.getAppointmentId(), r.get(CONSULT_APPOINTMENTS.INQUIRY_ID));
                });
        return new PageResponse<>(items, dsl.fetchCount(NOTIFICATIONS, c), safePage, safeSize);
    }

    @Transactional(readOnly = true)
    public NotificationCounts counts(String q) {
        var total = org.jooq.impl.DSL.count();
        Map<NotificationStatus, Integer> m = dsl.select(NOTIFICATIONS.STATUS, total).from(NOTIFICATIONS).where(search(q))
                .groupBy(NOTIFICATIONS.STATUS).fetchMap(NOTIFICATIONS.STATUS, total);
        Function<NotificationStatus, Long> get = s -> (long) m.getOrDefault(s, 0);
        return new NotificationCounts(get.apply(NotificationStatus.queued), get.apply(NotificationStatus.sending),
                get.apply(NotificationStatus.succeeded), get.apply(NotificationStatus.failed), sender.name());
    }

    /**
     * 재발송. 실패한 알림은 그 알림을 다시 대기열에 넣고(시도 횟수 초기화),
     * 이미 보낸 알림은 같은 내용으로 새 알림을 하나 더 만든다.
     */
    @Transactional
    public void resend(UUID id, UUID actorId) {
        var n = dsl.selectFrom(NOTIFICATIONS).where(NOTIFICATIONS.ID.eq(id)).forUpdate().fetchOptional()
                .orElseThrow(() -> new NotFoundException("발송 이력을 찾을 수 없습니다."));
        OffsetDateTime now = OffsetDateTime.now();
        switch (n.getStatus()) {
            case failed -> {
                n.setStatus(NotificationStatus.queued);
                n.setAttempts(0);
                n.setNextAttemptAt(now);
                n.setUpdatedAt(now);
                n.store();
            }
            case succeeded -> dsl.insertInto(NOTIFICATIONS)
                    .set(NOTIFICATIONS.APPOINTMENT_ID, n.getAppointmentId())
                    .set(NOTIFICATIONS.REPORT_ID, n.getReportId())
                    .set(NOTIFICATIONS.TEMPLATE_CODE, n.getTemplateCode())
                    .set(NOTIFICATIONS.TO_PHONE, n.getToPhone())
                    .set(NOTIFICATIONS.BODY, n.getBody())
                    .set(NOTIFICATIONS.PAYLOAD, n.getPayload())
                    .execute();
            default -> throw new ConflictException("발송 대기·발송 중인 알림은 재발송할 수 없습니다.");
        }
        audit.record(actorId, "resend", "notifications", id, Map.of("status", n.getStatus()), null);
    }
}
