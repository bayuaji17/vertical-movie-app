# Repository context: hapus konten draft dan archived

## Snapshot

- Repository: `bayuaji17/vertical-movie-app`.
- Base ref: `main`; base SHA: `793820095d2acdac4474490fda8bc7620b2f59f3`.
- Analyzed at: 13 Oktober 2026 (Asia/Jakarta).
- Context status: snapshot perencanaan pada SHA di atas; periksa freshness sebelum implementasi.
- Branch: `feat/delete-draft-archived`.
- Request: pengguna meminta plan fitur hapus untuk konten berstatus draft dan archived (13 Oktober 2026). Pertanyaan sebelumnya: tidak ada API hapus selain genre.

## Observed behavior

- Satu-satunya `DELETE` pada API admin adalah `DELETE /admin/genres/:id` (`modules/genres/index.ts`). Video punya `POST /admin/videos/:id/archive` (draft atau published → archived), Series dan Season punya `POST /admin/series/:id/archive` dan `/admin/seasons/:id/archive`; upload punya `POST /admin/media/uploads/:id/abort`. Tidak ada penghapusan permanen konten, sehingga draft yang salah tetap memakai slug (UNIQUE) dan baris di database.
- Status: video `draft|published|archived` (`videos.publication_status`); Series dan Season `draft|published|unpublished` ditambah `archived_at` (`content-columns.ts`). `firstPublishedAt` menandai konten yang pernah tayang.
- Skema memakai `ON DELETE RESTRICT` pada seluruh FK relevan, sehingga baris induk tidak dapat dihapus selagi anak ada: `seasons.series_id`, `videos.season_id`, `video_genres`/`series_genres`, `content_operations.video_id|series_id`, `media_assets.video_id|series_id`, `upload_sessions.asset_id`, `media_jobs.asset_id`, `media_renditions.job_id`, `media_job_attempts.job_id`. Ada FK melingkar: `videos.poster_asset_id|source_asset_id` dan `series.poster_asset_id` menunjuk `media_assets` yang menunjuk balik ke pemiliknya (`media_assets_owner_*`).
- Objek storage dikelola di luar transaksi: sumber `sources/<assetId>/original|poster-original`, staging `uploads/<sessionId>/original`, keluaran worker `outputs/<assetId>/<jobId>/<token>/`. Pembersihan yang ada (`workers/cleanup.ts`, tiap jam pada slot maintenance) hanya menghapus objek untuk aset yang ditandai (`deletion_token`), sumber siap > 7 hari, sesi upload dan prefix output attempt lama; baris aset dan konten tidak pernah dihapus.
- Cache katalog publik memakai `catalogService.invalidate` setelah mutasi (archive/publish) dan TTL maksimum 60 detik; URL playback/poster bertanda tangan berlaku sampai expiry-nya.
- Web: aksi publication/archive berada di `components/admin/content-detail.tsx`, `episode-editor.tsx`, `season-episodes.tsx`, `content-status.tsx` dan hooks `use-publication.ts`/`use-owner-publication.ts`; komponen `ui/alert-dialog.tsx` tersedia. Daftar admin menyembunyikan archived kecuali `includeArchived`.

## Repository map (bagian relevan)

| Area                                                                                     | Peran                                                                    |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `apps/api/src/modules/videos`, `series`, `content`                                       | Route, service, repository (transaksi, `rowVersion`, `expectedVersion`). |
| `apps/api/src/modules/media/{service,repository}.ts`                                     | Aset, sesi upload, penandaan penghapusan, status job.                    |
| `apps/api/src/workers/cleanup.ts`, `queue.ts`, `index.ts`                                | Cleanup storage terjadwal dan antrean job.                               |
| `apps/api/src/db/schema/*`, `apps/api/drizzle/`                                          | Skema, FK, migrasi Drizzle.                                              |
| `apps/web/src/components/admin/*`, `hooks/use-*.ts`, `lib/admin/*`                       | UI admin, mutasi, query.                                                 |
| `docs/operations/video-metadata.md`, `media.md`, `docs/architecture/video-data-model.md` | Runbook dan model data.                                                  |

## Constraints dari repo

- Aturan Elysia (`docs/guides/api-development.md`): admin-only lewat `requireAdmin`, method chaining, handler tipis, dependensi eksplisit; `expectedVersion` untuk konflik; error melalui `ContentError`/`ErrorResponses`.
- Migrasi Drizzle additive; migrasi development diterapkan dengan `bun run --cwd apps/api db:migrate`, production hanya dengan otorisasi rollout. Integration test memakai database uji khusus.
- Storage tidak boleh dipanggil di dalam transaksi database (aturan worker/transaksi); penghapusan objek harus idempotent dan dapat diulang.
- Teks UI Inggris, tombol ≥44 px, aksesibel (dialog konfirmasi fokus, label jelas). Log memakai `@repo/log`.
