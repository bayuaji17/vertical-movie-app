# Environment aplikasi

> Diperbarui 2 Oktober 2026. Sampel konfigurasi mengikuti stack proyek; variabel untuk fitur yang belum diimplementasikan ditandai terpisah.

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
| `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`    | Lokasi object storage R2 atau provider kompatibel S3.                                            | Disiapkan untuk development.                         |
| `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | Kredensial storage khusus server.                                                                | Wajib diisi saat integrasi storage.                  |
| `S3_SESSION_TOKEN`                         | Token tambahan bila memakai kredensial storage sementara.                                        | Opsional.                                            |
| `FFMPEG_PATH`, `FFPROBE_PATH`              | Lokasi executable transcode dan pemeriksaan media; nilai contoh mengandalkan `PATH`.             | Disiapkan untuk worker media.                        |

Nilai database dalam sampel hanya contoh lokal. Menyalin env belum membuat database, tabel, bucket, akun admin, atau worker. Queue menggunakan PostgreSQL yang sama; tidak memerlukan Redis. Konfigurasi lease, retry, dan konkurensi ditentukan bersama task worker saat development.

`TEST_DATABASE_URL` hanya untuk proof adapter (proof mereset schema `public` dan `drizzle`) `bun run --cwd apps/api auth:adapter:proof` dan harus menunjuk ke `vertical_movie_app_auth_test` di localhost. `AUTH_SCHEMA_TEST_DATABASE_URL` hanya untuk `bun run --cwd apps/api auth:schema:proof`; test akan menghapus dan membuat ulang schema `public` dan `drizzle` pada `vertical_movie_app_auth_schema_test`. `AUTH_RUNTIME_TEST_DATABASE_URL` hanya untuk `bun run --cwd apps/api auth:runtime:proof` dan mereset dua schema pada `vertical_movie_app_auth_runtime_test`. `AUTH_ADMIN_TEST_DATABASE_URL` hanya untuk proof admin, recovery, authorization, dan OpenAPI pada `vertical_movie_app_auth_admin_test`; proof provisioning/recovery mereset schema, authorization juga mereset schema sebelum menerapkan migrasi. Script menolak host/nama database lain. Proof yang berbagi database admin harus dijalankan serial. Arahkan semua variabel test hanya ke database localhost khusus yang boleh di-reset. Tidak ada script umum `test:integration`; jalankan proof satu per satu dengan command yang tercantum pada backlog auth. Script migrasi aplikasi hanya memerlukan `DATABASE_URL`; target harus diperiksa operator. Gunakan `db:migrate -- --stage=expand`, verifikasi cutover native, lalu `db:migrate -- --stage=contract`; tanpa flag semua migration pending diterapkan. Lihat [Auth Operations](AUTH_OPERATIONS.md).

Pada 1 Oktober 2026, database development `vertical_movie_app` dibuat pada PostgreSQL lokal di `localhost:5433` dan koneksi dari `apps/api/.env` diverifikasi memakai Bun SQL. Pada 2 Oktober 2026, migrasi auth berhasil diterapkan ke database development lokal dan satu akun admin berhasil diprovision melalui CLI. Kredensial sebenarnya hanya disimpan pada env lokal yang diabaikan Git; password admin tidak disimpan pada dokumentasi. Itu adalah baseline sebelum refactor. Pemeriksaan akhir refactor menemukan satu migration baseline. Pada tindak lanjut 2 Oktober 2026, expand/contract diterapkan pada database development: journal berisi tiga migration, role admin native aktif, dan tabel legacy `admin_identity` dihapus. ID admin, credential account, hash password, dan sesi existing diverifikasi tetap sama; akun tidak direset. Backup sebelum migrasi berada di luar repo dan archive tervalidasi; restore penuh masih perlu diuji (lihat Auth Operations). Status deployment lain bergantung pada environment masing-masing. Schema, endpoint, dan sesi native diuji pada database test terpisah.

Setelah database aplikasi dimigrasikan dan operator siap membuat admin, jalankan dari root `bun run --cwd apps/api admin:provision -- admin@example.com`. Wrapper memakai CLI resmi auth 1.7.7 dengan prompt password native tersembunyi (12–128 karakter); jangan memberi password flag. Proof prompt memakai Bun PTY. Jangan jalankan provisioning sebelum schema tersedia. Gunakan `--cwd` untuk mempertahankan stdin interaktif; Bun 1.4.2 workspace filter tidak meneruskan input CLI ini pada proof lokal.

Admin masuk dari halaman web `/admin/login`; setelah login, guard membaca snapshot native lewat TanStack Query sebelum menampilkan dashboard `/admin`. Browser mengakses `/api/auth/*` pada origin web; server TanStack Start meneruskan request ke `API_INTERNAL_URL` yang tetap. Untuk setup lokal, `VITE_API_URL`, `BETTER_AUTH_URL`, dan `WEB_ORIGIN` memakai origin web yang sama. Password dan sesi tidak disimpan pada `VITE_*` atau browser storage.

### Proof metadata konten

`CONTENT_TEST_DATABASE_URL` menunjuk hanya ke database lokal `vertical_movie_app_content_test`. `bun run --cwd apps/api content:schema:proof` menguji constraints dan migrasi; `bun run --cwd apps/api content:runtime:proof` menguji repository/service serta HTTP dengan Better Auth native. Kedua script menghapus dan membuat ulang schema `public` dan `drizzle`, lalu membuat fixture sendiri. Guard menolak nama database lain dan host nonlokal. Buat database khusus tersebut sebelum menjalankan proof dan jalankan script serial karena targetnya sama. Konfigurasi test tidak menjadi konfigurasi runtime HTTP; jangan mengganti `DATABASE_URL` development untuk menjalankan proof.

Migrasi konten `0003`–`0005` baru diuji pada database dedicated pada 3 Oktober 2026. Migrasi ini belum dijalankan pada database development atau production; baseline development auth tiga migrasi tetap menjadi catatan terakhir.

### Drizzle Studio

Jalankan dari root:

```sh
bun run db:studio
```

Alternatif app-local: `bun run --cwd apps/api db:studio`. Bun memuat `apps/api/.env`; Studio menggunakan `DATABASE_URL` yang sama dan schema `apps/api/src/db/schema/index.ts`. Buka [Drizzle Studio](https://local.drizzle.studio) selama command berjalan. Server penghubung bind pada `127.0.0.1:4983`, terpisah dari API/web. Hentikan dengan Ctrl+C. Untuk port lain gunakan `bun run --cwd apps/api db:studio --port=4984` lalu pilih port koneksi tersebut di UI Studio.

Drizzle Kit `0.31.11` membutuhkan driver yang didukung untuk Studio dan belum mendukung Bun SQL di jalur ini. `postgres@3.4.9` adalah devDependency API khusus tooling; runtime API tetap memakai `drizzle-orm/bun-sql`. Config menyediakan credential hanya ketika DATABASE_URL tersedia, sehingga generate schema tetap dapat berjalan tanpa koneksi. Command Studio tidak menjalankan migration; untuk provisioning/reset admin gunakan command native pada Auth Operations.

### Pemulihan password admin

Hentikan seluruh instance API penerima login dan selesaikan/batalkan request in-flight. Jalankan `bun run --cwd apps/api admin:reset-password -- admin@example.com --maintenance-confirmed`, lalu masukkan password baru melalui prompt tersembunyi. Operator memakai `requestPasswordReset/resetPassword` native dengan callback token di memori, tanpa email/sesi admin. Revoke sessions aktif dan diverifikasi sebelum sukses. Reset native tidak atomic: failure dapat terjadi setelah password berubah; tetap maintenance dan ulangi native reset sampai pencabutan terverifikasi sebelum restart. Detail recovery, seed parsial, concurrency, rollback, dan migrasi ada pada [Auth Operations](AUTH_OPERATIONS.md).

Untuk R2, isi endpoint `https://<account-id>.r2.cloudflarestorage.com` dan region `auto`. Sesuaikan region/endpoint jika memakai provider S3 lain. Nama `S3_*` mengikuti variabel native client Bun; integrasi dan kompatibilitas operasinya tetap perlu diverifikasi saat implementasi.

Generate secret baru di terminal sendiri dengan Bun, lalu masukkan hasilnya ke `apps/api/.env`:

```sh
bun -e 'console.log(Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, "0")).join(""))'
```

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
- [Vite environment variables](https://vite.dev/guide/env-and-mode) dan [env pada config Vite](https://vite.dev/config/#using-environment-variables-in-config)
- [Better Auth installation](https://better-auth.com/docs/installation)
