# Video Operations — metadata tahap A

Pada 3 Oktober 2026, backend metadata mendukung `standalone`, `movie`, dan `episode` pada branch `feat/video-metadata`. Enam tabel dan 16 endpoint admin tersedia. Validasi memakai PostgreSQL localhost dedicated dan `app.handle()` tanpa membuka port. Storage S3, upload, worker FFmpeg, publikasi, katalog publik, serta UI/gateway bisnis belum tersedia pada iterasi ini.

## Endpoint dan akses

Path Elysia adalah `/admin/series`, `/admin/genres`, dan `/admin/videos`; daftar lengkap kontrak ada pada [plan](VIDEO_IMPLEMENTATION_PLAN.md#kontrak-endpoint-tahap-a). Better Auth tetap `/api/auth/*`, dokumentasi Scalar `/openapi` dan `/openapi/json`.

Setiap endpoint konten membaca sesi native tanpa cookie cache, lalu memeriksa role admin, ban, dan expiry. Response privat memakai `Cache-Control: private, no-store`. Unauthorized 401, non-admin/banned 403, auth dependency unavailable 503. Field metadata divalidasi ketat; unknown fields dan status publikasi buatan client ditolak 422. Error domain memakai `{error:{code,message,requestId}}`; duplicate slug/nomor dan stale version menghasilkan 409.

Browser Eden saat ini memakai base `/api`, tetapi gateway web hanya meneruskan auth. Jangan menganggap `/api/admin/videos` sudah berfungsi. Integrasi browser, penerusan cookie, dan SSR bisnis mengikuti WEB-CONTENT-001. Proof backend memakai direct request dengan cookie native fixture; belum ada uji browser pengelolaan konten.

## Contoh alur

Kirim JSON berikut sebagai body `POST /admin/genres` dengan sesi admin:

```json
{ "name": "Drama", "slug": "drama" }
```

Simpan `id` genre dari response 201. `POST /admin/series` membuat series dan Season 1 dalam satu transaksi:

```json
{
  "title": "Cerita Baru",
  "slug": "cerita-baru",
  "originalLanguage": "id",
  "releaseYear": 2026,
  "genreIds": ["<genre-id>"]
}
```

`<genre-id>` dan placeholder ID berikut harus diganti UUID hasil API. Response 201 berbentuk `{series:{...},defaultSeason:{...}}`; tiap snapshot memiliki `id` dan `rowVersion:1`. Tambah season lewat `POST /admin/series/<series-id>/seasons` dengan `{"seasonNumber":2}`. Nomor unik per series dan tetap reserved setelah archive.

Episode memerlukan season yang tersedia dan belum diarsipkan. Body `POST /admin/videos`:

```json
{
  "kind": "episode",
  "title": "Episode 1",
  "seasonId": "<season-id>",
  "episodeNumber": 1
}
```

Response 201 adalah snapshot video draft dengan `seasonId`, `episodeNumber`, dan `genreIds`. `GET /admin/videos/<video-id>` menambahkan ringkasan series/season dan `effectiveGenres`. Genre episode mengikuti series ketika tidak ada override; `genreIds:[]` pada PATCH mengembalikan inheritance.

Movie memakai tabel videos yang sama tanpa season/nomor episode:

```json
{
  "kind": "movie",
  "title": "Film Panjang",
  "releaseYear": 2026,
  "releaseDate": "2026-10-03",
  "rightsConfirmed": true
}
```

`standalone` mengikuti kontrak yang sama. Durasi, resolusi, rasio, source URL, dan status transcode belum menjadi field input/output metadata. Endpoint metadata saat ini belum memvalidasi file sumber. Policy media terbaru membatasi movie/standalone maksimal 30 menit dan 1,5 GB, episode maksimal 10 menit dan 512 MB serta semua video portrait 9:16; validasi file ini belum diimplementasikan. `rightsConfirmed` menyimpan timestamp/actor server; body tidak dapat menentukan audit actor/timestamp. Konfirmasi ini belum membuat video dapat dipublikasikan.

Edit via `PATCH /admin/videos/<video-id>`:

```json
{ "expectedVersion": 1, "title": "Judul Baru", "synopsis": null }
```

Response 200 memiliki `rowVersion:2`. Field absent mempertahankan nilai; null menghapus metadata optional. Versi lama ditolak 409. Set genre dan metadata diperbarui atomik. Kind immutable; slug/grouping terkunci setelah pernah terbit. Grouping PATCH hanya sah untuk episode. `releaseDate` adalah tanggal kalender `YYYY-MM-DD`, harus cocok dengan `releaseYear` jika keduanya terisi. Language menggunakan BCP 47 canonical.

Archive via `POST /admin/videos/<video-id>/archive` dengan `{"expectedVersion":2}`. Snapshot menjadi version 3 dan memiliki `archivedAt`. Pengulangan dengan versi 3 mengembalikan snapshot sama; versi 2 sudah stale. Archive tidak menghapus row/genre/child. Konten published atau parent dengan child published ditolak. Parent archived melarang perubahan/child baru. Archive series/season memakai path serupa sesuai plan.

List `GET /admin/videos?kind=episode&seriesId=<series-id>&limit=20` mendukung cursor, search title, dan filter season. Default limit 20, maksimum 100. Response `{items:[],nextCursor:null}` bila kosong. Gunakan nextCursor hanya bersama filter yang sama. Default list menyembunyikan row atau parent archived; `includeArchived=true` menyertakannya. Detail admin masih dapat membaca metadata archived.

## Migrasi dan recovery

History auth `0000`–`0002` tetap utuh. Tambahan konten:

| Migrasi               | Isi                                                      |
| --------------------- | -------------------------------------------------------- |
| `0003_content-series` | series, seasons, editorial/audit/publication constraints |
| `0004_content-videos` | videos, kind/episode constraints, rights confirmation    |
| `0005_content-genres` | genres, series_genres, video_genres                      |

Migrator full sekarang memiliki enam entry. Pada tindak lanjut VERIFY-001 tanggal 3 Oktober 2026, **migrasi development lokal telah diterapkan**: journal 3 → 6, keenam tabel/constraints tersedia, dan data auth existing tetap utuh. Backup custom-format di luar repo tervalidasi melalui `pg_restore --list`; restore penuh belum diuji. Production belum dimigrasikan. Sebelum rollout, operator memeriksa `DATABASE_URL` pada API tanpa menyalin credential ke log, menyiapkan backup dan prosedur restore, lalu meninjau SQL pending terhadap journal target. Command dari root:

```sh
bun run --cwd apps/api db:migrate
```

Jalankan sebelum runtime baru menerima request metadata. Command membaca env API dan hanya menerapkan migration pending; tidak berjalan otomatis saat HTTP request. Periksa enam entry journal dan keberadaan tabel/FK, lalu login serta buat/read/edit/archive fixture konten pada target rollout. Backup/restore dan smoke deployment belum dibuktikan oleh test lokal ini. Auth masih mengikuti [Auth Operations](AUTH_OPERATIONS.md).

Rollback binary ke versi sebelum metadata dapat meninggalkan tabel tambahan tanpa mengubah data auth. Pertahankan tabel/data konten; jangan melakukan DROP sebagai rollback otomatis. Jika masalah schema perlu perbaikan, gunakan forward migration dengan proof terpisah. Jangan rollback lalu menjalankan proof destruktif pada target aplikasi.

## Proof dan hasil validasi

Siapkan `CONTENT_TEST_DATABASE_URL` sesuai [Environment](ENVIRONMENT.md#proof-metadata-konten) pada API env atau environment shell. Hanya database `vertical_movie_app_content_test` di localhost yang diterima; schema `public` dan `drizzle` dihapus dan dibangun ulang. Jalankan serial:

```sh
bun run --cwd apps/api content:schema:proof
bun run --cwd apps/api content:runtime:proof
bun run --cwd apps/api test
bun run lint
bun run check-types
bun run build
```

Evidence 3 Oktober 2026:

| Pemeriksaan                                          | Hasil                                                               |
| ---------------------------------------------------- | ------------------------------------------------------------------- |
| API units/HTTP tanpa I/O eksternal                   | 30 pass, 120 assertions                                             |
| Content schema                                       | 4 pass, 26 assertions                                               |
| Content repository/service runtime                   | 10 pass, 78 assertions                                              |
| Content HTTP native auth + combined OpenAPI          | 5 pass, 79 assertions                                               |
| Regression auth schema/runtime/authorization/OpenAPI | 20 pass, 160 assertions, serial pada DB auth dedicated              |
| Frozen install                                       | Lulus; dependency/lockfile tidak berubah                            |
| Root lint                                            | Lulus untuk web; API tidak mempunyai lint script                    |
| Root check-types                                     | API/web/auth lulus, termasuk Eden positive/negative compile fixture |
| Root build                                           | Kedua app lulus; warning Base UI `use client` existing dari bundler |

Proof mencakup constraints, default season atomic, genre rollback, inheritance, parent/episode/expectedVersion races, archive data retention, auth denial/ban/expiry/outage, serta preservation ID/account/hash/session existing melewati migrasi additive. Bukti ini lokal; belum mencakup storage, media worker, browser bisnis, load test atau deployment production. Riwayat commit per task ada pada [ledger plan](VIDEO_IMPLEMENTATION_PLAN.md#commit-ledger-tahap-a).

Retensi disepakati 4 Oktober 2026: video asli 7 hari dan file konten archived disimpan permanen. Pengecualian archived mencakup semua aset konten, termasuk video asli; Titik awal retensi sejak HLS verified-ready, upload session 24 jam dan cleanup gagal disetujui 4 Oktober 2026; proof implementasi masih pending. Detail pada [nomor 6](VIDEO_IMPLEMENTATION_PLAN.md#nomor-6--retensi-dan-cleanup-disetujui-4-oktober-2026). Implementasi perlu source deletion tombstone agar HLS siap tetap dapat dipublikasikan/diputar setelah objek sumber dihapus; reprocess membutuhkan unggah ulang. Tidak ada cleanup runtime atau lifecycle bucket yang diaktifkan.

## Task berikutnya — MEDIA-001

Lifecycle video terbaru disetujui 4 Oktober 2026: **draft → published → archived**, tanpa status produk unpublished. Ini target lanjutan, bukan schema/runtime yang sudah berubah. VID-016 menyiapkan compatibility; Pengguna memilih satu bucket aplikasi per environment pada 4 Oktober 2026. Kontrak nomor 4 disepakati 4 Oktober 2026: seluruh bucket privat, sources/ untuk input dan outputs/ untuk hasil immutable, master/variant playlist melalui API dan init/segment/caption langsung dari storage melalui signed GET URL. TTL playback disetujui 4 Oktober 2026: 2× durasi video aktual terverifikasi sejak URL diterbitkan; cache bila diaktifkan wajib memiliki expiry/invalidation, dengan cache terkait signed URL tidak melewati expiry URL. Cache metadata TTL 60 detik, playlist no-store dan cache segment privat maksimal min(300 detik, sisa umur URL) disetujui 4 Oktober 2026; proof response headers/invalidation masih diperlukan; archive menghentikan URL baru sementara URL lama berlaku sampai expiry. Kontrak akses memakai expiry URL lama, bukan pencabutan instan; tidak menjanjikan revocation instan atau CDN/custom-domain presign. Playlist disajikan API; data video langsung dari storage. Gateway yang memproksi seluruh segment bukan kontrak yang dipilih. Detail pada [plan nomor 4](VIDEO_IMPLEMENTATION_PLAN.md#nomor-4--akses-video-distribusi-hls-dan-cache-disepakati-4-oktober-2026).

Keputusan resolusi sumber dan keluaran HLS: minimum 480p, maksimum 1080p; sumber 1440p/4K ditolak, tanpa upscale/crop otomatis. Validasi memakai fakta FFprobe dengan rotasi/SAR; sisi pendek 480–1080 dan sisi panjang maksimal 1920. Semua video/sampul wajib portrait 9:16. Source MP4/MOV/MKV H.264/H.265 dan WebM VP8/VP9, batas terbaru per kind movie/standalone maksimal 30 menit dan 1,5 GB (1.500.000.000 byte), episode maksimal 10 menit dan 512 MB disetujui. Standar sampul seragam antarjenis konten: gambar diam JPG/JPEG/PNG/WebP maksimal 5 MB (5.000.000 byte), sumber minimal 1080 × 1920 portrait 9:16, hasil WebP 1080 × 1920. Sumber 9:16 lebih besar diperkecil; gambar di bawah minimum/rasio lain/animasi ditolak. Limit berlaku juga untuk file yang lebih pendek; movie/standalone sampai 10 menit juga memakai limit per kind 1,5 GB. Batas source mencakup audio/container dan diutamakan atas acuan bitrate; movie/standalone penuh 30 menit membutuhkan budget total sekitar 6,67 Mbps. Acuan ekspor sumber H.264 SDR 1080p24–30 pada 4–6 Mbps (default 6 Mbps), audio AAC 128 kbps; default memberi estimasi sekitar 459,6 MB untuk 10 menit dan 1.378,8 MB untuk 30 menit sebelum overhead. Profil hls-v1 disetujui terpisah; proof teknis tetap pending. Ini kontrak target, belum validasi upload runtime.

Keputusan pengguna 3 Oktober 2026: **MinIO development, Cloudflare R2 production melalui S3-compatible, pemilihan env, HLS VOD**. Bucket development `vertical-movie-app` dibuat pengguna pada Console `http://localhost:9001/browser/vertical-movie-app`; API S3 memakai `http://localhost:9000`. Bucket/credential/akses R2 belum diprovision. Setup sample/config target ada pada [Environment](ENVIRONMENT.md#storage-dan-hls--konfigurasi-yang-direncanakan).

MEDIA-CFG-001 → MEDIA-PROOF-001 → MEDIA-DESIGN-001 membuktikan adapter native/provider, kemudian membuktikan S3 multipart yang telah disetujui: create/part/list/complete/abort, upload part langsung dari browser, sampul kecil satu part, rekonsiliasi/resume, limits/expiry/CORS/checksum serta sumber immutable. Ukuran part disetujui: target 2% ukuran file aktual per part, minimum 5 MiB selain part terakhir. Session 24 jam disetujui pada nomor 6; maksimal 3 part paralel per file dan URL part 15 menit dibatasi sisa session disetujui 4 Oktober 2026; proof implementasi tetap diperlukan. Geometry dihitung sekali dan disimpan per session; ukuran/jumlah part contoh dan fallback file kecil mengikuti plan. Pembagian part upload berbeda dari segment HLS hasil FFmpeg. MEDIA-SCHEMA/UPLOAD/COMPLETE/CLEANUP membangun tahap B. **hls-v1 disetujui 4 Oktober 2026**: H.264 SDR, AAC 128 kbps bila audio tersedia, target video 480p/720p/1080p 1,2/2,5/4,5 Mbps, output maksimal 30 fps, segment fMP4 dengan target 6 detik dan pemilihan kualitas adaptif; tanpa crop/upscale, hanya kualitas yang dapat dibuat dari sumber. Detail encoder/GOP/SAR/VFR/MIME serta kualitas visual dan compatibility tetap memerlukan proof HLS-PROFILE-001. HLS-PROFILE/DELIVERY membuktikan profil dan menetapkan akses master/variant/init/segment; MEDIA-R2-001 mengulang proof pada bucket staging khusus. Task dan acceptance ada pada [backlog media](tasks/media.md). Alternatif dependency hanya setelah gap native terbukti; credential asli tidak dimasukkan dokumen atau contoh env.

[Kebijakan worker nomor 7](VIDEO_IMPLEMENTATION_PLAN.md#nomor-7--kebijakan-worker-disetujui-4-oktober-2026) mencatat persetujuan parameter melalui env server dan MEDIA_WORKER_CONCURRENCY default 1 pada 4 Oktober 2026. Retry/deadline/lease/recovery juga disetujui; satu instance awal masih rekomendasi deployment. Kebijakan: tiga attempt total (pertama + dua retry, backoff 60/300 detik), heartbeat 15 detik/lease 120 detik/recovery 30 detik; timeout encode max(15 menit,3×durasi), watchdog 5 menit. Penentuan thread/RAM/disk lewat benchmark disetujui; angka kandidat resource serta attempt total 2 jam/probe/poll/shutdown tetap rekomendasi teknis. Klasifikasi error dan fencing/cleanup memerlukan proof. Persetujuan env/concurrency belum menjadi implementasi; schema/runner masih pending.

[Rekomendasi deployment nomor 8](VIDEO_IMPLEMENTATION_PLAN.md#nomor-8--rekomendasi-deployment-production-dan-r2-belum-disetujui) dicatat sebagai belum disetujui: satu server Linux dengan proses web/API/worker/PostgreSQL terpisah via Docker Compose, reverse proxy HTTPS, bucket R2 privat/token scoped/CORS, volume DB/workspace serta backup/restore proof. Target uji pengguna 4 core/RAM 4 GB; provider/domain/disk belum ditentukan. Kandidat worker 1,5 GiB/2 vCPU/thread 1 serta kapasitas keseluruhan menunggu benchmark; same-origin dan signed S3 delivery mengikuti keputusan yang sudah ada. Tidak ada Dockerfile/Compose/provisioning/deployment/migration baru.

WORKER-001/002 kemudian membangun queue/FFmpeg dengan keluaran HLS lengkap sebelum ready; PUBLISH/PUBLIC membuka visibility dan playback. Draft/source tetap privat dan presigned master saja tidak cukup untuk seluruh HLS. Operasi storage, worker, browser HLS dan R2 belum diuji pada sesi update plan ini; belum ada integrasi runtime/dependency media baru.
