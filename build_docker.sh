#!/usr/bin/env bash
# [배포용] 배포 이미지 빌드 후 docker compose 로 실행
set -euo pipefail
cd "$(dirname "$0")"

TAG=${1:-latest}
IMAGE=web-project:"$TAG"

docker build -f Dockerfile.release -t "$IMAGE" .
APP_IMAGE="$IMAGE" docker compose up -d
docker compose ps
