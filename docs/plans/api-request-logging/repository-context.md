# Repository Context: logging request API

## Snapshot

- Repository: `bayuaji17/vertical-movie-app`.
- Base ref: `main`.
- Base SHA: `4f3c9141017ac85e5e999e3ce72b66c6d45aea30`.
- Analyzed at: `2026-10-06T21:42:06+07:00`.
- Context status: current pada snapshot; periksa freshness sebelum implementasi.
- Scope: rencana logging HTTP memakai `console.log` di `apps/api`, diminta pengguna 6 Oktober 2026. Runtime belum diubah.

## Product and Users

Pengunjung memakai katalog/playback publik; satu admin memakai Better Auth dan endpoint metadata/upload/publication privat. Operator ingin melihat setiap request yang mencapai proses API dan hasilnya pada terminal server. Acuan produk: [PRD](../../product/prd.md), dengan runtime pada [Architecture](../../architecture/overview.md).

## Repository Map

| Subsistem                                     | Peran dan relevansi                                                                     |
| --------------------------------------------- | --------------------------------------------------------------------------------------- |
| `apps/api`                                    | Elysia HTTP, domain/data/storage dan worker; pemilik logging request.                   |
| `apps/web`                                    | TanStack Start, Eden, gateway auth/bisnis; hanya dibaca untuk menentukan batas traffic. |
| `packages/auth`                               | Better Auth server/client/types; auth HTTP dipanggil oleh API.                          |
| `docs`                                        | Spesifikasi, panduan, backlog, plan dan bukti.                                          |
| `scripts`, `.husky`                           | Pemeriksaan dokumentasi dan hook lint/types/Commitlint.                                 |
| `.agents`, `.commandcode`, `skills-lock.json` | Skill dan metadata agent, bukan tempat kode aplikasi.                                   |
| Root manifests/config                         | Bun workspace, Turbo, format dan task lint/types/build.                                 |

## Architecture and Boundaries

`createApp` di `apps/api/src/app.ts` membuat Elysia tanpa listen dan memasang modul dengan method chaining. `apps/api/src/index.ts` membuat resource/database/auth/service, memanggil factory dan listen. `apps/api/src/types.ts` mengekspor kontrak type-only yang dikonsumsi Eden. Logger sebaiknya berupa plugin di `apps/api/src/plugins/logger.ts`, folder yang sudah ada dan file yang sudah direncanakan [API Development](../../guides/api-development.md#struktur-folder-tujuan).

Logging lintas rute memerlukan scope lifecycle global dan registrasi sebelum route/module/OpenAPI. Logging tidak boleh menambah guard admin pada rute publik atau mengubah pemetaan error yang dimiliki modul.

## Runtime and Data Flow

1. Direct request mencapai Elysia, atau browser memakai gateway TanStack Start.
2. Gateway bisnis menghapus prefix `/api`: browser `/api/admin/videos` menjadi API `/admin/videos`. Auth mempertahankan `/api/auth/*`.
3. Elysia melakukan parsing/validasi, otorisasi privat dan handler/service.
4. Error domain/validation dipetakan melalui `createContentErrors`; guard juga dapat langsung mengembalikan status 401/403/503.
5. Auth handler dapat mengembalikan Web Standard `Response`, sehingga status tidak cukup diasumsikan dari default `set.status`.

Startup dan shutdown API sudah memakai console. Pencarian `console.*`, `onRequest` dan `onAfterResponse` pada source tidak menemukan access logging HTTP. Worker dan CLI memiliki log masing-masing.

Gateway dapat menolak request sebelum meneruskannya. Upload part, HLS init/segment dan objek signed lain dapat langsung menuju storage. Traffic tersebut tidak mencapai API dan tidak tercakup logger ini.

## Domain and Data Model

Schema auth/content/media/job tidak perlu berubah. `errorDto` dan `authError` saat ini membuat `error.requestId` sendiri. ID korelasi log akan bersifat internal; penyatuan dengan error DTO/header bukan bagian plan ini.

## External Integrations

PostgreSQL/Bun SQL/Drizzle, Better Auth, MinIO/R2 dan FFmpeg tetap memakai integrasi existing. Tidak ada library logging, storage log, collector atau layanan eksternal baru. Paket Elysia terpasang pada API adalah `1.4.30`; Bun terverifikasi `1.4.2`.

## Development, Testing, and Delivery

`apps/api/package.json` menyediakan `test` = `bun test ./src`. `app.test.ts` dan test modul memakai `app.handle(new Request(...))` tanpa membuka port. Logger harus menerima dependency output/waktu untuk test yang deterministik. Source Elysia terpasang menjadwalkan `afterResponse` melalui callback asynchronous; test perlu menunggu event completion secara eksplisit.

Gate implementasi: API tests, root check-types/lint/build, docs:check dan diff check; lint saat ini hanya web. Tidak ada kebutuhan schema migration atau integrasi PostgreSQL/storage/FFmpeg baru untuk logger. Ikuti [workflow](../../guides/development-workflow.md) dan commit tiap task setelah criteria/checks lulus.

## Constraints and Conventions

- Pengguna meminta plan; implementasi menunggu persetujuan scope.
- Gunakan Bun, `console.log`, chaining dan plugin bernama dengan scope global; jangan menghapus inferensi kontrak Eden.
- Tidak membaca body/response stream demi logging dan tidak mencetak header/query/credential.
- Dokumentasi hanya pada kategori root docs sesuai `AGENTS.md`.
- Pertahankan semua perubahan worktree existing; push/PR/merge/deploy tidak diotorisasi.

## Relevant Active Work

Worktree berisi perubahan existing pada desain, indeks docs dan plan/backlog build web, serta artefak desain untracked. Source relevan API/gateway/auth tidak berbeda dari HEAD saat diperiksa. Indeks docs akan ditambah secara terbatas tanpa menimpa pekerjaan tersebut.

## Exploration Coverage

Dibaca: indeks docs, AGENTS, manifest root/API, API guide, workflow/template, PRD/architecture terkait, factory/bootstrap/error/guard/DTO, kontrak types, app tests, gateway web, hook/checker dan source lifecycle Elysia terpasang. Tidak mendalami query/schema/transcoding/UI karena logger tidak mengubah domain, playback atau media processing. Bukti cukup untuk menetapkan titik integrasi dan matriks lifecycle; proof perilaku logger tetap task implementasi.

## Unknowns and Assumptions

- Format JSON satu baris dan dua event per request merupakan proposal untuk direview pengguna.
- Status akhir dan coverage error/404/early response perlu dibuktikan pada Elysia terpasang; tidak dianggap terverifikasi hanya dari docs upstream.
- `durationMs` adalah waktu proses API sampai hook completion; bukan durasi transfer storage atau jaminan semua byte diterima client.
- Cara membaca/menyimpan stdout production mengikuti process manager deployment yang digunakan; belum diasumsikan ada konfigurasi journald/Docker tertentu.

## Evidence Index

Semua path berikut ditelusuri pada base SHA di atas; dependency terpasang merupakan evidence lokal tambahan.

| Bukti                                                                                                            | Kesimpulan                                                                         |
| ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `apps/api/src/app.ts`: `createApp`, `createAuthRoutes`                                                           | Factory tanpa listen, komposisi static, auth Response dan pemasangan OpenAPI.      |
| `apps/api/src/index.ts`: bootstrap, `shutdown`                                                                   | Resource/listen, console startup/shutdown, tanpa access logger.                    |
| `apps/api/src/plugins/errors.ts`: `createContentErrors`                                                          | Error scoped dan status domain/validation harus dipertahankan.                     |
| `apps/api/src/modules/auth/admin/guard.ts`: `createRequireAdmin`                                                 | Early rejection dan auth error ID existing.                                        |
| `apps/api/src/shared/content-error.ts`: `errorDto`                                                               | Request ID error saat ini dibuat terpisah.                                         |
| `apps/api/src/app.test.ts`, `apps/api/package.json`                                                              | Native HTTP tests tanpa port dan API suite.                                        |
| `apps/web/src/lib/server/auth-gateway.ts`: `createAuthGateway`                                                   | Prefix bisnis, rejection sebelum upstream dan allowlist headers.                   |
| `apps/web/src/lib/server/business-gateway.ts`: `businessRequestTimeoutMs`                                        | Request pemrosesan poster memiliki timeout gateway 30 detik.                       |
| `apps/api/src/modules/playback/index.ts`, PRD                                                                    | Route playlist API dan objek media langsung dari storage.                          |
| `apps/api/node_modules/elysia/package.json`, `dist/compose.mjs`                                                  | Versi 1.4.30, hook afterResponse asynchronous dan variasi nilai response.          |
| [Lifecycle resmi Elysia](https://elysiajs.com/essential/life-cycle), [llms index](https://elysiajs.com/llms.txt) | Request hook dan after-response hook; pendukung desain, bukan proof runtime lokal. |

Plan: [Implementation Plan](implementation-plan.md). Backlog: [API Request Logging](../../tasks/api-request-logging.md).
