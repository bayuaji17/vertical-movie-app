# Modul: Admin Series, season dan episode

> Status: ASER-001/002 selesai lokal; editor/media/publication masih lanjutan · 8 Oktober 2026 · Pengguna memilih modul ini setelah katalog PR #13. Scope runtime per task; belum menyatakan keseluruhan editor/publikasi Series selesai.

## Tujuan modul

Melengkapi private dashboard hierarchy/media/publication Series. Acuan [context](../plans/admin-series-episodes/repository-context.md), [plan](../plans/admin-series-episodes/implementation-plan.md), [PRD](../product/prd.md), [workflow](../guides/development-workflow.md) dan [template](../templates/task.md). Evidence backend lama tetap pada backlog/runbook pemiliknya.

## User story: ASER-US-01 — Metadata hierarchy

Sebagai admin, saya ingin memilih/membuat/edit season dan episode agar metadata serta grouping tersimpan dan dapat dikelola dengan aman.

## User story: ASER-US-02 — Media dan publication

Sebagai admin, saya ingin upload/Preview/publish episode dan Series dengan readiness serta recovery yang jelas agar hanya konten siap efektif tersedia publik.

## User story: ASER-US-03 — Verification dan preservation

Sebagai pengembang, saya ingin setiap task berbasis source current, memiliki proof nyata dan commit scoped agar alur serta hasil delivery dapat ditinjau.

## Aturan task dan evidence

API tetap authoritative; Series/season lifecycle tidak diubah menjadi enum video. Published parent archive/restore/cascade/discovery public baru di luar scope. Tests memakai native Bun; external fixture dedicated/owned, tidak mereset DB development. Runtime task menjalankan relevant tests dan root check-types/lint/build; docs/format/diff/checks hooks wajib. Local commits standing-authorized; push/PR/merge baru memerlukan instruksi tersendiri.

## Task: ASER-001 — Context, kontrak dan backlog

- Status: Done
- Owner: Codex
- Prioritas: P0
- Referensi: ASER-US-01/02/03, PRD-03/04/05/06/08/09; [step plan](../plans/admin-series-episodes/implementation-plan.md#aser-001--context-contracts-dan-backlog).
- Diperbarui: 2026-10-08
- Dependensi: Tidak ada
- Ukuran: Satu outcome konkret sesuai step; refine bila impact berubah.

### Ruang lingkup

Snapshot/impact/DAG, keputusan modul dan batas lifecycle; context sebelum plan. Source targets/symbols berada pada step plan dan impact map; folder future dibuat saat task owner berjalan.

### Acceptance criteria

- [x] Context berbasis SHA dan private hierarchy/client/owner trace tersedia.
- [x] Setiap task memiliki dependensi, AC/validation serta batas proof dan approval.

### Validasi

docs:check, targeted Prettier, diff check, scoped staged snapshot, preservation dan normal hooks.

### Hasil dan bukti

Context sebelum plan/backlog tersimpan pada snapshot04b098b; user module choice dan23 path unrelated dipisahkan. `bun run docs:check` lulus89 Markdown/854 links; targeted Prettier dan git diff --check lulus. Snapshot staged lulus82 Markdown/835 links; source/runtime belum diubah pada task ini.

### Commit task

- Pesan: docs: plan admin series and episode workflow (ASER-001)
- SHA: `213aa986c2d43de7177b50ba1f598c3f7097cbb7`.
- Hook/checks: docs89/854, lint1/types3 task cache valid dan Commitlint lulus tanpa bypass. Commit scoped5 file dokumentasi; belum push.
- Ledger: Receipt aktual dicatat pada dokumentasi ASER-002.

### Blocker atau tindak lanjut

Ikuti dependensi step; task selanjutnya ASER-002.

## Task: ASER-002 — Private season/episode client dan queries

- Status: Done
- Owner: Codex
- Prioritas: P0
- Referensi: ASER-US-01/02/03, PRD-03/04/05/06/08/09; [step plan](../plans/admin-series-episodes/implementation-plan.md#aser-002--private-seasonepisode-client-dan-queries).
- Diperbarui: 2026-10-08
- Dependensi: ASER-001
- Ukuran: Satu outcome konkret sesuai step; refine bila impact berubah.

### Ruang lingkup

Typed Eden season list/create/patch serta episode list/detail/create/patch; query/mutation factories tanpa UI. Source targets/symbols berada pada step plan dan impact map; folder future dibuat saat task owner berjalan.

### Acceptance criteria

- [x] Wrong-kind/owner/version/UUID atau malformed2xx tidak menjadi confirmed save; signals/cursor20/HTTP codes terjaga.
- [x] Identity/filter keys, cancellation/cleanup401 dan scoped invalidation; mutations satu request tanpa replay/optimistic success.

### Validasi

Native injected-fetch/QueryClient tests, compile-only Eden positif/negatif, existing web/API regressions dan root quality gates.

### Hasil dan bukti

8 Oktober 2026: `series-client.ts`/`series-queries.ts` tersedia tanpa UI callers baru. Typed Eden season list/create/patch dan episode list/detail/create/patch memakai private transport existing; critical UUID/version/kind/grouping/owner, archived-list leakage, malformed2xx, duplicate pages dan cursor validation berjalan sebelum confirmed result. Query identity+Series+season/filter, explicit invalidation/no-refetch, signals/cleanup401 serta no retry/no optimistic cache success tersedia.

`bun test apps/web/test/admin-series-client.test.ts apps/web/test/admin-series-queries.test.ts`:15 pass/105 assertions; final `bun test apps/web/test`:208 pass/1144 assertions. `bun test apps/api/src`:151 pass/883 assertions. Root `bun run check-types`:3 successful (22.802s); `bun run lint`:1 successful (18.893s); `bun run build`:2 successful (4.928s), existing large-chunk warning tetap. Compile-only Eden positive/negative ikut type gate; targeted source Prettier check lulus. Initial TypeScript union/null/directive dan dua lint annotations diperbaiki sebelum final gates, tanpa bypass.

Ini proof fondasi transport/cache/contract; belum menjalankan editor browser, persistence SQL baru atau media-Series journey. Schema/env/dependency/runtime routes tidak berubah; tidak ada migration development diperlukan.22 path unrelated byte-identical dan docs index overlay desain existing tetap terpisah. Documentation/commit hooks ditutup pada commit task ini.

### Commit task

- Pesan: feat(web): add private season and episode clients (ASER-002).
- SHA: `0550d0484ca27fbfacb96a033055f4045b636dad`.
- Hook/checks: Relevant tests, types/lint/build dan Prettier lulus; docs/whitespace serta normal Husky/Commitlint wajib sebelum commit diterima.
- Ledger: Receipt setelah commit pada update task berikutnya.

### Blocker atau tindak lanjut

Ikuti dependensi step; task selanjutnya ASER-003.

## Task: ASER-003 — Route dan state specification editor

- Status: Done
- Owner: Codex
- Prioritas: P1
- Referensi: ASER-US-01/02/03, PRD-03/04/05/06/08/09; [step plan](../plans/admin-series-episodes/implementation-plan.md#aser-003--editor-route-dan-state-specification).
- Diperbarui: 2026-10-08
- Dependensi: ASER-002
- Ukuran: Satu outcome konkret sesuai step; refine bila impact berubah.

### Ruang lingkup

English responsive editor states memakai approved admin shell/form primitives, termasuk route/Back/dirty/conflict. Source targets/symbols berada pada step plan dan impact map; folder future dibuat saat task owner berjalan.

### Acceptance criteria

- [x] Route season/episode dan state matrix lengkap, media/publication states terpisah.
- [x] 320–1440 Light/Dark/System,44px/keyboard/focus, long list/copy dan inherited genre dipetakan ke assertions.

### Validasi

Source/requirement crosscheck, docs/Prettier/diff/hook; state specification bukan runtime proof.

### Hasil dan bukti

Route/state spec7 authenticated routes, season/episode ownership, parent lifecycle, genre inheritance, dirty/conflict/offline/cancellation dan responsive/keyboard matrix tersedia. User meminta mulai implementasi8 Oktober2026; desain existing digunakan kembali, tidak menganggap spec sebagai proof browser. Freshness valid0550d0484ca27fbfacb96a033055f4045b636dad: perubahan sejakbase04b hanya fondasi ASER/context/docs, backend/UI/auth impact baseline utuh.

### Commit task

- Pesan: docs: define series and episode editor states (ASER-003).
- SHA: `d531a32e1b754f9b5857a158ab64786759c7e1f4`.
- Hook/checks: docs/Prettier/diff check dan staged snapshot sebelum commit; normal Husky/Commitlint wajib sebelum commit diterima.
- Ledger: Receipt setelah commit pada update task berikutnya.

### Blocker atau tindak lanjut

Ikuti dependensi step; task selanjutnya ASER-004.

## Task: ASER-004 — Season list/create/edit

- Status: Done
- Owner: Codex
- Prioritas: P1
- Referensi: ASER-US-01/02/03, PRD-03/04/05/06/08/09; [step plan](../plans/admin-series-episodes/implementation-plan.md#aser-004--season-listcreateedit).
- Diperbarui: 2026-10-08
- Dependensi: ASER-003
- Ukuran: Satu outcome konkret sesuai step; refine bila impact berubah.

### Ruang lingkup

Authenticated Series entry, pemilih/list season dan create/edit dengan season rowVersion. Source targets/symbols berada pada step plan dan impact map; folder future dibuat saat task owner berjalan.

### Acceptance criteria

- [x] Tidak menduplikasi default Season1; nomor/release/duplicate/stale/archived errors mempertahankan input.
- [x] Dirty navigation dan owner/session cancellation, latest refetch/Back; published parent aktif mengikuti API.

### Validasi

Form/client tests, guarded metadata persistence/browser, docs dan root gates.

### Hasil dan bukti

Season list/create/edit dan selected-season episode read tersedia dari detail Series. Default Season1 tidak diduplikasi; suggested number memasukkan archived reservations. Input tetap utuh pada duplicate/version/offline; explicit reload dan dirty navigation terbukti di built Bun/Nitro Chromium dengan SQL dedicated. Browser widths 320/390/768/1024/1440 tanpa overflow; controls >=44px. Scope abort/auth cleanup menolak late generations. Browser fixture menggunakan database guarded vertical_movie_app_content_test, tanpa migration/dependency/runtime auth change.

### Commit task

- Pesan: feat(web): add season management workflow (ASER-004)
- SHA: `522bb943e09e8b0547057b3e15d32e824117afc0`.
- Hook/checks: bun test apps/web/test: 212 pass/1167 assertions; bun run check-types, bun run lint, bun run build, dedicated built Series browser phase, docs:check, scoped Prettier dan git diff --check; normal Husky/Commitlint wajib sebelum commit diterima.
- Ledger: Receipt setelah commit pada update task berikutnya.

### Blocker atau tindak lanjut

Ikuti dependensi step; task selanjutnya ASER-005.

## Task: ASER-005 — Episode list/create/detail/edit

- Status: Done
- Owner: Codex
- Prioritas: P1
- Referensi: ASER-US-01/02/03, PRD-03/04/05/06/08/09; [step plan](../plans/admin-series-episodes/implementation-plan.md#aser-005--episode-listcreatedetailedit).
- Diperbarui: 2026-10-08
- Dependensi: ASER-004
- Ukuran: Satu outcome konkret sesuai step; refine bila impact berubah.

### Ruang lingkup

Episode route tersendiri, cursor20/manual Load more per season, metadata/number/rights/genres. Source targets/symbols berada pada step plan dan impact map; folder future dibuat saat task owner berjalan.

### Acceptance criteria

- [x] Created/edited episode persisten pada grouping yang benar; duplicate/stale/422 ditangani tanpa replay.
- [x] Genre inheritance, locked first-publish grouping/slug, read-only published dan owner/page/Back context sesuai API.

### Validasi

Native form/client/state tests, dedicated metadata SQL/browser, Film regression dan root gates.

### Hasil dan bukti

Routes episode tersendiri mencakup create/detail/edit serta list dengan search/archive URL, finite cursor20/manual append dan scoped owner query. Metadata memakai season aktif dalam Series, expectedVersion episode, nullable clears, rights dan genre override/inheritance. Shared editorial validator tetap mempertahankan Film/Standalone behavior. Built Chromium+SQL dedicated membuktikan create, grouping move, duplicate/version preserved input dan explicit reload, inherited genre, archive read-only, wrong-Series response rejection, 23 records melalui 20+3 pages/search dan widths320/390/768/1024/1440 tanpa overflow.

### Commit task

- Pesan: feat(web): add episode metadata workflow (ASER-005)
- SHA: `88d526e380001ab05e0219eab5f2ab5ec56a92e7`.
- Hook/checks: bun test apps/web/test: 214 pass/1181 assertions; bun run check-types, bun run lint, bun run build, built dedicated Series/episode browser phase, docs:check, scoped Prettier dan git diff --check; normal Husky/Commitlint wajib sebelum commit diterima.
- Ledger: Receipt setelah commit pada update task berikutnya.

### Blocker atau tindak lanjut

Ikuti dependensi step; task selanjutnya ASER-006.

## Task: ASER-006 — Episode upload dan Preview

- Status: Done
- Owner: Codex
- Prioritas: P1
- Referensi: ASER-US-01/02/03, PRD-03/04/05/06/08/09; [step plan](../plans/admin-series-episodes/implementation-plan.md#aser-006--episode-upload-dan-preview).
- Diperbarui: 2026-10-08
- Dependensi: ASER-005
- Ukuran: Satu outcome konkret sesuai step; refine bila impact berubah.

### Ruang lingkup

Reuse uploader/crop/inventory video-owner; episode600s/512MB; HLS preview manual. Source targets/symbols berada pada step plan dan impact map; folder future dibuat saat task owner berjalan.

### Acceptance criteria

- [x] Real source/cover dan HLS siap, batas invalid file serta processing/recovery ditampilkan.
- [x] Resume/pause/reselection/owner switch tidak menghapus metadata atau melakukan autopublish.

### Validasi

Guarded MinIO/FFmpeg/browser, relevant media/upload tests dan root gates.

### Hasil dan bukti

Episode detail menggunakan video-owner uploader/crop existing, hierarchy cache context dan validated preview return; preview GET meneruskan cancellation signal. Version-matched Video.js rc.4 instructions/bundled HLS docs dibaca, tanpa dependency/player-skin change. Built Chromium nyata pada dedicated media DB/random MinIO bucket: invalid file tidak initiate, policy600s/512MB, source/poster upload, 1080x1920 WebP/private403, worker FFmpeg terpisah dan HLS currentTime>0, preview Back benar. Metadata tetap draft; dua attachment memperbarui rowVersion1→3. Existing native uploader pause/resume/reselection/auth/owner tests tetap lulus; tidak ada autopublish.

### Commit task

- Pesan: feat(web): connect episode upload and preview (ASER-006)
- SHA: `a56f2821f9945ce77f0842bd5cca045c961eb071`.
- Hook/checks: bun test apps/web/test:216 pass/1190 assertions; bun test apps/api/src:151 pass/883 assertions; bun run check-types, bun run lint, bun run build, built series-media browser phase dengan real MinIO/FFmpeg, docs:check, scoped Prettier dan git diff --check; normal Husky/Commitlint wajib sebelum commit diterima.
- Ledger: Receipt setelah commit pada update task berikutnya.

### Blocker atau tindak lanjut

Ikuti dependensi step; task selanjutnya ASER-007.

## Task: ASER-007 — Authoritative Series readiness API

- Status: Done
- Owner: Codex
- Prioritas: P0
- Referensi: ASER-US-01/02/03, PRD-03/04/05/06/08/09; [step plan](../plans/admin-series-episodes/implementation-plan.md#aser-007--authoritative-series-readiness-api).
- Diperbarui: 2026-10-08
- Dependensi: ASER-001
- Ukuran: Satu outcome konkret sesuai step; refine bila impact berubah.

### Ruang lingkup

Shared Series readiness assessment dan private GET sebelum panel publish; existing POST parity. Source targets/symbols berada pada step plan dan impact map; folder future dibuat saat task owner berjalan.

### Acceptance criteria

- [x] Title/synopsis/current cover/child playable/lifecycle/upload/version gates sama antara GET assessment dan POST transaction.
- [x] Guard/error/schema/no-store, no signing/write in GET dan concurrent state ditangani authoritative.

### Validasi

bun:test/app.handle, injected evidence, dedicated SQL child/archive/generation parity dan root gates.

### Hasil dan bukti

GET private Series publication-readiness menyediakan DTO enam checks dan repeatable-read/read-only snapshot. Shared Series evidence/assessment dipakai POST setelah lock, mempertahankan current poster+matching generation job dan canonical published-playable child predicate, upload/status/version/metadata gates serta persistent idempotency. Lifecycle Series tetap draft/published/unpublished+archivedAt. Native HTTP proof guard401/403/expired/dependency503, UUID422, missing404, no-store dan secured OpenAPI lulus. SQL dedicated memverifikasi blocked sebelum child published, ready setelahnya dan blocked published setelah command. Tidak ada schema/dependency/env/migration change.

### Commit task

- Pesan: feat(api): expose series publication readiness (ASER-007)
- SHA: `602fc970eb5e2f1943c65d98447d5d952537ca00`.
- Hook/checks: bun test apps/api/src:153 pass/923 assertions; dedicated media-series-proof:3 pass/32 assertions; bun run check-types, bun run lint, bun run build, docs:check, scoped Prettier dan git diff --check; normal Husky/Commitlint wajib sebelum commit diterima.
- Ledger: Receipt setelah commit pada update task berikutnya.

### Blocker atau tindak lanjut

Ikuti dependensi step; task selanjutnya ASER-008.

## Task: ASER-008 — Series publication client/controller

- Status: Done
- Owner: Codex
- Prioritas: P1
- Referensi: ASER-US-01/02/03, PRD-03/04/05/06/08/09; [step plan](../plans/admin-series-episodes/implementation-plan.md#aser-008--series-publication-clientcontroller).
- Diperbarui: 2026-10-08
- Dependensi: ASER-007
- Ukuran: Satu outcome konkret sesuai step; refine bila impact berubah.

### Ruang lingkup

Typed owner-specific readiness/mutation keys/intent/reconciliation memakai controller existing. Source targets/symbols berada pada step plan dan impact map; folder future dibuat saat task owner berjalan.

### Acceptance criteria

- [x] Version dan idempotency intent stabil; no auto replay atau fabricated success.
- [x] Network/auth/owner cancellation dan late results tidak reseed private cache atau navigate owner lain.

### Validasi

Client/controller/private cache tests, relevant auth/publication regression dan root gates.

### Hasil dan bukti

Typed Series readiness/publish client memvalidasi owner, enam unique checks/status/canPublish consistency, record version dan response; body Eden tetap expectedVersion/idempotencyKey. Owner publication hook/controller menyediakan Series/episode snapshot, fresh cancellable reads, parent readiness invalidation dan session disposal. Episode metadata envelope memakai publication-owned key lalu confirmed DTO mengisi editor key, mencegah cache shape collision. Tests membuktikan lost-before/lost-after reconciliation dengan key/version identik, Series archive tidak mengirim request, Episode archive parent readiness gate serta identity/owner/public cache isolation. Film/Standalone controller behavior regressions tetap lulus; UI publication mengikuti ASER-009.

### Commit task

- Pesan: feat(web): add series publication state and transport (ASER-008)
- SHA: Receipt dicatat pada update task berikutnya setelah commit berhasil.
- Hook/checks: bun test apps/web/test:220 pass/1223 assertions; bun run check-types, bun run lint, bun run build, docs:check, scoped Prettier dan git diff --check; normal Husky/Commitlint wajib sebelum commit diterima.
- Ledger: Receipt setelah commit pada update task berikutnya.

### Blocker atau tindak lanjut

Ikuti dependensi step; task selanjutnya ASER-009.

## Task: ASER-009 — Publication UI dan archive episode

- Status: Backlog
- Owner: Codex
- Prioritas: P1
- Referensi: ASER-US-01/02/03, PRD-03/04/05/06/08/09; [step plan](../plans/admin-series-episodes/implementation-plan.md#aser-009--manual-publication-dan-episode-archive-ui).
- Diperbarui: 2026-10-08
- Dependensi: ASER-006, ASER-008
- Ukuran: Satu outcome konkret sesuai step; refine bila impact berubah.

### Ruang lingkup

Manual Preview/Publish episode dan Series, hidden-under-draft copy, episode archive; parent policy existing. Source targets/symbols berada pada step plan dan impact map; folder future dibuat saat task owner berjalan.

### Acceptance criteria

- [ ] Server gates dan fresh state mengontrol actions; episode published bisa tetap hidden sebelum Series published.
- [ ] Uncertain/conflict/offline/busy recovery, focus/confirmation dan expiry copy; published Series archive tidak ditawarkan.

### Validasi

Dialog/state tests, responsive keyboard/built browser, Film publication regression dan root gates.

### Hasil dan bukti

Belum diimplementasikan atau diverifikasi pada task ini.

### Commit task

- Pesan: Ditentukan saat task selesai, Conventional Commit dengan ID task.
- SHA: Belum dibuat.
- Hook/checks: Belum dijalankan.
- Ledger: Receipt setelah commit pada update task berikutnya.

### Blocker atau tindak lanjut

Ikuti dependensi step; task selanjutnya ASER-010.

## Task: ASER-010 — Dedicated hierarchy/publication proof

- Status: Backlog
- Owner: Codex
- Prioritas: P1
- Referensi: ASER-US-01/02/03, PRD-03/04/05/06/08/09; [step plan](../plans/admin-series-episodes/implementation-plan.md#aser-010--dedicated-hierarchypublication-proof).
- Diperbarui: 2026-10-08
- Dependensi: ASER-007, ASER-009
- Ukuran: Satu outcome konkret sesuai step; refine bila impact berubah.

### Ruang lingkup

API/SQL/MinIO/FFmpeg actual hierarchy, uniqueness, replay dan visibility races. Source targets/symbols berada pada step plan dan impact map; folder future dibuat saat task owner berjalan.

### Acceptance criteria

- [ ] Auth/version/grouping/genre/active-parent/archive/idempotency/readiness parity proved pada DB dedicated.
- [ ] Public Series counts/Next/watch tidak membocorkan hidden child; owned fixture cleanup/preservation.

### Validasi

Native integration serial dengan dedicated guard; root gates dan recorded actual results.

### Hasil dan bukti

Belum diimplementasikan atau diverifikasi pada task ini.

### Commit task

- Pesan: Ditentukan saat task selesai, Conventional Commit dengan ID task.
- SHA: Belum dibuat.
- Hook/checks: Belum dijalankan.
- Ledger: Receipt setelah commit pada update task berikutnya.

### Blocker atau tindak lanjut

Ikuti dependensi step; task selanjutnya ASER-011.

## Task: ASER-011 — Built browser full Series journeys

- Status: Backlog
- Owner: Codex
- Prioritas: P1
- Referensi: ASER-US-01/02/03, PRD-03/04/05/06/08/09; [step plan](../plans/admin-series-episodes/implementation-plan.md#aser-011--built-browser-full-admin-journeys).
- Diperbarui: 2026-10-08
- Dependensi: ASER-010
- Ukuran: Satu outcome konkret sesuai step; refine bila impact berubah.

### Ruang lingkup

Create Series/season/episode→upload→Preview→publish hidden episode→Seriespublish→watch/Next→archive child. Source targets/symbols berada pada step plan dan impact map; folder future dibuat saat task owner berjalan.

### Acceptance criteria

- [ ] Actual SQL/storage/player dan anonymous access asserted; stale/dirty/offline/network/auth owner races safe.
- [ ] 320/390/768/1024/1440 Light/Dark/System/keyboard/no overflow, Film/uploader/auth regression retained.

### Validasi

Built Chromium+guarded PG/MinIO/FFmpeg, native auth regression, existing units dan root gates.

### Hasil dan bukti

Belum diimplementasikan atau diverifikasi pada task ini.

### Commit task

- Pesan: Ditentukan saat task selesai, Conventional Commit dengan ID task.
- SHA: Belum dibuat.
- Hook/checks: Belum dijalankan.
- Ledger: Receipt setelah commit pada update task berikutnya.

### Blocker atau tindak lanjut

Ikuti dependensi step; task selanjutnya ASER-012.

## Task: ASER-012 — Current docs dan closure

- Status: Backlog
- Owner: Codex
- Prioritas: P1
- Referensi: ASER-US-01/02/03, PRD-03/04/05/06/08/09; [step plan](../plans/admin-series-episodes/implementation-plan.md#aser-012--current-docs-dan-closure).
- Diperbarui: 2026-10-08
- Dependensi: ASER-011
- Ukuran: Satu outcome konkret sesuai step; refine bila impact berubah.

### Ruang lingkup

Update canonical PRD/architecture/runbook/index dan source/proof/task receipts. Source targets/symbols berada pada step plan dan impact map; folder future dibuat saat task owner berjalan.

### Acceptance criteria

- [ ] Seluruh mandatory AC dan per-task commits/gates terbukti dengan current source freshness.
- [ ] Local proof/platform/production/delivery limits serta unrelated preservation dicatat tanpa self-referential SHA.

### Validasi

Docs:check, targeted Prettier/diff, final relevant gates dan normal hooks.

### Hasil dan bukti

Belum diimplementasikan atau diverifikasi pada task ini.

### Commit task

- Pesan: Ditentukan saat task selesai, Conventional Commit dengan ID task.
- SHA: Belum dibuat.
- Hook/checks: Belum dijalankan.
- Ledger: Receipt setelah commit pada update task berikutnya.

### Blocker atau tindak lanjut

Remote delivery/production memerlukan authorization dan gates tersendiri.
