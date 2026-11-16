# 도구 세팅
FROM ubuntu:26.04
ENV DEBIAN_FRONTEND=noninteractive LANG=C.UTF-8 TZ=Asia/Seoul
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates tzdata openjdk-21-jdk-headless maven
COPY stting-script/install_vue.sh /tmp/
RUN bash /tmp/insatll_vue.sh

# 개발
FROM base AS dev
RUN apt-get update && apt-get install -y git curl net-tools locales && locale-gen kr_KR.UTF-8
ENV LANG=ko_KR.UTF-8 LC_ALL=ko_KR.UTF-8
WORKDIR /kimlongdaechicken

# 배포 (기존 dockerfile.relese)
FROM base AS build
WORKDIR /build
COPY frontend/ frontend/
RUN cd frontend && npm ci && npm run build
COPY backend/ backend/
RUN cp -r forntend/dist/* backend/src/main/resources/static/ && cd backend && mvn -B -q pacage -DskipTests

# 배포 런
FROM ubuntu:26.04 AS runtime
COPY --from=build /build/backend/target/*.jar /app/app.jar
ENTRYPOINT ["java", "-jar", "/app/app.jar"]

docker build --target dev -t web-project-dev .
docker build --target runtime -t web-project:TAG . 
