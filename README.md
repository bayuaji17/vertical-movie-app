# Vertical Movie App

Repository documentation is in [docs/README.md](docs/README.md).

Bun workspaces and Turborepo run two applications:

| Workspace  | Stack          | Development URL         |
| ---------- | -------------- | ----------------------- |
| `apps/api` | Elysia on Bun  | <http://localhost:3001> |
| `apps/web` | TanStack Start | <http://localhost:3000> |

## Getting started

Use Bun 1.4.2 and install dependencies from the repository root:

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

## Git hooks and commit messages

`bun install` activates Husky. Before each commit, the `pre-commit` hook runs `bun run docs:check`, `bun run lint` and `bun run check-types`. The `commit-msg` hook checks the message with Commitlint and the Conventional Commits rules.

Use a message such as `feat(api): add movie endpoint`, `fix(web): correct navigation`, or `chore: configure git hooks`. To check a message without creating a commit:

```sh
echo 'feat(api): add movie endpoint' | bun run lint:commit
```

## Documentation maintenance

Start from [the documentation index](docs/README.md) and follow [root documentation rules](AGENTS.md#documentation-rules). Update canonical category documents and their links in the same change. Run `bun run docs:check` before committing.
