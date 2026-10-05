# Modul: admin media upload

- Status: **plan dan empat mockup disetujui pengguna** pada 2026-10-05; ADUP-001/ADUP-006 Done, runtime belum diimplementasikan.
- Diperbarui: 2026-10-05.
- Snapshot: `d8417249de99611e1a661ade03bb4b03dd5f0538` pada `main`.
- Plan canonical: [implementation-plan](../plans/admin-media-upload/implementation-plan.md).
- Evidence repository: [repository-context](../plans/admin-media-upload/repository-context.md).
- Workflow: [development-workflow](../guides/development-workflow.md); struktur task mengikuti [template](../templates/task.md).

## Tujuan modul

Menambahkan Upload Media pada detail draft Film/Standalone (video asli dan sampul) dan Series (sampul), memakai Eden/TanStack Query untuk kontrol JSON dan direct S3 multipart PUT untuk byte. Pertahankan shell responsif, theme/avatar, metadata dan preview HLS existing. Identitas file saat resume, rediscovery session, status pemrosesan dan cleanup browser harus mempunyai bukti saat implementasi. Aturan produk tetap pada [PRD](../product/prd.md), [aturan produk](../product/global-rules.md) dan [kontrak upload](../architecture/media-upload-contract.md); proposed additions di plan belum menjadi kontrak aktif.

Tidak ada runtime atau empat mockup raster yang dibuat pada task planning. Episode editor, subtitle, publication actions dan rollout production berada di luar modul ini. Branch planning `chore/admin-media-upload-plan`; branch runtime yang direkomendasikan `feat/admin-media-upload` setelah scope/review dan freshness. Local task commit telah diotorisasi workflow pengguna; push/PR/merge memerlukan instruksi tersendiri.

## User story: ADUP-US01

Sebagai admin, saya ingin memilih video/sampul yang valid dan mengunggahnya langsung ke storage, sehingga konten draft mempunyai media tanpa membebani gateway dengan byte video.

## User story: ADUP-US02

Sebagai admin, saya ingin pause, retry dan melanjutkan upload dengan file yang sama setelah refresh, sehingga koneksi terputus tidak memaksa upload seluruh file lagi.

## User story: ADUP-US03

Sebagai admin, saya ingin melihat upload, pemrosesan dan readiness secara terpisah, sehingga saya mengetahui kapan media siap dipreview.

## User story: ADUP-US04

Sebagai admin, saya ingin perilaku upload aman terhadap logout, navigasi dan konflik metadata, sehingga sesi privat tidak tertinggal dan input saya tetap terjaga.

## Urutan dan dependencies

Task dikerjakan menurut dependencies di plan. Proof hashing dan review desain mendahului task yang bergantung padanya. Dependencies bukan instruksi delegasi. Tidak ada estimasi waktu pasti sebelum proof browser dan desain.

## Task: ADUP-001 — Context, plan dan backlog Upload Media

- Status: Done
- Owner: pengembang/agent pelaksana task.
- Prioritas: 1, mengikuti dependencies.
- Referensi: ADUP-US01; [plan canonical](../plans/admin-media-upload/implementation-plan.md), [PRD](../product/prd.md).
- Diperbarui: 2026-10-05.
- Dependensi: tidak ada.
- Ukuran: satu task dokumentasi.

### Ruang lingkup

Plan berbasis SHA terverifikasi tersimpan sebelum runtime.

Target/symbol: Snapshot/evidence, requirement map dan task ledger.

- `docs/plans/admin-media-upload/repository-context.md`
- `docs/plans/admin-media-upload/implementation-plan.md`
- `docs/tasks/admin-media-upload.md`
- `docs/README.md`

- Context disimpan sebelum plan; user-approved limits tidak diubah.
- Scope/path/kontrak/status/state/error/desain/resume dan proof dipetakan; preserve worktree existing.
- Commit planning lokal setelah docs/format/whitespace; runtime/desain raster belum diklaim dibuat.

### Acceptance criteria

- [x] Context dan plan memiliki base SHA serta evidence yang dapat ditelusuri.
- [x] Seluruh task/dependency/AC konsisten; proposed additions dibedakan dari current API.
- [x] Hanya file planning/navigasi milik task committed; receipt SHA aktual dicatat sesudah commit.

### Validasi

bun run docs:check; installed Prettier; git diff --check; staged-only docs snapshot dan preservation hashes; hooks.

### Hasil dan bukti

Context disimpan sebelum plan pada snapshot di atas. Read-only Bun checks membuktikan 15 ID unik, dependencies plan/backlog identik dan DAG tanpa cycle. `bun run docs:check` lulus (55 Markdown / 466 local links), installed Prettier write/check lulus dan `git diff --check` lulus. Staged-only checkout melalui `checkDocumentation` lulus (48 Markdown / 447 links); hanya empat file planning/index masuk staging. Hash 22 file unrelated tetap sama; README lokal sebelum edit diverifikasi dan referensi desain lokal tidak ikut commit. Commit task berhasil dengan seluruh hook normal lulus. Runtime, migrasi dan desain belum dibuat.

### Commit task

- Pesan: `docs(web): plan admin media uploads (ADUP-001)`.
- SHA: `5a165fb7410d81e09af81f1761419ebf0369c564`.
- Hook/checks: docs (55 Markdown / 466 links), lint (1/1 cache), check-types (3/3 cache) dan Commitlint lulus pada commit aktual; tanpa bypass.
- Ledger: receipt ini dicatat sesudah commit task berhasil pada update dokumentasi berikutnya, bukan SHA self-referential.

### Blocker atau tindak lanjut

Tidak ada blocker planning tersisa. Scope plan dan empat mockup disetujui pengguna; visual gate ADUP-006 selesai. Hash proof ADUP-002 tetap diperlukan sebelum task identity/file worker.

## Task: ADUP-002 — Proof identitas file dan bounded hashing browser

- Status: Done
- Owner: pengembang/agent pelaksana task.
- Prioritas: 2, mengikuti dependencies.
- Referensi: ADUP-US01; [plan canonical](../plans/admin-media-upload/implementation-plan.md), [PRD](../product/prd.md).
- Diperbarui: 2026-10-05.
- Dependensi: ADUP-001.
- Ukuran: satu spike dengan hasil keputusan hashing terukur.

### Ruang lingkup

Pilihan hashing mampu memeriksa seluruh byte tanpa buffer file penuh.

Target/symbol: Incremental SHA-256 proof, browser worker cancellation.

- `apps/web/test/admin-media-fingerprint-proof.mjs`
- `apps/web/test/admin-media-fingerprint.test.ts`
- `docs/plans/admin-media-upload/implementation-plan.md`

- Buktikan digest terhadap Bun createHash, empty/boundary/multi-chunk dan same-name/same-size bytes berbeda.
- Uji file mendekati 1.500.000.000 byte, responsive/cancel/progress serta peak memory terukur; chunk target 4 MiB.
- Pilih library incremental browser terawat hanya jika native bounded API tidak memenuhi; jangan tulis algoritma crypto sendiri. Catat license/bundle/version/dependency dan fallback.

### Acceptance criteria

- [x] Digest sama dengan oracle dan berbeda untuk isi berbeda yang metadata filenya sama.
- [x] Hash bisa dihentikan saat auth loss/unmount dan tidak mengirim stale result.
- [x] Memory bounded pada chunks, bukan O(file size); pilihan algoritma/dependency dan batas platform dicatat.

### Validasi

Native digest oracle + browser host proof pada ukuran kecil dan near-limit; record time/memory tanpa menyimpulkan kapasitas perangkat fisik.

### Hasil dan bukti

Native oracle: `bun test apps/web/test/admin-media-fingerprint.test.ts` lulus 9 test/16 assertions. Browser: `bun apps/web/test/admin-media-fingerprint-proof.mjs` memakai adapter `AUTH_BROWSER_NODE`, `AUTH_PLAYWRIGHT_MODULE`, `AUTH_BROWSER_EXECUTABLE` host; File disk 1500000000 byte, 358 progress events, digest sama dengan Bun createHash, 3267 heartbeat ticks, 0 late cancellation callbacks; 66021 ms. CDP sampling tiap100ms: heap peak1162112 byte, backing storage peak197139258 byte (termasuk buffer); combined konservatif189,1 MiB, di bawah threshold256 MiB. Chunk read maksimum4194304 byte; GC dapat menahan lebih dari satu buffer, tanpa full-file buffer. Worker proof minified6362 byte. Bukan total RSS/benchmark perangkat fisik atau VPS.

Native Web Crypto tidak incremental; exact noble-hashes2.4.0 MIT dipilih. Target diperluas dengan core production bersama, manifest dan lock; lihat keputusan pada plan. `bun install --frozen-lockfile`, `bun run check-types` (3/3), `bun run lint` (1/1), `bun run build` (2/2) lulus. Dokumentasi/format/diff dan hooks diperiksa saat task commit.

### Commit task

- Pesan yang direncanakan: `test(web): prove bounded file hashing (ADUP-002)`.
- SHA: `689e7e60dd3aff4173a88591c18220029103cc67`; lock correction `3d7118b` tanpa memperbarui paket lain.
- Hook/checks: docs/lint/types/Commitlint lulus; tidak ada hook dilewati. Frozen install dan root gates diulang setelah lock correction, seluruhnya lulus.
- Ledger: catat SHA aktual setelah commit berhasil pada update dokumentasi berikutnya; jangan menulis SHA self-referential.

### Blocker atau tindak lanjut

ADUP-001 dan proof bounded hashing selesai. Library/core yang sama digunakan ADUP-008; fallback seluruh buffer tidak tersedia.

## Task: ADUP-003 — API private owner media inventory dan rediscovery

- Status: Done
- Owner: pengembang/agent pelaksana task.
- Prioritas: 3, mengikuti dependencies.
- Referensi: ADUP-US02; [plan canonical](../plans/admin-media-upload/implementation-plan.md), [PRD](../product/prd.md).
- Diperbarui: 2026-10-05.
- Dependensi: ADUP-001.
- Ukuran: satu hasil konkret; pecah menjadi task turunan ber-ID jika scope bertambah.

### Ruang lingkup

Detail konten dapat menemukan current assets dan upload aktif tanpa browser persistence.

Target/symbol: GET /admin/media/owners/:ownerType/:ownerId; ownerMedia DTO/service/store query.

- `apps/api/src/modules/media/index.ts`
- `apps/api/src/modules/media/model.ts`
- `apps/api/src/modules/media/service.ts`
- `apps/api/src/modules/media/repository.ts`
- `apps/api/src/modules/media/index.test.ts`
- `apps/api/test/integration/media-upload-proof.test.ts`
- `docs/architecture/media-upload-contract.md`
- `apps/api/src/modules/catalog/repository.ts`
- `apps/api/src/modules/playback/service.ts`
- `apps/api/src/shared/media-readiness.ts`

- Whitelisted ownerType video/series; Series hanya poster. Resource/access/actor/profile dipastikan server; requireAdmin/private no-store.
- Snapshot DB terpisah untuk current asset berdasarkan owner pointer, active session dan last attempt; order createdAt/id stabil, tidak ada mutation/expiry side effect di GET.
- Whitelist filename/MIME/size/session ID/status/expiry/readiness/version/capabilities. Tidak expose credentials, S3 uploadId/private object keys/URL/claim tokens. Bagian processing tetap terpisah.
- Discovery bersumber DB; ListParts hanya endpoint session pending yang sedang dipantau, bukan seluruh history.
- canPreview dari readiness query existing CatalogStore.preview + unsigned profile/output/duration checks; extract helper hanya jika kedua backend consumers memerlukan, tanpa duplicate policy/presign inventory. Playback HTTP/regression wajib tetap lulus.

### Acceptance criteria

- [x] Refresh menemukan session dan current source/poster yang benar, termasuk replacement gagal.
- [x] Anon/non-admin/other actor/malformed owner tidak memperoleh private descriptor.
- [x] DTO aman dan typed; old cursor/metadata/control APIs tetap kompatibel.

### Validasi

HTTP app.handle guards/invalid DTO; real dedicated PG no-media/current+replacement/failed attempt/read-only/race/actor/profile; Eden compile-only; root gates.

### Hasil dan bukti

API inventory ditambahkan, safe DTO whitelist, current pointer/active/last dipisahkan, descriptors actor-scoped, repeatable-read/read-only transaction, tanpa ListParts/presign/mutation pada GET. Current/read-only/expiry/profile config dan shared unsigned playback checks mengikuti source existing. Fingerprint masih null/canResume false sampai ADUP-004/005.

`bun test apps/api/src/modules/media apps/api/src/modules/playback`: 14 pass/70 assertions. Dedicated `MEDIA_TEST_DATABASE_URL` proof: `bun test apps/api/test/integration/media-upload-proof.test.ts` 6 pass/69 assertions, termasuk failed replacement, actor isolation, read-only/resource/profile, ready provenance/original retention, snapshot consistency dan existing races. Root check-types/lint/build, docs/format/diff/staged-doc/preservation diperiksa saat penutupan; hasil akhir dicatat pada execution log.

### Commit task

- Pesan yang direncanakan: `feat(api): adup-003 add owner media inventory`.
- SHA: `6442e19c54a80831fa6afab856d5768dc25dba3d`.
- Hook/checks: docs, lint, check-types dan Commitlint lulus; tidak ada hook dilewati.
- Ledger: catat SHA aktual setelah commit berhasil pada update dokumentasi berikutnya; jangan menulis SHA self-referential.

### Blocker atau tindak lanjut

Tidak ada blocker. Discovery aman tersedia; identity/capability resume diikat pada task ADUP-004/005.

## Task: ADUP-004 — Schema additive expected file SHA-256

- Status: Done
- Owner: pengembang/agent pelaksana task.
- Prioritas: 4, mengikuti dependencies.
- Referensi: ADUP-US02; [plan canonical](../plans/admin-media-upload/implementation-plan.md), [PRD](../product/prd.md).
- Diperbarui: 2026-10-05.
- Dependensi: ADUP-002.
- Ukuran: satu hasil konkret; pecah menjadi task turunan ber-ID jika scope bertambah.

### Ruang lingkup

Session baru dapat menyimpan identitas file tanpa mengubah nilai legacy.

Target/symbol: uploadSessions.expectedSha256 nullable + check constraint; generated migration.

- `apps/api/src/db/schema/upload.ts`
- `apps/api/drizzle/<generated-next-migration>.sql`
- `apps/api/drizzle/meta/<generated-migration-metadata>`
- `apps/api/test/integration/media-upload-proof.test.ts`
- `docs/architecture/media-upload-contract.md`

- Tambah expected_sha256 nullable, check lowercase 64 hex atau null; migration additive, tanpa backfill identitas palsu.
- Jangan overwrite journal/migration existing; nama/nomor mengikuti schema HEAD saat implementasi.
- Backup development sesuai runbook, apply db:migrate via command resmi dan periksa journal/data existing; destructive tests hanya dedicated DB.

### Acceptance criteria

- [x] Legacy sessions/assets/auth data tetap utuh dan existing API tetap berjalan.
- [x] Digest invalid ditolak, null legacy valid; migration rerun tidak mengubah data.
- [x] Development journal/schema terbukti; production migration tetap rollout terpisah.

### Validasi

Dedicated migration constraints/preservation/legacy null/new hash; generate/review migration, local dev apply/preservation; API test/types/build.

### Hasil dan bukti

Generated/reviewed `0009_upload-fingerprint`: hanya nullable field + lowercase hex64/null check, tanpa backfill atau edit migration historis. Target proof diperluas ke dedicated `media-fingerprint-migration-proof.test.ts` dan existing publication test; publication prefix dipin0008 agar schema HEAD baru tidak merusak legacy fixture.

Dedicated suites dijalankan serial: fingerprint migration1 pass/14 assertions; upload6 pass/72; publication migration1 pass/10. Native media/playback14 pass/70. Lazy Bun SQL assertions diperbaiki dengan Promise.resolve setelah timeout awal; rerun serial seluruhnya lulus. Root check-types3/3, lint1/1, build2/2 lulus.

Development backup custom-format pg_dump PostgreSQL18 (61216 byte) divalidasi pg_restore list; ignored directory0700/file0600. Command resmi `bun run --cwd apps/api db:migrate` lulus, journal9→10, nullable column terverifikasi. Snapshot17 tabel existing utuh (auth user1/account1/session2, rate_limit1, video1; lainnya kosong). Full restore/production migration tidak diklaim. Docs/Prettier/diff/staged-doc/preservation dan hooks diperiksa saat commit.

### Commit task

- Pesan yang direncanakan: `feat(api): adup-004 bind expected upload checksum`.
- SHA: `1f2bc9f32710fd70b3120b7cb1adc5217b271d52`.
- Hook/checks: docs, lint, check-types dan Commitlint lulus; tidak ada hook dilewati.
- Ledger: catat SHA aktual setelah commit berhasil pada update dokumentasi berikutnya; jangan menulis SHA self-referential.

### Blocker atau tindak lanjut

ADUP-004 selesai; expected fingerprint dapat diikat API/worker pada ADUP-005. Production rollout dan full restore tetap terpisah.

## Task: ADUP-005 — Bind fingerprint pada initiate dan verification worker

- Status: Done
- Owner: pengembang/agent pelaksana task.
- Prioritas: 5, mengikuti dependencies.
- Referensi: ADUP-US02; [plan canonical](../plans/admin-media-upload/implementation-plan.md), [PRD](../product/prd.md).
- Diperbarui: 2026-10-05.
- Dependensi: ADUP-003, ADUP-004.
- Ukuran: satu hasil konkret; pecah menjadi task turunan ber-ID jika scope bertambah.

### Ruang lingkup

Reselection/multipart campuran tidak dapat menjadi hasil verified-ready.

Target/symbol: InitiateUploadBody.expectedSha256; requestHash compatibility; worker digest comparison; resume capability.

- `apps/api/src/modules/media/model.ts`
- `apps/api/src/modules/media/service.ts`
- `apps/api/src/modules/media/repository.ts`
- `apps/api/src/workers/runner.ts`
- `apps/api/src/modules/media/index.test.ts`
- `apps/api/test/integration/media-worker-proof.test.ts`
- `docs/architecture/media-upload-contract.md`

- Field expectedSha256 optional/additive; uploader baru wajib mengirim. Immutable per session, masuk canonical requestHash jika diberikan; hash payload legacy tanpa field tetap identik algoritma lama.
- Owner discovery memuat fingerprint/capability server. Legacy active tanpa fingerprint tidak resumable lintas reload: tampilkan cancel/restart; jangan menebak identitas dari nama/size/ETag.
- Worker membandingkan SHA-256 streaming yang sudah dihitung dengan expected hash sebelum probe/transcode. Mismatch terminal stable code, tidak ready/HLS aktif; old completed sessions tanpa hash tetap diproses sesuai behavior legacy.

### Acceptance criteria

- [x] Metadata identik dengan fingerprint berbeda menghasilkan idempotency conflict, bukan session tercampur.
- [x] Session dengan fingerprint valid mempunyai capability resume; manipulasi byte ditolak worker sebelum decode. Guard file UI diverifikasi pada ADUP-008/011 sesuai dependency DAG.
- [x] Tidak ada breaking change pada legacy clients, queue retry atau valid assets lama.

### Validasi

Native HTTP request hash replay/conflict/legacy; dedicated PG immutable identity; worker mismatch/matching/legacy/no ready outputs; root gates.

### Hasil dan bukti

Optional lowercase hex64 fingerprint diterima pada initiate, immutable pada replay dan masuk canonical request hash hanya jika diberikan. Legacy metadata array/hash tetap identik. Discovery actor-scoped membawa expected hash serta canResume hanya draft/pending/unexpired/bound. Worker membandingkan streaming digest sebelum probe/transcode; mismatch terminal `MEDIA_SOURCE_CHANGED`, tanpa ready pointer/facts/output.

Native media/playback14 pass/74 assertions; dedicated PG7 pass/82 (replay same key/hash, different hash/absent hash conflicts, legacy canonical hash, canResume/expiry). MinIO→worker/HLS/publication/playback/recovery proof1 pass/63, mencakup matching digest, legacy source/poster, mismatched bytes terminal sebelum binary probe (missing test binary tidak pernah dijalankan), no output/ready asset. Root check-types3/3, lint1/1, build2/2 lulus, Eden compile optional hash lulus.

Credentials aplikasi terbukti scoped pada bucket sehingga CreateBucket test awal403; isolated fixture memakai credentials admin lokal dari konfigurasi container melalui process memory, tanpa log/file/env sample secret atau perubahan bucket aplikasi. Scope test tetap dedicated DB/bucket unik, cleanup fixture selesai.

AC backend diperjelas sesuai dependency DAG: actual UI wrong-file-before-PUT guard berada pada ADUP-008/011, tidak diklaim sudah ada pada ADUP-005. Task target diperluas ke existing upload integration proof/Eden type proof untuk compatibility evidence. Docs/format/diff/staged-doc/preservation dan hooks diperiksa saat commit.

### Commit task

- Pesan yang direncanakan: `feat(api): adup-005 verify upload file identity`.
- SHA: `4e87c24206c5dd6ae19a0fbed7035728a4d94490`.
- Hook/checks: docs, lint, check-types dan Commitlint lulus; tidak ada hook dilewati.
- Ledger: catat SHA aktual setelah commit berhasil pada update dokumentasi berikutnya; jangan menulis SHA self-referential.

### Blocker atau tindak lanjut

Backend identity selesai. Reselection client guard, upload transport/UI dan browser acceptance mengikuti ADUP-007–015; R2 staging/production tetap terpisah.

## Task: ADUP-006 — Desain panel Upload Media desktop/mobile light/dark

- Status: Done
- Owner: pengembang/agent pelaksana task.
- Prioritas: 6, mengikuti dependencies.
- Referensi: ADUP-US01; [plan canonical](../plans/admin-media-upload/implementation-plan.md), [PRD](../product/prd.md).
- Diperbarui: 2026-10-05.
- Dependensi: ADUP-001.
- Ukuran: satu task desain dengan empat layout acuan.

### Ruang lingkup

Empat layout visual acuan dan state map siap ditinjau sebelum UI runtime.

Target/symbol: Shared media card, file selection/status/progress/recovery/confirmation states.

- `docs/design/admin-media-upload.md`
- `docs/design/admin-media-upload-<viewport>-<theme>.png`
- `docs/README.md`

- Reuse approved AdminShell/avatar/Appearance/sidebar/drawer, English copy, Base UI Rhea/semantic tokens; Film/Standalone dua cards, Series hanya poster.
- Empat layout acuan desktop light/dark dan mobile light/dark, plus empty/hash/upload/pause/reselect/finalizing/processing/ready/error/read-only states sebagai specification.
- Confirm cancel/replacement/leave upload; gutter/dialog 320 px, 44 px controls, keyboard labels/live region tidak terlalu sering, motion respect; user review sebelum menutup visual acceptance.

### Acceptance criteria

- [x] Layout dan resource conditional konsisten dengan detail halaman existing; tidak ada halaman upload baru.
- [x] Tidak menjanjikan publish/transcode percent/manual reprocess yang belum tersedia.
- [x] Prompts/status/review/batas raster tercatat; scope dan hasil visual disetujui pengguna.
- [x] Pengguna menyetujui empat mockup baru untuk menutup visual acceptance ADUP-006.

### Validasi

Visual inspection/prompts/PNG/path tracking + docs/Prettier; raster bukan proof browser/contrast/touch behavior.

### Hasil dan bukti

Pada 2026-10-05 pengguna menyetujui plan dan meminta mockup. [Empat final dan prompt set](../design/admin-media-upload.md) dibuat dengan built-in image_gen: dua desktop1070×1470, dua mobile793×1983; lima calls termasuk correction Edit metadata. Final diinspeksi: English/shell/theme/avatar/logout, role/progress/cancel/choose/readiness sesuai scope, tanpa source player atau publish/transcode persen. Header PNG dan ukuran pasangan valid. State/Series/Standalone/modal variants berupa specification; tidak diklaim seluruhnya tampil di raster. Pengguna kemudian memberikan “oke approve” pada 2026-10-05; keempat raster disetujui dan visual acceptance ADUP-006 selesai. Runtime tidak berubah.

Actual checks: `bun run docs:check` lulus (56 Markdown / 481 local links), installed Prettier write/check untuk empat Markdown task lulus, `git diff --check` dan `git diff --cached --check` lulus. Staged-only checkout dengan `checkDocumentation` lulus (49 Markdown / 462 links). Staging hanya delapan file task, termasuk empat PNG; 22 file unrelated tetap sama melalui SHA-256, referensi desain lokal pada README dipertahankan dan tidak ikut staged index. Commit artefak berhasil; seluruh hook normal lulus: docs (56 Markdown /481 links), lint (1/1 cache), check-types (3/3 cache) dan Commitlint, tanpa bypass. Tidak menjalankan runtime uploader test/build/migration yang belum ada. Follow-up receipt menyelaraskan permission empat PNG ke mode100644 tanpa mengubah byte gambar.

Approval closure checks (2026-10-05): docs56Markdown/481links, installed Prettier dan git diff checks lulus; staged snapshot49Markdown/462links tanpa error, empat file status/index saja. Hash22file unrelated tetap sama. Hook approval commit normal lulus: docs, lint1/1cache, types3/3cache dan Commitlint; tanpa bypass. Tidak ada perubahan raster, runtime, migration atau remote delivery.

### Commit task

- Pesan: `docs(web): add media upload mockups (ADUP-006)`.
- SHA: `f93e9af81c18107f1d70e7c645a2ef496f26db05`.
- Hook/checks: docs, lint, check-types dan Commitlint lulus; PNG content/dimensions, staged docs dan preservation lulus.
- Ledger: receipt artefak dicatat sesudah commit, bukan SHA self-referential. Approval pengguna dicatat pada commit `f80998cd18fafaf12de5cc4a18e2c53563a9f872` (`docs(web): approve media upload designs (ADUP-006)`); task Done. Approval receipt ini dicatat sesudah commit aktual tersedia.

### Blocker atau tindak lanjut

Tidak ada blocker desain tersisa. ADUP-001 dan visual acceptance ADUP-006 selesai. ADUP-012 mengikuti dependencies implementasi lainnya; proof hashing ADUP-002 adalah task berikutnya. Mockup bukan evidence browser.

## Task: ADUP-007 — Typed media client, Query dan error mapping DRY

- Status: Done
- Owner: pengembang/agent pelaksana task.
- Prioritas: 7, mengikuti dependencies.
- Referensi: ADUP-US01; [plan canonical](../plans/admin-media-upload/implementation-plan.md), [PRD](../product/prd.md).
- Diperbarui: 2026-10-05.
- Dependensi: ADUP-003, ADUP-005.
- Ukuran: satu hasil konkret; pecah menjadi task turunan ber-ID jika scope bertambah.

### Ruang lingkup

Semua JSON controls/read memakai Eden type-only dan private Query conventions.

Target/symbol: MediaClient; admin identity owner/session keys; shared private response unwrap.

- `apps/web/src/lib/admin/media-client.ts`
- `apps/web/src/lib/admin/media-queries.ts`
- `apps/web/src/lib/admin/media-errors.ts`
- `apps/web/src/lib/admin/content-client.ts`
- `apps/web/src/lib/api/private-result.ts`
- `apps/web/test/media-eden-contract.ts`
- `apps/web/test/admin-media-client.test.ts`

- Derive DTO/input types dari api/types; createPrivateApiClient tetap authoritative. Extract shared response/error helper hanya saat kedua client membutuhkannya, preserve content tests.
- Identity-scoped admin keys; reads AbortSignal/no-store; mutations retry:false. Signed URLs hanya short-lived transport memory, bukan persisted Query mutation payload/devtools/log.
- Whitelist safe stable error codes, unknown state/response safe; 5xx recheck tidak membuang valid File/form; S3 transport error tidak memakai auth fetcher.

### Acceptance criteria

- [x] No server imports/secrets masuk bundle, control error bukan cached success.
- [x] Logout/expiry membersihkan media query/mutations; public cache tetap utuh.
- [x] Query invalidate owner/content detail/list sesudah confirmed complete tanpa mengganti dirty edit baseline.

### Validasi

Bun native client/cache/gateway/auth regression + compile-only Eden mismatches; types/lint/build.

### Hasil dan bukti

Typed media client/input/DTO derived from Eden API contract, private authoritative fetcher reused. Shared `private-result.ts` centralizes abort/network/domain handling; ContentApiError compatibility preserved. Identity-scoped owner/session queries support AbortSignal, no-store, retry:false; initiate/complete/abort mutation factories retry:false. Signed authorization is direct Eden and never inserted into Query/mutation cache. Stable safe error whitelist hides raw provider/auth messages; malformed response/owner identity cannot become confirmed success.

Native client/cache/gateway/guard regression `bun test apps/web/test/admin-media-client.test.ts apps/web/test/admin-content-client.test.ts apps/web/test/session-cache.test.ts apps/web/test/business-gateway.test.ts apps/web/test/admin-route-guard.test.ts`:31 pass/126 assertions. Explicit `bun run --cwd apps/web auth:import:proof` rejects server import in client build and restores fixture. Root check-types3/3, lint1/1, build2/2 lulus.

401/expiry cleanup removes media cache/mutations while public data survives. Confirmed-complete invalidation helper marks owner/content detail/list stale; existing edit baseline remains component-owned. Actual upload-manager auth stop and browser dirty-editor conflict are ADUP-014/015, not claimed here. Docs/format/diff/staged-doc/preservation and hooks checked at task commit.

### Commit task

- Pesan yang direncanakan: `feat(web): adup-007 add typed media controls`.
- SHA: `9f1ef9d436c2071ec047ab06917f39fefd4ae809`.
- Hook/checks: docs, lint, check-types dan Commitlint lulus; tidak ada hook dilewati.
- Ledger: catat SHA aktual setelah commit berhasil pada update dokumentasi berikutnya; jangan menulis SHA self-referential.

### Blocker atau tindak lanjut

API adapter/cache layer ready. File/Worker/XHR ownership remains in memory manager implemented on subsequent tasks; no browser uploader is claimed yet.

## Task: ADUP-008 — File selection, validation dan fingerprint worker

- Status: Done
- Owner: pengembang/agent pelaksana task.
- Prioritas: 8, mengikuti dependencies.
- Referensi: ADUP-US01; [plan canonical](../plans/admin-media-upload/implementation-plan.md), [PRD](../product/prd.md).
- Diperbarui: 2026-10-05.
- Dependensi: ADUP-002, ADUP-005, ADUP-007.
- Ukuran: satu hasil konkret; pecah menjadi task turunan ber-ID jika scope bertambah.

### Ruang lingkup

File valid dipilih sekali, dihash dan diikat pada attempt sebelum initiate.

Target/symbol: Allowed file descriptor, bounded SHA worker bridge, File ownership.

- `apps/web/src/lib/admin/media-file.ts`
- `apps/web/src/lib/admin/file-fingerprint.worker.ts`
- `apps/web/src/lib/admin/file-fingerprint.ts`
- `apps/web/test/admin-media-file.test.ts`
- `apps/web/package.json`
- `bun.lock`

- Limit Film/Standalone 1.500.000.000 byte, poster 5.000.000; ext/MIME allowlist sama backend. Browser MIME kosong boleh hint ext, MIME kontradiktif ditolak; worker authoritative codec/duration/ratio/animation.
- Chunked hashing via Worker; file/hash/start token memory-only; cancel/route change/auth loss revoke refs/object URLs and worker. Object URL hanya poster selection, bukan public/signed poster delivery.
- Reselection membandingkan seluruh digest dan size/descriptor terhadap server; mismatch minta file yang benar atau explicit abort/restart; jangan upload byte campuran.

### Acceptance criteria

- [x] Oversize/unsupported/zero file tidak membuat session; helper tidak mengklaim codec valid dari MIME.
- [x] Fingerprint match diperlukan sebelum resume dan hasil worker stale diabaikan.
- [x] Tidak membaca seluruh video ke satu buffer atau menyimpan File/signature ke storage persisten.

### Validasi

Native descriptor tests + browser hash/cancellation/MIME fallback/big file; conditional frozen install bila dependency hash dipilih; root gates.

### Hasil dan bukti

Worker browser produksi dan bridge pembatalan/resume diimplementasikan. `bun test apps/web/test/admin-media-file.test.ts apps/web/test/admin-media-fingerprint.test.ts`: 13 pass/41 assertions. Chromium actual File 1.500.000.000 bytes: SHA-256 cocok oracle, 358 progress events, 67.635 ms, 3.381 heartbeat, zero late callbacks; combined worker heap/backing peak 202.435.107 bytes (<256 MiB). Lima small-file oracles, wrong same-size/name file rejection, MIME fallback dan cancellation lulus. Root check-types (3/3), lint (1/1), build (2/2) lulus. Target expansion: shared typed test fixture dan worker/browser proof updated untuk produksi, safe file codes. R2/Safari belum dibuktikan; multipart/browser end-to-end mengikuti task berikutnya.

### Commit task

- Pesan yang direncanakan: `feat(web): adup-008 validate selected upload files`.
- SHA: `d4afadb0ea7bd72cf74dc2fc0ee0a97aebcf622e`.
- Hook/checks: docs, lint, check-types dan Commitlint lulus; tidak ada hook dilewati.
- Ledger: catat SHA aktual setelah commit berhasil pada update dokumentasi berikutnya; jangan menulis SHA self-referential.

### Blocker atau tindak lanjut

Tidak ada blocker pada scope file checking. Uploader runtime mengikuti ADUP-009–015.

## Task: ADUP-009 — Direct PUT transport dengan progress dan abort

- Status: Done
- Owner: pengembang/agent pelaksana task.
- Prioritas: 9, mengikuti dependencies.
- Referensi: ADUP-US01; [plan canonical](../plans/admin-media-upload/implementation-plan.md), [PRD](../product/prd.md).
- Diperbarui: 2026-10-05.
- Dependensi: ADUP-007.
- Ukuran: satu hasil konkret; pecah menjadi task turunan ber-ID jika scope bertambah.

### Ruang lingkup

Blob.slice part dikirim ke signed storage URL dengan byte progress nyata.

Target/symbol: Injected XHR PUT transport / browser adapter.

- `apps/web/src/lib/admin/upload-transport.ts`
- `apps/web/test/admin-upload-transport.test.ts`
- `apps/web/test/admin-media-upload-browser-worker.mjs`

- XHR native dipilih untuk upload progress/cancel; request tanpa cookie/auth aplikasi, withCredentials:false, header hanya kebutuhan signed contract. Tidak proxy file ke API.
- Progress dari loaded bytes dibatasi panjang Blob; sukses hanya HTTP 2xx, aman jika ETag unavailable: reconcile ListParts, jangan klaim 0/opaque response sukses.
- Timeout/error/abort bentuk safe codes tanpa raw URL/XML/credential; abort listeners cleanup, no late callback atau reload replay otomatis.

### Acceptance criteria

- [x] Gateway menerima JSON saja; storage mendapatkan range byte part yang tepat.
- [x] Abort menghentikan request aktif; callbacks setelah dispose tidak mengubah state.
- [x] CORS/network/signature failures aman dan tidak logout pengguna melalui auth handler.

### Validasi

Injected transport meaningful callbacks/cancel/status + real browser direct MinIO PUT/CORS/ETag; existing storage proof tetap valid.

### Hasil dan bukti

XHR direct PUT diimplementasikan tanpa cookie/Authorization aplikasi; exact Blob.slice, abort cleanup, safe CORS/signature/timeout codes dan no late progress. `bun test apps/web/test/admin-upload-transport.test.ts`: 3 pass/19 assertions. Dedicated private MinIO/Chromium proof: 1 pass/8 assertions; dua part 5 MiB dan 1 KiB, real progress, ListParts/ETag, downloaded byte integrity dan storage signature 403 aman tanpa app-auth logout. HTTP 2xx hanya transport result; ListParts pada scheduler berikutnya menjadi authority sebelum completion, termasuk ETag tidak terekspos. Root check-types 3/3, lint 1/1, build 2/2 lulus. Target expansion: apps/api/test/integration/media-transport-proof.test.ts menggunakan isolated bucket, cleanup, runner eval tanpa media/URL persistence. Browser panel dan R2 staging mengikuti acceptance lanjutan.

### Commit task

- Pesan yang direncanakan: `feat(web): adup-009 add direct multipart transport`.
- SHA: `8c5134f363e7a944c9309bbd711cf0168ffbfccc`.
- Hook/checks: docs, lint, check-types dan Commitlint lulus; tidak ada hook dilewati.
- Ledger: catat SHA aktual setelah commit berhasil pada update dokumentasi berikutnya; jangan menulis SHA self-referential.

### Blocker atau tindak lanjut

Tidak ada blocker transport lokal; scheduler/recovery/UI mengikuti ADUP-010–015.

## Task: ADUP-010 — Scheduler multipart, retry dan aggregate progress

- Status: Done
- Owner: pengembang/agent pelaksana task.
- Prioritas: 10, mengikuti dependencies.
- Referensi: ADUP-US01; [plan canonical](../plans/admin-media-upload/implementation-plan.md), [PRD](../product/prd.md).
- Diperbarui: 2026-10-05.
- Dependensi: ADUP-008, ADUP-009.
- Ukuran: satu hasil konkret; pecah menjadi task turunan ber-ID jika scope bertambah.

### Ruang lingkup

Part sukses tidak diulang dan concurrency/memory terkendali.

Target/symbol: Per-session scheduler, global manager transport cap, reconcile/retry map.

- `apps/web/src/lib/admin/upload-scheduler.ts`
- `apps/web/src/lib/admin/upload-progress.ts`
- `apps/web/test/admin-upload-scheduler.test.ts`

- Geometry/expiry/partConcurrency hanya DTO server; gunakan Number conversion setelah range/safe integer checked. Satu file aktif per tab; queue source/poster, maksimal min(server concurrency,3) PUT total tab.
- Target server 2%/minimum 5 MiB kecuali last; Blob.slice dari geometry. GET status/ListParts authoritative pada awal/resume/uncertain PUT; matching completed part skip.
- Proposed retry total 3 attempts/part dengan backoff 1s/2s+jitter dan bounded renewal; stop saat auth/owner/expiry/fatal error; offline pause tanpa busy loop.
- Progress sent=verified bytes + bounded in-flight unique part bytes, reset failed attempt bytes; tampilkan verified terpisah dan finalize setelah all parts reconciled. Jangan count duplicate/retry dua kali.

### Acceptance criteria

- [x] Tidak lebih dari cap PUT aktif atau alokasi seluruh file; verified progress tepat dengan retries.
- [x] Unknown PUT outcome direconcile, bukan replay sukses secara buta.
- [x] 100% sent menampilkan finalizing; Upload completed hanya dari confirmed DTO.

### Validasi

Native scheduler injected clock/I/O (small last part, 1 part poster, concurrency, race, retry, offline, expiry) + browser MinIO partial upload.

### Hasil dan bukti

Scheduler server geometry, concurrency min(cap,3), bounded retries/backoff dan ListParts reconciliation diimplementasikan; sent vs verified tidak menggandakan retry. Native scheduler 4 pass/18 assertions (small last part, resume, cap, unknown PUT success, retries, malformed parts, expiry, pause). Dedicated Chromium/MinIO transport+production scheduler 2 pass/17 assertions: pre-stored 5 MiB part dilewati, hanya 1 KiB tersisa dikirim, completed object byte integrity lulus. Root check-types 3/3, lint 1/1, build 2/2 lulus. API integration fixture diperluas untuk bundle scheduler dan fresh storage ListParts; signed URLs hanya live transport input. Satu-file coordinator menjadi scope ADUP-011, panel/auth acceptance ADUP-012–015.

### Commit task

- Pesan yang direncanakan: `feat(web): adup-010 schedule multipart uploads`.
- SHA: `7ddd4e900f15634782d35ebe3528d1e814b56e06`.
- Hook/checks: docs, lint, check-types dan Commitlint lulus; tidak ada hook dilewati.
- Ledger: catat SHA aktual setelah commit berhasil pada update dokumentasi berikutnya; jangan menulis SHA self-referential.

### Blocker atau tindak lanjut

Tidak ada blocker scheduler lokal; controller dan UI mengikuti backlog.

## Task: ADUP-011 — Resume, pause, finalization dan cancel recovery

- Status: Done
- Owner: pengembang/agent pelaksana task.
- Prioritas: 11, mengikuti dependencies.
- Referensi: ADUP-US02; [plan canonical](../plans/admin-media-upload/implementation-plan.md), [PRD](../product/prd.md).
- Diperbarui: 2026-10-05.
- Dependensi: ADUP-003, ADUP-005, ADUP-010.
- Ukuran: satu hasil konkret; pecah menjadi task turunan ber-ID jika scope bertambah.

### Ruang lingkup

Pause/reload/race/network failure punya recovery tanpa session duplikat.

Target/symbol: Owner/kind attempt state machine; control operation reconciliation.

- `apps/web/src/lib/admin/upload-manager.ts`
- `apps/web/src/lib/admin/upload-state.ts`
- `apps/web/test/admin-upload-recovery.test.ts`

- Idempotency key UUID satu untuk satu descriptor attempt; ambiguous initiate reconcile owner inventory lalu retry request sama, tidak UUID baru. Completed/same-key replay mengembalikan result yang sama.
- Pause lokal stop new/active PUT; server session tetap pending sampai abort/24h expiry. Refresh discover owner, pilih ulang file dan full hash match; pre-fingerprint legacy session explicit abort/restart.
- Complete/abort retry:false via Query; ambiguous outcomes GET status dan owner snapshot. Complete 409/claim belum selesai tampilkan finishing/check status, explicit retry same session mengikuti server claim. Abort vs complete race tidak mengklaim cancelled jika complete menang.
- Best-effort cross-tab coordination memakai browser lock bila tersedia; fallback conflict/reconcile server, tidak menjanjikan exactly-once atau perlindungan lock client.

### Acceptance criteria

- [x] Tidak ada completion/session ganda atau mixed source; zero byte/data corruption setelah resume terbukti.
- [x] User tidak kehilangan hasil completed hanya karena response timeout/abort race.
- [x] Stopped/expired/unknown states tidak menerbitkan PUT; server state/readiness tetap authority.

### Validasi

State machine/HTTP ambiguity/native race tests + reload/offline/tab conflict/different same-size file/expiry/cancel-vs-complete browser proof.

### Hasil dan bukti

In-memory owner/kind state machine, one-file coordinator, optional browser lock, immutable initiation key, full-hash resume, pause, finalization/cancel reconciliation dan resource cleanup diimplementasikan. Native recovery 5 pass/24 assertions: same-key unknown initiation, same-name/size wrong file blocked before PUT, lost completion retained, complete-vs-abort win, unconfirmed abort remains unknown, coordinator queue and late reply suppression. Reused native scheduler and real Chromium/MinIO partial-resume proof from ADUP-010. Root check-types 3/3, lint 1/1, build 2/2 lulus. UI reload/offline/cross-tab acceptance dilakukan pada ADUP-015; native proof tidak diklaim sebagai browser UI coverage. Preview object URLs hanya memory dan direvoke saat clear/cancel/completion/dispose; no persistence.

### Commit task

- Pesan yang direncanakan: `feat(web): adup-011 recover upload sessions`.
- SHA: `6d09513634406a01c0c278c4da1c5216074a43a4`.
- Hook/checks: docs, lint, check-types dan Commitlint lulus; tidak ada hook dilewati.
- Ledger: catat SHA aktual setelah commit berhasil pada update dokumentasi berikutnya; jangan menulis SHA self-referential.

### Blocker atau tindak lanjut

Tidak ada blocker controller; browser UI/auth/reload acceptance tetap milik ADUP-012–015.

## Task: ADUP-012 — Shared Upload Media panel pada detail draft

- Status: Done
- Owner: pengembang/agent pelaksana task.
- Prioritas: 12, mengikuti dependencies.
- Referensi: ADUP-US01; [plan canonical](../plans/admin-media-upload/implementation-plan.md), [PRD](../product/prd.md).
- Diperbarui: 2026-10-05.
- Dependensi: ADUP-006, ADUP-007, ADUP-008, ADUP-010, ADUP-011.
- Ukuran: satu hasil konkret; pecah menjadi task turunan ber-ID jika scope bertambah.

### Ruang lingkup

Admin bisa upload source/poster dari existing content detail tanpa menggandakan komponen.

Target/symbol: OwnerMediaPanel, generic role card, media dialog.

- `apps/web/src/components/admin/media-panel.tsx`
- `apps/web/src/components/admin/media-upload-card.tsx`
- `apps/web/src/components/admin/media-confirm-dialog.tsx`
- `apps/web/src/components/admin/content-detail.tsx`
- `apps/web/src/components/ui/progress.tsx`

- Film/Standalone dua role cards, Series poster saja; source tidak ditawarkan untuk series/episode navigation yang belum ada. Read-only published/archived/current-state gate dari server.
- File chooser native/drag-drop optional dengan keyboard equivalent, live progress throttled dan visible sent vs verified; actions sesuai state: Choose/Upload/Pause/Resume/Cancel/Check status.
- New Progress primitive via configured @shadcn dry-run/diff only; reuse Field/Alert/Card/AlertDialog/Empty/Skeleton + theme; resource model DRY. Tidak menambah routeTree changes jika hanya panel existing.

### Acceptance criteria

- [x] Tidak ada route baru wajib atau upload di create form sebelum owner tersimpan.
- [x] Video/poster independent namun tab transport tetap capped; changing theme tidak kehilangan attempt.
- [x] Control/error UX sesuai API state, tanpa publish/crop/quality selector atau storage credentials.

### Validasi

Browser three kinds/read-only/loading/empty/errors + desktop/mobile light/dark widths/keyboard/labels/contrast; root gates.

### Hasil dan bukti

Shared Upload Media panel below metadata diimplementasikan pada existing detail routes; Film/Standalone source+cover, Series cover-only, server read-only, keyboard chooser/actions, labelled Progress sent/verified, replacement/cancel dialog, selected cover preview dan independent role states. @shadcn/progress dry-run/view/install menggunakan existing Base UI/cn; manifest/lock tidak berubah dan frozen install lulus. Built Bun/Nitro Chromium layout: tiga kinds, draft/published/archived, 45 Light/Dark/System viewport combinations 320/390/768/1024/1440, zero horizontal overflow. Native hidden file input memperbaiki Field sr-only width interaction. Root check-types 3/3, lint 1/1, build 2/2 lulus. Manager progress notifications bounded 200 ms dan verified final update; native recovery tetap 5/24 pass. Full media/auth browser acceptance milik ADUP-015; worker truth codec/duration/dimensions tetap authoritative. Target expansion use-upload-manager.ts untuk signal-aware Query mutations tanpa File/URLs dalam cache.

### Commit task

- Pesan yang direncanakan: `feat(web): adup-012 render media upload panel`.
- SHA: belum dibuat.
- Hook/checks: belum dijalankan untuk task ini.
- Ledger: catat SHA aktual setelah commit berhasil pada update dokumentasi berikutnya; jangan menulis SHA self-referential.

### Blocker atau tindak lanjut

Tidak ada blocker layout/panel; readiness dan auth closure mengikuti ADUP-013–015.

## Task: ADUP-013 — Status pemrosesan dasar dan readiness owner

- Status: Backlog
- Owner: pengembang/agent pelaksana task.
- Prioritas: 13, mengikuti dependencies.
- Referensi: ADUP-US03; [plan canonical](../plans/admin-media-upload/implementation-plan.md), [PRD](../product/prd.md).
- Diperbarui: 2026-10-05.
- Dependensi: ADUP-003, ADUP-005, ADUP-007, ADUP-012.
- Ukuran: satu hasil konkret; pecah menjadi task turunan ber-ID jika scope bertambah.

### Ruang lingkup

Upload completed tidak salah dilabel siap atau published.

Target/symbol: Separate upload/asset/job badges, polling and preview capability.

- `apps/web/src/components/admin/media-processing-status.tsx`
- `apps/web/src/lib/admin/media-state.ts`
- `apps/web/src/lib/admin/media-queries.ts`
- `apps/web/src/components/admin/content-detail.tsx`
- `apps/web/test/admin-media-state.test.ts`

- Poll session/owner hanya saat upload/job nonterminal (usulan 5 detik, pause hidden/offline); completed upload dengan job aktif tetap poll, terminal fail/ready stop dan focus/manual read tersedia.
- Map uploading/uploaded/processing/ready/failed + job queued/running/retry/succeeded/failed/cancelled secara terpisah, unknown neutral. progressSeconds sebagai waktu media diproses/indeterminate, bukan persen transcode tanpa denominator.
- Ready source tidak cukup preview: owner current source dan poster verified-ready, deleted original/tombstone tidak mematikan HLS valid. Server preview capability harus authority; link existing /admin/videos/:id/preview.
- Series hanya poster processed/readiness; tanpa video/HLS/self-preview. Terminal failure menyarankan upload baru pada draft, tidak menawarkan endpoint manual reprocess yang tidak ada.

### Acceptance criteria

- [ ] Tidak menampilkan Ready/Preview ketika hanya upload selesai atau satu role ready.
- [ ] Tidak ada polling loop terminal/background/offline atau presign logging/persistence.
- [ ] Existing player/watch/preview source tetap tidak diubah; preview readiness gating sesuai server.

### Validasi

Native state/polling tests + real MinIO/worker browser both roles completion/fail/ready, refresh, old current vs failed replacement; root gates.

### Hasil dan bukti

Belum diimplementasikan atau diverifikasi. Perintah di bagian validasi merupakan rencana, bukan hasil test yang telah dijalankan. Isi evidence aktual dan batas proof saat task dikerjakan.

### Commit task

- Pesan yang direncanakan: `feat(web): adup-013 show media processing state`.
- SHA: belum dibuat.
- Hook/checks: belum dijalankan untuk task ini.
- Ledger: catat SHA aktual setelah commit berhasil pada update dokumentasi berikutnya; jangan menulis SHA self-referential.

### Blocker atau tindak lanjut

Dependencies ADUP-003, ADUP-005, ADUP-007, ADUP-012 (scope plan telah disetujui pengguna). Temuan proof baru diperbarui pada plan dan task terkait sebelum melanjutkan.

## Task: ADUP-014 — Auth cleanup dan navigasi upload aktif

- Status: Backlog
- Owner: pengembang/agent pelaksana task.
- Prioritas: 14, mengikuti dependencies.
- Referensi: ADUP-US04; [plan canonical](../plans/admin-media-upload/implementation-plan.md), [PRD](../product/prd.md).
- Diperbarui: 2026-10-05.
- Dependensi: ADUP-011, ADUP-012.
- Ukuran: satu hasil konkret; pecah menjadi task turunan ber-ID jika scope bertambah.

### Ruang lingkup

File/transport stop saat keluar owner atau kehilangan otorisasi, tanpa memblokir logout.

Target/symbol: Identity-scoped upload lifecycle/provider, router leave blocker.

- `apps/web/src/components/admin/upload-session-provider.tsx`
- `apps/web/src/components/admin/media-leave-dialog.tsx`
- `apps/web/src/routes/admin._authenticated.tsx`
- `apps/web/src/lib/auth/session-cache.ts`
- `apps/web/test/admin-upload-auth.test.ts`

- Manager mounted authenticated scope; route leave saat active hash/PUT meminta stay atau pause-and-leave. Leaving pauses locally, server session tetap resumable/expiry; cancelled confirmation hanya abort setelah explicit action.
- Logout/expiry/revocation segera stop hashing/PUT/scheduler, release locks/Blob refs/signed URL/object URL, clear private queries/mutations. API auth 5xx valid recheck preserve attempt; authoritative error lock stop transport.
- New presign setelah lost auth ditolak server; sudah terbit mungkin valid hingga expiry. Tidak menjanjikan revocation URL atau background upload sesudah force-close. Existing metadata dirty guard tidak dibuat duplikat.

### Acceptance criteria

- [ ] Auth transition tidak terhambat leave dialog dan private data tidak muncul lewat browser back.
- [ ] After auth stop tidak ada new requests/late callback yang menghidupkan attempt lagi.
- [ ] Unrelated public cache/theme dan baseline metadata tetap terjaga.

### Validasi

Existing auth SSR/cache/routes smoke + built browser in-flight hash/PUT logout/revoke/outage/cross-tab/back and leave cancel/confirm; no secret/file persistence.

### Hasil dan bukti

Belum diimplementasikan atau diverifikasi. Perintah di bagian validasi merupakan rencana, bukan hasil test yang telah dijalankan. Isi evidence aktual dan batas proof saat task dikerjakan.

### Commit task

- Pesan yang direncanakan: `feat(web): adup-014 clean up private uploads`.
- SHA: belum dibuat.
- Hook/checks: belum dijalankan untuk task ini.
- Ledger: catat SHA aktual setelah commit berhasil pada update dokumentasi berikutnya; jangan menulis SHA self-referential.

### Blocker atau tindak lanjut

Dependencies ADUP-011, ADUP-012 (scope plan telah disetujui pengguna). Temuan proof baru diperbarui pada plan dan task terkait sebelum melanjutkan.

## Task: ADUP-015 — Acceptance uploader MinIO dan closure dokumentasi

- Status: Backlog
- Owner: pengembang/agent pelaksana task.
- Prioritas: 15, mengikuti dependencies.
- Referensi: ADUP-US04; [plan canonical](../plans/admin-media-upload/implementation-plan.md), [PRD](../product/prd.md).
- Diperbarui: 2026-10-05.
- Dependensi: ADUP-003, ADUP-004, ADUP-005, ADUP-006, ADUP-007, ADUP-008, ADUP-009, ADUP-010, ADUP-011, ADUP-012, ADUP-013, ADUP-014.
- Ukuran: satu task acceptance lintas alur menggunakan harness existing.

### Ruang lingkup

User flow uploader terbukti dan setiap task memiliki commit/evidence sesuai scope.

Target/symbol: Built admin UI→gateway→Elysia→PG→MinIO→worker proof; task receipts.

- `apps/web/test/admin-media-upload-browser-worker.mjs`
- `apps/web/test/auth-browser-smoke.mjs`
- `apps/api/test/integration/admin-media-upload-fixture.ts`
- `apps/api/test/integration/media-upload-proof.test.ts`
- `docs/operations/media.md`
- `docs/architecture/media-upload-contract.md`
- `docs/guides/environment.md`
- `docs/tasks/admin-media-upload.md`
- `docs/plans/admin-media-upload/implementation-plan.md`
- `docs/README.md`

- Use existing DRY browser harness, real dedicated PG/MinIO fixtures; auth error controls dibedakan dari business/storage reality. File source valid kecil dan poster untuk all resource scope; same-size wrong file dan interrupted/resume scenarios.
- Native API/auth/web tests, check-types, available lint, build, docs/format/whitespace, frozen conditional deps, migration preservation. Snapshot source fresh sebelum proof; no parallel reset test DB/bucket atau build saat browser/SSR aktif.
- Desktop/mobile 320/390/768/1024/1440 light/dark/System, source/poster/series, one-part small poster, concurrency/retry/reload/offline/CORS/expiry/cancel/auth/version stale/progress/ready.
- Save actual browser screenshots/docs/receipt SHA setelah task commit. Tidak menyatakan R2/Safari/production capacity/perangkat fisik/whole MVP selesai.

### Acceptance criteria

- [ ] End-to-end UI menghasilkan immutable source dengan matching fingerprint, exactly one activated session/job pada complete replay, lalu verified output.
- [ ] Semua meaningful failure/recovery/auth/layout cases lulus; evidence real-vs-fixture/platform jelas.
- [ ] Semua task implementasi committed lokal per task dan canonical docs diperbarui; delivery remote hanya jika diminta.

### Validasi

Relevant native suite + guarded dedicated DB/storage + built browser/SSR/auth boundaries + root quality gates dan staged docs/preservation.

### Hasil dan bukti

Belum diimplementasikan atau diverifikasi. Perintah di bagian validasi merupakan rencana, bukan hasil test yang telah dijalankan. Isi evidence aktual dan batas proof saat task dikerjakan.

### Commit task

- Pesan yang direncanakan: `test(web): adup-015 verify media upload workflow`.
- SHA: belum dibuat.
- Hook/checks: belum dijalankan untuk task ini.
- Ledger: catat SHA aktual setelah commit berhasil pada update dokumentasi berikutnya; jangan menulis SHA self-referential.

### Blocker atau tindak lanjut

Dependencies ADUP-003, ADUP-004, ADUP-005, ADUP-006, ADUP-007, ADUP-008, ADUP-009, ADUP-010, ADUP-011, ADUP-012, ADUP-013, ADUP-014 (scope plan telah disetujui pengguna). R2 staging, Safari/native HLS, production migrations dan kapasitas VPS tetap gerbang terpisah.

## Ledger planning

| Tanggal    | Task     | Bukti/status                                                                                                    | Commit                                     |
| ---------- | -------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| 2026-10-05 | ADUP-001 | Done: context-before-plan, 15 task/DAG, docs/Prettier/diff/staged snapshot/preservation dan hooks lulus         | `5a165fb7410d81e09af81f1761419ebf0369c564` |
| 2026-10-05 | ADUP-006 | Review: empat raster/state spec, PNG/docs/staged snapshot/preservation dan hooks lulus; visual approval pending | `f93e9af81c18107f1d70e7c645a2ef496f26db05` |
| 2026-10-05 | ADUP-006 | Done: pengguna menyetujui empat mockup melalui ‘oke approve’; visual acceptance selesai                         | `f80998cd18fafaf12de5cc4a18e2c53563a9f872` |

ADUP-001/ADUP-006 Done setelah approval plan dan empat mockup; task runtime lainnya tetap Backlog. Status Done planning/desain tidak berarti uploader atau migrasi telah diimplementasikan.
