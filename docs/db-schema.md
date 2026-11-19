# DB 구조

PostgreSQL. 스키마의 원본은 `backend/src/main/resources/db/migration/` 의 Flyway SQL 이고, 이 문서는 그 요약이다.
컬럼별 설명은 SQL 파일의 주석을 본다.

## 원칙

- **모든 데이터는 `students.id` 에 매달린다.** 학생 타임라인은 `student_id` 로 모든 테이블을 모아 시간순으로 보여준다.
- **AI 생성물은 `ai_job_id` 로 출처를 추적한다.** `diagnoses`, `homework_sets`, `feedbacks`, `reports` → `ai_jobs`(입력·파이프라인·프롬프트 버전) → `ai_results`(응답 원본).
- **PK 는 uuid** (`gen_random_uuid()`). 사람이 보는 코드는 별도 컬럼: `students.student_code`(S-0001, 시퀀스로 자동), `items.item_code`.
- **상태값은 enum.** 오타나 임의 값이 들어갈 수 없다. jOOQ 가 Java enum 으로 생성한다 (`com.example.webapp.jooq.enums`).
- **덮어쓰지 않고 쌓는다.** 재생성은 `version + 1` 새 행, 이전 행은 `superseded`. 메시지는 `deleted_at` 표시만.
- **리포트는 스냅샷.** `reports.data_snapshot` 에 생성 시점 출결·성취도·숙제를 고정한다.

## 테이블

| 영역 | 테이블 | 설명 |
|---|---|---|
| 사람 | `profiles` | 로그인 계정 (대표·상담실장·강사·학생). 학생의 `login_id` 는 학생 코드 |
| | `students` | 학생. `profile_id` 로 학생 계정 연결 (발급 전 null) |
| 반 | `classes` | 반 이름·레벨·담당 강사 |
| | `class_schedules` | 반의 요일(ISO 1=월)·시간 → 개인 시간표의 원천 |
| | `enrollments` | 학생-반 소속 (시작일·종료일). 같은 반 현재 소속은 1행 |
| 접수 | `inquiries` | 상담·레벨테스트 신청 |
| | `consult_notes` | 상담 기록 |
| | `consult_appointments` | 상담 달력 일정 (접수 없는 재원생 상담 포함) |
| 수업 | `curriculum_items` | 레벨별 회차 진도 |
| | `sessions` | 반의 수업 회차 (날짜·회차 번호·진도) |
| | `attendance` | 회차별 학생 출결 |
| 문항·테스트 | `items` | 문항 (`item_code` + `version`) |
| | `tests`, `test_items` | 테스트와 문항 순서 |
| | `attempts`, `responses` | 응시 1회와 문항별 답·채점 |
| 진단 | `diagnoses` | 룰 점수·취약 영역·권장 반 + AI 설명. 대표 승인, 반 확정(`placed_class_id`) |
| 숙제 | `homework_sets`, `homework_set_items` | 숙제 묶음(파이프라인·수동)과 문항 |
| | `homework_assignments` | 학생별 배포·마감·상태 (미제출은 마감일로 계산) |
| | `homework_submissions` | 문항별 답 |
| 피드백 | `feedbacks` | 오답(숙제 또는 테스트 중 하나) 피드백 초안·확정본 |
| 리포트 | `report_schedules` | 학생별 생성 요일 (주 2회) |
| | `reports` | 기간별 리포트 (스냅샷·초안·승인본·버전) |
| | `report_links` | 학부모 열람 토큰 (32바이트, 만료일) |
| 발송 | `notifications` | 알림톡 발송 큐·결과 |
| AI | `ai_jobs` | AI 작업 큐 (`idempotency_key` 유일, `FOR UPDATE SKIP LOCKED`) |
| | `ai_results` | 파이프라인 응답 원본·파싱 결과 |
| 설정 | `rule_sets`, `prompt_templates` | 버전 관리, 이름당 활성 1개 |
| 메시지 | `chat_threads` | 학생 ↔ 강사 1:1 대화방 |
| | `chat_messages` | 메시지 (최대 2000자, 삭제는 표시만) |
| | `chat_reads` | 참여자별 마지막 읽은 시각 (읽음 표시·안 읽은 수) |
| 감사 | `audit_logs` | 누가·언제·어떤 레코드를·어떻게 바꿨는지 |
| 기타 | `shedlock` | 예약 작업 중복 실행 방지 (jOOQ 생성 제외) |

## 상태값 (enum)

| enum | 값 | 의미 |
|---|---|---|
| `user_role` | owner, counselor, teacher, student | 대표, 상담실장, 강사, 학생 |
| `student_status` | consulting, test_scheduled, enrolled, paused, withdrawn | 상담중, 테스트예정, 재원, 휴원, 퇴원 |
| `inquiry_type` | consult, level_test | 상담, 레벨테스트 |
| `inquiry_status` | received, contacted, scheduled, completed, canceled | 접수, 연락완료, 예약확정, 완료, 취소 |
| `appointment_status` | scheduled, done, canceled, no_show | 예약, 완료, 취소, 불참 |
| `attendance_status` | present, late, absent, excused | 출석, 지각, 결석, 공결 |
| `item_type` | choice, short, essay | 객관식, 단답형, 서술형 |
| `test_kind` | level, daily | 레벨테스트, 일일 테스트 |
| `attempt_status` | issued, in_progress, submitted, graded | 발급, 응시중, 제출, 채점완료 |
| `diagnosis_status` | draft, approved, superseded | 초안, 승인, 이전 버전 |
| `homework_source` | pipeline, manual | 파이프라인 생성, 강사 수동 |
| `assignment_status` | assigned, submitted, completed | 배포, 제출, 완료 |
| `feedback_status` | draft, reviewed, delivered, superseded | 초안, 검수, 제공, 이전 버전 |
| `report_status` | draft, in_review, approved, sent, failed, superseded | 초안, 검토중, 승인, 발송, 실패, 이전 버전 |
| `notification_status` | queued, sending, succeeded, failed | 대기, 발송중, 성공, 실패 |
| `ai_job_status` | queued, running, succeeded, failed, dead | 대기, 실행중, 성공, 실패, 3회 실패 |

## 스키마를 바꿀 때

1. **이미 배포된 마이그레이션 파일은 고치지 않는다.** 새 파일 `V2__설명.sql` 을 추가한다. (Flyway 가 체크섬으로 변경을 막는다)
2. 개발 컨테이너에서 `cd backend && mvn compile` → 개발 DB 에 적용 + jOOQ 클래스 재생성. 바뀐 컬럼을 쓰는 코드는 컴파일 에러로 드러난다.
3. 운영 배포 전까지 V1 을 고쳐야 한다면 컨테이너에서 `pg_local reset` 으로 개발·테스트 DB 를 비우고 다시 `mvn compile`.
4. 생성된 jOOQ 코드(`backend/target/generated-sources/jooq`)는 git 에 올리지 않는다. 빌드할 때마다 만든다.
