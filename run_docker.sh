#!/usr/bin/env bash
# [개발용] 개발 컨테이너를 띄우고 프로젝트 폴더를 /kimlongdaechicken (APP_PATH) 로 마운트
set -euo pipefail
cd "$(dirname "$0")"

IMAGE=web-project-dev
CONTAINER=web-project-dev

if [[ "${1:-}" == "--rebuild" ]]; then
	docker rm -f "$CONTAINER" 2>/dev/null || true
	docker build --target dev -f Dockerfile -t "$IMAGE" .
	docker image prune -f
fi

if ! docker image inspect "$IMAGE" >/dev/null 2>&1; then
  docker build --target dev -f Dockerfile -t "$IMAGE" .
fi

if docker ps -a --format '{{.Names}}' | grep -qx "$CONTAINER"; then
  docker start "$CONTAINER" >/dev/null
  docker exec -it "$CONTAINER" bash
else
  docker run -it --name "$CONTAINER" \
    -v "$(pwd)":/kimlongdaechicken -w /kimlongdaechicken \
    -p 8080:8080 -p 5173:5173 \
    "$IMAGE" bash
fi
