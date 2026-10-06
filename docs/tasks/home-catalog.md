# Modul: Homepage dan katalog frontend

## Tujuan modul

Implementasi frontend beranda/katalog yang disetujui pengguna 7 Oktober 2026, memakai dummy JSON lokal sesuai [implementation plan](../plans/home-catalog/implementation-plan.md). Acuan fakta pada [repository context](../plans/home-catalog/repository-context.md), visual pada [design homepage](../design/home-catalog.md). Runtime belum dimulai.

## User story: HOME-US-001

Sebagai pengunjung tanpa akun, saya ingin melihat Film/Series/Standalone dengan poster portrait dan metadata jelas, lalu membuka detail dummy untuk memilih cerita.

## User story: HOME-US-002

Sebagai pengunjung, saya ingin mencari, memfilter dan memuat lebih banyak judul dari katalog lokal, sehingga dapat menemukan konten tanpa API.

## User story: HOME-US-003

Sebagai pengunjung ponsel/desktop, saya ingin menavigasi dengan sentuhan/keyboard dan memilih tema, sehingga layar publik nyaman digunakan.

## Task: HOMEFE-000 — Repository context dan detailed plan

- Status: Done
- Owner: Codex
- Prioritas: 0
- Referensi: HOME-US-001/002/003; PRD-07/08; GR-02; permintaan pengguna 7 Oktober 2026.
- Diperbarui: 2026-10-07
- Dependensi: HOMEDES-001 selesai; mockup disetujui.
- Ukuran: Satu hasil planning.

### Ruang lingkup

Context pinned SHA sebelum plan, impact/DAG/fixture contract/behavior/matrix/backlog, approval dan status canonical/index; tanpa runtime changes.

### Acceptance criteria

- [x] Context ditulis lebih dahulu dan source path/DTO/theme/route boundaries traceable di snapshot.
- [x] Plan FE-only dummy JSON menjelaskan struktur data/filter/actions/assets/responsivitas/SSR/network proof.
- [x] Setiap task memiliki AC/dependency/validation; playback/API tidak masuk diam-diam.
- [x] Approval/index/product docs selaras; docs:check/format/diff check dan commit task lulus.

### Validasi

Prettier Markdown yang diubah; bun run docs:check; git diff --check; hook docs/lint/types/Commitlint.

### Hasil dan bukti

7 Oktober 2026: snapshot b90edaaaca83187726218286fdaf253958a483fe; main 4cf00a9 hanya menambah dokumen APUB, runtime paths identik. Context disimpan sebelum plan. Skill planner/shadcn dibaca untuk planning. Mockup disetujui; detail dialog, JSON 18 items dan batch enam merupakan proposal implementasi untuk review. Final docs:check lulus (62 Markdown, 591 local links/anchors); Prettier write/check pada delapan Markdown dan git diff --check lulus. Hook menjalankan docs:check, lint web (1/1) dan check-types API/auth/web (3/3), keduanya replay cache Turbo; Commitlint lulus. Tidak ada perubahan runtime/API/schema/script/dependency; build/test runtime tidak dijalankan pada task planning.

### Commit task

- Pesan: docs(web): plan dummy homepage catalog (HOMEFE-000)
- SHA planning: `ab15400d7f8eee9fa305d60cd4f155c639d10b6d`.
- Hook/checks: docs:check, lint, check-types dan Commitlint lulus tanpa bypass; format/diff check lulus.
- Ledger: Update sesudah commit planning; branch lokal `feat/home-catalog-mockup`, belum push/PR/merge.

### Blocker atau tindak lanjut

Plan untuk review, runtime belum diotorisasi. Pertanyaan opsional CTA dikirim; default dialog metadata, refine bila pengguna memilih player dummy.

## Task: HOMEFE-001 — Dummy JSON typed dan selector katalog

- Status: Ready
- Owner: Codex
- Prioritas: 1
- Referensi: HOME-US-001; PRD-07/08; GR-02; [plan](../plans/home-catalog/implementation-plan.md).
- Diperbarui: 2026-10-07
- Dependensi: Tidak ada setelah plan direview; pelaksanaan menunggu instruksi implementasi.
- Ukuran: Satu hasil review dengan commit terpisah.

### Ruang lingkup

Satu source JSON berisi 18 items + genres/featured, model lokal Zod, import typed dan pure behavior yang dipakai semua komponen.

Affected files: `apps/web/src/data/catalog.json`; `apps/web/src/lib/catalog/{catalog-schema,catalog-data,catalog-selectors}.ts`; `apps/web/tsconfig.json`; `apps/web/test/home-catalog-data.test.ts`.

### Acceptance criteria

- [ ] 18 items (enam tiap kind), enam judul awal sesuai mockup, unique id/slug, references valid dan field-kind exclusivity; semua poster local path.
- [ ] Sort publishedAt desc/id asc stabil, title/synopsis search trim/case-insensitive, kind+genre AND, slice batch 6 tanpa duplicate/cap overflow.
- [ ] Transisi perubahan filter/query/reset mengembalikan halaman pertama berisi enam; pure page selector menghasilkan items/total/nextOffset tanpa fetch/API.
- [ ] Tes perilaku mencakup empty/unknown genre/timestamp tie/duration vs episodeCount dan web check-types lulus.

### Validasi

bun test apps/web/test/home-catalog-data.test.ts; bun run check-types --filter=web; format/diff review.

### Hasil dan bukti

Belum dikerjakan. Catat command/scope/result/limitations aktual; jangan menaikkan status dari checklist rencana saja.

### Commit task

- Pesan: `feat(web): dummy json typed dan selector katalog (HOMEFE-001)`.
- SHA: Belum dibuat.
- Hook/checks: Belum dijalankan.
- Ledger: SHA aktual dicatat pada update dokumentasi task berikutnya setelah commit, tanpa self-referential SHA.

### Blocker atau tindak lanjut

Ikuti dependency dan batas data lokal pada plan; browser acceptance lintas task ditutup pada HOMEFE-009/010.

## Task: HOMEFE-002 — Enam poster source lokal dan fallback

- Status: Ready
- Owner: Codex
- Prioritas: 2
- Referensi: HOME-US-001; PRD-07/08; GR-02; [plan](../plans/home-catalog/implementation-plan.md).
- Diperbarui: 2026-10-07
- Dependensi: Tidak ada setelah plan direview; pelaksanaan menunggu instruksi implementasi.
- Ukuran: Satu hasil review dengan commit terpisah.

### Ruang lingkup

Sediakan source standalone untuk enam scene approved; hasil mockup gabungan tetap referensi dan tidak dijadikan background halaman.

Affected files: `apps/web/public/images/catalog/*.png`; `apps/web/public/images/catalog/poster-fallback.svg`; `docs/design/home-catalog.md`.

### Acceptance criteria

- [ ] Enam PNG portrait 9:16 mandiri, local paths sesuai JSON, source/proses terdokumentasi dan tanpa remote CDN/API.
- [ ] Scene sesuai enam judul awal; imagegen bila belum ada source. Frame output/dimensi diperiksa; resolusi cukup untuk lebar kartu/hero.
- [ ] Fallback SVG netral tersedia dan tidak mengandung label/metadata admin; file image mode 100644, ukuran/format wajar.
- [ ] Tidak overwrite mockup approved atau source/image unrelated.

### Validasi

Review native image/dimensi/aspect/header; file path/permission checks; docs:check setelah evidence.

### Hasil dan bukti

Belum dikerjakan. Catat command/scope/result/limitations aktual; jangan menaikkan status dari checklist rencana saja.

### Commit task

- Pesan: `feat(web): enam poster source lokal dan fallback (HOMEFE-002)`.
- SHA: Belum dibuat.
- Hook/checks: Belum dijalankan.
- Ledger: SHA aktual dicatat pada update dokumentasi task berikutnya setelah commit, tanpa self-referential SHA.

### Blocker atau tindak lanjut

Ikuti dependency dan batas data lokal pada plan; browser acceptance lintas task ditutup pada HOMEFE-009/010.

## Task: HOMEFE-003 — Shell publik, menu mobile dan appearance

- Status: Ready
- Owner: Codex
- Prioritas: 3
- Referensi: HOME-US-003; PRD-07/08; GR-02; [plan](../plans/home-catalog/implementation-plan.md).
- Diperbarui: 2026-10-07
- Dependensi: Tidak ada setelah plan direview; pelaksanaan menunggu instruksi implementasi.
- Ukuran: Satu hasil review dengan commit terpisah.

### Ruang lingkup

Header/footer, brand Home/Browse, InputGroup search slot, Sheet mobile dan theme menu publik dari primitives existing.

Affected files: `apps/web/src/components/catalog/public-shell.tsx`; `apps/web/src/components/catalog/appearance-menu.tsx`.

### Acceptance criteria

- [ ] Public shell tanpa identity/login/session/API; Home/Browse mempunyai callback/target yang jelas dan SheetTitle aksesibel.
- [ ] Appearance memakai useTheme existing dengan Light/Dark/System, tanpa provider/storage key baru atau import admin-shell/theme-menu.
- [ ] Satu search aktif pada tiap breakpoint, state lewat props; hidden control tidak focusable; aksi mobile 44 CSS px.
- [ ] Semantic landmarks/skip link/focus visible, desktop nav dan mobile drawer konsisten; checks web lulus.

### Validasi

bun run lint --filter=web; bun run check-types --filter=web; review installed Base UI trigger/render; flow browser final pada HOMEFE-009.

### Hasil dan bukti

Belum dikerjakan. Catat command/scope/result/limitations aktual; jangan menaikkan status dari checklist rencana saja.

### Commit task

- Pesan: `feat(web): shell publik, menu mobile dan appearance (HOMEFE-003)`.
- SHA: Belum dibuat.
- Hook/checks: Belum dijalankan.
- Ledger: SHA aktual dicatat pada update dokumentasi task berikutnya setelah commit, tanpa self-referential SHA.

### Blocker atau tindak lanjut

Ikuti dependency dan batas data lokal pada plan; browser acceptance lintas task ditutup pada HOMEFE-009/010.

## Task: HOMEFE-004 — Featured film responsif

- Status: Backlog
- Owner: Codex
- Prioritas: 4
- Referensi: HOME-US-001; PRD-07/08; GR-02; [plan](../plans/home-catalog/implementation-plan.md).
- Diperbarui: 2026-10-07
- Dependensi: HOMEFE-001, HOMEFE-002; pelaksanaan menunggu instruksi implementasi.
- Ukuran: Satu hasil review dengan commit terpisah.

### Ruang lingkup

FeaturedId JSON menjadi source hero; tampilan desktop dan compact mobile mengikuti mockup dengan CTA lokal.

Affected files: `apps/web/src/components/catalog/featured-film.tsx`; `apps/web/src/components/catalog/poster.tsx`.

### Acceptance criteria

- [ ] After the Rain/synopsis/genre/duration diambil dari fixture, thumbnail tidak keluar panel dan frame 9/16 tanpa stretch.
- [ ] Desktop text+poster, mobile compact/stack pada 320 px; long labels/safe spacing tidak overlap.
- [ ] View film/View details memakai callback detail lokal sesuai usulan plan, tidak mengarahkan/prefetch watch/API.
- [ ] Feature muncul hanya default query/kind/genre; controls/labels/focus terbaca di kedua tema.

### Validasi

Fixture/page-selector tests existing; web types/lint; DOM ratio/visual matrix dibuktikan pada HOMEFE-009.

### Hasil dan bukti

Belum dikerjakan. Catat command/scope/result/limitations aktual; jangan menaikkan status dari checklist rencana saja.

### Commit task

- Pesan: `feat(web): featured film responsif (HOMEFE-004)`.
- SHA: Belum dibuat.
- Hook/checks: Belum dijalankan.
- Ledger: SHA aktual dicatat pada update dokumentasi task berikutnya setelah commit, tanpa self-referential SHA.

### Blocker atau tindak lanjut

Ikuti dependency dan batas data lokal pada plan; browser acceptance lintas task ditutup pada HOMEFE-009/010.

## Task: HOMEFE-005 — Poster card dan grid tiga jenis

- Status: Backlog
- Owner: Codex
- Prioritas: 5
- Referensi: HOME-US-001; PRD-07/08; GR-02; [plan](../plans/home-catalog/implementation-plan.md).
- Diperbarui: 2026-10-07
- Dependensi: HOMEFE-001, HOMEFE-002, HOMEFE-004; pelaksanaan menunggu instruksi implementasi.
- Ukuran: Satu hasil review dengan commit terpisah.

### Ruang lingkup

Poster local + duration/episode badges + title/type/genre dan CSS grid yang dipakai hasil selector.

Affected files: `apps/web/src/components/catalog/{poster,catalog-card,catalog-grid}.tsx`.

### Acceptance criteria

- [ ] Film/Standalone memakai duration, Series episodeCount; tidak menampilkan worker/editorial/admin metadata.
- [ ] Semua frame CSS 9/16 dengan reserved space dan image fallback once; tidak memakai video/player/circle play pada Series.
- [ ] Card open action memiliki accessible title, no nested interactive duplication; long title/genre dapat wrap.
- [ ] Grid 2/3/4/6 mengikuti width plan; results dapat 0 tanpa crash, Load more menerima props/callback tanpa data fetch.

### Validasi

Unit metadata/fixture tests; web types/lint; fallback/ratio/overflow checks final pada HOMEFE-009.

### Hasil dan bukti

Belum dikerjakan. Catat command/scope/result/limitations aktual; jangan menaikkan status dari checklist rencana saja.

### Commit task

- Pesan: `feat(web): poster card dan grid tiga jenis (HOMEFE-005)`.
- SHA: Belum dibuat.
- Hook/checks: Belum dijalankan.
- Ledger: SHA aktual dicatat pada update dokumentasi task berikutnya setelah commit, tanpa self-referential SHA.

### Blocker atau tindak lanjut

Ikuti dependency dan batas data lokal pada plan; browser acceptance lintas task ditutup pada HOMEFE-009/010.

## Task: HOMEFE-006 — Search, filter, urutan dan Load more lokal

- Status: Backlog
- Owner: Codex
- Prioritas: 6
- Referensi: HOME-US-002; PRD-07/08; GR-02; [plan](../plans/home-catalog/implementation-plan.md).
- Diperbarui: 2026-10-07
- Dependensi: HOMEFE-001, HOMEFE-005; pelaksanaan menunggu instruksi implementasi.
- Ukuran: Satu hasil review dengan commit terpisah.

### Ruang lingkup

Wire filter/query dengan useInfiniteQuery dan infiniteQueryOptions existing; queryFn mengembalikan Promise halaman JSON lokal, InputGroup/ToggleGroup/NativeSelect dan Empty state. Tidak memakai visibleCount untuk pagination.

Affected files: `apps/web/src/components/catalog/catalog-filters.tsx`; `apps/web/src/components/catalog/catalog-grid.tsx`; `apps/web/src/components/catalog/home-page.tsx`; `apps/web/src/components/catalog/lib/catalog/catalog-selectors.ts`; `apps/web/test/home-catalog-data.test.ts`.

### Acceptance criteria

- [ ] Search synchronous title/synopsis, ToggleGroup single-selection all/movie/series/standalone dengan label Film dan genre All genres.
- [ ] useInfiniteQuery: key publik berisi normalized filters/pageSize/schemaVersion, initialPageParam0, nextOffset/getNextPageParam, data.pages; pages6→12→18 tanpa duplikat dan EOF hasNextPage=false.
- [ ] First-page initialData pages/pageParams untuk SSR; networkMode always, staleTime Infinity, no automatic refetch/artificial delay/HTTP.
- [ ] Load more fetchNextPage cancelRefetch=false diguard hasNextPage/!isFetching; busy state isFetchingNextPage, rapid-click dedup teruji.
- [ ] AND filters/latest stable; query/filter/reset cancel dan seed cache exact key tujuan ke halaman pertama, termasuk cache revisit; tidak menyentuh cache admin/auth. Resize/detail/theme tidak reset pages.
- [ ] Empty No titles found dan Reset filters bekerja serta fokus search; count announce polite, no fake spinner/error/timer.
- [ ] Latest releases berupa label urutan tetap; Home reset dan Browse fokus tidak melahirkan URL/dummy route.

### Validasi

bun test apps/web/test/home-catalog-data.test.ts; web types/lint; interactive flows/network observation pada HOMEFE-009.

### Hasil dan bukti

Belum dikerjakan. Catat command/scope/result/limitations aktual; jangan menaikkan status dari checklist rencana saja.

### Commit task

- Pesan: `feat(web): search, filter, urutan dan load more lokal (HOMEFE-006)`.
- SHA: Belum dibuat.
- Hook/checks: Belum dijalankan.
- Ledger: SHA aktual dicatat pada update dokumentasi task berikutnya setelah commit, tanpa self-referential SHA.

### Blocker atau tindak lanjut

Ikuti dependency dan batas data lokal pada plan; browser acceptance lintas task ditutup pada HOMEFE-009/010.

## Task: HOMEFE-007 — Dialog detail metadata dummy

- Status: Backlog
- Owner: Codex
- Prioritas: 7
- Referensi: HOME-US-001; PRD-07/08; GR-02; [plan](../plans/home-catalog/implementation-plan.md).
- Diperbarui: 2026-10-07
- Dependensi: HOMEFE-001, HOMEFE-004; pelaksanaan menunggu instruksi implementasi.
- Ukuran: Satu hasil review dengan commit terpisah.

### Ruang lingkup

Dialog lokal untuk featured/kartu dari selectedItemId JSON; bukan route/player baru.

Affected files: `apps/web/src/components/catalog/catalog-detail-dialog.tsx`; `apps/web/src/components/catalog/home-page.tsx`.

### Acceptance criteria

- [ ] Poster/title/synopsis/genres/duration atau episodeCount item terpilih tepat untuk ketiga kind.
- [ ] DialogTitle/Description, close/Escape, focus trap/return ke trigger dan batas viewport tersedia.
- [ ] Klik tidak memakai fetch/Eden/API/route watch, tidak menjanjikan playback aktif atau episode API.
- [ ] Query/filter/loadedcount tetap setelah dialog close; long content scroll dalam modal.

### Validasi

Web types/lint; keyboard/focus/network/long content browser proof pada HOMEFE-009. Bila CTA decision berubah, refine sebelum coding.

### Hasil dan bukti

Belum dikerjakan. Catat command/scope/result/limitations aktual; jangan menaikkan status dari checklist rencana saja.

### Commit task

- Pesan: `feat(web): dialog detail metadata dummy (HOMEFE-007)`.
- SHA: Belum dibuat.
- Hook/checks: Belum dijalankan.
- Ledger: SHA aktual dicatat pada update dokumentasi task berikutnya setelah commit, tanpa self-referential SHA.

### Blocker atau tindak lanjut

Ikuti dependency dan batas data lokal pada plan; browser acceptance lintas task ditutup pada HOMEFE-009/010.

## Task: HOMEFE-008 — Integrasi route home, metadata dan responsive polish

- Status: Backlog
- Owner: Codex
- Prioritas: 8
- Referensi: HOME-US-001/003; PRD-07/08; GR-02; [plan](../plans/home-catalog/implementation-plan.md).
- Diperbarui: 2026-10-07
- Dependensi: HOMEFE-003, HOMEFE-004, HOMEFE-005, HOMEFE-006, HOMEFE-007; pelaksanaan menunggu instruksi implementasi.
- Ukuran: Satu hasil review dengan commit terpisah.

### Ruang lingkup

Replace starter, compose seluruh sections/actions, head title/description, responsive/integration pass.

Affected files: `apps/web/src/routes/index.tsx`; `apps/web/src/components/catalog/home-page.tsx dan catalog UI`.

### Acceptance criteria

- [ ] GET/route / menampilkan catalog dan metadata brand; starter button/Mux video demo tidak dimuat.
- [ ] Tidak menambah route; root/provider/watch/admin/api unchanged, source data tunggal dan prop boundaries jelas.
- [ ] Light faithful hierarchy/mockup; dark/system memakai semantic palette existing, min-width/gutters/touch/focus/reduced-motion ditinjau.
- [ ] Batch awal 6 pada SSR/hydration/semua width; search/filter/feature/dialog/menu saling konsisten dan tidak reload state saat resize.

### Validasi

Bun test selectors/theme; bun run check-types --filter=web; bun run lint --filter=web; bun run build --filter=web; visual debug sebelum HOMEFE-009.

### Hasil dan bukti

Belum dikerjakan. Catat command/scope/result/limitations aktual; jangan menaikkan status dari checklist rencana saja.

### Commit task

- Pesan: `feat(web): integrasi route home, metadata dan responsive polish (HOMEFE-008)`.
- SHA: Belum dibuat.
- Hook/checks: Belum dijalankan.
- Ledger: SHA aktual dicatat pada update dokumentasi task berikutnya setelah commit, tanpa self-referential SHA.

### Blocker atau tindak lanjut

Ikuti dependency dan batas data lokal pada plan; browser acceptance lintas task ditutup pada HOMEFE-009/010.

## Task: HOMEFE-009 — Proof browser, SSR dan independensi API

- Status: Backlog
- Owner: Codex
- Prioritas: 9
- Referensi: HOME-US-002/003; PRD-07/08; GR-02; [plan](../plans/home-catalog/implementation-plan.md).
- Diperbarui: 2026-10-07
- Dependensi: HOMEFE-008; pelaksanaan menunggu instruksi implementasi.
- Ukuran: Satu hasil review dengan commit terpisah.

### Ruang lingkup

Worker memakai Playwright host existing; dev dan built Bun/Nitro, observer requests, accessible flows/matrix dan screenshot nyata.

Affected files: `apps/web/test/home-catalog-browser-worker.mjs`; `docs/design/home-catalog-implemented-*.png`; `task evidence`.

### Acceptance criteria

- [ ] API unreachable/block semua API paths/origin; zero attempted catalog/auth/playback requests, termasuk prefetch/interaction; SSR tetap mengirim konten.
- [ ] Viewport 320/390/768/1024/1440/1920 light+dark tanpa horizontal overflow; poster frame 9/16 dengan toleransi 1 CSS px, semua UI berada dalam viewport.
- [ ] Search/title/synopsis/AND/empty/reset/infinite query load6→12→18/cache revisit reset6/rapid-click/Home/Browse/detail tiga kind/keyboard/Escape-focus return/drawer/resize/theme persist lulus.
- [ ] Long title/failed poster fallback once, no page/hydration error; screenshot implemented light desktop/mobile+dark dan command/result/limitations nyata tersimpan.

### Validasi

Jalankan host Playwright worker dengan baseURL/module/executable/screenshot prefix aktual, SSR HTTP proof pada built web API down; record network events/DOM assertions.

### Hasil dan bukti

Belum dikerjakan. Catat command/scope/result/limitations aktual; jangan menaikkan status dari checklist rencana saja.

### Commit task

- Pesan: `feat(web): proof browser, ssr dan independensi api (HOMEFE-009)`.
- SHA: Belum dibuat.
- Hook/checks: Belum dijalankan.
- Ledger: SHA aktual dicatat pada update dokumentasi task berikutnya setelah commit, tanpa self-referential SHA.

### Blocker atau tindak lanjut

Ikuti dependency dan batas data lokal pada plan; browser acceptance lintas task ditutup pada HOMEFE-009/010.

## Task: HOMEFE-010 — Quality gates, dokumentasi dan closure

- Status: Backlog
- Owner: Codex
- Prioritas: 10
- Referensi: HOME-US-001/002/003; PRD-07/08; GR-02; [plan](../plans/home-catalog/implementation-plan.md).
- Diperbarui: 2026-10-07
- Dependensi: HOMEFE-009; pelaksanaan menunggu instruksi implementasi.
- Ukuran: Satu hasil review dengan commit terpisah.

### Ruang lingkup

Full root gates dan regression terkait, canonical status/data-boundary, final diff dan commit ledger.

Affected files: `docs/{README,design/home-catalog,product/prd,product/global-rules,plans/home-catalog/*,tasks/home-catalog}.md`; `scoped runtime fixes bila diperlukan`.

### Acceptance criteria

- [ ] Relevant selector/theme tests, root check-types/lint/build, docs:check/Prettier/diff check lulus dengan command/results dicatat.
- [ ] Design/PRD/global/index menyatakan implemented+verified lokal dummy JSON, bukan integrasi API/playback/published nyata/production ready.
- [ ] Task commits memiliki ID dan SHA ledger; changes limited to approved path, generated cache/secrets/unrelated work preserved.
- [ ] Worktree ready untuk review; push/PR/merge/deploy belum dilakukan tanpa otorisasi sendiri.

### Validasi

bun test apps/web/test/home-catalog-data.test.ts apps/web/test/admin-theme.test.ts; bun run check-types; bun run lint; bun run build; bun run docs:check; Prettier changedfiles; git diff --check; hooks.

### Hasil dan bukti

Belum dikerjakan. Catat command/scope/result/limitations aktual; jangan menaikkan status dari checklist rencana saja.

### Commit task

- Pesan: `docs(web): quality gates, dokumentasi dan closure (HOMEFE-010)`.
- SHA: Belum dibuat.
- Hook/checks: Belum dijalankan.
- Ledger: SHA aktual dicatat pada update dokumentasi task berikutnya setelah commit, tanpa self-referential SHA.

### Blocker atau tindak lanjut

Integrasi real API/playback/production merupakan tahap lanjutan tersendiri.

## Task: HOMEFE-011 — Refinement plan untuk TanStack infinite query

- Status: Done
- Owner: Codex
- Prioritas: Planning refinement sebelum runtime001–010
- Referensi: Klarifikasi pengguna 7 Oktober 2026; HOME-US-002; [plan](../plans/home-catalog/implementation-plan.md).
- Diperbarui: 2026-10-07
- Dependensi: HOMEFE-000 selesai.
- Ukuran: Satu perubahan dokumentasi.

### Ruang lingkup

Ganti pagination visibleCount/state-only dengan useInfiniteQuery/queryFn dummy JSON, contract offset/pages, caching/cancel/reset, SSR initialData, nextpage/zeroHTTP proof; selaraskan context/backlog/design/index.

### Acceptance criteria

- [x] Version/source installed diverifikasi; provider/SSR reuse, tanpa API/dependency baru.
- [x] Contract/query key/initialData/nextpage/guard/cache reset ditulis pada plan dan acceptance HOMEFE-006/009.
- [x] Canonical docs selaras, docs:check/Prettier/diff check dan task commit lulus.

### Validasi

Source installed @tanstack/react-query 5.104.0; docs:check, changed Markdown Prettier check, git diff --check dan hook.

### Hasil dan bukti

Refinement planning saja; runtime belum diubah. docs:check lulus (62 Markdown, 593 links/anchors), Prettier write/check dan git diff --check lulus. Hook docs/lint web1/1/check-types3/3/Commitlint lulus; lint/types memakai cache Turbo. Tidak menjalankan test/build runtime untuk perubahan lima Markdown ini.

### Commit task

- Pesan: docs(web): plan local infinite query (HOMEFE-011)
- SHA refinement: `b48d05e2d5f84fc5094704e0f19b5be7010ed212`.
- Hook/checks: docs:check, lint, check-types dan Commitlint lulus tanpa bypass.
- Ledger: Update ini sesudah commit refinement; branch lokal, belum push/PR/merge.

### Blocker atau tindak lanjut

Implementasi tetap menunggu instruksi pengguna; pemicu Load more tidak berubah menjadi automatic scroll.
