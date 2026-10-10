# Modul: Genre multi-pilih dan manajemen genre

> Status: approved plan · 10 Oktober 2026 · Pengguna memutuskan category = genre; istilah genre dipertahankan. Plan: [implementation-plan](../plans/admin-genres/implementation-plan.md), context: [repository-context](../plans/admin-genres/repository-context.md).

## Tujuan modul

Admin memberi satu konten banyak genre dan mengelola daftar genre dari halaman khusus; frontend dibangun lebih dulu memakai API yang sudah ada. Referensi: PRD-03/PRD-02, GR-01/05.

## User story: GEN-US-01

Sebagai admin, saya ingin memilih beberapa genre untuk satu konten, sehingga konten mudah ditemukan.

## User story: GEN-US-02

Sebagai admin, saya ingin halaman khusus untuk melihat dan menambah genre, sehingga daftar genre rapi dan konsisten.

## Task: GEN-001 — Catat keputusan dan spesifikasi halaman Genres

- Status: Backlog
- Owner: Pengembang/agent pelaksana
- Prioritas: 1
- Referensi: GEN-US-01/02; plan Open decisions
- Diperbarui: 2026-10-10
- Dependensi: tidak ada
- Ukuran: kecil

### Ruang lingkup

Catat keputusan pengguna (category = genre, istilah genre dipertahankan, GEN-API-001 setelah frontend); tulis spesifikasi halaman Genres (`docs/design/admin-genres.md`).

### Acceptance criteria

- [ ] Keputusan dicatat dengan pemberi persetujuan dan tanggal (plan, 10 Oktober 2026).
- [ ] Spesifikasi desain halaman dan picker disetujui.

### Validasi

`bun run docs:check`.

### Hasil dan bukti

Belum dikerjakan.

### Commit task

- Pesan: docs(web): specify admin genres (GEN-001)
- SHA: belum dibuat

### Blocker atau tindak lanjut

Tidak ada.

## Task: GEN-002 — GenresClient dan query options

- Status: Backlog
- Owner: Pengembang/agent pelaksana
- Prioritas: 3
- Referensi: GEN-US-02
- Diperbarui: 2026-10-10
- Dependensi: GEN-001
- Ukuran: sedang

### Ruang lingkup

Antarmuka `GenresClient` (`list`, `create`, `update`, `remove`, `canEdit`), adapter nyata atas Eden (list/create; `canEdit=false`) dan adapter in-memory untuk test; query keys dan invalidation discope identity admin.

### Acceptance criteria

- [ ] list/create memakai `GET/POST /admin/genres` dengan validasi respons.
- [ ] Adapter nyata tidak memanggil endpoint yang belum ada; `canEdit=false`.
- [ ] Cache privat dihapus saat auth loss.

### Validasi

Test klien dan cache; Eden compile.

### Hasil dan bukti

Belum dikerjakan.

### Commit task

- Pesan: feat(web): add GenresClient and queries (GEN-002)
- SHA: belum dibuat

### Blocker atau tindak lanjut

update/remove menunggu GEN-API-001.

## Task: GEN-003 — Halaman Genres: daftar, cari, tambah

- Status: Backlog
- Owner: Pengembang/agent pelaksana
- Prioritas: 4
- Referensi: GEN-US-02
- Diperbarui: 2026-10-10
- Dependensi: GEN-002
- Ukuran: sedang

### Ruang lingkup

Rute `/admin/genres`, item sidebar, daftar dengan pencarian server dan Load more, form Add genre (slug otomatis), state loading/kosong/error/offline, responsif light/dark.

### Acceptance criteria

- [ ] Admin dapat mencari dan menambah genre; duplikat slug ditampilkan jelas.
- [ ] Item nav aktif dan rute terlindungi guard admin.
- [ ] Responsif 320–1440 px Light/Dark.

### Validasi

Test komponen; browser bila runner tersedia.

### Hasil dan bukti

Belum dikerjakan.

### Commit task

- Pesan: feat(web): add admin genres page (GEN-003)
- SHA: belum dibuat

### Blocker atau tindak lanjut

Tidak ada.

## Task: GEN-004 — Dialog rename dan hapus (nonaktif sampai API)

- Status: Backlog
- Owner: Pengembang/agent pelaksana
- Prioritas: 5
- Referensi: GEN-US-02
- Diperbarui: 2026-10-10
- Dependensi: GEN-003
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

- Pesan: feat(web): add genre rename and delete dialogs (GEN-004)
- SHA: belum dibuat

### Blocker atau tindak lanjut

Aktif setelah GEN-API-001.

## Task: GEN-005 — Picker multi-genre

- Status: Backlog
- Owner: Pengembang/agent pelaksana
- Prioritas: 6
- Referensi: GEN-US-01
- Diperbarui: 2026-10-10
- Dependensi: GEN-002
- Ukuran: sedang

### Ruang lingkup

Perbarui `genre-picker.tsx`: multi-pilih dengan chip, pencarian, buat genre baru inline (`POST /admin/genres`), pilihan dipertahankan lintas pencarian dan error.

### Acceptance criteria

- [ ] Banyak genre dapat dipilih/dilepas; pilihan bertahan saat pencarian berubah.
- [ ] Buat genre inline menambah opsi dan memilihnya; error tidak menghapus pilihan.

### Validasi

Test picker; regresi form konten.

### Hasil dan bukti

Belum dikerjakan.

### Commit task

- Pesan: feat(web): improve genre picker (GEN-005)
- SHA: belum dibuat

### Blocker atau tindak lanjut

Digunakan juga oleh langkah Details (UFLOW-003).

## Task: GEN-006 — Bukti browser dan closure dokumen

- Status: Backlog
- Owner: Pengembang/agent pelaksana
- Prioritas: 7
- Referensi: plan
- Diperbarui: 2026-10-10
- Dependensi: GEN-003, GEN-004, GEN-005
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

- Pesan: docs(web): close admin genres (GEN-006)
- SHA: belum dibuat

### Blocker atau tindak lanjut

Tidak ada.

## Task: GEN-API-001 — (Di luar scope frontend) PATCH/DELETE/usageCount pada genres

- Status: Backlog
- Owner: Pengembang/agent pelaksana
- Prioritas: 8
- Referensi: plan Open decisions
- Diperbarui: 2026-10-10
- Dependensi: GEN-006 (dikerjakan setelah frontend selesai, sesuai keputusan pengguna)
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

- Pesan: feat(api): manage genres (GEN-API-001)
- SHA: belum dibuat

### Blocker atau tindak lanjut

Menunggu keputusan pengguna.
