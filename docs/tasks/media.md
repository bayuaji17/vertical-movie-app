# Modul: Media — MinIO Development, R2 Production, dan HLS

## Tujuan modul

Admin dapat mengunggah sumber video/poster dengan aman dan pengembang dapat memakai kontrak storage yang sama pada MinIO lokal dan Cloudflare R2 production. Worker kemudian menghasilkan HLS VOD untuk preview/publikasi. Referensi PRD-04/05/07/09, [plan video](../VIDEO_IMPLEMENTATION_PLAN.md), [model data](../VIDEO_DATA_MODEL.md), [context](../VIDEO_REPOSITORY_CONTEXT.md), [Environment](../ENVIRONMENT.md), [workflow](../GLOBAL_WORKFLOW.md).

> Keputusan pengguna disetujui 3 Oktober 2026: MinIO development, bucket `vertical-movie-app` dibuat pengguna, Cloudflare R2 S3-compatible production, selector env, HLS. Base SHA refinement `0d3bef87f6d2f9b0a2873078f9b560f092f13c53`. Dokumen ini adalah backlog; tidak ada implementasi/proof media Done dari sesi planning.

Keputusan resolusi lanjutan: sumber dan HLS 480p–1080p; sumber 1440p/4K ditolak, keluaran tidak boleh di-upscale. Semua video wajib portrait 9:16; landscape/square/cinematic/rasio lain ditolak. Bounds dimensi tampilan setelah rotasi/SAR dan contoh portrait mengikuti plan. Format sumber disetujui: MP4/MOV/MKV dengan H.264/H.265, WebM dengan VP8/VP9; wajib validasi container/codec aktual serta decode FFmpeg.

Keputusan target sumber berikutnya: H.264 SDR/AAC 128 kbps sebagai acuan, acuan 1080p24–30 pada 4–6 Mbps (default 6 Mbps); sumber 60 fps tetap mengikuti size limit aktual, dengan batas terbaru per kind: movie/standalone maksimal 30 menit dan 1,5 GB (1.500.000.000 byte), episode maksimal 10 menit dan 512 MB. Semua video/sampul portrait 9:16 disetujui. Standar sampul seragam antarjenis konten: gambar diam JPG/JPEG/PNG/WebP <=5 MB (5.000.000 byte), sumber setelah orientasi minimal 1080 × 1920 portrait 9:16, hasil WebP 1080 × 1920; pixel sampul tidak mengikuti tiap video. Sumber lebih besar diperkecil, sumber di bawah minimum/rasio lain/animasi ditolak. Limit per kind berlaku juga untuk file yang lebih pendek; movie/standalone <=10 menit juga memakai limit per kind 1,5 GB. Kelompok batas produk nomor 1 selesai. Acuan bitrate tunduk pada limit sumber; budget total movie/standalone 30 menit sekitar 6,67 Mbps, sehingga acuan standar 4–6 Mbps memiliki ruang untuk audio/container; profil tinggi/60 fps tetap memerlukan ukuran aktual yang memenuhi cap. Target bitrate ekspor bukan ladder HLS final; kebijakan audio/HDR/VFR/fps di luar acuan masih refinement.

Keputusan upload berikutnya: S3 multipart saja dengan file dipecah menjadi part kecil, termasuk sampul kecil satu part. Part upload digabung storage menjadi sumber lengkap; segment HLS dibuat terpisah oleh FFmpeg. Ukuran part disetujui 4 Oktober 2026: target 2% ukuran file aktual, minimal 5 MiB selain part terakhir; geometry byte/count dihitung sekali dan disimpan per session. Session 24 jam disetujui pada nomor 6; maksimal 3 part paralel per file dan URL part 15 menit dibatasi sisa session disetujui 4 Oktober 2026. Referensi kontrak ada pada [plan multipart](../VIDEO_IMPLEMENTATION_PLAN.md#nomor-2--s3-multipart-upload-disetujui-3-oktober-2026).

**hls-v1 disetujui 4 Oktober 2026**: H.264 SDR, AAC 128 kbps bila audio tersedia, target video 480p/720p/1080p 1,2/2,5/4,5 Mbps, output maksimal 30 fps, segment fMP4 dengan target 6 detik dan pemilihan kualitas adaptif; tanpa crop/upscale, hanya kualitas yang dapat dibuat dari sumber. Detail encoder/GOP/SAR/VFR/MIME serta kualitas visual dan compatibility tetap memerlukan proof HLS-PROFILE-001. Referensi: [profil HLS](../VIDEO_IMPLEMENTATION_PLAN.md#nomor-3--profil-hls-disetujui-4-oktober-2026).

## Evidence validasi dokumen — 3 Oktober 2026

Context dan plan diperiksa pada SHA refinement. Validator Bun memeriksa 127 tautan lokal/anchor pada 12 dokumen, 10 ID task unik, dependency DAG tanpa siklus dan profil MinIO/credential kosong pada sample; semuanya lulus. Prettier check targeted serta git diff whitespace dipakai pada final review. Evidence ini hanya untuk dokumen; task implementasi tetap Ready/Backlog dan seluruh checkbox proof media belum terpenuhi.

## User story: MEDIA-US-01 — Storage per lingkungan

Sebagai pengembang, saya ingin memilih MinIO/R2 melalui env server, sehingga alur lokal dan production memakai kontrak domain yang sama dan kompatibilitas diuji terpisah.

## User story: MEDIA-US-02 — Upload dapat dipulihkan

Sebagai admin, saya ingin upload divalidasi dan dapat dipulihkan saat terputus, sehingga sumber yang diproses benar tanpa merusak metadata.

## User story: HLS-US-01 — HLS lengkap dan akses yang konsisten

Sebagai penonton/admin, saya ingin HLS dapat diputar dan seek sesuai izin, sehingga semua playlist/segment tersedia hanya pada keadaan yang sah.

## Aturan evidence bersama

Semua task mengikuti template dan workflow root. Owner: pengembang/agent pelaksana. Unit memakai bun:test/app.handle dengan injected dependencies; integrasi real PostgreSQL/storage/FFmpeg terpisah. Bucket test dedicated dengan guard; tidak cleanup bucket `vertical-movie-app` atau data SynergoHQ. Setelah implementasi: relevant tests, root check-types/lint/build; frozen install bila script/dependency berubah; generate/review/apply migration development dan preservation bila schema berubah. Tidak menambah hosted CI. Task belum tersedia prerequisite tetap Backlog, tanpa estimasi kalender. Task worker/retensi berada pada [backlog worker](media-worker.md); publication/catalog serta integrasi gateway/player berada pada [backlog publication](media-publication.md).

## Task: MEDIA-CFG-001 — Konfigurasi provider storage melalui env

- Status: Ready
- Owner: Pengembang/agent pelaksana
- Prioritas: P0 — urutan mengikuti dependency
- Referensi: MEDIA-US-01, PRD-04/05/07/09, plan video tahap B–D
- Dependensi: VID-015 (Done)
- Ukuran: Satu hasil review; pecah lagi bila scope implementasi tidak kecil.

### Ruang lingkup

Tambahkan config/storage profile pada `apps/api/src/config/env.ts`, `env.test.ts`, adapter `src/storage/s3.ts`, wiring DI pada bootstrap, sampel env dan penerusan env pada `turbo.json`. Symbol target `loadStorageEnv`/`createStorageClient`; bentuk final disesuaikan setelah proof native. Tidak membuat schema/media route pada task ini.

### Acceptance criteria

- [ ] Loader menerima `minio|r2`, menolak enum/credential kosong/URL Console/region salah; deployment production proyek memakai R2 HTTPS/auto tanpa fallback tersembunyi.
- [ ] Loader parameter upload menerima default concurrency 3/session 86400 detik/URL part 900 detik, memvalidasi integer positif dan tidak melakukan storage I/O saat import atau expose credential.
- [ ] Profil lokal memakai S3 `http://localhost:9000`, region `us-east-1`, bucket existing `vertical-movie-app`; credential aplikasi hanya server dan tidak tercetak.
- [ ] API/worker dapat memakai kontrak client yang sama; app factory tetap tanpa env/pool/I/O saat import. Selector dan delivery env kelak diteruskan Turbo sesuai bundled docs versi terpasang.

### Validasi

Native bun:test untuk profile valid/invalid dan error redaction; check-types/build serta pemeriksaan env strict mode Turbo. Storage operations belum dianggap lolos hanya dari konstruksi client. Jalankan gate bersama sesuai ruang lingkup implementasi.

### Hasil dan bukti

Belum diimplementasikan; tidak ada command proof, hasil operasi storage/FFmpeg, atau commit task pada sesi planning ini.

### Blocker atau tindak lanjut

MEDIA-PROOF-001 membuktikan operasi, dan MEDIA-DESIGN-001 memfinalkan identity/freeze/DTO dari proof; part 2%/minimum 5 MiB, concurrency 3, session 24 jam dan URL part 15 menit sudah disepakati. Konfigurasi live/root credential tidak diubah oleh sesi planning.

## Task: MEDIA-PROOF-001 — Proof operasi native S3 pada MinIO

- Status: Backlog
- Owner: Pengembang/agent pelaksana
- Prioritas: P1 — urutan mengikuti dependency
- Referensi: MEDIA-US-01, PRD-04/05/07/09, plan video tahap B–D
- Dependensi: MEDIA-CFG-001
- Ukuran: Satu hasil review; pecah lagi bila scope implementasi tidak kecil.

### Ruang lingkup

Suite storage di `apps/api/test/integration/` dengan bucket test khusus terpisah dari `vertical-movie-app` dan data SynergoHQ. Uji native Bun S3 sesuai kebutuhan source/output. Bucket existing aplikasi hanya dipakai pemeriksaan akses nondestruktif jika perlu; cleanup test tidak boleh menyapu bucket tersebut.

### Acceptance criteria

- [ ] PUT/GET/stat/DELETE serta presigned UploadPart/GET berhasil pada versi Bun repo; namespace/key ditentukan server dan hasil tidak bocor publik.
- [ ] Browser proof membuktikan endpoint reachable, CORS, Content-Type, expiry dan penolakan URL salah/expired; signed URL tidak ditulis ke log.
- [ ] Proof capability wajib mencakup multipart create/part/list/complete/abort untuk browser, termasuk gambar kecil satu part, copy/freeze source, metadata/checksum dan addressing. Bedakan multipart streaming server dengan resume browser; dependency alternatif hanya ditambahkan setelah gap native tercatat.

### Validasi

Proof terpisah dengan guard endpoint/bucket test, fixture kecil yang aman, dan evidence browser. Catat per operasi native: pass/unsupported/not tested; tidak menyimpulkan R2 dari proof MinIO. Jalankan gate bersama sesuai ruang lingkup implementasi.

### Hasil dan bukti

Belum diimplementasikan; tidak ada command proof, hasil operasi storage/FFmpeg, atau commit task pada sesi planning ini.

### Blocker atau tindak lanjut

MEDIA-DESIGN-001 memilih metode final dari evidence; MEDIA-R2-001 mengulang operasi pada R2.

## Task: MEDIA-DESIGN-001 — Tetapkan kontrak movie upload dan sumber immutable

- Status: Backlog
- Owner: Pengembang/agent pelaksana
- Prioritas: P1 — urutan mengikuti dependency
- Referensi: MEDIA-US-02, PRD-04/05/07/09, plan video tahap B–D
- Dependensi: MEDIA-PROOF-001
- Ukuran: Satu hasil review; pecah lagi bila scope implementasi tidak kecil.

### Ruang lingkup

Refine `docs/VIDEO_DATA_MODEL.md`, `VIDEO_IMPLEMENTATION_PLAN.md`, runbook media dan request/response yang akan dipakai module media. S3 multipart telah dipilih. Parameter part 2%/minimum 5 MiB, concurrency 3/session 24 jam/URL part 15 menit dibatasi sisa session sudah disetujui. Refine resume state/identity, abort/cleanup, checksum dan final key/freeze berdasarkan proof serta batas sumber yang disetujui.

### Acceptance criteria

- [ ] Lengkapi timeout dan kebijakan audio/HDR/VFR/fps di luar acuan. Buktikan keputusan rasio video 9:16/penolakan landscape-square-rasio lain, resolusi 480p–1080p/penolakan 1440p/4K, whitelist pasangan container/video codec, movie/standalone <=1.800 detik dan <=1.500.000.000 byte, episode <=600 detik dan <=512.000.000 byte serta poster portrait 9:16. Limit per kind berlaku juga untuk durasi lebih pendek. Sertakan boundary durasi/byte di atas batas, ekstensi palsu/gagal decode serta standar sampul seragam: gambar diam JPG/PNG/WebP <=5.000.000 byte, sumber minimal 1080 × 1920 portrait 9:16, hasil WebP tepat 1080 × 1920. Proof gambar harus mencakup +1 byte, di bawah minimum, orientasi, downscale sumber lebih besar, rasio berbeda, animasi/gagal decode serta hasil konversi terverifikasi sebelum siap; tidak ada fallback policy tak terbatas.
- [ ] Kontrak S3 multipart initiate/part/complete/status/abort, part size/concurrency, TTL session/URL dan idempotency key/request hash dirinci. Daftar part/ETag direkonsiliasi dengan storage; retry part gagal tidak mengulang part sukses, sampul kecil satu part terbukti. Untuk target 2% yang disetujui, buktikan geometry/rounding/minimum part provider pada file 512 MB, 1,5 GB, 100 MB dan <=5 MB, konsistensi retry/resume serta progress berdasarkan byte aktual. Ukuran bigint DTO decimal string; ETag multipart tidak dianggap SHA-256.
- [ ] Finalisasi membekukan source melalui strategi yang kompatibel MinIO/R2; overwrite dengan URL upload lama tidak mengubah input worker. I/O storage selesai di luar transaksi sebelum update/enqueue atomik.

### Validasi

Review kontrak dan matriks skenario terputus/resume/expiry/duplikasi/overwrite. Task belum Ready untuk implementasi schema jika parameter part/expiry/identity resume/finalization masih ambigu. Metode S3 multipart sudah dipilih, bukan open decision. Jalankan gate bersama sesuai ruang lingkup implementasi.

### Hasil dan bukti

Belum diimplementasikan; tidak ada command proof, hasil operasi storage/FFmpeg, atau commit task pada sesi planning ini.

### Blocker atau tindak lanjut

Resolusi 480p–1080p, target bitrate/fps sumber, batas terbaru per kind movie/standalone maksimal 30 menit dan 1,5 GB, episode maksimal 10 menit dan 512 MB, whitelist pasangan container/video codec, semua video/sampul portrait 9:16 dan standar sampul seragam antarjenis konten sudah ditetapkan. Standar sampul JPG/PNG/WebP <=5 MB, sumber minimal 1080 × 1920 dan hasil WebP 1080 × 1920 sudah disetujui. Batas produk nomor 1 selesai dengan limit terbaru per kind; batas terdahulu movie 1 jam/2 GB dan standalone 10 menit/1 GB telah digantikan. Timeout, kebijakan audio/HDR/VFR/fps di luar acuan dan copy/freeze belum ditetapkan. Setelah refinement, lanjut MEDIA-SCHEMA-001.

## Task: MEDIA-SCHEMA-001 — Schema aset dan upload session

- Status: Backlog
- Owner: Pengembang/agent pelaksana
- Prioritas: P1 — urutan mengikuti dependency
- Referensi: MEDIA-US-02, PRD-04/05/07/09, plan video tahap B–D
- Dependensi: MEDIA-DESIGN-001
- Ukuran: Satu hasil review; pecah lagi bila scope implementasi tidak kecil.

### Ruang lingkup

Buat `apps/api/src/db/schema/media.ts`, `upload.ts`, update pointer source/poster pada video/series dan schema exports. Generate/review migration additive sesudah 0005; jangan mengubah history auth/konten. Model tahap B menjadi dasar.

### Acceptance criteria

- [ ] Ownership video/series, asset kind, provider/bucket/key unique, pointer composite FK, session pending unique dan expiry/status/idempotency/request hash mempunyai constraints yang sesuai.
- [ ] Migrasi mempertahankan auth dan metadata existing; nullable pointers tidak merusak draf lama. Provider persisten mencegah penafsiran objek lama lewat env baru.
- [ ] Schema proof pada DB test dedicated lolos; migrasi pending diterapkan ke development dengan command resmi, journal/constraints dan preservation data diverifikasi sesuai workflow.

### Validasi

Dedicated PostgreSQL migration/constraint/rollback proof; generate/review SQL; `bun run --cwd apps/api db:migrate` pada target development terverifikasi, bukan test reset. Catat backup/preservation dan gate repo. Jalankan gate bersama sesuai ruang lingkup implementasi.

### Hasil dan bukti

Belum diimplementasikan; tidak ada command proof, hasil operasi storage/FFmpeg, atau commit task pada sesi planning ini.

### Blocker atau tindak lanjut

Enqueue job konkret menyusul WORKER-001; jangan membuat FK ke job table yang belum ada.

## Task: MEDIA-UPLOAD-001 — Endpoint membuat upload session admin

- Status: Backlog
- Owner: Pengembang/agent pelaksana
- Prioritas: P1 — urutan mengikuti dependency
- Referensi: MEDIA-US-02, PRD-04/05/07/09, plan video tahap B–D
- Dependensi: MEDIA-SCHEMA-001
- Ukuran: Satu hasil review; pecah lagi bila scope implementasi tidak kecil.

### Ruang lingkup

Module `apps/api/src/modules/media/{index,model,service,repository}.ts`, factory/bootstrap, guard, Eden/Scalar. Implement initiate dan izin part sesuai metode MEDIA-DESIGN-001; kontrak URL kandidat mengikuti Video Architecture, bukan endpoint live.

### Acceptance criteria

- [ ] Tanpa sesi 401/identitas tidak berhak 403 tanpa memanggil storage; ownership/kind/parent/archive/limits divalidasi sebelum menerbitkan izin upload.
- [ ] Request identik memakai session/key yang sama; key sama payload berbeda 409, session expired tidak diberi URL aktif. Server menetapkan key dan expiry.
- [ ] Presign dibatasi min(900 detik,floor(sisa session)); sisa <1 detik, non-pending/aborted/expired atau admin tidak sah ditolak. Renewal tidak memperpanjang session dan part terverifikasi tidak diunggah ulang. DTO memuat concurrency aman 3; browser scheduler membatasi 3 UploadPart per file saat transport/UI diimplementasikan.
- [ ] Response privat no-store, schema typed dan OpenAPI stabil; credential/signature tidak tersimpan dalam DTO persisten/log; uploaded object belum menjadi preview publik.

### Validasi

bun:test app.handle dengan injected I/O dan clock; dedicated DB race/idempotency; browser presigned upload melalui gateway bisnis ketika tersedia. Jalankan gate bersama sesuai ruang lingkup implementasi.

### Hasil dan bukti

Belum diimplementasikan; tidak ada command proof, hasil operasi storage/FFmpeg, atau commit task pada sesi planning ini.

### Blocker atau tindak lanjut

Jika WEB-CONTENT-001 belum tersedia, proof HTTP backend direct tetap sah dan acceptance browser dashboard dicatat pending.

## Task: MEDIA-COMPLETE-001 — Finalisasi upload dan status aset aman saat diulang

- Status: Backlog
- Owner: Pengembang/agent pelaksana
- Prioritas: P1 — urutan mengikuti dependency
- Referensi: MEDIA-US-02, PRD-04/05/07/09, plan video tahap B–D
- Dependensi: MEDIA-UPLOAD-001
- Ukuran: Satu hasil review; pecah lagi bila scope implementasi tidak kecil.

### Ruang lingkup

Service/repository/model/routes media dan adapter storage. Implement complete/status dengan verifikasi objek, final source immutable dan state transition. Integrasi enqueue atomik baru di WORKER-001 setelah schema jobs tersedia.

### Acceptance criteria

- [ ] Objek absent/truncated/MIME-size invalid ditolak; claim klien bukan fakta teknis. Source final identity dicatat, metadata editorial tidak hilang saat completion gagal.
- [ ] Repeated/concurrent completion hanya menyimpan satu hasil; setelah freeze, presigned upload lama tidak menimpa input worker. Error aman; transaksi tidak mencakup network storage.
- [ ] Status pending/completed/failed dibedakan dari publicationStatus dan processing; complete belum berarti HLS ready/published. FK pointer hanya memasangkan owner yang benar.

### Validasi

Unit failure injection dan app.handle; dedicated DB races serta MinIO object identity proof. Uji timeout/outage, completion ganda dan overwrite sesudah complete. Jalankan gate bersama sesuai ruang lingkup implementasi.

### Hasil dan bukti

Belum diimplementasikan; tidak ada command proof, hasil operasi storage/FFmpeg, atau commit task pada sesi planning ini.

### Blocker atau tindak lanjut

WORKER-001 menambahkan durable enqueue dalam transaksi perubahan status setelah verifikasi storage, bukan enqueue semu pada tahap ini.

## Task: MEDIA-CLEANUP-001 — Abort, expiry dan pembersihan upload terkontrol

- Status: Backlog
- Owner: Pengembang/agent pelaksana
- Prioritas: P1 — urutan mengikuti dependency
- Referensi: MEDIA-US-02, PRD-04/05/07/09, plan video tahap B–D
- Dependensi: MEDIA-COMPLETE-001
- Ukuran: Satu hasil review; pecah lagi bila scope implementasi tidak kecil.

### Ruang lingkup

Module media, cleanup runner dan storage adapter dengan entry point/process yang ditetapkan saat implementasi. Hanya session/objek milik proyek yang eligible; tidak menyapu bucket shared atau source final aktif.

### Acceptance criteria

- [ ] Abort/expiry berulang aman; multipart orphan terhapus/ditandai recovery tanpa menghapus source yang dipakai atau hasil published.
- [ ] Race completion/abort/expiry mempunyai satu transisi final konsisten; storage failure dapat dipulihkan tanpa kehilangan metadata/pointer.
- [ ] Session berumur 24 jam sejak initiate; abort admin segera, completed upload invalid dikarantina 24 jam, sweep tiap jam. Cleanup hanya namespace milik session dengan claim/recovery idempotent; logging aman dan fixtures hanya bucket test. Retensi source final/output worker mengikuti WORKER-RETENTION-001.

### Validasi

Injected clock/storage failure tests; PostgreSQL concurrent transition proof dan MinIO abort/expiry cleanup integration. Jalankan gate bersama sesuai ruang lingkup implementasi.

### Hasil dan bukti

Belum diimplementasikan; tidak ada command proof, hasil operasi storage/FFmpeg, atau commit task pada sesi planning ini.

### Blocker atau tindak lanjut

Retensi source 7 hari dan file konten archived permanen disepakati 4 Oktober 2026. Pengecualian archived mencakup video asli; titik awal retensi serta [aturan cleanup nomor 6](../VIDEO_IMPLEMENTATION_PLAN.md#nomor-6--retensi-dan-cleanup-disetujui-4-oktober-2026) disetujui 4 Oktober 2026: session resume 24 jam, abort explicit segera, objek invalid/partial gagal karantina 24 jam dan sweep per jam. Implementasi/proof masih pending. Source retention/tombstone serta cleanup worker dirinci pada WORKER-RETENTION-001; task ini tidak menghapus output sukses/arsip atau source final aktif. Restore konten tetap refinement.

## Task: HLS-PROFILE-001 — Tetapkan profil HLS VOD dan proof FFmpeg

- Status: Backlog
- Owner: Pengembang/agent pelaksana
- Prioritas: P1 — urutan mengikuti dependency
- Referensi: HLS-US-01, PRD-04/05/07/09, plan video tahap B–D
- Dependensi: MEDIA-PROOF-001
- Ukuran: Satu hasil review; pecah lagi bila scope implementasi tidak kecil.

### Ruang lingkup

Dokumen profil/runbook dan fixture proof FFprobe/FFmpeg dalam `apps/api/test/integration/`. Buktikan [hls-v1 yang disetujui nomor 3](../VIDEO_IMPLEMENTATION_PLAN.md#nomor-3--profil-hls-disetujui-4-oktober-2026): H.264 SDR/AAC-LC 128 kbps, target video 480p/720p/1080p 1,2/2,5/4,5 Mbps, output hingga 30 fps, fMP4 target segment 6 detik dan keyframe 2 detik. Ladder/bitrate/codec/output hingga 30 fps/fMP4 target 6 detik disetujui pada 4 Oktober 2026; interval keyframe 2 detik masih rekomendasi teknis. Bekukan detail encoder/GOP/MIME/audio optional dan resource/timeouts dari proof sebelum WORKER-002.

### Acceptance criteria

- [ ] HLS VOD master/variant .m3u8 dan seluruh segment/init terverifikasi untuk portrait 9:16, rotasi/SAR, movie panjang dan tanpa audio; duration/keyframe/ENDLIST sesuai profil.
- [ ] Keluaran HLS dalam rentang 480p–1080p dan tidak melebihi sumber; rasio dipertahankan tanpa upscale/crop, sumber 1440p/4K ditolak. Boundary portrait 9:16/rotasi/SAR dan dimensi sumber antara batas, serta penolakan landscape/square/cinematic/rasio lain terbukti; kegagalan probe/encode/output partial tidak dianggap ready.
- [ ] Profil final mencatat keputusan produk dan compatibility proof untuk codec/ladder/format/durasi, mengikuti keputusan hls-v1; bukan diasumsikan dari pilihan HLS. Perintah FFmpeg memakai Bun.spawn array tanpa shell interpolation.
- [ ] Sumber valid dengan lebar tampilan 480 sampai di bawah target canonical 486 tidak di-upscale atau ditolak hanya karena target canonical; proof mapping native/dimensi genap/SAR mempertahankan rasio 9:16. Output tanpa audio, konversi sumber 60 fps, alignment keyframe dan kualitas adegan bergerak cepat diuji; manifest bandwidth mengikuti output terukur. Estimasi kapasitas menjumlahkan seluruh rendition dan sumber sesuai retensi.

### Validasi

FFmpeg/FFprobe nyata pada fixtures test bounded; parse/verify playlist dan semua referensi; catat versi tools, resource/timeout serta hasil gagal. Jalankan gate bersama sesuai ruang lingkup implementasi.

### Hasil dan bukti

Belum diimplementasikan; tidak ada command proof, hasil operasi storage/FFmpeg, atau commit task pada sesi planning ini.

### Blocker atau tindak lanjut

Profil produk hls-v1 disetujui pada 4 Oktober 2026; proof kualitas/compatibility serta pembekuan detail encoder masih diperlukan. WORKER-002 membawa profil ke queue/lease/retry production code. [Rekomendasi worker nomor 7](../VIDEO_IMPLEMENTATION_PLAN.md#nomor-7--kebijakan-worker-disetujui-4-oktober-2026) menyetujui parameter melalui env dan concurrency default 1; retry 3 attempt/jeda 60–300 detik, timeout encoding max(15 menit,3×durasi), stall 5 menit, heartbeat 15/lease 120/recovery 30 detik juga disetujui. Penentuan thread/RAM/disk melalui benchmark disetujui, sementara angka kandidat resource/detail teknis tambahan tetap refinement. Benchmark per-thread/RSS/disk serta timeout pada episode 10 menit/movie 30 menit harus dibuktikan sebelum scale. Task queue/claim/runner/runtime/benchmark dirinci pada backlog worker.

## Task: HLS-DELIVERY-001 — Kontrak akses seluruh objek HLS dan proof delivery

- Status: Backlog
- Owner: Pengembang/agent pelaksana
- Prioritas: P1 — urutan mengikuti dependency
- Referensi: HLS-US-01, PRD-04/05/07/09, plan video tahap B–D
- Dependensi: MEDIA-DESIGN-001, HLS-PROFILE-001
- Ukuran: Satu hasil review; pecah lagi bila scope implementasi tidak kecil.

### Ruang lingkup

Rancang delivery lokal/production mengikuti lifecycle draft → published → archived yang disetujui dan satu bucket aplikasi per environment yang dipilih. Buktikan [kontrak nomor 4](../VIDEO_IMPLEMENTATION_PLAN.md#nomor-4--akses-video-distribusi-hls-dan-cache-disepakati-4-oktober-2026): seluruh bucket privat, master/variant playlist melalui API dengan pemeriksaan akses dan rewrite, init/segment/caption langsung dari storage memakai signed GET URL. Source asli tidak menjadi playback viewer. TTL playback 2× durasi video aktual terverifikasi disetujui 4 Oktober 2026, menggantikan usulan tetap 60 menit. Cache bila diterapkan wajib memiliki expiry/invalidation. Cache metadata TTL 60 detik, signed playlist no-store dan private segment freshness maksimal min(300 detik, sisa URL) disetujui 4 Oktober 2026; URL lama mengikuti expiry setelah archive. Proof header/cache/provider/refresh tetap diperlukan. Jangan menganggap folder output publik, menambah bucket publication, full proxy video atau Worker/CDN runtime sebagai keputusan. Buktikan manifest no-store, validasi namespace, poster URL, CORS/Range/GET/HEAD/seek, native signing dan refresh setelah pause/seek/quality switch melewati TTL pada film 30 menit.

### Acceptance criteria

- [ ] Master, variant, segment, init dan caption semuanya accessible pada sesi playback yang sah. Master presign saja dan asumsi query token diwariskan ditolak melalui test.
- [ ] Draft/source tetap privat, preview admin, viewer konten published tanpa akun; akses lama setelah archive mengikuti keputusan/bound yang ditetapkan termasuk cache/expiry dan movie panjang.
- [ ] Satu bucket aplikasi tetap privat; master/variant API memeriksa akses dan namespace, seluruh init/segment/caption URL terotorisasi. Browser mengambil payload video langsung dari storage tanpa proxy body melalui API. TTL 2× durasi terverifikasi mengikuti keputusan terbaru; archive-link/cache mengikuti kontrak yang disepakati dan dibuktikan sebelum task selesai; bukti expired URL, refresh/seek/quality switch dan buffer/cache lama tercatat.
- [ ] TTL integer ceil(2 × verifiedDurationMs / 1000), signature/expiresAt dan renewal terbukti pada 3/10/30 menit, fractional/video pendek; klien tidak menentukan durasi. TTL upload part tidak ikut berubah.
- [ ] Cache jika enabled memiliki expiry/event invalidation: playlist/DTO signed no-store; cache metadata TTL 60 detik dan invalidation setelah commit; private segment cache fresh maksimal min(300 detik, sisa URL), tidak melewati expiry URL dan hit tidak memperpanjangnya. Header/response-control provider dibuktikan; fallback no-cache/no-store bila clamp belum terbukti. Cache/CDN/browser invalidation tidak diklaim mencabut signature/buffer lama.
- [ ] Proof browser memakai komponen HLS dari bundled docs Video.js versi installed, semua URI/MIME/CORS/seek benar; compatibility matrix dan adapter/version choice tercatat. Tidak mengandalkan R2 ACL/public-read atau custom-domain S3 presign.

### Validasi

Fixture HLS proof untuk seluruh objek, expiry/refresh, URL stale, preview denial, cache/archive/seek; Chromium/Firefox serta Safari/native HLS jika tersedia. Evidence unavailable dicatat, bukan dianggap lolos. Jalankan gate bersama sesuai ruang lingkup implementasi.

### Hasil dan bukti

Belum diimplementasikan; tidak ada command proof, hasil operasi storage/FFmpeg, atau commit task pada sesi planning ini.

### Blocker atau tindak lanjut

Kontrak ini menjadi gerbang PUBLISH-001; [syarat publikasi nomor 5](../VIDEO_IMPLEMENTATION_PLAN.md#nomor-5--syarat-publikasi-disetujui-4-oktober-2026) disetujui 4 Oktober 2026 sebagai kontrak produk D4. Implementasi publish bergantung VID-016 + WORKER-002 + HLS-DELIVERY-001; real delivery implementation dan full E2E HLS dari worker tetap acceptance publish/public/web. Persetujuan tidak mengubah status task implementasi menjadi Done.

## Task: MEDIA-R2-001 — Ulangi proof storage pada R2 staging

- Status: Backlog
- Owner: Pengembang/agent pelaksana
- Prioritas: P1 — urutan mengikuti dependency
- Referensi: MEDIA-US-01, PRD-04/05/07/09, plan video tahap B–D
- Dependensi: MEDIA-CLEANUP-001, HLS-DELIVERY-001
- Ukuran: Satu hasil review; pecah lagi bila scope implementasi tidak kecil.

### Ruang lingkup

Suite storage/delivery dengan `STORAGE_PROVIDER=r2`, HTTPS endpoint dan region auto, bucket staging khusus. Credential/bucket R2 diperlukan; aplikasi production/data existing tidak dipakai untuk cleanup test.

### Acceptance criteria

- [ ] Satu kontrak adapter dan session berhasil pada R2: presign/CORS/multipart create/UploadPart/list/complete/abort termasuk gambar kecil satu part, checksum/freeze source/cleanup; unsupported feature menghasilkan error explicit.
- [ ] Fixture HLS master/variant/segment/init dapat didistribusikan dengan mekanisme terpilih, tanpa source/draft publik, tanpa ACL S3 dan tanpa presign custom domain.
- [ ] Evidence MinIO/R2 dipisahkan; pergantian env bukan copy data. R2 end-to-end transcode/publish/public tetap wajib sebelum rollout, walau proof storage staging lulus.

### Validasi

Dedicated bucket staging proof dengan env proses server, redacted logs, per-operation results dan fixture HLS delivery. Tidak menjalankan rollout production sebagai bagian proof. Jalankan gate bersama sesuai ruang lingkup implementasi.

### Hasil dan bukti

Belum diimplementasikan; tidak ada command proof, hasil operasi storage/FFmpeg, atau commit task pada sesi planning ini.

### Blocker atau tindak lanjut

Bucket/credential R2 staging belum tersedia dalam sesi ini; task Backlog. [Rekomendasi deployment nomor 8](../VIDEO_IMPLEMENTATION_PLAN.md#nomor-8--rekomendasi-deployment-production-dan-r2-belum-disetujui) belum disetujui; full R2 E2E, scoped token/delete/abort/CORS, domain/server/volume/restart/restore/benchmark dibuktikan sebelum production. Development MinIO tidak harus menunggu provider production.

## Evidence finalisasi — 4 Oktober 2026

Validator Bun dokumen lulus: 14 dokumen pada index commit, 170 tautan lokal/anchor, 39 ID task unik (15 metadata Done, VID-016 Backlog, 23 task media), dependency dikenal/DAG tanpa siklus dan prerequisite Ready terpenuhi; default env/credential kosong serta geometry multipart/TTL terverifikasi secara statis. Ini evidence plan, bukan proof storage/FFmpeg/HLS. Task worker/publication/gateway/player sudah dipecah pada backlog terkait; implementasi belum dimulai.
