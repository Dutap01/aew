# web-project

Spring Boot 3.5 (Java 21) + React 19 (Vite, TypeScript, Tailwind CSS v4) 웹 프로젝트.
배포 시 프론트 빌드 결과가 Spring jar 에 포함되어 컨테이너 하나로 서빙된다.

## 폴더 구조
```
web-project/
├── Dockerfile                  # 개발용 이미지 (ubuntu:26.04, JDK 21, Maven, Node)
├── Dockerfile.release          # 배포용 이미지 (React 빌드 → Spring static → jar)
├── docker-compose.yml          # [배포] app 서비스
├── run_docker.sh               # [개발] 개발 컨테이너 실행/진입
├── build_docker.sh             # [배포] 이미지 빌드 + compose 실행
├── .gitlab-ci.yml              # release 머지 시 GitLab Runner 로 배포
├── setting-script/
│   └── install_vue.sh          # 컨테이너 Node/npm 설치
├── docs/
│   ├── deployment.md           # 배포 가이드 (러너, 롤백, 도메인)
│   ├── branch-strategy.md      # 브랜치 전략, 커밋 메시지 규칙
│   └── handover.md             # 인수인계 (구조, 자주 하는 작업, 남은 작업)
├── backend/                    # Spring Boot (Maven)
│   └── src/main/java/com/example/webapp/
│       ├── controller/         # REST API (/api/**)
│       └── config/             # SpaWebConfig (SPA 새로고침 대응)
└── frontend/                   # React 19 + Vite + TypeScript + Tailwind v4
    ├── assets/
    │   ├── 화면명세서.html
    │   ├── 스타일가이드.html
    │   └── design-system/{css,js,img,fonts}   # @assets/ 로 import
    └── src/
        ├── app/                # App(스플래시), router, navigation(사이드바 메뉴 정의)
        ├── components/
        │   ├── layout/         # AppShell, Sidebar, Topbar
        │   ├── ui/             # Card, StatusPill, Badge, ProgressBar, Toggle, Avatar
        │   └── dashboard/      # 대시보드 카드 컴포넌트 (recharts)
        ├── pages/              # DashboardPage, PlaceholderPage
        ├── api/                # client.ts(fetch 래퍼), dashboard.ts(현재 mock 반환)
        ├── mocks/              # mock 데이터
        ├── types/              # 도메인 타입
        ├── lib/                # motion variants, 유틸
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
