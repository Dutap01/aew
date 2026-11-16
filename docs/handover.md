# 인수인계 문서

## 기술 스택

| 영역 | 스택 |
|---|---|
| 백엔드 | Spring Boot 3.5.7, Java 21, Maven |
| 프론트엔드 | React 19, TypeScript 5.9, Vite 7, Tailwind CSS 4, React Router 7, motion, recharts, lucide-react |
| 인프라 | Docker (ubuntu:26.04 기반), Docker Compose, GitLab CI (shell runner) |

## 개발 환경 실행

```bash
./run_docker.sh            # 개발 컨테이너 생성/진입 (프로젝트가 /kimlongdaechicken 에 마운트됨)
```

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
| `src/app/` | `App.tsx`(스플래시, 모션 설정), `router.tsx`(라우트), `navigation.ts`(사이드바 메뉴 정의) |
| `src/components/layout/` | `AppShell`(초록 프레임 + 페이지 전환), `Sidebar`, `Topbar` |
| `src/components/ui/` | 공용 UI (`Card`, `StatusPill`, `Badge`, `ProgressBar`, `Toggle`, `Avatar`) |
| `src/components/dashboard/` | 대시보드 카드. 데이터는 props 로만 받는다 |
| `src/pages/` | 페이지 단위 컴포넌트. API 를 호출해 데이터를 컴포넌트에 넘긴다 |
| `src/api/` | 백엔드 API 호출. `client.ts` 의 `api.get/post/put/delete` 사용 |
| `src/mocks/` | 백엔드 연결 전 mock 데이터 |
| `src/types/` | API 응답과 맞춘 도메인 타입 |
| `src/lib/` | motion variants, `cn`(className 결합), 날짜 포맷 등 유틸 |
| `src/index.css` | Tailwind `@theme` 디자인 토큰 (색 `brand`/`grape`/`navy`/`wait`/`alert`, `rounded-panel`, `shadow-card` 등) |

### backend/
| 경로 | 역할 |
|---|---|
| `controller/` | REST API (`/api/**`) |
| `config/SpaWebConfig.java` | SPA(React Router) 새로고침 대응 (없는 경로 → index.html) |
| `resources/application*.yml` | 기본 / `prod` 프로파일 설정 |

### 루트
| 경로 | 역할 |
|---|---|
| `Dockerfile` | 멀티 스테이지: `--target dev` 개발용 이미지, `--target runtime` 배포용 이미지 |
| `Dockerfile.release` | 배포용 이미지 (프론트+백엔드 → jar 하나). GitLab CI 가 사용 |
| `setting-script/` | 컨테이너 환경 설치 스크립트 |
| `run_docker.sh` / `build_docker.sh` | 개발 컨테이너 실행 / 배포 |
| `docs/` | 운영 문서 (이 문서, 배포 가이드, 브랜치 전략) |

## 자주 하는 작업

### 새 화면 추가 (예: 상담 접수)
사이드바 메뉴는 이미 placeholder 페이지로 연결되어 있다.
1. `frontend/src/pages/ConsultationsPage.tsx` 생성 (상단은 `<Topbar title="상담 접수" />`)
2. `frontend/src/app/router.tsx` 에서 해당 경로를 placeholder 대신 새 페이지로 연결
   ```tsx
   { path: 'consultations', element: <ConsultationsPage /> },
   ```
   같은 경로가 placeholder 로도 만들어지지 않도록 `placeholderRoutes` 의 `filter` 조건에서 해당 경로를 제외한다.
   ```ts
   .filter((item) => !['/', '/consultations'].includes(item.path))
   ```
3. 메뉴 이름/아이콘/배지는 `frontend/src/app/navigation.ts` 의 `NAV_SECTIONS` 에서 관리한다.

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

- **인증/권한 미구현**: Vue → React 전환 때 기존 로그인 화면, 역할별 라우트 가드, Pinia 스토어(`AuthStore`, `LogStore`)는 삭제됐다 (git 이력에 남아 있음). 백엔드 인증(Spring Security 등)과 함께 React 로 다시 구현해야 한다.
- **대시보드 외 화면 미구현**: 대시보드 홈만 구현됐고 나머지 메뉴는 placeholder 다. 데이터는 전부 mock 이다.
- **프론트 테스트 미구성**: 빌드/타입 검사와 브라우저 수동 확인만 했다. Vitest + Testing Library 도입 권장.
- **도메인/HTTPS 미연결**: `docs/deployment.md` 의 "도메인 연결" 참고.
- **개발 컨테이너는 root 로 실행**: 컨테이너 안에서 만든 `node_modules`, `target` 이 호스트에서 root 소유가 될 수 있다. 권한 문제 시 `sudo chown -R $USER .` 로 정리.
- **배포 Dockerfile 중복**: `Dockerfile` 의 `runtime` 스테이지와 `Dockerfile.release` 가 같은 일을 한다. 하나로 합치려면 CI/`build_docker.sh` 를 `docker build --target runtime` 으로 바꾸고 `Dockerfile.release` 를 지운다.
- **CI 이미지 이중 빌드**: `build` 잡과 `deploy` 잡(`build_docker.sh`) 모두 `docker build` 를 실행한다. 같은 러너면 캐시로 빠르게 끝나지만, 필요하면 `deploy` 잡이 빌드된 이미지만 실행하도록 정리할 수 있다.
