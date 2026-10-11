# Modul: Genre multi-pilih dan manajemen genre

> Status: GEN-001–007 dan GEN-API-001 Done lokal (10 Oktober 2026); rename/hapus genre aktif (API + frontend); belum dibuktikan di browser. Plan: [implementation-plan](../plans/admin-genres/implementation-plan.md), context: [repository-context](../plans/admin-genres/repository-context.md), desain: [admin-genres](../design/admin-genres.md).

## Tujuan modul

Admin memberi satu konten banyak genre dan mengelola daftar genre dari halaman khusus; frontend dibangun lebih dulu memakai API yang sudah ada. Referensi: PRD-03/PRD-02, GR-01/05.

## User story: GEN-US-01

Sebagai admin, saya ingin memilih beberapa genre untuk satu konten, sehingga konten mudah ditemukan.

## User story: GEN-US-02

Sebagai admin, saya ingin halaman khusus untuk melihat dan menambah genre, sehingga daftar genre rapi dan konsisten.

## Task: GEN-001 — Catat keputusan dan spesifikasi halaman Genres

- Status: Done
- Owner: Pengembang/agent pelaksana
- Prioritas: 1
- Referensi: GEN-US-01/02; plan Open decisions
- Diperbarui: 2026-10-10
- Dependensi: tidak ada
- Ukuran: kecil

### Ruang lingkup

Catat keputusan pengguna (category = genre, istilah genre dipertahankan, GEN-API-001 setelah frontend); tulis spesifikasi halaman Genres (`docs/design/admin-genres.md`).

### Acceptance criteria

- [x] Keputusan dicatat dengan pemberi persetujuan dan tanggal (plan, 10 Oktober 2026).
- [x] Spesifikasi desain halaman dan picker disetujui.

### Validasi

`bun run docs:check`.

### Hasil dan bukti

10 Oktober 2026: `docs/design/admin-genres.md` ditulis dan diindeks; keputusan pengguna (category = genre, istilah genre dipertahankan, GEN-API-001 setelah frontend) tercatat pada plan. `docs:check` lulus.

### Commit task

- Pesan: docs(web): specify admin genres (GEN-001)
- SHA: 1ee7fe6

### Blocker atau tindak lanjut

Tidak ada.

## Task: GEN-002 — GenresClient dan query options

- Status: Done
- Owner: Pengembang/agent pelaksana
- Prioritas: 3
- Referensi: GEN-US-02
- Diperbarui: 2026-10-10
- Dependensi: GEN-001
- Ukuran: sedang

### Ruang lingkup

Antarmuka `GenresClient` (`list`, `create`, `update`, `remove`, `canEdit`), adapter nyata atas Eden (list/create; `canEdit=false`) dan adapter in-memory untuk test; query keys dan invalidation discope identity admin.

### Acceptance criteria

- [x] list/create memakai `GET/POST /admin/genres` dengan validasi respons.
- [x] Adapter nyata tidak memanggil endpoint yang belum ada; `canEdit=false`.
- [x] Cache privat dihapus saat auth loss.

### Validasi

Test klien dan cache; Eden compile.

### Hasil dan bukti

10 Oktober 2026: `lib/admin/genres-client.ts` (`GenresClient`, adapter live list/create dengan validasi respons, `canEdit=false`; rename/remove menolak dengan `GENRES_EDIT_UNAVAILABLE` tanpa request), `genres-form.ts`, `genres-queries.ts` (key di bawah prefix `admin/<identity>/genres`), `hooks/use-genres-api.ts`; adapter in-memory hanya di `test/fixtures`. 6 test (49 assertion) lulus; tsc dan ESLint lulus.

### Commit task

- Pesan: feat(web): add GenresClient and queries (GEN-002)
- SHA: aceeee0

### Blocker atau tindak lanjut

update/remove menunggu GEN-API-001.

## Task: GEN-003 — Halaman Genres: daftar, cari, tambah

- Status: Done
- Owner: Pengembang/agent pelaksana
- Prioritas: 4
- Referensi: GEN-US-02
- Diperbarui: 2026-10-10
- Dependensi: GEN-002
- Ukuran: sedang

### Ruang lingkup

Rute `/admin/genres`, item sidebar, daftar dengan pencarian server dan Load more, form Add genre (slug otomatis), state loading/kosong/error/offline, responsif light/dark.

### Acceptance criteria

- [x] Admin dapat mencari dan menambah genre; duplikat slug ditampilkan jelas.
- [x] Item nav aktif dan rute terlindungi guard admin.
- [x] Responsif 320–1440 px Light/Dark.

### Validasi

Test komponen; browser bila runner tersedia.

### Hasil dan bukti

10 Oktober 2026: rute `/admin/genres`, item sidebar Genres, `GenresManager` (daftar, pencarian debounce 300 ms, Load more, form Add genre dengan slug otomatis, state loading/kosong/error/offline) dan `genres-actions.ts`; `routeTree.gen.ts` dibangkitkan lewat `tsr generate` dan blok deklarasi react-start dipulihkan. 5 test SSR/logika lulus. **Belum terbukti:** render di browser nyata (halaman di balik login; tidak ada sesi admin untuk Chrome headless); layout 320–1440 px dan Light/Dark hanya dari kelas CSS, belum dilihat.

### Commit task

- Pesan: feat(web): add admin genres page (GEN-003)
- SHA: 5fb4d40

### Blocker atau tindak lanjut

Tidak ada.

## Task: GEN-004 — Dialog rename dan hapus (nonaktif sampai API)

- Status: Done
- Owner: Pengembang/agent pelaksana
- Prioritas: 5
- Referensi: GEN-US-02
- Diperbarui: 2026-10-10
- Dependensi: GEN-003
- Ukuran: sedang

### Ruang lingkup

UI rename/hapus dengan state konflik, sedang dipakai, error; tampil nonaktif dengan penjelasan saat `canEdit=false`; diuji dengan adapter in-memory.

### Acceptance criteria

- [x] Dialog dan state teruji dengan adapter in-memory.
- [x] Pada runtime aksi nonaktif dan tidak memanggil API.

### Validasi

Test komponen dan state.

### Hasil dan bukti

10 Oktober 2026: `genre-dialogs.tsx` (rename, delete) dan logika `submitRename`/`submitRemove` (hanya perubahan yang dikirim, no-op/invalid ditolak sebelum request, in-use/404/tidak pasti dibedakan, tanpa retry otomatis). Aksi nonaktif pada runtime karena `canEdit=false`; diuji dengan adapter in-memory (5 test). Perbaikan: penolakan edit karena API belum ada bukan hasil "tidak pasti".

### Commit task

- Pesan: feat(web): add genre rename and delete dialogs (GEN-004)
- SHA: d429f64

### Blocker atau tindak lanjut

Aktif setelah GEN-API-001.

## Task: GEN-005 — Picker multi-genre

- Status: Done
- Owner: Pengembang/agent pelaksana
- Prioritas: 6
- Referensi: GEN-US-01
- Diperbarui: 2026-10-10
- Dependensi: GEN-002
- Ukuran: sedang

### Ruang lingkup

Perbarui `genre-picker.tsx`: multi-pilih dengan chip, pencarian, buat genre baru inline (`POST /admin/genres`), pilihan dipertahankan lintas pencarian dan error.

### Acceptance criteria

- [x] Banyak genre dapat dipilih/dilepas; pilihan bertahan saat pencarian berubah.
- [x] Buat genre inline menambah opsi dan memilihnya; error tidak menghapus pilihan.

### Validasi

Test picker; regresi form konten.

### Hasil dan bukti

10 Oktober 2026: `genre-picker.tsx` memakai query genres baru; chip nama (nama dikenal dari baseline edit), penghitung "N selected · up to 100", pesan batas, "Create “x”" inline (`POST /admin/genres`, memilih hasilnya, pilihan dipertahankan saat gagal), state pilihan di `genre-picker-state.ts`. Kode genre lama pada `content-client`/`content-queries` dihapus. 4 test lulus; suite web 278 pass, 0 fail (50 file).

### Commit task

- Pesan: feat(web): improve genre picker (GEN-005)
- SHA: 1a304d5

### Blocker atau tindak lanjut

Digunakan juga oleh langkah Details (UFLOW-003).

## Task: GEN-006 — Bukti browser dan closure dokumen

- Status: Done
- Owner: Pengembang/agent pelaksana
- Prioritas: 7
- Referensi: plan
- Diperbarui: 2026-10-10
- Dependensi: GEN-003, GEN-004, GEN-005
- Ukuran: kecil

### Ruang lingkup

Bukti browser halaman dan picker; perbarui plan, backlog, desain, `docs/README.md`.

### Acceptance criteria

- [x] Bukti dicatat atau batas diuji dicatat apa adanya; `docs:check` lulus.

### Validasi

Smoke browser; `bun run docs:check`.

### Hasil dan bukti

10 Oktober 2026: `bun run build` lulus (2 successful, 1 cached); `bun run lint` dan `bun run check-types` lulus (cache Turbo); `bun test ./apps/web/test` 278 pass; `bun run docs:check` lulus. **Batas:** bukti browser untuk halaman Genres dan picker tidak ada (halaman admin di balik login dan runner browser proyek belum dikonfigurasi); perilaku interaktif hanya dibuktikan lewat test logika dan SSR. Rename/delete nonaktif sampai GEN-API-001.

### Commit task

- Pesan: docs(web): close admin genres (GEN-006)
- SHA: dicatat pada update dokumentasi berikutnya

### Blocker atau tindak lanjut

Tidak ada.

## Task: GEN-API-001 — PATCH/DELETE/usageCount pada genres

- Status: Done
- Owner: Pengembang/agent pelaksana
- Prioritas: 8
- Referensi: plan admin-genres; keputusan pengguna 10 Oktober 2026 ("lanjut ke edit dan hapus")
- Diperbarui: 2026-10-10
- Dependensi: GEN-006
- Ukuran: sedang; API tanpa migration

### Ruang lingkup

`PATCH /admin/genres/:id` (name dan/atau slug, token `expectedUpdatedAt`), `DELETE /admin/genres/:id` dan `usageCount` pada setiap genre (create, list, patch). Tanpa perubahan schema: konkurensi memakai `updatedAt` (dibandingkan pada ketelitian milidetik) alih-alih kolom versi baru, dan penggunaan dihitung dari `video_genres` + `series_genres`. Kontrak diusulkan agent dan diikuti sesuai persetujuan umum pengguna; tinjau bila ingin kolom versi.

### Acceptance criteria

- [x] PATCH hanya berhasil bila `expectedUpdatedAt` sama dengan nilai yang dibaca; token usang → 409 `GENRE_VERSION_CONFLICT`, id tidak ada → 404; dua edit dari bacaan yang sama hanya satu yang menang.
- [x] Slug bentrok → 409 `SLUG_CONFLICT`; body ketat (tanpa field lain, slug/ panjang divalidasi), minimal name atau slug.
- [x] DELETE ditolak 409 `GENRE_IN_USE` bila video/series masih memakai genre; berhasil bila tidak dipakai; kedua kali → 404.
- [x] Cache katalog diinvalidasi setelah edit/hapus yang berhasil, tidak setelah yang gagal.
- [x] Setiap operasi privat melewati guard admin sebelum service (401/403).

### Validasi

`bun test ./src` (API), bukti PostgreSQL dedicated `content:runtime:proof`, `bunx tsc --noEmit`.

### Hasil dan bukti

10 Oktober 2026: modul `apps/api/src/modules/genres` (model, repository dengan UPDATE bersyarat dan hitung pemakaian, service, route); `databaseErrorCode` pada `shared/content-error.ts`. **Temuan dari PostgreSQL nyata:** FK `ON DELETE RESTRICT` menghasilkan SQLSTATE `23001` (restrict_violation) pada `cause.errno`, bukan `23503`; unit test dengan error buatan awalnya lolos dengan kode keliru dan baru terdeteksi oleh proof DB, sehingga service menangani keduanya. Unit/HTTP: 9 test (62 assertion) pada modul genres; `bun test ./src` 187 pass. Proof DB dedicated (`vertical_movie_app_content_test`): runtime + HTTP 16 pass, termasuk hitung pemakaian video+series, token usang, balapan dua edit, slug bentrok, id tidak ada, delete ditolak saat dipakai, delete berhasil setelah dilepas, delete kedua 404. Jumlah operasi OpenAPI pada `content-http-proof` naik 34 → 36 (kontrak berubah sengaja).

### Commit task

- Pesan: feat(api): edit and delete genres with usage counts (GEN-API-001)
- SHA: 9ecc268

### Blocker atau tindak lanjut

Production migration tidak diperlukan (tanpa schema). Rollout API production tetap terpisah.

## Task: GEN-007 — Aktifkan edit dan hapus genre di frontend

- Status: Done
- Owner: Pengembang/agent pelaksana
- Prioritas: 9
- Referensi: GEN-API-001, GEN-004
- Diperbarui: 2026-10-10
- Dependensi: GEN-API-001
- Ukuran: sedang

### Ruang lingkup

Klien live memanggil PATCH/DELETE (`canEdit=true`), `usageCount` pada tipe dan validasi respons, token `expectedUpdatedAt` dari baris yang dibaca, penolakan respons untuk id lain, daftar menampilkan "Used by N items"/"Not used yet", tombol Delete nonaktif untuk genre yang dipakai (API tetap menolak), invalidasi cache genre dan konten, pesan `GENRE_VERSION_CONFLICT`.

### Acceptance criteria

- [x] Rename mengirim hanya perubahan beserta token yang dibaca; delete memanggil endpoint nyata; respons untuk id lain ditolak sebagai tidak valid.
- [x] `usageCount` divalidasi (bilangan bulat ≥ 0) dan ditampilkan; genre yang dipakai tidak dapat dihapus dari UI.
- [x] Adapter fixture hanya untuk test; tidak ada mock aktif di runtime.
- [x] Cache konten untuk admin yang sama diinvalidasi setelah edit/hapus; identitas lain tidak terpengaruh.

### Validasi

`bun test ./apps/web/test`, `bunx tsc --noEmit` (tipe Eden dari API), ESLint.

### Hasil dan bukti

10 Oktober 2026: `genres-client.ts`, `genres-queries.ts`, `genres-actions.ts`, `genres-usage.ts`, `genres-manager.tsx`, `genre-dialogs.tsx`; test klien/dialog/halaman diperbarui dan ditambah. `bun test ./apps/web/test` 309 pass (57 file); tsc dan ESLint lulus. **Belum terbukti:** rename/hapus di browser terhadap API dev; layout baris dengan teks pemakaian pada 320–1440 px.

### Commit task

- Pesan: feat(web): enable genre rename and delete with usage counts (GEN-007)
- SHA: 8ce7d1e

### Blocker atau tindak lanjut

Tidak ada.
