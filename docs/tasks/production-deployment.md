# Modul: persiapan deploy production di VPS

> Status: **DEP-001–008 Done (implemented, terverifikasi sebagian lokal)** · 16 Oktober 2026 · Pengguna meminta sample env production, pembaruan README dan panduan deploy VPS dengan dan tanpa Docker dengan Bun terbaru. Plan: [implementation-plan](../plans/production-deployment/implementation-plan.md), context: [repository-context](../plans/production-deployment/repository-context.md), runbook: [deployment](../operations/deployment.md).

## Tujuan modul

Operator dapat men-deploy aplikasi ke satu VPS dengan Docker Compose atau tanpa Docker, memakai Bun 1.4.3 di seluruh runtime, dengan sample env production yang valid dan panduan lengkap. Referensi: [environment](../guides/environment.md), [media](../operations/media.md), [auth](../operations/auth.md).

## User story: DEP-US-01

Sebagai operator, saya ingin sample env dan artefak deploy yang valid, sehingga saya dapat menjalankan aplikasi di VPS tanpa menebak konfigurasi.

## User story: DEP-US-02

Sebagai operator, saya ingin panduan langkah demi langkah untuk jalur Docker dan non-Docker beserta operasi harian, sehingga saya dapat memasang, memperbarui, mencadangkan dan memulihkan layanan.

## Task: DEP-001 — Sample env production

- Status: Done
- Owner: agent
- Prioritas: 1
- Referensi: DEP-US-01
- Diperbarui: 2026-10-16
- Dependensi: tidak ada
- Ukuran: kecil

### Ruang lingkup

`apps/api/.env.production.example`, `apps/web/.env.production.example`, `deploy/docker/.env.example`; `.gitignore` mengecualikan `*.production.example`; test yang memuat sample API lewat semua loader env.

### Acceptance criteria

- [x] Semua nilai rahasia berupa `CHANGE_ME`; tidak ada variabel test di sample production.
- [x] Setelah placeholder diganti, `loadApiEnv`, `loadStorageEnv`, `loadWorkerEnv`, `loadPosterEnv`, `loadPlaybackBaseUrl`, `loadUrlLifetimes` dan `loadLogEnv` menerimanya; placeholder yang tertinggal gagal saat start.

### Validasi

`bun test src/config/production-env-sample.test.ts`.

### Hasil dan bukti

Dikerjakan 16 Oktober 2026. Sample production API (runtime, log JSON, PostgreSQL, Better Auth, **R2 wajib**, umur URL presigned, upload, poster, worker dan FFmpeg), web (`VITE_API_URL` build+runtime, `API_INTERNAL_URL`) dan compose (domain, `ACME_EMAIL`, password PostgreSQL, `BUN_VERSION`, `TAG`). Test `production-env-sample.test.ts` (3 test, 18 assertion) lulus: sample valid setelah placeholder diganti, bersifat production (R2, `NODE_ENV`, JSON, tanpa variabel test, MinIO ditolak) dan placeholder yang tertinggal ditolak.

### Commit task

- Pesan: `chore: add production environment samples (DEP-001)`
- SHA: belum dibuat
- Hook/checks: belum dijalankan
- Ledger: dicatat pada update dokumentasi berikutnya

### Blocker atau tindak lanjut

Tidak ada.

## Task: DEP-002 — Artefak build dan Dockerfile

- Status: Done
- Owner: agent
- Prioritas: 2
- Referensi: DEP-US-01; D1–D3
- Diperbarui: 2026-10-16
- Dependensi: DEP-001
- Ukuran: sedang

### Ruang lingkup

Entri migrasi pada bundle API (`dist/db/migrate.js`, skrip `db:migrate:start`), `.dockerignore`, `deploy/docker/Dockerfile` dengan target `api`, `worker`, `web`, `tools` berbasis `oven/bun:${BUN_VERSION}-debian`, pengguna non-root, healthcheck.

### Acceptance criteria

- [x] Setiap target dibangun dan dijalankan dengan Bun 1.4.3; image runtime hanya memuat artefak build.
- [x] Migrasi dapat dijalankan dari image `api` tanpa source dan `node_modules`.

### Validasi

`docker build` tiap target; `bun dist/db/migrate.js` dari image dan dari bundle lokal.

### Hasil dan bukti

Dikerjakan 16 Oktober 2026. `apps/api` build kini menghasilkan `dist/index.js`, `dist/workers/index.js` dan `dist/db/migrate.js` (migrasi dari `dist` menjawab "Database migrations applied."). Image: `api` 338 MB, `web` 364 MB, `worker` ≈1 GB (FFmpeg 7.1 dari apt), `tools` (workspace penuh untuk migrasi/provisioning); semuanya `bun --version` = 1.4.3 dan berjalan sebagai pengguna `bun`.

### Commit task

- Pesan: `feat(deploy): Docker images for API, worker, web and tools (DEP-002)`
- SHA: belum dibuat
- Hook/checks: belum dijalankan
- Ledger: dicatat pada update dokumentasi berikutnya

### Blocker atau tindak lanjut

Tidak ada.

## Task: DEP-003 — Compose production dan Caddy

- Status: Done
- Owner: agent
- Prioritas: 3
- Referensi: DEP-US-01; D2–D4
- Diperbarui: 2026-10-16
- Dependensi: DEP-002
- Ukuran: sedang

### Ruang lingkup

`deploy/docker/compose.yaml` (postgres, api, worker, web, caddy; `migrate` dan `tools` pada profil `tools`), `deploy/docker/Caddyfile`, rotasi log, healthcheck, hanya Caddy yang membuka port.

### Acceptance criteria

- [x] `docker compose config` valid dan Caddyfile lolos `caddy validate`.
- [x] Stack berjalan: migrasi eksplisit, admin dapat diprovisikan dari `tools`, login lewat gateway berhasil, endpoint admin 401 tanpa sesi dan 200 dengan sesi.

### Validasi

Smoke stack lokal (tanpa Caddy/ACME karena tidak ada DNS lokal; web dipublikasikan ke 127.0.0.1 lewat override).

### Hasil dan bukti

Dikerjakan 16 Oktober 2026. PostgreSQL 18 sehat → `docker compose run --rm migrate` menerapkan 14 migrasi → `admin:provision` dari container `tools` membuat admin (prompt password tersembunyi melalui PTY) → `api` dan `web` healthy, `worker` berjalan (`worker.start` pada log JSON) → `/` 200, `/admin/login` 307, `/nope` 404, `/api/site-settings` 200, `sign-in` 200, `/api/admin/content` 200 dengan cookie sesi dan 401 tanpa sesi; hanya port web yang dipublikasikan, API/worker/PostgreSQL tidak. Stack uji dibersihkan (`down -v`).

### Commit task

- Pesan: `feat(deploy): production Compose stack with Caddy (DEP-003)`
- SHA: belum dibuat
- Hook/checks: belum dijalankan
- Ledger: dicatat pada update dokumentasi berikutnya

### Blocker atau tindak lanjut

HTTPS/ACME dan R2 nyata belum diuji (lihat runbook).

## Task: DEP-004 — Aset deploy tanpa Docker

- Status: Done
- Owner: agent
- Prioritas: 4
- Referensi: DEP-US-01/02; D1, D4
- Diperbarui: 2026-10-16
- Dependensi: DEP-001
- Ukuran: sedang

### Ruang lingkup

`deploy/systemd/vertical-movie-{api,worker,web}.service`, `deploy/caddy/Caddyfile`, `deploy/nginx/vertical-movie.conf`, langkah instalasi Bun terpin dan FFmpeg pada Debian bersih.

### Acceptance criteria

- [x] Unit systemd lolos `systemd-analyze verify`; Caddyfile lolos `caddy validate`.
- [x] Langkah instalasi (paket, Bun terpin, FFmpeg) diuji pada Debian bersih.

### Validasi

`systemd-analyze verify`, `caddy validate`, container `debian:13-slim`.

### Hasil dan bukti

Dikerjakan 16 Oktober 2026. Unit API, worker (`TimeoutStopSec=75`, `Nice=10`) dan web dengan pembatasan hak akses dasar lolos verifikasi; Caddyfile host dan compose lolos `caddy validate`; konfigurasi nginx disediakan tetapi tidak dijalankan. Uji Debian bersih (`debian:13-slim`): `unzip` tersedia, `curl -fsSL https://bun.sh/install | BUN_INSTALL=/usr/local bash -s "bun-v1.4.3"` memasang Bun **1.4.3** ke `/usr/local/bin/bun`, dan `apt install ffmpeg` memberi `ffmpeg`/`ffprobe` 7.1.5 (instalasi lambat: banyak paket).

### Commit task

- Pesan: `feat(deploy): systemd units and reverse proxy samples (DEP-004)`
- SHA: belum dibuat
- Hook/checks: belum dijalankan
- Ledger: dicatat pada update dokumentasi berikutnya

### Blocker atau tindak lanjut

Startup systemd dan nginx belum diuji (tidak ada host systemd/nginx di lingkungan ini).

## Task: DEP-005 — Dokumentasi

- Status: Done
- Owner: agent
- Prioritas: 5
- Referensi: DEP-US-02
- Diperbarui: 2026-10-16
- Dependensi: DEP-002, DEP-003, DEP-004
- Ukuran: sedang

### Ruang lingkup

`docs/operations/deployment.md` (arsitektur, prasyarat, R2 + CORS, konfigurasi, jalur Docker, jalur non-Docker, pasca-deploy, keamanan, troubleshooting, batas bukti), `README.md`, `docs/guides/environment.md`, `docs/README.md`, `AGENTS.md`.

### Acceptance criteria

- [x] Kedua jalur dapat diikuti dari nol sampai login admin dan publish; operasi harian (log, update, rollback, backup/restore, ubah versi Bun) tercakup.
- [x] Dokumen menyebut dengan jelas apa yang terbukti dan tidak; `bun run docs:check` lulus.

### Validasi

`bun run docs:check`.

### Hasil dan bukti

Dikerjakan 16 Oktober 2026 (lihat runbook dan pembaruan `README.md`/`AGENTS.md`/`docs/guides/environment.md`/`docs/README.md`).

### Commit task

- Pesan: `docs: production deployment guide for Docker and bare metal (DEP-005)`
- SHA: belum dibuat
- Hook/checks: belum dijalankan
- Ledger: dicatat pada update dokumentasi berikutnya

### Blocker atau tindak lanjut

Tidak ada.

### Hasil dan bukti

Dikerjakan 16 Oktober 2026 (diamati): `bun run check-types` 4/4, `bun run lint` bersih, `bun run build` 2/2 (menghasilkan `apps/api/dist/db/migrate.js`), `bun run docs:check` lulus; API `bun test src` 218 lulus + 1 gagal sebelumnya (`truncated JPEG data fails the awaited native decode`, juga gagal di `main`); build/uji image dan stack seperti pada DEP-002–004. Ledger SHA: DEP-001 `45fd6d6`, DEP-002/003 `2f3698f`, DEP-004 `1129a95`. **Batas:** HTTPS/ACME pada domain nyata, Cloudflare R2 nyata (upload, HLS, CORS), transcoding dalam container pada job nyata, startup systemd, nginx, PostgreSQL selain 18, restore backup dan ukuran VPS belum terbukti; push, PR, merge dan rollout produksi menunggu otorisasi.

### Commit task

- Pesan: `docs: record production deployment verification (DEP-006)`
- SHA: belum dibuat
- Hook/checks: belum dijalankan
- Ledger: dicatat pada update dokumentasi berikutnya

### Blocker atau tindak lanjut

Tidak ada.

## Task: DEP-007 — Praktik terbaik tanpa Docker (Bun, Turborepo, Elysia, TanStack Start)

- Status: Done
- Owner: agent
- Prioritas: 2
- Referensi: DEP-US-02
- Diperbarui: 2026-10-16
- Dependensi: DEP-004, DEP-005
- Ukuran: sedang

### Ruang lingkup

Menilai jalur tanpa Docker terhadap dokumentasi resmi Elysia, TanStack Start dan Turborepo, lalu menyesuaikan artefak dan panduan: `turbo.json` (`passThroughEnv` untuk `dev`/`start`), variabel opsional `HOST` pada API, `deploy/scripts/release.sh` (rilis atomik, migrasi eksplisit, rollback), unit systemd yang membaca `/opt/vertical-movie/current`, template `vertical-movie-api@.service`, serta bagian 6 dan 10 pada [deployment](../operations/deployment.md).

### Acceptance criteria

- [x] Setiap praktik pada bagian 10 menyebut sumber resmi, penerapan di repo dan bukti yang benar-benar diamati.
- [x] `bun run start` tidak lagi membuang variabel shell yang tidak terdaftar; `HOST` memvalidasi nilainya dan menjaga perilaku default.
- [x] Skrip rilis diuji: rilis baru, rilis ulang, rilis dengan origin berbeda, `--rollback` dan kegagalan health check yang kembali otomatis.

### Validasi

`bun test src/config` (45 lulus), `systemd-analyze verify`, uji sandbox `release.sh` dengan `systemctl` palsu, `bun run docs:check`.

### Hasil dan bukti

Dikerjakan 16 Oktober 2026 (diamati): API tanpa `HOST` mendengarkan `*:3399`, dengan `HOST=127.0.0.1` hanya loopback; dua instance API berbagi satu port lewat `SO_REUSEPORT` (12 permintaan terbagi 6/6, ≈74 MB RSS per instance); bundle JS ≈80 MB RSS vs `--compile` ≈75 MB sehingga `--compile` tidak dipakai. **Batas:** `release.sh` diuji di sandbox dengan `systemctl` palsu, bukan pada systemd/VPS nyata; shutdown rapi lewat systemd belum diuji.

### Commit task

- Pesan: `fix: pass shell env to turbo dev and start tasks` (`2fbd9d7`), `feat(api): add optional HOST to choose the listen address` (`38c24ed`), lalu commit rilis atomik dan dokumentasi (SHA dicatat pada update berikutnya)
- Hook/checks: dijalankan oleh hook commit; lihat riwayat commit
- Ledger: dicatat pada update dokumentasi berikutnya

### Blocker atau tindak lanjut

Uji `release.sh` pada VPS nyata sebelum rollout produksi.

## Task: DEP-008 — Ubuntu 22.04, VPS kecil dan rilis bertag

- Status: Done
- Owner: agent
- Prioritas: 2
- Referensi: DEP-US-02
- Diperbarui: 2026-10-26
- Dependensi: DEP-007
- Ukuran: kecil

### Ruang lingkup

Catatan Ubuntu 22.04 (FFmpeg 4.4.2) dan ukuran VPS 2 vCPU / 2 GB dengan database dan storage eksternal ([deployment 6.11](../operations/deployment.md#611-contoh-ubuntu-2204-2-vcpu--2-gb-database-dan-storage-eksternal)); kebijakan branch `production` dan rilis bertag ([6.12](../operations/deployment.md#612-branch-production-dan-rilis-bertag)); aturan branch di `AGENTS.md`.

### Acceptance criteria

- [x] Perbedaan Ubuntu 22.04 dan pengaturan VPS kecil tercatat dengan angka yang benar-benar diamati dan batas buktinya.
- [x] Alur `main` → `production` → tag `vX.Y.Z` → GitHub Release → `release.sh <tag>` terdokumentasi.

### Validasi

Container `ubuntu:22.04` (24–26 Oktober 2026): Bun 1.4.4, FFmpeg 4.4.2, `transcodeHls` + `verifyHls` lulus (19 file; klip 20 detik 36,7 detik), `systemd-analyze verify` bersih (systemd 249); `bun run docs:check`.

### Hasil dan bukti

Dikerjakan 26 Oktober 2026. **Batas:** swap, ufw, Caddy/ACME, R2, `?sslmode=require` dengan Bun SQL dan beban transcode di VPS nyata belum terbukti.

### Commit task

- Pesan: `docs: ubuntu 22.04 vps notes and tagged release flow (DEP-008)`
- SHA: dicatat pada update dokumentasi berikutnya

### Blocker atau tindak lanjut

Uji di VPS nyata sebelum menganggap siap produksi.
