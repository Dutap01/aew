# web-project

Spring Boot 3.5 (Java 21) + React 19 (Vite, TypeScript, Tailwind CSS v4) 웹 프로젝트.
배포 시 프론트 빌드 결과가 Spring jar 에 포함되어 컨테이너 하나로 서빙된다.

## 폴더 구조
```
web-project/
├── Dockerfile                  # 멀티 스테이지: dev(개발 컨테이너) / runtime(배포: React 빌드 → Spring static → jar)
├── docker-compose.yml          # [배포] app 서비스
├── run_docker.sh               # [개발] 개발 컨테이너 실행/진입
├── build_docker.sh             # [배포] 이미지 빌드 + compose 실행
├── .gitlab-ci.yml              # release 머지 시 GitLab Runner 로 배포
├── setting-script/
│   └── install_vue.sh          # 컨테이너 Node/npm 설치
├── docs/
│   ├── deployment.md           # 배포 가이드 (러너, 롤백, 도메인)
│   ├── branch-strategy.md      # 브랜치 전략, 커밋 메시지 규칙
│   ├── handover.md             # 인수인계 (구조, 자주 하는 작업, 남은 작업)
│   ├── v1-plan.md              # V1 개발 계획서 (범위, 화면, 일정)
│   └── db-schema.md            # DB 구조 요약 (테이블, enum, 스키마 변경 방법)
├── backend/                    # Spring Boot (Maven)
│   ├── src/main/resources/db/migration/   # Flyway SQL (V1__init.sql ...) → jOOQ 코드 생성의 입력
│   └── src/main/java/com/example/webapp/
│       ├── controller/         # REST API (/api/**)
│       └── config/             # SpaWebConfig (SPA 새로고침 대응)
└── frontend/                   # React 19 + Vite + TypeScript + Tailwind v4
    ├── assets/
    │   ├── 화면명세서.html
    │   ├── 스타일가이드.html
    │   └── design-system/{css,js,img,fonts}   # @assets/ 로 import
    └── src/
        ├── App.tsx             # 스플래시, 로그인 상태 확인, TanStack Query
        ├── router/             # index(라우트), guards(로그인·역할), navigation(역할별 메뉴), routes/
        ├── stores/             # Zustand (authStore)
        ├── components/
        │   ├── layout/         # AppShell, Sidebar, Topbar, PublicLayout, Splash
        │   ├── ui/             # Card, StatusPill, Badge, ProgressBar, Toggle, Avatar
        │   └── dashboard/      # 대시보드 카드 컴포넌트 (recharts)
        ├── views/              # 역할별 화면 {base,auth,public,admin,teacher,student,report}
        ├── api/                # client.ts(fetch 래퍼), dashboard.ts(현재 mock 반환)
        ├── mocks/              # mock 데이터
        ├── types/              # 도메인 타입
        ├── utils/              # role(역할 유틸), motion variants, cn, format
        └── index.css           # @theme 디자인 토큰 (색/반경/그림자)
```

## 브랜치 전략
`dev` 에서 개발 → `release` 로 Merge Request → GitLab Runner 가 자동 배포.
자세한 내용: [docs/branch-strategy.md](docs/branch-strategy.md)

## 개발
```bash
./run_docker.sh                               # 컨테이너 진입 (다시 실행하면 같은 컨테이너에 추가 진입)
cd backend && mvn spring-boot:run             # 8080
cd frontend && npm install && npm run dev     # 5173 (/api → 8080 프록시)
```

## 배포
```bash
./build_docker.sh [tag]
curl localhost:8080/api/health                # {"status":"UP"}
```
자세한 내용: [docs/deployment.md](docs/deployment.md) · 인수인계: [docs/handover.md](docs/handover.md)
