# Implementation plan: Alur detail dan tonton publik

## Plan metadata

- Status: **approved** (11 Oktober 2026). Pengguna menyetujui URL bersih/navigasi (10 Oktober 2026) dan desain beserta D1–D7 ("oke setuju", 11 Oktober 2026); WFLOW-001–002 selesai lokal, WFLOW-003–009 menunggu implementasi.
- Date: 10 Oktober 2026; decision owner: pengguna.
- Repository: `bayuaji17/vertical-movie-app`; base ref: `main`; base SHA: `f1b1d184fe6d410d976495c65bbeef75ad85cc83`.
- Context: [repository-context.md](repository-context.md), disimpan sebelum plan ini.
- Backlog: [watch-flow](../../tasks/watch-flow.md), WFLOW-001–009.
- Branch: `feat/watch-flow-redesign`.

## Objective

Pengunjung menemukan konten, membaca detail, dan menonton lewat URL bersih (`/videos/:slug`, `/watch/:slug`, `/series/:slug`) dengan layout yang nyaman di desktop dan mobile, dan berpindah antar-episode tanpa kembali ke halaman Series.

## Keputusan dan usulan

Disetujui pengguna (10 Oktober 2026):

- Hapus `?type=...` dari `/videos/:slug` dan `/watch/:slug`; navigasi ke detail memakai `/videos/:slug` dan ke tonton memakai `/watch/:slug`.
- Perbaiki UI/UX desktop dan mobile, terutama video tunggal dan Series dengan episode.

Keputusan desain (disetujui pengguna 11 Oktober 2026, ditandai **D**):

- **D1** Konteks "kembali" tidak lagi di URL. Tombol Back memakai riwayat router bila entri sebelumnya berada di aplikasi, jika tidak jatuh ke `/` (filter homepage `?type=` tetap ada di `/`, dan dihilangkan dari URL bila `all`).
- **D2** `/titles/$kind/$slug` dialihkan ke `/videos/:slug` dan Film/Standalone memakai satu komponen detail; Series tetap di `/series/:slug`.
- **D3** Halaman watch memakai top bar ramping (tombol Back, judul terpotong, menu tema) alih-alih header 80 px agar player mendapat tinggi maksimum.
- **D4** Autoplay tetap tidak ada (keputusan PRD). Akhir episode menampilkan kartu "Up next" dengan tombol; auto-advance ditunda dan menjadi keputusan terpisah.
- **D5** Daftar episode berbasis teks (tanpa thumbnail karena API episode tidak membawa poster); tidak ada perubahan API.
- **D6** Browse dan search menyertakan Series (badge "Series", filter tambahan). `GET /catalog` sudah mendukung `kind=series`, tetapi ini mengubah keputusan 8 Oktober 2026 (homepage khusus Film/Standalone).
- **D7** Search memakai debounce 300 ms tanpa tombol submit (permintaan pengguna 10 Oktober 2026), `q` di URL dengan `replace`, memakai `GET /catalog`.

## Goals dan non-goals

Goals: URL bersih; search debounce pada Browse; satu pola detail untuk Film/Standalone; detail Series dengan CTA, ringkasan season/episode dan pemilih season; watch dengan layout dua-panel desktop dan player-first mobile; panel episode, Previous/Next; state loading/error/offline yang konsisten; a11y dan bukti browser.

Non-goals: perubahan API/schema/env/dependensi; progress "continue watching", autoplay, watchlist, pencarian di luar Browse; perubahan perilaku `VerticalVideoPlayer` (renewal, retry); menambah Series ke grid homepage (keputusan produk terpisah); kebijakan indexing; tema baru.

## Current behavior

Lihat [context](repository-context.md#observed-behavior).

## Desired behavior

### URL dan navigasi

- Kanonik: `/videos/:slug`, `/watch/:slug`, `/series/:slug`, tanpa query. Tautan internal (browser, detail, admin, dialog, featured) tidak membawa `type`.
- URL lama `…?type=all|film|standalone` pada dua rute itu dialihkan sekali (replace) ke URL bersih; nilai tidak valid tidak lagi memicu redirect `?type=all`. Slug tak ada tetap 404 ([NF](../not-found/implementation-plan.md)).
- Back: dari watch → detail (atau Series untuk episode); dari detail → riwayat bila ada, jika tidak `/`. Logo/Browse selalu ke `/`.
- `PublicShell` tidak lagi menerima `type` untuk rute detail/watch.

### Detail Film/Standalone (`/videos/:slug`)

- Mobile (≤640 px): poster 9:16 (lebar ~200 px) di kiri atau atas dengan badge jenis, judul, genre, durasi; sinopsis dipotong 4 baris dengan "Read more"; CTA "Watch now" lebar penuh dan menempel di bawah viewport (safe-area).
- Desktop (≥1024 px): poster kiri (kolom ~360 px), kolom kanan memuat badge, h1, genre, durasi, sinopsis penuh dan CTA "Watch now" (tidak menempel).
- State: skeleton, offline (CTA nonaktif), stale + Refresh, 404 → not found, error → Retry (perilaku sekarang dipertahankan).

### Detail Series (`/series/:slug`)

- Header sama seperti Film dengan ringkasan "N seasons · M episodes", CTA "Play S1 E1" (episode pertama dari daftar), genre dan sinopsis.
- Pemilih season (tabs ≤4 season, select bila lebih) di atas daftar; hanya episode season terpilih yang tampil.
- Baris episode: nomor (E1), judul, durasi, sinopsis 2 baris; seluruh baris tautan ≥44 px ke `/watch/:slug`. Pagination dipertahankan (Load more) dengan skeleton dan retry yang ada.

### Watch (`/watch/:slug`)

- Mobile: top bar ramping; player 9:16 dengan tinggi dibatasi `min(100svh − chrome, lebar × 16/9)` agar kontrol terlihat tanpa scroll; di bawahnya judul, S/E, durasi, sinopsis ter-clamp, kontrol Previous/Next, lalu panel Episodes (Series) sebagai bagian halaman.
- Desktop (≥1024 px): kiri player (tinggi ≤ `100svh − top bar`, di tengah kolom), kanan rail: breadcrumb "Series › S1 E3", judul, metadata, sinopsis, Previous/Next, lalu daftar episode ber-scroll dengan season selector; episode aktif ditandai (`aria-current="true"`) dan di-scroll ke tampilan.
- Tablet (640–1023 px): player di atas, rail di bawah satu kolom dengan lebar baca maksimal.
- Film/Standalone: rail berisi info saja (tanpa panel episode) dan tautan "Details".
- Akhir episode: kartu "Up next · S1 E4" dengan tombol (tanpa autoplay). Tidak ada episode berikutnya → pesan "You're all caught up" dan tautan ke Series.
- Tanpa pergeseran layout saat metadata dimuat (skeleton berdimensi tetap); fokus berpindah ke `h1` saat pindah episode.

Wireframe ringkas:

```text
Desktop watch                         Mobile watch
┌ ‹ Back   Series name        ◐ ┐     ┌ ‹  Title         ◐ ┐
│ ┌────────┐  Series › S1 E3    │     │ ┌────────────────┐ │
│ │        │  Title             │     │ │     player     │ │
│ │ player │  S1 E3 · 12 min    │     │ │      9:16      │ │
│ │  9:16  │  synopsis…         │     │ └────────────────┘ │
│ │        │  [‹ Prev] [Next ›] │     │ S1 E3 · 12 min     │
│ └────────┘  Season ▾          │     │ synopsis… More     │
│             E1 …  E2 …  ▶E3 …│     │ [‹ Prev] [Next ›]  │
└──────────────────────────────┘     │ Episodes · Season ▾ │
                                      └────────────────────┘
```

## Impact analysis

Hanya `apps/web`. Risiko: (1) rute dan tautan lama/bookmark `?type=`; (2) test dan browser worker yang mengasumsikan `type`; (3) duplikasi dua tumpukan `public`/`catalog` saat disatukan; (4) episode aktif berada di luar halaman pertama (cursor 20) sehingga Previous/posisi tidak diketahui; (5) tinggi viewport mobile (`svh`/address bar) dan fokus kontrol Video.js; (6) regresi pada player renewal bila wrapper berubah.

Mitigasi (4): muat halaman episode berikutnya hingga episode aktif ditemukan (batas halaman), atau tampilkan Previous/Next dari `/next` + daftar yang sudah dimuat; bila ternyata tidak cukup, ajukan endpoint API tambahan sebagai keputusan terpisah.

## Affected files and symbols

| File                                                                                                         | Perubahan                                                                                 |
| ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| `routes/videos.$slug.tsx`, `routes/watch.$slug.tsx`                                                          | Hapus `validateSearch`/`normalizeCatalogLocation`; redirect legacy `?type=`; layout baru. |
| `lib/public/catalog-navigation.ts`, `catalog-model.ts`                                                       | Redirect legacy; `type` hanya untuk `/`.                                                  |
| `components/public/public-shell.tsx`, `catalog-browser.tsx`, `video-detail.tsx`                              | Hapus `type` dari tautan detail/watch/shell; detail baru.                                 |
| `components/catalog/content-page.tsx`, `public-shell.tsx`, `catalog-detail-dialog.tsx`, `featured-film.tsx`  | Satukan pola detail; tautan `/videos`; season selector.                                   |
| `routes/titles.$kind.$slug.tsx`                                                                              | Redirect ke `/videos/:slug` (D2).                                                         |
| `components/watch/*` (baru)                                                                                  | `WatchLayout`, `EpisodePanel`, `EpisodeNav`, `UpNextCard`, top bar.                       |
| `components/vertical-video-player.tsx`                                                                       | Hanya jika perlu prop ukuran; perilaku playback tidak berubah.                            |
| `apps/web/test/*`, browser worker                                                                            | Test tautan bersih, redirect, episode panel, layout.                                      |
| `docs/design/watch-flow.md` (baru), `docs/README.md`, `docs/product/prd.md`, `docs/architecture/overview.md` | Spesifikasi, indeks, rute aktif.                                                          |

## Implementation DAG

WFLOW-001 (desain + keputusan) → WFLOW-002 (URL bersih) → WFLOW-003 (detail Film/Standalone) dan WFLOW-004 (detail Series) → WFLOW-005 (watch layout) → WFLOW-006 (episode panel + Prev/Next/Up next) → WFLOW-009 (search Browse, dapat paralel setelah WFLOW-001/002) → WFLOW-007 (test + a11y) → WFLOW-008 (bukti browser, docs, closure). WFLOW-002 dapat dikerjakan lebih dulu bila pengguna ingin URL bersih segera, karena tidak bergantung pada desain.

## Test and verification strategy

- Unit/komponen (`bun test`, pola `apps/web/test`): tautan tanpa `type`; redirect legacy; Back (riwayat vs fallback); pemilih season; episode aktif; Previous/Next; Up next; state offline/error.
- `bun run check-types`, `bun run lint`, `bun run build`, `bun run docs:check`, Prettier, `git diff --check`.
- Browser (dev dan build): 320, 390, 768, 1024, 1440 px; Light/Dark/System; keyboard; reduced-motion; tidak ada overflow; player tidak crop (9:16); episode pindah tanpa reload penuh; Film, Standalone dan Series dengan ≥2 season.

## Rollout, rollback, dan batas

Perubahan frontend saja; rollback dengan revert commit. Redirect legacy dipertahankan untuk bookmark lama. Bukti lokal tidak berarti kesiapan production, perangkat fisik atau Safari.

## Open decisions

1. D1–D7 disetujui 11 Oktober 2026; tidak ada keputusan terbuka untuk desain.
2. Auto-advance episode berikutnya setelah selesai: ditunda; perlu keputusan produk karena PRD melarang autoplay.
3. Series di grid homepage: di luar plan ini.

## Execution history

- 10 Oktober 2026: context dan plan ditulis; branch `feat/watch-flow-redesign` dibuat dari `main` (`f1b1d18`). Belum ada implementasi.
- 11 Oktober 2026: WFLOW-008: bukti browser lokal (Chromium, API fixture): dev 70/74 lalu perbaikan, build 78/78; empat bug ditemukan dan diperbaiki (aria-current "page", kartu Up next, celah vertikal detail, dua bug skrip); worker baru `public-watch-flow-browser-worker.mjs`. Plan dianggap implemented lokal; status modul Review menunggu uji playback nyata/offline/perangkat fisik.
- 11 Oktober 2026: WFLOW-007 dikerjakan (Review): test render server untuk Browse, detail, Series dan watch; perbaikan reduced-motion skeleton, cover dekoratif dan scroll-padding CTA sticky.
- 11 Oktober 2026: WFLOW-006 diimplementasikan lokal (Review): panel episode, Previous/Next dari daftar episode, kartu Up next; `NextEpisode`/`next` tidak lagi dipakai halaman watch.
- 11 Oktober 2026: WFLOW-005 diimplementasikan lokal (Review): `WatchShell` top bar 56 px, lebar player dari tinggi viewport, rail info; browser worker publik usang dan ditulis ulang di WFLOW-008.
- 11 Oktober 2026: WFLOW-004 diimplementasikan lokal (Review): detail Series dengan CTA, pemilih season dan baris episode baru; halaman episode 100.
- 11 Oktober 2026: WFLOW-003 diimplementasikan lokal (Review): detail Film/Standalone responsif, `/titles/$kind/$slug` dialihkan ke `/videos/:slug`.
- 11 Oktober 2026: WFLOW-009 diimplementasikan lokal (Review): Browse berpindah ke `GET /catalog`, `q`/`type` di URL, debounce 300 ms; daftar `GET /videos` web dihapus.
- 11 Oktober 2026: pengguna menyetujui preview dan D1–D7 ("oke setuju"); WFLOW-001 Done, WFLOW-009 Ready. D6 mengubah keputusan homepage 8 Oktober 2026 (Series ikut di Browse/search).
- 10 Oktober 2026: WFLOW-002 selesai lokal (`b401c47`). WFLOW-001: [desain](../../design/watch-flow.md) dan [preview HTML](../../design/watch-flow-preview.html) ditulis, termasuk input search debounce; menunggu persetujuan D1–D7. WFLOW-009 ditambahkan untuk search.
- 10 Oktober 2026: pengguna memutuskan commit GEN-007 (`8ce7d1e`, `7af059a`) tetap berada di branch ini; branch dibuat dari `f1b1d18` sehingga belum memuat merge PR #27 di `main`. Pekerjaan watch-flow berikutnya mengikuti plan ini.
