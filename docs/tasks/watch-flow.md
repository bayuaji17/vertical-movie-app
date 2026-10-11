# Modul: Alur detail dan tonton publik

> Status: **WFLOW-001–002 Done**; WFLOW-003–009 Backlog · 10 Oktober 2026 · Pengguna menyetujui URL bersih tanpa `?type=` dan navigasi `/videos/:slug` → `/watch/:slug`, serta meminta UI/UX lebih baik di desktop dan mobile. Plan: [implementation-plan](../plans/watch-flow/implementation-plan.md), context: [repository-context](../plans/watch-flow/repository-context.md). Base SHA `f1b1d184fe6d410d976495c65bbeef75ad85cc83`.

## Tujuan modul

Detail dan tonton publik memakai URL bersih, layout responsif untuk video tunggal dan Series, serta navigasi antar-episode dari halaman watch. Referensi: PRD-07/08, GR-02/08, [PCW](public-content-watch.md), [NF](not-found.md).

## User story: WFLOW-US-01

Sebagai pengunjung, saya ingin URL detail dan tonton yang bersih dan tombol kembali yang masuk akal, sehingga tautan mudah dibagikan dan navigasi konsisten.

## User story: WFLOW-US-02

Sebagai pengunjung di desktop atau ponsel, saya ingin halaman detail dan tonton yang nyaman, sehingga saya langsung melihat player dan informasi penting tanpa banyak scroll.

## User story: WFLOW-US-03

Sebagai penonton Series, saya ingin memilih season dan berpindah episode dari halaman tonton, sehingga saya tidak perlu kembali ke halaman Series.

## User story: WFLOW-US-04

Sebagai pengunjung, saya ingin mencari judul dari halaman Browse tanpa menekan tombol, sehingga hasil muncul saat saya selesai mengetik.

## Task: WFLOW-001 — Setujui desain dan keputusan D1–D7

- Status: Done
- Owner: Pengguna (keputusan) / agent (spesifikasi)
- Prioritas: 1
- Referensi: WFLOW-US-02/03; plan bagian Keputusan dan usulan
- Diperbarui: 2026-10-11
- Dependensi: tidak ada
- Ukuran: sedang

### Ruang lingkup

Tulis [watch-flow](../design/watch-flow.md) (layout, state, breakpoint, copy) dan [preview HTML interaktif](../design/watch-flow-preview.html) untuk Browse + search, detail Film/Standalone, detail Series dan watch (desktop/mobile/tablet, Light/Dark); catat keputusan D1–D7 dan pemberi persetujuan; perbarui `docs/README.md`. Search memakai debounce saja (permintaan pengguna 10 Oktober 2026).

### Acceptance criteria

- [x] Spesifikasi dan preview ditulis, termasuk state Browse + search (debounce 300 ms tanpa submit).
- [x] D1–D7 dicatat beserta pemberi persetujuan dan tanggal (pengguna, 11 Oktober 2026).
- [x] Preview Browse, detail dan watch disetujui pengguna (11 Oktober 2026). Persetujuan atas preview HTML, bukan PNG 390/1440 (PNG tidak dibuat).

### Validasi

`bun run docs:check`, Prettier, `git diff --check`.

### Hasil dan bukti

10 Oktober 2026: `docs/design/watch-flow.md` dan `docs/design/watch-flow-preview.html` dibuat. Preview memakai token `apps/web/src/styles.css`, container query per viewport dan debounce 300 ms nyata terhadap fixture. Render smoke dengan stub DOM: 138 kombinasi viewport/tema/layar/state tanpa error; tampilan visual belum dilihat di browser oleh agent dan PNG belum dibuat (tidak ada browser di lingkungan). Pengguna menyetujui 11 Oktober 2026 dengan "oke setuju" setelah melihat preview di panel aplikasi (versi statis tanpa skrip, commit `2a016c4`); D1–D7 diterima sebagaimana direkomendasikan, termasuk D6 (Series pada Browse/search, mengubah keputusan 8 Oktober 2026). Demo debounce langsung hanya diverifikasi pengguna bila dibuka di browser; tidak ada catatan hasilnya.

### Commit task

- Pesan: `docs(web): add watch flow design (WFLOW-001)`
- SHA: `b844ae0` (desain) dan `2a016c4` (fallback tanpa skrip), 10 Oktober 2026; catatan persetujuan pada commit berikutnya
- Hook/checks: Husky dan commitlint lulus pada kedua commit
- Ledger: SHA dicatat pada commit persetujuan ini

### Blocker atau tindak lanjut

Tidak ada.

## Task: WFLOW-002 — URL bersih untuk detail dan watch

- Status: Done (lokal; Back via riwayat dan scroll belum dibuktikan di browser)
- Owner: agent
- Prioritas: 2
- Referensi: WFLOW-US-01; plan bagian URL dan navigasi
- Diperbarui: 2026-10-10
- Dependensi: tidak ada (dapat mendahului WFLOW-001)
- Ukuran: sedang

### Ruang lingkup

Hapus `validateSearch`/`normalizeCatalogLocation` dari `/videos/$slug` dan `/watch/$slug`; hapus `type` dari tautan dan `PublicShell` pada rute tersebut; redirect legacy `?type=` ke URL bersih; tombol Back memakai riwayat router dengan fallback `/`; filter `type` tetap di `/` dan dihilangkan dari URL bila `all`. Perbarui test dan worker yang merujuk `type`.

### Acceptance criteria

- [x] Tidak ada tautan internal ke `/videos/:slug` atau `/watch/:slug` yang membawa query.
- [x] `/videos/x?type=all|film|standalone` dan nilai tidak valid dialihkan sekali ke `/videos/x`; hal sama untuk `/watch/x`.
- [x] Slug tak ada tetap menghasilkan halaman 404 dengan status 404.
- [x] Back dari detail kembali ke `/` dengan filter semula bila datang dari homepage; buka langsung → `/`.
- [x] `bun test`, `check-types`, `lint`, `build` lulus.

### Validasi

Test unit navigasi/redirect; `curl -I` ke URL legacy; pemeriksaan browser dev.

### Hasil dan bukti

Diimplementasikan 10 Oktober 2026 pada `feat/watch-flow-redesign` (base `f1b1d18`).

- `/videos/$slug` dan `/watch/$slug` tanpa `validateSearch`; `beforeLoad: stripLegacyTypeSearch` mengalihkan (307, replace) query `type` apa pun ke URL bersih. Semua tautan ke dua rute itu tanpa `search`; `PublicShell` di detail/watch tidak membawa `type`.
- Home `/`: `catalogSearch`/`browseSearch` hanya menyimpan `film`/`standalone`; `?type=all` dan nilai tidak valid dialihkan ke `/` (`normalizeBrowseLocation`). Query key dan `usePublicCatalog` tidak berubah.
- Back: kartu grid menautkan `/videos/$slug` dengan history state `fromBrowse`; `useBrowseBack` memanggil `history.back()` hanya bila entri itu dibuka dari grid dan ada riwayat, selain itu tautan biasa ke `/`. Dari watch, "Back to browse" ke `/` (filter All).
- Test baru `apps/web/test/public-navigation.test.ts` (redirect legacy, home, `browseSearch`, state); `public-video-client.test.ts` dan `public-film-catalog-browser-worker.mjs` diperbarui. PRD baris 15 diperbarui.

Command aktual: `bun test apps/web/test/public-*.test.ts*` → 23 pass/0 fail; `bun run check-types` → 3/3 sukses; `bun run lint` → sukses; `bun run build` → sukses; `bun run docs:check`, Prettier dan `git diff --check` (lihat commit task). `curl` ke dev server localhost:3000: `/videos/test-film-1?type=all`, `/watch/test-film-1?type=film`, `/?type=all` dan `/?type=wrong` → 307 ke URL bersih; `/?type=film` dan `/videos/test-film-1` → 200; slug tak ada dengan `?type=` → 404 pada URL bersih.

Belum terbukti: perilaku Back via riwayat, pemulihan filter/scroll dan alur offline di browser (worker `public-film-catalog-browser-worker.mjs` diperbarui tetapi tidak dijalankan: perlu Playwright, PostgreSQL, MinIO dan FFmpeg). Watch → "Back to browse" kehilangan filter (kembali ke `/`), diterima sebagai batas.

### Commit task

- Pesan: `feat(web): remove type search from video and watch URLs (WFLOW-002)`
- SHA: `b401c47` (10 Oktober 2026)
- Hook/checks: Husky (docs:check, lint, check-types) dan commitlint lulus
- Ledger: SHA dicatat pada commit WFLOW-001

### Blocker atau tindak lanjut

Tidak ada.

## Task: WFLOW-003 — Detail Film/Standalone responsif

- Status: Review (diimplementasikan lokal; layout belum dilihat di browser)
- Owner: agent
- Prioritas: 3
- Referensi: WFLOW-US-02; desain WFLOW-001
- Diperbarui: 2026-10-11
- Dependensi: WFLOW-001, WFLOW-002
- Ukuran: sedang

### Ruang lingkup

Satu komponen detail untuk Film/Standalone di `/videos/:slug`; `/titles/$kind/$slug` dialihkan (D2); `catalog-detail-dialog` menautkan ke `/videos/:slug` (`featured-film` sudah menautkan ke `/watch/:slug` dan membuka dialog untuk detail); genre, durasi, sinopsis ter-clamp, CTA lebar penuh di mobile.

### Acceptance criteria

- [ ] Layout sesuai desain di 320/390/768/1024/1440 px tanpa overflow (belum dilihat di browser).
- [ ] State loading/offline/stale/error/404 berfungsi seperti sebelumnya (404 diverifikasi lewat curl; sisanya mempertahankan logika lama, belum dilihat di browser).
- [x] `/titles/movie|standalone/:slug` mengalihkan ke `/videos/:slug`; kind/slug tidak valid tetap 404.

### Validasi

Test komponen dan browser.

### Hasil dan bukti

Diimplementasikan 11 Oktober 2026 pada `feat/watch-flow-redesign`.

- `VideoDetail` ditulis ulang mengikuti [desain](../design/watch-flow.md#detail-filmstandalone-videosslug): mobile poster 132 px di samping badge/durasi/judul/genre, sinopsis 4 baris dengan "Read more" (hanya bila benar-benar terpotong, diukur dengan `ResizeObserver` pada hook `use-text-clamp.ts`), CTA "Watch now" lebar penuh menempel di bawah dengan safe-area; ≥640 px poster 220 px dan CTA inline; ≥1024 px poster 360 px kiri, kolom kanan h1 48 px, sinopsis penuh dan CTA. Satu grid dengan `lg:contents`; skeleton memakai dimensi yang sama. Poster tetap `PublicPoster` (signed, antrean/retry yang ada).
- Genre: `loadVideoDetail` memuat `/videos/:slug` lalu detail katalog (`/catalog/details/:kind/:slug`) sebagai tambahan non-fatal; komponen hanya membaca cache (`enabled: false`) sehingga tidak ada request baru dan genre tampil pada SSR. Kegagalan genre tidak mengubah status halaman.
- `/titles/$kind/$slug` kini hanya `beforeLoad`: kind selain movie/standalone atau slug tidak valid → `notFound()`, selainnya redirect `replace` ke `/videos/:slug` (slug tak ada tetap 404 di rute tujuan).
- Test baru `apps/web/test/public-video-detail-loader.test.ts` (cache video+genre, genre gagal tidak menggagalkan halaman, video gagal tidak meminta genre).
- Command aktual: `bun test apps/web/test/public-*.test.ts*` → 28 pass/0 fail; `bun run check-types` 3/3 sukses; `bun run lint` sukses; `bun run build` sukses. Dev server lokal (API 3001, web 3000): `/titles/movie|standalone/test-film-1` → 307 ke `/videos/test-film-1` lalu 200; `/titles/series/x` dan `/titles/movie/Bad_Slug` → 404; `/videos/no-such-zz` dan `/titles/movie/no-such-zz` → 404 pada `/videos/no-such-zz`; `/videos/test-film-1?type=all` → 200 pada URL bersih; HTML berisi h1, badge Film, "1 min", CTA ke `/watch/test-film-1`, tanpa signed URL.
- Catatan dev: request pertama setelah Vite dimulai atau dimuat ulang sempat 500/503 selama kompilasi dingin (dan saat lint/tsc berjalan bersamaan); setelah hangat semua 200 stabil. Bukan perilaku production.

Belum terbukti: tata letak 320/390/768/1024/1440 px, "Read more", CTA sticky, state offline/stale/error di browser; tampilan genre dengan data nyata (film dev tidak punya genre; hanya diuji unit); build produksi lulus (`bun run build`, 2/2 task).

### Commit task

- Pesan: `feat(web): redesign film and standalone detail (WFLOW-003)`
- SHA: belum dibuat
- Hook/checks: dijalankan saat commit
- Ledger: dicatat pada update dokumentasi berikutnya

### Blocker atau tindak lanjut

Tidak ada.

## Task: WFLOW-004 — Detail Series dengan season selector dan CTA

- Status: Review (diimplementasikan lokal; belum dilihat di browser dan belum dicoba dengan data Series nyata)
- Owner: agent
- Prioritas: 4
- Referensi: WFLOW-US-02/03; desain WFLOW-001
- Diperbarui: 2026-10-11
- Dependensi: WFLOW-001, WFLOW-002
- Ukuran: sedang

### Ruang lingkup

Ringkasan season/episode, CTA "Play S1 E1", pemilih season (tabs/select), baris episode baru, pagination/retry dipertahankan. Gunakan pola header yang sama dengan WFLOW-003.

### Acceptance criteria

- [x] CTA mengarah ke episode pertama yang tersedia; tidak tampil bila belum ada episode (logika `sortedEpisodes`/`first` diuji unit; render belum dilihat).
- [ ] Pindah season hanya menampilkan episode season tersebut dan dapat dioperasikan keyboard (pemilih season memakai ToggleGroup/NativeSelect; belum dicoba di browser).
- [ ] Load more/retry/invalid-cursor tetap berfungsi; baris tautan ≥44 px (logika dipindahkan dari `EpisodeList` tanpa perubahan perilaku; belum dicoba di browser).

### Validasi

Test komponen; browser dengan Series ≥2 season.

### Hasil dan bukti

Diimplementasikan 11 Oktober 2026 pada `feat/watch-flow-redesign`.

- `SeriesDetail` (`components/public/series-detail.tsx`) menggantikan `ContentPage`/`EpisodeList`/`ContentShell` pada `/series/:slug` dan memakai `PublicShell` yang sama dengan Film/Standalone. Pola header, sinopsis ter-clamp dan CTA sticky diekstrak ke `components/public/detail-layout.tsx` dan dipakai juga oleh `VideoDetail`. Header menampilkan badge Series, ringkasan ("2 seasons · 6 episodes" hanya bila semua halaman episode sudah dimuat, selain itu "N episodes"), genre, sinopsis dan CTA "Play S1 E1" ke episode pertama. Pemilih season tampil bila ≥2 season: ToggleGroup untuk ≤4, `NativeSelect` untuk >4; hanya episode season terpilih yang tampil; pilihan kembali ke season pertama bila season hilang. Baris episode: nomor "E1", judul, sinopsis 2 baris, durasi, seluruh baris tautan ke `/watch/:slug` (≥44 px) dengan label sr-only "Season N, episode M". Load more, retry, cursor tidak valid, skeleton, paused dan kosong dipertahankan dari implementasi sebelumnya.
- `lib/catalog/season-model.ts` (urutan/dedup episode, daftar season, season aktif, ringkasan) dengan test `public-season-model.test.ts`. Halaman episode dinaikkan dari 20 ke 100 (maksimum API) agar season yang umum lengkap dalam satu permintaan; `content-client.test.ts` diperbarui. API tidak diubah dan tidak menyediakan jumlah season, jadi daftar season berasal dari episode yang sudah dimuat.
- `components/catalog/content-page.tsx` kini hanya berisi `ContentFailure`/`ContentLoading` (dipakai halaman watch). Kartu Series pada Browse membawa state `fromBrowse` sehingga Back memulihkan filter/pencarian.
- Penyimpangan dari desain: pemilih season memakai ToggleGroup (tombol pressed), bukan `role="tablist"`.
- Command aktual: `bun test apps/web/test/public-*.test.ts* apps/web/test/content-client.test.ts` → 37 pass/0 fail; `bun run check-types` 3/3 sukses; `bun run lint` sukses; `bun run build` sukses. Dev server lokal: `/series/no-such-zz` → 404; `/videos/test-film-1` tetap 200 setelah ekstraksi layout; `GET /api/catalog?kind=series` kosong.

Belum terbukti: render Series nyata (database dev tidak memiliki Series; belum ada fixture), tata letak 320–1440 px, pemilih season, Load more/retry dengan data nyata, dan CTA di browser. Satu-satunya pemeriksaan halaman adalah status 404.

### Commit task

- Pesan: `feat(web): redesign series detail with season selector (WFLOW-004)`
- SHA: belum dibuat
- Hook/checks: dijalankan saat commit
- Ledger: dicatat pada update dokumentasi berikutnya

### Blocker atau tindak lanjut

Tidak ada.

## Task: WFLOW-005 — Layout watch desktop dan mobile

- Status: Backlog
- Owner: agent
- Prioritas: 5
- Referensi: WFLOW-US-02; skill `videojs`; desain WFLOW-001
- Diperbarui: 2026-10-10
- Dependensi: WFLOW-001, WFLOW-002
- Ukuran: sedang

### Ruang lingkup

Top bar ramping, player dengan tinggi dibatasi viewport (`svh`), rail info desktop, urutan mobile player-first, skeleton berdimensi tetap, fokus ke `h1`. Perilaku `VerticalVideoPlayer` tidak berubah.

### Acceptance criteria

- [ ] Player 9:16 tanpa crop/stretch dan kontrolnya terlihat tanpa scroll pada 390×844 dan 1440×900.
- [ ] Tidak ada layout shift berarti saat metadata dimuat; tidak ada overflow 320–1920 px.
- [ ] Renewal, Retry playback dan offline tetap berfungsi (test player existing lulus).

### Validasi

Test komponen; browser dev/build; test player existing.

### Hasil dan bukti

Belum ada.

### Commit task

- Pesan: `feat(web): redesign watch layout (WFLOW-005)`
- SHA: belum dibuat
- Hook/checks: belum dijalankan
- Ledger: dicatat pada update dokumentasi berikutnya

### Blocker atau tindak lanjut

Tidak ada.

## Task: WFLOW-006 — Panel episode, Previous/Next dan Up next

- Status: Backlog
- Owner: agent
- Prioritas: 6
- Referensi: WFLOW-US-03
- Diperbarui: 2026-10-10
- Dependensi: WFLOW-005
- Ukuran: sedang

### Ruang lingkup

Panel episode pada watch (season selector, episode aktif, load more), tombol Previous/Next, kartu Up next di akhir episode (tanpa autoplay), pemulihan error/offline. Tangani episode aktif di luar halaman pertama (lihat Impact analysis).

### Acceptance criteria

- [ ] Episode aktif ditandai `aria-current` dan terlihat di daftar.
- [ ] Previous/Next berfungsi lintas season; disabled/hilang di batas dengan teks yang jelas.
- [ ] Pindah episode tidak me-reload halaman penuh dan memindahkan fokus ke judul.
- [ ] Tidak ada autoplay; Up next hanya tombol.

### Validasi

Test komponen dengan klien palsu; browser dengan Series ≥2 season dan >20 episode bila tersedia.

### Hasil dan bukti

Belum ada.

### Commit task

- Pesan: `feat(web): add episode panel and navigation to watch (WFLOW-006)`
- SHA: belum dibuat
- Hook/checks: belum dijalankan
- Ledger: dicatat pada update dokumentasi berikutnya

### Blocker atau tindak lanjut

Bila halaman episode tidak cukup menentukan Previous, ajukan endpoint API sebagai keputusan terpisah.

## Task: WFLOW-007 — Test dan aksesibilitas

- Status: Backlog
- Owner: agent
- Prioritas: 7
- Referensi: PRD-07/08
- Diperbarui: 2026-10-10
- Dependensi: WFLOW-003, WFLOW-004, WFLOW-006
- Ukuran: kecil

### Ruang lingkup

Lengkapi test unit/komponen, landmark dan label, urutan fokus, target 44 px, reduced-motion, kontras Light/Dark.

### Acceptance criteria

- [ ] Test perilaku baru lulus dan berada di samping modulnya.
- [ ] Tidak ada pelanggaran a11y yang diketahui pada tiga halaman (landmark, `h1` tunggal, label tombol, fokus terlihat).

### Validasi

`bun test` (web), `bun run check-types`, `bun run lint`.

### Hasil dan bukti

Belum ada.

### Commit task

- Pesan: `test(web): cover watch flow behavior (WFLOW-007)`
- SHA: belum dibuat
- Hook/checks: belum dijalankan
- Ledger: dicatat pada update dokumentasi berikutnya

### Blocker atau tindak lanjut

Tidak ada.

## Task: WFLOW-008 — Bukti browser, dokumentasi dan penutupan

- Status: Backlog
- Owner: agent
- Prioritas: 8
- Referensi: plan bagian Test and verification strategy
- Diperbarui: 2026-10-10
- Dependensi: WFLOW-007, WFLOW-009
- Ukuran: kecil

### Ruang lingkup

Bukti browser dev/build, perbarui `docs/README.md`, PRD dan arsitektur (rute aktif), catat hasil dan batas.

### Acceptance criteria

- [ ] Matriks 320/390/768/1024/1440 px, Light/Dark/System, keyboard dan reduced-motion tercatat dengan hasil aktual.
- [ ] `bun run check-types`, `lint`, `build`, `docs:check`, Prettier dan `git diff --check` lulus dan dicatat.
- [ ] Batas yang tidak terbukti (perangkat fisik, Safari, production) dicatat.

### Validasi

Lihat acceptance criteria.

### Hasil dan bukti

Belum ada.

### Commit task

- Pesan: `docs(web): close watch flow (WFLOW-008)`
- SHA: belum dibuat
- Hook/checks: belum dijalankan
- Ledger: dicatat pada update dokumentasi berikutnya

### Blocker atau tindak lanjut

Tidak ada.

## Task: WFLOW-009 — Search Browse dengan debounce

- Status: Review (diimplementasikan lokal; perilaku interaktif belum dibuktikan di browser)
- Owner: agent
- Prioritas: 9
- Referensi: WFLOW-US-04; [desain](../design/watch-flow.md#browse-dan-search); API `GET /catalog` (`search`, `kind`, cursor)
- Diperbarui: 2026-10-11
- Dependensi: WFLOW-001, WFLOW-002
- Ukuran: sedang

### Ruang lingkup

Input search pada Browse (`/`) tanpa tombol submit: debounce 300 ms, tahan selama komposisi IME, trim, maksimum 200 karakter, `q` di URL (`replace`), request dibatalkan saat query berubah, status `aria-live`, Clear/Escape, state empty/error/offline. Memakai `GET /catalog` melalui klien existing `lib/catalog/catalog-client.ts`; cakupan Series mengikuti keputusan D6. Hook debounce berada di `apps/web/src/hooks/use-...`.

### Acceptance criteria

- [ ] Permintaan hanya dikirim 300 ms setelah ketikan terakhir; satu request untuk rangkaian ketikan cepat; request lama dibatalkan.
- [ ] Komposisi IME tidak memicu request sebelum selesai.
- [x] `/?q=…&type=…` dapat dibuka langsung dan dirender SSR dengan input terisi (curl dev server). Back tanpa riwayat ketikan memakai `replace`, belum dibuktikan di browser.
- [ ] Empty, error (Retry search), offline (input nonaktif) dan Clear/Escape berfungsi; fokus tetap di input.
- [x] Filter dan search berkombinasi; cursor Load more tidak bercampur antar query (query key per filter + q; test `public-browse-loader.test.ts`).

### Validasi

Test hook debounce dan klien (timer palsu), test komponen; browser dev/build 390 dan 1440 px.

### Hasil dan bukti

Diimplementasikan 11 Oktober 2026 pada `feat/watch-flow-redesign`.

- Browse (`/`) memakai `GET /catalog` melalui `lib/catalog` (`catalogInfiniteOptions`, 20 per halaman) dan poster privat `/api/catalog/:kind/:id/poster`; filter All/Films/Standalone/Series dan `q` berada di URL (`/?type=series&q=night`, `all` dan `q` kosong tidak ditulis; `?q=` tidak kanonik dialihkan). Loader `loadBrowseCatalog` meniru pola status SSR sebelumnya.
- `useBrowseSearch` (`hooks/use-browse-search.ts`): draft lokal, debounce 300 ms memakai `createCatalogDebounce` yang sudah ada, ditahan saat komposisi IME, trim dan batas 200 code point, `replace` untuk `q`, `push` untuk filter, query lama dibatalkan dan tujuan dimulai dari halaman satu, URL eksternal (Back/Forward) menimpa draft. Komponen `BrowseSearch` (spinner, Clear, Escape, `role="search"`, `aria-live` untuk ringkasan) dan `BrowseCard` (Series ke `/series/:slug`, lainnya ke `/videos/:slug` dengan state `fromBrowse`).
- Dihapus karena tidak lagi dipakai: daftar `GET /videos` pada klien/reader/query web (`page`, `catalogOptions`, `restartCatalog`, `loadCatalog`, `catalogKinds`, `publicVideoPageSchema`) dan `components/public/catalog-card.tsx`; test terkait dialihkan ke `detail`. API tidak diubah.
- Penyimpangan dari desain: saat query gagal, daftar query sebelumnya tidak ditampilkan (setiap query punya daftar sendiri); copy dan desain diperbarui.
- Test: `bun test apps/web/test/public-*.test.ts*` → 26 pass/0 fail (baru: `public-browse-loader.test.ts`, kasus URL/filter pada `public-navigation.test.ts`); `bun run check-types` 3/3 sukses; `bun run lint` sukses; `bun run build` sukses. Dev server lokal (API 3001, web 3000, PostgreSQL/MinIO): `/?type=all` → 307 ke `/`; `/?q=%20a%20` → 307 ke `/?q=a`; `/`, `/?type=series`, `/?q=a`, `/?type=film&q=test`, `/?q=zzzzqqq` → 200 dengan input terisi dan ringkasan ("1 result for “a”", "0 results for “zzzzqqq”", "No videos in this category"); tautan kartu `/videos/test-film-1`; HTML tanpa signed URL; poster `/api/catalog/movie/…/poster` → 200. Dev DB hanya berisi satu Film.

Belum terbukti: debounce 300 ms dan satu request per rangkaian ketikan di browser, IME, Clear/Escape/fokus, spinner/skeleton, Back/Forward menyinkronkan draft, offline, dan tampilan 390/1440 px (tidak ada browser; `useBrowseSearch` tidak diuji unit karena tanpa DOM, hanya util debounce dan loader). Seri/Standalone/jumlah halaman >1 belum diuji dengan data dev nyata.

### Commit task

- Pesan: `feat(web): add debounced browse search (WFLOW-009)`
- SHA: belum dibuat
- Hook/checks: dijalankan saat commit
- Ledger: dicatat pada update dokumentasi berikutnya

### Blocker atau tindak lanjut

D6 disetujui 11 Oktober 2026: Browse berpindah ke `GET /catalog` dan filter bertambah "Series"; implementasi harus memperbarui keputusan homepage 8 Oktober 2026 pada PRD/dokumen terkait.
