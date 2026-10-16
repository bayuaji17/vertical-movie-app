# Deploy production di VPS

> Status: **implemented, terverifikasi sebagian secara lokal** · 16 Oktober 2026 · Plan: [production-deployment](../plans/production-deployment/implementation-plan.md), backlog: [DEP](../tasks/production-deployment.md). Runtime di semua jalur adalah **Bun 1.4.3** (rilis terbaru saat dokumen ini ditulis; sama dengan `engines.bun` di `package.json`). Bagian [Yang sudah dan belum terbukti](#yang-sudah-dan-belum-terbukti) menyebut batasnya dengan jelas.

Dua jalur yang setara. Pilih satu:

- **Jalur A — Docker Compose** (disarankan: satu perintah per langkah, update dan rollback sederhana).
- **Jalur B — tanpa Docker** (Bun, systemd, PostgreSQL dan Caddy/nginx dipasang langsung di VPS).

## 1. Arsitektur

```text
                         Internet
                            │  80 / 443
                   ┌────────▼────────┐
                   │ Caddy atau nginx │  HTTPS, kompresi, header keamanan
                   └────────┬────────┘
                            │ http://web:3000
                   ┌────────▼────────┐        presigned URL (unggah, poster, HLS)
   Browser ───────►│  web (Bun/Nitro) │◄──────────────────────────────┐
      │            │  gateway /api/*  │                               │
      │            └────────┬────────┘                                │
      │                     │ http://api:3001 (internal)              │
      │            ┌────────▼────────┐      ┌─────────────┐           │
      │            │  api (Elysia)    │─────►│ PostgreSQL   │◄─ worker ─┤
      │            └─────────────────┘      └─────────────┘  (FFmpeg)  │
      │                                                                │
      └────────────────────────────────────────────────────────────────┘
                     langsung ke Cloudflare R2 (bucket privat)
```

- Browser hanya berbicara ke **satu origin** (domain Anda). Server web meneruskan `/api/*` ke API; **API, worker dan PostgreSQL tidak dibuka ke internet**.
- Browser mengunggah video/cover dan mengambil poster serta segmen HLS **langsung ke R2** lewat URL presigned, jadi bucket memerlukan CORS (bagian 3).
- Worker adalah proses terpisah dari API: tanpa worker, upload tidak diproses menjadi HLS.
- Migrasi database **tidak** berjalan otomatis; Anda menjalankannya sebagai langkah eksplisit (bagian 5.4 dan 6.6).

## 2. Prasyarat

| Kebutuhan     | Keterangan                                                                                                                                                                                                                                                                                        |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| VPS           | Linux x86_64, Debian 13 atau Ubuntu 24.04 (yang diuji: Debian 13). Titik awal: 2 vCPU, 4 GB RAM, 40 GB disk. Transcoding memakai CPU dan disk; worker menolak job bila ruang kosong di direktori kerjanya < 10 GiB (`MEDIA_WORKER_MIN_FREE_BYTES`). Ukuran ini **belum diukur** pada beban nyata. |
| Domain        | Record A/AAAA mengarah ke IP VPS (misalnya `movies.example.com`). Port 80 dan 443 terbuka.                                                                                                                                                                                                        |
| Cloudflare R2 | Satu bucket **privat** dan satu API token khusus bucket. **Wajib**: `NODE_ENV=production` menolak MinIO (`STORAGE_PROVIDER` harus `r2`).                                                                                                                                                          |
| Repo          | `git clone` repositori ini di VPS (atau salin artefaknya).                                                                                                                                                                                                                                        |
| Firewall      | Izinkan hanya SSH, 80 dan 443. Contoh: `sudo ufw allow OpenSSH && sudo ufw allow 80,443/tcp && sudo ufw enable`.                                                                                                                                                                                  |

Pengaturan dasar server: login SSH dengan kunci (bukan password), akun non-root dengan `sudo`, pembaruan keamanan otomatis (`unattended-upgrades`), dan jam yang tersinkron (`timedatectl`).

## 3. Siapkan Cloudflare R2

1. Buat bucket (misalnya `movies-prod`), **jangan** aktifkan public access / domain publik.
2. Catat **Account ID**; endpoint S3 adalah `https://<account-id>.r2.cloudflarestorage.com`, region selalu `auto`.
3. Buat **API token** R2 dengan izin _Object Read & Write_ yang dibatasi ke bucket tersebut; catat Access Key ID dan Secret Access Key.
4. Pasang **CORS policy** pada bucket (dashboard R2 → bucket → Settings → CORS Policy), mengganti origin dengan domain Anda:

   ```json
   [
     {
       "AllowedOrigins": ["https://movies.example.com"],
       "AllowedMethods": ["GET", "PUT", "HEAD"],
       "AllowedHeaders": ["*"],
       "ExposeHeaders": ["ETag"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```

   Tanpa aturan ini unggahan multipart (butuh header `ETag`), poster dan pemutaran HLS gagal di browser walau API sehat. Detail kontrak: [Media Operations](media.md#playback-cache-dan-storage).

R2 tidak punya versioning; salinan cadangan objek (misalnya `rclone sync` ke bucket lain) adalah tanggung jawab Anda.

## 4. Siapkan konfigurasi (kedua jalur)

Sample production: [`apps/api/.env.production.example`](../../apps/api/.env.production.example) (API dan worker), [`apps/web/.env.production.example`](../../apps/web/.env.production.example) (web) dan, untuk Docker, [`deploy/docker/.env.example`](../../deploy/docker/.env.example). Semuanya berisi `CHANGE_ME` pada nilai rahasia dan **tidak boleh di-commit setelah diisi** (`.env.production` dan `.env` diabaikan Git).

Buat nilai rahasia:

```sh
openssl rand -base64 48   # BETTER_AUTH_SECRET (minimal 32 karakter)
openssl rand -hex 24      # password PostgreSQL (hex: tanpa URL-encoding)
```

Aturan yang harus konsisten (kesalahan paling umum):

| Variabel                                                                   | Aturan                                                                                                                                                                           |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BETTER_AUTH_URL`, `WEB_ORIGIN` (API) dan `VITE_API_URL` (web)             | **Sama persis**: origin publik `https://movies.example.com` tanpa path dan tanpa `/` di akhir. Docker: `PUBLIC_ORIGIN` di `deploy/docker/.env`.                                  |
| `VITE_API_URL`                                                             | Dipakai **saat build** (masuk bundle browser) **dan** saat runtime. Mengubahnya berarti **build ulang** web. Nilai yang salah → login/mutasi admin ditolak (`ORIGIN_FORBIDDEN`). |
| `API_INTERNAL_URL` (web)                                                   | Alamat API dari sisi server web: `http://127.0.0.1:3001` (non-Docker) atau `http://api:3001` (Docker, diatur compose).                                                           |
| `STORAGE_PROVIDER=r2`, `S3_ENDPOINT`, `S3_REGION=auto`, `S3_BUCKET`, kunci | Dari bagian 3. Endpoint harus `https://<account>.r2.cloudflarestorage.com` (validasi startup menolak bentuk lain).                                                               |
| `NODE_ENV=production`, `LOG_FORMAT=json`                                   | Sudah di sample. `LOG_HTTP_BODIES` ditolak pada production.                                                                                                                      |
| `MEDIA_POSTER_URL_TTL_SECONDS`, `MEDIA_HLS_URL_TTL_SECONDS`                | Umur URL presigned (default 24 jam dan 1 jam). Penjelasan: [Poster yang tidak hilang](media.md#poster-yang-tidak-hilang-karena-kedaluwarsa--16-oktober-2026).                    |

API dan worker membaca file env yang sama; nilai yang salah menghentikan proses saat start dengan pesan yang menyebut variabelnya (periksa log). Daftar lengkap variabel: [Environment setup](../guides/environment.md). Sample API dijaga valid oleh test `apps/api/src/config/production-env-sample.test.ts`.

---

## 5. Jalur A — Docker Compose

Hanya Docker Engine dengan plugin Compose v2 yang diperlukan; Bun, FFmpeg dan PostgreSQL ada di dalam image. Semua image memakai **`oven/bun:1.4.3-debian`** (versi dari `BUN_VERSION`).

### 5.1 Pasang Docker

Ikuti [panduan resmi Docker Engine](https://docs.docker.com/engine/install/debian/) untuk distro Anda, lalu aktifkan rotasi log global (cadangan bagi pengaturan per-service di compose):

```sh
sudo tee /etc/docker/daemon.json >/dev/null <<'EOF'
{ "log-driver": "json-file", "log-opts": { "max-size": "10m", "max-file": "5" } }
EOF
sudo systemctl restart docker
```

### 5.2 Ambil kode dan isi konfigurasi

```sh
git clone https://github.com/bayuaji17/vertical-movie-app.git /opt/vertical-movie-app
cd /opt/vertical-movie-app/deploy/docker

cp .env.example .env                                              # domain, ACME_EMAIL, POSTGRES_PASSWORD
cp ../../apps/api/.env.production.example ../../apps/api/.env.production   # API + worker
cp ../../apps/web/.env.production.example ../../apps/web/.env.production   # web
chmod 600 .env ../../apps/api/.env.production ../../apps/web/.env.production
```

Edit ketiganya (bagian 4). Compose menimpa `DATABASE_URL` (menjadi service `postgres`), `API_INTERNAL_URL`, `HOST` dan `PORT` sehingga nilai di file tidak perlu diubah untuk itu.

### 5.3 Build

```sh
docker compose build
```

Build pertama beberapa menit (instal dependensi, build API dan web). Image: `vertical-movie-api`, `vertical-movie-worker` (+ FFmpeg, ≈1 GB), `vertical-movie-web`; `tools` dan `migrate` dibangun saat dipakai.

### 5.4 Database, migrasi dan admin pertama

```sh
docker compose up -d postgres
docker compose run --rm migrate          # menerapkan migrasi; pesan: "Database migrations applied."
docker compose --profile tools run --rm tools \
  bun run --cwd apps/api admin:provision -- you@example.com "Nama Admin"
```

Perintah terakhir meminta password admin pada prompt tersembunyi (12–128 karakter) — jangan memberikannya sebagai argumen. Hanya satu admin yang diizinkan; ini bukan alat reset password (lihat [Auth Operations](auth.md) untuk pemulihan).

### 5.5 Jalankan

```sh
docker compose up -d
docker compose ps                        # postgres, api, web: healthy; worker, caddy: running
```

Caddy meminta sertifikat Let's Encrypt otomatis pada permintaan pertama ke `https://<domain>` (butuh DNS sudah mengarah dan port 80/443 terbuka). Lanjut ke [pemeriksaan pasca-deploy](#7-pemeriksaan-pasca-deploy).

### 5.6 Operasi harian

| Tujuan               | Perintah                                                                                                                                                          |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lihat log            | `docker compose logs -f --tail=200 api worker web` (JSON satu baris; filter dengan `requestId`, lihat [Media Operations](media.md#mengikuti-job-worker-dari-log)) |
| Restart satu service | `docker compose restart worker`                                                                                                                                   |
| Update ke versi baru | `git pull`, `TAG=$(git rev-parse --short HEAD) docker compose build`, `docker compose run --rm migrate` (bila ada migrasi baru), `TAG=<sha> docker compose up -d` |
| Rollback kode        | `TAG=<sha-lama> docker compose up -d` (image lama masih ada). Migrasi bersifat additive; bila skema berubah jauh, pulihkan dari backup.                           |
| Ubah versi Bun       | Ubah `BUN_VERSION` di `deploy/docker/.env` **dan** `engines.bun`/`bun-types` di repo, uji, lalu `docker compose build --no-cache && docker compose up -d`         |
| Tambah worker        | `docker compose up -d --scale worker=2` (antrean di PostgreSQL; tiap worker mengambil job dengan lease) atau naikkan `MEDIA_WORKER_CONCURRENCY`                   |
| Backup database      | `docker compose exec -T postgres pg_dump -U vmovie -Fc vertical_movie_app > backup-$(date +%F).dump`                                                              |
| Restore              | `docker compose exec -T postgres pg_restore -U vmovie -d vertical_movie_app --clean --if-exists < backup.dump` (hentikan `api`/`worker` lebih dulu)               |

---

## 6. Jalur B — tanpa Docker

Semua proses berjalan langsung di host sebagai pengguna non-root `vmovie` di bawah **systemd**. Contoh untuk Debian 13.

### 6.1 Paket sistem

```sh
sudo apt update
sudo apt install -y curl unzip git ca-certificates ffmpeg
```

`unzip` diperlukan installer Bun; `ffmpeg` (termasuk `ffprobe`) diperlukan worker. PostgreSQL dan reverse proxy dipasang di 6.2 dan 6.7.

### 6.2 PostgreSQL

Aplikasi diuji pada **PostgreSQL 18** (Debian 13 menyediakan 17; untuk 18 tambahkan repo PGDG: `sudo apt install -y postgresql-common && sudo /usr/share/postgresql-common/pgdg/apt.postgresql.org.sh`, lalu `sudo apt install -y postgresql-18`). Buat role dan database:

```sh
sudo -u postgres psql <<'EOF'
CREATE ROLE vmovie LOGIN PASSWORD 'GANTI_DENGAN_PASSWORD_HEX';
CREATE DATABASE vertical_movie_app OWNER vmovie;
EOF
```

Biarkan PostgreSQL hanya mendengarkan `localhost` (default). Samakan password dengan `DATABASE_URL`.

### 6.3 Bun 1.4.3

Pasang **versi yang dipin** ke `/usr/local/bin/bun` sehingga semua service memakai biner yang sama:

```sh
curl -fsSL https://bun.sh/install | sudo BUN_INSTALL=/usr/local bash -s "bun-v1.4.3"
bun --version      # 1.4.3
```

### 6.4 Pengguna, kode dan build

```sh
sudo useradd --system --home-dir /var/lib/vmovie --create-home --shell /usr/sbin/nologin vmovie
sudo git clone https://github.com/bayuaji17/vertical-movie-app.git /opt/vertical-movie-app
sudo chown -R vmovie:vmovie /opt/vertical-movie-app
sudo -u vmovie -H bash -c '
  cd /opt/vertical-movie-app &&
  HUSKY=0 bun install --frozen-lockfile &&
  VITE_API_URL=https://movies.example.com bun run build'
```

`VITE_API_URL` pada build **harus** origin publik yang sama dengan di env runtime (bagian 4). Hasilnya: `apps/api/dist` (API, worker, migrasi) dan `apps/web/.output`.

### 6.5 Konfigurasi dan direktori kerja

```sh
sudo install -d -m 750 -o root -g vmovie /etc/vertical-movie
sudo install -m 640 -o root -g vmovie /opt/vertical-movie-app/apps/api/.env.production.example /etc/vertical-movie/api.env
sudo install -m 640 -o root -g vmovie /opt/vertical-movie-app/apps/web/.env.production.example /etc/vertical-movie/web.env
sudo install -d -m 750 -o vmovie -g vmovie /var/tmp/vertical-movie-worker
sudoedit /etc/vertical-movie/api.env     # bagian 4 (DATABASE_URL ke 127.0.0.1, domain, secret, R2)
sudoedit /etc/vertical-movie/web.env
```

Catatan: systemd membaca `KEY=value` apa adanya (tanpa komentar di akhir baris); nilai dengan spasi harus diberi tanda kutip.

### 6.6 Migrasi dan admin pertama

```sh
sudo -u vmovie -H bash -c '
  cd /opt/vertical-movie-app/apps/api &&
  set -a && . /etc/vertical-movie/api.env && set +a &&
  bun run db:migrate:start'                       # "Database migrations applied."

sudo -u vmovie -H bash -c '
  cd /opt/vertical-movie-app/apps/api &&
  set -a && . /etc/vertical-movie/api.env && set +a &&
  bun run admin:provision -- you@example.com "Nama Admin"'   # prompt password tersembunyi
```

### 6.7 Service systemd dan reverse proxy

```sh
sudo cp /opt/vertical-movie-app/deploy/systemd/*.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now vertical-movie-api vertical-movie-worker vertical-movie-web
systemctl status vertical-movie-api vertical-movie-worker vertical-movie-web
```

Unit ada di [`deploy/systemd/`](../../deploy/systemd/): API, worker (`TimeoutStopSec=75`, `Nice=10`) dan web, semuanya `Restart=always` dengan pembatasan hak akses dasar (`NoNewPrivileges`, `ProtectSystem`, `ProtectHome`).

Reverse proxy — pilih **Caddy** (sertifikat otomatis):

```sh
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy
sudo cp /opt/vertical-movie-app/deploy/caddy/Caddyfile /etc/caddy/Caddyfile   # ganti domain dan e-mail
sudo systemctl reload caddy
```

atau **nginx** + certbot: [`deploy/nginx/vertical-movie.conf`](../../deploy/nginx/vertical-movie.conf) (langkah certbot di komentar file). Ikuti [petunjuk instalasi Caddy](https://caddyserver.com/docs/install#debian-ubuntu-raspbian) bila repo di atas berubah.

### 6.8 Operasi harian

| Tujuan          | Perintah                                                                                                                                                                                                |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lihat log       | `journalctl -u vertical-movie-api -u vertical-movie-worker -u vertical-movie-web -f` (JSON satu baris)                                                                                                  |
| Restart         | `sudo systemctl restart vertical-movie-worker`                                                                                                                                                          |
| Update          | `cd /opt/vertical-movie-app && sudo -u vmovie git pull`, ulangi build (6.4), jalankan migrasi bila ada (6.6), lalu `sudo systemctl restart vertical-movie-api vertical-movie-worker vertical-movie-web` |
| Rollback        | `sudo -u vmovie git checkout <tag/sha lama>`, build ulang, restart. Migrasi bersifat additive; bila skema berubah jauh, pulihkan dari backup.                                                           |
| Ubah versi Bun  | `sudo /usr/local/bin/bun upgrade` (atau pasang ulang dengan tag lain di 6.3), perbarui `engines.bun` di repo, build ulang dan restart semua service                                                     |
| Backup database | `sudo -u postgres pg_dump -Fc vertical_movie_app > /var/backups/vmovie-$(date +%F).dump` (jadwalkan dengan cron/systemd timer)                                                                          |
| Restore         | hentikan `api`/`worker`, `sudo -u postgres pg_restore -d vertical_movie_app --clean --if-exists backup.dump`, mulai lagi                                                                                |

---

## 7. Pemeriksaan pasca-deploy

Jalankan berurutan; berhenti di langkah pertama yang gagal dan lihat [troubleshooting](#9-troubleshooting).

1. **Sertifikat dan halaman:** `curl -sI https://movies.example.com/` → `HTTP/2 200` dan header `strict-transport-security`. `curl -s -o /dev/null -w '%{http_code}\n' https://movies.example.com/api/site-settings` → `200`.
2. **API tidak terbuka:** dari luar server, `https://movies.example.com:3001` dan port 5432/3000 tidak dapat dijangkau (`ss -ltn` di server: hanya 22/80/443 yang mendengarkan ke publik).
3. **Login admin:** buka `https://movies.example.com/admin/login`, masuk dengan akun dari langkah provisioning. Endpoint admin tanpa sesi menjawab 401: `curl -s -o /dev/null -w '%{http_code}\n' 'https://movies.example.com/api/admin/content?type=film'`.
4. **Konten dan media:** buat Film draft, unggah video dan cover (browser memanggil R2 langsung — bila gagal, cek CORS), lalu pantau worker: log memuat `job.claimed`, `job.stage ... transcode`, selesai tanpa `job.failed`.
5. **Publish dan putar:** publish film, buka halaman publik dan putar (poster, playlist HLS dan segmen dimuat dari R2).
6. **Restart bersih:** restart semua service/container dan ulangi langkah 1 dan 3.
7. **Backup:** jalankan satu `pg_dump` dan **uji restore** ke database lain sebelum mengandalkannya.

## 8. Checklist keamanan

- `BETTER_AUTH_SECRET`, password PostgreSQL dan kunci R2 berupa nilai acak unik; file env `chmod 600/640`; tidak di-commit. Mengganti `BETTER_AUTH_SECRET` mengakhiri semua sesi.
- Bucket R2 **privat**; token R2 hanya untuk bucket ini dengan izin Object Read & Write; CORS hanya untuk origin Anda.
- Hanya 22/80/443 terbuka; API (3001), web (3000) dan PostgreSQL (5432) tidak dipublikasikan.
- Password admin 12–128 karakter; satu admin; pemulihan lewat [Auth Operations](auth.md), bukan SQL manual.
- URL presigned yang sudah terbit tetap berlaku sampai habis setelah konten di-unpublish (poster 24 jam, video 1 jam); URL baru langsung ditolak. Turunkan `MEDIA_POSTER_URL_TTL_SECONDS`/`MEDIA_HLS_URL_TTL_SECONDS` bila jendela ini terlalu panjang bagi Anda.
- Pembaruan OS rutin, backup terjadwal dan teruji, serta pemantauan ruang disk (`MEDIA_WORKER_WORKDIR`, volume PostgreSQL, log).

## 9. Troubleshooting

| Gejala                                                                 | Penyebab umum dan tindakan                                                                                                                                                                          |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API/worker berhenti saat start dengan pesan `... wajib/harus ...`      | Validasi env: pesan menyebut variabel. Contoh: `Production proyek ini memerlukan STORAGE_PROVIDER=r2`, `BETTER_AUTH_SECRET wajib ... 32 karakter`, `BETTER_AUTH_URL dan WEB_ORIGIN harus ... sama`. |
| Login berhasil di API tetapi mutasi admin gagal 403 `ORIGIN_FORBIDDEN` | `VITE_API_URL` runtime atau build tidak sama dengan origin publik. Perbaiki env **dan build ulang web** (bagian 4).                                                                                 |
| Halaman publik `503`, `/api/...` 502/504                               | Web tidak dapat menjangkau API: `API_INTERNAL_URL` salah, API belum sehat (`docker compose ps` / `systemctl status`), atau migrasi belum dijalankan (cek log API).                                  |
| Error `relation ... does not exist` di log API                         | Migrasi belum diterapkan (langkah 5.4 / 6.6).                                                                                                                                                       |
| Unggah gagal di browser (CORS), poster/HLS kosong                      | CORS bucket R2 belum dipasang atau origin berbeda dari domain Anda (bagian 3). Periksa konsol browser.                                                                                              |
| Unggahan selesai tetapi tidak pernah diproses                          | Worker tidak berjalan atau FFmpeg tidak ditemukan (`FFMPEG_PATH`), atau ruang kosong di `MEDIA_WORKER_WORKDIR` < `MEDIA_WORKER_MIN_FREE_BYTES`. Lihat log worker.                                   |
| Caddy gagal mendapat sertifikat                                        | DNS belum mengarah ke VPS, port 80/443 tertutup, atau `DOMAIN`/`ACME_EMAIL` salah; lihat `docker compose logs caddy` / `journalctl -u caddy`.                                                       |
| `admin:provision` gagal                                                | Admin sudah ada (hanya satu yang diizinkan) atau skema belum dimigrasikan; lihat [Auth Operations](auth.md).                                                                                        |

## Yang sudah dan belum terbukti

Diamati pada 16 Oktober 2026 di mesin pengembangan Linux (Docker 29, Compose 5):

- **Terbukti:** semua target image dibangun (`api` 338 MB, `web` 364 MB, `worker` ≈1 GB, `tools`); `docker compose config` valid; stack dijalankan (PostgreSQL 18 → `migrate` menerapkan 14 migrasi → `api`, `worker`, `web`); `admin:provision` dari container `tools` membuat admin; login lewat gateway web berhasil dan endpoint admin menjawab 200 dengan sesi dan 401 tanpa sesi; Bun **1.4.3** di semua container, proses berjalan sebagai pengguna non-root `bun`, FFmpeg 7.1 ada di worker, log JSON, hanya satu port yang dipublikasikan; Caddyfile (compose dan host) lolos `caddy validate`; unit systemd lolos `systemd-analyze verify`; langkah instalasi jalur tanpa Docker diuji pada container `debian:13-slim` bersih (`unzip`, Bun **1.4.3** lewat installer terpin ke `/usr/local/bin`, `ffmpeg` dan `ffprobe` 7.1.5 dari apt; pemasangan FFmpeg menarik banyak paket dan dapat memakan beberapa menit); sample env API valid menurut seluruh loader env (test otomatis).
- **Belum terbukti:** HTTPS/ACME pada domain nyata; **Cloudflare R2 nyata** (upload, HLS, CORS, kebijakan token; "R2 staging belum diuji" juga tercatat di [Media Operations](media.md)); transcoding dalam container pada job nyata; startup service systemd dan konfigurasi nginx; PostgreSQL selain 18; restore backup; ukuran VPS dan performa.
