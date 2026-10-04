# Dokumentasi proyek

Ini adalah satu-satunya direktori dokumentasi proyek. `README.md` di root tetap menjadi panduan mulai cepat; file ini menjadi indeks dokumen produk dan teknik. Dokumen pada bagian draft memuat rancangan untuk ditinjau. Panduan development mencatat aturan kerja dan membedakan konfigurasi yang sudah berjalan dari integrasi yang masih direncanakan.

## Dokumen draft

| Dokumen                               | Isi                                                                                     |
| ------------------------------------- | --------------------------------------------------------------------------------------- |
| [PRD](PRD.md)                         | Aplikasi tonton video vertikal, admin tunggal, penonton tanpa login, dan kriteria MVP.  |
| [Architecture](ARCHITECTURE.md)       | Tech stack pilihan, R2/S3-compatible storage, queue PostgreSQL, FFmpeg, dan alur media. |
| [Global Rules](GLOBAL_RULES.md)       | Usulan aturan produk dan teknik lintas fitur.                                           |
| [Global Workflow](GLOBAL_WORKFLOW.md) | Usulan alur dari kebutuhan sampai implementasi, validasi, dan rilis.                    |
| [Design System](DESIGN_SYSTEM.md)     | Usulan prinsip antarmuka, token, komponen, dan target aksesibilitas.                    |

Catat tanggal persetujuan dan pemilik keputusan di setiap dokumen. Pisahkan perilaku yang diusulkan dari kode yang sudah berjalan.

## Panduan development

- [Auth Operations](AUTH_OPERATIONS.md) — seed native dan recovery admin selama maintenance.
- [Repository Context — Auth](REPOSITORY_CONTEXT.md): konteks kode dan batas sistem pada snapshot `bff1ced88f7ade37d454370ccf7d95a47cbf3aea` untuk implementasi auth.
- [Implementation Plan — Auth](IMPLEMENTATION_PLAN.md): riwayat rencana email/password sebelum refactor native; AUTH-001 sampai AUTH-013 selesai pada level implementasi dan validasi lokal. Batas proof awal dipertahankan sebagai riwayat; evidence browser refactor ada pada backlog.
- [Backlog Auth](tasks/auth.md): riwayat AUTH-001–013 dan 10 task refactor dengan peta file, kontrak, 72 langkah implementasi, 57 skenario uji, acceptance criteria, gerbang cutover/commit, serta bukti validasi. AUTH-REF-001–010 telah diimplementasikan; evidence dan commit berada pada backlog.
- [Rencana Refactor Auth](AUTH_REFACTOR_PLAN.md): rencana disetujui pada 2 Oktober 2026; ownership entry client/server package, dependency injection database, native role/CLI, TanStack isomorphic/Query, SSR/protected routes, cache/invalidation, migrasi serta regression. Implementasi refactor selesai; command operasional pada Auth Operations.
- [Global Workflow](GLOBAL_WORKFLOW.md): keputusan Agile dan pembagian modul → user story → task kecil disetujui pengguna pada 1 Oktober 2026.
- [Template Task](TASK_TEMPLATE.md): format backlog per modul, acceptance criteria, dependensi, dan bukti validasi.
- [Backlog Database Tooling](tasks/database-tooling.md): konfigurasi dan validasi Drizzle Studio lokal.
- [Backlog Verifikasi Development](tasks/development-verification.md): aturan penyelesaian test/types/lint/build dan bukti migrasi metadata development lokal.
- [Repository Context — Video](VIDEO_REPOSITORY_CONTEXT.md): snapshot historis tahap A dan snapshot refinement media pada `0d3bef87f6d2f9b0a2873078f9b560f092f13c53`; batas domain, env/storage/HLS dan gap gateway bisnis.
- [Rancangan Data Video/Series/Movie](VIDEO_DATA_MODEL.md): metadata, aset/upload/job/attempt/rendition/operation serta lifecycle aktif; migration development 0006–0008 dan batas rollout dicatat pada Media Operations.
- [Implementation Plan — Video](VIDEO_IMPLEMENTATION_PLAN.md): tahap A selesai; MinIO development, R2 production melalui S3-compatible, selector env dan HLS VOD disetujui 3 Oktober 2026. Plan media B–D difinalisasi dan implementasi development tersedia; keputusan 1–7, gerbang proof, serta evidence dan batas delivery Git tercatat.
- [Backlog Video](tasks/videos.md): 15 task tahap metadata Done dengan acceptance criteria, evidence lokal, serta ledger commit pada plan; VID-016 Review untuk compatibility migration lifecycle draft → published → archived dengan preservation legacy/auth.
- [Backlog Media](tasks/media.md): 10 task konfigurasi/proof/upload/cleanup dan refinement HLS, dengan dependency/acceptance serta proof MinIO dan R2 terpisah. implementasi dan evidence lokal tersedia; proof R2 tetap Blocked karena lingkungan staging belum tersedia.
- [Backlog Worker Media](tasks/media-worker.md): queue/enqueue, claim/lease, runner, runtime dan retensi development tersedia; matriks stress masih In Progress dan benchmark server 4 GB Blocked.
- [Backlog Publication/Playback](tasks/media-publication.md): publish/archive/series, katalog, signed HLS, gateway/player tersedia untuk review; bukti Chromium/MinIO dan batas eksternal tercatat.
- [Video Operations](VIDEO_OPERATIONS.md): endpoint aktif, contoh metadata, migrasi additive, recovery, proof dedicated, dan refinement MEDIA-001.
- [Environment](ENVIRONMENT.md): setup env API/web, pemisahan konfigurasi publik/server, dan status variabel integrasi.
- [API Development](API_DEVELOPMENT.md): aturan kode `apps/api`, struktur modul, kontrak Eden Treaty, dokumentasi OpenAPI/Scalar, lifecycle/scope Elysia, database, autentikasi, storage, queue, worker, unit test native Bun, dan validasi perubahan.

## Struktur saat ini

| Path                                                              | Tanggung jawab                                                                                                                                                                                                                                                                                                                   |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/api/`                                                       | API Elysia di Bun. `src/app.ts` memisahkan factory tanpa listen; API menyediakan root publik, `/api/auth/*`, 26 operasi admin metadata/media/publication/preview, katalog dan playback publik, serta Scalar. Factory auth native dari package, reusable guard privat; expand/contract juga telah diterapkan pada DB development. |
| `apps/web/`                                                       | Web TanStack Start. Rute ada di `src/routes/`; `src/routeTree.gen.ts` adalah file hasil generasi. Pengembangan default pada port 3000.                                                                                                                                                                                           |
| `packages/auth/`                                                  | Package internal `@repo/auth`, pemilik dependensi Better Auth, dengan entry point server, React client, dan tipe yang terpisah.                                                                                                                                                                                                  |
| `turbo.json`                                                      | Definisi task workspace dan cache output build.                                                                                                                                                                                                                                                                                  |
| `.husky/` dan `commitlint.config.cjs`                             | Pemeriksaan sebelum commit dan validasi pesan Conventional Commits.                                                                                                                                                                                                                                                              |
| `.agents/skills/`, `.commandcode/skills/`, dan `skills-lock.json` | Skill repo Elysia, Turborepo, shadcn dan Better Auth beserta symlink agent dan metadata instalasinya, semuanya dikelola dari root.                                                                                                                                                                                               |

Kedua app masih berupa starter produk. Refactor auth native Better Auth sudah diimplementasikan: role/admin plugin, CLI resmi seed, recovery native maintenance, session cookie cache, gateway bounded, reader isomorphic, cache TanStack Query, protected admin routes dan logout. Toast shadcn Base UI memberikan status loading/sukses/gagal pada login/logout serta retry sesi manual, dengan Toaster global dan error inline yang tetap tersedia. Proof API/PostgreSQL serta browser Chromium pada Vite dan hasil build Bun/Nitro lolos; browser juga diuji dengan Better Auth/Elysia/PostgreSQL asli di database dedicated. Domain/TLS/trusted proxy/production smoke belum diverifikasi. Database development sudah menerima expand/contract native pada 2 Oktober 2026 dengan identitas, hash password, dan sesi existing tetap sama; rollout deployment merupakan langkah operasional terpisah.

Eden Treaty dipilih pengguna pada 1 Oktober 2026 untuk konsumsi kontrak API Elysia oleh web. API mengekspor tipe `App` melalui entry point type-only `api/types`; web memakai client Eden pada origin publik `/api`, sementara SSR memanggil native SDK pada origin internal tetap dengan cookie per request dan memproyeksikan snapshot aman. Auth memakai SDK package; Eden di `apps/web/src/lib/api/client.ts` hanya untuk bisnis. Ikuti [API Development](API_DEVELOPMENT.md) untuk aturan inferensi, lifecycle, scope plugin, dan akses admin.

Konfigurasi shadcn dan komponen UI tetap berada di `apps/web`. Video.js tersedia melalui plugin Codex yang dipasang pada lingkungan pengguna; ikuti aturan penggunaannya di `AGENTS.md` saat mengerjakan video atau audio.

Referensi desain ada di `docs/design/`: [konsep dashboard light](design/dashboard-light-shadcn.prompt.md), [konsep dashboard dark](design/dashboard-dark-shadcn.prompt.md), dan [redesign login](design/login-light-shadcn-redesign.prompt.md). Konsep dashboard memakai data contoh dan fitur yang masih direncanakan. Login sudah diimplementasikan; screenshot [desktop](design/login-implemented-desktop.png) dan [mobile](design/login-implemented-mobile.png) mendokumentasikan hasilnya.

Player Video.js React `10.0.0-rc.4` telah dipasang di `apps/web`, bersama `@videojs/core` pada versi yang sama. Registry `@videojs` terdaftar di `apps/web/components.json`. Skin Default yang dapat diedit berada di `apps/web/src/components/videojs/`; komponen kontrol memakai Remixicon dan styling Tailwind. `VerticalVideoPlayer` di `apps/web/src/components/vertical-video-player.tsx` menyediakan layout 9:16 dengan `playsInline` dan preload metadata, tanpa autoplay. Halaman starter menampilkan MP4 demo resmi untuk pemeriksaan pemutaran; sumber demo bukan konten produk. Adapter HLS versi sama kini digunakan pada halaman /watch/$slug dan preview admin minimal; sumber HLS berasal dari worker. Alur storage/publikasi/katalog tersedia pada backend dan gateway bisnis. Versi release candidate ini telah diterima untuk tahap development.

API dan web bergantung pada `@repo/auth` melalui `workspace:*`. `@repo/auth/server` menyediakan `createAdminAuthServer`, schema canonical, reader SSR dan operator native; API menyuntikkan satu pool Bun SQL/Drizzle. Web mengimpor `@repo/auth/client`, tipe bersama memakai `import type` dari `@repo/auth/types`, dan tidak membuka koneksi DB. Browser build menolak impor server. Sesi diambil lewat SDK native `/api/auth/get-session`; `/admin/session`, DTO auth Eden, writer/hash aplikasi, dan singleton schema telah dihapus. Guard API `requireAdmin` melindungi seluruh endpoint metadata konten. Enam tabel konten telah diuji pada database dedicated; migrasi konten development diterapkan pada tindak lanjut 3 Oktober 2026 dengan data auth existing tetap utuh. Gateway bisnis same-origin /api/* kini tersedia dengan allowlist route dan bounded body/deadline; signed payload tetap langsung storage.

## Bekerja di repo ini

Gunakan Bun 1.4.2 dari root repo:

```sh
bun install --frozen-lockfile
bun run dev
bun run db:studio
bun run lint
bun run check-types
bun run build
```

Untuk setup lokal pertama kali, salin `apps/api/.env.example` ke `apps/api/.env` dan `apps/web/.env.example` ke `apps/web/.env`. Jika file tujuan sudah ada, lengkapi nilainya tanpa menimpa konfigurasi lokal. Port dev web dibaca dari env; default API 3001 dan web 3000. API kini menolak secret Better Auth kosong/pendek, URL bukan PostgreSQL, serta origin auth/web yang berbeda. Browser memakai gateway same-origin `/api/auth/*`; `API_INTERNAL_URL` hanya dibaca server web saat runtime. Form login tersedia di `/admin/login`; jalur migrasi, provision, reset, serta database proof dijelaskan di [Environment](ENVIRONMENT.md).

`db:studio` menjalankan Drizzle Studio dari konfigurasi API pada loopback port4983; buka [local.drizzle.studio](https://local.drizzle.studio) selama command berjalan. `dev` menjalankan kedua app. `build` menghasilkan `apps/api/dist/` dan `apps/web/.output/`; `bun run start` menjalankan hasil build dengan Bun. Gunakan filter `--filter=api` atau `--filter=web` untuk satu app, atau `--filter=@repo/auth` untuk pemeriksaan tipe package auth. Saat ini lint hanya mencakup `web`; pemeriksaan tipe mencakup kedua app dan `@repo/auth`, sedangkan build mencakup kedua app. Package auth mengekspor sumber TypeScript yang dikompilasi oleh Bun/Vite saat digunakan, sehingga tidak memiliki task build sendiri.

Gunakan pesan Conventional Commits seperti `feat(api): add movie endpoint`. Husky menjalankan lint dan pemeriksaan tipe sebelum commit, lalu Commitlint memvalidasi pesannya.

## Media backend development

Branch feat/media-backend mengimplementasikan S3 multipart→queue PostgreSQL→worker FFmpeg HLS/WebP→preview→publish manual→catalog/playback→archive/retention. Worker dijalankan terpisah dengan bun run --cwd apps/api worker. Migrasi development 0006–0008 diterapkan dan journal9/data existing diverifikasi. [Media Operations](MEDIA_OPERATIONS.md) memuat command, HTTP contract, recovery dan batas proof; [Upload Contract](MEDIA_UPLOAD_CONTRACT.md) memuat geometry/idempotency/freeze. R2 staging, benchmark4core4GB, Safari, full restore dan matriks stress tetap verification gate. Fixture sintetis durasi penuh10/30min dan near-end seek sudah lulus. Dashboard upload lengkap belum dibuat.
