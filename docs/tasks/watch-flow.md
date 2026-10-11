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

Bukti browser lokal 11 Oktober 2026 (WFLOW-008; Chromium headless 1187, API fixture, dev dan build): lolos tanpa overflow 320–1440 px; di 390 px CTA "Watch now" lebar penuh dan berada di dalam viewport, "Read more" muncul dan memperluas (`aria-expanded`); di 1440 px tidak ada "Read more", kolom poster 360 px, genre tampil. Temuan nyata dari screenshot: baris grid melar oleh poster 640 px (celah vertikal besar antara judul, sinopsis dan CTA di ≥1024 px) → diperbaiki dengan baris ke-4 fleksibel (`lg:grid-rows-[auto_auto_auto_1fr]`, poster `row-span-4`), terverifikasi: judul→sinopsis 50 px, sinopsis→CTA 20 px. Offline/stale/error belum dicoba di browser.

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

Bukti browser lokal 11 Oktober 2026 (WFLOW-008; Chromium headless 1187, API fixture, dev dan build): "Play S1 E1" mengarah ke `/watch/neon-garden-s1e1`, ringkasan "2 seasons · 5 episodes", season pertama menampilkan 3 episode, Season 2 lewat keyboard (Space) menampilkan 2 episode dan `aria-pressed`, baris episode ≥44 px (92 px). Load more episodes, retry dan >100 episode belum dicoba.

### Commit task

- Pesan: `feat(web): redesign series detail with season selector (WFLOW-004)`
- SHA: belum dibuat
- Hook/checks: dijalankan saat commit
- Ledger: dicatat pada update dokumentasi berikutnya

### Blocker atau tindak lanjut

Tidak ada.

## Task: WFLOW-005 — Layout watch desktop dan mobile

- Status: Review (diimplementasikan lokal; ukuran dan perilaku player belum dilihat di browser)
- Owner: agent
- Prioritas: 5
- Referensi: WFLOW-US-02; skill `videojs`; desain WFLOW-001
- Diperbarui: 2026-10-11
- Dependensi: WFLOW-001, WFLOW-002
- Ukuran: sedang

### Ruang lingkup

Top bar ramping, player dengan tinggi dibatasi viewport (`svh`), rail info desktop, urutan mobile player-first, skeleton berdimensi tetap, fokus ke `h1`. Perilaku `VerticalVideoPlayer` tidak berubah.

### Acceptance criteria

- [ ] Player 9:16 tanpa crop/stretch dan kontrolnya terlihat tanpa scroll pada 390×844 dan 1440×900 (lebar diturunkan dari tinggi viewport lewat CSS dan terverifikasi pada CSS hasil build; belum diukur di browser).
- [ ] Tidak ada layout shift berarti saat metadata dimuat; tidak ada overflow 320–1920 px (skeleton memakai lebar yang sama dengan player; belum diukur).
- [x] Renewal, Retry playback dan offline tetap berfungsi (`vertical-video-player.tsx` tidak diubah; test publik existing lulus; perilaku runtime belum dicoba).

### Validasi

Test komponen; browser dev/build; test player existing.

### Hasil dan bukti

Diimplementasikan 11 Oktober 2026 pada `feat/watch-flow-redesign`.

- `WatchShell` (`components/public/watch-shell.tsx`) menggantikan `PublicShell` pada `/watch/:slug`: top bar sticky 56 px (Back kontekstual, judul terpotong, menu tema) dan footer Site Settings bila ada. Back: episode → `/series/:slug` ("Back to series"), Film/Standalone → `/videos/:slug` ("Back to details"), selain itu Browse; label teks "Back" hanya pada ≥1024 px, nama aksesibel tetap lengkap. Tombol "Back to browse" terpisah dihapus (sesuai desain).
- Tata letak: lebar player diturunkan dari tinggi tersisa, `min(100%, (100svh − 56 px) × 9/16)` pada mobile/tablet (di tengah) dan `(100svh − 56 px − 48 px) × 9/16` pada ≥1024 px dengan rail 560 px di kanan; mobile edge-to-edge, info di bawah player. CSS hasil build diperiksa: `width: min(100%, 56.25svh - 1.97rem)` dan `calc(56.25svh - 3.66rem)`. Rail: badge jenis, durasi (dengan S/E untuk episode), `h1`, sinopsis ter-clamp 3 baris dengan "Read more" (`ClampedText` dibagi dengan detail), tombol "Details" untuk Film/Standalone, dan tombol Next episode yang ada (panel episode, Previous dan Up next adalah WFLOW-006).
- Skeleton `WatchSkeleton` berlebar sama dengan player; `ContentLoading` yang tidak terpakai dihapus. Fokus berpindah ke `h1` pada mount berikutnya (navigasi klien, misalnya episode berikutnya), bukan pada pemuatan halaman pertama.
- `lib/catalog/watch-model.ts` (judul top bar dan target Back) dengan test `public-watch-model.test.ts`.
- Command aktual: `bun test apps/web/test/public-*.test.ts* apps/web/test/content-client.test.ts` → 40 pass/0 fail; `bun run check-types` 3/3 sukses; `bun run lint` sukses; `bun run build` sukses. Dev server lokal: `/watch/test-film-1` → 200 dengan top bar `h-14`, `aria-label="Back to details"`, kelas lebar `svh`, tanpa header 80 px, `h1` dan tombol Details; `/watch/no-such-zz` → 404; `/watch/test-film-1?type=all` → 307 ke URL bersih.

Belum terbukti: ukuran dan visibilitas kontrol pada 390×844/1440×900, tanpa overflow 320–1920 px, fokus `h1`, dan alur playback (renewal/retry/offline) di browser. Browser worker publik yang ada (`public-film-catalog-browser-worker.mjs` dan lain-lain) memakai mock API daftar `/videos` dan teks lama, sudah usang sejak WFLOW-009 dan WFLOW-005, dan tidak dijalankan; penulisan ulang menjadi bagian WFLOW-008.

Bukti browser lokal 11 Oktober 2026 (WFLOW-008; Chromium headless 1187, API fixture, dev dan build): top bar 56 px, player 9:16 persis (rasio 0,5625; 390×693 dan 448×796), kontrol terlihat tanpa scroll (bawah 749/844 dan 876/900), judul top bar "Neon Garden · S1 E2", info di bawah player pada 390 px dan di kanan pada 1440 px. Temuan: pada error playback di desktop, teks "Playback unavailable" dan tombol Retry berada di bawah lipatan 900 px (hanya pada state error; belum diubah). Playback HLS nyata tidak diuji (fixture menjawab 503).

### Commit task

- Pesan: `feat(web): redesign watch layout (WFLOW-005)`
- SHA: belum dibuat
- Hook/checks: dijalankan saat commit
- Ledger: dicatat pada update dokumentasi berikutnya

### Blocker atau tindak lanjut

Tidak ada.

## Task: WFLOW-006 — Panel episode, Previous/Next dan Up next

- Status: Review (diimplementasikan lokal; belum dirender dengan episode nyata atau dilihat di browser)
- Owner: agent
- Prioritas: 6
- Referensi: WFLOW-US-03
- Diperbarui: 2026-10-11
- Dependensi: WFLOW-005
- Ukuran: sedang

### Ruang lingkup

Panel episode pada watch (season selector, episode aktif, load more), tombol Previous/Next, kartu Up next di akhir episode (tanpa autoplay), pemulihan error/offline. Tangani episode aktif di luar halaman pertama (lihat Impact analysis).

### Acceptance criteria

- [ ] Episode aktif ditandai `aria-current` dan terlihat di daftar (penanda dan scroll ke baris aktif ditulis; belum dilihat).
- [x] Previous/Next berfungsi lintas season; disabled di batas dengan teks yang jelas (logika `episodeNeighbors` diuji unit; tombol belum dilihat dengan data nyata).
- [ ] Pindah episode tidak me-reload halaman penuh dan memindahkan fokus ke judul (tautan SPA dan fokus `h1` ditulis; belum dicoba).
- [x] Tidak ada autoplay; Up next hanya tombol (kartu hanya tampil setelah event `ended`, berisi tautan "Play next").

### Validasi

Test komponen dengan klien palsu; browser dengan Series ≥2 season dan >20 episode bila tersedia.

### Hasil dan bukti

Diimplementasikan 11 Oktober 2026 pada `feat/watch-flow-redesign` (commit kode `07665a3`).

- Data: `useEpisodeNav` (`hooks/use-episode-nav.ts`) memuat judul Series (`contentDetailOptions('series')`) dan daftar episode (`contentEpisodesOptions`, 100 per halaman), mengurutkannya, mencari tetangga lewat `episodeNeighbors` (`lib/catalog/season-model.ts`), dan memuat halaman berikutnya selama tetangga belum diketahui (episode aktif di luar halaman termuat atau di tepi daftar, maksimum 20 halaman). Tidak ada endpoint API baru. Loader watch memanggil `loadEpisodeContext` (non-fatal) sehingga judul Series dan daftar episode sudah di cache; kegagalan diabaikan.
- Rail untuk episode: breadcrumb "Series › Season N › Episode M" (tautan ke `/series/:slug`), badge, `h1`, sinopsis, tombol Previous/Next (dua kolom, nama aksesibel "Previous/Next episode · S1 E2"; disabled bila tidak ada tetangga), pesan "You’re all caught up. Back to series" pada episode terakhir (hanya bila semua halaman termuat), dan `EpisodePanel` (select season, daftar episode dengan `EpisodeRow` bersama Series, episode aktif `aria-current` dan di-scroll ke tengah daftar tanpa menggeser halaman, maksimum 340 px tinggi pada ≥1024 px, skeleton, error + Retry episodes). Judul top bar menjadi "Series · S1 E3".
- Up next: `VerticalVideoPlayer` mendapat dua prop opsional (`onEnded`, `onPlay`) yang hanya diteruskan ke elemen video; logika renewal/retry tidak diubah. Kartu "Up next · S1 E4 / judul / Play next" tampil di atas kontrol player setelah `ended` dan hilang saat diputar lagi; tanpa autoplay/countdown.
- Dihapus: komponen `NextEpisode` (memakai `/videos/:slug/next`) pada halaman watch. `nextEpisodeOptions` dan klien `next` masih ada di `lib/catalog` dan tidak dipakai web lagi; pembersihannya menjadi tindak lanjut.
- Test baru/diperbarui: `public-episode-context.test.ts` (loader konteks episode dan kegagalannya), `public-season-model.test.ts` (tetangga lintas season, tepi daftar, belum termuat), `public-watch-model.test.ts` (judul top bar dengan judul Series).
- Command aktual: `bun test apps/web/test/public-*.test.ts* apps/web/test/content-client.test.ts` → 43 pass/0 fail; `bun run check-types` 3/3 sukses; `bun run lint` sukses; `bun run build` sukses. Dev server lokal: `/watch/test-film-1` → 200 dengan tombol Details dan tanpa panel episode/Previous/Next; `/watch/no-such-zz` → 404.

Belum terbukti: halaman watch Episode nyata (database dev tidak punya Series/episode), kartu Up next dan event `ended`, Previous/Next lintas season, scroll ke baris aktif, fokus `h1`, pemuatan halaman lanjutan untuk Series >100 episode, dan semua tampilan di browser.

Bukti browser lokal 11 Oktober 2026 (WFLOW-008; Chromium headless 1187, API fixture, dev dan build): Next/Previous berjalan sebagai navigasi SPA (penanda `window` tetap hidup), fokus pindah ke `h1` judul episode baru, Next melintasi season dan select season di panel mengikuti (S2), Previous nonaktif di episode pertama, episode terakhir menampilkan "all caught up" dan "Back to series", kartu Up next muncul setelah `ended` dan berada di dalam kotak player di atas kontrol. Temuan nyata: (1) Router menimpa `aria-current` baris episode menjadi `"page"`, sehingga pencarian `[aria-current="true"]` untuk scroll ke baris aktif tidak pernah cocok dan test render server (router di `/`) tidak menangkapnya → selector dan test diganti ke `"page"`; (2) kartu Up next diposisikan terhadap pembungkus yang ikut memuat pesan error sehingga menimpa bar kontrol → kini memakai kotak 9:16 yang sama dengan player, dengan pemeriksaan geometri di worker. Scroll ke baris aktif pada daftar panjang belum dicoba (fixture hanya 3 episode).

### Commit task

- Pesan: `feat(web): add episode panel and navigation to watch (WFLOW-006)`
- SHA: `07665a3` (kode); catatan bukti pada commit dokumentasi berikutnya
- Hook/checks: Husky dan commitlint lulus pada commit kode
- Ledger: dicatat pada update dokumentasi berikutnya

### Blocker atau tindak lanjut

Bila halaman episode tidak cukup menentukan Previous, ajukan endpoint API sebagai keputusan terpisah.

## Task: WFLOW-007 — Test dan aksesibilitas

- Status: Review (test render server dan audit statis; keyboard, fokus terlihat dan kontras belum diukur di browser)
- Owner: agent
- Prioritas: 7
- Referensi: PRD-07/08
- Diperbarui: 2026-10-11
- Dependensi: WFLOW-003, WFLOW-004, WFLOW-006
- Ukuran: kecil

### Ruang lingkup

Lengkapi test unit/komponen, landmark dan label, urutan fokus, target 44 px, reduced-motion, kontras Light/Dark.

### Acceptance criteria

- [x] Test perilaku baru lulus dan berada di samping modulnya (`apps/web/test`, pola repo).
- [ ] Tidak ada pelanggaran a11y yang diketahui pada tiga halaman: landmark, `h1` tunggal, label tombol dan target 44 px diperiksa lewat test render server; fokus terlihat hanya diperiksa lewat kelas `focus-visible`, urutan tab dan kontras belum diukur di browser.

### Validasi

`bun test` (web), `bun run check-types`, `bun run lint`.

### Hasil dan bukti

Dikerjakan 11 Oktober 2026 pada `feat/watch-flow-redesign`.

- Test render server memakai router memori dan klien Query yang diisi cache (`test/public-render.tsx`), sehingga komponen publik dirender nyata (bukan hanya logika):
  - `public-a11y.test.tsx`: kartu Browse (satu tautan bernama, poster dekoratif `alt=""`, target `min-h-11`), search (`role="search"`, label, `maxLength=200`, Clear hanya bila ada teks dan tidak saat nonaktif, spinner `aria-hidden` dan `motion-reduce`), `EpisodeRow` (nama "Season N, episode M", satu `aria-current`), `EpisodePanel` (select season hanya untuk ≥2 season, daftar berlabel, error + Retry, loading berstatus), `WatchShell` (skip link sebelum `header`, `main` fokusable, Back bernama untuk tiga target, bilah 56 px, satu `h1`), placeholder loading.
  - `public-browse-render.test.tsx`: Browse penuh dengan cache terisi (kartu Film/Series/Standalone, tautan benar, empat tombol filter, "3 titles", "1 result for “night”", Load more hanya bila ada cursor, kosong/kategori kosong/error untuk pencarian dan daftar, teks pencarian tidak dipantulkan sebagai markup).
  - `public-detail-render.test.tsx`: `SeriesDetail` (CTA "Play S1 E1", ringkasan season hanya bila semua halaman termuat, hanya season pertama, tanpa CTA saat kosong, 404), `VideoDetail` (genre, CTA sticky, Back), `WatchContent` (breadcrumb, Previous/Next lintas season, satu `aria-current`, tetangga hilang disabled, "all caught up", Film tanpa kontrol episode).
- Perbaikan yang ditemukan audit: `Skeleton` kini `motion-reduce:animate-none` (berlaku di seluruh aplikasi); cover kartu Browse dekoratif (`Poster` mendapat prop `alt`) agar tidak dibaca ganda dengan judul; CTA sticky mobile menandai `data-sticky-cta` dan `scroll-padding-bottom: 6rem` (<640 px) supaya fokus keyboard tidak tertutup; CSS hasil build diperiksa. `WatchContent`, `StepButton`, `UpNext` dan `WatchSkeleton` dipindah dari route ke `components/public/watch-content.tsx` agar dapat diuji.
- Command aktual: `bun test apps/web/test/public-*.test.ts* apps/web/test/content-client.test.ts` → 61 pass/0 fail; `bun run check-types` 3/3 sukses; `bun run lint` sukses; `bun run build` sukses. Dev server lokal: `/watch/test-film-1`, `/videos/test-film-1`, `/`, `/?q=a` → 200; `/series/no-such-zz` → 404.

Belum terbukti: tindakan keyboard (urutan tab, Escape/Clear, panah pada ToggleGroup), fokus terlihat dan tidak tertutup CTA sticky, kontras Light/Dark di layar, reduced-motion di browser, perilaku hook `useBrowseSearch`/`useEpisodeNav` (tanpa DOM interaktif) dan alur klien (navigasi, Up next, scroll ke baris aktif). Pembuktian tersebut berada pada WFLOW-008.

Bukti browser lokal 11 Oktober 2026 (WFLOW-008; Chromium headless 1187, API fixture, dev dan build): tidak ada error halaman pada 320–1440 px; Tab pertama adalah skip link, urutan Tab header → Back → Read more → Play → Season; kontrol terfokus mempunyai ring (shadow `ring-3` 30% opasitas), CTA sticky tidak pernah menutup kontrol terfokus; reduced-motion mematikan pulse skeleton; kontras teks ≥4,5:1 (Light: isi 19,8, muted 4,74, badge 16,12; Dark: 14,97, 7,37, 11,55). Temuan: ring fokus bawaan komponen Button hanya 30% opasitas sehingga tampak pucat; kontras indikator fokus belum diukur dan menjadi tindak lanjut tingkat design system. Pembaca layar nyata tidak diuji.

### Commit task

- Pesan: `test(web): cover watch flow behavior (WFLOW-007)`
- SHA: belum dibuat
- Hook/checks: dijalankan saat commit
- Ledger: dicatat pada update dokumentasi berikutnya

### Blocker atau tindak lanjut

Tidak ada.

## Task: WFLOW-008 — Bukti browser, dokumentasi dan penutupan

- Status: Review (bukti browser lokal terhadap API fixture; playback nyata, offline, Safari/Firefox dan perangkat fisik belum)
- Owner: agent
- Prioritas: 8
- Referensi: plan bagian Test and verification strategy
- Diperbarui: 2026-10-11
- Dependensi: WFLOW-007, WFLOW-009
- Ukuran: kecil

### Ruang lingkup

Bukti browser dev/build memakai worker baru `public-watch-flow-browser-worker.mjs` dan API fixture `public-watch-flow-fixture-api.ts` (menggantikan tiga worker publik lama yang ditandai STALE), perbarui `docs/README.md`, PRD dan arsitektur (rute aktif), catat hasil dan batas.

### Acceptance criteria

- [x] Matriks 320/390/768/1024/1440 px (overflow dan error halaman pada tujuh halaman), Light/Dark lewat `prefers-color-scheme` (mode System; tombol tema eksplisit tidak diklik), keyboard dan reduced-motion tercatat dengan hasil aktual (lihat bawah).
- [x] `bun run check-types`, `lint`, `build`, `docs:check`, Prettier dan `git diff --check` lulus dan dicatat.
- [x] Batas yang tidak terbukti (playback nyata, offline, perangkat fisik, Safari/Firefox, pembaca layar, production) dicatat.

### Validasi

Lihat acceptance criteria.

### Hasil dan bukti

Dikerjakan 11 Oktober 2026 pada `feat/watch-flow-redesign`.

**Cara menjalankan (lokal, tanpa menyentuh database):** API fixture `FIXTURE_PORT=3101 REAL_API=http://localhost:3001 bun apps/web/test/public-watch-flow-fixture-api.ts` (menyajikan katalog, Series dengan 2 season, episode, Film; meneruskan jalur lain ke API dev; playback sengaja 503), web dev atau build di depannya (`PORT=3100 API_INTERNAL_URL=http://localhost:3101 bun run --cwd apps/web dev` atau `PORT=3200 API_INTERNAL_URL=http://localhost:3101 bun apps/web/.output/server/index.mjs`), lalu `bun apps/web/test/public-watch-flow-browser-worker.mjs <base> <URL modul playwright> "<path chromium atau kosong>" <folder screenshot>`. Playwright 1.55.0 dan Chromium 1187 dipasang di folder sementara di luar repo; di WSL ini library `libnspr4`/`libnss3` diambil dari paket Debian tanpa sudo dan dimuat lewat `LD_LIBRARY_PATH`.

**Hasil:**

- Dev server (Vite, 11 Oktober 2026): 70/74 lolos; empat kegagalan: dua adalah bug skrip (pencocokan nama "Details" juga menangkap "Back to details"; pemeriksaan CTA sticky ikut menghitung kontainer saat fokus keluar dari halaman) dan dua adalah bug kode nyata (`aria-current` episode menjadi `"page"`; lihat WFLOW-006) yang diperbaiki lalu diperiksa ulang (6/6 pada pemeriksaan terarah, termasuk celah vertikal detail desktop).
- Build produksi (`bun run build`, server Nitro, port 3200): **78/78 lolos** setelah perbaikan, kurang dari 2 menit. Cakupan: 7 halaman × 5 lebar tanpa overflow/error halaman; Browse (20 kartu + Load more → 29), debounce/IME/Clear/Escape/kosong/riwayat/Back; URL lama; detail Film dan Series; halaman watch Episode dan Film; keyboard, fokus, reduced-motion dan kontras.
- Dua temuan visual tambahan dari screenshot yang diperbaiki di sini: kartu Up next menimpa bar kontrol (kini memakai kotak 9:16 player; pemeriksaan geometri baru) dan celah vertikal detail desktop.
- Screenshot terpilih (390 dan 1440 px, Light/Dark untuk Browse, detail Film, detail Series dan watch Episode, plus pencarian dan Up next) berada di `docs/design/watch-flow-implemented-*.png`; poster tampil sebagai fallback karena fixture mengirim SVG, bukan WebP seperti API asli.
- Worker lama (`public-film-catalog-browser-worker.mjs`, `public-content-browser-worker.mjs`, `public-catalog-browser-worker.mjs`) diberi komentar STALE di baris pertama dan tidak dijalankan; cakupannya yang belum dipindahkan: offline/retry cover, antrean poster bertanda tangan, renewal playback HLS, dan SSR tanpa kebocoran.
- Command akhir: `bun test apps/web/test/public-*.test.ts* apps/web/test/content-client.test.ts` → 61 pass/0 fail; `bun run check-types` 3/3 sukses; `bun run lint` sukses; `bun run build` sukses; `bun run docs:check`, Prettier dan `git diff --check` lulus (lihat commit).

**Batas yang tidak terbukti:** playback HLS nyata dan renewal (fixture 503), data dari API/DB asli (fixture), mode offline dan error server pada Browse/detail/watch, scroll restoration saat Back dan scroll ke baris aktif pada daftar episode panjang, Series >100 episode, tombol tema eksplisit dan mode System di perangkat, lebar 1920 px, Firefox/Safari, perangkat fisik, pembaca layar, kontras indikator fokus. **Tindak lanjut:** (1) ring fokus komponen Button hanya 30% opasitas; (2) pada error playback di desktop, Retry berada di bawah lipatan; (3) hapus `nextEpisodeOptions`/klien `next` yang tidak dipakai web; (4) pindahkan cakupan worker lama yang masih relevan; (5) hapus kode HomePage lama yang tidak dirujuk route mana pun.

### Commit task

- Pesan: `docs(web): close watch flow (WFLOW-008)`
- SHA: belum dibuat
- Hook/checks: dijalankan saat commit
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

Bukti browser lokal 11 Oktober 2026 (WFLOW-008; Chromium headless 1187, API fixture, dev dan build): mengetik "garden" 6 karakter dengan jeda 60 ms mengirim tepat satu permintaan `/api/catalog?...search=garden` dan tidak ada permintaan perantara; riwayat tidak bertambah per ketikan; URL menjadi `?q=garden`; ringkasan "1 result for “garden”"; Clear mengosongkan `q` dan fokus tetap di input; Escape mengosongkan; hasil kosong menampilkan "No results for “zzzzqq”" + Clear search; komposisi IME (CDP `Input.imeSetComposition`) tidak mengirim permintaan sampai teks dikomit; filter mempertahankan `q` (`?type=series&q=night`); Back memulihkan filter dan isi input; Back to browse dari detail yang dibuka di Browse memulihkan `?type=film`, dari kunjungan langsung ke `/`; Load more menambah sisa judul hingga 29. Search saat offline dan error server belum dicoba.

### Commit task

- Pesan: `feat(web): add debounced browse search (WFLOW-009)`
- SHA: belum dibuat
- Hook/checks: dijalankan saat commit
- Ledger: dicatat pada update dokumentasi berikutnya

### Blocker atau tindak lanjut

D6 disetujui 11 Oktober 2026: Browse berpindah ke `GET /catalog` dan filter bertambah "Series"; implementasi harus memperbarui keputusan homepage 8 Oktober 2026 pada PRD/dokumen terkait.
