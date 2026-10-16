# syntax=docker/dockerfile:1.7
#
# One Dockerfile for every runtime image. Bun is the runtime everywhere.
#   docker build -f deploy/docker/Dockerfile --target api    -t vertical-movie-api .
#   docker build -f deploy/docker/Dockerfile --target worker -t vertical-movie-worker .
#   docker build -f deploy/docker/Dockerfile --target web --build-arg VITE_API_URL=https://movies.example.com -t vertical-movie-web .
#   docker build -f deploy/docker/Dockerfile --target tools  -t vertical-movie-tools .
# Normally you use deploy/docker/compose.yaml, which passes these for you.
ARG BUN_VERSION=1.4.3

# ---- dependencies (cached until a manifest or the lockfile changes) ----------
FROM oven/bun:${BUN_VERSION}-debian AS deps
WORKDIR /repo
ENV HUSKY=0 TURBO_TELEMETRY_DISABLED=1 DO_NOT_TRACK=1
COPY package.json bun.lock turbo.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/auth/package.json packages/auth/package.json
COPY packages/log/package.json packages/log/package.json
RUN bun install --frozen-lockfile

# ---- build both apps ----------------------------------------------------------
FROM deps AS build
COPY . .
# VITE_* values are compiled into the browser bundle: this must be the public origin.
ARG VITE_API_URL
RUN test -n "$VITE_API_URL" || (echo "VITE_API_URL build arg is required (public https origin)" && exit 1)
ENV VITE_API_URL=$VITE_API_URL
RUN bun run build

# ---- operator tools: migrations and admin provisioning need the full workspace --
FROM build AS tools
# Read-only use: the tools only read the workspace, so no (large) chown layer is needed.
ENV NODE_ENV=production
USER bun
WORKDIR /repo
CMD ["bun", "--version"]

# ---- API ----------------------------------------------------------------------
FROM oven/bun:${BUN_VERSION}-debian AS api
ENV NODE_ENV=production PORT=3001
WORKDIR /app/apps/api
COPY --from=build --chown=bun:bun /repo/apps/api/dist ./dist
COPY --from=build --chown=bun:bun /repo/apps/api/drizzle ./drizzle
USER bun
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["bun", "-e", "fetch('http://127.0.0.1:'+(process.env.PORT||3001)+'/').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"]
CMD ["bun", "dist/index.js"]

# ---- media worker (adds FFmpeg) ------------------------------------------------
FROM api AS worker
USER root
RUN apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg \
 && rm -rf /var/lib/apt/lists/* \
 && mkdir -p /var/tmp/vertical-movie-worker \
 && chown bun:bun /var/tmp/vertical-movie-worker
USER bun
# The worker has no HTTP port; the API health check does not apply.
HEALTHCHECK NONE
CMD ["bun", "dist/workers/index.js"]

# ---- web (TanStack Start on Nitro, run by Bun) ---------------------------------
FROM oven/bun:${BUN_VERSION}-debian AS web
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000
WORKDIR /app
COPY --from=build --chown=bun:bun /repo/apps/web/.output ./.output
USER bun
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["bun", "-e", "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/admin/login').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"]
CMD ["bun", ".output/server/index.mjs"]
