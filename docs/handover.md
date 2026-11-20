# 인수인계 문서

## 기술 스택

| 영역 | 스택 |
|---|---|
| 백엔드 | Spring Boot 3.5.7, Java 21, Maven |
| 프론트엔드 | React 19, TypeScript 5.9, Vite 7, Tailwind CSS 4, React Router 7, TanStack Query 5, Zustand 5, motion, recharts, lucide-react |
| 인프라 | Docker (ubuntu:26.04 기반), Docker Compose, GitLab CI (shell runner) |

## 개발 환경 실행

```bash
./run_docker.sh            # 개발 컨테이너 생성/진입 (프로젝트가 /kimlongdaechicken 에 마운트됨)
```

컨테이너가 켜질 때 개발 DB(PostgreSQL, `localhost:5432`, 계정 `aew`/`aew`, DB `aew`·`aew_test`)도 같이 켜진다 (`pg_local start|stop|reset|status`).
백엔드 빌드(`mvn compile` 등)는 Flyway 마이그레이션을 개발 DB 에 적용하고 jOOQ 클래스를 다시 만든다 (`docs/db-schema.md`).

컨테이너 안에서 터미널 2개를 쓴다. 두 번째 터미널은 호스트에서 `./run_docker.sh` 를 한 번 더 실행하면 같은 컨테이너에 들어간다.

```bash
# 터미널 1: 백엔드 (8080)
cd backend && mvn spring-boot:run

# 터미널 2: 프론트 (5173) — /api 요청은 8080 으로 프록시됨
cd frontend && npm install && npm run dev
```

프론트 명령어: `npm run dev` (개발 서버), `npm run build` (타입 검사 + `dist/` 생성), `npm run typecheck` (타입 검사만)

브라우저: `http://<서버IP>:5173`

## 폴더별 역할

### frontend/
| 경로 | 역할 |
|---|---|
| `assets/화면명세서.html`, `assets/스타일가이드.html` | 퍼블리싱 원본 문서 (배포 jar 에는 포함되지 않음) |
| `assets/design-system/{css,js,img,fonts}` | 공통 디자인 자산. 코드에서는 `@assets/...` 로 import |
| `src/App.tsx` | 스플래시, 로그인 상태 확인, TanStack Query·모션 설정 |
| `src/router/` | `index.tsx`(전체 라우트), `guards.tsx`(로그인·역할 가드), `navigation.ts`(역할별 사이드바 메뉴), `routes/`(admin·teacher·student·public 라우트) |
| `src/stores/` | Zustand. `authStore.ts`(로그인 사용자·login/logout) |
| `src/components/layout/` | `AppShell`(초록 프레임 + 페이지 전환), `Sidebar`(역할별 메뉴·로그아웃), `Topbar`, `PublicLayout`(로그인 없는 화면), `Splash` |
| `src/components/ui/` | 공용 UI (`Card`, `StatusPill`, `Badge`, `ProgressBar`, `Toggle`, `Avatar`) |
| `src/components/dashboard/` | 대시보드 카드. 데이터는 props 로만 받는다 |
| `src/views/{base,auth,public,admin,teacher,student,report}/` | 역할별 화면 컴포넌트. API 를 호출해 데이터를 컴포넌트에 넘긴다 |
| `src/api/` | 백엔드 API 호출. `client.ts` 의 `api.get/post/put/delete` 사용 |
| `src/mocks/` | 백엔드 연결 전 mock 데이터 |
| `src/types/` | API 응답과 맞춘 도메인 타입 |
| `src/utils/` | `role.ts`(역할 라벨·권한·첫 화면), motion variants, `cn`(className 결합), 날짜 포맷 |
| `src/index.css` | Tailwind `@theme` 디자인 토큰 (색 `brand`/`grape`/`navy`/`wait`/`alert`, `rounded-panel`, `shadow-card` 등) |

### backend/
| 경로 | 역할 |
|---|---|
| `controller/` | REST API (`/api/**`). `admin/` 대표·실장용 |
| `service/`, `repository/`, `dto/` | 업무 로직 / jOOQ 쿼리 / 요청·응답 (OpenAPI 명세의 원천) |
| `security/` | `SecurityConfig`(세션 로그인·CSRF·경로별 역할), `AppUser`, `ProfileUserDetailsService`, `AuthController` |
| `seed/` | `DevDataSeeder`(개발 샘플 데이터), `OwnerBootstrap`(운영 첫 대표 계정) |
| `config/OpenApiConfig.java` | Swagger 명세 설정 (응답 필드 required 표시) |
| `config/SpaWebConfig.java` | SPA(React Router) 새로고침 대응 (없는 경로 → index.html) |
| `resources/application*.yml` | 기본 / `prod` 프로파일 설정 |
| `resources/db/migration/` | Flyway SQL. jOOQ 클래스(`com.example.webapp.jooq`)는 빌드 때 이 스키마에서 생성 (git 제외) |

### 루트
| 경로 | 역할 |
|---|---|
| `Dockerfile` | 멀티 스테이지: `--target dev` 개발 컨테이너, `--target runtime` 배포 이미지 (프론트+백엔드 → jar 하나, GitLab CI 가 사용) |
| `setting-script/` | 컨테이너 환경 설치 스크립트 |
| `run_docker.sh` / `build_docker.sh` | 개발 컨테이너 실행 / 배포 |
| `docs/` | 운영 문서 (이 문서, 배포 가이드, 브랜치 전략) |

## 자주 하는 작업

### 새 화면 추가 (예: 상담·테스트 접수)
메뉴와 라우트는 이미 `PlaceholderView` 로 연결되어 있다 (경로는 `docs/v1-plan.md` 화면 목록 기준).
1. `frontend/src/views/admin/InquiriesView.tsx` 생성 (상단은 `<Topbar title="상담·테스트 접수" />`)
2. `frontend/src/router/routes/admin.tsx` 에서 해당 경로의 `PlaceholderView` 를 새 화면으로 바꾼다
   ```tsx
   { path: 'inquiries', element: <InquiriesView /> },
   ```
3. 메뉴 이름/아이콘/배지/보이는 역할은 `frontend/src/router/navigation.ts` 의 `NAV_SECTIONS` 에서 관리한다.

### 역할과 화면 접근
- 역할: `owner`(대표) · `counselor`(상담실장) · `teacher`(강사) · `student`(학생). 대표는 학생 화면을 뺀 모든 화면에 들어갈 수 있다.
- `/admin/**` 대표·실장, `/t/**` 강사·대표, `/s/**` 학생, `/apply/**`·`/curriculum/**`·`/r/**` 로그인 없이.
- 화면 가드(`router/guards.tsx`)는 편의용이다. 실제 접근 제어는 백엔드 API 에서 한다.
- 로그인은 Spring Security 세션 로그인이다 (`backend/.../security/SecurityConfig.java`).
  - `POST /api/auth/login` (form: `loginId`, `password`), `POST /api/auth/logout`, `GET /api/auth/me`
  - CSRF: 서버가 `XSRF-TOKEN` 쿠키를 주고, 프런트(`api/client.ts`)가 GET 이 아닌 요청에 `X-XSRF-TOKEN` 헤더로 돌려보낸다
  - 로그인 중 API 가 401 이면(세션 만료 8시간) 자동으로 로그인 화면으로 간다
  - 학생은 학생 코드로 로그인한다 (대소문자 무시)

### 개발용 샘플 데이터
개발 DB 에 계정이 하나도 없으면 서버 시작 시 `DevDataSeeder` 가 넣는다 (prod 에서는 동작 안 함).
- 계정 (비밀번호 모두 `1234`): `owner`(대표), `counselor`(상담실장), `teacher`·`teacher2`·`teacher3`(강사), `S-0001`(학생 박학생)
- 반 6개(중1~3 A/B, 요일·시간), 학생 150명 (`app.seed.students` 로 조절, 동명이인 포함)
- 다시 만들기: 컨테이너에서 `pg_local reset` 후 백엔드 재시작

### API 타입 맞추기 (OpenAPI)
- 백엔드 실행 중 Swagger UI: `http://<서버>:8080/swagger-ui.html` (prod 에서는 꺼짐)
- 백엔드 DTO 를 바꾼 뒤 컨테이너에서 `cd frontend && npm run gen:api` → `src/api/schema.d.ts` 재생성 (git 에 올린다)
- 프런트 타입은 `types/*.ts` 에서 `components['schemas'][...]` 로 가져다 쓴다. 값이 없을 수 있는 필드는 DTO 에 `@Schema(types = {"string", "null"})`

### API 오류 응답
- 형식: `{"message": "...", "fieldErrors": {"필드": "이유"}}` (`controller/ApiExceptionHandler.java`)
- 400 입력 오류(Bean Validation), 404 없음(`NotFoundException`), 409 지금 상태에서 불가(`ConflictException`)
- 프런트는 `api/errors.ts` 의 `errorMessage()`, `fieldErrors()` 로 보여준다
- 상태를 바꾸는 작업은 `AuditService.record()` 로 감사 로그(`audit_logs`)를 남긴다

### 메인·강의 소개 (공개)
- `/` 메인 (임시): 터미널 느낌 화면, 버튼 3개(상담 신청·레벨테스트 신청·LMS), 키보드 1·2·3. LMS 는 로그인 전이면 `/login`, 로그인 상태면 역할별 첫 화면. 강의 소개(`/curriculum`)는 메인에서 링크하지 않음
- `/curriculum`, `/curriculum/{m1|m2|m3}`: 과정 소개. 반·요일·시간·회차 커리큘럼은 DB(`GET /api/public/courses`, 운영 중인 반만, 강사·학생 정보 없음)
- 학원 이름·소개 문구·연락처·과정 설명은 `frontend/src/config/academy.ts` 에서 바꾼다

### 접수 (2주차 2-1)
- 학부모용 신청서: `/apply/consult`, `/apply/level-test` (로그인 없음, `POST /api/public/inquiries`)
- 운영자: `/admin/inquiries` 목록(상태 탭·종류·검색), `/admin/inquiries/{id}` 상세(상태 처리, 상담 기록, 학생 등록·기존 학생 연결)
- 상태 변경 규칙은 `InquiryService.TRANSITIONS` 한 곳에 있다
- 화면의 시각은 기기 설정과 상관없이 한국 시각(`utils/format.ts` `ACADEMY_TIME_ZONE`)으로 표시한다

### 상담 달력 (2주차 2-2)
- `/admin/consult-calendar`: 월간·주간 보기(주소 `?view=&date=&counselor=`), 빈칸 클릭 → 그 날짜·시간으로 등록, 일정 클릭 → 완료·불참·취소·변경
- 접수 상세의 "일정 잡기": 희망 일정이 미리 채워지고, 저장하면 접수가 예약확정
- 접수 상태 자동 변경 (`AppointmentService`): 일정 등록 → 예약확정 / 일정 완료(남은 예약 없음) → 접수 완료 / 취소·불참(남은 예약 없음) → 연락완료
- 접수 상태와 달력이 어긋나지 않게 (`InquiryService.changeStatus`): 일정 없이 예약확정 불가(화면의 "예약확정" 버튼은 일정 잡기 창을 연다), 예약이 남아 있으면 접수만 완료·연락완료로 바꿀 수 없음, 접수 취소 시 남은 예약 일정도 취소
- 같은 담당자(대표·상담실장)의 예약 일정끼리 시간이 겹치면 저장되지 않는다 (바로 이어지는 시간은 가능). 일정은 최대 4시간
- 일정 창은 `components/appointment/` (등록·변경 `AppointmentFormDialog`, 상세 `AppointmentDetailDialog`), 공용 모달은 `components/ui/Dialog.tsx`
- 달력 날짜 계산은 `utils/seoulDate.ts` (한국 날짜 문자열 기준, 시각은 +09:00)

### 학생·반 관리 (2주차)
- `/admin/students`: 목록·검색 + "학생 등록" (접수 없이 온 학생. 상태는 상담중·테스트예정만, 재원은 반에 넣으면서 바뀜)
- `/admin/students/{id}`: 기본 정보 수정, 반 소속, 타임라인(학생 등록·접수·상담 기록·상담 일정·반 시작/종료·상태 변경, 최신 먼저), 상담 기록 쓰기
  - 타임라인은 `StudentRepository.timeline()` 에서 여러 테이블을 모아 만든다. 레벨테스트·진단서·숙제·리포트도 생기면 여기에 더한다
- `/admin/classes`: 반 목록 + 고른 반의 학생 (`?class=&all=1`). 대표는 반 만들기·수정, 상담실장은 조회만
- 권한: 반 구성 수정(`POST·PUT /api/admin/classes/**`)과 반 배정(`/api/admin/students/*/enrollments/**`)은 대표만 (`SecurityConfig`)
- 규칙 (`StudentService`, `ClassService`)
  - 반에 넣으면 학생은 재원 / 퇴원으로 바꾸면 지금 반 소속을 오늘 날짜로 종료 / 소속 종료만으로는 상태를 바꾸지 않음 (반 이동일 수 있음)
  - 정원이 차거나 운영 종료한 반에는 못 넣음. 학생이 있는 반은 운영 종료·정원 축소 불가
  - 수업 시간: 같은 반 안에서, 그리고 같은 강사의 다른 운영 중 반과 시간이 겹치면 저장 안 됨 (바로 이어지는 시간은 가능). 개인 시간표가 이 데이터에서 계산되기 때문
  - 레벨 코드는 대문자로 저장 (m1 → M1)

### 학부모 안내 문자 (가짜 발송)
- 상담 일정 등록(예약확정)·시간 변경·취소 때 안내를 `notifications` 에 쌓고(`NotificationService`), `NotificationWorker` 가 `app.notification.poll-ms`(개발 10초, 운영 60초)마다 발송
- 받는 번호: 접수 신청자 번호, 접수 없는 일정이면 학생의 학부모 번호. 같은 안내는 `dedupe_key` 로 한 번만
- 실패 시 30초·60초 뒤 재시도, 3회 실패하면 `failed`. 운영 화면 `/admin/notifications` 에서 재발송(실패 → 다시 대기, 성공 → 한 번 더)
- 발송기: `app.notification.sender=mock` (지금). 실제로 보내지 않고 기록만, 번호 끝 0000 은 실패를 흉내 낸다
- 솔라피 연결 시: `NotificationSender` 구현(`SolapiNotificationSender`)을 추가하고 `sender=solapi`. 테스트 기간에는 허용 번호(내 폰)만 보내도록 할 것
- 문구는 `notification/NotificationTemplate.java`, 학원 이름·번호는 `app.academy.name/phone` (환경변수 `ACADEMY_NAME`, `ACADEMY_PHONE`)

### mock → 실제 API 로 교체
`frontend/src/api/dashboard.ts` 의 각 함수 옆 주석에 대응하는 API 경로가 적혀 있다. 함수 본문만 바꾸면 페이지/컴포넌트는 수정하지 않아도 된다.
```ts
// 변경 전
export const getTrend = (): Promise<TrendSeries> => resolveMock(mock.trend)
// 변경 후
export const getTrend = () => api.get<TrendSeries>('/dashboard/trend')
```
응답 형식은 `src/types/dashboard.ts` 의 타입과 맞춘다. 모든 함수를 바꾸면 `mocks/` import 를 제거한다.

### 새 API 추가
1. 백엔드: `controller/` 에 `@RequestMapping("/api/...")` 컨트롤러 추가
2. 프론트: `src/types/<도메인>.ts` 에 응답 타입 정의 → `src/api/<도메인>.ts` 에서 `client.ts` 의 `api` 사용
   ```ts
   import { api } from './client'
   import type { User } from '@/types/user'
   export const getUsers = () => api.get<User[]>('/users')
   ```
   실패 시 `ApiError` (`status`, `body`) 가 던져진다.

### 색상/디자인 토큰 변경
`frontend/src/index.css` 의 `@theme` 블록에서 값만 바꾸면 `bg-brand`, `text-navy` 등을 쓰는 모든 곳에 반영된다. recharts 는 CSS 변수를 못 받으므로 차트 색은 `src/components/dashboard/chartTheme.ts` 도 같이 바꾼다.

## 남은 작업 / 알려진 이슈

- **계정 관리 화면 미구현**: 운영 서버 첫 대표 계정은 환경변수 `OWNER_LOGIN_ID` / `OWNER_PASSWORD`(8자 이상)로 만든다 (`OwnerBootstrap`). 나머지 계정은 계정·권한 화면(대표 전용)에서 만들 예정.
- **아직 placeholder 인 화면**: 시간표, 레벨테스트, 진단서, 리포트 등 3주차 이후 화면. 대시보드 홈 데이터는 아직 mock 이다.
- **프론트 테스트 미구성**: 빌드/타입 검사와 브라우저 수동 확인만 했다. Vitest + Testing Library 도입 권장.
- **도메인/HTTPS 미연결**: `docs/deployment.md` 의 "도메인 연결" 참고.
- **개발 컨테이너는 root 로 실행**: 컨테이너 안에서 만든 `node_modules`, `target` 이 호스트에서 root 소유가 될 수 있다. 권한 문제 시 `sudo chown -R $USER .` 로 정리.
- **CI 이미지 이중 빌드**: `build` 잡과 `deploy` 잡(`build_docker.sh`) 모두 `docker build` 를 실행한다. 같은 러너면 캐시로 빠르게 끝나지만, 필요하면 `deploy` 잡이 빌드된 이미지만 실행하도록 정리할 수 있다.
