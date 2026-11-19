-- =====================================================================
-- V1 전체 스키마 (docs/v1-plan.md "DB 설계")
-- 규칙
--   * 모든 PK 는 uuid (gen_random_uuid). 사람이 보는 코드는 별도 컬럼 (student_code, item_code)
--   * 상태값은 모두 enum
--   * AI 생성물(진단·숙제·피드백·리포트)은 ai_job_id 로 출처를 추적
--   * 재생성은 덮어쓰지 않고 version+1 새 행, 이전 행은 superseded
--   * updated_at 은 애플리케이션에서 갱신
-- =====================================================================

-- ---------------------------------------------------------------------
-- enum
-- ---------------------------------------------------------------------
CREATE TYPE user_role           AS ENUM ('owner', 'counselor', 'teacher', 'student');
-- 상담중 · 테스트예정 · 재원 · 휴원 · 퇴원
CREATE TYPE student_status      AS ENUM ('consulting', 'test_scheduled', 'enrolled', 'paused', 'withdrawn');
-- 상담 · 레벨테스트
CREATE TYPE inquiry_type        AS ENUM ('consult', 'level_test');
-- 접수 · 연락완료 · 예약확정 · 완료 · 취소
CREATE TYPE inquiry_status      AS ENUM ('received', 'contacted', 'scheduled', 'completed', 'canceled');
-- 출석 · 지각 · 결석 · 공결
CREATE TYPE attendance_status   AS ENUM ('present', 'late', 'absent', 'excused');
-- 객관식 · 단답형 · 서술형
CREATE TYPE item_type           AS ENUM ('choice', 'short', 'essay');
CREATE TYPE test_kind           AS ENUM ('level', 'daily');
-- 발급 · 응시중 · 제출 · 채점완료
CREATE TYPE attempt_status      AS ENUM ('issued', 'in_progress', 'submitted', 'graded');
CREATE TYPE diagnosis_status    AS ENUM ('draft', 'approved', 'superseded');
CREATE TYPE homework_source     AS ENUM ('pipeline', 'manual');
-- 배포 · 제출 · 완료 (미제출은 마감일로 계산)
CREATE TYPE assignment_status   AS ENUM ('assigned', 'submitted', 'completed');
CREATE TYPE feedback_status     AS ENUM ('draft', 'reviewed', 'delivered', 'superseded');
CREATE TYPE report_status       AS ENUM ('draft', 'in_review', 'approved', 'sent', 'failed', 'superseded');
CREATE TYPE notification_status AS ENUM ('queued', 'sending', 'succeeded', 'failed');
CREATE TYPE ai_job_status       AS ENUM ('queued', 'running', 'succeeded', 'failed', 'dead');
-- 상담 달력: 예약 · 완료 · 취소 · 불참
CREATE TYPE appointment_status  AS ENUM ('scheduled', 'done', 'canceled', 'no_show');

-- ---------------------------------------------------------------------
-- 사람
-- ---------------------------------------------------------------------
CREATE TABLE profiles (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    login_id       text        NOT NULL UNIQUE,          -- 운영자: 아이디, 학생: 학생 코드(S-0001)
    password_hash  text        NOT NULL,
    role           user_role   NOT NULL,
    name           text        NOT NULL,
    phone          text,
    active         boolean     NOT NULL DEFAULT true,
    last_login_at  timestamptz,
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE SEQUENCE student_code_seq;

CREATE TABLE students (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_code  text NOT NULL UNIQUE
                  DEFAULT 'S-' || lpad(nextval('student_code_seq')::text, 4, '0'),
    name          text           NOT NULL,
    school        text,
    grade         text,                                  -- 예: 중2
    parent_name   text,
    parent_phone  text,
    status        student_status NOT NULL DEFAULT 'consulting',
    profile_id    uuid UNIQUE REFERENCES profiles (id),  -- 학생 로그인 계정 (발급 전에는 null)
    memo          text,
    created_at    timestamptz    NOT NULL DEFAULT now(),
    updated_at    timestamptz    NOT NULL DEFAULT now()
);
CREATE INDEX students_status_idx ON students (status);
CREATE INDEX students_name_idx ON students (name);

-- ---------------------------------------------------------------------
-- 반
-- ---------------------------------------------------------------------
CREATE TABLE classes (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name        text        NOT NULL UNIQUE,
    level       text        NOT NULL,                    -- curriculum_items.level 과 맞춘다
    teacher_id  uuid REFERENCES profiles (id),
    capacity    int CHECK (capacity > 0),
    active      boolean     NOT NULL DEFAULT true,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX classes_teacher_idx ON classes (teacher_id);

CREATE TABLE class_schedules (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id    uuid     NOT NULL REFERENCES classes (id) ON DELETE CASCADE,
    weekday     smallint NOT NULL CHECK (weekday BETWEEN 1 AND 7),   -- ISO: 1=월 … 7=일
    start_time  time     NOT NULL,
    end_time    time     NOT NULL CHECK (end_time > start_time),
    UNIQUE (class_id, weekday, start_time)
);

CREATE TABLE enrollments (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id  uuid NOT NULL REFERENCES students (id),
    class_id    uuid NOT NULL REFERENCES classes (id),
    start_date  date NOT NULL DEFAULT current_date,
    end_date    date CHECK (end_date IS NULL OR end_date >= start_date),
    created_by  uuid REFERENCES profiles (id),
    created_at  timestamptz NOT NULL DEFAULT now()
);
-- 같은 반에 현재 소속(종료일 없음)은 한 행만
CREATE UNIQUE INDEX enrollments_active_uidx ON enrollments (student_id, class_id) WHERE end_date IS NULL;
CREATE INDEX enrollments_class_idx ON enrollments (class_id);

-- ---------------------------------------------------------------------
-- 접수
-- ---------------------------------------------------------------------
CREATE TABLE inquiries (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    type             inquiry_type   NOT NULL,
    status           inquiry_status NOT NULL DEFAULT 'received',
    applicant_name   text           NOT NULL,            -- 신청자 (보통 학부모)
    applicant_phone  text           NOT NULL,
    student_name     text           NOT NULL,
    school           text,
    grade            text,
    preferred_slots  jsonb          NOT NULL DEFAULT '[]', -- [{"date":"2026-11-20","time":"16:00"}, ...]
    message          text,
    privacy_agreed   boolean        NOT NULL DEFAULT false,
    student_id       uuid REFERENCES students (id),      -- 학생 생성 후 연결
    assigned_to      uuid REFERENCES profiles (id),
    created_at       timestamptz    NOT NULL DEFAULT now(),
    updated_at       timestamptz    NOT NULL DEFAULT now()
);
CREATE INDEX inquiries_status_idx ON inquiries (status, created_at DESC);
CREATE INDEX inquiries_student_idx ON inquiries (student_id);

CREATE TABLE consult_notes (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    inquiry_id  uuid REFERENCES inquiries (id),
    student_id  uuid REFERENCES students (id),
    author_id   uuid NOT NULL REFERENCES profiles (id),
    content     text NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    CHECK (inquiry_id IS NOT NULL OR student_id IS NOT NULL)
);
CREATE INDEX consult_notes_inquiry_idx ON consult_notes (inquiry_id);
CREATE INDEX consult_notes_student_idx ON consult_notes (student_id);

-- 상담 달력 (상담·레벨테스트 일정). 접수 없는 재원생 상담도 넣을 수 있다
CREATE TABLE consult_appointments (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    kind          inquiry_type       NOT NULL,
    inquiry_id    uuid REFERENCES inquiries (id),
    student_id    uuid REFERENCES students (id),
    counselor_id  uuid REFERENCES profiles (id),        -- 담당 (대표·상담실장)
    title         text               NOT NULL,          -- 달력에 보일 제목 (예: 김민준 학부모 상담)
    starts_at     timestamptz        NOT NULL,
    ends_at       timestamptz        NOT NULL,
    status        appointment_status NOT NULL DEFAULT 'scheduled',
    memo          text,
    created_by    uuid REFERENCES profiles (id),
    created_at    timestamptz        NOT NULL DEFAULT now(),
    updated_at    timestamptz        NOT NULL DEFAULT now(),
    CHECK (ends_at > starts_at)
);
CREATE INDEX consult_appointments_range_idx ON consult_appointments (starts_at);
CREATE INDEX consult_appointments_inquiry_idx ON consult_appointments (inquiry_id);
CREATE INDEX consult_appointments_student_idx ON consult_appointments (student_id);

-- ---------------------------------------------------------------------
-- AI 작업 (진단·숙제·피드백·리포트가 참조하므로 먼저 만든다)
-- ---------------------------------------------------------------------
CREATE TABLE ai_jobs (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    job_type          text          NOT NULL,            -- diagnosis_narrative, homework, feedback, report ...
    pipeline          text          NOT NULL,
    pipeline_version  text,
    prompt_version    text,
    student_id        uuid REFERENCES students (id),
    subject_id        uuid,                              -- 대상 레코드 id (attempt, submission, report ...)
    idempotency_key   text          NOT NULL UNIQUE,     -- job_type + 대상 id + 입력 버전
    input             jsonb         NOT NULL,            -- 비식별 입력 (이름·연락처·학교 없음)
    status            ai_job_status NOT NULL DEFAULT 'queued',
    attempts          int           NOT NULL DEFAULT 0,
    next_run_at       timestamptz   NOT NULL DEFAULT now(),
    locked_at         timestamptz,
    error             text,
    created_at        timestamptz   NOT NULL DEFAULT now(),
    updated_at        timestamptz   NOT NULL DEFAULT now(),
    finished_at       timestamptz
);
-- 워커: WHERE status='queued' AND next_run_at <= now() ... FOR UPDATE SKIP LOCKED
CREATE INDEX ai_jobs_queue_idx ON ai_jobs (next_run_at) WHERE status = 'queued';
CREATE INDEX ai_jobs_student_idx ON ai_jobs (student_id);

CREATE TABLE ai_results (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id        uuid    NOT NULL REFERENCES ai_jobs (id),
    raw_output    text    NOT NULL,                      -- 파이프라인 응답 원본 (JSON 이 아닐 수도 있어 text)
    parsed_ok     boolean NOT NULL,
    target_table  text,
    target_id     uuid,
    created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ai_results_job_idx ON ai_results (job_id);

-- ---------------------------------------------------------------------
-- 수업
-- ---------------------------------------------------------------------
CREATE TABLE curriculum_items (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    level        text NOT NULL,
    seq          int  NOT NULL CHECK (seq > 0),          -- 회차
    title        text NOT NULL,
    description  text,
    UNIQUE (level, seq)
);

CREATE TABLE sessions (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id            uuid NOT NULL REFERENCES classes (id),
    session_date        date NOT NULL,
    session_no          int  NOT NULL CHECK (session_no > 0),
    curriculum_item_id  uuid REFERENCES curriculum_items (id),
    memo                text,
    created_at          timestamptz NOT NULL DEFAULT now(),
    UNIQUE (class_id, session_no)
);
CREATE INDEX sessions_class_date_idx ON sessions (class_id, session_date);

CREATE TABLE attendance (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id   uuid              NOT NULL REFERENCES sessions (id) ON DELETE CASCADE,
    student_id   uuid              NOT NULL REFERENCES students (id),
    status       attendance_status NOT NULL,
    note         text,
    recorded_by  uuid REFERENCES profiles (id),
    recorded_at  timestamptz       NOT NULL DEFAULT now(),
    UNIQUE (session_id, student_id)
);
CREATE INDEX attendance_student_idx ON attendance (student_id);

-- ---------------------------------------------------------------------
-- 문항 · 테스트
-- ---------------------------------------------------------------------
CREATE TABLE items (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    item_code   text      NOT NULL,
    version     int       NOT NULL DEFAULT 1,
    type        item_type NOT NULL,
    area        text      NOT NULL,                      -- 영역 (문법, 독해, 어휘 ...)
    tags        text[]    NOT NULL DEFAULT '{}',
    content     jsonb     NOT NULL,                      -- {"stem": "...", "choices": [...]}
    answer      jsonb     NOT NULL,
    points      numeric(5,2) NOT NULL DEFAULT 1,
    active      boolean   NOT NULL DEFAULT true,
    created_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE (item_code, version)
);

CREATE TABLE tests (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    kind        test_kind NOT NULL,
    title       text      NOT NULL,
    level       text,
    time_limit_minutes int CHECK (time_limit_minutes > 0),
    active      boolean   NOT NULL DEFAULT true,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE test_items (
    test_id  uuid NOT NULL REFERENCES tests (id) ON DELETE CASCADE,
    seq      int  NOT NULL CHECK (seq > 0),
    item_id  uuid NOT NULL REFERENCES items (id),
    PRIMARY KEY (test_id, seq),
    UNIQUE (test_id, item_id)
);

CREATE TABLE attempts (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id       uuid           NOT NULL REFERENCES tests (id),
    student_id    uuid           NOT NULL REFERENCES students (id),
    inquiry_id    uuid REFERENCES inquiries (id),        -- 레벨테스트 접수에서 발급한 경우
    status        attempt_status NOT NULL DEFAULT 'issued',
    issued_by     uuid REFERENCES profiles (id),
    started_at    timestamptz,
    submitted_at  timestamptz,
    graded_at     timestamptz,
    score         numeric(7,2),
    max_score     numeric(7,2),
    rule_version  text,                                  -- 채점 룰 버전
    created_at    timestamptz    NOT NULL DEFAULT now()
);
CREATE INDEX attempts_student_idx ON attempts (student_id);
CREATE INDEX attempts_status_idx ON attempts (status);

CREATE TABLE responses (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id   uuid NOT NULL REFERENCES attempts (id) ON DELETE CASCADE,
    item_id      uuid NOT NULL REFERENCES items (id),
    answer       jsonb,
    is_correct   boolean,
    score        numeric(5,2),
    answered_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE (attempt_id, item_id)
);

-- ---------------------------------------------------------------------
-- 진단 · 반 배정
-- ---------------------------------------------------------------------
CREATE TABLE diagnoses (
    id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id            uuid             NOT NULL REFERENCES students (id),
    attempt_id            uuid             NOT NULL REFERENCES attempts (id),
    version               int              NOT NULL DEFAULT 1,
    rule_version          text             NOT NULL,
    scores                jsonb            NOT NULL,     -- 영역별 점수
    weak_areas            jsonb            NOT NULL DEFAULT '[]',
    recommended_class_id  uuid REFERENCES classes (id),  -- 룰이 계산한 권장 반
    narrative             text,                          -- AI 설명 문구 (초안 → 수정)
    status                diagnosis_status NOT NULL DEFAULT 'draft',
    approved_by           uuid REFERENCES profiles (id),
    approved_at           timestamptz,
    placed_class_id       uuid REFERENCES classes (id),  -- 대표가 확정한 반
    placed_by             uuid REFERENCES profiles (id),
    placed_at             timestamptz,
    ai_job_id             uuid REFERENCES ai_jobs (id),
    created_at            timestamptz      NOT NULL DEFAULT now(),
    updated_at            timestamptz      NOT NULL DEFAULT now(),
    UNIQUE (attempt_id, version)
);
CREATE INDEX diagnoses_student_idx ON diagnoses (student_id);
CREATE INDEX diagnoses_status_idx ON diagnoses (status);

-- ---------------------------------------------------------------------
-- 숙제 · 피드백
-- ---------------------------------------------------------------------
CREATE TABLE homework_sets (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    source      homework_source NOT NULL,
    title       text            NOT NULL,
    class_id    uuid REFERENCES classes (id),
    session_id  uuid REFERENCES sessions (id),
    created_by  uuid REFERENCES profiles (id),
    ai_job_id   uuid REFERENCES ai_jobs (id),
    created_at  timestamptz     NOT NULL DEFAULT now()
);
CREATE INDEX homework_sets_class_idx ON homework_sets (class_id);

CREATE TABLE homework_set_items (
    set_id   uuid NOT NULL REFERENCES homework_sets (id) ON DELETE CASCADE,
    seq      int  NOT NULL CHECK (seq > 0),
    item_id  uuid NOT NULL REFERENCES items (id),
    PRIMARY KEY (set_id, seq),
    UNIQUE (set_id, item_id)
);

CREATE TABLE homework_assignments (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    set_id        uuid              NOT NULL REFERENCES homework_sets (id),
    student_id    uuid              NOT NULL REFERENCES students (id),
    status        assignment_status NOT NULL DEFAULT 'assigned',
    assigned_at   timestamptz       NOT NULL DEFAULT now(),
    due_at        timestamptz       NOT NULL,
    submitted_at  timestamptz,
    completed_at  timestamptz,
    UNIQUE (set_id, student_id)
);
CREATE INDEX homework_assignments_student_idx ON homework_assignments (student_id, due_at);

CREATE TABLE homework_submissions (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id  uuid NOT NULL REFERENCES homework_assignments (id) ON DELETE CASCADE,
    item_id        uuid NOT NULL REFERENCES items (id),
    answer         jsonb,
    is_correct     boolean,
    score          numeric(5,2),
    submitted_at   timestamptz NOT NULL DEFAULT now(),
    UNIQUE (assignment_id, item_id)
);

CREATE TABLE feedbacks (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id     uuid            NOT NULL REFERENCES students (id),
    submission_id  uuid REFERENCES homework_submissions (id),  -- 숙제 오답
    response_id    uuid REFERENCES responses (id),             -- 테스트 오답
    version        int             NOT NULL DEFAULT 1,
    draft_text     text,                                       -- AI 초안
    final_text     text,                                       -- 강사 확정본
    status         feedback_status NOT NULL DEFAULT 'draft',
    reviewed_by    uuid REFERENCES profiles (id),
    reviewed_at    timestamptz,
    delivered_at   timestamptz,
    ai_job_id      uuid REFERENCES ai_jobs (id),
    created_at     timestamptz     NOT NULL DEFAULT now(),
    updated_at     timestamptz     NOT NULL DEFAULT now(),
    CHECK (num_nonnulls(submission_id, response_id) = 1)
);
CREATE INDEX feedbacks_student_idx ON feedbacks (student_id);
CREATE INDEX feedbacks_status_idx ON feedbacks (status);

-- ---------------------------------------------------------------------
-- 리포트 · 발송
-- ---------------------------------------------------------------------
CREATE TABLE report_schedules (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id  uuid       NOT NULL UNIQUE REFERENCES students (id),
    weekdays    smallint[] NOT NULL,                     -- ISO 요일, 주 2회 예: {2,5}
    active      boolean    NOT NULL DEFAULT true,
    updated_by  uuid REFERENCES profiles (id),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    CHECK (cardinality(weekdays) BETWEEN 1 AND 7 AND weekdays <@ ARRAY[1,2,3,4,5,6,7]::smallint[])
);

CREATE TABLE reports (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id     uuid          NOT NULL REFERENCES students (id),
    period_start   date          NOT NULL,
    period_end     date          NOT NULL CHECK (period_end >= period_start),
    version        int           NOT NULL DEFAULT 1,
    data_snapshot  jsonb         NOT NULL,               -- 생성 시점 출결·성취도·숙제 (이후 원본이 바뀌어도 고정)
    draft_content  jsonb,                                -- AI 초안
    final_content  jsonb,                                -- 승인본
    status         report_status NOT NULL DEFAULT 'draft',
    approved_by    uuid REFERENCES profiles (id),
    approved_at    timestamptz,
    sent_at        timestamptz,
    ai_job_id      uuid REFERENCES ai_jobs (id),
    created_at     timestamptz   NOT NULL DEFAULT now(),
    updated_at     timestamptz   NOT NULL DEFAULT now(),
    UNIQUE (student_id, period_start, period_end, version)
);
CREATE INDEX reports_status_idx ON reports (status);

CREATE TABLE report_links (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id       uuid        NOT NULL REFERENCES reports (id),
    token           text        NOT NULL UNIQUE,         -- 32바이트 난수 (base64url)
    expires_at      timestamptz NOT NULL,
    revoked_at      timestamptz,
    view_count      int         NOT NULL DEFAULT 0,
    last_viewed_at  timestamptz,
    created_by      uuid REFERENCES profiles (id),
    created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX report_links_report_idx ON report_links (report_id);

CREATE TABLE notifications (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id        uuid REFERENCES reports (id),
    template_code    text                NOT NULL,
    to_phone         text                NOT NULL,
    payload          jsonb               NOT NULL DEFAULT '{}',
    status           notification_status NOT NULL DEFAULT 'queued',
    provider_msg_id  text,
    error            text,
    attempts         int                 NOT NULL DEFAULT 0,
    next_attempt_at  timestamptz         NOT NULL DEFAULT now(),
    sent_at          timestamptz,
    created_at       timestamptz         NOT NULL DEFAULT now(),
    updated_at       timestamptz         NOT NULL DEFAULT now()
);
CREATE INDEX notifications_queue_idx ON notifications (next_attempt_at) WHERE status = 'queued';
CREATE INDEX notifications_report_idx ON notifications (report_id);

-- ---------------------------------------------------------------------
-- 설정 (룰·프롬프트 버전 관리)
-- ---------------------------------------------------------------------
CREATE TABLE rule_sets (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name        text    NOT NULL,                        -- scoring, diagnosis, placement ...
    version     int     NOT NULL,
    content     jsonb   NOT NULL,
    is_active   boolean NOT NULL DEFAULT false,
    created_by  uuid REFERENCES profiles (id),
    created_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE (name, version)
);
CREATE UNIQUE INDEX rule_sets_active_uidx ON rule_sets (name) WHERE is_active;

CREATE TABLE prompt_templates (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name        text    NOT NULL,
    version     int     NOT NULL,
    content     text    NOT NULL,
    is_active   boolean NOT NULL DEFAULT false,
    created_by  uuid REFERENCES profiles (id),
    created_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE (name, version)
);
CREATE UNIQUE INDEX prompt_templates_active_uidx ON prompt_templates (name) WHERE is_active;

-- ---------------------------------------------------------------------
-- 학생 질문 메시지 (학생 ↔ 담당 강사 1:1, 실시간은 WebSocket)
-- ---------------------------------------------------------------------
CREATE TABLE chat_threads (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id       uuid NOT NULL REFERENCES students (id),
    teacher_id       uuid NOT NULL REFERENCES profiles (id),
    last_message_at  timestamptz,
    created_at       timestamptz NOT NULL DEFAULT now(),
    UNIQUE (student_id, teacher_id)
);
CREATE INDEX chat_threads_teacher_idx ON chat_threads (teacher_id, last_message_at DESC);

CREATE TABLE chat_messages (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id   uuid NOT NULL REFERENCES chat_threads (id),
    sender_id   uuid NOT NULL REFERENCES profiles (id),
    body        text NOT NULL CHECK (length(body) BETWEEN 1 AND 2000),
    created_at  timestamptz NOT NULL DEFAULT now(),
    deleted_at  timestamptz                               -- 삭제는 표시만 (기록 보존)
);
CREATE INDEX chat_messages_thread_idx ON chat_messages (thread_id, created_at);

-- 참여자별 마지막으로 읽은 시각 (읽음 표시, 안 읽은 수 계산)
CREATE TABLE chat_reads (
    thread_id     uuid NOT NULL REFERENCES chat_threads (id),
    profile_id    uuid NOT NULL REFERENCES profiles (id),
    last_read_at  timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (thread_id, profile_id)
);

-- ---------------------------------------------------------------------
-- 감사 로그
-- ---------------------------------------------------------------------
CREATE TABLE audit_logs (
    id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    actor_id    uuid REFERENCES profiles (id),
    action      text NOT NULL,                           -- create, update, approve, send ...
    table_name  text NOT NULL,
    record_id   uuid,
    before      jsonb,
    after       jsonb,
    ip          text,
    created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_logs_record_idx ON audit_logs (table_name, record_id);
CREATE INDEX audit_logs_created_idx ON audit_logs (created_at DESC);

-- ---------------------------------------------------------------------
-- ShedLock (여러 인스턴스에서 @Scheduled 중복 실행 방지)
-- ---------------------------------------------------------------------
CREATE TABLE shedlock (
    name        varchar(64)  PRIMARY KEY,
    lock_until  timestamptz  NOT NULL,
    locked_at   timestamptz  NOT NULL,
    locked_by   varchar(255) NOT NULL
);
