# Repository context: admin cover processing

## Snapshot

- Repository: `bayuaji17/vertical-movie-app`.
- Base ref: `feat/admin-media-upload`.
- Base SHA / last validated SHA: `06e7ce75e9d3f87bbe501bac054711310e14e5a2`.
- Analyzed at: 2026-10-06, Asia/Jakarta.
- Context status: snapshot source pada SHA di atas; freshness diperiksa ulang sebelum implementasi pada 6 Oktober 2026.
- Persetujuan pengguna 6 Oktober 2026: plan/default disetujui; implementasi lokal dimulai pada branch `feat/admin-cover-processing`.

## Product and users

Satu admin mengelola Film/Standalone source+cover dan Series cover pada detail draft. Publication manual dan preview memerlukan media verified-ready. Pengguna ingin sampul dapat dipangkas menjadi 9:16 dan siap tanpa menjalankan worker media terpisah. Crop tidak mengubah aturan video/HLS.

## Repository map

| Subsystem                                     | Ownership                                                                                                              |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `apps/api`                                    | Elysia, PostgreSQL/Drizzle/Bun SQL, private media controls, Bun S3/SDK multipart, playback/publication, worker FFmpeg. |
| `apps/web`                                    | TanStack Start, Eden/Query, same-origin gateway, admin metadata/uploader, theme, player existing.                      |
| `packages/auth`                               | Better Auth server/client/types; tidak memindahkan secret ke web.                                                      |
| `docs`                                        | Product/architecture/guides/operations/plans/tasks/design canonical; index pada README.                                |
| `scripts`, root manifests                     | Validator docs, Bun/Turbo/Husky/Commitlint; local quality gates.                                                       |
| `.agents`, `.commandcode`, `skills-lock.json` | Installed skills dan metadata, bukan implementasi aplikasi.                                                            |

## Architecture and boundaries

`MediaService.complete` memverifikasi part, freeze original, mengaktifkan pointer/version, enqueue media_job dan menandai session completed. Kedua kind source/poster memakai queue yang sama. `createMediaQueue.claim/recover` belum mempunyai discriminator executor. `createJobRunner` memeriksa fingerprint sebelum FFprobe dan menjalankan FFmpeg untuk poster maupun HLS.

Perubahan server harus memakai service dengan dependency injection; route tetap thin, private requireAdmin/no-store dan inference Eden terjaga. Storage/encode tidak boleh berada dalam transaksi database atau detached promise. Guide saat ini mensyaratkan media tahan restart melalui queue; request processing perlu pengecualian terbatas dengan catatan durable serta recovery yang awaited dan eksplisit.

## Runtime and data flow

Alur saat ini: browser File → Worker SHA → initiate JSON → direct multipart S3 PUT → complete/freeze → job queued → worker decode/transcode → output verified → job succeeded/asset Ready.

Untuk poster, `transcodePoster` mengecek codec/ukuran/frame count, orientasi JPEG, resolusi minimum 1080×1920 dan exact 9:16, lalu WebP 1080×1920 quality 85. Poster berasio lain ditolak; browser belum memiliki crop UI. Worker tidak ikut `bun run dev` dan default concurrency 1 berarti sampul dapat menunggu video.

Business gateway memakai `createAuthGateway('business')`, timeout default 10s. Byte media melewati signed PUT langsung ke bucket; gateway hanya JSON. Request processing baru perlu budget dan recovery tersendiri tanpa memperpanjang timeout auth global.

## Domain and data model

- `upload_sessions`: owner/kind/actor, immutable filename/MIME/size/geometry/hash, status/claim/expiry. Belum ada executor/profile pemrosesan.
- `media_assets`: pointer owner, generation, state, facts, sha256, verifiedReadyAt, readyJobId.
- `media_jobs`: unique(assetId,generation), state, outputPrefix/outputFiles, attempt/lease; tanpa executor discriminator.
- `media_job_attempts`: token/prefix/stoppedAt untuk output provenance dan orphan cleanup.
- Asset readyJobId memiliki composite FK ke job yang sama asset. `CatalogStore` join source+poster ke succeeded jobs; `posterReadiness` memerlukan poster.webp pada prefix outputs/asset/job/attempt.

Menghapus seluruh catatan pemrosesan poster akan merusak readiness/catalog/publication. Rencana harus mempertahankan provenance meskipun executor poster baru adalah request API. Mode persisten diperlukan agar worker tidak mengambil processing request dan agar session lama tidak berubah semantik setelah upgrade.

## External integrations and native feasibility

- Bun runtime dan bun-types lokal 1.4.2. Native S3 membaca/menulis file; SDK mengelola explicit multipart/freeze.
- Dokumentasi resmi [Bun.Image](https://bun.sh/docs/runtime/image) dan typings lokal `Bun.Image.ResizeOptions` mendukung fill/inside, resize, WebP, metadata/maxPixels/autoOrient dan awaited terminals off JS thread. Tidak ada crop/extract/fit cover pada versi ini.
- ACOV-002 memverifikasi bahwa metadata native hanya melaporkan width/height/format. APNG dua frame pada fixture proof terbaca sebagai `format: png`; GIF dua frame juga memberi metadata still tanpa frame count. Bun mengonversi APNG/GIF ke still PNG. [Contoh animasi WebP resmi](https://www.gstatic.com/webp/animated/1.webp) memuat 100 ANMF frames: metadata memberi `300×225/webp`, tetapi terminal transcode menolak `ERR_IMAGE_DECODE_FAILED`. Karena perilaku native sendiri tidak cukup untuk menolak animasi, UI memeriksa marker APNG/WebP pada original sebelum crop dan API memeriksa agar payload crop PNG/WebP statis.
- Read-only proof pada sesi sebelum planning: PNG 1070×1470 → inside 90×160 menghasilkan WebP 90×124, 1800 byte; fit cover ditolak ERR_INVALID_ARG_TYPE. Prototype tidak mempunyai crop/extract. Hasil ini membuktikan resize/encode, belum parity validasi FFmpeg, pixel fidelity, cancellation atau crop UI.
- Historical read-only proof sebelum plan hanya menguji resize/encode dasar dan belum mencakup parity animasi atau damaged file. ACOV-002 kemudian menguji fixture APNG/GIF, contoh WebP animasi, mismatch MIME, pixel limit dan JPEG terpotong; hasilnya mendukung pemeriksaan container terbatas pada ACOV-004/006, bukan klaim bahwa Bun metadata sendiri membuktikan gambar statis.
- Crop dapat dilakukan memakai Canvas [drawImage](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage); UI/raster/result MIME serta batas perangkat harus dibuktikan saat implementasi.

## Development, testing and delivery

Ikuti root AGENTS, workflow, API guide dan template task. Native Bun tests di dekat API module; integration PostgreSQL/MinIO memakai dedicated media_test/random bucket, serial. Schema berubah harus generated/reviewed/applied development setelah backup dan preservation; production terpisah.

Commit tiap task setelah AC/checks lulus. Branch implementasi dimulai dari planning commit; perubahan source sebelum proof tetap sama dengan snapshot SHA. Production migration dan remote delivery terpisah.

## Constraints and conventions

Sumber video dan player existing tetap; jangan edit routeTree.gen. Tidak menambah Sharp atau dependency server image lain sebelum native gap dibuktikan. File/Blob/URL/encoding candidates tetap memory privat, bukan Query/persistence; signed URLs tidak masuk DTO/cache/log. Crop hanya setelah admin menyetujui preview; input animasi ditolak dan area crop kecil tidak di-upscale.

## Relevant active work

ADUP-001–015 telah implemented/verified lokal pada base SHA; belum ada push/PR/merge untuk branch ini. Ada 23 tracked/untracked paths unrelated, termasuk design-system artifacts dan README partial changes; snapshot preservation disimpan ignored sebelum plan. Hanya artifacts feature/index dimasukkan task planning.

## Exploration coverage

Dibaca: index/workflow/API guide/template/product; media route/model/service/repository/policy/schema; worker queue/runner/transcode/cleanup; readiness/catalog; storage factory/bootstrap; web client/file/manager/card/dialog/gateway; manifests/types/native proof. Player/auth internals/production provisioning tidak diubah karena target hanya cover crop/request processing.

## Unknowns and assumptions

Native image parity untuk animated/corrupt/EXIF/alpha serta browser raster size perlu proof. API deadline bukan hard cancellation native terminal; limiter tidak boleh melepaskan slot sebelum terminal settle. Crop hasil minimum 1080×1920 tanpa upscale serta refresh handling cropped payload akan diajukan jelas pada plan. Browser original yang tidak dikirim ke server tidak dapat dianggap diverifikasi server.

## Evidence index

Semua path berikut diamati pada base SHA di atas; symbol stabil dipakai sebagai evidence locator.

| Claim                                       | Path / symbol                                                                                                                                       |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Worker diperlukan oleh flow poster existing | `apps/api/src/modules/media/service.ts`: complete; `repository.ts`: enqueue.                                                                        |
| Poster verification dan output              | `apps/api/src/workers/runner.ts`: createJobRunner; `transcode.ts`: transcodePoster.                                                                 |
| Executor belum dipisahkan                   | `apps/api/src/workers/queue.ts`: claim/recover; `src/db/schema/jobs.ts`: mediaJobs.                                                                 |
| Ready provenance wajib                      | `apps/api/src/db/schema/media.ts`: readyJobId FK; `shared/media-readiness.ts`: posterReadiness; `modules/catalog/repository.ts`: ready/query.       |
| Original identity immutable                 | `apps/api/src/db/schema/upload.ts`: uploadSessions; media service initiate/complete.                                                                |
| Cover limit dan validation hint             | `apps/api/src/modules/media/policy.ts`: uploadLimit/validateUpload; `apps/web/src/lib/admin/media-file.ts`: describeMediaFile/verifyReselectedFile. |
| Browser lifecycle/mutations                 | `apps/web/src/lib/admin/upload-manager.ts`, `use-upload-manager.ts`, `media-queries.ts`; components media-upload-card/media-panel.                  |
| Gateway JSON/10s timeout                    | `apps/web/src/lib/server/business-gateway.ts`: createBusinessGateway; auth-gateway.ts: createAuthGateway.                                           |
| Native runtime/version                      | Root package.json; installed bun-types 1.4.2 Bun.Image declarations; live bun --version/native probe.                                               |
| Product source/output constraints           | `docs/product/prd.md`: Sumber video dan sampul; `docs/architecture/media-upload-contract.md`; `docs/operations/media.md`.                           |
