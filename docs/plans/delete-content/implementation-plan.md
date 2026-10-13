# Implementation plan: hapus konten draft dan archived

## Plan metadata

- Status: **approved** (13 Oktober 2026). Pengguna menyetujui D1–D6 ("setuju semua, langsung kerjakan"); backend DEL-002–005 implemented lokal, UI dan penutupan menyusul.
- Date: 13 Oktober 2026; decision owner: pengguna.
- Repository: `bayuaji17/vertical-movie-app`; base ref: `main`.
- Context: [repository-context.md](repository-context.md).
- Backlog: [delete-content](../../tasks/delete-content.md), DEL-001–008.
- Branch: `feat/delete-draft-archived`.

## Objective

Admin dapat menghapus permanen Film, Standalone, Episode, Season dan Series yang berstatus draft atau archived (dan unpublished), termasuk metadata, relasi genre, aset dan seluruh objek storage terkait, tanpa meninggalkan baris yatim, objek yatim, atau akses publik baru.

## Keputusan (disetujui pengguna 13 Oktober 2026, ditandai **D**)

- **D1 Yang boleh dihapus.** Video (movie/standalone/episode), Season dan Series yang **tidak published**: draft/unpublished atau archived (video `draft|archived`; Series/Season `draft|unpublished` atau `archived_at` terisi). Konten **published** ditolak (`409 CONTENT_STATE_CONFLICT`, "Archive it first"). Konten archived yang pernah tayang (`firstPublishedAt`) tetap boleh dihapus.
- **D2 Hapus permanen.** Hard delete dengan dialog konfirmasi, tanpa soft-delete atau masa tenggang (draft/archived tidak publik). Slug dan nomor episode kembali bebas.
- **D3 Cascade.** Menghapus Series menghapus semua Season dan Episode-nya; menghapus Season menghapus Episode-nya; episode yang masih berstatus published di bawah induk yang tidak published ikut terhapus (sudah tersembunyi). Dialog menampilkan jumlah Season, Episode (dan berapa yang published/ber-media) sebelum konfirmasi; Series meminta mengetik judul.
- **D4 Konten sibuk ditolak.** Jika ada upload yang sedang berjalan (`initializing|pending|completing|aborting`) atau job media `queued|running|retry` pada aset yang terdampak, API menjawab `409 CONTENT_BUSY` dengan penjelasan (abort upload atau tunggu job). Tidak ada pembatalan paksa otomatis.
- **D5 Storage lewat tombstone + worker.** Dalam satu transaksi API menghapus baris dan mencatat `media_storage_tombstones` (objek atau prefix); worker menghapus objek di luar transaksi dengan retry idempoten. Tombstone diproses pada slot maintenance tiap 60 detik (bukan tiap jam). Audit memakai event log terstruktur `content.deleted` (tipe, id, slug, judul, status sebelumnya, jumlah anak/aset, admin), tanpa tabel audit baru.
- **D6 Bentuk API dan UI.** `DELETE /admin/videos/:id`, `/admin/seasons/:id`, `/admin/series/:id` dengan query `expectedVersion`, admin-only, respons 200 berisi ringkasan yang dihapus; idempotensi: ulangan menghasilkan 404. UI: aksi "Delete" pada detail dan daftar untuk draft/archived (nonaktif dengan alasan untuk published), `AlertDialog` berisi konsekuensi.

## Goals dan non-goals

Goals: API hapus tiga tingkat; urutan penghapusan benar terhadap FK `RESTRICT` dan FK melingkar; pencatatan tombstone dan cleanup storage tahan kegagalan; penolakan published/sibuk; invalidasi cache katalog; UI admin; test (unit, HTTP, integrasi PostgreSQL/MinIO); dokumentasi.

Non-goals: restore/undo, soft delete, hapus massal, hapus konten published (tetap archive dulu), hapus genre/pengguna, penghapusan aset secara terpisah dari konten, tabel audit permanen, perubahan perilaku publish/archive.

## Desired behavior

### Aturan per jenis

| Target                 | Syarat                                       | Dihapus bersama                                                                                               |
| ---------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Video movie/standalone | status draft atau archived; tidak sibuk      | `video_genres`, `content_operations`, aset (source/poster), sesi upload, job, rendition, attempt, baris video |
| Episode                | sama; season/series induk tidak perlu draft  | sama; `episodeNumber` bebas                                                                                   |
| Season                 | draft/unpublished atau archived; tidak sibuk | semua episodenya (sesuai D3) dan semua turunannya                                                             |
| Series                 | draft/unpublished atau archived; tidak sibuk | semua season, episode, `series_genres`, aset poster, operasi                                                  |

### Urutan dalam satu transaksi (dengan penguncian baris induk)

1. Kunci target dan turunannya (`FOR UPDATE`), periksa `expectedVersion`, status (D1) dan kesibukan (D4).
2. Kumpulkan aset, sesi upload dan job; catat tombstone: setiap `object_key`, `staging_key`, dan prefix `outputs/<assetId>/`.
3. Putuskan FK melingkar (`videos.poster_asset_id`/`source_asset_id` dan `series.poster_asset_id` menjadi NULL).
4. Hapus berurutan: `media_job_attempts`, `media_renditions`, `media_jobs`, `upload_sessions`, `media_assets`, `content_operations`, `video_genres`/`series_genres`, `videos` (episode), `seasons`, `series`.
5. Commit; lalu `catalogService.invalidate()` dan log `content.deleted`.

Kegagalan di tengah membatalkan seluruh transaksi (tidak ada penghapusan sebagian). Tombstone ikut commit sehingga objek yang tidak pernah terhapus tetap ditemukan.

### Worker

`media_storage_tombstones(id, provider, bucket, kind object|prefix, key, created_at, attempts, last_error, deleted_at)`; sapuan memproses batch kecil, menghapus objek atau semua key prefix, menandai `deleted_at`, mencatat `cleanup.tombstone` (jumlah) dan `cleanup.item_failed` bila gagal; hanya menghapus untuk provider/bucket profil aktif. Baris yang selesai dibersihkan setelah retensi singkat.

### UI

Tombol Delete (ikon + teks) pada halaman detail Film/Standalone/Series dan pada baris Season/Episode; pada daftar konten sebagai item menu baris. Untuk published: nonaktif dengan teks "Archive first". Dialog: judul, ringkasan konsekuensi (jumlah season/episode/aset, "this cannot be undone"), tombol "Delete" destruktif dan "Cancel"; Series meminta mengetik judul. Setelah sukses: toast, invalidasi query daftar/detail/dashboard, navigasi ke daftar bila dari halaman detail. Error ditampilkan di dialog: `CONTENT_BUSY` (abort upload/tunggu job), konflik versi (muat ulang), tidak ditemukan (sudah terhapus).

## Impact analysis

Perubahan skema aditif (satu tabel baru) dan route baru; tidak mengubah publish/archive. Risiko: (1) urutan hapus dan FK melingkar salah → test integrasi pada database uji; (2) race dengan upload/job baru saat transaksi → penguncian baris induk dan pemeriksaan sibuk di dalam transaksi; (3) objek storage yatim bila worker tidak berjalan → tombstone durable, runbook dan alert log; (4) kehilangan data tidak terpulihkan → konfirmasi eksplisit, hanya non-published; (5) cache publik/URL bertanda tangan yang sudah beredar tetap valid sampai expiry (≤ TTL playback); (6) admin lain/tab lama memegang data usang → 404/409 yang jelas; (7) migrasi production butuh otorisasi rollout terpisah.

## Affected files and symbols

| File                                                                                                       | Perubahan                                      |
| ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `apps/api/src/db/schema/media.ts` (atau berkas baru), `apps/api/drizzle/*`                                 | Tabel `media_storage_tombstones` + migrasi.    |
| `apps/api/src/modules/videos                                                                               | series/{index,service,repository,model}.ts`    | `remove` + route DELETE, pemeriksaan status/sibuk, urutan hapus. |
| `apps/api/src/modules/media/repository.ts`                                                                 | Pengumpulan aset/sesi/job dan hapus berurutan. |
| `apps/api/src/workers/cleanup.ts`, `workers/index.ts`                                                      | Sapuan tombstone tiap 60 detik + log.          |
| `apps/api/src/shared/content-error.ts`                                                                     | Kode `CONTENT_BUSY` bila belum ada.            |
| `apps/web/src/lib/admin/*-client.ts`, `hooks/use-*.ts`, `components/admin/*`                               | Klien, mutasi, dialog dan tombol.              |
| `docs/operations/video-metadata.md`, `media.md`, `docs/architecture/video-data-model.md`, `docs/README.md` | Kontrak, runbook, indeks.                      |

## Implementation DAG

DEL-001 (persetujuan D1–D6) → DEL-002 (skema tombstone + primitif repository) → DEL-003 (hapus video/episode) dan DEL-004 (hapus season/series) → DEL-005 (worker tombstone) → DEL-006 (UI) → DEL-007 (integrasi dan bukti browser) → DEL-008 (dokumentasi dan penutupan). DEL-005 dapat berjalan paralel dengan DEL-003/004 setelah DEL-002.

## Test and verification strategy

- Unit/HTTP (`bun test`, `app.handle`): status yang ditolak (published), sibuk (upload/job), `expectedVersion`, 404 ulang, admin-only, ringkasan respons, invalidasi cache.
- Integrasi PostgreSQL (database uji khusus): hapus movie/episode/season/series dengan aset, upload, job, rendition, attempt, operasi dan genre; verifikasi tidak ada baris yatim dan FK melingkar teratasi; rollback saat gagal di tengah; slug dapat dipakai ulang.
- Integrasi MinIO + worker: tombstone memicu penghapusan source/poster/output/staging; retry setelah kegagalan; tidak menyentuh objek lain/bucket lain.
- Web: test komponen (dialog, tombol nonaktif untuk published, pesan error) dan bukti browser dev (hapus draft, archived, Series dengan episode; daftar dan dashboard diperbarui). `bun run check-types`, `lint`, `build`, `docs:check`.

## Rollout, rollback, dan batas

Migrasi additive; rollback kode dengan revert, tabel tombstone dibiarkan. Production memerlukan otorisasi rollout dan worker berjalan. Penghapusan data tidak dapat dibatalkan; backup/restore database berada di luar scope.

## Open decisions

D1–D6 di atas. Pertanyaan tambahan: apakah Series published dengan semua episode archived perlu jalur "archive lalu delete" satu klik (tidak diusulkan).

## Execution history

- 13 Oktober 2026: context dan plan ditulis pada `feat/delete-draft-archived`; belum ada implementasi.

- 13 Oktober 2026: DEL-001–005 selesai (backend): tabel tombstone, `purgeContent`, DELETE video/season/series, sapuan worker; integrasi PostgreSQL+MinIO lulus.
- 13 Oktober 2026: DEL-006 selesai: UI admin (klien, hook, dialog konfirmasi, integrasi detail/episode/season/daftar) dengan test komponen; check-types, lint, build lulus.
