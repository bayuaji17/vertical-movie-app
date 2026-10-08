# Repository context: organisasi hooks web

## Snapshot

- Repository: `bayuaji17/vertical-movie-app`.
- Base ref: `chore/public-catalog-plan`; base SHA: `68a0053d3bc145f07c8bdf14490456436d0973a5`.
- Analyzed at: 8 Oktober 2026, Asia/Jakarta; context status: **current** pada snapshot source.
- Pengguna mengotorisasi commit/push plan terlebih dahulu, lalu branch baru untuk merapikan folder web dengan folder hooks dan prefix use. Push `origin/chore/public-catalog-plan` terverifikasi melalui `git ls-remote` pada base SHA di atas.
- Branch kerja yang sudah dibuat: `chore/web-hooks-organization`, dari head plan yang dipush. Refactor ini tidak mengimplementasikan katalog.
- Context disimpan sebelum [plan](implementation-plan.md); [backlog](../../tasks/web-hooks-organization.md) memakai WHOOK-001–003.

## Product and users

Perubahan struktur source untuk pengembang. Alur pengguna auth, metadata, theme, upload dan publication tetap mengikuti [PRD](../../product/prd.md) dan current code. Tidak ada kebutuhan schema/dependency/env/API baru.

## Repository map

| Subsistem                                                   | Peran/dampak                                                                                 |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `apps/web/`                                                 | Owner hooks, provider/context, domain helpers, routes, komponen dan existing tests.          |
| `apps/api/`                                                 | Public/private API dan worker existing; tidak diubah oleh refactor.                          |
| `packages/auth/`                                            | Client/server/types existing; hook hanya mereuse client/type entry.                          |
| `docs/`                                                     | Context/plan/task/index dan historical evidence; snapshot path historis tetap dipertahankan. |
| `scripts/`                                                  | Docs validator, tidak memerlukan perubahan.                                                  |
| `.agents/`, `.commandcode/`, `skills-lock.json`             | Installed/vendor skills; tidak mengubah vendor component/hook contracts.                     |
| `.husky/`, root manifests/`bun.lock`/`turbo.json`           | Gate docs/lint/types dan runtime/build; konfigurasi tetap.                                   |
| `README.md`, `AGENTS.md`, `LICENSE`, `.gitignore`, `.npmrc` | Quick start/aturan/repo metadata; hanya root AGENTS memerlukan konvensi hooks baru.          |

## Architecture and boundaries

TanStack Start/Router/Query dan Eden type-only dimiliki web. Hook React mengorkestrasi state/effects/queries; client, query factories, controller, utility dan server reader tetap di lib. Context harus menjadi dependency bersama provider/hook tanpa import cycle. Tidak menambah barrel hook yang dapat menarik domain admin/server ke consumer lain.

`src/lib/auth/session.ts` memuat isomorphic readSession, state/Query factories serta useAdminSession; hanya hook dipisah, isomorphic/server boundary tetap. `session-context.tsx` mengekspor AdminSessionContext dan hook principal; context tetap dimiliki auth. `lib/theme/provider.tsx` menyatukan context/provider/useTheme; context dipisah ke `lib/theme/context.ts`, provider dan hook memakai instance yang sama. `components/admin/admin-logout.tsx` menyatukan useAdminLogout dan presentasi; hook dipisah, type-only return contract dipertahankan.

## Runtime and data flow

| Custom hook       | Lokasi awal                             | Pemakai/dependency                                                                    |
| ----------------- | --------------------------------------- | ------------------------------------------------------------------------------------- |
| useContentApi     | `src/lib/admin/use-content-api.ts`      | List/resource/genre picker; QueryClient, principal, content client.                   |
| useContentEditor  | `src/lib/admin/use-content-editor.ts`   | Create/edit; content API, invalidation, dirty state, navigation/toast.                |
| usePublication    | `src/lib/admin/use-publication.ts`      | Publication panel; controller/queries/media inventory/private-effect lifecycle.       |
| useUploadManager  | `src/lib/admin/use-upload-manager.ts`   | Media/publication panels; per-QueryClient coordinator, manager registry/invalidation. |
| useAdminSession   | `src/lib/auth/session.ts`               | Authenticated route; observer/expiry/stop private effects/cache cleanup.              |
| useAdminPrincipal | `src/lib/auth/session-context.tsx`      | Dashboard/shell/media + domain hooks; authorized context required.                    |
| useTheme          | `src/lib/theme/provider.tsx`            | Theme menu; provider/context instance identity.                                       |
| useAdminLogout    | `src/components/admin/admin-logout.tsx` | Admin shell; native signOut, stop effects, cache clear, toast/router.                 |

Target delapan `src/hooks/use-*.ts`, direct imports dengan alias `#/hooks/...`. Empat dedicated files hanya dipindah/import rebased; empat mixed modules diekstrak tanpa mengubah body hook. Module-level coordinator WeakMap ikut hook yang sama, bukan dibuat ulang per render.

`components/ui/toast.tsx:useToastManager` adalah alias Base UI component API, bukan standalone custom hook buatan aplikasi. Video.js skin/source dan third-party hooks tetap pada owner vendor. Local `useCrop` dalam dialog adalah event handler, bukan custom React hook exported; tidak dipindah sebagai hook. Tidak merombak folder lain tanpa kebutuhan dependency refactor.

## Domain and data model

Tidak ada perubahan database/DTO/status/lifecycle. Auth context dan theme context harus sama bagi provider/consumer; request-private Query scope dan effect cancellation/upload/publication intents tetap sama. Nama exported hook tetap camelCase `useX`; nama file kebab-case `use-x.ts`, `.tsx` hanya bila JSX diperlukan.

## External integrations

Tidak ada dependency/integrasi baru. Better Auth client, Query dan Router existing tetap dipakai. Bun build/SSR smoke dan existing browser runner merupakan bukti import/runtime; tidak menjalankan destructive DB/storage suite untuk file moves murni.

## Development, testing, and delivery

Root Bun 1.4.2, path lokal `/home/bandev/.bun/bin` bila PATH belum tersedia. Web existing Bun tests berada di apps/web/test; hook consumers diverifikasi lewat types/lint/build dan existing auth SSR/import proof. Root gates wajib: relevant tests, check-types, lint, build, docs:check/scoped Prettier/diff-check. Hook commit menjalankan docs/lint/types/Commitlint.

## Constraints and conventions

Ikuti [root AGENTS](../../../AGENTS.md), [workflow](../../guides/development-workflow.md) dan [template task](../../templates/task.md). Tidak hand-edit routeTree atau perubahan preset/components, env/dependency/schema. Hook naming/ownership baru dicatat di root AGENTS sesuai instruksi pengguna. Tidak memasukkan generated caches/artifacts atau secrets dalam commit.

## Relevant active work

23 dirty files sebelum delivery plan berasal dari index/desain/web-build unrelated dan dipertahankan dengan hash. Receipt plan yang diminta sudah di-commit pada `68a0053` lalu dipush; branch refactor membawa plan sebagai base. Index mempunyai local overlay desain: stage hanya hunk refactor/owner index. Historical docs mencantumkan path use-hook lama pada snapshot/date; tidak blanket-replace history.

## Exploration coverage

Read root docs index/workflow/instructions, app/package scripts/hooks, source tree dan semua useX definitions/imports/callers, mixed provider/session/logout modules, pure domain helpers, lint config dan auth/theme/query/SSR/import/browser tests. Backend/database/vendor implementation sengaja tidak diubah; scope struktural cukup diverifikasi existing gates dan targeted runtime proofs.

## Unknowns and assumptions

Folder yang dimaksud pengguna ditafsirkan `apps/web/src/hooks`, konsisten ownership source alias `#/*`. File prefix `use-` dan exported function `useX`; flat folder cukup untuk delapan hooks. Vendor hook APIs tetap pada komponen generated; tidak ada keputusan produk yang memerlukan approval baru untuk refactor ini.

## Evidence index

Semua source berikut dibaca pada base SHA di atas.

| Evidence                                                                                                                                   | Fakta                                                                          |
| ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| `apps/web/src/lib/admin/use-{content-api,content-editor,publication,upload-manager}.ts`                                                    | Empat dedicated hook modules dan per-cache coordinator/intent/effect behavior. |
| `apps/web/src/lib/auth/{session.ts,session-context.tsx}`                                                                                   | Session hook mixed dengan Query/SSR functions; principal/context identity.     |
| `apps/web/src/lib/theme/{provider.tsx,preferences.ts}`                                                                                     | Shared context, System/storage/theme effects dan useTheme.                     |
| `apps/web/src/components/admin/{admin-logout,admin-shell,theme-menu}.tsx`                                                                  | Hook/component mixing dan public hook callers.                                 |
| `apps/web/src/components/admin/{content-list,content-resource,genre-picker,content-create,content-edit,media-panel,publication-panel}.tsx` | Direct hook dependencies yang perlu import rewrite.                            |
| `apps/web/src/routes/admin._authenticated{,.index}.tsx`                                                                                    | Session/Principal consumer dan SSR/layout guards.                              |
| `apps/web/test/{session-cache.test.ts,admin-theme.test.ts,auth-ssr-smoke.mjs,auth-import-boundary-proof.mjs,auth-browser-smoke.mjs}`       | Existing behavioral/type/runtime proof owners.                                 |
| `apps/web/src/components/ui/toast.tsx`, `components/videojs/`, `components/admin/cover-crop-dialog.tsx`                                    | Vendor alias/component ownership dan local handler exception.                  |
| `apps/web/package.json`, root manifests/hooks, `apps/web/eslint.config.js`                                                                 | Scripts/checks dan generated/source boundaries.                                |

## Validation history

8 Oktober 2026: base/ref/source verified; branch plan remote head sama dengan local SHA; source clean sebelum refactor. Context written before plan. Pending implementation harus recheck relevant source sebelum moves.
