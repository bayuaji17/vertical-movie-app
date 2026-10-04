# Repository Context — Documentation

## Snapshot

- Repository: bayuaji17/vertical-movie-app
- Base ref: main
- Base SHA: 68604daf3abe208f7f57c3b72b0a75d4467dfbc6
- Analyzed at: 2026-10-04
- Context status: current

## Product and Users

Aplikasi video vertikal dengan admin tunggal dan penonton publik. Tujuan pekerjaan ini adalah dokumentasi yang konsisten untuk development.

## Repository Map

apps/api memiliki Elysia/Drizzle/storage/worker; apps/web memiliki TanStack Start/player; packages/auth memiliki Better Auth. docs berisi spesifikasi, panduan, runbook, plan, backlog dan desain. AGENTS.md mengatur proses repo; README.md root merupakan quick start. .agents/.commandcode dan skills-lock.json mengelola skill; .husky/commitlint menjaga quality gate; turbo.json mengatur task workspace.

## Architecture and Boundaries

Dokumentasi proyek dipusatkan pada docs dan instruksi agent pada AGENTS.md root. Struktur saat ini mempunyai 18 dokumen uppercase pada root docs selain indeks; context/plan auth dan video bercampur dengan referensi aktif. Tidak ada AGENTS.md turunan.

## Runtime and Data Flow

Bun/Turbo menjalankan API, web dan worker terpisah. Path dokumentasi bukan dependency runtime. .env.example dan README root menautkan dokumentasi sehingga ikut terdampak pemindahan.

## Domain and Data Model

Metadata/media/publication tidak berubah. ID PRD, GR, task dan keputusan pengguna harus dipertahankan.

## External Integrations

PostgreSQL, MinIO/R2 dan browser bukan target perubahan. Tidak membaca kredensial atau mengoperasikan database/storage.

## Development, Testing, and Delivery

Root memiliki Bun/Prettier, lint, check-types, build dan Husky. Belum ada docs:check. Request mengotorisasi branch baru dan perubahan dokumentasi/aturan; tidak meminta Git delivery tambahan pada pekerjaan ini.

## Constraints and Conventions

Branch chore/docs-organization berasal dari SHA snapshot. Stylesheet, konten design system dan artefak desain existing harus dipertahankan; pemindahan dokumen boleh memperbarui referensi path. Tidak mengedit managed Turborepo block atau installed skills.

## Relevant Active Work

Media sudah merge pada PR3. Worktree desain existing mencakup stylesheet, DESIGN_SYSTEM, bagian README, tasks/design-system serta artefak docs/design.

## Exploration Coverage

Diperiksa: tree Git, seluruh daftar docs, root AGENTS/README/package/Husky, workflow/template, tautan silang dan script desain. Runtime apps tidak dianalisis ulang karena hanya komentar env sample/link dokumentasi yang berubah. Installed/vendor docs dikecualikan.

## Unknowns and Assumptions

Taksonomi dipilih berdasarkan fungsi; plans menyimpan konteks/riwayat per fitur, bukan spesifikasi aktif. Tidak menghapus evidence historis atau memindahkan aset desain.

## Evidence Index

Path dalam teks menunjuk lokasi dokumen sesudah reorganisasi pada worktree. Sumber file pada base SHA dapat diperiksa melalui tautan immutable pada [mapping plan](implementation-plan.md#affected-files-and-symbols); struktur baru belum berada pada base commit tersebut.

Baseline analisis adalah SHA 68604daf3abe208f7f57c3b72b0a75d4467dfbc6, dengan perubahan worktree desain dibedakan: AGENTS.md (ownership/gates), docs/README.md (indeks semula), workflow/template (status/AC/evidence), package.json dan .husky/pre-commit (task/hook), README.md/.env.example (reverse links), docs/design/build-design-system.mjs dan export-design-system.mjs (aset tetap).

## Hasil verifikasi reorganisasi — 4 Oktober 2026

Branch `chore/docs-organization` tetap pada base SHA; 18 dokumen dipindahkan tanpa mengubah ID keputusan/task. Struktur kini memiliki kategori dan indeks canonical, root documentation rules serta gate `docs:check` pada package/hook. Verifikasi lulus: 44 Markdown/280 tautan, 10 smoke cases, frozen install, check-types, lint, build, formatter dan whitespace. 13 file protected dan managed block agent tetap identik. Evidence rinci berada pada [execution log](implementation-plan.md#execution-log); tidak ada Git delivery atau rollout tambahan.

## Otorisasi commit per task — 5 Oktober 2026

Pengguna menambahkan aturan commit lokal setelah setiap task selesai. Keputusan ini berlaku pada pekerjaan berikutnya dan tiga task dokumentasi yang telah selesai tetapi belum di-commit. Branch tetap `chore/docs-organization`; pre-write HEAD `68604daf3abe208f7f57c3b72b0a75d4467dfbc6`. Dokumen/stylesheet/aset desain existing dipertahankan sebagai perubahan lokal terpisah; index commit memakai baseline desain yang sudah berada di Git dengan path baru. Commit task tidak mengotorisasi push/PR/merge atau rollout.

## Ledger commit task — 5 Oktober 2026

DOCS-001 dan DOCS-002 telah diserahkan sebagai commit lokal terpisah. Context/plan tetap valid: perubahan HEAD hanya menjalankan mapping dokumentasi dan aturan/checker dalam scope plan. Source runtime, credential dan aset desain tidak berubah. DOCS-003 mencatat hasil penutupan dan ledger sesudah pemeriksaan snapshot index serta quality gate lulus; tidak ada operasi remote.

| Task     | Commit                                   | Evidence                                                                    |
| -------- | ---------------------------------------- | --------------------------------------------------------------------------- |
| DOCS-001 | bbd34602dcdbaca30e51c5ce95668a41c9b3223c | Snapshot index dan hook docs/lint/check-types/Commitlint lulus tanpa bypass |
| DOCS-002 | 29dd9325a2d9a01ae7fa0ae10cd001c1355eada0 | Snapshot index dan hook docs/lint/check-types/Commitlint lulus tanpa bypass |

SHA dicatat sesudah commit berhasil. Push/PR/merge tidak dilakukan. Commit task terakhir dicatat pada pembaruan ledger berikutnya.

## Review PRD — 5 Oktober 2026

- Snapshot: `790e174a9fef748564450244d05038fce8e9bdbd`, branch `chore/docs-organization`.
- Permintaan pengguna: review PRD terhadap repository saat ini karena kebutuhan produk sudah mendekati final. Aturan commit lokal per task tetap berlaku.
- Context status: current untuk review PRD. Snapshot reorganisasi di atas tetap merupakan riwayat pada SHA awalnya.
- Scope: PRD canonical, navigasi index, backlog dokumentasi serta context/plan ini. Tidak mengubah kebutuhan yang belum disetujui menjadi keputusan final.
- Worktree existing: stylesheet, spesifikasi/aset desain dan referensi desain pada index tetap terpisah; receipt commit DOCS-003 pada plan dapat masuk pembaruan ledger task ini sesuai aturan root.

### Perilaku yang diamati

Auth admin tunggal tersedia di `packages/auth`, guard API dan gateway web. Backend metadata series/season/episode/movie/standalone tetap berada di `apps/api`; source media dibatasi menurut jenis konten. `createApp` memasang module media, catalog, publication dan playback. Upload memakai S3 multipart dengan freeze sumber dan enqueue PostgreSQL; worker terpisah menghasilkan HLS/WebP, recovery dan cleanup. Video schema saat ini memakai draft/published/archived. Ini bertentangan dengan klaim PRD bahwa media dan lifecycle belum diimplementasikan.

Frontend memiliki login/dashboard sesi admin, watch dan preview minimal. Homepage masih starter MP4 demo; tidak ada form CRUD/upload/publish/dashboard konten atau konfigurasi situs lengkap. Backend katalog memiliki urutan createdAt/id descending dan next episode menurut season/episode ascending; pilihan UX katalog belum disetujui hanya karena query sudah tersedia. Subtitle upload/persistensi belum tersedia. Backlog media masih Review/In Progress/Blocked; merge bukan alasan menaikkan semuanya menjadi Done.

### Evidence pada snapshot review

| Subject            | Path/symbol                                                                                                                                                     | Kesimpulan                                                                                              |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Composition        | `apps/api/src/app.ts#createApp`, `apps/api/src/index.ts`                                                                                                        | Modul media/catalog/publication/playback disusun dan dependency tersedia saat bootstrap dikonfigurasi.  |
| Auth               | `packages/auth/src/internal/options.ts`, `apps/api/src/modules/auth/admin/guard.ts`, `apps/web/src/routes/admin._authenticated.tsx`                             | Single-admin provisioning, login dan akses privat terpisah dari akses publik.                           |
| Metadata/lifecycle | `apps/api/src/db/schema/videos.ts`, `apps/api/src/modules/videos/service.ts#archive`, `apps/api/src/modules/publication/service.ts#publish`                     | Enum video archived, versioning, rights/readiness dan publish manual tersedia.                          |
| Upload             | `apps/api/src/modules/media/policy.ts#validateUpload`, `apps/api/src/modules/media/service.ts`, `docs/architecture/media-upload-contract.md`                    | Episode 512 MB, movie/standalone 1,5 GB, multipart/resume/freeze; completed belum ready.                |
| Worker             | `apps/api/src/workers/probe.ts#videoFacts`, `transcode.ts#transcodeHls`, `runner.ts`, `cleanup.ts`, `apps/api/src/config/worker-env.ts`                         | Decode/normalisasi, HLS dan cleanup tersedia; concurrency default 1.                                    |
| Catalog/delivery   | `apps/api/src/modules/catalog/repository.ts#playable`, `#next`, `apps/api/src/modules/playback/service.ts`, `apps/web/src/components/vertical-video-player.tsx` | Effective visibility, TTL 2×, playlist no-store dan renewal tersedia.                                   |
| UI gap             | `apps/web/src/routes/index.tsx`, `admin._authenticated.index.tsx`, `watch.$slug.tsx`, `admin._authenticated.videos.$id.preview.tsx`                             | Watch/preview minimal; homepage starter dan dashboard sesi belum alur konten lengkap.                   |
| Evidence/limits    | `docs/operations/media.md`, `docs/tasks/media.md`, `media-worker.md`, `media-publication.md`                                                                    | Proof MinIO/Chromium historis; R2 staging, Safari, kapasitas 4 core/4 GB, full restore/stress terpisah. |

Seluruh path source pada tabel dibaca terhadap snapshot review di atas; source aplikasi tidak mempunyai perubahan lokal pada jalur review, kecuali stylesheet desain yang dikecualikan. Paket/scripts root, API, web dan auth diperiksa; dependency/runtime/schema/deployment tidak diubah. Tidak membaca credential atau menjalankan integrasi yang mengubah database/storage. Review kode saat ini tidak mengulang proof historis di runbook.

### Unknowns dan keputusan produk tersisa

UX katalog/navigasi, field konfigurasi situs, kebijakan konten/pelaporan/indexing dan format/alur subtitle opsional belum lengkap. Restore/republish serta cascade parent bukan fitur yang sudah tersedia. Detail teknik HDR/VFR/audio sudah mempunyai implementasi dan fixture; batas compatibility/visual/perangkat/resource yang belum diverifikasi tetap evidence gap, bukan alasan membuka ulang keputusan provider/HLS/retensi yang sudah disetujui.

Global Rules dan Architecture masih memuat status/claim lama. Task ini memperbaiki PRD serta menandai konflik acuan tersebut; review kedua dokumen dilakukan sebagai task tersendiri agar instruksi historis tidak dianggap mengalahkan kode dan keputusan pengguna terkini.

## Review Global Rules — 5 Oktober 2026

- Snapshot: `846929a82b1b9c6c1ae5516afa29f5004d01597c`, branch `chore/docs-organization`.
- Context status: current untuk DOCS-005; permintaan pengguna melewati pembahasan rincian PRD yang tersisa dan melanjutkan Global Rules. Pertanyaan tersebut tidak otomatis disetujui/dihapus.
- Freshness: HEAD hanya menambahkan DOCS-004 pada source baseline review sebelumnya. PRD/index/context/plan/backlog berubah; runtime aplikasi tidak berubah. Receipt DOCS-004 pada plan adalah update ledger yang diizinkan masuk task berikutnya.
- Scope: Global Rules canonical, dua referensi status pada PRD/index, backlog dan context/plan. Perubahan desain existing dipertahankan dan tidak masuk commit.

### Evidence dan konflik yang diamati

| Subject              | Source pada snapshot                                                                                                                                              | Temuan                                                                                                                                                                                         |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Admin/publik         | `packages/auth/src/internal/options.ts#createAuthOptions`, `apps/api/src/modules/auth/admin/guard.ts#createRequireAdmin`, `apps/api/src/modules/catalog/index.ts` | Signup nonaktif, private guard authoritative; katalog tanpa login. GR-01/02 selaras keputusan inti.                                                                                            |
| Effective visibility | `apps/api/src/modules/catalog/repository.ts#playable`, `apps/api/src/modules/playback/service.ts#row`, `docs/product/prd.md`                                      | Parent/readiness memengaruhi akses baru; archive tidak membatalkan signed URL yang sudah diterbitkan. GR-03 perlu batas expiry/cache dan pengecualian preview admin.                           |
| Publish/idempotency  | `apps/api/src/modules/publication/service.ts#publish`, `apps/api/src/modules/media/service.ts#complete`, `apps/api/src/workers/queue.ts`                          | Publish manual/idempotency, freeze/enqueue dan lease tersedia. UI upload/management/recovery belum lengkap; callback transcode eksternal bukan alur sistem saat ini.                           |
| Provider             | `apps/api/src/config/storage-env.ts#loadStorageEnv`, `docs/product/prd.md`                                                                                        | MinIO dev/R2 prod via env dipilih; R2 proof belum tersedia. Klaim provider final terbuka sudah usang.                                                                                          |
| Public DTO / URL     | `apps/api/src/modules/catalog/model.ts#PublicVideoDto`, `apps/api/src/modules/playback/service.ts#info`, `#playlist`                                              | Metadata publik whitelisted; poster/segment signed URL sengaja dikirim sebagai kapabilitas temporer. Larangan semua signed URL di respons publik bertentangan dengan delivery yang disepakati. |
| Persistence / worker | `apps/api/src/modules/media/service.ts`, `apps/api/src/workers/process.ts#runMediaProcess`, `docs/operations/media.md`                                            | Domain/metadata dan operasi storage/FFmpeg dipisahkan; lease/retry/cleanup tersedia, tanpa menganggap proof production selesai.                                                                |
| UI / status dokumen  | `apps/web/src/routes/index.tsx`, `docs/guides/development-workflow.md`, `docs/design/design-system.md`, `docs/product/prd.md`                                     | Homepage masih starter; workflow sudah disetujui, PRD mendekati final, design final lokal terpisah dari implementasi. Klaim semua masih draft tidak berlaku.                                   |

GR-01–09 dipertahankan. Ketentuan inti yang sudah disetujui dipisahkan dari proposal antarmuka (autoplay audio, target audit aksesibilitas) dan kebijakan konten yang belum lengkap. Tidak memaksakan keputusan PRD baru atau mengubah GR-09 menjadi kebijakan yang telah disetujui. Aturan proses dan command dimiliki root AGENTS/guides, sehingga Global Rules merujuk pemiliknya tanpa menyalin instruksi branch/commit/generated files.

Evidence merupakan review statis source saat ini dan proof historis di runbook, tanpa menjalankan ulang integrasi, membaca credential atau mengubah runtime/schema/deployment. Architecture masih memerlukan task review sendiri; referensi status pada PRD diperbarui bersama Global Rules agar tidak terus menyebutnya sebagai dokumen usang setelah task selesai.

## Review Architecture — 5 Oktober 2026

- Snapshot: `1f45728d5a0aeeecae48149ae538997c04f122f2`, branch `chore/docs-organization`.
- Context status: current untuk DOCS-006. Pengguna mengotorisasi lanjut ke Architecture setelah Global Rules.
- Freshness: perubahan sejak snapshot DOCS-005 hanya enam dokumen review Global Rules; source aplikasi/schema/manifest tidak berubah. Receipt DOCS-005 pada plan dapat masuk commit task berikutnya.
- Scope: Architecture overview, referensi status PRD/Global Rules/index, backlog dan context/plan. Preserve desain lokal serta keputusan produk/proposal yang dilewati.

### Evidence arsitektur saat ini

| Subject                   | Source pada snapshot                                                                                                                                                    | Observed behavior                                                                                                                                                                                                                                       |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API composition/bootstrap | `apps/api/src/app.ts#createApp`, `apps/api/src/index.ts`                                                                                                                | Factory tanpa listen; entry point memasang dependency auth/DB/storage/media/catalog/publication/playback lalu listen. Storage absent membuat media/playback unavailable, bukan bucket fallback.                                                         |
| DB/auth                   | `apps/api/src/db/client.ts#createDatabase`, `packages/auth/src/internal/options.ts`, `internal/schema.ts`                                                               | Pool Bun SQL/Drizzle per proses; native Better Auth, signup nonaktif dan unique single-admin. Worker memakai pool sendiri pada DB yang sama.                                                                                                            |
| Web/gateway/client        | `apps/web/src/routes/api/$.ts`, `api/auth/$.ts`, `lib/server/auth-gateway.ts`, `lib/api/client.ts`                                                                      | Gateway bisnis fixed upstream sudah ada, strip satu /api; auth mempertahankan /api/auth. Eden type-only/parseDate false; browser public origin /api, payload segment langsung storage.                                                                  |
| Storage/upload            | `apps/api/src/storage/s3.ts`, `storage/multipart.ts`, `modules/media/service.ts`                                                                                        | Native Bun S3 untuk operasi yang didukung; SDK explicit browser multipart/copy/control. Session/freeze/enqueue tersedia; key/provider/bucket persisted.                                                                                                 |
| Worker/queue              | `apps/api/src/workers/index.ts`, `queue.ts`, `runner.ts`, `process.ts`, `cleanup.ts`                                                                                    | Polling PostgreSQL, SKIP LOCKED claim, heartbeat/recovery/retry, activation output berdasarkan lease/generation, subprocess FFmpeg dan cleanup/shutdown terpisah. Tidak ada LISTEN/NOTIFY runtime.                                                      |
| Schema/migrations         | `apps/api/src/db/schema/{videos,content-columns,media,upload,jobs,operations}.ts`, `drizzle/0006_media-upload.sql`, `0007_media-jobs.sql`, `0008_media-publication.sql` | Video draft/published/archived; series memakai publicationColumns sebelumnya + archivedAt, season archivedAt. Aset uploading/uploaded/processing/ready/failed; job/upload enums sendiri. Tabel media/session/job/rendition/attempt/operation sudah ada. |
| Route contract            | `apps/api/src/modules/{series,videos,genres,media,publication,catalog,playback}/index.ts`                                                                               | Detail publik slug; upload /admin/media/uploads; archive /admin/videos/:id/archive; publish/series/playback/preview tersedia. Kandidat unpublish/settings/upload-session per video lama bukan endpoint aktif.                                           |
| Delivery/UI/limits        | `apps/api/src/modules/playback/service.ts`, `apps/web/src/routes/index.tsx`, `watch.$slug.tsx`, `admin._authenticated.index.tsx`, `docs/operations/media.md`            | HLS/watch/preview tersedia; homepage/admin konten/config/subtitle belum lengkap; R2/Safari/benchmark/restore/stress gates terpisah.                                                                                                                     |

Arsitektur lama masih menganggap media/queue/worker/HLS/gateway bisnis belum tersedia, memuat distribusi TBD, status pending_upload/unpublished untuk video dan rute kandidat usang. Overview diganti baseline implemented dengan dataflow, ownership, active routes dan future gaps, bukan dokumen proposal menyeluruh. Angka policy media dirujuk ke PRD/environment/runbook agar tidak disalin ulang; evidence historis tetap bertanggal dan tidak dianggap proof yang diulang pada review ini.

Subjek proses development tetap dimiliki AGENTS/guides. Diagram mengidentifikasi upload browser lengkap sebagai UI pending, meskipun backend multipart tersedia; PostgreSQL bukan tempat menyimpan body video. Schema settings/subtitle, dashboard konten/katalog UI dan deployment belum dibuat. Tidak membaca credential, database aktual, atau mengubah storage/schema/runtime/dependency. Tidak mengaudit ulang seluruh model data/plan historis; bagian schema aktif dan source tetap acuan ketika bagian tahap A berbeda.
