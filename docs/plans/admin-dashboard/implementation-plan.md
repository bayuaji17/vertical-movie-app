# Implementation plan: ringkasan dashboard admin

## Plan metadata

- Status: approved/executing; pengguna menyetujui plan pada 8 Oktober 2026. Runtime dikerjakan bertahap.
- Tanggal: 2026-10-08. Pengguna memilih dashboard terlebih dahulu dan meminta plan; metrik/layout rinci disetujui melalui approval plan pengguna.
- Repository: `bayuaji17/vertical-movie-app`; base ref `main`.
- Base SHA dan last validated SHA: `65fcc2b58d5b316e8c44b2d99e28baf2e90e4f8c`.
- Context: [repository-context.md](repository-context.md), disimpan sebelum plan.
- Backlog: [admin-dashboard](../../tasks/admin-dashboard.md), task DASH-001–011.
- Planning branch: `chore/admin-dashboard-plan`; candidate implementation branch setelah approval/freshness: `feat/admin-dashboard-summary`.

## Objective

Admin membuka `/admin` dan memahami inventori konten, job media current yang menunggu/diproses/gagal, serta konten terbaru dan tujuan penanganannya melalui data aktual yang aman dan dapat direfresh.

## Goals and non-goals

Scope: empat ringkasan tipe konten, breakdown editorial, current-job counters, maksimal5 current failed jobs, maksimal8 konten top-level terbaru, navigasi detail existing, refresh/stale/offline/error dan session-safe state. Pertahankan Create draft/View content, shell, identitas akun dan tema existing.

Pengaturan situs, pengelolaan genre, archive baru, global job monitor/pagination/search, manual retry/reprocess, analytics/view counts/revenue/time-series charts, playback/upload baru, perubahan public catalog/lifecycle dan rollout production merupakan modul terpisah. Tidak perlu endpoint write baru.

## Current behavior

Dashboard tidak memanggil data bisnis; endpoint content list hanya satu jenis per page. API belum mempunyai dashboard summary. Schema existing cukup untuk agregasi awal. Media/upload history dan editorial published tidak sama dengan current jobs atau public playable. Lihat [context](repository-context.md#domain-and-data-model).

## Desired behavior

### Definisi hitungan yang diusulkan

| Section                            | Definisi dan satuan                                                                                                                                                                                                                                                                                            |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Film, Standalone, Series, Episodes | Satu owner row dihitung sekali sesuai jenisnya; total mencakup semua editorial states termasuk archived. Episode tetap unit tersendiri, bukan ditambahkan ke jumlah Series                                                                                                                                     |
| Breakdown per jenis                | `total = draft + published + archived + unpublished`; archivedAt/status archived mempunyai precedence. Unpublished untuk Series non-archived existing dipertahankan sebagai label tersendiri; video unpublished selalu0 menurut schema                                                                         |
| Published                          | Editorial published, termasuk episode di parent draft/archived. Helper English menjelaskan bahwa Published belum tentu publicly available; tidak mengklaim jumlah konten playable                                                                                                                              |
| Parent archive                     | Counts episode mengikuti state row episode sendiri. Archive parent tidak membuat child row otomatis archived; UI helper menjelaskan perbedaan ini                                                                                                                                                              |
| Media jobs                         | Empat counts `queued`, `running`, `retry`, `failed`; unit adalah job source/cover current, bukan jumlah konten/attempt. Source dan cover satu konten dapat menghasilkan dua job                                                                                                                                |
| Current job predicate              | Owner pointer harus menunjuk asset dengan owner/kind yang benar dan job `(assetId,generation)` cocok. Owner non-archived; episode harus mempunyai season dan Series non-archived. Include worker dan request poster; history/replaced generation/attempt rows/succeeded/cancelled tidak mengisi empat counters |
| Needs attention                    | Maksimal5 job failed dari predicate yang sama, `updatedAt DESC, id DESC`; title, owner type/id, role Source/Cover dan canonical detail target. Failure stderr/storage keys/signatures tidak dikirim; tidak ada tombol reprocess                                                                                |
| Latest content                     | Maksimal8 Film/Standalone/Series non-archived, `createdAt DESC, id DESC, type ASC`; label Latest created, bukan activity/audit history. Episode dikelola melalui parent atau Needs attention link                                                                                                              |

Job state merupakan snapshot database; Running tidak menjanjikan proses masih hidup/lease sehat. Succeeded tidak diberi label Ready/Publishable dari hitungan sederhana. Tidak memanggil readiness/presign/HEAD/FFmpeg untuk setiap owner. Tidak memfilter hanya public-visible rows pada private inventory.

### Proposed API contract

`GET /admin/dashboard/summary`, tanpa query filter/pagination. Response200 berbentuk `{ generatedAt, content, media, latestContent, failedMedia }`: `content` berisi empat named kinds dengan status counters, `media` empat job counters, latest maksimal8 dan failed maksimal5. Timestamp ISO UTC dari snapshot server. Counts integer nonnegative dan safe untuk JSON/JavaScript; hasil database di luar safe range menyebabkan safe503, bukan silent rounding. `film` adalah tipe UI untuk `videos.kind=movie`.

Latest item whitelist: type/id/title/publicationStatus/createdAt; failure item whitelist: owner type/id/title, kind, role dan Series UUID untuk episode route. Web menyusun typed canonical Link dari IDs; tidak menerima arbitrary URL dari server. API model strict dan derived types melalui Eden. Client memvalidasi bounds/identity/timestamp/counter invariants sebelum caching success.

Native admin guard sebelum repository; 401 missing/expired/revoked,403 wrong role/banned,422 invalid query,503 auth/database/config unavailable. Header semua paths `private, no-store`. Module mengembalikan typed200 melalui service tanpa global payload wrapper; OpenAPI security/unique operationId. Fixed gateway `/api/admin/dashboard/summary` memakai allowlist admin existing (verify dalam DASH-004), tidak menambah open proxy.

Agregasi dan dua bounded lists dibaca dalam satu repeatable-read/read-only transaction pada existing pool, tanpa row locks/writes/network storage. Counts dilakukan SQL sebelum limit; jumlah statement fixed tanpa per-row/per-page scan dari browser. Query plan dan data >100 dibuktikan; index/migration hanya jika bukti memerlukan refinement terpisah.

### Proposed UI and state

Gunakan `/admin` dan English shell existing. Heading/subtitle ringkasan, Create draft/View content, empat cards jenis dengan total/breakdown, current-media status grid, Needs attention list, Latest created list dan account section compact. Desktop memakai grid empat/two columns sesuai ruang; mobile cards/list bertumpuk tanpa table overflow. Token shadcn Base UI Rhea existing, Light/Dark/System, tanpa charts/poster/player atau angka dummy runtime.

Counts bukan tombol filter status: content list belum mendukung filter tersebut. View films/standalone/series memakai `contentSearch` type existing; Episodes card menjelaskan pengelolaan melalui Series. Latest link menuju `/admin/content/$type/$id`; failed episode menuju `/admin/series/$seriesId/episodes/$episodeId`; failed Film/Standalone/Series menuju detail type yang sesuai. Tidak membuat episode global route.

Client-only summary read setelah protected layout/session, mengikuti admin query existing. SSR merender shell/skeleton, tidak serialize private summary atau cookie dalam singleton. Key `['admin', identity, 'dashboard', 'summary']`, signal forwarding, retry:false, staleTime15s dan gcTime5min. Mount/focus/reconnect stale revalidate. Poll30s hanya saat mounted/visible/online dan pembacaan terakhir sukses; error menghentikan polling sampai explicit Retry atau focus/reconnect recovery. Manual Refresh deduplicated dan disabled saat offline/in-flight. Stop/abort/remove pada logout/expiry/role loss; response sesi lama tidak boleh mengisi ulang cache.

| State                 | Perilaku                                                                                                                |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Initial loading       | Skeleton tanpa angka0 palsu; shortcut tetap tersedia                                                                    |
| Success empty         | Counts0 nyata; empty copy latest/failed, Create draft tersedia                                                          |
| Refresh pending       | Data lama tetap terlihat dengan refreshing indicator, tidak mengganti timestamp success sebelumnya                      |
| Refresh error/offline | Data terakhir diberi stale/offline + waktu snapshot; safe error dan Retry. Tanpa data tampil unavailable, bukan totals0 |
| Auth loss             | Protected layout menghentikan private effects dan clears data; tidak mempertahankan private counters/list sebagai stale |
| Large/long data       | Counts besar ditampilkan tanpa hilangnya nilai, judul panjang wrap, lists bounded8/5 dan navigasi keyboard44px          |

Same-session mutations confirmed menginvalidasi dashboard (metadata/create/grouping/season/archive existing, upload completion/abort/poster processing dan publication). Mark stale dengan `refetchType:'none'` jika dashboard tidak aktif; jangan memfetch dashboard selama upload detail hanya untuk memperbarui angka. Worker/external writes teramati melalui refresh/poll, bukan diakui real-time. Lost/failed commands mengikuti reconciliation existing sebelum invalidation; tidak mengubah POST/idempotency behavior.

## Impact analysis

Modul baca baru di API dan komponen dashboard web, bukan perubahan schema/lifecycle. Query invalidators shared menjadi regression surface terbesar; perubahan hanya menambahkan scoped dashboard key. Auth tetap di `@repo/auth`, tidak membutuhkan konfigurasi baru. Root docs akan mencatat PRD-02 partial: summary implemented tidak berarti settings sudah selesai.

## Affected files and symbols

| Path                                                                                                                | Action | Symbols/reason                                                    | Evidence                                        |
| ------------------------------------------------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------- | ----------------------------------------------- |
| `apps/api/src/modules/dashboard/{model,repository,service,index}.ts`                                                | create | Summary contract, snapshot aggregates, service/guarded controller | content module/repository and schema in context |
| `apps/api/src/modules/dashboard/*.test.ts`                                                                          | create | HTTP/model/mapping/cancellation/dependency behavior               | native API guide                                |
| `apps/api/src/{app,index}.ts`                                                                                       | modify | Static module composition and existing-pool DI                    | `createApp`, bootstrap                          |
| `apps/api/test/integration/admin-dashboard-proof.test.ts`                                                           | create | Dedicated SQL/native auth/snapshot/generation proof               | guarded content fixture                         |
| `apps/web/src/lib/admin/dashboard-{client,queries}.ts`                                                              | create | Type-only Eden, strict response, scoped query/poll/invalidation   | content/media clients/queries                   |
| `apps/web/src/hooks/use-dashboard-summary.ts`                                                                       | create | Owner/session private lifecycle                                   | existing principal/private-effects              |
| `apps/web/src/components/admin/dashboard-*.tsx`                                                                     | create | Summary/recent/media/attention/state components as needed         | current AdminDashboard and UI primitives        |
| `apps/web/src/routes/admin._authenticated.index.tsx`                                                                | modify | Dashboard composition                                             | current route                                   |
| `apps/web/src/lib/admin/{content,series,media,publication,owner-publication}-queries.ts`                            | modify | Confirmed mutation invalidation integration                       | existing helpers/callers                        |
| `apps/web/test/admin-dashboard-*.test.ts`, `admin-dashboard-eden-contract.ts`, `admin-dashboard-browser-worker.mjs` | create | Transport/query/domain/navigation/type/browser proof              | current web test patterns                       |
| `apps/web/test/auth-browser-smoke.mjs`, API browser fixture as needed                                               | modify | Explicit dashboard phase with dedicated data                      | existing harness                                |
| `docs/design/admin-dashboard.md`                                                                                    | create | English layout/state spec, draft vs verified status               | approved existing shell/themes                  |
| `docs/product/prd.md`, `docs/architecture/overview.md`, `docs/operations/video-metadata.md`, `docs/README.md`       | modify | Current behavior/endpoint/evidence navigation after verification  | canonical owners                                |
| This context/plan and `docs/tasks/admin-dashboard.md`                                                               | create | Canonical proposal, DAG and execution evidence                    | user planning request                           |

Paths are candidate targets; create folders only when their task needs them. `routeTree.gen.ts` is not hand-edited. No env/dependency/shared-package change identified.

## Implementation DAG

```text
DASH-001 → DASH-002 → DASH-003 → DASH-004 → DASH-005 → DASH-006 → DASH-007
DASH-005 → DASH-008
DASH-004 → DASH-009
DASH-006 + DASH-007 + DASH-008 + DASH-009 → DASH-010 → DASH-011
```

Dependencies express ordering; they do not authorize subagents or concurrent DB resets/builds.

## Implementation steps

Each step has one outcome, paths, requirements, validation and acceptance criteria in the [canonical backlog](../../tasks/admin-dashboard.md). These IDs and dependencies are fixed for this proposal.

### DASH-001 — Context, plan dan backlog

- Outcome: Reviewable snapshot/metrics/layout/AC before runtime.
- Depends on: none.
- Files/symbols: context, this plan, backlog, docs index.
- Requirements: Record user priority, distinguish editorial/public and jobs/owners, preserve unrelated23 paths.
- Validation: docs:check, scoped Prettier, DAG/ID validation, diff, staged docs and normal hooks.
- Acceptance criteria: Context saved first; all runtime tasks remain unimplemented and detailed scope awaits review.

### DASH-002 — Layout dan state specification

- Outcome: Concrete English responsive layout and interactions using existing primitives.
- Depends on: DASH-001.
- Files/symbols: `docs/design/admin-dashboard.md`, plan/backlog/index.
- Requirements: Four kinds, Series unpublished/archive rules, jobs units, latest8/failed5, stale/offline/focus/refresh/auth-loss states; no unsupported filter or mutation buttons.
- Validation: Requirement-to-browser matrix, docs/format/diff and hooks. Raster mockup only if requested separately; no new design dependency required.
- Acceptance criteria: Every label/counter/link/state mapped to a testable outcome; distinguish spec from implemented UI.

### DASH-003 — Repository dan domain aggregate

- Outcome: Accurate snapshot without storage/FFmpeg I/O or N+1.
- Depends on: DASH-002.
- Files/symbols: dashboard model/repository/service and native tests.
- Requirements: Content partition, current owner/generation job predicate, executor parity, stable bounded lists, safe numeric/timestamp mapping, DI and read-only transaction.
- Validation: Native behavior tests and root types/lint/build; actual PostgreSQL proof follows DASH-009.
- Acceptance criteria: No fake zeros on dependencies/malformed results; no writes; no historical attempts counted.

### DASH-004 — Private endpoint, DI dan OpenAPI

- Outcome: Typed admin GET available through existing gateway.
- Depends on: DASH-003.
- Files/symbols: dashboard index/model tests, app/index composition, relevant native HTTP/OpenAPI/gateway tests.
- Requirements: Guard before repository, strict query/DTO/errors, private no-store, unique operationId/security, import-only factory and type-preserving chaining.
- Validation: `app.handle`401/403/422/503/200, no service call on denial, regression/public access and root gates.
- Acceptance criteria: Both Eden contract and authorized request paths remain correct; no authentication expansion to public routes.

### DASH-005 — Private client, query dan hook

- Outcome: Summary read owned by current session with controlled refresh.
- Depends on: DASH-004.
- Files/symbols: dashboard client/queries/hook, web behavior/type tests.
- Requirements: Signal, identity key, strict DTO/invariants, no retry loops, online/visibility30s polling, stale recovery and cleanup; browser-only summary read.
- Validation: Injected-fetch and QueryClient/timer behavior, compile-only Eden positive/negative, auth/cache regression and root gates.
- Acceptance criteria: Wrong/malformed response never cached as success; logout/expiry stops reads and suppresses late result; no private SSR summary.

### DASH-006 — Content overview dan latest list

- Outcome: Admin sees four accurate kind summaries and up to8 latest owners with valid navigation.
- Depends on: DASH-005.
- Files/symbols: route and dashboard summary/latest/state components.
- Requirements: Existing shell/account/quick actions, counters partition, editorial helper, empty/loading/stale/error, typed links and mobile-first wrapping.
- Validation: Relevant units and root gates, intermediate built-browser smoke if harness available; complete acceptance DASH-010.
- Acceptance criteria: Empty is real0, error is unavailable/stale; Episode card never links to an unsupported global list; archive labels don't mutate child state.

### DASH-007 — Current media dan needs attention

- Outcome: Job status and failed items guide admin to current owner detail.
- Depends on: DASH-006.
- Files/symbols: dashboard media/attention components and navigation tests.
- Requirements: Four current-job counters including Retry, max5 failure list, source/cover roles, Series/Episode routes, stable empty states and read-only actions.
- Validation: Mapping/bounds/navigation units, relevant regressions and root gates; actual dataset browser proof DASH-010.
- Acceptance criteria: No misleading readiness/worker-health claims, storage URLs or reprocess button; failures count/list share predicate.

### DASH-008 — Mutation invalidation integration

- Outcome: Dashboard refreshed after confirmed application changes and external writes.
- Depends on: DASH-005.
- Files/symbols: existing content/series/media/publication helpers and current controllers/callers if needed; query integration tests.
- Requirements: Add exact identity dashboard invalidation after safe confirmation, no POST retry/new writes, no hidden-page refetch storm or session reseeding. Existing worker changes observed with bounded refresh/poll.
- Validation: Same-session create/edit/publish/archive/media updates, different-session isolation, invalidation during pending read, unmount/session loss, existing uploader/publication tests and root gates.
- Acceptance criteria: Initial in-flight stale snapshot cannot hide confirmed update; latest refresh wins; private cleanup remains authoritative.

### DASH-009 — PostgreSQL/native auth proof

- Outcome: Aggregate definitions and concurrency verified on real dedicated database.
- Depends on: DASH-004.
- Files/symbols: guarded dashboard integration suite, fixture as needed, HTTP/OpenAPI native regression.
- Requirements: >100 mixed rows; all statuses including Series unpublished/archive; hidden episode/archived parent; current pointers/generations, both executors, old failures/retries, tie sorting8/5, safe outputs and concurrent updates within snapshot. Query count fixed and EXPLAIN observed.
- Validation: `bun test apps/api/test/integration/admin-dashboard-proof.test.ts` with guarded CONTENT_TEST_DATABASE_URL, serial; root API/native auth tests and gates. No development DB reset/migration.
- Acceptance criteria: One consistent read snapshot, exact partitions/counters/lists, authorized native session only; record actual results/limitations.

### DASH-010 — Built-browser acceptance dan regressions

- Outcome: Actual dashboard API/SQL flow works across themes, widths and failures.
- Depends on: DASH-006, DASH-007, DASH-008, DASH-009.
- Files/symbols: explicit dashboard browser phase/worker and guarded fixture, owned web tests and backlog evidence.
- Requirements: Mixed/empty/long-title data, navigation, repeated Refresh, metadata/publication transitions, real job-state updates, stale503/offline recovery, poll/background behavior, native SDK session loss and late response cleanup. 320/390/768/1024/1440 × Light/Dark/System, keyboard/44px/focus/no overflow.
- Validation: Built Bun/Nitro browser via existing runner after dashboard phase is implemented; auth SSR/gateway/import-boundary and existing dashboard/content/Series/uploader/publication regressions; all root gates. SQL fixtures distinguish metadata/job state from actual transcode.
- Acceptance criteria: Counts reflect dedicated database and stale reads can't overwrite newer confirmation; browser fixture and native-cookie proof limits explicit; no new media upload/player proof claimed.

### DASH-011 — Canonical docs dan closure

- Outcome: Current docs and per-task receipts reflect actual completed scope.
- Depends on: DASH-010.
- Files/symbols: canonical PRD/architecture/runbook/design/index, plan/backlog.
- Requirements: PRD-02 summary status updated while settings remains open; actual commands/results/SHAs, approved decisions and preservation; no self-referential SHA or production claim.
- Validation: Fresh source/mandatory AC audit, docs:check, targeted Prettier/diff, relevant final gates and normal hooks.
- Acceptance criteria: All mandatory DASH tasks verified and committed separately; remaining rollout/features accurately identified.

## Test requirements

| Surface              | Required proof                                                                                                                             | Owner            |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------- |
| Aggregate/domain     | Four kind partitions, parent-hidden editorial state, legacy unpublished, safe counts, current pointer/job generation and bounded tie order | DASH-003/009     |
| HTTP/auth            | Native denial before DB, safe failures/no-store, strict422 and secured OpenAPI, public routes unaffected                                   | DASH-004/009     |
| Web private state    | Abort/identity/poll/stale/error/retry, failed/malformed DTO, invalidation races, no private SSR or late cache                              | DASH-005/008/010 |
| UI/navigation        | Four cards, truthful labels, bounded latest/failed, existing canonical type/episode links, empty/loading/offline                           | DASH-006/007/010 |
| Layout/accessibility | 15 width/theme cases, long title/counts, keyboard/focus/44px/no overflow                                                                   | DASH-002/010     |

Runtime tasks use `bun test apps/api/src`, `bun test apps/web/test`, `bun run check-types`, `bun run lint`, `bun run build` as applicable plus dedicated SQL/browser proof. Existing `bun run --cwd apps/web auth:ssr:smoke` and `auth:import:proof` validate SSR/import boundaries. New dashboard phase is planned, not an existing runnable command: DASH-010 must add `AUTH_BROWSER_PHASE=dashboard` before using `bun apps/web/test/auth-browser-smoke.mjs`, with configured runner and dedicated test DB. Do not reset DB/build concurrently with browser.

## Constraints

Use Bun, Elysia/Eden method inference, explicit DI and same-origin native auth. No shared runtime auth/client secrets, unsigned private inventories only, no external messaging/deploy. Schema changes not expected; if required, generated/reviewed migration, official development migrate and existing-data preservation are mandatory. Local task commits follow root workflow after actual gates; remote delivery authorization does not carry automatically from ASER to this new feature.

## Acceptance criteria

- Each counter/list has a defined unit/predicate and matches dedicated DB, including more than one page of data.
- Endpoint is guarded, read-only, snapshot-consistent, bounded/no N+1 and contains no signed/private infrastructure metadata.
- Dashboard remains useful during loading/empty/refresh/offline/error without fabricated counts; session loss clears private data.
- Confirmed changes invalidate appropriate session summary; worker changes appear after bounded refresh.
- Typed navigation and responsive/keyboard behavior pass actual built-browser acceptance; existing auth/content/media/publication regressions pass.
- Docs and receipts differentiate proposal/approved/implemented/local proof/production and preserve all unrelated work.

## Risks and mitigations

| Risk                                             | Mitigation                                                                                               |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| Editorial published mistaken for public playable | Explicit labels/helpers, hidden-parent fixtures; no availability count                                   |
| Series archived/unpublished counted as draft     | Normalize with archived precedence, preserve separate unpublished bucket                                 |
| Historical media inflates failed/processing      | Owner-current asset + generation SQL predicate, count job once, ignore attempt joins                     |
| Pending summary read overwrites mutation/refetch | Cancel/fence invalidation and identity guards, actual race tests                                         |
| Aggregate expensive on larger inventory          | SQL-side aggregation, fixed query count/bounded lists, observed EXPLAIN; refine index only with evidence |
| Background/error polling storm                   | Visible/online/mounted gate30s, retry:false, pause on failure and explicit recovery                      |
| Old metadata mockup mistaken as approved new UI  | New DASH-002 state/layout spec; detailed proposal approval separate from historic mockup                 |

## Rollback or recovery

Read-only summary introduces no new durable state. Web can return to existing welcome/actions while retaining compatible API; private query cleanup must occur on unmount/session loss. API module can be removed from chaining after consumer rollout is reviewed. No source/job/publication deletion or migration rollback required by proposed scope. Production rollout remains separately authorized.

## Evidence

[Context evidence index](repository-context.md#evidence-index) at pinned SHA and [backlog](../../tasks/admin-dashboard.md) own actual commands/results. No SQL/browser/API feature test has run for unimplemented dashboard code.

## Open decisions

User review of this proposal covers counter semantics/layout, latest8/failed5 and refresh30s. Site fields, global jobs/actions, analytics and production are outside this decision. No unresolved technical dependency requiring a new package was found. Once proposal is approved, execute after source freshness check; optional raster request is separate.

## Validation history

### 2026-10-08 — planning freshness

- Result: valid snapshot; base/current `main` SHA `65fcc2b58d5b316e8c44b2d99e28baf2e90e4f8c` matches remote.
- Checked paths: current dashboard/layout/auth, schema/jobs, API composition, private query/invalidation, gateway, manifests, fixtures and canonical requirements/design.
- Relevant changes: none to runtime at planning start; 23 unrelated local paths excluded and preservation snapshot saved.
- Decision: create context → plan → backlog; detailed scope remains draft pending review. Recheck these paths before implementation.

## Execution log

- 2026-10-08: user selected dashboard and requested plan. Created local documentation branch `chore/admin-dashboard-plan` from snapshot, recorded preservation and saved context before plan. Runtime endpoints/UI/schema/env/dependencies unchanged; no remote delivery or deployment for this feature.
- Documentation validation and DASH-001 commit receipt will be recorded only after actual checks; SHA of the planning commit belongs in the next documentation update after it exists.

- 2026-10-08 DASH-001 validation: bun run docs:check93 Markdown/896 local links; staged-tree validator86/877; scoped Prettier dan diff checks lulus. Eleven task IDs/dependencies match dan DAG acyclic. Twenty-two unrelated files byte-identical; original README preserved apart from owned additions. Four Markdown paths only in staging; no runtime tests/migration/source/dependency/env changes. Planning local commit uses normal hooks, with final SHA discoverable via git log ID DASH-001 after success; receipt belongs in next documentation update. Proposal remains draft for user review.

- 2026-10-08 approval/freshness: pengguna mengatakan oke, setuju. HEAD478f313 hanya planning docs sejak base65fcc2b; runtime/schema/gateway/auth unchanged. Branch feat/admin-dashboard-summary dibuat; detailed scope/layout/metrics approved.

- 2026-10-08 DASH-002: Layout/state specification tersedia untuk4 jenis, current-job units, bounded8/5 lists, canonical navigation, empty/loading/stale/offline/poll/auth loss dan15 width/theme cases. Approval pengguna tercatat; freshness runtime65fcc2b→478f313 source unchanged. No raster/source change. Checks: docs:check, scoped Prettier/diff, preservation dan normal hooks. Previous task head `478f313145a962b574eaa6ec1594395c5d2c29e0`; own receipt recorded next task after successful normal hooks.

- 2026-10-08 DASH-003: Agregasi SQL lima bounded queries dalam transaksi repeatable-read/read-only; satu current-jobs predicate untuk count/failures, pointer-owner-role-generation checks, archive parent exclusions dan request/worker parity. Service menjaga safe-integer counters, UTC timestamp, whitelist response dan safe503. Native API163 tests/937 assertions pass; PostgreSQL semantics/performance diperiksa di DASH-009. Checks: API163 pass, root types3/lint1/build2 pass, scoped Prettier/docs/diff/preservation. Previous task head `ef1c1a03815592675a816d506c94b761d7af47df`; own receipt recorded next task after successful normal hooks.
