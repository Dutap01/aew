#!/usr/bin/env bash
# [운영 서버] DB 백업: aew-db 컨테이너에서 pg_dump → gzip, 오래된 백업 삭제
#   ./backup_db.sh                  /var/backups/aew 에 저장, 14일 보관
#   BACKUP_DIR=/data/backup KEEP_DAYS=30 ./backup_db.sh
# 매일 03:30 자동 실행 (crontab -e):
#   30 3 * * * /경로/setting-script/backup_db.sh >> /var/log/aew-backup.log 2>&1
# 복구: gunzip -c 파일.sql.gz | docker exec -i aew-db psql -U aew -d aew   (docs/deployment.md 참고)
set -euo pipefail

BACKUP_DIR=${BACKUP_DIR:-/var/backups/aew}
KEEP_DAYS=${KEEP_DAYS:-14}
CONTAINER=${CONTAINER:-aew-db}

mkdir -p "$BACKUP_DIR"
file="$BACKUP_DIR/aew-$(date +%Y%m%d-%H%M%S).sql.gz"
tmp="$file.partial"

# --clean --if-exists: 복구할 때 기존 객체를 지우고 다시 만든다
docker exec "$CONTAINER" pg_dump -U aew -d aew --clean --if-exists --no-owner | gzip > "$tmp"
mv "$tmp" "$file"
echo "$(date '+%F %T') 백업 완료: $file ($(du -h "$file" | cut -f1))"

find "$BACKUP_DIR" -name 'aew-*.sql.gz' -mtime +"$KEEP_DAYS" -print -delete
