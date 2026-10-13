# Modul: UI dan UX tabel Content admin

> Status: **CTBL-001–003 Done; CTBL-004–012 Backlog (approved)** · 13 Oktober 2026 · Pengguna meminta peningkatan UI/UX tabel Content. Plan: [implementation-plan](../plans/content-table-ux/implementation-plan.md), context: [repository-context](../plans/content-table-ux/repository-context.md). Plan disetujui pengguna 13 Oktober 2026.

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

- Status: Backlog
- Owner: agent
- Prioritas: 4
- Referensi: CTBL-US-02; P3, P5, P6; D2, D4, D5
- Diperbarui: 2026-10-13
- Dependensi: CTBL-001
- Ukuran: sedang

### Ruang lingkup

`apps/api/src/modules/content`: query opsional `status` (`active|draft|published|archived|all`), `sort` (`updated|created|title|status`), `order` (`asc|desc`); pencarian cocok judul atau slug; `includeArchived` lama dipetakan; tie-breaker `id`; index parsial `updated_at` untuk `videos` dan `series` melalui migrasi Drizzle yang ditinjau dan diterapkan ke database development; `docs/operations/video-metadata.md` memuat kontrak baru.

### Acceptance criteria

- [ ] Tanpa parameter baru, hasil kompatibel (kecuali default urutan bila D4 disetujui) dan `includeArchived=true` setara `status=all`.
- [ ] Parameter tidak valid → 422; unknown query tetap ditolak.
- [ ] Urutan stabil dan pagination konsisten dengan tie-breaker; pencarian slug meng-escape wildcard.
- [ ] Migrasi diterapkan ke database development tanpa mengubah data; EXPLAIN memakai index baru.

### Validasi

Test unit/HTTP (`app.handle`), integrasi PostgreSQL pada database uji, `bun run --cwd apps/api db:migrate`.

### Hasil dan bukti

Belum ada.

### Commit task

- Pesan: `feat(api): filter, sort and slug search for admin content list (CTBL-004)`
- SHA: belum dibuat
- Hook/checks: belum dijalankan
- Ledger: dicatat pada update dokumentasi berikutnya

### Blocker atau tindak lanjut

Persetujuan D4 (perubahan default urutan).

## Task: CTBL-005 — UI filter, urutan dan pencarian

- Status: Backlog
- Owner: agent
- Prioritas: 5
- Referensi: CTBL-US-02/03; P3, P5, P6, P11; D2, D4, D5, D8
- Diperbarui: 2026-10-13
- Dependensi: CTBL-002, CTBL-004
- Ukuran: sedang

### Ruang lingkup

Kontrol status segmented, header terurut dengan `aria-sort`, tombol clear dan `Esc`/`/` pada pencarian, penanda jumlah hasil (`role=status`), normalisasi URL (`contentSearch`, `ContentFilters`, `contentKeys`) termasuk konversi `includeArchived` lama, dan sheet "Filters" pada mobile dengan badge filter aktif dan "Clear all".

### Acceptance criteria

- [ ] Filter, urutan, pencarian dan halaman tercermin di URL; nilai default tidak ditulis; URL lama tetap valid.
- [ ] Header terurut mengumumkan arah (`aria-sort`) dan dapat dioperasikan dengan keyboard.
- [ ] Pada 390 px kontrol filter berada di sheet dan daftar muncul lebih tinggi di layar dibanding sebelumnya.
- [ ] "Clear all" mengembalikan default dan halaman 1.

### Validasi

Test state/komponen; skenario browser desktop/mobile.

### Hasil dan bukti

Belum ada.

### Commit task

- Pesan: `feat(web): status filter, sorting and search UX for content table (CTBL-005)`
- SHA: belum dibuat
- Hook/checks: belum dijalankan
- Ledger: dicatat pada update dokumentasi berikutnya

### Blocker atau tindak lanjut

Tidak ada selain CTBL-004.

## Task: CTBL-006 — Jumlah pada tab jenis dan chip status

- Status: Backlog
- Owner: agent
- Prioritas: 6
- Referensi: CTBL-US-02; P4; D3
- Diperbarui: 2026-10-13
- Dependensi: CTBL-004
- Ukuran: kecil

### Ruang lingkup

Badge jumlah pada tab jenis dan chip status dari `GET /admin/dashboard/summary` (query terpisah, non-blocking), invalidasi bersama mutasi; fallback tanpa badge bila gagal. Bila reuse terbukti basi atau tidak konsisten dengan filter, usulkan `facets` (keputusan baru).

### Acceptance criteria

- [ ] Jumlah tampil tanpa menahan daftar dan sesuai dengan `total` bila filter sama.
- [ ] Jumlah diperbarui setelah publish, archive, buat dan hapus tanpa muat ulang.
- [ ] Kegagalan summary tidak merusak daftar.

### Validasi

Test komponen dan invalidasi; browser.

### Hasil dan bukti

Belum ada.

### Commit task

- Pesan: `feat(web): counts on content type tabs and status filter (CTBL-006)`
- SHA: belum dibuat
- Hook/checks: belum dijalankan
- Ledger: dicatat pada update dokumentasi berikutnya

### Blocker atau tindak lanjut

Tidak ada selain CTBL-004.

## Task: CTBL-007 — API: field tambahan per baris (tahap B)

- Status: Backlog
- Owner: agent
- Prioritas: 7
- Referensi: CTBL-US-01; P7; D6, D7
- Diperbarui: 2026-10-13
- Dependensi: CTBL-004
- Ukuran: sedang

### Ruang lingkup

`ContentPageItem` menambah field opsional `mediaState` (`none|uploading|processing|ready|failed`), `releaseYear`, `genres[]` (maks. 3), `seasonCount`, `episodeCount` melalui agregasi dalam satu query pada transaksi repeatable-read yang sama; tanpa N+1.

### Acceptance criteria

- [ ] Nilai `mediaState` konsisten dengan aturan kesiapan publikasi yang sudah ada (tidak memperkenalkan definisi baru yang berbeda).
- [ ] Field baru opsional; klien lama tidak rusak; kontrak Eden dan OpenAPI diperbarui.
- [ ] EXPLAIN pada data uji ≥ 10 ribu baris memenuhi anggaran yang disetujui (usulan p95 < 150 ms untuk 25 baris); bila tidak, subset field.

### Validasi

Test unit/HTTP, integrasi PostgreSQL, benchmark/EXPLAIN dicatat.

### Hasil dan bukti

Belum ada.

### Commit task

- Pesan: `feat(api): richer rows for admin content list (CTBL-007)`
- SHA: belum dibuat
- Hook/checks: belum dijalankan
- Ledger: dicatat pada update dokumentasi berikutnya

### Blocker atau tindak lanjut

Persetujuan daftar field dan anggaran performa (D7).

## Task: CTBL-008 — UI kolom tahap B dan kepadatan responsif

- Status: Backlog
- Owner: agent
- Prioritas: 8
- Referensi: CTBL-US-01/03; P7, P11; D6, D8
- Diperbarui: 2026-10-13
- Dependensi: CTBL-003, CTBL-007
- Ukuran: sedang

### Ruang lingkup

Kolom Readiness (teks + ikon, bukan hanya warna), genre (maks. 2 chip + "+N"), tahun rilis, ringkasan "N seasons · M episodes" untuk Series, slug sekunder di bawah judul; kartu mobile padat dengan urutan informasi yang sama.

### Acceptance criteria

- [ ] Readiness menjelaskan apa yang kurang untuk draft ("Needs video", "Processing", "Ready to publish", "Failed").
- [ ] Tidak ada teks terpotong tanpa akses penuh (title/tooltip) dan tanpa scroll horizontal pada 390 px.
- [ ] Kolom tidak mengurangi kinerja render halaman 100 baris secara nyata.

### Validasi

Test komponen; browser desktop/mobile.

### Hasil dan bukti

Belum ada.

### Commit task

- Pesan: `feat(web): readiness and metadata columns for content table (CTBL-008)`
- SHA: belum dibuat
- Hook/checks: belum dijalankan
- Ledger: dicatat pada update dokumentasi berikutnya

### Blocker atau tindak lanjut

Tidak ada selain CTBL-007.

## Task: CTBL-009 — Footer pagination ringkas dan pemulihan konteks

- Status: Backlog
- Owner: agent
- Prioritas: 9
- Referensi: CTBL-US-03; P10; D9
- Diperbarui: 2026-10-13
- Dependensi: CTBL-002
- Ukuran: kecil

### Ruang lingkup

Footer "Showing 1–10 of 28" + Prev/Next + nomor halaman dengan select "Rows" kecil (opsi Custom dihapus dari UI; URL tetap menerima `pageSize` 1–100); posisi scroll dan fokus dipulihkan saat kembali dari detail; fokus dipindah dengan wajar setelah hapus.

### Acceptance criteria

- [ ] Footer memakai ≤ 1 baris pada desktop dan ≤ 2 baris pada mobile.
- [ ] Kembali dari detail memulihkan filter, halaman dan scroll.
- [ ] Setelah hapus fokus tidak hilang ke `body`.

### Validasi

Test komponen; browser.

### Hasil dan bukti

Belum ada.

### Commit task

- Pesan: `feat(web): compact pagination and context restore for content table (CTBL-009)`
- SHA: belum dibuat
- Hook/checks: belum dijalankan
- Ledger: dicatat pada update dokumentasi berikutnya

### Blocker atau tindak lanjut

Tidak ada.

## Task: CTBL-010 — Bukti integrasi dan browser

- Status: Backlog
- Owner: agent
- Prioritas: 10
- Referensi: CTBL-US-01/02/03; plan bagian Validasi
- Diperbarui: 2026-10-13
- Dependensi: task terpilih CTBL-003–009
- Ukuran: sedang

### Ruang lingkup

Skenario browser pada database dan bucket uji (pola [DEL-007](delete-content.md)): cari → filter status → urut → buka → kembali, menu ⋯ dengan keyboard, hapus dari menu, desktop 1440 dan mobile 390, tanpa scroll horizontal, `aria-sort`, tanpa hydration warning; integrasi PostgreSQL untuk query dan index.

### Acceptance criteria

- [ ] Seluruh skenario lulus dan dicatat dengan perintah dan hasil aktual.
- [ ] Tidak ada regresi pada alur hapus, publish dan dashboard.

### Validasi

Suite integrasi API, worker browser, `bun test` web/API.

### Hasil dan bukti

Belum ada.

### Commit task

- Pesan: `test(web): prove content table UX in the browser (CTBL-010)`
- SHA: belum dibuat
- Hook/checks: belum dijalankan
- Ledger: dicatat pada update dokumentasi berikutnya

### Blocker atau tindak lanjut

Tidak ada.

## Task: CTBL-011 — Thumbnail sampul pada daftar

- Status: Backlog
- Owner: agent
- Prioritas: 11
- Referensi: CTBL-US-01; plan non-goals
- Diperbarui: 2026-10-13
- Dependensi: CTBL-008
- Ukuran: belum diperkirakan; pecah setelah keputusan

### Ruang lingkup

Pengguna mengizinkan thumbnail ditambahkan (13 Oktober 2026); dikerjakan terakhir. Rekomendasi: endpoint privat admin `GET /admin/content/:type/:id/cover` yang men-stream bytes lewat API mengikuti pola `CatalogPosterService` (tanpa URL bertanda tangan per baris), `Cache-Control: private` + ETag, `loading="lazy"`, placeholder bila belum ada sampul. Opsi URL bertanda tangan batch hanya dipertimbangkan bila streaming terbukti terlalu mahal.

### Acceptance criteria

- [ ] Pendekatan, batas ukuran/cache dan batas biaya dikonfirmasi tertulis di awal task.
- [ ] Bila disetujui: thumbnail tidak membocorkan URL privat, memuat lazy, memiliki teks alternatif dan fallback saat belum ada sampul.

### Validasi

Ditentukan setelah keputusan.

### Hasil dan bukti

Belum ada.

### Commit task

- Pesan: `feat(web): cover thumbnails in content table (CTBL-011)`
- SHA: belum dibuat
- Hook/checks: belum dijalankan
- Ledger: dicatat pada update dokumentasi berikutnya

### Blocker atau tindak lanjut

Tidak ada selain CTBL-008.

## Task: CTBL-012 — Dokumentasi dan penutupan

- Status: Backlog
- Owner: agent
- Prioritas: 12
- Referensi: CTBL-US-01/02/03
- Diperbarui: 2026-10-13
- Dependensi: CTBL-010, CTBL-011
- Ukuran: kecil

### Ruang lingkup

Perbarui runbook kontrak daftar (`docs/operations/video-metadata.md`), model/arsitektur bila field baru, `docs/README.md`, plan dan backlog; catat batas dan rollout (migrasi index).

### Acceptance criteria

- [ ] Kontrak query/respons baru dan perilaku UI terdokumentasi pada pemilik kanoniknya.
- [ ] `check-types`, `lint`, `build`, `docs:check` lulus dan hasilnya dicatat.

### Validasi

Lihat acceptance criteria.

### Hasil dan bukti

Belum ada.

### Commit task

- Pesan: `docs(web): document content table UX (CTBL-012)`
- SHA: belum dibuat
- Hook/checks: belum dijalankan
- Ledger: dicatat pada update dokumentasi berikutnya

### Blocker atau tindak lanjut

Tidak ada.
