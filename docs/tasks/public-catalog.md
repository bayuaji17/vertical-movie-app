# Modul: Katalog publik Film/Standalone

> Status: **active — PCAT-001–006 Done, query/state PCAT-007 berikutnya** · 8 Oktober 2026 · pengguna menetapkan plan `chore/public-catalog-plan` untuk dilanjutkan. Working branch `feat/public-catalog` dari main65127a1; desain plan awal disetujui pengguna sebelum implementasi UI. Baseline awal634f7d4 tetap historis.

## Tujuan modul

Guest menemukan Film/Standalone dari homepage, membaca detail dan menonton HLS tanpa login. Acuan: [PRD](../product/prd.md) PRD-07/08/09, [Global Rules](../product/global-rules.md) GR-02/03/05/06/08, [context](../plans/public-catalog/repository-context.md) dan [plan](../plans/public-catalog/implementation-plan.md). Tidak menutup seluruh backend media/stress atau production rollout.

## User story: PCAT-US-01

Sebagai pengunjung, saya ingin browse cover/judul/jenis/durasi dengan filter dan halaman lanjutan, sehingga menemukan konten playable tanpa login.

## User story: PCAT-US-02

Sebagai pengunjung, saya ingin membaca detail lalu menonton HLS dan kembali ke katalog, sehingga memahami dan memilih konten dengan mudah.

## User story: PCAT-US-03

Sebagai pengunjung, saya ingin loading/kegagalan/expiry/arsip ditangani jelas dan dapat dicoba kembali, sehingga alur tidak menampilkan hasil salah atau mengulang tanpa batas.

## Aturan evidence bersama

Task Ready hanya setelah decisions/dependencies tersedia. Plan approval diperlukan sebelum source; design approval sebelum UI. API unit native bun:test/app.handle; DB/storage/FFmpeg proof terpisah dan dedicated/guarded/serial. Relevant tests serta root check-types/lint/build wajib setelah implementation, docs:check/Prettier/whitespace setelah docs. No schema/dependency/env change diperkirakan; bila discovery berubah, jalankan frozen-install/migration/preservation sesuai root AGENTS. Commit tiap task dengan ID tanpa bypass hook; SHA dicatat setelah commit berhasil pada update berikutnya. Push/PR/merge/deployment tidak termasuk scope.

## Task: PCAT-001 — Context, plan dan backlog berbasis repository

- Status: Done
- Owner: Codex/pengembang
- Prioritas: P1 — urutan dependency DAG pada plan
- Referensi: PCAT-US-01; PRD-07/08/09, GR-02/03/05/06/08; [plan](../plans/public-catalog/implementation-plan.md)
- Diperbarui: 2026-10-08
- Dependensi: Tidak ada
- Ukuran: Satu hasil review; pecah kembali jika discovery memperluas ruang lingkup.

### Ruang lingkup

Trace homepage/catalog/poster/watch pada SHA immutable, dampak lintas app dan decisions draft.

Paths/symbol owners: `docs/plans/public-catalog/{repository-context,implementation-plan}.md, docs/tasks/public-catalog.md, docs/README.md`. Rincian simbol dan kontrak di affected-files/implementation steps plan.

### Acceptance criteria

- [x] Context ditulis sebelum plan; facts vs proposal dibedakan.
- [x] Semua requirement mempunyai task/dependensi/validation; source dan dirty overlay existing dipertahankan.
- [x] Pemeriksaan relevant task dan local commit berhasil; actual evidence/receipt dicatat sesudah diamati.

### Validasi

Static source review, bun run docs:check, scoped Prettier, git diff --check dan preservation hashes.

### Hasil dan bukti

8 Oktober 2026: source snapshot/trace, docs ownership dan working-tree preservation diperiksa; context disimpan sebelum plan/backlog. Runtime tidak berubah. `bun run docs:check` lulus 69 Markdown/665 local links/anchors; scoped Prettier write/check dan `git diff --check` lulus. Preservation 22 file unrelated dan 14 IDs plan/backlog lulus; source/apps/packages/manifests/lockfile/Turbo tidak berubah. Branch planning `chore/public-catalog-plan` dibuat dari base setelah review. Commit docs berhasil pada `b844574d34e311c38f3359cd7e1ab61d7c10c6c6`. Hook docs 69/665, lint web 1 task cache valid, types 3 task cache valid dan Commitlint lulus tanpa bypass. Staged-tree documentation check lulus 62 Markdown/646 local links; tidak memasukkan desain/evidence unrelated.

### Commit task

- Pesan usulan: `docs: context, plan dan backlog berbasis repository (PCAT-001)`.
- SHA: `b844574d34e311c38f3359cd7e1ab61d7c10c6c6`.
- Hook/checks: docs 69/665, lint 1/types 3 task cache valid dan Commitlint lulus; scoped staged-tree docs 62/646, Prettier/whitespace/preservation lulus.
- Ledger: receipt/status Done dicatat sesudah commit berhasil; perubahan receipt ini untuk dokumentasi task berikutnya, bukan SHA self-referential.

### Blocker atau tindak lanjut

PCAT-001 selesai; plan dan UX proposal masih draft. PCAT-002–014 menunggu approval/dependencies. Pengguna mengotorisasi commit/push plan pada 8 Oktober 2026; PR/merge belum diminta.

## Task: PCAT-002 — Spesifikasi dan desain katalog/detail/watch

- Status: Done — desain disetujui pengguna pada 8 Oktober 2026.
- Owner: Codex/pengembang
- Prioritas: P1 — urutan dependency DAG pada plan
- Referensi: PCAT-US-01; PRD-07/08/09, GR-02/03/05/06/08; [plan](../plans/public-catalog/implementation-plan.md)
- Diperbarui: 2026-10-08
- Dependensi: PCAT-001 + approval plan pengguna
- Ukuran: Satu hasil review; pecah kembali jika discovery memperluas ruang lingkup.

### Ruang lingkup

Spesifikasi homepage/detail/watch dan seluruh loading/empty/error/not-found/cover states; referensi homepage/detail desktop/mobile light/dark, watch existing diselaraskan.

Paths/symbol owners: `docs/design/public-catalog.md dan artefak visual approved pada docs/design/`. Rincian simbol dan kontrak di affected-files/implementation steps plan.

### Acceptance criteria

- [x] Grid/filter/Load more dan navigation context dapat ditinjau pada 390/1440px; semantic Rhea dan 9:16.
- [x] Approval desain dicatat dengan tanggal/pengguna sebelum task UI; belum mengklaim runtime.
- [x] Pemeriksaan relevant task dan local commit berhasil; actual evidence/receipt dicatat sesudah diamati.

### Validasi

Review visual/token/state matrix, docs:check/format/whitespace; gunakan imagegen skill saat mockup raster diperlukan.

### Hasil dan bukti

8 Oktober 2026: pengguna mengoreksi plan yang harus dilanjutkan ke `chore/public-catalog-plan`68a0053. Local reconciliation yang sebelumnya membatalkan task bukan approval pengguna dan tidak dipakai. Freshness context sebelum plan; source current main65127a1 dipertahankan pada `feat/public-catalog`. [Spesifikasi](../design/public-catalog.md), HTML interactive prototype dan8 PNG Browse/Detail390/1440 Light/Dark disiapkan. Artwork/fonts/token existing direuse; fixture20 kartu, filter/navigation context dan recovery states dapat ditinjau. Browser validation dan local docs/commit results dicatat setelah observed; belum merupakan API/HLS/production proof atau persetujuan redesign.

Observed prototype proof dengan bundled Windows Node/Playwright/Chromium1228:8 screenshots,390/1440 Light/Dark, local posters/fonts loaded, 9:16/no product overflow/44px buttons pass;20 fixture cards, filter Film10, keyboard Space/Enter, detail→watch→back dengan filter preserved,10 state controls, explicit Retry playback dan page errors0 pass. Play stage tanpa audio/video/HLS; SQL/cursor/SSR/expiry/media runtime tidak diuji oleh proof ini. Dua representative screenshots dilihat setelah assets benar. `bun run docs:check`86 Markdown/816 links, scoped installed Prettier HTML/Markdown dan `git diff --check` pass. Unrelated22 files/README overlay preserved; staged audit/normal commit berikut.

### Commit task

- Pesan usulan: `docs: prepare public catalog design review (PCAT-002)`.
- SHA: `307710159cbd8a6d9a0f4d230d2ec1deaf2abc37` — prototype/spec review,14 scoped files.
- Hook/checks: docs86/816, staged-tree79/797, scoped formatting/diff/preservation, lint1/type3 cache valid dan Commitlint pass tanpa bypass. Receipt review sebelum approval; pengguna kemudian menyetujui desain.
- Ledger: approval commit `a3ceba2d47c32326d7e25773a4370de5166cfd29`; normal docs86/816, lint1/type3 cached dan Commitlint pass.

### Blocker atau tindak lanjut

Pengguna menyetujui desain pada 8 Oktober 2026 dengan “ok, setuju”: Film/Standalone, grid20/Load more, URL type, detail `/videos/$slug`, English dan noindex sementara. PCAT-002 Done; lanjut PCAT-003 sesuai DAG. Route/API Series dan episode watch existing tetap compatible. Source runtime belum berubah pada approval ini.

## Task: PCAT-003 — Filter kinds publik sebelum cursor pagination

- Status: Done — implementasi dan quality gates lulus; receipt commit berikut.
- Owner: Codex/pengembang
- Prioritas: P1 — urutan dependency DAG pada plan
- Referensi: PCAT-US-01; PRD-07/08/09, GR-02/03/05/06/08; [plan](../plans/public-catalog/implementation-plan.md)
- Diperbarui: 2026-10-08
- Dependensi: PCAT-001 + approval plan pengguna
- Ukuran: Satu hasil review; pecah kembali jika discovery memperluas ruang lingkup.

### Ruang lingkup

kinds finite/canonical dan SQL predicate sebelum limit; parseList filters/cache keys; old query tanpa kinds tetap compatible.

Paths/symbol owners: `apps/api/src/modules/catalog/{model,service,repository}.ts dan {index,service}.test.ts`. Rincian simbol dan kontrak di affected-files/implementation steps plan.

### Acceptance criteria

- [x] All hanya movie+standalone melalui API filter, bukan post-filter client; tied createdAt/id pagination konsisten.
- [x] Cursor beda filter ditolak 422; reversed canonical kinds equivalent; invalid enum ditolak sebelum I/O.
- [x] Pemeriksaan relevant task dan local commit berhasil; actual evidence/receipt dicatat sesudah diamati.

### Validasi

bun test apps/api/src/modules/catalog; Eden/type checks dan app.handle/OpenAPI schema proof, root gates.

### Hasil dan bukti

8 Oktober 2026: CatalogQuery menerima empat finite kinds; CatalogService canonicalizes order, validates sebelum repository, isolates cache/filter/limit dan mempertahankan fingerprint tanpa kinds. CatalogStore menerapkan parameterized IN sebelum LIMIT dan tuple createdAt/id descending. Native unit/HTTP/OpenAPI serta compiled Drizzle SQL proof lulus; traversal/filter real PostgreSQL tetap PCAT-012.

Observed: targeted list suite5/39, catalog suite23/167 sebelum tambahan OpenAPI; root check-types3, lint1, build2 lulus. Build memiliki warning chunk >500kB existing, tidak gagal. Full regression/docs/normal hooks dicatat sesudah observed.

### Commit task

- Pesan usulan: `feat: filter kinds publik sebelum cursor pagination (PCAT-003)`.
- SHA: `fca1b478a8726fd977166338731dad47cd498066`.
- Hook/checks: types3/lint1/build2, API143/811 + web185/955, docs86/816, scoped format/diff, normal Husky/Commitlint pass.
- Ledger: receipt aktual dicatat pada update sesudah commit berhasil.

### Blocker atau tindak lanjut

API kind filter selesai lokal; tidak mengubah endpoint/default Series/episode. Real SQL visibility proof dan public web mengikuti dependencies task berikutnya.

## Task: PCAT-004 — Cegah pengisian cache lama setelah invalidation

- Status: Done — existing generation fence direuse dan dibuktikan untuk legacy list.
- Owner: Codex/pengembang
- Prioritas: P1 — urutan dependency DAG pada plan
- Referensi: PCAT-US-03; PRD-07/08/09, GR-02/03/05/06/08; [plan](../plans/public-catalog/implementation-plan.md)
- Diperbarui: 2026-10-08
- Dependensi: PCAT-003
- Ukuran: Satu hasil review; pecah kembali jika discovery memperluas ruang lingkup.

### Ruang lingkup

Revision guard pada cache read completion; TTL/bounded Map/failed read semantics existing dipertahankan.

Paths/symbol owners: `apps/api/src/modules/catalog/service.ts dan service.test.ts`. Rincian simbol dan kontrak di affected-files/implementation steps plan.

### Acceptance criteria

- [x] invalidate selama read pending tidak membiarkan hasil lama mengisi cache generasi baru.
- [x] Follow-up request membaca data baru; TTL 60s dan isolation filters terbukti tanpa mengklaim distributed invalidation.
- [x] Pemeriksaan relevant task dan local commit berhasil; actual evidence/receipt dicatat sesudah diamati.

### Validasi

Native Bun injected clock/deferred store tests dan root gates; real mutation proof PCAT-012.

### Hasil dan bukti

8 Oktober 2026: generation fence CatalogService sudah berada pada baseline main; tidak dibuat implementasi cache kedua. Deferred legacy list test mengizinkan request baru mengisi cache setelah invalidate lalu menyelesaikan read lama; hasil lama tidak menimpa generasi baru. Injected clock membuktikan TTL60s dimulai sebelum read, kind isolation, retry failed fill dan invalidate kedua filter.

Observed: `bun test apps/api/src/modules/catalog`26 pass/179 assertions; `bun run build`2 tasks pass. Docs/format/diff dan normal commit hooks berikut; mutation PostgreSQL tetap PCAT-012, tanpa klaim distributed invalidation.

### Commit task

- Pesan usulan: `test: verify catalog invalidation generation fence (PCAT-004)`.
- SHA: `a09728b09cbe57431ec76561938a0c1178bf3411`.
- Hook/checks: catalog26/179, build2, docs86/816, scoped format/diff dan normal Husky lint1/types3/Commitlint pass.
- Ledger: receipt aktual dicatat pada update sesudah commit berhasil.

### Blocker atau tindak lanjut

Reuse cache guard selesai lokal; real mutation proof tetap PCAT-012. Tidak mengubah race policy atau scope cache existing.

## Task: PCAT-005 — Endpoint public signed poster terpisah

- Status: Done — signed poster endpoint tersedia lokal; receipt commit berikut.
- Owner: Codex/pengembang
- Prioritas: P1 — urutan dependency DAG pada plan
- Referensi: PCAT-US-01; PRD-07/08/09, GR-02/03/05/06/08; [plan](../plans/public-catalog/implementation-plan.md)
- Diperbarui: 2026-10-08
- Dependensi: PCAT-001 + approval plan pengguna
- Ukuran: Satu hasil review; pecah kembali jika discovery memperluas ruang lingkup.

### Ruang lingkup

GET /videos/:slug/poster + PlaybackService.poster; uncached playable, profile/namespace/readiness, native signer dan DTO expiry.

Paths/symbol owners: `apps/api/src/modules/playback/{index,service}.ts, service.test.ts dan poster.test.ts`. Rincian simbol dan kontrak di affected-files/implementation steps plan.

### Acceptance criteria

- [x] Anonymous/no-store; 404 hidden/missing sebelum signer; 503 safe pada profile/output/dependency failure.
- [x] Hanya poster.webp verified disign dengan existing duration TTL; tidak membaca HLS/source atau mengubah metadata DTO/cache.
- [x] Pemeriksaan relevant task dan local commit berhasil; actual evidence/receipt dicatat sesudah diamati.

### Validasi

bun test apps/api/src/modules/playback; app.handle pada modul dan createApp termasuk OpenAPI/security; root gates.

### Hasil dan bukti

8 Oktober 2026: GET /videos/:slug/poster memakai uncached CatalogStore playable, playbackReadiness/profile/duration dan posterReadiness sebelum native presign. DTO hanya videoId/posterUrl/expiresAt, private/no-store dan public OpenAPI. Poster namespace sekarang exact generation prefix (traversal/foreign output ditolak), sign hanya poster.webp; tidak membaca HEAD/file/manifest maupun sign HLS. Existing binary poster/playback/private admin routes dipertahankan.

Observed: playback13 tests/93 assertions, full API151/883; root types3 (setelah memperbaiki missing getSession pada fixture test), lint1/build2 pass. Test membuktikan duration ceiling, profile/output/facts gagal tanpa sign, anonymous HTTP/errors/guard/OpenAPI dan uncached renewal. Dokumen/format/diff/normal hooks berikut. Storage PostgreSQL proof tetap PCAT-012.

### Commit task

- Pesan usulan: `feat: endpoint public signed poster terpisah (PCAT-005)`.
- SHA: `046ccbd24cea17c74e1f08b3fefca43916b5859b`.
- Hook/checks: playback13/93, API151/883, root types3/lint1/build2, docs86/816, format/diff, normal Husky/Commitlint pass.
- Ledger: receipt aktual dicatat pada update sesudah commit berhasil.

### Blocker atau tindak lanjut

Endpoint selesai lokal; lanjut typed public client PCAT-006 dan DB/storage proof PCAT-012. Tidak mengubah schema/env/dependencies; tidak mengklaim production storage.

## Task: PCAT-006 — Client publik typed dan reader SSR unsigned

- Status: Done — public video client/unsigned SSR reader tersedia lokal.
- Owner: Codex/pengembang
- Prioritas: P1 — urutan dependency DAG pada plan
- Referensi: PCAT-US-01; PRD-07/08/09, GR-02/03/05/06/08; [plan](../plans/public-catalog/implementation-plan.md)
- Diperbarui: 2026-10-08
- Dependensi: PCAT-003, PCAT-005
- Ukuran: Satu hasil review; pecah kembali jika discovery memperluas ruang lingkup.

### Ruang lingkup

Eden public fetch/validation/signal tanpa private transition; server-only fixed upstream + safe status helper; browser same-origin.

Paths/symbol owners: `apps/web/src/lib/public/catalog-{model,client,reader,reader.server}.ts`, `apps/web/test/public-video-client.test.ts`, `public-catalog-eden-contract.ts` dan `content-gateway.test.ts`. Rincian simbol dan kontrak di affected-files/implementation steps plan.

### Acceptance criteria

- [x] No cookies/authorization forwarded, no session read; server timeout/abort dan non-2xx/malformed DTO ditangani.
- [x] Reader SSR metadata saja, no signed poster/playback; type-only API tetap tidak masuk bundle.
- [x] Pemeriksaan relevant task dan local commit berhasil; actual evidence/receipt dicatat sesudah diamati.

### Validasi

Native Bun fetcher tests, Eden compile/type check, import-boundary proof pada public route sesudah PCAT-009; root gates.

### Hasil dan bukti

8 Oktober 2026: createPublicVideoClient khusus /videos memakai type-only Eden contract existing, limit20/canonical kinds/URL type, strict unsigned metadata dan signed poster validator terpisah. Fetcher public replaces headers dengan accept-only, credentials omit, no-store, redirect error dan abort/timeout10s; tidak memakai private transition. Episode detail ditolak404, direct watch existing dipertahankan. Server-only fixed validated API_INTERNAL_URL reader hanya page/detail metadata, menggabungkan request/caller/timeout signal dan safe HTTP status. Isomorphic reader menghubungkan browser same-origin.

Observed: targeted transport/gateway5 tests/92 assertions; full web189/1016, root types3/lint1/build2 pass setelah memperbaiki fixture literal kind/query generic, malformed episode fixture dan lint optional-chain. Gateway proof /videos list/detail/poster strip cookie/authorization dan no-store. Eden positive/negative contracts compile. Route SSR/dehydration/import-boundary proof menunggu PCAT-009/013 setelah route baru tersedia.

### Commit task

- Pesan usulan: `feat: client publik typed dan reader ssr unsigned (PCAT-006)`.
- SHA: belum dibuat.
- Hook/checks: belum dijalankan untuk commit ini.
- Ledger: receipt aktual dicatat pada update sesudah commit berhasil.

### Blocker atau tindak lanjut

Lanjut PCAT-007 query/state; production homepage belum diganti. SSR route/browser proof mengikuti PCAT-009/013.

## Task: PCAT-007 — State query katalog dan expiry cover yang aman

- Status: Backlog
- Owner: Codex/pengembang
- Prioritas: P1 — urutan dependency DAG pada plan
- Referensi: PCAT-US-03; PRD-07/08/09, GR-02/03/05/06/08; [plan](../plans/public-catalog/implementation-plan.md)
- Diperbarui: 2026-10-08
- Dependensi: PCAT-006
- Ukuran: Satu hasil review; pecah kembali jika discovery memperluas ruang lingkup.

### Ruang lingkup

Canonical filter/keys/pageParam, first-page refresh, append/dedup/abort late data; browser-only visible poster queue/expiry.

Paths/symbol owners: `apps/web/src/lib/public/{catalog-queries,catalog-state,poster-state}.ts, apps/web/test/public-catalog-state.test.ts`. Rincian simbol dan kontrak di affected-files/implementation steps plan.

### Acceptance criteria

- [ ] Load-more failure mempertahankan item/cursor; double-click/changed-filter late response tidak mencampur data.
- [ ] Poster max 4 concurrent/dedup/expiry-aware, no offscreen loop/persistence/dehydration; failure bounded + explicit retry.
- [ ] Pemeriksaan relevant task dan local commit berhasil; actual evidence/receipt dicatat sesudah diamati.

### Validasi

Native Bun deferred fetch/clock/queue/dehydration tests dan root gates; UI behavior diteruskan ke browser acceptance.

### Hasil dan bukti

Belum diimplementasikan atau divalidasi. Commands di atas merupakan rencana, bukan hasil.

### Commit task

- Pesan usulan: `feat: state query katalog dan expiry cover yang aman (PCAT-007)`.
- SHA: belum dibuat.
- Hook/checks: belum dijalankan untuk commit ini.
- Ledger: receipt aktual dicatat pada update sesudah commit berhasil.

### Blocker atau tindak lanjut

Menunggu PCAT-006. Approval/hasil proof tidak diasumsikan tersedia.

## Task: PCAT-008 — Shell, card dan cover public reusable

- Status: Backlog
- Owner: Codex/pengembang
- Prioritas: P1 — urutan dependency DAG pada plan
- Referensi: PCAT-US-01; PRD-07/08/09, GR-02/03/05/06/08; [plan](../plans/public-catalog/implementation-plan.md)
- Diperbarui: 2026-10-08
- Dependensi: PCAT-002 + approval desain, PCAT-007
- Ukuran: Satu hasil review; pecah kembali jika discovery memperluas ruang lingkup.

### Ruang lingkup

Brand/Browse/Appearance tanpa auth, card title/type/duration + poster 9:16; existing Base UI dan theme.

Paths/symbol owners: `apps/web/src/components/public/{public-shell,catalog-card,public-poster}.tsx`. Rincian simbol dan kontrak di affected-files/implementation steps plan.

### Acceptance criteria

- [ ] Poster/layout tidak stretch/shift; fallback/title link tetap accessible, tanpa media player di card.
- [ ] Keyboard/focus/44px/light-dark-System dan semantic contrast; long titles tidak overflow.
- [ ] Pemeriksaan relevant task dan local commit berhasil; actual evidence/receipt dicatat sesudah diamati.

### Validasi

Component/visual behavior review dan root gates; matriks browser definitif PCAT-013.

### Hasil dan bukti

Belum diimplementasikan atau divalidasi. Commands di atas merupakan rencana, bukan hasil.

### Commit task

- Pesan usulan: `feat: shell, card dan cover public reusable (PCAT-008)`.
- SHA: belum dibuat.
- Hook/checks: belum dijalankan untuk commit ini.
- Ledger: receipt aktual dicatat pada update sesudah commit berhasil.

### Blocker atau tindak lanjut

Menunggu PCAT-002 + approval desain, PCAT-007. Approval/hasil proof tidak diasumsikan tersedia.

## Task: PCAT-009 — Homepage katalog Film/Standalone nyata

- Status: Backlog
- Owner: Codex/pengembang
- Prioritas: P1 — urutan dependency DAG pada plan
- Referensi: PCAT-US-01; PRD-07/08/09, GR-02/03/05/06/08; [plan](../plans/public-catalog/implementation-plan.md)
- Diperbarui: 2026-10-08
- Dependensi: PCAT-008
- Ukuran: Satu hasil review; pecah kembali jika discovery memperluas ruang lingkup.

### Ruang lingkup

Replace starter/demo; loader/search/head, All/Films/Standalone + Load more, first page SSR, refresh/empty/error states.

Paths/symbol owners: `apps/web/src/routes/index.tsx, components/public/catalog-browser.tsx dan routeTree tooling bila berubah`. Rincian simbol dan kontrak di affected-files/implementation steps plan.

### Acceptance criteria

- [ ] URL/back-forward/filter/loading konsisten; filter change/reset/cursor failure terpulihkan.
- [ ] SSR metadata unsigned; no video/HLS requests grid; scroll/filter/page memory kembali saat Back dalam session.
- [ ] Pemeriksaan relevant task dan local commit berhasil; actual evidence/receipt dicatat sesudah diamati.

### Validasi

Generate routes via tooling; web state/gateway tests, direct HTML/SSR/hydration browser cases, root gates.

### Hasil dan bukti

Belum diimplementasikan atau divalidasi. Commands di atas merupakan rencana, bukan hasil.

### Commit task

- Pesan usulan: `feat: homepage katalog film/standalone nyata (PCAT-009)`.
- SHA: belum dibuat.
- Hook/checks: belum dijalankan untuk commit ini.
- Ledger: receipt aktual dicatat pada update sesudah commit berhasil.

### Blocker atau tindak lanjut

Menunggu PCAT-008. Approval/hasil proof tidak diasumsikan tersedia.

## Task: PCAT-010 — Detail publik Film/Standalone

- Status: Backlog
- Owner: Codex/pengembang
- Prioritas: P1 — urutan dependency DAG pada plan
- Referensi: PCAT-US-02; PRD-07/08/09, GR-02/03/05/06/08; [plan](../plans/public-catalog/implementation-plan.md)
- Diperbarui: 2026-10-08
- Dependensi: PCAT-009
- Ukuran: Satu hasil review; pecah kembali jika discovery memperluas ruang lingkup.

### Ruang lingkup

Cover/title/kind/duration/synopsis, Watch now/Back browse; validated type navigation context; loader/head/error/status.

Paths/symbol owners: `apps/web/src/routes/videos.$slug.tsx, components/public/video-detail.tsx dan generated route tree`. Rincian simbol dan kontrak di affected-files/implementation steps plan.

### Acceptance criteria

- [ ] Direct/reload/SPA bekerja tanpa login; draft/hidden/archived/missing dan episode route baru 404, dependency failure 503/retry.
- [ ] SSR/metadata tidak memuat signed URLs; cover browser-only; watch intent/preload tidak fetch stream.
- [ ] Pemeriksaan relevant task dan local commit berhasil; actual evidence/receipt dicatat sesudah diamati.

### Validasi

Generate routes, typed/behavior tests, SSR status/HTML and browser navigation; root gates.

### Hasil dan bukti

Belum diimplementasikan atau divalidasi. Commands di atas merupakan rencana, bukan hasil.

### Commit task

- Pesan usulan: `feat: detail publik film/standalone (PCAT-010)`.
- SHA: belum dibuat.
- Hook/checks: belum dijalankan untuk commit ini.
- Ledger: receipt aktual dicatat pada update sesudah commit berhasil.

### Blocker atau tindak lanjut

Menunggu PCAT-009. Approval/hasil proof tidak diasumsikan tersedia.

## Task: PCAT-011 — Integrasi metadata dan navigasi watch existing

- Status: Backlog
- Owner: Codex/pengembang
- Prioritas: P1 — urutan dependency DAG pada plan
- Referensi: PCAT-US-02; PRD-07/08/09, GR-02/03/05/06/08; [plan](../plans/public-catalog/implementation-plan.md)
- Diperbarui: 2026-10-08
- Dependensi: PCAT-010
- Ukuran: Satu hasil review; pecah kembali jika discovery memperluas ruang lingkup.

### Ruang lingkup

Reuse existing Video.js keyed by slug; metadata/navigation/error/retry wrapper; preserve public episode direct links.

Paths/symbol owners: `apps/web/src/routes/watch.$slug.tsx dan components/public/watch-page.tsx`. Rincian simbol dan kontrak di affected-files/implementation steps plan.

### Acceptance criteria

- [ ] Anonymous detail→watch/seek/renew/back berfungsi, no autoplay baru; slug lama tidak tertinggal.
- [ ] Retry explicit mereset player terminal safely; existing episode watch tetap berjalan tanpa detail link invalid.
- [ ] Pemeriksaan relevant task dan local commit berhasil; actual evidence/receipt dicatat sesudah diamati.

### Validasi

Videojs rc.4 bundled docs/skill; real HLS renewal/seek/quality proof affected, direct watch/offline/navigation and root gates.

### Hasil dan bukti

Belum diimplementasikan atau divalidasi. Commands di atas merupakan rencana, bukan hasil.

### Commit task

- Pesan usulan: `feat: integrasi metadata dan navigasi watch existing (PCAT-011)`.
- SHA: belum dibuat.
- Hook/checks: belum dijalankan untuk commit ini.
- Ledger: receipt aktual dicatat pada update sesudah commit berhasil.

### Blocker atau tindak lanjut

Menunggu PCAT-010. Approval/hasil proof tidak diasumsikan tersedia.

## Task: PCAT-012 — Proof SQL visibility, cursor dan poster

- Status: Backlog
- Owner: Codex/pengembang
- Prioritas: P1 — urutan dependency DAG pada plan
- Referensi: PCAT-US-03; PRD-07/08/09, GR-02/03/05/06/08; [plan](../plans/public-catalog/implementation-plan.md)
- Diperbarui: 2026-10-08
- Dependensi: PCAT-004, PCAT-005
- Ukuran: Satu hasil review; pecah kembali jika discovery memperluas ruang lingkup.

### Ruang lingkup

Dedicated guarded media test DB serial; seeded mixed kinds >20 with ties/hidden + actual publication/archive calls.

Paths/symbol owners: `apps/api/test/integration/public-catalog-proof.test.ts`. Rincian simbol dan kontrak di affected-files/implementation steps plan.

### Acceptance criteria

- [ ] All/filter/pages/end/empty/no-kinds compatibility dan tombstone playable terbukti pada SQL nyata.
- [ ] Archive/invalidation follow-up list/detail dan poster denial termasuk no new sign; Series/next tidak regress.
- [ ] Pemeriksaan relevant task dan local commit berhasil; actual evidence/receipt dicatat sesudah diamati.

### Validasi

bun test apps/api/test/integration/public-catalog-proof.test.ts; bun run --cwd apps/api media:series:proof; root gates. Signing unit tetap terpisah dari actual storage browser proof.

### Hasil dan bukti

Belum diimplementasikan atau divalidasi. Commands di atas merupakan rencana, bukan hasil.

### Commit task

- Pesan usulan: `test: proof sql visibility, cursor dan poster (PCAT-012)`.
- SHA: belum dibuat.
- Hook/checks: belum dijalankan untuk commit ini.
- Ledger: receipt aktual dicatat pada update sesudah commit berhasil.

### Blocker atau tindak lanjut

Menunggu PCAT-004, PCAT-005. Approval/hasil proof tidak diasumsikan tersedia.

## Task: PCAT-013 — Acceptance anonymous built-browser nyata

- Status: Backlog
- Owner: Codex/pengembang
- Prioritas: P1 — urutan dependency DAG pada plan
- Referensi: PCAT-US-01/02/03; PRD-07/08/09, GR-02/03/05/06/08; [plan](../plans/public-catalog/implementation-plan.md)
- Diperbarui: 2026-10-08
- Dependensi: PCAT-011, PCAT-012
- Ukuran: Satu hasil review; pecah kembali jika discovery memperluas ruang lingkup.

### Ruang lingkup

Reuse guarded DB/private random MinIO bucket/worker FFmpeg dan Node/Playwright env existing; public browser tanpa injected admin session.

Paths/symbol owners: `apps/api/test/integration/public-catalog-browser-proof.test.ts, apps/web/test/public-catalog-browser-worker.mjs, business-gateway.test.ts dan auth-import-boundary-proof.mjs`. Rincian simbol dan kontrak di affected-files/implementation steps plan.

### Acceptance criteria

- [ ] Catalog→detail→watch→archive, actual cover bytes/HLS/expiry/refetch/direct reload/SSR statuses terbukti; signed URL tidak di HTML/dehydration.
- [ ] Widths 320/390/768/1024/1440 light/dark, keyboard/touch/System/long copy, append/cover/offline/races dan no private headers tested.
- [ ] Pemeriksaan relevant task dan local commit berhasil; actual evidence/receipt dicatat sesudah diamati.

### Validasi

Build artifact terbaru, bun test apps/api/test/integration/public-catalog-browser-proof.test.ts serial; browser/gateway/import proofs dan root gates. R2/Safari unavailable dicatat, bukan lolos.

### Hasil dan bukti

Belum diimplementasikan atau divalidasi. Commands di atas merupakan rencana, bukan hasil.

### Commit task

- Pesan usulan: `test: acceptance anonymous built-browser nyata (PCAT-013)`.
- SHA: belum dibuat.
- Hook/checks: belum dijalankan untuk commit ini.
- Ledger: receipt aktual dicatat pada update sesudah commit berhasil.

### Blocker atau tindak lanjut

Menunggu PCAT-011, PCAT-012. Approval/hasil proof tidak diasumsikan tersedia.

## Task: PCAT-014 — Dokumentasi canonical dan penutupan modul

- Status: Backlog
- Owner: Codex/pengembang
- Prioritas: P1 — urutan dependency DAG pada plan
- Referensi: PCAT-US-01/02/03; PRD-07/08/09, GR-02/03/05/06/08; [plan](../plans/public-catalog/implementation-plan.md)
- Diperbarui: 2026-10-08
- Dependensi: PCAT-013
- Ukuran: Satu hasil review; pecah kembali jika discovery memperluas ruang lingkup.

### Ruang lingkup

Update approved decisions/current implementation/runtime runbook/status/index dan receipts tanpa menduplikasi lengthy evidence.

Paths/symbol owners: `docs/product/prd.md, architecture/overview.md, operations/media.md, README.md, tasks/public-catalog.md dan plan/context pemilik`. Rincian simbol dan kontrak di affected-files/implementation steps plan.

### Acceptance criteria

- [ ] Semua mandatory tasks/AC terpenuhi actual proof dan commit; pending production/device matrix terpisah.
- [ ] Tests relevant, root types/lint/build/docs/format/whitespace pass, unrelated work preserved, no generated artifacts committed.
- [ ] Pemeriksaan relevant task dan local commit berhasil; actual evidence/receipt dicatat sesudah diamati.

### Validasi

Final relevant tests dan bun run check-types/lint/build/docs:check; scoped Prettier, git diff --check, staged audit/hooks.

### Hasil dan bukti

Belum diimplementasikan atau divalidasi. Commands di atas merupakan rencana, bukan hasil.

### Commit task

- Pesan usulan: `docs: dokumentasi canonical dan penutupan modul (PCAT-014)`.
- SHA: belum dibuat.
- Hook/checks: belum dijalankan untuk commit ini.
- Ledger: receipt aktual dicatat pada update sesudah commit berhasil.

### Blocker atau tindak lanjut

Menunggu PCAT-013. Approval/hasil proof tidak diasumsikan tersedia.
