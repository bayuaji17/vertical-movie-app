# Repository Context — Video, Series, dan Movie

## Snapshot

- Repository: `bayuaji17/vertical-movie-app`.
- Base ref: `main`.
- Base SHA: `d1d3e0a36a4adf1c7198db7a1d36c49e9f1c93ed`.
- Analyzed at: 2026-10-03, Asia/Jakarta.
- Context status: snapshot historis sebelum implementasi; peta di bawah menjelaskan base SHA, bukan keadaan branch hasil.
- Scope snapshot: inspeksi dan penulisan dokumen sebelum persetujuan implementasi.

## Hasil implementasi — 3 Oktober 2026

Pengguna menyetujui metadata D1–D3 dan implementasi dengan branch baru serta commit per task. Branch `feat/video-metadata` menambahkan enam tabel metadata, migrasi additive `0003`–`0005`, module `series`, `genres`, dan `videos`, serta 16 endpoint admin. Bootstrap memakai pool auth yang sama dan native session reader. Eden compile-only dan Scalar gabungan tervalidasi. Schema/HTTP/repository diuji pada PostgreSQL dedicated; data auth lama terjaga pada regression migration proof. Pada penutupan VID-015 database development belum dimigrasikan. Tindak lanjut VERIFY-001 kemudian menerapkan migrasi lokal 0003–0005, journal menjadi enam entry, dan data auth existing tetap sama. Storage S3, worker, publikasi/katalog, dan gateway bisnis web tetap task berikutnya. Peta evidence aktual dan batas validasi ada pada [plan](VIDEO_IMPLEMENTATION_PLAN.md), [backlog](tasks/videos.md), dan [Video Operations](VIDEO_OPERATIONS.md).

## Product and Users

Pengunjung menonton konten terbit tanpa login; satu admin mengelola konten. Pada 3 Oktober 2026 pengguna meminta plan detail serta model data yang mengakomodasi series dengan banyak video dan movie panjang. Permintaan ini mengizinkan perencanaan dukungan tersebut; detail season, metadata, dan aturan publikasi pada [model data](VIDEO_DATA_MODEL.md) masih usulan untuk ditinjau.

## Repository Map

| Subsystem                                     | Keadaan dan tanggung jawab                                                                                                       |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `apps/api`                                    | Elysia, factory HTTP, PostgreSQL/Drizzle/Bun SQL, auth native, Scalar, unit/proof integrasi. Belum ada modul video/series/media. |
| `apps/web`                                    | TanStack Start, login/admin shell, SDK auth, TanStack Query, client Eden, demo Video.js. Gateway yang tersedia hanya auth.       |
| `packages/auth`                               | Pemilik Better Auth server/client/types dan schema auth canonical; tidak menjadi pemilik domain konten.                          |
| `docs`                                        | PRD, arsitektur, workflow, evidence/backlog auth, database tooling, dan rancangan media baru.                                    |
| `.agents`, `.commandcode`, `skills-lock.json` | Skill repo dan metadata; bukan runtime.                                                                                          |
| `.husky`, `commitlint.config.cjs`             | Gate lint/type-check dan Conventional Commits.                                                                                   |
| Root manifests, `turbo.json`, `bun.lock`      | Workspace Bun, task/cache dan dependency; tidak perlu diubah untuk sesi dokumentasi.                                             |
| `README.md`, `.gitignore`, `LICENSE`          | Panduan mulai, batas file lokal/output, lisensi.                                                                                 |

## Architecture and Boundaries

- API memiliki schema konten, aturan bisnis, query, dan otorisasi. Web mengonsumsi tipe `api/types` melalui Eden; auth tetap melalui SDK `@repo/auth`.
- `createDatabase()` membuat satu pool Bun SQL/Drizzle. `createApp()` saat ini menerima client untuk shutdown, handler auth, dan schema auth; dependency service/query bisnis belum diinjeksi.
- Macro `createRequireAdmin()` membaca sesi authoritative dengan `disableCookieCache: true` serta memeriksa role/ban/expiry. Pasang sebelum rute privat dan pertahankan inferensi chaining Elysia.
- `createApp()` saat ini hanya memasang root publik, `/api/auth/*`, dan Scalar. Schema aplikasi dihitung sebelum plugin Scalar; semua modul bisnis harus diregistrasikan sebelum schema dihitung.
- File runtime dan dokumentasi tetap pada app/root yang memiliki tanggung jawabnya. Tidak perlu package konten bersama.

## Runtime and Data Flow

Saat ini browser menggunakan gateway `/api/auth/*`. `createApiClient()` Eden menerima base browser `/api`, tetapi belum ada gateway bisnis untuk `/api/admin/*` atau `/api/videos/*`. Target backend yang diusulkan memakai rute `/admin/*` dan `/videos/*` tanpa prefix `/api`; gateway bisnis nanti menghapus tepat satu prefix `/api`. Auth tetap meneruskan `/api/auth/*` tanpa perubahan.

Tahap metadata: HTTP admin → macro admin → service → repository Drizzle → PostgreSQL. Tahap media: unggah storage → verifikasi API → enqueue atomik → worker Bun terpisah → FFprobe/FFmpeg → storage hasil → status database. Infrastruktur media belum tersedia.

## Domain and Data Model

`src/db/schema/index.ts` saat ini hanya mengekspor schema auth. Migrasi yang tersedia `0000_auth-admin`, `0001_native-admin-expand`, dan `0002_native-admin-contract`; jangan mengubah riwayat tersebut. Usulan domain baru: `series → seasons → videos(kind=episode)`, bersama `videos(kind=movie|standalone)` tanpa season. Genre relasional dan tabel media akan ditambahkan bertahap. Detail nullable, constraint, lifecycle, dan tahap migrasi ada di [VIDEO_DATA_MODEL.md](VIDEO_DATA_MODEL.md).

## External Integrations

- Runtime yang diperiksa: Bun **1.4.2**, Elysia **1.4.30**, Drizzle ORM **0.45.3**; Drizzle Kit manifest **0.31.11**.
- Auth dan migrasi menggunakan driver Bun SQL yang sudah ada. Database live tidak diakses selama planning.
- Storage R2/S3, queue worker, FFmpeg/FFprobe, profil HLS dan distribusi belum diimplementasikan. HLS dicatat sebagai arah pada workflow; codec/resolusi/delivery masih perlu keputusan.
- Movie panjang perlu batas ukuran/durasi, upload terputus/resumable, resource worker dan profil landscape; belum ada bukti kompatibilitas provider untuk kebutuhan ini.

## Development, Testing, and Delivery

`apps/api/package.json` memiliki `test: bun test ./src` serta proof PostgreSQL terpisah. Jalankan test HTTP melalui `app.handle` tanpa port dan database integrasi khusus test. Root `check-types` mencakup API/web/auth, `build` dua app, dan `lint` hanya web. Frozen install wajib setelah perubahan dependency/script. Tidak menambah GitHub CI. Persetujuan plan tidak otomatis mengizinkan migrasi development, commit, push, atau PR.

## Constraints and Conventions

Ikuti root AGENTS, API Development, Global Workflow dan Task Template. Tabel auth canonical tidak diubah. Jangan membaca/menulis env berisi secret untuk planning. File route tree web dihasilkan tooling; tidak diedit manual. Player tidak diubah pada tahap metadata; skill Video.js dan bundled docs diperlukan saat pekerjaan playback dilakukan.

## Relevant Active Work

Worktree bersih saat inspeksi. Backlog auth mencatat refactor dan follow-up selesai pada level lokal; rollout produksi masih terpisah. `REPOSITORY_CONTEXT.md` dan `IMPLEMENTATION_PLAN.md` adalah riwayat auth dan dipertahankan. Rancangan baru menggunakan nama dokumen terpisah agar riwayat auth tidak tertimpa.

## Exploration Coverage

Diperiksa: root/app/package manifest, AGENTS, indeks docs, PRD/Architecture/Global Rules/Workflow/Template, aturan API, environment tanpa env lokal, auth backlog, factory/bootstrap/schema/migrator/guard/OpenAPI, client Eden, gateway auth dan test factory/client. Folder skills/hooks/config diperiksa per peran dan batas, bukan seluruh isinya. Player skin/UI, auth internal secara menyeluruh, storage live, database live dan deployment tidak diaudit ulang karena bukan perubahan planning ini.

## Unknowns and Assumptions

Season disarankan sejak awal; series sederhana mempunyai Season 1. Movie dapat landscape dan tidak ditentukan otomatis oleh durasi. Genre masuk metadata dasar; cast/crew/translation/trailer dan franchise ditunda. Kebijakan publishing parent, slug, archive, dan concurrency dijabarkan sebagai usulan, bukan perilaku aktif.

## Evidence Index

Semua evidence kode berikut merujuk Base SHA di atas.

| Evidence                                                                            | Kesimpulan                                                                  |
| ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `apps/api/src/app.ts:createApp`, `createAuthRoutes`                                 | Rute aktif dan urutan schema Scalar; belum ada bisnis konten.               |
| `apps/api/src/index.ts`                                                             | Satu pool dan wiring auth pada bootstrap.                                   |
| `apps/api/src/db/client.ts:createDatabase`, `db/schema/index.ts`                    | Bun SQL/Drizzle tersedia; schema baru perlu diekspor.                       |
| `apps/api/src/db/migrate.ts:applyDatabaseMigrations`, `drizzle/meta/_journal.json`  | Migrasi eksplisit; history auth tetap dipertahankan.                        |
| `apps/api/src/modules/auth/admin/guard.ts:createRequireAdmin`                       | Otorisasi reusable yang harus dipakai rute bisnis privat.                   |
| `apps/api/src/types.ts:App`                                                         | Kontrak API type-only yang mengikuti factory.                               |
| `apps/web/src/lib/api/client.ts:createApiClient`, `createPrivateApiClient`          | Base `/api`, cookie, parseDate false, failure handling privat.              |
| `apps/web/src/routes/api/auth/$.ts`, `lib/server/auth-gateway.ts:createAuthGateway` | Gateway hanya auth; bisnis butuh wiring tersendiri.                         |
| `docs/README.md`, `tasks/auth.md`                                                   | Evidence auth lokal; keterbatasan produksi.                                 |
| `AGENTS.md`, `docs/API_DEVELOPMENT.md`, `GLOBAL_WORKFLOW.md`, `TASK_TEMPLATE.md`    | Ownership, pengujian, dependency injection, scope dan workflow.             |
| `docs/PRD.md:PRD-03–07,09`, `ARCHITECTURE.md`                                       | Alur draf/media/publikasi; rancangan data lama belum mencakup series/movie. |

Referensi resmi yang diperiksa pada 3 Oktober 2026: [PostgreSQL constraints](https://www.postgresql.org/docs/current/ddl-constraints.html), [date/time](https://www.postgresql.org/docs/current/datatype-datetime.html), [Drizzle constraints](https://orm.drizzle.team/docs/indexes-constraints), [Eden Treaty](https://elysiajs.com/eden/treaty/overview), [Bun UUIDv7](https://bun.com/docs/runtime/utils#bun-randomuuidv7), [Bun S3](https://bun.com/docs/runtime/s3), [PostgreSQL queue locking](https://www.postgresql.org/docs/current/sql-select.html), dan [FFprobe](https://ffmpeg.org/ffprobe.html). Dokumen vendor melandasi mekanisme teknis; model produk adalah rancangan aplikasi.
