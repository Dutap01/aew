package com.example.webapp.dto.notification;

/** 상태별 건수 + 지금 쓰는 발송기 (mock 이면 실제로 나가지 않음) */
public record NotificationCounts(long queued, long sending, long succeeded, long failed, String sender) {
}
