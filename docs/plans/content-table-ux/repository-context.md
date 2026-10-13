# Repository context: UI dan UX tabel Content admin

## Snapshot

- Repository: `bayuaji17/vertical-movie-app`.
- Base ref: `main`; SHA yang diperiksa: `15000fa` (HEAD branch `feat/delete-draft-archived`, yang memuat fitur hapus konten DEL-001–008 yang belum di-merge).
- Analyzed at: 13 Oktober 2026 (Asia/Jakarta).
- Context status: snapshot perencanaan pada SHA di atas; periksa freshness (terutama bila PR hapus konten sudah di-merge atau `content-list.tsx` berubah) sebelum implementasi.
- Request: pengguna meminta peningkatan UI dan UX untuk tabel Content dan meminta plan-nya (13 Oktober 2026). Belum ada keputusan desain dari pengguna.

## Observed behavior

Daftar Content berada di `/admin/content` ([route](../../../apps/web/src/routes/admin._authenticated.content.index.tsx), [ContentList](../../../apps/web/src/components/admin/content-list.tsx)). Hasil pemeriksaan kode dan screenshot browser pada fixture lokal (desktop 1440 px dan mobile 390 px, 13 Oktober 2026):

1. **Satu jenis konten per tampilan.** `ToggleGroup` Film/Standalone/Series memilih `type`; endpoint `GET /admin/content` menerima tepat satu `type`. Tab tidak menampilkan jumlah, jadi admin tidak tahu apakah Series atau Standalone berisi sesuatu tanpa membukanya.
2. **Filter status hanya berupa kotak centang "Include archived".** Default menyembunyikan archived; mencentangnya menambah archived ke campuran draft/published. Tidak ada cara melihat hanya Draft, hanya Published, atau hanya Archived. Dashboard sudah menghitung `draft/published/archived/unpublished` per jenis (`DashboardSummaryDto`), tetapi daftar tidak memakainya.
3. **Urutan tetap dan tidak jujur.** Repository mengurutkan `createdAt DESC, id DESC` (`modules/content/repository.ts`), sedangkan kolom yang tampil bernama **Updated**. Tidak ada kolom yang dapat diurutkan. Index admin hanya untuk `created_at` (`videos_admin_list_idx`, `videos_kind_list_idx`, `series_admin_list_idx`), parsial `archived_at IS NULL`.
4. **Pencarian hanya pada judul** (`ilike` pada `title`); slug tidak ikut dicari, tidak ada tombol hapus (clear), tidak ada penanda jumlah hasil selain teks pagination.
5. **Kolom miskin informasi.** Baris memuat Title, Type, Status, Updated (potongan `updatedAt.slice(0,10)`, tanggal UTC tanpa jam). Tidak ada: sampul, slug, tahun rilis, genre, jumlah season/episode untuk Series, dan keadaan media/kesiapan publish. Badge "Draft" tidak menjelaskan apa yang kurang. `next-step.ts` mengakui hal ini ("Per-item media progress would need an API field"). Tipe `ContentPageItem` hanya berisi `type,id,title,slug,publicationStatus,archivedAt,createdAt,updatedAt,rowVersion`.
6. **Kolom Actions berat.** Hingga tiga tombol per baris dalam satu sel: "Continue setup" (isi lime), "Details" (ghost), dan "Delete" (destruktif, selalu terlihat) — `ContentNextStep` + `DeleteContent compact`. Tombol destruktif bersebelahan dengan aksi utama, dan pada kartu mobile ketiganya membungkus ke beberapa baris. Judul bukan tautan dan baris tidak dapat diklik; membuka detail memerlukan tombol "Details".
7. **Nama aksesibel tidak membedakan baris.** Tombol hapus kompak berlabel hanya "Delete" (`delete-content.tsx`: `Delete {compact ? '' : label}`), tanpa judul seperti yang dilakukan "Details"/"Continue setup" lewat `sr-only`. Pembaca layar dan test harus bergantung pada urutan DOM.
8. **State loading/empty tidak setara dengan hasil.** Skeleton selalu tiga blok `h-32` (bentuk kartu) walau tampilan desktop berupa tabel, sehingga layout bergeser saat data tiba. "Refreshing content..." muncul sebagai teks di bawah halaman. Empty state tidak punya CTA ("Add a video") maupun "Clear filters" ketika pencarian kosong.
9. **Kontrol pagination memakan ruang.** Blok "Rows per page" (select 10/25/50/100/Custom + input kustom + tombol) berada di bawah daftar dan lebih besar dari tabel kecil; `ContentPagination` 150 baris.
10. **Mobile menduplikasi isi tabel.** Tampilan `lg:hidden` merender kartu dengan seluruh aksi; filter (tab, pencarian, checkbox) menumpuk di atas sehingga daftar baru muncul setelah sekitar 400 px.
11. **Yang sudah baik dan harus dipertahankan:** filter/halaman ada di URL (`contentSearch` memvalidasi dan `replace` pada perubahan search); debounce pencarian 300 ms; `ToggleGroup`/target sentuh 44 px; query cache `privateRead` dengan `staleTime` 15 detik dan invalidasi `['admin', identity]` setelah mutasi; penyesuaian halaman bila halaman terakhir menyusut; alert error dengan "Try again"; `TableCaption` sr-only.

## Repository map (bagian relevan)

| Area                                                                                     | Peran                                                                                             |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `apps/web/src/components/admin/content-{list,filters,pagination,next-step,status}.tsx`   | Tampilan daftar, filter, pagination, aksi baris, badge status.                                    |
| `apps/web/src/components/admin/delete-content.tsx`, `lib/admin/delete-state.ts`          | Tombol/dialog hapus (DEL-006); dipakai juga di detail, episode, season.                           |
| `apps/web/src/lib/admin/content-{client,queries,list-state}.ts`, `next-step.ts`          | Klien Eden, query/cache, normalisasi search URL, aturan langkah berikutnya.                       |
| `apps/web/src/components/ui/{table,dropdown-menu,sheet,toggle-group,empty,skeleton}.tsx` | Primitif yang tersedia (Base UI/shadcn); `dropdown-menu` dan `sheet` sudah dipakai di shell/tema. |
| `apps/web/test/admin-content-list.test.ts`, `admin-content-browser-worker.mjs`           | Test state daftar dan skenario browser yang ada.                                                  |
| `apps/api/src/modules/content/{model,repository,service,index}.ts`                       | Kontrak `GET /admin/content`, query repeatable-read (count + halaman), validasi.                  |
| `apps/api/src/db/schema/{videos,series}.ts`, `apps/api/drizzle/`                         | Index list; migrasi Drizzle.                                                                      |
| `apps/api/src/modules/dashboard/*`                                                       | Hitungan per jenis/status (kandidat sumber badge jumlah) dan agregasi media.                      |
| `docs/design/design-system.md`, `docs/operations/video-metadata.md`                      | Sistem desain dan runbook kontrak daftar.                                                         |

## Constraints dari repo

- Eden Treaty type-only; perubahan kontrak API wajib memakai TypeBox di `model.ts`, method chaining Elysia, dan test HTTP `app.handle` (lihat [panduan API](../../guides/api-development.md)). Query lama (`type,page,pageSize,search,includeArchived`) dipakai oleh URL yang mungkin sudah di-bookmark; perubahan harus kompatibel mundur.
- Schema/index baru memerlukan migrasi Drizzle yang ditinjau dan diterapkan ke database development dengan `bun run --cwd apps/api db:migrate`; migrasi produksi memerlukan otorisasi rollout. Integration test memakai database uji khusus.
- UI berbahasa Inggris, target sentuh ≥ 44 px, kontras/focus ring dari design system, tanpa dependensi UI baru bila primitif yang ada cukup. Hook standalone di `apps/web/src/hooks/use-*.ts` (lihat AGENTS.md).
- Menu aksi yang membuka dialog (hapus) harus mengendalikan state dialog di luar item menu agar dialog tidak ikut tertutup/terlepas saat menu menutup.
- URL playback/poster bertanda tangan kedaluwarsa; thumbnail sampul di admin berarti URL bertanda tangan per baris (biaya, keamanan, cache) dan harus diputuskan terpisah.
- Evidence browser: Playwright headless di luar repo dengan `LD_LIBRARY_PATH` (lihat backlog DEL-007) dan database/bucket uji khusus; jangan memakai data development pengguna.

## Gaps, risks, dan pertanyaan terbuka

- Sumber data jumlah per jenis/status: reuse `GET /admin/dashboard/summary` (tanpa perubahan API, tetapi cache dan kebasian terpisah) atau menambahkan `facets` ke respons daftar (satu sumber, lebih mahal).
- Field baru per baris (genre, tahun rilis, jumlah season/episode, keadaan media) membutuhkan join/agregasi; risiko N+1 dan biaya pada transaksi repeatable-read. Perlu EXPLAIN pada data realistis (≥ 10 ribu baris) sebelum disetujui.
- Mengganti urutan default dari `created` ke `updated` mengubah perilaku yang sudah ada dan memengaruhi posisi item baru; perlu persetujuan eksplisit.
- Aksi massal (arsip/hapus banyak) sering diminta pada tabel admin tetapi bukan bagian permintaan ini; hapus massal punya risiko tersendiri (lihat non-goals plan hapus).
- `docs/design` memiliki perubahan lokal yang belum di-commit (design system v2–v4); keputusan visual memakai token yang sudah ada, bukan perubahan desain sistem.
