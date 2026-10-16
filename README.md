# Vertical Movie App

Repository documentation is in [docs/README.md](docs/README.md).

Bun workspaces and Turborepo run two applications:

| Workspace  | Stack          | Development URL         |
| ---------- | -------------- | ----------------------- |
| `apps/api` | Elysia on Bun  | <http://localhost:3001> |
| `apps/web` | TanStack Start | <http://localhost:3000> |

## Getting started

Use Bun 1.4.3 and install dependencies from the repository root:

```sh
bun install --frozen-lockfile
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
bun run dev
```

Before running auth on a fresh database, apply migrations and provision the admin with the native CLI; for an existing database, follow the staged [Auth operations runbook](docs/operations/auth.md).

Copy the env files once during initial setup; update existing local env files without overwriting their values. See [Environment setup](docs/guides/environment.md) for the active variables and planned integrations.

`bun run dev` starts both apps. The API uses port 3001 and web uses port 3000 by default; set `PORT` in each app's env to override its port.

## Drizzle Studio

Open the local database browser from the repository root:

```sh
bun run db:studio
```

Then visit [Drizzle Studio](https://local.drizzle.studio). It reads the API's local DATABASE_URL and listens on 127.0.0.1:4983 while the command runs. See [Environment setup](docs/guides/environment.md#drizzle-studio).

## Workspace tasks

Run these commands from the repository root:

```sh
bun run build
bun run check-types
bun run lint
bun run docs:check
```

Build covers both apps; type checking also covers `packages/auth`. Lint currently covers `web`, which provides the only lint script. Turborepo caches the API's `dist` and the web app's `.output` build directories.

After building, start both production servers with Bun:

```sh
bun run start
```

The web server listens on port 3000 and the API on port 3001 by default. Use `--filter=api` or `--filter=web` when starting one app for deployment.

To run a single app, use a Turborepo filter:

```sh
bun run dev --filter=api
bun run dev --filter=web
bun run build --filter=api
bun run build --filter=web
```

## Production deployment

The whole stack runs on **Bun 1.4.3** (see `engines.bun`) on a single VPS: PostgreSQL, the API, a separate media worker (FFmpeg), the web server and a reverse proxy. Media storage in production is **Cloudflare R2** (`NODE_ENV=production` rejects MinIO). Two supported paths, both described step by step in the [deployment guide](docs/operations/deployment.md):

| Path           | Files                                                                                                                                          | Summary                                                                                                                                                 |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Docker Compose | [`deploy/docker/`](deploy/docker/) (`Dockerfile`, `compose.yaml`, `Caddyfile`, `.env.example`)                                                 | `oven/bun:1.4.3-debian` images, Caddy with automatic HTTPS, only ports 80/443 are published.                                                            |
| Without Docker | [`deploy/systemd/`](deploy/systemd/), [`deploy/scripts/`](deploy/scripts/), [`deploy/caddy/`](deploy/caddy/), [`deploy/nginx/`](deploy/nginx/) | Bun, FFmpeg and PostgreSQL on the host, systemd services, Caddy or nginx, atomic releases via [`deploy/scripts/release.sh`](deploy/scripts/release.sh). |

Production environment samples (copy, then replace every `CHANGE_ME`; the copies are ignored by Git):

```sh
cp apps/api/.env.production.example apps/api/.env.production   # API and worker
cp apps/web/.env.production.example apps/web/.env.production   # web
cp deploy/docker/.env.example deploy/docker/.env               # Docker Compose only
```

Docker quick start, from `deploy/docker` after editing those files:

```sh
docker compose build
docker compose up -d postgres
docker compose run --rm migrate        # migrations are always an explicit step
docker compose --profile tools run --rm tools bun run --cwd apps/api admin:provision -- you@example.com "Admin"
docker compose up -d
```

`VITE_API_URL` (the public https origin) is compiled into the web bundle, so it must be set when the web image or `bun run build` runs, and must equal `BETTER_AUTH_URL` and `WEB_ORIGIN`. The guide lists what is verified and what is not (HTTPS on a real domain and a real R2 bucket have not been exercised yet).

On a host without Docker, supervisors (systemd) run `bun` directly from the current release instead of `bun run start`; the guide explains why and how the other Bun, Turborepo, Elysia and TanStack Start practices were applied ([section 10](docs/operations/deployment.md#10-praktik-terbaik-bun-turborepo-elysia-dan-tanstack-start)).

## Git hooks and commit messages

`bun install` activates Husky. Before each commit, the `pre-commit` hook runs `bun run docs:check`, `bun run lint` and `bun run check-types`. The `commit-msg` hook checks the message with Commitlint and the Conventional Commits rules.

Use a message such as `feat(api): add movie endpoint`, `fix(web): correct navigation`, or `chore: configure git hooks`. To check a message without creating a commit:

```sh
echo 'feat(api): add movie endpoint' | bun run lint:commit
```

## Documentation maintenance

Start from [the documentation index](docs/README.md) and follow [root documentation rules](AGENTS.md#documentation-rules). Update canonical category documents and their links in the same change. Run `bun run docs:check` before committing.
