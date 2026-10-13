# Modul: Hapus konten draft dan archived

> Status: **DEL-001–005 Done (backend)**; DEL-006–008 Backlog · 13 Oktober 2026 · Pengguna meminta fitur hapus untuk konten draft dan archived. Plan: [implementation-plan](../plans/delete-content/implementation-plan.md), context: [repository-context](../plans/delete-content/repository-context.md).

## Tujuan modul

Admin menghapus permanen Film, Standalone, Episode, Season dan Series yang tidak published, termasuk relasi, aset dan objek storage, dengan penolakan yang jelas untuk konten published atau sibuk. Referensi: PRD-03/06, [model data video](../architecture/video-data-model.md).

## User story: DEL-US-01

Sebagai admin, saya ingin menghapus draft yang salah atau tidak jadi dipakai, sehingga daftar konten dan slug tidak terisi sampah.

## User story: DEL-US-02

Sebagai admin, saya ingin menghapus konten archived yang tidak dibutuhkan lagi, sehingga storage dan katalog admin bersih.

## User story: DEL-US-03

Sebagai admin, saya ingin konfirmasi yang menjelaskan konsekuensinya dan penolakan yang jelas untuk konten published atau sedang diproses, sehingga saya tidak menghapus data secara tidak sengaja.

## Task: DEL-001 — Setujui keputusan D1–D6

- Status: Done
- Owner: agent
- Prioritas: 1
- Referensi: DEL-US-01/02/03; [plan](../plans/delete-content/implementation-plan.md)
- Diperbarui: 2026-10-13
- Dependensi: tidak ada
- Ukuran: sedang

### Ruang lingkup

Pengguna memutuskan D1 (yang boleh dihapus), D2 (hard delete), D3 (cascade), D4 (konten sibuk ditolak), D5 (tombstone + worker, audit lewat log) dan D6 (bentuk API/UI); catat pemberi persetujuan dan tanggal pada plan.

### Acceptance criteria

- [x] Keputusan dicatat beserta pemberi persetujuan dan tanggal.

### Validasi

`bun run docs:check`, Prettier, `git diff --check`.

### Hasil dan bukti

Pengguna menyetujui D1–D6 sebagaimana direkomendasikan pada 13 Oktober 2026 ("setuju semua, langsung kerjakan"). Dicatat pada plan.

### Commit task

- Pesan: `docs(api): ... (DEL-001)`
- SHA: belum dibuat
- Hook/checks: belum dijalankan
- Ledger: dicatat pada update dokumentasi berikutnya

### Blocker atau tindak lanjut

Tidak ada.

## Task: DEL-002 — Skema tombstone storage dan primitif repository

- Status: Done
- Owner: agent
- Prioritas: 2
- Referensi: DEL-US-01/02/03; [plan](../plans/delete-content/implementation-plan.md)
- Diperbarui: 2026-10-13
- Dependensi: DEL-001
- Ukuran: sedang

### Ruang lingkup

Tabel `media_storage_tombstones` dan migrasi Drizzle; primitif repository untuk mengumpulkan aset/sesi/job/rendition/attempt turunan dan menghapusnya berurutan (FK melingkar diputus), dalam transaksi yang sama dengan pencatatan tombstone.

### Acceptance criteria

- [x] Migrasi additive dan dapat diterapkan di development tanpa mengubah data.
- [x] Primitif menghapus seluruh turunan sebuah pemilik dan mencatat tombstone untuk setiap objek/prefix.
- [x] Kegagalan di tengah membatalkan seluruh transaksi.

### Validasi

Integrasi PostgreSQL uji khusus; `db:migrate` pada development.

### Hasil dan bukti

Dikerjakan 13 Oktober 2026. Tabel `media_storage_tombstones` (`db/schema/tombstones.ts`, migrasi `0012_storage-tombstones.sql`, additive) dengan unique (provider, bucket, kind, key), check kind/key dan indeks pending. `shared/content-delete.ts` (`purgeContent`): mengunci aset, sesi upload dan job; menolak `CONTENT_BUSY` bila ada sesi `initializing|pending|completing|aborting` atau job `queued|running|retry`; mencatat tombstone (objek sumber, prefix `outputs/<assetId>/`, kunci staging); memutus FK melingkar (`videos.poster_asset_id|source_asset_id`, `series.poster_asset_id`, `media_assets.ready_job_id`); menghapus berurutan attempts → renditions → jobs → upload_sessions → media_assets → content_operations → video_genres/series_genres → videos → seasons → series; seluruhnya dalam transaksi pemanggil. Migrasi diterapkan ke database dev lokal (`db:migrate`: 13 baris jurnal, tabel ada, 28 video dan 3 series tidak berubah).

### Commit task

- Pesan: `feat(api): ... (DEL-002)`
- SHA: belum dibuat
- Hook/checks: belum dijalankan
- Ledger: dicatat pada update dokumentasi berikutnya

### Blocker atau tindak lanjut

Tidak ada.

## Task: DEL-003 — Hapus video, movie, standalone dan episode

- Status: Done
- Owner: agent
- Prioritas: 3
- Referensi: DEL-US-01/02/03; [plan](../plans/delete-content/implementation-plan.md)
- Diperbarui: 2026-10-13
- Dependensi: DEL-002
- Ukuran: sedang

### Ruang lingkup

`DELETE /admin/videos/:id?expectedVersion=n`: admin-only, status draft/archived, penolakan published (`CONTENT_STATE_CONFLICT`) dan sibuk (`CONTENT_BUSY`), `expectedVersion`, ringkasan respons, invalidasi cache katalog, log `content.deleted`.

### Acceptance criteria

- [x] Draft dan archived terhapus beserta relasinya; published ditolak.
- [x] Upload berjalan atau job aktif menghasilkan 409 dengan pesan tindakan.
- [x] Ulangan menghasilkan 404; slug dan nomor episode dapat dipakai ulang.

### Validasi

Test HTTP `app.handle`; integrasi PostgreSQL.

### Hasil dan bukti

Dikerjakan 13 Oktober 2026. `DELETE /admin/videos/:id?expectedVersion=n` (`deleteVideo`, admin-only): `VideosService.remove` mengunci baris, memeriksa versi (`CONTENT_VERSION_CONFLICT`), menolak published (`CONTENT_STATE_CONFLICT`, "Archive it first"), memanggil `purge`, lalu invalidasi cache katalog dan log `content.deleted` (tipe, slug, judul, status, pernah tayang, admin, jumlah yang dihapus). Respons 200 `{id, kind, removed}`; ulangan menghasilkan 404. Test: `videos/index.test.ts` (tanpa admin 401, query tidak valid 422, ringkasan) dan integrasi PostgreSQL (`content-delete-proof.test.ts`): film draft dengan genre, dua aset, dua sesi upload, job/attempt/rendition dan operasi → semua baris hilang, tombstone tercatat, genre tetap, slug dapat dibuat ulang, log tercatat; published/versi usang/job berjalan/upload pending ditolak tanpa mengubah apa pun (rollback); archived yang pernah tayang dapat dihapus.

### Commit task

- Pesan: `feat(api): ... (DEL-003)`
- SHA: belum dibuat
- Hook/checks: belum dijalankan
- Ledger: dicatat pada update dokumentasi berikutnya

### Blocker atau tindak lanjut

Tidak ada.

## Task: DEL-004 — Hapus season dan series (cascade)

- Status: Done
- Owner: agent
- Prioritas: 4
- Referensi: DEL-US-01/02/03; [plan](../plans/delete-content/implementation-plan.md)
- Diperbarui: 2026-10-13
- Dependensi: DEL-002
- Ukuran: sedang

### Ruang lingkup

`DELETE /admin/seasons/:id` dan `/admin/series/:id`: cascade episode/season sesuai D3, ringkasan jumlah, aturan status dan sibuk yang sama, admin-only.

### Acceptance criteria

- [x] Series menghapus semua season, episode, relasi genre dan aset poster.
- [x] Season menghapus episodenya; season/series published atau sibuk ditolak.
- [x] Tidak ada baris yatim setelah penghapusan.

### Validasi

Test HTTP; integrasi PostgreSQL dengan Series berisi dua season dan beberapa episode berisi aset.

### Hasil dan bukti

Dikerjakan 13 Oktober 2026. `DELETE /admin/seasons/:id` (`deleteSeason`) dan `/admin/series/:id` (`deleteSeries`): `SeriesService.removeSeason`/`remove` dengan aturan yang sama; Series published ditolak; Season dengan episode published pada Series published (dan Season tidak archived) ditolak; cascade mengumpulkan season dan episode (termasuk episode berstatus published di bawah Series draft yang sudah tersembunyi) sesuai D3. Test: `series/index.test.ts` (admin-only, validasi versi, ringkasan) dan integrasi: Series dengan dua season, tiga episode berisi aset dan poster dihapus bersih (1 series, 2 season, 3 video, 4 aset) dengan genre tetap; Series published ditolak, archived dihapus, episode sibuk memblokir seluruh Series (tidak ada yang berubah); Season dihapus bersama episodenya dan Season published diblokir; versi usang ditolak.

### Commit task

- Pesan: `feat(api): ... (DEL-004)`
- SHA: belum dibuat
- Hook/checks: belum dijalankan
- Ledger: dicatat pada update dokumentasi berikutnya

### Blocker atau tindak lanjut

Tidak ada.

## Task: DEL-005 — Sapuan tombstone di worker

- Status: Done
- Owner: agent
- Prioritas: 5
- Referensi: DEL-US-01/02/03; [plan](../plans/delete-content/implementation-plan.md)
- Diperbarui: 2026-10-13
- Dependensi: DEL-002
- Ukuran: sedang

### Ruang lingkup

Sapuan tiap 60 detik pada slot maintenance: hapus objek atau semua key prefix dari tombstone untuk provider/bucket aktif, idempoten dengan retry, tandai selesai, log `cleanup.tombstone`/`cleanup.item_failed`.

### Acceptance criteria

- [x] Objek source, poster, output dan staging terhapus setelah konten dihapus.
- [x] Kegagalan storage tidak menghilangkan tombstone dan diulang pada sapuan berikutnya.
- [x] Tidak pernah menghapus objek di luar tombstone atau bucket lain.

### Validasi

Integrasi MinIO + worker; test unit sapuan dengan storage palsu.

### Hasil dan bukti

Dikerjakan 13 Oktober 2026. `workers/tombstones.ts` (`createTombstoneSweep`) dipanggil tiap 60 detik pada slot maintenance (`workers/index.ts`): memproses 50 tombstone per sapuan untuk provider/bucket aktif, hanya menghapus kunci aplikasi (regex `sources/<uuid>/(original|poster-original)`, `uploads/<uuid>/original`, prefix `outputs/<uuid>/`), menandai `deleted_at`, menambah `attempts`/`last_error` saat gagal (maksimum 20 percobaan, lalu tertinggal untuk operator), memangkas baris selesai setelah 7 hari, dan mencatat `cleanup.tombstones`/`cleanup.tombstone_failed`. Bukti nyata (`content-delete-storage-proof.test.ts`, MinIO + PostgreSQL uji): menghapus film membiarkan enam objek di storage (API tidak menyentuh storage) dan mencatat tombstone; sapuan pertama gagal sekali, ulangan menghapus empat objek target (source, staging, dua keluaran HLS) sementara dua objek film lain tetap ada; kunci tidak aman dan tombstone bucket lain tidak disentuh. `bun run --cwd apps/api content:delete:proof`: 7 test, 49 assertion lulus.

### Commit task

- Pesan: `feat(api): ... (DEL-005)`
- SHA: belum dibuat
- Hook/checks: belum dijalankan
- Ledger: dicatat pada update dokumentasi berikutnya

### Blocker atau tindak lanjut

Tidak ada.

## Task: DEL-006 — UI hapus pada admin

- Status: Backlog
- Owner: agent
- Prioritas: 6
- Referensi: DEL-US-01/02/03; [plan](../plans/delete-content/implementation-plan.md)
- Diperbarui: 2026-10-13
- Dependensi: DEL-003, DEL-004
- Ukuran: sedang

### Ruang lingkup

Klien API, mutasi, `AlertDialog` konsekuensi (Series mengetik judul), tombol Delete pada detail dan daftar/baris, nonaktif untuk published, penanganan error `CONTENT_BUSY`/versi/404, invalidasi query dan navigasi.

### Acceptance criteria

- [ ] Delete tersedia untuk draft/archived dan nonaktif dengan alasan untuk published.
- [ ] Dialog menampilkan jumlah season/episode/aset; Series memerlukan judul yang diketik.
- [ ] Setelah sukses daftar, detail dan dashboard diperbarui tanpa muat ulang manual.

### Validasi

Test komponen; bukti browser development.

### Hasil dan bukti

Belum ada.

### Commit task

- Pesan: `feat(web): ... (DEL-006)`
- SHA: belum dibuat
- Hook/checks: belum dijalankan
- Ledger: dicatat pada update dokumentasi berikutnya

### Blocker atau tindak lanjut

Tidak ada.

## Task: DEL-007 — Bukti integrasi dan browser

- Status: Backlog
- Owner: agent
- Prioritas: 7
- Referensi: DEL-US-01/02/03; [plan](../plans/delete-content/implementation-plan.md)
- Diperbarui: 2026-10-13
- Dependensi: DEL-005, DEL-006
- Ukuran: sedang

### Ruang lingkup

Integrasi PostgreSQL + MinIO + worker untuk movie, episode, season dan series; bukti browser menghapus draft, archived dan Series berisi episode dengan media.

### Acceptance criteria

- [ ] Tidak ada baris atau objek yatim setelah sapuan.
- [ ] Alur UI berjalan di browser pada desktop dan mobile.

### Validasi

Suite integrasi baru dan worker browser; hasil dicatat.

### Hasil dan bukti

Belum ada.

### Commit task

- Pesan: `test(api): ... (DEL-007)`
- SHA: belum dibuat
- Hook/checks: belum dijalankan
- Ledger: dicatat pada update dokumentasi berikutnya

### Blocker atau tindak lanjut

Tidak ada.

## Task: DEL-008 — Dokumentasi dan penutupan

- Status: Backlog
- Owner: agent
- Prioritas: 8
- Referensi: DEL-US-01/02/03; [plan](../plans/delete-content/implementation-plan.md)
- Diperbarui: 2026-10-13
- Dependensi: DEL-007
- Ukuran: sedang

### Ruang lingkup

Perbarui runbook metadata/media, model data video, README docs, panduan API; catat batas dan rollout.

### Acceptance criteria

- [ ] Kontrak, aturan, urutan hapus, tombstone dan perilaku worker terdokumentasi.
- [ ] `check-types`, `lint`, `build`, `docs:check` lulus dan dicatat.

### Validasi

Lihat acceptance criteria.

### Hasil dan bukti

Belum ada.

### Commit task

- Pesan: `docs(api): ... (DEL-008)`
- SHA: belum dibuat
- Hook/checks: belum dijalankan
- Ledger: dicatat pada update dokumentasi berikutnya

### Blocker atau tindak lanjut

Tidak ada.
