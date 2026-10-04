# Repository Context — Video, Series, dan Movie

## Snapshot lanjutan — storage dan HLS

- Repository: `bayuaji17/vertical-movie-app`.
- Base ref lokal: `codex/design-system-final`.
- Base SHA diperiksa: `0d3bef87f6d2f9b0a2873078f9b560f092f13c53`.
- Analyzed at: 2026-10-04, Asia/Jakarta; snapshot kode tetap pada SHA di atas.
- Context status: **current untuk finalisasi plan media**; snapshot tahap A di bawah dipertahankan sebagai riwayat.
- Keputusan pengguna: MinIO untuk development, Cloudflare R2 melalui API S3-compatible untuk production, pemilihan melalui env, streaming HLS.
- Keputusan resolusi lanjutan 3 Oktober 2026: sumber dan keluaran HLS minimum 480p, maksimum 1080p; sumber di atas 1080p termasuk 1440p/4K ditolak, bukan otomatis diturunkan. Semua video/sampul wajib portrait 9:16, standar sampul gambar diam JPG/JPEG/PNG/WebP <=5 MB, sumber minimal 1080 × 1920 dan hasil WebP 1080 × 1920 seragam antarjenis konten; keputusan ini menggantikan izin landscape pada snapshot historis di bawah. Batas sumber terbaru per kind disetujui: movie/standalone maksimal 30 menit dan 1,5 GB (1.500.000.000 byte), episode maksimal 10 menit dan 512 MB. Limit berlaku juga untuk file yang lebih pendek. Acuan ekspor sumber H.264 SDR 1080p24–30 pada 4–6 Mbps (default 6 Mbps), audio AAC 128 kbps; default memberi estimasi sekitar 459,6 MB untuk 10 menit dan 1.378,8 MB untuk 30 menit sebelum overhead. Profil hls-v1 disetujui terpisah pada 4 Oktober 2026; proof teknis tetap pending. Acuan bitrate ekspor tunduk pada size limit. Aturan dimensi dan proof boundary ada pada plan/backlog media; runtime media belum diimplementasikan.
- Bucket development `vertical-movie-app` telah dibuat oleh pengguna. URL `http://localhost:9001/browser/vertical-movie-app` adalah Console; endpoint S3 lokal adalah `http://localhost:9000`. Keberadaan bucket dilaporkan pengguna; operasi objek/izin bucket belum diuji pada sesi planning ini.

### Evidence kode dan batas implementasi lanjutan

| Evidence pada SHA lanjutan                                                                                                                      | Hasil inspeksi                                                                                                                                        |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/api/src/app.ts:createApp`, `src/index.ts`                                                                                                 | Auth dan 16 endpoint metadata terpasang; service series/videos/genres menerima dependency DB; belum ada module media, queue, delivery atau publikasi. |
| `apps/api/src/db/schema/index.ts`, `apps/api/drizzle/meta/_journal.json`                                                                        | Enam tabel metadata bersama auth; enam entry migration. Tidak ada schema aset/upload/job/rendition.                                                   |
| `apps/api/src/config/env.ts:loadApiEnv`, `apps/api/.env.example`                                                                                | Loader runtime hanya memvalidasi port/database/auth/origin. Sampel `S3_*`/FFmpeg adalah placeholder, belum dipakai storage.                           |
| `turbo.json:api#dev,api#start`                                                                                                                  | Variabel `S3_*`/FFmpeg diteruskan; selector storage belum tersedia. Perubahan Turbo kelak mengikuti bundled docs versi terpasang.                     |
| `apps/web/src/routes/api/auth/$.ts`, `src/lib/api/client.ts`                                                                                    | Gateway hanya auth; client Eden bisnis bertipe sudah ada.                                                                                             |
| `apps/web/src/components/vertical-video-player.tsx`, `apps/web/package.json`                                                                    | Demo memakai `Video` untuk MP4 dan Video.js React/core `10.0.0-rc.4`; integrasi HLS belum aktif.                                                      |
| `apps/web/node_modules/@videojs/react/docs/guides/media-sources.md`, `reference/components/hlsjs-video.md`, `reference/components/hls-video.md` | Bundled docs menjelaskan media HLS dan adapter hls.js; keputusan adapter final memerlukan proof browser, bukan asumsi MP4 component langsung cukup.   |

### Integrasi dan keputusan yang tersisa

Lifecycle video terbaru disetujui 4 Oktober 2026: **draft → published → archived**, tanpa status produk unpublished. Ini target lanjutan, bukan schema/runtime yang sudah berubah. VID-016 menyiapkan compatibility; Pengguna memilih satu bucket aplikasi per environment pada 4 Oktober 2026. Kontrak nomor 4 disepakati 4 Oktober 2026: seluruh bucket privat, sources/ untuk input dan outputs/ untuk hasil immutable, master/variant playlist melalui API dan init/segment/caption langsung dari storage melalui signed GET URL. TTL playback disetujui 4 Oktober 2026: 2× durasi video aktual terverifikasi sejak URL diterbitkan; cache bila diaktifkan wajib memiliki expiry/invalidation, dengan cache terkait signed URL tidak melewati expiry URL. Cache metadata TTL 60 detik, playlist no-store dan cache segment privat maksimal min(300 detik, sisa umur URL) disetujui 4 Oktober 2026; proof response headers/invalidation masih diperlukan; archive menghentikan URL baru sementara URL lama berlaku sampai expiry. Kontrak akses memakai expiry URL lama, bukan pencabutan instan; tidak menjanjikan revocation instan atau CDN/custom-domain presign. Playlist disajikan API; data video langsung dari storage. Gateway yang memproksi seluruh segment bukan kontrak yang dipilih. Detail pada [plan nomor 4](VIDEO_IMPLEMENTATION_PLAN.md#nomor-4--akses-video-distribusi-hls-dan-cache-disepakati-4-oktober-2026).

`STORAGE_PROVIDER=minio|r2` dan satu kontrak adapter S3 direncanakan untuk API/worker. Endpoint, region, bucket dan credential berasal dari env server. Provider disimpan bersama identitas aset agar perubahan env tidak menafsirkan objek lama sebagai objek provider baru. Mengganti env bukan migrasi/copy data.

HLS untuk video on-demand dipilih; FFmpeg akan menghasilkan master/variant playlist beserta seluruh segment dan init file bila memakai fMP4. R2 menyimpan hasil, bukan menjalankan transcoding. **hls-v1 disetujui 4 Oktober 2026**: H.264 SDR, AAC 128 kbps bila audio tersedia, target video 480p/720p/1080p 1,2/2,5/4,5 Mbps, output maksimal 30 fps, segment fMP4 dengan target 6 detik dan pemilihan kualitas adaptif; tanpa crop/upscale, hanya kualitas yang dapat dibuat dari sumber. Detail encoder/GOP/SAR/VFR/MIME serta kualitas visual dan compatibility tetap memerlukan proof HLS-PROFILE-001. Paralelisme, expiry, distribusi seluruh objek HLS dan batas akses setelah archive sudah disepakati; identity resume, header provider dan implementasinya memerlukan proof. Metode upload S3 multipart dengan pembagian file menjadi part kecil telah dipilih, termasuk sampul kecil satu part; ukuran part target 2% ukuran file aktual (minimum 5 MiB selain part terakhir) disetujui pada 4 Oktober 2026. Session 24 jam disetujui pada nomor 6; maksimal 3 part paralel per file dan URL part 15 menit dibatasi sisa session disetujui 4 Oktober 2026. Presigned URL master saja tidak memberi izin pada playlist/segment turunannya.

Perubahan worktree desain yang sudah ada (`apps/web/src/styles.css`, `docs/DESIGN_SYSTEM.md`, indeks docs dan artefak desain) milik pekerjaan aktif lain dipertahankan. Otorisasi finalisasi 4 Oktober 2026 mencakup dokumen, sampel env, branch codex/media-backend-plan dan commit planning. Runtime, akun/bucket, migrasi dan deployment belum dikerjakan. Push tidak termasuk otorisasi; credential tidak dibaca untuk planning. Evidence pengujian metadata sebelumnya tetap merujuk backlog; tidak dijalankan ulang sebagai proof media.

Referensi resmi diperiksa 3 Oktober 2026: [Bun S3](https://bun.com/docs/runtime/s3), [R2 S3 compatibility](https://developers.cloudflare.com/r2/api/s3/api/), [R2 presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/), [R2 CORS](https://developers.cloudflare.com/r2/buckets/cors/), [FFmpeg HLS muxer](https://ffmpeg.org/ffmpeg-formats.html#hls-2). Bukti dokumentasi vendor tidak menggantikan proof operasional MinIO/R2.

[Rekomendasi deployment nomor 8](VIDEO_IMPLEMENTATION_PLAN.md#nomor-8--rekomendasi-deployment-production-dan-r2-belum-disetujui) dicatat sebagai belum disetujui: satu server Linux dengan proses web/API/worker/PostgreSQL terpisah via Docker Compose, reverse proxy HTTPS, bucket R2 privat/token scoped/CORS, volume DB/workspace serta backup/restore proof. Target uji pengguna 4 core/RAM 4 GB; provider/domain/disk belum ditentukan. Kandidat worker 1,5 GiB/2 vCPU/thread 1 serta kapasitas keseluruhan menunggu benchmark; same-origin dan signed S3 delivery mengikuti keputusan yang sudah ada. Tidak ada Dockerfile/Compose/provisioning/deployment/migration baru.

### Observasi untuk rekomendasi worker — 4 Oktober 2026

Read-only pada mesin development: 12 CPU logis, RAM sekitar 7,4 GiB; /tmp adalah tmpfs sekitar 3,8 GiB, sedangkan /var/tmp berada pada disk root dengan sekitar 945 GiB tersedia saat pemeriksaan. command -v tidak menemukan ffmpeg/ffprobe pada PATH; ini bukan proof executable tidak ada di lokasi lain. Source API hanya memiliki config env; belum ada worker/queue/storage module atau script worker pada apps/api/package.json. Pengguna menyetujui parameter worker melalui env dan concurrency default 1 pada 4 Oktober 2026; sample API memuat MEDIA_WORKER_CONCURRENCY=1. Pengguna kemudian menyetujui retry/deadline/lease/recovery dan penentuan thread/RAM/disk melalui benchmark. Angka kandidat resource serta detail teknis tambahan belum dibekukan/benchmark. Loader dan worker belum diimplementasikan. Detail [rekomendasi nomor 7](VIDEO_IMPLEMENTATION_PLAN.md#nomor-7--kebijakan-worker-disetujui-4-oktober-2026).

## Snapshot historis tahap A

- Repository: `bayuaji17/vertical-movie-app`.
- Base ref: `main`.
- Base SHA: `d1d3e0a36a4adf1c7198db7a1d36c49e9f1c93ed`.
- Analyzed at: 2026-10-04, Asia/Jakarta; snapshot kode tetap pada SHA di atas.
- Context status: snapshot historis sebelum implementasi; peta di bawah menjelaskan base SHA, bukan keadaan branch hasil.
- Scope snapshot: inspeksi dan penulisan dokumen sebelum persetujuan implementasi.

## Hasil implementasi — 3 Oktober 2026

Pengguna menyetujui metadata D1–D3 dan implementasi dengan branch baru serta commit per task. Branch `feat/video-metadata` menambahkan enam tabel metadata, migrasi additive `0003`–`0005`, module `series`, `genres`, dan `videos`, serta 16 endpoint admin. Bootstrap memakai pool auth yang sama dan native session reader. Eden compile-only dan Scalar gabungan tervalidasi. Schema/HTTP/repository diuji pada PostgreSQL dedicated; data auth lama terjaga pada regression migration proof. Pada penutupan VID-015 database development belum dimigrasikan. Tindak lanjut VERIFY-001 kemudian menerapkan migrasi lokal 0003–0005, journal menjadi enam entry, dan data auth existing tetap sama. Storage S3, worker, publikasi/katalog, dan gateway bisnis web tetap task berikutnya. Peta evidence aktual dan batas validasi ada pada [plan](VIDEO_IMPLEMENTATION_PLAN.md), [backlog](tasks/videos.md), dan [Video Operations](VIDEO_OPERATIONS.md).

## Product and Users

Pengunjung menonton konten terbit tanpa login; satu admin mengelola konten. Pada 3 Oktober 2026 pengguna meminta plan detail serta model data yang mengakomodasi series dengan banyak video dan movie panjang. Permintaan ini mengizinkan perencanaan dukungan tersebut; detail season, metadata, dan aturan publikasi pada [model data](VIDEO_DATA_MODEL.md) masih usulan untuk ditinjau.

## Repository Map

| Subsystem                                     | Keadaan dan tanggung jawab                                                                                                       |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `apps/api`                                    | Elysia, factory HTTP, PostgreSQL/Drizzle/Bun SQL, auth native, Scalar, unit/proof integrasi. Belum ada modul video/series/media. |
| `apps/web`                                    | TanStack Start, login/admin shell, SDK auth, TanStack Query, client Eden, demo Video.js. Gateway yang tersedia hanya auth.       |
| `packages/auth`                               | Pemilik Better Auth server/client/types dan schema auth canonical; tidak menjadi pemilik domain konten.                          |
| `docs`                                        | PRD, arsitektur, workflow, evidence/backlog auth, database tooling, dan rancangan media baru.                                    |
| `.agents`, `.commandcode`, `skills-lock.json` | Skill repo dan metadata; bukan runtime.                                                                                          |
| `.husky`, `commitlint.config.cjs`             | Gate lint/type-check dan Conventional Commits.                                                                                   |
| Root manifests, `turbo.json`, `bun.lock`      | Workspace Bun, task/cache dan dependency; tidak perlu diubah untuk sesi dokumentasi.                                             |
| `README.md`, `.gitignore`, `LICENSE`          | Panduan mulai, batas file lokal/output, lisensi.                                                                                 |

## Architecture and Boundaries

- API memiliki schema konten, aturan bisnis, query, dan otorisasi. Web mengonsumsi tipe `api/types` melalui Eden; auth tetap melalui SDK `@repo/auth`.
- `createDatabase()` membuat satu pool Bun SQL/Drizzle. `createApp()` saat ini menerima client untuk shutdown, handler auth, dan schema auth; dependency service/query bisnis belum diinjeksi.
- Macro `createRequireAdmin()` membaca sesi authoritative dengan `disableCookieCache: true` serta memeriksa role/ban/expiry. Pasang sebelum rute privat dan pertahankan inferensi chaining Elysia.
- `createApp()` saat ini hanya memasang root publik, `/api/auth/*`, dan Scalar. Schema aplikasi dihitung sebelum plugin Scalar; semua modul bisnis harus diregistrasikan sebelum schema dihitung.
- File runtime dan dokumentasi tetap pada app/root yang memiliki tanggung jawabnya. Tidak perlu package konten bersama.

## Runtime and Data Flow

Saat ini browser menggunakan gateway `/api/auth/*`. `createApiClient()` Eden menerima base browser `/api`, tetapi belum ada gateway bisnis untuk `/api/admin/*` atau `/api/videos/*`. Target backend yang diusulkan memakai rute `/admin/*` dan `/videos/*` tanpa prefix `/api`; gateway bisnis nanti menghapus tepat satu prefix `/api`. Auth tetap meneruskan `/api/auth/*` tanpa perubahan.

Tahap metadata: HTTP admin → macro admin → service → repository Drizzle → PostgreSQL. Tahap media: unggah storage → verifikasi API → enqueue atomik → worker Bun terpisah → FFprobe/FFmpeg → storage hasil → status database. Infrastruktur media belum tersedia.

## Domain and Data Model

`src/db/schema/index.ts` saat ini hanya mengekspor schema auth. Migrasi yang tersedia `0000_auth-admin`, `0001_native-admin-expand`, dan `0002_native-admin-contract`; jangan mengubah riwayat tersebut. Usulan domain baru: `series → seasons → videos(kind=episode)`, bersama `videos(kind=movie|standalone)` tanpa season. Genre relasional dan tabel media akan ditambahkan bertahap. Detail nullable, constraint, lifecycle, dan tahap migrasi ada di [VIDEO_DATA_MODEL.md](VIDEO_DATA_MODEL.md).

## External Integrations

- Runtime yang diperiksa: Bun **1.4.2**, Elysia **1.4.30**, Drizzle ORM **0.45.3**; Drizzle Kit manifest **0.31.11**.
- Auth dan migrasi menggunakan driver Bun SQL yang sudah ada. Database live tidak diakses selama planning.
- Storage R2/S3, queue worker, FFmpeg/FFprobe, profil HLS dan distribusi belum diimplementasikan. HLS dicatat sebagai arah pada workflow; codec/resolusi/delivery masih perlu keputusan.
- Movie panjang perlu batas ukuran/durasi, upload terputus/resumable, resource worker dan profil landscape; belum ada bukti kompatibilitas provider untuk kebutuhan ini.

## Development, Testing, and Delivery

`apps/api/package.json` memiliki `test: bun test ./src` serta proof PostgreSQL terpisah. Jalankan test HTTP melalui `app.handle` tanpa port dan database integrasi khusus test. Root `check-types` mencakup API/web/auth, `build` dua app, dan `lint` hanya web. Frozen install wajib setelah perubahan dependency/script. Tidak menambah GitHub CI. Persetujuan plan tidak otomatis mengizinkan migrasi development, commit, push, atau PR.

## Constraints and Conventions

Ikuti root AGENTS, API Development, Global Workflow dan Task Template. Tabel auth canonical tidak diubah. Jangan membaca/menulis env berisi secret untuk planning. File route tree web dihasilkan tooling; tidak diedit manual. Player tidak diubah pada tahap metadata; skill Video.js dan bundled docs diperlukan saat pekerjaan playback dilakukan.

## Relevant Active Work

Worktree bersih saat inspeksi. Backlog auth mencatat refactor dan follow-up selesai pada level lokal; rollout produksi masih terpisah. `REPOSITORY_CONTEXT.md` dan `IMPLEMENTATION_PLAN.md` adalah riwayat auth dan dipertahankan. Rancangan baru menggunakan nama dokumen terpisah agar riwayat auth tidak tertimpa.

## Exploration Coverage

Diperiksa: root/app/package manifest, AGENTS, indeks docs, PRD/Architecture/Global Rules/Workflow/Template, aturan API, environment tanpa env lokal, auth backlog, factory/bootstrap/schema/migrator/guard/OpenAPI, client Eden, gateway auth dan test factory/client. Folder skills/hooks/config diperiksa per peran dan batas, bukan seluruh isinya. Player skin/UI, auth internal secara menyeluruh, storage live, database live dan deployment tidak diaudit ulang karena bukan perubahan planning ini.

## Unknowns and Assumptions

Season disarankan sejak awal; series sederhana mempunyai Season 1. Movie dapat landscape dan tidak ditentukan otomatis oleh durasi. Genre masuk metadata dasar; cast/crew/translation/trailer dan franchise ditunda. Kebijakan publishing parent, slug, archive, dan concurrency dijabarkan sebagai usulan, bukan perilaku aktif.

## Evidence Index

Semua evidence kode berikut merujuk Base SHA di atas.

| Evidence                                                                            | Kesimpulan                                                                  |
| ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `apps/api/src/app.ts:createApp`, `createAuthRoutes`                                 | Rute aktif dan urutan schema Scalar; belum ada bisnis konten.               |
| `apps/api/src/index.ts`                                                             | Satu pool dan wiring auth pada bootstrap.                                   |
| `apps/api/src/db/client.ts:createDatabase`, `db/schema/index.ts`                    | Bun SQL/Drizzle tersedia; schema baru perlu diekspor.                       |
| `apps/api/src/db/migrate.ts:applyDatabaseMigrations`, `drizzle/meta/_journal.json`  | Migrasi eksplisit; history auth tetap dipertahankan.                        |
| `apps/api/src/modules/auth/admin/guard.ts:createRequireAdmin`                       | Otorisasi reusable yang harus dipakai rute bisnis privat.                   |
| `apps/api/src/types.ts:App`                                                         | Kontrak API type-only yang mengikuti factory.                               |
| `apps/web/src/lib/api/client.ts:createApiClient`, `createPrivateApiClient`          | Base `/api`, cookie, parseDate false, failure handling privat.              |
| `apps/web/src/routes/api/auth/$.ts`, `lib/server/auth-gateway.ts:createAuthGateway` | Gateway hanya auth; bisnis butuh wiring tersendiri.                         |
| `docs/README.md`, `tasks/auth.md`                                                   | Evidence auth lokal; keterbatasan produksi.                                 |
| `AGENTS.md`, `docs/API_DEVELOPMENT.md`, `GLOBAL_WORKFLOW.md`, `TASK_TEMPLATE.md`    | Ownership, pengujian, dependency injection, scope dan workflow.             |
| `docs/PRD.md:PRD-03–07,09`, `ARCHITECTURE.md`                                       | Alur draf/media/publikasi; rancangan data lama belum mencakup series/movie. |

Referensi resmi yang diperiksa pada 3 Oktober 2026: [PostgreSQL constraints](https://www.postgresql.org/docs/current/ddl-constraints.html), [date/time](https://www.postgresql.org/docs/current/datatype-datetime.html), [Drizzle constraints](https://orm.drizzle.team/docs/indexes-constraints), [Eden Treaty](https://elysiajs.com/eden/treaty/overview), [Bun UUIDv7](https://bun.com/docs/runtime/utils#bun-randomuuidv7), [Bun S3](https://bun.com/docs/runtime/s3), [PostgreSQL queue locking](https://www.postgresql.org/docs/current/sql-select.html), dan [FFprobe](https://ffmpeg.org/ffprobe.html). Dokumen vendor melandasi mekanisme teknis; model produk adalah rancangan aplikasi.
