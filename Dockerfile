# 사용법
#   개발: docker build --target dev -t web-project-dev .        (run_docker.sh 가 사용)
#   배포: docker build --target runtime -t web-project:TAG .

# ---- 도구 세팅 (공통) ----
FROM ubuntu:26.04 AS base
ENV DEBIAN_FRONTEND=noninteractive LANG=C.UTF-8 TZ=Asia/Seoul
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates tzdata openjdk-21-jdk-headless maven
COPY setting-script/install_vue.sh /tmp/install_vue.sh
RUN bash /tmp/install_vue.sh

# ---- 개발 ----
FROM base AS dev
RUN apt-get update \
 && apt-get install -y --no-install-recommends git curl net-tools locales \
 && locale-gen ko_KR.UTF-8 \
 && rm -rf /var/lib/apt/lists/*
ENV LANG=ko_KR.UTF-8 LC_ALL=ko_KR.UTF-8
WORKDIR /kimlongdaechicken

# ---- 배포 빌드 (기존 Dockerfile.release) ----
FROM base AS build
WORKDIR /build
COPY frontend/ frontend/
RUN cd frontend && npm ci && npm run build
COPY backend/ backend/
RUN rm -rf backend/src/main/resources/static/* \
 && cp -r frontend/dist/* backend/src/main/resources/static/ \
 && cd backend && mvn -B -q package -DskipTests

# ---- 배포 실행 ----
FROM ubuntu:26.04 AS runtime
ENV DEBIAN_FRONTEND=noninteractive LANG=C.UTF-8 TZ=Asia/Seoul
RUN apt-get update \
 && apt-get install -y --no-install-recommends openjdk-21-jre-headless tzdata \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /build/backend/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
