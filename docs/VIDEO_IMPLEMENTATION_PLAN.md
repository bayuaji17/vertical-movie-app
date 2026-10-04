# Implementation Plan — Video, Series, dan Movie

## Plan Metadata

- Status: **completed — tahap A; finalized — plan media B–D, siap memulai foundation development**. Keputusan produk nomor 1–7 disetujui; task mengikuti prerequisite/proof, deployment nomor 8 tetap proposal. Metadata disetujui pengguna 3 Oktober 2026. MinIO development, R2 production, selector env dan HLS disetujui pada tindak lanjut tanggal yang sama; media belum diimplementasikan.
- Repository: `bayuaji17/vertical-movie-app`.
- Base ref: `main`.
- Base SHA: `d1d3e0a36a4adf1c7198db7a1d36c49e9f1c93ed`.
- Context: [VIDEO_REPOSITORY_CONTEXT.md](VIDEO_REPOSITORY_CONTEXT.md).
- Data model: [VIDEO_DATA_MODEL.md](VIDEO_DATA_MODEL.md).
- Task backlog: [videos](tasks/videos.md), [media foundation](tasks/media.md), [worker/retensi](tasks/media-worker.md), [publication/catalog/playback](tasks/media-publication.md).
- Baseline planning SHA: `d1d3e0a36a4adf1c7198db7a1d36c49e9f1c93ed`. SHA hasil tiap task dan validasi implementasi ada pada ledger di bawah.
- Dibuat: 3 Oktober 2026, Asia/Jakarta.
- Otorisasi awal 3 Oktober 2026: branch baru, implementasi tahap A, commit per task. Branch `feat/video-metadata`; tidak mencakup push/PR atau migrasi DB development.
- Snapshot refinement media: `0d3bef87f6d2f9b0a2873078f9b560f092f13c53` pada branch lokal `codex/design-system-final`; lihat snapshot lanjutan pada context. Riwayat SHA tahap A tetap dipertahankan.
- Otorisasi finalisasi 4 Oktober 2026: plan/dokumen/sampel env, branch `codex/media-backend-plan`, lalu commit planning. Runtime media, provisioning, migrasi, deployment, push dan PR belum termasuk tahap ini.

## Objective

Membangun backend konten yang dapat menyimpan video mandiri, movie panjang, serta episode series multi-season, tanpa menggabungkan metadata editorial dengan file/transcode. Iterasi pertama menyelesaikan API draf/metadata; roadmap media menjelaskan migrasi lanjutan dan dependensinya.

## Goals and Non-goals

**Tahap A:** enam tabel metadata (`series`, `seasons`, `videos`, `genres`, `series_genres`, `video_genres`), CRUD admin terbatas, pagination/filter, soft archive, optimistic concurrency, guard native, kontrak Eden/Scalar, proof PostgreSQL terpisah.

**Tahap B–D:** storage/upload, queue/worker, publication/catalog/playback. Model relasinya dirancang sekarang, kode dan tabelnya dibuat saat task media relevan. Tidak menambah package bersama, frontend dashboard, player, dependency storage, analytics, billing, akun pengunjung, scheduled publication, franchise, dubbing, credits atau GitHub CI pada tahap A.

## Baseline Behavior — sebelum implementasi

Factory Elysia melayani root, native `/api/auth/*` dan Scalar. Guard admin reusable dan Bun SQL/Drizzle sudah tersedia; tidak ada schema/rute konten. `schema/index.ts` hanya auth; history tiga migrasi auth harus utuh. Web memiliki Eden base `/api` tetapi gateway hanya auth. Evidence auth lokal ada pada backlog auth; bukan bukti domain video/produksi.

## Implemented Behavior — tahap A

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
| `apps/api/src/modules/series/{index,model,service,repository}.ts`                         | create                         | `createSeriesModule`, service series/season | Pemilik grouping; create Season 1 dalam transaksi.                                          |
| `apps/api/src/modules/videos/{index,model,service,repository}.ts`                         | create                         | `createVideosModule`, service video         | Unit playable, validation dan query episode.                                                |
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

### Keputusan storage dan streaming — disetujui 3 Oktober 2026

| Lingkungan  | Selector env             | Provider / endpoint                                                                     | Bucket / region                                                                                          |
| ----------- | ------------------------ | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Development | `STORAGE_PROVIDER=minio` | MinIO lokal; S3 `http://localhost:9000`, Console `http://localhost:9001`                | `vertical-movie-app` dibuat pengguna; region `us-east-1` sebagai konfigurasi awal yang harus dibuktikan. |
| Production  | `STORAGE_PROVIDER=r2`    | Cloudflare R2 melalui API S3-compatible `https://<account-id>.r2.cloudflarestorage.com` | Bucket production ditentukan saat provisioning; region `auto`.                                           |

Streaming produk memakai **HLS video on-demand** untuk standalone, movie, dan episode. Worker FFmpeg milik API membuat master `.m3u8`, variant `.m3u8`, segment fMP4 dan init file sesuai hls-v1. R2 hanya menyimpan/mendistribusikan objek; Cloudflare Stream bukan bagian keputusan ini. MP4 demo pada web tetap evidence starter dan bukan format streaming produk. Semua video produk wajib portrait 9:16; sumber landscape atau rasio lain ditolak tanpa crop otomatis.

Pilihan provider, protokol dan rentang resolusi 480p–1080p sudah disetujui. S3 multipart, batas ukuran/durasi/format sumber dan standar sampul juga sudah dipilih. hls-v1, part/concurrency/expiry, distribusi/cache, lifecycle, publication gate, retensi dan worker policy sudah disetujui. Identity resume/freeze, encoder/GOP/SAR/HDR/VFR, header provider dan resource melalui task proof; finalisasi plan bukan bukti runtime.

### Keputusan resolusi sumber dan HLS — disetujui 3 Oktober 2026

- Berlaku untuk standalone, episode dan movie: resolusi sumber minimum 480p dan maksimum 1080p; keluaran HLS juga dibatasi maksimal 1080p dan tidak boleh lebih tinggi daripada sumber. Sumber 1440p/4K atau di bawah minimum ditolak, bukan dinormalisasi otomatis menjadi sumber yang memenuhi syarat.
- Interpretasi dimensi untuk implementasi: gunakan dimensi tampilan setelah sample aspect ratio dan rotasi diperhitungkan. Semua kind wajib portrait dengan display aspect ratio 9:16; lebar minimum 480 dan maksimum 1080 piksel, tinggi maksimum 1920. Sumber landscape, square atau rasio lain ditolak; tidak ada crop/upscale otomatis. Resolusi dapat berbeda dalam rentang tersebut, tetapi policy rasio/dimensi berlaku seragam bagi movie, episode dan standalone.
- Contoh dimensi square-pixel portrait 9:16: 486 × 864 (memenuhi minimum lebar 480 dan dimensi encoder genap), 720 × 1280 dan 1080 × 1920. Label 480p adalah kelompok resolusi; pasangan pixel final ladder HLS ditetapkan pada HLS-PROFILE-001 agar rasio tetap 9:16. Sumber 1920 × 1080, 1920 × 800 dan 2160 × 3840 ditolak. Resolusi dalam rentang tidak harus tepat salah satu label kualitas.
- FFprobe menjadi sumber fakta dimensi; klaim resolusi pada form/nama file tidak authoritative. Pemeriksaan awal web hanya bantuan UX; API/worker wajib memastikan batas sebelum sumber menjadi aset siap/job transcode. Detail lokasi validasi mengikuti kontrak upload/probe; objek invalid tidak dapat dipublikasikan.
- Profil HLS tidak membuat rendition di bawah minimum atau meng-upscale sumber 480p ke 1080p. Ladder/bitrate/codec hls-v1 disetujui pada nomor 3; pembulatan dimensi encoder memerlukan proof HLS-PROFILE-001; pembulatan/hasil scaling harus tetap memenuhi bounds minimum/maksimum dan rasio yang disepakati. Target bitrate ekspor sumber yang disetujui di bawah tidak otomatis menetapkan seluruh ladder HLS.
- Acceptance proof: portrait 9:16 pada batas minimum/maksimum dan resolusi di antaranya, dimensi setelah rotasi/SAR, penolakan landscape/square/cinematic/rasio lain, di bawah 480, di atas 1080, 1440p/4K, metadata palsu serta sumber minimum yang tidak di-upscale. Ini keputusan plan; belum ada validasi runtime.
- Format sumber, batas durasi/ukuran movie/episode/standalone serta standar poster disetujui pada tindak lanjut di bawah. Kelompok batas media pada level produk telah ditetapkan; detail kompatibilitas/probe dan kontrak implementasi tetap mengikuti backlog.

### Target kualitas dan ukuran sumber — disetujui 3 Oktober 2026

Pengguna menyetujui penyesuaian ukuran wajar dan bitrate: acuan sumber portrait 1080 × 1920, H.264 SDR, **24–30 fps**, video rata-rata **4–6 Mbps** dengan **default 6 Mbps**, serta audio **AAC 128 kbps**. Ini panduan ekspor sumber, bukan bitrate maksimum setiap saat, kewajiban semua upload 1080p/30 fps, atau profil ladder HLS final. Sumber 480p–1080p tetap diterima sesuai bounds; dukungan sumber 60 fps sebelumnya tetap mengikuti validasi dan limit file aktual.

| Jenis konten | Durasi maksimum        | Batas file sumber               | Estimasi pada acuan 4–6 Mbps di durasi maksimum |
| ------------ | ---------------------- | ------------------------------- | ----------------------------------------------- |
| Episode      | 10 menit (600 detik)   | **512 MB (512.000.000 byte)**   | sekitar **310–460 MB**                          |
| Movie        | 30 menit (1.800 detik) | **1,5 GB (1.500.000.000 byte)** | sekitar **929 MB–1,38 GB**                      |
| Standalone   | 30 menit (1.800 detik) | **1,5 GB (1.500.000.000 byte)** | sekitar **929 MB–1,38 GB**                      |

- Batas durasi/ukuran inklusif dan berlaku berdasarkan kind untuk seluruh durasi yang sah, termasuk konten yang lebih pendek. Ini menggantikan batas 512 MB untuk seluruh kind serta acuan default 6–8 Mbps sebelumnya. MB/GB memakai satuan desimal yang dinyatakan dalam byte.
- Batas ukuran berlaku untuk **file sumber unggahan**, termasuk video, audio dan overhead container, bukan jumlah storage source ditambah seluruh keluaran HLS. File yang melampaui limit ditolak; target bitrate ekspor tidak menggantikan pengecekan ukuran aktual.
- Default video 6 Mbps + audio 128 kbps menghasilkan estimasi **459,6 MB untuk 10 menit** dan **1.378,8 MB untuk 30 menit** sebelum overhead. Batas 512 MB/1,5 GB menyisakan margin sekitar **52,4 MB/121,2 MB**. Estimasi bukan jaminan ukuran atau kualitas visual setiap file, terutama pada VBR; kualitas dibuktikan dengan fixture saat implementasi.
- Budget total rata-rata pada batas maksimum adalah sekitar **6,83 Mbps untuk episode 10 menit** dan **6,67 Mbps untuk movie/standalone 30 menit**, termasuk audio/container. Acuan 4–6 Mbps video memungkinkan kualitas sumber yang sebanding pada kedua durasi tanpa memaksa movie 30 menit turun ke budget lama sekitar 2,28 Mbps.
- Kelompok batas produk nomor 1 telah ditetapkan. Audio/codec di luar acuan, HDR/VFR/nonstandard fps dan lokasi/prosedur probe masih refinement teknis, bukan persetujuan menerima semua varian tanpa proof. Sumber di luar policy tidak diterima melalui fallback tanpa limit.
- Validator memakai ukuran aktual objek dan durasi FFprobe. Proof boundary per kind: movie/standalone tepat 1.800 detik versus lebih dan 1.500.000.000 byte versus +1 byte; episode tepat 600 detik versus lebih dan 512.000.000 byte versus +1 byte; deklarasi size/duration berbeda dari fakta serta profil 30/60 fps. Penanganan error probe mengikuti task upload/worker.

### Penyesuaian ukuran wajar dan bitrate — disetujui 3 Oktober 2026

Angka pembanding berikut memakai H.264 SDR dan AAC 128 kbps, MB/GB desimal, belum overhead container. **Acuan utama yang disetujui adalah baris Standar**; angka kualitas tinggi/60 fps menjadi pembanding, bukan peningkatan cap upload atau janji seluruh durasi maksimum dapat masuk limit.

| Acuan sumber                | Frame rate | Bitrate video | Estimasi 10 menit | Estimasi 30 menit |
| --------------------------- | ---------- | ------------- | ----------------- | ----------------- |
| Standar                     | 24–30 fps  | 4–6 Mbps      | 310–460 MB        | 929 MB–1,38 GB    |
| Tinggi                      | 24–30 fps  | 6–8 Mbps      | 460–610 MB        | 1,38–1,83 GB      |
| Tinggi, gerakan lebih halus | 50–60 fps  | 8–12 Mbps     | 610–910 MB        | 1,83–2,73 GB      |

Rumus estimasi: (bitrate video Mbps + 0,128) × durasi detik / 8 = MB. [YouTube encoding settings](https://support.google.com/youtube/answer/1722171?hl=en) memakai H.264 dan acuan upload 1080p SDR 8 Mbps pada 24–30 fps / 12 Mbps pada 48–60 fps. Acuan utama 4–6 Mbps adalah pilihan budget storage proyek ini; bukti kualitas visual FFmpeg tetap diperlukan. Profil keluaran HLS ditetapkan terpisah di HLS-PROFILE-001.

### Format sumber, durasi dan poster — disetujui 3 Oktober 2026

Pengguna menyetujui format sumber sesuai rekomendasi berikut. Ini whitelist pasangan container/video codec yang direncanakan, bukan bukti semua file sudah dapat diproses runtime.

| Container sumber | Video codec yang diterima |
| ---------------- | ------------------------- |
| MP4 (`.mp4`)     | H.264 atau H.265/HEVC     |
| MOV (`.mov`)     | H.264 atau H.265/HEVC     |
| MKV (`.mkv`)     | H.264 atau H.265/HEVC     |
| WebM (`.webm`)   | VP8 atau VP9              |

- Validasi memakai container/codec aktual melalui FFprobe serta proof decode FFmpeg, bukan ekstensi/MIME deklarasi klien saja. File rusak, pasangan di luar whitelist atau yang tidak dapat didecode ditolak. Kebijakan audio, HDR/VFR/fps di luar acuan tetap refinement; format sumber tidak menetapkan codec keluaran HLS.
- `movie`: durasi maksimum **30 menit (1.800 detik)** dan file sumber maksimal **1,5 GB (1.500.000.000 byte)**. `episode`: durasi maksimum **10 menit (600 detik)** dan file sumber maksimal **512 MB (512.000.000 byte)**. Batas inklusif; tepat di batas diterima bila syarat lainnya terpenuhi, lebih dari batas ditolak.
- `standalone` adalah video mandiri yang tidak menjadi episode series, misalnya cerita pendek atau video sekali tayang. `movie` juga mandiri tetapi memakai kategori editorial film; durasi bukan penentu kind. Batas terbaru standalone mengikuti movie: maksimal **30 menit (1.800 detik)** dan **1,5 GB (1.500.000.000 byte)**, inklusif, menggantikan keputusan standalone 10 menit sebelumnya.
- Poster/sampul menggunakan satu standar bagi movie, episode, standalone serta sampul series: gambar diam portrait **9:16**, unggahan **JPG/JPEG, PNG atau WebP** maksimal **5 MB (5.000.000 byte)**, dimensi sumber setelah orientasi diterapkan minimal **1080 × 1920 piksel**, hasil akhir **WebP 1080 × 1920 piksel**. Dimensi hasil sampul tidak mengikuti setiap file video. Sumber 9:16 yang lebih besar diperkecil; gambar di bawah minimum, berasio berbeda atau animasi ditolak tanpa crop/upscale otomatis. Video juga wajib portrait 9:16; tidak menetapkan backdrop landscape sebagai kebutuhan media.
- API/worker kelak memverifikasi ukuran objek serta format, jumlah frame, orientasi dan dimensi melalui decode gambar aktual. Ekstensi/MIME dari klien tidak cukup. Sampul baru siap setelah hasil WebP berukuran 1080 × 1920 terverifikasi dan tersimpan; bukti decode/konversi diperlukan pada implementasi media. Batas 5 MB adalah ukuran sumber unggahan, bukan target ukuran setiap hasil kompresi.
- Proof implementasi kelak: movie/standalone tepat 1.800 detik versus lebih, episode tepat 600 detik versus lebih, 1.500.000.000 byte versus +1 untuk movie/standalone dan 512.000.000 byte versus +1 untuk episode, container/codec sesuai dan tidak sesuai, ekstensi palsu serta gagal decode. Sampul: JPG/PNG/WebP valid, 5.000.000 byte versus +1, sumber tepat 1080 × 1920 versus di bawah minimum, 9:16 lebih besar yang diperkecil, orientasi gambar, penolakan landscape/rasio lain/animasi dan hasil WebP tepat 1080 × 1920. Poster wajib saat publish sesuai keputusan nomor 5 yang disetujui 4 Oktober 2026.

### Nomor 2 — S3 multipart upload disetujui 3 Oktober 2026

Pengguna memilih **S3 multipart saja**, dengan file dipecah menjadi bagian kecil. Metode berlaku pada upload media aplikasi melalui kontrak yang sama di MinIO development dan R2 production. Ini keputusan rencana; belum ada implementasi/proof runtime multipart.

- API admin membuat multipart session dan namespace/key storage, mengotorisasi upload setiap part, lalu menangani complete/abort/status. Browser mengirim part langsung ke MinIO/R2 memakai URL bertanda tangan; body file tidak melewati API/gateway web. Credential storage tetap server-side.
- Video dibagi menjadi beberapa part; storage menggabungkan part sesuai urutan saat complete. Sampul <=5 MB dapat memakai satu part terakhir dalam alur multipart yang sama, tanpa padding agar memenuhi minimum part biasa. Decode/konversi sampul tetap mengikuti standar sebelum siap.
- Retry hanya part yang gagal. Rencana resume mencatat session/provider upload ID serta daftar part/ETag server-side di PostgreSQL dan memeriksa daftar storage. Setelah refresh/menutup browser, admin memilih kembali file yang sama; identitas file harus diverifikasi, bukan hanya nama file. Detail identity/checksum/retensi resume masih refinement MEDIA-DESIGN-001.
- Complete idempotent memeriksa jumlah/urutan/identitas part dan size objek aktual, lalu menerapkan freeze/probe sebelum enqueue. Tidak menyimpan seluruh file sebagai blob di database. Upload selesai tidak otomatis berarti media siap dipublikasikan.
- Pembagian part ini hanya untuk transfer file sumber; segment HLS adalah keluaran FFmpeg tersendiri setelah upload/probe. Ukuran part upload tidak menentukan durasi/ukuran segment HLS.

Pengguna menyetujui ukuran part berbasis **2% dengan minimum 5 MiB selain part terakhir** pada 4 Oktober 2026. Ukuran part, session TTL 24 jam, maksimal 3 part paralel per file dan URL part TTL 15 menit dibatasi sisa session merupakan keputusan yang disetujui. Seluruh parameter memerlukan proof implementasi:

| Parameter             | Keputusan atau rekomendasi                                                                          |
| --------------------- | --------------------------------------------------------------------------------------------------- |
| Ukuran part           | Target 2% dari ukuran file aktual; dihitung sekali menjadi byte, minimal 5 MiB selain part terakhir |
| Upload bersamaan      | Maksimal 3 part per file                                                                            |
| Masa berlaku session  | 24 jam sejak initiate                                                                               |
| Masa berlaku URL part | 15 menit; dapat diperbarui selama session/admin masih sah                                           |

Pengguna menanyakan pembagian berdasarkan persentase pada 4 Oktober 2026. Pembagian 2% dengan minimum provider kemudian disetujui pada 4 Oktober 2026, menggantikan usulan ukuran tetap 16 MiB. Hitung dari ukuran file aktual, bukan cap per jenis konten: `partSizeBytes = max(ceil(fileSizeBytes / 50), 5.242.880)`, `partCount = ceil(fileSizeBytes / partSizeBytes)`. Tetapkan ukuran part yang sama untuk seluruh part biasa dalam satu session; part terakhir berisi sisa byte. Simpan geometry hasil perhitungan agar retry/resume tidak mengubah batas part.

Contoh: file 512 MB → 50 part × 10,24 MB; 1,5 GB → 50 part × 30 MB; 100 MB → 20 part (19 × 5 MiB dan satu sisa); sampul <=5 MB → satu part. Pada file kecil, persentase efektif per part dapat lebih besar dari 2% agar memenuhi minimum provider. Progress UI dihitung dari byte berhasil/total byte, bukan menganggap setiap part selalu tepat 2%. Batas file/codec/durasi tetap mengikuti kind yang disetujui. Session expired/aborted tidak dapat dilanjutkan; cleanup multipart sementara mengikuti task cleanup dengan bounds yang akan dibuktikan.

[Cloudflare R2 Upload objects](https://developers.cloudflare.com/r2/objects/upload-objects/) menjelaskan multipart untuk file besar/resumable, retry part yang gagal serta part minimal 5 MiB selain part terakhir. [R2 S3 API compatibility](https://developers.cloudflare.com/r2/api/s3/api/) menjadi acuan capability provider. Dokumentasi belum membuktikan presign per-part/create/list/complete/abort melalui native Bun atau MinIO lokal; MEDIA-PROOF-001 tetap prerequisite sebelum implementasi. Multipart server otomatis dari writer tidak dianggap proof resume browser.

### Nomor 2 — parameter upload disetujui 4 Oktober 2026

Session upload **24 jam sejak initiate** disetujui melalui cleanup nomor 6 pada 4 Oktober 2026. Pengguna menyetujui **maksimal 3 part paralel per file** dan **URL part 15 menit sejak diterbitkan**, dibatasi sisa umur session, pada 4 Oktober 2026. URL baru dibatasi juga oleh sisa umur session; API hanya menerbitkan/memperbaruinya saat admin dan session masih sah. URL kedaluwarsa diperbarui untuk part yang belum berhasil, tanpa mengulang part yang sudah terverifikasi.

TTL efektif setiap URL part kelak dihitung server: remainingSessionSeconds = floor((sessionExpiresAt - now) / 1000), partUrlTtlSeconds = min(900, remainingSessionSeconds). Bila session tidak pending/sudah expired/aborted, admin tidak sah atau sisa waktu kurang dari 1 detik, API menolak presign. Renewal mengotorisasi ulang dan hanya untuk part yang belum selesai; tidak mengubah expiry session atau signature lama. Browser scheduler membatasi 3 request UploadPart per file; nilai aman dapat disampaikan lewat DTO konfigurasi, tanpa credential. Batas ini berbeda dari concurrency worker default 1 video.

Untuk koneksi terputus, rencana tetap retry part gagal dan resume setelah file yang sama dipilih kembali serta identitasnya diverifikasi. Session yang habis/di-abort tidak dapat dilanjutkan; API menolak presign/complete dan proses cleanup meng-abort multipart yang tertinggal. SLA cleanup, rekonsiliasi race serta efek URL lama memerlukan proof. Umur session aplikasi berbeda dari lifecycle multipart provider; jangan mengandalkan provider otomatis membersihkannya dalam 24 jam.

[Cloudflare R2 presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/) mendukung expiry eksplisit; pilihan 15 menit dan concurrency 3 part per file adalah keputusan aplikasi yang disetujui, bukan kewajiban provider; session TTL 24 jam disetujui pada nomor 6. Runtime belum menerapkan kontrak upload.

### Current behavior dan desired behavior media

Saat ini factory memasang auth dan 16 endpoint metadata; loader env belum mengonsumsi storage/FFmpeg, schema belum memiliki aset/job/rendition, gateway bisnis web belum ada, dan player demo memakai MP4. Target: kontrak storage yang sama pada API/worker di kedua lingkungan, upload terverifikasi dengan source immutable, queue PostgreSQL persisten, hasil HLS lengkap sebelum ready, preview privat, publish/unpublish aman, serta playback publik hanya untuk konten yang efektif terbit.

### Kontrak konfigurasi env yang direncanakan

- `STORAGE_PROVIDER` wajib ketika module media diaktifkan: enum `minio|r2`; tidak menebak provider dari hostname dan tidak fallback diam-diam. `NODE_ENV=production` harus memakai `r2` untuk deployment proyek ini. Pergantian provider melalui env, tanpa perubahan kode domain.
- Satu set `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, dan `S3_SESSION_TOKEN` optional dikonsumsi adapter. Client dibuat sekali per proses API/worker melalui injeksi dependency; hindari singleton global yang memilih credential fallback tidak sengaja.
- MinIO awal: endpoint loopback port 9000, region `us-east-1`, bucket existing `vertical-movie-app`. URL Console `/browser/...` tidak valid sebagai endpoint S3. HTTP hanya untuk development lokal; endpoint R2 production HTTPS dan region `auto`.
- API dan worker menggunakan konfigurasi provider/bucket yang konsisten. Credential aplikasi dibatasi pada bucket proyek; credential root MinIO tidak dicopy ke contoh env atau dokumen. Semua secret berada di API/worker, tanpa `VITE_*` storage.
- Signed URL harus dibentuk untuk endpoint yang dapat dijangkau browser; jangan mengganti host URL sesudah ditandatangani. Jika runtime kemudian containerized, refinement menetapkan hostname yang valid untuk browser dan proses, lalu membuktikan signature/CORS.
- `FFMPEG_PATH`/`FFPROBE_PATH` tetap env server. Format produk tetap HLS; tidak perlu env untuk mengganti HLS menjadi format lain. `MEDIA_PLAYBACK_BASE_URL` adalah origin/path delivery terkontrol, bukan endpoint S3/Console; wajib setelah kontrak delivery ditetapkan, kosong sebelum itu.
- `config/env.ts` kelak memvalidasi kombinasi provider/endpoint/region/bucket/credential serta URL tanpa userinfo, query atau fragment. Nilai/error sensitif dan signed URL tidak dicetak. `turbo.json` harus meneruskan selector/base delivery ke `api#dev`/`api#start` dan task worker saat tersedia; perubahan mengikuti bundled docs Turbo. Sampel env pada sesi ini belum mengaktifkan loader tersebut.
- `media_assets`/`media_renditions` menyimpan provider, bucket dan key, bukan signed URL. Ganti env tidak memindahkan data lama; perubahan provider pada dataset berisi aset memerlukan copy/verifikasi dan pembaruan pointer yang direncanakan terpisah.

Contoh profil lengkap dan status variabel berada pada [Environment](ENVIRONMENT.md#storage-dan-hls--runtime-aktif). Scope env sample adalah dokumentasi, bukan konfigurasi live atau bukti akses bucket.

### Nomor 3 — profil HLS disetujui 4 Oktober 2026

Pengguna menyetujui profil **hls-v1** pada 4 Oktober 2026: ladder dan bitrate berikut, H.264 SDR/AAC 128 kbps, output hingga 30 fps, segment fMP4 sekitar 6 detik, portrait 9:16 tanpa upscale, serta playback adaptif. Bitrate hasil streaming terpisah dari acuan bitrate file sumber. Angka merupakan keputusan proyek, bukan standar bitrate wajib dari FFmpeg. Detail encoder/GOP/SAR/VFR/MIME serta proof kualitas/compatibility HLS-PROFILE-001 tetap diperlukan sebelum implementasi worker.

| Kualitas portrait 9:16 | Target rata-rata bitrate video | Audio bila tersedia | Tujuan                              |
| ---------------------- | ------------------------------ | ------------------- | ----------------------------------- |
| 480p                   | 1,2 Mbps                       | AAC-LC 128 kbps     | Pilihan hemat data/koneksi terbatas |
| 720p                   | 2,5 Mbps                       | AAC-LC 128 kbps     | Pilihan seimbang                    |
| 1080p                  | 4,5 Mbps                       | AAC-LC 128 kbps     | Kualitas tertinggi                  |

- Codec output **H.264 SDR, pixel format yuv420p**; AAC-LC hingga stereo 48 kHz bila ada audio. Sumber tanpa audio menghasilkan video-only, tanpa menambahkan audio buatan. Kebijakan input HDR dan konversinya belum ditetapkan; jangan mengasumsikan tone mapping otomatis.
- Rendition hanya dibuat bila dimensi tampilan sumber mencukupi, tanpa crop/upscale. Sumber 1080p dapat memperoleh tiga kualitas, sumber 720p memperoleh 480p/720p, sumber minimum memperoleh kualitas minimum saja. Contoh target square-pixel 9:16: 486 × 864, 720 × 1280, 1080 × 1920. Batas sumber tetap lebar tampilan minimum 480; sumber valid di bawah target 486 tidak boleh di-upscale atau ditolak hanya karena contoh target tersebut. HLS-PROFILE-001 membuktikan keluaran native/dimensi genap/SAR yang mempertahankan rasio dan batas sumber untuk kasus itu sebelum membekukan mapping ladder.
- Frame rate output yang disetujui **hingga 30 fps**: pertahankan 24/25/30 fps beserta padanan rational umum; sumber di atas 30 fps diturunkan ke 30 fps. Ini keputusan profil output, bukan perubahan aturan penerimaan sumber 60 fps yang sudah diizinkan selama memenuhi size limit. Normalisasi VFR/nonstandard fps masih membutuhkan refinement/proof.
- Format **HLS VOD**, master/variant playlist .m3u8, **segment fMP4** dengan init.mp4 per rendition. Target durasi segment **6 detik**; segment terakhir dapat lebih pendek dan durasi aktual bergantung keyframe. [FFmpeg HLS muxer](https://ffmpeg.org/ffmpeg-formats.html#hls-2) mendukung fMP4 pada HLS versi 7 ke atas dan memotong pada keyframe berikutnya setelah target durasi. Proof browser/player tetap diperlukan.
- Closed GOP dan keyframe antar-rendition harus selaras. Rekomendasi interval keyframe **2 detik**, dengan boundary segment sekitar setiap 6 detik; pembulatan frame rate rational diverifikasi. Jangan memakai split_by_time untuk memaksakan potongan non-keyframe. EXT-X-INDEPENDENT-SEGMENTS hanya dinyatakan setelah seluruh segment terbukti mulai pada keyframe; playlist VOD lengkap memakai ENDLIST.
- Batas peak bitrate/VBV, preset encoder dan nilai BANDWIDTH/AVERAGE-BANDWIDTH manifest ditetapkan dari proof hasil encode, termasuk sample adegan bergerak cepat. Target rata-rata bukan jaminan ukuran persis atau kualitas visual semua sumber. Worker resource/timeouts dibahas pada kelompok operasional.
- Player memilih rendition secara adaptif berdasarkan koneksi melalui integrasi Video.js HLS yang diverifikasi. Pemilihan kualitas manual dan fallback native Safari perlu proof tersendiri; jangan menjanjikan kontrol yang sama pada semua engine.
- Dengan tiga rendition dan AAC 128 kbps dimux ke masing-masing, estimasi total output sebelum overhead sekitar **644 MB untuk 10 menit / 1,93 GB untuk 30 menit**, dari (1,2 + 2,5 + 4,5 + 3 × 0,128) Mbps. Ini jumlah seluruh kualitas yang disimpan, bukan data yang harus diunduh setiap penonton. Cap unggahan 512 MB/1,5 GB tidak membatasi jumlah seluruh keluaran HLS; kapasitas storage harus memperhitungkan output plus sumber selama sumber masih disimpan.

### Nomor 4 — akses video, distribusi HLS dan cache disepakati 4 Oktober 2026

Lifecycle video disetujui 4 Oktober 2026: **draft → published → archived**, tanpa status produk unpublished. Schema/layanan metadata belum disesuaikan; VID-016 membuktikan transisi/migration compatibility. Pengguna memilih **satu bucket aplikasi per environment** pada 4 Oktober 2026 dan meminta rekomendasi. Bucket MinIO development tetap vertical-movie-app; R2 production memakai satu S3_BUCKET dari env. Bucket integrasi dedicated tetap terpisah dari bucket aplikasi; pilihan ini bukan satu bucket global lintas provider/environment.

**Kontrak yang disepakati: seluruh bucket privat + playlist melalui API + signed URL untuk data HLS langsung dari storage.** Tidak membuat folder public-read atau bucket kedua untuk publication. Ini menggantikan usulan dua bucket/full gateway segment. Persetujuan produk tidak membuktikan implementasi signing/player/storage telah berjalan.

| Prefix contoh                    | Isi                                                                        | Akses rekomendasi                                             |
| -------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------- |
| uploads/                         | Namespace sumber sementara untuk upload/verify/freeze                      | API/admin/worker sesuai operasi                               |
| sources/                         | Sumber asli yang sudah dibekukan, termasuk input gambar                    | Server/worker; tidak menjadi playback penonton                |
| outputs/<asset>/<job>/<attempt>/ | Master/variant/init/segment HLS serta derivative gambar/caption sesuai job | Bucket tetap privat; API menerbitkan akses ke output yang sah |

Folder hanya prefix organisasi. Status draft/published/archived berada di database; publish/archive tidak memindahkan atau mengganti nama ribuan segment. Namespace hasil tetap immutable, dan playback menunjuk job aktif. Retensi/penghapusan sumber/hasil dibahas pada kelompok operasional terpisah.

Alur target yang disepakati:

1. Web meminta DTO playback dari API. Untuk published, API memeriksa effective visibility dan output aktif; pengunjung tetap tanpa akun. Untuk preview draft, requireAdmin authoritative dan origin/sesi aplikasi tetap berlaku. Archived tidak memperoleh playlist/URL baru.
2. Master playlist disajikan API dan menunjuk endpoint variant playlist yang juga memeriksa akses. API membaca manifest dari storage, memverifikasi referensi dalam namespace job yang sah, lalu menulis ulang URI. Playlist API/preview memakai no-store; bukan proxy bebas atas bucket key dari klien.
3. Variant playlist memuat signed GET URL untuk init.mp4, setiap segment .m4s, dan caption yang digunakan. Menandatangani master saja tidak cukup. URL/izin poster pada DTO katalog juga diterbitkan API sesuai effective visibility; source asli tidak diberi URL playback.
4. Player mengambil byte init/segment langsung dari MinIO/R2; body video tidak melewati API. API tetap melayani DTO/playlist/signing, sehingga browser memerlukan akses kedua origin dan CORS storage yang benar. Credential/key penandatanganan tetap server-side; signed URL tidak disimpan sebagai identitas aset atau dicetak di log.

**TTL playback disetujui 4 Oktober 2026: 2× durasi video aktual terverifikasi**, menggantikan usulan 60 menit tetap. API menghitung dari durasi playback yang sudah diprobe/terverifikasi pada output aktif, bukan cap kind, durasi deklarasi klien, panjang segment 6 detik atau waktu upload. Rumus integer detik: playbackUrlTtlSeconds = ceil(2 × verifiedDurationMs / 1000), dengan durasi positif; expiresAt mengikuti timestamp signing + TTL, bukan waktu DTO diterima player. Contoh 3 menit → 6 menit, episode 10 menit → 20 menit, movie 30 menit → 60 menit. Pembulatan per detik perlu fixture untuk durasi fractional/sangat pendek tanpa floor menit yang mengubah keputusan 2×.

Renewal menandatangani URL baru dengan aturan 2× yang sama, setelah pemeriksaan published/admin/output aktif; tidak memperpanjang signature lama. Pause/seek melewati expiry perlu refresh manifest/URL yang mempertahankan posisi dan play/pause. Semua URL init/segment/caption serta earliest expiry playlist dicatat untuk refresh; proof Video.js/hls.js dan Safari native mencakup movie panjang, video pendek, background tab, quality switch, expiry/retry dan penolakan renewal setelah archive. Runtime belum mengonsumsi keputusan ini.

#### Cache — expiry dan invalidation

Pengguna menetapkan cache memiliki waktu invalidasi dan menyetujui rincian berikut pada 4 Oktober 2026: metadata/katalog TTL 60 detik + event invalidation, playlist/DTO signed no-store, segment privat dengan freshness maksimal min(300 detik, sisa umur URL) bila diaktifkan dan proof header lolos. TTL dan event invalidation berbeda: TTL membatasi freshness berdasarkan waktu, sedangkan event publish/archive/update menggugurkan cache yang dikelola aplikasi. Cache terkait signature tidak boleh memperpanjang akses melalui expiry yang lebih lama atau TTL yang direset setiap cache hit. Batas akses data yang sudah diterima player tetap terpisah.

| Jenis cache                                         | Keputusan produk; belum proof                                        | Expiry/invalidation                                                                                                                                                   |
| --------------------------------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Metadata/katalog aplikasi                           | TTL 60 detik, disetujui                                              | Invalidate cache backend/admin setelah commit publish/archive/update; katalog di browser pengunjung mengikuti refetch/TTL, bukan diasumsikan terhapus remote seketika |
| DTO playback/playlist dengan signed URL dan preview | no-store                                                             | Baca baru memeriksa akses/output aktif dan menandatangani URL sesuai durasi; tidak reuse response bertanda tangan lintas viewer                                       |
| Cache browser init/segment/caption bertanda tangan  | Privat; cache freshness positif hanya setelah proof response headers | Jika enabled, TTL maksimum min(300 detik, sisa umur URL) serta expiry absolut tidak melewati expiresAt; cache hit tidak menggeser expiry                              |
| Cache CDN/shared                                    | Tidak diaktifkan oleh rekomendasi satu bucket/S3 presign ini         | Bila ditambahkan, verifikasi izin sebelum cache hit, TTL/purge/versioning dan bound archive; jangan mengabaikan signature/query atau membuka bucket                   |

Cache freshness positif per signed response memerlukan proof MinIO/R2/native signing bahwa header dapat dibatasi pada sisa expiry, termasuk response yang datang terlambat. Metadata Cache-Control objek tetap dengan max-age = TTL penuh tidak dianggap proof: request dekat expiry dapat menyimpan cache fresh melewati URL expiry. Sampai terbukti, gunakan fallback private, no-cache (wajib revalidasi tiap reuse) atau no-store pada output terkait; bukan public immutable tanpa pemeriksaan izin. [Cache-Control](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control) membedakan private/no-cache/no-store; TTL cache tidak berarti byte langsung dihapus.

Invalidation cache yang dikelola aplikasi dilakukan setelah transaksi berhasil, dapat diulang, dan mempunyai fallback TTL saat invalidation gagal; output/key immutable memakai job version. Archive menolak URL baru, tetapi invalidation katalog/playlist tidak mencabut signature yang sudah dibagikan atau buffer/cache browser yang sudah diterima. [R2 presign expiry](https://developers.cloudflare.com/r2/api/s3/presigned-urls/) dan [Cloudflare cache purge](https://developers.cloudflare.com/cache/how-to/purge-cache/) memerlukan proof masing-masing bila digunakan. Menambah cache tidak dianggap menyelesaikan revocation instan.

Efek archive pada kontrak yang disepakati: segera hilang dari katalog dan API menolak penerbitan playlist/URL baru. **Signed URL yang sudah diterbitkan masih dapat dipakai sampai expiry** selama objek/credential masih valid; data buffer/cache yang sudah diterima tidak dapat ditarik kembali. Kontrak memakai akses dengan masa berlaku, bukan revocation instan. Persetujuan lanjut setelah penjelasan TTL/cache mencatat batas ini sebagai perilaku target. Jika kebutuhan kelak berubah menjadi pencabutan sebelum expiry, desain revocation/edge authorization perlu review terpisah. Archive bukan hard delete.

[R2 presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/) memakai domain S3 API dan tidak bekerja pada custom domain. Opsi ini tidak menjanjikan Cloudflare CDN caching/custom media domain; tidak menambah Worker runtime. [R2 CORS](https://developers.cloudflare.com/r2/buckets/cors/) menjadi proof browser direct GET/HEAD/Range/seek dan upload yang terpisah. Native [Bun S3](https://bun.com/docs/runtime/s3) dievaluasi untuk signing/provider compatibility sebelum dependency tambahan; referensi dokumentasi bukan proof akses bucket lokal/R2. Folder/public-policy MinIO yang berbeda dari R2 tidak dijadikan kontrak aplikasi.

### Nomor 5 — syarat publikasi disetujui 4 Oktober 2026

Tujuan: admin dapat menyimpan draft belum lengkap, lalu menerbitkan hanya ketika konten siap ditonton. Pengguna menyetujui syarat publikasi berikut pada 4 Oktober 2026 sebagai keputusan produk D4/PUBLISH-001. Implementasi endpoint, transaksi dan migration masih pekerjaan lanjutan.

| Pemeriksaan saat publish | Rekomendasi                                                                                                                                                                                                 |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Metadata                 | Judul dan sinopsis tidak kosong, slug unik/valid, kind serta hubungan konten sesuai. Batas field tetap mengikuti kontrak metadata yang ada; sinopsis boleh belum diisi pada draft tetapi wajib saat publish |
| Sumber                   | Aset aktif terverifikasi dan immutable, lolos format/rasio/resolusi/durasi/ukuran yang telah disetujui; source upload selesai saja belum berarti siap publish                                               |
| HLS                      | Job succeeded untuk source/profile/generation aktif; semua master/variant/init/segment wajib terverifikasi, sesuai ladder yang dapat dibuat dari sumber, bukan mewajibkan 1080p untuk sumber 480p/720p      |
| Sampul                   | Poster wajib dan sudah terverifikasi sebagai WebP 1080 × 1920, milik konten yang benar; standar sampul yang sudah disetujui tetap berlaku                                                                   |
| Hak tayang               | Admin mengonfirmasi rightsConfirmed; timestamp dan actor dicatat server, memakai field metadata yang sudah ada                                                                                              |
| Subtitle/caption         | Opsional untuk MVP. Jika dilampirkan sebagai bagian playback, format/bahasa/timing/akses harus valid dan aset siap sebelum publish; tidak membuat auto-transcription sebagai syarat                         |
| Aksi admin               | Publish manual setelah pratinjau; upload/transcode selesai tidak otomatis menerbitkan video. Lifecycle utama draft → published → archived tetap berlaku                                                     |

Genre, deskripsi panjang, judul asli, bahasa asal, tahun/tanggal rilis tetap optional pada keputusan ini; tidak menambah kewajiban di luar judul/sinopsis/slug/kind/parent, source/HLS/poster dan rights confirmation. API mengembalikan daftar syarat yang belum terpenuhi agar admin dapat memperbaikinya; status tidak berubah bila pemeriksaan gagal.

**Aturan series/episode yang disetujui:** episode dapat disiapkan berstatus published ketika series masih draft, tetapi efektif terlihat/playable hanya ketika series published dan season/series/video tidak archived. Series boleh publish setelah judul/sinopsis/poster siap dan minimal satu episode berstatus published dengan source/HLS/poster/hak siap. Series tanpa episode efektif playable tidak ditampilkan pada katalog. Persetujuan mencakup visibilitas parent dan syarat publish series. Lifecycle series/season serta cascade archive/restore masih perlu dibahas terpisah.

Bukti sebelum PUBLISH-001 selesai: publish ditolak saat metadata/rights/poster/HLS tidak siap atau salah ownership/source generation; status tetap draft pada kegagalan. Uji episode published pada series draft tidak bocor lewat daftar/detail/playback/next-episode; series publish membuka episode yang memenuhi syarat. Repeated publish idempotent, rowVersion conflict serta race publish/archive/source replacement konsisten; signed URL/catalog cache mengikuti nomor 4 setelah commit. VID-016 + WORKER-002 + HLS-DELIVERY-001 menjadi prerequisite implementasi; syarat produk D4 sudah disetujui. File/service/endpoint/migration belum diubah pada pembahasan ini.

### Nomor 6 — retensi dan cleanup disetujui 4 Oktober 2026

Keputusan pengguna 4 Oktober 2026: video asli cukup disimpan **1 minggu (7 hari)**; file konten archived disimpan **selamanya tanpa penghapusan otomatis**. Pengguna mengonfirmasi bahwa **semua aset konten archived, termasuk video asli, disimpan selamanya**; aturan 7 hari hanya berlaku pada video asli konten yang belum archived. Pengguna menyetujui rekomendasi titik awal hitungan dan cleanup pada 4 Oktober 2026, lalu meminta penjelasan makna retensi video asli. Ini keputusan produk untuk plan; implementasi dan proof runner masih pending.

Titik awal sumber yang berhasil yang disetujui: 7 hari sejak HLS lengkap terverifikasi dan ditetapkan sebagai output siap, bukan sejak upload/publish. Jika belum ada output siap atau job masih queued/running/retry, source tidak eligible untuk penghapusan oleh aturan sukses. Source yang gagal terminal menggunakan jendela retry terpisah pada tabel berikut. Masa simpan konten archived melindungi video asli/HLS/sampul/subtitle dan aset konten sah lainnya; file parsial atau multipart belum selesai tetap mengikuti cleanup gagal. Archive harus memblokir retensi/delete pada semua aset kontennya. Tidak mengaktifkan expiry menyeluruh pada outputs/ atau sources/ hanya berdasarkan umur objek karena lifecycle prefix tidak mengetahui status archived. Video asli yang sudah dihapus sebelum archive tidak dapat dipulihkan oleh perubahan status; untuk menyimpan kembali aslinya perlu unggah ulang, dengan alur pemulihan diperinci terpisah.

| Objek/kondisi                                 | Aturan yang disetujui                                                        | Titik awal dan syarat                                                                                                                                                 |
| --------------------------------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Upload multipart terputus/gagal sementara     | Bisa resume selama session 24 jam; sesudah expired, abort dan bersihkan part | 24 jam sejak session dibuat, tidak diperpanjang setiap retry; session TTL ini disetujui melalui nomor 6                                                               |
| Upload dibatalkan admin                       | Segera tandai aborted, hentikan URL baru dan abort multipart                 | Tidak menunggu 24 jam; rekonsiliasi part/request yang masih berjalan wajib dibuktikan                                                                                 |
| Upload selesai tetapi pasti ditolak validasi  | Karantina 24 jam lalu hapus objek tidak valid                                | Sejak kegagalan validasi terminal; tidak memiliki pointer source/output sah atau job aktif. Error storage sementara tidak dianggap input tidak valid                  |
| Output HLS parsial dari attempt gagal         | Hapus setelah 24 jam                                                         | Sejak attempt berhenti/lease diselesaikan; tidak dipakai playback/preview, bukan output succeeded yang disimpan permanen; retry memakai namespace attempt baru        |
| File kerja FFmpeg pada disk                   | Bersihkan segera setelah proses berhenti, baik sukses maupun gagal           | Sweep file orphan setelah restart hanya bila proses/lease pemilik dipastikan tidak aktif; umur folder saja tidak cukup                                                |
| Video asli setelah transcoding gagal terminal | Simpan 7 hari untuk retry manual, lalu hapus jika tetap gagal                | Sejak job gagal terminal setelah retry otomatis habis; jangan hapus saat queued/running/retry atau bila sumber dilindungi pengecualian archived yang sudah disepakati |

Cleanup runner disepakati berjalan **setiap 1 jam**, sehingga objek yang eligible biasanya dibersihkan pada sweep berikutnya saat layanan sehat; bukan janji provider tepat menghapus pada detik expiry. Semua keputusan penghapusan berdasar row/session/job/attempt dan ownership, dengan claim durable serta serialisasi terhadap complete/retry/publish/archive. Claim deletion mencegah job baru memakai source yang sedang dihapus dan harus diserialisasi dengan archive: jika archive menang lebih dahulu, cleanup dibatalkan; jika delete sudah dimulai, archive menunggu rekonsiliasi dan mencatat keberadaan source aktual. Race atau dependency tidak pasti membuat cleanup ditunda. Operasi storage di luar transaksi, delete/abort dapat diulang, kegagalan diretry dan direkonsiliasi. Sweep ulang namespace attempt setelah proses lama berhenti menangani write terlambat. Tidak menyapu bucket atau prefix seluruh konten.

Video asli adalah berkas input utuh yang diunggah admin, misalnya movie.mp4, pada sources/. HLS adalah hasil terpisah di outputs/: playlist .m3u8, init.mp4 dan segment .m4s untuk streaming. Retensi 7 hari menentukan kapan berkas input boleh dihapus dari bucket; HLS siap, metadata, poster dan subtitle sah tidak ikut dihapus oleh timer sumber, dan status published tidak berubah. Deadline berjalan sejak HLS verified-ready meskipun video masih draft; deadline bukan batas umur publikasi atau masa berlaku URL playback. Contoh: HLS siap 4 Oktober 2026 pukul 10.00 WIB → sumber eligible 11 Oktober pukul 10.00 WIB jika konten belum archived dan tidak ada job aktif. Archive sebelum source deletion melindungi source selamanya; archive sesudah deletion hanya dapat mempertahankan aset yang masih ada.

Penghapusan objek sumber tidak menghapus metadata video, fakta verifikasi source, relasi provenance atau output HLS. Rancangan media perlu membedakan keberadaan objek sumber dengan status konten/output siap: simpan retention deadline, deletion claim/status dan timestamp tombstone; DTO tidak menawarkan download/reprocess pada source yang sudah dihapus. Publish/playback tetap dapat memakai HLS siap beserta fakta source yang sudah terverifikasi walaupun objek sumber telah dibersihkan. Transcode ulang membutuhkan unggah ulang setelah source hilang. Detail schema/claim dan proof race termasuk MEDIA-DESIGN serta task retensi terpisah; belum dibuat migration atau runner.

Bukti wajib sebelum cleanup Done: injected clock menguji tepat deadline dan sebelum deadline, abort/complete bersamaan, in-flight parts, retry/delete/archive bersamaan, stale worker output, storage outage/delete retry, source tombstone tanpa merusak publication gate, serta perlindungan output sukses dan konten archived. MEDIA-CLEANUP-001 tetap upload cleanup; retensi source dan cleanup output FFmpeg dipecah ke task worker/retensi sebelum implementasi. Dedicated test bucket/namespace tetap wajib; sesi ini tidak menghapus file atau mengubah lifecycle bucket.

Referensi provider: [R2 object lifecycle](https://developers.cloudflare.com/r2/buckets/object-lifecycles/) mendokumentasikan default abort multipart tujuh hari sejak initiation dan waktu penghapusan lifecycle yang asynchronous; default itu berbeda dari session aplikasi 24 jam yang disetujui. Lifecycle hanya backstop multipart setelah proof konfigurasi/provider, bukan pengganti cleanup berbasis status DB. [S3 AbortMultipartUpload](https://docs.aws.amazon.com/AmazonS3/latest/API/API_AbortMultipartUpload.html) menjelaskan risiko part yang masih in-flight saat abort dan verifikasi ListParts; perilaku MinIO/R2 tetap harus diuji, tidak diasumsikan identik dari dokumentasi AWS.

### Nomor 7 — kebijakan worker disetujui 4 Oktober 2026

Pengguna meminta rekomendasi worker pada 4 Oktober 2026. Queue **PostgreSQL** dan **FFmpeg melalui Bun subprocess di apps/api**, di luar request HTTP/transaksi, sudah menjadi keputusan repositori. Pengguna menyetujui konfigurasi parameter worker melalui env server dan **MEDIA_WORKER_CONCURRENCY default 1** pada 4 Oktober 2026. Ini satu job video bersamaan per instance worker, bukan jumlah thread atau jumlah kualitas. Saat env tidak diisi, loader worker kelak memakai default 1; env yang diisi wajib integer positif dan perubahan diterapkan saat restart worker. Pengguna kemudian menyetujui retry 3 attempt total dengan jeda 1/5 menit, timeout encoding max(15 menit,3×durasi), stall 5 menit, heartbeat 15 detik/lease 120 detik dan recovery poll 30 detik pada 4 Oktober 2026. Penentuan thread/RAM/disk melalui benchmark juga disetujui; angka thread/RAM/disk tetap kandidat proof, bukan nilai produk final. Target uji production 4 core/RAM 4 GB diberitahukan pengguna; kandidat worker disesuaikan pada nomor 8, menggantikan budget 3 GiB untuk target tersebut. Poll idle 5 detik, jitter ±20%, probe 60 detik, attempt total 2 jam, update progress 5 detik dan shutdown 60/10 detik tetap rekomendasi teknis untuk refinement/proof. Hardware production belum diketahui; timeout bukan estimasi waktu selesai.

| Parameter              | Keputusan atau rekomendasi                                                                   | Arti/batas                                                                                                                                                                                             |
| ---------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Worker dan concurrency | Concurrency default 1 disetujui; satu instance sebagai deployment awal yang direkomendasikan | Satu video aktif; video berikutnya menunggu. Job membuat seluruh ladder yang sesuai sumber; bukan tiga job independen yang dapat mempublikasikan output parsial                                        |
| Urutan claim           | Eligible oldest-first; poll idle 5 detik                                                     | available_at/created_at/id deterministik, tidak menjamin FIFO sempurna saat row terkunci; job retry menunggu backoff                                                                                   |
| Retry otomatis         | Maksimal 3 attempt total                                                                     | Percobaan pertama + 2 retry; delay 60 detik lalu 300 detik, jitter ±20%; attempts naik saat claim dan crash tetap memakai budget                                                                       |
| Heartbeat dan lease    | Heartbeat 15 detik; lease 120 detik                                                          | Heartbeat menyatakan worker masih memegang job; tidak menyatakan FFmpeg maju; renew/finish memakai token dan waktu DB                                                                                  |
| Pemulihan lease        | Sweep setiap 30 detik                                                                        | Requeue job dengan lease expired bila budget tersisa; failed terminal setelah habis. Waktu normal deteksi sekitar 2–2,5 menit sejak heartbeat terakhir; saat DB/worker mati lebih lama                 |
| Timeout encoding       | max(15 menit, 3× durasi terverifikasi) per attempt                                           | Video 10 menit → batas 30 menit; video 30 menit → 90 menit. Batas penghentian, bukan janji kecepatan; exclude antrean/download/upload                                                                  |
| Watchdog progress      | 5 menit tanpa kemajuan nyata; FFprobe maksimal 60 detik                                      | FFmpeg frame/out_time harus bertambah; pesan progress yang berulang tidak cukup. Download/upload dinilai dari byte, bukan out_time                                                                     |
| Batas attempt total    | 2 jam sejak claim                                                                            | Mencakup download/probe/encode/upload/verify, exclude antrean dan backoff. Network outage tetap dibatasi, nilai dibenchmark pada MinIO/R2                                                              |
| Thread FFmpeg          | Kandidat target 4 GB: 1 thread per encoder video, decoder/filter pool 1                      | Tiga encoder rendition dapat memakai thread masing-masing; angka 1 bukan hard cap 1 CPU untuk seluruh proses; limit OS/container terpisah. Jangan membiarkan semua pool otomatis mengambil seluruh CPU |
| RAM dan disk kerja     | Kandidat target 4 GB: 1,5 GiB per worker beserta child; disk tersisa minimal 10 GiB per job  | Batas memori melalui supervisor/container/OS, bukan env saja. Admission/reservasi disk menghindari beberapa job memakai ruang yang sama; pilih /var/tmp/vertical-movie-app pada disk, bukan /tmp tmpfs |
| Progress admin         | Tahap + persentase encoding, update dibatasi 5 detik                                         | Waiting/download/probe/encode/upload/verify/ready/failed; 100% encode belum ready sampai seluruh HLS terunggah/terverifikasi. Stage internal tidak menambah publicationStatus                          |
| Shutdown               | Stop claim, grace 60 detik, kemudian hentikan FFmpeg                                         | SIGTERM child lalu maksimal 10 detik sebelum SIGKILL, await exit sebelum cleanup/release; supervisor harus menangani child orphan saat worker crash                                                    |

Mesin development saat diperiksa menyediakan 12 CPU logis/RAM sekitar 7,4 GiB, /tmp tmpfs 3,8 GiB dan disk /var/tmp memiliki sekitar 945 GiB kosong. Satu movie maksimal memerlukan source hingga 1,5 GB ditambah estimasi HLS tiga kualitas sekitar 1,93 GB sebelum overhead; tmpfs tersebut terlalu sempit untuk headroom dan memakai RAM yang juga dibutuhkan encoder. Angka 10 GiB adalah guard awal, bukan kuota output atau pembatas kualitas. Jangan install/provision worker/FFmpeg sebagai bagian proposal ini; executable tidak ditemukan di PATH dan benchmark belum dijalankan. Production mulai satu instance/concurrency 1 sampai fixture dan load API membuktikan capacity untuk meningkat menjadi 2 atau lebih. Concurrency env bersifat per instance; banyak instance membutuhkan admission total/host yang eksplisit.

**Klasifikasi kegagalan:** koneksi/timeout storage/HTTP 429/5xx atau crash worker dapat retry dalam budget. Media rusak, codec/rasio/durasi tidak didukung, checksum sumber berbeda atau output invalid deterministik tidak diulang dengan input/perintah yang sama; failed terminal dengan alasan jelas. Credential salah, executable hilang, disk/RAM tidak cukup atau encoder configuration salah menahan admission dan memberi health/error operator; jangan menghabiskan budget dengan tiga percobaan identik. Timeout/stall yang berulang pada input yang sama berhenti sesuai budget dan dicatat untuk tuning, bukan retry tanpa batas. Setelah failed terminal, source mengikuti retensi 7 hari dan pengecualian archived nomor 6; retry manual hanya bila source masih tersedia dan membuat generation baru.

**Alur durable dan pemulihan:** upload-complete memverifikasi sumber/freeze identity, lalu dalam transaksi singkat menyimpan asset state serta enqueue job unik asset/profile/generation. Claim menggunakan FOR UPDATE SKIP LOCKED dan mengembalikan lease token unik; network/FFmpeg di luar transaksi. Jika token invalid atau lease tidak dapat diperbarui sampai deadline, worker menghentikan subprocess dan tidak dapat finish/aktivasi output. Recovery boleh menjalankan kembali seluruh transcode dari sumber asli; tidak melanjutkan segment parsial attempt lama. Sistem memberikan at-least-once execution dengan output activation yang idempotent/fenced, bukan jaminan hanya sekali mengeksekusi FFmpeg. Lease lama dapat sempat overlap saat crash/network partition, tetapi namespace output per attempt dan validasi token mencegahnya menjadi playback aktif.

Finish succeeded membutuhkan identitas source/profile/generation yang cocok, lease sah dan semua HLS wajib terverifikasi. Output parsial tidak terlihat publik, job succeeded tidak otomatis publish. Claim retry/reprocess/cleanup source dan archive harus saling terserialisasi agar retensi tidak menghapus input aktif; disk temp dibersihkan setelah proses berhenti dan output failed mengikuti 24 jam nomor 6. Readiness worker memeriksa versi executable/encoder/filter yang dibutuhkan dan koneksi DB/storage; log job/attempt/error/stage aman tanpa credential atau signed URL. Pipeline men-stream download/upload, membatasi stderr/progress buffering dan output manifest sesuai namespace, bukan memuat semua video ke RAM.

**Proof sebelum WORKER-001/002 Done:** durable enqueue/crash setelah commit, dua claimer dan batas per-host, fake clock/backoff/attempt limit, expiry serta stale finish setelah takeover, lease loss dan subprocess terminate/orphan, shutdown/restart, input rusak versus gangguan storage, resource admission/disk/memory, watchdog walaupun heartbeat sehat, semua hasil terverifikasi sebelum ready, cleanup/retensi/source tombstone/archived race. Benchmark real FFmpeg portrait sumber 480p/720p/1080p, H.264/HEVC/VP9, 60 fps, episode 10 menit dan movie 30 menit mencatat wall time/RSS/CPU/disk serta dampak latency API; target thread/preset/deadline dituning bila gagal. Unit melalui bun:test, PostgreSQL/bucket test dedicated/FFmpeg untuk integrasi; fixture benchmark production tetap diperlukan sebelum scale.

Konfigurasi melalui env, concurrency/retry/deadline/lease/recovery disetujui; resource ditetapkan melalui benchmark dan detail teknis tambahan dijelaskan pada [Environment](ENVIRONMENT.md#worker--env-aktif-dan-kandidat-resource). Sample apps/api/.env.example memuat concurrency/retry/deadline/lease/recovery sebagai konfigurasi rencana yang disetujui. Loader/env aktif/script worker, migration dan dependency belum diubah. WORKER-001/002 tetap roadmap; backlog kecil worker/retensi harus dipecah sebelum implementasi.

Referensi: [PostgreSQL locking SELECT](https://www.postgresql.org/docs/current/sql-select.html) menjelaskan SKIP LOCKED untuk consumer queue; schema/provider proyek tetap perlu integration proof. [Bun subprocess](https://bun.com/docs/runtime/child-process) menyediakan spawn/kill/timeout, dan [FFmpeg](https://www.ffmpeg.org/ffmpeg.html) mendokumentasikan progress, thread decoder/encoder serta filter pool. Angka retry/lease/concurrency/deadline di atas adalah rekomendasi aplikasi, bukan default yang diwajibkan referensi tersebut.

### Nomor 8 — rekomendasi deployment production dan R2, belum disetujui

Nomor 7 menetapkan kebijakan worker; ini proposal tahap berikutnya, bukan persetujuan membeli server/deploy/provision bucket. Pengguna memperkirakan server 4 core/RAM 4–8 GB dan akan mencoba RAM 4 GB lebih dahulu. Ini target uji, bukan server yang telah diprovision atau terbukti cukup. Provider/domain/disk belum ditentukan. Provider produk R2, satu bucket privat per environment, same-origin web/API serta direct signed segment tetap keputusan terdahulu.

| Bagian          | Rekomendasi awal                                                                                                                                                                                                                                                         |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Hosting         | Satu server Linux untuk MVP; pilih ukuran berdasarkan benchmark worker dan load API. Target uji pengguna 4 core/RAM 4 GB; lokasi/provider/disk/domain final belum ditentukan                                                                                             |
| Proses aplikasi | Docker Compose dengan service web, api, worker dan PostgreSQL terpisah serta reverse proxy HTTPS; Bun untuk runtime web/API/worker, FFmpeg di worker                                                                                                                     |
| Akses publik    | Satu origin HTTPS web/API mempertahankan gateway auth dan kontrak Eden. Reverse proxy ke web; gateway bisnis/playlist web menuju API internal dibuat pada task web/public, bukan diasumsikan sudah tersedia                                                              |
| Akses internal  | API dan PostgreSQL pada jaringan internal; worker tidak memiliki endpoint publik. API_INTERNAL_URL mengarah ke api di jaringan deployment; port internal tidak menjadi origin browser                                                                                    |
| Media           | Satu bucket R2 aplikasi production privat; sources/ dan outputs/ tetap namespace immutable. Multipart part/segment langsung browser–R2, playlist melalui API sesuai nomor 4                                                                                              |
| Credential      | Token Object Read & Write hanya untuk bucket aplikasi; runtime tidak memakai account-wide admin token. Credential staging terpisah; operasi delete/multipart/signing wajib proof token/adapter                                                                           |
| CORS bucket     | Origin web production eksplisit; GET/HEAD/PUT sesuai request browser yang dibuktikan, Range/Content-Type/checksum header sesuai signing, expose ETag/Content-Range/Accept-Ranges bila dibutuhkan. Bukan wildcard semua origin atau izin browser membuat/menghapus bucket |
| Disk lokal      | PostgreSQL memakai volume durable; worker memakai disk workspace/volume per attempt yang writable dan memenuhi admission hasil benchmark. Restart/redeploy tidak boleh menghapus volume DB                                                                               |
| Restart/health  | Supervisor/restart service setelah crash, readiness DB/storage/executable, graceful worker shutdown serta lease recovery nomor 7. Satu instance worker awal dengan concurrency default 1                                                                                 |
| Backup          | Backup PostgreSQL otomatis ke lokasi terpisah dari host, dengan restore drill sebelum launch; jadwal/retensi/RPO/RTO dibahas saat server dipilih. Aset archived permanen bukan berarti sudah ada backup storage                                                          |

**Proposal penyesuaian untuk uji 4 core/RAM 4 GB:** satu instance worker/concurrency 1, kandidat batas worker 2 vCPU dan 1,5 GiB RAM mencakup Bun/FFmpeg serta child. Thread encoder per rendition/decoder/filter mulai 1. Ini nilai uji, bukan jaminan kapasitas; limit CPU/memori diterapkan melalui OS/container, sementara env mengatur job/thread. Kandidat limit RAM layanan lain: web 384 MiB, API 256 MiB, PostgreSQL 512 MiB, proxy 64 MiB. Jumlah kandidat cap service 2.752 MiB (2,6875 GiB) menyisakan sekitar 1,3 GiB dari host 4 GiB untuk OS/cache/headroom; batas service bukan reservasi dan wajib disesuaikan dengan RSS/usage aktual. Byte count service yang tepat: 1.536 + 384 + 256 + 512 + 64 = 2.752 MiB. Tidak mempertahankan budget 3 GiB worker pada host 4 GB bersama layanan tersebut.

Image/artifact build disiapkan sebelum rollout, tidak menjalankan build besar pada host 4 GB bersamaan dengan transcode. Disk workspace tetap membutuhkan headroom minimal 10 GiB per job pada disk; total disk server/volume DB/log belum diketahui. Bila benchmark tiga rendition sekaligus melebihi budget, evaluasi encoding rendition berurutan dengan deadline encoding seluruh job tetap max(15 menit,3×durasi), lalu ulang proof playlist alignment/kualitas/wall-time/API latency; tidak otomatis memberi masing-masing rendition tambahan 90 menit. Benchmark mengukur OOM/restart, RSS worker beserta child, CPU throttling/latency API, antrean dan semua HLS episode 10 menit/movie 30 menit. Jika target gagal setelah tuning, kapasitas/penempatan worker perlu ditinjau; mencoba 4 GB tidak dianggap keputusan bahwa production pasti cukup.

Referensi [Compose service resources](https://docs.docker.com/reference/compose-file/services/) mendokumentasikan cpus/mem_limit; nilai di atas adalah proposal proyek untuk benchmark, bukan rekomendasi RAM dari Docker. Periksa limit efektif dan versi supervisor/container pada mesin target sebelum menyatakan resource isolation terbukti.

Deployment web saat ini memakai Bun pada .output/server/index.mjs, API memakai Bun dist/index.js; script/bootstrap worker belum ada dan build worker perlu ditambahkan pada tasknya. Docker Compose/reverse proxy/image belum dibuat; FFmpeg tetap subprocess background, bukan request API atau eksekusi di R2. R2 adalah object storage pada rancangan ini; tidak menambah Cloudflare Workers/Stream/CDN tanpa keputusan terpisah.

Domain produk belum ditetapkan; watch.example.com hanyalah contoh saat menyelaraskan BETTER_AUTH_URL/WEB_ORIGIN/VITE_API_URL ke origin HTTPS yang sama. API_INTERNAL_URL dan DATABASE_URL menunjuk jaringan internal yang dibuktikan, bukan nilai localhost host yang diasumsikan berlaku di container. R2 memakai S3_ENDPOINT yang benar untuk account/jurisdiction bucket dan region auto. Jangan mengganti hostname sesudah signing atau menganggap signed URL dapat digunakan di custom media domain. Penamaan bucket production/staging dan izin token diisi lewat env server saat provisioning yang diotorisasi terpisah; mengganti selector tidak memindahkan data MinIO.

Urutan rollout: selesaikan media/worker/public/gateway/HLS web serta MIGRATION/DB restore proof yang relevan → buat staging khusus dan jalankan MEDIA-R2-001 serta full upload/transcode/preview/publish/playback/archive/TTL/cache/cleanup fixture → benchmark/resource admission pada server target → review env/domain/proxy → rollout production/migration yang diotorisasi. Bukti lokal/dokumen/staging tidak otomatis berarti production siap. Bucket test dedicated tidak melanggar satu bucket aplikasi per environment; cleanup test tidak menyapu bucket production.

Proof wajib: preserved same-origin login/SSR/logout/admin auth, trusted forwarded headers dari proxy yang ditetapkan, browser CORS multipart/GET/HEAD/Range/seek pada origin production, playlist rewriting semua URI, token scope/delete/abort, restart API/worker/DB tanpa kehilangan queue, failed attempt tidak menjadi ready, source retention/archived exemption, backup restore, benchmark dan rollback yang mempertahankan data. Task deployment dipecah menurut template sebelum implementasi; provider/domain/disk masih perlu ditentukan; target 4 core/RAM 4 GB belum benchmark dan bukan blocker development MinIO.

Referensi: [Bun Docker](https://bun.com/guides/ecosystem/docker) untuk runtime container; Docker Compose/single-host adalah usulan proyek, bukan keputusan yang diharuskan panduan. [R2 tokens](https://developers.cloudflare.com/r2/api/tokens/) mendokumentasikan scope bucket; [R2 CORS](https://developers.cloudflare.com/r2/buckets/cors/) mengatur browser origin/header/method. [R2 presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/) memakai domain S3 dan tidak bekerja pada custom domain; custom public bucket/CDN tidak diaktifkan oleh proposal ini.

### Kontrak keluaran dan distribusi HLS

1. `HLS-PROFILE-001` menetapkan codec, bitrate/resolution ladder dalam rentang 480p–1080p tanpa melebihi sumber, GOP/keyframe alignment, segment fMP4 dengan target 6 detik sesuai hls-v1, audio optional, MIME/cache policy, dan versi profil. Jangan meng-upscale atau mengubah rasio sumber; uji portrait 9:16 termasuk movie panjang, rotasi/SAR, sumber tanpa audio dan penolakan rasio lain. Profil hls-v1 disetujui 4 Oktober 2026; proof implementasi/kualitas/compatibility masih diperlukan.
2. Worker menggunakan direktori sementara per job dan `Bun.spawn` argument array di luar request/transaksi; hasil di prefix immutable `outputs/<asset>/<job>/<attempt>/...`. Master/variant dan seluruh segment/init diverifikasi sebelum rendition/job siap. Keluaran parsial atau lease lama tidak boleh menjadi playback aktif. Playlist VOD harus lengkap, memiliki penutup yang sesuai, dan referensi berada dalam namespace job yang sah.
3. Playback DTO akan memuat URL master HLS serta type `application/vnd.apple.mpegurl`; URL berasal dari delivery yang terkontrol, tanpa bucket credentials, source key privat atau signed URL persisten. HLS rendition menggunakan master/variant row; segment tidak memerlukan row per berkas.
4. `HLS-DELIVERY-001` merancang akses untuk **seluruh** master, variant, init, segment dan caption yang dipakai. Menandatangani master saja tidak menandatangani URI relatif berikutnya; query token tidak otomatis diwariskan. Terapkan master/variant playlist melalui API dengan pemeriksaan akses dan rewrite serta direct signed GET untuk init/segment/caption sesuai nomor 4 yang disepakati. Uji expiry/refresh dan movie panjang pada MinIO/R2; proof implementasi masih pending.
5. Bucket sumber dan hasil draft tetap privat. Preview membutuhkan admin; playback konten published tidak meminta akun pengunjung, tetapi seluruh objek mengikuti effective visibility. R2 tidak mendukung ACL S3 `public-read`; jangan mengandalkan opsi ACL atau membuat bucket campuran source/output publik. Custom domain delivery terpisah dari domain API S3; R2 presigned URL tidak bekerja pada custom domain.
6. Delivery membuktikan CORS, MIME, Range/seek, semua URI turunan, cache serta batas akses sesudah archive termasuk URL/cache lama. Cache immutable hanya boleh dipakai jika kontrak aksesnya tetap memenuhi batas pencabutan. Keputusan ini menjadi prerequisite publish/public, bukan pekerjaan kosmetik player.
7. Web mempertahankan Video.js React/core `10.0.0-rc.4` dan skin existing. Pilih komponen HLS dari bundled docs; kandidat `HlsJsVideo` membutuhkan playback adapter `@videojs/hlsjs-video`, versi/exports diverifikasi saat task frontend. Jangan memasang dependency saat planning. Acceptance browser harus membuktikan HLS pada Chromium/Firefox dan Safari/native HLS sesuai environment yang tersedia; perangkat yang belum diuji dicatat.

### Impact map lanjutan

Semua path kode berikut adalah target future; buat hanya pada task yang memerlukannya.

| Path / symbol                                                                                                                 | Action        | Outcome dan evidence                                                                                                                                 |
| ----------------------------------------------------------------------------------------------------------------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/api/src/config/env.ts`, `env.test.ts`, `src/storage/s3.ts`                                                              | modify/create | Validasi selector/profile serta adapter native; loader dan storage belum ada integrasinya pada snapshot lanjutan.                                    |
| `apps/api/.env.example`, `docs/ENVIRONMENT.md`, `turbo.json`                                                                  | modify        | Sampel dua profil dan penerusan runtime; hanya sampel/dokumen diperbarui sekarang, Turbo pada task konfigurasi.                                      |
| `apps/api/src/db/schema/media.ts`, `upload.ts`, `jobs.ts`, `renditions.ts`, `schema/index.ts`, `apps/api/drizzle/*`           | create/modify | Ownership/pointer, idempotency dan lease dari model tahap B/C; migration baru additive setelah 0005, bukan rewrite history.                          |
| `apps/api/src/modules/media/{index,model,service,repository}.ts`, `src/app.ts`, `src/index.ts`                                | create/modify | Upload/session/status/abort dengan requireAdmin, chaining Eden/Scalar, wiring DB/storage eksplisit.                                                  |
| `apps/api/src/workers/{queue,transcode,index}.ts`, `apps/api/package.json`                                                    | create/modify | Proses worker terpisah, claim/heartbeat/retry, FFmpeg dan proof scripts scoped.                                                                      |
| `apps/api/src/modules/videos/service.ts`, module publication/public/delivery yang ditetapkan refinement                       | modify/create | Syarat publish, effective visibility dan URL HLS seluruh objek; kontrak produk mengikuti nomor 4/5 yang disetujui; proof implementasi masih pending. |
| Unit test dekat module + `apps/api/test/integration/*`                                                                        | create/modify | Fake I/O untuk unit; PostgreSQL/bucket khusus test/FFmpeg asli untuk integrasi.                                                                      |
| `apps/web/src/lib/server/`, business routes/client Query, `src/components/vertical-video-player.tsx`, `apps/web/package.json` | create/modify | Gateway bisnis dan HLS consumer nanti; generated route tree melalui tooling, perubahan player mengikuti skill Video.js.                              |

### Urutan implementasi dan backlog media

Backlog kecil tahap B dan refinement HLS ada pada [tasks/media.md](tasks/media.md); status implementasi belum Done. Dependency task di backlog mengikuti DAG berikut:

```text
VID-015 -> MEDIA-CFG-001 -> MEDIA-PROOF-001 -> MEDIA-DESIGN-001
MEDIA-DESIGN-001 -> MEDIA-SCHEMA-001 -> MEDIA-UPLOAD-001 -> MEDIA-COMPLETE-001 -> MEDIA-CLEANUP-001
MEDIA-PROOF-001 -> HLS-PROFILE-001
MEDIA-DESIGN-001 + HLS-PROFILE-001 -> HLS-DELIVERY-001
MEDIA-CLEANUP-001 + HLS-DELIVERY-001 -> MEDIA-R2-001
MEDIA-CLEANUP-001 -> WORKER-001 -> WORKER-CLAIM-001
WORKER-CLAIM-001 + HLS-PROFILE-001 -> WORKER-002 -> WORKER-RUNTIME-001
VID-015 -> VID-016
VID-016 + WORKER-RUNTIME-001 + HLS-DELIVERY-001 -> PUBLISH-001
PUBLISH-001 -> PUBLISH-002 + PUBLISH-SERIES-001
WORKER-RUNTIME-001 + PUBLISH-002 -> WORKER-RETENTION-001
WORKER-RUNTIME-001 -> WORKER-BENCH-001
PUBLISH-002 + PUBLISH-SERIES-001 -> PUBLIC-001 -> PUBLIC-002
PUBLIC-002 -> WEB-CONTENT-001 -> WEB-CONTENT-002
MEDIA-R2-001 + proof HLS/public R2 -> readiness rollout production
```

Setiap task memiliki outcome/files/dependencies/acceptance/validation pada backlog [media](tasks/media.md), [worker](tasks/media-worker.md) dan [publication](tasks/media-publication.md). MEDIA-CFG-001 Ready; task berikutnya Backlog sampai prerequisite/evidence terpenuhi. Tabel roadmap berikut merangkum task final; dependency task detail/DAG menjadi acuan eksekusi. Kebijakan worker nomor 7 sudah disetujui; angka thread/RAM/disk dibekukan melalui benchmark dan detail teknis tambahan masih refinement. Proof MinIO membuka development lokal; proof R2 dengan bucket staging khusus tetap prerequisite rollout, tanpa mengklaim kesetaraan provider dari MinIO saja.

| Tahap / ID task                                              | Dependensi utama                                                                        | Hasil dan gate                                                                                                   |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| MEDIA-CFG/PROOF/DESIGN-001                                   | VID-015 → CFG → PROOF → DESIGN                                                          | Config env, native S3 capability, kontrak identity/freeze/resume terbukti sebelum schema                         |
| MEDIA-SCHEMA/UPLOAD/COMPLETE/CLEANUP-001                     | DESIGN → SCHEMA → UPLOAD → COMPLETE → CLEANUP                                           | Source/poster/session private, multipart resume aman, verifikasi/freeze dan abort/expiry; migration preservation |
| HLS-PROFILE/DELIVERY-001, MEDIA-R2-001                       | PROOF → PROFILE; DESIGN + PROFILE → DELIVERY; CLEANUP + DELIVERY → R2                   | FFmpeg hls-v1 fixture, seluruh URI/cache/expiry/browser, proof R2 dedicated terpisah                             |
| WORKER-001, WORKER-CLAIM-001, WORKER-002, WORKER-RUNTIME-001 | CLEANUP → enqueue → claim; claim + PROFILE → runner → runtime                           | Durable queue, lease/fencing, retry/deadline/stall, HLS output activation dan shutdown                           |
| VID-016, PUBLISH-001/002, PUBLISH-SERIES-001                 | VID-015 → lifecycle; lifecycle + runtime + DELIVERY → publish; publish → archive/series | Lifecycle compatibility, manual readiness gate, rights/poster/HLS, parent visibility dan races                   |
| WORKER-RETENTION/BENCH-001                                   | runtime + archive → retention; runtime → benchmark                                      | Tombstone/7-day source GC/archived permanence; target CPU/RAM/disk proof                                         |
| PUBLIC-001/002, WEB-CONTENT-001/002                          | archive + series → catalog → delivery → gateway → player                                | Whitelisted catalog, signed whole-HLS, same-origin transport dan renewal/browser E2E                             |

Ringkasan roadmap tidak menentukan status Ready; status task kecil pada tiga backlog. Transport/player mengikuti publication; dashboard/upload UI rinci dibahas saat scope web dimulai. Video.js skill dan bundled docs wajib saat player/HLS frontend dikerjakan; sesi planning ini tidak mengubah playback.

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

### Test requirements lanjutan media

- Config/transport: kombinasi env MinIO/R2 valid/invalid, no fallback/secret exposure, endpoint signed reachable dan CORS; factory import tanpa network; Eden/Scalar/guard admin stabil.
- Storage/upload: operasi yang benar-benar diperlukan pada kedua provider; boundary limits, interruption/resume, repeated/raced initiate/complete/abort/expiry; checksum/size/MIME authoritative, source freeze dan URL lama tidak mengubah input worker.
- Queue/worker: enqueue atomik setelah verifikasi I/O, parallel claim, heartbeat/death/expired lease/stale finish, retry output namespace berbeda, FFmpeg timeout dan partial upload tidak menjadi ready.
- HLS/delivery: master/variant/all segment/init references, VOD completeness, portrait 9:16/movie/no-audio dan penolakan rasio lain, MIME/Range/seek/CORS, expiry/refresh long playback, preview denial dan archive/access-cache bound seluruh objek.
- Production readiness: proof R2 staging terpisah dari MinIO dan full worker/publish/public HLS pada provider target; fixture test tidak membersihkan bucket aplikasi. Kebutuhan tersebut belum dijalankan pada sesi planning.

## Constraints

Ikuti AGENTS/API Development/Workflow; injeksi dependency, method chaining dan scoped guard; satu pool; Bun native untuk runtime/SQL dan API tests; media native dievaluasi dahulu; env secret tidak diekspos. Tidak mengedit route tree/generated outputs. Frozen install setelah package/scripts berubah. Tidak menganggap proof auth lama sebagai bukti konten atau production readiness.

## Acceptance Criteria — tahap A

- [x] D1–D3 disepakati dan seluruh task tahap A yang diperlukan Done dengan bukti.
- [x] Admin dapat membuat series/season/episode/movie/standalone, mengedit metadata/genre, list/detail/filter, dan archive sesuai kontrak.
- [x] Hierarchy/uniqueness/version constraints tetap benar pada request bersamaan dan transaction rollback.
- [x] Semua business routes privat, typed di Eden, terdokumentasi Scalar; auth existing tetap berjalan.
- [x] Migrasi additive lulus fresh/re-run/existing auth fixture; root relevant gates dan proof PostgreSQL lulus.
- [x] Tidak ada katalog/playback/upload semu; integrasi gateway/UI dan media jelas belum diimplementasikan.

## Acceptance Criteria — tahap media

- [x] Pilihan MinIO development, R2 production, selector env dan HLS disetujui dan tercatat konsisten pada plan/model/arsitektur/environment.
- [x] Semua video dan sampul wajib portrait 9:16; standar format/dimensi sampul seragam antarjenis konten. Resolusi sumber dan HLS 480p–1080p, sumber 1440p/4K atau rasio lain ditolak dan keluaran tidak di-upscale.
- [x] Standar sampul disetujui: gambar diam JPG/PNG/WebP <=5 MB, sumber minimal 1080 × 1920 portrait 9:16, hasil WebP 1080 × 1920 untuk seluruh jenis konten.
- [x] Batas sumber terbaru disetujui: movie/standalone <=1.800 detik dan <=1,5 GB; episode <=600 detik dan <=512 MB. Acuan sumber 1080p24–30 pada 4–6 Mbps (default 6 Mbps), audio AAC 128 kbps; batas berdasarkan kind diutamakan atas acuan bitrate yang melampaui limit.
- [x] S3 multipart dipilih untuk upload media; file dipecah menjadi part kecil, termasuk sampul kecil sebagai satu part. Ukuran part 2%/minimum 5 MiB disetujui; concurrency 3/session 24 jam/URL part 15 menit dibatasi sisa session disetujui; implementasi belum dibuktikan.
- [x] Sampel MinIO memakai bucket existing `vertical-movie-app`, endpoint S3 port 9000 dan credential kosong; profil production R2 terdokumentasi dengan placeholder.
- [x] Backlog B–D mencakup foundation, worker/lease/transcode/retensi/benchmark, publication/archive/series, catalog/delivery dan integrasi web; tiap task memiliki target/dependency/acceptance/validation. Keputusan disetujui dipisah dari technical proof/proposal deployment.
- [ ] Loader env/adapter storage aktif dan proof provider sesuai task lulus.
- [ ] Upload/complete/abort/cleanup serta source immutable lulus race/DB/storage proof.
- [ ] Queue/worker menghasilkan seluruh HLS valid, retry/lease aman, tanpa output partial menjadi ready.
- [ ] Preview/publish/public dan semua objek HLS memenuhi kontrak akses/cache/archive; browser playback terbukti.
- [ ] R2 staging dan end-to-end production-target lulus sebelum rollout; gates/migration/preservation dicatat.

## Risks and Mitigations

- Sample env belum aktif: loader/adapter/Turbo pada MEDIA-CFG-001; jangan menilai konfigurasi sample sebagai bukti runtime storage.
- MinIO proof tidak menjamin R2: gunakan contract suite provider dan bucket staging dedicated sebelum rollout; jangan bergantung ACL/versioning/checksum tanpa evidence kompatibilitas.
- Master-only signing menyebabkan HLS child request gagal/bocor: HLS-DELIVERY-001 membuktikan seluruh URI, expiry/refresh dan akses sesudah archive.
- Provider switch dapat memutus aset lama: simpan provider/bucket/key; perpindahan data memerlukan copy/verify/pointer update terpisah, bukan perubahan env saja.
- Season default menambah konsep produk: tinjau D1; UI dapat menyederhanakannya tanpa kehilangan season FK.
- Parent publication memengaruhi seluruh episode: predicate bersama dan tests race semua read/playback endpoints pada tahap D.
- Schema media future memiliki siklus FK: gunakan migrasi staged table-first/pointer-later; uji ownership nyata, bukan relations ORM saja.
- Movie/standalone sampai 30 menit dan 1,5 GB memerlukan proof resource upload/worker sebelum profil diimplementasikan; rasio tetap portrait 9:16 dan file asli tidak otomatis dicrop.
- Existing Eden base `/api` bukan gateway bisnis aktif: backend completion diukur direct HTTP; transport web menjadi task tersendiri.
- Genre/metadata tambahan dapat memperluas scope: fase A dibatasi field dan enam tabel yang dirancang; credits/translation tidak dibuat spekulatif.

## Rollback or Recovery

Untuk tahap media, perubahan sample/plan dapat dikembalikan tanpa menyentuh bucket/data. Implementasi kelak memakai migration additive dan output per attempt; gagal upload/transcode tidak menghapus metadata atau source aktif. Jangan menghapus bucket existing atau mengganti provider lalu mengasumsikan data tersedia di endpoint baru. Recovery partial multipart/outputs mengikuti aturan nomor 6 yang disetujui; video asli konten non-archived eligible setelah 7 hari sejak HLS verified-ready, sumber failed terminal 7 hari sejak kegagalan terminal, dan semua aset konten archived termasuk video asli disimpan permanen. Implementation/proof cleanup tetap pending.

Migrasi metadata additive dan tidak mengubah tabel auth; test memakai database disposable. Migrasi development diterapkan pada tindak lanjut VERIFY-001 atas instruksi pengguna; deployment belum. Sebelum rollout, periksa SQL/backup/target sesuai [Video Operations](VIDEO_OPERATIONS.md). Jika runtime gagal setelah migration additive, rollback binary yang belum memakai schema baru dan pertahankan data; jangan DROP tabel konten terisi untuk rollback otomatis. Koreksi lewat forward migration; hard deletion membutuhkan rencana eksplisit.

## Evidence

Refinement media memakai snapshot lanjutan pada [context](VIDEO_REPOSITORY_CONTEXT.md), bundled docs Video.js versi `10.0.0-rc.4`, [Bun S3](https://bun.com/docs/runtime/s3), [R2 compatibility](https://developers.cloudflare.com/r2/api/s3/api/), [R2 presign/domain](https://developers.cloudflare.com/r2/api/s3/presigned-urls/) dan [FFmpeg HLS](https://ffmpeg.org/ffmpeg-formats.html#hls-2). CLI terbaru mencetak mismatch; instruksi kemudian dibaca ulang melalui CLI versi `10.0.0-rc.4`. Tidak menjalankan perintah instalasi skin/player yang dicetak CLI.

Base SHA dan evidence simbol/path ada di [context](VIDEO_REPOSITORY_CONTEXT.md#evidence-index). Model FK/CHECK/UNIQUE dilandasi [PostgreSQL](https://www.postgresql.org/docs/current/ddl-constraints.html) dan [Drizzle](https://orm.drizzle.team/docs/indexes-constraints). API inference mengikuti [Eden Treaty](https://elysiajs.com/eden/treaty/overview). Referensi vendor tidak membuktikan SQL atau runtime konten sudah lulus; seluruh proof tersebut merupakan acceptance implementasi.

## Open Decisions

Finalisasi 4 Oktober 2026: keputusan produk nomor 1–7 ditutup sesuai kontrak di atas. Evidence teknis tersisa mempunyai task pemilik:

| Detail / evidence                                                  | Task / gate                                                            |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| Native S3, identity/freeze/resume/checksum                         | MEDIA-PROOF-001 → MEDIA-DESIGN-001                                     |
| HDR/VFR/SAR/encoder/GOP, lebar 480–485 tanpa upscale, MIME/quality | HLS-PROFILE-001                                                        |
| Whole-HLS signing/cache/header/refresh/browser                     | HLS-DELIVERY-001, PUBLIC-002, WEB-CONTENT-002                          |
| Mapping lifecycle legacy/shared columns                            | VID-016, sebelum migration                                             |
| Parameter runtime/thread/RAM/disk target 4 core/4 GB               | WORKER-RUNTIME-001, WORKER-BENCH-001                                   |
| Bucket/credential R2 staging dan full worker/public/browser E2E    | MEDIA-R2-001 serta gate rollout                                        |
| Hosting/domain/disk/Compose/backup restore production              | Proposal nomor 8; sebelum rollout, tidak menghalangi MinIO development |

Rekomendasi teknis dedup MVP sepanjang umur row; pruning task terpisah. Restore/republish/revisi published, cascade series/season dan dashboard upload UI rinci di luar lifecycle utama. Finalisasi tidak mengotorisasi deployment. Narasi berikut mempertahankan konteks keputusan dan batas proof.

Lifecycle video disetujui 4 Oktober 2026: **draft → published → archived**, tanpa status produk unpublished. Status upload/processing tetap terpisah. Schema/layanan metadata saat ini masih memakai draft/published/unpublished plus archived_at; perubahan lifecycle adalah pekerjaan lanjutan, belum implementasi atau migrasi pada sesi ini. VID-016 membuktikan kontrak transisi dan compatibility schema sebelum publikasi. Satu bucket aplikasi per environment dipilih; bucket privat/playlist API/direct signed segment/TTL 2× durasi dan cache metadata 60 detik/segment maksimal min(300 detik,sisa URL) disepakati; proof mekanisme delivery/expiry/cache tetap belum diimplementasikan.

D1–D3 disetujui dan diimplementasikan. D5 sebagian disetujui 3 Oktober 2026: MinIO development (bucket `vertical-movie-app`), Cloudflare R2 production melalui S3-compatible, selector env, HLS VOD, resolusi sumber/keluaran 480p–1080p (1440p/4K ditolak; tanpa upscale), target ekspor H.264 SDR/AAC 128 kbps 1080p24–30 pada 4–6 Mbps (default 6 Mbps); sumber 60 fps tetap tunduk pada size limit aktual, serta batas sumber terbaru per kind: movie/standalone maksimal 30 menit dan 1,5 GB (1.500.000.000 byte), episode maksimal 10 menit dan 512 MB (size limit diutamakan atas acuan bitrate). MP4/MOV/MKV dengan H.264/H.265 dan WebM dengan VP8/VP9 disetujui sebagai format sumber; movie/standalone maksimal 30 menit, episode maksimal 10 menit; semua video dan sampul portrait 9:16, dengan standar sampul gambar diam JPG/PNG/WebP <=5 MB, sumber minimal 1080 × 1920 dan hasil WebP 1080 × 1920 seragam antarjenis konten. S3 multipart dengan pembagian file menjadi part kecil disetujui sebagai metode upload; ukuran part 2% dengan minimum 5 MiB selain part terakhir disetujui; paralelisme 3 part per file/URL part 15 menit dibatasi sisa session/session 24 jam sudah disetujui; detail identity resume memerlukan proof. D4 syarat publikasi disetujui 4 Oktober 2026: metadata/source/HLS/poster/hak siap, subtitle opsional, publish manual, episode efektif publik melalui series dan series publish minimal satu episode siap. Implementasi D4 belum tersedia. D5 kebijakan audio/HDR/VFR/nonstandard frame rate, detail upload-resume/encoder-GOP-SAR-VFR dan proof HLS/delivery tetap refinement. **hls-v1 disetujui 4 Oktober 2026**: H.264 SDR, AAC 128 kbps bila audio tersedia, target video 480p/720p/1080p 1,2/2,5/4,5 Mbps, output maksimal 30 fps, segment fMP4 dengan target 6 detik dan pemilihan kualitas adaptif; tanpa crop/upscale, hanya kualitas yang dapat dibuat dari sumber. Detail encoder/GOP/SAR/VFR/MIME serta kualitas visual dan compatibility tetap memerlukan proof HLS-PROFILE-001. MEDIA-001 membuktikan native S3 dan source immutable pada kedua provider; HLS-PROFILE/DELIVERY menetapkan detail HLS. Retensi video asli 7 hari dan file konten archived permanen disepakati 4 Oktober 2026; pengecualian archived mencakup semua aset konten termasuk video asli. Titik awal retensi/cleanup nomor 6 disetujui 4 Oktober 2026; implementasi/proof masih pending. Pruning operation dedup key, restore/republish, lifecycle/cascade archive series/season dan bucket/credential R2 tetap refinement. Batas akses sesudah archive mengikuti keputusan nomor 4; proof expiry/cache masih pending. Tidak ada estimasi kalender atau asumsi produksi sudah siap.

## Validation History

### 2026-10-03 — refinement MinIO/R2/env/HLS

- Result: **valid untuk snapshot kode dan keputusan; draft untuk eksekusi media**.
- Historical base SHA: `d1d3e0a36a4adf1c7198db7a1d36c49e9f1c93ed`; current checked SHA: `0d3bef87f6d2f9b0a2873078f9b560f092f13c53`.
- Checked paths: app/bootstrap/env/schema/journal API, manifests API/web/auth, env samples, Turbo, gateway auth/client Eden, player demo, bundled Video.js docs, docs/workflow/backlog.
- Changed relevant paths since baseline: metadata module/schema/migrations dan follow-up dokumentasi sudah tersedia; roadmap lama belum memuat keputusan provider/HLS eksplisit. Evidence aktif diperbarui pada context lanjutan; riwayat tahap A tetap utuh.
- Decision: update dokumen/sampel env dan backlog media; implementasi storage/worker/delivery tetap pending. Existing worktree desain dipertahankan. Tidak ada proof objek MinIO/R2, FFmpeg atau playback HLS dari pemeriksaan dokumen ini.

### 2026-10-03 — planning snapshot

- Result: valid untuk evidence kode dan struktur dokumen; implementasi belum tervalidasi.
- Plan base SHA / current target SHA: `d1d3e0a36a4adf1c7198db7a1d36c49e9f1c93ed`.
- Checked paths: context Evidence Index; worktree awal bersih, source/manifests/schema/routes diperiksa.
- Changed relevant paths: hanya dokumen planning sesi ini; tidak ada source/dependency/database change.
- Decision: D1–D3 disetujui; lanjut tahap A pada branch baru. Sebelum eksekusi resolve SHA terbaru dan diff semua affected paths/dependencies; evidence yang berubah direfresh, bukan memakai snapshot auth lama.

## Execution Log

- 2026-10-04 — parameter upload tersisa disetujui: pengguna menyetujui maksimal 3 part paralel per file dan signed URL part 15 menit, dibatasi sisa session 24 jam. Plan/model/runbook/context/backlog/env/architecture/PRD serta anchor diperbarui; sample API memuat default upload yang direncanakan. Acceptance loader/HTTP expiry/resume/browser concurrency difinalkan; MEDIA-CFG-001 tetap Ready, MEDIA-PROOF-001 Backlog bergantung CFG. Tidak menandai runtime/storage proof selesai atau menganggap deployment nomor 8 ikut disetujui. Validator Bun untuk persetujuan/TTL boundaries/sample/anchor/status 10 task, Prettier check delapan dokumen dan git diff --check lulus.

- 2026-10-04 — validasi keputusan worker/proposal deployment: validator Bun lulus untuk persetujuan nomor 7 versus proposal nomor 8, nilai sample env, anchor delapan dokumen, target uji 4 core/4 GB dan penjumlahan kandidat resource 2.752 MiB. bun run --bun prettier --check pada plan/env/model/runbook/context/backlog/architecture/PRD dan git diff --check lulus. Validasi hanya dokumentasi/sample; benchmark, runtime worker/storage, provisioning, deployment dan migration belum dijalankan.

- 2026-10-04 — target uji server diperjelas: pengguna memperkirakan 4 core/RAM 4–8 GB dan akan mencoba 4 GB. Proposal nomor 8 disesuaikan tanpa menjanjikan capacity: satu worker/concurrency 1, kandidat CPU 2 vCPU/RAM 1,5 GiB dan 1 thread per encoder, dengan budget layanan lain/OS serta benchmark movie 30 menit sebelum keputusan production. Budget worker 3 GiB sebelumnya tidak dipakai untuk host 4 GB. Provider/domain/disk belum diketahui; Compose/resources masih proposal, bukan implementasi.

- 2026-10-04 — sisa kebijakan worker nomor 7 disetujui: retry tiga attempt total/jeda 60–300 detik, timeout encode max(15 menit,3×durasi), stall 5 menit, heartbeat 15/lease 120/recovery 30 detik; resource mengikuti benchmark, bukan persetujuan angka kandidat thread/RAM/disk atau detail teknis tambahan. Plan/model/env/runbook/context/backlog dan anchor diselaraskan; sample menambahkan nilai kebijakan yang disepakati tanpa runtime loader. Proposal nomor 8 terpisah: single Linux host dengan proses Compose web/API/worker/DB, same-origin HTTPS, bucket R2 privat/token scoped/CORS, volume durable dan restore proof. Info server/domain ditanyakan; belum provisioning/deploy/migration/benchmark. Referensi Bun/R2 diperiksa.

- 2026-10-04 — parameter env/concurrency worker disetujui: pengguna menyetujui parameter melalui env dengan default 1. Scope dicatat sebagai MEDIA_WORKER_CONCURRENCY default 1 job video per instance; retry/lease/timeout/thread/resource lainnya tetap rekomendasi. Plan/model/env/runbook/context/backlog serta anchor nomor 7 diselaraskan, sample API menambahkan nilai 1 dengan penanda runtime belum tersedia. Loader, env lokal, worker, dependency dan schema tetap belum diubah.

- 2026-10-04 — rekomendasi nomor 7 diminta: queue PostgreSQL/FFmpeg Bun subprocess dipertahankan. Proposal satu instance/concurrency 1, tiga attempt total dengan backoff 60/300 detik, heartbeat 15/lease 120/recovery 30 detik, timeout encode max(15 menit,3×durasi), watchdog 5 menit dan attempt total 2 jam dicatat sebagai belum disetujui. Resource read-only mesin development diperiksa; /tmp tmpfs terlalu sempit sehingga workdir disk diusulkan, thread/budget memory/disk serta benchmarking sebelum scale dicatat. Plan/context/model/env/runbook/backlog media menghubungkan proposal; tidak mengubah runtime/FFmpeg/provider/database atau status implementasi.

- 2026-10-04 — retensi/cleanup nomor 6 disetujui: pengguna menyetujui rekomendasi lalu meminta penjelasan video asli dengan retensi 7 hari. Keputusan dan session TTL 24 jam diselaraskan pada plan/model/PRD/runbook/backlog/context, tanpa menganggap paralelisme 3 part atau URL part 15 menit ikut disetujui. Penjelasan memisahkan input original dari output HLS, deadline sejak HLS verified-ready, draft/published tetap dapat memakai HLS sesudah source GC, pengecualian archived serta tidak dapat memulihkan sumber yang telah terhapus. Runner/storage/schema belum diimplementasikan.

- 2026-10-04 — refinement retensi nomor 6: pengguna menetapkan video asli satu minggu dan file archived permanen, lalu mengonfirmasi pengecualian archived mencakup semua aset konten termasuk video asli. Titik awal 7 hari sejak HLS verified-ready, session resume 24 jam, abort explicit segera, karantina objek invalid/partial gagal 24 jam, temp FFmpeg setelah proses berhenti, source failed terminal 7 hari dan sweep per jam masih rekomendasi. Plan/model/PRD/runbook/backlog membedakan keputusan dengan proposal; kebutuhan source tombstone dan race archive/delete dicatat agar source GC tidak mematahkan publish/playback atau janji retensi arsip. Referensi lifecycle R2 dan abort S3 diperiksa, bukan proof bucket lokal/R2. Tidak ada penghapusan file, perubahan schema atau lifecycle bucket.

- 2026-10-04 — syarat publikasi nomor 5 disetujui: pengguna menyetujui rekomendasi metadata judul/sinopsis, source/HLS/poster siap, konfirmasi hak tayang, subtitle opsional jika valid, publish manual setelah pratinjau, serta episode efektif publik melalui series dan series publish minimal satu episode siap. Plan/model/PRD/backlog media dan anchor nomor 5 diselaraskan. D4 persetujuan produk tidak lagi blocker; VID-016 + WORKER-002 + HLS-DELIVERY-001 tetap prerequisite implementasi. Retensi file serta lifecycle/cascade archive/restore parent masih terbuka. Validator Bun kontrak/dependensi/batas media/anchor/status, Prettier check empat dokumen dan git diff --check lulus. Tidak ada implementasi endpoint/schema/migration atau proof runtime baru; task media tetap belum Done.

- 2026-10-04 — akses/cache disepakati dan lanjut nomor 5: pengguna menyetujui rekomendasi sebelumnya lalu meminta poin selanjutnya. Kontrak produk nomor 4 mencatat satu bucket privat, playlist API/direct signed segment, TTL 2× durasi, cache metadata 60 detik + event invalidation, playlist no-store serta private segment freshness maksimal min(300 detik,sisa URL) setelah proof; URL lama mengikuti expiry setelah archive. Persetujuan produk tidak menyelesaikan proof runtime. Nomor 5 syarat publikasi dicatat terpisah sebagai belum disetujui: judul/sinopsis/source/HLS/poster siap, rights confirmation, subtitle optional, publish manual, serta visibility episode melalui series dan publish series minimal satu episode siap. Field metadata/rights dan optional synopsis pada runtime diperiksa; schema/service tetap belum berubah. Plan/model/backlog/PRD/arsitektur/context/runbook/env serta anchor nomor 4 diselaraskan. Validator Bun pemisahan keputusan/proposal/status/anchor, Prettier check delapan dokumen dan git diff --check lulus; task implementasi tetap Backlog.

- 2026-10-04 — TTL berdasarkan durasi dan cache: pengguna menetapkan TTL URL playback 2× durasi video aktual serta expiry/invalidation untuk cache bila diterapkan. Usulan tetap 60 menit digantikan; contoh 3/10/30 menit menghasilkan TTL 6/20/60 menit sejak signing, dengan ceil integer detik dari durasi terverifikasi. Plan/backlog/env/PRD/arsitektur/context/runbook diselaraskan. Rekomendasi cache membedakan metadata TTL 60 detik + event invalidation, signed DTO/playlist no-store, private segment freshness maksimum min(300 detik,sisa URL) hanya setelah proof header provider (fallback no-cache/no-store), dan CDN/shared belum aktif. Angka detail cache dan archive-link policy tetap refinement; cache invalidation tidak diklaim mencabut signature/buffer lama. Referensi R2 presign, Cache-Control dan cache purge diperiksa. Validator Bun tujuh dokumen/status/rounding/duration/cache bounds/preservation, Prettier check tujuh dokumen dan git diff --check lulus. Runtime/schema/env sample/bucket/storage/player tidak berubah; proof HLS-DELIVERY-001 tetap Backlog.

- 2026-10-04 — satu bucket diminta: pengguna memilih satu bucket aplikasi per environment dan meminta rekomendasi. Rekomendasi nomor 4 sekarang seluruh bucket privat, sumber/hasil memakai prefix terpisah, master/variant API memeriksa akses dan rewrite, init/segment/caption langsung dari storage memakai signed GET URL; tidak membuat bucket publication atau public prefix. TTL playback 60 menit serta toleransi URL lama hingga expiry sesudah archive masih usulan; pilihan jumlah bucket tidak berarti persetujuan revocation/TTL. MinIO existing dan satu S3_BUCKET per env dipertahankan, test bucket dedicated tetap terpisah. Plan/backlog/arsitektur/context/runbook/env/PRD diselaraskan; referensi R2 presign/CORS dan Bun S3 diperiksa. Validator Bun konsistensi tujuh dokumen/namespace/status/TTL/10 task/anchor, Prettier check tujuh dokumen dan git diff --check lulus. Runtime/schema/dependency/env sample/bucket/policy tidak berubah; proof storage/player/expiry tetap Backlog.

- 2026-10-04 — lifecycle video ditetapkan: pengguna menetapkan draft → published → archived dan menanyakan streaming langsung dari bucket. Target lifecycle menggantikan usulan unpublish; schema/runtime metadata masih draft/published/unpublished plus archived_at dan menolak published archive, sehingga VID-016 Backlog ditambahkan untuk compatibility/transisi tanpa menimpa evidence tahap A. PRD/model/plan/backlog/index/context/arsitektur/runbook diselaraskan. Gateway API sebelumnya tetap usulan; alternatif output publik terpisah/domain/CDN dan signed URL seluruh objek bucket privat dicatat dengan konsekuensi URL/cache setelah archive. Penutupan URL lama ditanyakan kepada pengguna dan belum ditetapkan. Dokumentasi R2 public/presign serta cache purge diperiksa; Validator Bun untuk lifecycle sembilan dokumen/status/16 ID task/anchor/preservation schema, Prettier check sembilan dokumen dan git diff --check lulus. Tidak ada schema/service/migration/storage/CDN atau runtime yang diubah.

- 2026-10-04 — koreksi urutan pembahasan: pengguna menjelaskan bahwa lanjut berarti poin yang belum dibahas. Interpretasi kembali nomor 2 pada turn sebelumnya dikoreksi; parameter upload tidak disetujui oleh koreksi ini. Nomor 4 akses/delivery dicatat sebagai rekomendasi belum disetujui: bucket privat, gateway media API Bun/Elysia pada MinIO/R2, preview admin, published tanpa akun, pemeriksaan semua objek HLS, no-store dan penolakan request baru setelah unpublish dengan pengecualian data yang sudah diterima/request sebelumnya. Trafik API dan proof streaming/Range/cancellation/capacity dicatat; edge/Worker/CDN tetap review terpisah. Plan/backlog diperbarui; dokumentasi R2 presign/public buckets/Workers diperiksa, validator status/anchor, Prettier check dua dokumen dan git diff --check lulus. Tidak ada implementasi/deployment atau proof runtime baru.

- 2026-10-04 — profil HLS disetujui dan kembali nomor 2: pengguna menyetujui hls-v1 (480p/720p/1080p pada 1,2/2,5/4,5 Mbps, H.264 SDR/AAC 128 kbps, output hingga 30 fps, fMP4 target segment 6 detik, 9:16 tanpa upscale dan playback adaptif). Plan/model/context/runbook/arsitektur/PRD/backlog menyelaraskan keputusan; HLS-PROFILE-001 tetap Backlog untuk proof encoder/kualitas/compatibility. Poin sebelumnya dipahami sebagai parameter upload yang tersisa: rekomendasi 3 part paralel/session 24 jam/URL 15 menit, dengan URL dibatasi sisa umur session; angka tersebut belum disetujui. Dokumentasi R2 presign diperiksa; validator Bun untuk konsistensi keputusan/status/anchor dan Prettier/diff whitespace lulus. Hanya dokumen berubah; tidak ada proof runtime/storage/FFmpeg baru.

- 2026-10-04 — persentase multipart disetujui dan lanjut nomor 3: pengguna menyetujui target 2% ukuran aktual dengan minimum 5 MiB selain part terakhir. Plan/model/runbook/context/backlog memperbarui status keputusan; paralelisme/session TTL/URL TTL tetap rekomendasi awal. Usulan profil hls-v1 dicatat terpisah sebagai belum disetujui: H.264 SDR/AAC-LC 128 kbps, target video 1,2/2,5/4,5 Mbps pada 480p/720p/1080p, output hingga 30 fps, fMP4 target segment 6 detik/keyframe 2 detik, tanpa upscale serta proof boundary sumber minimum. Dokumentasi FFmpeg dan bundled docs Video.js diperiksa; validator Bun untuk konsistensi/status/geometry/boundary/link/estimasi, Prettier check lima dokumen dan git diff --check lulus. Runtime/env/schema tidak diubah; storage/FFmpeg/player belum menjalankan proof baru.

- 2026-10-04 — ukuran part berbasis persen: pengguna menanyakan persentase sebagai alternatif MiB tetap. Rekomendasi target 2% ukuran file aktual dicatat dengan konversi integer byte/minimum 5 MiB selain part terakhir, geometry immutable per session dan progress berbasis byte. Usulan tetap 16 MiB digantikan; angka 2% belum persetujuan final. Model/runbook/context/backlog diselaraskan; metode S3 multipart dan limit file per kind tetap disetujui. Validator Bun untuk konsistensi proposal/rounding/minimum part/preservation, Prettier check lima dokumen dan `git diff --check` lulus. Tidak ada perubahan runtime/env/schema atau proof storage baru.

- 2026-10-03 — S3 multipart disetujui: pengguna memilih S3 multipart saja dengan pembagian file menjadi bagian kecil. Kontrak upload media memakai multipart, termasuk sampul kecil satu part; draft single PUT digantikan. Metode transfer dipisahkan dari segment HLS. Rekomendasi angka 16 MiB/3 part paralel/session 24 jam/URL 15 menit tetap default rancangan, bukan persetujuan eksplisit parameter final. Plan/model/PRD/arsitektur/context/runbook/backlog diselaraskan; validator Bun untuk konsistensi metode/jumlah part/anchor, Prettier check tujuh dokumen dan `git diff --check` lulus. Runtime/env/schema tidak diubah dan capability native Bun/provider tetap memerlukan proof.

- 2026-10-03 — ukuran/bitrate disetujui: pengguna menyetujui acuan utama sumber H.264 SDR 1080p24–30 pada 4–6 Mbps (default 6 Mbps), audio AAC 128 kbps, episode <=600 detik/512 MB dan movie/standalone <=1.800 detik/1,5 GB (1.500.000.000 byte). Persetujuan ini menggantikan cap 512 MB untuk movie/standalone dan acuan default 6–8 Mbps. Estimasi default 459,6 MB/1.378,8 MB sebelum overhead, dengan margin 52,4 MB/121,2 MB terhadap cap. Plan/model/PRD/arsitektur/context/runbook/backlog diselaraskan; profil HLS dan rekomendasi multipart/resume nomor 2 tetap belum disetujui. Validator Bun untuk konsistensi tujuh dokumen/estimasi/boundary, Prettier check tujuh dokumen dan `git diff --check` lulus. Runtime/env/schema tidak diubah.

- 2026-10-03 — rekomendasi ukuran/bitrate 10–30 menit: pengguna meminta penyesuaian ukuran wajar. Setelah memeriksa ulang pedoman encoding YouTube, rekomendasi sumber H.264 SDR/AAC 128 kbps 1080p24–30 pada 4–6 Mbps (default 6 Mbps) dicatat; estimasi 10 menit 310–460 MB dan 30 menit 929 MB–1,38 GB. Usulan cap episode 512 MB dan movie/standalone 1,5 GB masih menunggu pilihan pengguna; cap aktif 512 MB seluruh kind tetap dipertahankan. Validator Bun estimasi/status cap, Prettier check plan dan `git diff --check` lulus; runtime/env/schema tidak diubah.

- 2026-10-03 — batas episode disamakan: pengguna menetapkan episode juga maksimal 512 MB. Batas final seluruh sumber video 512 MB (512.000.000 byte); movie/standalone maksimal 1.800 detik dan episode maksimal 600 detik. Budget total pada durasi penuh sekitar 2,28 Mbps untuk movie/standalone dan 6,83 Mbps untuk episode; acuan bitrate tunduk pada limit. Plan/model/PRD/arsitektur/context/runbook/backlog diselaraskan; rekomendasi multipart/resume nomor 2 tetap belum disetujui. Validator Bun untuk konsistensi tujuh dokumen/budget/boundary, Prettier check tujuh dokumen dan `git diff --check` lulus. Runtime/env/schema tidak diubah.

- 2026-10-03 — revisi movie/standalone: pengguna membatasi kedua kind maksimal 30 menit dan, setelah klarifikasi angka 500 MB-an, memilih maksimal 512 MB (512.000.000 byte). Episode tetap 10 menit/1 GB. Batas berlaku per kind untuk seluruh durasi, menggantikan movie 1 jam/2 GB dan standalone 10 menit/1 GB; riwayat keputusan lama dipertahankan di bawah. Budget total 512 MB untuk 30 menit sekitar 2,28 Mbps, sehingga size limit diutamakan atas acuan bitrate. Rekomendasi multipart/resume nomor 2 tetap belum disetujui; tidak ada perubahan runtime/env/schema.

- 2026-10-03 — batas movie panjang: pengguna menetapkan movie hingga 1 jam maksimal 2 GB (2.000.000.000 byte); berlaku bagi movie >600 sampai 3.600 detik, sedangkan limit 1 GB sampai 600 detik tetap. Kelompok batas produk nomor 1 selesai; kontrak upload/probe/encoding teknis tetap refinement. Acuan bitrate 6–8/8–12 Mbps perlu disesuaikan untuk movie penuh satu jam agar memenuhi budget total sekitar 4,44 Mbps. Plan/model/PRD/arsitektur/context/runbook/backlog diselaraskan. Rekomendasi nomor 2 dicatat terpisah sebagai belum disetujui setelah membaca ulang dokumentasi R2/Bun S3. Validator Bun policy/budget, Prettier check tujuh dokumen dan `git diff --check` lulus; runtime/env/schema tidak diubah.

- 2026-10-03 — standar sampul: pengguna menyetujui rekomendasi gambar diam JPG/JPEG/PNG/WebP maksimal 5 MB, sumber minimal 1080 × 1920 portrait 9:16, hasil akhir WebP 1080 × 1920 serta downscale sumber lebih besar. Berlaku seragam untuk movie/episode/standalone/series. Plan/model/PRD/arsitektur/context/runbook/backlog diselaraskan; batas file movie >10 menit tetap terbuka. Validator Bun untuk konsistensi tujuh dokumen/proof sampul, Prettier check dan `git diff --check` lulus. Persetujuan ini hanya kontrak rencana; upload/decode/konversi gambar belum diimplementasikan.

- 2026-10-03 — aplikasi khusus vertikal: pengguna menegaskan semua video dan sampul wajib portrait 9:16, lalu mengonfirmasi satu standar sampul untuk semua jenis konten. Izin landscape/cinematic pada rancangan sebelumnya digantikan kebijakan sumber portrait 9:16; validasi tetap memperhitungkan rotasi/SAR tanpa crop/upscale. Nilai format/pixel/byte standar sampul belum dipilih. Plan/model/PRD/arsitektur/context/runbook/backlog media diselaraskan; Prettier check tujuh dokumen, validator Bun untuk policy seragam/contoh rasio dan `git diff --check` lulus. Runtime/schema/player tidak diubah.

- 2026-10-03 — durasi standalone: pengguna menyetujui maksimum 10 menit (600 detik), mengikuti batas file 1 GB yang sudah disetujui untuk video sampai 600 detik. Plan/model/PRD/backlog diselaraskan; batas durasi semua kind kini ditetapkan. Ukuran movie >10 menit dan detail file poster tetap terbuka. Validasi dokumentasi: Prettier check empat dokumen dan `git diff --check`; implementasi runtime belum dilakukan.

- 2026-10-03 — format/durasi/poster: pengguna menyetujui pasangan sumber MP4/MOV/MKV H.264/H.265 dan WebM VP8/VP9, movie maksimal 3.600 detik, episode maksimal 600 detik serta poster portrait 9:16. Definisi standalone dijelaskan; batasnya belum disetujui. Plan/model/PRD/backlog diselaraskan; limit byte movie >10 menit dan format/ukuran/dimensi minimum poster tetap terbuka. Prettier check empat dokumen, validator Bun untuk konsistensi keputusan/anchor dan `git diff --check` lulus. Tidak ada perubahan runtime atau proof media dari persetujuan dokumen ini.

- 2026-10-03 — target kualitas/budget: pengguna menyetujui rentang standar/tinggi yang disarankan, default 1080p30 6–8 Mbps, acuan 60 fps 8–12 Mbps dan 1 GB untuk video sampai 10 menit. Durasi maksimum per kind serta limit movie panjang belum ditetapkan; tidak memperluas batas 10 menit menjadi maksimum universal. Plan/model/PRD/backlog diselaraskan, tanpa perubahan runtime/env/schema atau klaim proof upload.

- 2026-10-03 — keputusan resolusi: pengguna membatasi sumber juga maksimal 1080p setelah membahas beban 4K; minimum 480p dari keputusan sebelumnya tetap berlaku. Plan/model/PRD/arsitektur/runbook/context dan acceptance media/HLS diselaraskan. Whitelist format/codec masih rekomendasi. `bun run --bun prettier --check` pada tujuh dokumen tersebut dan `git diff --check` lulus; validator Bun untuk kesesuaian kebijakan empat dokumen inti dan anchor PRD → plan lulus. Validasi hanya dokumen; tidak mengaktifkan upload/worker atau mengubah env/schema/runtime.

- 2026-10-03 — refinement media: update context sebelum plan; catat keputusan MinIO/R2/env/HLS, backlog 10 task, sampel env tanpa secret serta dokumen terkait. Pemeriksaan Bun untuk 127 tautan lokal/anchor, 10 ID unik, dependency DAG tanpa siklus dan kesesuaian profil env lulus. Instruksi Video.js dibaca memakai `bunx --bun @videojs/cli agents init --method shadcn --framework react` dari apps/web, kemudian CLI dipin `@10.0.0-rc.4` untuk mengatasi mismatch versi terbaru; hanya mencetak instruksi. Tidak ada manifest/lockfile/dependency runtime yang berubah. Prettier check pada 12 dokumen target dan `git diff --check` dipakai untuk validasi dokumen; bukan proof storage, FFmpeg atau HLS. Tidak ada implementasi runtime, migration, provisioning bucket/akun, commit/push pada tindak lanjut ini.

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

- VID-012: Archive series/season/video selesai tanpa cascade/hard delete. PostgreSQL runtime 8 pass: data retained, list visibility, repeat/stale version, mutation denial, published child protection dan archived-parent episode creation denial. Media-job checks tetap extension tahap queue; belum ada tabel media. Root lint/type-check hook commit. Commit dibuat sesudah validasi; commit sebelumnya: 22b7505 feat(api): implement atomic video metadata edits.

- VID-013: 16 endpoint bisnis dipasang statis sebelum Scalar; bootstrap menyuntikkan satu pool/repositories/services dan native session reader. API units 30 pass/120 assertions, semua endpoint anonymous401/no-store, strict payload422, absent dependency503, cookie security dan operation ID unik. Root check-types lulus termasuk Eden compile-only positive/negative; build dua app lulus (warning bundler Base UI existing). Root lint/type-check hook commit. Commit dibuat sesudah validasi; commit sebelumnya: a5d7bbe feat(api): add safe content archive operations.

- VID-014: Proof PostgreSQL dedicated lulus: 19 test/183 assertions pada schema, runtime dan HTTP native; races expectedVersion/episode/parent archive serta rollback genre terbukti. Regression auth schema/runtime/authorization/OpenAPI 20 test/160 assertions lulus, termasuk ID/hash/session existing melalui enam migrasi. API unit 30 test/120 assertions dan root check-types lulus; frozen install tidak mengubah lockfile. Scripts proof dan sample CONTENT_TEST_DATABASE_URL tersedia; seluruh reset hanya database test localhost, DB development tidak dimigrasi. Commit dibuat sesudah validasi; commit sebelumnya: 1ea6982 feat(api): compose typed content modules.

## Validation History — tahap A selesai lokal

Pada 3 Oktober 2026: 30 source tests/120 assertions, 19 content integration tests/183 assertions, dan 20 auth regression tests/160 assertions lulus. Root lint (web), check-types (API/web/auth/Eden), build kedua app, dan frozen install lulus. Bukti migrasi memakai database dedicated; DB development/production belum dimigrasi. Tidak ada perubahan dependency/lockfile, CI, player atau storage. Docs link/format dan diff diperiksa pada VID-015. Runbook serta batas smoke/load/browser ada pada [Video Operations](VIDEO_OPERATIONS.md).

## Commit ledger tahap A

Validasi akhir dokumentasi: 93 tautan lokal/anchor dan 15 task Done lulus; formatter dan `git diff --check` lulus. Pemeriksaan read-only journal development masih menunjukkan tiga migrasi auth; migrasi konten tidak diterapkan pada target tersebut.

| Task    | Commit                        | Hasil                                                                            |
| ------- | ----------------------------- | -------------------------------------------------------------------------------- |
| VID-001 | ea3c891                       | docs(video): approve metadata implementation plan                                |
| VID-002 | 339049f                       | feat(api): add series and seasons schema                                         |
| VID-003 | 38f3ba9                       | feat(api): add video metadata schema                                             |
| VID-004 | 9b69b36                       | feat(api): add content genre taxonomy                                            |
| VID-005 | b990ff3                       | feat(api): define content validation contracts                                   |
| VID-006 | 7c829a2                       | feat(api): implement series draft management                                     |
| VID-007 | c3bb65b                       | feat(api): implement season management                                           |
| VID-008 | 09c48f8                       | feat(api): implement genre taxonomy endpoints                                    |
| VID-009 | 0dd90c5                       | feat(api): implement video draft creation                                        |
| VID-010 | ae05dad                       | feat(api): add video metadata queries                                            |
| VID-011 | 22b7505                       | feat(api): implement atomic video metadata edits                                 |
| VID-012 | a5d7bbe                       | feat(api): add safe content archive operations                                   |
| VID-013 | 1ea6982                       | feat(api): compose typed content modules                                         |
| VID-014 | 226fc43                       | test(api): prove content metadata with native auth                               |
| VID-015 | Commit yang memuat ledger ini | Dokumentasi, runbook, dan penutupan iterasi; SHA final ditentukan sesudah commit |

- VID-015: Dokumentasi model/status/rute, runbook VIDEO_OPERATIONS, contoh request/response dan migrasi additive diperbarui. Tahap A selesai; 30 units, 19 content proof dan 20 auth regression tests lulus; root lint/type-check/build/frozen install lulus. Ledger commit setiap task dicatat; MEDIA-001 memerlukan keputusan provider/native S3/limits/multipart-resume/source immutable, tanpa dependency speculative. Link/anchor checker, formatter dan git diff --check menjadi gate akhir. DB development/production belum dimigrasi; gateway/UI/media tetap roadmap. Commit dibuat sesudah validasi; commit sebelumnya: 226fc43 test(api): prove content metadata with native auth.

## Tindak lanjut VERIFY-001 — migrasi development dan gerbang penyelesaian

Sesudah VID-015, pengguna menginstruksikan test yang tersedia, check-types, lint yang tersedia, build, dan migrasi development untuk perubahan schema backend. Migrasi 0003–0005 berhasil pada localhost:5433/vertical_movie_app; journal 3 → 6, enam tabel/constraints metadata tersedia, serta snapshot user/account/session/verification/rate_limit tetap sama. Backup PostgreSQL custom-format di luar repo tervalidasi melalui pg_restore --list. API 30, package auth 3, web 35 dan content integration 19 test lulus (87 test, 463 assertions). Root check-types dan lint lulus menggunakan cache valid; root build kedua app lulus dengan eksekusi baru. Aturan dicatat pada AGENTS/Global Workflow/API Development. Deployment production, full backup restore dan storage tetap terpisah. Evidence dan batas operasi ada pada [VERIFY-001](tasks/development-verification.md).

## Finalisasi plan media — 4 Oktober 2026

- Instruksi pengguna: finalisasi plan, buat branch, lalu commit. Snapshot pre-write 0d3bef87f6d2f9b0a2873078f9b560f092f13c53, branch asal codex/design-system-final; target branch codex/media-backend-plan. Commit final adalah commit yang memuat entri ini; SHA aktual dilaporkan melalui git log setelah commit.
- Context diperbarui sebelum plan. Keputusan 1–7, sampel env, impact/DAG/acceptance dan backlog diselaraskan; proposal nomor 8 dan technical proof tetap eksplisit. Tidak mengubah runtime/schema/dependency/local env atau data storage/DB.
- Desain existing dipertahankan dan tidak masuk commit media; indeks docs hanya men-stage bagian media. Tidak ada push/PR/rollout.
- Validator Bun dokumen lulus: 14 dokumen pada index commit, 170 tautan lokal/anchor, 39 ID task unik (15 metadata Done, VID-016 Backlog, 23 task media), dependency dikenal/DAG tanpa siklus dan prerequisite Ready terpenuhi; default env/credential kosong serta geometry multipart/TTL terverifikasi secara statis. Ini evidence plan, bukan proof storage/FFmpeg/HLS.
- Gerbang commit: Prettier targeted dan git diff whitespace diperiksa; Husky menjalankan lint/check-types dan Commitlint tanpa bypass. SHA dan hasil hook final dilaporkan sesudah commit.

## Eksekusi implementasi media — 4 Oktober 2026

- Base commit: 4ce185d; branch codex/media-backend-implementation. Plan freshness valid: source/storage/queue/gateway belum berubah dari snapshot; hanya finalisasi planning.
- MEDIA-CFG-001: loader storage server, native client factory, bootstrap DI tanpa network saat import serta env Turbo dibuat. Metadata-only tetap berjalan bila STORAGE_PROVIDER absent; jika selector diisi seluruh profile wajib valid tanpa fallback. API unit 51 pass/151 assertions dan root check-types 3 task sukses; lint/build serta review akhir masih pending.
- MEDIA-PROOF-001: probe Bun 1.4.2 menunjukkan S3Client mengekspos delete/exists/file/list/presign/size/stat/unlink/write; tidak mengekspos createMultipartUpload/uploadPart/listParts/completeMultipartUpload/abortMultipartUpload. Native writer multipart otomatis bukan kontrak resume browser. SDK S3 khusus operasi multipart/copy/control dipilih setelah gap ini ditemukan; native dipertahankan untuk operasi yang terbukti cocok. MinIO health reachable; credential storage aplikasi belum diisi. Bukti operasi objek dedicated dan browser masih pending.

- Koreksi pengguna 4 Oktober 2026: implementasi dihentikan; branch implementasi di-rename dari codex/media-backend-implementation menjadi feat/media-backend mengikuti pola branch fitur existing feat/auth-admin-module dan feat/video-metadata. Perubahan worktree dipertahankan; tidak ada commit/push pada koreksi ini.

## Hasil implementasi development — 4 Oktober 2026

Branch feat/media-backend dari 4ce185d. Implementasi inti tahap B–D tersedia untuk review lokal; status per task dan batas proof kini dicatat pada backlog media/worker/publication, bukan diasumsikan Done dari persetujuan plan. Storage aplikasi MinIO memakai credential aplikasi scoped bucket pada env ignored. SDK hanya menutup gap browser multipart/copy/control yang tidak tersedia pada Bun 1.4.2.

Upload selesai secara atomik memasang pointer immutable dan enqueue; GET status upload menyertakan state pemrosesan, progress, attempt/failure dan verified-ready. Worker terpisah menghasilkan HLS hls-v1 dan WebP tanpa autopublish. Publish/series visibility, catalog/next, preview/playback, archive serta retention/deletion claim telah mempunyai proof PostgreSQL/MinIO. Player Video.js 10 RC memakai adapter HLS versi sama; Chromium membuktikan pause/seek setelah expiry di Vite dan hasil build Bun/Nitro.

Migrasi 0006–0008 development diterapkan melalui command resmi setelah backup; journal 9 dan data auth/metadata lama dipertahankan. Compatibility migration diuji dengan row legacy draft/published/unpublished/archived pada database khusus. Kontrak aktif dan command/evidence berada pada [Media Operations](MEDIA_OPERATIONS.md) serta [Upload Contract](MEDIA_UPLOAD_CONTRACT.md).

Root frozen install/check-types/lint/build lulus, API72/267, web37/157, auth3/14 dan content19/204. Matrix codec/container/HDR/VFR/rotasi/invalid/animasi 3/41 serta Chromium manual quality/expiry/terminal404 1/70 lulus. Gerbang eksternal tersisa: R2 staging, benchmark target 4 core/4 GB dan Safari/native HLS; proof episode10menit1/66 dan movie30menit1/63 lulus, termasuk paused near-end seek. Built Bun/Nitro tiga-tier12s1/70 dan cleanup fault3/26 juga lulus. Ini proof fungsi pada fixture sintetis; full restore serta stress supervisor/resource/visual/keyframe masih terpisah. Proposal deployment belum dijalankan. Implementasi belum di-commit/push; desain existing tidak termasuk scope.

Gerbang final lulus: API72/267, root check-types3 task, lint1 task, build2 task (web dibangun ulang setelah fixture import-protection dipulihkan), frozen install770/947 tanpa perubahan, git diff --check serta173 local links/anchors pada12 dokumen. Auth import-protection menolak @repo/auth/server pada client build dan memulihkan fixture; build positif selesai sesudahnya. Branch feat/media-backend masih belum commit/push; file desain existing dipertahankan.

## Delivery Git implementasi — 4 Oktober 2026

Commit/push/PR/merge diotorisasi pengguna. Plan tetap valid terhadap HEAD4ce185d dan origin/main0d3bef87 setelah fetch; source tidak berubah sejak proof penutupan. Stage hanya implementasi media dan dokumentasinya. SHA commit implementasi dan hasil hook akan dicatat pada ledger setelah commit; merge normal menjaga riwayat dan branch sumber. R2/Safari/kapasitas4GB/restore serta matriks stress yang belum dibuktikan tetap merupakan gate rollout, bukan dianggap lulus oleh merge.
