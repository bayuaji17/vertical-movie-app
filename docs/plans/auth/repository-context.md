> Snapshot historis sebelum refactor native. AUTH-REF-001–010 telah selesai; kondisi aktif dan bukti lokal ada pada [Auth Operations](../../operations/auth.md) dan [backlog auth](../../tasks/auth.md). Database development kemudian menerima expand/contract pada tindak lanjut 2 Oktober 2026; snapshot di bawah tetap historis.

# Repository Context — Auth

## Snapshot

- Repository: `bayuaji17/vertical-movie-app`.
- Base ref: `main`.
- Base SHA: `bff1ced88f7ade37d454370ccf7d95a47cbf3aea`.
- Analyzed at: 2026-10-01, Asia/Jakarta.
- Context status: **current** pada snapshot tersebut; validasi ulang sebelum eksekusi.
- Mode: planning; perubahan yang diizinkan pada pekerjaan ini adalah dokumen rencana.

## Product and Users

Produk menyediakan video vertikal untuk pengunjung tanpa login dan dashboard untuk satu admin. PRD-01 dan GR-01 mensyaratkan provisioning terkendali, penolakan operasi privat, dan tidak adanya registrasi admin publik. PRD-07 dan GR-02 menjaga akses tonton publik tanpa autentikasi.

Pengguna menyetujui scope modul auth pada 1 Oktober 2026: **email/password, provisioning dan pemulihan admin melalui CLI, tanpa registrasi publik atau layanan email**, serta **web dan API pada satu origin**. Domain deployment belum ditentukan. Persetujuan ini menetapkan scope rencana, bukan perintah untuk mengimplementasikan atau melakukan operasi Git.

## Repository Map

| Subsystem                                     | Peran dan keadaan yang diamati                                                                                                                                   |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/api`                                    | Elysia/Bun; satu file `src/index.ts` membuka port dan melayani `GET /`. Belum ada factory, auth endpoint, database adapter, migrasi, atau suite test nyata.      |
| `apps/web`                                    | TanStack Start/React dengan Nitro preset Bun; halaman starter, TanStack Query, shadcn Button, dan demo Video.js. Belum ada login/dashboard/client API atau auth. |
| `packages/auth`                               | `@repo/auth` memiliki Better Auth; entry point server/client/types hanya meneruskan ekspor library. Kedua app bergantung pada package ini.                       |
| `docs`                                        | Dokumentasi produk, arsitektur, environment, aturan API, dan workflow Agile. Dokumentasi implementasi tetap di root ini.                                         |
| `.agents`, `.commandcode`, `skills-lock.json` | Skill repo, symlink agent, dan metadata instalasi; bukan kode runtime.                                                                                           |
| `.husky`, `commitlint.config.cjs`             | Gate lint/type-check sebelum commit dan Conventional Commits.                                                                                                    |
| Root manifests                                | Bun workspace, lockfile, task Turbo, ignore untuk env/output. Tidak ditemukan workflow CI pada inventaris repo.                                                  |
| `LICENSE`, `README.md`                        | Lisensi dan petunjuk mulai cepat.                                                                                                                                |

## Architecture and Boundaries

- API memiliki database, otorisasi, dan logika domain. `createApp` yang direncanakan harus menerima dependensi tanpa membuka port/pool saat diimpor.
- `@repo/auth/server` memiliki factory konfigurasi auth, adapter/helper server dan hasher; API memberikan database, policy identitas admin, serta env rahasia. `@repo/auth/client` menerima konfigurasi publik dari web. Tipe bersama memakai `import type`.
- Drizzle/schema/migrasi tetap di API. Prioritas driver adalah `drizzle-orm/bun-sql`; kompatibilitas harus dibuktikan sebelum alternatif dipilih.
- Eden Treaty dipilih untuk endpoint aplikasi. Better Auth menggunakan client tersendiri; handler raw yang di-mount tidak otomatis menjadi kontrak Eden.
- Satu Scalar harus menggabungkan schema Elysia dan Better Auth. Generasi schema dilakukan saat bootstrap dan menggunakan instance auth yang sama.
- Web boleh menyediakan gateway HTTP same-origin dan pemeriksaan sesi SSR; keputusan hak admin tetap di API. Tidak ada database atau auth server kedua di web.

## Runtime and Data Flow

**Saat ini:** root Turbo menjalankan API pada port default 3001 dan web pada 3000. API langsung memanggil `.listen()`; halaman web tidak memanggil API/auth. Web membuat `QueryClient` melalui `getContext()` per router dan menggunakan integrasi SSR Query.

**Target auth yang direncanakan:** browser → server route web `/api/auth/*` → handler Elysia `/api/auth/*` → Better Auth → Drizzle/Bun SQL → PostgreSQL. Browser → gateway web `/api/admin/session` → endpoint API `/admin/session` → pemeriksaan sesi dan singleton identitas admin. SSR memanggil endpoint yang sama pada upstream API tetap dengan cookie dari request yang sedang diproses.

Gateway mempertahankan origin publik dan semua header `Set-Cookie` yang diperlukan. URL internal API bukan URL browser. Ini usulan implementasi keputusan same-origin, belum kode yang berjalan.

## Domain and Data Model

Belum ada schema atau migrasi database dalam repo. Dokumen Environment mencatat database development telah dibuat dan koneksi Bun SQL diverifikasi pada 1 Oktober 2026; koneksi/tabel tidak diperiksa ulang pada sesi planning ini dan tidak membuktikan kompatibilitas Drizzle/Better Auth.

Rencana memerlukan tabel Better Auth yang dihasilkan dari konfigurasi aktual: user, credential account, session, verification, serta rate limit bila storage database diaktifkan. API juga memiliki tabel singleton `admin_identity` dengan ID tetap, referensi unik ke user, dan constraint database. Identitas admin berdasarkan user ID; bukan email dari request atau sekadar keberadaan sesi. Nama/properti persis schema auth mengikuti generator versi yang dipilih.

## External Integrations

| Integrasi                  | Status                                                       |
| -------------------------- | ------------------------------------------------------------ |
| Better Auth                | Terpasang **1.7.7** di `packages/auth`; belum dikonfigurasi. |
| Elysia                     | Terpasang **1.4.30**; belum ada auth/CORS/OpenAPI plugin.    |
| TanStack Start             | Terpasang **1.168.59**; Nitro preset Bun sudah ada.          |
| PostgreSQL                 | Disiapkan menurut dokumen; tidak diakses pada sesi planning. |
| Drizzle/Eden/OpenAPI       | Belum dideklarasikan dalam manifest app terkait.             |
| R2/S3, FFmpeg, queue media | Direncanakan untuk modul berikutnya; tidak diperlukan auth.  |

Runtime Bun **1.4.2** diverifikasi melalui `/home/bandev/.bun/bin/bun`. Bun tidak ditemukan di PATH shell sesi ini; gunakan binary tersebut dan PATH yang sesuai ketika mengeksekusi task.

## Development, Testing, and Delivery

Perintah root yang ada: `bun run dev`, `bun run lint`, `bun run check-types`, `bun run build`, dan `bun run start`. Lint hanya web, type-check kedua app serta auth, build kedua app. Auth mengekspor sumber TypeScript tanpa task build sendiri. Test API masih placeholder yang gagal.

Standar API menetapkan `bun:test`, test di dekat modul, dan HTTP test melalui `app.handle(new Request(...))` tanpa port. Integrasi PostgreSQL memakai `apps/api/test/integration` dengan database test terpisah; dilarang cleanup destruktif pada database development. Perubahan script/dependency membutuhkan frozen install dan gate relevan. Tidak ada test/build aplikasi yang dijalankan pada sesi planning dokumen ini.

## Constraints and Conventions

- Baca dokumentasi dan script app sebelum perubahan; gunakan Bun untuk seluruh runtime/tooling.
- Pertahankan chaining Elysia, inferensi `App`, lifecycle/scope eksplisit, dan macro `requireAdmin` hanya pada rute privat.
- Rahasia hanya di API; tambahan URL upstream web adalah konfigurasi server, bukan `VITE_*`. Tidak ada password pada argumen CLI/log/artifact.
- `apps/web/src/routeTree.gen.ts` hanya diperbarui generator.
- Gunakan task kecil sesuai `docs/templates/task.md`; keputusan produk lain tetap draft.
- Dokumentasi Turbo bundled telah dibaca untuk aturan env/hash; konfigurasi task saat ini belum diubah.
- Runtime auth/session/gateway harus diuji tanpa bocornya server auth/database ke bundle browser.

## Relevant Active Work

Worktree awal memiliki **`?? docs/design/`** berisi prompt desain. File tersebut adalah pekerjaan yang sudah ada; tidak diubah atau dimasukkan ke scope modul auth. Snapshot tracked bersih sebelum penambahan dokumen rencana. Dokumen Design System masih menyebut Video.js belum dipasang, berbeda dengan manifest/source dan indeks docs; gunakan kode aktual sebagai bukti dan tangani pembaruan teks terkait ketika relevan, tanpa mengubah player pada modul auth.

## Exploration Coverage

Diperiksa: seluruh subsystem root, manifest ketiga workspace, source entry point API/auth/router/Query/root/home web, konfigurasi Vite/Nitro/shadcn/Turbo, env samples tanpa membuka nilai env lokal, ignore/hooks, dokumen PRD/Architecture/Global Rules/Global Workflow/Task Template/Environment/API Development/Design System, versi paket terpasang, serta API/type adapter/hash/credential Better Auth terpasang.

Dokumentasi primer resmi diperiksa untuk Drizzle Bun SQL, adapter/options/session/cookie/rate-limit/OpenAPI Better Auth, integrasi Elysia, dan server routes/functions TanStack Start. Detail komponen player tidak ditelusuri karena tidak terpengaruh. Database nyata, hosting, credential, dan media infrastructure tidak dibaca/dijalankan karena di luar planning. Cakupan cukup untuk menetapkan file, urutan task, dan acceptance criteria; proof kompatibilitas runtime tetap task implementasi pertama.

## Unknowns and Assumptions

- Domain HTTPS/hosting final dan alamat upstream production belum dipilih; local target memakai origin web `http://localhost:3000` dan upstream API `http://localhost:3001`.
- Drizzle stabil tersedia, tetapi transaksi Bun SQL + adapter + migrator belum dibuktikan di repo ini. Spike AUTH-001 wajib menyelesaikannya.
- Email/password dan recovery CLI sudah disepakati; email admin/password sebenarnya diberikan saat provisioning, tanpa ditulis dalam rencana.
- Default operasional yang diusulkan: password 12–128 karakter, sesi maksimum 24 jam tanpa refresh otomatis, cookie cache nonaktif, limiter login 5 percobaan/60 detik per key. Nilai ini perlu dicatat sebagai keputusan implementasi; belum diuji.
- Satu origin berarti gateway web yang bekerja pada dev dan hasil build Bun, bukan hanya proxy dev Vite. Production deployment tetap verifikasi terpisah.

## Evidence Index

Semua path repo berikut terikat pada SHA snapshot di atas; path usulan pada rencana belum ada.

| Bukti                                                                                                       | Klaim                                                                           |
| ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `docs/product/prd.md`, PRD-01/PRD-07; `docs/product/global-rules.md`, GR-01/GR-02                           | Satu admin, tanpa registrasi publik, penonton tanpa login.                      |
| `apps/api/src/index.ts`, `apps/api/package.json`                                                            | Starter membuka port langsung; auth/database/test belum ada.                    |
| `packages/auth/src/{server,client,types}.ts`, `packages/auth/package.json`                                  | Ekspor dasar dan ownership Better Auth; belum ada instance.                     |
| `apps/web/src/{router.tsx,routes/__root.tsx,routes/index.tsx}`                                              | Source router dan halaman saat ini belum melakukan auth.                        |
| `apps/web/src/integrations/tanstack-query/root-provider.tsx`                                                | QueryClient dibuat oleh factory; jangan menyimpan cookie global.                |
| `apps/web/vite.config.ts`, `apps/web/components.json`                                                       | Bun/Nitro, alias dan preset UI web.                                             |
| `docs/guides/api-development.md`, bagian Auth/Lifecycle/Eden/OpenAPI/Unit test                              | Boundary package, guard admin, raw handler, Scalar gabungan, test native Bun.   |
| `docs/guides/environment.md`, `.env.example` kedua app, `turbo.json`                                        | Env aktif/planned dan origin awal dua port.                                     |
| `docs/guides/development-workflow.md`, `docs/templates/task.md`                                             | Modul → story → task kecil; status dan bukti validasi.                          |
| `package.json`, `.husky/`, `.gitignore`                                                                     | Toolchain, gate commit, env lokal tidak dilacak.                                |
| Better Auth terpasang: `dist/api/routes/sign-up.mjs`, `dist/crypto/index.d.mts`; adapter `dist/index.d.mts` | Credential mapping, public hasher, opsi transaksi adapter dengan default false. |

Referensi primer dan versi kandidat tercatat pada [rencana](implementation-plan.md#evidence). Backlog eksekusi ada pada [modul auth](../../tasks/auth.md).
