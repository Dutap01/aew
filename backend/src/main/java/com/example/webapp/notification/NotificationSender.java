package com.example.webapp.notification;

/**
 * 문자·알림톡 발송기. 설정 app.notification.sender 로 고른다.
 *   mock   : 실제로 보내지 않고 성공/실패만 기록 (개발·테스트)
 *   solapi : 솔라피 (계정 준비 후 추가)
 */
public interface NotificationSender {

    /** 보낸 결과. 실패해도 예외 대신 ok=false 와 이유를 돌려준다 */
    record Result(boolean ok, String providerMessageId, String error) {
        public static Result success(String id) {
            return new Result(true, id, null);
        }

        public static Result failure(String error) {
            return new Result(false, null, error);
        }
    }

    String name();

    Result send(String toPhone, String body);
}
