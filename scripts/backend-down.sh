#!/usr/bin/env sh
# Остановить и убрать контейнер mock API.
set -eu
. "$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)/lib.sh"

compose down "$@"
