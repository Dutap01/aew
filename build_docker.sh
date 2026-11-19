#!/usr/bin/env bash
# [배포용] 배포 이미지 빌드 후 docker compose 로 실행 (DB 는 처음 한 번만 생성되고 이후 유지)
#   ./build_docker.sh            aew:latest 로 빌드 후 실행
#   ./build_docker.sh v1.0.0     태그 지정 (GitLab CI 는 커밋 SHA)
# 환경변수 파일: ENV_FILE (기본 ./.env). GitLab Runner 는 작업 폴더가 매번 정리되므로 서버 고정 경로를 쓴다.
#   예) ENV_FILE=/etc/aew/aew.env ./build_docker.sh
set -euo pipefail
cd "$(dirname "$0")"

TAG=${1:-latest}
IMAGE=aew:"$TAG"
ENV_FILE=${ENV_FILE:-.env}

if [[ ! -f "$ENV_FILE" ]]; then
  echo "환경변수 파일이 없습니다: $ENV_FILE (.env.example 을 복사해 DB_PASSWORD 등을 채우세요)" >&2
  exit 1
fi

docker build --target runtime -t "$IMAGE" .
APP_IMAGE="$IMAGE" docker compose --env-file "$ENV_FILE" up -d --wait
docker compose --env-file "$ENV_FILE" ps
