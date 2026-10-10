# Modul: Kategori konten dan manajemen kategori

> Status: proposed · 10 Oktober 2026 · Menunggu konfirmasi asumsi (categories = genres yang ada). Plan: [implementation-plan](../plans/admin-categories/implementation-plan.md), context: [repository-context](../plans/admin-categories/repository-context.md).

## Tujuan modul

Admin memberi satu konten banyak kategori dan mengelola daftar kategori dari halaman khusus; frontend dibangun lebih dulu memakai API yang sudah ada. Referensi: PRD-03/PRD-02, GR-01/05.

## User story: CAT-US-01

Sebagai admin, saya ingin memilih beberapa kategori untuk satu konten, sehingga konten mudah ditemukan.

## User story: CAT-US-02

Sebagai admin, saya ingin halaman khusus untuk melihat dan menambah kategori, sehingga daftar kategori rapi dan konsisten.

## Task: CAT-001 — Konfirmasi asumsi dan spesifikasi halaman

- Status: Backlog
- Owner: Pengembang/agent pelaksana
- Prioritas: 1
- Referensi: CAT-US-01/02; plan Open decisions
- Diperbarui: 2026-10-10
- Dependensi: tidak ada
- Ukuran: kecil

### Ruang lingkup

Konfirmasi categories = genres, label filter publik, dan jadwal CAT-API-001; tulis spesifikasi halaman Categories (`docs/design/admin-categories.md`).

### Acceptance criteria

- [ ] Tiga keputusan terbuka dicatat dengan pemberi persetujuan dan tanggal.
- [ ] Spesifikasi desain halaman dan picker disetujui.

### Validasi

`bun run docs:check`.

### Hasil dan bukti

Belum dikerjakan.

### Commit task

- Pesan: docs(web): specify admin categories (CAT-001)
- SHA: belum dibuat

### Blocker atau tindak lanjut

Menunggu pengguna.

## Task: CAT-002 — Istilah Categories pada UI admin

- Status: Backlog
- Owner: Pengembang/agent pelaksana
- Prioritas: 2
- Referensi: CAT-US-01
- Diperbarui: 2026-10-10
- Dependensi: CAT-001
- Ukuran: sedang

### Ruang lingkup

Ganti label Genres/genre → Categories/category pada picker, form, detail, pesan error dan test; kontrak API dan nama kode tetap.

### Acceptance criteria

- [ ] Tidak ada label "Genre" tersisa di UI admin; DTO/API tidak berubah.
- [ ] Test yang memeriksa teks diperbarui dan lulus.

### Validasi

Suite web penuh, tsc, lint.

### Hasil dan bukti

Belum dikerjakan.

### Commit task

- Pesan: refactor(web): rename genres to categories in admin UI (CAT-002)
- SHA: belum dibuat

### Blocker atau tindak lanjut

Filter katalog publik tidak termasuk.

## Task: CAT-003 — CategoriesClient dan query options

- Status: Backlog
- Owner: Pengembang/agent pelaksana
- Prioritas: 3
- Referensi: CAT-US-02
- Diperbarui: 2026-10-10
- Dependensi: CAT-001
- Ukuran: sedang

### Ruang lingkup

Antarmuka `CategoriesClient` (`list`, `create`, `update`, `remove`, `canEdit`), adapter nyata atas Eden (list/create; `canEdit=false`) dan adapter in-memory untuk test; query keys dan invalidation discope identity admin.

### Acceptance criteria

- [ ] list/create memakai `GET/POST /admin/genres` dengan validasi respons.
- [ ] Adapter nyata tidak memanggil endpoint yang belum ada; `canEdit=false`.
- [ ] Cache privat dihapus saat auth loss.

### Validasi

Test klien dan cache; Eden compile.

### Hasil dan bukti

Belum dikerjakan.

### Commit task

- Pesan: feat(web): add categories client and queries (CAT-003)
- SHA: belum dibuat

### Blocker atau tindak lanjut

update/remove menunggu CAT-API-001.

## Task: CAT-004 — Halaman Categories: daftar, cari, tambah

- Status: Backlog
- Owner: Pengembang/agent pelaksana
- Prioritas: 4
- Referensi: CAT-US-02
- Diperbarui: 2026-10-10
- Dependensi: CAT-003
- Ukuran: sedang

### Ruang lingkup

Rute `/admin/categories`, item sidebar, daftar dengan pencarian server dan Load more, form Add category (slug otomatis), state loading/kosong/error/offline, responsif light/dark.

### Acceptance criteria

- [ ] Admin dapat mencari dan menambah kategori; duplikat slug ditampilkan jelas.
- [ ] Item nav aktif dan rute terlindungi guard admin.
- [ ] Responsif 320–1440 px Light/Dark.

### Validasi

Test komponen; browser bila runner tersedia.

### Hasil dan bukti

Belum dikerjakan.

### Commit task

- Pesan: feat(web): add admin categories page (CAT-004)
- SHA: belum dibuat

### Blocker atau tindak lanjut

Tidak ada.

## Task: CAT-005 — Dialog rename dan hapus (nonaktif sampai API)

- Status: Backlog
- Owner: Pengembang/agent pelaksana
- Prioritas: 5
- Referensi: CAT-US-02
- Diperbarui: 2026-10-10
- Dependensi: CAT-004
- Ukuran: sedang

### Ruang lingkup

UI rename/hapus dengan state konflik, sedang dipakai, error; tampil nonaktif dengan penjelasan saat `canEdit=false`; diuji dengan adapter in-memory.

### Acceptance criteria

- [ ] Dialog dan state teruji dengan adapter in-memory.
- [ ] Pada runtime aksi nonaktif dan tidak memanggil API.

### Validasi

Test komponen dan state.

### Hasil dan bukti

Belum dikerjakan.

### Commit task

- Pesan: feat(web): add category rename and delete dialogs (CAT-005)
- SHA: belum dibuat

### Blocker atau tindak lanjut

Aktif setelah CAT-API-001.

## Task: CAT-006 — Picker multi-kategori

- Status: Backlog
- Owner: Pengembang/agent pelaksana
- Prioritas: 6
- Referensi: CAT-US-01
- Diperbarui: 2026-10-10
- Dependensi: CAT-003
- Ukuran: sedang

### Ruang lingkup

Perbarui `genre-picker.tsx`: multi-pilih dengan chip, pencarian, buat kategori baru inline (`POST /admin/genres`), pilihan dipertahankan lintas pencarian dan error.

### Acceptance criteria

- [ ] Banyak kategori dapat dipilih/dilepas; pilihan bertahan saat pencarian berubah.
- [ ] Buat kategori inline menambah opsi dan memilihnya; error tidak menghapus pilihan.

### Validasi

Test picker; regresi form konten.

### Hasil dan bukti

Belum dikerjakan.

### Commit task

- Pesan: feat(web): improve category picker (CAT-006)
- SHA: belum dibuat

### Blocker atau tindak lanjut

Digunakan juga oleh langkah Details (UFLOW-003).

## Task: CAT-007 — Bukti browser dan closure dokumen

- Status: Backlog
- Owner: Pengembang/agent pelaksana
- Prioritas: 7
- Referensi: plan
- Diperbarui: 2026-10-10
- Dependensi: CAT-004, CAT-005, CAT-006
- Ukuran: kecil

### Ruang lingkup

Bukti browser halaman dan picker; perbarui plan, backlog, desain, `docs/README.md`.

### Acceptance criteria

- [ ] Bukti dicatat atau batas diuji dicatat apa adanya; `docs:check` lulus.

### Validasi

Smoke browser; `bun run docs:check`.

### Hasil dan bukti

Belum dikerjakan.

### Commit task

- Pesan: docs(web): close admin categories (CAT-007)
- SHA: belum dibuat

### Blocker atau tindak lanjut

Tidak ada.

## Task: CAT-API-001 — (Di luar scope frontend) PATCH/DELETE/usageCount pada genres

- Status: Backlog
- Owner: Pengembang/agent pelaksana
- Prioritas: 8
- Referensi: plan Open decisions
- Diperbarui: 2026-10-10
- Dependensi: CAT-001
- Ukuran: sedang; API + migration

### Ruang lingkup

Usulan: `PATCH /admin/genres/:id`, `DELETE /admin/genres/:id` (409 bila dipakai), `usageCount` pada list; perlu versi/token konflik. **Belum disetujui; tidak dikerjakan oleh plan frontend.**

### Acceptance criteria

- [ ] Kontrak disetujui pengguna sebelum implementasi.

### Validasi

Tes API bun:test, migration/preservation bila schema berubah.

### Hasil dan bukti

Belum dikerjakan.

### Commit task

- Pesan: feat(api): manage genres (CAT-API-001)
- SHA: belum dibuat

### Blocker atau tindak lanjut

Menunggu keputusan pengguna.
