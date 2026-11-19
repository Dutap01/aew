#!/usr/bin/env bash
# [개발용] 개발 컨테이너(aew-dev)를 띄우고 들어간다. 프로젝트 폴더는 /kimlongdaechicken 에 마운트.
#   ./run_docker.sh            컨테이너 진입 (다시 실행하면 같은 컨테이너에 터미널 추가)
#   ./run_docker.sh --rebuild  이미지 새로 빌드 후 컨테이너 재생성 (개발 DB 데이터는 초기화됨)
# 컨테이너가 켜질 때 개발 DB(PostgreSQL, localhost:5432, aew/aew)도 같이 켠다.
set -euo pipefail
cd "$(dirname "$0")"

IMAGE=aew-dev
CONTAINER=aew-dev

if [[ "${1:-}" == "--rebuild" ]]; then
  docker rm -f "$CONTAINER" 2>/dev/null || true
  docker build --target dev -t "$IMAGE" .
  docker image prune -f
fi

if ! docker image inspect "$IMAGE" >/dev/null 2>&1; then
  docker build --target dev -t "$IMAGE" .
fi

if ! docker ps -a --format '{{.Names}}' | grep -qx "$CONTAINER"; then
  docker run -d --name "$CONTAINER" \
    -v "$(pwd)":/kimlongdaechicken -w /kimlongdaechicken \
    -v aew-m2:/root/.m2 \
    -p 8080:8080 -p 5173:5173 \
    "$IMAGE" sleep infinity >/dev/null
fi

docker start "$CONTAINER" >/dev/null
docker exec "$CONTAINER" pg_local start
if [[ -t 0 ]]; then
  docker exec -it "$CONTAINER" bash
fi
