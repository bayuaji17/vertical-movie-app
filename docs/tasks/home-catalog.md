# Modul: Homepage dan katalog frontend

## Tujuan modul

Implementasi frontend beranda/katalog yang disetujui pengguna 7 Oktober 2026, memakai dummy JSON lokal sesuai [implementation plan](../plans/home-catalog/implementation-plan.md). Acuan fakta pada [repository context](../plans/home-catalog/repository-context.md), visual pada [design homepage](../design/home-catalog.md). Runtime diotorisasi pengguna 7 Oktober 2026 setelah refinement useInfiniteQuery; pelaksanaan pada worktree terpisah.

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

Plan disetujui pengguna; default CTA View film membuka dialog metadata lokal.

## Task: HOMEFE-001 — Dummy JSON typed dan selector katalog

- Status: Done
- Owner: Codex
- Prioritas: 1
- Referensi: HOME-US-001; PRD-07/08; GR-02; [plan](../plans/home-catalog/implementation-plan.md).
- Diperbarui: 2026-10-07
- Dependensi: Tidak ada; plan disetujui pengguna 7 Oktober 2026.
- Ukuran: Satu hasil review dengan commit terpisah.

### Ruang lingkup

Satu source JSON berisi 18 items + genres/featured, model lokal Zod, import typed dan pure behavior yang dipakai semua komponen.

Affected files: `apps/web/src/data/catalog.json`; `apps/web/src/lib/catalog/{catalog-schema,catalog-data,catalog-selectors}.ts`; `apps/web/tsconfig.json`; `apps/web/test/home-catalog-data.test.ts`.

### Acceptance criteria

- [x] 18 items (enam tiap kind), enam judul awal sesuai mockup, unique id/slug, references valid dan field-kind exclusivity; semua poster local path.
- [x] Sort publishedAt desc/id asc stabil, title/synopsis search trim/case-insensitive, kind+genre AND, slice batch 6 tanpa duplicate/cap overflow.
- [x] Transisi perubahan filter/query/reset mengembalikan halaman pertama berisi enam; pure page selector menghasilkan items/total/nextOffset tanpa fetch/API.
- [x] Tes perilaku mencakup empty/unknown genre/timestamp tie/duration vs episodeCount dan web check-types lulus.

### Validasi

bun test apps/web/test/home-catalog-data.test.ts; bun run check-types --filter=web; format/diff review.

### Hasil dan bukti

bun test apps/web/test/home-catalog-data.test.ts: 5 pass, 0 fail; web check-types lulus. Schema strict, fixture immutable, 18 judul dan selector batch6; reset cache UI ditutup pada HOMEFE-006/009.

### Commit task

- Pesan: `feat(web): dummy json typed dan selector katalog (HOMEFE-001)`.
- SHA: `06bf4f0c8e910efa7f14620567646bc70505158c`.
- Hook/checks: Gate relevan lulus; hook docs/lint/types/Commitlint dijalankan saat commit tanpa bypass.
- Ledger: SHA aktual dicatat pada update dokumentasi task berikutnya setelah commit, tanpa self-referential SHA.

### Blocker atau tindak lanjut

Ikuti dependency dan batas data lokal pada plan; browser acceptance lintas task ditutup pada HOMEFE-009/010.

## Task: HOMEFE-002 — Enam poster source lokal dan fallback

- Status: Done
- Owner: Codex
- Prioritas: 2
- Referensi: HOME-US-001; PRD-07/08; GR-02; [plan](../plans/home-catalog/implementation-plan.md).
- Diperbarui: 2026-10-07
- Dependensi: Tidak ada; plan disetujui pengguna 7 Oktober 2026.
- Ukuran: Satu hasil review dengan commit terpisah.

### Ruang lingkup

Sediakan source standalone untuk enam scene approved; hasil mockup gabungan tetap referensi dan tidak dijadikan background halaman.

Affected files: `apps/web/public/images/catalog/*.png`; `apps/web/public/images/catalog/poster-fallback.svg`; `docs/design/home-catalog.md`.

### Acceptance criteria

- [x] Enam PNG portrait 9:16 mandiri, local paths sesuai JSON, source/proses terdokumentasi dan tanpa remote CDN/API.
- [x] Scene sesuai enam judul awal; imagegen bila belum ada source. Frame output/dimensi diperiksa; resolusi cukup untuk lebar kartu/hero.
- [x] Fallback SVG netral tersedia dan tidak mengandung label/metadata admin; file image mode 100644, ukuran/format wajar.
- [x] Tidak overwrite mockup approved atau source/image unrelated.

### Validasi

Review native image/dimensi/aspect/header; file path/permission checks; docs:check setelah evidence.

### Hasil dan bukti

Enam native PNG 941x1672 dilihat satu per satu; scene sesuai, file lokal plus fallback SVG 900x1600. Ukuran source mendekati9:16 dicatat pada design; frame CSS exact9:16 diuji browser009. Source original dipertahankan; tidak ada runtime remote images.

### Commit task

- Pesan: `feat(web): enam poster source lokal dan fallback (HOMEFE-002)`.
- SHA: `c13c674ec0696d2ef932fbd6e9f21fe497bcc797`.
- Hook/checks: Gate relevan lulus; hook docs/lint/types/Commitlint dijalankan saat commit tanpa bypass.
- Ledger: SHA aktual dicatat pada update dokumentasi task berikutnya setelah commit, tanpa self-referential SHA.

### Blocker atau tindak lanjut

Ikuti dependency dan batas data lokal pada plan; browser acceptance lintas task ditutup pada HOMEFE-009/010.

## Task: HOMEFE-003 — Shell publik, menu mobile dan appearance

- Status: Done
- Owner: Codex
- Prioritas: 3
- Referensi: HOME-US-003; PRD-07/08; GR-02; [plan](../plans/home-catalog/implementation-plan.md).
- Diperbarui: 2026-10-07
- Dependensi: Tidak ada; plan disetujui pengguna 7 Oktober 2026.
- Ukuran: Satu hasil review dengan commit terpisah.

### Ruang lingkup

Header/footer, brand Home/Browse, InputGroup search slot, Sheet mobile dan theme menu publik dari primitives existing.

Affected files: `apps/web/src/components/catalog/public-shell.tsx`; `apps/web/src/components/catalog/appearance-menu.tsx`.

### Acceptance criteria

- [x] Public shell tanpa identity/login/session/API; Home/Browse mempunyai callback/target yang jelas dan SheetTitle aksesibel.
- [x] Appearance memakai useTheme existing dengan Light/Dark/System, tanpa provider/storage key baru atau import admin-shell/theme-menu.
- [x] Satu search aktif pada tiap breakpoint, state lewat props; hidden control tidak focusable; aksi mobile 44 CSS px.
- [x] Semantic landmarks/skip link/focus visible, desktop nav dan mobile drawer konsisten; checks web lulus.

### Validasi

bun run lint --filter=web; bun run check-types --filter=web; review installed Base UI trigger/render; flow browser final pada HOMEFE-009.

### Hasil dan bukti

Public shell memakai Button/Sheet dan appearance radio menu dengan ThemeProvider existing; tidak ada import admin/session. Web lint dan types lulus pada hook HOMEFE-002. Browser focus/nav/theme diuji HOMEFE-009.

### Commit task

- Pesan: `feat(web): shell publik, menu mobile dan appearance (HOMEFE-003)`.
- SHA: `94737b5f3ca03abcc668a7eaa316bad107a28c37`.
- Hook/checks: Gate relevan lulus; hook docs/lint/types/Commitlint dijalankan saat commit tanpa bypass.
- Ledger: SHA aktual dicatat pada update dokumentasi task berikutnya setelah commit, tanpa self-referential SHA.

### Blocker atau tindak lanjut

Ikuti dependency dan batas data lokal pada plan; browser acceptance lintas task ditutup pada HOMEFE-009/010.

## Task: HOMEFE-004 — Featured film responsif

- Status: Done
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

- [x] After the Rain/synopsis/genre/duration diambil dari fixture, thumbnail tidak keluar panel dan frame 9/16 tanpa stretch.
- [x] Desktop text+poster, mobile compact/stack pada 320 px; long labels/safe spacing tidak overlap.
- [x] View film/View details memakai callback detail lokal sesuai usulan plan, tidak mengarahkan/prefetch watch/API.
- [x] Feature muncul hanya default query/kind/genre; controls/labels/focus terbaca di kedua tema.

### Validasi

Fixture/page-selector tests existing; web types/lint; DOM ratio/visual matrix dibuktikan pada HOMEFE-009.

### Hasil dan bukti

FeaturedFilm dan Poster menggunakan satu item fixture, callback detail lokal, frame aspect9/16, reservasi dimensi, eager hero/lazy grid dan fallback sekali. Tests10, root types/lint serta build lulus; DOM ratio difinalisasi HOMEFE-009.

### Commit task

- Pesan: `feat(web): featured film responsif (HOMEFE-004)`.
- SHA: `130465ffc88545ccfa2b6d6d02581bb2c931459b`.
- Hook/checks: Gate relevan lulus; hook docs/lint/types/Commitlint dijalankan saat commit tanpa bypass.
- Ledger: SHA aktual dicatat pada update dokumentasi task berikutnya setelah commit, tanpa self-referential SHA.

### Blocker atau tindak lanjut

Ikuti dependency dan batas data lokal pada plan; browser acceptance lintas task ditutup pada HOMEFE-009/010.

## Task: HOMEFE-005 — Poster card dan grid tiga jenis

- Status: Done
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

- [x] Film/Standalone memakai duration, Series episodeCount; tidak menampilkan worker/editorial/admin metadata.
- [x] Semua frame CSS 9/16 dengan reserved space dan image fallback once; tidak memakai video/player/circle play pada Series.
- [x] Card open action memiliki accessible title, no nested interactive duplication; long title/genre dapat wrap.
- [x] Grid 2/3/4/6 mengikuti width plan; results dapat 0 tanpa crash, Load more menerima props/callback tanpa data fetch.

### Validasi

Unit metadata/fixture tests; web types/lint; fallback/ratio/overflow checks final pada HOMEFE-009.

### Hasil dan bukti

CatalogCard/Grid merender Film, Series dan Standalone, metadata duration/count, wrapping judul dan grid2/3/4/6cols. Callback detail lokal, empty melalui primitive Empty, Load more manual dengan busy guard. Tests10/types/lint/build lulus; browser009 menutup flow/viewport.

### Commit task

- Pesan: `feat(web): poster card dan grid tiga jenis (HOMEFE-005)`.
- SHA: `435cfc486921c883d0b568f3c6cd2b1fba2555de`.
- Hook/checks: Gate relevan lulus; hook docs/lint/types/Commitlint dijalankan saat commit tanpa bypass.
- Ledger: SHA aktual dicatat pada update dokumentasi task berikutnya setelah commit, tanpa self-referential SHA.

### Blocker atau tindak lanjut

Ikuti dependency dan batas data lokal pada plan; browser acceptance lintas task ditutup pada HOMEFE-009/010.

## Task: HOMEFE-006 — Search, filter, urutan dan Load more lokal

- Status: Done
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

- [x] Search synchronous title/synopsis, ToggleGroup single-selection all/movie/series/standalone dengan label Film dan genre All genres.
- [x] useInfiniteQuery: key publik berisi normalized filters/pageSize/schemaVersion, initialPageParam0, nextOffset/getNextPageParam, data.pages; pages6→12→18 tanpa duplikat dan EOF hasNextPage=false.
- [x] First-page initialData pages/pageParams untuk SSR; networkMode always, staleTime Infinity, no automatic refetch/artificial delay/HTTP.
- [x] Load more fetchNextPage cancelRefetch=false diguard hasNextPage/!isFetching; busy state isFetchingNextPage, rapid-click dedup teruji.
- [x] AND filters/latest stable; query/filter/reset cancel dan seed cache exact key tujuan ke halaman pertama, termasuk cache revisit; tidak menyentuh cache admin/auth. Resize/detail/theme tidak reset pages.
- [x] Empty No titles found dan Reset filters bekerja serta fokus search; count announce polite, no fake spinner/error/timer.
- [x] Latest releases berupa label urutan tetap; Home reset dan Browse fokus tidak melahirkan URL/dummy route.

### Validasi

bun test apps/web/test/home-catalog-data.test.ts; web types/lint; interactive flows/network observation pada HOMEFE-009.

### Hasil dan bukti

Tests katalog/query dan tema:10 pass,0fail,63assertions. QueryClient/InfiniteQueryObserver membuktikan6-12-18, concurrent dedup, AbortSignal cancellation, cache revisit reset dan latest filter wins; cache admin tetap utuh. Canonical key, initialData SSR, networkMode always dan filter primitives tersedia; wiring HomePage disimpan pada task008 setelah dialog007.

### Commit task

- Pesan: `feat(web): search, filter, urutan dan load more lokal (HOMEFE-006)`.
- SHA: `0e291c7fa5947236d92b7321c475fc44f1f09295`.
- Hook/checks: Gate relevan lulus; hook docs/lint/types/Commitlint dijalankan saat commit tanpa bypass.
- Ledger: SHA aktual dicatat pada update dokumentasi task berikutnya setelah commit, tanpa self-referential SHA.

### Blocker atau tindak lanjut

Ikuti dependency dan batas data lokal pada plan; browser acceptance lintas task ditutup pada HOMEFE-009/010.

## Task: HOMEFE-007 — Dialog detail metadata dummy

- Status: Done
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

- [x] Poster/title/synopsis/genres/duration atau episodeCount item terpilih tepat untuk ketiga kind.
- [x] DialogTitle/Description, close/Escape, focus trap/return ke trigger dan batas viewport tersedia.
- [x] Klik tidak memakai fetch/Eden/API/route watch, tidak menjanjikan playback aktif atau episode API.
- [x] Query/filter/loadedcount tetap setelah dialog close; long content scroll dalam modal.

### Validasi

Web types/lint; keyboard/focus/network/long content browser proof pada HOMEFE-009. Bila CTA decision berubah, refine sebelum coding.

### Hasil dan bukti

Dialog lokal memakai primitive Dialog, Title/Description, close44px, Escape/focus return dan max-height85svh dengan internal scroll. Film/Series/Standalone memakai metadata fixture; tidak ada router watch/API. Browser matrix12 ukuran-tema serta long-title dialog sudah melewati assertion bounds/focus pada development; proof lengkap009 masih berjalan.

### Commit task

- Pesan: `feat(web): dialog detail metadata dummy (HOMEFE-007)`.
- SHA: `bdb8b34f1e50dfb3863d0f73260166bb2179c32f`.
- Hook/checks: Gate relevan lulus; hook docs/lint/types/Commitlint dijalankan saat commit tanpa bypass.
- Ledger: SHA aktual dicatat pada update dokumentasi task berikutnya setelah commit, tanpa self-referential SHA.

### Blocker atau tindak lanjut

Ikuti dependency dan batas data lokal pada plan; browser acceptance lintas task ditutup pada HOMEFE-009/010.

## Task: HOMEFE-008 — Integrasi route home, metadata dan responsive polish

- Status: Done
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

- [x] GET/route / menampilkan catalog dan metadata brand; starter button/Mux video demo tidak dimuat.
- [x] Tidak menambah route; root/provider/watch/admin/api unchanged, source data tunggal dan prop boundaries jelas.
- [x] Light faithful hierarchy/mockup; dark/system memakai semantic palette existing, min-width/gutters/touch/focus/reduced-motion ditinjau.
- [x] Batch awal 6 pada SSR/hydration/semua width; search/filter/feature/dialog/menu saling konsisten dan tidak reload state saat resize.

### Validasi

Bun test selectors/theme; bun run check-types --filter=web; bun run lint --filter=web; bun run build --filter=web; visual debug sebelum HOMEFE-009.

### Hasil dan bukti

Route / mengganti starter/Mux dengan HomePage. Metadata public,18fixtures/useInfiniteQuery/manualLoadMore, featured conditional, state filter/selection, Home reset/Browse focus terhubung. Development browser matrix12 lulus: SSR6,pages6-12-18,zero API/auth/playback/external requests,zero hydrationerrors,theme/nav/dialog/ratio/targets/empty/cache revisit/long title/resize/fallback. Polish: menu tema closeOnClick, search sebelumappearance desktop, image failure sebelumhydration ditangani melalui image.complete. Root build lulus; watch/admin/API source tidak berubah.

### Commit task

- Pesan: `feat(web): integrasi route home, metadata dan responsive polish (HOMEFE-008)`.
- SHA: `0d379a4766ab06adda17247c88ef32f1ab3c7054`.
- Hook/checks: Gate relevan lulus; hook docs/lint/types/Commitlint dijalankan saat commit tanpa bypass.
- Ledger: SHA aktual dicatat pada update dokumentasi task berikutnya setelah commit, tanpa self-referential SHA.

### Blocker atau tindak lanjut

Ikuti dependency dan batas data lokal pada plan; browser acceptance lintas task ditutup pada HOMEFE-009/010.

## Task: HOMEFE-009 — Proof browser, SSR dan independensi API

- Status: Done
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

- [x] API unreachable/block semua API paths/origin; zero attempted catalog/auth/playback requests, termasuk prefetch/interaction; SSR tetap mengirim konten.
- [x] Viewport 320/390/768/1024/1440/1920 light+dark tanpa horizontal overflow; poster frame 9/16 dengan toleransi 1 CSS px, semua UI berada dalam viewport.
- [x] Search/title/synopsis/AND/empty/reset/infinite query load6→12→18/cache revisit reset6/rapid-click/Home/Browse/detail tiga kind/keyboard/Escape-focus return/drawer/resize/theme persist lulus.
- [x] Long title/failed poster fallback once, no page/hydration error; screenshot implemented light desktop/mobile+dark dan command/result/limitations nyata tersimpan.

### Validasi

Jalankan host Playwright worker dengan baseURL/module/executable/screenshot prefix aktual, SSR HTTP proof pada built web API down; record network events/DOM assertions.

### Hasil dan bukti

Development3147 dan built Bun/Nitro3148 browser worker lulus; API_INTERNAL_URL diarahkan ke127.0.0.1:59999 yang unreachable. Masing-masing matrix12 (320/390/768/1024/1440/1920 Light/Dark), SSR6, pages6-12-18, zero API/auth/playback/externalrequests, zero console/hydrationerrors. Filter/cache/rapidclick/keyboard/focus trap/focusreturn/mobileBrowse/themepersistence/System/resize/longtitle/empty/imagefallback lulus. Source failures2,fallback1,tidakloop. Delapan screenshotdilihat, enamfoto terload sebelumcapture. Exact invocation dan batas Chromium dicatat di bawah.

### Browser invocation dan hasil final — HOMEFE-009

Server dijalankan dari root worktree Debian dengan Bun 1.4.2:

```sh
API_INTERNAL_URL=http://127.0.0.1:59999 PORT=3147 HOST=0.0.0.0 bun run --cwd apps/web dev
bun run build
API_INTERNAL_URL=http://127.0.0.1:59999 PORT=3148 HOST=0.0.0.0 bun run --cwd apps/web start
```

Port 59999 tidak mempunyai listener; SSR development dan built GET / berhasil 200 dan mempunyai enam data-catalog-card. Source route publik tidak mengimpor API/session/player. Browser context juga menolak dan mencatat setiap attempted /api/auth/playback/external-origin request, bukan hanya menerima failed request.

Invocation aktual pada host Windows, ulang untuk port3148 dan prefix tanpa -dev:

```powershell
node '\\wsl.localhost\Debian\home\bandev\.codex\worktrees\home-catalog-mockup\vertical-movie-app\apps\web\test\home-catalog-browser-worker.mjs' 'http://localhost:3147' 'file:///C:/Users/bayua/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs' 'C:\Users\bayua\AppData\Local\ms-playwright\chromium-1228\chrome-win64\chrome.exe' '\\wsl.localhost\Debian\home\bandev\.codex\worktrees\home-catalog-mockup\vertical-movie-app\docs\design\home-catalog-implemented-dev'
```

Hasil masing-masing: result passed, matrix12, SSR6, pages[6,12,18], forbiddenRequests0, console/hydrationErrors0, fallback sourceAttempts2/fallbackAttempts1. Matrix Light/Dark: 320×800,390×844,768×1024,1024×900,1440×1000,1920×1080. DOM tidak overflow, poster deviation dari9:16 <1CSSpx, grid2/3/4/6 kolom, target44px. System dan persisted theme/reload diuji pada390/1440.

Flow lolos: exact metadata Film/Series/Standalone, long Unicode title, dialog safe bounds/Escape/focus trap/focus return, mobile Sheet Browse menutup dan fokus katalog, Home reset, genre+kind AND, title/synopsis/case/whitespace search, empty+reset/search focus, rapid same-loop Load more dedup, cache revisit reset6, resize tetap18, keyboard input/ArrowRight+Space/NativeSelect/Enter/appearance radio dan Load more. Image source serta fallback sengaja dibatalkan: satu perpindahan fallback tanpa retry loop, termasuk error sebelum hidrasi.

Fix browser: closeOnClick radio menu (default Base UI false), dan image.complete/naturalWidth saat mount untuk error SSR sebelum onError terpasang. Trap assertion menunggu focus-guard redirect sebelum membaca activeElement. Tidak melemahkan assertion ke force-click.

Delapan screenshot disimpan dengan prefix home-catalog-implemented dan home-catalog-implemented-dev; Light/Dark desktop1440/mobile390. Capture menunggu semua lazy images dan font siap; ring pada kartu pertama adalah fokus keyboard yang dipertahankan setelah dialog. Keempat screenshot built telah dilihat satu per satu, layout/copy/foto sesuai arah approved. Development memiliki launcher devtools existing; build menghapusnya melalui plugin existing.

Batas bukti: Chromium lokal, JSON fiktif. Tidak mengklaim integrasi katalog API, real published data, playback dari kartu, Safari/perangkat fisik atau deployment.

### Commit task

- Pesan: `feat(web): proof browser, ssr dan independensi api (HOMEFE-009)`.
- SHA: `f03030e3a009a2ad41c659d509640fc434f4f513`.
- Hook/checks: Gate relevan lulus; hook docs/lint/types/Commitlint dijalankan saat commit tanpa bypass.
- Ledger: SHA aktual dicatat pada update dokumentasi task berikutnya setelah commit, tanpa self-referential SHA.

### Blocker atau tindak lanjut

Ikuti dependency dan batas data lokal pada plan; browser acceptance lintas task ditutup pada HOMEFE-009/010.

## Task: HOMEFE-010 — Quality gates, dokumentasi dan closure

- Status: Done
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

- [x] Relevant selector/theme tests, root check-types/lint/build, docs:check/Prettier/diff check lulus dengan command/results dicatat.
- [x] Design/PRD/global/index menyatakan implemented+verified lokal dummy JSON, bukan integrasi API/playback/published nyata/production ready.
- [x] Task commits memiliki ID dan SHA ledger; changes limited to approved path, generated cache/secrets/unrelated work preserved.
- [x] Worktree ready untuk review; push/PR/merge/deploy belum dilakukan tanpa otorisasi sendiri.

### Validasi

bun test apps/web/test/home-catalog-data.test.ts apps/web/test/admin-theme.test.ts; bun run check-types; bun run lint; bun run build; bun run docs:check; Prettier changedfiles; git diff --check; hooks.

### Hasil dan bukti

Final gates:10 tests/63assertions pass; root check-types3packages pass (web fresh,API/auth cached unchanged); lintweb fresh pass; buildAPI/web pass (webfresh,APIcached); docs:check62files593links pass. Browser development+build matrix12 each pass. Scoped diff API/auth/admin/watch/routeTree/manifests/lock kosong. Canonical PRD/globalrules/design/index/plan diperbarui; real API/production limits tetap jelas. Prettier seluruh file berubah lulus, docs:check final62Markdown/599links lulus, git diff/check staged lulus. Hook docs/lint/types/Commitlint lulus tanpa bypass; cache digunakan setelah gate fresh sebelumnya.

### Commit task

- Pesan: `docs(web): quality gates, dokumentasi dan closure (HOMEFE-010)`.
- SHA: `393b1b11e186d4a23e5f87c2208fed492341ef1f`.
- Hook/checks: Gate relevan lulus; hook docs/lint/types/Commitlint dijalankan saat commit tanpa bypass.
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

### Ledger penutup HOMEFE-010 — 7 Oktober 2026

Commit closure aktual393b1b11e186d4a23e5f87c2208fed492341ef1f. Seluruh HOMEFE-001–010 Done dan mempunyai commit task terpisah; ledger commit ini mencatat SHA yang sudah ada. Worktree clean sesudah closure, source API/auth/admin/watch/routeTree/manifests/lock tidak berubah. Perubahan paralel design-system/build docs di checkout utama tetap terpisah. Built proof server3148 dihentikan; development3147 dipertahankan untuk preview, API internal tetap unreachable. Tidak ada push/PR/merge/deployment.

## Task: HOMEFE-012 — Skeleton halaman berikutnya

- Status: Done
- Owner: Codex
- Prioritas: Refinement FE setelah HOMEFE-010
- Referensi: HOME-US-002; permintaan pengguna menambahkan skeleton setelah klik Load more.
- Diperbarui: 2026-10-07
- Dependensi: HOMEFE-006/008 selesai.
- Ukuran: Satu perubahan UI lokal.

### Ruang lingkup

CatalogGrid menambahkan placeholder poster9:16, judul dan metadata di akhir grid selama busy dari isFetchingNextPage. Memakai Skeleton existing dan catalogPageSize shared; kartu lama dipertahankan. Jumlah placeholder maksimal6, dibatasi total minus items.length; tidak ditampilkan setelah EOF. Grid aria-busy dan live status loading, placeholder dekoratif aria-hidden dan animasi menghormati reduced-motion. Tidak menambahkan delay/API atau state pagination terpisah.

### Acceptance criteria

- [x] Klik Load more saat query pending mempertahankan6 kartu awal dan menambahkan6 skeleton dalam grid responsif.
- [x] Tombol loading disabled; skeleton hilang ketika12 hasil tersedia dan tidak tersisa setelah18/EOF.
- [x] Frame placeholder9:16, viewport320/1440 tidak overflow, reduced-motion tidak animate.
- [x] Tests existing, types/lint/build, docs/format/diff gates lulus.

### Validasi

Bun1.4.2: bun test apps/web/test/home-catalog-data.test.ts apps/web/test/admin-theme.test.ts; bun run check-types; bun run lint; bun run build. Browser proof sementara di luar repo: node //wsl.localhost/Debian/home/bandev/.codex/home-skeleton-proof.mjs memakai Playwright/Chromium host existing pada http://localhost:3147. Pending Promise hanya disisipkan pada query observer dalam browser proof untuk menahan query sampai release; source queryFn tetap lokal tanpa delay.

### Hasil dan bukti

Browser result passed: retainedCards6, skeletons6, viewports[320,1440], reducedMotion true, pages[6,12,18], errors0. aria-busy true→false, loading button disabled, skeleton count6→0 dan EOF button absent. Existing10 tests/63assertions lulus; root types3packages lulus (webfresh/APIauthcachedunchanged); available lint/build lulus. Tidak menambah test framework/dependency, tidak mengubah QueryClient/fixture/API. JSON lokal dapat resolve sebelum frame skeleton terlihat; tidak memaksakan durasi loading.

### Commit task

- Pesan: feat(web): show skeletons while loading more titles (HOMEFE-012)
- SHA: df5273756ab69bbe3d80750f9711bd87e3351ed2.
- Hook/checks: docs/lint/types/Commitlint tanpa bypass.
- Ledger: Dicatat setelah commit task berhasil; docs:check62files/601links, Prettier dan diffcheck lulus. Worktree terpisah, belum push/PR/merge.

### Blocker atau tindak lanjut

Tidak ada untuk scope ini; integrasi API tetap tahap terpisah.
