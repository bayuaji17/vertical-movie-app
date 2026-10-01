# Repository instructions

This is a Bun workspace with two apps: `apps/api` (Elysia) and `apps/web` (TanStack Start), plus shared packages under `packages/`. Keep repository instructions in this root `AGENTS.md` and project documentation under the root `docs/` directory. Read `docs/README.md` and the relevant app's source and package scripts before changing behavior.

- Use Bun for installs, scripts, builds, and production runtime. The root `package.json` declares the required Bun version. Run workspace tasks from the repository root with `bun run dev`, `bun run build`, `bun run check-types`, and `bun run lint`; filter with `--filter=api` or `--filter=web` when appropriate.
- Prefer Bun native APIs when they meet the requirement and work with the chosen stack. For PostgreSQL with Drizzle, evaluate the Bun SQL driver; for Cloudflare R2 or S3-compatible media storage, evaluate Bun's native S3 client. Verify compatibility before adding an alternative dependency.
- Use PostgreSQL for the durable media job queue and FFmpeg for transcoding. Keep worker code in `apps/api` and run FFmpeg through a Bun subprocess outside HTTP requests and database transactions.
- Keep API code in `apps/api` and web code in `apps/web`. Add shared packages only when both apps actually need shared code. Do not hand-edit `apps/web/src/routeTree.gen.ts`.
- For API work, read and follow `docs/API_DEVELOPMENT.md`: use Eden Treaty with a type-only API contract, preserve Elysia method chaining and inferred route types, respect lifecycle order and plugin scope, and apply admin authorization only to private routes. Keep handlers separate from domain logic and infrastructure dependencies explicit. Create the documented target folders only as their module tasks need them.
- Use Bun's native `bun:test` and `bun test` for API unit tests. Keep behavior tests beside their modules, inject external dependencies, and test Elysia HTTP behavior through `app.handle(new Request(...))` without opening a port. Keep tests requiring real PostgreSQL/storage/FFmpeg in the separate integration suite described in `docs/API_DEVELOPMENT.md`.
- Better Auth is owned by `packages/auth` (`@repo/auth`). API code imports `@repo/auth/server`, web code imports `@repo/auth/client`, and shared types use `import type` from `@repo/auth/types`. Keep server configuration and secrets out of the client entry point.
- Follow the Agile workflow in `docs/GLOBAL_WORKFLOW.md`: break modules into user stories and small tasks with acceptance criteria, dependencies, and validation evidence. Use `docs/TASK_TEMPLATE.md` when documenting a module's backlog under `docs/tasks/`.
- Keep env samples in `apps/api/.env.example` and `apps/web/.env.example`; document active and planned variables in `docs/ENVIRONMENT.md`. Local env files are ignored. Only public configuration uses `VITE_*`; database, auth secrets, and storage credentials belong to API configuration.
- Keep repository skills in the root `.agents/skills/`, agent symlinks in the root `.commandcode/skills/`, and installation metadata in the root `skills-lock.json`. Run each skill's application commands from the app that owns the relevant configuration.
- Use the installed `videojs` skill when working on video or audio in this project. For version-matched installation instructions, run `bunx --bun @videojs/cli agents init --method shadcn --framework react` from `apps/web`; use `--framework html` for plain HTML. The command only prints instructions. Read the skill and the installed player's bundled docs before implementing or changing playback.
- `bun run check-types` covers both apps and `@repo/auth`; `bun run build` builds both apps. The auth package exports TypeScript source directly, so its consumers compile it without a separate package build. `bun run lint` currently covers only `web`, because the API and auth package have no lint script. After changing scripts or package dependencies, run `bun install --frozen-lockfile` and the relevant checks.
- Husky runs lint and type checks before commits; Commitlint checks Conventional Commits messages in `commit-msg`. Preserve existing worktree changes and keep generated `dist/`, `.output/`, and `.turbo/` files out of commits.
- Update `docs/README.md` when repository structure, runtime commands, or documentation ownership changes. Put new project documentation in the root `docs/` folder rather than creating app-specific docs folders.

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->
