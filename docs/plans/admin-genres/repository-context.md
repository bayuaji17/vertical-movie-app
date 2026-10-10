# Repository context: Genre multi-pilih dan halaman manajemen genre

## Snapshot

- Repository: `bayuaji17/vertical-movie-app`.
- Base ref: `main`; base SHA: `acffe2dcdad62ddf003ff1ae2aa2db4ed8dce07a`.
- Analyzed at: 10 Oktober 2026 (Asia/Jakarta).
- Context status: snapshot perencanaan; periksa freshness sebelum implementasi.
- Planning branch: `chore/admin-upload-flow-plan`.
- Request: pengguna menyatakan konten memiliki banyak kategori dan perlu halaman khusus untuk mengelolanya. Keputusan pengguna 10 Oktober 2026: _category_ sama dengan _genre_; tetap memakai istilah **genre**, dengan dukungan multi-genre.

## Observed state

- Backend **sudah mendukung multi-genre per konten**: `genreIds` adalah array pada metadata video dan series (maksimal 100 id berbeda, divalidasi di `content-form-state.ts` dan API), disimpan lewat relasi many-to-many `video_genres` dan `series_genres`; detail mengembalikan `effectiveGenres`. Tabel `genres`: `id`, `slug` unik, `name` ≤80, `createdAt`, `updatedAt` (tanpa `rowVersion`); FK relasi `ON DELETE RESTRICT`.
- Admin API genres hanya `GET /admin/genres` (cursor, `search`) dan `POST /admin/genres` (`name`, `slug` opsional). **Tidak ada** update, delete, atau jumlah pemakaian. Katalog publik memiliki `GET /catalog/genres` dan filter genre.
- Tidak ada halaman manajemen genre. UI hanya `components/admin/genre-picker.tsx` (pencarian, pilih, chip) pada `content-form.tsx`, memakai `genreOptions` pada `lib/admin/content-queries.ts`.
- Sidebar admin (`admin-shell.tsx`) hanya berisi Dashboard, Content, Settings.

## Constraints dari repo

- Web memakai Eden dengan kontrak API type-only; endpoint yang belum ada tidak dapat dipanggil lewat Eden bertipe.
- Perubahan API/schema memerlukan migration, tes DB dedicated dan persetujuan; plan ini tidak menyentuhnya.
- Hooks di `apps/web/src/hooks/`; tanpa edit `routeTree.gen.ts`.
