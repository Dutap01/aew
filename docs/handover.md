# 인수인계 문서

## 기술 스택

| 영역 | 스택 |
|---|---|
| 백엔드 | Spring Boot 3.5.7, Java 21, Maven |
| 프론트엔드 | Vue 3, Vite 7, Pinia 3, Vue Router 4 |
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

브라우저: `http://<서버IP>:5173`

## 폴더별 역할

### frontend/
| 경로 | 역할 |
|---|---|
| `assets/화면명세서.html`, `assets/스타일가이드.html` | 퍼블리싱 원본 문서 (배포 jar 에는 포함되지 않음) |
| `assets/design-system/{css,js,img,fonts}` | 공통 디자인 자산. 코드에서는 `@assets/...` 로 import |
| `src/api/` | 백엔드 API 호출. `client.js` 의 `api.get/post/put/delete` 사용 |
| `src/components/common/` | 공용 UI 컴포넌트 (버튼 하나도 컴포넌트) |
| `src/views/{base,auth,admin,manager}/` | 역할/도메인별 화면 |
| `src/router/routes/` | 역할별 라우트 정의. `guards.js` 가 권한 검사 |
| `src/stores/` | Pinia 스토어 (`AuthStore`, `LogStore`) |
| `src/utils/` | 공통 유틸 (`LogUtils`, `RoleUtils`) |

### backend/
| 경로 | 역할 |
|---|---|
| `controller/` | REST API (`/api/**`) |
| `config/SpaWebConfig.java` | Vue history 모드 새로고침 대응 (없는 경로 → index.html) |
| `resources/application*.yml` | 기본 / `prod` 프로파일 설정 |

### 루트
| 경로 | 역할 |
|---|---|
| `Dockerfile` | 개발용 이미지 |
| `Dockerfile.release` | 배포용 이미지 (프론트+백엔드 → jar 하나) |
| `setting-script/` | 컨테이너 환경 설치 스크립트 |
| `run_docker.sh` / `build_docker.sh` | 개발 컨테이너 실행 / 배포 |
| `docs/` | 운영 문서 (이 문서, 배포 가이드, 브랜치 전략) |

## 자주 하는 작업

### 새 화면 추가 (예: 관리자 > 사용자 관리)
1. `frontend/src/views/admin/UserListView.vue` 생성
2. `frontend/src/router/routes/admin.js` 의 `children` 에 추가
   ```js
   { path: 'users', name: 'admin-users', component: () => import('@/views/admin/UserListView.vue') }
   ```
   부모(`/admin`)의 `meta.roles` 가 자식에게도 적용된다.

### 새 역할 추가
1. `frontend/src/utils/RoleUtils.js` 의 `ROLES` 에 추가
2. `frontend/src/views/<역할>/`, `frontend/src/router/routes/<역할>.js` 생성
3. `frontend/src/router/index.js` 의 `routes` 에 합치기

### 새 API 추가
1. 백엔드: `controller/` 에 `@RequestMapping("/api/...")` 컨트롤러 추가
2. 프론트: `src/api/<도메인>.js` 생성 후 `client.js` 의 `api` 사용
   ```js
   import { api } from './client'
   export const getUsers = () => api.get('/users')
   ```
   실패 시 `ApiError` (`status`, `body`) 가 던져진다.

## 남은 작업 / 알려진 이슈

- **인증 미구현**: `LoginView` 는 개발용 역할 선택 화면이고, 로그인 상태는 메모리에만 있어 새로고침 시 풀린다. 백엔드 인증(Spring Security 등) 연동 필요.
- **프론트 테스트 미구성**: 라우트 가드·API 클라이언트는 수동 스크립트로만 검증함. Vitest 도입 시 테스트 추가 권장.
- **도메인/HTTPS 미연결**: `docs/deployment.md` 의 "도메인 연결" 참고.
- **개발 컨테이너는 root 로 실행**: 컨테이너 안에서 만든 `node_modules`, `target` 이 호스트에서 root 소유가 될 수 있다. 권한 문제 시 `sudo chown -R $USER .` 로 정리.
- **CI 이미지 이중 빌드**: `build` 잡과 `deploy` 잡(`build_docker.sh`) 모두 `docker build` 를 실행한다. 같은 러너면 캐시로 빠르게 끝나지만, 필요하면 `deploy` 잡이 빌드된 이미지만 실행하도록 정리할 수 있다.
