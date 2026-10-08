# Modul: Ringkasan dashboard admin

> Status: proposal untuk review pengguna · 8 Oktober 2026 · Pengguna memilih dashboard terlebih dahulu dan meminta plan. Context berbasis main `65fcc2b58d5b316e8c44b2d99e28baf2e90e4f8c`. Planning tidak mengimplementasikan API/UI; task runtime menunggu approval scope.

## Tujuan modul

Admin memahami inventori editorial, current media jobs dan latest owners melalui dashboard yang read-only, akurat serta aman terhadap session loss/stale reads. [Context](../plans/admin-dashboard/repository-context.md), [plan](../plans/admin-dashboard/implementation-plan.md), [PRD-02/05/09](../product/prd.md#kebutuhan-produk-dan-kondisi-implementasi), [workflow](../guides/development-workflow.md), [template task](../templates/task.md). Definisi metrik/refresh/layout dimiliki plan; task berikut merujuk kontrak itu tanpa menyalinnya.

## User story: DASH-US-01 — Inventori dan navigasi

Sebagai admin, saya ingin melihat jumlah per jenis/status dan konten terbaru agar dapat menuju detail konten yang perlu dikelola.

## User story: DASH-US-02 — Status media current

Sebagai admin, saya ingin mengetahui job current yang menunggu, berjalan, retry atau gagal dan membuka owner-nya agar kegagalan dapat ditangani melalui kemampuan existing.

## User story: DASH-US-03 — Freshness dan akses privat

Sebagai admin, saya ingin ringkasan yang dapat direfresh serta hilang saat sesi tidak sah agar data lama tidak dianggap sebagai kondisi terkini atau terlihat oleh sesi lain.

## Aturan scope dan evidence

Runtime tasks tetap Backlog sampai proposal disetujui pengguna. Task planning dapat Done setelah docs/gates/local commit; itu bukan approval produk. Type counts editorial berbeda dari public playable, job counts bukan owner/attempt counts. API read-only tanpa S3/FFmpeg dan no new schema/env/dependency teridentifikasi. DB resets hanya dedicated test; migration development hanya jika schema change diotorisasi scope berikutnya. Commit setiap completed task sesudah gates dengan ID DASH; remote operations memerlukan izin tersendiri.

## Task: DASH-001 — Context, plan dan backlog

- Status: Done
- Owner: Codex
- Prioritas: P0
- Referensi: DASH-US-01/03, PRD-02/05/09; [implementation steps](../plans/admin-dashboard/implementation-plan.md#implementation-steps).
- Diperbarui: 2026-10-08
- Dependensi: Tidak ada.
- Ukuran: Satu outcome konkret; refine bila impact bertambah.

### Ruang lingkup

Reviewable snapshot/metrics/layout/AC before runtime.

Files/symbols: context, this plan, backlog, docs index.

Requirements: Record user priority, distinguish editorial/public and jobs/owners, preserve unrelated23 paths.

### Acceptance criteria

- [x] Context saved first; all runtime tasks remain unimplemented and detailed scope awaits review.
- [x] Proposed metrics/state/targets dan task dependencies jelas; docs validation/preservation lulus sebelum local planning commit dengan normal hooks. Runtime proof belum dijalankan.

### Validasi

docs:check, scoped Prettier, DAG/ID validation, diff, staged docs and normal hooks.

### Hasil dan bukti

8 Oktober 2026: context disimpan sebelum plan pada main65fcc2b; 11 steps/backlog tasks dengan outcome/files/requirements/validation/AC dan matching dependencies, DAG tanpa cycle. Hanya empat Markdown context/plan/backlog/index distage. bun run docs:check93 Markdown/896 links, staged-tree validator86/877, scoped Prettier dan git diff --check/git diff --cached --check lulus. Preservation22 existing files byte-identical dan original README dapat direkonstruksi persis setelah menghapus owned additions. Detailed scope tetap draft untuk review; DASH-002–011 belum diimplementasikan/verified. Tidak ada API/UI/schema/env/dependency change, runtime tests atau migration. Local planning commit melalui normal hooks; receipt final tersedia di git log dan dicatat pada update berikutnya, tanpa self-referential SHA.

### Commit task

- Pesan: docs: plan admin dashboard summary (DASH-001)
- SHA: `478f313145a962b574eaa6ec1594395c5d2c29e0`.
- Hook/checks: docs working93/896 dan staged86/877, scoped Prettier, DAG/task consistency, preservation/diff lulus sebelum commit; normal Husky docs/lint/types dan Commitlint wajib tanpa bypass.
- Ledger: Jangan menulis SHA commit sendiri sebelum tersedia.

### Blocker atau tindak lanjut

Detailed proposal menunggu review pengguna; bukan runtime blocker planning.

## Task: DASH-002 — Layout dan state specification

- Status: Done
- Owner: Codex
- Prioritas: P1
- Referensi: DASH-US-01/03, PRD-02/05/09; [implementation steps](../plans/admin-dashboard/implementation-plan.md#implementation-steps).
- Diperbarui: 2026-10-08
- Dependensi: DASH-001.
- Ukuran: Satu outcome konkret; refine bila impact bertambah.

### Ruang lingkup

Concrete English responsive layout and interactions using existing primitives.

Files/symbols: `docs/design/admin-dashboard.md`, plan/backlog/index.

Requirements: Four kinds, Series unpublished/archive rules, jobs units, latest8/failed5, stale/offline/focus/refresh/auth-loss states; no unsupported filter or mutation buttons.

### Acceptance criteria

- [x] Every label/counter/link/state mapped to a testable outcome; distinguish spec from implemented UI.
- [x] Definisi/state/invariants terkait pada plan terbukti; actual validation serta scope preservation dan commit tercatat sesuai workflow.

### Validasi

Requirement-to-browser matrix, docs/format/diff and hooks. Raster mockup only if requested separately; no new design dependency required.

### Hasil dan bukti

Layout/state specification tersedia untuk4 jenis, current-job units, bounded8/5 lists, canonical navigation, empty/loading/stale/offline/poll/auth loss dan15 width/theme cases. Approval pengguna tercatat; freshness runtime65fcc2b→478f313 source unchanged. No raster/source change.

### Commit task

- Pesan: docs: define admin dashboard layout and states (DASH-002)
- SHA: `ef1c1a03815592675a816d506c94b761d7af47df`.
- Hook/checks: docs:check, scoped Prettier/diff, preservation dan normal hooks; normal hooks wajib tanpa bypass.
- Ledger: Jangan menulis SHA commit sendiri sebelum tersedia.

### Blocker atau tindak lanjut

Menunggu approval proposal dan dependency task di atas; tidak menganggap scope atau hasil runtime sudah disetujui/verified.

## Task: DASH-003 — Repository dan domain aggregate

- Status: Done
- Owner: Codex
- Prioritas: P0
- Referensi: DASH-US-01/03, PRD-02/05/09; [implementation steps](../plans/admin-dashboard/implementation-plan.md#implementation-steps).
- Diperbarui: 2026-10-08
- Dependensi: DASH-002.
- Ukuran: Satu outcome konkret; refine bila impact bertambah.

### Ruang lingkup

Accurate snapshot without storage/FFmpeg I/O or N+1.

Files/symbols: dashboard model/repository/service and native tests.

Requirements: Content partition, current owner/generation job predicate, executor parity, stable bounded lists, safe numeric/timestamp mapping, DI and read-only transaction.

### Acceptance criteria

- [x] No fake zeros on dependencies/malformed results; no writes; no historical attempts counted.
- [x] Definisi/state/invariants terkait pada plan terbukti; actual validation serta scope preservation dan commit tercatat sesuai workflow.

### Validasi

Native behavior tests and root types/lint/build; actual PostgreSQL proof follows DASH-009.

### Hasil dan bukti

Agregasi SQL lima bounded queries dalam transaksi repeatable-read/read-only; satu current-jobs predicate untuk count/failures, pointer-owner-role-generation checks, archive parent exclusions dan request/worker parity. Service menjaga safe-integer counters, UTC timestamp, whitelist response dan safe503. Native API163 tests/937 assertions pass; PostgreSQL semantics/performance diperiksa di DASH-009.

### Commit task

- Pesan: feat(api): aggregate dashboard summary (DASH-003)
- SHA: Belum dibuat; receipt dicatat pada update dokumentasi berikutnya sesudah commit berhasil.
- Hook/checks: API163 pass, root types3/lint1/build2 pass, scoped Prettier/docs/diff/preservation; normal hooks wajib tanpa bypass.
- Ledger: Jangan menulis SHA commit sendiri sebelum tersedia.

### Blocker atau tindak lanjut

Menunggu approval proposal dan dependency task di atas; tidak menganggap scope atau hasil runtime sudah disetujui/verified.

## Task: DASH-004 — Private endpoint, DI dan OpenAPI

- Status: Backlog
- Owner: Codex
- Prioritas: P0
- Referensi: DASH-US-01/03, PRD-02/05/09; [implementation steps](../plans/admin-dashboard/implementation-plan.md#implementation-steps).
- Diperbarui: 2026-10-08
- Dependensi: DASH-003.
- Ukuran: Satu outcome konkret; refine bila impact bertambah.

### Ruang lingkup

Typed admin GET available through existing gateway.

Files/symbols: dashboard index/model tests, app/index composition, relevant native HTTP/OpenAPI/gateway tests.

Requirements: Guard before repository, strict query/DTO/errors, private no-store, unique operationId/security, import-only factory and type-preserving chaining.

### Acceptance criteria

- [ ] Both Eden contract and authorized request paths remain correct; no authentication expansion to public routes.
- [ ] Definisi/state/invariants terkait pada plan terbukti; actual validation serta scope preservation dan commit tercatat sesuai workflow.

### Validasi

`app.handle`401/403/422/503/200, no service call on denial, regression/public access and root gates.

### Hasil dan bukti

Belum diimplementasikan atau diverifikasi. Commands pada plan adalah requirement, bukan hasil actual.

### Commit task

- Pesan: Conventional Commit dengan ID task setelah acceptance criteria dan relevant gates lulus.
- SHA: Belum dibuat; receipt dicatat pada update dokumentasi berikutnya sesudah commit berhasil.
- Hook/checks: Belum dijalankan untuk task ini.
- Ledger: Jangan menulis SHA commit sendiri sebelum tersedia.

### Blocker atau tindak lanjut

Menunggu approval proposal dan dependency task di atas; tidak menganggap scope atau hasil runtime sudah disetujui/verified.

## Task: DASH-005 — Private client, query dan hook

- Status: Backlog
- Owner: Codex
- Prioritas: P0
- Referensi: DASH-US-02/03, PRD-02/05/09; [implementation steps](../plans/admin-dashboard/implementation-plan.md#implementation-steps).
- Diperbarui: 2026-10-08
- Dependensi: DASH-004.
- Ukuran: Satu outcome konkret; refine bila impact bertambah.

### Ruang lingkup

Summary read owned by current session with controlled refresh.

Files/symbols: dashboard client/queries/hook, web behavior/type tests.

Requirements: Signal, identity key, strict DTO/invariants, no retry loops, online/visibility30s polling, stale recovery and cleanup; browser-only summary read.

### Acceptance criteria

- [ ] Wrong/malformed response never cached as success; logout/expiry stops reads and suppresses late result; no private SSR summary.
- [ ] Definisi/state/invariants terkait pada plan terbukti; actual validation serta scope preservation dan commit tercatat sesuai workflow.

### Validasi

Injected-fetch and QueryClient/timer behavior, compile-only Eden positive/negative, auth/cache regression and root gates.

### Hasil dan bukti

Belum diimplementasikan atau diverifikasi. Commands pada plan adalah requirement, bukan hasil actual.

### Commit task

- Pesan: Conventional Commit dengan ID task setelah acceptance criteria dan relevant gates lulus.
- SHA: Belum dibuat; receipt dicatat pada update dokumentasi berikutnya sesudah commit berhasil.
- Hook/checks: Belum dijalankan untuk task ini.
- Ledger: Jangan menulis SHA commit sendiri sebelum tersedia.

### Blocker atau tindak lanjut

Menunggu approval proposal dan dependency task di atas; tidak menganggap scope atau hasil runtime sudah disetujui/verified.

## Task: DASH-006 — Content overview dan latest list

- Status: Backlog
- Owner: Codex
- Prioritas: P1
- Referensi: DASH-US-01/03, PRD-02/05/09; [implementation steps](../plans/admin-dashboard/implementation-plan.md#implementation-steps).
- Diperbarui: 2026-10-08
- Dependensi: DASH-005.
- Ukuran: Satu outcome konkret; refine bila impact bertambah.

### Ruang lingkup

Admin sees four accurate kind summaries and up to8 latest owners with valid navigation.

Files/symbols: route and dashboard summary/latest/state components.

Requirements: Existing shell/account/quick actions, counters partition, editorial helper, empty/loading/stale/error, typed links and mobile-first wrapping.

### Acceptance criteria

- [ ] Empty is real0, error is unavailable/stale; Episode card never links to an unsupported global list; archive labels don't mutate child state.
- [ ] Definisi/state/invariants terkait pada plan terbukti; actual validation serta scope preservation dan commit tercatat sesuai workflow.

### Validasi

Relevant units and root gates, intermediate built-browser smoke if harness available; complete acceptance DASH-010.

### Hasil dan bukti

Belum diimplementasikan atau diverifikasi. Commands pada plan adalah requirement, bukan hasil actual.

### Commit task

- Pesan: Conventional Commit dengan ID task setelah acceptance criteria dan relevant gates lulus.
- SHA: Belum dibuat; receipt dicatat pada update dokumentasi berikutnya sesudah commit berhasil.
- Hook/checks: Belum dijalankan untuk task ini.
- Ledger: Jangan menulis SHA commit sendiri sebelum tersedia.

### Blocker atau tindak lanjut

Menunggu approval proposal dan dependency task di atas; tidak menganggap scope atau hasil runtime sudah disetujui/verified.

## Task: DASH-007 — Current media dan needs attention

- Status: Backlog
- Owner: Codex
- Prioritas: P1
- Referensi: DASH-US-02/03, PRD-02/05/09; [implementation steps](../plans/admin-dashboard/implementation-plan.md#implementation-steps).
- Diperbarui: 2026-10-08
- Dependensi: DASH-006.
- Ukuran: Satu outcome konkret; refine bila impact bertambah.

### Ruang lingkup

Job status and failed items guide admin to current owner detail.

Files/symbols: dashboard media/attention components and navigation tests.

Requirements: Four current-job counters including Retry, max5 failure list, source/cover roles, Series/Episode routes, stable empty states and read-only actions.

### Acceptance criteria

- [ ] No misleading readiness/worker-health claims, storage URLs or reprocess button; failures count/list share predicate.
- [ ] Definisi/state/invariants terkait pada plan terbukti; actual validation serta scope preservation dan commit tercatat sesuai workflow.

### Validasi

Mapping/bounds/navigation units, relevant regressions and root gates; actual dataset browser proof DASH-010.

### Hasil dan bukti

Belum diimplementasikan atau diverifikasi. Commands pada plan adalah requirement, bukan hasil actual.

### Commit task

- Pesan: Conventional Commit dengan ID task setelah acceptance criteria dan relevant gates lulus.
- SHA: Belum dibuat; receipt dicatat pada update dokumentasi berikutnya sesudah commit berhasil.
- Hook/checks: Belum dijalankan untuk task ini.
- Ledger: Jangan menulis SHA commit sendiri sebelum tersedia.

### Blocker atau tindak lanjut

Menunggu approval proposal dan dependency task di atas; tidak menganggap scope atau hasil runtime sudah disetujui/verified.

## Task: DASH-008 — Mutation invalidation integration

- Status: Backlog
- Owner: Codex
- Prioritas: P1
- Referensi: DASH-US-02/03, PRD-02/05/09; [implementation steps](../plans/admin-dashboard/implementation-plan.md#implementation-steps).
- Diperbarui: 2026-10-08
- Dependensi: DASH-005.
- Ukuran: Satu outcome konkret; refine bila impact bertambah.

### Ruang lingkup

Dashboard refreshed after confirmed application changes and external writes.

Files/symbols: existing content/series/media/publication helpers and current controllers/callers if needed; query integration tests.

Requirements: Add exact identity dashboard invalidation after safe confirmation, no POST retry/new writes, no hidden-page refetch storm or session reseeding. Existing worker changes observed with bounded refresh/poll.

### Acceptance criteria

- [ ] Initial in-flight stale snapshot cannot hide confirmed update; latest refresh wins; private cleanup remains authoritative.
- [ ] Definisi/state/invariants terkait pada plan terbukti; actual validation serta scope preservation dan commit tercatat sesuai workflow.

### Validasi

Same-session create/edit/publish/archive/media updates, different-session isolation, invalidation during pending read, unmount/session loss, existing uploader/publication tests and root gates.

### Hasil dan bukti

Belum diimplementasikan atau diverifikasi. Commands pada plan adalah requirement, bukan hasil actual.

### Commit task

- Pesan: Conventional Commit dengan ID task setelah acceptance criteria dan relevant gates lulus.
- SHA: Belum dibuat; receipt dicatat pada update dokumentasi berikutnya sesudah commit berhasil.
- Hook/checks: Belum dijalankan untuk task ini.
- Ledger: Jangan menulis SHA commit sendiri sebelum tersedia.

### Blocker atau tindak lanjut

Menunggu approval proposal dan dependency task di atas; tidak menganggap scope atau hasil runtime sudah disetujui/verified.

## Task: DASH-009 — PostgreSQL/native auth proof

- Status: Backlog
- Owner: Codex
- Prioritas: P1
- Referensi: DASH-US-02/03, PRD-02/05/09; [implementation steps](../plans/admin-dashboard/implementation-plan.md#implementation-steps).
- Diperbarui: 2026-10-08
- Dependensi: DASH-004.
- Ukuran: Satu outcome konkret; refine bila impact bertambah.

### Ruang lingkup

Aggregate definitions and concurrency verified on real dedicated database.

Files/symbols: guarded dashboard integration suite, fixture as needed, HTTP/OpenAPI native regression.

Requirements: >100 mixed rows; all statuses including Series unpublished/archive; hidden episode/archived parent; current pointers/generations, both executors, old failures/retries, tie sorting8/5, safe outputs and concurrent updates within snapshot. Query count fixed and EXPLAIN observed.

### Acceptance criteria

- [ ] One consistent read snapshot, exact partitions/counters/lists, authorized native session only; record actual results/limitations.
- [ ] Definisi/state/invariants terkait pada plan terbukti; actual validation serta scope preservation dan commit tercatat sesuai workflow.

### Validasi

`bun test apps/api/test/integration/admin-dashboard-proof.test.ts` with guarded CONTENT_TEST_DATABASE_URL, serial; root API/native auth tests and gates. No development DB reset/migration.

### Hasil dan bukti

Belum diimplementasikan atau diverifikasi. Commands pada plan adalah requirement, bukan hasil actual.

### Commit task

- Pesan: Conventional Commit dengan ID task setelah acceptance criteria dan relevant gates lulus.
- SHA: Belum dibuat; receipt dicatat pada update dokumentasi berikutnya sesudah commit berhasil.
- Hook/checks: Belum dijalankan untuk task ini.
- Ledger: Jangan menulis SHA commit sendiri sebelum tersedia.

### Blocker atau tindak lanjut

Menunggu approval proposal dan dependency task di atas; tidak menganggap scope atau hasil runtime sudah disetujui/verified.

## Task: DASH-010 — Built-browser acceptance dan regressions

- Status: Backlog
- Owner: Codex
- Prioritas: P1
- Referensi: DASH-US-02/03, PRD-02/05/09; [implementation steps](../plans/admin-dashboard/implementation-plan.md#implementation-steps).
- Diperbarui: 2026-10-08
- Dependensi: DASH-006, DASH-007, DASH-008, DASH-009.
- Ukuran: Satu outcome konkret; refine bila impact bertambah.

### Ruang lingkup

Actual dashboard API/SQL flow works across themes, widths and failures.

Files/symbols: explicit dashboard browser phase/worker and guarded fixture, owned web tests and backlog evidence.

Requirements: Mixed/empty/long-title data, navigation, repeated Refresh, metadata/publication transitions, real job-state updates, stale503/offline recovery, poll/background behavior, native SDK session loss and late response cleanup. 320/390/768/1024/1440 × Light/Dark/System, keyboard/44px/focus/no overflow.

### Acceptance criteria

- [ ] Counts reflect dedicated database and stale reads can't overwrite newer confirmation; browser fixture and native-cookie proof limits explicit; no new media upload/player proof claimed.
- [ ] Definisi/state/invariants terkait pada plan terbukti; actual validation serta scope preservation dan commit tercatat sesuai workflow.

### Validasi

Built Bun/Nitro browser via existing runner after dashboard phase is implemented; auth SSR/gateway/import-boundary and existing dashboard/content/Series/uploader/publication regressions; all root gates. SQL fixtures distinguish metadata/job state from actual transcode.

### Hasil dan bukti

Belum diimplementasikan atau diverifikasi. Commands pada plan adalah requirement, bukan hasil actual.

### Commit task

- Pesan: Conventional Commit dengan ID task setelah acceptance criteria dan relevant gates lulus.
- SHA: Belum dibuat; receipt dicatat pada update dokumentasi berikutnya sesudah commit berhasil.
- Hook/checks: Belum dijalankan untuk task ini.
- Ledger: Jangan menulis SHA commit sendiri sebelum tersedia.

### Blocker atau tindak lanjut

Menunggu approval proposal dan dependency task di atas; tidak menganggap scope atau hasil runtime sudah disetujui/verified.

## Task: DASH-011 — Canonical docs dan closure

- Status: Backlog
- Owner: Codex
- Prioritas: P1
- Referensi: DASH-US-02/03, PRD-02/05/09; [implementation steps](../plans/admin-dashboard/implementation-plan.md#implementation-steps).
- Diperbarui: 2026-10-08
- Dependensi: DASH-010.
- Ukuran: Satu outcome konkret; refine bila impact bertambah.

### Ruang lingkup

Current docs and per-task receipts reflect actual completed scope.

Files/symbols: canonical PRD/architecture/runbook/design/index, plan/backlog.

Requirements: PRD-02 summary status updated while settings remains open; actual commands/results/SHAs, approved decisions and preservation; no self-referential SHA or production claim.

### Acceptance criteria

- [ ] All mandatory DASH tasks verified and committed separately; remaining rollout/features accurately identified.
- [ ] Definisi/state/invariants terkait pada plan terbukti; actual validation serta scope preservation dan commit tercatat sesuai workflow.

### Validasi

Fresh source/mandatory AC audit, docs:check, targeted Prettier/diff, relevant final gates and normal hooks.

### Hasil dan bukti

Belum diimplementasikan atau diverifikasi. Commands pada plan adalah requirement, bukan hasil actual.

### Commit task

- Pesan: Conventional Commit dengan ID task setelah acceptance criteria dan relevant gates lulus.
- SHA: Belum dibuat; receipt dicatat pada update dokumentasi berikutnya sesudah commit berhasil.
- Hook/checks: Belum dijalankan untuk task ini.
- Ledger: Jangan menulis SHA commit sendiri sebelum tersedia.

### Blocker atau tindak lanjut

Menunggu approval proposal dan dependency task di atas; tidak menganggap scope atau hasil runtime sudah disetujui/verified.
