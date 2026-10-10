# Implementation plan: Kategori konten dan halaman manajemen

## Plan metadata

- Status: **proposed** — menunggu konfirmasi asumsi dan persetujuan implementasi.
- Date: 10 Oktober 2026; decision owner: pengguna.
- Repository: `bayuaji17/vertical-movie-app`; base ref: `main`; base SHA: `acffe2dcdad62ddf003ff1ae2aa2db4ed8dce07a`.
- Context: [repository-context.md](repository-context.md).
- Backlog: [admin-categories](../../tasks/admin-categories.md), CAT-001–007 dan CAT-API-001 (di luar scope frontend).
- Terkait: [alur upload](../admin-upload-flow/implementation-plan.md) memakai picker kategori pada langkah Details.

## Objective

Admin memberi satu konten beberapa kategori dan mengelola daftar kategori dari halaman khusus, dengan frontend dibangun lebih dulu dan hanya memakai API yang sudah ada.

## Goals dan non-goals

Goals: istilah **Categories** di UI admin; halaman `/admin/categories` (daftar, pencarian, buat kategori — memakai API yang ada); picker multi-kategori yang lebih jelas dengan "buat kategori baru" inline; antarmuka rename/hapus/jumlah pemakaian yang selesai di frontend tetapi nonaktif pada runtime sampai API tersedia.

Non-goals: schema baru atau taksonomi terpisah dari genre; mengganti nama field API/DTO (`genreIds`, `/admin/genres`) atau route publik; mengubah label filter katalog publik; endpoint update/delete/count (CAT-API-001, scope tersendiri yang memerlukan persetujuan).

## Desired behavior

- **Terminologi:** semua label admin "Genres/genre" menjadi "Categories/category" (picker, detail, form, pesan error); kode dan kontrak tetap `genre`.
- **Halaman Categories:** item sidebar baru, rute `/admin/categories`; daftar kartu/baris (nama, slug, tanggal dibuat), pencarian server (`search`), Load more cursor, form "Add category" (nama; slug otomatis dengan opsi edit), state loading/kosong/error/offline, light/dark, 320–1440 px.
- **Rename/Delete:** dialog dan state (konflik, sedang dipakai, error) dibangun terhadap antarmuka `CategoriesClient`; adapter nyata saat ini melaporkan kapabilitas `canEdit=false` sehingga aksi tampil nonaktif dengan penjelasan "Editing categories isn't available yet". Test memakai adapter in-memory. Tidak ada mock aktif pada runtime, agar tidak memalsukan persistensi.
- **Picker:** multi-pilih dengan chip, pencarian, dan "Create “x”" inline yang memakai `POST /admin/genres`; pilihan dipertahankan saat pencarian berubah; batas jumlah kategori per konten mengikuti kontrak yang ada (periksa saat implementasi).
- **Kontrak CAT-API-001 (usulan, belum disetujui):** `PATCH /admin/genres/:id` (nama/slug, perlindungan konflik versi — perlu kolom versi atau `updatedAt` sebagai token), `DELETE /admin/genres/:id` (ditolak 409 bila dipakai), dan field `usageCount` pada `GET /admin/genres`.

## Impact analysis

Hanya `apps/web`. Perubahan label menyentuh banyak komponen admin dan test yang memeriksa teks "Genres"; risiko regresi test teks. Halaman baru menambah rute dan item navigasi.

## Affected files and symbols

| File                                                                                                         | Perubahan                                                      |
| ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------- |
| `components/admin/genre-picker.tsx`, `content-form.tsx`, `content-detail.tsx`, `lib/admin/content-errors.ts` | Label Categories; picker baru.                                 |
| `components/admin/admin-shell.tsx`                                                                           | Item nav Categories.                                           |
| `routes/admin._authenticated.categories.index.tsx` (baru)                                                    | Halaman daftar/buat.                                           |
| `components/admin/categories/*` (baru)                                                                       | Daftar, form, dialog rename/hapus.                             |
| `lib/admin/categories-*.ts` (baru)                                                                           | `CategoriesClient` (adapter nyata + in-memory), query options. |
| `apps/web/test/admin-categories-*.test.ts(x)` (baru)                                                         | Test perilaku.                                                 |

## Implementation DAG

CAT-001 → CAT-002; CAT-001 → CAT-003 → CAT-004 → CAT-005; CAT-003 → CAT-006; CAT-004,005,006 → CAT-007.

## Test requirements

Unit/komponen untuk klien, daftar, form, state error, picker dan dialog (adapter in-memory); regresi test form konten yang memeriksa teks genre; Eden compile check; `bun run check-types`, `lint`, `build`, `docs:check`; bukti browser untuk halaman dan picker.

## Constraints

Aturan root `AGENTS.md`; commit per task; tanpa mock aktif di runtime; tanpa perubahan API pada plan ini.

## Acceptance criteria

- [ ] UI admin memakai istilah Categories secara konsisten; kontrak API tidak berubah.
- [ ] `/admin/categories` mendaftar, mencari dan membuat kategori memakai API yang ada, dengan state error/kosong/offline.
- [ ] Aksi rename/hapus selesai sebagai UI dan teruji, tetapi nonaktif pada runtime dengan penjelasan jelas.
- [ ] Picker mendukung multi-kategori dan pembuatan inline tanpa kehilangan pilihan.
- [ ] Gates lulus dan bukti dicatat per task.

## Risks and mitigations

| Risiko                                         | Mitigasi                                                                 |
| ---------------------------------------------- | ------------------------------------------------------------------------ |
| Asumsi categories = genres keliru              | Konfirmasi sebelum CAT-001 ditutup; revisi plan bila taksonomi terpisah. |
| UI rename/hapus tampak berfungsi padahal tidak | Dinonaktifkan oleh capability flag; tanpa adapter palsu di runtime.      |
| Regresi teks test                              | Perbarui test bersama label; jalankan suite web penuh.                   |

## Rollback or recovery

Hapus rute, item nav dan komponen baru; kembalikan label. Tidak ada schema/data yang berubah.

## Open decisions (menunggu pengguna)

1. Konfirmasi: categories = genres yang ada (tanpa taksonomi baru)?
2. Label filter katalog publik tetap "Genre" atau ikut menjadi "Category"?
3. Apakah CAT-API-001 (PATCH/DELETE/usageCount) dijadwalkan setelah frontend selesai?

## Evidence

Observasi kode pada base SHA: admin genres hanya GET/POST; FK restrict; picker tanpa halaman manajemen.

## Execution log

- 10 Oktober 2026: context dan plan ditulis; status proposed.
