# Halaman Genres admin

> Status: implemented lokal termasuk rename/hapus (tanpa bukti browser), spesifikasi komponen · 10 Oktober 2026 · Keputusan pengguna pada [plan](../plans/admin-genres/implementation-plan.md#keputusan-pengguna-10-oktober-2026). Tanpa mockup raster; spesifikasi ini bukan bukti implementasi.

Rute `/admin/genres` memakai admin shell yang ada (Rhea, Light/Dark/System). Item sidebar "Genres" (ikon tag) berada setelah Content dan sebelum Settings, juga pada drawer mobile.

## Halaman

| Bagian    | Isi                                                                                                         |
| --------- | ----------------------------------------------------------------------------------------------------------- |
| Heading   | `Genres` dan deskripsi "Organize content with genres. A video or series can have several."                  |
| Add genre | Kartu form: Name (wajib, 1–80), Slug (opsional, terisi otomatis dari nama, dapat diedit), tombol Add genre. |
| Pencarian | Input search (debounce 300 ms) memfilter di server; status hasil dibacakan.                                 |
| Daftar    | Baris: nama, slug, tanggal dibuat (UTC); aksi Rename dan Delete.                                            |
| Load more | Cursor server, tombol "Load more genres"; baris sudah dimuat dipertahankan saat gagal.                      |

## Aksi Rename dan Delete

Rename dan Delete memakai `PATCH/DELETE /admin/genres/:id` (GEN-API-001). Setiap baris menampilkan "Used by N items" atau "Not used yet"; Delete nonaktif bila genre dipakai konten (API tetap menolak dengan 409). Rename mengirim token `expectedUpdatedAt` dari baris yang dibaca; konflik versi, slug bentrok, genre dipakai, tidak ditemukan dan hasil tidak pasti punya pesan sendiri tanpa replay otomatis.

## State

| State             | Perilaku                                                                                 |
| ----------------- | ---------------------------------------------------------------------------------------- |
| Loading           | Skeleton baris.                                                                          |
| Kosong            | "No genres yet" dengan ajakan menambah genre; hasil pencarian kosong: "No genres match". |
| Error baca        | Alert dengan Retry; baris yang sudah dimuat tetap.                                       |
| Offline           | Banner offline; Add/search/Load more nonaktif.                                           |
| Menambah          | Form terkunci; duplikat dicegah; sukses → toast, daftar segar, fokus kembali ke Name.    |
| Slug bentrok      | Pesan di field Slug; input dipertahankan.                                                |
| Hasil tidak pasti | Pesan "Could not confirm" dan instruksi memeriksa daftar sebelum menambah lagi.          |
| Auth hilang       | Query/mutation privat dihapus oleh mekanisme yang ada; layout menangani login.           |

## Picker genre (form konten dan langkah Details)

Multi-pilih: kotak cari, chip genre terpilih (hapus dengan tombol), daftar centang, penghitung "N selected · up to 100", "Load more", dan **Create “x”** inline yang memakai `POST /admin/genres` lalu langsung memilihnya. Pilihan dipertahankan saat pencarian berubah atau muat gagal. Batas 100 genre berbeda menonaktifkan opsi tambahan dengan pesan jelas.

## Tata letak dan aksesibilitas

Satu kolom pada 320–767 px; pada ≥1024 px form Add genre di samping daftar. Token semantik; target ≥44 px; label terkait input; error lewat `aria-describedby`; area status `role="status"`; fokus terlihat; tanpa overflow horizontal; teks membungkus (`break-words`).
