#!/usr/bin/env bash
# 컨테이너 안에서 쓰는 로컬 PostgreSQL (개발 DB, jOOQ 코드 생성용)
#   pg_local start   : 처음이면 initdb + aew 계정/DB(aew, aew_test) 생성 후 기동
#   pg_local stop    : 중지
#   pg_local reset   : 데이터 삭제 후 다시 생성 (V1__init.sql 을 고쳤을 때)
#   pg_local status
# 접속: localhost:5432, 계정 aew / aew
set -euo pipefail

PGDATA_DIR=${PGDATA_DIR:-/var/lib/aew-pg}
PGPORT=${PGPORT:-5432}
PGBIN=$(ls -d /usr/lib/postgresql/*/bin | sort -V | tail -1)
LOG=/tmp/aew-pg.log

as_pg() { runuser -u postgres -- "$@"; }

init() {
  mkdir -p "$PGDATA_DIR"
  chown postgres:postgres "$PGDATA_DIR"
  as_pg "$PGBIN/initdb" -D "$PGDATA_DIR" -U postgres -E UTF8 --locale=C.UTF-8 --auth=trust >/dev/null
  echo "listen_addresses = 'localhost'" >> "$PGDATA_DIR/postgresql.conf"
  echo "port = $PGPORT" >> "$PGDATA_DIR/postgresql.conf"
}

start() {
  [[ -f "$PGDATA_DIR/PG_VERSION" ]] || init
  if as_pg "$PGBIN/pg_ctl" -D "$PGDATA_DIR" status >/dev/null 2>&1; then
    echo "PostgreSQL 이미 실행 중 (port $PGPORT)"
    return
  fi
  mkdir -p /var/run/postgresql && chown postgres:postgres /var/run/postgresql
  as_pg "$PGBIN/pg_ctl" -D "$PGDATA_DIR" -l "$LOG" -w start >/dev/null
  as_pg psql -p "$PGPORT" -qtAc "SELECT 1 FROM pg_roles WHERE rolname='aew'" | grep -q 1 \
    || as_pg psql -p "$PGPORT" -qc "CREATE ROLE aew LOGIN PASSWORD 'aew'"
  for db in aew aew_test; do
    as_pg psql -p "$PGPORT" -qtAc "SELECT 1 FROM pg_database WHERE datname='$db'" | grep -q 1 \
      || as_pg createdb -p "$PGPORT" -O aew "$db"
  done
  echo "PostgreSQL 실행 (port $PGPORT, DB aew / aew_test)"
}

stop() {
  as_pg "$PGBIN/pg_ctl" -D "$PGDATA_DIR" -m fast -w stop >/dev/null 2>&1 || true
}

case "${1:-}" in
  start) start ;;
  stop) stop ;;
  reset) stop; rm -rf "$PGDATA_DIR"; start ;;
  status) as_pg "$PGBIN/pg_ctl" -D "$PGDATA_DIR" status ;;
  *) echo "사용법: pg_local {start|stop|reset|status}"; exit 1 ;;
esac
