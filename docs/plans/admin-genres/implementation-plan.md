# Implementation plan: Genre multi-pilih dan halaman manajemen genre

## Plan metadata

- Status: **approved plan** (pengguna, 10 Oktober 2026); implementasi belum dimulai.
- Date: 10 Oktober 2026; decision owner: pengguna.
- Repository: `bayuaji17/vertical-movie-app`; base ref: `main`; base SHA: `acffe2dcdad62ddf003ff1ae2aa2db4ed8dce07a`.
- Context: [repository-context.md](repository-context.md).
- Backlog: [admin-genres](../../tasks/admin-genres.md), GEN-001–006 dan GEN-API-001 (di luar scope frontend).
- Terkait: [alur upload](../admin-upload-flow/implementation-plan.md) memakai picker genre pada langkah Details.

## Objective

Admin memberi satu konten beberapa genre dan mengelola daftar genre dari halaman khusus, dengan frontend dibangun lebih dulu dan hanya memakai API yang sudah ada.

## Keputusan pengguna (10 Oktober 2026)

1. Kategori = genre; istilah **genre** dipertahankan di seluruh UI (admin dan publik); tidak ada rename ke "category".
2. Konten mendukung multi-genre (sudah didukung API dan form; plan memastikan UX-nya jelas).
3. Endpoint edit/hapus/usageCount (GEN-API-001) dikerjakan **setelah frontend selesai**, karena API genres hanya list dan create.

## Goals dan non-goals

Goals: halaman `/admin/genres` (daftar, pencarian, buat genre — memakai API yang ada); picker multi-genre yang lebih jelas dengan "buat genre baru" inline; antarmuka rename/hapus yang selesai di frontend tetapi nonaktif pada runtime sampai API tersedia.

Non-goals: istilah "category", schema baru, perubahan DTO/route publik, endpoint update/delete/count (GEN-API-001 dikerjakan setelah frontend selesai dan memerlukan kontrak/migration yang disetujui).

## Desired behavior

- **Halaman Genres:** item sidebar baru, rute `/admin/genres`; daftar (nama, slug, tanggal dibuat), pencarian server (`search`), Load more cursor, form "Add genre" (nama; slug otomatis dengan opsi edit), state loading/kosong/error/offline, light/dark, 320–1440 px.
- **Rename/Delete:** dialog dan state (konflik, sedang dipakai, error) dibangun terhadap antarmuka `GenresClient`; adapter nyata melaporkan `canEdit=false` sehingga aksi tampil nonaktif dengan penjelasan "Editing genres isn't available yet". Test memakai adapter in-memory. Tidak ada mock aktif pada runtime, agar tidak memalsukan persistensi.
- **Picker multi-genre:** multi-pilih dengan chip, pencarian, "Create “x”" inline (`POST /admin/genres`); pilihan dipertahankan saat pencarian berubah; batas 100 genre berbeda dengan pesan jelas; jumlah terpilih terlihat.
- **Kontrak GEN-API-001 (usulan, belum disetujui):** `PATCH /admin/genres/:id` (nama/slug dengan token konflik), `DELETE /admin/genres/:id` (409 bila dipakai), `usageCount` pada list.

## Impact analysis

Hanya `apps/web`. Halaman baru menambah rute dan item navigasi; picker dipakai form konten dan langkah Details alur upload.

## Affected files and symbols

| File                                                  | Perubahan                                                  |
| ----------------------------------------------------- | ---------------------------------------------------------- |
| `components/admin/genre-picker.tsx`                   | Picker multi-genre baru.                                   |
| `components/admin/admin-shell.tsx`                    | Item nav Genres.                                           |
| `routes/admin._authenticated.genres.index.tsx` (baru) | Halaman daftar/buat.                                       |
| `components/admin/genres/*` (baru)                    | Daftar, form, dialog rename/hapus.                         |
| `lib/admin/genres-*.ts` (baru)                        | `GenresClient` (adapter nyata + in-memory), query options. |
| `apps/web/test/admin-genres-*.test.ts(x)` (baru)      | Test perilaku.                                             |

## Implementation DAG

GEN-001 → GEN-002 → GEN-003 → GEN-004; GEN-002 → GEN-005; GEN-003,004,005 → GEN-006.

## Test requirements

Unit/komponen untuk klien, daftar, form, state error, picker dan dialog (adapter in-memory); regresi test form konten; Eden compile check; `bun run check-types`, `lint`, `build`, `docs:check`; bukti browser untuk halaman dan picker.

## Constraints

Aturan root `AGENTS.md`; commit per task; tanpa mock aktif di runtime; tanpa perubahan API pada plan ini.

## Acceptance criteria

- [ ] `/admin/genres` mendaftar, mencari dan membuat genre memakai API yang ada, dengan state error/kosong/offline.
- [ ] Aksi rename/hapus selesai sebagai UI dan teruji, tetapi nonaktif pada runtime dengan penjelasan jelas.
- [ ] Picker mendukung multi-genre dan pembuatan inline tanpa kehilangan pilihan; batas 100 jelas.
- [ ] Kontrak API dan istilah "genre" tidak berubah.
- [ ] Gates lulus dan bukti dicatat per task.

## Risks and mitigations

| Risiko                                                | Mitigasi                                                            |
| ----------------------------------------------------- | ------------------------------------------------------------------- |
| UI rename/hapus tampak berfungsi padahal tidak        | Dinonaktifkan oleh capability flag; tanpa adapter palsu di runtime. |
| Picker salah menghapus pilihan saat pencarian berubah | State pilihan terpisah dari hasil pencarian; test eksplisit.        |

## Rollback or recovery

Hapus rute, item nav dan komponen baru; kembalikan picker lama. Tidak ada schema/data yang berubah.

## Evidence

Observasi kode pada base SHA: admin genres hanya GET/POST; multi-genre sudah didukung (`genreIds`, ≤100); picker tanpa halaman manajemen.

## Execution log

- 10 Oktober 2026: context dan plan ditulis. Pengguna memutuskan categories = genres, istilah genre dipertahankan, GEN-API-001 setelah frontend; plan approved.
