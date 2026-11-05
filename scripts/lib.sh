#!/usr/bin/env sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
BACKEND_DIR="$ROOT_DIR/backend"
API_BASE="${API_BASE:-http://127.0.0.1:8000}"

die() {
  printf '%s\n' "$*" >&2
  exit 1
}

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Нужна команда: $1"
}

compose() {
  need_cmd docker
  docker compose -f "$ROOT_DIR/docker-compose.yml" "$@"
}
