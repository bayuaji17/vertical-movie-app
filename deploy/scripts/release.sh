#!/usr/bin/env bash
# Atomic release for the bare-metal (no Docker) deployment. See docs/operations/deployment.md.
#
#   sudo deploy/scripts/release.sh <git-ref> [--migrate]     build and switch to a ref
#   sudo deploy/scripts/release.sh --rollback                 switch back to the previous release
#
# Layout under $APP_DIR (default /opt/vertical-movie):
#   repo/        git clone used only to fetch and export refs
#   releases/    one directory per released commit (built, immutable)
#   current      symlink to the release the services run from
#   previous     symlink to the release that ran before (for --rollback)
#
# Environment: VITE_API_URL (required for a build: the public https origin), APP_DIR, ENV_DIR (/etc/vertical-movie),
#   KEEP (releases to keep, default 3), SERVICES, HEALTH_URL (default http://127.0.0.1:3000/api/site-settings;
#   empty skips the check), RUN_AS (user that builds/migrates, default vmovie when run as root), SYSTEMCTL.
# Migrations only run with --migrate (they are never automatic) and BEFORE the switch.
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/vertical-movie}"
ENV_DIR="${ENV_DIR:-/etc/vertical-movie}"
KEEP="${KEEP:-3}"
SERVICES="${SERVICES:-vertical-movie-api vertical-movie-worker vertical-movie-web}"
SYSTEMCTL="${SYSTEMCTL:-systemctl}"
HEALTH_URL="${HEALTH_URL-http://127.0.0.1:3000/api/site-settings}"
HEALTH_TIMEOUT="${HEALTH_TIMEOUT:-60}"
RUN_AS="${RUN_AS-$([ "$(id -u)" = 0 ] && echo vmovie || echo "")}"
as_app() { if [ -n "$RUN_AS" ]; then runuser -u "$RUN_AS" -- "$@"; else "$@"; fi; }
log() { printf '\033[1m==> %s\033[0m\n' "$*"; }

restart_all() { for s in $SERVICES; do $SYSTEMCTL restart "$s"; done; }
healthy() {
  [ -z "$HEALTH_URL" ] && return 0
  for _ in $(seq 1 "$HEALTH_TIMEOUT"); do
    curl -fsS -m 3 -o /dev/null "$HEALTH_URL" && return 0
    sleep 1
  done
  return 1
}
switch_to() { # atomic: create the new link beside, then rename over the old one
  ln -sfn "$1" "$APP_DIR/current.new" && mv -Tf "$APP_DIR/current.new" "$APP_DIR/current"
}

if [ "${1:-}" = "--rollback" ]; then
  [ -L "$APP_DIR/previous" ] || { echo "no previous release to roll back to" >&2; exit 1; }
  target="$(readlink -f "$APP_DIR/previous")"
  log "rolling back to $(basename "$target")"
  ln -sfn "$(readlink -f "$APP_DIR/current")" "$APP_DIR/previous.new" && mv -Tf "$APP_DIR/previous.new" "$APP_DIR/previous"
  switch_to "$target"
  restart_all
  healthy && log "rollback healthy" || { echo "rollback did not become healthy" >&2; exit 1; }
  exit 0
fi

REF="${1:?usage: release.sh <git-ref> [--migrate] | --rollback}"
MIGRATE=false; [ "${2:-}" = "--migrate" ] && MIGRATE=true
: "${VITE_API_URL:?VITE_API_URL must be the public https origin (it is compiled into the web bundle)}"
mkdir -p "$APP_DIR/releases"
[ -d "$APP_DIR/repo/.git" ] || { echo "$APP_DIR/repo must be a git clone of the repository" >&2; exit 1; }

log "fetching $REF"
as_app git -C "$APP_DIR/repo" fetch --tags --prune origin
SHA="$(as_app git -C "$APP_DIR/repo" rev-parse --verify "$REF^{commit}" 2>/dev/null || as_app git -C "$APP_DIR/repo" rev-parse --verify "origin/$REF^{commit}")"
SHORT="${SHA:0:12}"
# The web bundle contains VITE_API_URL, so the same commit built for another origin is another release.
TAG="$SHORT-$(printf '%s' "$VITE_API_URL" | sha256sum | cut -c1-6)"
RELEASE="$APP_DIR/releases/$TAG"

if [ -d "$RELEASE" ] && [ -f "$RELEASE/.release-complete" ]; then
  log "release $TAG already built"
else
  log "building $TAG (Bun $(bun --version))"
  rm -rf "$RELEASE"; mkdir -p "$RELEASE"; [ -n "$RUN_AS" ] && chown "$RUN_AS" "$RELEASE"
  as_app git -C "$APP_DIR/repo" archive "$SHA" | as_app tar -x -C "$RELEASE"
  (
    cd "$RELEASE"
    export HUSKY=0 TURBO_TELEMETRY_DISABLED=1 DO_NOT_TRACK=1 VITE_API_URL
    as_app env HUSKY=0 TURBO_TELEMETRY_DISABLED=1 DO_NOT_TRACK=1 VITE_API_URL="$VITE_API_URL" bun install --frozen-lockfile
    as_app env HUSKY=0 TURBO_TELEMETRY_DISABLED=1 DO_NOT_TRACK=1 VITE_API_URL="$VITE_API_URL" bun run build --ui=stream
  )
  for f in apps/api/dist/index.js apps/api/dist/workers/index.js apps/api/dist/db/migrate.js apps/web/.output/server/index.mjs; do
    [ -s "$RELEASE/$f" ] || { echo "build artifact missing: $f" >&2; exit 1; }
  done
  as_app touch "$RELEASE/.release-complete"
fi

if $MIGRATE; then
  log "applying migrations (explicit)"
  as_app bash -c "cd '$RELEASE/apps/api' && set -a && . '$ENV_DIR/api.env' && set +a && bun dist/db/migrate.js"
fi

OLD=""; [ -L "$APP_DIR/current" ] && OLD="$(readlink -f "$APP_DIR/current")"
log "switching current -> $TAG"
[ -n "$OLD" ] && [ "$OLD" != "$(readlink -f "$RELEASE")" ] && { ln -sfn "$OLD" "$APP_DIR/previous.new" && mv -Tf "$APP_DIR/previous.new" "$APP_DIR/previous"; }
switch_to "$RELEASE"
restart_all
if healthy; then
  log "healthy"
else
  echo "new release is not healthy" >&2
  if [ -n "$OLD" ]; then log "rolling back to $(basename "$OLD")"; switch_to "$OLD"; restart_all; fi
  exit 1
fi

# Keep the newest $KEEP releases, never the current or previous one.
keep_cur="$(readlink -f "$APP_DIR/current")"; keep_prev="$(readlink -f "$APP_DIR/previous" 2>/dev/null || true)"
ls -1dt "$APP_DIR"/releases/*/ 2>/dev/null | tail -n +$((KEEP + 1)) | while read -r dir; do
  dir="$(readlink -f "$dir")"
  [ "$dir" = "$keep_cur" ] || [ "$dir" = "$keep_prev" ] || { log "removing old release $(basename "$dir")"; rm -rf "$dir"; }
done
log "done: $TAG"
