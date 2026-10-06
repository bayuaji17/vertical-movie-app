# Repository context: admin publication

## Snapshot

- Repository: `bayuaji17/vertical-movie-app`; origin `https://github.com/bayuaji17/vertical-movie-app.git`.
- Base ref: `feat/api-request-logging`.
- Base SHA: `313e31a14891ac0f91265a3557576b44791309d7`.
- Analyzed at: `2026-10-07T01:34:37+07:00` (Asia/Jakarta).
- Context status: **current** untuk source tracked pada SHA tersebut; belum ada implementasi admin publication baru.
- Permintaan pengguna 7 Oktober 2026: menyetujui prioritas Publish & Archive untuk Film/Standalone dan meminta plan detail. Approval ini mencakup planning; detail plan/desain/runtime belum dinyatakan disetujui atau selesai.
- Dokumen ini disimpan sebelum [implementation plan](implementation-plan.md). Evidence material memakai simbol source pada base SHA; dokumen/worktree lokal yang belum committed dibedakan di bawah.

## Product and users

[PRD](../../product/prd.md) menetapkan satu admin email/password serta pengunjung tanpa login. Lifecycle video adalah draft → published → archived. Movie di API ditampilkan sebagai Film; Standalone adalah video mandiri. Series/season/episode sudah mempunyai kontrak backend, tetapi editor/frontend publikasinya bukan scope iterasi ini.

Target pengguna adalah menyelesaikan draft metadata → upload source/cover → processing → preview → publish manual → archive melalui dashboard. Upload complete, media Ready, izin Preview dan status editorial adalah keadaan berbeda. Syarat publish tidak boleh ditebak hanya dari `canPreview`, `sourceAvailability` atau badge Ready.

Keputusan readiness, rights, retensi dan expiry berasal dari [PRD](../../product/prd.md#publikasi-akses-dan-cache), [aturan produk](../../product/global-rules.md) serta [runbook media](../../operations/media.md). Subtitle opsional; restore/republish/source replacement published belum tersedia. Archive menghentikan akses/URL baru; URL lama berlaku sampai expiry dan buffer tidak dapat ditarik kembali.

## Repository map

| Subsistem                                       | Peran dan relevansi                                                                                                         |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `apps/api/`                                     | Elysia factory/bootstrap, metadata, publication, katalog, playback, storage dan worker. Source utama policy dan readiness.  |
| `apps/web/`                                     | TanStack Start/Router/Query, Eden, shadcn Base UI, metadata dashboard/uploader dan player. Tempat integrasi aksi publikasi. |
| `packages/auth/`                                | Better Auth dengan entry server/client/types. Dipakai guard existing; tidak memerlukan fitur auth baru.                     |
| `docs/`                                         | Produk, arsitektur, guides, runbook, desain dan backlog canonical. Dokumen baru mengikuti kategori root.                    |
| `scripts/`                                      | Validator dokumentasi. Tidak perlu script runtime baru untuk planning.                                                      |
| `.agents/`, `.commandcode/`, `skills-lock.json` | Skill repository dan metadata instalasi. Tidak diubah oleh modul ini.                                                       |
| `.husky/`, `commitlint.config.cjs`              | Hook docs/lint/types dan Conventional Commits. Local task commit sudah diotorisasi workflow pengguna.                       |
| Root manifests, `bun.lock`, `turbo.json`        | Bun ≥1.4.2, workspaces dan quality gates. Tidak ada dependency/pipeline baru yang terbukti diperlukan.                      |

## Architecture and boundaries

- `apps/api/src/app.ts:createApp` memasang modul metadata, media, catalog, publication dan playback sebelum Scalar; tidak membuka port. `apps/api/src/index.ts` menyuntikkan DB/service/storage/auth dan callback invalidation lalu listen.
- `apps/api/src/modules/publication/index.ts:createPublicationModule` memasang `requireAdmin`, strict body dan private no-store. Handler meneruskan domain command ke `PublicationService.publish`.
- Archive video dimiliki `apps/api/src/modules/videos/{index,service}.ts`, bukan route pada publication module. Summary OpenAPI existing masih berbunyi “Archive draft content”, sedangkan `VideosService.archive` mendukung published juga; koreksi summary merupakan target implementasi.
- Web mengimpor `App` secara type-only dari `api/types` melalui `apps/web/src/lib/api/client.ts`. Semua business request browser melewati same-origin `/api`; gateway menghapus prefix sebelum API. Tidak memasukkan server/schema/config/secrets ke bundle browser.
- `createPrivateApiClient` menerapkan recheck sesi pada 401/403/5xx. Metadata/media/readiness/mutation cache harus tetap terkait identity admin dan dibersihkan oleh lifecycle auth existing.
- FFmpeg, upload multipart, signing, retensi dan provider tidak dipindahkan ke request publikasi. Publish/archive mengubah row/database, bukan ACL bucket atau lokasi HLS.

## Runtime and data flow

### Alur yang sudah tersedia

1. List/detail/edit draft di `/admin/content/:type/:id` memakai `ContentResource`, `ContentDetailView` dan `createContentClient`.
2. `OwnerMediaPanel` memakai inventory `GET /admin/media/owners/video/:ownerId`, uploader lokal dan Query polling. Inventory memberi `rowVersion`, `status`, `canUpload`, `canPreview`, source/poster serta aturan upload; tidak memberi `canPublish` atau checklist publication.
3. `canPreview` dihitung melalui `CatalogStore.preview`, `playbackReadiness` dan `posterReadiness`, terpisah dari metadata/rights/upload-busy publish checks.
4. Preview existing `/admin/videos/:id/preview` meminta private playback dan merender player. Route ini belum mempunyai navigasi kembali ke detail konten yang eksplisit.
5. API publish/archive tersedia, tetapi `createContentClient` hanya mempunyai list/genres/detail/create/patch. `ContentDetailView` belum mempunyai aksi publish/archive; `ContentActions` di list hanya View/Edit.

### Publikasi backend

`PublicationService.publish(type,id,input,actor)` membaca persistent operation `(actorId,idempotencyKey)`, mencocokkan hash action/type/id/expectedVersion, mengambil parent/owner locks dan memeriksa replay lagi setelah lock. Publish memerlukan draft aktif, version sesuai, title/synopsis trim tidak kosong, tanpa upload berstatus initializing/pending/completing/aborting, serta media/rights/durasi sah. Mutasi dan penyimpanan result idempotent berada dalam satu transaksi; invalidation dipanggil sesudah commit.

Untuk video, `CatalogStore.readyForPublish` memakai predicate SQL source/poster/job current-generation ready. Service juga memerlukan `rightsConfirmedAt` dan `rightsConfirmedBy` serta durasi integer aman 1–1.800.000 ms untuk movie/standalone, 1–600.000 ms untuk episode. Source bytes yang sudah dihapus oleh retensi tidak menghalangi metadata/provenance siap.

Untuk series, service mensyaratkan poster dan minimal satu episode published-playable. Perilaku ini menjadi regression boundary saat mengekstrak policy video, bukan fitur UI iterasi ini.

### Archive backend

`VideosService.archive` mengambil owner lock, memeriksa `expectedVersion`, mengembalikan row existing bila archived dan version masih sesuai, atau menulis archived/timestamp/actor/version+1. `publishedAt` dikosongkan; `firstPublishedAt` tetap. Invalidation sesudah commit. Stale version mendapat 409 termasuk pengulangan memakai version sebelum archive. Request archive tidak menerima `idempotencyKey` dan tidak memakai persistent operation publish.

API juga dapat archive draft dan mempunyai aturan parent episode. Proposal UI iterasi pertama menampilkan Archive hanya pada Film/Standalone published aktif; kontrak API draft/episode tidak dihapus atau diperluas.

## Domain and data model

| Kontrak/owner             | Fakta source pada base SHA                                                                                                          | Implikasi plan                                                                                         |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `PublishBody`             | `{ expectedVersion, idempotencyKey: UUID }`, unknown fields ditolak.                                                                | Buat key sekali per intent; exact payload dipertahankan untuk explicit replay.                         |
| `PublicationDto`          | id, published status, rowVersion, publishedAt, firstPublishedAt. Bukan VideoDetailDto penuh.                                        | Jangan memasukkan result parsial sebagai detail metadata; refetch current state setelah sukses/replay. |
| `ArchiveBody`, `VideoDto` | Archive memakai expectedVersion dan menghasilkan metadata video tanpa semua field detail hierarchy.                                 | Response validation berbeda dari publish; current detail tetap direfresh.                              |
| `content_operations`      | Unique actorId + idempotencyKey; satu FK owner video/series; result JSON dan request hash persisten.                                | Key bukan sekadar per-video; ganti payload/type/version berarti intent baru.                           |
| Inventory media           | Current pointers, session/processing, canUpload/canPreview dan rowVersion.                                                          | Reuse untuk Preview/status; perlu GET publication readiness tambahan.                                  |
| Video/asset/job           | Editorial rowVersion dapat berubah akibat upload completion; media/job readiness juga dapat berubah tanpa rowVersion metadata baru. | Cache/freshness tidak cukup berdasarkan rowVersion; POST selalu validasi ulang dalam transaksi.        |
| `sourceAvailability`      | not_uploaded/available/deleting/deleted.                                                                                            | Tidak sama dengan readiness HLS; retained/deleted original dapat tetap publish.                        |

Data readiness yang diusulkan bersifat DTO dari state yang sudah ada; tidak membutuhkan kolom preview acknowledgement, tabel baru, migration atau env baru. Ini inferensi desain dari kontrak yang diperiksa, belum hasil runtime proof.

## External integrations

PostgreSQL/Drizzle Bun SQL menyimpan metadata/aset/job/operation. MinIO dipakai untuk development; R2 production tetap gerbang verifikasi terpisah. Storage dan worker existing diperlukan untuk acceptance publish-to-playback, tetapi GET readiness yang direncanakan membaca state DB tanpa HEAD/sign/transcode.

Playback memeriksa readiness dan profile storage lebih jauh daripada boolean publikasi. Karena itu UI harus menjaga Preview tersedia sebagai prasyarat workflow manual, sambil menjelaskan bahwa checklist publikasi adalah snapshot server. Tidak ada bukti server bahwa admin sudah menonton preview; jangan mengklaim checkbox UI sebagai audit preview persisten.

## Development, testing, and delivery

- Root scripts: `bun run docs:check`, `bun run check-types`, `bun run lint`, `bun run build`. Lint hanya web; types API/web/auth dan build API/web.
- API tests memakai `bun test ./src` dari `apps/api`, `app.handle` dan injected dependencies. Real PostgreSQL/storage/FFmpeg memakai `apps/api/test/integration/` dengan DB/bucket dedicated.
- Existing evidence anchors: `media-series-proof.test.ts` (publish/visibility/retention), `media-upload-proof.test.ts` (inventory/fingerprint/preview), `content-http-proof.test.ts` dan `videos/index.test.ts` (guard/schema/metadata/archive). Matrix seluruh race belum dapat dianggap selesai dari evidence historis.
- Web anchors: `admin-content-client.test.ts`, `admin-content-list.test.ts`, `admin-content-form.test.ts`, `admin-media-client.test.ts`, `admin-media-state.test.ts`, Eden compile fixtures serta `auth-import-boundary-proof.mjs`.
- Browser harness: `apps/web/test/admin-content-browser-worker.mjs`, `admin-media-upload-browser-worker.mjs`, `apps/api/test/integration/admin-media-browser-fixture.ts` dan `apps/web/test/admin-media-fixture.ts`. API media fixture belum menyuntikkan publication/catalog ke alur admin publikasi; rencanakan wiring atau fixture terpisah dengan cleanup yang sama.
- Bun shell awal tidak berada pada PATH; executable `/home/bandev/.bun/bin/bun` diverifikasi versi **1.4.2** pada sesi planning. Gunakan PATH yang benar untuk gates/hooks.
- Dokumentasi-only memerlukan docs validation, Prettier dan whitespace check; hook commit menambahkan lint/type checks. Test/build/runtime/migration tidak dijalankan hanya untuk menyatakan rencana selesai.

## Constraints and conventions

Root [AGENTS.md](../../../AGENTS.md), [workflow](../../guides/development-workflow.md), [API guide](../../guides/api-development.md) dan [task template](../../templates/task.md) berlaku. Branch documentation `chore/<slug>`; runtime `feat/<slug>` setelah implementasi diotorisasi dan freshness dicek. Commit per task, Conventional Commit + ID; push/PR/merge/deploy tetap otorisasi tersendiri.

UI mempertahankan shell, pagination, light/dark/System, token source `apps/web/src/styles.css`, Base UI dan English copy berdasarkan [desktop](../../design/admin-content-desktop-light.md), [mobile](../../design/admin-content-mobile.md) serta [upload design](../../design/admin-media-upload.md). Dokumen design-system tracked masih historis draft; versi lokal final sedang dirty. Jangan memasukkan aset/desain unrelated sebagai bagian commit plan ini.

Tidak mengedit `routeTree.gen.ts` manual. Skill shadcn berlaku saat menyentuh komponennya; skill videojs/instruksi bundled player harus dibaca bila implementasi menyentuh preview/playback. Planning ini hanya membaca kontrak/navigation; tidak mengubah player.

## Relevant active work

HEAD berada pada `feat/api-request-logging`, dengan APILOG-001–003 completed lokal sesuai ledger. Status remote tidak disimpulkan dari local log; planning tidak melakukan push/pull/merge.

Worktree awal memiliki **23 path** modified/untracked: indeks docs, design system/exports/rasters/backlog desain, serta receipt plan/task build web. Source aplikasi yang dianalisis tidak dirty. Content hash 23 path dicatat untuk preservation; indeks boleh mendapat navigasi baru, sementara 22 path lain tidak disentuh. Commit indeks harus memuat hanya penambahan milik admin publication, bukan perubahan desain lokal yang telah ada.

## Exploration coverage

Inspected: root instructions/index/manifests/hooks, PRD/GR/workflow/API guide/template, media runbook/data model, desain dashboard/uploader, API composition/bootstrap/DTO/schema/publish/archive/catalog/inventory/playback, web client/cache/auth transition/detail/list/preview/uploader registry, relevant suite/fixture entry points. Semua top-level subsistem diklasifikasikan; penelusuran mendalam dibatasi pada jalur publication.

Excluded intentionally: env credential values, database development rows, bucket live objects, remote GitHub state, production infra, worker benchmark, subtitle/settings/catalog UX baru. Tidak diperlukan untuk menjelaskan gap UI dan menyusun plan berbasis kontrak source.

Tidak ada test runtime atau browser baru yang dijalankan pada tahap eksplorasi. Evidence historis tidak dinaikkan menjadi verifikasi baru.

## Unknowns and assumptions

- Proposal pilihan UI: actions hanya pada detail, archive hanya published, konfirmasi publish dengan acknowledgement preview lokal dan tanpa bulk actions. Pengguna menyetujui prioritas fitur; detail ini menunggu review plan/desain.
- Shared readiness assessment harus mempertahankan predicate publish existing dan menggunakan `CatalogStore.readyForPublish` untuk media; rincian source/HLS/cover tetap inventory, bukan evaluator alternatif di browser.
- Refactor service DB membutuhkan dependency seam nyata agar policy/domain dapat diuji tanpa PostgreSQL; hindari abstract layer yang tidak diperlukan oleh shared read/write assessment.
- Belum diketahui apakah test environment PG/MinIO/browser tersedia saat implementasi. Kemampuan lokal sebelumnya tidak menjamin readiness saat itu; recheck sebelum task integrasi.
- Archive recovery dapat memastikan state akhir melalui GET; tidak dapat membuktikan request browser ini yang menyebabkan state akhir tanpa persistent operation archive. UI harus mengatakan “Content is archived”, bukan membuat klaim atribusi request.

## Evidence index

Semua source tracked berikut diperiksa pada `313e31a14891ac0f91265a3557576b44791309d7`; path/simbol lebih tahan perubahan daripada nomor baris.

| Klaim                               | Path/simbol evidence                                                                                                                                                                            |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Routes/composition/type-only        | `apps/api/src/app.ts:createApp`, `src/index.ts`, `src/types.ts`; `apps/web/src/lib/api/client.ts:createPrivateApiClient`.                                                                       |
| Publish lock/replay/policy/commit   | `apps/api/src/modules/publication/{index,model,service}.ts:PublishBody, PublicationService.publish`.                                                                                            |
| Media ready versus preview          | `apps/api/src/modules/catalog/repository.ts:ready, readyForPublish, preview`; `apps/api/src/modules/media/service.ts:ownerMedia`; `apps/api/src/shared/media-readiness.ts`.                     |
| Archive version/preservation        | `apps/api/src/modules/videos/{index,model,service}.ts:VideosService.archive`; `apps/api/src/shared/content-error.ts`.                                                                           |
| Persistent key scope/schema         | `apps/api/src/db/schema/operations.ts:contentOperations`.                                                                                                                                       |
| UI actions belum tersedia           | `apps/web/src/components/admin/{content-detail,content-list,media-panel}.tsx`; `apps/web/src/lib/admin/content-client.ts:createContentClient`.                                                  |
| Identity/cache/auth                 | `apps/web/src/lib/admin/{content-queries,media-queries,use-content-api,use-upload-manager,upload-session-registry}.ts`; `apps/web/src/lib/auth/{transitions,session-cache,private-effects}.ts`. |
| Preview/public contracts            | `apps/web/src/routes/admin._authenticated.videos.$id.preview.tsx`, `watch.$slug.tsx`; `apps/api/src/modules/playback/{index,service}.ts`.                                                       |
| Existing test seams/evidence limits | Suite dan harness pada Development, testing, and delivery; `docs/tasks/media-publication.md`, `docs/operations/media.md`.                                                                       |
| Product/scope/design                | `docs/product/{prd,global-rules}.md`, `docs/design/{admin-content-desktop-light,admin-content-mobile,admin-media-upload}.md`. Versi final design-system lokal adalah overlay terpisah.          |

## Freshness

Valid pada base SHA untuk source yang dianalisis. Pada 7 Oktober 2026 sebelum APUB-002, target `4cf00a97dffe9568a966f8889ae798fed3acdb17` direvalidasi: diff base→target hanya empat dokumen planning, dan worktree source aplikasi/packages/root runtime config tidak berubah. Pengguna telah menyetujui plan; desain APUB-002 baru masih menunggu review visual. Snapshot kode di atas tetap current, bukan diganti oleh status eksekusi/desain.

Sebelum APUB-003–013, resolve target ref dan diff seluruh affected source/test/docs dependency terhadap base. Perubahan hanya pada dokumen planning/receipt tidak otomatis membuat plan stale; perubahan policy/routes/schema/auth/cache/design harus ditinjau dan dicatat pada validation history plan.
