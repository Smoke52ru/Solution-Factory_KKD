#!/usr/bin/env sh
# Прогнать pytest mock API.
set -eu
. "$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)/lib.sh"

need_cmd python3
cd "$BACKEND_DIR"

if [ ! -d .venv ]; then
  python3 -m venv .venv
  . .venv/bin/activate
  pip install -r requirements.txt
else
  . .venv/bin/activate
fi

exec pytest -q "$@"
