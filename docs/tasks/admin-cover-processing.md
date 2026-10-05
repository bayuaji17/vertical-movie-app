# Modul: admin cover processing

- Status: **plan disetujui 6 Oktober 2026; ACOV-001–004 selesai** pada `feat/admin-cover-processing`; implementasi berlanjut.
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
- SHA: `7111d524816d62f33882d2efbc967648c87a3e5a`.
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
- SHA: `edd4d7e`.
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
- SHA: `0b7a6e2`.
- Hook/checks: hook docs:check (59 Markdown/514 link-anchor), lint web, check-types api/web/auth dan Commitlint lulus; suite API 99/395, root check-types/build, Prettier dan diff check lulus.
- Ledger: SHA task ini dicatat pada receipt plan dan backlog setelah task commit.

### Blocker atau tindak lanjut

Tidak ada blocker ACOV-004. ACOV-005 menghubungkan processor dan config ini ke endpoint request-path serta storage/provenance yang persisten.

## Task: ACOV-005 — Endpoint prepare dengan provenance dan worker exclusion

- Status: Backlog
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

- [ ] Admin actor/session/owner/generation eligible diverifikasi; source/legacy mode ditolak endpoint; GET status tetap read-only dan DTO tidak membocorkan storage/claim secrets.
- [ ] New valid poster request menghasilkan succeeded job/attempt dan verified Ready output; replay/race/crash/replacement tidak menggandakan output activation atau meloloskan stale claim.
- [ ] Worker claim/recover tidak mengambil request rows; legacy poster/source dan cleanup successful output kompatibel.
- [ ] Gateway timeout scoped POST/path, auth/source tetap 10s; busy/retry/terminal error aman, max 3 attempts dan Retry-After; lost response dapat direkonsiliasi.

### Validasi

Elysia app.handle HTTP tests tanpa port, injected storage/native failure; dedicated PostgreSQL race/lease/worker compatibility; gateway path/method/timeout tests; root gates. Encoding/storage di luar transaction dan semua work awaited.

### Hasil dan bukti

Belum diimplementasikan atau divalidasi; hasil runtime dan command aktual dicatat saat task dikerjakan.

### Commit task

- Pesan: `feat(api): prepare covers through private requests (ACOV-005)`
- SHA: belum dibuat.
- Hook/checks: belum dijalankan untuk task ini.
- Ledger: SHA aktual dicatat pada update dokumentasi setelah commit, tanpa self-referential SHA.

### Blocker atau tindak lanjut

Persetujuan plan, freshness check dan dependensi task di atas; bukan izin untuk mulai runtime pada permintaan planning ini.

## Task: ACOV-006 — Crop geometry dan Canvas export dengan identitas payload tepat

- Status: Backlog
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

- [ ] Portrait/landscape/square/edge zoom tetap bounds dan exact 9:16; area kecil ditolak sebelum upload tanpa stretching/upscale.
- [ ] Raster actual dimensions/type/byte limit benar; File baru sesuai MIME/extension, fingerprint menghitung exact exported bytes.
- [ ] Cancel/abort/unmount/owner change melepas URLs dan mengabaikan hasil lama; File/Blob/geometry tidak dipersist ke cache atau localStorage.

### Validasi

Pure math tests untuk boundary/crop mapping dan Canvas browser fixtures untuk MIME fallback/EXIF/byte limit; root gates. Tidak menguji hanya implementation mirror.

### Hasil dan bukti

Belum diimplementasikan atau divalidasi; hasil runtime dan command aktual dicatat saat task dikerjakan.

### Commit task

- Pesan: `feat(web): add cover crop raster primitives (ACOV-006)`
- SHA: belum dibuat.
- Hook/checks: belum dijalankan untuk task ini.
- Ledger: SHA aktual dicatat pada update dokumentasi setelah commit, tanpa self-referential SHA.

### Blocker atau tindak lanjut

Persetujuan plan, freshness check dan dependensi task di atas; bukan izin untuk mulai runtime pada permintaan planning ini.

## Task: ACOV-007 — Modal crop dengan preview pada seluruh cover owner

- Status: Backlog
- Owner: Codex / pengembang proyek
- Prioritas: 7
- Referensi: ACOV-US-01; PRD media/sampul dan GR lifecycle; [plan](../plans/admin-cover-processing/implementation-plan.md).
- Diperbarui: 2026-10-06
- Dependensi: ACOV-006
- Ukuran: Kecil, satu dialog reusable

### Ruang lingkup

Integrasikan Crop cover pada card Film/Standalone/Series sebelum File masuk manager. Drag/zoom/reset/keyboard + touch dan preview; Use crop dan cancel/replacement semantics. Ikuti installed shadcn skill/primitives dan tokens existing; tidak menambah halaman.

Target: `apps/web/src/components/admin/cover-crop-dialog.tsx; UI dialog primitive bila dibutuhkan; media-upload-card.tsx; docs/design/admin-media-upload.md.`

### Acceptance criteria

- [ ] Choose/Replace cover membuka preview crop; Cancel mempertahankan selection/pointer lama; Use crop menyerahkan exact File hasil crop.
- [ ] English labels, focus trap/Escape/focus restore, keyboard position/zoom/reset, touch dan error/loading terbukti pada desktop/mobile.
- [ ] Light/Dark/System sesuai shell dan perubahan tema tidak menghilangkan crop; source video card tidak mendapat crop flow.

### Validasi

Browser 320/390/768/1024/1440, light/dark/system, keyboard dan pointer/touch emulation; screenshot aktual dan replacement/cancel/oversize tests; root gates dan docs checks.

### Hasil dan bukti

Belum diimplementasikan atau divalidasi; hasil runtime dan command aktual dicatat saat task dikerjakan.

### Commit task

- Pesan: `feat(web): add accessible cover crop dialog (ACOV-007)`
- SHA: belum dibuat.
- Hook/checks: belum dijalankan untuk task ini.
- Ledger: SHA aktual dicatat pada update dokumentasi setelah commit, tanpa self-referential SHA.

### Blocker atau tindak lanjut

Persetujuan plan, freshness check dan dependensi task di atas; bukan izin untuk mulai runtime pada permintaan planning ini.

## Task: ACOV-008 — Eden/Query preparation, Finish cover dan refresh recovery

- Status: Backlog
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

- [ ] Cover <=5MB one-part multipart existing; complete dan Prepare cover terpisah, typed dan signal-aware tanpa unsafe casts atau automatic mutation retry.
- [ ] Completed processing dapat Finish cover tanpa File setelah refresh/lost response; pending crop hanya resume exact uploaded payload atau explicit Cancel and crop again.
- [ ] Legacy original reselect dan video resume tetap; role/expiry/logout/navigation menghapus private state dan late callbacks tidak menghidupkan UI lama.
- [ ] Readonly metadata/version conflict dan Preview gate tetap benar; error permission/invalid/decode/busy/timeout actionable.

### Validasi

Manager/domain regression tests existing; browser refresh/offline/hash mismatch/expired URL/auth loss/409; API+web typed check; root gates. Query menyimpan safe DTO saja.

### Hasil dan bukti

Belum diimplementasikan atau divalidasi; hasil runtime dan command aktual dicatat saat task dikerjakan.

### Commit task

- Pesan: `feat(web): prepare and recover native cover uploads (ACOV-008)`
- SHA: belum dibuat.
- Hook/checks: belum dijalankan untuk task ini.
- Ledger: SHA aktual dicatat pada update dokumentasi setelah commit, tanpa self-referential SHA.

### Blocker atau tindak lanjut

Persetujuan plan, freshness check dan dependensi task di atas; bukan izin untuk mulai runtime pada permintaan planning ini.

## Task: ACOV-009 — Buktikan cover Ready tanpa worker dan kompatibilitas video

- Status: Backlog
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

- [ ] Ketiga owner memperoleh private WebP 1080×1920 dan verified Ready saat worker fixture mati; source tetap queued sampai worker berjalan.
- [ ] Old Ready/pending/failed posters, source/HLS, catalog/publication/preview dan cleanup successful output lulus regression.
- [ ] Race/crash/lost response/invalid inputs/busy deadline serta theme/responsive/accessibility/refresh/auth matriks memiliki hasil aktual; gap production/device dinyatakan.
- [ ] Relevant tests, check-types/lint/build, migration preservation bila relevan dan docs/diff lulus; artifacts privat atau secrets tidak masuk Git.

### Validasi

Serial guarded integration dedicated targets; built browser fixture; HEAD/hash/output dimensions/job attempts; browser screenshots; root gates. R2 staging/Safari nyata/VPS capacity tidak disimpulkan dari lokal.

### Hasil dan bukti

Belum diimplementasikan atau divalidasi; hasil runtime dan command aktual dicatat saat task dikerjakan.

### Commit task

- Pesan: `test(media): verify covers without media worker (ACOV-009)`
- SHA: belum dibuat.
- Hook/checks: belum dijalankan untuk task ini.
- Ledger: SHA aktual dicatat pada update dokumentasi setelah commit, tanpa self-referential SHA.

### Blocker atau tindak lanjut

Persetujuan plan, freshness check dan dependensi task di atas; bukan izin untuk mulai runtime pada permintaan planning ini.

## Task: ACOV-010 — Finalisasi dokumen canonical dan ledger implementasi

- Status: Backlog
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

- [ ] Proposal yang terimplementasi menjadi active/verified sesuai evidence; aturan video dan legacy retention tidak bertentangan; variable/commands/endpoints sesuai kode.
- [ ] ACOV-002–009 mempunyai SHA/checks aktual; schema/provenance/recovery/rollback dan production limitations jelas.
- [ ] docs:check, Prettier/diff dan preservation lulus; commit closure lokal tanpa push/PR/merge/deployment otomatis.

### Validasi

Canonical source/docs cross-check, bun run docs:check, Prettier changed Markdown, git diff --check, staged scope/preservation; rerun runtime gate hanya jika runtime berubah/failure baru.

### Hasil dan bukti

Belum diimplementasikan atau divalidasi; hasil runtime dan command aktual dicatat saat task dikerjakan.

### Commit task

- Pesan: `docs(media): finalize native cover processing (ACOV-010)`
- SHA: belum dibuat.
- Hook/checks: belum dijalankan untuk task ini.
- Ledger: SHA aktual dicatat pada update dokumentasi setelah commit, tanpa self-referential SHA.

### Blocker atau tindak lanjut

Persetujuan plan, freshness check dan dependensi task di atas; bukan izin untuk mulai runtime pada permintaan planning ini.
