#!/usr/bin/env sh
# Проверить /health mock API.
set -eu
. "$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)/lib.sh"

need_cmd curl
curl -fsS "$API_BASE/health" | {
  if command -v python3 >/dev/null 2>&1; then
    python3 -m json.tool
  else
    cat
  fi
}
printf '\n'
