# Implementation plan: organisasi hooks web

## Plan metadata

- Status: **executing — scope refactor disetujui pengguna** · 8 Oktober 2026.
- Repository: `bayuaji17/vertical-movie-app`; base ref `chore/public-catalog-plan`.
- Base SHA/last validated SHA: `68a0053d3bc145f07c8bdf14490456436d0973a5`.
- Context: [repository-context.md](repository-context.md), ditulis terlebih dahulu; backlog: [WHOOK-001–003](../../tasks/web-hooks-organization.md).
- User approval: commit/push plan terlebih dahulu, kemudian branch baru untuk merapikan hooks web dengan prefix use. Branch `chore/web-hooks-organization` sudah dibuat dari head plan yang dipush. Tidak meminta persetujuan implementasi ulang untuk scope ini.
- Task commits lokal diotorisasi standing root AGENTS; push refactor/PR/merge/deployment mengikuti instruksi terpisah. Otorisasi push sebelumnya berlaku pada branch plan.

## Objective

Delapan custom React hooks aplikasi berada di `apps/web/src/hooks/use-*.ts`, mudah ditemukan dan tidak bercampur dengan komponen/providers/domain clients.

## Goals and non-goals

Move empat dedicated hook files, extract empat hooks pada mixed modules, update direct consumers dan konvensi root/index. Export `useX`, body hook, context identity, Query/private effects, upload coordinator, mutation recovery dan logout behavior dipertahankan. Pure domain/Query factories/server readers tetap di lib; UI/vendor alias tetap pada source component owner. Tidak menambah barrel, dependency, schema, runtime feature, UI styling, route atau katalog.

## Current behavior

Delapan hooks tersebar dan belum ada folder src/hooks. [Context](repository-context.md#runtime-and-data-flow) mencatat semua definition/callers. Session/theme/logout modules mempunyai fungsi provider/helper/component yang harus tetap dapat digunakan tanpa circular dependency.

## Desired behavior

```text
apps/web/src/
  hooks/
    use-admin-logout.ts
    use-admin-principal.ts
    use-admin-session.ts
    use-content-api.ts
    use-content-editor.ts
    use-publication.ts
    use-theme.ts
    use-upload-manager.ts
  lib/
    admin/  # clients, query factories, controllers, state, utilities
    auth/   # client, session/SSR helpers, context, guards, private effects
    theme/  # context.ts, provider.tsx, preferences.ts
  components/  # presentation/UI/vendor source
  routes/      # route composition
```

Hook function name camelCase useX; file kebab-case use-x.ts, .tsx jika ada JSX. Dedicated files memakai alias `#/lib/...` untuk rebasing; hook-to-hook memakai `#/hooks/...`. `ThemeContext` dipisah ke lib/theme/context.ts agar provider dan useTheme menggunakan satu context tanpa cycle. `AdminSessionContext` tetap existing; logout component memakai type-only hook contract. Tidak meninggalkan compatibility re-export lama yang menduplikasi ownership.

## Impact analysis

Refactor structural dengan risiko import path, circular dependencies dan shared context identity. Algorithm/effect bodies tetap; quality gate dan SSR/import proofs lebih relevan daripada test baru yang hanya mengecek filename. Historical plan/evidence snapshot paths tidak diganti; canonical active ownership dijelaskan pada root AGENTS dan index.

## Affected files and symbols

| Path                                                                                                                                                              | Action | Symbols                                                        | Reason                                   | Evidence                         |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | -------------------------------------------------------------- | ---------------------------------------- | -------------------------------- |
| `apps/web/src/lib/admin/use-{content-api,content-editor,publication,upload-manager}.ts` → `apps/web/src/hooks/use-*.ts`                                           | rename | useContentApi/useContentEditor/usePublication/useUploadManager | Dedicated hook ownership                 | Context hook inventory           |
| `apps/web/src/hooks/use-admin-{session,principal,logout}.ts`, `use-theme.ts`                                                                                      | create | useAdminSession/useAdminPrincipal/useAdminLogout/useTheme      | Extract mixed modules                    | Context mixed boundaries         |
| `apps/web/src/lib/auth/{session.ts,session-context.tsx}`                                                                                                          | modify | pure session helpers/AdminSessionContext                       | Remove hook implementations/imports only | Existing auth imports            |
| `apps/web/src/lib/theme/context.ts`                                                                                                                               | create | ThemeContext                                                   | Shared provider/consumer dependency      | Existing private ThemeContext    |
| `apps/web/src/lib/theme/provider.tsx`                                                                                                                             | modify | ThemeProvider                                                  | Import shared context; hook extracted    | Existing useTheme/provider       |
| `apps/web/src/components/admin/admin-logout.tsx`                                                                                                                  | modify | AdminLogout/type-only useAdminLogout                           | Presentation only                        | Existing shell callsite          |
| `apps/web/src/components/admin/{admin-shell,theme-menu,content-list,content-resource,genre-picker,content-create,content-edit,media-panel,publication-panel}.tsx` | modify | use-hook imports                                               | Direct new imports                       | rg reverse dependencies          |
| `apps/web/src/routes/admin._authenticated{,.index}.tsx`                                                                                                           | modify | session/principal imports                                      | Separate helper/hook imports             | Existing route guard             |
| `AGENTS.md`, `docs/README.md`                                                                                                                                     | modify | Hook naming/ownership/navigation                               | Preserve structure convention            | User instruction/root docs rules |
| This context/plan, `docs/tasks/web-hooks-organization.md`                                                                                                         | modify | Evidence/receipts                                              | Canonical task ledger                    | Root workflow                    |

## Implementation DAG

```text
WHOOK-001 → WHOOK-002 → WHOOK-003
```

## Implementation steps

### WHOOK-001 — Inventaris, context dan plan

- Outcome: scope dan dependency graph berdasarkan source, backlog/index siap.
- Depends on: none.
- Files/symbols: context→plan→task/index; inventory delapan hooks dan provider consumers.
- Requirements: preserve dirty overlays; recorded base SHA; explicit user authorization; remote plan receipt actual.
- Validation: docs:check, scoped Prettier, git diff --check, preservation hashes dan scoped staging.
- Acceptance criteria: trace/targets cukup untuk execution, documentation task committed.

### WHOOK-002 — Move/extract hooks dan update consumers

- Outcome: delapan hooks di src/hooks; provider/context/helpers tetap pada owner; semua imports benar.
- Depends on: WHOOK-001.
- Files/symbols: seluruh source targets pada affected table; root AGENTS konvensi hooks, docs index ownership.
- Requirements: rebase imports; preserve exact hook bodies/module WeakMap, same context identity, no legacy re-export/barrel; no vendor moves/routeTree edits.
- Validation: existing `bun test apps/web/test`, root check-types/lint/build; existing auth import proof lalu final build, built SSR smoke; scoped formatter/docs/diff/preservation. Browser auth cache/routes jika runner tersedia, bukan DB/media reset.
- Acceptance criteria: old custom hook paths tidak lagi referenced pada runtime; hooks names/use-prefix sesuai, lifecycle/runtime proof lulus, task local commit berhasil.

### WHOOK-003 — Closure dan canonical receipts

- Outcome: implemented/verified scope tercatat, task commits/remote plan receipt akurat.
- Depends on: WHOOK-002.
- Files/symbols: task/plan/index status; SHA WHOOK-001/002 dan actual validation results.
- Requirements: actual proof vs historical/production terpisah; unrelated work preserved; tidak mengklaim catalogue implemented.
- Validation: docs:check, scoped Prettier/diff-check, staged-tree links, hooks dan final staged audit. Tidak mengulang runtime checks tanpa source/failure baru.
- Acceptance criteria: receipt dicatat setelah commits; documentation commit berhasil; refactor push tidak otomatis.

## Test requirements

Run existing web suite untuk session/cache/guard/theme/upload/publication/logout dependencies; root types/lint/build untuk source graph. Native auth SSR smoke membuktikan admin/null/user/outage/stall, request isolation dan safe serialized HTML. Import-boundary negative fixture harus restore source, kemudian final build sukses. Browser cache/routes smoke bila runner terkonfigurasi memeriksa logout/theme/session runtime dengan built artifact; jika unavailable catat actual limitation tanpa menganggap proof passed. Tidak menambah test filename-only untuk perubahan reversible ini.

## Constraints

Bun ≥1.4.2; no API/schema/dependency/env/route change. Installed/vendor formats tidak disentuh. Keep AGENTS instructions root dan canonical docs root categories; root task commits dengan ID, no hook bypass. Tidak stage unrelated design/index overlay.

## Acceptance criteria

1. Semua delapan standalone custom hooks berada di src/hooks dan filename/export prefix use konsisten.
2. Semua consumers memakai path baru; pure lib helpers/provider/context tidak mempunyai hook implementation/re-export lama.
3. Shared context identity dan hook behavior/effect/Query lifecycle tidak berubah.
4. Existing relevant tests/types/lint/build/SSR/import dan docs gates lulus; actual limitations dicatat.
5. Task commits scoped dan unrelated files preserved; branch/refactor delivery status akurat.

## Risks and mitigations

Context cycle/dua instance dicegah dengan pure context module. Query coordinator WeakMap dipindah bersama hook tanpa redeclaration pada render. Session SSR helpers tetap di module existing, direct type-only contract dipertahankan. Private effect hooks/body tidak diubah. Dirty index overlay di-stage hanya hunk task; history path pinned tetap history.

## Rollback or recovery

Revert source refactor commit secara normal jika diperlukan; tidak ada migration/data/media rollback. Preserve unrelated work dan plan branch remote yang sudah dipush. Tidak rewrite history atau delete branch.

## Evidence

Source evidence/symbols/base SHA pada [context](repository-context.md#evidence-index). Actual long test evidence/receipts dimiliki [backlog](../../tasks/web-hooks-organization.md); execution history di bawah.

## Open decisions

Tidak ada required product decision untuk scope structural yang diminta. Flat hooks folder dan vendor alias exception merupakan bounded implementation choice. New hooks berikutnya mengikuti konvensi root; katalog tetap draft pada plan terpisah.

## Validation history

8 Oktober 2026: base dan source targets valid; branch baru dibuat sesudah remote plan push terverifikasi. Sebelum source edits, recheck base/current source dan imports. Setelah documentation-only commit, source freshness tetap valid jika relevant diff kosong.

## Execution log

8 Oktober 2026: plan receipt commit `68a0053d3bc145f07c8bdf14490456436d0973a5` dan push `origin/chore/public-catalog-plan` berhasil. `git ls-remote` membuktikan remote head sama. Branch lokal `chore/web-hooks-organization` dibuat dari SHA itu. Context disimpan sebelum plan; source refactor belum dijalankan pada penulisan awal.
