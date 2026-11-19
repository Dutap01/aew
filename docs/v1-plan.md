# 학원 LMS V1 개발 계획서

> 원문: claude.ai 채팅에서 작성한 계획서 (2026-11-19 이 저장소로 옮김. 원문 마지막 리스크 표는 "1인 개발 지연" 행에서 잘려 있었음)
>
> **이 저장소에서 계획서와 다르게 정한 것 (2026-11-19)**
> - 화면: shadcn/ui 를 쓰지 않고 기존 자체 디자인(Tailwind 토큰 + `components/ui`)을 넓혀 쓴다.
> - Dockerfile 배포 타깃 이름은 계획서의 `release` 대신 기존 `runtime` 을 쓴다.

V1의 목표는 상담 접수부터 학부모 리포트 발송까지를 하나의 DB 위에서 끊김 없이 돌리는 것이다. 1인 개발로 **2026-12-31 완료**를 맞추려면 직접 만드는 부분을 최소화해야 한다.

## 1인 개발 원칙

1. **검증된 도구 우선**: 인증은 Spring Security, 스키마는 Flyway, 쿼리 코드는 jOOQ 코드 생성에 맡기고, 서버는 Docker 컨테이너 하나로 운영한다.
2. **판단은 코드, 문장은 AI**: 채점, 진단 수치, 권장 반은 룰 코드로 계산한다. AI는 설명 문구와 피드백 초안만 쓴다.
3. **AI 결과는 항상 초안**: 사람이 확인하고 승인해야 확정되며, 이 과정을 상태값으로 관리한다.
4. **데이터는 덮어쓰지 않고 쌓기**: 다시 생성하면 새 버전으로 저장하고, 이전 결과는 이력으로 남긴다.
5. **디자인 작업 없음**: 공용 컴포넌트를 조합해 화면을 만든다.

## 범위

| 영역 | V1에 포함 | V1에서 제외 (V2 이후) |
|---|---|---|
| 접수 | 상담·레벨테스트 신청, 희망 일정 접수, 처리 상태 관리, 커리큘럼 안내 템플릿 | 실시간 예약 가능 시간 관리 |
| 테스트·진단 | 온라인 응시, 자동채점, 진단서(웹 열람·인쇄), 권장 반 표시와 대표 확정 | 새 진단 알고리즘 |
| 수업·숙제 | 출석부(회차 커리큘럼 반영), 보충 숙제 연결·배포·회수, 오답 피드백 검수, 강사 대시보드 | 기존 숙제 플랫폼 데이터 이관 |
| 리포트 | 주 2회 생성 일정, 승인 절차, 알림톡 발송·재발송, 링크 열람 | 학부모 전용 앱 |
| 연동 | 파이프라인 연동 API, 처리 이력, 실패 시 재처리 | 파이프라인 서버 이전·API화 (별도 견적) |
| 운영 | 역할별 권한, 학생·반 기본 데이터 엑셀 이관 | 수강료 수납·결제 |

## 기술 스택

Spring Boot + jOOQ + PostgreSQL. 프런트는 React(Vite)로 따로 만들고 백엔드는 REST API만 제공한다.

| 영역 | 선택 | 이유 |
|---|---|---|
| 프레임워크 | Spring Boot 3 (Java 21) | 보안·스케줄링·검증이 한 생태계, springdoc 으로 OpenAPI 자동 생성 |
| DB | PostgreSQL 16 | jsonb 로 AI 입출력·리포트 스냅샷 저장, enum 으로 상태값 강제 |
| 쿼리 | jOOQ (DB 스키마에서 코드 생성) | 스키마가 바뀌면 컴파일 에러로 바로 드러남 |
| 마이그레이션 | Flyway | 스키마 변경 이력을 SQL 로 관리, jOOQ 코드 생성의 입력 |
| 인증·권한 | Spring Security (세션 로그인) | 대표·상담실장·강사·학생 역할을 URL·메서드 단위로 검사 |
| 화면 | React + Vite + TypeScript, TanStack Query, React Router, Zustand | 서버 데이터 캐시는 TanStack Query. API 타입은 openapi-typescript 로 생성 |
| 예약 작업 | Spring @Scheduled + ShedLock | 주 2회 리포트 생성, AI 작업·발송 재시도 |
| 작업 큐 | DB 테이블 `ai_jobs`, `notifications` (FOR UPDATE SKIP LOCKED) | 큐 서버 없이 상태·재시도·오류를 한 곳에서 추적 |
| 입력 검증 | Bean Validation + Jackson | 폼 입력과 AI 응답 JSON 을 같은 방식으로 검증 |
| AI | 발주처 파이프라인 HTTP 호출 (Spring RestClient) | 어댑터 인터페이스 뒤에 둠 |
| 알림톡 | 솔라피(Solapi) Java SDK | 실패 시 SMS 대체 발송, 발송 결과 조회 |
| 출력 | 브라우저 인쇄 CSS (`@media print`) | PDF 라이브러리 없이 진단서·리포트 출력 |
| 테스트 | JUnit 5 + Testcontainers(PostgreSQL) | 실제 DB 로 채점·권한·재처리 테스트 |
| 배포 | Dockerfile 하나(멀티 스테이지) + docker-compose, GitLab CI | DB 는 매일 pg_dump 백업 |
| 모니터링 | Spring Actuator + Sentry | |

프런트와 백엔드는 한 저장소, 빌드한 React 정적 파일을 Spring Boot 가 함께 서빙한다. 같은 도메인이라 세션 쿠키 + CSRF 를 그대로 쓰고 CORS 설정이 필요 없다. 백엔드 DTO 가 바뀌면 `npm run gen:api` 로 프런트 타입을 맞춘다.

## 시스템 아키텍처 — AI 작업 처리 순서

앱 하나 + DB 하나. 화면과 서비스는 DB 에 작업만 등록하고, 파이프라인·알림톡 호출은 워커가 한다.

1. 응시 제출, 숙제 마감, 리포트 일정 도래 같은 이벤트가 생기면 서비스가 같은 트랜잭션 안에서 `ai_jobs` 에 `queued` 행을 추가한다. `idempotency_key` 로 중복 등록을 막는다.
2. 워커가 1분마다 `SELECT … FOR UPDATE SKIP LOCKED` 로 queued 작업을 가져와 `running` 으로 바꾼다.
3. 입력 빌더가 student_id 기준의 비식별 JSON 을 만들고 파이프라인을 호출한다.
4. 응답 원본을 `ai_results` 에 저장한다. 검증을 통과하면 진단·피드백·숙제·리포트 테이블에 `draft` 로 넣고 작업을 `succeeded` 로 바꾼다.
5. 실패하면 attempts 를 올리고 간격을 늘려 재시도. 3회 실패하면 `dead`, 운영자 화면의 재처리 버튼으로 다시 넣는다.
6. 사람이 draft 를 승인하면 확정. 리포트가 승인되면 `notifications` 에 발송 작업이 추가되고 워커가 솔라피를 호출해 결과를 저장한다.

## DB 설계

모든 데이터는 `students.id` 하나에 매달리고, AI 가 만든 모든 결과는 `ai_job_id` 로 출처를 거슬러 올라갈 수 있어야 한다.

| 영역 | 테이블 | 핵심 컬럼 |
|---|---|---|
| 사람 | profiles | id, login_id, password_hash, role(owner·counselor·teacher·student), name |
| 사람 | students | id, student_code(S-0001), name, school, grade, parent_phone, status(상담중·테스트예정·재원·휴원·퇴원), profile_id |
| 반 | classes, class_schedules, enrollments | 반 이름·레벨·담당 강사 / 요일·시간 / 학생-반 소속(시작일·종료일) |
| 접수 | inquiries, consult_notes | type(상담·레벨테스트), 신청 정보, preferred_slots, status(접수·연락완료·예약확정·완료·취소), student_id |
| 수업 | curriculum_items, sessions, attendance | 회차별 진도 / 반·날짜·회차 번호·커리큘럼 항목 / 학생별 출결 |
| 문항 | items | item_code, 유형, 영역 태그, 정답, version |
| 테스트 | tests, test_items, attempts, responses | kind(level·daily) / 응시 1회 / 문항별 답·정오·점수 |
| 진단 | diagnoses | student_id, attempt_id, rule_version, scores, weak_areas, recommended_class_id, narrative, status(draft·approved), approved_by, ai_job_id |
| 숙제 | homework_sets, homework_assignments, homework_submissions | source(파이프라인·수동), 문항 목록 / 학생별 배포·마감·상태 / 문항별 답 |
| 피드백 | feedbacks | 대상 응답, draft_text, final_text, status, reviewed_by, ai_job_id |
| 리포트 | report_schedules, reports, report_links | 학생별 요일 / 기간·data_snapshot·초안·확정본·status·version / 열람 토큰·만료일 |
| 발송 | notifications | report_id, template_code, to_phone, status, provider_msg_id, error, attempts, sent_at |
| AI | ai_jobs | job_type, pipeline, pipeline_version, prompt_version, student_id, subject_id, idempotency_key(unique), input, status, attempts, error |
| AI | ai_results | job_id, raw_output, parsed_ok, target_table, target_id |
| 설정 | rule_sets, prompt_templates | name, version, content, is_active |
| 감사 | audit_logs | 누가, 언제, 어떤 레코드를, 어떻게 바꿨는지 |

### 식별자와 데이터 규칙
- 모든 PK 는 uuid. 사람이 보는 코드(S-0001, 문항 코드)는 별도 컬럼.
- AI 로 보내는 입력은 `buildPipelineInput()` 한 함수에서만 만든다. student_id, 학년, 레벨, 응답만 담고 이름·연락처·학교는 넣지 않는다.
- `idempotency_key = job_type + 대상 id + 입력 버전`. 같은 요청을 두 번 누르면 기존 작업을 돌려준다.
- AI 응답은 먼저 `ai_results` 에 원본 저장, Bean Validation 통과한 것만 진단·피드백·리포트 테이블로 옮긴다.
- 리포트는 생성 시점의 출결·성취도·숙제를 `data_snapshot` 으로 고정한다.
- 재생성은 덮어쓰기가 아니라 version+1 새 행. 이전 행은 `superseded`.
- 상태값은 모두 Postgres enum.

## 역할·권한

운영자 3종(대표·상담실장·강사) + 학생. 학부모는 계정 없이 알림톡 링크 토큰으로만 리포트를 본다.

| 기능 | 대표 | 상담실장 | 강사 | 학생 | 학부모(링크) |
|---|---|---|---|---|---|
| 접수 관리·상담 기록 | 수정 | 수정 | - | - | - |
| 학생 정보(연락처 포함) | 수정 | 수정 | 담당 반만 조회, 연락처 제외 | 본인만 | - |
| 반·수업 요일 구성 | 수정 | 조회 | 담당 반 조회 | - | - |
| 계정·권한 관리 | 수정 | - | - | - | - |
| 레벨테스트 결과·진단서 | 승인 | 조회·출력 | 담당 반 조회 | - | - |
| 반 배정 확정 | 확정 | 조회 | - | - | - |
| 출석부 | 조회 | 조회 | 담당 반 입력 | - | - |
| 숙제 배포·회수 | 조회 | - | 담당 반 수정 | 본인 숙제 제출 | - |
| 오답 피드백 검수 | 조회 | - | 담당 반 수정·제공 | 본인 것 열람 | - |
| 리포트 초안 수정·승인·발송 | 승인 | 수정·발송 | 초안 조회 | - | - |
| 리포트 열람 | 전체 | 전체 | 담당 반 | - | 자녀 것만 |
| AI 처리 이력·재처리, 룰·프롬프트 관리 | 수정 | 조회 | - | - | - |

### 구현 방식
- API 경로 단위(모두 `/api` 아래): `/admin/**` 는 OWNER·COUNSELOR, `/t/**` 는 TEACHER·OWNER, `/s/**` 는 STUDENT 로 SecurityFilterChain 에서 막는다. React 라우터에서 숨기는 것은 편의용이고 실제 보호는 항상 API 에서.
- 행 단위: "담당 반만", "본인만"은 서비스 계층에서 검사. jOOQ 조건을 `AccessScope.forCurrentUser()` 하나에서 만든다.
- 학생 로그인: 학생 코드(S-0001) + 비밀번호. 초기 비밀번호는 운영자가 발급.
- 학부모 링크: `/r/{token}` 토큰은 32바이트 난수, 리포트 1건에만 유효, 만료일 있음.
- 권한 테스트: 역할별로 "보면 안 되는 데이터를 요청하면 403" 통합 테스트를 먼저 작성.

## 화면 목록 (28개)

P0 = 전체 흐름 필수, P1 = 일정이 밀리면 단순화.

| 경로 | 화면 | 사용자 | 우선순위 |
|---|---|---|---|
| /apply/consult | 상담 신청 (모바일) | 외부 | P0 |
| /apply/level-test | 레벨테스트 신청 (모바일) | 외부 | P0 |
| /curriculum/{slug} | 커리큘럼 안내 공통 템플릿 | 외부 | P1 |
| /login | 로그인 (운영자·학생 공용) | 전체 | P0 |
| /s/test/{attemptId} | 레벨테스트 응시 | 학생 | P0 |
| /s/homework | 내 숙제 목록 | 학생 | P0 |
| /s/homework/{id} | 숙제 풀기·제출, 피드백 확인 | 학생 | P0 |
| /r/{token} | 학부모 리포트 열람 | 학부모 | P0 |
| /admin/inquiries | 접수 목록·상태 처리 | 대표·실장 | P0 |
| /admin/inquiries/{id} | 접수 상세, 상담 기록, 학생 생성·응시 발급 | 대표·실장 | P0 |
| /admin/students | 학생 목록·검색 | 대표·실장 | P0 |
| /admin/students/{id} | 학생 타임라인 (접수~리포트 전체 이력) | 대표·실장 | P0 |
| /admin/classes | 반·요일·담당 강사·커리큘럼 구성 | 대표 | P0 |
| /admin/level-tests | 응시 결과·채점 목록 | 대표·실장 | P0 |
| /admin/diagnoses/{id} | 진단서 확인·수정·승인, 인쇄 | 대표·실장 | P0 |
| /admin/placement | 권장 반 표시·대표 확정 | 대표 | P0 |
| /admin/reports | 리포트 승인 대기열 | 대표·실장 | P0 |
| /admin/reports/{id} | 리포트 초안 수정·승인·발송 | 대표·실장 | P0 |
| /admin/report-schedules | 학생별 주 2회 생성 요일 설정 | 대표·실장 | P1 |
| /admin/notifications | 발송 성공·실패 이력, 재발송 | 대표·실장 | P0 |
| /admin/ai-jobs | AI 처리 이력·오류·재처리 | 대표 | P0 |
| /admin/settings/users | 계정·역할 관리 | 대표 | P0 |
| /admin/settings/rules | 룰·프롬프트·템플릿 버전 관리 | 대표 | P1 |
| /t/attendance/{classId} | 출석부 (회차 커리큘럼 표시) | 강사 | P0 |
| /t/homework | 보충 숙제 확인·배포 | 강사 | P0 |
| /t/homework/{setId} | 제출·미제출·완료 현황 | 강사 | P0 |
| /t/feedback | 오답 피드백 초안 검수 대기열 | 강사 | P0 |
| /t/dashboard | 학생별·반별 결과·취약 영역 | 강사 | P1 |

대표는 모든 화면에 접근한다. 운영자가 가장 자주 여는 화면은 **학생 타임라인**이므로 한 학생의 모든 데이터가 시간순으로 보여야 한다.

## 핵심 흐름 (상태값)

학생 1명은 12단계를 거치며 그중 4곳에서 사람이 승인해야 다음 단계로 넘어간다.

| 대상 | 상태 흐름 |
|---|---|
| 접수 | 접수 → 연락완료 → 예약확정 → 완료 (또는 취소) |
| 학생 | 상담중 → 테스트예정 → 재원 → 휴원·퇴원 |
| 진단서 | draft → approved (재생성 시 이전 버전은 superseded) |
| 숙제 배정 | 배포 → 제출 → 완료 (마감이 지나면 미제출로 표시) |
| 오답 피드백 | draft → reviewed → delivered |
| 리포트 | draft → in_review → approved → sent (또는 failed) |
| 알림톡 | queued → sending → succeeded (또는 failed → 재발송 시 queued) |
| AI 작업 | queued → running → succeeded (또는 failed → 3회 실패 시 dead) |

## 폴더 구조

```
aew/
├── Dockerfile                  # 멀티 스테이지 (target: dev / runtime)
├── docker-compose.yml          # [배포] app + PostgreSQL
├── run_docker.sh / build_docker.sh / .gitlab-ci.yml
├── setting-script/
├── docs/                       # deployment, branch-strategy, handover, requirements, db-schema, operation-manual
├── backend/
│   ├── pom.xml                 # jOOQ 코드 생성, Flyway, springdoc
│   └── src/main/
│       ├── resources/db/migration/   # V1__init.sql, V2__homework.sql ...
│       └── java/com/example/webapp/
│           ├── controller/     # REST API (/api/**) — public, student, admin, teacher, report
│           ├── service/        # 업무 로직, 트랜잭션, 권한 범위(AccessScope)
│           ├── repository/     # jOOQ DSLContext 쿼리
│           ├── dto/            # 요청·응답 (OpenAPI 명세의 원천)
│           ├── rule/           # ScoringRule, DiagnosisRule, PlacementRule
│           ├── worker/         # AiJobWorker, NotificationWorker (@Scheduled)
│           ├── client/         # PipelineClient(+Mock), SolapiSender
│           ├── security/       # SecurityConfig, 로그인, 리포트 토큰
│           └── config/         # SpaWebConfig, JooqConfig
└── frontend/
    ├── assets/                 # 화면명세서.html, 스타일가이드.html, design-system/
    └── src/
        ├── api/                # openapi-typescript 생성 타입, client.ts
        ├── components/common/  # 공용 컴포넌트 (표, 상태 배지, 승인 버튼)
        ├── views/{base,auth,public,admin,teacher,student,report}/
        ├── router/             # index.tsx, guards.tsx, routes/
        ├── stores/             # Zustand (AuthStore, LogStore)
        └── utils/              # LogUtils, RoleUtils
```

jOOQ 코드는 Maven 빌드 때 생성하고 git 에 올리지 않는다. API 명세는 springdoc Swagger UI.

## 6주 개발 일정

11-17 착수, 6주 개발, 12-29~31 교육·오픈. 일정이 밀리면 P1 화면부터 단순 목록으로 줄인다.
일정을 좌우하는 발주처 선행 조건: **12-01 까지 파이프라인 JSON 규격, 12-10 까지 알림톡 템플릿 승인**.

| 주차 | 만들 것 | 끝났다는 기준 |
|---|---|---|
| 1주 (11-17) | Spring·React 세팅, 공통 레이아웃·API 클라이언트, Flyway 전체 스키마, jOOQ 코드 생성, 로그인·역할, 배포 파이프라인 | 운영 서버에 로그인 화면이 뜨고 역할별 접근이 막힘 |
| 2주 (11-24) | 접수 화면·관리, 학생·반 관리, 레벨테스트 응시, 자동채점 룰 | 신청부터 채점 결과까지 한 번에 통과 |
| 3주 (12-01) | 진단서·인쇄, 반 배정, ai_jobs 워커, 파이프라인 어댑터(목 → 실제) | 진단서 초안이 AI 문구와 함께 생성되고 승인됨 |
| 4주 (12-08) | 출석부·회차 커리큘럼, 보충 숙제 연결·배포·회수, 오답 피드백 검수 | 학생이 숙제를 내고 강사가 피드백을 보냄 |
| 5주 (12-15) | 리포트 일정·스냅샷·승인, 알림톡 발송·재발송, 강사 대시보드 | 테스트 휴대폰으로 알림톡을 받고 링크가 열림 |
| 6주 (12-22) | 전체 흐름 검수, 권한 테스트, 엑셀 이관, 버그 수정, 매뉴얼·API 명세 | 완료 기준 체크리스트 통과 |
| 오픈 주 | 운영자 교육, 실제 운영 전환, 남은 버퍼 | 운영자가 혼자 리포트를 승인·발송함 |

### 발주처 선행 조건
- [ ] 카카오 비즈채널 개설, 솔라피 가입·발신프로필 등록, 리포트 알림톡 문구 (1주 안)
- [ ] 서버·도메인·AI API 계정과 결제 수단 (1주 안)
- [ ] 채점·진단·반 배정·숙제 배정 기준 문서와 입출력 예시 (1주 안)
- [ ] 레벨테스트 문항·정답, 커리큘럼·시간표 (2주 안)
- [ ] 파이프라인 입출력 JSON 규격과 호출 방법, 진단서·리포트 샘플 (12-01 까지)
- [ ] 비식별 테스트 데이터와 학생·반 엑셀 원본 (5주 안)

## 완료 기준

기능 개수보다 학생 1명이 처음부터 끝까지 끊김 없이 통과하는지가 기준이다.

- [ ] 테스트 학생 1명이 접수 → 응시 → 채점 → 진단서 → 반 배정 → 숙제 → 리포트 알림톡 수신까지 수작업 없이 통과
- [ ] 같은 응답이면 채점·진단 수치가 항상 같은 값 (룰 단위 테스트)
- [ ] 모든 AI 생성물에서 학생·입력·파이프라인 버전·프롬프트 버전을 역추적 가능
- [ ] AI 로 나가는 입력에 이름·연락처·학교가 없음 (테스트로 확인)
- [ ] 역할별로 허용되지 않은 데이터 요청이 차단됨
- [ ] 알림톡 실패 건이 이력에 남고 재발송 가능
- [ ] 재원생 약 100명 실제 데이터로 최소 1회 리포트 발송 리허설
- [ ] 운영 매뉴얼과 배포·설정 문서 전달, 운영자 교육 완료

## 리스크

| 리스크 | 조기 신호 | 대응 |
|---|---|---|
| 파이프라인 입출력 미확정 | 12-01 까지 JSON 규격 없음 | MockPipelineClient 로 먼저 개발, 규격이 나오면 어댑터만 교체 |
| 알림톡 템플릿 반려·지연 | 12-10 까지 승인 안 됨 | 1주차에 신청, 미승인 시 SMS 대체 발송으로 오픈 |
| 범위 추가 요청 | "이것도 되죠?" | V2 백로그에 기록, 변경은 서면으로만 |
| 기존 엑셀 데이터 품질 | 이름 중복, 반 이름 불일치 | V1 에서는 학생·반만 이관, 과거 이력은 V2 |
| AI 응답 형식 깨짐 | 파싱 실패 증가 | 검증 실패 시 failed, 3회 재시도 후 운영자 화면에서 수동 재처리 |
| 1인 개발 지연 | 5주차 시작 시점에 P0 미완 | P1 화면을 단순 목록으로 (원문 이후 잘림) |
