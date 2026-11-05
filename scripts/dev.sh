#!/usr/bin/env sh
# Поднять mock API в Docker и фронтенд Vite.
set -eu
. "$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)/lib.sh"

"$ROOT_DIR/scripts/backend-up.sh"

need_cmd npm
cd "$ROOT_DIR"
if [ ! -d node_modules ]; then
  npm install
fi

printf 'Frontend: http://127.0.0.1:5173\n'
exec npm run dev
