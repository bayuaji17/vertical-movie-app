# Modul: Site Settings

> Status: detailed plan draft untuk review · 9 Oktober 2026 · Direction empat field teks/cache diterima pengguna; implementasi belum dimulai. Base main `36f185e275bc90fa609cf071405848ff021c3223`, planning branch `chore/site-settings-plan`.

## Tujuan modul

Admin mengubah identitas situs melalui form privat; halaman publik memakai nilai tersimpan dengan cache backend/frontend tanpa settings SELECT pada setiap request. Kontrak/default/cache/UX dimiliki [plan](../plans/site-settings/implementation-plan.md#desired-behavior); baseline source dimiliki [context](../plans/site-settings/repository-context.md). Referensi [PRD-02](../product/prd.md#kebutuhan-produk-dan-kondisi-implementasi), [GR-01/02/05/07/08](../product/global-rules.md#aturan-produk-lintas-fitur), [workflow](../guides/development-workflow.md) dan [template](../templates/task.md).

## User story: SSET-US-01

Sebagai admin, saya ingin mengedit/menyimpan empat field dengan validasi, preview, conflict/unknown-outcome recovery dan perlindungan sesi, sehingga identitas situs dapat dikelola tanpa kehilangan draft atau menimpa perubahan lain.

## User story: SSET-US-02

Sebagai pengunjung, saya ingin branding/metadata konsisten pada seluruh halaman publik, sehingga identitas tersimpan tampil sejak SSR dan tetap dapat digunakan ketika refetch gagal.

## User story: SSET-US-03

Sebagai operator, saya ingin cache hits dan request bersamaan menghindari settings SELECT berulang, sehingga beban database terukur tanpa melemahkan auth atau memperpanjang TTL data lama.

## Status dan bukti

SSET-001 adalah task dokumentasi yang diminta pengguna. SSET-002–012 Backlog sampai detailed plan disetujui dan freshness diperiksa. Perintah validasi di bawah adalah requirement, bukan hasil actual. Local task commits mengikuti AGENTS; remote delivery/deployment memerlukan authorization tersendiri.

## Task: SSET-001 — Evidence-backed planning

- Status: Done
- Owner: Codex/pengembang
- Prioritas: 1
- Referensi: SSET-US-01/02/03, PRD-02, GR-01/02/05/07/08; [implementation step](../plans/site-settings/implementation-plan.md#sset-001--evidence-backed-planning).
- Diperbarui: 2026-10-09
- Dependensi: none
- Ukuran: Satu outcome terbatas; commit terpisah setelah acceptance dan gates.

### Ruang lingkup

context saved before complete plan/backlog with preservation and freshness evidence.

Files/symbols: context, this plan, module backlog and owned docs index links.

Requirements: pinned SHA, four fields/cache contracts, constraints, matching dependency graph and observable AC; detailed plan remains draft pending review.

### Acceptance criteria

- [x] links valid; each requirement covered below; only owned docs in local task commit.
- [x] Validasi task dan relevant gates lulus; changes hanya milik task dan local commit melalui normal hooks.

### Validasi

scoped Prettier, docs:check, diff/staged-tree checks, unrelated preservation and normal commit hooks.

### Hasil dan bukti

9 Oktober 2026: context disimpan sebelum plan pada pinned main36f185e. Plan12 steps lengkap dengan backlog/DAG, default/length/cache/fresh-read/SSR/admin/SQL/browser acceptance. Scoped Prettier lulus; `bun run docs:check`97 Markdown/950 local links dan staged-tree validator90/931 lulus; `git diff --check`/cached diff lulus. Plan/backlog dependency audit tanpa cycle dan affected-action contract lulus. Preservation22 unrelated files byte-identical; README setelah owned additions dihapus sama persis baseline lokal. Hanya empat owned Markdown distage. Local planning commit melalui normal hooks; actual SHA dicatat pada update berikutnya, tanpa self-reference. Detailed product plan tetap draft untuk review; runtime/schema/env/dependency belum berubah dan belum ada migration/integration/browser proof baru atau remote operation.

### Commit task

- Pesan: docs: plan site settings and cache (SSET-001)
- SHA: belum dibuat; receipt dicatat pada update berikutnya setelah successful commit, bukan self-referential.
- Hook/checks: docs/format/diff/staged-tree/preservation lulus; normal docs/lint/types dan Commitlint wajib pada task commit tanpa bypass.
- Ledger: actual prior SHA dan evidence pada task/plan berikutnya.

### Blocker atau tindak lanjut

Detailed plan siap untuk review; runtime approval belum diberikan.

## Task: SSET-002 — Singleton schema and additive migration

- Status: Backlog
- Owner: Codex/pengembang
- Prioritas: 2
- Referensi: SSET-US-01/02/03, PRD-02, GR-01/02/05/07/08; [implementation step](../plans/site-settings/implementation-plan.md#sset-002--singleton-schema-and-additive-migration).
- Diperbarui: 2026-10-09
- Dependensi: SSET-001
- Ukuran: Satu outcome terbatas; commit terpisah setelah acceptance dan gates.

### Ruang lingkup

persisted initial settings and safe upgrade.

Files/symbols: `db/schema/site-settings.ts`, schema export, generated migration/meta; `siteSettings`.

Requirements: singleton id/checks, four text fields, rowVersion/update timestamp, idempotent default insertion; generate/review current migration sequence. Apply pending development migration only after preservation snapshot and test upgrade review.

### Acceptance criteria

- [ ] exactly one initialized row; invalid singleton/length writes rejected; existing auth/content/media unaffected.
- [ ] Validasi task dan relevant gates lulus; changes hanya milik task dan local commit melalui normal hooks.

### Validasi

dedicated test fresh/populated/rerun proof, full gates, `bun run --cwd apps/api db:migrate` on configured development DB, journal/schema and existing-row preservation evidence.

### Hasil dan bukti

Belum diimplementasikan atau diverifikasi. Commands pada plan adalah requirement, bukan hasil actual.

### Commit task

- Pesan: Conventional Commit dengan ID SSET-002 sesudah acceptance/gates lulus.
- SHA: belum dibuat; receipt dicatat pada update berikutnya setelah successful commit, bukan self-referential.
- Hook/checks: belum dijalankan untuk task ini.
- Ledger: actual prior SHA dan evidence pada task/plan berikutnya.

### Blocker atau tindak lanjut

Menunggu detailed plan approval, freshness dan dependent tasks. Tidak ada runtime/production proof yang diasumsikan dari planning.

## Task: SSET-003 — Domain validation and versioned persistence

- Status: Backlog
- Owner: Codex/pengembang
- Prioritas: 3
- Referensi: SSET-US-01/02/03, PRD-02, GR-01/02/05/07/08; [implementation step](../plans/site-settings/implementation-plan.md#sset-003--domain-validation-and-versioned-persistence).
- Diperbarui: 2026-10-09
- Dependensi: SSET-002
- Ukuran: Satu outcome terbatas; commit terpisah setelah acceptance dan gates.

### Ruang lingkup

valid full Save atomically returns committed values or safe conflict/error.

Files/symbols: settings model/repository/service and service tests; normalized fields, conditional update.

Requirements: exact body keys, character-count parity, trim/control rules, positive expectedVersion, updatedAt UTC, no request seed; missing row503, wrong version409, validation422.

### Acceptance criteria

- [ ] racing writes from same version yield one success; inputs survive failure; no partial fields or credential output.
- [ ] Validasi task dan relevant gates lulus; changes hanya milik task dan local commit melalui normal hooks.

### Validasi

native deterministic service tests and real SQL smoke against isolated fixtures; root gates.

### Hasil dan bukti

Belum diimplementasikan atau diverifikasi. Commands pada plan adalah requirement, bukan hasil actual.

### Commit task

- Pesan: Conventional Commit dengan ID SSET-003 sesudah acceptance/gates lulus.
- SHA: belum dibuat; receipt dicatat pada update berikutnya setelah successful commit, bukan self-referential.
- Hook/checks: belum dijalankan untuk task ini.
- Ledger: actual prior SHA dan evidence pada task/plan berikutnya.

### Blocker atau tindak lanjut

Menunggu detailed plan approval, freshness dan dependent tasks. Tidak ada runtime/production proof yang diasumsikan dari planning.

## Task: SSET-004 — Backend cache, single-flight and save fencing

- Status: Backlog
- Owner: Codex/pengembang
- Prioritas: 4
- Referensi: SSET-US-03, PRD-02, GR-01/02/05/07/08; [implementation step](../plans/site-settings/implementation-plan.md#sset-004--backend-cache-single-flight-and-save-fencing).
- Diperbarui: 2026-10-09
- Dependensi: SSET-003
- Ukuran: Satu outcome terbatas; commit terpisah setelah acceptance dan gates.

### Ruang lingkup

public/cached admin settings reads avoid repeated SELECTs and stale fills.

Files/symbols: settings cache/service/cache tests; snapshot, generation, flights, cooldown and prime.

Requirements: TTL60 remaining freshness, warm/cold coalescing, separate authorized fresh flight, no per-consumer abort of shared work, monotonic save prime, uncertain-commit expiry and5-second failure cooldown.

### Acceptance criteria

- [ ] normal cold100 calls one SELECT; warm calls zero extra; Save refill zero extra SELECT; old data cannot replace new cache; bounded state and no success-cached errors.
- [ ] Validasi task dan relevant gates lulus; changes hanya milik task dan local commit melalui normal hooks.

### Validasi

fake clock/deferred read tests including100 parallel reads, expiry boundary, rejected flight cleanup, late pre-save fill, out-of-order successful commits, missing row/outage/cooldown and detached aborted waiter; root gates.

### Hasil dan bukti

Belum diimplementasikan atau diverifikasi. Commands pada plan adalah requirement, bukan hasil actual.

### Commit task

- Pesan: Conventional Commit dengan ID SSET-004 sesudah acceptance/gates lulus.
- SHA: belum dibuat; receipt dicatat pada update berikutnya setelah successful commit, bukan self-referential.
- Hook/checks: belum dijalankan untuk task ini.
- Ledger: actual prior SHA dan evidence pada task/plan berikutnya.

### Blocker atau tindak lanjut

Menunggu detailed plan approval, freshness dan dependent tasks. Tidak ada runtime/production proof yang diasumsikan dari planning.

## Task: SSET-005 — Typed HTTP composition and exact gateway

- Status: Backlog
- Owner: Codex/pengembang
- Prioritas: 5
- Referensi: SSET-US-01/02/03, PRD-02, GR-01/02/05/07/08; [implementation step](../plans/site-settings/implementation-plan.md#sset-005--typed-http-composition-and-exact-gateway).
- Diperbarui: 2026-10-09
- Dependensi: SSET-004
- Ukuran: Satu outcome terbatas; commit terpisah setelah acceptance dan gates.

### Ruang lingkup

public GET and protected admin GET/PATCH accessible through real paths with safe DTOs.

Files/symbols: settings index/model/tests, API app/bootstrap, web gateway/tests, Eden contract proof.

Requirements: separate public/private hook scope, existing native guard, strict query/body, public/private projections, no-store, fresh=1 private only, supported errors/OpenAPI, one injected process cache; exact proxy paths/methods/header behavior.

### Acceptance criteria

- [ ] anonymous GET works even when auth dependency fails; unauthorized writes never reach repository; guarded routes remain guarded; browser path does not404.
- [ ] Validasi task dan relevant gates lulus; changes hanya milik task dan local commit melalui normal hooks.

### Validasi

app.handle200/401/403/409/422/503; dependency call counts, auth failure isolation, malformed repository response, gateway405/encoded/suffix/origin/header cases; Eden good/bad compile proof; root gates.

### Hasil dan bukti

Belum diimplementasikan atau diverifikasi. Commands pada plan adalah requirement, bukan hasil actual.

### Commit task

- Pesan: Conventional Commit dengan ID SSET-005 sesudah acceptance/gates lulus.
- SHA: belum dibuat; receipt dicatat pada update berikutnya setelah successful commit, bukan self-referential.
- Hook/checks: belum dijalankan untuk task ini.
- Ledger: actual prior SHA dan evidence pada task/plan berikutnya.

### Blocker atau tindak lanjut

Menunggu detailed plan approval, freshness dan dependent tasks. Tidak ada runtime/production proof yang diasumsikan dari planning.

## Task: SSET-006 — Public Query, SSR and freshness ownership

- Status: Backlog
- Owner: Codex/pengembang
- Prioritas: 6
- Referensi: SSET-US-02, PRD-02, GR-01/02/05/07/08; [implementation step](../plans/site-settings/implementation-plan.md#sset-006--public-query-ssr-and-freshness-ownership).
- Diperbarui: 2026-10-09
- Dependensi: SSET-005
- Ukuran: Satu outcome terbatas; commit terpisah setelah acceptance dan gates.

### Ruang lingkup

one public settings query per router, no duplicate fresh hydration read or TTL stacking.

Files/symbols: public settings model/client/queries/readers, use-site-settings, root loader/head.

Requirements: strict DTO, request-scoped SSR, unsigned-only hydration, remaining deadline with transport/render time, version/epoch fence, gc5min/no polling, route/focus/reconnect stale reads, last-good offline and uncached defaults on failure.

### Acceptance criteria

- [ ] fresh navigation/hydration adds zero duplicate fetch; root does not break content/auth status; no private DTO serialized or fallback marked fresh success.
- [ ] Validasi task dan relevant gates lulus; changes hanya milik task dan local commit melalui normal hooks.

### Validasi

native client/QueryClient tests for10-second remaining TTL, slow SSR hydration, shared observers, failed bootstrap, offline, old response after local update, cancellation and schema rejection; root gates and SSR/import smoke.

### Hasil dan bukti

Belum diimplementasikan atau diverifikasi. Commands pada plan adalah requirement, bukan hasil actual.

### Commit task

- Pesan: Conventional Commit dengan ID SSET-006 sesudah acceptance/gates lulus.
- SHA: belum dibuat; receipt dicatat pada update berikutnya setelah successful commit, bukan self-referential.
- Hook/checks: belum dijalankan untuk task ini.
- Ledger: actual prior SHA dan evidence pada task/plan berikutnya.

### Blocker atau tindak lanjut

Menunggu detailed plan approval, freshness dan dependent tasks. Tidak ada runtime/production proof yang diasumsikan dari planning.

## Task: SSET-007 — Public branding and metadata

- Status: Backlog
- Owner: Codex/pengembang
- Prioritas: 7
- Referensi: SSET-US-02, PRD-02, GR-01/02/05/07/08; [implementation step](../plans/site-settings/implementation-plan.md#sset-007--public-branding-and-metadata).
- Diperbarui: 2026-10-09
- Dependensi: SSET-006
- Ukuran: Satu outcome terbatas; commit terpisah setelah acceptance dan gates.

### Ruang lingkup

both shell families/homepage/public titles use saved settings.

Files/symbols: public/catalog shells and intro components, five public route heads, presentation helper.

Requirements: proposed defaults/empty behavior, accessible labels/wrap/plain-text, shared footer, preserve content-specific metadata/robots/HTTP semantics and catalog/playback behavior.

### Acceptance criteria

- [ ] same persisted brand/footer across shells; Save/navigation updates metadata; no content data/cache reset or new playback requests.
- [ ] Validasi task dan relevant gates lulus; changes hanya milik task dan local commit melalui normal hooks.

### Validasi

source/SSR assertions for escaped text and selected title/description/default/empty cases; current public catalog/detail/watch regressions and root gates.

### Hasil dan bukti

Belum diimplementasikan atau diverifikasi. Commands pada plan adalah requirement, bukan hasil actual.

### Commit task

- Pesan: Conventional Commit dengan ID SSET-007 sesudah acceptance/gates lulus.
- SHA: belum dibuat; receipt dicatat pada update berikutnya setelah successful commit, bukan self-referential.
- Hook/checks: belum dijalankan untuk task ini.
- Ledger: actual prior SHA dan evidence pada task/plan berikutnya.

### Blocker atau tindak lanjut

Menunggu detailed plan approval, freshness dan dependent tasks. Tidak ada runtime/production proof yang diasumsikan dari planning.

## Task: SSET-008 — Admin query, confirmed-save cache update and recovery

- Status: Backlog
- Owner: Codex/pengembang
- Prioritas: 8
- Referensi: SSET-US-01/02/03, PRD-02, GR-01/02/05/07/08; [implementation step](../plans/site-settings/implementation-plan.md#sset-008--admin-query-confirmed-save-cache-update-and-recovery).
- Diperbarui: 2026-10-09
- Dependensi: SSET-005, SSET-006
- Ukuran: Satu outcome terbatas; commit terpisah setelah acceptance dan gates.

### Ruang lingkup

private read/save state updates only settings keys and survives conflicts/unknown results safely.

Files/symbols: admin settings client/queries/editor-scope, use-settings-editor, private effect integration/tests.

Requirements: identity scope, no private SSR, signal/late response/version fencing, retry:false, dedup save; cancel reads then update private/public snapshots on confirmed Save; dirty drafts unaffected by refetch; private fresh1 reconciliation; session-loss cleanup.

### Acceptance criteria

- [ ] Save success shows returned values without extra refill GET; failed/unknown Save never primes attempted branding; auth loss removes private draft/mutation data.
- [ ] Validasi task dan relevant gates lulus; changes hanya milik task dan local commit melalui normal hooks.

### Validasi

QueryClient/deferred transport tests for cache hit,409/503/abort/no automatic replay, Save versus late GET, higher version versus older Save, logout/role loss, exact key isolation and observed-state comparison; root gates.

### Hasil dan bukti

Belum diimplementasikan atau diverifikasi. Commands pada plan adalah requirement, bukan hasil actual.

### Commit task

- Pesan: Conventional Commit dengan ID SSET-008 sesudah acceptance/gates lulus.
- SHA: belum dibuat; receipt dicatat pada update berikutnya setelah successful commit, bukan self-referential.
- Hook/checks: belum dijalankan untuk task ini.
- Ledger: actual prior SHA dan evidence pada task/plan berikutnya.

### Blocker atau tindak lanjut

Menunggu detailed plan approval, freshness dan dependent tasks. Tidak ada runtime/production proof yang diasumsikan dari planning.

## Task: SSET-009 — Responsive settings page and preview

- Status: Backlog
- Owner: Codex/pengembang
- Prioritas: 9
- Referensi: SSET-US-01/02/03, PRD-02, GR-01/02/05/07/08; [implementation step](../plans/site-settings/implementation-plan.md#sset-009--responsive-settings-page-and-preview).
- Diperbarui: 2026-10-09
- Dependensi: SSET-008
- Ukuran: Satu outcome terbatas; commit terpisah setelah acceptance dan gates.

### Ruang lingkup

admin edits/saves/cancels four fields with clear states and preview.

Files/symbols: settings route/form, AdminShell navigation and design specification.

Requirements: English existing UI, proposed layout, loading/dirty/pending/errors/conflict/unknown/offline, Save/Cancel/leave guards, explicit fresh reload/discard confirmation, text-only preview, keyboard and44px/wrap.

### Acceptance criteria

- [ ] valid Save is reviewable; duplicate clicks don't duplicate mutation; Cancel and navigation protect dirty values;320px and all themes usable.
- [ ] Validasi task dan relevant gates lulus; changes hanya milik task dan local commit melalui normal hooks.

### Validasi

meaningful editor state tests, route generation through installed generator (no hand-edit), initial browser smoke and root/docs gates.

### Hasil dan bukti

Belum diimplementasikan atau diverifikasi. Commands pada plan adalah requirement, bukan hasil actual.

### Commit task

- Pesan: Conventional Commit dengan ID SSET-009 sesudah acceptance/gates lulus.
- SHA: belum dibuat; receipt dicatat pada update berikutnya setelah successful commit, bukan self-referential.
- Hook/checks: belum dijalankan untuk task ini.
- Ledger: actual prior SHA dan evidence pada task/plan berikutnya.

### Blocker atau tindak lanjut

Menunggu detailed plan approval, freshness dan dependent tasks. Tidak ada runtime/production proof yang diasumsikan dari planning.

## Task: SSET-010 — Real PostgreSQL, migration and native-cookie proof

- Status: Backlog
- Owner: Codex/pengembang
- Prioritas: 10
- Referensi: SSET-US-03, PRD-02, GR-01/02/05/07/08; [implementation step](../plans/site-settings/implementation-plan.md#sset-010--real-postgresql-migration-and-native-cookie-proof).
- Diperbarui: 2026-10-09
- Dependensi: SSET-002, SSET-005
- Ukuran: Satu outcome terbatas; commit terpisah setelah acceptance dan gates.

### Ruang lingkup

query savings, CAS, schema upgrades/preservation and authorization proven on real dependencies.

Files/symbols: dedicated settings fixture, settings proof/migration proof, impacted existing OpenAPI expectations.

Requirements: loopback dedicated test DB guard; reset serially; query logger counts settings statements separately from auth; migration pre-upgrade populated data/rerun and defaults; restart/durable Save; native auth/cookies and cache races.

### Acceptance criteria

- [ ] cold100→one and warm→zero additional settings SELECT observed; persisted Save and conflicting writes verified; unchanged previous rows/journal; unauthorized writes blocked even with warm settings cache.
- [ ] Validasi task dan relevant gates lulus; changes hanya milik task dan local commit melalui normal hooks.

### Validasi

native integration suite, root gates; record actual command/environment/totals, development migration receipt from002. Run relevant existing content/dashboard/auth proof without changing their meaning.

### Hasil dan bukti

Belum diimplementasikan atau diverifikasi. Commands pada plan adalah requirement, bukan hasil actual.

### Commit task

- Pesan: Conventional Commit dengan ID SSET-010 sesudah acceptance/gates lulus.
- SHA: belum dibuat; receipt dicatat pada update berikutnya setelah successful commit, bukan self-referential.
- Hook/checks: belum dijalankan untuk task ini.
- Ledger: actual prior SHA dan evidence pada task/plan berikutnya.

### Blocker atau tindak lanjut

Menunggu detailed plan approval, freshness dan dependent tasks. Tidak ada runtime/production proof yang diasumsikan dari planning.

## Task: SSET-011 — Built browser flow and regression

- Status: Backlog
- Owner: Codex/pengembang
- Prioritas: 11
- Referensi: SSET-US-01/02/03, PRD-02, GR-01/02/05/07/08; [implementation step](../plans/site-settings/implementation-plan.md#sset-011--built-browser-flow-and-regression).
- Diperbarui: 2026-10-09
- Dependensi: SSET-007, SSET-009, SSET-010
- Ukuran: Proof browser/regression; pisahkan subtask bila matriks bertambah.

### Ruang lingkup

real settings save is reflected in public SSR/client UI without extra database hits or stale restoration.

Files/symbols: settings browser worker, harness phase and dedicated SQL browser fixture.

Requirements: 320/390/768/1024/1440 × Light/Dark/System; long/empty/malicious-looking literal text, invalid/dirty/cancel/conflict/unknown/offline/auth/held read; public warm navigation and hydration counts; root head updates and both shells; no hidden polling.

### Acceptance criteria

- [ ] 15 layout/theme combinations pass; confirmed Save changes public values/title; old response cannot restore earlier version; settings failure does not block catalog/login/watch or alter401/403/404/503 behavior.
- [ ] Validasi task dan relevant gates lulus; changes hanya milik task dan local commit melalui normal hooks.

### Validasi

actual dev/built browser proof with separate native-cookie evidence where browser session is injected; SQL logger request counts, API/web units, existing dashboard/public catalog/detail/watch/auth regressions, root build/types/lint/docs; no destructive development fixtures.

### Hasil dan bukti

Belum diimplementasikan atau diverifikasi. Commands pada plan adalah requirement, bukan hasil actual.

### Commit task

- Pesan: Conventional Commit dengan ID SSET-011 sesudah acceptance/gates lulus.
- SHA: belum dibuat; receipt dicatat pada update berikutnya setelah successful commit, bukan self-referential.
- Hook/checks: belum dijalankan untuk task ini.
- Ledger: actual prior SHA dan evidence pada task/plan berikutnya.

### Blocker atau tindak lanjut

Menunggu detailed plan approval, freshness dan dependent tasks. Tidak ada runtime/production proof yang diasumsikan dari planning.

## Task: SSET-012 — Canonical docs and implementation closure

- Status: Backlog
- Owner: Codex/pengembang
- Prioritas: 12
- Referensi: SSET-US-01/02/03, PRD-02, GR-01/02/05/07/08; [implementation step](../plans/site-settings/implementation-plan.md#sset-012--canonical-docs-and-implementation-closure).
- Diperbarui: 2026-10-09
- Dependensi: SSET-011
- Ukuran: Satu outcome terbatas; commit terpisah setelah acceptance dan gates.

### Ruang lingkup

specs/runbook/index and all task receipts reflect actual scope/proof.

Files/symbols: PRD/global-rules/architecture/metadata runbook/design/index/context/plan/backlog.

Requirements: mark exact approved fields/current routes/cache/defaults/recovery; commands actually run and actual prior SHAs; record per-process/refetch limits and production exclusions; no self-referential SHA.

### Acceptance criteria

- [ ] mandatory tasks closed only after their proof/local commits; proposal/history/current behavior distinguished; no production readiness or remote delivery inferred.
- [ ] Validasi task dan relevant gates lulus; changes hanya milik task dan local commit melalui normal hooks.

### Validasi

docs:check, scoped Prettier, diff/staged-tree and preservation checks, relevant final runtime checks when source changed, normal commit hooks.

### Hasil dan bukti

Belum diimplementasikan atau diverifikasi. Commands pada plan adalah requirement, bukan hasil actual.

### Commit task

- Pesan: Conventional Commit dengan ID SSET-012 sesudah acceptance/gates lulus.
- SHA: belum dibuat; receipt dicatat pada update berikutnya setelah successful commit, bukan self-referential.
- Hook/checks: belum dijalankan untuk task ini.
- Ledger: actual prior SHA dan evidence pada task/plan berikutnya.

### Blocker atau tindak lanjut

Menunggu detailed plan approval, freshness dan dependent tasks. Tidak ada runtime/production proof yang diasumsikan dari planning.
