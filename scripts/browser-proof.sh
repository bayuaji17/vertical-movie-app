#!/usr/bin/env bash
# Browser-proof stack: real API + worker + web against the DEDICATED test database
# and a random test bucket (never the development database or bucket).
#
#   scripts/browser-proof.sh libs            one-time: fetch Chromium's missing libraries (no sudo)
#   scripts/browser-proof.sh up [--public]   reset test DB/bucket, seed, start API (3301) and worker
#   scripts/browser-proof.sh web [dev|prod]  start the web server on 3300 (prod builds first)
#   scripts/browser-proof.sh run <worker.mjs> [args...]   run a Playwright worker against the stack
#   scripts/browser-proof.sh down            stop everything and remove the test bucket
#
# Needs MEDIA_TEST_DATABASE_URL and MEDIA_STORAGE_TEST_* in apps/api/.env, MinIO on :9000,
# and Playwright 1.55 + a Chromium in the usual caches (see docs/operations/media.md).
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
D="${PROOF_DIR:-$HOME/.cache/vertical-movie-proof}"
mkdir -p "$D"
STATE="$D/state.json"
shots="$D/shots"; mkdir -p "$shots"
stop_pidfile() { [ -f "$D/$1.pid" ] && kill "$(cat "$D/$1.pid")" 2>/dev/null; rm -f "$D/$1.pid"; }
api_env() { set -a; . "$ROOT/apps/api/.env"; set +a; }
case "${1:-}" in
libs)
  mkdir -p "$D/debs" "$D/libs" && cd "$D/debs" && apt-get download libnspr4 libnss3 >/dev/null 2>&1
  for f in "$D"/debs/*.deb; do dpkg -x "$f" "$D/libs"; done
  echo "libs ready in $D/libs" ;;
up)
  shift
  stop_pidfile api; stop_pidfile worker
  cd "$ROOT/apps/api" && api_env
  [ -f "$STATE" ] && bun test/integration/content-delete-browser-fixture.ts clean "$STATE" || true
  export BETTER_AUTH_SECRET
  bun test/integration/content-delete-browser-fixture.ts seed http://localhost:3300 "$STATE" "$@" || exit 1
  B=$(grep -o '"bucket": *"[^"]*"' "$STATE" | cut -d'"' -f4)
  cat > "$D/env.sh" <<EOT
export DATABASE_URL='$MEDIA_TEST_DATABASE_URL'
export PORT=3301 BETTER_AUTH_URL=http://localhost:3300 WEB_ORIGIN=http://localhost:3300
export STORAGE_PROVIDER=minio S3_ENDPOINT=http://localhost:9000 S3_REGION=us-east-1 S3_BUCKET=$B
export S3_ACCESS_KEY_ID='$MEDIA_STORAGE_TEST_ACCESS_KEY_ID' S3_SECRET_ACCESS_KEY='$MEDIA_STORAGE_TEST_SECRET_ACCESS_KEY'
export LOG_LEVEL=info LOG_FORMAT=pretty
EOT
  chmod 600 "$D/env.sh"; . "$D/env.sh"
  nohup bun run src/index.ts > "$D/api.log" 2>&1 & echo $! > "$D/api.pid"
  nohup bun run src/workers/index.ts > "$D/worker.log" 2>&1 & echo $! > "$D/worker.pid"
  sleep 5; curl -s -m 5 localhost:3301/; echo ;;
web)
  stop_pidfile web
  cd "$ROOT/apps/web"
  if [ "${2:-dev}" = prod ]; then
    VITE_API_URL=http://localhost:3300 bun run build >/dev/null 2>&1 || { echo "build failed"; exit 1; }
    VITE_API_URL=http://localhost:3300 PORT=3300 HOST=127.0.0.1 NODE_ENV=production API_INTERNAL_URL=http://127.0.0.1:3301 \
      nohup bun .output/server/index.mjs > "$D/web.log" 2>&1 & echo $! > "$D/web.pid"
  else
    PORT=3300 HOST=127.0.0.1 VITE_API_URL=http://localhost:3300 API_INTERNAL_URL=http://localhost:3301 \
      nohup bun run dev > "$D/web.log" 2>&1 & echo $! > "$D/web.pid"
  fi
  sleep 8; curl -s -m 20 -o /dev/null -w "web %{http_code}\n" http://localhost:3300/ ;;
run)
  shift; worker="$1"; shift
  export LD_LIBRARY_PATH="$D/libs/usr/lib/x86_64-linux-gnu"
  PW="file://$(ls -d "$HOME"/.bun/install/cache/playwright-core@1.55.0*/ | head -1)index.mjs"
  CH="$(ls "$HOME"/.cache/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-linux64/chrome-headless-shell | tail -1)"
  cd "$ROOT/apps/web" && bun "$worker" http://localhost:3300 "$PW" "$CH" "$STATE" "$shots" "$@" ;;
down)
  stop_pidfile web; stop_pidfile api; stop_pidfile worker
  # dev servers spawn children; free the ports too
  for port in 3300 3301; do pid=$(ss -ltnp 2>/dev/null | grep ":$port " | grep -o 'pid=[0-9]*' | head -1 | cut -d= -f2); [ -n "$pid" ] && kill "$pid"; done
  cd "$ROOT/apps/api" && api_env
  [ -f "$STATE" ] && bun test/integration/content-delete-browser-fixture.ts clean "$STATE" && rm -f "$STATE" ;;
*) sed -n 2,13p "$0"; exit 1 ;;
esac
