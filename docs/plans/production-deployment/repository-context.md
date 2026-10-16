# Repository context: persiapan deploy production di VPS

## Snapshot

- Repository: `bayuaji17/vertical-movie-app`.
- Base ref: `main`; SHA yang diperiksa: `25b384f` (sesudah PR #35).
- Analyzed at: 16 Oktober 2026 (Asia/Jakarta).
- Request: pengguna meminta persiapan deploy production: sample `.env` production, pembaruan `README.md`, dan panduan deploy di VPS **dengan dan tanpa Docker**, dengan runtime **Bun versi terbaru saat ini** (Bun 1.4.3, rilis terbaru 10 Oktober 2026).

## Observed behavior

- Belum ada artefak deploy: tidak ada Dockerfile, compose, unit systemd, konfigurasi reverse proxy, maupun env sample production. `apps/api/.env.example` dan `apps/web/.env.example` ditujukan untuk development (MinIO, localhost, test database).
- Perintah produksi yang sudah ada: API `bun run build` menghasilkan `apps/api/dist/{index.js,workers/index.js}` (bundle `--target=bun`) dan dijalankan `bun dist/index.js` / `bun dist/workers/index.js`; web `bun run build` menghasilkan `apps/web/.output` (Nitro preset `bun`, mandiri tanpa `node_modules`) dan dijalankan `bun .output/server/index.mjs`. Migrasi (`db:migrate`) dan provisioning admin (`admin:provision`) saat ini hanya berupa skrip sumber (`bun run src/...`) yang membutuhkan workspace penuh.
- Aturan production yang dipaksakan kode: `NODE_ENV=production` menolak `STORAGE_PROVIDER=minio` (`config/storage-env.ts`; hanya `r2` dengan endpoint `https://<account>.r2.cloudflarestorage.com` dan region `auto`); `BETTER_AUTH_SECRET` ≥ 32 karakter; `BETTER_AUTH_URL` dan `WEB_ORIGIN` harus origin yang sama; `LOG_HTTP_BODIES` ditolak pada production. Migrasi tidak berjalan otomatis (AGENTS.md: rollout production adalah langkah yang diotorisasi).
- Web adalah gateway same-origin: browser hanya berbicara ke origin web; server web meneruskan `/api/*` ke `API_INTERNAL_URL`. `VITE_API_URL` dibaca **dua kali**: saat build (masuk ke bundle browser) dan saat runtime (gateway memeriksa Origin permintaan non-GET terhadapnya); nilai yang berbeda dari origin publik membuat mutasi admin ditolak 403 `ORIGIN_FORBIDDEN`.
- Media: browser mengunggah multipart dan mengambil segmen HLS/poster **langsung ke storage** lewat URL presigned (`S3_ENDPOINT` harus dapat dijangkau browser; hostname URL bertanda tangan tidak boleh diganti); storage perlu CORS GET/PUT/HEAD/Range dengan header `ETag` terekspos (`docs/operations/media.md`). Worker membutuhkan FFmpeg/FFprobe dan direktori kerja berkapasitas besar (`MEDIA_WORKER_MIN_FREE_BYTES` 10 GiB). "R2 staging belum diuji" tercatat di runbook media.
- Bun 1.4.3 adalah rilis terbaru dan sudah dipasang di mesin pengembangan; `engines.bun` pada semua workspace sudah `>=1.4.3`. Image resmi `oven/bun:1.4.3-debian` tersedia (Debian 13, pengguna non-root `bun`).

## Repository map (bagian relevan)

| Area                                                                          | Peran                                                                               |
| ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `apps/api/package.json` (`build`, `start`, `worker:start`, `db:migrate`)      | Perintah build/run production API dan worker; entri migrasi ditambahkan ke bundle.  |
| `apps/web/package.json` (`build`, `start`), `vite.config.ts`                  | Build Nitro `bun`; `.output/server/index.mjs`.                                      |
| `apps/api/src/config/{env,storage-env,worker-env,playback-env,poster-env}.ts` | Validasi env yang wajib dipenuhi sample production.                                 |
| `apps/api/src/db/migrate.ts`, `modules/auth/provision-cli.ts`                 | Migrasi dan pembuatan admin (CLI resmi Better Auth, prompt password tersembunyi).   |
| `docs/guides/environment.md`, `docs/operations/{media,auth}.md`               | Daftar variabel, aturan storage/CORS, runbook auth.                                 |
| `.gitignore`, `AGENTS.md`                                                     | `.env*` diabaikan kecuali `.env.example`; aturan lokasi sample env dan dokumentasi. |

## Constraints dari repo

- Bun untuk install, skrip, build dan runtime production; versi mengikuti `engines.bun` (≥ 1.4.3); gunakan `bun install --frozen-lockfile`.
- Sample env tidak berisi secret; file nyata tidak pernah di-commit. Dokumentasikan variabel pada `docs/guides/environment.md`; dokumentasi baru berada di `docs/` (runbook di `docs/operations/`).
- PostgreSQL untuk queue; FFmpeg dijalankan sebagai subprocess Bun di worker, di luar request HTTP.
- Migrasi production hanya dengan langkah eksplisit; backup dan restore adalah tanggung jawab operator.
- Tidak menambahkan dependensi runtime baru; artefak deploy berada di folder `deploy/` (bukan di dalam app).

## Gaps, risks, dan pertanyaan terbuka

- **R2 wajib:** karena validasi production menolak MinIO, VPS self-hosted storage tidak didukung tanpa perubahan kode; panduan memakai R2 dan mencatat batas itu.
- **R2 dan HTTPS/ACME belum diuji** pada akun/domain nyata di lingkungan ini; yang dapat dibuktikan lokal adalah build image, startup stack, migrasi, provisioning admin, login lewat gateway dan validitas konfigurasi.
- Spesifikasi VPS minimum tidak diukur (runbook media menyebut benchmark mesin target diperlukan); panduan memberi titik awal, bukan jaminan.
- Image worker besar (≈1 GB) karena FFmpeg dari apt; alternatif binary statis tidak dipakai agar paket tetap dari distro.
- PostgreSQL diuji pada versi 18; versi lain belum diuji.
