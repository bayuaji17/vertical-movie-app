# Repository context: Site Settings

## Snapshot

- Repository: `bayuaji17/vertical-movie-app`.
- Base ref: `main`; base SHA: `36f185e275bc90fa609cf071405848ff021c3223`.
- Analyzed at: 2026-10-09T00:55:35Z (9 Oktober 2026, Asia/Jakarta).
- Context status: current at the pinned snapshot; recheck before implementation.
- Planning branch: `chore/site-settings-plan`.
- Request: pengguna meminta plan sesudah menerima pendekatan empat field teks dan meminta cache frontend/backend agar reads tidak selalu ke database. Detailed validation/defaults/recovery below remain proposals until plan approval.

## Product and users

Admin tunggal mengelola identitas situs melalui form privat. Pengunjung memperoleh branding dan metadata publik tanpa login. PRD-02 menyisakan konfigurasi situs; field/validasi masih keputusan terbuka pada [PRD](../../product/prd.md#keputusan-produk-yang-masih-terbuka). GR-01/02/05/07/08 melandasi authorization, public access, recovery, whitelisting dan aksesibilitas pada [global rules](../../product/global-rules.md#aturan-produk-lintas-fitur).

Observed: ringkasan dashboard sudah masuk main melalui PR #15. Settings belum merupakan runtime feature; tidak ada tabel, module atau halaman settings aplikasi pada tree SHA ini. Player settings menus merupakan kontrol playback, bukan Site Settings.

## Repository map

| Subsystem                                       | Role and ownership                                                                                        |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `apps/api/`                                     | Elysia HTTP, business services, Bun SQL/Drizzle, storage, durable jobs and worker. Settings belongs here. |
| `apps/web/`                                     | TanStack Start SSR/router, React/Query, same-origin gateways and admin/public UI.                         |
| `packages/auth/`                                | Better Auth server/client/types; current guard and session boundary reused unchanged.                     |
| `docs/`                                         | Canonical specs, guides, runbooks, plans and module task evidence.                                        |
| `scripts/`                                      | Documentation validation.                                                                                 |
| `.agents/`, `.commandcode/`, `skills-lock.json` | Installed repository skills and links.                                                                    |
| `.husky/`, root manifests/config                | Conventional Commit hooks, Bun workspace, Turbo tasks.                                                    |

No tracked `.github/` workflow at this snapshot; local gates do not establish hosted CI or production proof.

## Architecture and boundaries

`apps/api/src/app.ts:createApp` statically composes chained modules before OpenAPI; `src/index.ts` constructs services once and injects the existing database. `src/db/client.ts:createDatabase` owns one Bun SQL pool and Drizzle schema. Add settings dependencies to that composition, without importing the listening bootstrap into tests or sharing server configuration with web.

Private endpoints use `src/modules/auth/admin/guard.ts:createRequireAdmin`: native session lookup with `disableCookieCache:true`, expiry/role/ban checks, private no-store. Public settings must use a separate public route scope; reuse a domain snapshot, not cached authorization. Session queries can still access the DB; reducing settings SELECTs must not weaken authorization.

`apps/web/src/lib/server/auth-gateway.ts:createAuthGateway` handles both auth and business routing. It has exact special-path admission plus GET-only public cases, strips cookies/authorization for public upstream requests, and enforces same-origin writes. There is no separate `public-gateway.ts`; adding settings to an imagined gateway would leave actual requests blocked. New exact paths/methods require gateway tests.

Business clients use Eden with type-only `api/types`; auth ownership remains `@repo/auth`. Public DTOs must omit private audit fields. No shared package is required just for four settings fields: API inferred types plus web runtime DTO validation match existing ownership.

## Runtime and data flow

Observed cache: `apps/api/src/modules/catalog/service.ts:CatalogService.entry/invalidate/freshness` keeps bounded in-process unsigned metadata, TTL60 seconds, generation fencing, remaining `freshForMs`. It does not coalesce concurrent misses. Reuse the contract ideas, add single-flight in settings, and avoid broad changes to catalog behavior.

Observed web: `src/router.tsx:getRouter` calls `integrations/tanstack-query/root-provider.tsx:getContext`, which creates a new QueryClient, then installs SSR integration. `lib/public/catalog-reader.ts` splits server-only internal reads from browser same-origin transport; query factories compute freshness from response deadlines. A settings query can be shared within that router/request and safely hydrated because its public projection contains only permitted text/version/freshness.

Private dashboard queries use `['admin', identity, ...]`, browser-only reads and `registerPrivateEffect`. `lib/auth/session-cache.ts` cancels/removes admin queries and mutations on auth loss. Settings admin queries and editor effects must remain in that cleanup boundary; public settings are separate.

## Domain and data model

`src/db/schema/index.ts` currently exports auth, hierarchy, genre, media/upload/jobs/operations tables. No site settings table exists. Drizzle journal ends at `0010_poster-execution-mode`; inspect the live journal before generating an additive migration, do not guess or hand-edit a future sequence.

Proposal: one settings row, four normalized plain-text fields, monotonic row version and update timestamp. Conditional expected-version save follows existing content conflict conventions. Migration inserts initial values and preserves existing auth/content/media records. The exact contract/defaults belong to the [implementation plan](implementation-plan.md#desired-behavior).

## Public presentation integration

| Evidence path/symbol                                                                                    | Observed behavior and implication                                                                                                                                                             |
| ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web/src/components/public/public-shell.tsx:PublicShell`                                           | Main homepage/detail/watch shell hardcodes Vertical Movie and footer “Stories made for portrait.”                                                                                             |
| `apps/web/src/components/public/catalog-browser.tsx:CatalogBrowser`                                     | Current homepage hardcodes “Find your next story.”; type-filter/list behavior should stay intact.                                                                                             |
| `apps/web/src/components/catalog/public-shell.tsx:PublicShell`, `home-page.tsx`                         | Existing catalog shell/home-page used by other content paths has its own hardcoded brand/tagline/footer; settings must cover both live shells.                                                |
| `apps/web/src/routes/index.tsx:Route`                                                                   | Homepage loader owns catalog and SSR status; title/description and robots noindex are currently explicit. Settings failure must not overwrite catalog HTTP404/503 or robots policy.           |
| `apps/web/src/routes/videos.$slug.tsx`, `watch.$slug.tsx`, `titles.$kind.$slug.tsx`, `series.$slug.tsx` | Public routes have fixed branding in titles; preserve content-specific behavior and incorporate settings brand.                                                                               |
| `apps/web/src/routes/__root.tsx:Route/RootDocument`                                                     | Root fallback title is still TanStack Start Starter; root owns global head/QueryClient context. Public settings bootstrap can supply safe fallback branding without reading private settings. |
| `apps/web/src/components/admin/admin-shell.tsx:AdminShell`                                              | Dashboard/Content navigation only; add Settings entry using the existing responsive shell.                                                                                                    |

## External integrations

This scope requires only existing PostgreSQL/auth/internal API. Plain-text settings need no S3/MinIO/R2/FFmpeg, Redis, new credentials or dependency. Media/cache/player semantics remain their existing contracts. In-memory settings cache is per API process; cross-instance invalidation is a future rollout decision, not a promised capability.

## Development, testing and delivery

Read [API development](../../guides/api-development.md), [workflow](../../guides/development-workflow.md), [environment](../../guides/environment.md), [metadata runbook](../../operations/video-metadata.md) and [task template](../../templates/task.md). API manifests provide native `bun test ./src`, root gates cover types both apps/auth, lint web, and both builds. Database migration uses `bun run --cwd apps/api db:migrate`; no generic `test:integration` script exists.

Existing integration harness `apps/api/test/integration/content-fixture.ts:resetContentDatabase` guards dedicated content-test DB; dashboard proof demonstrates real SQL query counting and native cookie authorization. Web `test/auth-browser-smoke.mjs` dispatches built/dev browser phases; public catalog and dashboard workers provide viewport/theme/late-response patterns. New proofs must be serial where they share a resettable database.

This planning turn runs docs/format/diff and preservation checks only, plus normal commit hooks; future migration/runtime/browser commands are requirements, not completed evidence. Local per-task commits are user-authorized by AGENTS; push/PR/merge/deployment require their own authorization.

## Constraints and conventions

Root docs categories and lowercase kebab-case; use `hooks/use-*.ts` direct imports; no generated route-tree edits; Bun native APIs and injected dependencies; no secrets/body logs; static Elysia chaining and explicit admin scope; tests beside API modules and real dependency tests in integration suite. Do not overwrite dirty editor values on refetch or retry mutations automatically. Existing Rhea UI semantic tokens and English labels guide the settings form; mockups are not runtime proof.

## Relevant active work

23 unrelated local paths pre-exist: tracked design-system/index/web-build documentation and 19 untracked design artifacts/scripts/backlog. Preserve 22 non-index paths byte-for-byte and the existing three README overlays; stage only the new plan/context/backlog plus the owned index addition. Runtime analysis uses pinned Git code; uncommitted design docs are local design context, not claimed main content.

## Exploration coverage

Inspected root tree/instructions/docs index/product/workflow/API guide, all three manifests, API composition/pool/migration/schema journal/guard/catalog cache, web router/SSR/query factories/private cleanup/gateway, both public shells/current homepage and public route head targets, admin shell/editor, and SQL/browser proof harnesses. Worker/storage internals intentionally excluded because settings is text-only and those modules do not participate in the new read/write path. No env secrets or production resources inspected.

## Unknowns and assumptions

- User accepted the four-field/cache direction and requested this plan on 9 October 2026; proposed field lengths/defaults, fresh-read recovery and UI details await detailed plan approval.
- API process count and production topology are not fixed. Single-process prime is immediate; other processes converge via TTL/refetch. Open idle pages have no live-update deadline without refetch.
- Bun SQL/Drizzle compatibility already exists; singleton/check/CAS details must be proved on real PostgreSQL.
- SSR metadata updates and prevention of duplicate hydration reads require the installed TanStack APIs and actual built-browser proof, not assumptions from other library versions.

## Evidence index

All code observations above are pinned to `36f185e275bc90fa609cf071405848ff021c3223`; links lead to canonical owners or implementation symbols, not claimed future source.

| Claim                                         | Source at snapshot                                                                                                                                                                           |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Settings is outstanding, field selection open | `docs/product/prd.md:PRD-02`, open decision2; `docs/architecture/overview.md` route table and missing-settings note                                                                          |
| Native DB and additive migrations             | `apps/api/src/db/client.ts`, `schema/index.ts`, `db/migrate.ts:applyDatabaseMigrations`, `drizzle.config.ts`, `drizzle/meta/_journal.json`                                                   |
| Cache TTL/fencing/remaining freshness         | `apps/api/src/modules/catalog/service.ts:entry/invalidate/freshness`, `home-service.test.ts`, `content.test.ts`                                                                              |
| Exact proxy/private/public boundaries         | `apps/web/src/lib/server/auth-gateway.ts:createAuthGateway`, `apps/web/test/auth-gateway.test.ts`                                                                                            |
| Query ownership/SSR/auth cleanup              | `apps/web/src/router.tsx:getRouter`, `integrations/tanstack-query/root-provider.tsx:getContext`, `lib/public/catalog-queries.ts`, `lib/auth/session-cache.ts`, `lib/auth/private-effects.ts` |
| Real SQL/browser proof templates              | `apps/api/test/integration/{content-fixture,admin-dashboard-proof.test}.ts`, `apps/web/test/{auth-browser-smoke,public-film-catalog-browser-worker,admin-dashboard-browser-worker}.mjs`      |

Context saved before plan creation. Current implementation and validation contract follow in [implementation-plan.md](implementation-plan.md).
