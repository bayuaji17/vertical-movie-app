# Modul: Detail publik dan tonton dari katalog

> Status: scope confirmed / execution authorized, 7 Oktober 2026. Base c75080f6febf07312b90a6d79ef945b7a96ab84d, dependency PCAT lokal belum di-merge.

## Tujuan modul

Pengunjung membuka detail dan menonton Film/Standalone/Episode tanpa akun, melihat grouped ordered episodes Series dan Next manual. [Context](../plans/public-content-watch/repository-context.md), [plan](../plans/public-content-watch/implementation-plan.md); PRD-07/08, GR-02.

## User story: PCW-US-001

Sebagai pengunjung, saya ingin detail/Series episode dan tonton dari katalog, sehingga dapat memilih cerita lalu menonton tanpa login.

## User story: PCW-US-002

Sebagai penonton, saya ingin metadata, navigasi kembali/Next dan recovery yang jelas, sehingga video yang diputar sesuai judul dan kegagalan tidak menyembunyikan informasi yang masih valid.

## Task: PCW-000 — Context dan plan detail

- Status: Done (planning)
- Owner: Pengembang/agent
- Prioritas: P1
- Referensi: PCW-US-001/002; PRD-07/08, GR-02
- Diperbarui: 2026-10-07
- Dependensi: PCAT-011
- Ukuran: Context + plan + backlog + index

### Ruang lingkup

Snapshot immutable PCAT closure, scope alltypes confirmed; context-first detailplan/impact/DAG/acceptance dan rollout boundaries.

### Acceptance criteria

- [x] Evidence gap Series100, episode list, public watch resolution/player identity traced.
- [x] Semua target/dependency/checks/AC dan public/private boundaries ditetapkan sebelum runtime.

### Validasi

Changed Markdown Prettier, docs:check, diff dan normal task hooks sebelum commit. Runtime baru belum dijalankan.

### Hasil dan bukti

7 Oktober2026: user oke lanjut, lalu memilih semua jenis termasuk Series/episode. Branch feat/public-content-watch dari base PCAT lokal; context sebelum plan. Video.js installed10.0.0-rc.4 docs dan versioned CLI dibaca; tidak menjalankan skin install/upgrade. Root source/manifests tetap bersih sebelum docs. Primary23 unrelated dirty paths preserved. Checks/SHA actual dicatat setelah commit, bukan fabricated self-reference.

### Commit task

- Pesan: docs: plan public details and watch flow (PCW-000)
- SHA: `80cc7e240b88a3d37d5917274759ca612e740fcc`.
- Hook/checks: docs:check, lint, check-types dan commitlint normal pass tanpa bypass.

### Blocker atau tindak lanjut

PCW-001–008 dilaksanakan menurut DAG; remote delivery baru belum diotorisasi.

## Task: PCW-001 — Kontrak detail dan daftar episode

- Status: Done
- Owner: Pengembang/agent
- Prioritas: P1, dependency order
- Referensi: PCW-US-001/002; PRD-07/08, GR-02; [plan](../plans/public-content-watch/implementation-plan.md#implementation-steps)
- Diperbarui: 2026-10-07
- Dependensi: PCW-000 planning.
- Ukuran: Satu hasil terpisah; pecah bila risiko tambahan membutuhkan.

### Ruang lingkup

DTO/strict scoped keyset cursor/type boundaries frozen. unionexistingHomeItem; positive duration/hierarchy; strictkind/slug/limit/cursor/scope/asOf validation; no private fields.

### Acceptance criteria

- [x] invalid422 before store; no scope reuse or offset fallback; >100 pagination supported.
- [x] Applicable gates/evidence dan compatibility diperiksa sebelum Done.

### Validasi

bun:test invalid/tampered/parent/limit/order, sparsepositions/nullEOF/type compile.

### Hasil dan bukti

Kontrak DTO detail/episode strict dan cursor scope Series/limit/order/asOf/hierarchy selesai. Bun test content-pagination.test.ts: 3 pass, 31 assertions; API check-types pass, root build pass. Invalid slug, foreign cursor, extra fields, future date dan numeric overflow ditolak. No schema change.

### Commit task

- Pesan: Conventional Commit scoped PCW-001
- SHA: `92d0ff68b796b695ce49b0a5feb606cfc4b7ecde`.
- Hook/checks: docs:check, lint, check-types dan commitlint normal pass tanpa bypass.

### Blocker atau tindak lanjut

Dependency menurut DAG. Tidak menambah progress/autoplay/editor/production atau remote delivery.

## Task: PCW-002 — Server detail/episodes dan cache

- Status: Done
- Owner: Pengembang/agent
- Prioritas: P1, dependency order
- Referensi: PCW-US-001/002; PRD-07/08, GR-02; [plan](../plans/public-content-watch/implementation-plan.md#implementation-steps)
- Diperbarui: 2026-10-07
- Dependensi: PCW-001.
- Ukuran: Satu hasil terpisah; pecah bila risiko tambahan membutuhkan.

### Ruang lingkup

Published parents/children read directly with one statement/page, no N+1/list100. same canonical gates, direct kind+slug, global season/episode keyset/count/snapshot; remainingTTL/generation fence/aftercommit callbacks; additive constructor, OpenAPI/error contract; legacy unchanged.

### Acceptance criteria

- [x] anonymous200, missing404/invalid422/dependency503; hidden parent/child excluded; legacy routes regressions pass.
- [x] Applicable gates/evidence dan compatibility diperiksa sebelum Done.

### Validasi

injected HTTP/cache unit plus query type/build; later native006 verifies SQL.

### Hasil dan bukti

Detail direct kind/slug dan episode SQL one-statement dengan parent eligibility, hierarchy cursor/asOf/count/cache selesai. Catalog suite 18 pass 125 assertions; dedicated PostgreSQL direct detail/page smoke 5 assertions pass, API types/build pass. Constructor legacy compatible dan callback invalidate existing reused; routes additive, no schema or legacy order change. Full native boundary proof pada PCW-006.

### Commit task

- Pesan: Conventional Commit scoped PCW-002
- SHA: `a6876c9e34644eb6189627f0421688a6f3d7d1e7`.
- Hook/checks: docs:check, lint, check-types dan commitlint normal pass tanpa bypass.

### Blocker atau tindak lanjut

Dependency menurut DAG. Tidak menambah progress/autoplay/editor/production atau remote delivery.

## Task: PCW-003 — Public adapter, SSR dan query

- Status: Done
- Owner: Pengembang/agent
- Prioritas: P1, dependency order
- Referensi: PCW-US-001/002; PRD-07/08, GR-02; [plan](../plans/public-content-watch/implementation-plan.md#implementation-steps)
- Diperbarui: 2026-10-07
- Dependensi: PCW-001, PCW-002.
- Ukuran: Satu hasil terpisah; pecah bila risiko tambahan membutuhkan.

### Ruang lingkup

Safe typed reads for detail/watch/episodes, independent sections and identity reset. strict exact allowlist, omit credentials, signal/timeouts, no malformed=>empty; trusted server-only URL/queryClient per request; success hydrate, safeerror; metadata TTL/no signed cache; Next404only=none.

### Acceptance criteria

- [x] browser sameorigin with VITE_API_URL absent; no cookie/internalURL/private fields; detail doesn't seed homepage item.
- [x] Applicable gates/evidence dan compatibility diperiksa sebelum Done.

### Validasi

Eden compile + client/query/gateway tests partial/abort/race/binding/offline/cache namespace.

### Hasil dan bukti

Public Eden adapter, strict DTO, abort/timeout, same-origin GET-only gateway dan unsigned SSR loader selesai. Endpoint tambahan /catalog/watch/:slug membawa remaining freshForMs karena legacy /videos/:slug tidak menyediakan TTL. Catalog/client/gateway tests: 36 pass, 228 assertions. Root check-types pass; final lint/build dan normal hooks diverifikasi sebelum commit. Signed playback reader hanya mengembalikan capability ke component state.

### Commit task

- Pesan: Conventional Commit scoped PCW-003
- SHA: `0fa16870d57984dc2e117c1cea5c66b6c05793e3`.
- Hook/checks: docs:check, lint, check-types dan commitlint normal pass tanpa bypass.

### Blocker atau tindak lanjut

Dependency menurut DAG. Tidak menambah progress/autoplay/editor/production atau remote delivery.

## Task: PCW-004 — Detail/Series halaman dan CTA

- Status: Done
- Owner: Pengembang/agent
- Prioritas: P1, dependency order
- Referensi: PCW-US-001/002; PRD-07/08, GR-02; [plan](../plans/public-content-watch/implementation-plan.md#implementation-steps)
- Diperbarui: 2026-10-07
- Dependensi: PCW-003.
- Ukuran: Satu hasil terpisah; pecah bila risiko tambahan membutuhkan.

### Ruang lingkup

Anonymous deep links, metadata/currentposter and grouped ordered playable episodes. exactkind dispatch, detail+watch/Series links, public shell/backlinks; initial/error/404/loading/nextpage retry/422/empty, no request playback on browsing/hover; 20episodes/page retaining loaded rows.

### Acceptance criteria

- [x] allthreekindCTA correct, directURL/refresh works, typed relative links, theme/portrait/keyboard/focus preserved, hidden child never clickable.
- [x] Applicable gates/evidence dan compatibility diperiksa sebelum Done.

### Validasi

types/lint/build + generatedroute/source audit; browser007.

### Hasil dan bukti

Public detail Film/Standalone dan Series, grouped episode rows, initial/append skeleton, same-cursor Retry dan resetQueries untuk cursor422 selesai. Dialog Open details/Watch dan featured directwatch berupa typed Link, tanpa capability preload. Route tree dihasilkan tsr. Root types/lint/build pass; actual URL/hydration/theme/playback proof dijalankan bersama PCW-007.

### Commit task

- Pesan: Conventional Commit scoped PCW-004
- SHA: receipt aktual dicatat pada task berikutnya setelah commit.
- Hook/checks: normal docs/lint/types/commitlint wajib tanpa bypass.

### Blocker atau tindak lanjut

Dependency menurut DAG. Tidak menambah progress/autoplay/editor/production atau remote delivery.

## Task: PCW-005 — Watch metadata, Next dan player recovery

- Status: Backlog
- Owner: Pengembang/agent
- Prioritas: P1, dependency order
- Referensi: PCW-US-001/002; PRD-07/08, GR-02; [plan](../plans/public-content-watch/implementation-plan.md#implementation-steps)
- Diperbarui: 2026-10-07
- Dependensi: PCW-003.
- Ukuran: Satu hasil terpisah; pecah bila risiko tambahan membutuhkan.

### Ruang lingkup

Current video HLS with metadata/Series context/backlinks/manual Next and explicit Retry. signed only browserstate, player keyUUID, abort pending source and ignorelateold completion, no oldvideo/newtitle; compatible preview; existing expiry/quality/seek/play restore, terminalRetry and singleinflight; Next manual/404none/503localizedretry.

### Acceptance criteria

- [ ] Movie/Standalone/Episode plays on user action, no autoplay/auto-next, currentTime progresses; switchidentity resets position/error/source and stops old media; archivefreshcapability denied, no auth effects.
- [ ] Applicable gates/evidence dan compatibility diperiksa sebelum Done.

### Validasi

relevant type/unit callbacks/races plus actual HLS/preview browser007.

### Hasil dan bukti

Belum diimplementasikan/diverifikasi; isi command/result/batas dan receipt aktual saat task selesai.

### Commit task

- Pesan: Conventional Commit scoped PCW-005
- SHA: belum dibuat.
- Hook/checks: normal docs/lint/types/commitlint wajib tanpa bypass.

### Blocker atau tindak lanjut

Dependency menurut DAG. Tidak menambah progress/autoplay/editor/production atau remote delivery.

## Task: PCW-006 — Native hierarchy dan access proof

- Status: Backlog
- Owner: Pengembang/agent
- Prioritas: P1, dependency order
- Referensi: PCW-US-001/002; PRD-07/08, GR-02; [plan](../plans/public-content-watch/implementation-plan.md#implementation-steps)
- Diperbarui: 2026-10-07
- Dependensi: PCW-002.
- Ukuran: Satu hasil terpisah; pecah bila risiko tambahan membutuhkan.

### Ruang lingkup

SQL and private actual HLS ownership/order/cursor/fresh access verified. >100 Series directlookup; >100 episodes/multipleseasons/gaps/wrongparent/hidden/currentgeneration, snapshotnewpublish/archive/count/querycount; actual FFmpeg-produced HLS manifests/init/segments stored knownfixturekeys; no DBdevelopment mutation.

### Acceptance criteria

- [ ] first/next/end cross-season stable, singlequery/page, actual signed objects playable, afterarchive new404; object/facts fixture limitations honest.
- [ ] Applicable gates/evidence dan compatibility diperiksa sebelum Done.

### Validasi

native guarded tests serial; legacy tests per impacted predicate; EXPLAIN only if changed SQL raises unresolved cost concern, noindexwithoutmeasurement.

### Hasil dan bukti

Belum diimplementasikan/diverifikasi; isi command/result/batas dan receipt aktual saat task selesai.

### Commit task

- Pesan: Conventional Commit scoped PCW-006
- SHA: belum dibuat.
- Hook/checks: normal docs/lint/types/commitlint wajib tanpa bypass.

### Blocker atau tindak lanjut

Dependency menurut DAG. Tidak menambah progress/autoplay/editor/production atau remote delivery.

## Task: PCW-007 — Browser detail-to-HLS dev/built

- Status: Backlog
- Owner: Pengembang/agent
- Prioritas: P1, dependency order
- Referensi: PCW-US-001/002; PRD-07/08, GR-02; [plan](../plans/public-content-watch/implementation-plan.md#implementation-steps)
- Diperbarui: 2026-10-07
- Dependensi: PCW-004, PCW-005, PCW-006.
- Ukuran: Satu hasil terpisah; pecah bila risiko tambahan membutuhkan.

### Ruang lingkup

Real anonymous journey through alltypes/Series/episodes verified in development and built Bun/Nitro. clickdialogCTA/featured/directdetail/refresh/back/Series Loadmore/Watch/Next; actual HLS currentTime/seek/pause/renew/archive, controlled unavailable/404/retry/heldoldslug/filter; no admin/authrequest/upstreamcredentials; metadataSSR only unsigned.

### Acceptance criteria

- [ ] alljourneys/controls/errorcases pass againstactualAPI/PG/MinIO, no testreadyJSON substitutedforHLS proof; source/runtimefresh, screenshotsboundariesrecorded.
- [ ] Applicable gates/evidence dan compatibility diperiksa sebelum Done.

### Validasi

Chromium320/390/768/1024/1440/1920 Light/Dark/System; keyboard/touch44px/focus/reduced-motion/nooverflow/9:16; privatepreviewregression; no page/hydrationerrors/unexpectedexternalrequests. Signed MinIOobjects expectedonlyonwatch.

### Hasil dan bukti

Belum diimplementasikan/diverifikasi; isi command/result/batas dan receipt aktual saat task selesai.

### Commit task

- Pesan: Conventional Commit scoped PCW-007
- SHA: belum dibuat.
- Hook/checks: normal docs/lint/types/commitlint wajib tanpa bypass.

### Blocker atau tindak lanjut

Dependency menurut DAG. Tidak menambah progress/autoplay/editor/production atau remote delivery.

## Task: PCW-008 — Canonical docs dan closure

- Status: Backlog
- Owner: Pengembang/agent
- Prioritas: P1, dependency order
- Referensi: PCW-US-001/002; PRD-07/08, GR-02; [plan](../plans/public-content-watch/implementation-plan.md#implementation-steps)
- Diperbarui: 2026-10-07
- Dependensi: PCW-007.
- Ukuran: Satu hasil terpisah; pecah bila risiko tambahan membutuhkan.

### Ruang lingkup

Approved scope/current behavior and actual evidence recorded with localtaskreceipts. no claimfullMVP/R2/Safari/editor/progress/autoplay; PCAT/HOMEFEhistory preserved; stackedbase andremote status explicit.

### Acceptance criteria

- [ ] requiredACevidencecomplete, scopedbranchclean, localcommitsperstep, no push/PR/merge/deploy withoutnewauthorization.
- [ ] Applicable gates/evidence dan compatibility diperiksa sebelum Done.

### Validasi

relevantexistingtests/roottypes/lint/build, docs:check/changedMDPrettier/diff/normalhooks; migrations onlyifschemaactuallychanges.

### Hasil dan bukti

Belum diimplementasikan/diverifikasi; isi command/result/batas dan receipt aktual saat task selesai.

### Commit task

- Pesan: Conventional Commit scoped PCW-008
- SHA: belum dibuat.
- Hook/checks: normal docs/lint/types/commitlint wajib tanpa bypass.

### Blocker atau tindak lanjut

Dependency menurut DAG. Tidak menambah progress/autoplay/editor/production atau remote delivery.
