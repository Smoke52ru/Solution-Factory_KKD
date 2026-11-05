#!/usr/bin/env sh
# Вернуть демо-данные mock API в исходное состояние (POST /api/reset).
set -eu
. "$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)/lib.sh"

need_cmd curl
curl -fsS -X POST "$API_BASE/api/reset" | {
  if command -v python3 >/dev/null 2>&1; then
    python3 -m json.tool 2>/dev/null || cat
  else
    cat
  fi
}
printf '\nДемо-данные сброшены.\n'
