#!/usr/bin/env sh
# Запуск mock API локально без Docker (uvicorn --reload).
set -eu
. "$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)/lib.sh"

need_cmd python3
cd "$BACKEND_DIR"

if [ -f .env.example ] && [ ! -f .env ]; then
  cp .env.example .env
  printf 'Создан backend/.env из .env.example\n'
fi

if [ ! -d .venv ]; then
  python3 -m venv .venv
  . .venv/bin/activate
  pip install -r requirements.txt
else
  . .venv/bin/activate
fi

# shellcheck disable=SC1091
set -a
[ -f .env ] && . ./.env
set +a

exec uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
