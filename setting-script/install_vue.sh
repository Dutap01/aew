#!/usr/bin/env bash
# Vue 개발 환경 설치 (Dockerfile 에서 실행: bash ${APP_PATH}/setting-script/install_vue.sh)
set -euo pipefail

apt-get update
apt-get install -y --no-install-recommends nodejs npm
apt-get clean
rm -rf /var/lib/apt/lists/*

node -v
npm -v
