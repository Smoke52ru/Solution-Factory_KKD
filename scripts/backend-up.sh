#!/usr/bin/env sh
# Собрать и поднять mock API в Docker (порт 8000).
set -eu
. "$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)/lib.sh"

if [ -f "$BACKEND_DIR/.env.example" ] && [ ! -f "$BACKEND_DIR/.env" ]; then
  cp "$BACKEND_DIR/.env.example" "$BACKEND_DIR/.env"
  printf 'Создан backend/.env из .env.example\n'
fi

compose up --build -d "$@"
printf 'Mock API: %s\nSwagger:  %s/docs\n' "$API_BASE" "$API_BASE"
