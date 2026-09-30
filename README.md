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
bun run dev
```

`bun run dev` starts both apps. The API uses port 3001 by default; set `PORT` to override it.

## Workspace tasks

Run these commands from the repository root:

```sh
bun run build
bun run check-types
bun run lint
```

Build and type checking cover both apps. Lint currently covers `web`, which provides the only lint script. Turborepo caches the API's `dist` and the web app's `.output` build directories.

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

`bun install` activates Husky. Before each commit, the `pre-commit` hook runs `bun run lint` and `bun run check-types`. The `commit-msg` hook checks the message with Commitlint and the Conventional Commits rules.

Use a message such as `feat(api): add movie endpoint`, `fix(web): correct navigation`, or `chore: configure git hooks`. To check a message without creating a commit:

```sh
echo 'feat(api): add movie endpoint' | bun run lint:commit
```
