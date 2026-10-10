# Modul: Alur detail dan tonton publik

> Status: **Backlog** · 10 Oktober 2026 · Pengguna menyetujui URL bersih tanpa `?type=` dan navigasi `/videos/:slug` → `/watch/:slug`, serta meminta UI/UX lebih baik di desktop dan mobile. Plan: [implementation-plan](../plans/watch-flow/implementation-plan.md), context: [repository-context](../plans/watch-flow/repository-context.md). Base SHA `f1b1d184fe6d410d976495c65bbeef75ad85cc83`.

## Tujuan modul

Detail dan tonton publik memakai URL bersih, layout responsif untuk video tunggal dan Series, serta navigasi antar-episode dari halaman watch. Referensi: PRD-07/08, GR-02/08, [PCW](public-content-watch.md), [NF](not-found.md).

## User story: WFLOW-US-01

Sebagai pengunjung, saya ingin URL detail dan tonton yang bersih dan tombol kembali yang masuk akal, sehingga tautan mudah dibagikan dan navigasi konsisten.

## User story: WFLOW-US-02

Sebagai pengunjung di desktop atau ponsel, saya ingin halaman detail dan tonton yang nyaman, sehingga saya langsung melihat player dan informasi penting tanpa banyak scroll.

## User story: WFLOW-US-03

Sebagai penonton Series, saya ingin memilih season dan berpindah episode dari halaman tonton, sehingga saya tidak perlu kembali ke halaman Series.

## Task: WFLOW-001 — Setujui desain dan keputusan D1–D5

- Status: Backlog
- Owner: Pengguna (keputusan) / agent (spesifikasi)
- Prioritas: 1
- Referensi: WFLOW-US-02/03; plan bagian Keputusan dan usulan
- Diperbarui: 2026-10-10
- Dependensi: tidak ada
- Ukuran: sedang

### Ruang lingkup

Tulis `docs/design/watch-flow.md` (layout, state, breakpoint, copy) dengan mockup desktop/mobile Light/Dark untuk detail Film/Standalone, detail Series dan watch; catat keputusan D1–D5 dan pemberi persetujuan; perbarui `docs/README.md`.

### Acceptance criteria

- [ ] D1–D5 dicatat beserta pemberi persetujuan dan tanggal.
- [ ] Mockup 390 dan 1440 px Light/Dark untuk tiga halaman disetujui pengguna.

### Validasi

`bun run docs:check`, Prettier, `git diff --check`.

### Hasil dan bukti

Belum ada.

### Commit task

- Pesan: `docs(web): approve watch flow design (WFLOW-001)`
- SHA: belum dibuat
- Hook/checks: belum dijalankan
- Ledger: dicatat pada update dokumentasi berikutnya

### Blocker atau tindak lanjut

Menunggu persetujuan pengguna.

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
- SHA: belum dibuat
- Hook/checks: dijalankan saat commit
- Ledger: dicatat pada update dokumentasi berikutnya

### Blocker atau tindak lanjut

Tidak ada.

## Task: WFLOW-003 — Detail Film/Standalone responsif

- Status: Backlog
- Owner: agent
- Prioritas: 3
- Referensi: WFLOW-US-02; desain WFLOW-001
- Diperbarui: 2026-10-10
- Dependensi: WFLOW-001, WFLOW-002
- Ukuran: sedang

### Ruang lingkup

Satu komponen detail untuk Film/Standalone di `/videos/:slug`; `/titles/$kind/$slug` dialihkan (D2); `catalog-detail-dialog` dan `featured-film` menautkan ke `/videos/:slug`; genre, durasi, sinopsis ter-clamp, CTA lebar penuh di mobile.

### Acceptance criteria

- [ ] Layout sesuai desain di 320/390/768/1024/1440 px tanpa overflow.
- [ ] State loading/offline/stale/error/404 berfungsi seperti sebelumnya.
- [ ] `/titles/movie|standalone/:slug` mengalihkan ke `/videos/:slug`; kind/slug tidak valid tetap 404.

### Validasi

Test komponen dan browser.

### Hasil dan bukti

Belum ada.

### Commit task

- Pesan: `feat(web): redesign film and standalone detail (WFLOW-003)`
- SHA: belum dibuat
- Hook/checks: belum dijalankan
- Ledger: dicatat pada update dokumentasi berikutnya

### Blocker atau tindak lanjut

Tidak ada.

## Task: WFLOW-004 — Detail Series dengan season selector dan CTA

- Status: Backlog
- Owner: agent
- Prioritas: 4
- Referensi: WFLOW-US-02/03; desain WFLOW-001
- Diperbarui: 2026-10-10
- Dependensi: WFLOW-001, WFLOW-002
- Ukuran: sedang

### Ruang lingkup

Ringkasan season/episode, CTA "Play S1 E1", pemilih season (tabs/select), baris episode baru, pagination/retry dipertahankan. Gunakan pola header yang sama dengan WFLOW-003.

### Acceptance criteria

- [ ] CTA mengarah ke episode pertama yang tersedia; tidak tampil bila belum ada episode.
- [ ] Pindah season hanya menampilkan episode season tersebut dan dapat dioperasikan keyboard.
- [ ] Load more/retry/invalid-cursor tetap berfungsi; baris tautan ≥44 px.

### Validasi

Test komponen; browser dengan Series ≥2 season.

### Hasil dan bukti

Belum ada.

### Commit task

- Pesan: `feat(web): redesign series detail with season selector (WFLOW-004)`
- SHA: belum dibuat
- Hook/checks: belum dijalankan
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
- Dependensi: WFLOW-007
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
