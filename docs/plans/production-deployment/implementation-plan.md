# Implementation plan: persiapan deploy production di VPS

## Plan metadata

- Status: **approved** (16 Oktober 2026), karena pengguna meminta langsung pembuatan artefak dan dokumentasinya. Keputusan di bawah adalah default yang diambil agent; ubah bila tidak sesuai.
- Date: 16 Oktober 2026; decision owner: pengguna.
- Repository: `bayuaji17/vertical-movie-app`; base ref: `main`.
- Context: [repository-context.md](repository-context.md).
- Backlog: [production-deployment](../../tasks/production-deployment.md), DEP-001–006.
- Branch: `chore/production-deployment`.

## Objective

Operator dapat men-deploy aplikasi ke satu VPS dengan salah satu dari dua jalur yang terdokumentasi dan teruji sejauh mungkin — **Docker Compose** atau **tanpa Docker (systemd)** — memakai Bun 1.4.3 sebagai satu-satunya runtime, dengan sample env production yang valid dan panduan langkah demi langkah termasuk operasi harian.

## Keputusan (**D**)

- **D1 Runtime Bun terbaru di semua jalur.** Image `oven/bun:${BUN_VERSION}-debian` dengan `BUN_VERSION` default 1.4.3 (sama dengan `engines.bun`); jalur non-Docker memasang Bun yang dipin (`bun-v1.4.3`) ke `/usr/local`. Tidak ada Node.js.
- **D2 Satu Dockerfile multi-target** (`deploy/docker/Dockerfile`: `api`, `worker`, `web`, `tools`) dan satu `compose.yaml`. Image runtime hanya memuat artefak build (API `dist` + `drizzle`, web `.output`), berjalan sebagai pengguna non-root `bun`; worker menambah FFmpeg; `tools` memuat workspace penuh untuk migrasi/provisioning.
- **D3 Migrasi eksplisit.** `dist/db/migrate.js` ditambahkan ke bundle API; compose menyediakan service `migrate` (profil `tools`) yang dijalankan manual — tidak otomatis saat `up` (selaras dengan aturan rollout).
- **D4 Reverse proxy.** Docker: Caddy (HTTPS otomatis) satu-satunya service yang membuka port (80/443); non-Docker: Caddy atau nginx di host. API dan PostgreSQL tidak pernah dipublikasikan.
- **D5 Storage production = Cloudflare R2** (kewajiban validasi kode), dengan panduan bucket privat, API token khusus bucket, dan CORS.
- **D6 Sample env.** `apps/api/.env.production.example` dan `apps/web/.env.production.example` (semua secret `CHANGE_ME`), plus `deploy/docker/.env.example` untuk compose; salinan nyata (`.env.production`, `.env`) diabaikan Git. Sample API dijaga valid oleh test yang memuatnya lewat semua loader env.
- **D7 Bukti.** Image dibangun, stack dijalankan (kecuali Caddy/ACME dan R2 nyata) dan diperiksa end-to-end; konfigurasi systemd/Caddy diverifikasi sintaksnya; yang tidak terbukti dicatat sebagai batas.

Tidak termasuk: CI/CD, registry image, monitoring/alerting terkelola, multi-VPS/HA, penggantian storage ke MinIO production, perubahan perilaku aplikasi.

## Rencana kerja (backlog DEP)

1. **DEP-001** Sample env production (API, web, compose), aturan `.gitignore`, test validitas sample.
2. **DEP-002** Artefak build: entri migrasi pada bundle API, `.dockerignore`, Dockerfile multi-target; build dan jalankan tiap image.
3. **DEP-003** Compose production + Caddy; uji stack (migrasi, admin, login lewat gateway).
4. **DEP-004** Aset non-Docker: unit systemd (api, worker, web), Caddyfile host, konfigurasi nginx; verifikasi sintaks dan langkah instalasi Bun/FFmpeg pada Debian bersih.
5. **DEP-005** Dokumentasi: runbook `docs/operations/deployment.md`, pembaruan `README.md`, `docs/guides/environment.md`, `docs/README.md`, `AGENTS.md`.
6. **DEP-006** Gate akhir (`check-types`, `lint`, `build`, `docs:check`, test) dan pencatatan bukti dan batas.

## Validasi

`docker build` setiap target; `docker compose config`; stack berjalan (postgres → migrate → api/worker/web) dengan pemeriksaan: halaman publik, login admin lewat gateway, endpoint admin 200 dengan sesi dan 401 tanpa sesi, log worker, versi Bun dan FFmpeg, pengguna non-root, port yang dipublikasikan; `caddy validate`; `systemd-analyze verify`; test sample env; gate monorepo.

## Rollout dan batas

Perubahan lokal pada branch; push/PR/merge memerlukan otorisasi tersendiri. Tidak ada perubahan perilaku aplikasi dan tidak ada migrasi baru. Belum terbukti: HTTPS/ACME pada domain nyata, R2 nyata (upload, HLS, CORS), transcoding dalam container pada job nyata, nginx, startup systemd, restore backup, ukuran VPS.

## Execution history

- 16 Oktober 2026: context dan plan ditulis; DEP-001–006 dikerjakan dan diverifikasi lokal (lihat backlog dan batas bukti pada runbook).
