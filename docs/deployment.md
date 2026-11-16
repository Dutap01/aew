# 배포 가이드

## 배포 구조

```
GitLab (release 머지)
   └─ GitLab Runner (shell executor, 태그: deploy) ── 배포 서버에서 실행
        ├─ build  : docker build -f Dockerfile.release -t web-project:<커밋SHA> .
        └─ deploy : ./build_docker.sh <커밋SHA>
                      ├─ docker build (캐시 사용)
                      └─ APP_IMAGE=web-project:<커밋SHA> docker compose up -d
```

`Dockerfile.release` 는 멀티 스테이지 빌드다.

1. **build 단계** (ubuntu:26.04): JDK 21·Maven 설치, `setting-script/install_vue.sh` 로 Node 설치
   → `frontend` 에서 `npm ci && npm run build`
   → `frontend/dist/*` 를 `backend/src/main/resources/static/` 으로 복사
   → `mvn package -DskipTests` 로 `webapp.jar` 생성
2. **runtime 단계** (ubuntu:26.04 + JRE 21): `java -jar /app/app.jar`, 포트 8080

프론트와 백엔드가 jar 하나에서 서빙된다. `/api/**` 는 Spring 컨트롤러가, 그 외 경로는 React 화면(index.html)이 처리한다 (`SpaWebConfig`).

## 사전 준비 (배포 서버, 최초 1회)

1. Docker / Docker Compose 플러그인 설치
2. GitLab Runner 설치 후 등록
   - executor: `shell`
   - tag: `deploy` (`.gitlab-ci.yml` 의 `tags` 와 일치해야 함)
3. 러너 실행 계정을 docker 그룹에 추가: `sudo usermod -aG docker gitlab-runner`
4. 방화벽에서 앱 포트(기본 8080) 허용

## 수동 배포

```bash
./build_docker.sh            # web-project:latest 로 빌드 후 실행
./build_docker.sh v1.0.0     # 태그 지정
```

환경변수(`.env.example` 참고, 복사해서 `.env` 로 사용):

| 변수 | 기본값 | 설명 |
|---|---|---|
| `APP_IMAGE` | `web-project:latest` | 실행할 이미지 (`build_docker.sh` 가 자동 지정) |
| `APP_PORT` | `8080` | 호스트에 노출할 포트 |
| `DOMAIN` | `example.com` | 도메인 연결용 (아직 미사용) |

## 배포 확인

```bash
docker compose ps
docker logs -f web-project-app
curl localhost:8080/api/health        # {"status":"UP"}
curl -o /dev/null -w '%{http_code}\n' localhost:8080/admin   # 200 (새로고침 대응)
```

## 롤백

배포 이미지는 커밋 SHA 로 태그되어 서버에 남는다. 이전 이미지로 다시 띄우면 된다.

```bash
docker images web-project                       # 이전 태그 확인
APP_IMAGE=web-project:<이전SHA> docker compose up -d
```

또는 GitLab **Deploy > Environments > production** 에서 이전 배포의 **Re-deploy** 를 실행한다.

오래된 이미지 정리: `docker image prune` (사용 중이 아닌 dangling 이미지만 삭제)

## 도메인 연결 (TODO)

`docker-compose.yml` 에 리버스 프록시(Caddy 또는 Nginx) 서비스를 추가하고, 80/443 → app:8080 으로 연결한다. HTTPS 인증서는 Caddy 를 쓰면 자동 발급된다.
