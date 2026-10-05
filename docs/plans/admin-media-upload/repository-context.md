# Repository context: admin media upload

## Snapshot

- Repository: `bayuaji17/vertical-movie-app`; GitHub connector mengonfirmasi repository dan default branch `main`.
- Base ref: `main`; base SHA: `d8417249de99611e1a661ade03bb4b03dd5f0538`.
- Dianalisis: 2026-10-05T10:34:12Z; tanggal lokal 5 Oktober 2026.
- Status context: current pada snapshot tersebut; perlu recheck sebelum implementasi.
- Remote `refs/heads/main`, local HEAD dan `origin/main` sama pada SHA di atas saat pemeriksaan.
- Branch planning: `chore/admin-media-upload-plan`, dibuat dari snapshot terverifikasi.
- Permintaan: pengguna meminta plan detail Upload Media setelah dashboard metadata di-merge lewat PR #6. Permintaan ini belum mengotorisasi implementasi runtime atau delivery remote branch baru. Commit task planning lokal mengikuti standing workflow pengguna.

## Product and users

Satu admin mengelola Film, Standalone dan Series. Dashboard metadata sudah tersedia melalui Eden/TanStack Query. Iterasi berikutnya menyediakan upload source/sampul dari detail draft: Film/Standalone memiliki source dan poster, Series hanya poster. Season/episode editor dan publication UI adalah iterasi terpisah. Aturan produk tetap dimiliki [PRD](../../product/prd.md), bukan diubah oleh plan ini.

Upload completed, pemrosesan ready dan status editorial adalah tiga hal berbeda. Media diproses oleh worker PostgreSQL/FFmpeg; source asli tidak digunakan streaming. MinIO development dan R2 production dipilih env API; satu bucket tetap privat. Batas/file profile aktif harus mengikuti PRD/current code, termasuk perubahan movie/standalone menjadi 1.500.000.000 byte pada keputusan sebelumnya; jangan menerapkan kembali angka 512 MB dari riwayat percakapan lama.

## Repository map

| Subsystem                                     | Peran dan coverage                                                                                                                                 |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/api`                                    | Elysia, metadata, media upload, PostgreSQL/Drizzle/Bun SQL, storage dan worker. Route/model/service/repository serta upload/job schema ditelusuri. |
| `apps/web`                                    | TanStack Start, gateway same-origin, Eden, Query, dashboard, auth dan Video.js preview. Client/auth/detail/UI config/manifests ditelusuri.         |
| `packages/auth`                               | Better Auth server/client/types; ownership tetap sama, tidak membutuhkan package auth baru. Manifest dan private-cache consumers diperiksa.        |
| `docs`                                        | Spesifikasi, kontrak/runbook, context/plan/backlog, desain; indeks dan dokumen terkait dibaca.                                                     |
| `scripts`, root config, `.husky`              | Docs validator, Turbo/Bun orchestration dan hooks docs/lint/types/Commitlint. Tidak ada penambahan CI dalam scope.                                 |
| `.agents`, `.commandcode`, `skills-lock.json` | Skill/tool metadata milik repository; instructions dibaca, tidak diubah.                                                                           |
| `node_modules`, `dist`, `.output`, `.turbo`   | Dependency/build/cache; bukan source yang di-commit. Bundled Video.js docs dipakai untuk menjaga boundary preview.                                 |

## Architecture and boundaries

- Business API memakai Elysia method chaining dan private requireAdmin. Route membungkus service; repository/storage dependencies eksplisit. Standar implementasi ada pada [API development](../../guides/api-development.md).
- Browser Eden memakai `api/types` type-only melalui `createPrivateApiClient`; `/api/admin/media/*` sudah diizinkan gateway. Gateway body dibatasi 1 MiB dan timeout default 10 detik: kirim JSON control, bukan byte file.
- PUT part harus langsung ke URL storage yang ditandatangani server, memakai transport terpisah tanpa cookie/Authorization aplikasi. Storage failure tidak otomatis berarti sesi Better Auth berakhir.
- Query keys/cache cleanup sudah memiliki prefix `admin` dan identity. Form privat tidak dipersist. Query cancellation belum membatalkan XHR/file hashing milik upload manager; lifecycle upload harus ditambahkan secara eksplisit.
- Shared shell, avatar/theme, metadata form, dialogs dan preview routes tetap digunakan. Tidak membuat shared package kecuali kedua app benar-benar membutuhkan kode yang sama.

## Runtime and data flow

Alur existing: initiate JSON → upload session/assets PostgreSQL dan MultipartStorage → sign satu part → browser PUT langsung → status/ListParts → complete/freeze → aktivasi pointer dan enqueue atomik → worker download/hash/probe/transcode → HLS/WebP verified-ready. Network storage dan FFmpeg berada di luar transaksi.

`MediaService.complete` mengubah pointer source/poster serta menaikkan owner rowVersion melalui `MediaStore.activate`. Karena itu upload selesai di tab lain harus menginvalidasi detail/list tanpa mengganti baseline edit metadata yang masih dirty. Worker dijalankan terpisah dari `bun run dev`, dengan concurrency default 1.

## Domain and data model

| Existing surface                    | Fakta teramati pada snapshot                                                                                                                       |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /admin/media/uploads`         | ownerType/ownerId/kind, filename/contentType/sizeBytes decimal string, UUID idempotencyKey; request hash hanya canonical metadata, bukan isi file. |
| `GET /admin/media/uploads/:id`      | Upload status, parts/bytes/geometry/concurrency/expiry dan processing state/jobState/progressSeconds/attempts/failureCode/verifiedReadyAt.         |
| `POST .../:id/parts`                | partNumber; signed URL atau alreadyUploaded; server mengecek ListParts dan geometry.                                                               |
| `POST .../:id/complete`, `/abort`   | Freeze+enqueue/recovery atau abort; bukan publish.                                                                                                 |
| `upload_sessions`                   | Owner/actor, key/requestHash, filename/geometry/provider uploadId, claim/expiry/state. Belum ada client file fingerprint.                          |
| `media_assets`                      | Owner/provider/bucket/private key, generation/state/sha256/facts/readiness/tombstone. `sha256` dihitung worker dari source yang diunduh.           |
| `VideoDetailDto`, `SeriesDetailDto` | Belum mengekspos owner media inventory atau session ID untuk rediscovery. Video sourceAvailability tidak membuktikan HLS/poster readiness.         |

### Gap yang memengaruhi plan

1. **Rediscovery:** session status membutuhkan ID; detail metadata tidak membawa ID dan tidak ada GET owner-media inventory. Tanpa tambahan read contract, refresh/return/cross-tab hanya bisa bergantung private local persistence atau kehilangan session context. `MediaStore.active`, `sessionForAsset` dan owner pointer menyediakan dasar query server, bukan endpoint yang sudah ada.
2. **Identitas resume:** filename/MIME/size atau ETag bukan proof bahwa file yang dipilih ulang memiliki byte yang sama. Same-size different file bisa mencampur part lama/baru. RequestHash existing bukan file hash. Rekomendasi plan: full-file incremental SHA-256 sebelum initiate, binding server yang additive dan recheck reselection, lalu worker membandingkan digest sebelum transcode. Algoritma browser/dependency dan migration adalah task proof, belum dipilih/ditambahkan sekarang.
3. **Status aman:** status string existing belum enum ketat dan progressSeconds tidak membawa total durasi transcode yang dapat dipercaya. Mapping unknown harus aman; tampilkan processing indeterminate, bukan persentase encode palsu. Unknown ownership/state/readiness tidak boleh mengaktifkan aksi tulis.
4. **Ketersediaan sebelumnya:** upload baru dapat pending/failed sementara source/poster aktif sebelumnya masih ada. Inventory perlu membedakan current asset, pending replacement dan last attempt; tidak memilih hanya latest upload sebagai readiness owner. Sesudah complete, pointer dapat beralih ke aset uploaded yang belum ready; current readiness mengikuti pointer baru, bukan output lama yang bukan current.
5. **Private lifecycle:** private Query cleanup saja tidak menghentikan PUT presigned yang sudah terbit. Auth loss harus stop scheduler/hash/transport dan mengosongkan File/URL memory, tanpa mengklaim signature langsung dicabut.

## External integrations

MinIO loopback API storage port 9000, Console 9001. Browser storage origin harus reachable dan CORS PUT/GET/HEAD/ETag sesuai runbook. Signed URL jangan diganti hostname; API/S3 credentials tetap server env. R2 staging belum terbukti oleh evidence MinIO. Hash proof tidak boleh menganggap S3/R2 ETag sebagai SHA-256.

Shadcn CLI `info --json` teramati: TanStack Start/Tailwind v4/Base UI Rhea/Remixicon, aliases source `#/`, neutral/lime/Inter/Space Grotesk. Card/Button/Field/Alert/AlertDialog/Empty/Skeleton sudah ada; Progress belum ada. Registry tetap `@shadcn` yang terdeteksi; saat implementation, dry-run/diff dari `apps/web`, tidak overwrite preset/tokens.

Video.js installed `@videojs/react`, `@videojs/core`, `@videojs/hlsjs-video` 10.0.0-rc.4; bundled React docs/architecture dibaca. Scope upload tidak menambahkan source player lokal atau mengubah player; tautan preview existing hanya untuk output HLS readiness yang terverifikasi.

## Development, testing, and delivery

Bun 1.4.2+; scripts pada manifests. Unit API lewat `bun:test`/`app.handle`, web mapper/scheduler/client tests lewat harness existing. Dedicated media DB `vertical_movie_app_media_test`; storage proof membuat bucket test acak dan membersihkan hanya fixture. Read runbook sebelum proof karena suite media mereset test DB dan harus serial.

Root gates: docs/format/whitespace untuk planning; implementation memakai relevant tests, check-types, available lint, build, conditional frozen install dan local migration jika schema berubah. Browser proof melalui built Bun/Nitro dan host Playwright. Merged dashboard evidence tetap historis, bukan proof uploader yang belum dibuat. Commit setiap task sesuai [workflow](../../guides/development-workflow.md), tanpa bypass hooks; push/PR/merge branch baru perlu permintaan sendiri.

## Constraints and conventions

Root AGENTS dan docs index berlaku. New canonical planning: `docs/plans/admin-media-upload/`; backlog: `docs/tasks/admin-media-upload.md`. Keep user-approved product specs/contract sebagai current implementation, tandai proposed additions terpisah sampai runtime diterapkan. Jangan mengubah generated route tree manual, bucket aplikasi, env ignored, production DB atau unrelated design work.

## Relevant active work

Dashboard metadata sudah merged di `main` lewat PR #6, SHA snapshot. Existing worktree memiliki 23 file perubahan lokal desain/receipt build; semuanya milik pekerjaan sebelumnya, tidak dianggap bagian planning upload. Indeks docs perlu ditambah secara partial staging agar referensi file desain untracked tidak ikut commit planning. Task media lama sebagian Review/In Progress/Blocked; tidak otomatis dinaikkan oleh plan UI ini.

## Exploration coverage

Tree/manifests/source/DTO/schema/route/gateway/auth cleanup/worker digest/tests/config/product/runbook/desain/hook sudah cukup untuk affected-file/dependency map. Tidak membaca secrets/env aktif, menjalankan reset database/storage/FFmpeg, menginstal dependency, atau mengulang acceptance dashboard. Site settings, catalog, subtitle dan editor episode tidak dianalisis mendalam karena di luar hasil upload tahap ini.

## Unknowns and assumptions

- Full-file hashing browser harus dibuktikan bounded-memory/responsive pada file mendekati limit, khususnya ponsel; tidak membaca 1,5 GB sekaligus dengan arrayBuffer. Dependency incremental hanya setelah gap native/proof tercatat.
- Cross-tab duplicate scheduler butuh best-effort browser lock + server identity/idempotency; tidak menjanjikan lock client sebagai otorisasi atau exactly-once PUT.
- Browser file MIME dapat kosong untuk MKV/MOV; mapping ekstensi allowlist hanya hint untuk initiate, worker tetap memverifikasi file sebenarnya.
- Resume cross-reload direkomendasikan dengan file reselection; semua ID/hash dibaca ulang dari private API, tanpa menyimpan private File/session/form pada localStorage/IndexedDB.
- Request timeout pada freeze tidak membuktikan kegagalan; client harus reconcile status, bukan membuat upload baru otomatis.
- Ada backend support lengkap multipart; small read/identity extensions tetap diperlukan untuk UX recovery. Exact DTO/migration refined sebelum task runtime, bukan implementasi yang sudah tersedia.

## Evidence index

Semua source evidence berikut merujuk base SHA immutable `d8417249de99611e1a661ade03bb4b03dd5f0538`; symbol lebih stabil daripada line ranges.

| Klaim                             | Source/symbol                                                                                                                                                                                                                                                                                      |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Control endpoints/private auth    | `apps/api/src/modules/media/index.ts`, `createMediaModule`; `apps/api/src/modules/media/model.ts`, `UploadDto`/`InitiateUploadBody`.                                                                                                                                                               |
| Geometry/file limits/TTL          | `apps/api/src/modules/media/policy.ts`, `geometry`/`validateUpload`/`partTtl`/`verifyParts`; `apps/api/src/config/storage-env.ts`.                                                                                                                                                                 |
| Idempotency/status/freeze/abort   | `apps/api/src/modules/media/service.ts`, `initiate`/`status`/`part`/`complete`/`abort`.                                                                                                                                                                                                            |
| Owner/session/activation query    | `apps/api/src/modules/media/repository.ts`, `MediaStore.active`/`sessionForAsset`/`activate`; `apps/api/src/db/schema/upload.ts`, `uploadSessions`.                                                                                                                                                |
| Digest/readiness                  | `apps/api/src/workers/runner.ts`, `createJobRunner`; `apps/api/src/db/schema/media.ts`, `mediaAssets`; `apps/api/src/db/schema/jobs.ts`, `mediaJobs`.                                                                                                                                              |
| Preview eligibility authoritative | `apps/api/src/modules/catalog/repository.ts`, `CatalogStore.preview` memakai readiness dan parent/archive; `apps/api/src/modules/playback/service.ts`, `PlaybackService.row` memeriksa profile/output/duration. Inventory perlu reuse/extract unsigned policy, bukan presign playback setiap poll. |
| Metadata has no upload inventory  | `apps/api/src/modules/videos/model.ts`, `VideoDetailDto`; `apps/api/src/modules/series/model.ts`, `SeriesDetailDto`.                                                                                                                                                                               |
| Gateway/Eden/identity cleanup     | `apps/web/src/lib/server/auth-gateway.ts`, `targetPaths`/`createAuthGateway`; `apps/web/src/lib/api/client.ts`; `apps/web/src/lib/auth/session-cache.ts`.                                                                                                                                          |
| Dashboard reuse/baseline          | `apps/web/src/components/admin/content-detail.tsx`; `content-edit.tsx`; `admin-shell.tsx`; `apps/web/src/lib/admin/content-queries.ts`.                                                                                                                                                            |
| Tests/proof entrypoints           | `apps/api/test/integration/media-upload-proof.test.ts`, `media-storage-proof.test.ts`, `media-worker-proof.test.ts`, `media-fixture.ts`; `apps/web/test/auth-browser-smoke.mjs`, `admin-content-browser-worker.mjs`, `media-eden-contract.ts`; app manifests.                                      |
| Product/runtime ownership         | [PRD](../../product/prd.md), [upload contract](../../architecture/media-upload-contract.md), [media runbook](../../operations/media.md), [environment](../../guides/environment.md), [dashboard roadmap](../admin-content/implementation-plan.md#roadmap-setelah-iterasi-1).                       |

Reference official: [Elysia index](https://elysiajs.com/llms.txt) consulted; implementation examples harus diperiksa terhadap versi installed dan [API guide](../../guides/api-development.md). Bundled Video.js docs adalah evidence lokal version-matched, bukan alasan upgrade package. Context ini disimpan **sebelum** implementation plan.
