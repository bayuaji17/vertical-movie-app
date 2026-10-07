# Modul: Integrasi katalog API ke homepage

> Status: plan approved / executing · 7 Oktober 2026 · Baseline `ba42d00728e66dd9cbeb0f3d916ae8ddea339f4b`. Plan belum merupakan bukti implementasi.

## Tujuan modul

Pengunjung menemukan konten nyata efektif published dengan UI homepage existing, server filters dan cursor Load more/skeleton. Pemilik kontrak/rekomendasi/detail steps: [implementation plan](../plans/public-catalog-api/implementation-plan.md); evidence baseline: [context](../plans/public-catalog-api/repository-context.md). PRD-07/08 dan GR-02; playback/detail route/editor/production tetap fitur terpisah.

## User story: PCAT-US-001 — Katalog nyata

Sebagai pengunjung tanpa akun, saya ingin melihat Film/Standalone/Series published beserta poster/genre/featured, sehingga saya dapat menemukan cerita yang benar-benar tersedia.

## User story: PCAT-US-002 — Filter dan halaman berikutnya

Sebagai pengunjung, saya ingin mencari/memfilter dan memuat enam item berikutnya tanpa kehilangan hasil lama, sehingga katalog panjang tetap mudah dijelajahi.

## User story: PCAT-US-003 — SSR dan recovery

Sebagai pengunjung, saya ingin first page tersedia lewat SSR dan kegagalan dijelaskan dengan Retry, sehingga pending/error/empty tidak membingungkan atau menampilkan konten fiktif.

## User story: PCAT-US-004 — Visibility dan kontrak aman

Sebagai pemilik sistem, saya ingin katalog/poster mengikuti eligibility dan archive serta endpoint lama tetap kompatibel, sehingga storage privat dan data admin tidak bocor.

## Task: PCAT-000 — Repository context dan plan detail

- Status: Done (planning; approval/runtime task001–011 tetap Backlog)
- Owner: Codex
- Prioritas: P1
- Referensi: seluruh PCAT stories; permintaan pengguna memilih point1 dan meminta plan detail.
- Diperbarui: 2026-10-07
- Dependensi: Homepage PR #10 telah merged.
- Ukuran: Satu planning artifact delivery, tanpa runtime implementation.

### Ruang lingkup

Pin main, trace API/schema/cache/storage/gateway/SSR/query/UI/tests, tulis context sebelum plan, affected-files map/DAG/steps dan backlog, perbarui index. Proposal order/featured/debounce/poster/three-kind scope masih untuk approval pengguna.

### Acceptance criteria

- [x] Context dan plan berdasarkan immutable target, fakta versus proposal dibedakan.
- [x] Kontrak/steps/dependencies/AC/test/rollback/limitations lengkap dan konsisten; seluruh langkah runtime berstatus Backlog.
- [x] docs:check/Prettier/diff dan artifact scope review lulus; hanya Markdown terkait berubah. Hooks normal tetap dijalankan sebelum local commit dan final receipt dilaporkan setelah berhasil.

### Validasi

Bun docs:check, Prettier pada empat Markdown planning/index, git diff --check. Freshness git fetch/target dan impact compare. Planning tidak membutuhkan DB/storage/browser test; hook lint/types bukan bukti runtime PCAT.

### Hasil dan bukti

Analisis pinned base `ba42d00`, tree homepage lama identik; branch lokal `feat/public-catalog-api` dari base. Context ditulis sebelum plan. Source ditemukan belum mendukung catalog namespace/filter/poster/mixed pagination; plan mengusulkan additive endpoint dan semua state API. Observed planning checks: bun run docs:check69 Markdown/689 links, installed Prettier empat file dan git diff --check pass. Structural audit:18 required plan sections,11 steps,12 unique backlog tasks dan15 DAG edges cocok dependency fields; immutable SHA konsisten. Freshness current target diperiksa lagi sebelum commit. Tidak menjalankan DB/storage/browser/full runtime gates dari planning.

### Commit task

- Pesan: `docs(web): plan public catalog API integration (PCAT-000)`
- SHA: lihat actual commit PCAT-000 pada Git history/final receipt setelah commit; ledger berikutnya mencatat SHA tanpa self-reference.
- Hook/checks: docs/format/diff lulus; hooks normal lint/types/docs/Commitlint dijalankan saat commit dan receipt final tersedia pada hasil Git.
- Ledger: standing AGENTS mengotorisasi local task commits; push/PR/merge fitur baru tidak dilakukan dari planning request.

### Blocker atau tindak lanjut

Persetujuan plan diperlukan untuk menjalankan PCAT-001–011. Pilihan teknis rekomendasi telah konkret sehingga dapat ditinjau; tidak ada runtime dependency yang dicoba dari task planning.

## Task: PCAT-001 — Kontrak typed dan cursor

- Status: Done
- Owner: Pengembang/agent pelaksana
- Prioritas: P1, urutan/dependency menurut DAG plan.
- Referensi: PCAT-US-001/002; PRD-07/08, GR-02; step PCAT-001 pada [plan](../plans/public-catalog-api/implementation-plan.md#implementation-steps).
- Diperbarui: 2026-10-07
- Dependensi: PCAT-000 + persetujuan plan
- Ukuran: Satu hasil terpisah; subtask dipecah jika implementasi menemukan risiko tambahan.

### Ruang lingkup

DTO public3jenis, query strict, cursor scope/filter/asOf dan precision; tidak mengganti kontrak legacy.

### Acceptance criteria

- [x] DTO menerima UUID/genre kosong/featured null dan menolak private fields atau query invalid.
- [x] Cursor round-trip lossless pada timestamp mikrodetik; scope/filter/limit/kind mismatch ditolak422.

### Validasi

Bun cursor/model unit tests; compile-only Eden/API/web types.

### Hasil dan bukti

Implemented7 Oktober2026: separate home-model/home-pagination preserve legacy contract, strict cursor scope/filter/asOf/microseconds. Bun5tests/29assertions pass; APItypes/rootbuild pass, hooks root lint/types/docs/Commitlint required at commit. DTO HTTP schema tests permit three kinds/no-genre/nullablefeatured and reject episode/privatefields/invalidduration.

### Commit task

- Pesan: `feat(api): define public home catalog contract (PCAT-001)`
- SHA: belum dibuat.
- Hook/checks: diwajibkan tanpa bypass, hasil belum ada.
- Ledger: actual SHA dicatat pada task berikutnya/delivery setelah commit, bukan self-reference.

### Blocker atau tindak lanjut

Menunggu approval plan dan dependency di atas. Paths/symbols exact, risiko dan completion per step berada pada canonical plan; jangan memperluas ke watch/editor/production.

## Task: PCAT-002 — Query unified dan visibility

- Status: Done
- Owner: Pengembang/agent pelaksana
- Prioritas: P1, urutan/dependency menurut DAG plan.
- Referensi: PCAT-US-001/004; PRD-07/08, GR-02; step PCAT-002 pada [plan](../plans/public-catalog-api/implementation-plan.md#implementation-steps).
- Diperbarui: 2026-10-07
- Dependensi: PCAT-001
- Ukuran: Satu hasil terpisah; subtask dipecah jika implementasi menemukan risiko tambahan.

### Ruang lingkup

UNION movie/standalone + Series, effective visibility/parentposter, global sort/keyset/count, genre EXISTS dan count aggregate; shared predicate parity.

### Acceptance criteria

- [x] Feed tidak menampilkan episode individual atau konten hidden; genre joins tidak menggandakan card/count.
- [x] Tidak ada per-card/N+1 query; fresh poster identity lookup dan legacy playable/preview/next semantics dipertahankan.

### Validasi

Unit/types sesuai perubahan; mandatory real PG parity/performance pada PCAT-009.

### Hasil dan bukti

Unified one-statement PostgreSQL reads implemented. Dedicated media DB proof passes 1 test/21 assertions: 18 mixed titles, six-per-page, cross-table UUID collision, literal search/no genres, microsecond ordering, archive-last-episode parity and fresh poster identity. Catalog unit tests 5/29 and API types pass. Full performance/storage matrix remains PCAT-009.

### Commit task

- Pesan: `feat(api): query unified published catalog (PCAT-002)`
- SHA: dicatat pada ledger task berikutnya setelah commit.
- Hook/checks: diwajibkan tanpa bypass, hasil belum ada.
- Ledger: actual SHA dicatat pada task berikutnya/delivery setelah commit, bukan self-reference.

### Blocker atau tindak lanjut

Dependency terpenuhi. Bukti lint/types/docs/commitlint dicatat setelah commit; proof lanjutan sesuai DAG tetap wajib.

## Task: PCAT-003 — Public endpoint dan cache

- Status: Done
- Owner: Pengembang/agent pelaksana
- Prioritas: P1, urutan/dependency menurut DAG plan.
- Referensi: PCAT-US-001/004; PRD-07/08, GR-02; step PCAT-003 pada [plan](../plans/public-catalog-api/implementation-plan.md#implementation-steps).
- Diperbarui: 2026-10-07
- Dependensi: PCAT-002
- Ukuran: Satu hasil terpisah; subtask dipecah jika implementasi menemukan risiko tambahan.

### Ruang lingkup

Route list/genres/featured, additive bootstrap/DI, bounded unsigned TTL60 cache, generation fence/freshForMs dan after-commit invalidation.

### Acceptance criteria

- [x] Anonymous200 termasuk empty/null; invalid422 dan outage503 tanpa false empty/session requirement.
- [x] Invalidate tidak diikuti stale cache fill; legacy routes/order/constructor/DTO dan private guards tetap kompatibel.

### Validasi

Native app.handle/cache race/OpenAPI tests; relevant API tests/types/build; Eden contract.

### Hasil dan bukti

Public catalog/genres/featured routes and additive bootstrap enabled. Cache canonicalization, remaining TTL, bounded entries, slow-fill generation fence and validation-before-I/O pass native tests (catalog 8 tests/51 assertions). Genres create now invalidates after success. Root build and full API tests recorded in execution log; hooks validate root docs/lint/types.

### Commit task

- Pesan: `feat(api): expose public home catalog (PCAT-003)`
- SHA: dicatat pada ledger task berikutnya setelah commit.
- Hook/checks: diwajibkan tanpa bypass, hasil belum ada.
- Ledger: actual SHA dicatat pada task berikutnya/delivery setelah commit, bukan self-reference.

### Blocker atau tindak lanjut

Dependency terpenuhi. Bukti lint/types/docs/commitlint dicatat setelah commit; proof lanjutan sesuai DAG tetap wajib.

## Task: PCAT-004 — Poster output privat

- Status: Done
- Owner: Pengembang/agent pelaksana
- Prioritas: P1, urutan/dependency menurut DAG plan.
- Referensi: PCAT-US-004; PRD-07/08, GR-02; step PCAT-004 pada [plan](../plans/public-catalog-api/implementation-plan.md#implementation-steps).
- Diperbarui: 2026-10-07
- Dependensi: PCAT-002
- Ukuran: Satu hasil terpisah; subtask dipecah jika implementasi menemukan risiko tambahan.

### Ruang lingkup

Fresh owner lookup dan bounded WebP response melalui nativeS3/profile/owner/generation/provenance gates; private,no-store; bukan playback URL.

### Acceptance criteria

- [x] Actual published poster200, hidden/archive GET baru404, storage/profile/oversize failure503 aman.
- [x] Tidak menerima storage key/URL publik, tidak redirect atau mengubah playback signing; limit/proxy bytes terukur.

### Validasi

Injected storage + app.handle MIME/limit/cancel tests; actual MinIO proof PCAT-009.

### Hasil dan bukti

Native poster service bounds reads to 5 MB, checks owner/job/generation/provenance/profile and fresh visibility, sends WebP no-store. Catalog 11 tests/71 assertions and dedicated PG/private MinIO 1 test/12 assertions pass. Actual production transcodePoster output 1080x1920, unsigned object403, archive404, oversize503 and profile failure verified. Root build passes; further storage/performance matrix remains PCAT-009.

### Commit task

- Pesan: `feat(api): serve published catalog posters (PCAT-004)`
- SHA: dicatat pada ledger task berikutnya setelah commit.
- Hook/checks: diwajibkan tanpa bypass, hasil belum ada.
- Ledger: actual SHA dicatat pada task berikutnya/delivery setelah commit, bukan self-reference.

### Blocker atau tindak lanjut

Dependency terpenuhi. Bukti lint/types/docs/commitlint dicatat setelah commit; proof lanjutan sesuai DAG tetap wajib.

## Task: PCAT-005 — Gateway katalog same-origin

- Status: Backlog
- Owner: Pengembang/agent pelaksana
- Prioritas: P1, urutan/dependency menurut DAG plan.
- Referensi: PCAT-US-003/004; PRD-07/08, GR-02; step PCAT-005 pada [plan](../plans/public-catalog-api/implementation-plan.md#implementation-steps).
- Diperbarui: 2026-10-07
- Dependensi: PCAT-001
- Ukuran: Satu hasil terpisah; subtask dipecah jika implementasi menemukan risiko tambahan.

### Ruang lingkup

Allowlist catalog, poster-specific response limit terpisah dari request/private limit; preserve cookie/redirect/timeout rules.

### Acceptance criteria

- [ ] Anonymous catalog dan valid WebP diteruskan; size/MIME/path/redirect invalid ditolak bounded.
- [ ] Request-body1MiB dan private/auth behaviors tidak dilonggarkan; abort/timeout tidak meninggalkan pending resource.

### Validasi

Bun business-gateway/auth-gateway tests; types/lint/build.

### Hasil dan bukti

Belum diimplementasikan/diverifikasi. Catat command aktual, hasil, decision/deviation dan batas pada task ini saat dieksekusi; existing HOMEFE/APUB proof tidak menutup task PCAT.

### Commit task

- Pesan: `feat(web): proxy public catalog and posters (PCAT-005)`
- SHA: belum dibuat.
- Hook/checks: diwajibkan tanpa bypass, hasil belum ada.
- Ledger: actual SHA dicatat pada task berikutnya/delivery setelah commit, bukan self-reference.

### Blocker atau tindak lanjut

Menunggu approval plan dan dependency di atas. Paths/symbols exact, risiko dan completion per step berada pada canonical plan; jangan memperluas ke watch/editor/production.

## Task: PCAT-006 — Eden adapter dan SSR

- Status: Backlog
- Owner: Pengembang/agent pelaksana
- Prioritas: P1, urutan/dependency menurut DAG plan.
- Referensi: PCAT-US-001/003; PRD-07/08, GR-02; step PCAT-006 pada [plan](../plans/public-catalog-api/implementation-plan.md#implementation-steps).
- Diperbarui: 2026-10-07
- Dependensi: PCAT-003, PCAT-005
- Ukuran: Satu hasil terpisah; subtask dipecah jika implementasi menemukan risiko tambahan.

### Ruang lingkup

Public DTO/view model/client dan server-only transport; request-scoped first6/genres/featured, safe error bootstrap; installed Query APIs.

### Acceptance criteria

- [ ] No dummy imports/false empty, real UUID/no-genre/nullfeatured valid; malformed/error response dilempar aman.
- [ ] SSR tidak memakai cookie/inboundhost/internal env di browser; genre pagination tidak berhenti diam-diam pada100.

### Validasi

Client/AbortSignal/config/genre tests + Eden compile contract; actual SSR/bundle isolation PCAT-010.

### Hasil dan bukti

Belum diimplementasikan/diverifikasi. Catat command aktual, hasil, decision/deviation dan batas pada task ini saat dieksekusi; existing HOMEFE/APUB proof tidak menutup task PCAT.

### Commit task

- Pesan: `feat(web): load public catalog with Eden and SSR (PCAT-006)`
- SHA: belum dibuat.
- Hook/checks: diwajibkan tanpa bypass, hasil belum ada.
- Ledger: actual SHA dicatat pada task berikutnya/delivery setelah commit, bukan self-reference.

### Blocker atau tindak lanjut

Menunggu approval plan dan dependency di atas. Paths/symbols exact, risiko dan completion per step berada pada canonical plan; jangan memperluas ke watch/editor/production.

## Task: PCAT-007 — Cursor infinite query dan filters

- Status: Backlog
- Owner: Pengembang/agent pelaksana
- Prioritas: P1, urutan/dependency menurut DAG plan.
- Referensi: PCAT-US-002/003; PRD-07/08, GR-02; step PCAT-007 pada [plan](../plans/public-catalog-api/implementation-plan.md#implementation-steps).
- Diperbarui: 2026-10-07
- Dependensi: PCAT-006
- Ukuran: Satu hasil terpisah; subtask dipecah jika implementasi menemukan risiko tambahan.

### Ruang lingkup

Rewrite dummy query ke nullable cursor/public namespace, freshForMs, debounce300/IME, exact cancel/reset/latest wins, retry/refetch/refresh.

### Acceptance criteria

- [ ] Click dedup, cursor6→12→18/EOF, race/filter/cache revisit benar; admin cache tetap utuh.
- [ ] Next-page error mempertahankan cards/cursor dan Retry; aborted data tidak mengisi key aktif; tidak offset/dummy seed/auto scroll.

### Validasi

Controlled QueryClient/InfiniteQueryObserver behavioral tests; types/lint/build.

### Hasil dan bukti

Belum diimplementasikan/diverifikasi. Catat command aktual, hasil, decision/deviation dan batas pada task ini saat dieksekusi; existing HOMEFE/APUB proof tidak menutup task PCAT.

### Commit task

- Pesan: `feat(web): paginate API catalog with infinite query (PCAT-007)`
- SHA: belum dibuat.
- Hook/checks: diwajibkan tanpa bypass, hasil belum ada.
- Ledger: actual SHA dicatat pada task berikutnya/delivery setelah commit, bukan self-reference.

### Blocker atau tindak lanjut

Menunggu approval plan dan dependency di atas. Paths/symbols exact, risiko dan completion per step berada pada canonical plan; jangan memperluas ke watch/editor/production.

## Task: PCAT-008 — Homepage state dan metadata nyata

- Status: Backlog
- Owner: Pengembang/agent pelaksana
- Prioritas: P1, urutan/dependency menurut DAG plan.
- Referensi: PCAT-US-001/002/003; PRD-07/08, GR-02; step PCAT-008 pada [plan](../plans/public-catalog-api/implementation-plan.md#implementation-steps).
- Diperbarui: 2026-10-07
- Dependensi: PCAT-004, PCAT-007
- Ukuran: Satu hasil terpisah; subtask dipecah jika implementasi menemukan risiko tambahan.

### Ruang lingkup

Prop-driven genres/featured/cards/dialog/poster; initial/nextpage/background/partial/offline/error/empty states; existing responsive design.

### Acceptance criteria

- [ ] APIempty/down tidak menampilkan fixture, nullable featured/genres kosong sah; pending/error Load more mempertahankan cards.
- [ ] Poster9:16/fallback bounded, keyboard/live status/theme/reduced-motion dan safe total changes; no auth/watch/playback requests.

### Validasi

Source import audit, types/lint/build; full browser AC PCAT-010.

### Hasil dan bukti

Belum diimplementasikan/diverifikasi. Catat command aktual, hasil, decision/deviation dan batas pada task ini saat dieksekusi; existing HOMEFE/APUB proof tidak menutup task PCAT.

### Commit task

- Pesan: `feat(web): integrate live public catalog UI (PCAT-008)`
- SHA: belum dibuat.
- Hook/checks: diwajibkan tanpa bypass, hasil belum ada.
- Ledger: actual SHA dicatat pada task berikutnya/delivery setelah commit, bukan self-reference.

### Blocker atau tindak lanjut

Menunggu approval plan dan dependency di atas. Paths/symbols exact, risiko dan completion per step berada pada canonical plan; jangan memperluas ke watch/editor/production.

## Task: PCAT-009 — Proof PG/storage dan performance

- Status: Backlog
- Owner: Pengembang/agent pelaksana
- Prioritas: P1, urutan/dependency menurut DAG plan.
- Referensi: PCAT-US-004; PRD-07/08, GR-02; step PCAT-009 pada [plan](../plans/public-catalog-api/implementation-plan.md#implementation-steps).
- Diperbarui: 2026-10-07
- Dependensi: PCAT-003, PCAT-004, PCAT-005
- Ukuran: Satu hasil terpisah; subtask dipecah jika implementasi menemukan risiko tambahan.

### Ruang lingkup

Dedicated mixed dataset/precision/UUID ties/genre count/>100boundary/invalidation/asOf/archive; actual MinIO; EXPLAIN dan conditional index decision.

### Acceptance criteria

- [ ] Real query cursor/count/parity, fresh poster denial/bytes/error dan no N+1 dibuktikan; actual results dicatat.
- [ ] DBreset/storagecleanup hanya dedicated; jika schema/index berubah migration proof dan development migrate/preservation wajib.

### Validasi

New public-catalog-proof suite dan existing media publication/series serial; optional index gates mengikuti runbook.

### Hasil dan bukti

Belum diimplementasikan/diverifikasi. Catat command aktual, hasil, decision/deviation dan batas pada task ini saat dieksekusi; existing HOMEFE/APUB proof tidak menutup task PCAT.

### Commit task

- Pesan: `test(api): prove public catalog visibility and paging (PCAT-009)`
- SHA: belum dibuat.
- Hook/checks: diwajibkan tanpa bypass, hasil belum ada.
- Ledger: actual SHA dicatat pada task berikutnya/delivery setelah commit, bukan self-reference.

### Blocker atau tindak lanjut

Menunggu approval plan dan dependency di atas. Paths/symbols exact, risiko dan completion per step berada pada canonical plan; jangan memperluas ke watch/editor/production.

## Task: PCAT-010 — Acceptance browser actual API

- Status: Backlog
- Owner: Pengembang/agent pelaksana
- Prioritas: P1, urutan/dependency menurut DAG plan.
- Referensi: PCAT-US-001/002/003/004; PRD-07/08, GR-02; step PCAT-010 pada [plan](../plans/public-catalog-api/implementation-plan.md#implementation-steps).
- Diperbarui: 2026-10-07
- Dependensi: PCAT-008, PCAT-009
- Ukuran: Satu hasil terpisah; subtask dipecah jika implementasi menemukan risiko tambahan.

### Ruang lingkup

Existing harness public-catalog phase, actualElysia/PG/MinIO, dev+built, responsive/theme/SSR/paging/filter/fault/offline/focus/poster proof.

### Acceptance criteria

- [ ] Matrix320–1920 dan Light/Dark/System, SSRfirst6 tanpa duplicate hydrationfetch, paging/errorretry/IME/nullfeatured/empty/longUnicode/fallback lulus.
- [ ] Publicrequests hanya catalog/poster, tanpa auth/admin/watch/playback; no hydration/page errors; API outage tidak fallback dummy.

### Validasi

Implemented new phase melalui bun apps/web/test/auth-browser-smoke.mjs setelah flags tersedia; serialized reset/build.

### Hasil dan bukti

Belum diimplementasikan/diverifikasi. Catat command aktual, hasil, decision/deviation dan batas pada task ini saat dieksekusi; existing HOMEFE/APUB proof tidak menutup task PCAT.

### Commit task

- Pesan: `test(web): verify live public catalog in browser (PCAT-010)`
- SHA: belum dibuat.
- Hook/checks: diwajibkan tanpa bypass, hasil belum ada.
- Ledger: actual SHA dicatat pada task berikutnya/delivery setelah commit, bukan self-reference.

### Blocker atau tindak lanjut

Menunggu approval plan dan dependency di atas. Paths/symbols exact, risiko dan completion per step berada pada canonical plan; jangan memperluas ke watch/editor/production.

## Task: PCAT-011 — Canonical docs dan closure

- Status: Backlog
- Owner: Pengembang/agent pelaksana
- Prioritas: P1, urutan/dependency menurut DAG plan.
- Referensi: PCAT-US-001/002/003/004; PRD-07/08, GR-02; step PCAT-011 pada [plan](../plans/public-catalog-api/implementation-plan.md#implementation-steps).
- Diperbarui: 2026-10-07
- Dependensi: PCAT-010
- Ukuran: Satu hasil terpisah; subtask dipecah jika implementasi menemukan risiko tambahan.

### Ruang lingkup

Approved choices/actual runtime/evidence/receipt dalam PRD/globalrules/overview/media/design/index/PCAT; preserve history dan scope.

### Acceptance criteria

- [ ] Seluruh mandatory AC mempunyai proof aktual; no whole PRD-07/playback/editor/production claim.
- [ ] Scoped commits/hooks/gates lengkap; runtime fresh terhadap target; delivery baru hanya dengan user authorization.

### Validasi

Relevant tests, roottypes/lint/build, docscheck/Prettier/diff/normalhooks; rerun proportional to changed source.

### Hasil dan bukti

Belum diimplementasikan/diverifikasi. Catat command aktual, hasil, decision/deviation dan batas pada task ini saat dieksekusi; existing HOMEFE/APUB proof tidak menutup task PCAT.

### Commit task

- Pesan: `docs: record verified public catalog integration (PCAT-011)`
- SHA: belum dibuat.
- Hook/checks: diwajibkan tanpa bypass, hasil belum ada.
- Ledger: actual SHA dicatat pada task berikutnya/delivery setelah commit, bukan self-reference.

### Blocker atau tindak lanjut

Menunggu approval plan dan dependency di atas. Paths/symbols exact, risiko dan completion per step berada pada canonical plan; jangan memperluas ke watch/editor/production.

## Traceability acceptance

| Acceptance plan                   | Task proof                                                     |
| --------------------------------- | -------------------------------------------------------------- |
| AC-01 eligibility/realdata        | PCAT-002/003/008/009/010                                       |
| AC-02 filters/globalcursor/count  | PCAT-001/002/007/009/010                                       |
| AC-03 featured/genre/poster       | PCAT-002/003/004/005/008/009/010                               |
| AC-04 SSR/requestisolation        | PCAT-005/006/010                                               |
| AC-05 paging/skeleton/retry       | PCAT-007/008/010                                               |
| AC-06 debounce/cancel/cache       | PCAT-003/006/007/010                                           |
| AC-07 errors/accessibility/layout | PCAT-008/010                                                   |
| AC-08 visibility/legacy parity    | PCAT-002/003/004/005/009                                       |
| AC-09 gates/evidence              | Seluruh task; PCAT-009 conditional migration, PCAT-011 closure |
| AC-10 scope/history               | PCAT-000/011                                                   |

## Ledger dan approval

- 2026-10-07: pengguna memilih rekomendasi point1, meminta plan detail; tidak meminta implementasi baru.
- Contract/UX tiga jenis/order/featured/debounce300/poster disetujui pengguna7 Oktober2026 (oke approve). Setelah persetujuan, tandai langkah dengan dependency terpenuhi sebagai Ready, bukan semua task Done.
- Git/runtime delivery baru: belum dilakukan; local planning branch/artifacts tidak berarti endpoint/API sudah tersedia.

- 2026-10-07: Approval implementasi PCAT diterima; PCAT-000 commit2130a75fd85a1f8db9ac5af4fc9e97cf64d7b7c3. Remote delivery fitur baru tetap belum diotorisasi.

- Previous verified task commit before PCAT-002: 038d5f90e8be5890d52f46f53f84aac7037ef3cc feat(api): define public home catalog contract (PCAT-001).

- Previous verified task commit before PCAT-003: 70dfa4422a0d8f4d7c268bc5ad56ce997fd05142 feat(api): query unified published catalog (PCAT-002).

- Previous verified task commit before PCAT-004: 4db433cc3a5afb7de2e7e569ef82bfc6909fc29a feat(api): expose cached public home catalog (PCAT-003).
