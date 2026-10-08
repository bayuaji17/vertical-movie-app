# Media Operations — development

Implementasi development media dan pemrosesan cover diverifikasi lokal sampai 6 Oktober 2026. Bukti lokal tidak mengesahkan rollout production. [Plan media](../plans/video/implementation-plan.md), [plan sampul](../plans/admin-cover-processing/implementation-plan.md), [model](../architecture/video-data-model.md), [upload contract](../architecture/media-upload-contract.md) dan [Environment](../guides/environment.md).

## Schema uploader dan executor — development

Pada 5 Oktober 2026, ADUP-004 menambahkan nullable `expected_sha256` melalui generated `0009_upload-fingerprint`; journal development saat itu berisi10 entry. Backup custom-format dibuat melalui pg_dump PostgreSQL18 sebelum command resmi `bun run --cwd apps/api db:migrate`; pg_restore list membaca archive61216 byte. Backup/snapshot berada di luar Git dan tetap privat.

Snapshot sebelum/sesudah membuktikan17 tabel tetap utuh: user1/account1/session2/rate_limit1/video1, lainnya kosong. Dedicated test membuktikan legacy upload/asset/auth preservation, nullable/no backfill, digest constraint dan rerun. Fingerprint binding API/worker ADUP-005 terverifikasi native/PG/MinIO; UI Upload Media tersedia pada detail draft dan terverifikasi lokal 6 Oktober 2026. Full restore serta migration production memerlukan rollout terpisah. Rincian checks/receipt pada [backlog uploader](../tasks/admin-media-upload.md).

Pada 6 Oktober 2026, ACOV-003 menambahkan `processing_mode`/`execution_mode` non-null default `worker`; CHECK `request` hanya untuk poster. Backup custom-format sebelum `0010_poster-execution-mode` berukuran64,168 byte dan `pg_restore --list` memverifikasi143 entry. `bun run --cwd apps/api db:migrate` menaikkan journal10→11. Sebelum/sesudah, count dan SHA-256 isi17 application tables sama; tiga session dan tiga job legacy tetap `worker`. Dedicated migration proof juga mempertahankan queued/running/succeeded jobs, session fingerprint/idempotency, attempt history dan readiness FK. ACOV-005 mengaktifkan mode `request` hanya bagi poster baru yang membawa fingerprint; worker claim/recovery tetap khusus `worker`. Production belum dimigrasikan dan full restore tetap belum dibuktikan.

## Pemrosesan poster tanpa worker — ACOV-005

`POST /admin/media/uploads/:id/process-poster` adalah perintah admin untuk session poster baru yang sudah completed dan mode `request`. Body berupa objek kosong. Route memverifikasi actor, draft/current owner, generation, storage profile, expected fingerprint dan job executor. GET inventory/status tidak memulai pekerjaan. Complete hanya freeze/HEAD dan commit pointer plus request job; browser memanggil prepare terpisah.

API membatasi concurrency per instance sesuai `MEDIA_POSTER_PROCESS_CONCURRENCY` (default1), menerima maksimal5.000.000 byte, mengambil source dan menulis output dengan Bun native S3, lalu memakai Bun.Image awaited. Claim durasi60 detik; gateway memberi POST ini30 detik. Image processor punya logical deadline default20 detik, namun Bun.Image tidak hard-cancellable. Request abort menolak hasil, menahan slot sampai terminal settle, dan job ditandai retry bila fence masih dimiliki. Satu job memiliki maksimal3 request attempt dengan backoff1/2 detik; busy lease mengembalikan409 serta `Retry-After`, retry setelah kegagalan sementara memberi503 serta header tersebut, sedangkan image/type/hash/dimension invalid terminal. POST ulang sesudah lost response aman: DTO status mengungkap hasil Ready atau capability melanjutkan request; claim expired dipulihkan dengan prefix attempt baru.

Output berada dalam bucket private pada `outputs/<asset>/<job>/<token>/poster.webp`; API memverifikasi ukuran/MIME HEAD, membaca kembali bytes dan mencocokkan SHA-256 sebelum commit. `media_assets.sha256` tetap fingerprint original yang diunggah; `facts.outputSha256` mencatat output. Semua storage/native I/O di luar transaksi. Transaksi akhir mewajibkan session/actor, owner current pointer/draft, generation, token serta lease masih cocok. Worker claim dan recovery hanya memilih `execution_mode='worker'`; cleanup menunggu24 jam dan mengecualikan prefix job sukses/ready. Output gagal tetap orphan sampai cleanup. Proof dedicated PostgreSQL dengan processor Bun.Image nyata dan fake S3 membuktikan alur, recovery lease, parallel duplicate, replacement fence, successful-output cleanup dan worker exclusion. Built-browser proof ACOV-009 memakai dedicated PostgreSQL serta bucket MinIO acak untuk membuktikan Film/Standalone/Series menghasilkan cover private WebP 1080×1920 Ready saat worker mati; HEAD/hash/provenance cocok dan unsigned GET mendapat403. Source tetap queued sampai worker dijalankan, lalu HLS berhasil. R2 staging dan production belum diuji.

### Batas rollback

Migration `0010_poster-execution-mode` additive dan production belum dijalankan. Jangan drop kolom atau mencoba membalik migration setelah request-mode upload/job tercatat. Poster request hanya dapat dilanjutkan oleh API yang mendukung processor; worker sengaja tidak mengambilnya. Rollback code tidak boleh memakai worker lama yang tidak memahami `execution_mode`. Belum ada prosedur drain/reconcile request-mode untuk production, sehingga rollout produksi harus mempertahankan code/schema kompatibel dan menyiapkan recovery khusus sebelum versi ini dipakai; tidak ada klaim rollback production yang telah diuji.

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

Private routes memakai Better Auth authoritative requireAdmin. OpenAPI /openapi/json mencakup 30 operation admin dan playlist ber-extension .m3u8; /openapi menampilkan Scalar. Web /watch/$slug dan /admin/videos/$id/preview menyediakan player existing; detail Film/Standalone menampilkan Preview pada section Publication ketika capability ready; Series mempertahankan panel upload existing.

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

Gerbang root frozen install/check-types/lint/build lulus. Web unit37/157 dan auth3/14 lulus. Bootstrap development API+worker lulus health/catalog200, anonymous admin401, concurrency1 dan shutdown exit0. Belum ada bukti R2, Safari/native HLS, kualitas visual/keyframe lintas konten nyata, stress process crash/disk/OOM dan target4core4GB. Codec/container/HDR/VFR/rotasi serta invalid/animated source sudah diuji dengan fixture sintetis pendek; peak/average BANDWIDTH master dihitung dari output segment terukur. Task tersebut tetap terbuka pada backlog; local fixtures tidak membuktikan production capacity. Evidence tabel ini adalah riwayat backend; uploader admin tahap pertama kini diverifikasi terpisah di bawah. Subtitle belum tersedia.

Full episode10menit dengan source1080p24 tanpa audio lulus1/66:307 objek HLS, episode/parent manual publish, seek596s dan archive. Proof tidak memutar seluruh video selama10menit wall-clock; durasi encode/manifest diverifikasi dan playback/near-end seek diuji. Full movie30menit lulus1/63 dengan907 objek HLS dan seek1796s. Linux cancellation menggunakan GNU timeout dan kill process group agar child yang mengabaikan TERM berhenti; proof3/5 lulus.

Penutupan tambahan: series/retensi/partial cleanup3/26, upload4/32 dan legacy migration1/10 lulus ulang. Built Bun/Nitro tiga-tier12s1/70 lulus setelah perubahan player terakhir. Eden compile-only membuktikan kontrak upload/publish/public catalog/preview melalui type-only App dan penolakan private storage field pada DTO publik. Unit lifetime4/15 membuktikan TTL1200/3600s untuk600/1800s dan pembulatan durasi pecahan; renewal tidak menandatangani URL lagi setelah visibility dicabut.

Gerbang final lulus: API72/267, root check-types3 task, lint1 task, build2 task (web dibangun ulang setelah fixture import-protection dipulihkan), frozen install770/947 tanpa perubahan, git diff --check serta173 local links/anchors pada12 dokumen. Auth import-protection menolak @repo/auth/server pada client build dan memulihkan fixture; build positif selesai sesudahnya. Branch feat/media-backend masih belum commit/push; file desain existing dipertahankan.

## Delivery dan port proof

Commit implementasi 038c80000c1e0e6841425596eb30ce9301675cd0 pada feat/media-backend; lint/check-types/Commitlint lulus. Stage mengecualikan pekerjaan desain existing. Fixture Chromium dapat memakai MEDIA_PLAYBACK_BROWSER_PORT (default3000, integer1–65535). Untuk hasil build, set VITE_API_URL ke origin dengan port proof pada saat build; PORT fixture, URL manifest playback dan origin browser harus sama. Ini konfigurasi test harness, bukan selector storage produksi.

Verifikasi delivery: built Bun/Nitro Chromium tiga-tier12s pada port3008 dengan stylesheet index lulus1test/70assertions, termasuk manual quality, expiry renewal, paused seek dan terminal404 tanpa retry loop. Dua pengulangan awal terhenti karena port3000 dipakai lalu origin manifest fixture belum diselaraskan; keduanya terselesaikan pada hasil ini. Server development existing tetap berjalan.

## Upload Media admin — workflow dan proof 6 Oktober 2026

Simpan metadata draft lalu buka detail Film/Standalone untuk source+cover, atau Series untuk cover. Choose file memvalidasi ekstensi/MIME/ukuran; cover dibuka dalam crop 9:16 dengan zoom 1–4×. Resolusi crop 1080×1920 atau lebih direkomendasikan; gambar kecil tetap bisa dicrop dan diperbesar saat export menjadi 1080×1920. Hasil crop dihitung fingerprint lalu dikirim sebagai multipart ke bucket privat. API memproses cover baru setelah complete; cover bisa mencapai Ready tanpa worker. Worker terpisah tetap diperlukan agar source menghasilkan HLS. Pastikan endpoint S3 dapat dijangkau browser dan CORS mengizinkan PUT/GET/HEAD serta expose ETag.

Sent100% belum berarti upload completed atau media Ready. Tunggu finalization dan processing; source/cover masing-masing harus verified-ready sebelum Preview video tersedia. UI tidak melakukan publish. Failed media pada draft diperbaiki melalui file/session baru; manual reprocess belum tersedia.

Pause/offline menghentikan transfer lokal; kembali online gunakan Resume upload. Setelah refresh/leave, pilih ulang file yang sama: full SHA-256 harus cocok, ListParts melewati part yang sudah verified. Wrong file tidak memperoleh URL part. Check status menyelesaikan complete/abort yang belum pasti; cancel memerlukan konfirmasi. Legacy tanpa fingerprint harus cancel/restart; sesi expired tidak boleh diperpanjang oleh retry. Dua tab menggunakan lock best-effort; pause tab pertama sebelum mengambil alih. Logout menghentikan transport, tetapi tidak mencabut URL yang sudah diterbitkan.

Proof memakai build Bun/Nitro, Chromium Windows via Playwright, gateway/Elysia, dedicated PostgreSQL `vertical_movie_app_media_test`, bucket MinIO acak dan FFmpeg. Auth/session errors dikontrol fixture, berbeda dari database/storage/media yang nyata. Worker entry production dijalankan sebagai subprocess terpisah pada konfigurasi test concurrency1; batas min-free disk test diturunkan, sehingga proof bukan benchmark VPS. Source sintetis12s menghasilkan SHA identik dengan oracle independen dan HLS verified; repeated complete tetap satu job. Poster dan Series cover nyata juga diverifikasi.

Development hashing: Vite menyiapkan `@noble/hashes/sha2.js` dan `@noble/hashes/utils.js` melalui `optimizeDeps.include` agar pemeriksaan file pertama tidak memicu optimasi ulang/reload. Pengaman beforeunload/route leave untuk upload aktif tetap berlaku. Setelah mengubah konfigurasi, tunggu restart Vite selesai sebelum memulai upload. Proof fokus `bun apps/web/test/admin-media-dev-hash-proof.mjs` dari root memakai runner env existing, cache Vite temporary dan port fixture sendiri; tidak memakai database/bucket atau menghapus cache aplikasi. Proof mencocokkan SHA-256 file pertama/berulang 5 MB dan memeriksa zero full-reload/navigation/dialog. Evidence ACOV-012 ada pada [backlog sampul](../tasks/admin-cover-processing.md).

Harness existing `apps/web/test/auth-browser-smoke.mjs` memakai `AUTH_BROWSER_PHASE=media`, `AUTH_BROWSER_RUNTIME=built`, `MEDIA_BROWSER_PHASE=full` (atau focused layout/outage). Isi test DB/endpoint/credentials hanya lewat env ignored sesuai environment guide; fixture mereset dedicated DB dan membuat/menghapus bucket fixture, bukan bucket aplikasi. Runner `AUTH_BROWSER_NODE`, `AUTH_PLAYWRIGHT_MODULE`, `AUTH_BROWSER_EXECUTABLE` menunjuk runtime/Playwright/Chrome yang tersedia. Source worker dievaluasi dari checkout; `AUTH_BROWSER_WORKER_PATH` hanya opsi legacy. Jalankan serial terhadap suite reset DB/build.

Tambahan integration files memakai Bun test: `media-fingerprint-migration-proof.test.ts` dan `media-transport-proof.test.ts`. Jangan memakai DATABASE_URL development sebagai MEDIA_TEST_DATABASE_URL. Semua command/count, receipts serta screenshots lokal ignored berada pada [ADUP-002–015](../tasks/admin-media-upload.md). Bukti hash1,5GB menggunakan File disk/Worker asli; alur end-to-end memakai fixture pendek. R2 staging, Safari/native HLS, full restore, perangkat fisik serta kapasitas4core4GB tetap belum disahkan.

## Dashboard Publish & Archive Film/Standalone

> Implemented/verified lokal 7 Oktober 2026; scope plan dan empat desain disetujui pengguna. Evidence/commands/receipts serta batas test berada pada [APUB-001–013](../tasks/admin-publication.md). Tidak mengubah schema, dependency, env, signing, worker atau retensi.

1. Pada `/admin/content/film/:id` atau `/admin/content/standalone/:id`, simpan title/synopsis dan rights, unggah source/cover dan tunggu verified-ready. Publication menampilkan enam checks non-episode; API juga menyediakan parent check not-applicable. Perbaiki metadata/upload melalui tautan section jika blocked. Ready to publish berbeda dari Published.
2. Preview membuka private HLS player dan kembali ke detail melalui `type`/UUID tervalidasi. Publish membaca fresh metadata/inventory/readiness sebelum review serta sebelum POST; acknowledgement “I have reviewed the preview and want to publish this video.” wajib per dialog. POST tetap `{ expectedVersion, idempotencyKey }`, tanpa acknowledgement/rights field baru. Cancel/Escape tidak publish; pending tidak dapat ditutup atau dikirim lagi.
3. Jika response terputus, malformed atau 5xx, Check status membaca current state tanpa POST otomatis. Retry publish hanya eksplisit untuk intent/key/version sama yang belum terkonfirmasi; perubahan versi/media meminta review baru. Persisted replay published lama sesudah archive tidak mengubah UI/current archive. Confirmed POST dengan refetch gagal tetap memberi acknowledgement dan meminta Refresh status, tanpa resend.
4. Published menampilkan Open public video dan Archive. Archive dialog menjelaskan new access denial, old signed URL expiry dan file preservation. Body hanya `{ expectedVersion }`; stale version conflict memerlukan refresh/review, tanpa archive idempotency key baru. UI scope published→archived; existing API draft archive tetap didukung. Archived tidak menyediakan publish/archive/edit/upload/preview atau restore.

Private `GET /admin/videos/:id/publication-readiness` tidak mengubah data. Memakai requireAdmin sebelum I/O dan `private, no-store`, missing404/dependency503. Shared assessment memeriksa active draft, trimmed title/synopsis, saved rights timestamp+actor, canonical HLS/cover provenance+generation dan verified duration, no initializing/pending/completing/aborting upload, serta active parents untuk episode. Non-episode parent check not-applicable. DTO tidak memuat storage keys, signatures, actor details atau diagnosis DB. Command publish mengulangi gates setelah lock, sehingga readiness lama tidak mengesahkan mutation.

Query invalidation mencakup identity-scoped list/detail/inventory/readiness. Working File/hash/upload owner yang sama memblokir commands, owner lain tidak menjadi global blocker; Refresh status tetap read-only dan tidak membuang selected File. Offline tidak mengantre mutation untuk reconnect. Session invalid menghentikan private effects dan membuang private caches; valid-admin business outage tetap berada pada UI dengan status unavailable.

Browser proof mengikuti harness existing dengan `AUTH_BROWSER_PHASE=publication`, `AUTH_BROWSER_RUNTIME=built`, dedicated `MEDIA_TEST_DATABASE_URL`, loopback private random MinIO bucket dan actual worker subprocess. Runner env `AUTH_BROWSER_NODE`, `AUTH_PLAYWRIGHT_MODULE`, `AUTH_BROWSER_EXECUTABLE` menunjuk Node/Playwright/Chrome yang tersedia. Command root: `bun apps/web/test/auth-browser-smoke.mjs`; jalankan serial terhadap reset DB/build lainnya. Browser auth injected fixture; API/domain PG suite terpisah menguji guards/lifecycle. Native Better Auth evidence tetap pada runbook auth. Browser evidence meliputi Film/Standalone actual create/upload/process/preview/public watch/archive, 15 width/theme cases, keyboard/focus/44px, local hashing/offline, external active upload/readiness and version race, committed lost/malformed response, explicit retry, confirmed command+failed refetch, archive pending session revocation, stale replay, catalog invalidation dan actual signed expiry. Screenshots runtime ignored di `.turbo/admin-publication-execution/browser/`; empat PNG canonical tetap mockup. R2/Safari/physical-device/resource/full-restore gates existing tetap terpisah.

## Homepage katalog publik — PCAT

Implemented/verified lokal 7 Oktober 2026 pada [PCAT-001–011](../tasks/public-catalog-api.md). Pengunjung membaca `/api/catalog`, `/api/catalog/genres`, `/api/catalog/featured` dan `/api/catalog/:kind/:id/poster`; public tanpa Cookie/Authorization ke upstream. Eligible published Movie/Standalone/Series memerlukan current ready media/provenance/owner/parent gates. Empty sah; outage memberi error/Retry, tanpa dummy fallback. Refresh katalog membaca traversal baru; archive tidak menarik kembali metadata/image yang telah diterima. Fresh poster lookup menolak hidden owner404; storage/profile/missing/oversized503 memberi SVG fallback di UI. Tidak mengubah signed playback expiry.

Native proof command root:

```sh
bun test apps/api/test/integration/public-catalog-proof.test.ts apps/api/test/integration/public-catalog-poster-proof.test.ts
bun test apps/api/test/integration/media-publication-proof.test.ts apps/api/test/integration/media-series-proof.test.ts
AUTH_BROWSER_PHASE=public-catalog AUTH_BROWSER_RUNTIME=dev bun apps/web/test/auth-browser-smoke.mjs
AUTH_BROWSER_PHASE=public-catalog AUTH_BROWSER_RUNTIME=built bun apps/web/test/auth-browser-smoke.mjs
```

Jalankan serial: fixture reset hanya guarded loopback dedicated `MEDIA_TEST_DATABASE_URL` bernama `vertical_movie_app_media_test`; storage memerlukan loopback `MEDIA_STORAGE_TEST_ENDPOINT` port9000 dan `MEDIA_STORAGE_TEST_ACCESS_KEY_ID`/`MEDIA_STORAGE_TEST_SECRET_ACCESS_KEY` dengan izin create/delete bucket test acak. Credentials hanya env ignored, jangan memakai bucket/DB aplikasi. Runner browser memakai `AUTH_BROWSER_NODE`, `AUTH_PLAYWRIGHT_MODULE`, `AUTH_BROWSER_EXECUTABLE`; screenshot prefix opsional `ADMIN_BROWSER_SCREENSHOT_PREFIX`, worker path native opsional `AUTH_BROWSER_WORKER_PATH`. Cleanup hanya known fixture objects dan dedicated bucket. Fault/hold/empty/title controls hanya test harness, tidak route aplikasi.

Observed: native4 tests/74 assertions; legacy6/122; actual production poster transcode306422bytes/1080×1920, private unsigned403/public200/archive404/error503. Catalog fixture SQL menyiapkan verified HLS-ready facts, tidak memproses source HLS nyata. Dataset127 titles/121 Series/101 genres membuktikan global pages dan tanpa cap100; satu SQL per read, EXPLAIN execution103.644–114.992ms pada fixture lokal. Tidak menambah schema/index atau development migration; tidak mengesahkan SLA, R2/Safari/perangkat fisik/production. Dev+built browser matrix lengkap dan gates ada di backlog PCAT.

## Detail publik dan watch — PCW

Implemented/verified lokal 8 Oktober 2026; evidence dan task receipts pada [PCW](../tasks/public-content-watch.md). Rute web `/titles/:kind/:slug` untuk Movie/Standalone, `/series/:slug` untuk Series dan `/watch/:slug` untuk Movie/Standalone/Episode. Read upstream tambahan: `GET /catalog/details/:kind/:slug`, `/catalog/series/:slug/episodes` dan `/catalog/watch/:slug`. DTO detail/watch/episode unsigned, public tanpa session; gateway membuang Cookie/Authorization. Detail memakai lookup langsung, bukan legacy list100. Episode diurutkan season/episode/UUID dengan cursor scoped/asOf dan default20/max100, count serta null EOF.

SSR mengirim detail/first20 episode atau metadata watch dengan TTL60s dan sisa freshForMs; capability playback tidak masuk SSR/Query cache. Cache/invalidation dapat mempertahankan metadata yang telah diterima sampai refresh/refetch. Playback/poster baru memeriksa visibility/profile/provenance terkini. Load More dan Next manual; failed append mempertahankan rows, Retry memakai cursor yang sama, cursor422 meminta Refresh dari page pertama. Partial error episode mempertahankan detail; public404/503 tetap berstatus HTTP sesuai pada SSR. Player menolak capability identitas/origin yang salah, membatalkan request saat pergantian judul dan menyediakan Retry manual. Autoplay, auto-next dan watch-progress tidak ditambahkan.

Command root, dengan test database/storage/runner env pada bagian PCAT di atas:

```sh
bun test apps/api/test/integration/public-content-proof.test.ts
AUTH_BROWSER_PHASE=public-watch AUTH_BROWSER_RUNTIME=dev bun apps/web/test/auth-browser-smoke.mjs
AUTH_BROWSER_PHASE=public-watch AUTH_BROWSER_RUNTIME=built bun apps/web/test/auth-browser-smoke.mjs
AUTH_BROWSER_PHASE=publication AUTH_BROWSER_RUNTIME=built bun apps/web/test/auth-browser-smoke.mjs
```

Jalankan serial terhadap suite yang reset DB/build. Native proof4 tests/57 assertions mencakup121 Series lookup langsung,103 sparse episodes, snapshot/order/count/cursor, owner FK/current generation, parent/child visibility dan actual signed HLS/archive. Browser memakai24 episode dua season dan FFmpeg12s portrait HLS tiga rendition pada private bucket acak. Facts/readiness disiapkan fixture SQL; ini bukan bukti full upload/worker provenance. Publication browser regression menjalankan actual create/upload/worker/private preview Film/Standalone serta public watch/archive. Browser public membuktikan SSR tanpa duplicate metadata, partial503/offline, cursor retry/422, actual expiry/seek/quality/play, explicit Retry, identity race, archive404 dan18 width/theme cases; metadata SSR tidak memuat URL signed/credential. Cleanup hanya owned objects/bucket dan DB dedicated. Tidak ada perubahan schema/dependency/env atau migration; R2/Safari/perangkat fisik/resource/full restore/production tetap gerbang tersendiri. PCAT/PCW masih local stack, bukan remote delivery.
