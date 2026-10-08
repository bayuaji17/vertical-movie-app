# Implementation plan: admin Series, season dan episode

## Plan metadata

- Status: executing modul; ASER-001–009 selesai lokal; proof terpadu dan closure mengikuti task.
- Tanggal: 2026-10-08; pengguna memilih modul ini setelah meminta lanjut task berikutnya.
- Repository: `bayuaji17/vertical-movie-app`; base ref `main`.
- Base SHA dan last validated SHA: `04b098bef9d210c1670f3a29c375208ef36805b9`.
- Context: [repository-context.md](repository-context.md), disimpan sebelum plan.
- Backlog: [admin-series-episodes](../../tasks/admin-series-episodes.md); branch `feat/admin-series-episodes`.
- Eksekusi pertama ASER-001/002: refinement lalu fondasi typed client/query. UI/upload/publication mempunyai task dan evidence tersendiri; pemilihan modul tidak dianggap sebagai approval desain raster atau production.

## Objective

Melengkapi alur admin Series → season → episode melalui dashboard sampai episode siap/published dan Series published, menggunakan hierarchy/media/publication existing dengan version, cancellation dan recovery yang aman.

## Goals and non-goals

Dalam scope: list/create/edit season, list/create/detail/edit episode, source+cover upload episode, preview, manual publish episode/Series, archive episode, private query ownership dan proof lintas API/DB/browser. Iterasi pertama menyelesaikan kontrak client/query tanpa mengubah tampilan existing.

Parent archive hanya mengikuti capability API existing: Series published tidak mempunyai archive UI; season yang mempunyai episode published tidak diarchive. Restore/republish, unpublish, cascade/hard delete, perubahan grouping setelah first publish, penggantian source published, homepage discovery Series, subtitle, settings, bulk commands, global job monitor, dependency upgrade dan deployment merupakan scope terpisah.

## Current behavior

API hierarchy, episode upload/preview/publish dan Series publish tersedia. Web hanya membuat/edit metadata top-level dan menampilkan seasons read-only. Episode tidak mempunyai entry route sendiri atau media/publication panel. Series cover tersedia tetapi GET publication readiness Series belum ada. Lihat trace dan batas lifecycle di [context](repository-context.md#runtime-and-data-flow).

## Desired behavior

Admin masuk melalui detail Series existing, memilih season, melihat episode dengan cursor20/manual Load more, membuat season/episode dan menyimpan metadata dengan expectedVersion milik record. Series create tetap menghasilkan Season 1 di server. Episode memakai route/type sendiri, bukan Film alias. Back menyimpan Series/season context; query key menyertakan session dan owner/filter.

Forms mengikuti English admin shell Light/Dark/System, mobile-first, 44px controls, dirty navigation guard, explicit conflict reload dan preserved input. Loading/empty/error/stale/offline tidak dianggap success; double submit ditahan, mutation tidak retry otomatis. Keputusan route/form-state rinci pada ASER-003 sebelum UI.

Episode upload memakai policy512MB/600s dan video owner UUID. HLS Preview existing/manual acknowledgement digunakan kembali. Episode published pada Series draft diberi penjelasan belum publik; Series publish hanya aktif setelah server readiness lengkap. Uncertain write diperiksa dengan GET, tanpa otomatis mengubah version atau membuat intent baru.

## Impact analysis

Web merupakan owner utama gap. API extension hanya shared Series readiness dan GET privat beserta parity proof; schema/dependency baru tidak diperlukan menurut snapshot. Jika implementasi menemukan kebutuhan migration, refine task/gates sebelum mengubah schema. Existing public Film/Standalone, Series detail/Next/watch, private auth cleanup, uploader dan Film publication menjadi regression surface.

## Affected files and symbols

| Path                                                                                                         | Action        | Symbols/reason                                                         | Evidence                                         |
| ------------------------------------------------------------------------------------------------------------ | ------------- | ---------------------------------------------------------------------- | ------------------------------------------------ |
| `apps/web/src/lib/admin/series-client.ts`                                                                    | create        | Eden season/episode CRUD, scoped response confirmation                 | Series/Video models dan content client           |
| `apps/web/src/lib/admin/series-queries.ts`                                                                   | create        | Identity/owner/filter keys, cursor20, explicit invalidation            | content/media/publication queries, session-cache |
| `apps/web/test/admin-series-client.test.ts`, `admin-series-queries.test.ts`, `admin-series-eden-contract.ts` | create        | Native transport/cache/error/compile proof                             | admin content tests                              |
| `apps/web/src/components/admin/content-detail.tsx`                                                           | modify        | Entry hierarchy dari Series; Episode tidak memakai Film alias          | `ContentDetailView`                              |
| `apps/web/src/components/admin/series-*.tsx`, `episode-*.tsx`                                                | create        | Season editor/list dan episode forms/detail                            | Existing ContentForm/resource/dirty guard        |
| `apps/web/src/hooks/use-series-editor.ts`                                                                    | create        | UI owner/session cancellation dan guarded save/invalidation            | `use-content-editor`, private-effects            |
| `apps/web/src/routes/admin._authenticated.series.*.tsx`                                                      | create        | Nested authenticated metadata routes; final route spec ASER-003        | existing admin routes                            |
| `apps/web/src/components/admin/media-panel.tsx`, `publication-panel.tsx`                                     | modify        | Reuse typed video-owner media/publication tanpa mengubah Film behavior | OwnerMediaPanel, VideoPublicationMedia           |
| `apps/api/src/modules/publication/{readiness,model,service,index}.ts`                                        | modify        | Series read-only readiness, predicate parity dengan POST               | Series branch PublicationService.publish         |
| `apps/web/src/lib/admin/publication-{client,queries,state}.ts`                                               | modify        | Series owner intent/keys/recovery                                      | Existing video publication controller            |
| `apps/api/src/modules/publication/*.test.ts`, `apps/api/test/integration/admin-series-proof.test.ts`         | create/modify | Readiness guard/schema/parity dan SQL race proof                       | media-series/publication proofs                  |
| `apps/web/test/auth-browser-smoke.mjs`, `admin-series-browser-worker.mjs`                                    | modify/create | Built hierarchy/upload/publish recovery journeys                       | Existing browser harness                         |
| `docs/product/prd.md`, `docs/architecture/overview.md`, `docs/operations/media.md`, `docs/README.md`         | modify        | Current contracts, entry routes dan evidence links setelah verified    | Canonical docs                                   |

`routeTree.gen.ts` hanya digenerate tooling. Folder/file future dibuat hanya saat task pemiliknya berjalan; glob di atas merupakan candidate impact set yang direcheck setiap task.

## Implementation DAG

```text
ASER-001 → ASER-002 → ASER-003 → ASER-004 → ASER-005 → ASER-006
ASER-001 → ASER-007 → ASER-008
ASER-006 + ASER-008 → ASER-009
ASER-007 + ASER-009 → ASER-010 → ASER-011 → ASER-012
```

## Implementation steps

### ASER-001 — Context, contracts dan backlog

- Outcome: snapshot, impact dan bounded task sequence reviewable.
- Depends on: none.
- Files/symbols: feature context/plan, module backlog dan docs index.
- Requirements: catat user choice, backend parent lifecycle, UI gaps dan preservation; pisahkan facts dari future work.
- Validation: docs:check, scoped Prettier, diff check, staged-only preservation dan normal hooks.
- Acceptance criteria: context tersimpan sebelum plan; dependencies/AC/evidence per task tersedia; commit task berhasil.

### ASER-002 — Private season/episode client dan queries

- Outcome: fondasi typed transport/read/write untuk hierarchy.
- Depends on: ASER-001.
- Files/symbols: `series-client.ts`, `series-queries.ts`, tiga file test ASER di impact map.
- Requirements: season list/create/patch; episode list/detail/create/patch; version/UUID/grouping confirmation, signals, finite cursor20, session-scoped keys, no optimistic success/no retry, cleanup401 dan scoped invalidation. Archive/publication client menyusul task publication, sehingga tidak memperluas policy parent.
- Validation: injected-fetch behavior tests, QueryClient isolation/cancellation/invalidation, Eden compile positive/negative, relevant regressions dan root gates.
- Acceptance criteria: wrong-kind/owner/version/malformed2xx ditolak; HTTP/network/abort tetap dibedakan; uncertain POST dikirim satu kali; no route/UI/auth behavior change.

### ASER-003 — Editor route dan state specification

- Outcome: UX contract konkret memakai admin design existing.
- Depends on: ASER-002.
- Files/symbols: `docs/design/admin-series-episodes.md`, plan/backlog/index.
- Requirements: route/Back context, active/archived season states, long list, inherited genre, immutable grouping, dirty/conflict/offline/loading/retry dan focus/mobile behavior; no duplicate Season1. State specification dibedakan dari runtime proof.
- Validation: every UI requirement mapped to task/browser assertion; docs/format/diff/hook.
- Acceptance criteria: source targets dan routes ditetapkan sebelum komponen; keputusan produk baru bila ada ditandai terbuka.

### ASER-004 — Season list/create/edit

- Outcome: admin memilih dan menyimpan season di Series aktif.
- Depends on: ASER-003.
- Files/symbols: Series detail entry, season components/routes, `use-series-editor.ts`.
- Requirements: unique positive number/release validation, record version, no auto numbering guarantee, stale/duplicate/archived errors dengan input preserved; scoped cancellation dan dirty guard.
- Validation: form/client tests, real metadata persistence/browser and root gates.
- Acceptance criteria: create/edit/refetch/Back bekerja; published parent aktif mengikuti API, archived parent menolak; latest-intent/late-session data tidak tampil ke owner lain.

### ASER-005 — Episode list/create/detail/edit

- Outcome: episode metadata workflow terpisah dari Film.
- Depends on: ASER-004.
- Files/symbols: episode routes/forms/list/detail, queries dan controller.
- Requirements: season-scoped cursor20/manual load, title/number/slug/rights/genre inheritance, grouping sebelum first publish sesuai API, canonical parent Back, no published metadata revision.
- Validation: duplicate/stale/404/422, paging/owner switch/dirty/long copy; metadata SQL/browser dan root gates.
- Acceptance criteria: stored episode muncul di season yang benar; Film/Standalone existing tidak menjadi route alias episode.

### ASER-006 — Episode upload dan Preview

- Outcome: source/cover episode diproses dan HLS dipreview.
- Depends on: ASER-005.
- Files/symbols: Episode detail, media panel/inventory/owner adapters dan Preview navigation.
- Requirements: episode600s/512MB policy, same video owner, resume/crop/processing/failure recovery existing, owner-switch cancellation dan no autoplay.
- Validation: real guarded MinIO/FFmpeg/browser with interruption/reselection/invalid source and root gates.
- Acceptance criteria: HLS+cover readiness ditampilkan jujur; successful upload tidak auto-publish; source integrity/preservation sesuai policy.

### ASER-007 — Authoritative Series readiness API

- Outcome: GET privat Series readiness dan POST memakai shared assessment.
- Depends on: ASER-001.
- Files/symbols: publication model/readiness/service/routes/tests.
- Requirements: active draft/version, title/synopsis, no active upload, current verified cover dan published playable child; unsigned no-store response; lifecycle parent unchanged.
- Validation: app.handle guard/422/404/503/no-store, injected evidence unit, real SQL generation/child/archive parity; root gates.
- Acceptance criteria: GET tidak mutasi dan tidak menghasilkan signing; reason codes cover POST gates; concurrent state tetap dicek di transaction POST.

### ASER-008 — Series publication client/controller

- Outcome: typed Series intent/readiness dan reconciliation.
- Depends on: ASER-007.
- Files/symbols: publication client/keys/state/controller.
- Requirements: ownerType+UUID dan session scoping, expectedVersion/idempotencyKey stabil per intent, recheck GET setelah uncertain outcome, no late cross-owner result/no implicit retry.
- Validation: no-replay/network/abort/stale/replay tests, query cleanup dan root gates.
- Acceptance criteria: Series dan video intent/cache terisolasi; failure tidak dianggap published.

### ASER-009 — Manual publication dan episode archive UI

- Outcome: episode/Series publication terintegrasi di detail.
- Depends on: ASER-006, ASER-008.
- Files/symbols: typed Publication panel/dialogs dan episode archive adapter.
- Requirements: Preview/manual acknowledgement, shared server readiness, episode hidden-under-draft copy, parent upload/child gate, episode archive version/recovery, signed URL expiry consequence. Parent published archive tidak ditawarkan.
- Validation: dialog focus/keyboard/44px, busy/stale/offline/conflict/unconfirmed states, Film publication regression dan root gates.
- Acceptance criteria: episode boleh published sebelum Series; public link/visibility mengikuti server, bukan status editorial saja.

### ASER-010 — Dedicated hierarchy/publication proof

- Outcome: proof API/SQL/MinIO/FFmpeg untuk contracts dan races.
- Depends on: ASER-007, ASER-009.
- Files/symbols: dedicated integration suite di impact map; reuse guards/fixture existing.
- Requirements: season/episode uniqueness, stale versions, genre inheritance, published-parent add draft child, archive restrictions, auth guard, idempotency/replay/child race, no hidden data leakage.
- Validation: native bun:test dengan guarded dedicated DB, owned storage fixture dan cleanup; root gates.
- Acceptance criteria: actual SQL proof pass, no destructive development/production operation, current API and public Series/Next/playback compatibility retained.

### ASER-011 — Built browser full admin journeys

- Outcome: actual UI acceptance dari Series create sampai public watch/archive episode.
- Depends on: ASER-010.
- Files/symbols: auth browser harness phase, worker dan fixture extensions.
- Requirements: draft→Season1/addseason→episode→upload→processing→preview→publish episode(hidden)→cover/Seriespublish→watch/Next→archive child visibility; conflicts/network/auth owner races dan existing Film workflow regression.
- Validation: Chromium320/390/768/1024/1440 Light/Dark/System, keyboard/overflow/dirty/Back, real guarded PG/MinIO/FFmpeg plus native auth regression/root gates.
- Acceptance criteria: real persisted state dan effective anonymous access asserted; screenshot/mock bukan pengganti runtime; platform/production limits dicatat.

### ASER-012 — Current docs dan closure

- Outcome: canonical docs/evidence sesuai source final.
- Depends on: ASER-011.
- Files/symbols: PRD/architecture/runbook/index/context/plan/backlog.
- Requirements: AC/task commits/gates aktual, no self-referential SHA, source freshness dan preservation; jangan menaikkan backlog historis tanpa proof lengkap.
- Validation: documentation, relevant final gates, task/requirement crosscheck dan normal hooks.
- Acceptance criteria: seluruh mandatory task Done dengan source/proof receipts; local completion terpisah dari authorized remote delivery.

## Test requirements

Fondasi ASER-002: typed Eden contract, actual serialized season/episode filters/bodies, credentials/no-store/signal; UUID/kind/owner/version/2xx validation; API codes401/403/404/409/422/503 and network/abort; failed mutation never optimistic/cache success or replay; key isolation, cancellation and exact invalidation. Native tests belum membuktikan UI persistence/browser atau production.

UI/Backend tasks mengikuti validation masing-masing di atas. Build/browser suites dijalankan serial, DB resets selalu dedicated dan source output tidak diubah saat browser server berjalan. Test yang tersedia + check-types/lint/build wajib setelah runtime task; docs:check, targeted Prettier dan diff check sebelum commit.

## Constraints

Tidak mengganti API rules dengan client capability checks, tidak duplicate cache auth atau import server runtime. Hooks langsung dari `#/hooks/use-...`. No signed URL in SSR/Query metadata. Source/media generation, owner identity dan effect cancellation existing dipertahankan. Commit tiap task, stage scoped; remote delivery baru perlu instruksi pengguna tersendiri.

## Acceptance criteria

Modul diterima setelah admin hierarchy/media/publication journey dan recovery di atas terbukti; ASER-001/002 hanya fondasi dan tidak menyatakan editor/runtime Series complete.

## Risks and mitigations

Parent lifecycle berbeda dari video: gate kemampuan sesuai API. Series readiness drift: shared assessment dan SQL parity. Cross-owner cursor/cache: identity+series+season+filter keys serta server cursor. Uncertain create tanpa backend idempotency: no automatic replay, GET reconciliation; UI tidak mengarang dedup guarantee. Long seasons/all seasons endpoint: responsive selector/list tanpa mengklaim cursor season. Private late result: abort/session identity check sebelum navigation/invalidation pada hook UI future.

## Rollback or recovery

Fondasi files baru belum dipanggil UI, dapat direvert scoped tanpa data migration. Runtime berikut dipisah per task; hentikan mutation baru dan refresh server state saat rollback UI. Source/metadata/upload tidak dihapus untuk rollback client. Production rollout/migration berada di authorization terpisah.

## Evidence

[Context evidence index](repository-context.md#evidence-index) pada base SHA; [backlog](../../tasks/admin-series-episodes.md) memiliki commands/results aktual per task. Task media/publication lama tetap historis.

## Open decisions

Parent published archive/restore/cascade dan public discovery Series tidak ditetapkan modul ini. Task ASER-003 memfinalkan route/state spec memakai desain admin existing; keputusan produk baru tidak diasumsikan dari style reuse.

## Validation history

### 2026-10-08

- Result: valid; base/current target SHA `04b098bef9d210c1670f3a29c375208ef36805b9`.
- Checked paths: source/client/query/auth gateway/hierarchy/publication/manifests dan canonical docs pada context.
- Changed relevant paths: tidak ada pada HEAD sebelum branch/task baru; 23 path lokal unrelated dipisahkan.
- Decision: mulai ASER-001/002, recheck freshness sebelum task berikut.

## Execution log

- 2026-10-08: pengguna memilih modul; branch `feat/admin-series-episodes` dari base, snapshot preservation 23 path lokal dibuat di ignored `.turbo/`; context disimpan sebelum plan/backlog. Validation dan commit receipts dicatat setelah benar-benar berjalan.

- 2026-10-08, ASER-001 receipt: `213aa986c2d43de7177b50ba1f598c3f7097cbb7`; scoped5 dokumentasi, staged docs82/835, working docs89/854, normal lint/types cache dan Commitlint lulus.
- 2026-10-08, ASER-002: typed private clients/keys/mutations/invalidation dan native/compile-only tests; API151/883, web208/1144, types3/lint1/build2 lulus. Dua source dan tiga test baru; route/UI/schema/env/dependency tidak berubah. Final evidence dimiliki backlog; runtime commit SHA dicatat pada update berikutnya. ASER-003 route/state spec menjadi next task; ASER-007 readiness API juga prerequisite-ready, belum diimplementasikan.

- 2026-10-08 ASER-003: Route/state spec7 authenticated routes, season/episode ownership, parent lifecycle, genre inheritance, dirty/conflict/offline/cancellation dan responsive/keyboard matrix tersedia. User meminta mulai implementasi8 Oktober2026; desain existing digunakan kembali, tidak menganggap spec sebagai proof browser. Freshness valid0550d0484ca27fbfacb96a033055f4045b636dad: perubahan sejakbase04b hanya fondasi ASER/context/docs, backend/UI/auth impact baseline utuh. Checks: docs/Prettier/diff check dan staged snapshot sebelum commit. Commit receipt pencatatan pada update task berikutnya. Previous task head `0550d0484ca27fbfacb96a033055f4045b636dad`.

- 2026-10-08 ASER-004: Season list/create/edit dan selected-season episode read tersedia dari detail Series. Default Season1 tidak diduplikasi; suggested number memasukkan archived reservations. Input tetap utuh pada duplicate/version/offline; explicit reload dan dirty navigation terbukti di built Bun/Nitro Chromium dengan SQL dedicated. Browser widths 320/390/768/1024/1440 tanpa overflow; controls >=44px. Scope abort/auth cleanup menolak late generations. Browser fixture menggunakan database guarded vertical_movie_app_content_test, tanpa migration/dependency/runtime auth change. Checks: bun test apps/web/test: 212 pass/1167 assertions; bun run check-types, bun run lint, bun run build, dedicated built Series browser phase, docs:check, scoped Prettier dan git diff --check. Commit receipt pencatatan pada update task berikutnya. Previous task head `d531a32e1b754f9b5857a158ab64786759c7e1f4`.

- 2026-10-08 ASER-005: Routes episode tersendiri mencakup create/detail/edit serta list dengan search/archive URL, finite cursor20/manual append dan scoped owner query. Metadata memakai season aktif dalam Series, expectedVersion episode, nullable clears, rights dan genre override/inheritance. Shared editorial validator tetap mempertahankan Film/Standalone behavior. Built Chromium+SQL dedicated membuktikan create, grouping move, duplicate/version preserved input dan explicit reload, inherited genre, archive read-only, wrong-Series response rejection, 23 records melalui 20+3 pages/search dan widths320/390/768/1024/1440 tanpa overflow. Checks: bun test apps/web/test: 214 pass/1181 assertions; bun run check-types, bun run lint, bun run build, built dedicated Series/episode browser phase, docs:check, scoped Prettier dan git diff --check. Commit receipt pencatatan pada update task berikutnya. Previous task head `522bb943e09e8b0547057b3e15d32e824117afc0`.

- 2026-10-08 ASER-006: Episode detail menggunakan video-owner uploader/crop existing, hierarchy cache context dan validated preview return; preview GET meneruskan cancellation signal. Version-matched Video.js rc.4 instructions/bundled HLS docs dibaca, tanpa dependency/player-skin change. Built Chromium nyata pada dedicated media DB/random MinIO bucket: invalid file tidak initiate, policy600s/512MB, source/poster upload, 1080x1920 WebP/private403, worker FFmpeg terpisah dan HLS currentTime>0, preview Back benar. Metadata tetap draft; dua attachment memperbarui rowVersion1→3. Existing native uploader pause/resume/reselection/auth/owner tests tetap lulus; tidak ada autopublish. Checks: bun test apps/web/test:216 pass/1190 assertions; bun test apps/api/src:151 pass/883 assertions; bun run check-types, bun run lint, bun run build, built series-media browser phase dengan real MinIO/FFmpeg, docs:check, scoped Prettier dan git diff --check. Commit receipt pencatatan pada update task berikutnya. Previous task head `88d526e380001ab05e0219eab5f2ab5ec56a92e7`.

- 2026-10-08 ASER-007: GET private Series publication-readiness menyediakan DTO enam checks dan repeatable-read/read-only snapshot. Shared Series evidence/assessment dipakai POST setelah lock, mempertahankan current poster+matching generation job dan canonical published-playable child predicate, upload/status/version/metadata gates serta persistent idempotency. Lifecycle Series tetap draft/published/unpublished+archivedAt. Native HTTP proof guard401/403/expired/dependency503, UUID422, missing404, no-store dan secured OpenAPI lulus. SQL dedicated memverifikasi blocked sebelum child published, ready setelahnya dan blocked published setelah command. Tidak ada schema/dependency/env/migration change. Checks: bun test apps/api/src:153 pass/923 assertions; dedicated media-series-proof:3 pass/32 assertions; bun run check-types, bun run lint, bun run build, docs:check, scoped Prettier dan git diff --check. Commit receipt pencatatan pada update task berikutnya. Previous task head `a56f2821f9945ce77f0842bd5cca045c961eb071`.

- 2026-10-08 ASER-008: Typed Series readiness/publish client memvalidasi owner, enam unique checks/status/canPublish consistency, record version dan response; body Eden tetap expectedVersion/idempotencyKey. Owner publication hook/controller menyediakan Series/episode snapshot, fresh cancellable reads, parent readiness invalidation dan session disposal. Episode metadata envelope memakai publication-owned key lalu confirmed DTO mengisi editor key, mencegah cache shape collision. Tests membuktikan lost-before/lost-after reconciliation dengan key/version identik, Series archive tidak mengirim request, Episode archive parent readiness gate serta identity/owner/public cache isolation. Film/Standalone controller behavior regressions tetap lulus; UI publication mengikuti ASER-009. Checks: bun test apps/web/test:220 pass/1223 assertions; bun run check-types, bun run lint, bun run build, docs:check, scoped Prettier dan git diff --check. Commit receipt pencatatan pada update task berikutnya. Previous task head `602fc970eb5e2f1943c65d98447d5d952537ca00`.

- 2026-10-08 ASER-009: Owner publication UI tersedia pada Series dan episode: checklist authoritative, fresh metadata/media/version, upload/offline/session guards, manual acknowledgement, explicit status/retry dan preview Back context. Built Chromium memakai guarded PostgreSQL/MinIO/FFmpeg membuktikan episode publish tersembunyi pada Series draft, cover+metadata Series kemudian manual publish membuka anonymous detail/playback, absent Series archive, lalu Episode archive menolak detail/playback baru dan SQL rowVersion5/operation receipts. Film/Standalone memakai panel existing; dialogs shared mempertahankan default video. Checks: bun test apps/web/test: 220 pass/1223 assertions; bun run check-types, bun run lint, bun run build dan built series-media publication browser lulus; docs:check/targeted Prettier/git diff --check sebelum commit. Commit receipt pencatatan pada update task berikutnya. Previous task head `50d5fe44dd35435f5aa03b5876ebaaf978511c6a`.
