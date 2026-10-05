# Implementation plan: admin cover processing

## Plan metadata

- Status: **plan disetujui pengguna 6 Oktober 2026; implementasi berjalan**. ACOV-001 selesai; ACOV-002 menjadi feasibility gate pertama.
- Repository: `bayuaji17/vertical-movie-app`.
- Base ref: `feat/admin-media-upload`.
- Base SHA / last validated SHA: `06e7ce75e9d3f87bbe501bac054711310e14e5a2`.
- Implementation branch dibuat 6 Oktober 2026 dari planning receipt `8367f1781d9dba618f0117dfd0273ab0662d051d`: `feat/admin-cover-processing`.
- Context: [repository-context.md](repository-context.md), ditulis sebelum plan.
- Backlog: [admin-cover-processing](../../tasks/admin-cover-processing.md); ACOV-001–010.
- Keputusan pengguna: seluruh plan dan default teknis disetujui pada 6 Oktober 2026; ACOV-002 dapat memperbarui rincian bila proof menunjukkan batas native/browser.
- Otorisasi: implementasikan task ACOV sesuai DAG dan acceptance criteria dengan commit lokal terpisah. Push/PR/merge/deployment tetap menunggu instruksi tersendiri.

## Objective

Admin memilih gambar, mengatur crop 9:16, dan memperoleh sampul standar Ready tanpa menjalankan worker media terpisah. Bun.Image diprioritaskan di API; worker tetap menjalankan video HLS dan legacy jobs/maintenance yang sudah ada.

## Goals and non-goals

Scope: sampul Film/Standalone/Series; modal crop/reposition/zoom dengan preview; Canvas export; hash exact payload; multipart existing; awaited native API processing, recovery/idempotency/provenance; auth/theme/layout compatibility; migration/preservation; evidence dan commit per task.

Tidak termasuk: crop video, perubahan encoding/HLS, upload episode UI, publication/archive UI, filter gambar, background remover, multi-image upload, Sharp, public bucket, auto worker startup, R2 provisioning atau production rollout. Tidak ada halaman baru.

## Current behavior

Uploader ADUP sudah tersedia. Sampul source harus exact 9:16 dan minimal 1080×1920; complete menyimpan original, mengaktifkan pointer/version dan enqueue worker job. Poster worker memakai FFprobe/FFmpeg; sumber berasio lain gagal. Catalog/preview/publication mengharuskan asset ready beserta succeeded job dan output provenance.

Bun 1.4.2 sudah berhasil diuji untuk resize/WebP, tetapi tidak mempunyai crop/extract/fit cover. Business gateway timeout 10s; direct image encoding perlu jalur request dan budget terukur. File/URL browser tidak dipersist; request complete yang hilang dibaca ulang dari status.

## Desired behavior

### Alur admin dan modal

1. Choose/Replace cover membuka modal **Crop cover** sebelum File baru masuk upload manager. Confirm replacement existing tetap digunakan; membatalkan crop mempertahankan pilihan/pointer lama.
2. Modal menampilkan decoded image dengan crop frame tetap 9:16, drag/reposition, zoom dan preview. Keyboard menyediakan kontrol posisi/zoom/reset; touch/pointer didukung. English UI, Light/Dark/System, 320–1440px, focus/Escape/error/loading mengikuti shell/shadcn existing.
3. **Use crop** mengekspor Canvas menjadi File 1080×1920. WebP quality 0.95 direkomendasikan; periksa Blob.type. Bila WebP tidak didukung, fallback PNG dengan ekstensi/MIME sesuai hasil dan tetap <=5 MB. Tidak mengunggah base64 atau original browser secara diam-diam.
4. File hasil crop yang tepat dihash oleh manager existing, kemudian multipart direct PUT. Sampul <=5.000.000 byte tetap satu part. Label membedakan original yang dipilih dan payload hasil crop; preview mewakili payload upload.
5. Setelah complete/freeze confirmed, client memanggil request API **Prepare cover**, awaited. API mengunduh source hasil crop yang immutable, memverifikasi fingerprint/decode, memakai Bun.Image untuk WebP 1080×1920 quality 85, mengunggah/verifikasi output dan menandai Ready.
6. UI menampilkan Preparing cover → Ready atau error actionable. Tidak menyebut waiting for worker untuk poster request. Jika respons tidak pasti, Check status lalu **Finish cover** mengulang processing yang sama tanpa upload/File baru. Tidak autopublish; Preview tetap menunggu source/HLS dan cover verified-ready.

### Default produk dan batas verifikasi yang diajukan

| Parameter      | Rekomendasi plan                                                                                                               |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Source browser | JPG/JPEG/PNG/WebP statis, <=5 MB; rasio awal bebas. UI menolak input animasi/invalid lewat pemeriksaan format.                 |
| Crop           | Exact 9:16, dikonfirmasi admin; bukan center-crop otomatis tanpa preview.                                                      |
| Kualitas       | Crop area natural minimal 1080×1920; tanpa upscale default. Gambar terlalu kecil mendapat penjelasan sebelum upload.           |
| Output browser | Raster 1080×1920, WebP 0.95 atau PNG fallback, <=5 MB, File baru dengan filename/MIME aktual.                                  |
| Output resmi   | Bun.Image decode/autoOrient/resize/encode, WebP 1080×1920 quality 85, alpha dipertahankan; pixel/type verified setelah encode. |
| Pixel budget   | Usulan maxPixels 16.777.216 pada browser input dan API decode; output 2.073.600. Batas byte tidak menggantikan batas pixel.    |
| Executor       | Poster session baru request; source/legacy session worker. Discriminator server-owned, bukan pilihan user/browser.             |

Crop mengubah syarat sumber sampul yang dulu wajib 9:16. Syarat video tetap. Crop tidak menjadikan gambar kecil tajam; penurunan minimum/upscale bukan bagian default plan ini. Server memverifikasi **payload crop yang diterima**, bukan original browser yang tidak pernah dikirim. Pemeriksaan file browser menolak PNG/WebP animasi sebelum crop; server memeriksa agar payload PNG/WebP yang diterima statis, lalu mencocokkan format byte dengan Content-Type. Itu menjaga jalur server dari file animasi yang dikirim langsung. Bun.Image metadata tidak melaporkan frame count, jadi API memerlukan pemeriksaan container ringan untuk acTL dan flag/chunk WebP animasi. Detail parser dan malformed-container tests menjadi bagian ACOV-004/006.

### Kontrak dan pemisahan executor

Pertahankan existing initiate/status/parts/complete/abort dan JSON-only gateway. Tambah private `POST /admin/media/uploads/:id/process-poster` melalui browser `/api` prefix. Body kosong, requireAdmin/actor/owner checks dan no-store; return UploadDto dengan processing aman. GET inventory/status tetap read-only, tanpa memulai encode.

Complete tetap hanya freeze/activate/upload-completed. Untuk poster request, ia mencatat processing record durable yang dapat diambil request API, bukan worker daemon. New endpoint claim satu record, await storage/native I/O, kemudian atomically commit output/facts/Ready. Pisahkan source queue orchestration dari image domain service; route thin dan dependency injection eksplisit.

Tambahkan `processing_mode` pada upload_sessions dan `execution_mode` pada media_jobs: `worker|request`, default worker untuk preservation. Constraint request hanya poster. Server membuat session poster baru request dan source worker; replay key existing mempertahankan mode lama dan canonical hash legacy. Completion meneruskan mode persisten ke record processing. Worker claim **dan recover** hanya worker rows; request dapat recover melalui POST setelah lease expired. Migration tidak menukar executor job lama/aktif.

DTO inventory/session membawa discriminator/capability aman agar client tahu legacy vs request, serta `canProcessPoster` untuk actor session completed/owner eligible. Tidak expose key/provider/bucket/signature/lease token. Job rows request tetap memenuhi readyJobId FK, unique(asset,generation), succeeded output/facts provenance dan namespace `outputs/<asset>/<job>/<attempt>/poster.webp`. Tidak menghapus job model atau melonggarkan readiness menjadi asset.state saja.

### Request processing, timeout dan recovery

- Service memegang claim/lease/generation; hash uploaded crop dibandingkan expectedSha256 sebelum decode. Original key tidak dapat dipilih user; native S3 client/profile existing injected. Header metadata bukan proof decode; await encode terminal lalu metadata hasil dan storage HEAD.
- Usulan server env: MEDIA_POSTER_MAX_PIXELS=16777216; MEDIA_POSTER_PROCESS_CONCURRENCY=1 per API instance; MEDIA_POSTER_PROCESS_TIMEOUT_SECONDS=20 logical deadline. Busy limiter menolak cepat dengan safe retry, tidak mengantre File/buffer tanpa batas. Per-instance cap bukan global cap antar VPS.
- Gateway timeout 30s hanya route POST process-poster, berdasarkan path+method yang ketat; auth/metadata/source complete tetap 10s. Ukur waktu/range sebelum menetapkan angka sebagai verified. Dependency retry tetap manual/bounded, bukan automatic Query mutation replay.
- Native terminal tidak punya AbortSignal/hard kill terdokumentasi. Abort/deadline menghentikan I/O baru dan mencegah stale commit; pekerjaan native yang sudah mulai mungkin settle kemudian. Limiter baru release setelah terminal settle. Jangan menjanjikan hard 20s cancellation atau menjalankan fire-and-forget encode.
- Ready replay 200 tanpa output/job/pointer ganda; active claim 409; terminal invalid file actionable; transient storage/decode resources memakai bounded budget max 3 request attempts, backoff 1s/2s dan Retry-After. Tidak mengulang unsupported/decode/hash/geometry error terminal.
- Put dan verify di luar transaction. Output attempt berbeda per claim; hanya token/generation/current eligible pointer yang masih valid boleh publish Ready. Record attempt stopped/orphan; cleanup existing tidak boleh menghapus successful current output.
- API crash setelah freeze/put/before commit: GET tidak menyembunyikan outcome, POST memeriksa durable status dan reclaim lease lama; stale callback/job lama tidak mengaktifkan output. Cancel/logout menghentikan client crop/transport/request; server state yang sudah commit direkonsiliasi. Jangan mengklaim semua server work otomatis rollback saat jaringan putus.
- Published/archived/parent invalid/other actor tetap ditolak. Replacement mengikuti current pointer-on-complete existing; tidak memperkenalkan restore pointer lama ketika replacement failed.

### Browser identity dan refresh

Original File/crop geometry/Blob/object URLs/Canvas candidates hanya memory, owner/attempt-scoped; perubahan theme mempertahankan dialog/pilihan. Auth loss/navigation/cancel/unmount release URL/buffers dan mengabaikan late decode/export callback. Blob/URL tidak masuk Query/mutation variables/persistence.

Fingerprint adalah **byte payload hasil crop**, bukan original browser. Tidak menganggap crop ulang menghasilkan byte identik lintas browser/encoder/version. Pending new cropped session setelah refresh hanya dapat resume jika admin mempunyai File hasil crop yang identik; jika tidak, Check status lalu Cancel and crop again. UI menjelaskan ini; tidak mencoba mengupload original ke partial session hasil crop. Completed session dengan processing tertunda tidak butuh File untuk Finish cover. Legacy pending masih memakai original full-hash reselection existing. Video resume tidak berubah.

## Impact analysis / affected files and symbols

Planned set, bukan source yang telah diubah. Target baru dibuat hanya pada owning task.

| Path                                                                                                                           | Action                          | Symbols / reason                                                                | Evidence                                      |
| ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------- | ------------------------------------------------------------------------------- | --------------------------------------------- |
| `apps/api/src/db/schema/{upload,jobs}.ts`; `apps/api/drizzle/<generated-next>*`                                                | modify/create                   | Persistent executor, legacy preservation                                        | uploadSessions/mediaJobs/readiness FK         |
| `apps/api/src/modules/media/{index,model,service,repository}.ts`                                                               | modify                          | Mode/capability, process-poster route, completion/replay/claims                 | MediaService.complete/enqueue                 |
| `apps/api/src/modules/media/{poster-image,poster-processing}.ts`                                                               | create                          | Bounded native transform and request orchestration                              | Native Image proof, runner/transcode policy   |
| `apps/api/src/config/poster-env.ts`, `config/env.ts`, `index.ts`                                                               | create/modify                   | Env/explicit image/storage service factories                                    | API bootstrap/dependency conventions          |
| `apps/api/src/workers/queue.ts`, `cleanup.ts`                                                                                  | modify                          | Worker-only claim/recover; compatible request attempt cleanup                   | createMediaQueue/createMediaCleanup           |
| `apps/api/src/shared/media-readiness.ts`; catalog/publication/playback tests                                                   | modify if needed                | Preserve output proof and legacy/new compatibility                              | posterReadiness/CatalogStore.ready            |
| `apps/web/src/lib/admin/{cover-crop,cover-raster}.ts`                                                                          | create                          | Pure crop bounds and browser Canvas/decode/File lifecycle                       | media-file/upload-manager identity boundaries |
| `apps/web/src/components/admin/cover-crop-dialog.tsx`; UI dialog primitive                                                     | create                          | Accessible modal/reposition/zoom/preview                                        | shadcn existing Base UI/theme                 |
| `apps/web/src/components/admin/media-{upload-card,panel,processing-status}.tsx`                                                | modify                          | Crop entry + request Preparing/Ready/Finish states                              | Current uploader cards                        |
| `apps/web/src/lib/admin/{media-client,media-queries,media-errors,media-file,media-state,upload-manager,use-upload-manager}.ts` | modify                          | Typed processing, signals, exact cropped identity and recovery                  | Eden/Query/manager existing                   |
| `apps/web/src/lib/server/{business-gateway,auth-gateway}.ts`; gateway tests                                                    | modify                          | Method/path-scoped processing budget                                            | gateway default 10s                           |
| Native module tests / web crop tests / guarded media integration / existing media browser harness                              | create/modify                   | No-worker cover, fault/race/compatibility/layout proof                          | ADUP suites/dedicated fixtures                |
| `apps/api/.env.example`; `docs/guides/{environment,api-development}.md`; runbook/media contract/PRD/design/index               | modify on owning task + closure | Settings/behavior become active with code; canonical synchronization at closure | Canonical ownership                           |
| This plan/context and `docs/tasks/admin-cover-processing.md`                                                                   | create/update                   | Stable ACOV IDs/evidence/receipts                                               | Root workflow/template                        |

## Implementation DAG

```text
ACOV-001 planning
  └─ ACOV-002 native/browser feasibility + policy proof
       ├─ ACOV-003 executor schema
       ├─ ACOV-004 native image adapter
       └─ ACOV-006 crop math/raster lifecycle
ACOV-003 + ACOV-004 → ACOV-005 private request processor/API/gateway
ACOV-006 → ACOV-007 crop dialog/card integration
ACOV-005 + ACOV-007 → ACOV-008 typed preparation/readiness/recovery
ACOV-008 → ACOV-009 end-to-end + regression
ACOV-009 → ACOV-010 canonical docs/receipts closure
```

Dependencies bukan instruksi delegasi. Kerjakan task kecil satu per satu; commit setelah AC/gates lulus.

## Implementation steps

Rincian target/requirements/AC/validasi masing-masing task menggunakan template pada [backlog](../../tasks/admin-cover-processing.md). Outcomes:

| ID       | Outcome                                                                                 | Depends on         |
| -------- | --------------------------------------------------------------------------------------- | ------------------ |
| ACOV-001 | Context-before-plan, task/DAG, proposal dan preservation tercatat                       | tidak ada          |
| ACOV-002 | Proof native/backend/browser dan policy limitations dituntaskan                         | ACOV-001           |
| ACOV-003 | Generated executor migration, legacy/dev preservation terbukti                          | ACOV-002           |
| ACOV-004 | Injected native image adapter tervalidasi tanpa subprocess/Sharp                        | ACOV-002           |
| ACOV-005 | Request endpoint dengan durable claims/provenance, worker exclusion dan bounded gateway | ACOV-003, ACOV-004 |
| ACOV-006 | Crop math/Canvas/File/abort identity primitives                                         | ACOV-002           |
| ACOV-007 | Modal crop accessible, English/themes/responsive dan card selection                     | ACOV-006           |
| ACOV-008 | Eden/Query prepare/finish/readiness/refresh/auth integration                            | ACOV-005, ACOV-007 |
| ACOV-009 | Real PG/MinIO/API cover Ready saat worker mati; legacy/video/regression                 | ACOV-008           |
| ACOV-010 | Canonical docs/status/task SHA/quality/preservation closure                             | ACOV-009           |

## Test requirements

- Native feasibility: JPEG/PNG/WebP valid; orientation/alpha, cropped dimensions, hash mismatch, byte/pixel limits, unsupported actual MIME, APNG/animated WebP, truncated/damaged files. Document Bun permissive behavior; bounded parser/policy checks if native lacks animation info, without claiming original-browser server proof.
- Crop: portrait/landscape/square area math 9:16, bounds/minimum/no-upscale; actual Canvas encode/MIME fallback/dimensions, real preview/cancel/reset, replacement kept, wrong payload fingerprint rejected, late callback after owner/auth change ignored.
- HTTP/DB: admin actor/UUID/profile/owner/status, source rejected by process route, exactly one processing record, simultaneous process/complete/abort/new replacement, active/expired lease, crash after output-beforecommit, failed output HEAD/hash, transient retries exhausted, stale fence, readonly GET. Worker never claims/recover request records.
- Compatibility: existing request hash replay and pending sessions stay worker; old Ready posters/catalog/publish/HLS remain usable; pending/failed legacy jobs unaffected. No job backfill/downgrade or source/HLS rule changes.
- Built browser PG/MinIO: all 3 cover owners with worker stopped → Ready; video source queued until worker starts; source/legacy worker proof then passes. Verify output WebP 1080×1920/hash/HEAD/provenance/private GET, header/gateway budget, no bytes in gateway/control cache.
- UI: 320/390/768/1024/1440 × Light/Dark/System, keyboard/touch-emulation/focus/zoom/position; dark and light actual screenshots; no private persistence, offline/refresh recovery, role/expiry/logout/back denial, dirty metadata 409 preserved, Preview gate.
- Gates at task completion: relevant Bun tests, root check-types/lint/build, frozen install if dependencies/scripts change, docs/Prettier/diff. DB suite serial dedicated target; migration official development backup/journal/preservation. No parallel build/reset while browser fixture active.

## Constraints

Prefer Bun native; no automatic dependency upgrade, lock churn or hand-edited routeTree. Storage remains private MinIO/R2 config existing. Browser crop is a client transform, server authority is on received bytes and verified output. Direct native processing must be awaited and persisted; do not replace worker with untracked background promises. Keep existing tracked/untracked 23 paths intact and partial-stage index. Player source unaffected, so no playback redesign/install.

## Acceptance criteria

- [ ] Admin can crop all 3 cover owners to 9:16 with preview, without a new page or video-crop action.
- [ ] Valid new cover reaches Ready with media worker stopped; server-native WebP 1080×1920 verified before readiness.
- [ ] No worker claims request rows; legacy/video outputs and original fingerprints remain compatible.
- [ ] Exactly one successful provenance record/output activation under replay/race/crash; no Ready from unverified facts or stale attempts.
- [ ] Browser crop/hash/upload lifecycle is bounded, theme-safe and cleared on auth loss; refreshed pending crop never mixes original bytes.
- [ ] Metadata/publish/preview gates remain correct; invalid images show actionable errors.
- [ ] Relevant tests/migration/dev preservation/root gates, screenshots/docs and per-task local receipts complete; production limitations explicit.

## Risks and mitigations

Native API misses crop/animation/cancellation: browser crop, server payload format guards, targeted feasibility gate, await terminals and fence late results. CPU/RAM in API: pixel/input/concurrency caps and measured limits; no whole-video decode in API. Double encoding: browser high-quality raster then final WebP 85; visual comparison on real covers before closure. Small originals still fail quality: explain crop minimum/no-upscale before network. Refresh cannot reproduce bytes reliably: exact payload resume only or explicit cancel/restart, completed processing recover without File. Legacy/provenance coupling: additive executor mode with historical rows retained and catalog regression. Gateway 10s: scoped request budget with ambiguous result reconciliation, no auth timeout expansion.

## Rollback or recovery

Generated migration additive/default worker; restore image UI/service by reverting relevant local feature commits, not deleting assets/jobs. Before downgrade, finish/fail request-mode records or use explicit maintenance procedure: old worker binaries without executor filter must not run against outstanding request jobs. Preserve Ready outputs and archived files; no blanket bucket cleanup or migration reversal. Production rollout/recovery needs separate authorization.

## Evidence

[Context](repository-context.md#evidence-index) maps current behavior to source symbols at immutable SHA. [Bun Image](https://bun.sh/docs/runtime/image) documents native resize/encode/off-thread awaited terminals; local runtime/types confirm no crop or frame-count metadata. [Canvas drawImage](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage) provides source-rectangle crop, not server policy verification. Google's [WebP RIFF container](https://developers.google.com/speed/webp/docs/riff_container) defines the animation flag/chunks. The [official animated WebP sample](https://www.gstatic.com/webp/animated/1.webp) has 100 ANMF frames; runtime evidence is in the backlog.

## Open decisions

Tidak ada keputusan produk yang menunggu persetujuan awal; plan dan default disetujui pengguna 6 Oktober 2026. ACOV-002 memvalidasi batas teknis. Revisi akibat proof dicatat sebelum dependensi implementasi memakai asumsi baru. Server memverifikasi payload crop yang diterima; browser menolak original animasi karena original tidak dikirim ke API.

## Validation history

### 2026-10-06 — planning freshness

- Result: valid for planning/review.
- Base/current target SHA: `06e7ce75e9d3f87bbe501bac054711310e14e5a2`.
- Checked paths: root/index/guides/product/template, media/schema/worker/readiness/catalog/storage/bootstrap, web manager/client/card/gateway and native types/probe.
- Relevant runtime changes since snapshot: none at planning start; source freshness rechecked sebelum implementation. 23 unrelated worktree paths preserved.
- Recheck mode/gateway/provenance/native behavior before implementation or branch checkout; plan commit itself may change target SHA without invalidating source evidence.

### 2026-10-06 — approval and implementation freshness

- Pengguna menyetujui seluruh plan/default; branch `feat/admin-cover-processing` dibuat dari planning receipt `8367f1781d9dba618f0117dfd0273ab0662d051d`.
- Recheck diff dari source snapshot `06e7ce75e9d3f87bbe501bac054711310e14e5a2` menunjukkan tidak ada perubahan pada `apps/`, manifests atau lockfile sebelum ACOV-002. Perubahan README/design/docs task lain tetap tidak di-stage.
- Browser feasibility berjalan pada Chrome 154 di Windows; native proof berjalan pada Bun 1.4.2 Linux x64. Pengukuran fixture sintetis bukan benchmark VPS/production.

## Execution log

- 2026-10-06: context saved before plan; stable 10-task backlog approved and implementation started on `feat/admin-cover-processing`. ACOV-002 feasibility tests, Chrome/native proof and root gates passed 6 October 2026; task commit SHA is recorded after commit.
- Planning checks 2026-10-06: `bun run docs:check` passed (59 Markdown, 514 local links/anchors); Prettier four owned Markdown passed; `git diff --check` passed; audit 10 unique task IDs, matching acyclic dependencies/template sections passed; 22 unrelated file hashes + existing README design links retained. Staged documentation/commit receipt follows ACOV-001; tests above remain planned runtime proof.

- 2026-10-06: ACOV-001 Done, task commit `693b557031c59d6ae0ab2d013c54a4bc38625e7e`. Hook docs/lint/check-types/Commitlint passed (lint/types cache hits). Staged export: 52 Markdown, 495 local links/anchors, zero errors. Freshness: source apps/packages/manifests/lock tidak berubah dari base ke commit planning; runtime ACOV-002–010 belum dimulai. Receipt tersimpan pada update dokumentasi sesudah commit task.

- 2026-10-06: ACOV-002 Done, task commit `7111d524816d62f33882d2efbc967648c87a3e5a`. Eight feasibility tests plus four existing policy tests pass (12 tests/39 expectations); root check-types/lint/build/docs/format/diff pass. Commit hook docs/lint/check-types/Commitlint passed. Chrome 154 Canvas and Bun 1.4.2 Linux x64 proof established static-image/MIME-guard contract for ACOV-003 onward. The native timing/RSS samples are synthetic fixtures, not production benchmarks.

- 2026-10-06: ACOV-003 Done, task commit `edd4d7e`. Generated `0010_poster-execution-mode`; dedicated executor migration proof1/14, fingerprint regression1/15, publication migration1/10, API unit86/335, root check-types/lint/build passed. Development backup verified (64,168 bytes/143 archive entries, mode0600); official migration command advanced journal10→11. SHA-256/counts for all17 app tables unchanged; all three legacy sessions and all three jobs remain worker. Commit hook docs/lint/check-types/Commitlint passed.

- 2026-10-06: ACOV-004 Done, task commit `0b7a6e2`. Added awaited Bun.Image processor and API env defaults (16,777,216 pixels, concurrency1/max4 per instance, logical deadline20s); rejects oversized, mismatched hash/MIME, malformed/animated, wrong-ratio, undersized and over-pixel inputs; verifies static WebP output 1080×1920/hash before return. Native fixtures verify alpha. Timeout/abort rejects response while retaining the limiter slot until the uncancellable native terminal settles; no request endpoint is wired before ACOV-005. Targeted config/adapter tests24/79, API suite99/395, root check-types3/3, lint1/1, build2/2, docs59/514, Prettier/diff and commit hook passed. No database schema or dependencies changed; no migration/install required.

- 2026-10-06: ACOV-005 implementation complete; task commit receipt follows the task commit. Added private POST process-poster, request-mode completion, bounded Bun S3 read, awaited Bun.Image, output HEAD+readback/hash, output facts, three-attempt durable retry, lease recovery, status/capability DTO and Retry-After. Worker claim/recovery now filter worker mode; cleanup preservation is proven. Exact POST gateway budget is30s; all other/auth defaults remain10s. Dedicated PostgreSQL tests6/48 + worker exclusion1/5; API suite101/409; web suite117/474; app.handle and exact gateway timeout policy tests pass. Root check-types, lint, build pass. Storage is fake for this proof; MinIO/R2 poster integration and browser crop UI remain unverified and are covered by ACOV-006–009. No schema/dependency or development DB changes.
