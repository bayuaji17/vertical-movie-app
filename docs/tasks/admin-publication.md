# Modul: Admin Publish & Archive

> Status: **Plan approved; desain APUB-002 untuk review visual** · 7 Oktober 2026 · Pengguna menyetujui plan melalui “oke setuju”. Empat raster/state specification baru belum approved; runtime belum implemented/verified. Base SHA `313e31a14891ac0f91265a3557576b44791309d7`.

## Tujuan modul

Admin Film/Standalone mengetahui readiness, mempratinjau HLS, publish manual dan archive published melalui dashboard dengan version/idempotency/recovery yang aman. Acuan: [context](../plans/admin-publication/repository-context.md), [plan](../plans/admin-publication/implementation-plan.md), [PRD](../product/prd.md), [aturan produk](../product/global-rules.md), [workflow](../guides/development-workflow.md) dan [template](../templates/task.md). Backend publication/media evidence historical tetap pada [publication/playback](media-publication.md) dan [runbook](../operations/media.md).

Scope archive UI pertama published-only; API draft archive existing tidak dihapus. Series/episode editor/publication, katalog baru, subtitle, restore/republish, hard delete dan production rollout merupakan pekerjaan terpisah. Copy English, dokumen developer Indonesia. Dokumen ini memiliki acceptance/evidence per task; plan memiliki desain kontrak, impact/DAG/risiko dan execution history.

## User story: APUB-US-00

Sebagai pengembang, saya ingin context/plan berbasis source dan SHA agar scope/kontrak/test dapat direview sebelum implementasi.

## User story: APUB-US-01

Sebagai admin, saya ingin melihat syarat publikasi dan alasan draft belum siap agar saya dapat memperbaiki metadata atau media sebelum publish.

## User story: APUB-US-02

Sebagai admin, saya ingin mempratinjau HLS dan mengonfirmasi publish manual agar hanya konten yang siap menjadi tersedia publik.

## User story: APUB-US-03

Sebagai admin, saya ingin mengarsipkan konten published dengan memahami expiry/preservation agar akses baru berhenti tanpa klaim file dipulihkan atau hard delete.

## User story: APUB-US-04

Sebagai admin dan pengembang, saya ingin status akhir dapat dipastikan saat network/auth/version races, serta dibuktikan pada browser dan API nyata agar publication tidak ganda atau ditampilkan salah.

## Urutan dan aturan evidence

Plan telah disetujui; runtime tasks menjadi Ready ketika dependency yang relevan tersedia. APUB-003 Ready dari APUB-001, sedangkan UI tasks masih menunggu dependency/desain diterima; status bukan Blocked hanya karena belum mulai. Task menjadi Ready ketika acceptance/dependencies tersedia sesuai workflow. APUB-001 documentation-only mendapat Done setelah checks dan commit berhasil. Tidak menyatakan runtime selesai dari plan/mockup.

| Task     | Outcome                                                | Dependensi         |
| -------- | ------------------------------------------------------ | ------------------ |
| APUB-001 | Context, plan dan backlog publication                  | Tidak ada          |
| APUB-002 | Desain section Publication dan confirmation states     | APUB-001           |
| APUB-003 | Shared video publication readiness assessment          | APUB-001           |
| APUB-004 | Private GET publication readiness dan contract         | APUB-003           |
| APUB-005 | Typed Eden client untuk readiness, publish dan archive | APUB-004           |
| APUB-006 | Publication Query dan intent recovery controller       | APUB-005           |
| APUB-007 | Publication readiness panel pada detail konten         | APUB-002, APUB-006 |
| APUB-008 | Manual Publish confirmation dan result                 | APUB-007           |
| APUB-009 | Archive published confirmation dan result              | APUB-007           |
| APUB-010 | Integrasi owner upload, auth dan Preview navigation    | APUB-008, APUB-009 |
| APUB-011 | PostgreSQL parity, replay dan concurrency proof        | APUB-004           |
| APUB-012 | Browser acceptance dan real publication visibility     | APUB-010, APUB-011 |
| APUB-013 | Dokumentasi current behavior dan module closure        | APUB-012           |

API tests native bun:test/app.handle dengan injected deps; external proofs memakai dedicated PostgreSQL/MinIO/FFmpeg dan serial reset guard. Runtime tasks menjalankan relevant tests + root check-types/lint/build, docs:check bila docs berubah; freeze install jika scripts/dependency berubah. Schema baru tidak direncanakan; jika ditemukan kebutuhan nyata, refine plan lalu migration/test/development preservation sesuai AGENTS. Hasil baru selalu memiliki tanggal/scope/command/result; jangan menyalin evidence historis sebagai run baru.

## Task: APUB-001 — Context, plan dan backlog publication

- Status: Done
- Owner: Pengembang/agent pelaksana
- Prioritas: P0
- Referensi: APUB-US-00; PRD-05/06/08/09, GR-01–09 yang relevan; [step plan](../plans/admin-publication/implementation-plan.md#apub-001--context-dan-plan)
- Diperbarui: 2026-10-07
- Dependensi: Tidak ada
- Ukuran: Satu delivery dokumentasi yang reviewable

### Ruang lingkup

Simpan context berbasis SHA sebelum plan, petakan source/kontrak/runtime gaps dan susun 13 task serta navigation docs. Scope source belum diimplementasikan.

### Acceptance criteria

- [x] Context tersimpan sebelum plan dan mencantumkan full SHA, boundary dirty worktree serta evidence path/simbol.
- [x] Plan memuat desired states, kontrak readiness/mutation, DAG, risiko, recovery, test matrix, approval status dan rollback.
- [x] Setiap requirement memiliki task pemilik, acceptance criteria, dependency serta validation yang sesuai template.
- [x] Hanya dokumen milik task dan navigasi indeks baru di-stage; 22 path unrelated serta bagian indeks existing dipertahankan.
- [x] docs:check, Markdown Prettier, whitespace dan staged-only doc check lulus; commit melalui hook normal dan receipt aktual dicatat pada update berikutnya.

### Validasi

Planning: bun run docs:check; installed Prettier untuk context/plan/backlog/index; git diff --check; preservation hash comparison; staged-only documentation snapshot. Commit hooks menjalankan docs/lint/check-types. Tidak membutuhkan runtime test/build/migration untuk documentation-only.

### Hasil dan bukti

7 Oktober 2026: source dan kontrak diperiksa pada base SHA; context disimpan sebelum plan/backlog. Branch lokal `chore/admin-publication-plan` dibuat dari `313e31a14891ac0f91265a3557576b44791309d7`; tiga dokumen baru dan dua navigasi indeks di-stage terpisah dari pekerjaan desain/build existing. `bun run docs:check` lulus 65 Markdown/601 links; Prettier empat dokumen, `git diff --check` dan staged whitespace lulus. Validator staged-only snapshot lulus 58 Markdown/582 links. Dependency plan/backlog 13 task konsisten. Content hash 22 unrelated path identik; konten indeks existing identik setelah dua addition fitur dikeluarkan. Root lint lulus 1/1 dan check-types 3/3, valid Turbo cache hit karena source tidak berubah. Tidak ada source runtime, DB/storage mutation atau remote write; runtime tests/build tidak dijalankan untuk documentation-only. SHA/hasil hook actual disimpan pada receipt update setelah commit, tanpa self-reference.

### Commit task

- Pesan: `docs: plan admin publication (APUB-001)`
- SHA: `4cf00a97dffe9568a966f8889ae798fed3acdb17`.
- Hook/checks: docs65/601, staged docs58/582, Prettier/diff/preservation dan hook lint1/1/types3/3 valid cache serta Commitlint lulus; tidak ada hook dilewati.
- Ledger: SHA aktual dicatat setelah commit berhasil pada update task/dokumentasi berikutnya; tidak memakai self-referential SHA.

### Blocker atau tindak lanjut

Pengguna menyetujui plan melalui “oke setuju” pada 7 Oktober 2026. APUB-002 desain untuk review; source runtime/push/PR/merge/deploy belum dikerjakan.

## Task: APUB-002 — Desain section Publication dan confirmation states

- Status: Review
- Owner: Pengembang/agent pelaksana
- Prioritas: P1
- Referensi: APUB-US-01; PRD-05/06/08/09, GR-01–09 yang relevan; [step plan](../plans/admin-publication/implementation-plan.md#apub-002--publication-ux-dan-state-specification)
- Diperbarui: 2026-10-07
- Dependensi: APUB-001
- Ukuran: Satu state/layout specification, dengan visual review

### Ruang lingkup

Buat canonical docs/design/admin-publication.md dengan extension layout detail existing, checklist, Publish/Archive dialog dan recovery state. Referensi empat layout desktop/mobile light/dark; raster dibuat dengan skill imagegen bila task visual dijalankan, tidak pada turn planning.

### Acceptance criteria

- [x] Layout menggunakan current semantic tokens/styles, shared avatar/theme/navigation, English copy serta section placement yang konsisten.
- [x] Loading/blocked/ready/stale/pending/unknown/published/archived, rights/media-busy/version conflict dan readonly unsupported resource terspesifikasi.
- [x] Publish dialog menyatakan preview acknowledgement lokal, rights tersimpan dan konsekuensi public availability; archive menjelaskan expiry, preservation dan no restore.
- [x] Dialog/focus/Escape/Cancel/pending/live-region, ukuran target 44 px, 320/390/768/1024/1440 px dan theme switch tanpa reset intent dibahas.
- [x] Status proposed versus visual approval/runtime proof dibedakan; approval dicatat hanya bila pengguna memberikan.

### Validasi

Review four layout modes dan kedua dialog/state matrix terhadap plan serta dashboard/upload canonical. docs:check, changed Markdown Prettier dan git diff --check. Visual assets inspected bila dibuat; tidak ada runtime claim dari raster.

### Hasil dan bukti

7 Oktober 2026: freshness source base313e31a→target4cf00a9 valid, diff hanya dokumen planning. Branch feat/admin-publication dibuat dari approved planning SHA. Canonical [desain](../design/admin-publication.md) mencakup checklist, loading/stale/blocked/ready/published/archived/unknown states, confirmation Publish/Archive, retry/version/auth semantics, responsivitas dan accessibility specification. Lima built-in image_gen calls menghasilkan empat selected desktop/mobile light/dark PNG; mobile candidate dikoreksi menjadi source/cover satu kolom. Desktop light1150×1367/dark1150×1368, mobile light801×1962/dark801×1964. Inspeksi visual exact checklist labels/English coherent Draft+Ready/source+cover Ready/no Archive draft dan charcoal appearance selesai; header PNG/dimensi/SHA-256 diperiksa tanpa resize. Source/runtime/API/schema/dependency tetap tidak berubah. Visual approval belum diberikan pengguna; tests browser/device/contrast bukan hasil task desain. Checks aktual: bun run docs:check lulus66 Markdown/617 links, staged-only validator lulus59 Markdown/598 links, installed Prettier dan git diff --check lulus. SHA-256 preservation22 unrelated path dan pre-existing indeks setelah tiga fitur-only edits dinormalisasi lulus; staged diff hanya9 file milik desain/approval ledger. Local commit memakai hook normal; hasil hook/SHA dicatat update berikutnya setelah commit.

### Commit task

- Pesan: `docs: specify publication states (APUB-002)`
- SHA: dicatat pada update berikutnya setelah commit desain berhasil.
- Hook/checks: docs66/617, staged59/598, PNG header/dimensi/hash, Prettier/diff dan preservation22 lulus. Hook/Commitlint dan SHA actual dicatat setelah commit, tanpa bypass.
- Ledger: SHA aktual dicatat setelah commit berhasil pada update task/dokumentasi berikutnya; tidak memakai self-referential SHA.

### Blocker atau tindak lanjut

Plan approved. Empat mockup dan specification menunggu review visual pengguna sebelum UI APUB-007–009, sesuai APUB-002: runtime UI memakai desain yang diterima. API policy APUB-003 independen dan Ready. Tidak meminta approval ulang plan.

## Task: APUB-003 — Shared video publication readiness assessment

- Status: Ready
- Owner: Pengembang/agent pelaksana
- Prioritas: P1
- Referensi: APUB-US-01; PRD-05/06/08/09, GR-01–09 yang relevan; [step plan](../plans/admin-publication/implementation-plan.md#apub-003--shared-video-publication-assessment)
- Diperbarui: 2026-10-07
- Dependensi: APUB-001
- Ukuran: Satu shared policy dengan tests parity

### Ruang lingkup

Ekstrak assessment video existing dari PublicationService ke publication/readiness.ts dengan evidence repository yang eksplisit/injectable. CatalogStore.readyForPublish tetap compound media source of truth; existing publish memakai assessment setelah lock.

### Acceptance criteria

- [ ] Checks active draft/title/synopsis/rights actor+timestamp/verified media-duration/upload-busy/parent sesuai policy existing dan memiliki status passed/blocked/not-applicable yang stabil.
- [ ] Command dan read model memakai assessment sama; title/synopsis whitespace dan rights partial tidak lolos; original deleting/deleted dengan provenance/HLS sah tetap eligible.
- [ ] Replay sebelum/sesudah lock, hash, parent→owner lock order, timestamps, persistent operation dan after-commit invalidation tidak berubah.
- [ ] Existing domain error code/precedence dipertahankan; current active upload statuses tidak hilang; no storage/FFmpeg I/O ditambahkan.
- [ ] Tests policy/command parity menguji episode/series boundary, salah generation/job readiness, duration integer-invalid/limit dan dependency failure, bukan mirror markup.

### Validasi

bun test apps/api/src/modules/publication/readiness.test.ts; existing relevant API tests via bun run --cwd apps/api test; applicable root check-types/lint/build. Test fake evidence injected; PG parity diperdalam APUB-011.

### Hasil dan bukti

Belum dikerjakan; command di bagian Validasi merupakan rencana, bukan hasil aktual. Tidak ada commit/runtime proof untuk task ini.

### Commit task

- Pesan: `refactor(api): share publication readiness policy (APUB-003)`
- SHA: belum dibuat.
- Hook/checks: belum dijalankan untuk task ini.
- Ledger: SHA aktual dicatat setelah commit berhasil pada update task/dokumentasi berikutnya; tidak memakai self-referential SHA.

### Blocker atau tindak lanjut

API DTO/GET APUB-004; regression transaction evidence APUB-011. Tidak membuat schema baru atau memperkuat policy playback secara diam-diam.

## Task: APUB-004 — Private GET publication readiness dan contract

- Status: Backlog
- Owner: Pengembang/agent pelaksana
- Prioritas: P1
- Referensi: APUB-US-01; PRD-05/06/08/09, GR-01–09 yang relevan; [step plan](../plans/admin-publication/implementation-plan.md#apub-004--private-readiness-route-dan-dto)
- Diperbarui: 2026-10-07
- Dependensi: APUB-003
- Ukuran: Satu HTTP read capability

### Ruang lingkup

Tambahkan GET /admin/videos/:id/publication-readiness ke module publication, model strict, coherent DB snapshot dan Scalar. Koreksi summary archive existing. Wire dependency seam pada app/bootstrap hanya bila diperlukan.

### Acceptance criteria

- [ ] requireAdmin berjalan sebelum assessment/DB I/O; unauthorized/non-admin/expired diproses pipeline existing tanpa data exposure.
- [ ] DTO videoId/kind/rowVersion/publicationStatus/archivedAt/canPublish/checks whitelist; tidak membawa private object keys, signed URLs atau rights actor detail.
- [ ] GET menjalankan coherent repeatable-read snapshot, read-only tanpa mutation/upload enqueue/HEAD/signing/process.
- [ ] Missing row404, UUID/body/query contract sesuai model, dependency503 dan no-store pada success/error teruji; failure tidak disamarkan blocked DTO.
- [ ] Endpoint schemas/chaining inferred App/Scalar/Eden tersedia; summary archive mencerminkan draft/published API existing tanpa mengubah kontrak.

### Validasi

bun test apps/api/src/modules/publication/index.test.ts memakai app.handle dan injected service; guard no-I/O assertions, response schema/no-store/404/503 dan OpenAPI. Root check-types/lint/build dan existing HTTP/schema suite yang terpengaruh.

### Hasil dan bukti

Belum dikerjakan; command di bagian Validasi merupakan rencana, bukan hasil aktual. Tidak ada commit/runtime proof untuk task ini.

### Commit task

- Pesan: `feat(api): expose private publication readiness (APUB-004)`
- SHA: belum dibuat.
- Hook/checks: belum dijalankan untuk task ini.
- Ledger: SHA aktual dicatat setelah commit berhasil pada update task/dokumentasi berikutnya; tidak memakai self-referential SHA.

### Blocker atau tindak lanjut

APUB-005 frontend memakai contract yang sudah dibekukan. Read snapshot bukan reservation; POST tetap lock/recheck.

## Task: APUB-005 — Typed Eden client untuk readiness, publish dan archive

- Status: Backlog
- Owner: Pengembang/agent pelaksana
- Prioritas: P1
- Referensi: APUB-US-02, APUB-US-03; PRD-05/06/08/09, GR-01–09 yang relevan; [step plan](../plans/admin-publication/implementation-plan.md#apub-005--eden-publication-client)
- Diperbarui: 2026-10-07
- Dependensi: APUB-004
- Ukuran: Satu private command/read adapter

### Ruang lingkup

Buat publication-client/errors dan publication-eden-contract.ts dengan types derived dari existing private Eden client. Gunakan unwrapPrivateResult dan auth transition policy existing.

### Acceptance criteria

- [ ] Readiness GET/publish/archive menuju same-origin private routes dan exact strict bodies; archive tidak membawa idempotencyKey.
- [ ] PublicationDto divalidasi id/published status/positive version/dates; VideoDto archive id/archivedAt/status/version berbeda, tidak diasumsikan identical.
- [ ] Publish replay boleh menghasilkan DTO older dari state current; validation tidak menjadikan DTO parsial sebagai full detail cache.
- [ ] Malformed response/network/timeouts/5xx dikenali sebagai unconfirmed outcome; domain409/422/404 dan auth401/403 memiliki safe copy/action.
- [ ] Types hanya dari api/types/Eden; tidak mengimpor runtime API/auth server/storage into browser, tidak mempersist raw responses/keys/signatures.

### Validasi

bun test apps/web/test/admin-publication-client.test.ts; bun run --cwd apps/web auth:import:proof; check-types meliputi compile-only Eden fixture; relevant existing private client tests dan root lint/build.

### Hasil dan bukti

Belum dikerjakan; command di bagian Validasi merupakan rencana, bukan hasil aktual. Tidak ada commit/runtime proof untuk task ini.

### Commit task

- Pesan: `feat(web): add typed publication client (APUB-005)`
- SHA: belum dibuat.
- Hook/checks: belum dijalankan untuk task ini.
- Ledger: SHA aktual dicatat setelah commit berhasil pada update task/dokumentasi berikutnya; tidak memakai self-referential SHA.

### Blocker atau tindak lanjut

Query/intent/recovery APUB-006 menggunakan transport ini. Unsupported Series UI tidak didispatch sebagai video.

## Task: APUB-006 — Publication Query dan intent recovery controller

- Status: Backlog
- Owner: Pengembang/agent pelaksana
- Prioritas: P1
- Referensi: APUB-US-02, APUB-US-03, APUB-US-04; PRD-05/06/08/09, GR-01–09 yang relevan; [step plan](../plans/admin-publication/implementation-plan.md#apub-006--querystate-dan-intent-recovery)
- Diperbarui: 2026-10-07
- Dependensi: APUB-005
- Ukuran: Satu state machine mutation/current-state

### Ruang lingkup

Buat private identity/owner query keys, queries/state/use-publication. Pisahkan confirmed mutation acknowledgement, unknown outcome dan authoritative current state. Integrasikan minimal cache invalidation seam.

### Acceptance criteria

- [ ] Single pending mutex, retry false, explicit online guard dan tanpa offline reconnect queue; one stable UUID/payload per publish intent; no optimistic lifecycle update.
- [ ] Fresh GET sebelum confirm mengunci expectedVersion; perubahan snapshot memerlukan review/acknowledgement baru, tidak auto-bump version/resend.
- [ ] Lost publish response→Check status→explicit exact-key retry hanya bila current draft/version cocok; old replay setelah archived tidak membuat UI published lagi.
- [ ] Archive lost result direkonsiliasi dengan GET; archived mengonfirmasi final state, published same version boleh explicit retry expectedVersion lama; changed version harus review ulang.
- [ ] Success dan unknown outcome invalidate list/detail/inventory/readiness; failed refetch tidak mengubah confirmed POST menjadi failed dan tidak memicu duplicate command.
- [ ] Readiness polling hanya known pending/visible/online; auth/identity/owner generation mencegah stale callbacks memasukkan data; intent/key memory-only dan cleanup terdaftar.

### Validasi

bun test apps/web/test/admin-publication-state.test.ts dengan delayed responses, two commands, identity/resource change, reconnect, malformed DTO, persisted old replay, success+refresh failure dan fake query invalidation. Relevant session/cache tests, root check-types/lint/build.

### Hasil dan bukti

Belum dikerjakan; command di bagian Validasi merupakan rencana, bukan hasil aktual. Tidak ada commit/runtime proof untuk task ini.

### Commit task

- Pesan: `feat(web): reconcile publication intents safely (APUB-006)`
- SHA: belum dibuat.
- Hook/checks: belum dijalankan untuk task ini.
- Ledger: SHA aktual dicatat setelah commit berhasil pada update task/dokumentasi berikutnya; tidak memakai self-referential SHA.

### Blocker atau tindak lanjut

Panel APUB-007, dialogs APUB-008/009 dan owner upload/private-effects integration APUB-010. Tidak menambah persistent operation archive.

## Task: APUB-007 — Publication readiness panel pada detail konten

- Status: Backlog
- Owner: Pengembang/agent pelaksana
- Prioritas: P1
- Referensi: APUB-US-01; PRD-05/06/08/09, GR-01–09 yang relevan; [step plan](../plans/admin-publication/implementation-plan.md#apub-007--checklist-publication-pada-detail)
- Diperbarui: 2026-10-07
- Dependensi: APUB-002, APUB-006
- Ukuran: Satu detail panel responsive

### Ruang lingkup

Tambahkan publication-panel di content-detail, dengan freshness dari resource/query dan inventory Preview capability existing. Reuse existing Card/Alert/Skeleton/Badge/Button, tanpa page baru.

### Acceptance criteria

- [ ] Panel hanya Film/Standalone non-episode; Series/episode detail tidak memperoleh action unsupported.
- [ ] Checklist server membedakan Draft/Ready to publish/Published/Archived, dengan blocker/correction link Edit metadata/Upload media; sourceAvailability bukan proxy canPublish.
- [ ] canPublish dan canPreview berbeda; preview action mengikuti inventory, rights saved di backend dan generic VERIFIED_MEDIA tidak dibuat menjadi detail granular palsu.
- [ ] Initial/error/stale/cache mismatch menonaktifkan mutations dan memberi Refresh; previously loaded read data jelas stale, bukan capability authoritative.
- [ ] Desktop/mobile light/dark/System, long titles/status wraps, target44px, focus/aria/live-region dan placement sebelum uploader mengikuti design.

### Validasi

Manual/component spot checks matriks state dan layouts sebelum dialog integration; applicable root type/lint/build. Browser acceptance lengkap APUB-012, tanpa menulis test snapshot markup.

### Hasil dan bukti

Belum dikerjakan; command di bagian Validasi merupakan rencana, bukan hasil aktual. Tidak ada commit/runtime proof untuk task ini.

### Commit task

- Pesan: `feat(web): show publication readiness on details (APUB-007)`
- SHA: belum dibuat.
- Hook/checks: belum dijalankan untuk task ini.
- Ledger: SHA aktual dicatat setelah commit berhasil pada update task/dokumentasi berikutnya; tidak memakai self-referential SHA.

### Blocker atau tindak lanjut

APUB-008/009 menambahkan action handlers/dialog. Dirty metadata form tetap di halaman edit terpisah.

## Task: APUB-008 — Manual Publish confirmation dan result

- Status: Backlog
- Owner: Pengembang/agent pelaksana
- Prioritas: P1
- Referensi: APUB-US-02; PRD-05/06/08/09, GR-01–09 yang relevan; [step plan](../plans/admin-publication/implementation-plan.md#apub-008--publish-confirmation-dan-result)
- Diperbarui: 2026-10-07
- Dependensi: APUB-007
- Ukuran: Satu publish user flow

### Ruang lingkup

Implementasi publish confirmation dialog/handler memakai controller, fresh readiness/inventory, preview acknowledgement lokal dan explicit key. Gunakan public watch existing setelah current state confirmed.

### Acceptance criteria

- [ ] Ready draft + Preview tersedia membuka confirmation; Cancel tidak mengirim POST; checkbox review preview direset per intent dan bukan audit DB.
- [ ] Fresh metadata/readiness/inventory version dan capability tidak cocok menunda confirmation; readiness change/active upload/media-busy menampilkan blocker.
- [ ] Confirm mengirim satu POST exact version/key, semua repeat submit disabled; no autopublish dan no request inferred from merely opening dialog.
- [ ] Response success atau reconciliation displayed sebagai current server state; domain conflict dan unknown result memberi safe review/Check status/exact-retry actions.
- [ ] Open public video hanya setelah confirmed current published; copy tidak menjanjikan homepage catalog already implemented; focus/pending/error accessible.

### Validasi

Publish happy/cancel/blocker/double-click/version409/busy/not-ready/network-after-commit state proofs plus browser spot checks; root gates. Real playback visibility proof APUB-012.

### Hasil dan bukti

Belum dikerjakan; command di bagian Validasi merupakan rencana, bukan hasil aktual. Tidak ada commit/runtime proof untuk task ini.

### Commit task

- Pesan: `feat(web): publish ready films and standalone videos (APUB-008)`
- SHA: belum dibuat.
- Hook/checks: belum dijalankan untuk task ini.
- Ledger: SHA aktual dicatat setelah commit berhasil pada update task/dokumentasi berikutnya; tidak memakai self-referential SHA.

### Blocker atau tindak lanjut

APUB-010 menyelesaikan integrated auth/upload/navigation; APUB-012 acceptance. Tidak memasukkan preview ack ke POST strict body.

## Task: APUB-009 — Archive published confirmation dan result

- Status: Backlog
- Owner: Pengembang/agent pelaksana
- Prioritas: P1
- Referensi: APUB-US-03; PRD-05/06/08/09, GR-01–09 yang relevan; [step plan](../plans/admin-publication/implementation-plan.md#apub-009--archive-confirmation-dan-result)
- Diperbarui: 2026-10-07
- Dependensi: APUB-007
- Ukuran: Satu archive user flow

### Ruang lingkup

Implementasi Archive hanya untuk published Film/Standalone aktif, dengan expectedVersion-only, expiry/retention copy dan unknown-outcome reconciliation.

### Acceptance criteria

- [ ] Published active menampilkan Archive; draft/archived/series/episode tidak mendapat shortcut Archive dalam UI scope ini.
- [ ] Dialog memakai Archive/Cancel, menjelaskan new access denied, old URL expiry, retained valid files dan no restore/republish; source deleted tidak dijanjikan kembali.
- [ ] Fresh expectedVersion dan single pending request; tidak mengirim key, autopublish inverse, hard-delete atau optimistic archived badge.
- [ ] Success/current archived menjadi readonly; lost response/409/version change menjalankan GET/review, bukan silent retry dengan version baru.
- [ ] Konfirmasi final state tidak mengarang siapa/request mana yang archive; keyboard/cancel/focus/pending safe dan uploader existing mengikuti status.

### Validasi

Archive success/cancel/current-archived/stale-version409/unconfirmed-response retry dan dialogue keyboard spot checks; root gates. Anonymous new access versus previously issued URL dibuktikan APUB-012.

### Hasil dan bukti

Belum dikerjakan; command di bagian Validasi merupakan rencana, bukan hasil aktual. Tidak ada commit/runtime proof untuk task ini.

### Commit task

- Pesan: `feat(web): archive published films and standalone videos (APUB-009)`
- SHA: belum dibuat.
- Hook/checks: belum dijalankan untuk task ini.
- Ledger: SHA aktual dicatat setelah commit berhasil pada update task/dokumentasi berikutnya; tidak memakai self-referential SHA.

### Blocker atau tindak lanjut

API archive draft/episode existing tetap regression-safe tetapi UI tambahan ditunda. Restore/republish adalah roadmap terpisah.

## Task: APUB-010 — Integrasi owner upload, auth dan Preview navigation

- Status: Backlog
- Owner: Pengembang/agent pelaksana
- Prioritas: P1
- Referensi: APUB-US-04; PRD-05/06/08/09, GR-01–09 yang relevan; [step plan](../plans/admin-publication/implementation-plan.md#apub-010--integrasi-auth-upload-dan-navigation)
- Diperbarui: 2026-10-07
- Dependensi: APUB-008, APUB-009
- Ukuran: Satu closure lifecycle integrasi panel existing

### Ruang lingkup

Hubungkan intent/private-effects, owner-specific upload work selector dan cache propagation. Tambahkan Back to content details pada Preview dengan validated optional film/standalone context, tanpa mengubah player.

### Acceptance criteria

- [ ] Local owner hash/preparation/initiate/transfer/finalizing mengunci Publish; uploader resource lain tidak mengunci secara global dan local File/progress tidak dibuang oleh readiness refresh.
- [ ] Upload completions/POST publish/archive membuat appropriate current list/detail/inventory/readiness stale; editor unsaved-input/version-conflict behavior existing terjaga.
- [ ] Logout/invalid session/resource change membersihkan key/intent/effects dan stale response tidak memasukkan private data; 5xx dengan valid admin tidak memaksa logout atau menghilangkan state prematurely.
- [ ] Detail→Preview→detail return link memakai type/id tervalidasi; direct Preview refresh tanpa type tidak membuat URL salah atau membawa arbitrary return URL.
- [ ] Skill videojs dan installed instructions/docs dibaca sebelum menyentuh preview route; player source/control/renewal tidak diganti; routeTree hanya generator bila perlu.

### Validasi

Relevant existing admin content/media/session/import tests dan browser spot checks working uploads same/different owner, logout while pending, two tabs, business outage, navigation/direct refresh/theme. Root type/lint/build; generated route diff reviewed jika generator dijalankan.

### Hasil dan bukti

Belum dikerjakan; command di bagian Validasi merupakan rencana, bukan hasil aktual. Tidak ada commit/runtime proof untuk task ini.

### Commit task

- Pesan: `feat(web): integrate publication with private lifecycle (APUB-010)`
- SHA: belum dibuat.
- Hook/checks: belum dijalankan untuk task ini.
- Ledger: SHA aktual dicatat setelah commit berhasil pada update task/dokumentasi berikutnya; tidak memakai self-referential SHA.

### Blocker atau tindak lanjut

Browser acceptance APUB-012 membutuhkan real fixture/catalog invalidation. Tidak menambah BroadcastChannel publication baru.

## Task: APUB-011 — PostgreSQL parity, replay dan concurrency proof

- Status: Backlog
- Owner: Pengembang/agent pelaksana
- Prioritas: P1
- Referensi: APUB-US-04; PRD-05/06/08/09, GR-01–09 yang relevan; [step plan](../plans/admin-publication/implementation-plan.md#apub-011--postgresql-publication-regression)
- Diperbarui: 2026-10-07
- Dependensi: APUB-004
- Ukuran: Satu dedicated DB behavior suite

### Ruang lingkup

Buat media-publication-proof.test.ts menggunakan dedicated media fixture/guard, deterministic verified asset/job evidence, real transaction locks dan serial execution. Reuse relevant existing series/upload/retention tests.

### Acceptance criteria

- [ ] Readiness canPublish dan publish decision cocok untuk setiap existing gate, retained original, wrong job/asset generation dan busy upload cases; GET snapshot coherent.
- [ ] Concurrent same-key publish satu persistent operation/version/timestamp; replay sama tidak mengubah original timestamp; same key/different video/version conflict.
- [ ] Stale readiness atau rowVersion tidak bypass transaction validation; metadata/upload-completion/generation changes antara GET/POST menghasilkan current decision benar.
- [ ] Publish/archive races final row/version/visibility konsisten; archive exact old version tidak dianggap idempotency key replay; GET confirms current state.
- [ ] Series/episode parent visibility/locks dan firstPublishedAt/source-retention behavior existing tetap lulus; test tidak reset development DB/bucket atau memerlukan production migration.

### Validasi

bun test apps/api/test/integration/media-publication-proof.test.ts; bun run --cwd apps/api media:series:proof; bun run --cwd apps/api media:upload:proof serial dengan guarded test environment. Root gates setelah relevant implementation changes; catat tests/assertions/environment actual.

### Hasil dan bukti

Belum dikerjakan; command di bagian Validasi merupakan rencana, bukan hasil aktual. Tidak ada commit/runtime proof untuk task ini.

### Commit task

- Pesan: `test(api): prove publication readiness and races (APUB-011)`
- SHA: belum dibuat.
- Hook/checks: belum dijalankan untuk task ini.
- Ledger: SHA aktual dicatat setelah commit berhasil pada update task/dokumentasi berikutnya; tidak memakai self-referential SHA.

### Blocker atau tindak lanjut

Tidak menandai seluruh media backlog Review/In Progress menjadi Done dari subset proof ini. Provider/Safari/stress tetap gerbang terpisah.

## Task: APUB-012 — Browser acceptance dan real publication visibility

- Status: Backlog
- Owner: Pengembang/agent pelaksana
- Prioritas: P1
- Referensi: APUB-US-04; PRD-05/06/08/09, GR-01–09 yang relevan; [step plan](../plans/admin-publication/implementation-plan.md#apub-012--browser-acceptance-dengan-media-nyata)
- Diperbarui: 2026-10-07
- Dependensi: APUB-010, APUB-011
- Ukuran: Satu integrated browser acceptance delivery

### Ruang lingkup

Wire real PublicationService/CatalogService/invalidation pada media browser fixture dan buat admin-publication-browser-worker.mjs. Dedicated PG/random MinIO bucket, actual FFmpeg HLS/output dan controlled network/session failure injection.

### Acceptance criteria

- [ ] Film dan Standalone melalui create→upload source/cover→process→Preview→Publish→public watch→Archive; state final/rights/versions cocok API/DB.
- [ ] Anonymous before-publish catalog/detail/playback hidden; after-publish available; after-archive catalog hidden/new playback/renewal denied; previously issued signed object masih mengikuti expiry.
- [ ] Dropped/malformed response sesudah real server commit, double click, version/busy/readiness race, stale publish replay, confirmed command+failed refetch dan explicit Check status/retry terbukti.
- [ ] Mobile320/390/768 + desktop1024/1440, Light/Dark/System, long content, dialog focus/Escape/44px/live status, list/page/search retention serta direct detail/preview refresh terbukti tanpa hydration errors.
- [ ] Auth/native-versus-injected fixture boundary dicatat; session invalid/valid outage/private cleanup dan owner upload interlock teruji; no credential/signature/raw response leak.
- [ ] Cleanup hanya dedicated DB/known random bucket/fixture artifacts; built runtime acceptance lulus, dev-specific behavior dicek bila relevan; screenshots chosen saja boleh masuk docs/design dengan status runtime evidence.

### Validasi

Finalisasi actual browser harness command dari existing fixtures dan dependencies, lalu record command/result. Jalankan root check-types/lint/build serta affected test suites; built app smoke real API/PG/MinIO/worker. Jangan mengarang flag command yang belum dibuat atau mengklaim R2/Safari/production.

### Hasil dan bukti

Belum dikerjakan; command di bagian Validasi merupakan rencana, bukan hasil aktual. Tidak ada commit/runtime proof untuk task ini.

### Commit task

- Pesan: `test(web): verify admin publication flow (APUB-012)`
- SHA: belum dibuat.
- Hook/checks: belum dijalankan untuk task ini.
- Ledger: SHA aktual dicatat setelah commit berhasil pada update task/dokumentasi berikutnya; tidak memakai self-referential SHA.

### Blocker atau tindak lanjut

Jika environment tidak tersedia, catat actual blocker dan acceptance belum Done. APUB-013 menutup hanya setelah mandatory proof selesai.

## Task: APUB-013 — Dokumentasi current behavior dan module closure

- Status: Backlog
- Owner: Pengembang/agent pelaksana
- Prioritas: P1
- Referensi: APUB-US-04; PRD-05/06/08/09, GR-01–09 yang relevan; [step plan](../plans/admin-publication/implementation-plan.md#apub-013--documentation-dan-closure)
- Diperbarui: 2026-10-07
- Dependensi: APUB-012
- Ukuran: Satu canonical documentation/receipt update

### Ruang lingkup

Perbarui PRD-06, runbook media, overview dan index untuk actual verified frontend/readiness API; perbarui plan/backlog status/ledger dan batas production. Tidak membuat laporan/session copy baru.

### Acceptance criteria

- [ ] Current UI/routes/readiness/confirmation/recovery dan exact scope Film/Standalone tercatat; PRD tidak dinaikkan menjadi whole-MVP complete.
- [ ] Source/runtime versus mockup/history/production evidence tetap dibedakan; Series/episode/catalog/settings/subtitle dan external verification gates dipertahankan.
- [ ] Semua mandatory story/task AC memiliki actual command/result evidence, local commit receipt dan limitations; any implementation deviation ditulis di execution history.
- [ ] Freshness validated terhadap final target SHA/source; all applicable existing tests/check-types/lint/build evidence valid untuk source final, tanpa rerun tidak perlu jika docs-only setelah root gates.
- [ ] docs:check/Prettier/diff/staged review/hooks lulus; commit setiap task tidak self-referential; push/PR/merge/deployment hanya bila later user authorization ada.

### Validasi

Review ledger dan final-source checks dari APUB-012; docs:check/Prettier/git diff --check dan hooks. Run ulang root/runtime gate bila source/requirements berubah atau unresolved failures, bukan hanya untuk mengulang hasil yang sudah valid.

### Hasil dan bukti

Belum dikerjakan; command di bagian Validasi merupakan rencana, bukan hasil aktual. Tidak ada commit/runtime proof untuk task ini.

### Commit task

- Pesan: `docs: record verified admin publication (APUB-013)`
- SHA: belum dibuat.
- Hook/checks: belum dijalankan untuk task ini.
- Ledger: SHA aktual dicatat setelah commit berhasil pada update task/dokumentasi berikutnya; tidak memakai self-referential SHA.

### Blocker atau tindak lanjut

Actual APUB-013 SHA dicatat pada receipt update/task berikutnya setelah commit; no invented self SHA. Remote delivery tidak diotorisasi otomatis.

## Ledger dan keputusan

| Tanggal    | Task/keputusan | Status/evidence                                                                                                                          | Commit                                     |
| ---------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| 2026-10-07 | Scope priority | Pengguna menyetujui Publish & Archive Film/Standalone sebagai fitur berikutnya dan meminta plan; detail proposal belum approval runtime. | Tidak berlaku.                             |
| 2026-10-07 | APUB-001       | Done: planning artifacts, observed gates/hooks/Commitlint, preservation; plan kini approved.                                             | `4cf00a97dffe9568a966f8889ae798fed3acdb17` |

| 2026-10-07 | Plan approval / APUB-002 | Pengguna menyetujui plan; desain empat layout/state siap review visual, belum approval raster/runtime. | Commit desain dicatat update berikutnya. |

Receipt APUB-001 dicatat pada delivery desain ini setelah planning commit berhasil. APUB-002 Review; empat PNG dan specification siap visual review, bukan runtime proof. Final task SHA tidak ditulis sebagai self-reference; final response Git history atau receipt update berikutnya menyediakan actual SHA. Semua approval/task status harus dibedakan dari gerbang production.
