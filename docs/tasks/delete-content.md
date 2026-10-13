# Modul: Hapus konten draft dan archived

> Status: **DEL-001–008 Done (implemented lokal; produksi belum)** · 13 Oktober 2026 · Pengguna meminta fitur hapus untuk konten draft dan archived. Plan: [implementation-plan](../plans/delete-content/implementation-plan.md), context: [repository-context](../plans/delete-content/repository-context.md).

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

- Status: Done
- Owner: agent
- Prioritas: 6
- Referensi: DEL-US-01/02/03; [plan](../plans/delete-content/implementation-plan.md)
- Diperbarui: 2026-10-13
- Dependensi: DEL-003, DEL-004
- Ukuran: sedang

### Ruang lingkup

Klien API, mutasi, `AlertDialog` konsekuensi (Series mengetik judul), tombol Delete pada detail dan daftar/baris, nonaktif untuk published, penanganan error `CONTENT_BUSY`/versi/404, invalidasi query dan navigasi.

### Acceptance criteria

- [x] Delete tersedia untuk draft/archived dan nonaktif dengan alasan untuk published.
- [x] Dialog menjelaskan konsekuensi (Series/Season ikut menghapus season dan episode; file storage dibersihkan kemudian); Series memerlukan judul yang diketik. Jumlah season/video/aset yang benar-benar terhapus ditampilkan pada toast sukses dari ringkasan server, bukan pada dialog (dialog tidak memuat hitungan karena API tidak menyediakan pratinjau jumlah; dicatat sebagai keputusan, bukan penundaan).
- [x] Setelah sukses daftar, detail dan dashboard diperbarui tanpa muat ulang manual.

### Validasi

Test komponen; bukti browser development (dikerjakan pada DEL-007).

### Hasil dan bukti

Dikerjakan 13 Oktober 2026. `lib/admin/delete-client.ts` (klien Eden `DELETE` dengan `expectedVersion`, validasi respons, pemetaan kode error ke pesan, hasil tak terkonfirmasi untuk gangguan jaringan/5xx), `lib/admin/delete-state.ts` (blokir published dengan alasan, judul diketik untuk Series, konsekuensi, ringkasan), `hooks/use-delete-content.ts` (mutasi; setelah sukses navigasi lebih dulu, lalu hapus cache detail dan invalidasi query admin), `components/admin/delete-content.tsx` (tombol 44 px + `AlertDialog` + toast) dan integrasi pada detail konten, detail episode, daftar season serta tabel/kartu daftar konten. Test `test/admin-delete-content.test.tsx` (5 test, 50 assertion): aturan blokir, judul Series, render tombol/alasan nonaktif, klien (metode, URL, query, validasi respons), pesan error. Hasil: `bun run check-types` 4/4, `bun run lint` bersih, `bun run build` 2/2, `bun test` web 354 lulus dan 1 gagal sebelumnya (`title route rejects unknown kinds and malformed slugs with notFound()`, juga gagal tanpa perubahan ini).

### Commit task

- Pesan: `feat(web): ... (DEL-006)`
- SHA: belum dibuat
- Hook/checks: belum dijalankan
- Ledger: dicatat pada update dokumentasi berikutnya

### Blocker atau tindak lanjut

Tidak ada.

## Task: DEL-007 — Bukti integrasi dan browser

- Status: Done
- Owner: agent
- Prioritas: 7
- Referensi: DEL-US-01/02/03; [plan](../plans/delete-content/implementation-plan.md)
- Diperbarui: 2026-10-13
- Dependensi: DEL-005, DEL-006
- Ukuran: sedang

### Ruang lingkup

Integrasi PostgreSQL + MinIO + worker untuk movie, episode, season dan series; bukti browser menghapus draft, archived dan Series berisi episode dengan media.

### Acceptance criteria

- [x] Tidak ada baris atau objek yatim setelah sapuan.
- [x] Alur UI berjalan di browser pada desktop dan mobile.

### Validasi

Suite integrasi baru dan worker browser; hasil dicatat.

### Hasil dan bukti

Dikerjakan 13 Oktober 2026 pada database uji khusus `vertical_movie_app_media_test` dan bucket MinIO acak berawalan `vertical-movie-app-media-test-` (database dan bucket development tidak disentuh).

- **Integrasi PostgreSQL + MinIO + worker:** `bun run --cwd apps/api content:delete:proof` (7 test, 49 assertion; DEL-002–005) membuktikan movie, standalone, episode, season dan series terhapus tanpa baris yatim, tombstone tercatat, dan sapuan worker menghapus objek target saja.
- **Browser (Chromium headless via Playwright, API + worker + web dev nyata):** fixture `apps/api/test/integration/content-delete-browser-fixture.ts` (`seed`/`status`/`clean`) membuat admin ber-password, film draft, film published, film dengan job berjalan, standalone archived, Series draft dengan dua season/tiga episode, semuanya berisi aset dan 32 objek MinIO; skenario `apps/web/test/admin-delete-browser-worker.mjs` lulus 8/8: (1) film published nonaktif dengan alasan dan tidak membuka dialog, (2) film draft: Cancel mempertahankan, konfirmasi menghapus + toast + daftar tanpa item itu, (3) film dengan job berjalan ditolak `CONTENT_BUSY` dengan pesan jelas dan tetap ada, (4) standalone archived dihapus dari baris daftar tanpa muat ulang, (5) Season dihapus bersama episodenya dan Season lain tetap, (6) Series memerlukan judul persis (huruf kecil sebagian ditolak) lalu terhapus bersama sisa episode, (7) mobile 390 px: target sentuh ≥ 44 px, dialog muat viewport tanpa scroll horizontal, penghapusan berhasil, (8) tanpa page error/hydration warning. Setelah itu worker menyapu 21 tombstone (28 objek, 0 gagal) dalam satu siklus 60 detik: tersisa hanya data film dengan job berjalan (2 video, 1 aset, 4 objek storage) tanpa baris atau objek yatim dari konten yang dihapus.
- **Temuan di luar fitur:** saat bukti ini dijalankan, login admin dari browser gagal 500 (`Body is disturbed or locked`) karena Elysia mengonsumsi body JSON `/api/auth/*` sebelum Better Auth; diperbaiki terpisah pada commit `fix(api): stop Elysia consuming the auth request body before Better Auth` (`parse: "none"` + test regresi yang gagal tanpa perbaikan).
- **Cara menjalankan:** (1) `export` env API untuk database/bucket uji (`DATABASE_URL=$MEDIA_TEST_DATABASE_URL`, `S3_BUCKET`, kredensial `MEDIA_STORAGE_TEST_*`, `BETTER_AUTH_URL=WEB_ORIGIN=http://localhost:3300`); (2) `bun apps/api/test/integration/content-delete-browser-fixture.ts seed http://localhost:3300 <state.json>`; (3) jalankan API (port 3301), `src/workers/index.ts` dan web dev (`PORT=3300 API_INTERNAL_URL=http://localhost:3301`); (4) `bun apps/web/test/admin-delete-browser-worker.mjs http://localhost:3300 <URL modul playwright> "<chromium>" <state.json> <folder screenshot>`; (5) `... content-delete-browser-fixture.ts status <state.json>` lalu `clean`. Di WSL tanpa sudo, `libnspr4`/`libnss3` diambil dari paket Debian dan dimuat lewat `LD_LIBRARY_PATH`. Screenshot hasil tidak disimpan di repo.
- **Batas:** tidak mencakup mode produksi (build), R2, atau FFmpeg nyata; job berjalan pada skenario 3 adalah baris fixture, bukan transcode sungguhan.

### Commit task

- Pesan: `test(api): ... (DEL-007)`
- SHA: belum dibuat
- Hook/checks: belum dijalankan
- Ledger: dicatat pada update dokumentasi berikutnya

### Blocker atau tindak lanjut

Tidak ada.

## Task: DEL-008 — Dokumentasi dan penutupan

- Status: Done
- Owner: agent
- Prioritas: 8
- Referensi: DEL-US-01/02/03; [plan](../plans/delete-content/implementation-plan.md)
- Diperbarui: 2026-10-13
- Dependensi: DEL-007
- Ukuran: sedang

### Ruang lingkup

Perbarui runbook metadata/media, model data video, README docs, panduan API; catat batas dan rollout.

### Acceptance criteria

- [x] Kontrak, aturan, urutan hapus, tombstone dan perilaku worker terdokumentasi.
- [x] `check-types`, `lint`, `build`, `docs:check` lulus dan dicatat.

### Validasi

Lihat acceptance criteria.

### Hasil dan bukti

Dikerjakan 13 Oktober 2026. Diperbarui: [model data](../architecture/video-data-model.md#penghapusan-konten--13-oktober-2026) (aturan, urutan hapus, tombstone, kontrak), [PRD](../product/prd.md) dan [aturan global](../product/global-rules.md) (pengecualian retensi), [Media Operations](../operations/media.md#hapus-konten-dan-sapuan-tombstone--13-oktober-2026) (sapuan worker, key aman, pemeriksaan operator), [runbook metadata](../operations/video-metadata.md#hapus-konten-draft-dan-archived--13-oktober-2026) (curl, error, UI), [panduan API](../guides/api-development.md) (jumlah endpoint dan aturan `parse: "none"`) dan [README docs](../README.md). Batas: belum diuji pada produksi/R2 maupun dengan FFmpeg nyata; rollout produksi dan push/PR/merge memerlukan otorisasi sendiri. Hasil gate (13 Oktober 2026, diamati): `bun run check-types` 4/4 lulus; `bun run lint` bersih; `bun run build` 2/2 lulus; `bun run docs:check` lulus; `bun test src` API 199 lulus + 1 gagal sebelumnya (`truncated JPEG data fails the awaited native decode`); `bun test` web 354 lulus + 1 gagal sebelumnya (`title route rejects unknown kinds and malformed slugs with notFound()`); `bun run --cwd apps/api content:delete:proof` 7 test/49 assertion lulus. Kedua kegagalan juga terjadi tanpa perubahan fitur ini. Ledger SHA task: DEL-001–005 `3e43003`, DEL-006 `7224e55`, perbaikan login `f6818bc`, DEL-007 `ca8cb4d`.

### Commit task

- Pesan: `docs(api): ... (DEL-008)`
- SHA: belum dibuat
- Hook/checks: belum dijalankan
- Ledger: dicatat pada update dokumentasi berikutnya

### Blocker atau tindak lanjut

Tidak ada.
