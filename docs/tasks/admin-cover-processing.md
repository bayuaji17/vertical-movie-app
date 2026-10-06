# Modul: admin cover processing

- Status: **ACOV-001–010 selesai lokal** di `feat/admin-cover-processing`; R2/production belum diverifikasi.
- Diperbarui: 6 Oktober 2026.
- Persetujuan: pengguna menyetujui plan/default pada 6 Oktober 2026; feasibility gate menentukan guard native/browser. Rincian di [plan](../plans/admin-cover-processing/implementation-plan.md).
- Snapshot source: `06e7ce75e9d3f87bbe501bac054711310e14e5a2`; [context](../plans/admin-cover-processing/repository-context.md).

## Tujuan modul

Admin mengatur crop sampul 9:16 dan memperoleh WebP 1080×1920 Ready tanpa media worker terpisah. Publication tetap manual dan verified media tetap wajib. Rujukan: [PRD](../product/prd.md), [aturan produk](../product/global-rules.md), [kontrak upload](../architecture/media-upload-contract.md) dan [workflow](../guides/development-workflow.md). Keputusan crop ini tidak mengubah validasi video/HLS.

## User story: ACOV-US-01

Sebagai admin, saya ingin crop gambar sampul dengan preview, sehingga framing Film/Standalone/Series sesuai 9:16 pada mobile maupun desktop.

## User story: ACOV-US-02

Sebagai admin, saya ingin sampul diproses langsung setelah upload, sehingga saya tidak perlu menjalankan worker video untuk memperoleh cover Ready.

## User story: ACOV-US-03

Sebagai admin, saya ingin error dan upload terputus dapat dipulihkan dengan aman, sehingga identitas file, media lama, otorisasi dan kesiapan preview tetap konsisten.

## Urutan, gates dan otorisasi

Ikuti DAG pada plan; dependensi di bawah adalah gate task. Plan disetujui pengguna; freshness diperiksa ulang sebelum implementasi. ACOV-002 adalah feasibility gate sebelum adapter/schema/UX. Setiap task diperkecil lagi bila proof membuka kebutuhan berbeda. Commit tiap task setelah AC/checks lulus; pesan di bawah usulan sampai benar-benar dibuat. Push/PR/merge/deployment memerlukan instruksi tersendiri.

Untuk task runtime, jalankan tests yang relevan, `bun run check-types`, `bun run lint`, `bun run build`, docs/format/diff. Dependency/script berubah: `bun install --frozen-lockfile`. Schema task mengikuti dedicated integration dan preservation development; jangan reset development. Dokumen-only cukup docs/format/diff, hook normal tetap berjalan. Evidence ditulis sesudah eksekusi, bukan disalin dari daftar rencana.

## Task: ACOV-001 — Context, plan dan backlog berbasis repository

- Status: Done
- Owner: Codex / pengembang proyek
- Prioritas: 1
- Referensi: ACOV-US-01–03; PRD media/sampul dan GR lifecycle; [plan](../plans/admin-cover-processing/implementation-plan.md).
- Diperbarui: 2026-10-06
- Dependensi: tidak ada
- Ukuran: Kecil, dokumentasi

### Ruang lingkup

Buat repository context pada SHA immutable sebelum implementation plan; susun DAG, kontrak yang diusulkan, backlog ini dan navigasi docs. Pertahankan perubahan lokal lain dan stage hanya bagian indeks milik task.

Target: `docs/plans/admin-cover-processing/{repository-context,implementation-plan}.md; docs/tasks/admin-cover-processing.md; docs/README.md.`

### Acceptance criteria

- [x] Snapshot, dampak readiness/provenance, keterbatasan native dan policy proposal tercatat; status proposal dibedakan dari runtime.
- [x] Sepuluh task memiliki dependensi, acceptance criteria, validation dan commit terpisah; dokumen saling tertaut tanpa link rusak.
- [x] Format/docs/diff dan preservation lulus; commit task lokal berhasil tanpa memasukkan pekerjaan lain.

### Validasi

bun run docs:check; Prettier pada empat Markdown terkait; git diff --check; audit ID/dependency DAG; docs checker pada staged export; pemeriksaan hash 22 path unrelated dan partial-stage README. Hook normal tetap lint/check-types.

### Hasil dan bukti

2026-10-06: context ditulis sebelum plan pada snapshot di atas. `bun run docs:check` passed (59 Markdown, 514 local links/anchors); Prettier empat Markdown passed; `git diff --check` passed. Audit sepuluh ID unik, template dan dependensi DAG konsisten/acyclic passed. SHA-256 22 unrelated paths sama; link desain existing pada README tetap ada dan perubahan indeks task di-stage terpisah. Staged export docs checker passed (52 Markdown, 495 local links/anchors, tanpa errors); `git diff --cached --check` passed dan hanya empat path plan/backlog/index masuk staging. Commit task berhasil pada `693b557031c59d6ae0ab2d013c54a4bc38625e7e`; hook normal docs/lint/check-types/Commitlint passed. Lint web dan check-types api/web/auth merupakan cache hits, tanpa klaim runtime proof baru. Tidak menjalankan runtime tests/build/migration karena scope dokumentasi saja.

### Commit task

- Pesan: `docs(media): plan native cover processing (ACOV-001)`
- SHA: `693b557031c59d6ae0ab2d013c54a4bc38625e7e`.
- Hook/checks: docs:check passed (59/514); lint web passed (1 cache hit); check-types api/web/auth passed (3 cache hits); Commitlint passed; Prettier/diff/task DAG/staged-docs/preservation passed.
- Ledger: receipt ini mencatat commit task sebelumnya; commit receipt tidak mengklaim SHA dirinya sendiri.

### Blocker atau tindak lanjut

Planning Done; plan disetujui dan freshness diperiksa ulang sebelum branch implementasi.

## Task: ACOV-002 — Buktikan native image dan browser crop memenuhi policy

- Status: Done
- Owner: Codex / pengembang proyek
- Prioritas: 2
- Referensi: ACOV-US-01, ACOV-US-02; PRD media/sampul dan GR lifecycle; [plan](../plans/admin-cover-processing/implementation-plan.md).
- Diperbarui: 2026-10-06
- Dependensi: ACOV-001
- Ukuran: Kecil, investigasi terarah

### Ruang lingkup

Buktikan Bun.Image pada runtime repo dan Canvas pada browser target dengan fixture sendiri. Putuskan guard animasi/MIME, EXIF/alpha, batas pixel/byte, native cancellation, output quality dan budget waktu. Catat gap sebelum adapter/UX diimplementasikan; jangan menganggap sumber browser sudah diverifikasi server.

Target: `apps/api/src/modules/media/poster-image.test.ts`; generated static and animated fixtures under `apps/api/test/fixtures/media/`; Canvas proof via Chrome CDP; plan/backlog.

### Acceptance criteria

- [x] PNG/WebP/JPEG, EXIF, alpha, APNG/GIF dua frame, animated WebP, MIME mismatch, truncated JPEG dan batas pixel diuji; native gaps/guard tercatat.
- [x] Chrome membuktikan crop natural 1080×1920 tanpa upscale, WebP/PNG fallback aktual dan transparansi; Bun membuktikan orientasi EXIF dan encode sesudah browser; format/quality default ditetapkan.
- [x] Waktu/memori fixture sintetis diukur; abort signal tidak menghentikan native terminal; deadline API diperlakukan sebagai batas logical, bukan hard cancellation.

### Validasi

`bun test apps/api/src/modules/media/poster-image.test.ts apps/api/src/modules/media/policy.test.ts`; Canvas proof Chrome via CDP pada fixture sintetis; fixture animasi APNG/GIF dua frame dan contoh WebP animasi resmi; ukur elapsed/RSS. `bun run check-types`, `bun run lint`, `bun run build`, `bun run docs:check`, Prettier dan `git diff --check`.

### Hasil dan bukti

2026-10-06: Chrome 154 (Windows) memotong PNG sintetis 1920×1920 dengan source rect 1080×1920 ke output WebP 1080×1920, rasio 9:16, scale 1.0; Blob 4516 byte, alpha transparan terbukti sebelum/sesudah WebP decode. MIME tidak didukung menghasilkan PNG fallback 48168 byte. Bun 1.4.2 Linux x64 membaca file crop WebP 4516 byte dan menghasilkan WebP 4580 byte; satu encode 111 ms dengan process RSS 39.7 MiB pada proses fixture baru (bukan benchmark VPS). Fixture gradient sintetis 1080×1920: PNG 2657891 byte → WebP 56972 byte dalam 217 ms, RSS 89.6 MiB.

`bun test apps/api/src/modules/media/poster-image.test.ts`: 8 tests / 22 assertions passed; policy suite also verifies the 5,000,001-byte rejection. Cakupan PNG/WebP actual crop, alpha setelah native re-encode, sniff bytes vs File MIME/extension, JPEG EXIF orientation 6 (1080×1920 → 1920×1080), oversized 4097×4096 di atas 16777216 px (`ERR_IMAGE_TOO_MANY_PIXELS`), truncated JPEG (`ERR_IMAGE_DECODE_FAILED`), APNG/GIF dua frame tanpa frame count pada metadata, dan abort signal yang tidak menghentikan native terminal. APNG/GIF diubah jadi still PNG oleh Bun. Contoh WebP animasi resmi Google memiliki 100 `ANMF` frames; metadata native hanya menunjukkan 300×225/WebP dan terminal transcode menolak `ERR_IMAGE_DECODE_FAILED`. Tidak ada frame API atau crop/extract native.

Aturan hasil: crop sumber animasi ditolak di browser melalui pemeriksaan APNG `acTL` dan WebP animation flag/chunks; payload hasil crop API mesti statis dan MIME harus sama dengan format bytes yang di-sniff. Browser original tidak pernah diunggah, sehingga API hanya dapat membuktikan payload crop, bukan asal frame. Quality WebP browser 0.95 dan API 85 memenuhi fixture di bawah 5 MB; belum mewakili foto nyata/perangkat lambat/production VPS. Bukti browser Chrome tidak mencakup Safari/iOS/Firefox. Quality gates 6 Oktober lulus: root check-types, lint dan build sukses; docs checker 59 Markdown/514 link-anchor; Prettier dan diff bersih. Tidak ada env, dependency, schema, worker atau bucket aplikasi yang diubah.

### Commit task

- Pesan: `test(media): verify native poster feasibility (ACOV-002)`
- SHA: `7111d522b0936f73b4b0746f14f3cce111382d92`.
- Hook/checks: docs:check (59 Markdown/514 links), lint (web), check-types (api/web/auth) dan Commitlint lulus; task tests, build, Prettier dan diff check juga lulus sebelum commit.
- Ledger: SHA task ini dicatat pada backlog dan execution log plan setelah task commit.

### Blocker atau tindak lanjut

Tidak ada blocker ACOV-002. Catatan untuk adapter/parser: Bun metadata tidak memberikan frame count dan terminal native tidak menghentikan pekerjaan setelah dimulai; implementasikan guard container statis dan fence logical deadline sesuai plan.

## Task: ACOV-003 — Persist executor dengan migrasi yang menjaga data lama

- Status: Done
- Owner: Codex / pengembang proyek
- Prioritas: 3
- Referensi: ACOV-US-02, ACOV-US-03; PRD media/sampul dan GR lifecycle; [plan](../plans/admin-cover-processing/implementation-plan.md).
- Diperbarui: 2026-10-06
- Dependensi: ACOV-002
- Ukuran: Kecil, satu perubahan schema

### Ruang lingkup

Tambahkan `processing_mode` pada `upload_sessions` dan `execution_mode` pada `media_jobs`, keduanya non-null default `worker`; CHECK mengizinkan `request` hanya untuk poster. Jangan aktifkan pemilihan runtime `request` sebelum ACOV-005 juga mengecualikan job tersebut dari claim/recovery worker. Generate migration, bukan hand-edit migration/journal.

Target: `apps/api/src/db/schema/{upload,jobs}.ts`, generated `apps/api/drizzle/0010_poster-execution-mode.sql` dan snapshot/journal, dedicated migration proof.

### Acceptance criteria

- [x] Historical rows tetap worker; queued/running/succeeded jobs dan upload identity/hash tidak berubah; constraint request-poster valid.
- [x] Migration generated direview dan diuji pada dedicated database berisi data legacy, termasuk readiness composite FK, attempt provenance, constraint dan uniqueness.
- [x] Pending migration diterapkan pada development database yang dikonfigurasi sesudah backup; journal/schema/data preservation diverifikasi tanpa reset.

### Validasi

`bun run drizzle-kit generate --name=poster-execution-mode` dari `apps/api`; dedicated PostgreSQL migration proof dan existing media migration proofs serial; API unit suite; root check-types/lint/build. Sebelum dev apply: custom-format backup di luar repo, `bun run --cwd apps/api db:migrate`, journal/schema/17 table snapshots dan counts sebelum/sesudah; docs/Prettier/diff.

### Hasil dan bukti

2026-10-06: Schema Drizzle menghasilkan `processing_mode`/`execution_mode` dengan default `worker`, CHECK nilai valid dan `request` hanya untuk poster. Migration `0010_poster-execution-mode.sql` generated oleh Drizzle Kit, ditinjau tanpa hand-edit. Dedicated test `media-cover-executor-migration-proof.test.ts` lulus (1 test/14 assertions): session/job legacy tetap worker; pending/running/succeeded job, completed upload, asset, attempt, id/hash, ready-job composite FK, generation uniqueness dan migration rerun terjaga. CHECK menolak request pada source/enum invalid dan menerima poster request.

Existing migration regressions lulus serial: fingerprint proof 1/15 dan publication proof 1/10. `bun test apps/api/src`: 86/335 lulus. Root `check-types`, `lint`, `build`; Prettier dan `git diff --check` lulus. Development `vertical_movie_app` dibackup sebelum migrasi: custom archive 64,168 bytes/143 list entries, file mode 0600. Command resmi `bun run --cwd apps/api db:migrate` menaikkan journal 10→11. Snapshot SHA-256/count semua 17 application tables identik (kolom baru dikecualikan); tiga session dan tiga job legacy semuanya `worker`. Schema baru non-null/default worker dan seluruh constraint diverifikasi. Tidak ada production migration atau mode runtime request yang dijalankan.

### Commit task

- Pesan: `feat(api): persist poster execution mode (ACOV-003)`
- SHA: `edd4d7ee4c818b860877149900b6a910e5f11f9c`.
- Hook/checks: docs:check (59 Markdown/514 links), lint (web), check-types (api/web/auth) dan Commitlint lulus; integration/API tests, build, Prettier, diff dan migration preservation lulus sebelum commit.
- Ledger: SHA task ini dicatat pada backlog dan execution log plan setelah task commit.

### Blocker atau tindak lanjut

Tidak ada blocker ACOV-003. `request` tetap belum dipilih aplikasi sampai ACOV-005 menambah API processing dan mengecualikan request jobs dari worker claim/recovery.

## Task: ACOV-004 — Adapter Bun.Image dengan batas resource dan output terverifikasi

- Status: Done
- Owner: Codex / pengembang proyek
- Prioritas: 4
- Referensi: ACOV-US-02; PRD media/sampul dan GR lifecycle; [plan](../plans/admin-cover-processing/implementation-plan.md).
- Diperbarui: 2026-10-06
- Dependensi: ACOV-002
- Ukuran: Kecil, adapter dengan dependency injection

### Ruang lingkup

Buat native image adapter awaited untuk decode/autoOrient/resize/WebP quality 85. Validasi payload yang diterima dan encoded output, hash/codec/dimensi/animation guard sesuai proof. Tambah env server serta limiter per-instance yang baru melepas slot setelah native terminal settle.

Target: `apps/api/src/modules/media/poster-image.ts dan tests; apps/api/src/config/{poster-env,env}.ts; apps/api/.env.example; docs/guides/environment.md.`

### Acceptance criteria

- [x] Payload valid menghasilkan WebP 1080×1920 dengan alpha dan auto-orient, tanpa Sharp/FFmpeg/subprocess pada adapter.
- [x] Byte/pixel/hash/type/dimensi/animated invalid ditolak dengan error domain aman; codec, dimensi dan hash hasil encode diverifikasi sebelum hasil dapat dipakai.
- [x] Concurrency default 1 (dibatasi 1–4 per instance), pixel cap default 16.777.216 dan logical deadline default 20s diuji; busy/abort/timeout tidak membuat unbounded queue atau premature limiter release.

### Validasi

bun test pada adapter/config dengan native fixture + dependency failure; uji terminal yang terlambat settle dan concurrency cap; dokumentasi env aktif hanya bersama kode; root gates.

### Hasil dan bukti

ACOV-004 menambah adapter native tanpa dependency baru. Adapter menyalin payload maksimal 5.000.000 byte, mencocokkan SHA-256 lowercase dan Content-Type, menolak APNG/WebP animasi melalui bounded container scan, lalu meminta Bun.Image memverifikasi format/pixel budget, rasio 9:16, dan minimum 1080×1920. Hasil WebP quality 85 diverifikasi ulang untuk framing statis, format, 1080×1920 dan hash; fixture transparan tetap mempertahankan alpha.

Env API aktif memberi default pixel cap 16.777.216, concurrency 1 per instance (maksimum 4) tanpa antrean, dan deadline logis 20 detik (rentang 1–120). Timeout/abort menolak hasil agar tidak dapat diteruskan. Bun.Image tidak mendukung pembatalan paksa; slot tetap terpakai hingga terminal native selesai, lalu hasil late dibuang. Runtime request belum di-wire sampai ACOV-005.

Hasil: test terarah 24 lulus/0 gagal (79 assertion); suite API 99 lulus/0 gagal (395 assertion). Root `bun run check-types` (3/3), `bun run lint` (web 1/1), `bun run build` (API/web 2/2), `bun run docs:check` (59 Markdown/514 link-anchor) dan Prettier/diff check lulus. Commit hook dicatat pada receipt setelah dijalankan.

### Commit task

- Pesan: `feat(api): add bounded native poster adapter (ACOV-004)`
- SHA: `0b7a6e2c630a8b11c0a9d6a2faf807cc1625568d`.
- Hook/checks: hook docs:check (59 Markdown/514 link-anchor), lint web, check-types api/web/auth dan Commitlint lulus; suite API 99/395, root check-types/build, Prettier dan diff check lulus.
- Ledger: SHA task ini dicatat pada receipt plan dan backlog setelah task commit.

### Blocker atau tindak lanjut

Tidak ada blocker ACOV-004. ACOV-005 menghubungkan processor dan config ini ke endpoint request-path serta storage/provenance yang persisten.

## Task: ACOV-005 — Endpoint prepare dengan provenance dan worker exclusion

- Status: Done
- Owner: Codex / pengembang proyek
- Prioritas: 5
- Referensi: ACOV-US-02, ACOV-US-03; PRD media/sampul dan GR lifecycle; [plan](../plans/admin-cover-processing/implementation-plan.md).
- Diperbarui: 2026-10-06
- Dependensi: ACOV-003, ACOV-004
- Ukuran: Sedang, satu hasil API lintas orchestration

### Ruang lingkup

Tambahkan POST /admin/media/uploads/:id/process-poster dan safe mode/capability DTO. Complete/freeze existing menghasilkan durable request record; processor melakukan claims/lease/attempt, storage verify dan fenced Ready. Worker claim/recover hanya worker; cleanup kompatibel. Wiring dependencies eksplisit dan gateway hanya route POST ini mendapat timeout 30s.

Target: `apps/api/src/modules/media/{index,model,service,repository,poster-processing}.ts dan tests; apps/api/src/index.ts; workers/{queue,cleanup}.ts; readiness/catalog tests; apps/web/src/lib/server/{auth-gateway,business-gateway}.ts dan tests.`

### Acceptance criteria

- [x] Admin actor/session/owner/generation eligible diverifikasi; source/legacy mode ditolak endpoint; GET status tetap read-only dan DTO tidak membocorkan storage/claim secrets.
- [x] New valid poster request menghasilkan succeeded job/attempt dan verified Ready output; replay/race/crash/replacement tidak menggandakan output activation atau meloloskan stale claim.
- [x] Worker claim/recover tidak mengambil request rows; legacy poster/source dan cleanup successful output kompatibel.
- [x] Gateway timeout scoped POST/path, auth/source tetap 10s; busy/retry/terminal error aman, max 3 attempts dan Retry-After; lost response dapat direkonsiliasi.

### Validasi

Elysia app.handle HTTP tests tanpa port, injected storage/native failure; dedicated PostgreSQL race/lease/worker compatibility; gateway path/method/timeout tests; root gates. Encoding/storage di luar transaction dan semua work awaited.

### Hasil dan bukti

2026-10-06: POST privat body `{}` ditambahkan dengan actor/session/owner/draft/current-generation fence dan DTO capability aman. Poster baru wajib membawa expected SHA-256 dan diberi mode `request`; replay legacy mempertahankan hash serta mode lama. Complete membuat durable request job atomik. Processor memeriksa source HEAD/etag/size/MIME, membaca maksimal5 MB lewat native S3, await Bun.Image, menulis prefix attempt immutable, lalu HEAD dan readback/hash output sebelum Ready commit. `media_assets.sha256` tetap digest source; `facts.outputSha256` merekam hasil WebP. Lease60s, maksimal3 attempts, retry1/2s, Retry-After dan recovery expired claim diterapkan. Worker claim/recovery hanya mode `worker`; gateway exact process POST30s, request lain/auth10s. Cleanup compatibility diverifikasi agar prefix Ready tidak dihapus.

Dedicated PostgreSQL media test DB, real Bun.Image, fake S3/storage: processing/replay/expired lease/concurrency/replacement fence/retry exhaustion/legacy rejection 6 tests/48 assertions; worker exclusion/recovery 1/5. `bun test apps/api/src`: 101/409; `bun test apps/web/test`: 117/474. Root `bun run check-types` (3/3), `bun run lint` (web 1/1) dan `bun run build` (API/web 2/2) lulus. Unit app.handle menguji auth/body/no-store/retry header; gateway path/method policy teruji. Belum ada storage MinIO/R2 jalur poster atau browser UI proof. Tidak ada migration, dependency, development DB atau bucket aplikasi yang diubah.

### Commit task

- Pesan: `feat(api): prepare covers through private requests (ACOV-005)`
- SHA: `66ed89dbbd2322b2c5d86041b979fcf50e9cbbaa`.
- Hook/checks: docs:check 59 Markdown/514 links, lint, check-types 3/3 dan Commitlint lulus pada commit hook; build API/web 2/2 serta tes terkait lulus sebelum commit.
- Ledger: SHA aktual dicatat pada update dokumentasi setelah commit, tanpa self-referential SHA.

### Blocker atau tindak lanjut

Tidak ada blocker implementasi API. Proof MinIO/R2 penuh, crop browser dan UI recovery tetap berada di ACOV-009 serta task berikutnya.

## Task: ACOV-006 — Crop geometry dan Canvas export dengan identitas payload tepat

- Status: Done
- Owner: Codex / pengembang proyek
- Prioritas: 6
- Referensi: ACOV-US-01, ACOV-US-03; PRD media/sampul dan GR lifecycle; [plan](../plans/admin-cover-processing/implementation-plan.md).
- Diperbarui: 2026-10-06
- Dependensi: ACOV-002
- Ukuran: Kecil, browser primitives

### Ruang lingkup

Buat pure crop math untuk frame 9:16, bounds/zoom/minimum serta browser decode/Canvas raster export. Hasil File 1080×1920 memakai actual Blob.type; WebP 0.95 atau PNG fallback <=5MB. Handle orientation, memory URLs/buffers dan late callback owner/attempt.

Target: `apps/web/src/lib/admin/{cover-crop,cover-raster,media-file}.ts; crop tests/browser proof.`

### Acceptance criteria

- [x] Portrait/landscape/square/edge zoom tetap bounds dan exact 9:16; area kecil ditolak sebelum upload tanpa stretching/upscale.
- [x] Raster actual dimensions/type/byte limit benar; File baru sesuai MIME/extension, fingerprint menghitung exact exported bytes.
- [x] Cancel/abort/unmount/owner change melepas URLs dan mengabaikan hasil lama; File/Blob/geometry tidak dipersist ke cache atau localStorage.

### Validasi

Pure math tests untuk boundary/crop mapping dan Canvas browser fixtures untuk MIME fallback/EXIF/byte limit; root gates. Tidak menguji hanya implementation mirror.

### Hasil dan bukti

2026-10-06: Ditambahkan geometri crop 9:16 yang pure dengan pan normalisasi, zoom dibatasi sumber dan margin numerik anti-upscale; crop di bawah 1080×1920 ditolak. Decode menghormati EXIF, menolak GIF/APNG/animated WebP sebelum memilih frame, dan membatasi sumber ke40 megapiksel. Canvas menghasilkan File1080×1920 WebP quality0.95 atau PNG dari MIME aktual; nama ekstensi mengikuti Blob.type, hasil di atas batas konfigurasi 5.000.000 byte ditolak. SHA-256 menggunakan exact bytes File hasil; tidak ada base64, Blob atau geometri yang masuk cache/storage.

CoverRasterScope mengikat decode/export ke attempt dan owner; replace/unmount abort signal, menutup ImageBitmap, membatalkan hasil late dan mereset backing store canvas. Pemroses crop sendiri tidak membuat object URL; upload manager tetap memiliki lifecycle URL preview bagi File hasil.

Unit crop/raster: 12 tests/105 assertions; root web suite:129/579. Chrome154 Headless via Canvas proof: source2160×3840 → WebP1080×1920 (4.282 byte), pan pixel merah/biru sesuai batas, SHA-256 exact payload, PNG fallback aktual48166 byte dengan nama/MIME `.png`, EXIF orientation JPEG →400×600, dan PNG noise output >5.000.000 byte ditolak. Root check-types3/3, lint1/1, build2/2 lulus. Browser proof hanya Chromium; Safari/iOS dan perangkat berdaya rendah belum diverifikasi.

### Commit task

- Pesan: `feat(web): add cover crop raster primitives (ACOV-006)`
- SHA: `5f33bd63e8960a6f2270c22bc13c379c22764694`.
- Hook/checks: gates di atas lulus; hook docs/lint/check-types/Commitlint ACOV-006 lulus pada commit.
- Ledger: SHA aktual dicatat pada update dokumentasi setelah commit, tanpa self-referential SHA.

### Blocker atau tindak lanjut

Tidak ada blocker. Dialog dan integrasi card Film/Standalone/Series menjadi ACOV-007.

## Task: ACOV-007 — Modal crop dengan preview pada seluruh cover owner

- Status: Done
- Owner: Codex / pengembang proyek
- Prioritas: 7
- Referensi: ACOV-US-01; PRD media/sampul dan GR lifecycle; [plan](../plans/admin-cover-processing/implementation-plan.md).
- Diperbarui: 2026-10-06
- Dependensi: ACOV-006
- Ukuran: Kecil, satu dialog reusable

### Ruang lingkup

Integrasikan Crop cover pada card Film/Standalone/Series sebelum File masuk manager. Drag/zoom/reset/keyboard + touch dan preview; Use crop dan cancel/replacement semantics. Ikuti installed shadcn skill/primitives dan tokens existing; tidak menambah halaman.

Target: `apps/web/src/components/admin/cover-crop-dialog.tsx; apps/web/src/components/ui/{dialog,slider}.tsx; apps/web/src/components/admin/media-upload-card.tsx; apps/web/test/admin-media-file.test.ts; apps/web/test/admin-media-upload-browser-worker.mjs; apps/web/test/auth-browser-smoke.mjs; apps/api/test/integration/admin-media-browser-fixture.ts; docs/design/admin-media-upload.md.`

### Acceptance criteria

- [x] Choose/Replace cover membuka preview crop; Cancel mempertahankan selection/pointer lama; Use crop menyerahkan exact File hasil crop.
- [x] English labels, focus trap/Escape/focus restore, keyboard position/zoom/reset, touch dan error/loading terbukti pada desktop/mobile.
- [x] Light/Dark/System sesuai shell dan perubahan tema tidak menghilangkan crop; source video card tidak mendapat crop flow.

### Validasi

Browser built Bun/Nitro pada 320/390/768/1024/1440, Light/Dark/System, keyboard dan pointer/touch emulation; screenshot aktual serta replacement/cancel/sumber-kecil/output-oversize tests; root gates dan docs checks.

### Hasil dan bukti

2026-10-06: `CoverCropDialog` shadcn/Base UI mem-preview source yang di-decode dengan EXIF, menggambar crop 9:16 tanpa object URL, menyediakan pointer/touch drag, Slider zoom, keyboard pan/zoom/reset, tombol reset, loading/error dan batas output konfigurasi. Film, Standalone dan Series memakai dialog yang sama; source video tetap langsung menuju upload manager. `Use crop` menyerahkan instance File raster tepat 1080×1920 dengan nama/MIME sesuai hasil Canvas; raw cover dapat melampaui batas upload, sedangkan batas byte tetap berlaku pada output. Cancel/Escape, kegagalan dimensi/ukuran dan pergantian owner tidak mengubah File/pointer terpilih.

`bun test apps/web/test`: 130 tests/584 assertions lulus. Built Bun/Nitro + Chromium154 browser proof: layout ketiga owner type/status pada45 theme/viewport combinations; crop dialog pada15 combinations (320/390/768/1024/1440 × Light/Dark/System); loading status, focus trap dan fokus kembali ke tombol Choose file, keyboard zoom/pan/reset, pointer pan ke tepi merah, touch pan ke tepi biru, dan perubahan color scheme System tanpa kehilangan selection. Use crop menghasilkan `cover.webp` dengan dimensi natural1080×1920. Browser membuktikan Replace confirmation membuka crop, Escape menjaga preview URL lama, source video tidak membuka crop, gambar di bawah1080×1920 menonaktifkan Use crop, dan PNG hasil >5.000.000byte menampilkan error serta tetap menjaga cover terpilih. Screenshot aktual lokal: `.turbo/admin-cover-processing/acov-007/mobile-light.png` dan `desktop-dark.png` (ignored, tidak masuk Git).

Browser proof mereset hanya dedicated `vertical_movie_app_media_test`; `MEDIA_BROWSER_STORAGE=disabled` sehingga tidak membuat bucket atau mengubah objek MinIO. Dedicated DB fixture memakai content/media API aktual, sementara tahap crop berhenti sebelum upload/network. Safari/iOS/perangkat fisik dan upload hasil crop ke MinIO/R2 belum diverifikasi.

Gerbang repo: `bun run check-types` 3/3, `bun run lint` 1/1, `bun run build` 2/2, `bun run docs:check` 59 Markdown/514 links-anchors, seluruh web tests130/584, Prettier check dan `git diff --check` lulus. Build menghasilkan API dan web; Bun/Nitro+Chromium proof built juga lulus.

### Commit task

- Pesan: `feat(web): add accessible cover crop dialog (ACOV-007)`
- SHA: `291b7d172c6eb90ec2e4249b199933db2c1a9b9d`.
- Hook/checks: hook commit lulus; root gates dan browser proof ACOV-007 tercatat di atas.
- Ledger: simpan SHA aktual pada update dokumentasi berikutnya, tanpa self-referential SHA.

### Blocker atau tindak lanjut

Tidak ada blocker lokal. Exact-payload recovery setelah refresh dan upload/pemrosesan output cover tetap berada di ACOV-008/009; sesi aktif yang crop custom tidak mengklaim bisa direkonstruksi sebelum implementasi recovery tersebut.

## Task: ACOV-008 — Eden/Query preparation, Finish cover dan refresh recovery

- Status: Done
- Owner: Codex / pengembang proyek
- Prioritas: 8
- Referensi: ACOV-US-02, ACOV-US-03; PRD media/sampul dan GR lifecycle; [plan](../plans/admin-cover-processing/implementation-plan.md).
- Diperbarui: 2026-10-06
- Dependensi: ACOV-005, ACOV-007
- Ukuran: Sedang, satu end-to-end control flow

### Ruang lingkup

Extend typed Eden contract/Query keys, manager/card status dan errors. Multipart tetap; invoke process-poster sesudah complete, tampilkan Preparing/Ready/Finish cover. Recovery menyesuaikan request/legacy mode; original dan cropped payload tidak pernah dicampur.

Target: `apps/web/src/lib/admin/{media-client,media-queries,media-errors,media-state,upload-manager,use-upload-manager}.ts; components media-{upload-card,panel,processing-status}.tsx.`

### Acceptance criteria

- [x] Cover <=5MB one-part multipart existing; complete dan Prepare cover terpisah, typed dan signal-aware tanpa unsafe casts atau automatic mutation retry.
- [x] Completed processing dapat Finish cover tanpa File setelah refresh/lost response; pending crop hanya resume exact uploaded payload atau explicit Cancel and crop again.
- [x] Legacy original reselect dan video resume tetap; role/expiry/logout/navigation menghapus private state dan late callbacks tidak menghidupkan UI lama.
- [x] Readonly metadata/version conflict dan Preview gate tetap benar; error permission/invalid/decode/busy/timeout actionable.

### Validasi

Manager/domain regression tests existing; browser refresh/offline/hash mismatch/expired URL/auth loss/409; API+web typed check; root gates. Query menyimpan safe DTO saja.

### Hasil dan bukti

2026-10-06: Eden memiliki `processPoster` typed POST dengan body kosong, credentials, no-store dan `AbortSignal`; Query mutation menonaktifkan retry otomatis dan cache hanya memuat safe DTO. Upload manager memanggil Prepare sesudah poster multipart selesai, menyediakan Finish cover untuk capability completed yang pulih dari inventory setelah refresh, dan merekonsiliasi respons POST hilang lewat GET status tanpa mengulang command. Hash crop berbeda ditolak sebelum status/PUT; membatalkan uploaded crop melepas descriptor dan mengizinkan crop baru. Status processing request menjadi Ready hanya dari verified readiness; legacy worker status tetap memakai label worker. Status source yang confirmed completed serta poster request tidak menyimpan File/preview lagi, dan pengecekan status poster tidak otomatis memulai Prepare.

Regression unit manager/client/state `bun test apps/web/test/admin-upload-recovery.test.ts apps/web/test/admin-media-state.test.ts apps/web/test/admin-media-client.test.ts`: **24 tests/137 assertions lulus**. Full web suite `bun test apps/web/test`: **140 tests/649 assertions lulus**; recovery-specific suite juga lulus (11/61). API media suite `bun test apps/api/src/modules/media`: **27 tests/131 assertions lulus**. `bun run check-types` lulus (3/3), `bun run lint` lulus (1/1), `bun run build` lulus (2/2), dan `bun run docs:check` lulus (59 Markdown/514 links-anchors); `git diff --check` lulus.

Built Bun/Nitro + Chromium 154 browser proof lulus pada fixture PostgreSQL khusus `vertical_movie_app_media_test` dan MinIO lokal dengan bucket fixture privat berprefix khusus. Proof mencakup upload multipart source dan sampul langsung ke MinIO, hash serta completion, simulasi Prepare 503 kemudian Finish cover setelah refresh tanpa mengirim ulang crop, hasil sampul verified Ready, source diproses oleh worker fixture, sampul Series, replacement, konflik metadata 409 yang mempertahankan input, outage/recovery, mutex lintas tab, offline/resume/cancel, logout dan akses back. Fixture browser kini menginjeksi `PosterProcessingService` seperti bootstrap runtime. Uji version conflict memakai perubahan metadata konkuren yang benar-benar menaikkan row version; operasi media tetap terpisah dari versi metadata.

Command runner menggunakan env khusus `MEDIA_STORAGE_TEST_*` dan `MEDIA_TEST_DATABASE_URL` dari `apps/api/.env` yang di-ignore. Proof membuat lalu menghapus bucket acak; audit sesudahnya menunjukkan 1 user test, 1 policy khusus prefix, 0 bucket tersisa. Bucket aplikasi `vertical-movie-app` tidak diubah. Credential tetap lokal untuk proof selanjutnya dan nilainya tidak masuk log/commit.

Validasi: web tests140/649, API media tests27/131, root `check-types`3/3, `lint`1/1, `build`2/2, `docs:check`59 Markdown/514 link-anchor, Prettier dan `git diff --check` lulus. Commit hook docs:check59/514, lint1/1, check-types3/3 dan Commitlint Conventional Commit juga lulus.

### Commit task

- Pesan: `feat(web): prepare and recover native cover uploads (ACOV-008)`
- SHA: `0f07d46b5a34c02dc33908e56c79a5412788363d`.
- Hook/checks: pre-commit docs:check59/514, lint1/1, check-types3/3 dan commit-msg Commitlint lulus.
- Ledger: SHA aktual dicatat pada update dokumentasi setelah commit, tanpa self-referential SHA.

### Blocker atau tindak lanjut

Tidak ada blocker ACOV-008. ACOV-009 masih backlog untuk matriks kompatibilitas penuh ketiga owner type, worker mati/menyala, output provenance dan regression lama; R2/Safari/perangkat fisik/kapasitas production tidak diklaim dari proof lokal ini.

## Task: ACOV-009 — Buktikan cover Ready tanpa worker dan kompatibilitas video

- Status: Done
- Owner: Codex / pengembang proyek
- Prioritas: 9
- Referensi: ACOV-US-01–03; PRD media/sampul dan GR lifecycle; [plan](../plans/admin-cover-processing/implementation-plan.md).
- Diperbarui: 2026-10-06
- Dependensi: ACOV-008
- Ukuran: Kecil, acceptance lintas sistem

### Ruang lingkup

Gunakan dedicated PostgreSQL/MinIO dan built browser untuk Film/Standalone/Series. Matikan worker fixture, siapkan cover, verify output/provenance; kemudian nyalakan worker fixture untuk membuktikan source/legacy kompatibel. Jangan menghentikan proses user tanpa scope fixture.

Target: `Existing guarded API media integration suite/browser harness; fixture evidence pada backlog; test code hanya bila diperlukan.`

### Acceptance criteria

- [x] Ketiga owner memperoleh private WebP 1080×1920 dan verified Ready saat worker fixture mati; source tetap queued sampai worker berjalan.
- [x] Old Ready/pending/failed posters, source/HLS, catalog/publication/preview dan cleanup successful output lulus regression.
- [x] Race/crash/lost response/invalid inputs/busy deadline serta theme/responsive/accessibility/refresh/auth matriks memiliki hasil aktual; gap production/device dinyatakan.
- [x] Relevant tests, check-types/lint/build, migration preservation bila relevan dan docs/diff lulus; artifacts privat atau secrets tidak masuk Git.

### Validasi

Serial guarded integration dedicated targets; built browser fixture; HEAD/hash/output dimensions/job attempts; browser screenshots; root gates. R2 staging/Safari nyata/VPS capacity tidak disimpulkan dari lokal.

### Hasil dan bukti

Fixture integration diisolasi pada `vertical_movie_app_media_test` dan bucket MinIO privat acak; tidak memakai atau menghapus bucket aplikasi. Built Bun/Nitro Chromium mengunggah crop Film, Standalone dan Series, lalu sebelum worker dimulai membaca ulang output `outputs/<asset>/<job>/<token>/poster.webp`. Tiap output didecode ulang dengan Bun.Image sebagai WebP 1080×1920, HEAD size/MIME cocok, SHA-256 cocok dengan `facts.outputSha256`, job request succeeded memiliki satu attempt/prefix provenance, dan akses unsigned ditolak 403. Source Film terverifikasi masih berstatus uploaded dengan job worker queued/attempts 0 dan `workerStarts=0`; setelah worker fixture dijalankan, job source succeeded dengan HLS master/segment dan Preview menjadi tersedia. Screenshot/layout dan bukti browser disimpan hanya di `.turbo/` yang ignored.

Built browser layout: Film/Standalone/Series, source bypass, Light/Dark/System pada 320/390/768/1024/1440px, crop focus trap/return, keyboard/pointer/touch, replacement/cancel, input kecil dan output >5 MB lulus. Built browser full: direct multipart MinIO, full-hash refresh/reselection, Finish cover setelah busy response dan refresh tanpa retransmit, tiga owner Ready tanpa worker, source/HLS sesudah worker, dirty metadata 409, offline/cross-tab/pause/cancel/logout/back/auth denial lulus. Tidak ada screenshot atau credential private yang dilacak.

Serial API regressions lulus: `media-poster-processing-proof` 6/48; `media-request-worker-proof` 1/5; `media-upload-proof` 7/82; `media-series-proof` 3/26; `media-worker-proof` 1/63; `media-format-proof` 3/41; `media-hls-proof` 4/12; `media-cover-executor-migration-proof` 1/14; `modules/media/index.test.ts` 5/41; `poster-image.test.ts` 8/22; `poster-image-processing.test.ts` 10/51. Web crop/recovery/state/client suites lulus 12/105, 11/61, 5/22, 8/54. Worker compatibility fixture kini memberi fingerprint wajib pada poster baru lalu mengatur durable `processing_mode='worker'` sebelum complete untuk memodelkan legacy session. Root check-types 3/3, lint 1/1 dan build 2/2 lulus; migration preservation test lulus, tidak ada perubahan schema. `docs:check`, Prettier dan diff check dicatat pada ACOV-010 closure.

### Commit task

- Pesan: `test(media): verify covers without media worker (ACOV-009)`
- SHA: `ad373c3153311142deb287d931268bce5cb8b42b`.
- Hook/checks: pre-commit docs:check, lint, check-types dan commit-msg Commitlint lulus; serial API/Web regressions, root check-types/lint/build, built-browser layout/full MinIO proof, Prettier dan diff check lulus.
- Ledger: receipt ACOV-010 mencatat SHA commit aktual, tanpa self-referential SHA.

### Blocker atau tindak lanjut

Tidak ada blocker lokal. R2 staging, Safari/native HLS, perangkat fisik, stress OOM/disk dan kapasitas VPS 4 core/4 GB belum diverifikasi; proof lokal tidak menyatakan production readiness.

## Task: ACOV-010 — Finalisasi dokumen canonical dan ledger implementasi

- Status: Done
- Owner: Codex / pengembang proyek
- Prioritas: 10
- Referensi: ACOV-US-01–03; PRD media/sampul dan GR lifecycle; [plan](../plans/admin-cover-processing/implementation-plan.md).
- Diperbarui: 2026-10-06
- Dependensi: ACOV-009
- Ukuran: Kecil, dokumentasi closure

### Ruang lingkup

Selaraskan PRD/global rules, media upload contract/model, API guide exception durable request, environment, runbook, design states dan index dengan kode/evidence. Catat task SHA yang telah ada, rollback outstanding request records dan batas verifikasi; archive history tetap.

Target: `docs/product/{prd,global-rules}.md; docs/architecture/{media-upload-contract,video-data-model,overview}.md; docs/guides/{api-development,environment}.md; docs/operations/media.md; docs/design/admin-media-upload.md; feature plan/backlog/index.`

### Acceptance criteria

- [x] Proposal yang terimplementasi menjadi active/verified sesuai evidence; aturan sampul, poster legacy dan source/HLS tidak bertentangan; variable/commands/endpoints sesuai kode.
- [x] ACOV-002–009 mempunyai SHA/checks aktual; schema/provenance/recovery/rollback boundary dan production limitations jelas.
- [x] docs:check, Prettier/diff dan preservation lulus; commit closure lokal tanpa push/PR/merge/deployment otomatis.

### Validasi

Canonical source/docs cross-check, bun run docs:check, Prettier changed Markdown, git diff --check, staged scope/preservation; rerun runtime gate hanya jika runtime berubah/failure baru.

### Hasil dan bukti

2026-10-06: dokumen kanonis diselaraskan dengan request-mode poster dan bukti ACOV-009. Menambahkan current schema/mode/provenance, crop policy, API/env/runbook behavior, batas rollback, status desain runtime, dan index. Hash commit task ACOV-009 diverifikasi dari repository log. `bun run docs:check` lulus (59 Markdown/529 local links dan anchors); Prettier Markdown terubah, `git diff --check`, staged documentation scope serta preservation dari perubahan unrelated lulus. Tidak ada perubahan runtime/schema/dependency pada ACOV-010.

### Commit task

- Pesan: `docs(media): finalize native cover processing (ACOV-010)`
- SHA: dicatat pada receipt dokumentasi setelah commit task.
- Hook/checks: pre-commit docs:check, lint, check-types dan commit-msg Commitlint lulus; docs/Prettier/diff/preservation lulus.
- Ledger: SHA aktual dicatat pada update dokumentasi setelah commit, tanpa self-referential SHA.

### Blocker atau tindak lanjut

Tidak ada blocker lokal. R2 staging, prosedur recovery request-mode untuk rollout production, dan verifikasi platform/perangkat di luar bukti task ini.
