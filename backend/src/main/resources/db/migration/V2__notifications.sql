-- 알림 발송 (상담 일정 안내). V1 의 notifications 에 칸 추가
--   appointment_id : 어떤 상담 일정 안내인지 (리포트 안내는 report_id)
--   dedupe_key     : 같은 안내를 두 번 보내지 않게 (예: appt:{id}:confirmed:{시작시각})
--   body           : 실제로 보낼 문장 (발송 이력에서 그대로 확인)
ALTER TABLE notifications
    ADD COLUMN appointment_id uuid REFERENCES consult_appointments (id),
    ADD COLUMN dedupe_key     text UNIQUE,
    ADD COLUMN body           text NOT NULL DEFAULT '';

CREATE INDEX notifications_created_idx ON notifications (created_at DESC);
CREATE INDEX notifications_appointment_idx ON notifications (appointment_id);
