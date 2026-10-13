# Modul: UI dan UX tabel Content admin

> Status: **CTBL-001–012 Done (implemented lokal, mode dev; produksi belum)** · 13 Oktober 2026 · Pengguna meminta peningkatan UI/UX tabel Content. Plan: [implementation-plan](../plans/content-table-ux/implementation-plan.md), context: [repository-context](../plans/content-table-ux/repository-context.md). Plan disetujui pengguna 13 Oktober 2026.

## Tujuan modul

Admin menemukan konten dan memahami keadaannya dengan cepat, serta bertindak dengan aksi yang jelas dan aman, pada desktop dan mobile. Referensi: [model data video](../architecture/video-data-model.md), [runbook metadata](../operations/video-metadata.md), [design system](../design/design-system.md), backlog terkait [DEL](delete-content.md) (aksi hapus) dan [ASER](admin-series-episodes.md).

## User story: CTBL-US-01

Sebagai admin, saya ingin tabel yang menampilkan status, kesiapan dan waktu perubahan dengan jelas serta aksi utama yang tidak bercampur dengan aksi berisiko, sehingga saya tahu apa yang harus dikerjakan berikutnya tanpa membuka tiap item.

## User story: CTBL-US-02

Sebagai admin, saya ingin memfilter menurut status, mengurutkan dan mencari (judul atau slug) dengan hasil yang dapat dibagikan lewat URL, sehingga saya cepat menemukan draft yang belum selesai atau konten lama.

## User story: CTBL-US-03

Sebagai admin yang memakai ponsel, keyboard atau pembaca layar, saya ingin daftar yang padat, tidak bergeser saat memuat dan dapat dioperasikan penuh, sehingga saya dapat mengelola konten dari perangkat apa pun.

## Task: CTBL-001 — Setujui keputusan D1–D9

- Status: Done
- Owner: agent
- Prioritas: 1
- Referensi: CTBL-US-01/02/03; [plan](../plans/content-table-ux/implementation-plan.md)
- Diperbarui: 2026-10-13
- Dependensi: tidak ada
- Ukuran: kecil

### Ruang lingkup

Pengguna meninjau D1–D9, khususnya default urutan `updated desc` (D4), sumber jumlah (D3), kolom tahap B (D7) dan apakah thumbnail (CTBL-011) dikerjakan. Plan diperbarui dengan keputusan dan tanggal persetujuan.

### Acceptance criteria

- [x] Setiap keputusan D1–D9 disetujui, diubah atau dikeluarkan secara tertulis oleh pengguna.
- [x] Plan dan backlog menandai status `approved` beserta tanggal, dan daftar task final.

### Validasi

`bun run docs:check`.

### Hasil dan bukti

Pengguna menyetujui seluruh D1–D9 pada 13 Oktober 2026 ("setuju semua"), termasuk default urutan `updated desc` (D4), jumlah dari dashboard summary (D3), field tahap B (D7; `genres` dibuang lebih dulu bila melewati anggaran) dan thumbnail sampul (CTBL-011, dikerjakan terakhir dengan endpoint cover privat). Plan berstatus `approved`; `bun run docs:check` lulus.

### Commit task

- Pesan: `docs(web): plan content table UX (CTBL-001)`
- SHA: belum dibuat
- Hook/checks: belum dijalankan
- Ledger: dicatat pada update dokumentasi berikutnya

### Blocker atau tindak lanjut

Tidak ada. Branch `feat/content-table-ux` dibuat dari HEAD branch hapus konten karena PR hapus belum di-merge.

## Task: CTBL-002 — Perbaikan cepat tanpa perubahan API

- Status: Done
- Owner: agent
- Prioritas: 2
- Referensi: CTBL-US-03; P8, P9, P12
- Diperbarui: 2026-10-13
- Dependensi: CTBL-001
- Ukuran: kecil

### Ruang lingkup

`apps/web`: nama aksesibel membedakan baris (judul pada tombol hapus), skeleton sesuai layout (baris tabel pada desktop, kartu pada mobile, jumlah = `pageSize`), empty state dengan tombol "Add a video" atau "Clear filters", refresh latar memakai `aria-busy` dan baris dipudarkan tanpa menggeser layout, tanggal relatif dengan waktu lokal lengkap pada `title` dan `<time datetime>` ISO.

### Acceptance criteria

- [x] Tiap tombol aksi baris memiliki nama unik berisi judul (diuji dengan role/name).
- [x] Skeleton mengikuti struktur daftar (tabel pada desktop, kartu pada mobile) dengan jumlah baris mengikuti `pageSize` (maks. 10); pengukuran visual tanpa pergeseran dibuktikan pada CTBL-010.
- [x] Empty state menyediakan tindakan lanjut sesuai penyebab (kosong vs filter).
- [x] Tanggal relatif benar pada batas menit/jam/hari dan zona waktu lokal.

### Validasi

Test komponen dan util tanggal; pemeriksaan screenshot desktop/mobile.

### Hasil dan bukti

Dikerjakan 13 Oktober 2026. `lib/admin/content-time.ts` (`relativeTime`: Just now/menit/jam/kemarin/hari, lalu tanggal; `fullTime` untuk tooltip), `components/admin/content-updated.tsx` (`<time dateTime title>`), `components/admin/content-list-states.tsx` (`ContentListSkeleton` tabel + kartu, `ContentEmpty` dengan tombol "Add a video"/"Clear filters"/"Go to the first page"), `content-list.tsx` (refresh latar memakai `aria-busy` + `opacity-60`, teks refresh menjadi live region `sr-only`), dan `delete-content.tsx` (tombol hapus kompak bernama "Delete <judul>" lewat `sr-only`). Test `test/admin-content-table-states.test.tsx` (4 test) dan satu test baru pada `admin-delete-content.test.tsx`; `bun run lint` bersih, `bun run check-types` lulus. Pengukuran pergeseran layout dan screenshot dilakukan pada CTBL-010.

### Commit task

- Pesan: `feat(web): polish content table states and labels (CTBL-002)`
- SHA: belum dibuat
- Hook/checks: belum dijalankan
- Ledger: dicatat pada update dokumentasi berikutnya

### Blocker atau tindak lanjut

Tidak ada.

## Task: CTBL-003 — Aksi baris: aksi utama + menu ⋯

- Status: Done
- Owner: agent
- Prioritas: 3
- Referensi: CTBL-US-01/03; P1, P2, D1
- Diperbarui: 2026-10-13
- Dependensi: CTBL-002
- Ukuran: sedang

### Ruang lingkup

Judul menjadi tautan ke detail; satu tombol utama per baris dari `nextStep`; `DropdownMenu` "Actions for <judul>" berisi Details, Edit, dan Delete (destruktif, terakhir, dengan alasan nonaktif untuk published); dialog hapus (komponen `DeleteContent`) dikendalikan oleh baris, bukan item menu. Berlaku untuk tabel dan kartu mobile.

### Acceptance criteria

- [x] Paling banyak satu tombol utama terlihat per baris; aksi sekunder hanya melalui menu.
- [x] Menu dapat dioperasikan dengan keyboard dan mengembalikan fokus ke pemicu; dialog hapus tidak tertutup saat menu menutup.
- [x] Alur hapus DEL-006 tetap berfungsi (dialog tidak tertutup saat menu menutup; navigasi/toast/invalidasi memakai komponen yang sama) dan tes lama lulus; skenario hapus penuh dari menu diuji ulang pada CTBL-010.
- [x] Target sentuh ≥ 44 px dan tanpa scroll horizontal pada 390 px.

### Validasi

Test komponen; skenario browser (desktop dan mobile) termasuk keyboard.

### Hasil dan bukti

Dikerjakan 13 Oktober 2026. `lib/admin/row-actions.ts` (`rowActions`: aksi utama dari `nextStep`, item menu Details/Edit/Delete, alasan blokir hapus), `components/admin/content-row-actions.tsx` (tombol utama + `DropdownMenu` bernama "Actions for <judul>", Delete destruktif terakhir setelah separator, nonaktif dengan teks "Archive it first" untuk published), `content-title-link.tsx` (judul sebagai tautan + slug), `delete-content.tsx` dipecah menjadi `DeleteDialog` (terkontrol, dimiliki baris) dan `DeleteContent` (tombol + dialog; tetap dipakai pada detail/episode/season), `content-list.tsx` (tabel dan daftar kartu mobile `<ul>` memakai komponen yang sama; `ContentNextStep` dihapus). Test: `admin-next-step.test.tsx` diperbarui (aksi utama tunggal, menu bernama, isi menu per status). Smoke browser (Chromium headless, API + worker + web dev nyata, database/bucket uji): menu berisi Details/Edit draft/Delete untuk draft, dialog tetap terbuka setelah menu menutup, fokus kembali ke pemicu setelah Cancel, Delete nonaktif (`aria-disabled`) dengan alasan pada film published, pemicu 44×44 px dan tanpa scroll horizontal pada 390 px. `bun run lint` dan `tsc --noEmit` bersih. Skenario hapus penuh dari menu dan worker DEL-007 disesuaikan pada CTBL-010.

### Commit task

- Pesan: `feat(web): row actions menu for content table (CTBL-003)`
- SHA: belum dibuat
- Hook/checks: belum dijalankan
- Ledger: dicatat pada update dokumentasi berikutnya

### Blocker atau tindak lanjut

Memerlukan PR hapus konten sudah di-merge (konflik pada `content-list.tsx`/`delete-content.tsx`).

## Task: CTBL-004 — API: filter status, urutan dan pencarian slug

- Status: Done
- Owner: agent
- Prioritas: 4
- Referensi: CTBL-US-02; P3, P5, P6; D2, D4, D5
- Diperbarui: 2026-10-13
- Dependensi: CTBL-001
- Ukuran: sedang

### Ruang lingkup

`apps/api/src/modules/content`: query opsional `status` (`active|draft|published|archived|all`), `sort` (`updated|created|title|status`), `order` (`asc|desc`); pencarian cocok judul atau slug; `includeArchived` lama dipetakan; tie-breaker `id`; index parsial `updated_at` untuk `videos` dan `series` melalui migrasi Drizzle yang ditinjau dan diterapkan ke database development; `docs/operations/video-metadata.md` memuat kontrak baru.

### Acceptance criteria

- [x] Tanpa parameter baru, hasil kompatibel (kecuali default urutan bila D4 disetujui) dan `includeArchived=true` setara `status=all`.
- [x] Parameter tidak valid → 422; unknown query tetap ditolak.
- [x] Urutan stabil dan pagination konsisten dengan tie-breaker; pencarian slug meng-escape wildcard.
- [x] Migrasi diterapkan ke database development tanpa mengubah data; EXPLAIN memakai index baru.

### Validasi

Test unit/HTTP (`app.handle`), integrasi PostgreSQL pada database uji, `bun run --cwd apps/api db:migrate`.

### Hasil dan bukti

Dikerjakan 13 Oktober 2026. `GET /admin/content` menerima `status` (`active|draft|published|archived|all`), `sort` (`updated|created|title|status`) dan `order`; `includeArchived` lama dipetakan ke `all`/`active` (status menang); pencarian cocok judul atau slug dengan wildcard literal; urutan default menjadi `updated desc` dengan tie-breaker `id` searah (`modules/content/{model,service,repository}.ts`). Migrasi `drizzle/0013_content-list-updated-indexes.sql` (`videos_kind_updated_idx`, `series_admin_updated_idx`, parsial `archived_at IS NULL`) dihasilkan `drizzle-kit generate` tanpa drift lain dan diterapkan ke database development dengan `bun run --cwd apps/api db:migrate`: video 28, series 3, aset 16, pengguna 1 tidak berubah; journal 13 → 14; kedua index ada. Test: `src/modules/content/index.test.ts` (6 test; default, validasi 422, pemetaan flag lama) dan integrasi PostgreSQL `content-pages-proof.test.ts` (4 test, 73 assertion; status per jenis, urutan updated/created/title/status, slug, wildcard literal, Series `unpublished`, dan EXPLAIN yang memakai kedua index) dijalankan dengan `CONTENT_TEST_DATABASE_URL` mengarah ke database uji `vertical_movie_app_content_test` yang sudah ada (variabel tidak ada di `.env`, diberikan lewat perintah). Kontrak didokumentasikan di `docs/operations/video-metadata.md`.

### Commit task

- Pesan: `feat(api): filter, sort and slug search for admin content list (CTBL-004)`
- SHA: belum dibuat
- Hook/checks: belum dijalankan
- Ledger: dicatat pada update dokumentasi berikutnya

### Blocker atau tindak lanjut

Persetujuan D4 (perubahan default urutan).

## Task: CTBL-005 — UI filter, urutan dan pencarian

- Status: Done
- Owner: agent
- Prioritas: 5
- Referensi: CTBL-US-02/03; P3, P5, P6, P11; D2, D4, D5, D8
- Diperbarui: 2026-10-13
- Dependensi: CTBL-002, CTBL-004
- Ukuran: sedang

### Ruang lingkup

Kontrol status segmented, header terurut dengan `aria-sort`, tombol clear dan `Esc`/`/` pada pencarian, penanda jumlah hasil (`role=status`), normalisasi URL (`contentSearch`, `ContentFilters`, `contentKeys`) termasuk konversi `includeArchived` lama, dan sheet "Filters" pada mobile dengan badge filter aktif dan "Clear all".

### Acceptance criteria

- [x] Filter, urutan, pencarian dan halaman tercermin di URL; nilai default tidak ditulis; URL lama tetap valid.
- [x] Header terurut mengumumkan arah (`aria-sort`) dan dapat dioperasikan dengan keyboard.
- [x] Pada 390 px kontrol filter berada di sheet dan daftar muncul lebih tinggi di layar dibanding sebelumnya.
- [x] "Clear all" mengembalikan default dan halaman 1.

### Validasi

Test state/komponen; skenario browser desktop/mobile.

### Hasil dan bukti

Dikerjakan 13 Oktober 2026. State dan URL: `lib/admin/content-client.ts` (`ContentStatus`, `ContentSort`, `ContentFilters` dengan `status`, `sort`, `order?`), `lib/admin/content-list-state.ts` (`contentSearch` menormalisasi dan mengonversi `includeArchived` lama menjadi `status=all`; `defaultOrder`/`effectiveOrder`/`canonicalOrder` agar urutan natural tidak ditulis ke URL; `sortPatch`, `ariaSort`, `isFiltered`, `activeFilterCount`, `clearedFilters`), route memakai `stripSearchParams(contentSearchDefaults)` sehingga nilai default tidak muncul di URL. UI: `content-filters.tsx` (segmented status Active/Draft/Published/Archived/All, kontrol "Sort by" + tombol arah, pencarian judul/slug dengan tombol clear, `Esc` mengosongkan, `/` memfokuskan lewat `hooks/use-search-shortcut.ts`, sheet "Filters" pada mobile dengan badge jumlah aktif), `content-sort-head.tsx` (header Title/Status/Updated dengan `aria-sort`), `ContentResultSummary` ("N results for “…” · Status" + "Clear all", `role=status`); "Clear filters" pada empty state. Penyimpangan kecil dari plan D8: tab jenis tetap terlihat di mobile dan sheet menerapkan pilihan langsung (tombol Clear filters/Done, tanpa Apply). Test: `admin-content-list.test.ts` (normalisasi, URL lama, urutan natural, `sortPatch`, filter aktif), `admin-content-client.test.ts` (query `status/sort/order`, tanpa `includeArchived`), `admin-content-filters.test.tsx` (6 test: kontrol, target 44 px, tombol clear, badge, `aria-sort`, ringkasan). Smoke browser (API + worker + web dev nyata, database/bucket uji): filter Draft/Published mengubah URL menjadi `?status=…` dan daftar; Title asc/desc dengan `aria-sort`; memilih kembali Last updated menghapus `sort` dari URL; `/` memfokuskan pencarian; pencarian slug `browser-draft` menemukan satu item dengan ringkasan; `Esc` mengosongkan dan menghapus `search` dari URL; hasil kosong → "Clear filters" memulihkan daftar; URL lama `?includeArchived=true` menampilkan item archived; mobile 390 px: sheet Filters mengubah status, badge "1 active", tanpa scroll horizontal, tanpa page error. `bun run lint`, `tsc --noEmit` bersih.

### Commit task

- Pesan: `feat(web): status filter, sorting and search UX for content table (CTBL-005)`
- SHA: belum dibuat
- Hook/checks: belum dijalankan
- Ledger: dicatat pada update dokumentasi berikutnya

### Blocker atau tindak lanjut

Tidak ada selain CTBL-004.

## Task: CTBL-006 — Jumlah pada tab jenis dan chip status

- Status: Done
- Owner: agent
- Prioritas: 6
- Referensi: CTBL-US-02; P4; D3
- Diperbarui: 2026-10-13
- Dependensi: CTBL-004
- Ukuran: kecil

### Ruang lingkup

Badge jumlah pada tab jenis dan chip status dari `GET /admin/dashboard/summary` (query terpisah, non-blocking), invalidasi bersama mutasi; fallback tanpa badge bila gagal. Bila reuse terbukti basi atau tidak konsisten dengan filter, usulkan `facets` (keputusan baru).

### Acceptance criteria

- [x] Jumlah tampil tanpa menahan daftar dan sesuai dengan `total` bila filter sama.
- [x] Jumlah diperbarui setelah publish, archive, buat dan hapus tanpa muat ulang.
- [x] Kegagalan summary tidak merusak daftar.

### Validasi

Test komponen dan invalidasi; browser.

### Hasil dan bukti

Dikerjakan 13 Oktober 2026. `lib/admin/content-counts.ts` (`statusCount`, `typeCount`: `active` = total − archived, `all` = total, lainnya langsung; maknanya sama dengan filter daftar), `components/admin/content-count.tsx` (angka kecil + `sr-only` "items", tidak dirender sebelum angka ada), `content-filters.tsx` (tab jenis menampilkan jumlah untuk status terpilih, chip status menampilkan jumlah untuk jenis terpilih, juga pada sheet mobile), `content-list.tsx` memakai `useDashboardSummary` yang sudah ada (polling 30 detik, abort/private-effect tetap) sehingga kegagalan summary hanya menyembunyikan angka. Test: 2 test baru pada `admin-content-filters.test.tsx` (aturan hitung termasuk Series `unpublished`, render angka). Smoke browser (stack nyata, database uji): sebelum hapus Film 4/Standalone 0/Series 1 dan Active 4/Draft 3/Published 1/Archived 0/All 4 sama dengan "Showing 1–4 of 4"; setelah menghapus satu draft dari menu tanpa muat ulang menjadi Film 3, Draft 2, Active 3, "Showing 1–3 of 3"; pada filter Archived tab Standalone menunjukkan 1. Tanpa page error. `tsc --noEmit` bersih.

### Commit task

- Pesan: `feat(web): counts on content type tabs and status filter (CTBL-006)`
- SHA: belum dibuat
- Hook/checks: belum dijalankan
- Ledger: dicatat pada update dokumentasi berikutnya

### Blocker atau tindak lanjut

Tidak ada selain CTBL-004.

## Task: CTBL-007 — API: field tambahan per baris (tahap B)

- Status: Done
- Owner: agent
- Prioritas: 7
- Referensi: CTBL-US-01; P7; D6, D7
- Diperbarui: 2026-10-13
- Dependensi: CTBL-004
- Ukuran: sedang

### Ruang lingkup

`ContentPageItem` menambah field opsional `mediaState` (`needs-video|needs-cover|uploading|processing|failed|ready`; menggantikan `none` agar Readiness dapat menyebut apa yang kurang), `releaseYear`, `genres[]` (maks. 3), `seasonCount`, `episodeCount` melalui agregasi dalam satu query pada transaksi repeatable-read yang sama; tanpa N+1.

### Acceptance criteria

- [x] Nilai `mediaState` konsisten dengan aturan kesiapan publikasi yang sudah ada (tidak memperkenalkan definisi baru yang berbeda).
- [x] Field baru opsional; klien lama tidak rusak; kontrak Eden dan OpenAPI diperbarui.
- [x] EXPLAIN pada data uji ≥ 10 ribu baris memenuhi anggaran yang disetujui (usulan p95 < 150 ms untuk 25 baris); bila tidak, subset field.

### Validasi

Test unit/HTTP, integrasi PostgreSQL, benchmark/EXPLAIN dicatat.

### Hasil dan bukti

Dikerjakan 13 Oktober 2026. `modules/catalog/visibility.ts`: predikat `ready` dipecah menjadi `sourceReady` + `posterReady` (`ready` tetap gabungan yang sama, tanpa perubahan perilaku; test publikasi/katalog lulus). `modules/content/enrichment.ts` (`videoExtras`, `seriesExtras`) menghitung per halaman, lewat query kedua berdasarkan id halaman dalam transaksi repeatable-read yang sama (bukan N+1 dan tidak bergantung ukuran tabel): `mediaState` (`ready` dari predikat kanonik; `failed`/`processing` dari job generasi aktif pada aset source/poster; `uploading` dari upload session aktif; `needs-cover` bila video siap tetapi sampul belum; selain itu `needs-video`), `releaseYear`, `genres` (maks. 3, abjad) + `genreCount`, serta `seasonCount`/`episodeCount` Series (archived tidak dihitung). `model.ts` menambah field opsional; kontrak Eden/OpenAPI ikut. Bukti `test/integration/content-list-extras-proof.test.ts` (4 test, 26 assertion, database uji): semua enam keadaan termasuk job generasi lama diabaikan, paritas `ready` dengan `CatalogStore.readyForPublish` untuk tujuh kasus, genre dan jumlah, hitungan Series (season/episode archived dikecualikan), serta pengukuran 10.000 baris tambahan: halaman 25/25/25/100 baris dengan sort judul = 29.8/34.1/30.7/35.2 ms pada run terakhir (38.6–46.3 ms pada run sebelumnya), jauh di bawah anggaran 150 ms, jadi `genres` tidak perlu dibuang. Regresi: `content-pages-proof` (4 test), `media-publication-proof` + `public-catalog-poster-proof` (4 test), `media-series-proof` + `admin-series-proof` (6 test) lulus; `bun test src` API 201 lulus + 1 gagal sebelumnya (`truncated JPEG data…`); `tsc --noEmit` bersih. Dokumentasi kontrak ditambahkan ke `docs/operations/video-metadata.md`.

### Commit task

- Pesan: `feat(api): richer rows for admin content list (CTBL-007)`
- SHA: belum dibuat
- Hook/checks: belum dijalankan
- Ledger: dicatat pada update dokumentasi berikutnya

### Blocker atau tindak lanjut

Persetujuan daftar field dan anggaran performa (D7).

## Task: CTBL-008 — UI kolom tahap B dan kepadatan responsif

- Status: Done
- Owner: agent
- Prioritas: 8
- Referensi: CTBL-US-01/03; P7, P11; D6, D8
- Diperbarui: 2026-10-13
- Dependensi: CTBL-003, CTBL-007
- Ukuran: sedang

### Ruang lingkup

Kolom Readiness (teks + ikon, bukan hanya warna), genre (maks. 2 chip + "+N"), tahun rilis, ringkasan "N seasons · M episodes" untuk Series, slug sekunder di bawah judul; kartu mobile padat dengan urutan informasi yang sama.

### Acceptance criteria

- [x] Readiness menjelaskan apa yang kurang untuk draft ("Needs video", "Processing", "Ready to publish", "Failed").
- [x] Tidak ada teks terpotong tanpa akses penuh (title/tooltip) dan tanpa scroll horizontal pada 390 px.
- [x] Kolom tidak mengurangi kinerja render halaman 100 baris secara nyata.

### Validasi

Test komponen; browser desktop/mobile.

### Hasil dan bukti

Dikerjakan 13 Oktober 2026. `lib/admin/content-readiness.ts` (`readiness`: Live untuk published; Needs video/Needs cover/Uploading/Processing/Failed/Ready to publish dari `mediaState`; Series draft tanpa episode = Needs episodes; archived atau API lama tanpa field = tidak mengklaim apa pun; `seriesSummary` "N seasons · M episodes"; `genreChips` maks. 2 + "+N"), `components/admin/content-readiness.tsx` (ikon + teks + tooltip, spinner dihentikan oleh `motion-reduce`), `content-meta.tsx` (tahun, genre, ringkasan Series di bawah judul). Tabel kini Title (slug + meta) · Status · Readiness · Updated · Actions; kolom Type dihapus karena tab jenis sudah menentukannya; kartu mobile: judul + status, meta, readiness + waktu relatif, lalu aksi; skeleton mengikuti kolom baru. `ContentResultSummary` hanya memesan ruang saat ada pencarian/filter (celah kosong 60 px pada screenshot dihapus). Test: `admin-content-readiness.test.tsx` (6 test, 31 assertion). Fixture browser diperluas (fakta aset, sampul, genre, tahun). Smoke browser (stack nyata): baris Film menunjukkan Uploading, Live, Ready to publish, dan Needs cover dengan "2024 · Comedy · Drama · +1"; Series menunjukkan "2 seasons · 3 episodes · 2021" dan genre; tab mobile 390 px tanpa scroll horizontal dan tanpa page error. `tsc --noEmit` dan eslint bersih.

### Commit task

- Pesan: `feat(web): readiness and metadata columns for content table (CTBL-008)`
- SHA: belum dibuat
- Hook/checks: belum dijalankan
- Ledger: dicatat pada update dokumentasi berikutnya

### Blocker atau tindak lanjut

Tidak ada selain CTBL-007.

## Task: CTBL-009 — Footer pagination ringkas dan pemulihan konteks

- Status: Done
- Owner: agent
- Prioritas: 9
- Referensi: CTBL-US-03; P10; D9
- Diperbarui: 2026-10-13
- Dependensi: CTBL-002
- Ukuran: kecil

### Ruang lingkup

Footer "Showing 1–10 of 28" + Prev/Next + nomor halaman dengan select "Rows" kecil (opsi Custom dihapus dari UI; URL tetap menerima `pageSize` 1–100); posisi scroll dan fokus dipulihkan saat kembali dari detail; fokus dipindah dengan wajar setelah hapus.

### Acceptance criteria

- [x] Footer memakai ≤ 1 baris pada desktop dan ≤ 2 baris pada mobile.
- [x] Kembali dari detail memulihkan filter, halaman dan scroll.
- [x] Setelah hapus fokus tidak hilang ke `body`.

### Validasi

Test komponen; browser.

### Hasil dan bukti

Dikerjakan 13 Oktober 2026. `content-pagination.tsx` ditulis ulang: satu blok ringkas berisi "Showing 1–10 of 28", Previous/Next dengan nomor halaman (nomor hanya pada layar lebar; layar sempit membaca "Page X of Y") dan pilihan "Rows" kecil; tanpa input Custom (URL tetap menerima `pageSize` 1–100 dan nilai tak biasa tetap muncul sebagai opsi lewat `pageSizeOptions`); satu halaman = tanpa navigasi, hasil kosong = tanpa footer (empty state sudah punya tombol). `content-list.tsx`: area hasil menjadi `region` "Content list" dengan `tabIndex=-1`; setelah penghapusan dari daftar dan refresh selesai, fokus dipindah ke region itu (bukan jatuh ke `<body>`); pemulihan scroll memakai `scrollRestoration` router yang sudah aktif dan filter/halaman ada di URL. Test: `admin-content-pagination.test.tsx` (6 test, 25 assertion). Smoke browser (stack nyata): footer desktop setinggi 44 px (satu baris kontrol) dan mobile 76 px (dua baris); Next → `?pageSize=1&page=2`, halaman 4 menonaktifkan Next, Rows 25 mengembalikan satu halaman tanpa navigasi; membuka detail lalu kembali memulihkan URL `?status=draft&sort=title&pageSize=2`; scroll 260 px pada mobile pulih tepat 260 px setelah kembali dari detail; setelah menghapus film dari menu, fokus berada pada "Content list"; tanpa page error. `tsc --noEmit` dan eslint bersih.

### Commit task

- Pesan: `feat(web): compact pagination and context restore for content table (CTBL-009)`
- SHA: belum dibuat
- Hook/checks: belum dijalankan
- Ledger: dicatat pada update dokumentasi berikutnya

### Blocker atau tindak lanjut

Tidak ada.

## Task: CTBL-010 — Bukti integrasi dan browser

- Status: Done
- Owner: agent
- Prioritas: 10
- Referensi: CTBL-US-01/02/03; plan bagian Validasi
- Diperbarui: 2026-10-13
- Dependensi: task terpilih CTBL-003–009
- Ukuran: sedang

### Ruang lingkup

Skenario browser pada database dan bucket uji (pola [DEL-007](delete-content.md)): cari → filter status → urut → buka → kembali, menu ⋯ dengan keyboard, hapus dari menu, desktop 1440 dan mobile 390, tanpa scroll horizontal, `aria-sort`, tanpa hydration warning; integrasi PostgreSQL untuk query dan index.

### Acceptance criteria

- [x] Seluruh skenario lulus dan dicatat dengan perintah dan hasil aktual.
- [x] Tidak ada regresi pada alur hapus, publish dan dashboard.

### Validasi

Suite integrasi API, worker browser, `bun test` web/API.

### Hasil dan bukti

Dikerjakan 13 Oktober 2026 pada database uji `vertical_movie_app_media_test` dan bucket MinIO acak berawalan `vertical-movie-app-media-test-` (database dan bucket development tidak disentuh), dengan API + worker + web dev nyata dan Chromium headless (Playwright). Fixture `apps/api/test/integration/content-delete-browser-fixture.ts` diperluas (fakta aset, sampul WebP nyata 1080×1920 di storage, genre, tahun). Worker baru `apps/web/test/admin-content-table-browser-worker.mjs` lulus **7/7**: (1) baris menampilkan status, Readiness (Uploading, Live, Ready to publish, Needs cover), tahun/genre/"+1", jumlah tab "Film 4 / Standalone 0 / Series 1" dan thumbnail 90×160 nyata hanya untuk item bersampul, tanpa scroll horizontal; (2) filter status (URL `?status=draft`, ringkasan "3 results · Draft"), urut judul naik/turun dengan `aria-sort`, "Clear all", `/` memfokuskan pencarian, pencarian slug, `Esc` mengosongkan, empty state + "Clear filters", dan URL lama `?includeArchived=true`; (3) kembali dari detail memulihkan filter, sort dan page size; (4) menu ⋯ dengan keyboard (Details/Edit draft/Delete), fokus kembali ke pemicu, nama aksi unik per baris, header sort lewat Enter; (5) hapus dari menu memperbarui daftar dan jumlah, memindahkan fokus ke "Content list" dan thumbnail lain tetap termuat; (6) mobile 390 px: sheet Filters + badge "1 active", thumbnail, scroll pulih, footer ≤ 90 px, target ≥ 44 px, tanpa scroll horizontal; (7) tanpa page error/hydration warning. Worker hapus DEL-007 disesuaikan dengan UI baru (judul sebagai tautan, hapus lewat menu, filter status, judul season bernama) dan tetap lulus **8/8** (tidak ada regresi hapus). Setelah penghapusan worker menyapu tombstone (3 diproses, 0 tertunda). Gate: `bun run check-types` 4/4, `bun run lint` bersih, `bun run build` 2/2; API `bun test src` 209 lulus + 1 gagal sebelumnya (`truncated JPEG data…`); integrasi `content-pages-proof` + `content-list-extras-proof` 9 lulus; `content:delete:proof` 7 lulus; web `bun test` 388 lulus + 1 gagal sebelumnya (`title route rejects unknown kinds…`). Batas: mode dev (bukan build produksi), tanpa FFmpeg/R2 nyata; job "berjalan" adalah baris fixture. Cara menjalankan: seperti DEL-007 (seed → API/worker/web → worker browser), memakai `admin-content-table-browser-worker.mjs`.

### Commit task

- Pesan: `test(web): prove content table UX in the browser (CTBL-010)`
- SHA: belum dibuat
- Hook/checks: belum dijalankan
- Ledger: dicatat pada update dokumentasi berikutnya

### Blocker atau tindak lanjut

Tidak ada.

## Task: CTBL-011 — Thumbnail sampul pada daftar

- Status: Done
- Owner: agent
- Prioritas: 11
- Referensi: CTBL-US-01; plan non-goals
- Diperbarui: 2026-10-13
- Dependensi: CTBL-008
- Ukuran: belum diperkirakan; pecah setelah keputusan

### Ruang lingkup

Pengguna mengizinkan thumbnail ditambahkan (13 Oktober 2026); dikerjakan terakhir. Rekomendasi: endpoint privat admin `GET /admin/content/:type/:id/cover` yang men-stream bytes lewat API mengikuti pola `CatalogPosterService` (tanpa URL bertanda tangan per baris), `Cache-Control: private` + ETag, `loading="lazy"`, placeholder bila belum ada sampul. Opsi URL bertanda tangan batch hanya dipertimbangkan bila streaming terbukti terlalu mahal.

### Acceptance criteria

- [x] Pendekatan, batas ukuran/cache dan batas biaya ditetapkan di awal task (lihat hasil).
- [x] Bila disetujui: thumbnail tidak membocorkan URL privat, memuat lazy, memiliki teks alternatif dan fallback saat belum ada sampul.

### Validasi

Ditentukan setelah keputusan.

### Hasil dan bukti

Dikerjakan 13 Oktober 2026. Keputusan awal: endpoint privat yang men-stream lewat API (bukan URL bertanda tangan per baris) dengan **thumbnail yang dikecilkan di server**, karena satu-satunya objek sampul adalah WebP 1080×1920 (≈300 KB) sehingga satu halaman 25 baris akan mengirim ≈7,5 MB bila disajikan penuh. API: `modules/catalog/poster-service.ts` mengekstrak `readWebpObject` (baca WebP dengan batas ukuran, abort/timeout, pemeriksaan RIFF/WEBP) yang dipakai bersama; poster publik tidak berubah (26 test unit katalog + `public-catalog-poster-proof` lulus). `modules/content/cover-repository.ts` (sampul terverifikasi dengan predikat `posterReady` yang sama; tipe harus cocok), `cover-service.ts` (`AdminCoverService`: WebP maks. 90×160 kualitas 70 via `Bun.Image`, cache memori LRU 512 entri/4 MB, maks. dua resize bersamaan, timeout 10 detik, ETag dari hash key, `If-None-Match` → 304 tanpa baca storage, `Cache-Control: private, max-age=300`), route `GET /admin/content/:type/:id/cover` (admin-only, params divalidasi) dan field `coverVersion` pada baris daftar (hanya bila sampul terverifikasi). Gateway web: `isAdminContentCover` (hanya GET path persis), respons dibatasi `image/webp` ≤ 256 KB dengan status yang dikenal, `cache-control` dan `If-None-Match` diteruskan hanya untuk route ini, route admin lain tetap `private, no-store`; `tooling/catalog-poster-dev.ts` mengarahkan path ini ke Nitro pada Vite dev (Nitro dev melewati `Sec-Fetch-Dest: image`; hanya dev). Web: `content-thumb.tsx` (`<img>` lazy 32×56 dengan alt "Cover of <judul>", placeholder sama ukuran bila belum ada sampul atau gagal), `coverThumbUrl`, dipasang di tabel dan kartu mobile. Test: API `cover-service.test.ts` (8 test: header, resize nyata kecil ≥4× dari sumber, cache satu kali, 304 untuk ETag/weak/daftar/`*`, 404/503, LRU, maksimum dua resize, route admin-only + 422), integrasi `content-list-extras-proof.test.ts` (kini 5 test: `coverVersion` ⇔ `store.cover` ⇔ predikat siap; tipe harus cocok; Series), web `business-gateway.test.ts` (2 test baru), `catalog-poster-dev.test.ts` (1 test baru), `admin-content-readiness.test.tsx` (thumbnail). Smoke browser (stack nyata): `<img>` film Mobile memuat `image/webp` 90×160 dengan `private, max-age=300` dan ETag, thumbnail Series tampil, item tanpa sampul memakai placeholder, anonim → 401 `private, no-store`, permintaan bersyarat melalui gateway 200 → 304 dengan cache-control, mobile tanpa scroll horizontal, tanpa page error. `tsc --noEmit` API dan web bersih.

### Commit task

- Pesan: `feat(web): cover thumbnails in content table (CTBL-011)`
- SHA: belum dibuat
- Hook/checks: belum dijalankan
- Ledger: dicatat pada update dokumentasi berikutnya

### Blocker atau tindak lanjut

Tidak ada selain CTBL-008.

## Task: CTBL-012 — Dokumentasi dan penutupan

- Status: Done
- Owner: agent
- Prioritas: 12
- Referensi: CTBL-US-01/02/03
- Diperbarui: 2026-10-13
- Dependensi: CTBL-010, CTBL-011
- Ukuran: kecil

### Ruang lingkup

Perbarui runbook kontrak daftar (`docs/operations/video-metadata.md`), model/arsitektur bila field baru, `docs/README.md`, plan dan backlog; catat batas dan rollout (migrasi index).

### Acceptance criteria

- [x] Kontrak query/respons baru dan perilaku UI terdokumentasi pada pemilik kanoniknya.
- [x] `check-types`, `lint`, `build`, `docs:check` lulus dan hasilnya dicatat.

### Validasi

Lihat acceptance criteria.

### Hasil dan bukti

Dikerjakan 13 Oktober 2026. Runbook [Daftar Content admin — UI](../operations/video-metadata.md#daftar-content-admin--ui-ctbl-13-oktober-2026) (filter, urutan, URL, baris, aksi, mobile, footer, bukti dan batas), kontrak API pada bagian daftar `GET /admin/content` (status/sort/order/slug, ringkasan baris, cover endpoint) di runbook yang sama, [ikhtisar arsitektur](../architecture/overview.md) dan [panduan API](../guides/api-development.md) (jumlah endpoint), `docs/README.md` (status implemented lokal) dan [plan](../plans/content-table-ux/implementation-plan.md) (status, penyimpangan yang dicatat). Gate (diamati 13 Oktober 2026): `bun run check-types` 4/4, `bun run lint` bersih, `bun run build` 2/2, `bun run docs:check` lulus; API `bun test src` 209 lulus + 1 gagal sebelumnya, integrasi konten 9 lulus, `content:delete:proof` 7 lulus; web `bun test` 388 lulus + 1 gagal sebelumnya; browser 7/7 (tabel) dan 8/8 (hapus). Ledger SHA: CTBL-001 `388c4ae`, CTBL-002 `32750e7`, CTBL-003 `9086a56`, CTBL-004 `ce2ee45`, CTBL-005 `b3ef5ea`, CTBL-006 `039ea2f`, CTBL-007 `4a2643d`, CTBL-008 `e488194`, CTBL-009 `1316087`, CTBL-011 `c5b5792`, CTBL-010 `8a48c81`. Batas: mode dev saja, tanpa build produksi/R2/FFmpeg nyata; migrasi index `0013` sudah diterapkan ke database development (data tidak berubah) dan memerlukan otorisasi untuk produksi; push/PR/merge belum dilakukan dan branch ini bertumpuk di atas branch hapus konten (rebase setelah PR hapus di-merge).

### Commit task

- Pesan: `docs(web): document content table UX (CTBL-012)`
- SHA: belum dibuat
- Hook/checks: belum dijalankan
- Ledger: dicatat pada update dokumentasi berikutnya

### Blocker atau tindak lanjut

Tidak ada.
