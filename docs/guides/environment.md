# Environment aplikasi

> Diperbarui 6 Oktober 2026. API media/worker/HLS dan poster request-path aktif pada development MinIO; built-browser MinIO proof poster lulus pada ACOV-009. Production R2 melalui selector env tersedia tetapi proof staging belum dijalankan. Variabel native poster aktif di API; kontrak/command/batas evidence: [Media Operations](../operations/media.md).

## Mulai dari root repo

```sh
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
bun install --frozen-lockfile
bun run dev
```

Perintah `cp` cukup dijalankan sekali; jika `.env` sudah ada, tambahkan variabel yang kurang secara manual agar nilai lokal tidak tertimpa. File `.env.example` dilacak Git, sedangkan `.env` dan variasi `.env.*` lokal diabaikan. Simpan konfigurasi setiap aplikasi pada direktorinya sendiri. `packages/auth` menerima konfigurasi dari aplikasi yang memakainya dan tidak memiliki file env sendiri.

## API — `apps/api/.env`

| Variabel                                   | Kegunaan                                                                                         | Status                                               |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------- |
| `PORT`                                     | Port API; default starter 3001.                                                                  | Aktif pada dev dan start.                            |
| `DATABASE_URL`                             | Koneksi PostgreSQL untuk Drizzle, data auth, dan queue persisten.                                | URL divalidasi saat API start; koneksi saat dipakai. |
| `BETTER_AUTH_URL`                          | Origin publik web untuk Better Auth, misalnya `http://localhost:3000`; tanpa suffix `/api/auth`. | Dipakai saat startup API.                            |
| `BETTER_AUTH_SECRET`                       | Secret autentikasi acak dengan entropi tinggi, minimal 32 karakter.                              | Wajib diisi saat API start.                          |
| `WEB_ORIGIN`                               | Origin web yang harus sama dengan `BETTER_AUTH_URL` untuk login same-origin.                     | Dipakai saat startup API.                            |
| `STORAGE_PROVIDER`                         | Selector `minio` untuk development atau `r2` untuk production.                                   | Aktif jika selector diisi; profile divalidasi.       |
| `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`    | Endpoint API S3, region dan bucket sesuai profil provider.                                       | Aktif pada API/worker; wajib saat media aktif.       |
| `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | Kredensial storage khusus server.                                                                | Wajib diisi saat integrasi storage.                  |
| `S3_SESSION_TOKEN`                         | Token tambahan bila memakai kredensial storage sementara.                                        | Opsional.                                            |
| `FFMPEG_PATH`, `FFPROBE_PATH`              | Lokasi executable transcode dan pemeriksaan media; nilai contoh mengandalkan `PATH`.             | Aktif pada worker terpisah.                          |
| `MEDIA_PLAYBACK_BASE_URL`                  | Origin/path delivery seluruh objek HLS setelah mekanisme akses ditetapkan.                       | Aktif; kosong = WEB_ORIGIN/api, wajib same origin.   |
| `MEDIA_WORKER_CONCURRENCY`                 | Maksimal job video aktif per instance worker; default 1, dapat diatur melalui env server.        | Aktif pada worker, default1; command terpisah.       |
| `MEDIA_POSTER_MAX_PIXELS`                  | Batas pixel decode poster; default 16.777.216, rentang 2.073.600–16.777.216.                     | Aktif pada endpoint request poster.                  |
| `MEDIA_POSTER_PROCESS_CONCURRENCY`         | Maksimal proses poster aktif per instance API; default 1, rentang 1–4 tanpa queue menunggu.      | Aktif pada processor Bun.Image.                      |
| `MEDIA_POSTER_PROCESS_TIMEOUT_SECONDS`     | Deadline logis proses; default 20 detik, rentang 1–120.                                          | Pembatas response; native terminal tetap ditunggu.   |

Nilai database dalam sampel hanya contoh lokal. Menyalin env belum membuat database, tabel, bucket, akun admin, atau worker. Queue menggunakan PostgreSQL yang sama; tidak memerlukan Redis. Konfigurasi melalui env dan concurrency default 1 disetujui pada nomor 7 di bawah; angka retry 3 attempt/jeda 60–300 detik, encoding max(900 detik,3×durasi), stall 300 detik, heartbeat 15/lease 120/recovery 30 detik juga sudah disetujui. Worker runtime menerapkan parameter tersebut.

`TEST_DATABASE_URL` hanya untuk proof adapter (proof mereset schema `public` dan `drizzle`) `bun run --cwd apps/api auth:adapter:proof` dan harus menunjuk ke `vertical_movie_app_auth_test` di localhost. `AUTH_SCHEMA_TEST_DATABASE_URL` hanya untuk `bun run --cwd apps/api auth:schema:proof`; test akan menghapus dan membuat ulang schema `public` dan `drizzle` pada `vertical_movie_app_auth_schema_test`. `AUTH_RUNTIME_TEST_DATABASE_URL` hanya untuk `bun run --cwd apps/api auth:runtime:proof` dan mereset dua schema pada `vertical_movie_app_auth_runtime_test`. `AUTH_ADMIN_TEST_DATABASE_URL` hanya untuk proof admin, recovery, authorization, dan OpenAPI pada `vertical_movie_app_auth_admin_test`; proof provisioning/recovery mereset schema, authorization juga mereset schema sebelum menerapkan migrasi. Script menolak host/nama database lain. Proof yang berbagi database admin harus dijalankan serial. Arahkan semua variabel test hanya ke database localhost khusus yang boleh di-reset. Tidak ada script umum `test:integration`; jalankan proof satu per satu dengan command yang tercantum pada backlog auth. Script migrasi aplikasi hanya memerlukan `DATABASE_URL`; target harus diperiksa operator. Gunakan `db:migrate -- --stage=expand`, verifikasi cutover native, lalu `db:migrate -- --stage=contract`; tanpa flag semua migration pending diterapkan. Lihat [Auth Operations](../operations/auth.md).

Pada 1 Oktober 2026, database development `vertical_movie_app` dibuat pada PostgreSQL lokal di `localhost:5433` dan koneksi dari `apps/api/.env` diverifikasi memakai Bun SQL. Pada 2 Oktober 2026, migrasi auth berhasil diterapkan ke database development lokal dan satu akun admin berhasil diprovision melalui CLI. Kredensial sebenarnya hanya disimpan pada env lokal yang diabaikan Git; password admin tidak disimpan pada dokumentasi. Itu adalah baseline sebelum refactor. Pemeriksaan akhir refactor menemukan satu migration baseline. Pada tindak lanjut 2 Oktober 2026, expand/contract diterapkan pada database development: journal berisi tiga migration, role admin native aktif, dan tabel legacy `admin_identity` dihapus. ID admin, credential account, hash password, dan sesi existing diverifikasi tetap sama; akun tidak direset. Backup sebelum migrasi berada di luar repo dan archive tervalidasi; restore penuh masih perlu diuji (lihat Auth Operations). Status deployment lain bergantung pada environment masing-masing. Schema, endpoint, dan sesi native diuji pada database test terpisah.

Setelah database aplikasi dimigrasikan dan operator siap membuat admin, jalankan dari root `bun run --cwd apps/api admin:provision -- admin@example.com`. Wrapper memakai CLI resmi auth 1.7.7 dengan prompt password native tersembunyi (12–128 karakter); jangan memberi password flag. Proof prompt memakai Bun PTY. Jangan jalankan provisioning sebelum schema tersedia. Gunakan `--cwd` untuk mempertahankan stdin interaktif; Bun 1.4.2 workspace filter tidak meneruskan input CLI ini pada proof lokal.

Admin masuk dari halaman web `/admin/login`; setelah login, guard membaca snapshot native lewat TanStack Query sebelum menampilkan dashboard `/admin`. Browser mengakses `/api/auth/*` pada origin web; server TanStack Start meneruskan request ke `API_INTERNAL_URL` yang tetap. Untuk setup lokal, `VITE_API_URL`, `BETTER_AUTH_URL`, dan `WEB_ORIGIN` memakai origin web yang sama. Password dan sesi tidak disimpan pada `VITE_*` atau browser storage.

### Proof metadata konten

`CONTENT_TEST_DATABASE_URL` menunjuk hanya ke database lokal `vertical_movie_app_content_test`. `bun run --cwd apps/api content:schema:proof` menguji constraints dan migrasi; `bun run --cwd apps/api content:runtime:proof` menguji repository/service serta HTTP dengan Better Auth native. Kedua script menghapus dan membuat ulang schema `public` dan `drizzle`, lalu membuat fixture sendiri. Guard menolak nama database lain dan host nonlokal. Buat database khusus tersebut sebelum menjalankan proof dan jalankan script serial karena targetnya sama. Konfigurasi test tidak menjadi konfigurasi runtime HTTP; jangan mengganti `DATABASE_URL` development untuk menjalankan proof.

Pada tindak lanjut 3 Oktober 2026, pengguna menginstruksikan migrasi development jika schema backend berubah. Migrasi konten `0003`–`0005` berhasil diterapkan pada `vertical_movie_app` localhost:5433 setelah backup; journal kini enam entry dan enam tabel metadata tersedia. Snapshot user/account/session/verification/rate_limit existing tetap sama. Archive backup tervalidasi; restore penuh dan rollout production belum diuji. Proof tetap memakai database test dedicated. Evidence command berada pada [backlog verifikasi](../tasks/development-verification.md).

### Drizzle Studio

Jalankan dari root:

```sh
bun run db:studio
```

Alternatif app-local: `bun run --cwd apps/api db:studio`. Bun memuat `apps/api/.env`; Studio menggunakan `DATABASE_URL` yang sama dan schema `apps/api/src/db/schema/index.ts`. Buka [Drizzle Studio](https://local.drizzle.studio) selama command berjalan. Server penghubung bind pada `127.0.0.1:4983`, terpisah dari API/web. Hentikan dengan Ctrl+C. Untuk port lain gunakan `bun run --cwd apps/api db:studio --port=4984` lalu pilih port koneksi tersebut di UI Studio.

Drizzle Kit `0.31.11` membutuhkan driver yang didukung untuk Studio dan belum mendukung Bun SQL di jalur ini. `postgres@3.4.9` adalah devDependency API khusus tooling; runtime API tetap memakai `drizzle-orm/bun-sql`. Config menyediakan credential hanya ketika DATABASE_URL tersedia, sehingga generate schema tetap dapat berjalan tanpa koneksi. Command Studio tidak menjalankan migration; untuk provisioning/reset admin gunakan command native pada Auth Operations.

### Pemulihan password admin

Hentikan seluruh instance API penerima login dan selesaikan/batalkan request in-flight. Jalankan `bun run --cwd apps/api admin:reset-password -- admin@example.com --maintenance-confirmed`, lalu masukkan password baru melalui prompt tersembunyi. Operator memakai `requestPasswordReset/resetPassword` native dengan callback token di memori, tanpa email/sesi admin. Revoke sessions aktif dan diverifikasi sebelum sukses. Reset native tidak atomic: failure dapat terjadi setelah password berubah; tetap maintenance dan ulangi native reset sampai pencabutan terverifikasi sebelum restart. Detail recovery, seed parsial, concurrency, rollback, dan migrasi ada pada [Auth Operations](../operations/auth.md).

### Storage dan HLS — runtime aktif

Development: STORAGE_PROVIDER=minio, S3_ENDPOINT=http://localhost:9000, S3_REGION=us-east-1, S3_BUCKET=vertical-movie-app. Credential aplikasi scoped bucket disimpan hanya pada env ignored. Port9001 adalah Console, bukan endpoint S3. Production: NODE_ENV=production, STORAGE_PROVIDER=r2, S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com, S3_REGION=auto dan bucket/credential R2 milik environment. Loader menolak provider/endpoint/credential invalid serta MinIO production, tanpa fallback credential. Mengganti profil tidak memindahkan objek persisted. R2 belum diuji staging.

MEDIA_PLAYBACK_BASE_URL kosong berarti WEB_ORIGIN/api dan harus sama origin/path. Master/variant melalui gateway API, init/segment langsung signed S3 GET. TTL2×durasi verified, signed DTO/playlist private,no-store; payload private,no-store sebagai fallback MinIO. Metadata TTL60s dengan after-commit invalidation. Archive memblokir URL baru; yang lama/buffer bertahan sampai expiry. Bucket tunggal seluruhnya private, tanpa public-read atau bucket lifecycle unconditional yang melanggar retensi archived.

Native Bun S3 dipakai untuk file/GET/presign. SDK S3 multipart/copy/control ditambahkan setelah native1.4.2 tidak mempunyai kontrak browser initiate/list/complete/abort. Browser harus menjangkau endpoint persign tanpa rewrite hostname; CORS GET/PUT/HEAD/Range dan ETag perlu diverifikasi per environment. Rincian dan proof pada [Media Operations](../operations/media.md). Turbo api dev/start meneruskan selector/upload/playback; worker dijalankan app-local, sehingga env worker langsung dibaca Bun.

Generate secret baru di terminal sendiri dengan Bun, lalu masukkan hasilnya ke `apps/api/.env`:

```sh
bun -e 'console.log(Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, "0")).join(""))'
```

## Upload multipart — parameter disetujui

Parameter berikut disetujui 4 Oktober 2026. Loader, session API dan scheduler uploader admin aktif; proof lokal 6 Oktober 2026 pada [backlog ADUP](../tasks/admin-media-upload.md). Kontrak lengkap pada [parameter upload](../plans/video/implementation-plan.md#nomor-2--parameter-upload-disetujui-4-oktober-2026).

| Variabel server aktif             | Default | Arti                                                                                 |
| --------------------------------- | ------- | ------------------------------------------------------------------------------------ |
| MEDIA_UPLOAD_PART_CONCURRENCY     | 3       | Maksimal UploadPart bersamaan per file pada browser scheduler; bukan job transcoding |
| MEDIA_UPLOAD_SESSION_TTL_SECONDS  | 86400   | Session 24 jam sejak initiate, tidak diperpanjang oleh retry                         |
| MEDIA_UPLOAD_PART_URL_TTL_SECONDS | 900     | URL part maksimal 15 menit sejak signing, dibatasi sisa session                      |

Runtime menghitung partUrlTtlSeconds = min(900, floor((sessionExpiresAt - now)/1000)); sisa kurang dari 1 detik atau session non-pending ditolak. Renewal memeriksa admin/session/part dan tidak mengulang part yang sudah terverifikasi. MEDIA-CFG-001 menguji default/validasi positive integer tanpa storage I/O; MEDIA-PROOF/DESIGN/UPLOAD membuktikan native signing, expiry dan browser concurrency. Konfigurasi milik API, disampaikan sebagai nilai aman kepada browser tanpa VITE_ secret atau signed URL persisten.

## Pemrosesan poster — batas native

Adapter poster menerima payload crop browser PNG/WebP statis tepat 1080×1920 (bukan source image asli), cocok dengan Content-Type dan SHA-256 yang diberikan, maksimal 5.000.000 byte. Ia memakai `Bun.Image` untuk decode/auto-orient dan encode ulang ke WebP quality 85, lalu memverifikasi codec, dimensi, dan hash hasilnya. Source untuk crop dapat berupa JPG/JPEG/PNG/WebP still, maksimal 5.000.000 byte dan 40 MP, serta boleh memiliki rasio lain. Batas pixel default 16.777.216 melindungi decode sebelum alokasi; output 1080×1920 membutuhkan 2.073.600 pixel. `MEDIA_POSTER_PROCESS_CONCURRENCY` membatasi kerja tiap instance API; request saat sibuk ditolak segera tanpa antrean memori.

`MEDIA_POSTER_PROCESS_TIMEOUT_SECONDS` membatasi waktu penggunaan hasil dan waktu jawaban. Terminal native `Bun.Image` tidak dapat dibatalkan secara paksa; bila masih berjalan saat deadline atau request abort, processor menolak hasil dan mempertahankan slot concurrency sampai terminal selesai. Jadi nilai ini tidak menjamin operasi CPU langsung berhenti. Endpoint admin `POST /admin/media/uploads/:id/process-poster` memakai adapter ini; same-origin gateway hanya mengalokasikan30 detik untuk exact POST route tersebut. Restart API setelah mengganti env.

## Worker — env aktif dan kandidat resource

Jalankan bun run --cwd apps/api worker atau worker:start setelah build. API tidak menjalankan worker. Parameter yang digunakan loadWorkerEnv:

| Variabel                                                             | Default                        | Fungsi                                                                     |
| -------------------------------------------------------------------- | ------------------------------ | -------------------------------------------------------------------------- |
| MEDIA_WORKER_CONCURRENCY                                             | 1                              | Job per instance; integer1–8                                               |
| MEDIA_JOB_MAX_ATTEMPTS / MEDIA_JOB_RETRY_DELAYS_SECONDS              | 3 / 60,300                     | Budget failure dan delay retry detik; pause resource tidak membakar budget |
| MEDIA_JOB_HEARTBEAT_SECONDS / MEDIA_JOB_LEASE_SECONDS                | 15 / 120                       | Renew dengan token/DB clock; lease>2×heartbeat                             |
| MEDIA_JOB_RECOVERY_POLL_SECONDS / MEDIA_JOB_POLL_SECONDS             | 30 / 5                         | Recovery lease / idle poll                                                 |
| MEDIA_TRANSCODE_TIMEOUT_FACTOR / MEDIA_TRANSCODE_MIN_TIMEOUT_SECONDS | 3 / 900                        | max(900s,3×duration) encoding                                              |
| MEDIA_JOB_STALL_TIMEOUT_SECONDS / MEDIA_JOB_HARD_TIMEOUT_SECONDS     | 300 / 7200                     | No encode progress / seluruh job                                           |
| MEDIA_WORKER_SHUTDOWN_SECONDS                                        | 60                             | Grace sebelum abort; subprocess escalation10s fixed                        |
| MEDIA_FFMPEG_THREADS                                                 | 1                              | Decode/filter/encoder; bukan pembatas CPU OS                               |
| MEDIA_WORKER_WORKDIR                                                 | /var/tmp/vertical-movie-worker | Dedicated absolute directory                                               |
| MEDIA_WORKER_MIN_FREE_BYTES                                          | 10737418240                    | Guard disk10GiB                                                            |
| FFMPEG_PATH / FFPROBE_PATH                                           | ffmpeg / ffprobe               | Executable, probe60s fixed                                                 |

Hard deadline/shutdown/thread/disk merupakan kandidat teknis aktif yang dapat dituning setelah benchmark target4core4GB; env tidak membatasi RAM/CPU OS. Tidak ada memory reservation/admission lintas worker atau resource limit deployment otomatis. Poll/probe/kill values eksplisit; nama variabel rekomendasi lama yang tidak ada pada tabel bukan API env aktif. Restart worker setelah mengganti env. Worker Linux memerlukan GNU timeout untuk membatasi child orphan setelah death.

## Web — `apps/web/.env`

| Variabel           | Kegunaan                                                                             | Status                                                  |
| ------------------ | ------------------------------------------------------------------------------------ | ------------------------------------------------------- |
| `PORT`             | Port Vite dev server dan server production Nitro/Bun; default 3000.                  | Aktif.                                                  |
| `HOST`             | Alamat bind; sampel lokal memakai `127.0.0.1`.                                       | Aktif pada dev dan server production.                   |
| `VITE_API_URL`     | Origin web publik untuk browser client API dan Better Auth melalui gateway.          | Dipakai sebagai konfigurasi publik saat build.          |
| `API_INTERNAL_URL` | Upstream tetap Elysia untuk server TanStack Start, misalnya `http://localhost:3001`. | Khusus server saat dev/run; tidak masuk bundle browser. |

`PORT` dev harus integer 1–65535. Vite menolak port yang sedang dipakai agar origin tidak bergeser tanpa diketahui. Argumen CLI `--port`/`--host` dapat dipakai untuk override saat dev. Untuk setup auth lokal, `VITE_API_URL`, `BETTER_AUTH_URL`, dan `WEB_ORIGIN` memakai origin web yang sama; `API_INTERNAL_URL` menunjuk ke server API yang tidak diekspos browser. Gateway membaca nilai ini saat setiap handler server berjalan dan meneruskan browser melalui origin web.

Semua variabel `VITE_*` dapat masuk bundle browser. Simpan secret Better Auth, kredensial database, dan kredensial S3 hanya di API. `VITE_API_URL` adalah origin web yang dipakai client browser melalui gateway dan disisipkan saat build; ubahannya membutuhkan build ulang web. Gunakan HTTPS dan origin deployment yang benar saat rilis; konfigurasi production diberikan melalui environment deployment atau env lokal production yang tidak dilacak Git. Atur `NODE_ENV=production` pada runtime production, dan `HOST=0.0.0.0` untuk web jika server perlu menerima koneksi dari luar loopback.

## Pemuatan dan Turborepo

Gateway memakai origin publik terkonfigurasi `VITE_API_URL` (runtime server jika tersedia, fallback nilai build) untuk callback, bersama target tetap `API_INTERNAL_URL`. Nilainya harus konsisten dengan `BETTER_AUTH_URL`/`WEB_ORIGIN`; request Host/Origin tidak memilih target. Callback publik/internal diubah menjadi path relatif; callback asing atau ber-userinfo ditolak. Respons auth memakai `private, no-store`, deadline 10 detik mencakup body, dan endpoint operator tertutup. Turbo meneruskan `VITE_API_URL` pada `start` agar deployment dapat menyediakan konfigurasi origin server yang sama.

- Bun memuat env aplikasi API secara native; Vite menangani env web menurut mode. Konfigurasi Vite menggunakan `loadEnv` untuk `PORT`/`HOST`. Tidak ada tambahan dependensi `dotenv`.
- Root `turbo.json` meneruskan variabel runtime API pada task `api#dev`/`api#start`; `API_INTERNAL_URL` diteruskan ke web `dev`/`start`. Task `web#build` hanya memasukkan `VITE_API_URL` dari konfigurasi API ke proses build client. Environment yang diekspor deployment tidak hilang karena strict mode.
- Build memasukkan `.env*` sebagai input cache. Task `web#build` juga memasukkan `VITE_API_URL` dari environment proses ke hash. Jangan mengandalkan penggantian env setelah artefak client selesai dibangun.
- Restart proses setelah mengubah env. API menolak secret Better Auth kosong/pendek, URL bukan PostgreSQL, serta `BETTER_AUTH_URL` dan `WEB_ORIGIN` yang berbeda.

## Referensi

- [Bun environment variables](https://bun.com/docs/runtime/environment-variables)
- [Bun S3 credentials](https://bun.com/docs/runtime/s3#credentials)
- [R2 S3 compatibility dan region](https://developers.cloudflare.com/r2/api/s3/api/), [presigned URL/domain](https://developers.cloudflare.com/r2/api/s3/presigned-urls/), dan [CORS](https://developers.cloudflare.com/r2/buckets/cors/)
- [FFmpeg HLS muxer](https://ffmpeg.org/ffmpeg-formats.html#hls-2)
- [Vite environment variables](https://vite.dev/guide/env-and-mode) dan [env pada config Vite](https://vite.dev/config/#using-environment-variables-in-config)
- [Better Auth installation](https://better-auth.com/docs/installation)

## Uploader browser — konfigurasi dan proof lokal

Update6 Oktober 2026: uploader memakai origin gateway existing dan safe config inventory dari API. Tidak ada env storage credential baru pada web atau VITE__. MinIO/R2 tetap dipilih oleh STORAGE_PROVIDER dan S3__ server; client tidak menyimpan URL/File/session privat di localStorage/IndexedDB. MEDIA_UPLOAD_PART_CONCURRENCY dibatasi client maksimum3 dengan satu file aktif per tab; MEDIA_WORKER_CONCURRENCY default1 tetap terpisah.

Test fixture uploader menggunakan MEDIA_TEST_DATABASE_URL hanya loopback/vertical_movie_app_media_test serta MEDIA_STORAGE_TEST_ENDPOINT/ACCESS_KEY_ID/SECRET_ACCESS_KEY yang eksplisit untuk bucket fixture acak. Credential test perlu hak create/delete bucket; credential aplikasi scoped bucket tidak perlu hak tersebut. Jangan menaruh nilai credential pada docs/log.

Browser harness menggunakan AUTH_BROWSER_PHASE=media, AUTH_BROWSER_RUNTIME=built, MEDIA_BROWSER_PHASE=full|layout|outage dan AUTH_BROWSER_NODE/AUTH_PLAYWRIGHT_MODULE/AUTH_BROWSER_EXECUTABLE untuk runner yang tersedia. Default worker dibaca dari checkout dan dievaluasi di runner; AUTH_BROWSER_WORKER_PATH hanya compatibility override. Auth fixture tidak membuktikan deployment Better Auth production. Root build dan suite reset DB harus serial terhadap browser proof; [runbook media](../operations/media.md#upload-media-admin--workflow-dan-proof-6-oktober-2026) memisahkan runtime dan test.
