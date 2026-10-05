# Modul: admin media upload

- Status: **draft untuk review**; planning ADUP-001 dalam review/commit, ADUP-002–015 belum diimplementasikan.
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

- Status: Review
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
- [ ] Hanya file planning/navigasi milik task committed; receipt SHA aktual dicatat sesudah commit.

### Validasi

bun run docs:check; installed Prettier; git diff --check; staged-only docs snapshot dan preservation hashes; hooks.

### Hasil dan bukti

Context disimpan sebelum plan pada snapshot di atas. Read-only Bun checks membuktikan 15 ID unik, dependencies plan/backlog identik dan DAG tanpa cycle. `bun run docs:check` lulus (55 Markdown / 466 local links), installed Prettier write/check lulus dan `git diff --check` lulus. Staged-only checkout melalui `checkDocumentation` lulus (48 Markdown / 447 links); hanya empat file planning/index masuk staging. Hash 22 file unrelated tetap sama; README lokal sebelum edit diverifikasi dan referensi desain lokal tidak ikut commit. Hook/receipt masih menunggu commit aktual. Runtime, migrasi dan desain belum dibuat.

### Commit task

- Pesan yang direncanakan: `docs(web): plan admin media uploads (ADUP-001)`.
- SHA: belum dibuat.
- Hook/checks: belum dijalankan untuk task ini.
- Ledger: catat SHA aktual setelah commit berhasil pada update dokumentasi berikutnya; jangan menulis SHA self-referential.

### Blocker atau tindak lanjut

Selesaikan docs/format/whitespace, staged snapshot dan preservation; commit task lalu catat receipt. Scope runtime masih draft untuk review.

## Task: ADUP-002 — Proof identitas file dan bounded hashing browser

- Status: Backlog
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

- [ ] Digest sama dengan oracle dan berbeda untuk isi berbeda yang metadata filenya sama.
- [ ] Hash bisa dihentikan saat auth loss/unmount dan tidak mengirim stale result.
- [ ] Memory bounded pada chunks, bukan O(file size); pilihan algoritma/dependency dan batas platform dicatat.

### Validasi

Native digest oracle + browser host proof pada ukuran kecil dan near-limit; record time/memory tanpa menyimpulkan kapasitas perangkat fisik.

### Hasil dan bukti

Belum diimplementasikan atau diverifikasi. Perintah di bagian validasi merupakan rencana, bukan hasil test yang telah dijalankan. Isi evidence aktual dan batas proof saat task dikerjakan.

### Commit task

- Pesan yang direncanakan: `test(api): adup-002 prove bounded file hashing`.
- SHA: belum dibuat.
- Hook/checks: belum dijalankan untuk task ini.
- Ledger: catat SHA aktual setelah commit berhasil pada update dokumentasi berikutnya; jangan menulis SHA self-referential.

### Blocker atau tindak lanjut

Dependencies ADUP-001 dan review scope runtime. Keputusan native/library hashing harus berdasarkan proof bounded memory, bukan asumsi.

## Task: ADUP-003 — API private owner media inventory dan rediscovery

- Status: Backlog
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

- [ ] Refresh menemukan session dan current source/poster yang benar, termasuk replacement gagal.
- [ ] Anon/non-admin/other actor/malformed owner tidak memperoleh private descriptor.
- [ ] DTO aman dan typed; old cursor/metadata/control APIs tetap kompatibel.

### Validasi

HTTP app.handle guards/invalid DTO; real dedicated PG no-media/current+replacement/failed attempt/read-only/race/actor/profile; Eden compile-only; root gates.

### Hasil dan bukti

Belum diimplementasikan atau diverifikasi. Perintah di bagian validasi merupakan rencana, bukan hasil test yang telah dijalankan. Isi evidence aktual dan batas proof saat task dikerjakan.

### Commit task

- Pesan yang direncanakan: `feat(api): adup-003 add owner media inventory`.
- SHA: belum dibuat.
- Hook/checks: belum dijalankan untuk task ini.
- Ledger: catat SHA aktual setelah commit berhasil pada update dokumentasi berikutnya; jangan menulis SHA self-referential.

### Blocker atau tindak lanjut

Dependencies ADUP-001 dan review scope runtime. Temuan proof baru diperbarui pada plan dan task terkait sebelum melanjutkan.

## Task: ADUP-004 — Schema additive expected file SHA-256

- Status: Backlog
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

- [ ] Legacy sessions/assets/auth data tetap utuh dan existing API tetap berjalan.
- [ ] Digest invalid ditolak, null legacy valid; migration rerun tidak mengubah data.
- [ ] Development journal/schema terbukti; production migration tetap rollout terpisah.

### Validasi

Dedicated migration constraints/preservation/legacy null/new hash; generate/review migration, local dev apply/preservation; API test/types/build.

### Hasil dan bukti

Belum diimplementasikan atau diverifikasi. Perintah di bagian validasi merupakan rencana, bukan hasil test yang telah dijalankan. Isi evidence aktual dan batas proof saat task dikerjakan.

### Commit task

- Pesan yang direncanakan: `feat(api): adup-004 bind expected upload checksum`.
- SHA: belum dibuat.
- Hook/checks: belum dijalankan untuk task ini.
- Ledger: catat SHA aktual setelah commit berhasil pada update dokumentasi berikutnya; jangan menulis SHA self-referential.

### Blocker atau tindak lanjut

Dependencies ADUP-002 dan review scope runtime. Temuan proof baru diperbarui pada plan dan task terkait sebelum melanjutkan.

## Task: ADUP-005 — Bind fingerprint pada initiate dan verification worker

- Status: Backlog
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

- [ ] Metadata identik dengan fingerprint berbeda menghasilkan idempotency conflict, bukan session tercampur.
- [ ] Matching file bisa resume; mismatch tidak lanjut PUT pada UI dan hasil manipulasi ditolak worker.
- [ ] Tidak ada breaking change pada legacy clients, queue retry atau valid assets lama.

### Validasi

Native HTTP request hash replay/conflict/legacy; dedicated PG immutable identity; worker mismatch/matching/legacy/no ready outputs; root gates.

### Hasil dan bukti

Belum diimplementasikan atau diverifikasi. Perintah di bagian validasi merupakan rencana, bukan hasil test yang telah dijalankan. Isi evidence aktual dan batas proof saat task dikerjakan.

### Commit task

- Pesan yang direncanakan: `feat(api): adup-005 verify upload file identity`.
- SHA: belum dibuat.
- Hook/checks: belum dijalankan untuk task ini.
- Ledger: catat SHA aktual setelah commit berhasil pada update dokumentasi berikutnya; jangan menulis SHA self-referential.

### Blocker atau tindak lanjut

Dependencies ADUP-003, ADUP-004 dan review scope runtime. Temuan proof baru diperbarui pada plan dan task terkait sebelum melanjutkan.

## Task: ADUP-006 — Desain panel Upload Media desktop/mobile light/dark

- Status: Backlog
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

- [ ] Layout dan resource conditional konsisten dengan detail halaman existing; tidak ada halaman upload baru.
- [ ] Tidak menjanjikan publish/transcode percent/manual reprocess yang belum tersedia.
- [ ] Prompts/status/review/batas raster tercatat; implementasi menunggu scope/visual approval.

### Validasi

Visual inspection/prompts/PNG/path tracking + docs/Prettier; raster bukan proof browser/contrast/touch behavior.

### Hasil dan bukti

Belum diimplementasikan atau diverifikasi. Perintah di bagian validasi merupakan rencana, bukan hasil test yang telah dijalankan. Isi evidence aktual dan batas proof saat task dikerjakan.

### Commit task

- Pesan yang direncanakan: `docs(web): adup-006 document media upload layouts`.
- SHA: belum dibuat.
- Hook/checks: belum dijalankan untuk task ini.
- Ledger: catat SHA aktual setelah commit berhasil pada update dokumentasi berikutnya; jangan menulis SHA self-referential.

### Blocker atau tindak lanjut

Dependencies ADUP-001 dan review scope runtime. Review pengguna atas desain sebelum panel runtime; mockup bukan evidence browser.

## Task: ADUP-007 — Typed media client, Query dan error mapping DRY

- Status: Backlog
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

- [ ] No server imports/secrets masuk bundle, control error bukan cached success.
- [ ] Logout/expiry membersihkan media query/mutations; public cache tetap utuh.
- [ ] Query invalidate owner/content detail/list sesudah confirmed complete tanpa mengganti dirty edit baseline.

### Validasi

Bun native client/cache/gateway/auth regression + compile-only Eden mismatches; types/lint/build.

### Hasil dan bukti

Belum diimplementasikan atau diverifikasi. Perintah di bagian validasi merupakan rencana, bukan hasil test yang telah dijalankan. Isi evidence aktual dan batas proof saat task dikerjakan.

### Commit task

- Pesan yang direncanakan: `feat(web): adup-007 add typed media controls`.
- SHA: belum dibuat.
- Hook/checks: belum dijalankan untuk task ini.
- Ledger: catat SHA aktual setelah commit berhasil pada update dokumentasi berikutnya; jangan menulis SHA self-referential.

### Blocker atau tindak lanjut

Dependencies ADUP-003, ADUP-005 dan review scope runtime. Temuan proof baru diperbarui pada plan dan task terkait sebelum melanjutkan.

## Task: ADUP-008 — File selection, validation dan fingerprint worker

- Status: Backlog
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

- [ ] Oversize/unsupported/zero file tidak membuat session; helper tidak mengklaim codec valid dari MIME.
- [ ] Fingerprint match diperlukan sebelum resume dan hasil worker stale diabaikan.
- [ ] Tidak membaca seluruh video ke satu buffer atau menyimpan File/signature ke storage persisten.

### Validasi

Native descriptor tests + browser hash/cancellation/MIME fallback/big file; conditional frozen install bila dependency hash dipilih; root gates.

### Hasil dan bukti

Belum diimplementasikan atau diverifikasi. Perintah di bagian validasi merupakan rencana, bukan hasil test yang telah dijalankan. Isi evidence aktual dan batas proof saat task dikerjakan.

### Commit task

- Pesan yang direncanakan: `feat(web): adup-008 validate selected upload files`.
- SHA: belum dibuat.
- Hook/checks: belum dijalankan untuk task ini.
- Ledger: catat SHA aktual setelah commit berhasil pada update dokumentasi berikutnya; jangan menulis SHA self-referential.

### Blocker atau tindak lanjut

Dependencies ADUP-002, ADUP-005, ADUP-007 dan review scope runtime. Temuan proof baru diperbarui pada plan dan task terkait sebelum melanjutkan.

## Task: ADUP-009 — Direct PUT transport dengan progress dan abort

- Status: Backlog
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

- [ ] Gateway menerima JSON saja; storage mendapatkan range byte part yang tepat.
- [ ] Abort menghentikan request aktif; callbacks setelah dispose tidak mengubah state.
- [ ] CORS/network/signature failures aman dan tidak logout pengguna melalui auth handler.

### Validasi

Injected transport meaningful callbacks/cancel/status + real browser direct MinIO PUT/CORS/ETag; existing storage proof tetap valid.

### Hasil dan bukti

Belum diimplementasikan atau diverifikasi. Perintah di bagian validasi merupakan rencana, bukan hasil test yang telah dijalankan. Isi evidence aktual dan batas proof saat task dikerjakan.

### Commit task

- Pesan yang direncanakan: `feat(web): adup-009 add direct multipart transport`.
- SHA: belum dibuat.
- Hook/checks: belum dijalankan untuk task ini.
- Ledger: catat SHA aktual setelah commit berhasil pada update dokumentasi berikutnya; jangan menulis SHA self-referential.

### Blocker atau tindak lanjut

Dependencies ADUP-007 dan review scope runtime. Temuan proof baru diperbarui pada plan dan task terkait sebelum melanjutkan.

## Task: ADUP-010 — Scheduler multipart, retry dan aggregate progress

- Status: Backlog
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

- [ ] Tidak lebih dari cap PUT aktif atau alokasi seluruh file; verified progress tepat dengan retries.
- [ ] Unknown PUT outcome direconcile, bukan replay sukses secara buta.
- [ ] 100% sent menampilkan finalizing; Upload completed hanya dari confirmed DTO.

### Validasi

Native scheduler injected clock/I/O (small last part, 1 part poster, concurrency, race, retry, offline, expiry) + browser MinIO partial upload.

### Hasil dan bukti

Belum diimplementasikan atau diverifikasi. Perintah di bagian validasi merupakan rencana, bukan hasil test yang telah dijalankan. Isi evidence aktual dan batas proof saat task dikerjakan.

### Commit task

- Pesan yang direncanakan: `feat(web): adup-010 schedule multipart uploads`.
- SHA: belum dibuat.
- Hook/checks: belum dijalankan untuk task ini.
- Ledger: catat SHA aktual setelah commit berhasil pada update dokumentasi berikutnya; jangan menulis SHA self-referential.

### Blocker atau tindak lanjut

Dependencies ADUP-008, ADUP-009 dan review scope runtime. Temuan proof baru diperbarui pada plan dan task terkait sebelum melanjutkan.

## Task: ADUP-011 — Resume, pause, finalization dan cancel recovery

- Status: Backlog
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

- [ ] Tidak ada completion/session ganda atau mixed source; zero byte/data corruption setelah resume terbukti.
- [ ] User tidak kehilangan hasil completed hanya karena response timeout/abort race.
- [ ] Stopped/expired/unknown states tidak menerbitkan PUT; server state/readiness tetap authority.

### Validasi

State machine/HTTP ambiguity/native race tests + reload/offline/tab conflict/different same-size file/expiry/cancel-vs-complete browser proof.

### Hasil dan bukti

Belum diimplementasikan atau diverifikasi. Perintah di bagian validasi merupakan rencana, bukan hasil test yang telah dijalankan. Isi evidence aktual dan batas proof saat task dikerjakan.

### Commit task

- Pesan yang direncanakan: `feat(web): adup-011 recover upload sessions`.
- SHA: belum dibuat.
- Hook/checks: belum dijalankan untuk task ini.
- Ledger: catat SHA aktual setelah commit berhasil pada update dokumentasi berikutnya; jangan menulis SHA self-referential.

### Blocker atau tindak lanjut

Dependencies ADUP-003, ADUP-005, ADUP-010 dan review scope runtime. Temuan proof baru diperbarui pada plan dan task terkait sebelum melanjutkan.

## Task: ADUP-012 — Shared Upload Media panel pada detail draft

- Status: Backlog
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

- [ ] Tidak ada route baru wajib atau upload di create form sebelum owner tersimpan.
- [ ] Video/poster independent namun tab transport tetap capped; changing theme tidak kehilangan attempt.
- [ ] Control/error UX sesuai API state, tanpa publish/crop/quality selector atau storage credentials.

### Validasi

Browser three kinds/read-only/loading/empty/errors + desktop/mobile light/dark widths/keyboard/labels/contrast; root gates.

### Hasil dan bukti

Belum diimplementasikan atau diverifikasi. Perintah di bagian validasi merupakan rencana, bukan hasil test yang telah dijalankan. Isi evidence aktual dan batas proof saat task dikerjakan.

### Commit task

- Pesan yang direncanakan: `feat(web): adup-012 render media upload panel`.
- SHA: belum dibuat.
- Hook/checks: belum dijalankan untuk task ini.
- Ledger: catat SHA aktual setelah commit berhasil pada update dokumentasi berikutnya; jangan menulis SHA self-referential.

### Blocker atau tindak lanjut

Dependencies ADUP-006, ADUP-007, ADUP-008, ADUP-010, ADUP-011 dan review scope runtime. Temuan proof baru diperbarui pada plan dan task terkait sebelum melanjutkan.

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

Dependencies ADUP-003, ADUP-005, ADUP-007, ADUP-012 dan review scope runtime. Temuan proof baru diperbarui pada plan dan task terkait sebelum melanjutkan.

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

Dependencies ADUP-011, ADUP-012 dan review scope runtime. Temuan proof baru diperbarui pada plan dan task terkait sebelum melanjutkan.

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

Dependencies ADUP-003, ADUP-004, ADUP-005, ADUP-006, ADUP-007, ADUP-008, ADUP-009, ADUP-010, ADUP-011, ADUP-012, ADUP-013, ADUP-014 dan review scope runtime. R2 staging, Safari/native HLS, production migrations dan kapasitas VPS tetap gerbang terpisah.

## Ledger planning

| Tanggal    | Task     | Bukti/status                                                                                    | Commit       |
| ---------- | -------- | ----------------------------------------------------------------------------------------------- | ------------ |
| 2026-10-05 | ADUP-001 | Review: context-before-plan, 15 task/DAG, docs/Prettier/diff/staged snapshot/preservation lulus | Belum dibuat |

ADUP-002–015 tetap Backlog. Status Done planning tidak berarti runtime, migrasi atau desain sudah selesai.
