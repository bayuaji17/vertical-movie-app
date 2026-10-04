# Environment aplikasi

> Diperbarui 3 Oktober 2026. MinIO development, Cloudflare R2 production melalui S3-compatible, selector env dan HLS disetujui pengguna. Sampel media tetap **direncanakan**, belum dikonsumsi loader runtime.

## Mulai dari root repo

```sh
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
bun install --frozen-lockfile
bun run dev
```

Perintah `cp` cukup dijalankan sekali; jika `.env` sudah ada, tambahkan variabel yang kurang secara manual agar nilai lokal tidak tertimpa. File `.env.example` dilacak Git, sedangkan `.env` dan variasi `.env.*` lokal diabaikan. Simpan konfigurasi setiap aplikasi pada direktorinya sendiri. `packages/auth` menerima konfigurasi dari aplikasi yang memakainya dan tidak memiliki file env sendiri.

## API — `apps/api/.env`

| Variabel                                   | Kegunaan                                                                                         | Status                                                                            |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| `PORT`                                     | Port API; default starter 3001.                                                                  | Aktif pada dev dan start.                                                         |
| `DATABASE_URL`                             | Koneksi PostgreSQL untuk Drizzle, data auth, dan queue persisten.                                | URL divalidasi saat API start; koneksi saat dipakai.                              |
| `BETTER_AUTH_URL`                          | Origin publik web untuk Better Auth, misalnya `http://localhost:3000`; tanpa suffix `/api/auth`. | Dipakai saat startup API.                                                         |
| `BETTER_AUTH_SECRET`                       | Secret autentikasi acak dengan entropi tinggi, minimal 32 karakter.                              | Wajib diisi saat API start.                                                       |
| `WEB_ORIGIN`                               | Origin web yang harus sama dengan `BETTER_AUTH_URL` untuk login same-origin.                     | Dipakai saat startup API.                                                         |
| `STORAGE_PROVIDER`                         | Selector `minio` untuk development atau `r2` untuk production.                                   | Direncanakan; belum dibaca `loadApiEnv`.                                          |
| `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`    | Endpoint API S3, region dan bucket sesuai profil provider.                                       | Direncanakan; sampel MinIO lokal tersedia.                                        |
| `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | Kredensial storage khusus server.                                                                | Wajib diisi saat integrasi storage.                                               |
| `S3_SESSION_TOKEN`                         | Token tambahan bila memakai kredensial storage sementara.                                        | Opsional.                                                                         |
| `FFMPEG_PATH`, `FFPROBE_PATH`              | Lokasi executable transcode dan pemeriksaan media; nilai contoh mengandalkan `PATH`.             | Disiapkan untuk worker media.                                                     |
| `MEDIA_PLAYBACK_BASE_URL`                  | Origin/path delivery seluruh objek HLS setelah mekanisme akses ditetapkan.                       | Direncanakan; kosong, belum ada delivery runtime.                                 |
| `MEDIA_WORKER_CONCURRENCY`                 | Maksimal job video aktif per instance worker; default 1, dapat diatur melalui env server.        | Disetujui 4 Oktober 2026; sample tersedia, loader/worker belum diimplementasikan. |

Nilai database dalam sampel hanya contoh lokal. Menyalin env belum membuat database, tabel, bucket, akun admin, atau worker. Queue menggunakan PostgreSQL yang sama; tidak memerlukan Redis. Konfigurasi melalui env dan concurrency default 1 disetujui pada nomor 7 di bawah; angka retry 3 attempt/jeda 60–300 detik, encoding max(900 detik,3×durasi), stall 300 detik, heartbeat 15/lease 120/recovery 30 detik juga sudah disetujui. Runtime belum menerapkannya.

`TEST_DATABASE_URL` hanya untuk proof adapter (proof mereset schema `public` dan `drizzle`) `bun run --cwd apps/api auth:adapter:proof` dan harus menunjuk ke `vertical_movie_app_auth_test` di localhost. `AUTH_SCHEMA_TEST_DATABASE_URL` hanya untuk `bun run --cwd apps/api auth:schema:proof`; test akan menghapus dan membuat ulang schema `public` dan `drizzle` pada `vertical_movie_app_auth_schema_test`. `AUTH_RUNTIME_TEST_DATABASE_URL` hanya untuk `bun run --cwd apps/api auth:runtime:proof` dan mereset dua schema pada `vertical_movie_app_auth_runtime_test`. `AUTH_ADMIN_TEST_DATABASE_URL` hanya untuk proof admin, recovery, authorization, dan OpenAPI pada `vertical_movie_app_auth_admin_test`; proof provisioning/recovery mereset schema, authorization juga mereset schema sebelum menerapkan migrasi. Script menolak host/nama database lain. Proof yang berbagi database admin harus dijalankan serial. Arahkan semua variabel test hanya ke database localhost khusus yang boleh di-reset. Tidak ada script umum `test:integration`; jalankan proof satu per satu dengan command yang tercantum pada backlog auth. Script migrasi aplikasi hanya memerlukan `DATABASE_URL`; target harus diperiksa operator. Gunakan `db:migrate -- --stage=expand`, verifikasi cutover native, lalu `db:migrate -- --stage=contract`; tanpa flag semua migration pending diterapkan. Lihat [Auth Operations](AUTH_OPERATIONS.md).

Pada 1 Oktober 2026, database development `vertical_movie_app` dibuat pada PostgreSQL lokal di `localhost:5433` dan koneksi dari `apps/api/.env` diverifikasi memakai Bun SQL. Pada 2 Oktober 2026, migrasi auth berhasil diterapkan ke database development lokal dan satu akun admin berhasil diprovision melalui CLI. Kredensial sebenarnya hanya disimpan pada env lokal yang diabaikan Git; password admin tidak disimpan pada dokumentasi. Itu adalah baseline sebelum refactor. Pemeriksaan akhir refactor menemukan satu migration baseline. Pada tindak lanjut 2 Oktober 2026, expand/contract diterapkan pada database development: journal berisi tiga migration, role admin native aktif, dan tabel legacy `admin_identity` dihapus. ID admin, credential account, hash password, dan sesi existing diverifikasi tetap sama; akun tidak direset. Backup sebelum migrasi berada di luar repo dan archive tervalidasi; restore penuh masih perlu diuji (lihat Auth Operations). Status deployment lain bergantung pada environment masing-masing. Schema, endpoint, dan sesi native diuji pada database test terpisah.

Setelah database aplikasi dimigrasikan dan operator siap membuat admin, jalankan dari root `bun run --cwd apps/api admin:provision -- admin@example.com`. Wrapper memakai CLI resmi auth 1.7.7 dengan prompt password native tersembunyi (12–128 karakter); jangan memberi password flag. Proof prompt memakai Bun PTY. Jangan jalankan provisioning sebelum schema tersedia. Gunakan `--cwd` untuk mempertahankan stdin interaktif; Bun 1.4.2 workspace filter tidak meneruskan input CLI ini pada proof lokal.

Admin masuk dari halaman web `/admin/login`; setelah login, guard membaca snapshot native lewat TanStack Query sebelum menampilkan dashboard `/admin`. Browser mengakses `/api/auth/*` pada origin web; server TanStack Start meneruskan request ke `API_INTERNAL_URL` yang tetap. Untuk setup lokal, `VITE_API_URL`, `BETTER_AUTH_URL`, dan `WEB_ORIGIN` memakai origin web yang sama. Password dan sesi tidak disimpan pada `VITE_*` atau browser storage.

### Proof metadata konten

`CONTENT_TEST_DATABASE_URL` menunjuk hanya ke database lokal `vertical_movie_app_content_test`. `bun run --cwd apps/api content:schema:proof` menguji constraints dan migrasi; `bun run --cwd apps/api content:runtime:proof` menguji repository/service serta HTTP dengan Better Auth native. Kedua script menghapus dan membuat ulang schema `public` dan `drizzle`, lalu membuat fixture sendiri. Guard menolak nama database lain dan host nonlokal. Buat database khusus tersebut sebelum menjalankan proof dan jalankan script serial karena targetnya sama. Konfigurasi test tidak menjadi konfigurasi runtime HTTP; jangan mengganti `DATABASE_URL` development untuk menjalankan proof.

Pada tindak lanjut 3 Oktober 2026, pengguna menginstruksikan migrasi development jika schema backend berubah. Migrasi konten `0003`–`0005` berhasil diterapkan pada `vertical_movie_app` localhost:5433 setelah backup; journal kini enam entry dan enam tabel metadata tersedia. Snapshot user/account/session/verification/rate_limit existing tetap sama. Archive backup tervalidasi; restore penuh dan rollout production belum diuji. Proof tetap memakai database test dedicated. Evidence command berada pada [backlog verifikasi](tasks/development-verification.md).

### Drizzle Studio

Jalankan dari root:

```sh
bun run db:studio
```

Alternatif app-local: `bun run --cwd apps/api db:studio`. Bun memuat `apps/api/.env`; Studio menggunakan `DATABASE_URL` yang sama dan schema `apps/api/src/db/schema/index.ts`. Buka [Drizzle Studio](https://local.drizzle.studio) selama command berjalan. Server penghubung bind pada `127.0.0.1:4983`, terpisah dari API/web. Hentikan dengan Ctrl+C. Untuk port lain gunakan `bun run --cwd apps/api db:studio --port=4984` lalu pilih port koneksi tersebut di UI Studio.

Drizzle Kit `0.31.11` membutuhkan driver yang didukung untuk Studio dan belum mendukung Bun SQL di jalur ini. `postgres@3.4.9` adalah devDependency API khusus tooling; runtime API tetap memakai `drizzle-orm/bun-sql`. Config menyediakan credential hanya ketika DATABASE_URL tersedia, sehingga generate schema tetap dapat berjalan tanpa koneksi. Command Studio tidak menjalankan migration; untuk provisioning/reset admin gunakan command native pada Auth Operations.

### Pemulihan password admin

Hentikan seluruh instance API penerima login dan selesaikan/batalkan request in-flight. Jalankan `bun run --cwd apps/api admin:reset-password -- admin@example.com --maintenance-confirmed`, lalu masukkan password baru melalui prompt tersembunyi. Operator memakai `requestPasswordReset/resetPassword` native dengan callback token di memori, tanpa email/sesi admin. Revoke sessions aktif dan diverifikasi sebelum sukses. Reset native tidak atomic: failure dapat terjadi setelah password berubah; tetap maintenance dan ulangi native reset sampai pencabutan terverifikasi sebelum restart. Detail recovery, seed parsial, concurrency, rollback, dan migrasi ada pada [Auth Operations](AUTH_OPERATIONS.md).

### Storage dan HLS — konfigurasi yang direncanakan

Keputusan pengguna 3 Oktober 2026: development memakai MinIO existing; production memakai Cloudflare R2 melalui API S3-compatible; streaming produk memakai HLS VOD. Pilihan ditentukan eksplisit oleh `STORAGE_PROVIDER`, bukan otomatis dari `NODE_ENV`. Seluruh profil berikut adalah kontrak target MEDIA-CFG-001, bukan konfigurasi runtime aktif.

Development pada host saat ini:

```dotenv
NODE_ENV=development
STORAGE_PROVIDER=minio
S3_ENDPOINT=http://localhost:9000
S3_REGION=us-east-1
S3_BUCKET=vertical-movie-app
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_SESSION_TOKEN=
FFMPEG_PATH=ffmpeg
FFPROBE_PATH=ffprobe
MEDIA_PLAYBACK_BASE_URL=
```

Pengguna telah membuat bucket `vertical-movie-app`. `http://localhost:9001/browser/vertical-movie-app` adalah URL Console, bukan endpoint S3. Credential aplikasi diisi pada env lokal/API/worker dan dibatasi pada bucket proyek. Root credential tidak dimasukkan ke dokumen atau sample. Proof operasi/izin/CORS bucket belum dijalankan pada sesi planning; region `us-east-1` adalah profil awal untuk dibuktikan.

Production R2 (placeholder; bucket/credential belum diprovision):

```dotenv
NODE_ENV=production
STORAGE_PROVIDER=r2
S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
S3_REGION=auto
S3_BUCKET=<bucket-production>
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_SESSION_TOKEN=
FFMPEG_PATH=ffmpeg
FFPROBE_PATH=ffprobe
MEDIA_PLAYBACK_BASE_URL=
```

Pengguna memilih satu bucket aplikasi per environment pada 4 Oktober 2026. Kontrak nomor 4 disepakati 4 Oktober 2026: seluruh bucket privat, sources/ untuk input dan outputs/ untuk hasil immutable, master/variant playlist melalui API dan init/segment/caption langsung dari storage melalui signed GET URL. TTL playback disetujui 4 Oktober 2026: 2× durasi video aktual terverifikasi sejak URL diterbitkan; cache bila diaktifkan wajib memiliki expiry/invalidation, dengan cache terkait signed URL tidak melewati expiry URL. Cache metadata TTL 60 detik, playlist no-store dan cache segment privat maksimal min(300 detik, sisa umur URL) disetujui 4 Oktober 2026; proof response headers/invalidation masih diperlukan; archive menghentikan URL baru sementara URL lama berlaku sampai expiry. Kontrak akses memakai expiry URL lama, bukan pencabutan instan; tidak menjanjikan revocation instan atau CDN/custom-domain presign. S3_BUCKET tetap satu bucket per profil; MEDIA_PLAYBACK_BASE_URL menunjuk origin/path API playlist pada usulan ini, sedangkan signed segment menggunakan endpoint S3 yang dapat dijangkau browser. Sample/loader/runtime tidak diubah pada rekomendasi ini.

API dan worker harus memakai satu profil yang sama; adapter menerima nilai yang divalidasi secara eksplisit. Native Bun mendukung custom endpoint MinIO/R2; kemampuan operasi yang diperlukan tetap diuji pada kedua provider. Loader media kelak menolak provider unknown, credential kosong, endpoint Console, R2 non-HTTPS/region bukan auto serta MinIO pada runtime production proyek ini. Tidak fallback ke credential provider lain. Restart proses ketika env berubah. Pergantian env tidak menyalin/memigrasikan objek existing; aset menyimpan provider/bucket/key asal dan membutuhkan prosedur perpindahan data terpisah.

Browser upload memakai signed endpoint yang reachable tanpa rewrite hostname setelah signing. Jika API/worker kemudian memakai Docker hostname, refine konfigurasi endpoint browser/internal dan proof signature/CORS sebelum mengaktifkan upload. Bucket test khusus digunakan integrasi; bucket aplikasi `vertical-movie-app` dan storage SynergoHQ tidak digunakan untuk cleanup destruktif.

HLS ditetapkan pada pipeline VOD: FFmpeg menghasilkan master/variant `.m3u8`, segment fMP4 dan init file sesuai hls-v1. `MEDIA_PLAYBACK_BASE_URL` kelak menunjuk origin/path delivery, bukan endpoint API S3. Nilainya tetap kosong sampai HLS-DELIVERY-001 membuktikan API playlist/direct signed payload, CORS, cache, expiry dan archive untuk seluruh objek sesuai kontrak nomor 4. Signed master saja tidak mencakup URI turunan; R2 presigned URL memakai domain S3 API dan tidak dapat dipindahkan ke custom domain. Bucket draft/source tetap privat, tanpa ACL `public-read` yang tidak didukung R2. Tidak ada env storage/secret `VITE_*`; player menerima URL playback/type dari DTO API.

Task konfigurasi kelak meneruskan `STORAGE_PROVIDER` dan `MEDIA_PLAYBACK_BASE_URL` pada `api#dev`/`api#start` serta task worker saat dibuat. `turbo.json` sesi ini belum diubah; selector belum dijamin diteruskan dari env deployment melalui strict mode. Nama `S3_*` existing tetap dipertahankan. Detail dependency/validasi ada pada [plan video](VIDEO_IMPLEMENTATION_PLAN.md) dan [backlog media](tasks/media.md).

Generate secret baru di terminal sendiri dengan Bun, lalu masukkan hasilnya ke `apps/api/.env`:

```sh
bun -e 'console.log(Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, "0")).join(""))'
```

## Upload multipart — parameter disetujui

Parameter berikut disetujui 4 Oktober 2026. Sample API tersedia; loader/session/browser scheduler belum diimplementasikan. Kontrak lengkap pada [parameter upload](VIDEO_IMPLEMENTATION_PLAN.md#nomor-2--parameter-upload-disetujui-4-oktober-2026).

| Variabel server rencana           | Default | Arti                                                                                 |
| --------------------------------- | ------- | ------------------------------------------------------------------------------------ |
| MEDIA_UPLOAD_PART_CONCURRENCY     | 3       | Maksimal UploadPart bersamaan per file pada browser scheduler; bukan job transcoding |
| MEDIA_UPLOAD_SESSION_TTL_SECONDS  | 86400   | Session 24 jam sejak initiate, tidak diperpanjang oleh retry                         |
| MEDIA_UPLOAD_PART_URL_TTL_SECONDS | 900     | URL part maksimal 15 menit sejak signing, dibatasi sisa session                      |

Runtime kelak menghitung partUrlTtlSeconds = min(900, floor((sessionExpiresAt - now)/1000)); sisa kurang dari 1 detik atau session non-pending ditolak. Renewal memeriksa admin/session/part dan tidak mengulang part yang sudah terverifikasi. MEDIA-CFG-001 menguji default/validasi positive integer tanpa storage I/O; MEDIA-PROOF/DESIGN/UPLOAD membuktikan native signing, expiry dan browser concurrency. Konfigurasi milik API, disampaikan sebagai nilai aman kepada browser tanpa VITE_ secret atau signed URL persisten.

## Worker media — konfigurasi nomor 7

Pengguna menyetujui parameter worker melalui env server dan MEDIA_WORKER_CONCURRENCY default 1 pada 4 Oktober 2026. Pengguna kemudian menyetujui retry/deadline/lease/recovery dan penentuan resource melalui benchmark. Sample API memuat nilai kebijakan yang disepakati; loader worker belum tersedia. Nilai teknis tambahan masih rekomendasi; target uji 4 core/RAM 4 GB memakai kandidat 1 thread/worker 1,5 GiB/guard disk 10 GiB dari nomor 8 untuk benchmark. API config dan worker di apps/api memvalidasi server env; tidak memakai VITE_*. Queue PostgreSQL/FFmpeg tetap keputusan repositori. Kontrak lengkap pada [nomor 7](VIDEO_IMPLEMENTATION_PLAN.md#nomor-7--kebijakan-worker-disetujui-4-oktober-2026).

| Variabel rencana                                                          | Nilai awal                                | Arti                                                                                                  |
| ------------------------------------------------------------------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| MEDIA_WORKER_CONCURRENCY                                                  | 1                                         | Disetujui: default 1 job video per instance; satu instance awal adalah rekomendasi deployment         |
| MEDIA_WORKER_POLL_SECONDS                                                 | 5                                         | Poll saat idle, dengan backoff koneksi DB                                                             |
| MEDIA_JOB_MAX_ATTEMPTS                                                    | 3                                         | Total attempt termasuk pertama/crash; retry hanya error eligible                                      |
| MEDIA_JOB_RETRY_DELAYS_SECONDS                                            | 60,300                                    | Delay retry pertama/kedua ditambah jitter ±20%                                                        |
| MEDIA_JOB_HEARTBEAT_SECONDS / MEDIA_JOB_LEASE_SECONDS                     | 15 / 120                                  | Renew lease dengan DB clock/token; heartbeat harus lebih pendek dari lease                            |
| MEDIA_JOB_RECOVERY_POLL_SECONDS                                           | 30                                        | Scan lease expired                                                                                    |
| MEDIA_TRANSCODE_TIMEOUT_FACTOR / MEDIA_TRANSCODE_MIN_TIMEOUT_SECONDS      | 3 / 900                                   | Timeout encoding max(900 detik,3×durasi terverifikasi); exclude transfer/antrean                      |
| MEDIA_JOB_MAX_RUNTIME_SECONDS / MEDIA_JOB_STALL_TIMEOUT_SECONDS           | 7200 / 300                                | Total waktu attempt sejak claim / watchdog tanpa progress nyata per stage                             |
| MEDIA_FFPROBE_TIMEOUT_SECONDS                                             | 60                                        | Batas probe                                                                                           |
| MEDIA_ENCODER_THREADS / MEDIA_DECODER_THREADS / MEDIA_FILTER_THREADS      | 1 / 1 / 1                                 | Encoder video per rendition; total proses dapat memakai lebih dari 1 CPU, limit OS/container terpisah |
| MEDIA_WORK_DIR / MEDIA_WORK_MIN_FREE_BYTES                                | /var/tmp/vertical-movie-app / 10737418240 | Disk kerja dan guard 10 GiB per job, dengan reservation/admission; bukan output size cap              |
| MEDIA_WORKER_SHUTDOWN_GRACE_SECONDS / MEDIA_SUBPROCESS_KILL_GRACE_SECONDS | 60 / 10                                   | Grace worker lalu terminate child dengan kill escalation dan await exit                               |

Worker loader kelak memakai default concurrency 1 bila env tidak diisi, menolak nilai non-integer/nonpositif dan menerima override integer positif sesuai kapasitas. Restart worker untuk menerapkan perubahan; tidak menambah instance secara otomatis.

Untuk target uji 4 core/RAM 4 GB, proposal nomor 8 memakai budget worker 1,5 GiB beserta child dan 2 vCPU melalui supervisor/container/OS dengan proof RSS/CPU. Budget sebelumnya 3 GiB bukan kandidat untuk target 4 GB ini; env sendiri tidak membatasi resource. Konfigurasi memeriksa positive integers, max attempts sesuai jumlah retry delay, interval heartbeat/recovery/deadline kompatibel, direktori writable di disk, kapasitas dan readiness executable/encoder. Nilai production ditetapkan berdasarkan kapasitas server dan benchmark; opsi Bun/FFmpeg diteliti dari versi executable/runtime yang benar saat implementasi. Tidak ada script worker/task Turbo baru pada sesi proposal.

Nilai disetujui: MEDIA_WORKER_CONCURRENCY, MEDIA_JOB_MAX_ATTEMPTS, MEDIA_JOB_RETRY_DELAYS_SECONDS, MEDIA_JOB_HEARTBEAT_SECONDS, MEDIA_JOB_LEASE_SECONDS, MEDIA_JOB_RECOVERY_POLL_SECONDS, MEDIA_TRANSCODE_TIMEOUT_FACTOR, MEDIA_TRANSCODE_MIN_TIMEOUT_SECONDS dan MEDIA_JOB_STALL_TIMEOUT_SECONDS. Var lain pada tabel merupakan default teknis rekomendasi, belum dibekukan.

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
