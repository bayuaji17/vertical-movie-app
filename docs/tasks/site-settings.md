# Modul: Site Settings

> Status: approved and executing · 9 Oktober 2026 · Pengguna meminta implementasi plan lengkap; branch `feat/site-settings`, runtime base `36f185e275bc90fa609cf071405848ff021c3223`.

## Tujuan modul

Admin mengubah identitas situs melalui form privat; halaman publik memakai nilai tersimpan dengan cache backend/frontend tanpa settings SELECT pada setiap request. Kontrak/default/cache/UX dimiliki [plan](../plans/site-settings/implementation-plan.md#desired-behavior); baseline source dimiliki [context](../plans/site-settings/repository-context.md). Referensi [PRD-02](../product/prd.md#kebutuhan-produk-dan-kondisi-implementasi), [GR-01/02/05/07/08](../product/global-rules.md#aturan-produk-lintas-fitur), [workflow](../guides/development-workflow.md) dan [template](../templates/task.md).

## User story: SSET-US-01

Sebagai admin, saya ingin mengedit/menyimpan empat field dengan validasi, preview, conflict/unknown-outcome recovery dan perlindungan sesi, sehingga identitas situs dapat dikelola tanpa kehilangan draft atau menimpa perubahan lain.

## User story: SSET-US-02

Sebagai pengunjung, saya ingin branding/metadata konsisten pada seluruh halaman publik, sehingga identitas tersimpan tampil sejak SSR dan tetap dapat digunakan ketika refetch gagal.

## User story: SSET-US-03

Sebagai operator, saya ingin cache hits dan request bersamaan menghindari settings SELECT berulang, sehingga beban database terukur tanpa melemahkan auth atau memperpanjang TTL data lama.

## Status dan bukti

SSET-001 adalah task dokumentasi yang diminta pengguna. Pengguna menyetujui implementasi lengkap9Oct; freshness main/origin36f185e sudah diperiksa. SSET-002–013 dikerjakan berurutan. Cache architecture sudah disetujui; SSET-013 ditambahkan tanpa mengganti ID existing, dengan urutan005 →013 →006. Perintah validasi di bawah adalah requirement, bukan hasil actual. Local task commits mengikuti AGENTS; remote delivery/deployment memerlukan authorization tersendiri.

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

Requirements: pinned SHA, four fields/cache contracts, constraints, matching dependency graph and observable AC; detailed field/UI review remains pending while three-layer/TTL1-hour cache revision is already user-approved. Preserve original planning proof and actual prior commit receipt when revising.

### Acceptance criteria

- [x] links valid; each requirement covered below; only owned docs in local task commit.
- [x] Validasi task dan relevant gates lulus; changes hanya milik task dan local commit melalui normal hooks.

### Validasi

scoped Prettier, docs:check, diff/staged-tree checks, unrelated preservation and normal commit hooks.

### Hasil dan bukti

9 Oktober 2026: context disimpan sebelum plan pada pinned main36f185e. Plan12 steps lengkap dengan backlog/DAG, default/length/cache/fresh-read/SSR/admin/SQL/browser acceptance. Scoped Prettier lulus; `bun run docs:check`97 Markdown/950 local links dan staged-tree validator90/931 lulus; `git diff --check`/cached diff lulus. Plan/backlog dependency audit tanpa cycle dan affected-action contract lulus. Preservation22 unrelated files byte-identical; README setelah owned additions dihapus sama persis baseline lokal. Hanya empat owned Markdown distage. Local planning commit melalui normal hooks; actual SHA dicatat pada update berikutnya, tanpa self-reference. Historical original proof: detailed product plan saat itu draft untuk review; runtime/schema/env/dependency belum berubah dan belum ada migration/integration/browser proof baru atau remote operation.

Revisi9Oct: pengguna menyetujui tiga cache layers/TTL1 hour/shared deadline/Save update; plan/context/backlog/index diperbarui dengan server-only cache task013 dan per-layer request counters. Metadata ini tidak menjalankan runtime/migration/API/browser proof. Revisi checks dicatat setelah actual validation; commit sendiri tidak ditulis self-referential.

Actual revision checks9Oct: scoped Prettier, docs97 Markdown/951 links, staged-tree90/932, plan13/backlog13/dependency-DAG/action/TTL audit dan working/cached diff checks lulus. Original22 non-index paths byte-identical dan README overlay dapat direkonstruksi persis. Empat owned Markdown saja distage; revision task commit wajib memakai normal hooks. Task013 dan seluruh runtime tasks tetap Backlog, bukan proof cache sudah tersedia.

### Commit task

- Pesan: docs: plan site settings and cache (SSET-001)
- SHA: `9524b6306c00ccdc1e727c336a8b06bdbfad9262` (actual previous-task receipt).
- Hook/checks: docs/format/diff/staged-tree/preservation lulus; normal docs/lint/types dan Commitlint wajib pada task commit tanpa bypass.
- Ledger: actual prior SHA dan evidence pada task/plan berikutnya.

### Blocker atau tindak lanjut

Plan lengkap disetujui pengguna9Oct dan runtime implementation berjalan; historical planning receipts dipertahankan.

## Task: SSET-002 — Singleton schema and additive migration

- Status: Done
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

- [x] exactly one initialized row; invalid singleton/length writes rejected; existing auth/content/media unaffected.
- [x] Validasi task dan relevant gates lulus; changes hanya milik task dan local commit melalui normal hooks.

### Validasi

dedicated test fresh/populated/rerun proof, full gates, `bun run --cwd apps/api db:migrate` on configured development DB, journal/schema and existing-row preservation evidence.

### Hasil dan bukti

2026-10-09: Generated/reviewed0011_site-settings adds singleton/defaults. Dedicated populated upgrade/rerun and constraints proof passed; development db:migrate journal11 to12, all17 existing tables byte-equivalent SQL snapshots preserved. Root gates passed.

### Commit task

- Pesan: feat(api): persist site settings singleton (SSET-002)
- SHA: `673b920d13a6e9bcd21bd241f5ac692b5c5965ad` (actual previous-task receipt).
- Hook/checks: relevant native tests, root check-types/lint/build, docs/format/diff passed; normal hooks required without bypass.
- Ledger: actual prior SHA dan evidence pada task/plan berikutnya.

### Blocker atau tindak lanjut

Dependent tasks follow the approved implementation plan. Production and remote delivery remain separate.

## Task: SSET-003 — Domain validation and versioned persistence

- Status: Done
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

- [x] racing writes from same version yield one success; inputs survive failure; no partial fields or credential output.
- [x] Validasi task dan relevant gates lulus; changes hanya milik task dan local commit melalui normal hooks.

### Validasi

native deterministic service tests and real SQL smoke against isolated fixtures; root gates.

### Hasil dan bukti

2026-10-09: Full-field trim/control/codepoint validation and atomic Drizzle CAS implemented. Native suite404/2269 passed; real PostgreSQL CAS/restart1 test5 assertions passed. Root types3/lint1/build2 passed. Invalid/unknown keys422, missing503 and version409 preserve fields.

### Commit task

- Pesan: feat(api): validate and save site settings (SSET-003)
- SHA: `0b0e09883e8d8d9d3f1f186cdd1fe41476c3c7e7` (actual previous-task receipt).
- Hook/checks: relevant native tests, root check-types/lint/build, docs/format/diff passed; normal hooks required without bypass.
- Ledger: actual prior SHA dan evidence pada task/plan berikutnya.

### Blocker atau tindak lanjut

Dependent tasks follow the approved implementation plan. Production and remote delivery remain separate.

## Task: SSET-004 — Backend cache, single-flight and save fencing

- Status: Done
- Owner: Codex/pengembang
- Prioritas: 4
- Referensi: SSET-US-03, PRD-02, GR-01/02/05/07/08; [implementation step](../plans/site-settings/implementation-plan.md#sset-004--backend-cache-single-flight-and-save-fencing).
- Diperbarui: 2026-10-09
- Dependensi: SSET-003
- Ukuran: Satu outcome terbatas; commit terpisah setelah acceptance dan gates.

### Ruang lingkup

public/cached admin settings reads avoid repeated SELECTs and stale fills.

Files/symbols: settings cache/service/cache tests; snapshot, generation, flights, cooldown and prime.

Requirements: approved TTL1 hour, remaining freshness, warm/cold coalescing, separate authorized fresh flight, no per-consumer abort of shared work, monotonic save prime, uncertain-commit expiry and5-second failure cooldown.

### Acceptance criteria

- [x] normal cold100 calls one SELECT; warm calls zero extra; Save refill zero extra SELECT; old data cannot replace new cache; bounded state and no success-cached errors.
- [x] Validasi task dan relevant gates lulus; changes hanya milik task dan local commit melalui normal hooks.

### Validasi

fake clock/deferred read tests including100 parallel reads, expiry boundary, rejected flight cleanup, late pre-save fill, out-of-order successful commits, missing row/outage/cooldown and detached aborted waiter; root gates.

### Hasil dan bukti

2026-10-09: Settings cache9 native tests56 assertions passed:100 cold reads one read, warm zero, TTL1 hour minus elapsed time, separate fresh flight, abort isolation, generation/version races, five-second cooldown and unknown-commit expiry. Save primes without SELECT. Root gates passed.

### Commit task

- Pesan: feat(api): cache site settings snapshots (SSET-004)
- SHA: `c69ddf75c1a2b52ddb5268ab3032c263f23831ce` (actual previous-task receipt).
- Hook/checks: relevant native tests, root check-types/lint/build, docs/format/diff passed; normal hooks required without bypass.
- Ledger: actual prior SHA dan evidence pada task/plan berikutnya.

### Blocker atau tindak lanjut

Dependent tasks follow the approved implementation plan. Production and remote delivery remain separate.

## Task: SSET-005 — Typed HTTP composition and exact gateway

- Status: Done
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

- [x] anonymous GET works even when auth dependency fails; unauthorized writes never reach repository; guarded routes remain guarded; browser path does not404.
- [x] Validasi task dan relevant gates lulus; changes hanya milik task dan local commit melalui normal hooks.

### Validasi

app.handle200/401/403/409/422/503; dependency call counts, auth failure isolation, malformed repository response, gateway405/encoded/suffix/origin/header cases; Eden good/bad compile proof; root gates.

### Hasil dan bukti

2026-10-09: API public GET and guarded GET/PATCH composed once with typed DTOs, native guard, strict queries/body,16KiB parser and no-store; exact gateway paths/methods and credential/origin protections proven. Settings/gateway22 tests139 assertions and full API/web413 tests2347 assertions passed. Eden positive/negative compile proof and root types3/lint1/build2 passed.

### Commit task

- Pesan: feat(api): expose site settings routes (SSET-005)
- SHA: `0258a3a6f53886ff100461a33193e75fe22786fa` (actual previous-task receipt).
- Hook/checks: relevant native tests, root check-types/lint/build, docs/format/diff passed; normal hooks required without bypass.
- Ledger: actual prior SHA dan evidence pada task/plan berikutnya.

### Blocker atau tindak lanjut

Dependent tasks follow the approved implementation plan. Production and remote delivery remain separate.

## Task: SSET-006 — Public Query, SSR and freshness ownership

- Status: Done
- Owner: Codex/pengembang
- Prioritas: 7
- Referensi: SSET-US-02, PRD-02, GR-01/02/05/07/08; [implementation step](../plans/site-settings/implementation-plan.md#sset-006--public-query-ssr-and-freshness-ownership).
- Diperbarui: 2026-10-09
- Dependensi: SSET-013
- Ukuran: Satu outcome terbatas; commit terpisah setelah acceptance dan gates.

### Ruang lingkup

one public settings query per router, no duplicate fresh hydration read or TTL stacking.

Files/symbols: public settings queries/isomorphic reader, use-site-settings, root loader/head; reuse public model/client/server-only reader and shared snapshot created in013.

Requirements: strict DTO and freshness0–3,600,000, request-scoped QueryClient SSR, unsigned-only hydration, shared1-hour deadline with transport/render time, version/epoch fence, gc1hour/no polling, route/focus/reconnect stale reads, last-good offline and uncached defaults on failure.

### Acceptance criteria

- [x] fresh navigation/hydration adds zero duplicate fetch; root does not break content/auth status; no private DTO serialized or fallback marked fresh success.
- [x] Validasi task dan relevant gates lulus; changes hanya milik task dan local commit melalui normal hooks.

### Validasi

native client/QueryClient tests for10-second remaining TTL, slow SSR hydration, shared observers, failed bootstrap, offline, old response after local update, cancellation and schema rejection; root gates and SSR/import smoke.

### Hasil dan bukti

2026-10-09: Public Query/hook and root SSR bootstrap use request-scoped clients and the shared server snapshot; absolute expiry survives transport/render/hydration, retry/poll disabled, stale mount/route/focus/reconnect supported. Defaults remain presentation-only and failed reads retain last-good data. Query/client6 tests28 assertions and targeted24/147 passed. Built SSR ten new pages shared one API read with no forwarded cookies and content404/login200 preserved. Root types/lint/build passed.

### Commit task

- Pesan: feat(web): hydrate cached site settings (SSET-006)
- SHA: `3971e864d205b97f9f81021b596a28d3d0ec89f0` (actual previous-task receipt).
- Hook/checks: relevant native tests, root check-types/lint/build, docs/format/diff passed; normal hooks required without bypass.
- Ledger: actual prior SHA dan evidence pada task/plan berikutnya.

### Blocker atau tindak lanjut

Dependent tasks follow the approved implementation plan. Production and remote delivery remain separate.

## Task: SSET-007 — Public branding and metadata

- Status: Done
- Owner: Codex/pengembang
- Prioritas: 8
- Referensi: SSET-US-02, PRD-02, GR-01/02/05/07/08; [implementation step](../plans/site-settings/implementation-plan.md#sset-007--public-branding-and-metadata).
- Diperbarui: 2026-10-09
- Dependensi: SSET-006
- Ukuran: Satu outcome terbatas; commit terpisah setelah acceptance dan gates.

### Ruang lingkup

both shell families/homepage/public titles use saved settings.

Files/symbols: public/catalog shells and intro components, five public route heads, presentation helper.

Requirements: proposed defaults/empty behavior, accessible labels/wrap/plain-text, shared footer, preserve content-specific metadata/robots/HTTP semantics and catalog/playback behavior.

### Acceptance criteria

- [x] same persisted brand/footer across shells; Save/navigation updates metadata; no content data/cache reset or new playback requests.
- [x] Validasi task dan relevant gates lulus; changes hanya milik task dan local commit melalui normal hooks.

### Validasi

source/SSR assertions for escaped text and selected title/description/default/empty cases; current public catalog/detail/watch regressions and root gates.

### Hasil dan bukti

2026-10-09: Both public shell families, homepage intro and all five public route heads use cached settings; content title/synopsis, robots, catalog/player semantics retained. Root head sync invalidates only root match on version change. Installed head API has no context, so content metadata is projected into loaderData. Plain-text/default/empty metadata plus catalog/content regressions20 tests133 assertions passed. Built SSR verifies title/description/header/footer and ten SSR plus ten gateway reads share one settings API call; content404/login200 unchanged. Root types/lint/build passed.

### Commit task

- Pesan: feat(web): apply public site branding (SSET-007)
- SHA: `b5ce69f8c6de4813bca8b19e17747cfa639e10b1` (actual previous-task receipt).
- Hook/checks: relevant native tests, root check-types/lint/build, docs/format/diff passed; normal hooks required without bypass.
- Ledger: actual prior SHA dan evidence pada task/plan berikutnya.

### Blocker atau tindak lanjut

Dependent tasks follow the approved implementation plan. Production and remote delivery remain separate.

## Task: SSET-008 — Admin query, confirmed-save cache update and recovery

- Status: Done
- Owner: Codex/pengembang
- Prioritas: 9
- Referensi: SSET-US-01/02/03, PRD-02, GR-01/02/05/07/08; [implementation step](../plans/site-settings/implementation-plan.md#sset-008--admin-query-confirmed-save-cache-update-and-recovery).
- Diperbarui: 2026-10-09
- Dependensi: SSET-005, SSET-006
- Ukuran: Satu outcome terbatas; commit terpisah setelah acceptance dan gates.

### Ruang lingkup

private read/save state updates only settings keys and survives conflicts/unknown results safely.

Files/symbols: admin settings client/queries/editor-scope, use-settings-editor, private effect integration/tests.

Requirements: identity scope, no private SSR, signal/late response/version fencing, retry:false/gc1hour, dedup save; confirmed gateway Save primes API and server-web before browser cancels reads and updates private/public snapshots; dirty drafts unaffected by refetch; private fresh1 reconciliation updates web public projection; session-loss cleanup. Failed/unknown writes never prime attempted values.

### Acceptance criteria

- [x] Save success shows returned values without extra refill GET; failed/unknown Save never primes attempted branding; auth loss removes private draft/mutation data.
- [x] Validasi task dan relevant gates lulus; changes hanya milik task dan local commit melalui normal hooks.

### Validasi

QueryClient/deferred transport tests for cache hit,409/503/abort/no automatic replay, Save versus late GET, higher version versus older Save, logout/role loss, exact key isolation and observed-state comparison; root gates.

### Hasil dan bukti

2026-10-09: Identity-scoped private client/query/editor hook implemented with no SSR reads, no retry/poll,15s transport timeout, remaining expiry, controlled pending/draft and auth-loss abort cleanup. Confirmed response atomically updates settings keys after cancelling reads, leaves content untouched; versions cannot regress. Unknown Save expires only private settings cache without replay or attempted public branding; fresh1 reload compares observed state and preserves differing drafts. Editor/query10 tests68 assertions passed, including same-version observer preserving Save confirmation; root types/lint/build passed.

### Commit task

- Pesan: feat(web): manage private settings editor state (SSET-008)
- SHA: belum dibuat; receipt dicatat pada update berikutnya setelah successful commit, bukan self-referential.
- Hook/checks: relevant native tests, root check-types/lint/build, docs/format/diff passed; normal hooks required without bypass.
- Ledger: actual prior SHA dan evidence pada task/plan berikutnya.

### Blocker atau tindak lanjut

Dependent tasks follow the approved implementation plan. Production and remote delivery remain separate.

## Task: SSET-009 — Responsive settings page and preview

- Status: Backlog
- Owner: Codex/pengembang
- Prioritas: 10
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

Plan lengkap disetujui pengguna9Oct dan freshness sudah diperiksa; dependent tasks harus selesai sebelum task ini. Tidak ada production proof yang diasumsikan.

## Task: SSET-010 — Real PostgreSQL, migration and native-cookie proof

- Status: Backlog
- Owner: Codex/pengembang
- Prioritas: 11
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

Plan lengkap disetujui pengguna9Oct dan freshness sudah diperiksa; dependent tasks harus selesai sebelum task ini. Tidak ada production proof yang diasumsikan.

## Task: SSET-011 — Built browser flow and regression

- Status: Backlog
- Owner: Codex/pengembang
- Prioritas: 12
- Referensi: SSET-US-01/02/03, PRD-02, GR-01/02/05/07/08; [implementation step](../plans/site-settings/implementation-plan.md#sset-011--built-browser-flow-and-regression).
- Diperbarui: 2026-10-09
- Dependensi: SSET-007, SSET-009, SSET-010
- Ukuran: Proof browser/regression; pisahkan subtask bila matriks bertambah.

### Ruang lingkup

real settings save is reflected in public SSR/client UI without extra database hits or stale restoration.

Files/symbols: settings browser worker, harness phase and dedicated SQL browser fixture.

Requirements: 320/390/768/1024/1440 × Light/Dark/System; long/empty/malicious-looking literal text, invalid/dirty/cancel/conflict/unknown/offline/auth/held read; browser fresh navigation/hydration counts and repeated new SSR page/reload API-call counts; approved1-hour expiry/remaining deadline across browser/web/API; root head updates and both shells; no hidden polling.

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

Plan lengkap disetujui pengguna9Oct dan freshness sudah diperiksa; dependent tasks harus selesai sebelum task ini. Tidak ada production proof yang diasumsikan.

## Task: SSET-012 — Canonical docs and implementation closure

- Status: Backlog
- Owner: Codex/pengembang
- Prioritas: 13
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

Plan lengkap disetujui pengguna9Oct dan freshness sudah diperiksa; dependent tasks harus selesai sebelum task ini. Tidak ada production proof yang diasumsikan.

## Task: SSET-013 — Server web snapshot cache and committed Save bridge

- Status: Done
- Owner: Codex/pengembang
- Prioritas: 6 (sesudah005, sebelum006; ID existing dipertahankan)
- Referensi: SSET-US-02/03, PRD-02, GR-02/05/07/08; [implementation step](../plans/site-settings/implementation-plan.md#sset-013--server-web-snapshot-cache-and-committed-save-bridge).
- Diperbarui: 2026-10-09
- Dependensi: SSET-005
- Ukuran: Satu outcome server snapshot/Save bridge; commit terpisah setelah gates.

### Ruang lingkup

warm SSR/public GET serves settings without an API call; confirmed gateway Save updates the shared public snapshot before responding.

Files/symbols: settings public model/client, server-cache.server.ts and reader.server.ts, gateway DI/exact settings read/write branches, site-settings-server-cache tests and gateway tests; public DTO/committed-response projection validators, transport, server-only cache factory/default instance, shared fill, prime and fence. Prepare transport/validators here before006 consumes them; do not depend on the later admin client008.

Requirements: approved1-hour upstream deadline without TTL stacking, one public DTO slot per canonical API origin/version,100 concurrent reads one API GET, independent bounded fill signal,5-second cooldown, per-waiter abort, monotonic generation/version, validated bounded Save/fresh-reconciliation projection, uncertain-result expiry and strict no-store GET shortcut. No request/session/private DTO/QueryClient sharing; no other gateway route changes.

### Acceptance criteria

- [x] same-process cold100→one API GET, warm reads→zero; Save primes with zero refill GET, latest version wins, no successful cache of defaults/errors, unauthorized writes never prime, unrelated request state/gateway semantics preserved. Multi-instance/direct-API limits recorded honestly.
- [x] Validasi task dan relevant gates lulus; changes hanya milik task dan local commit melalui normal hooks.

### Validasi

fake clock/deferred upstream tests for SSR/gateway shared identity,100 cold reads, repeated warm SSR and GET with zero extra API reads, API-warm/web-cold, expiry/refill, per-waiter cancel, origin switch, error/cooldown, Save versus slow fill/out-of-order completions and fresh reconciliation. Gateway unauthorized/bad-query/method/suffix/oversize/invalid DTO cases; root gates.

### Hasil dan bukti

2026-10-09: Server-only public snapshot shared by SSR/gateway;100 cold reads one API call and warm SSR/GET zero calls observed in deferred unit proof. Independent10s fill timeout, waiter abort, origin/generation/version fencing,5s cooldown and bounded DTO parsing implemented. Gateway committed Save/fresh1 projection primes before response, zero refill; known errors do not prime and unknown/malformed outcomes expire without claiming rollback. Targeted16/109 and full418/2403 passed; root types/lint/build passed. Immediate coherence limited to writer process/gateway; other instances/direct API writes converge on remaining TTL.

### Commit task

- Pesan: feat(web): cache public settings snapshot (SSET-013)
- SHA: `7ea046ebde9576d448cea467691cfd46f108e8dd` (actual previous-task receipt).
- Hook/checks: relevant native tests, root check-types/lint/build, docs/format/diff passed; normal hooks required without bypass.
- Ledger: actual prior SHA/evidence pada update task/plan berikutnya.

### Blocker atau tindak lanjut

Dependent tasks follow the approved implementation plan. Production and remote delivery remain separate.
