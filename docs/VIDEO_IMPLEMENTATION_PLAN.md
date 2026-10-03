# Implementation Plan — Video, Series, dan Movie

## Plan Metadata

- Status: **executing** — draft metadata disetujui pengguna 3 Oktober 2026.
- Repository: `bayuaji17/vertical-movie-app`.
- Base ref: `main`.
- Base SHA: `d1d3e0a36a4adf1c7198db7a1d36c49e9f1c93ed`.
- Context: [VIDEO_REPOSITORY_CONTEXT.md](VIDEO_REPOSITORY_CONTEXT.md).
- Data model: [VIDEO_DATA_MODEL.md](VIDEO_DATA_MODEL.md).
- Task backlog: [tasks/videos.md](tasks/videos.md).
- Last validated SHA: `d1d3e0a36a4adf1c7198db7a1d36c49e9f1c93ed` untuk evidence kode planning; SQL/schema/runtime belum diimplementasikan.
- Dibuat: 3 Oktober 2026, Asia/Jakarta.
- Otorisasi 3 Oktober 2026: branch baru, implementasi tahap A, commit per task. Branch `feat/video-metadata`; tidak mencakup push/PR atau migrasi DB development.

## Objective

Membangun backend konten yang dapat menyimpan video mandiri, movie panjang, serta episode series multi-season, tanpa menggabungkan metadata editorial dengan file/transcode. Iterasi pertama menyelesaikan API draf/metadata; roadmap media menjelaskan migrasi lanjutan dan dependensinya.

## Goals and Non-goals

**Tahap A:** enam tabel metadata (`series`, `seasons`, `videos`, `genres`, `series_genres`, `video_genres`), CRUD admin terbatas, pagination/filter, soft archive, optimistic concurrency, guard native, kontrak Eden/Scalar, proof PostgreSQL terpisah.

**Tahap B–D:** storage/upload, queue/worker, publication/catalog/playback. Model relasinya dirancang sekarang, kode dan tabelnya dibuat saat task media relevan. Tidak menambah package bersama, frontend dashboard, player, dependency storage, analytics, billing, akun pengunjung, scheduled publication, franchise, dubbing, credits atau GitHub CI pada tahap A.

## Current Behavior

Factory Elysia melayani root, native `/api/auth/*` dan Scalar. Guard admin reusable dan Bun SQL/Drizzle sudah tersedia; tidak ada schema/rute konten. `schema/index.ts` hanya auth; history tiga migrasi auth harus utuh. Web memiliki Eden base `/api` tetapi gateway hanya auth. Evidence auth lokal ada pada backlog auth; bukan bukti domain video/produksi.

## Desired Behavior

Admin membuat series (sekaligus Season 1 secara atomik), menambah season, membuat episode di season yang sah, atau membuat movie/standalone tanpa season. Admin dapat mengisi metadata/genre, melihat daftar/detail, mengedit dengan expectedVersion, dan archive draf. Episode tidak dapat kehilangan parent; movie tidak dapat membawa nomor episode. Tahap A menyimpan publication status draft dan tidak membuka katalog/playback publik.

## Impact Analysis

- Dependency database: tambahkan schema/migrasi app; auth canonical tidak diubah. FK actor memakai user ID native, bukan singleton lama.
- Composition: factory menerima dependency service bisnis eksplisit; bootstrap menyuntikkan DB/reader auth/clock/ID generator. Import factory/type tetap tanpa env/pool/port.
- Inferensi: selalu komposisikan module routes secara chaining `.use()` sebelum `toOpenAPISchema`. Jangan menambahkan rute melalui mutation sesudah tipe `App` terbentuk atau conditional branch yang menghilangkan inference.
- Dependency absent: factory test tetap dapat dibuat tanpa live database; service dependency tidak tersedia mengembalikan error 503, tidak membuat pool otomatis. Rute/type tetap stabil pada factory untuk kontrak Eden.
- API/transport: business route memakai `/admin/*`; gateway browser kelak memetakan `/api/admin/*` ke path tersebut. Auth handler tetap `/api/auth/*`.
- Lifecycle: guard dipasang scoped pada subrouter admin, sebelum handler/schema privat. Validasi/service terpisah; handler tidak menerima seluruh Context ke domain. Register OpenAPI setelah semua route module.
- Future media: pointer source/poster/job ditambahkan lewat migrasi tahap B/C, bukan FK ke tabel yang belum ada.
- Dokumentasi: history auth dipertahankan; indeks dan asumsi PRD/Architecture diperbarui tanpa mengklaim implementasi series/movie sudah berjalan.

## Affected Files and Symbols

Path yang belum ada adalah target; penamaan final diperiksa sebelum implementasi. Action bukan bukti file telah dibuat.

| Path                                                                                      | Action                         | Symbols / hasil                             | Reason / evidence                                                                           |
| ----------------------------------------------------------------------------------------- | ------------------------------ | ------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `apps/api/src/db/schema/series.ts`, `seasons.ts`, `videos.ts`, `genres.ts`                | create                         | Tabel, CHECK, FK, indexes                   | Model §§3–6; schema saat ini auth saja.                                                     |
| `apps/api/src/db/schema/index.ts`                                                         | modify                         | Ekspor konten bersama auth                  | `createDatabase`, Drizzle Kit resolve schema index.                                         |
| `apps/api/drizzle/<next>_*.sql`, `drizzle/meta/*`                                         | create/modify                  | SQL, snapshots, journal generator           | Tambahan setelah 0002; bukan mengubah SQL auth lama.                                        |
| `apps/api/src/modules/series/{index,admin,model,service,repository}.ts`                   | create                         | `createSeriesModule`, service series/season | Pemilik grouping; create Season 1 dalam transaksi.                                          |
| `apps/api/src/modules/videos/{index,admin,model,service,repository}.ts`                   | create                         | `createVideosModule`, service video         | Unit playable, validation dan query episode.                                                |
| `apps/api/src/modules/genres/{index,model,service,repository}.ts`                         | create                         | `createGenresModule`                        | Taxonomy create/list; validasi relasi.                                                      |
| `apps/api/src/modules/*/*.test.ts`                                                        | create                         | Test domain/HTTP                            | Bun native; injeksi DB/clock/ID/admin reader.                                               |
| `apps/api/src/shared/content-error.ts`, `plugins/errors.ts`                               | create                         | Error domain dan mapper HTTP                | Respons deterministik/redacted, requestId.                                                  |
| `apps/api/src/shared/content-pagination.ts`                                               | create                         | Cursor/bound query                          | Dipakai listing series dan video; bukan utility package.                                    |
| `apps/api/src/app.ts`                                                                     | modify                         | `AppDependencies`, `createApp`              | Mount bisnis sebelum schema OpenAPI.                                                        |
| `apps/api/src/index.ts`                                                                   | modify                         | Wiring repository/service/admin reader      | Satu pool; lifecycle bootstrap yang sama.                                                   |
| `apps/api/src/types.ts`                                                                   | modify bila perlu              | `App` tetap ReturnType type-only            | Tidak ekspor runtime/DB ke web.                                                             |
| `apps/api/src/plugins/openapi.test.ts`, `app.test.ts`                                     | modify                         | Evidence bisnis + auth schema/rute          | Hindari regressions OpenAPI dan root.                                                       |
| `apps/api/test/integration/content-schema-proof.test.ts`, `content-runtime-proof.test.ts` | create                         | Constraint/migrasi/HTTP DB nyata            | Suite integrasi terpisah.                                                                   |
| `apps/web/test/content-eden-contract.ts`                                                  | create                         | Compile-only client kontrak Eden            | Verifikasi routes/types dari createApp memakai dependency Eden web existing; bukan test UI. |
| `apps/api/package.json`                                                                   | modify                         | Script proof konten                         | Jika script ditambah, frozen install dan gate relevan.                                      |
| `docs/tasks/videos.md`, `VIDEO_*.md`, `README.md`, `ENVIRONMENT.md`, `API_DEVELOPMENT.md` | create/modify sesuai kebutuhan | Status/rute/runbook/evidence                | Dokumentasi root sesuai workflow.                                                           |

Tidak semua module wajib memiliki lima file; repository dipisah pada tahap ini karena query pagination, transaksi genre dan hierarchy digunakan ulang dan perlu proof SQL. Jika task memakai file lebih kecil, perbarui impact map sebelum Ready.

## Kontrak endpoint tahap A

Semua rute berikut privat dan memakai guard native; prefix adalah path Elysia, bukan path web. Semua response privat `Cache-Control: private, no-store`.

| Method / path                     | Input utama                                                                 | Output / perilaku                                                    |
| --------------------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `POST /admin/series`              | title, slug optional, metadata optional, genreIds optional                  | 201 `{series, defaultSeason}`; keduanya dibuat atomik.               |
| `GET /admin/series`               | limit/cursor/search, includeArchived boolean                                | 200 `{items,nextCursor}`; archived default tidak muncul.             |
| `GET /admin/series/:id`           | UUID                                                                        | 200 detail + genreIds + season ringkas, atau 404.                    |
| `PATCH /admin/series/:id`         | expectedVersion + field editable                                            | 200 snapshot baru; conflict 409.                                     |
| `POST /admin/series/:id/seasons`  | seasonNumber, title/description/release optional                            | 201 season; parent archived 409.                                     |
| `GET /admin/series/:id/seasons`   | includeArchived boolean                                                     | 200 `{items}` urut nomor, parent 404 bila absent.                    |
| `PATCH /admin/seasons/:id`        | expectedVersion, seasonNumber, metadata                                     | 200 snapshot; nomor duplicate 409; seriesId immutable.               |
| `POST /admin/genres`              | name, slug optional                                                         | 201 genre; duplicate 409.                                            |
| `GET /admin/genres`               | limit/cursor/search                                                         | 200 `{items,nextCursor}`; urutan `(created_at,id)` descending.       |
| `POST /admin/videos`              | kind, title, metadata, genreIds; episode membutuhkan seasonId/episodeNumber | 201 video draft; parent absent 404/archived 409.                     |
| `GET /admin/videos`               | kind, seriesId, seasonId, search, includeArchived, limit/cursor             | 200 `{items,nextCursor}`; seriesId derived lewat join.               |
| `GET /admin/videos/:id`           | UUID                                                                        | 200 detail dengan grouping dan genreIds/effectiveGenres; 404 absent. |
| `PATCH /admin/videos/:id`         | expectedVersion, metadata/genreIds; reassignment episode pre-publication    | 200 snapshot; input malformed 422, konflik 409.                      |
| `POST /admin/videos/:id/archive`  | expectedVersion                                                             | 200 snapshot archived, atau 409 kondisi tidak aman.                  |
| `POST /admin/series/:id/archive`  | expectedVersion                                                             | 200 archived, atau 409 child published.                              |
| `POST /admin/seasons/:id/archive` | expectedVersion                                                             | 200 archived, atau 409 child published.                              |

Snapshot detail memuat camelCase: `id`, `kind` (video), `slug`, metadata, `publicationStatus`, `rowVersion`, `createdAt`, `updatedAt`, `archivedAt`, `genreIds`; video episode juga `seasonId`, `episodeNumber`, `series {id,title,slug}`, `season {id,seasonNumber,title}`. Source/ready/duration URL belum tersedia pada tahap A; field teknis tidak diisi dummy. Empty list `items:[]`, `nextCursor:null`. Title required saat create; PATCH minimal satu field editorial/genre selain expectedVersion. Semua ID/divergent union, boolean/query/cursor divalidasi eksplisit; body unknown fields ditolak.

Metadata video menerima `rightsConfirmed?: boolean` sebagai pernyataan eksplisit admin: true menyimpan timestamp/actor server, false mengosongkan pasangan. Field `rightsConfirmedAt/By` tidak diterima sebagai input; snapshot boleh mengembalikan confirmation timestamp aman. Jenis konten, publication status dan field pemrosesan tetap tidak dapat diubah melalui PATCH. `releaseYear` dan `releaseDate` boleh NULL; PATCH field absent mempertahankan nilai, field NULL menghapus nilai optional, `genreIds: []` mengosongkan override genre. Property hierarchy episode pada PATCH harus divalidasi terhadap kind yang tersimpan, bukan menambahkan kind ke input.

Draft read tetap dapat melihat row archived melalui detail dengan flag archivedAt, tetapi write archived ditolak. Genre, season dan series tidak dapat dihard-delete. Relasi parent immutable saat published/first published; tahap A semua draft, aturan tetap ditulis/test melalui fixture supaya future tidak melemahkan invariant.

Error envelope: `{error:{code,message,requestId,details?}}`. 401/403/503 guard tetap menggunakan kontrak guard existing. Domain errors: 404 `CONTENT_NOT_FOUND`; 409 `SLUG_CONFLICT`, `EPISODE_NUMBER_CONFLICT`, `SEASON_NUMBER_CONFLICT`, `CONTENT_VERSION_CONFLICT`, `CONTENT_ARCHIVED`, `CONTENT_STATE_CONFLICT`; 422 `VALIDATION_ERROR`; 503 `CONTENT_DEPENDENCY_UNAVAILABLE`; 500 unexpected redacted. Constraint SQLSTATE dipetakan menurut named constraint, bukan message database mentah. Unknown genre ID merupakan 422 field error; record parent yang tidak ada 404. Auth guard berjalan sebelum service; tidak boleh ada query/write saat guard menolak.

## Implementation DAG

```text
VID-001 → VID-002 → VID-003 → VID-004 → VID-005
VID-005 → VID-006 → VID-007
VID-005 → VID-008
VID-007 + VID-008 → VID-009 → VID-010 → VID-011
VID-006 + VID-007 + VID-011 → VID-012
VID-008 + VID-010 + VID-012 → VID-013 → VID-014 → VID-015
```

Dependency DAG menunjukkan prerequisites, bukan instruksi menggunakan subagent/menulis lockfile paralel. Implementasi tetap satu task utama sampai evidence dapat direview.

## Implementation Steps

ID langkah sama dengan task pada [backlog detail](tasks/videos.md). Setiap task di sana memuat outcome/scope, affected files/symbols, dependencies, requirements, validation dan acceptance criteria sesuai template repo.

### VID-001 — Keputusan metadata/kontrak siap implementasi

- Outcome: Keputusan metadata/kontrak siap implementasi.
- Depends on: none.
- Files: Model/plan/backlog, D1–D3; path lengkap pada impact map dan backlog task.
- Symbols: D1–D3, metadata/endpoint contracts (nama target; verifikasi pada implementasi).
- Requirements: seluruh ruang lingkup dan acceptance task [VID-001](tasks/videos.md); model data dan kontrak endpoint tahap A berlaku.
- Validation: Keputusan tercatat; model→endpoint→task→test lengkap.
- Acceptance criteria: checklist task VID-001 lulus dengan bukti aktual; file dibuat saja belum berarti Done.

### VID-002 — Schema series/season dan migrasi additive

- Outcome: Schema series/season dan migrasi additive.
- Depends on: VID-001.
- Files: series.ts/seasons.ts/index, SQL/meta; path lengkap pada impact map dan backlog task.
- Symbols: series, seasons, actor FKs, seasonal UNIQUE (nama target; verifikasi pada implementasi).
- Requirements: seluruh ruang lingkup dan acceptance task [VID-002](tasks/videos.md); model data dan kontrak endpoint tahap A berlaku.
- Validation: Proof FK/nomor/default/year-date dan preservation auth.
- Acceptance criteria: checklist task VID-002 lulus dengan bukti aktual; file dibuat saja belum berarti Done.

### VID-003 — Schema videos dan constraints semua jenis

- Outcome: Schema videos dan constraints semua jenis.
- Depends on: VID-002.
- Files: videos.ts, SQL/meta; path lengkap pada impact map dan backlog task.
- Symbols: videos, kind CHECK, episode UNIQUE (nama target; verifikasi pada implementasi).
- Requirements: seluruh ruang lingkup dan acceptance task [VID-003](tasks/videos.md); model data dan kontrak endpoint tahap A berlaku.
- Validation: Movie tanpa season, episode wajib parent, conflict race terbukti.
- Acceptance criteria: checklist task VID-003 lulus dengan bukti aktual; file dibuat saja belum berarti Done.

### VID-004 — Taxonomy dan relasi genre

- Outcome: Taxonomy dan relasi genre.
- Depends on: VID-003.
- Files: genres.ts, SQL/meta; path lengkap pada impact map dan backlog task.
- Symbols: genres, seriesGenres, videoGenres (nama target; verifikasi pada implementasi).
- Requirements: seluruh ruang lingkup dan acceptance task [VID-004](tasks/videos.md); model data dan kontrak endpoint tahap A berlaku.
- Validation: PK/FK, duplicate/unknown genre dan rollback.
- Acceptance criteria: checklist task VID-004 lulus dengan bukti aktual; file dibuat saja belum berarti Done.

### VID-005 — Schema HTTP/errors/cursor/injection contracts

- Outcome: Schema HTTP/errors/cursor/injection contracts.
- Depends on: VID-004.
- Files: model.ts/shared/errors/pagination; path lengkap pada impact map dan backlog task.
- Symbols: ContentError, CreateVideoBody, PatchVideoBody, content cursor (nama target; verifikasi pada implementasi).
- Requirements: seluruh ruang lingkup dan acceptance task [VID-005](tasks/videos.md); model data dan kontrak endpoint tahap A berlaku.
- Validation: DTO/no unknown fields, boundary/query/cursor tests.
- Acceptance criteria: checklist task VID-005 lulus dengan bukti aktual; file dibuat saja belum berarti Done.

### VID-006 — Series draft create/read/edit

- Outcome: Series draft create/read/edit.
- Depends on: VID-005.
- Files: modules/series; path lengkap pada impact map dan backlog task.
- Symbols: createSeriesModule, createSeries, listSeries, getSeries, updateSeries (nama target; verifikasi pada implementasi).
- Requirements: seluruh ruang lingkup dan acceptance task [VID-006](tasks/videos.md); model data dan kontrak endpoint tahap A berlaku.
- Validation: Default Season 1 atomik; conflict/version tests.
- Acceptance criteria: checklist task VID-006 lulus dengan bukti aktual; file dibuat saja belum berarti Done.

### VID-007 — Season create/read/edit

- Outcome: Season create/read/edit.
- Depends on: VID-006.
- Files: modules/series; path lengkap pada impact map dan backlog task.
- Symbols: createSeason, listSeasons, updateSeason (nama target; verifikasi pada implementasi).
- Requirements: seluruh ruang lingkup dan acceptance task [VID-007](tasks/videos.md); model data dan kontrak endpoint tahap A berlaku.
- Validation: Parent validity, per-series numbers, update race.
- Acceptance criteria: checklist task VID-007 lulus dengan bukti aktual; file dibuat saja belum berarti Done.

### VID-008 — Genre create/list

- Outcome: Genre create/list.
- Depends on: VID-005.
- Files: modules/genres; path lengkap pada impact map dan backlog task.
- Symbols: createGenresModule, createGenre, listGenres (nama target; verifikasi pada implementasi).
- Requirements: seluruh ruang lingkup dan acceptance task [VID-008](tasks/videos.md); model data dan kontrak endpoint tahap A berlaku.
- Validation: Unique slug/list/input errors.
- Acceptance criteria: checklist task VID-008 lulus dengan bukti aktual; file dibuat saja belum berarti Done.

### VID-009 — Video draft create

- Outcome: Video draft create.
- Depends on: VID-007,VID-008.
- Files: videos service/admin/repository; path lengkap pada impact map dan backlog task.
- Symbols: createVideosModule, createVideoDraft (nama target; verifikasi pada implementasi).
- Requirements: seluruh ruang lingkup dan acceptance task [VID-009](tasks/videos.md); model data dan kontrak endpoint tahap A berlaku.
- Validation: Movie/standalone/episode branch dan auth/service tests.
- Acceptance criteria: checklist task VID-009 lulus dengan bukti aktual; file dibuat saja belum berarti Done.

### VID-010 — Video list/detail/filter

- Outcome: Video list/detail/filter.
- Depends on: VID-009.
- Files: videos repository/service + pagination; path lengkap pada impact map dan backlog task.
- Symbols: listVideos, getVideo, mapVideoDto (nama target; verifikasi pada implementasi).
- Requirements: seluruh ruang lingkup dan acceptance task [VID-010](tasks/videos.md); model data dan kontrak endpoint tahap A berlaku.
- Validation: Cursor stable, filters/hierarchy/genre correct.
- Acceptance criteria: checklist task VID-010 lulus dengan bukti aktual; file dibuat saja belum berarti Done.

### VID-011 — Video edit/reassign/genre set

- Outcome: Video edit/reassign/genre set.
- Depends on: VID-010.
- Files: videos service/repository/admin; path lengkap pada impact map dan backlog task.
- Symbols: updateVideo, replaceVideoGenres, reassignEpisode (nama target; verifikasi pada implementasi).
- Requirements: seluruh ruang lingkup dan acceptance task [VID-011](tasks/videos.md); model data dan kontrak endpoint tahap A berlaku.
- Validation: Atomic version update; invalid parent/genre rollback.
- Acceptance criteria: checklist task VID-011 lulus dengan bukti aktual; file dibuat saja belum berarti Done.

### VID-012 — Archive hierarchy aman

- Outcome: Archive hierarchy aman.
- Depends on: VID-006,VID-007,VID-011.
- Files: series/videos services; path lengkap pada impact map dan backlog task.
- Symbols: archiveVideo, archiveSeries, archiveSeason (nama target; verifikasi pada implementasi).
- Requirements: seluruh ruang lingkup dan acceptance task [VID-012](tasks/videos.md); model data dan kontrak endpoint tahap A berlaku.
- Validation: Read archived, write blocked, child safe, idempotent archive.
- Acceptance criteria: checklist task VID-012 lulus dengan bukti aktual; file dibuat saja belum berarti Done.

### VID-013 — Integrasi factory, guard, Eden dan Scalar

- Outcome: Integrasi factory, guard, Eden dan Scalar.
- Depends on: VID-008,VID-010,VID-012.
- Files: app/index/types/OpenAPI tests; path lengkap pada impact map dan backlog task.
- Symbols: createApp, AppDependencies, App, content Eden contract (nama target; verifikasi pada implementasi).
- Requirements: seluruh ruang lingkup dan acceptance task [VID-013](tasks/videos.md); model data dan kontrak endpoint tahap A berlaku.
- Validation: Mounted routes typed, all private guarded, auth schema utuh.
- Acceptance criteria: checklist task VID-013 lulus dengan bukti aktual; file dibuat saja belum berarti Done.

### VID-014 — Proof PostgreSQL dan HTTP end-to-end backend

- Outcome: Proof PostgreSQL dan HTTP end-to-end backend.
- Depends on: VID-013.
- Files: integration/proof scripts; path lengkap pada impact map dan backlog task.
- Symbols: content schema/runtime integration proofs (nama target; verifikasi pada implementasi).
- Requirements: seluruh ruang lingkup dan acceptance task [VID-014](tasks/videos.md); model data dan kontrak endpoint tahap A berlaku.
- Validation: Dedicated DB; parallel constraint/version, migration rerun, auth preserved.
- Acceptance criteria: checklist task VID-014 lulus dengan bukti aktual; file dibuat saja belum berarti Done.

### VID-015 — Runbook/docs/final validation

- Outcome: Runbook/docs/final validation.
- Depends on: VID-014.
- Files: docs/tasks/index/environment; path lengkap pada impact map dan backlog task.
- Symbols: planning status, runbook, task evidence (nama target; verifikasi pada implementasi).
- Requirements: seluruh ruang lingkup dan acceptance task [VID-015](tasks/videos.md); model data dan kontrak endpoint tahap A berlaku.
- Validation: Gates selesai; batas backend vs gateway/media jelas.
- Acceptance criteria: checklist task VID-015 lulus dengan bukti aktual; file dibuat saja belum berarti Done.

## Roadmap media setelah metadata

| ID roadmap                              | Dependensi                                        | Outcome / target files                                                            | Gerbang dan evidence wajib                                                                                                                   |
| --------------------------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| MEDIA-001 — storage/movie upload spike  | VID-015                                           | Keputusan provider/native S3/single vs multipart/resume, limits; docs tugas media | Proof presign, CORS, expiry, upload terputus, input immutable, ukuran movie; dependency tambahan hanya bila native tidak mendukung.          |
| MEDIA-002 — asset/upload session        | MEDIA-001                                         | schema/media.ts/upload.ts + modules/media/storage/config/migrations               | Ownership FK, pointer source/poster, completion idempotent, final object identity, aborted/expired cleanup, no public preview.               |
| WORKER-001 — queue/claim/lease          | MEDIA-002                                         | schema/jobs.ts + workers/queue.ts/bootstrap                                       | Durable enqueue, duplicate/parallel claim, heartbeat, death recovery, stale token rejected.                                                  |
| WORKER-002 — FFprobe/FFmpeg/output      | WORKER-001 + profil disepakati                    | schema/renditions.ts + workers/transcode.ts                                       | Portrait/landscape/long fixtures, resource/timeout policy, verified HLS outputs, retry safe namespace, no FFmpeg within request/transaction. |
| PUBLISH-001 — publikasi/delivery        | WORKER-002 + D4/D5                                | services publication + operation dedup schema/migrations                          | Source/job/poster/rights readiness; parent-child race; unpublish delivery bound; repeat safe.                                                |
| PUBLIC-001 — catalog/detail/playback    | PUBLISH-001                                       | module public.ts, public DTO/query                                                | Tanpa login, only effective visibility, no private keys, next episode gap, access withdrawal sesuai policy.                                  |
| WEB-CONTENT-001 — business transport/UI | VID-015 untuk metadata; PUBLIC-001 untuk playback | Gateway server bisnis/client Query/admin/catalog; generated routes by tooling     | Fixed upstream, strip /api tepat sekali, cookie/no-store/errors, SSR isolation; auth gateway tidak dipakai sebagai universal proxy.          |

Roadmap dipecah lagi menjadi backlog kecil sebelum implementasi. ID ini belum task Ready. Video.js skill dan bundled docs wajib saat player/HLS frontend dikerjakan; plan backend ini tidak mengubah playback.

## Test Requirements

| Area             | Skenario yang wajib dibuktikan                                                                                                                                                                     |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DB series/season | Slug unique, nomor sama season beda series sah, parent FK, title kosong, year/date mismatch, default season create rollback.                                                                       |
| DB video         | Episode NULL season/number ditolak, movie membawa season/number ditolak, unknown kind, duplicate episode per season ditolak walau request bersamaan, nomor sama pada season berbeda sah.           |
| Relations/genre  | FK unknown, duplicate join, set replacement rollback, inherit genre episode, archived parent, no dangling owner.                                                                                   |
| Concurrency      | Dua PATCH expectedVersion sama hanya satu berhasil; reassign/nomor tujuan conflicting ditolak; unique slug race; transaction failure tidak meninggalkan partial write.                             |
| HTTP             | Admin success; null/expired/ordinary/banned auth, auth outage; no service call bila guard menolak; UUID/query/body/unknown/read-only field malformed; safe 404/409/422/503 envelopes.              |
| Read/list        | Empty results, limit boundaries, cursor malformed/filter mismatch, tied timestamps, pagination no duplicate untuk dataset stabil, series/season/kind filter, SQL search metachar treated as input. |
| Archive          | Archived tidak muncul default; includeArchived/details bekerja, PATCH/reassign parent archived ditolak; published/child-published archive ditolak via domain fixture.                              |
| Composition      | Import tanpa port/env/DB; all business routes guarded; OpenAPI docs bisnis + auth security schemes; Eden compile rejects incompatible create bodies; auth endpoints/root regression.               |
| Migration        | Fresh dedicated database dan existing auth fixture, re-run tidak mengulang, users/password hashes/sessions unchanged, journal append saja; no test menyentuh dev DB.                               |

Unit source: `bun run --cwd apps/api test`; PostgreSQL proof dijalankan terpisah dengan env test explicit dan allowlist database test, bukan env development. Compile-only Eden fixture berada di `apps/web/test/content-eden-contract.ts`, yang tercakup include `**/*.ts` pada tsconfig web; compiler memakai dependency Eden web existing tanpa menambahkan runtime Eden ke API. Jalankan check-types web/root; ini proof kontrak compile-only, tanpa menambah frontend unit suite.

## Constraints

Ikuti AGENTS/API Development/Workflow; injeksi dependency, method chaining dan scoped guard; satu pool; Bun native untuk runtime/SQL dan API tests; media native dievaluasi dahulu; env secret tidak diekspos. Tidak mengedit route tree/generated outputs. Frozen install setelah package/scripts berubah. Tidak menganggap proof auth lama sebagai bukti konten atau production readiness.

## Acceptance Criteria

- [ ] D1–D3 disepakati dan seluruh task tahap A yang diperlukan Done dengan bukti.
- [ ] Admin dapat membuat series/season/episode/movie/standalone, mengedit metadata/genre, list/detail/filter, dan archive sesuai kontrak.
- [ ] Hierarchy/uniqueness/version constraints tetap benar pada request bersamaan dan transaction rollback.
- [ ] Semua business routes privat, typed di Eden, terdokumentasi Scalar; auth existing tetap berjalan.
- [ ] Migrasi additive lulus fresh/re-run/existing auth fixture; root relevant gates dan proof PostgreSQL lulus.
- [ ] Tidak ada katalog/playback/upload semu; integrasi gateway/UI dan media jelas belum diimplementasikan.

## Risks and Mitigations

- Season default menambah konsep produk: tinjau D1; UI dapat menyederhanakannya tanpa kehilangan season FK.
- Parent publication memengaruhi seluruh episode: predicate bersama dan tests race semua read/playback endpoints pada tahap D.
- Schema media future memiliki siklus FK: gunakan migrasi staged table-first/pointer-later; uji ownership nyata, bukan relations ORM saja.
- Movie panjang mengubah resource upload/worker dan rasio: spike sebelum batas/profil ditetapkan; file asli tidak otomatis dicrop.
- Existing Eden base `/api` bukan gateway bisnis aktif: backend completion diukur direct HTTP; transport web menjadi task tersendiri.
- Genre/metadata tambahan dapat memperluas scope: fase A dibatasi field dan enam tabel yang dirancang; credits/translation tidak dibuat spekulatif.

## Rollback or Recovery

Planning hanya dokumen, dapat direvisi sebelum implementasi. Migrasi metadata akan additive dan tidak mengubah tabel auth; test memakai database disposable. Sebelum migrasi development/deployment, review SQL/backup/target serta persetujuan operasi sesuai scope sesi saat itu. Jika runtime gagal setelah migration additive, rollback binary yang belum memakai schema baru dan pertahankan data; jangan DROP tabel konten terisi untuk rollback otomatis. Koreksi lewat forward migration; hard deletion membutuhkan rencana eksplisit.

## Evidence

Base SHA dan evidence simbol/path ada di [context](VIDEO_REPOSITORY_CONTEXT.md#evidence-index). Model FK/CHECK/UNIQUE dilandasi [PostgreSQL](https://www.postgresql.org/docs/current/ddl-constraints.html) dan [Drizzle](https://orm.drizzle.team/docs/indexes-constraints). API inference mengikuti [Eden Treaty](https://elysiajs.com/eden/treaty/overview). Referensi vendor tidak membuktikan SQL atau runtime konten sudah lulus; seluruh proof tersebut merupakan acceptance implementasi.

## Open Decisions

D1–D3 pada model adalah gerbang tahap A. D4 publication parent/hak/poster/subtitle dan D5 provider/limits/movie upload/profiles/delivery adalah gerbang tahap media. Umur/retensi dedup operation key dan kebijakan archive/restore/GC lanjutan perlu refinement sebelum publikasi/cleanup. Tidak ada estimasi kalender atau asumsi produksi sudah siap.

## Validation History

### 2026-10-03 — planning snapshot

- Result: valid untuk evidence kode dan struktur dokumen; implementasi belum tervalidasi.
- Plan base SHA / current target SHA: `d1d3e0a36a4adf1c7198db7a1d36c49e9f1c93ed`.
- Checked paths: context Evidence Index; worktree awal bersih, source/manifests/schema/routes diperiksa.
- Changed relevant paths: hanya dokumen planning sesi ini; tidak ada source/dependency/database change.
- Decision: D1–D3 disetujui; lanjut tahap A pada branch baru. Sebelum eksekusi resolve SHA terbaru dan diff semua affected paths/dependencies; evidence yang berubah direfresh, bukan memakai snapshot auth lama.

## Execution Log

- 2026-10-03: inspeksi repo dan dokumentasi resmi, resolve versi Bun/Elysia/Drizzle, tulis context/model/plan/backlog dan sesuaikan indeks/asumsi produk. Tidak menjalankan migrasi, menulis source runtime, membuat branch/commit/push/PR. Hasil pemeriksaan dokumen dicatat sesudah validasi sesi ini.
- 2026-10-03: Prettier check lulus untuk empat dokumen baru; 69 tautan lokal/anchor valid pada tujuh dokumen terkait. Pemeriksaan 15 task/backlog sections, kesamaan dependencies plan/backlog dan DAG tanpa siklus lulus. `git diff --check` lulus. Pemeriksaan ini memvalidasi dokumen; bukan proof SQL/API/worker yang belum diimplementasikan.

- VID-001: D1–D3 disetujui pengguna. Freshness valid pada d1d3e0a; hanya dokumen planning dari sesi sebelumnya, tidak ada perubahan source. Branch feat/video-metadata dibuat sebelum implementasi. Kontrak field/routes/task/test direview; tahap A metadata, S3 tetap roadmap. Commit dibuat sesudah validasi; commit sebelumnya: d1d3e0a Merge pull request #1 from bayuaji17/feat/auth-admin-module.

- VID-002: Schema series/seasons dan migrasi generated 0003 additive selesai. PostgreSQL dedicated content proof: 2 pass/10 assertions, FK/nomor/title/year-date/slug serta migration re-run dan user preservation. Database development tidak dimigrasikan. Type-check/lint dijalankan hook commit. Commit dibuat sesudah validasi; commit sebelumnya: ea3c891 docs(video): approve metadata implementation plan.

- VID-003: Schema videos dan migrasi 0004 selesai; tiga jenis konten, CHECK pair nullable/hak/status, FK dan nomor episode unik. PostgreSQL proof 3 pass; race dua INSERT nomor sama hanya satu berhasil dan nomor sama pada season berbeda diterima. Type-check/lint hook commit. Commit dibuat sesudah validasi; commit sebelumnya: 339049f feat(api): add series and seasons schema.

- VID-004: Enam tabel metadata lengkap melalui migrasi 0005 genres/relasi. PostgreSQL proof 4 pass: composite PK, FK, slug unique dan rollback replacement genre tanpa partial write. Index reverse genre tersedia. Type-check/lint hook commit. Commit dibuat sesudah validasi; commit sebelumnya: 38f3ba9 feat(api): add video metadata schema.

- VID-005: Schema HTTP strict dan DTO/error/cursor/runtime injection contracts selesai. API source unit suite 25 pass/73 assertions; movie union menolak season/status/actor/technical input, cursor menolak query mismatch, date/calendar/language tervalidasi dan error constraint redacted. Type-check/lint hook commit. Commit dibuat sesudah validasi; commit sebelumnya: 9b69b36 feat(api): add content genre taxonomy.

- VID-006: Series create/read/list/edit selesai; default Season1 dan genre atomik. API units 26 pass; PostgreSQL runtime 2 pass membuktikan rollback invalid genre, version conflict dan HTTP duplicate slug409. Mapper disesuaikan terhadap SQLSTATE pada errno native Bun SQL (temuan integration), tanpa raw error exposure. API type-check lulus; root lint/type-check hook commit. Commit dibuat sesudah validasi; commit sebelumnya: b990ff3 feat(api): define content validation contracts.

- VID-007: Season create/list/edit selesai dengan parent-first lock, nomor unik per series dan optimistic version. PostgreSQL runtime 3 pass/17 assertions termasuk archived parent dan larangan renumber season dengan episode pernah terbit. API module HTTP tests dan root lint/type-check hook commit. Commit dibuat sesudah validasi; commit sebelumnya: 7c829a2 feat(api): implement series draft management.

- VID-008: Genre create/list API selesai. PostgreSQL runtime 4 pass/25 assertions: trimming, duplicate slug, pagination, search wildcard literal. API source unit suite 27 pass, termasuk denial tanpa service call. Root lint/type-check hook commit. Commit dibuat sesudah validasi; commit sebelumnya: c3bb65b feat(api): implement season management.

- VID-009: Video draft create untuk movie/standalone/episode selesai, parent locks dan rights confirmation server-side. PostgreSQL runtime 5 pass/34 assertions: kind hierarchy, atomic genre rollback, missing parent dan duplicate episode race. API units 28 pass; lint/type-check hook commit. Commit dibuat sesudah validasi; commit sebelumnya: 09c48f8 feat(api): implement genre taxonomy endpoints.

- VID-010: Video list/detail/filter dan genre inheritance selesai. PostgreSQL runtime 6 pass: series/season grouping, no-parent movie, override/inheritance, cursor query binding dan tiga episode bertimestamp sama tanpa duplicate/skip. Query genre tidak menggandakan paging rows. Root lint/type-check hook commit. Commit dibuat sesudah validasi; commit sebelumnya: 0dd90c5 feat(api): implement video draft creation.

- VID-011: Video PATCH atomik selesai: expectedVersion, metadata/genre, rights confirmation dan episode reassignment prepublication. PostgreSQL runtime 7 pass membuktikan dua update versi sama hanya satu berhasil, genre invalid rollback metadata/version, movie grouping rejection, dan first-publication grouping lock. Parent locks diurutkan untuk perpindahan lintas series. Root lint/type-check hook commit. Commit dibuat sesudah validasi; commit sebelumnya: ae05dad feat(api): add video metadata queries.
