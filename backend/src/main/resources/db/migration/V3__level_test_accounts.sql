-- 레벨테스트 전용 계정 (학생 정식 계정과 별도, 사용 기한이 지나면 로그인 불가)
--   test_taker      : 레벨테스트 응시만 할 수 있는 역할. 자기 응시 하나만 본다
--   expires_at      : 사용 기한 (null = 기한 없음). 지나면 로그인·요청이 막힌다. 행은 지우지 않는다 (응답·감사 로그가 참조)
--   attempts.taker_id : 이 응시를 위해 만든 레벨테스트 계정
--   app_settings    : 운영 설정 (대표·상담실장이 화면에서 바꾸는 값)
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'test_taker';

ALTER TABLE profiles ADD COLUMN expires_at timestamptz;

ALTER TABLE attempts ADD COLUMN taker_id uuid REFERENCES profiles (id);
CREATE UNIQUE INDEX attempts_taker_uidx ON attempts (taker_id) WHERE taker_id IS NOT NULL;

CREATE TABLE app_settings (
    key         text PRIMARY KEY,
    value       text        NOT NULL,
    updated_by  uuid REFERENCES profiles (id),
    updated_at  timestamptz NOT NULL DEFAULT now()
);
-- 레벨테스트 계정 사용 시간 (분, 발급 시각부터)
INSERT INTO app_settings (key, value) VALUES ('level_test_account_minutes', '30');
