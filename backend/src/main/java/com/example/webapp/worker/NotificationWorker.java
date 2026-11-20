package com.example.webapp.worker;

import static com.example.webapp.jooq.Tables.NOTIFICATIONS;
import static org.jooq.impl.DSL.currentOffsetDateTime;
import static org.jooq.impl.DSL.select;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.UUID;

import org.jooq.DSLContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

import com.example.webapp.jooq.enums.NotificationStatus;
import com.example.webapp.notification.NotificationSender;

/**
 * 알림 발송 워커. app.notification.poll-ms 마다 대기 중인 알림을 가져와 발송기로 보낸다.
 *   1) 가져오기: queued(발송 시각 도래) + 5분 넘게 sending 에 멈춘 것 → sending, attempts+1  (FOR UPDATE SKIP LOCKED 라 서버가 여러 대여도 한 건은 한 번만)
 *   2) 보내기: 발송기 호출 (트랜잭션 밖)
 *   3) 기록: 성공 → succeeded / 실패 → 3회 미만이면 간격을 늘려 다시 queued, 3회째면 failed
 */
@Component
public class NotificationWorker {

    private static final Logger log = LoggerFactory.getLogger(NotificationWorker.class);
    public static final int MAX_ATTEMPTS = 3;
    static final int BATCH = 20;
    static final Duration RETRY_BASE = Duration.ofSeconds(30); // 30초, 60초 ...

    private final DSLContext dsl;
    private final NotificationSender sender;
    private final TransactionTemplate tx;
    private final boolean enabled;

    public NotificationWorker(DSLContext dsl, NotificationSender sender, TransactionTemplate tx,
            @Value("${app.notification.worker-enabled:true}") boolean enabled) {
        this.dsl = dsl;
        this.sender = sender;
        this.tx = tx;
        this.enabled = enabled;
    }

    /** 테스트에서는 꺼 두고(app.notification.worker-enabled=false) runOnce() 를 직접 부른다 */
    @Scheduled(fixedDelayString = "${app.notification.poll-ms:10000}", initialDelay = 5000)
    public void scheduled() {
        if (!enabled) return;
        try {
            runOnce();
        } catch (RuntimeException e) {
            log.error("알림 워커 오류", e);
        }
    }

    /** 한 번 돌기. 처리한 건수 (테스트에서 직접 호출) */
    public int runOnce() {
        var claimed = tx.execute(status -> {
            OffsetDateTime stuck = OffsetDateTime.now().minusMinutes(5);
            var ids = select(NOTIFICATIONS.ID).from(NOTIFICATIONS)
                    .where(NOTIFICATIONS.STATUS.eq(NotificationStatus.queued).and(NOTIFICATIONS.NEXT_ATTEMPT_AT.le(currentOffsetDateTime()))
                            .or(NOTIFICATIONS.STATUS.eq(NotificationStatus.sending).and(NOTIFICATIONS.UPDATED_AT.lt(stuck))))
                    .orderBy(NOTIFICATIONS.NEXT_ATTEMPT_AT)
                    .limit(BATCH)
                    .forUpdate().skipLocked();
            return dsl.update(NOTIFICATIONS)
                    .set(NOTIFICATIONS.STATUS, NotificationStatus.sending)
                    .set(NOTIFICATIONS.ATTEMPTS, NOTIFICATIONS.ATTEMPTS.plus(1))
                    .set(NOTIFICATIONS.UPDATED_AT, currentOffsetDateTime())
                    .where(NOTIFICATIONS.ID.in(ids))
                    .returning(NOTIFICATIONS.ID, NOTIFICATIONS.TO_PHONE, NOTIFICATIONS.BODY, NOTIFICATIONS.ATTEMPTS)
                    .fetch();
        });
        if (claimed == null) return 0;
        for (var n : claimed) {
            NotificationSender.Result result;
            try {
                result = sender.send(n.getToPhone(), n.getBody());
            } catch (RuntimeException e) {
                result = NotificationSender.Result.failure("발송기 오류: " + e.getMessage());
            }
            record(n.getId(), n.getAttempts(), result);
        }
        return claimed.size();
    }

    private void record(UUID id, int attempts, NotificationSender.Result result) {
        OffsetDateTime now = OffsetDateTime.now();
        if (result.ok()) {
            dsl.update(NOTIFICATIONS)
                    .set(NOTIFICATIONS.STATUS, NotificationStatus.succeeded)
                    .set(NOTIFICATIONS.PROVIDER_MSG_ID, result.providerMessageId())
                    .set(NOTIFICATIONS.ERROR, (String) null)
                    .set(NOTIFICATIONS.SENT_AT, now)
                    .set(NOTIFICATIONS.UPDATED_AT, now)
                    .where(NOTIFICATIONS.ID.eq(id)).execute();
            return;
        }
        boolean giveUp = attempts >= MAX_ATTEMPTS;
        dsl.update(NOTIFICATIONS)
                .set(NOTIFICATIONS.STATUS, giveUp ? NotificationStatus.failed : NotificationStatus.queued)
                .set(NOTIFICATIONS.ERROR, result.error())
                .set(NOTIFICATIONS.NEXT_ATTEMPT_AT, now.plus(RETRY_BASE.multipliedBy(1L << (attempts - 1))))
                .set(NOTIFICATIONS.UPDATED_AT, now)
                .where(NOTIFICATIONS.ID.eq(id)).execute();
        log.info("알림 발송 실패 ({}회째{}): {}", attempts, giveUp ? ", 중단" : ", 재시도 예정", result.error());
    }
}
