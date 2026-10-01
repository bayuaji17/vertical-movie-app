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

- [Global Workflow](GLOBAL_WORKFLOW.md): keputusan Agile dan pembagian modul → user story → task kecil disetujui pengguna pada 1 Oktober 2026.
- [Template Task](TASK_TEMPLATE.md): format backlog per modul, acceptance criteria, dependensi, dan bukti validasi.
- [Environment](ENVIRONMENT.md): setup env API/web, pemisahan konfigurasi publik/server, dan status variabel integrasi.
- [API Development](API_DEVELOPMENT.md): aturan kode `apps/api`, struktur modul, kontrak Eden Treaty, lifecycle/scope Elysia, database, autentikasi, storage, queue, worker, unit test native Bun, dan validasi perubahan.

## Struktur saat ini

| Path                                                              | Tanggung jawab                                                                                                                         |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/api/`                                                       | API Elysia di Bun. `src/index.ts` saat ini hanya memiliki `GET /` dan secara default berjalan pada port 3001.                          |
| `apps/web/`                                                       | Web TanStack Start. Rute ada di `src/routes/`; `src/routeTree.gen.ts` adalah file hasil generasi. Pengembangan default pada port 3000. |
| `packages/auth/`                                                  | Package internal `@repo/auth`, pemilik dependensi Better Auth, dengan entry point server, React client, dan tipe yang terpisah.        |
| `turbo.json`                                                      | Definisi task workspace dan cache output build.                                                                                        |
| `.husky/` dan `commitlint.config.cjs`                             | Pemeriksaan sebelum commit dan validasi pesan Conventional Commits.                                                                    |
| `.agents/skills/`, `.commandcode/skills/`, dan `skills-lock.json` | Skill repo Elysia, Turborepo, dan shadcn beserta symlink agent dan metadata instalasinya, semuanya dikelola dari root.                 |

Kedua app saat ini masih berupa starter. Model domain video, kontrak API, dan integrasi web ke API belum diimplementasikan. Catat keputusan final di sini dengan mengacu pada kode dan skrip yang benar-benar ada.

Eden Treaty dipilih pengguna pada 1 Oktober 2026 untuk konsumsi kontrak API Elysia oleh web. API akan mengekspor tipe `App` melalui entry point type-only; client Eden berada di web. Instalasi SDK dan ekspor tipe belum diimplementasikan. Ikuti [API Development](API_DEVELOPMENT.md) untuk aturan inferensi, lifecycle, scope plugin, dan akses admin.

Konfigurasi shadcn dan komponen UI tetap berada di `apps/web`. Video.js tersedia melalui plugin Codex yang dipasang pada lingkungan pengguna; ikuti aturan penggunaannya di `AGENTS.md` saat mengerjakan video atau audio.

Player Video.js React `10.0.0-rc.4` telah dipasang di `apps/web`, bersama `@videojs/core` pada versi yang sama. Registry `@videojs` terdaftar di `apps/web/components.json`. Skin Default yang dapat diedit berada di `apps/web/src/components/videojs/`; komponen kontrol memakai Remixicon dan styling Tailwind. `VerticalVideoPlayer` di `apps/web/src/components/vertical-video-player.tsx` menyediakan layout 9:16 dengan `playsInline` dan preload metadata, tanpa autoplay. Halaman starter menampilkan MP4 demo resmi untuk pemeriksaan pemutaran; sumber demo bukan konten produk. Integrasi HLS, storage, dan katalog video belum diimplementasikan. Versi release candidate ini telah diterima untuk tahap development.

API dan web bergantung pada `@repo/auth` melalui `workspace:*`. Gunakan `@repo/auth/server` untuk `betterAuth`, `@repo/auth/client` untuk `createAuthClient`, dan `import type` dari `@repo/auth/types` untuk tipe dasar. Saat ini entry point tersebut meneruskan API Better Auth; instance auth, adapter database, endpoint, provisioning admin, dan formulir login belum dikonfigurasi. Konfigurasi proyek akan dipusatkan di package ini saat implementasi, dengan database dan rahasia diberikan oleh API serta URL API diberikan oleh web.

## Bekerja di repo ini

Gunakan Bun 1.4.2 dari root repo:

```sh
bun install --frozen-lockfile
bun run dev
bun run lint
bun run check-types
bun run build
```

Untuk setup lokal pertama kali, salin `apps/api/.env.example` ke `apps/api/.env` dan `apps/web/.env.example` ke `apps/web/.env`. Jika file tujuan sudah ada, lengkapi nilainya tanpa menimpa konfigurasi lokal. Port dev web sekarang dibaca dari env melalui konfigurasi Vite; kedua app tetap memakai default 3001 (API) dan 3000 (web). Variabel PostgreSQL/auth/storage/worker serta URL API web disiapkan untuk development dan belum mengaktifkan integrasi dengan sendirinya.

`dev` menjalankan kedua app. `build` menghasilkan `apps/api/dist/` dan `apps/web/.output/`; `bun run start` menjalankan hasil build dengan Bun. Gunakan filter `--filter=api` atau `--filter=web` untuk satu app, atau `--filter=@repo/auth` untuk pemeriksaan tipe package auth. Saat ini lint hanya mencakup `web`; pemeriksaan tipe mencakup kedua app dan `@repo/auth`, sedangkan build mencakup kedua app. Package auth mengekspor sumber TypeScript yang dikompilasi oleh Bun/Vite saat digunakan, sehingga tidak memiliki task build sendiri.

Gunakan pesan Conventional Commits seperti `feat(api): add movie endpoint`. Husky menjalankan lint dan pemeriksaan tipe sebelum commit, lalu Commitlint memvalidasi pesannya.
