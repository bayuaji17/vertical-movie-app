# Halaman Genres admin

> Status: implemented lokal (tanpa bukti browser), spesifikasi komponen · 10 Oktober 2026 · Keputusan pengguna pada [plan](../plans/admin-genres/implementation-plan.md#keputusan-pengguna-10-oktober-2026). Tanpa mockup raster; spesifikasi ini bukan bukti implementasi.

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

Dialog dan state dibangun terhadap `GenresClient`. Saat API belum menyediakan edit/hapus (`canEdit=false`), tombol tampil nonaktif dengan penjelasan "Editing genres isn't available yet" dan tidak memanggil API. Dialog menutup state: validasi nama/slug, konflik slug (409), genre masih dipakai (409), tidak ditemukan (404), tidak pasti (jaringan) dengan instruksi memeriksa daftar, dan tidak ada replay otomatis.

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
