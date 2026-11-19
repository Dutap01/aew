# 사용법
#   개발: docker build --target dev -t aew-dev .        (run_docker.sh 가 사용)
#   배포: docker build --target runtime -t aew:TAG .     (build_docker.sh, GitLab CI 가 사용)

# ---- 도구 세팅 (공통) ----
# postgresql: 개발 DB + 빌드 중 jOOQ 코드 생성용 (Flyway 로 스키마를 만든 뒤 코드 생성)
FROM ubuntu:26.04 AS base
ENV DEBIAN_FRONTEND=noninteractive LANG=C.UTF-8 TZ=Asia/Seoul
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates tzdata openjdk-21-jdk-headless maven postgresql
COPY setting-script/install_node.sh /tmp/install_node.sh
RUN bash /tmp/install_node.sh
COPY setting-script/pg_local.sh /usr/local/bin/pg_local
RUN chmod +x /usr/local/bin/pg_local

# ---- 개발 ----
FROM base AS dev
RUN apt-get update \
 && apt-get install -y --no-install-recommends git curl net-tools locales \
 && locale-gen ko_KR.UTF-8 \
 && rm -rf /var/lib/apt/lists/*
ENV LANG=ko_KR.UTF-8 LC_ALL=ko_KR.UTF-8
WORKDIR /kimlongdaechicken

# ---- 배포 빌드 ----
FROM base AS build
WORKDIR /build
COPY frontend/package.json frontend/package-lock.json frontend/
RUN cd frontend && npm ci
COPY backend/pom.xml backend/
RUN cd backend && mvn -B -q dependency:go-offline -Dcodegen.skip=true || true
COPY frontend/ frontend/
RUN cd frontend && npm run build
COPY backend/ backend/
# 임시 DB 를 띄워 Flyway 마이그레이션 → jOOQ 코드 생성 → jar 패키징
RUN rm -rf backend/src/main/resources/static/* \
 && cp -r frontend/dist/* backend/src/main/resources/static/ \
 && pg_local start \
 && (cd backend && mvn -B -q package -DskipTests) \
 && pg_local stop

# ---- 배포 실행 ----
FROM ubuntu:26.04 AS runtime
ENV DEBIAN_FRONTEND=noninteractive LANG=C.UTF-8 TZ=Asia/Seoul
RUN apt-get update \
 && apt-get install -y --no-install-recommends openjdk-21-jre-headless tzdata curl \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /build/backend/target/webapp.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
