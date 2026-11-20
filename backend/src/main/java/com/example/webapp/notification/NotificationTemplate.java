package com.example.webapp.notification;

/** 보낼 문장 종류. code 는 notifications.template_code 에 저장된다 (알림톡 템플릿 코드와 맞출 예정) */
public enum NotificationTemplate {
    APPOINTMENT_CONFIRMED("appointment_confirmed", "예약 확정"),
    APPOINTMENT_CHANGED("appointment_changed", "일정 변경"),
    APPOINTMENT_CANCELED("appointment_canceled", "일정 취소");

    public final String code;
    public final String label;

    NotificationTemplate(String code, String label) {
        this.code = code;
        this.label = label;
    }

    /**
     * 문장 만들기.
     * @param academy 학원 이름, @param phone 학원 연락처, @param who "김민준 학생", @param what "레벨테스트"/"상담", @param when "11/20(금) 16:30"
     */
    public String render(String academy, String phone, String who, String what, String when) {
        return switch (this) {
            case APPOINTMENT_CONFIRMED -> "[%s] %s %s 일정이 %s으로 예약되었습니다. 변경·문의 %s".formatted(academy, who, what, when, phone);
            case APPOINTMENT_CHANGED -> "[%s] %s %s 일정이 %s으로 변경되었습니다. 문의 %s".formatted(academy, who, what, when, phone);
            case APPOINTMENT_CANCELED -> "[%s] %s %s 일정(%s)이 취소되었습니다. 다시 예약하시려면 %s로 연락 주세요.".formatted(academy, who, what, when, phone);
        };
    }
}
