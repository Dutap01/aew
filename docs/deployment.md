# 배포 가이드

## 배포 구조

```
GitLab (dev → release MR 머지)
   └─ GitLab Runner (shell executor, 태그: deploy) ── 배포 서버에서 실행
        ├─ build  : docker build --target runtime -t aew:<커밋SHA> .
        └─ deploy : ./build_docker.sh <커밋SHA>   (ENV_FILE=/etc/aew/aew.env)
                      ├─ docker build (build 단계 캐시 사용)
                      └─ docker compose up -d --wait  → app·db 헬스체크 통과까지 대기

배포 서버 (docker compose 프로젝트 이름: aew)
   ├─ aew-app : Spring Boot jar (React 화면 포함), 포트 APP_PORT(기본 8080)
   └─ aew-db  : PostgreSQL 16, 데이터는 볼륨 aew-db-data (밖으로 포트 안 엶)
```

배포 이미지는 `Dockerfile` 의 `runtime` 타깃이다 (`dev` 타깃은 개발 컨테이너용).

1. **build 단계** (ubuntu:26.04 + JDK 21·Maven·PostgreSQL·Node)
   → `frontend` 에서 `npm ci && npm run build` (타입 검사 포함)
   → `frontend/dist/*` 를 `backend/src/main/resources/static/` 으로 복사
   → 빌드 안에서 임시 PostgreSQL 을 띄워 Flyway 마이그레이션 → jOOQ 코드 생성 → `mvn package` 로 `webapp.jar`
2. **runtime 단계** (ubuntu:26.04 + JRE 21): `java -jar /app/app.jar`, 포트 8080

앱이 시작될 때 Flyway 가 운영 DB 에 새 마이그레이션(`V2__...sql` 등)을 자동으로 적용한다.
프론트와 백엔드가 jar 하나에서 서빙된다. `/api/**` 는 Spring 컨트롤러가, 그 외 경로는 React 화면(index.html)이 처리한다 (`SpaWebConfig`).

## 사전 준비 (배포 서버, 최초 1회)

1. Docker / Docker Compose 플러그인 설치
2. 환경변수 파일 만들기 (`.env.example` 참고)
   ```bash
   sudo mkdir -p /etc/aew
   sudo cp .env.example /etc/aew/aew.env
   sudo vi /etc/aew/aew.env        # DB_PASSWORD, OWNER_PASSWORD(8자 이상) 채우기
   sudo chown gitlab-runner /etc/aew/aew.env && sudo chmod 600 /etc/aew/aew.env
   ```
3. GitLab Runner 설치 후 이 프로젝트에 등록
   - executor: `shell`
   - tag: `deploy` (`.gitlab-ci.yml` 의 `tags` 와 일치해야 함)
4. 러너 실행 계정을 docker 그룹에 추가: `sudo usermod -aG docker gitlab-runner`
5. 방화벽에서 앱 포트(기본 8080) 허용
6. GitLab 설정: 기본 브랜치 `release`, `release` 보호 (Allowed to push: No one, Allowed to merge: Maintainers)
7. DB 백업 cron 등록 (아래 "백업과 복구")

## 첫 배포

1. GitLab 에서 `dev` → `release` MR 생성 → `build` 잡 통과 확인 → 머지
2. `deploy` 잡이 끝나면 접속 확인
3. `/etc/aew/aew.env` 의 `OWNER_LOGIN_ID` / `OWNER_PASSWORD` 로 로그인 (대표 계정은 DB 에 대표가 하나도 없을 때만 만들어진다)
4. 로그인 확인 후 `OWNER_PASSWORD` 줄은 지워도 된다

운영(prod)에서는 개발용 샘플 데이터와 Swagger UI 가 꺼져 있다.

## 수동 배포

```bash
./build_docker.sh                                       # ./.env 사용, aew:latest
ENV_FILE=/etc/aew/aew.env ./build_docker.sh v1.0.0      # 태그·환경변수 파일 지정
```

환경변수 (`.env.example`):

| 변수 | 기본값 | 설명 |
|---|---|---|
| `APP_IMAGE` | `aew:latest` | 실행할 이미지 (`build_docker.sh` 가 자동 지정) |
| `APP_PORT` | `8080` | 호스트에 노출할 포트 |
| `DB_PASSWORD` | (필수) | DB 비밀번호. **처음 정한 값을 바꾸지 않는다** (볼륨이 이 비밀번호로 초기화됨) |
| `OWNER_LOGIN_ID` / `OWNER_PASSWORD` / `OWNER_NAME` | - | 첫 대표 계정 (대표가 없을 때만 생성, 비밀번호 8자 이상) |
| `SESSION_COOKIE_SECURE` | `false` | HTTPS 연결 후 `true` |
| `DOMAIN` | `example.com` | 도메인 연결용 (아직 미사용) |

## 배포 확인

```bash
docker compose -p aew ps                               # aew-app, aew-db 모두 healthy
docker logs -f aew-app
curl localhost:8080/api/health                         # {"status":"UP"}
curl -o /dev/null -w '%{http_code}\n' localhost:8080/admin   # 200 (새로고침 대응)
curl -o /dev/null -w '%{http_code}\n' localhost:8080/api/admin/students   # 401 (로그인 필요)
```

## 롤백

배포 이미지는 커밋 SHA 로 태그되어 서버에 남는다. 이전 이미지로 다시 띄우면 된다.

```bash
docker images aew                                       # 이전 태그 확인
APP_IMAGE=aew:<이전SHA> docker compose -p aew --env-file /etc/aew/aew.env up -d --wait app
```

또는 GitLab **Deploy > Environments > production** 에서 이전 배포의 **Re-deploy** 를 실행한다.

주의: 새 버전에서 DB 마이그레이션(`V2__...`)이 이미 적용됐다면 이전 이미지는 바뀐 스키마로 동작한다.
마이그레이션은 컬럼 추가처럼 이전 버전과 함께 돌아가는 방식으로 작성하고, 필요하면 백업으로 복구한다.

오래된 이미지 정리: `docker image prune` (사용 중이 아닌 dangling 이미지만 삭제)

## 백업과 복구

`setting-script/backup_db.sh`: `aew-db` 에서 `pg_dump` → gzip, 기본 `/var/backups/aew`, 14일 보관.

```bash
sudo mkdir -p /var/backups/aew && sudo chown $USER /var/backups/aew
crontab -e
# 매일 03:30
30 3 * * * /경로/aew/setting-script/backup_db.sh >> /var/backups/aew/backup.log 2>&1
```

복구 (현재 DB 내용을 백업 시점으로 덮어쓴다. 복구 전에 지금 상태도 한 번 백업해 둔다):

```bash
./setting-script/backup_db.sh                            # 현재 상태 백업
docker stop aew-app
gunzip -c /var/backups/aew/aew-YYYYMMDD-HHMMSS.sql.gz | docker exec -i aew-db psql -U aew -d aew -v ON_ERROR_STOP=1
docker start aew-app
```

백업 파일은 같은 서버에만 있으면 서버 장애 때 함께 잃는다. 외부 저장소(S3 등)로 복사하는 것은 운영 서버가 정해지면 추가한다.

## 도메인 연결 (TODO)

`docker-compose.yml` 에 리버스 프록시(Caddy 또는 Nginx) 서비스를 추가하고, 80/443 → app:8080 으로 연결한다. HTTPS 인증서는 Caddy 를 쓰면 자동 발급된다.
HTTPS 연결 후 `SESSION_COOKIE_SECURE=true` 로 바꾸고 재배포한다.
