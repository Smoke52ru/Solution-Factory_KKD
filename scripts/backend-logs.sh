#!/usr/bin/env sh
# Логи контейнера mock API (follow по умолчанию).
set -eu
. "$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)/lib.sh"

compose logs -f --tail=100 backend "$@"
