# Implementation plan: UI dan UX tabel Content admin

## Plan metadata

- Status: **approved** (13 Oktober 2026). Pengguna menyetujui seluruh keputusan D1–D9 beserta rekomendasi D3 (jumlah dari dashboard summary), D4 (default urutan `updated desc`), D7 (field baru dengan anggaran performa; `genres` dibuang lebih dulu bila melewati anggaran) dan thumbnail sampul CTBL-011 ("setuju semua, commit plannya, dan lakukan implementasi"). Implementasi dimulai pada branch `feat/content-table-ux`.
- Date: 13 Oktober 2026; decision owner: pengguna.
- Repository: `bayuaji17/vertical-movie-app`; base ref: `main` (lihat SHA pada context).
- Context: [repository-context.md](repository-context.md).
- Backlog: [content-table-ux](../../tasks/content-table-ux.md), CTBL-001–012.
- Branch: `feat/content-table-ux`, dibuat dari HEAD `feat/delete-draft-archived` (PR hapus konten belum di-merge karena push/PR belum diotorisasi), sehingga PR fitur ini kelak memuat commit DEL-001–008 di bawahnya; rebase ke `main` setelah PR hapus di-merge.

## Objective

Admin menemukan, memahami keadaan, dan bertindak atas konten dengan sedikit langkah: tabel menampilkan informasi yang menentukan tindakan berikutnya (status, kesiapan media, jenis, tanggal), aksi utama jelas dan aksi berisiko tidak berdekatan dengan aksi utama, filter/urutan sesuai kebutuhan admin, dan tampilan konsisten pada desktop, tablet dan mobile serta dapat dipakai dengan keyboard dan pembaca layar.

## Masalah yang diselesaikan (dari context)

| #   | Masalah                                                                       | Dampak bagi admin                                       |
| --- | ----------------------------------------------------------------------------- | ------------------------------------------------------- |
| P1  | Hingga tiga tombol per baris; Delete selalu terlihat di samping aksi utama    | Bising, risiko salah klik pada aksi destruktif          |
| P2  | Judul bukan tautan, baris tidak dapat diklik                                  | Langkah ekstra untuk membuka konten                     |
| P3  | Status hanya "Include archived"; tidak ada filter Draft/Published/Archived    | Sulit menemukan draft yang belum selesai atau arsip     |
| P4  | Tab jenis tanpa jumlah; satu jenis per tampilan                               | Harus membuka tiap tab untuk tahu isinya                |
| P5  | Urutan `createdAt` padahal kolom bernama Updated; tidak dapat diurutkan       | Item yang baru diedit tidak naik; kolom menyesatkan     |
| P6  | Pencarian hanya judul, tanpa clear dan tanpa jumlah hasil                     | Slug tidak ditemukan; sulit mengulang                   |
| P7  | Baris miskin informasi (tanpa kesiapan media, genre, tahun, jumlah season)    | "Draft" tidak menjelaskan apa yang kurang               |
| P8  | Tanggal hanya `YYYY-MM-DD` UTC                                                | Tidak tahu seberapa baru; tidak sesuai zona waktu admin |
| P9  | Skeleton berbentuk kartu pada desktop; "Refreshing" di dasar; empty tanpa CTA | Layout bergeser; jalan buntu saat daftar kosong/filter  |
| P10 | Footer pagination besar (select + input kustom)                               | Memakan layar, jarang dipakai                           |
| P11 | Mobile: filter menumpuk, kartu memuat semua aksi                              | Daftar baru terlihat setelah ±400 px                    |
| P12 | Nama aksesibel "Delete" tidak memuat judul                                    | Pembaca layar tidak dapat membedakan baris              |

## Keputusan yang diusulkan (ditandai **D**; rekomendasi di kolom pertama)

- **D1 Aksi baris: satu aksi utama + menu "⋯".** Judul menjadi tautan ke detail. Satu tombol utama per baris (Draft film/standalone: "Continue setup"; Series draft: "Manage episodes"; published/archived: "View"). Aksi sekunder — Details, Edit, Delete — berada di `DropdownMenu` (ikon `⋯`, label aksesibel "Actions for <judul>"), Delete bergaya destruktif, dipisahkan oleh separator dan menjadi item terakhir; memilihnya membuka `AlertDialog` hapus yang statenya dimiliki baris (bukan item menu). Published: item Delete nonaktif dengan alasan. _Alternatif:_ tombol terpisah (status quo, ditolak karena P1) atau klik baris tanpa menu (ditolak: aksi sekunder tidak dapat ditemukan).
- **D2 Filter status: kontrol segmented menggantikan "Include archived".** Pilihan `Active` (default; draft, published dan unpublished tanpa archived — sama dengan perilaku default sekarang), `Draft`, `Published`, `Archived`, `All` (termasuk archived). Tambah query API `status` (`active|draft|published|archived|all`); `includeArchived=true` lama tetap diterima dan dipetakan ke `status=all` sehingga URL lama tidak rusak (bila `status` juga ada, `status` menang). Series berstatus `unpublished` termasuk `Active` dan `All`, bukan `Draft`. Kontrol dipasang di baris yang sama dengan pencarian pada desktop dan masuk ke sheet "Filters" pada mobile (D8).
- **D3 Jumlah pada tab jenis dan chip status** diambil dari `GET /admin/dashboard/summary` yang sudah ada (tanpa perubahan API; badge muncul saat data tiba, tanpa memblokir daftar). Invalidate bersama `['admin', identity]` yang sudah dilakukan mutasi (publish/archive/hapus). _Alternatif:_ `facets` pada respons daftar (satu sumber dan selalu konsisten dengan filter pencarian, tetapi menambah query per permintaan) — dipilih hanya bila reuse dashboard terbukti basi/membingungkan pada pengujian.
- **D4 Urutan.** Header Title, Updated, Status dapat diurutkan (`aria-sort`, tombol di header). API menambah `sort` (`updated|created|title|status`) dan `order` (`asc|desc`), `id` sebagai tie-breaker. **Default menjadi `updated desc`** (sesuai label kolom). Ini perubahan perilaku: item yang baru dibuat tetap di atas (updatedAt = createdAt), item yang diedit/publish naik. Index baru parsial `archived_at IS NULL` untuk `(updated_at DESC, id DESC)` pada `videos`, `series` (dan `(kind, updated_at …)`); `title` memakai sort di memori halaman kecil tanpa index khusus kecuali EXPLAIN menunjukkan perlu.
- **D5 Pencarian.** Tetap debounce 300 ms; tambah tombol clear (✕), tekan `Esc` mengosongkan, `/` memfokuskan kolom cari, cocok pada judul **dan slug** (ILIKE keduanya, wildcard di-escape seperti sekarang), dan penanda jumlah hasil "N results for “…”" (live region `role=status`).
- **D6 Isi baris.** Tahap A (tanpa API baru): judul sebagai tautan + slug kecil di bawahnya, badge jenis di sel judul pada mobile, Status, Updated relatif ("2 hours ago", `title` memuat waktu lokal lengkap, `<time datetime>` tetap ISO). Tahap B (butuh API, D7): kolom **Readiness** ("Needs video", "Processing", "Ready to publish", "Failed", "Live"), genre (maks. 2 chip + "+N"), tahun rilis, dan untuk Series "N seasons · M episodes".
- **D7 Field baru API (tahap B).** `mediaState`, `releaseYear`, `genres[]` (maks. 3), `seasonCount`, `episodeCount` ditambahkan pada `ContentPageItem` melalui agregasi satu query (bukan N+1) dalam transaksi repeatable-read yang sama; seluruhnya opsional di kontrak untuk kompatibilitas klien. Wajib EXPLAIN pada data uji ≥ 10 ribu baris; bila lebih dari anggaran (usulan p95 < 150 ms untuk halaman 25 baris) turunkan ke subset field.
- **D8 Responsif.** Desktop ≥ 1024 px tabel; di bawahnya kartu padat: baris 1 judul + status, baris 2 jenis · tanggal relatif, aksi utama + `⋯`. Pada layar < 640 px pencarian tetap terlihat, sedangkan jenis/status/urutan masuk ke tombol "Filters" (badge jumlah filter aktif) yang membuka `Sheet` dari bawah dengan tombol "Apply"/"Clear all". Tanpa scroll horizontal pada 390 px.
- **D9 State dan umpan balik.** Skeleton mengikuti layout aktif (baris tabel pada desktop, kartu pada mobile) dengan jumlah = `pageSize`; refresh latar memakai `aria-busy` + baris dipudarkan (tanpa pergeseran) bukan teks di dasar; empty state: "No content yet" + tombol "Add a video", atau "No matching content" + "Clear filters"; setelah hapus, fokus dipindah ke judul halaman/baris berikutnya dan toast tetap seperti DEL-006; pagination menjadi footer ringkas "Showing 1–10 of 28" + Prev/Next + nomor halaman, dengan select "Rows" kecil di kanan; opsi "Custom" dihapus dari UI (URL tetap menerima `pageSize` 1–100).

Tidak termasuk (non-goals): aksi massal/seleksi baris, ekspor, kolom yang dapat diatur/disembunyikan pengguna, pencarian lintas jenis (satu tampilan campuran Film+Standalone+Series), perubahan alur publish/archive/hapus, dan perubahan token design system.

## Desired behavior

### Tata letak desktop (usulan)

```
Content                                                        [ Add a video ]
[ Film 12 ][ Standalone 4 ][ Series 3 ]
[🔍 Search title or slug…      ✕ ]  [ Active | Draft | Published | Archived | All ]   Sort: Updated ▾
┌───────────────────────────────────────────────────────────────────────────────┐
│ Title ▲▼                  Status        Readiness         Updated ▼     Actions │
│ Neon Garden               ● Draft       Needs video       2 hours ago  [Continue setup] ⋯ │
│  neon-garden · Drama, Sci-Fi · 2026                                                       │
│ Old Short                 ○ Archived    —                 3 days ago   [View]           ⋯ │
└───────────────────────────────────────────────────────────────────────────────┘
Showing 1–10 of 28            ‹ Prev   1  2  3  Next ›                 Rows [10 ▾]
```

### Kontrak API (tahap A/B)

- `GET /admin/content` menambah query opsional: `status`, `sort`, `order`; `search` mencocokkan judul atau slug. Tanpa parameter baru respons dan urutan harus sama seperti sebelumnya **kecuali D4 disetujui** (urutan default berubah). `includeArchived` lama tetap valid (dipetakan; bila `status` juga ada, `status` menang).
- Tahap B menambah field respons opsional (D7). `additionalProperties: false` pada query dipertahankan; unknown query tetap 422.

### URL state

`contentSearch` menormalisasi `type,search,status,sort,order,page,pageSize`; nilai default (`status=active`, `sort=updated`, `order=desc`) tidak ditulis ke URL; nilai tidak valid jatuh ke default (seperti sekarang); `includeArchived=true` lama dikonversi ke `status=all` saat dibaca. Navigasi kembali dari detail mengembalikan filter, halaman dan posisi scroll.

### Aksesibilitas

Tabel semantik dengan `aria-sort` pada header terurut; judul tautan; `⋯` bernama "Actions for <judul>"; menu dapat dioperasikan dengan keyboard (panah, Enter, Esc) dan mengembalikan fokus ke pemicunya; item Delete memuat judul dalam nama aksesibelnya di dialog; perubahan jumlah hasil/loading diumumkan lewat `role=status`; kontras status tidak hanya warna (ikon/teks); target sentuh ≥ 44 px; tidak ada informasi yang hanya muncul saat hover.

## Impact analysis

| Area                              | Perubahan                                                                                                               | Risiko                                                     |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `apps/web` komponen daftar/filter | Pecah `ContentList` menjadi baris, header terurut, filter bar, sheet filter, footer; aksi baris memakai menu            | Regresi hapus/aksi (DEL-006); test dan browser proof wajib |
| `apps/web` state URL/query        | `contentSearch`, `ContentFilters`, `contentKeys` memuat `status/sort/order`                                             | Cache key berubah; URL lama harus tetap valid              |
| `apps/api` `modules/content`      | Query `status/sort/order`, pencarian slug, field tahap B                                                                | Kontrak Eden berubah (type-only); kompatibilitas mundur    |
| Database                          | Index `updated_at` parsial untuk `videos` dan `series`; migrasi Drizzle ditinjau dan diterapkan ke database development | Biaya tulis index; produksi hanya dengan otorisasi rollout |
| Dashboard summary                 | Dipakai ulang untuk jumlah (D3)                                                                                         | Kebasian beberapa detik; invalidasi sudah ada              |
| Docs                              | `docs/operations/video-metadata.md` (kontrak daftar), `docs/README.md`, backlog                                         | —                                                          |

## Rencana kerja (backlog CTBL)

Urutan memungkinkan pengiriman bertahap; tiap task bernilai sendiri dan dicommit terpisah setelah check lulus.

1. **CTBL-001 Setujui keputusan D1–D9** (tanpa kode) dan konfirmasi default urutan (D4), sumber jumlah (D3), serta batas field tahap B (D7).
2. **CTBL-002 Perbaikan cepat tanpa API:** nama aksesibel baris (P12), skeleton sesuai layout, empty state dengan CTA/Clear filters, indikator refresh tanpa pergeseran, tanggal relatif (P8, P9). Test + render.
3. **CTBL-003 Aksi baris:** judul tautan, satu aksi utama + `DropdownMenu` `⋯`, Delete di menu dengan dialog milik baris, versi kartu mobile (P1, P2, D1).
4. **CTBL-004 API filter/urut/cari:** `status`, `sort`, `order`, pencarian slug, kompatibilitas `includeArchived`, index migrasi, test unit/HTTP/PostgreSQL (D2, D4, D5).
5. **CTBL-005 UI filter dan urutan:** segmented status, header terurut dengan `aria-sort`, clear/`/`/`Esc`, penanda jumlah hasil, normalisasi URL, sheet "Filters" mobile (D2, D4, D5, D8).
6. **CTBL-006 Jumlah pada tab dan chip** dari dashboard summary + invalidasi (D3).
7. **CTBL-007 API field tahap B:** `mediaState`, `releaseYear`, `genres`, `seasonCount`, `episodeCount` dengan agregasi satu query, EXPLAIN dan anggaran performa (D7).
8. **CTBL-008 UI kolom tahap B:** Readiness, genre, tahun, ringkasan Series; kepadatan responsif (D6, D8).
9. **CTBL-009 Footer pagination ringkas** dan pemulihan scroll/fokus setelah kembali dari detail dan setelah hapus (P10, D9).
10. **CTBL-010 Bukti integrasi dan browser:** database/bucket uji, desktop 1440 dan mobile 390, keyboard, `aria-sort`, filter/urut/cari/hapus end-to-end, tanpa scroll horizontal, tanpa hydration warning.
11. **CTBL-011 Thumbnail sampul** (pengguna mengizinkan menambahkan, 13 Oktober 2026; dikerjakan terakhir): gambar kecil di sel judul. Pendekatan yang direkomendasikan: endpoint privat admin `GET /admin/content/:type/:id/cover` yang men-stream bytes lewat API (pola `CatalogPosterService`, tanpa URL bertanda tangan per baris), `Cache-Control: private` dengan ETag, `loading="lazy"`, dan fallback placeholder saat belum ada sampul. Detail dan batas ukuran diputuskan di awal task.
12. **CTBL-012 Penutupan:** dokumentasi (runbook kontrak daftar, README), gate `check-types`, `lint`, `build`, `docs:check`, test relevan; dicatat pada task terakhir.

Dependensi: CTBL-003 dan CTBL-005 setelah CTBL-002; CTBL-005 dan CTBL-006 setelah CTBL-004 (status/urutan) sehingga tab/chip memakai kontrak final; CTBL-008 setelah CTBL-007; CTBL-010 setelah semuanya yang dipilih.

## Validasi

- Unit/komponen (`bun test`): normalisasi URL (termasuk `includeArchived` lama), pemetaan status, tanggal relatif, aksi baris dan menu (SSR render + state), empty/loading/error, header `aria-sort`.
- API: `app.handle` untuk query baru/validasi 422/kompatibilitas mundur; integrasi PostgreSQL untuk filter, urutan stabil (tie-breaker), pencarian slug dan pagination konsisten saat data berubah; EXPLAIN pada data ≥ 10 ribu baris untuk query tahap B dan sort baru.
- Browser (Playwright headless, database/bucket uji): alur cari → filter → urut → buka → kembali (filter dan scroll pulih), menu `⋯` dengan keyboard, hapus dari menu, mobile 390 px tanpa overflow, screenshot bukti di luar repo.
- Gate akhir: `bun run check-types`, `bun run lint`, `bun run build`, `bun run docs:check`.

## Rollout dan batas

Hanya perubahan lokal pada branch fitur; push/PR/merge dan migrasi produksi memerlukan otorisasi tersendiri. Index baru aman dijalankan pada development; produksi memakai prosedur migrasi yang disetujui. Perubahan default urutan (D4) diumumkan pada catatan rilis. Tidak ada perubahan data pengguna.

## Execution history

- 13 Oktober 2026: pengguna menyetujui plan; CTBL-001 selesai; implementasi dimulai dari CTBL-002.
- 13 Oktober 2026: pengguna mengizinkan thumbnail sampul masuk scope (CTBL-011, terakhir); rekomendasi D3/D4/D7 diberikan, persetujuan menunggu.
- 13 Oktober 2026: context dan plan ditulis (status proposed); menunggu keputusan pengguna atas D1–D9.
