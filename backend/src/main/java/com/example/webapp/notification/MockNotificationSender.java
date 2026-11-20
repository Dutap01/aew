package com.example.webapp.notification;

import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * 가짜 발송기: 실제로 보내지 않고 로그만 남긴다.
 * 실패 흉내: 번호 끝 4자리가 0000 이면 실패를 돌려준다 (재시도·재발송 테스트용).
 */
@Component
@ConditionalOnProperty(name = "app.notification.sender", havingValue = "mock", matchIfMissing = true)
public class MockNotificationSender implements NotificationSender {

    private static final Logger log = LoggerFactory.getLogger(MockNotificationSender.class);

    @Override
    public String name() {
        return "mock";
    }

    @Override
    public Result send(String toPhone, String body) {
        if (toPhone.replaceAll("\\D", "").endsWith("0000")) {
            log.info("[가짜 발송 실패] {} : {}", toPhone, body);
            return Result.failure("가짜 발송 실패 (끝자리 0000 테스트 번호)");
        }
        log.info("[가짜 발송] {} : {}", toPhone, body);
        return Result.success("mock-" + UUID.randomUUID().toString().substring(0, 8));
    }
}
