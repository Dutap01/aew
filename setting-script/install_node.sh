#!/usr/bin/env bash
# Node/npm 설치 (Dockerfile base 스테이지에서 실행)
set -euo pipefail

apt-get update
apt-get install -y --no-install-recommends nodejs npm
apt-get clean
rm -rf /var/lib/apt/lists/*

node -v
npm -v
