# Repository context: Kategori konten dan halaman manajemen kategori

## Snapshot

- Repository: `bayuaji17/vertical-movie-app`.
- Base ref: `main`; base SHA: `acffe2dcdad62ddf003ff1ae2aa2db4ed8dce07a`.
- Analyzed at: 10 Oktober 2026 (Asia/Jakarta).
- Context status: snapshot perencanaan; periksa freshness sebelum implementasi.
- Planning branch: `chore/admin-upload-flow-plan`.
- Request: pengguna menyatakan video akan memiliki _categories_ dengan multi-kategori per konten; bila API belum ada, cukup dibuat di frontend dahulu; dan perlu halaman khusus untuk mengelola kategori.

## Observed state

- Backend **sudah memiliki taksonomi multi-nilai** bernama _genres_: tabel `genres` (`id`, `slug` unik, `name` ≤80, `createdAt`, `updatedAt`; tanpa `rowVersion`), relasi many-to-many `video_genres` dan `series_genres` dengan FK `ON DELETE RESTRICT` (genre yang dipakai tidak dapat dihapus). Metadata video/series sudah menyimpan `genreIds` dan mengembalikan `effectiveGenres`; katalog publik memiliki `GET /catalog/genres` dan filter genre.
- Admin API genres hanya `GET /admin/genres` (cursor, `search`) dan `POST /admin/genres` (`name`, `slug` opsional). **Tidak ada** update, delete, atau jumlah pemakaian. Tidak ada UI manajemen; satu-satunya UI adalah `components/admin/genre-picker.tsx` (pencarian, pilih, chip) pada `content-form.tsx`, dengan `genreOptions` pada `lib/admin/content-queries.ts`.
- Sidebar admin (`admin-shell.tsx`) hanya berisi Dashboard, Content, Settings.
- Istilah di UI: "Genres". Tidak ada konsep "categories" terpisah pada schema atau API.

## Asumsi (menunggu konfirmasi pengguna)

_Categories_ yang dimaksud pengguna adalah taksonomi multi-nilai yang sama dengan _genres_ yang ada, sehingga tidak ada schema baru: perubahan frontend berupa istilah **Categories**, halaman manajemen, dan picker yang lebih baik. Bila yang dimaksud konsep terpisah dari genre (dua taksonomi), plan ini perlu direvisi.

## Constraints dari repo

- Web hanya memakai Eden dengan kontrak API type-only; endpoint yang belum ada tidak dapat dipanggil lewat Eden bertipe sampai API menambahkannya.
- Perubahan API/schema memerlukan migration, tes DB dedicated dan persetujuan; plan ini tidak menyentuhnya.
- Hooks di `apps/web/src/hooks/`; tanpa edit `routeTree.gen.ts`.
