# Environment aplikasi

> Diperbarui 1 Oktober 2026. Sampel konfigurasi mengikuti stack proyek; variabel untuk fitur yang belum diimplementasikan ditandai terpisah.

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

`AUTH_SCHEMA_TEST_DATABASE_URL` hanya untuk `bun run --cwd apps/api auth:schema:proof`. Test akan menghapus dan membuat ulang schema `public` dan `drizzle` pada database bernama `vertical_movie_app_auth_schema_test` di localhost. `AUTH_RUNTIME_TEST_DATABASE_URL` hanya untuk `bun run --cwd apps/api auth:runtime:proof` dan juga mereset dua schema tersebut pada database khusus `vertical_movie_app_auth_runtime_test`. Kedua script menolak host dan nama database lain. Arahkan variabel test hanya ke database lokal yang boleh di-reset. Script migrasi aplikasi `bun run --cwd apps/api db:migrate` hanya memerlukan `DATABASE_URL`.

Pada 1 Oktober 2026, database development `vertical_movie_app` dibuat pada PostgreSQL lokal di `localhost:5433` dan koneksi dari `apps/api/.env` diverifikasi memakai Bun SQL. Kredensial sebenarnya hanya disimpan pada env lokal yang diabaikan Git. Sampel tetap menggunakan koneksi generik; sesuaikan `DATABASE_URL` pada tiap lingkungan. Endpoint auth kini berjalan jika API memakai database yang telah dimigrasikan, tetapi database development masih belum dimigrasikan dan belum memiliki akun admin. Schema, endpoint, dan sesi diuji pada database test terpisah.

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

`PORT` dev harus integer 1–65535. Vite menolak port yang sedang dipakai agar origin tidak bergeser tanpa diketahui. Argumen CLI `--port`/`--host` dapat dipakai untuk override saat dev. Untuk setup auth lokal, `VITE_API_URL`, `BETTER_AUTH_URL`, dan `WEB_ORIGIN` memakai origin web yang sama; `API_INTERNAL_URL` menunjuk ke server API yang tidak diekspos browser.

Semua variabel `VITE_*` dapat masuk bundle browser. Simpan secret Better Auth, kredensial database, dan kredensial S3 hanya di API. Nilai `VITE_API_URL` dipilih saat build; setelah client API diimplementasikan, perubahan URL untuk rilis membutuhkan build ulang web. Gunakan HTTPS dan origin deployment yang benar saat rilis; konfigurasi production diberikan melalui environment deployment atau env lokal production yang tidak dilacak Git. Atur `NODE_ENV=production` pada runtime production, dan `HOST=0.0.0.0` untuk web jika server perlu menerima koneksi dari luar loopback.

## Pemuatan dan Turborepo

- Bun memuat env aplikasi API secara native; Vite menangani env web menurut mode. Konfigurasi Vite menggunakan `loadEnv` untuk `PORT`/`HOST`. Tidak ada tambahan dependensi `dotenv`.
- Root `turbo.json` meneruskan variabel runtime API pada task `api#dev`/`api#start`; task web memiliki daftar variabel sendiri. Environment yang diekspor oleh deployment tidak hilang karena strict mode.
- Build memasukkan `.env*` sebagai input cache. Task `web#build` juga memasukkan `VITE_API_URL` dari environment proses ke hash. Jangan mengandalkan penggantian env setelah artefak client selesai dibangun.
- Restart proses setelah mengubah env. API menolak secret Better Auth kosong/pendek, URL bukan PostgreSQL, serta `BETTER_AUTH_URL` dan `WEB_ORIGIN` yang berbeda.

## Referensi

- [Bun environment variables](https://bun.com/docs/runtime/environment-variables)
- [Bun S3 credentials](https://bun.com/docs/runtime/s3#credentials)
- [Vite environment variables](https://vite.dev/guide/env-and-mode) dan [env pada config Vite](https://vite.dev/config/#using-environment-variables-in-config)
- [Better Auth installation](https://better-auth.com/docs/installation)
