# Modul: Admin Series, season dan episode

> Status: fondasi dalam eksekusi · 8 Oktober 2026 · Pengguna memilih modul ini setelah katalog PR #13. Scope runtime per task; belum menyatakan keseluruhan editor/publikasi Series selesai.

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

Context sebelum plan/backlog tersimpan pada snapshot04b098b; user module choice dan23 path unrelated dipisahkan. `bun run docs:check` lulus89 Markdown/854 links; targeted Prettier dan git diff --check lulus. Snapshot committed akan diperiksa sebelum commit; source/runtime belum diubah pada task ini.

### Commit task

- Pesan: docs: plan admin series and episode workflow (ASER-001)
- SHA: Belum dibuat.
- Hook/checks: Docs/Prettier/diff lulus; normal pre-commit docs/lint/types dan Commitlint diperlukan sebelum task commit diterima.
- Ledger: Receipt setelah commit pada update task berikutnya.

### Blocker atau tindak lanjut

Ikuti dependensi step; task selanjutnya ASER-002.

## Task: ASER-002 — Private season/episode client dan queries

- Status: Ready
- Owner: Codex
- Prioritas: P0
- Referensi: ASER-US-01/02/03, PRD-03/04/05/06/08/09; [step plan](../plans/admin-series-episodes/implementation-plan.md#aser-002--private-seasonepisode-client-dan-queries).
- Diperbarui: 2026-10-08
- Dependensi: ASER-001
- Ukuran: Satu outcome konkret sesuai step; refine bila impact berubah.

### Ruang lingkup

Typed Eden season list/create/patch serta episode list/detail/create/patch; query/mutation factories tanpa UI. Source targets/symbols berada pada step plan dan impact map; folder future dibuat saat task owner berjalan.

### Acceptance criteria

- [ ] Wrong-kind/owner/version/UUID atau malformed2xx tidak menjadi confirmed save; signals/cursor20/HTTP codes terjaga.
- [ ] Identity/filter keys, cancellation/cleanup401 dan scoped invalidation; mutations satu request tanpa replay/optimistic success.

### Validasi

Native injected-fetch/QueryClient tests, compile-only Eden positif/negatif, existing web/API regressions dan root quality gates.

### Hasil dan bukti

Belum diimplementasikan atau diverifikasi pada task ini.

### Commit task

- Pesan: Ditentukan saat task selesai, Conventional Commit dengan ID task.
- SHA: Belum dibuat.
- Hook/checks: Belum dijalankan.
- Ledger: Receipt setelah commit pada update task berikutnya.

### Blocker atau tindak lanjut

Ikuti dependensi step; task selanjutnya ASER-003.

## Task: ASER-003 — Route dan state specification editor

- Status: Backlog
- Owner: Codex
- Prioritas: P1
- Referensi: ASER-US-01/02/03, PRD-03/04/05/06/08/09; [step plan](../plans/admin-series-episodes/implementation-plan.md#aser-003--editor-route-dan-state-specification).
- Diperbarui: 2026-10-08
- Dependensi: ASER-002
- Ukuran: Satu outcome konkret sesuai step; refine bila impact berubah.

### Ruang lingkup

English responsive editor states memakai approved admin shell/form primitives, termasuk route/Back/dirty/conflict. Source targets/symbols berada pada step plan dan impact map; folder future dibuat saat task owner berjalan.

### Acceptance criteria

- [ ] Route season/episode dan state matrix lengkap, media/publication states terpisah.
- [ ] 320–1440 Light/Dark/System,44px/keyboard/focus, long list/copy dan inherited genre dipetakan ke assertions.

### Validasi

Source/requirement crosscheck, docs/Prettier/diff/hook; state specification bukan runtime proof.

### Hasil dan bukti

Belum diimplementasikan atau diverifikasi pada task ini.

### Commit task

- Pesan: Ditentukan saat task selesai, Conventional Commit dengan ID task.
- SHA: Belum dibuat.
- Hook/checks: Belum dijalankan.
- Ledger: Receipt setelah commit pada update task berikutnya.

### Blocker atau tindak lanjut

Ikuti dependensi step; task selanjutnya ASER-004.

## Task: ASER-004 — Season list/create/edit

- Status: Backlog
- Owner: Codex
- Prioritas: P1
- Referensi: ASER-US-01/02/03, PRD-03/04/05/06/08/09; [step plan](../plans/admin-series-episodes/implementation-plan.md#aser-004--season-listcreateedit).
- Diperbarui: 2026-10-08
- Dependensi: ASER-003
- Ukuran: Satu outcome konkret sesuai step; refine bila impact berubah.

### Ruang lingkup

Authenticated Series entry, pemilih/list season dan create/edit dengan season rowVersion. Source targets/symbols berada pada step plan dan impact map; folder future dibuat saat task owner berjalan.

### Acceptance criteria

- [ ] Tidak menduplikasi default Season1; nomor/release/duplicate/stale/archived errors mempertahankan input.
- [ ] Dirty navigation dan owner/session cancellation, latest refetch/Back; published parent aktif mengikuti API.

### Validasi

Form/client tests, guarded metadata persistence/browser, docs dan root gates.

### Hasil dan bukti

Belum diimplementasikan atau diverifikasi pada task ini.

### Commit task

- Pesan: Ditentukan saat task selesai, Conventional Commit dengan ID task.
- SHA: Belum dibuat.
- Hook/checks: Belum dijalankan.
- Ledger: Receipt setelah commit pada update task berikutnya.

### Blocker atau tindak lanjut

Ikuti dependensi step; task selanjutnya ASER-005.

## Task: ASER-005 — Episode list/create/detail/edit

- Status: Backlog
- Owner: Codex
- Prioritas: P1
- Referensi: ASER-US-01/02/03, PRD-03/04/05/06/08/09; [step plan](../plans/admin-series-episodes/implementation-plan.md#aser-005--episode-listcreatedetailedit).
- Diperbarui: 2026-10-08
- Dependensi: ASER-004
- Ukuran: Satu outcome konkret sesuai step; refine bila impact berubah.

### Ruang lingkup

Episode route tersendiri, cursor20/manual Load more per season, metadata/number/rights/genres. Source targets/symbols berada pada step plan dan impact map; folder future dibuat saat task owner berjalan.

### Acceptance criteria

- [ ] Created/edited episode persisten pada grouping yang benar; duplicate/stale/422 ditangani tanpa replay.
- [ ] Genre inheritance, locked first-publish grouping/slug, read-only published dan owner/page/Back context sesuai API.

### Validasi

Native form/client/state tests, dedicated metadata SQL/browser, Film regression dan root gates.

### Hasil dan bukti

Belum diimplementasikan atau diverifikasi pada task ini.

### Commit task

- Pesan: Ditentukan saat task selesai, Conventional Commit dengan ID task.
- SHA: Belum dibuat.
- Hook/checks: Belum dijalankan.
- Ledger: Receipt setelah commit pada update task berikutnya.

### Blocker atau tindak lanjut

Ikuti dependensi step; task selanjutnya ASER-006.

## Task: ASER-006 — Episode upload dan Preview

- Status: Backlog
- Owner: Codex
- Prioritas: P1
- Referensi: ASER-US-01/02/03, PRD-03/04/05/06/08/09; [step plan](../plans/admin-series-episodes/implementation-plan.md#aser-006--episode-upload-dan-preview).
- Diperbarui: 2026-10-08
- Dependensi: ASER-005
- Ukuran: Satu outcome konkret sesuai step; refine bila impact berubah.

### Ruang lingkup

Reuse uploader/crop/inventory video-owner; episode600s/512MB; HLS preview manual. Source targets/symbols berada pada step plan dan impact map; folder future dibuat saat task owner berjalan.

### Acceptance criteria

- [ ] Real source/cover dan HLS siap, batas invalid file serta processing/recovery ditampilkan.
- [ ] Resume/pause/reselection/owner switch tidak menghapus metadata atau melakukan autopublish.

### Validasi

Guarded MinIO/FFmpeg/browser, relevant media/upload tests dan root gates.

### Hasil dan bukti

Belum diimplementasikan atau diverifikasi pada task ini.

### Commit task

- Pesan: Ditentukan saat task selesai, Conventional Commit dengan ID task.
- SHA: Belum dibuat.
- Hook/checks: Belum dijalankan.
- Ledger: Receipt setelah commit pada update task berikutnya.

### Blocker atau tindak lanjut

Ikuti dependensi step; task selanjutnya ASER-007.

## Task: ASER-007 — Authoritative Series readiness API

- Status: Backlog
- Owner: Codex
- Prioritas: P0
- Referensi: ASER-US-01/02/03, PRD-03/04/05/06/08/09; [step plan](../plans/admin-series-episodes/implementation-plan.md#aser-007--authoritative-series-readiness-api).
- Diperbarui: 2026-10-08
- Dependensi: ASER-001
- Ukuran: Satu outcome konkret sesuai step; refine bila impact berubah.

### Ruang lingkup

Shared Series readiness assessment dan private GET sebelum panel publish; existing POST parity. Source targets/symbols berada pada step plan dan impact map; folder future dibuat saat task owner berjalan.

### Acceptance criteria

- [ ] Title/synopsis/current cover/child playable/lifecycle/upload/version gates sama antara GET assessment dan POST transaction.
- [ ] Guard/error/schema/no-store, no signing/write in GET dan concurrent state ditangani authoritative.

### Validasi

bun:test/app.handle, injected evidence, dedicated SQL child/archive/generation parity dan root gates.

### Hasil dan bukti

Belum diimplementasikan atau diverifikasi pada task ini.

### Commit task

- Pesan: Ditentukan saat task selesai, Conventional Commit dengan ID task.
- SHA: Belum dibuat.
- Hook/checks: Belum dijalankan.
- Ledger: Receipt setelah commit pada update task berikutnya.

### Blocker atau tindak lanjut

Ikuti dependensi step; task selanjutnya ASER-008.

## Task: ASER-008 — Series publication client/controller

- Status: Backlog
- Owner: Codex
- Prioritas: P1
- Referensi: ASER-US-01/02/03, PRD-03/04/05/06/08/09; [step plan](../plans/admin-series-episodes/implementation-plan.md#aser-008--series-publication-clientcontroller).
- Diperbarui: 2026-10-08
- Dependensi: ASER-007
- Ukuran: Satu outcome konkret sesuai step; refine bila impact berubah.

### Ruang lingkup

Typed owner-specific readiness/mutation keys/intent/reconciliation memakai controller existing. Source targets/symbols berada pada step plan dan impact map; folder future dibuat saat task owner berjalan.

### Acceptance criteria

- [ ] Version dan idempotency intent stabil; no auto replay atau fabricated success.
- [ ] Network/auth/owner cancellation dan late results tidak reseed private cache atau navigate owner lain.

### Validasi

Client/controller/private cache tests, relevant auth/publication regression dan root gates.

### Hasil dan bukti

Belum diimplementasikan atau diverifikasi pada task ini.

### Commit task

- Pesan: Ditentukan saat task selesai, Conventional Commit dengan ID task.
- SHA: Belum dibuat.
- Hook/checks: Belum dijalankan.
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
