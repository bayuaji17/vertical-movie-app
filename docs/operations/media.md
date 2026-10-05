# Media Operations — development

Implementasi development pada feat/media-backend berdasarkan base 4ce185d. Bukti lokal tidak mengesahkan rollout production. [Plan](../plans/video/implementation-plan.md), [model](../architecture/video-data-model.md), [upload contract](../architecture/media-upload-contract.md) dan [Environment](../guides/environment.md).

## Uploader admin — schema development 5 Oktober 2026

ADUP-004 menambahkan nullable `expected_sha256` melalui generated `0009_upload-fingerprint`. Journal development sekarang10; angka journal9 pada evidence backend di bawah merupakan riwayat sebelum perubahan ini. Backup custom-format dibuat melalui pg_dump PostgreSQL18 sebelum command resmi `bun run --cwd apps/api db:migrate`; pg_restore list berhasil membaca archive61216 byte. Backup/snapshot berada di ignored `.turbo/admin-media-upload-implementation/backups/`, directory0700/file0600, di luar Git; jangan menghapus backup sebelum review/rilis selesai.

Snapshot sebelum/sesudah membuktikan17 tabel tetap utuh: user1/account1/session2/rate_limit1/video1, lainnya kosong. Dedicated test membuktikan legacy upload/asset/auth preservation, nullable/no backfill, digest constraint dan rerun. Fingerprint binding API/worker mengikuti ADUP-005; UI belum tersedia. Full restore serta migration production memerlukan rollout terpisah. Rincian checks/receipt pada [backlog uploader](../tasks/admin-media-upload.md).

## Menjalankan API, web dan worker

Gunakan Bun 1.4.2+, PostgreSQL, MinIO existing dan Linux dengan FFmpeg/FFprobe serta GNU timeout. WSL Debian pada host ini memiliki FFmpeg 7.1.5/libx264/libwebp. Isi apps/api/.env yang ignored dengan credential aplikasi scoped bucket dan origin auth/web yang konsisten; port 9000 untuk S3, 9001 Console. Bucket vertical-movie-app tetap private.

```sh
bun install --frozen-lockfile
bun run --cwd apps/api db:migrate
bun run dev
# Terminal terpisah, cwd app agar Bun memuat env API:
bun run --cwd apps/api worker
```

Worker tidak ikut start API/Turbo dev. Build root menghasilkan apps/api/dist/index.js dan dist/workers/index.js serta apps/web/.output/. Jalankan worker build dengan bun run --cwd apps/api worker:start. Parameter worker berasal dari env API; command app-local tidak kehilangan variabel pada strict mode Turbo. Default satu job per instance dan satu thread FFmpeg; menaikkan jumlah instance berarti total concurrency bertambah.

Default disk kerja minimum 10 GiB, poll 5s, heartbeat 15s, lease 120s, recovery 30s, encoding max(900s,3×durasi), stall 300s, hard job 7200s, shutdown grace 60s dan TERM→KILL 10s. Resource/config failures pause 300s tanpa memakai budget retry media; kegagalan transient punya tiga attempt dengan jeda 60/300s. Kandidat resource belum benchmark mesin 4 core/4 GB. Kerja FFmpeg/network di luar transaksi. Download dibatasi ukuran aktual dan dapat dibatalkan; output di namespace attempt immutable dan activated dengan lease/generation fence.

## Kontrak HTTP

Semua route API berikut melewati prefix /api pada origin web; backend internal tidak memakai prefix itu untuk route bisnis.

| Akses  | Route backend                                                  | Perilaku                                             |
| ------ | -------------------------------------------------------------- | ---------------------------------------------------- |
| Admin  | POST /admin/media/uploads                                      | Idempotent initiate; body pada Upload Contract       |
| Admin  | GET /admin/media/uploads/:id                                   | Parts/progress byte, status upload dan processing    |
| Admin  | POST .../:id/parts                                             | Body partNumber; URL PUT atau alreadyUploaded        |
| Admin  | POST .../:id/complete atau /abort                              | Freeze+enqueue atau abort                            |
| Admin  | POST /admin/videos/:id/publish atau /admin/series/:id/publish  | expectedVersion dan UUID idempotencyKey              |
| Admin  | POST /admin/videos/:id/archive                                 | expectedVersion; optimistik, timestamp archive tetap |
| Admin  | GET /admin/videos/:id/playback                                 | Preview DTO; memerlukan source+poster ready          |
| Admin  | GET /admin/videos/:id/hls/master.m3u8 dan /hls/variants/:index | Otorisasi ulang tiap playlist                        |
| Publik | GET /videos, /videos/:slug, /videos/:slug/next                 | Katalog DTO whitelisted; video list limit/cursor     |
| Publik | GET /series, /series/:slug                                     | Hanya series dengan child playable                   |
| Publik | GET /videos/:slug/playback                                     | DTO HLS/poster terpisah dari metadata                |
| Publik | GET /playback/videos/:slug/master.m3u8 dan /variants/:index    | Playlist baru hanya effective playable               |

Private routes memakai Better Auth authoritative requireAdmin. OpenAPI /openapi/json mencakup 26 operation admin dan playlist ber-extension .m3u8; /openapi menampilkan Scalar. Web /watch/$slug dan /admin/videos/$id/preview menyediakan player minimal, tanpa mengganti dashboard desain dengan upload UI baru.

Status editorial video draft→published→archived terpisah dari upload dan state asset/job. Publish manual memerlukan title/synopsis, rights dan source/HLS/poster verified-ready. Original tombstone tidak menghalangi publish/playback dari HLS. Episode published dalam series draft tetap tersembunyi; series publish memerlukan poster dan setidaknya satu episode published-ready. Series tanpa child playable tersembunyi tanpa mengubah status editorial otomatis. Lifecycle dan update metadata series lama dipertahankan; perubahan metadata menginvalidasi katalog setelah commit. Series published yang kehilangan title/synopsis tidak tampil sampai syarat metadata dipenuhi kembali.

Publish idempotency disimpan sepanjang umur row; konflik payload 409. Archive memakai expectedVersion dan rowVersion yang baru; request versi lama ditolak, request terhadap versi archived saat ini mempertahankan timestamp. Restore/republish serta revisi video published belum tersedia. Update metadata series existing tetap tersedia.

## Playback, cache dan storage

Satu bucket per profil: sources/<asset>/original atau poster-original, uploads/ staging, outputs/<asset>/<job>/<lease-token>/ HLS/WebP. Source tidak dipakai streaming. Tidak ada prefix public. Master/variant melalui gateway/API dan di-rewrite; init/segment langsung signed GET bucket. URL hanya untuk objek output yang telah diverifikasi. Profil persistensi provider/bucket tetap dicek terhadap runtime; mengganti env tidak memindahkan data.

TTL signing ceil(2×durationMs/1000) detik. Playback DTO dan playlist private,no-store; payload MinIO memakai private,no-store sebagai fallback konservatif. Metadata/catalog cache TTL 60s, unsigned, bounded, invalidated setelah commit publish/archive; lintas instance mengandalkan TTL. Archive menutup URL baru; URL lama dapat dipakai sampai expiry dan buffer tidak ditarik kembali. Player renew pada expiry/play/seek/pergantian kualitas, menjaga posisi/pause dan berhenti pada kegagalan akses, tanpa loop renewal.

MinIO development melalui STORAGE_PROVIDER=minio. Production memilih r2 dengan HTTPS account.r2.cloudflarestorage.com/region auto; NODE_ENV=production menolak MinIO. Jangan expose S3 credentials pada VITE_*. MEDIA_PLAYBACK_BASE_URL default WEB_ORIGIN/api dan harus sama origin. Browser perlu bisa menjangkau signed S3 endpoint dan CORS GET/PUT/HEAD/Range/ETag. Domain internal Docker tidak boleh mengganti hostname URL yang telah ditandatangani. R2 staging belum diuji.

## Retensi dan failure recovery

Original sukses dihapus paling cepat tujuh hari setelah HLS verified-ready; terminal failed source tujuh hari setelah failed_at, tanpa job aktif. Original provenance/metadata/tombstone tetap tersedia. Owner archived mempertahankan semua file valid yang masih ada; archive yang terjadi setelah deletion claim tidak dapat mengembalikan original. Cleanup dengan claim persisten dapat diteruskan idempotently setelah crash.

Upload resume 24h; explicit abort segera; invalid completed upload serta output attempt gagal karantina 24h. Sweep hourly menggunakan session/key/prefix persisten, tanpa menyapu bucket aplikasi. Current successful HLS/WebP tidak terkena partial sweep. Direktori kerja temporary dibersihkan setelah process berhenti; recovery orphan hanya directory token yang tercatat dan melewati bound timeout subprocess. Jangan membuat unconditional lifecycle bucket tujuh hari karena akan menghapus archived original.

Pada failure cek processing.failureCode/jobState lewat status upload, log worker kode stabil, space direktori kerja, config profil dan keberadaan FFmpeg. Worker menangani transient retry/expired lease otomatis. Tidak tersedia manual reprocess endpoint setelah job terminal; koreksi upload dilakukan pada draft melalui session baru. FFmpeg raw stderr, credential dan signed URL tidak ditulis log.

## Migrasi development

0006_media-upload, 0007_media-jobs, 0008_media-publication generated/reviewed dan applied melalui command resmi. Journal development 6→7→9; snapshot auth dan metadata existing utuh (user/account/session masing-masing1,rate_limit3; metadata existing kosong). Backup sebelum 0006: /home/bandev/backups/vertical-movie-app/media-before-0006-1791112537710.sql; sebelum 0007/0008: media-before-0007-0008-1791116342579.sql pada directory yang sama, permissions 0700/0600. Full restore belum dibuktikan.

Migration 0008 mempertahankan firstPublishedAt/rowVersion/audit; legacy unpublished→draft, archivedAt existing→archived, publishedAt dibersihkan pada kedua mapping. Migration lama tidak diedit. Binary sebelum media tidak kompatibel dengan status archived: jangan rollback binary lama tanpa prosedur restore/mapping yang ditinjau. Production migration/backup/rollout memerlukan scope deployment tersendiri.

## Validasi dan batas evidence

| Suite                  | Hasil lokal                                       | Batas                                                                                                       |
| ---------------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| API unit               | 72/267                                            | Factory/guard/config/policy/manifest/probe                                                                  |
| Content regression     | 19/204                                            | PostgreSQL dedicated dan native auth                                                                        |
| Upload DB              | 4/32                                              | Schema/FK, resume/expiry, freeze retry/race                                                                 |
| MinIO browser storage  | 1/17                                              | Multipart/direct GET, ETag, private/Range/expired/tampered                                                  |
| FFmpeg                 | 4/12                                              | 1080p60→3 tiers30fps/AAC, no audio/native480, still/downscale/EXIF                                          |
| Worker/backend/browser | Vite tiga-tier1/70, built Bun/Nitro tiga-tier1/70 | Real MinIO→upload→worker→publish→HLS→pause/expiry/seek→archive; fixture12s                                  |
| Series/retention       | 3/26                                              | Parent visibility/count/next, original7-day boundary/archive/claim recovery                                 |
| Codec/container matrix | 3/41                                              | MP4/MOV/MKV H.264/HEVC, WebM VP8/VP9, synthetic HDR→SDR, VFR/SAR/rotation, corrupt/animated reject          |
| Full duration          | Episode600s1/66 dan movie1800s1/63                | 307/907 objek HLS, duration/near-end seek; synthetic1080p24 tanpa audio, tidak continuous viewing/benchmark |
| Legacy migration       | 1/10                                              | Legacy status mapping and audit/auth preservation, rerun journal9                                           |

Commands API: test, media:upload:proof, media:storage:proof, media:hls:proof, media:format:proof, media:worker:proof, media:series:proof, media:migration:proof. Semua DB suite media reset hanya MEDIA_TEST_DATABASE_URL=localhost/vertical_movie_app_media_test, serial. Content suite memakai database content_test berbeda. Storage suites memerlukan explicit loopback test endpoint/credentials, membuat bucket test dengan suffix acak dan membersihkan hanya fixture. Credentials aplikasi tidak perlu hak create/delete bucket. Browser proof tambahan memakai MEDIA_PLAYBACK_BROWSER_PROOF=1, MEDIA_PLAYBACK_BROWSER_RUNTIME=dev|built dan runner variables pada .env.example; port web3000 harus bebas, built artifact harus memakai origin tersebut. Test browser subprocess mengirim config melalui stdin dan meredaksi error URL.

Gerbang root frozen install/check-types/lint/build lulus. Web unit37/157 dan auth3/14 lulus. Bootstrap development API+worker lulus health/catalog200, anonymous admin401, concurrency1 dan shutdown exit0. Belum ada bukti R2, Safari/native HLS, kualitas visual/keyframe lintas konten nyata, stress process crash/disk/OOM dan target4core4GB. Codec/container/HDR/VFR/rotasi serta invalid/animated source sudah diuji dengan fixture sintetis pendek; peak/average BANDWIDTH master dihitung dari output segment terukur. Task tersebut tetap terbuka pada backlog; local fixtures tidak membuktikan production capacity. Dashboard upload lengkap dan subtitle belum termasuk scope ini.

Full episode10menit dengan source1080p24 tanpa audio lulus1/66:307 objek HLS, episode/parent manual publish, seek596s dan archive. Proof tidak memutar seluruh video selama10menit wall-clock; durasi encode/manifest diverifikasi dan playback/near-end seek diuji. Full movie30menit lulus1/63 dengan907 objek HLS dan seek1796s. Linux cancellation menggunakan GNU timeout dan kill process group agar child yang mengabaikan TERM berhenti; proof3/5 lulus.

Penutupan tambahan: series/retensi/partial cleanup3/26, upload4/32 dan legacy migration1/10 lulus ulang. Built Bun/Nitro tiga-tier12s1/70 lulus setelah perubahan player terakhir. Eden compile-only membuktikan kontrak upload/publish/public catalog/preview melalui type-only App dan penolakan private storage field pada DTO publik. Unit lifetime4/15 membuktikan TTL1200/3600s untuk600/1800s dan pembulatan durasi pecahan; renewal tidak menandatangani URL lagi setelah visibility dicabut.

Gerbang final lulus: API72/267, root check-types3 task, lint1 task, build2 task (web dibangun ulang setelah fixture import-protection dipulihkan), frozen install770/947 tanpa perubahan, git diff --check serta173 local links/anchors pada12 dokumen. Auth import-protection menolak @repo/auth/server pada client build dan memulihkan fixture; build positif selesai sesudahnya. Branch feat/media-backend masih belum commit/push; file desain existing dipertahankan.

## Delivery dan port proof

Commit implementasi 038c80000c1e0e6841425596eb30ce9301675cd0 pada feat/media-backend; lint/check-types/Commitlint lulus. Stage mengecualikan pekerjaan desain existing. Fixture Chromium dapat memakai MEDIA_PLAYBACK_BROWSER_PORT (default3000, integer1–65535). Untuk hasil build, set VITE_API_URL ke origin dengan port proof pada saat build; PORT fixture, URL manifest playback dan origin browser harus sama. Ini konfigurasi test harness, bukan selector storage produksi.

Verifikasi delivery: built Bun/Nitro Chromium tiga-tier12s pada port3008 dengan stylesheet index lulus1test/70assertions, termasuk manual quality, expiry renewal, paused seek dan terminal404 tanpa retry loop. Dua pengulangan awal terhenti karena port3000 dipakai lalu origin manifest fixture belum diselaraskan; keduanya terselesaikan pada hasil ini. Server development existing tetap berjalan.
