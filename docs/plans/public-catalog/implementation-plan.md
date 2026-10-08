# Implementation plan: katalog publik Film/Standalone

## Plan metadata

- Status: **active — plan pilihan pengguna, PCAT-002 disetujui pengguna, implementasi dimulai** · 8 Oktober 2026. Kelanjutan diminta setelah hooks delivery; perbedaan kontrak/UI terhadap main belum dianggap selesai hanya karena overlap fitur.
- Repository: `bayuaji17/vertical-movie-app`.
- Base ref: `feat/admin-publication`; base SHA: `634f7d46885692b32489b109c687d337e0e55511`.
- Context: [repository-context.md](repository-context.md), disimpan terlebih dahulu.
- Last validated SHA: `65127a107bad7606ef17dc908cc41777e25b1848` (freshness untuk kelanjutan); baseline awal `634f7d46885692b32489b109c687d337e0e55511` tetap historis.
- Backlog canonical: [public-catalog](../../tasks/public-catalog.md); PCAT-001–014.
- Pengguna meminta plan prioritas nomor 1 pada 8 Oktober 2026. Grid/Load more, filter, route detail dan indexing di bawah merupakan **proposal Codex** sampai disetujui pengguna. PRD approved tidak diubah menjadi seolah keputusan ini sudah final.
- Plan source branch yang ditunjuk pengguna: `chore/public-catalog-plan`, head `68a0053d3bc145f07c8bdf14490456436d0973a5`. Working branch `feat/public-catalog` dibuat dari main65127a1 untuk mempertahankan latest runtime/hooks; local commits diotorisasi standing AGENTS, remote delivery terpisah.

## Kelanjutan sesuai koreksi pengguna

8 Oktober 2026: pengguna menegaskan `chore/public-catalog-plan` sebagai plan yang dimaksud. Penutupan proposal sebagai superseded pada branch lokal `chore/public-catalog-reconciliation` terlalu dini, bukan keputusan pengguna; branch itu tidak dipakai untuk execution dan tidak dipush. Context di-refresh terlebih dahulu pada [review](repository-context.md#freshness-untuk-plan-yang-dipilih-pengguna).

PCAT-002 menghasilkan [spesifikasi desain](../../design/public-catalog.md), [preview HTML interaktif](../../design/public-catalog-preview.html) serta delapan first-viewport PNG Browse/Detail desktop/mobile Light/Dark. Prototype menampilkan20 fixture Film/Standalone, URL type context dan state/recovery untuk review; Watch adalah ilustrasi state tanpa media playback. Runtime aplikasi tidak berubah.

Current main punya implementasi katalog tiga jenis/page6/search/genre/publishedAt, binary poster dan route detail berbeda. Tabel context dan spesifikasi desain mencatat gap kontrak; PCAT-003–014 tidak dibatalkan otomatis atau dianggap telah memenuhi AC. Cache fence/SSR/public client/player identity reuse ketika task terkait dimulai. Approval desain menentukan refinement UI/kontrak sebelum mengganti current product flows, sesuai dependency PCAT-008 yang sudah ditetapkan pada plan ini.

## Objective

Pengunjung menemukan Film/Standalone published dari homepage, membuka detail, lalu menonton HLS tanpa login. Alur tetap jelas saat katalog kosong, cover/network gagal, konten diarsipkan atau signed URL kedaluwarsa.

## Goals and non-goals

Dalam scope: homepage katalog nyata; filter All/Films/Standalone di URL; cursor Load more; cover 9:16; detail publik; metadata/navigasi watch existing; English copy, light/dark/System; SSR metadata unsigned; state loading/empty/error/not-found; keyboard/touch; API extension kecil dan proof lokal.

Di luar iterasi: Series/episode discovery/editor/publication, subtitle, search/genre/advanced sorting, autoplay/feed/swipe, recommendation/analytics/view counts/watch history/favorites, pengaturan situs, restore/republish, source replacement, auth baru, perubahan worker/upload/retensi, dependency upgrade, rollout production. Existing API Series/episode dan direct watch links tetap kompatibel. Tidak menampilkan tanggal release/genre yang belum ada di DTO.

## Current behavior

Homepage starter/demo MP4; watch minimal menggunakan public playback existing. API `GET /videos` menyediakan cursor metadata seluruh playable kinds, tanpa filter jenis/cover. `GET /videos/:slug` tersedia; cover signed hanya dalam playback DTO. Gateway public sudah ada, Query/SSR integration tersedia. Source trace dan batas cache ada pada [context](repository-context.md#runtime-and-data-flow).

## Desired behavior

### UX yang disetujui

| Area                   | Proposal yang dapat disetujui bersama plan                                                                                                                                                                                             |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Header                 | Brand Vertical Movie, tautan Browse, pemilih Appearance Light/Dark/System. Tidak membaca sesi pengunjung; admin tetap memakai rute existing.                                                                                           |
| Homepage `/`           | Heading Browse, filter All/Films/Standalone, grid cover + title/type/duration, explicit Load more, tombol retry/refresh bila gagal.                                                                                                    |
| Layout                 | Mobile-first; 2 kolom poster pada 390px, 1 pada lebar sempit bila perlu; 3–5 kolom tablet/desktop sesuai lebar cover. Final spacing/layout pada PCAT-002, tanpa horizontal overflow 320–1440px.                                        |
| Pagination             | 20 item per request, cursor existing. Tombol Load more menambah item, bukan numbered pages/auto-infinite scroll. Back dari detail/watch mengembalikan filter dan posisi scroll selama navigation session.                              |
| Urutan                 | createdAt/id descending sesuai API. Label tidak mengklaim “newly published”; sort alternatif tidak ditambah.                                                                                                                           |
| URL filter             | `/?type=all                                                                                                                                                                                                                            | film | standalone`; default all. Validasi unknown value ke default, buang cursor lama saat type berubah. Browser back/forward menyelaraskan filter dan data. |
| Detail `/videos/$slug` | Cover, judul, badge Film/Standalone, durasi, sinopsis lengkap, Watch now, Back to browse. Tidak memuat HLS sebelum Watch. Episode di rute baru ini mendapat not-found; direct episode watch existing tetap tersedia.                   |
| Watch `/watch/$slug`   | Player HLS 9:16 existing, judul/type/duration, back ke detail/browse untuk non-episode, loading/error dan retry jelas. Existing episode watch tidak diarahkan ke detail yang menolaknya.                                               |
| Navigation context     | Search `type` yang tervalidasi dapat dibawa ke detail/watch; internal route/link dibangun Router, tidak menerima external return URL. Reload katalog mulai halaman pertama; tidak menjanjikan persistence seluruh pages lintas reload. |
| Copy/theme             | English untuk UI publik baru, mengikuti root lang/admin; title/synopsis original tidak diterjemahkan. Semantic tokens Rhea, light/dark/System existing.                                                                                |
| Indexing sementara     | Route head title/description aman dan unsigned; proposal `noindex, nofollow` untuk publik sampai kebijakan indexing disetujui. Tidak menambah canonical origin/env, social preview signed atau structured data.                        |

### States dan recovery

- Initial loading: skeleton dengan reserved aspect ratio; SSR first metadata page/detail bila service tersedia. Cover memakai placeholder stabil sampai browser meminta URL.
- Empty: katalog benar-benar kosong dibedakan dari filter tanpa hasil; tidak memasang fixture/demo sebagai konten produk.
- First-page failure: alert aman + Retry. Load-more failure: item sebelumnya tetap tampil, Retry mengulangi cursor yang sama, tidak melompat halaman. Filter-change failure tidak menampilkan data filter lama seolah hasil baru.
- Background refetch failure: snapshot boleh tampil dengan status stale + Refresh; tidak mengganti list sukses dengan empty. Saat refreshing pages, mulai dataset baru dari halaman pertama agar cursor/items tidak bercampur.
- Cover failure: fallback accessible, title tetap dapat diklik; renewal hanya saat visible dan expiry/error terdeteksi, maksimal satu refresh per episode kegagalan lalu explicit retry. Tidak timer/signing semua kartu offscreen.
- Detail missing/draft/archived/hidden: pesan unavailable yang sama, back ke katalog; SSR HTTP 404 ketika API benar-benar 404. Malformed slug ditolak tanpa dependency I/O. API/database unavailable dibedakan sebagai 503/retry, bukan not-found.
- Archive setelah list/detail dimuat: metadata dapat stale sampai freshness/refetch. Poster/playback baru reauthorize ke DB; tidak ada janji revoke old URL/buffer. Refresh membuang konten yang tidak lagi visible.
- Watch slug berubah: reset instance player berbasis slug, request lama dibatalkan/diabaikan; media sebelumnya tidak diteruskan ke konten berikutnya. Retry explicit remount player, bukan renewal loop baru.

## Impact analysis

Tidak diperlukan schema/migration, storage bucket baru, env baru atau dependency baru berdasarkan source. Perubahan backend terbatas pada filter sebelum pagination, cache invalidation generation guard, public poster DTO/service/route. Bootstrap tetap memakai PlaybackService/CatalogService yang sudah diinjeksi.

API extension harus backward-compatible. UI baru tidak boleh mengambil private admin DTO/genre API atau memfilter hanya subset halaman di browser. Public clients tidak memanggil private auth transitions ketika mendapat 403/5xx. SSR hanya metadata: tidak mengambil/simpan signed capability, cookie atau auth session.

### Kontrak API yang diusulkan

1. `GET /videos?limit=20&cursor=...&kinds=movie,standalone`. Query `kinds` opsional dengan nilai finite `movie`, `standalone`, `movie,standalone`, `standalone,movie`; urutan dinormalisasi ke set canonical. Film tab memakai movie; Standalone memakai standalone; All memakai movie,standalone. Tidak memberikan parameter arbitrer SQL.
2. Tanpa `kinds`, perilaku all kinds existing dan cursor fingerprint lama dipertahankan. Dengan `kinds`, predicate SQL `videos.kind IN (...)` diterapkan **sebelum limit**, kinds canonical masuk cursor fingerprint dan cache key. Cursor filter beda ditolak 422 sesuai `invalid()` existing; unknown/invalid kinds ditolak schema sebelum service (422). PublicVideoListDto tetap unsigned dan tidak berubah bentuknya.
3. `GET /videos/:slug/poster` → `{ videoId, posterUrl, expiresAt }`, `private, no-store`; operationId `getPublicVideoPoster`, public security metadata. Route dalam playback module; method baru `PlaybackService.poster` menggunakan uncached playable + profile/namespace/posterReadiness. Native presign hanya output `poster.webp` terverifikasi; TTL memakai verified duration existing, tidak mendefinisikan TTL media baru. Tidak mengambil manifest/HEAD original atau menandatangani HLS pada endpoint poster.
4. Poster 404 untuk missing/hidden/draft/archived; profile/provider/output invalid dan dependency unavailable 503 aman. DTO tidak menambah raw key/bucket/credentials/source/actor. Signed URL merupakan kapabilitas output temporer yang memang diperlukan browser; tidak dipersist/log atau dicampur metadata.
5. PublicVideo detail existing tidak berubah. Frontend membatasi detail baru ke movie/standalone; playback existing tetap menerima episode sesuai visibility.
6. Catalog cache unsigned tetap 60 detik. Revision counter naik pada invalidate; hasil read yang mulai sebelum invalidation tidak boleh mengisi ulang cache stale sesudahnya. Read tersebut boleh menyelesaikan snapshot lama; request berikut harus membaca data baru. Tidak mengklaim distributed invalidation atau menutup seluruh PUBLIC-001 stress matrix.

### Data web/SSR yang diusulkan

- `createPublicCatalogClient` memakai Eden existing dengan injected fetcher, signal, credentials omit dan public errors; no private session reader. Browser menuju configured same-origin `/api`; server-only reader memakai fixed validated `API_INTERNAL_URL`, path/query fixed, timeout 10 detik, tanpa meneruskan headers cookie/authorization/host dari user.
- `createIsomorphicFn` menghubungkan metadata server/client; server-only status helper memetakan 404/503. SSR import protection perlu proof dari public route baru; server config/modules tidak masuk client bundle.
- Metadata Query keys prefix `public-catalog`, mencakup canonical filter/limit/slug; cursor melalui pageParam. StaleTime maksimal 60 detik, gcTime 5 menit, tidak dipersist. Metadata stale tetap display-only; authorization memakai endpoint uncached saat cover/watch diminta.
- Refinement PCAT-007: signed poster memakai browser-only ephemeral capability queue di luar QueryClient, max100 identities/in-memory dan lifetime dibatasi expiresAt; tidak masuk dehydrated HTML/JSON. Fetch/URL renewal hanya kartu visible (IntersectionObserver fallback aman), concurrency maksimum 4 dan request dedup per slug; offscreen/unmount tidak menulis hasil lama. Route/intent preload tidak meminta signed URL/HLS.
- Pending/cursor double-click serialized; dedup id pada append; changed filter membatalkan/menolak late data lama. Back/forward/scroll restoration memakai Router existing dan memory Query pages; refresh/reconnect mengulang first page dengan filter sama.

## Affected files and symbols

Nama file baru berikut merupakan target per task, bukan folder scaffold yang dibuat pada planning.

| Path                                                                                                                          | Action | Symbols                                        | Reason                                             | Evidence                               |
| ----------------------------------------------------------------------------------------------------------------------------- | ------ | ---------------------------------------------- | -------------------------------------------------- | -------------------------------------- |
| `apps/api/src/modules/catalog/{model,service,repository}.ts`                                                                  | modify | CatalogQuery, list/cached/invalidate, playable | kinds/filter/cursor/cache race                     | Context: katalog metadata              |
| `apps/api/src/modules/playback/{index,service}.ts`                                                                            | modify | poster DTO/route, PlaybackService.poster       | Signed cover terpisah                              | Context: poster/playback               |
| `apps/api/src/modules/catalog/{service,index}.test.ts`                                                                        | create | filter/TTL/HTTP tests                          | Regression behavior native Bun                     | Context: testing coverage gap          |
| `apps/api/src/modules/playback/service.test.ts`                                                                               | modify | poster signing tests                           | Profile/namespace/TTL/hidden failures              | Existing service test/readiness        |
| `apps/api/src/modules/playback/poster.test.ts`                                                                                | create | poster HTTP/app composition                    | Schema/security/cache errors                       | createPlaybackModule/createApp         |
| `apps/api/test/integration/public-catalog-proof.test.ts`                                                                      | create | SQL/visibility/cursor proof                    | Guarded dedicated DB proof                         | media-fixture/media-series-proof       |
| `apps/web/src/lib/public/{catalog-client,catalog-reader,catalog-reader.server,catalog-queries,catalog-state,poster-state}.ts` | create | typed public readers/query/state               | Unsigned SSR, bounded browser capabilities         | client/router/session boundary pattern |
| `apps/web/src/components/public/{public-shell,catalog-card,public-poster,catalog-browser,video-detail,watch-page}.tsx`        | create | public presentation                            | Shared three-screen UX                             | Home/watch/current primitives          |
| `apps/web/src/routes/index.tsx`                                                                                               | modify | Home, route loader/search/head                 | Replace starter with catalog                       | Current Home                           |
| `apps/web/src/routes/videos.$slug.tsx`                                                                                        | create | Detail loader/head/search/error                | Public non-episode detail                          | Existing public detail API             |
| `apps/web/src/routes/watch.$slug.tsx`                                                                                         | modify | Watch loader/search/head                       | Metadata/back links and existing player            | Current Watch/loadPlayback             |
| `apps/web/src/routeTree.gen.ts`                                                                                               | modify | generated tree only                            | Tooling route generation                           | generate-routes script                 |
| `apps/web/test/public-catalog-{client,state}.test.ts`, `public-catalog-eden-contract.ts`                                      | create | Contract/state/SSR-isolation proofs            | filter/race/status/runtime separation              | Existing web test conventions          |
| `apps/web/test/business-gateway.test.ts`                                                                                      | modify | Public poster path proof                       | Cookie stripping/errors/no-store                   | Existing business gateway              |
| `apps/api/test/integration/public-catalog-browser-proof.test.ts`, `apps/web/test/public-catalog-browser-worker.mjs`           | create | Actual anonymous browser proof                 | Catalog → detail → HLS → archive                   | media-playback-fixture/harness         |
| `apps/web/test/auth-import-boundary-proof.mjs`                                                                                | modify | additional public import protection case       | Confirm new server-only reader removed from client | Existing negative fixture              |
| `docs/design/public-catalog.md` and approved visual/export artifacts                                                          | create | Screen/state spec                              | Design reviewed before UI implementation           | Design system existing                 |
| `docs/product/prd.md`, `docs/architecture/overview.md`, `docs/operations/media.md`                                            | modify | approved decision/current state                | Update at approval/closure, preserve history       | Existing canonical owners              |
| `docs/README.md`, this plan/context, `docs/tasks/public-catalog.md`                                                           | modify | Navigation/status/evidence                     | Canonical planning/execution ledger                | Root docs rules                        |

Existing theme provider/player/skin/styles/server gateway/app/bootstrap are reuse boundaries. If proof identifies a required change there, record exact file/symbol/reason before extending task; no preset/registry overwrite. Public theme menu may compose existing provider primitives without moving admin account components.

## Implementation DAG

```text
PCAT-001 → plan approval → PCAT-002 → design approval
                       → PCAT-003 → PCAT-004
                       → PCAT-005
PCAT-003 + PCAT-005 → PCAT-006 → PCAT-007
PCAT-002 + design approval + PCAT-007 → PCAT-008
PCAT-008 → PCAT-009 → PCAT-010 → PCAT-011
PCAT-004 + PCAT-005 → PCAT-012
PCAT-011 + PCAT-012 → PCAT-013 → PCAT-014
```

DAG menyatakan dependensi, bukan instruksi menjalankan agent paralel. Eksekusi satu task utama per commit. Task details berikut dan [backlog](../../tasks/public-catalog.md) harus tetap sinkron.

## Implementation steps

Setiap task mempunyai scope, paths, requirements, validation dan observable acceptance pada backlog. Ringkasan hasil/dependensi:

### PCAT-001 — Context, plan, backlog berbasis SHA

- Outcome: Context, plan, backlog berbasis SHA.
- Depends on: none.
- Files: docs plan/context/backlog/index; concrete paths pada affected-files dan backlog.
- Symbols: source trace/plan/backlog/index.
- Requirements: Static trace. Rincian kontrak/state di desired behavior dan backlog task ini.
- Validation: Static trace; docs/format/whitespace/preservation; root gates sesuai ruang lingkup.
- Acceptance criteria: Dokumen reviewable, tidak mengubah runtime; commit docs berhasil; seluruh checklist di backlog terpenuhi dan task commit berhasil.

### PCAT-002 — Spesifikasi/mockup responsive light/dark

- Outcome: Spesifikasi/mockup responsive light/dark.
- Depends on: PCAT-001 + plan approval.
- Files: docs/design/public-catalog; concrete paths pada affected-files dan backlog.
- Symbols: screen/state specifications.
- Requirements: Home/detail/watch/state specs, 390/1440. Rincian kontrak/state di desired behavior dan backlog task ini.
- Validation: Home/detail/watch/state specs, 390/1440; user review; root gates sesuai ruang lingkup.
- Acceptance criteria: Desain approved sebelum task UI; proposal belum ditulis sebagai implemented; seluruh checklist di backlog terpenuhi dan task commit berhasil.

### PCAT-003 — Filter kinds sebelum pagination

- Outcome: Filter kinds sebelum pagination.
- Depends on: PCAT-001 + plan approval.
- Files: CatalogQuery/list/playable; concrete paths pada affected-files dan backlog.
- Symbols: CatalogQuery/CatalogService.list/CatalogStore.playable.
- Requirements: schema, normalization, cursor binding, old callers. Rincian kontrak/state di desired behavior dan backlog task ini.
- Validation: schema, normalization, cursor binding, old callers; unit/app.handle; root gates sesuai ruang lingkup.
- Acceptance criteria: Mixed fixture tidak menghasilkan halaman semu; cursor mismatch ditolak; seluruh checklist di backlog terpenuhi dan task commit berhasil.

### PCAT-004 — Cache metadata aman terhadap invalidation read race

- Outcome: Cache metadata aman terhadap invalidation read race.
- Depends on: PCAT-003.
- Files: CatalogService.cached/invalidate; concrete paths pada affected-files dan backlog.
- Symbols: CatalogService.cached/invalidate.
- Requirements: clock/deferred injected unit race. Rincian kontrak/state di desired behavior dan backlog task ini.
- Validation: clock/deferred injected unit race; root gates sesuai ruang lingkup.
- Acceptance criteria: Late read tidak mengisi cache generasi baru; TTL/bounds preserved; seluruh checklist di backlog terpenuhi dan task commit berhasil.

### PCAT-005 — Public signed poster endpoint

- Outcome: Public signed poster endpoint.
- Depends on: PCAT-001 + plan approval.
- Files: PlaybackService.poster/route/DTO; concrete paths pada affected-files dan backlog.
- Symbols: PlaybackService.poster/createPlaybackModule.
- Requirements: readiness/profile/presign. Rincian kontrak/state di desired behavior dan backlog task ini.
- Validation: readiness/profile/presign; unit/app.handle/OpenAPI; root gates sesuai ruang lingkup.
- Acceptance criteria: Hidden ditolak sebelum signer; no-store; poster output saja; seluruh checklist di backlog terpenuhi dan task commit berhasil.

### PCAT-006 — Typed public client dan unsigned SSR reader

- Outcome: Typed public client dan unsigned SSR reader.
- Depends on: PCAT-003, PCAT-005.
- Files: lib/public/client/reader + Eden fixture; concrete paths pada affected-files dan backlog.
- Symbols: createPublicCatalogClient/readPublicCatalog/server-only reader.
- Requirements: fetch errors/signal/status. Rincian kontrak/state di desired behavior dan backlog task ini.
- Validation: fetch errors/signal/status; type proof/server import boundary; root gates sesuai ruang lingkup.
- Acceptance criteria: No cookie/admin transition/secret or signed SSR data; seluruh checklist di backlog terpenuhi dan task commit berhasil.

### PCAT-007 — Filter/pagination/poster query recovery

- Outcome: Filter/pagination/poster query recovery.
- Depends on: PCAT-006.
- Files: lib/public/query/state/poster-state; concrete paths pada affected-files dan backlog.
- Symbols: public query keys/pageParam/poster lifecycle.
- Requirements: cursor race, expiry/offscreen/concurrency, no SSR dehydration. Rincian kontrak/state di desired behavior dan backlog task ini.
- Validation: cursor race, expiry/offscreen/concurrency, no SSR dehydration; unit; root gates sesuai ruang lingkup.
- Acceptance criteria: Duplicate/late requests aman; old success retained pada load-more failure; seluruh checklist di backlog terpenuhi dan task commit berhasil.

### PCAT-008 — Shell, card dan poster public reusable

- Outcome: Shell, card dan poster public reusable.
- Depends on: PCAT-002 + design approval, PCAT-007.
- Files: components/public/shell/card/poster; concrete paths pada affected-files dan backlog.
- Symbols: PublicShell/CatalogCard/PublicPoster.
- Requirements: Existing Rhea/Theme primitives. Rincian kontrak/state di desired behavior dan backlog task ini.
- Validation: Existing Rhea/Theme primitives; accessibility/layout review; root gates sesuai ruang lingkup.
- Acceptance criteria: 9:16 stabil, keyboard/touch/fallback, no per-card video player; seluruh checklist di backlog terpenuhi dan task commit berhasil.

### PCAT-009 — Homepage katalog nyata

- Outcome: Homepage katalog nyata.
- Depends on: PCAT-008.
- Files: routes/index + catalog-browser; concrete paths pada affected-files dan backlog.
- Symbols: Home/CatalogBrowser/route loader.
- Requirements: URL/filter/load-more/SSR/refresh. Rincian kontrak/state di desired behavior dan backlog task ini.
- Validation: URL/filter/load-more/SSR/refresh; behavior + browser; root gates sesuai ruang lingkup.
- Acceptance criteria: Default All hanya movie/standalone; no starter/demo; back/forward benar; seluruh checklist di backlog terpenuhi dan task commit berhasil.

### PCAT-010 — Detail public non-episode

- Outcome: Detail public non-episode.
- Depends on: PCAT-009.
- Files: routes/videos.$slug + video-detail; concrete paths pada affected-files dan backlog.
- Symbols: VideoDetail/route loader/status/head.
- Requirements: Metadata/capability separation. Rincian kontrak/state di desired behavior dan backlog task ini.
- Validation: Metadata/capability separation; direct SSR status; behavior; root gates sesuai ruang lingkup.
- Acceptance criteria: Detail → Watch, synopsis, 404/503/retry dan back context; seluruh checklist di backlog terpenuhi dan task commit berhasil.

### PCAT-011 — Watch dengan metadata/navigasi

- Outcome: Watch dengan metadata/navigasi.
- Depends on: PCAT-010.
- Files: routes/watch.$slug + watch-page; concrete paths pada affected-files dan backlog.
- Symbols: Watch/WatchPage/keyed VerticalVideoPlayer.
- Requirements: Reuse keyed existing player. Rincian kontrak/state di desired behavior dan backlog task ini.
- Validation: Reuse keyed existing player; direct route/renewal/episode compatibility; root gates sesuai ruang lingkup.
- Acceptance criteria: HLS/seek/expiry/retry tidak regress; slug lama tidak bocor; seluruh checklist di backlog terpenuhi dan task commit berhasil.

### PCAT-012 — Real SQL/visibility proof

- Outcome: Real SQL/visibility proof.
- Depends on: PCAT-004, PCAT-005.
- Files: public-catalog-proof integration; concrete paths pada affected-files dan backlog.
- Symbols: dedicated SQL fixture/visibility assertions.
- Requirements: Dedicated DB serial. Rincian kontrak/state di desired behavior dan backlog task ini.
- Validation: Dedicated DB serial; mixed pages/archive/old cursor/tombstone; root gates sesuai ruang lingkup.
- Acceptance criteria: Filter sebelum limit dan uncached poster access terbukti; seluruh checklist di backlog terpenuhi dan task commit berhasil.

### PCAT-013 — Anonymous built-browser acceptance

- Outcome: Anonymous built-browser acceptance.
- Depends on: PCAT-011, PCAT-012.
- Files: proof runner/browser worker; concrete paths pada affected-files dan backlog.
- Symbols: public catalog browser runner/journey assertions.
- Requirements: Real DB/MinIO/FFmpeg, SSR/hydration, width/theme, failures. Rincian kontrak/state di desired behavior dan backlog task ini.
- Validation: Real DB/MinIO/FFmpeg, SSR/hydration, width/theme, failures; root gates sesuai ruang lingkup.
- Acceptance criteria: Home→detail→watch→archive dan no capability SSR actual terbukti; seluruh checklist di backlog terpenuhi dan task commit berhasil.

### PCAT-014 — Canonical docs dan module closure

- Outcome: Canonical docs dan module closure.
- Depends on: PCAT-013.
- Files: canonical docs/backlog/plan/index; concrete paths pada affected-files dan backlog.
- Symbols: canonical current behavior/receipt ledger.
- Requirements: Relevant tests + root types/lint/build + docs/format/whitespace. Rincian kontrak/state di desired behavior dan backlog task ini.
- Validation: Relevant tests + root types/lint/build + docs/format/whitespace; root gates sesuai ruang lingkup.
- Acceptance criteria: Seluruh AC punya actual evidence/receipts; batas production jelas; seluruh checklist di backlog terpenuhi dan task commit berhasil.

## Test requirements

| Area            | Bukti yang diperlukan                                                                                                                                                                   | Task             |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| SQL/cursor      | Film/Standalone interleaved episode/draft/archived, tied createdAt + id, >20 row, first/next/end/empty, same canonical kinds dan mismatched cursor, compatibility query tanpa kinds     | PCAT-003/012     |
| Cache           | TTL 60s boundary; filter isolation; invalidate selama read pending; successful change + next fresh request; retry setelah failure                                                       | PCAT-004/012     |
| Poster          | HTTP anonymous guard/schema/no-store; hidden no sign; profile/namespace/invalid duration/output; exact poster key + ttl ceiling, expiry, source tombstone; no HLS/HEAD I/O              | PCAT-005/012     |
| Client/SSR      | Non-2xx/malformed DTO error, abort/timeout, fixed upstream, no cookie/authorization/auth transitions, no signed query dehydration, status 404/503, illegal server import rejected       | PCAT-006/007/013 |
| Web state       | Filter/reset/back/forward, cursor retry/double-click/dedup, old result race, append failure preserves results, expiry/offscreen/concurrency/poster failure bounded                      | PCAT-007/009/013 |
| User journey    | Actual anonymous homepage→detail→watch/seek/renew/back; archive removes future access, old URL policy preserved; no demo/player on grid; direct SSR/reload + hydration without mismatch | PCAT-011/013     |
| Responsive/a11y | 320/390/768/1024/1440 both themes; long title/synopsis, no overflow/stretch, keyboard/focus/44px controls, reduced motion/status, theme System; image/network/offline failure           | PCAT-008/013     |
| Regression      | API unit suite, web tests, gateway, Series/episode visibility/next, existing admin publication and player MinIO proofs affected; import-boundary then final build                       | PCAT-012/013/014 |

Commands saat execution dari root (hasil belum dijalankan pada planning):

```sh
bun run --cwd apps/web generate-routes
bun test apps/api/src
bun test apps/web/test
bun test apps/api/test/integration/public-catalog-proof.test.ts
bun test apps/api/test/integration/public-catalog-browser-proof.test.ts
bun run --cwd apps/api media:series:proof
bun run --cwd apps/web auth:import:proof
bun run check-types
bun run lint
bun run build
bun run docs:check
git diff --check
```

New integration files/commands baru tersedia setelah task terkait. Set explicit test DB/storage/browser env sesuai [runbook media](../../operations/media.md), bukan memakai development DB. Browser proof built memerlukan build artifact terbaru; negative import proof harus restore source dan final build kembali sukses. Jalankan suite reset serial, dan jangan menjalankan ulang expensive proof tanpa perubahan/failure yang relevan. Frozen install/migration conditional sesuai root rules bila discovery mengubah dependency/schema; tidak dijadwalkan untuk perubahan read-only saat ini.

## Constraints

API code di apps/api, web di apps/web, auth tetap packages/auth. Elysia chaining/types dan handler/domain separation; bun:test/app.handle. Native S3 signer existing; tidak mengganti cache policy/playback TTL. Tidak hand-edit routeTree. Design mengikuti [design system](../../design/design-system.md), installed shadcn dan bundled Video.js rc.4; tidak meng-upgrade atau menjalankan skin overwrite dari CLI.

## Acceptance criteria

1. Guest dapat menemukan All/Film/Standalone efektif playable dengan filter server dan pagination yang konsisten.
2. Cards/metadata first render/detail berasal dari API nyata; poster 9:16 dan fallback stabil; metadata tanpa signed URLs.
3. Direct detail/reload/SSR/SPA membedakan missing/hidden 404 dari dependency 503, tanpa admin login.
4. Detail → existing HLS watch berfungsi, metadata/back links benar; slug change, expiry/seek/retry tidak membocorkan atau mengulang request tanpa batas.
5. Archive menolak kapabilitas baru; metadata stale/refetch serta old signed/buffer policy jelas dan teruji.
6. Loading/empty/network/cover/load-more/offline states recoverable; duplicate/late filter requests aman; no private data/secret/capability SSR.
7. Mobile/desktop light/dark, keyboard dan touch lulus local acceptance; API/gateway/admin/episode compatibility tidak regress.
8. Tests/gates, separate task commits dan canonical documentation selesai berdasarkan hasil aktual. R2/Safari/physical device/resource/full restore/deployment tetap terpisah.

## Risks and mitigations

| Risiko                                                            | Mitigasi                                                                                                |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Episode mengisi halaman All, filter client menciptakan empty semu | kinds SQL sebelum limit + mixed row integration                                                         |
| N request cover atau expired URLs untuk video pendek              | visible-only signing, concurrency 4, dedup, expiry-aware bounded renewal dan placeholder                |
| Read in-flight mengisi cache sesudah archive invalidate           | revision guard, fresh follow-up proof; tidak menjanjikan immediate revocation snapshot lama             |
| SSR membocorkan storage capability/config                         | unsigned-only readers/dehydration, credentials omitted, server-only import protection + HTML inspection |
| Refresh pages dan browser navigation mencampur cursor             | Canonical key/filter, abort late result, first-page reset pada refresh, navigation proof                |
| Watch integration mengubah playback/episode existing              | Reuse keyed player, preserve direct episode route, local HLS regression                                 |
| Design overlays existing tidak tracked seluruhnya                 | Preserve/hash overlay; gunakan tracked styles/components sebagai runtime acuan, selective staging index |

## Rollback or recovery

Perubahan additive read API dan UI tanpa migration. Jika perlu rollback, revert task UI/dependency-order melalui commit normal, pertahankan endpoint/API lama dan archive authorization. Jangan mengembalikan demo seolah konten produk; fallback maintenance/error page dapat memakai shell. Tidak menghapus media/database row atau mengubah worker/retensi. Capability yang sudah diberikan tetap mengikuti expiry.

## Evidence

Evidence source/path/symbol/base SHA dimiliki [context evidence index](repository-context.md#evidence-index). Long task evidence/actual commands di [backlog](../../tasks/public-catalog.md); execution history di plan ini. Plan bukan proof runtime maupun production. Historical APUB/media tests tidak dianggap dijalankan ulang.

## Open decisions

Keputusan disetujui pengguna 8 Oktober 2026: grid + Load more; All/Films/Standalone saja; 20 items/createdAt descending; route detail `/videos/$slug`; English copy; indexing noindex sementara. Search/genre/sort alternatif ditunda dalam proposal. Pengguna menyetujui desain konkret dengan “ok, setuju”; bukan approval berdasarkan waktu berlalu.

8 Oktober 2026: pengguna menyetujui desain konkret PCAT-002 dengan “ok, setuju”; implementasi source pada feat/public-catalog diotorisasi sesuai DAG. Kebijakan konten dan indexing jangka panjang di PRD tetap terbuka. Approval ini mengotorisasi implementasi dan local task commits sesuai workflow repository. Delivery remote berikutnya merupakan tahap tersendiri.

## Validation history

### 2026-10-08 — static source freshness

- Result: valid untuk planning lokal.
- Plan base SHA/current target SHA: `634f7d46885692b32489b109c687d337e0e55511`.
- Checked paths: catalog/playback/shared pagination/readiness, app/bootstrap, web router/routes/client/gateway/theme/player/test fixtures, manifests dan canonical docs.
- Changed relevant source paths: tidak ada; working-tree docs overlay existing dicatat terpisah.
- Decision: plan tetap draft karena keputusan UX/desain belum approved. Sebelum execution, bandingkan target SHA dan relevant paths/dependencies; refresh jika evidence/targets invalid.

## Execution log

8 Oktober 2026: hanya inspeksi source/dokumen dan pembuatan Markdown context→plan→backlog/index. Bun 1.4.2 lokal dan Video.js CLI pinned matching rc.4 diverifikasi. Tidak menjalankan runtime/media proof atau mengubah app source/schema/env/manifest/lockfile. Hasil docs validation dan receipt planning dicatat sesudah diamati; belum ada implementasi PCAT-002–014.

Planning validation 8 Oktober 2026: `bun run docs:check` lulus 69 Markdown/665 local links/anchors; scoped Prettier dan `git diff --check` lulus. Preservation 22 unrelated files dan 14 stable task IDs lulus. Branch dokumentasi lokal `chore/public-catalog-plan` dibuat dari base SHA; app source/manifests/lockfile tetap utuh. Task PCAT-001 Review menunggu local commit/hooks; PCAT-002–014 Backlog.

Receipt sesudah commit PCAT-001: `b844574d34e311c38f3359cd7e1ab61d7c10c6c6`, `docs: plan public film and standalone catalog (PCAT-001)`, branch `chore/public-catalog-plan`. Staged-tree docs 62/646, hooks docs 69/665, lint web 1/type 3 task cache valid dan Commitlint lulus tanpa bypass. Hanya empat file Markdown/hunk index milik planning di-commit. PCAT-001 Done, PCAT-002–014 Backlog; receipt ini dicatat untuk update task berikutnya. Plan tetap draft; tidak ada push/PR/merge/implementation.

8 Oktober 2026: pengguna mengotorisasi commit/push dokumentasi plan terlebih dahulu, lalu branch baru untuk organisasi hooks web. Otorisasi delivery tidak mengubah status draft/approval UX katalog. Remote receipt dicatat setelah push berhasil.

8 Oktober 2026: sesudah squash hooks PR #12, pengguna menegaskan plan yang dimaksud ialah `chore/public-catalog-plan`. Branch `feat/public-catalog` dimulai dari main65127a1 dengan dokumen plan awal, bukan local reconciliation yang terlalu dini menutup task. Context review terlebih dahulu; PCAT-002 spesifikasi/interactive HTML/eight responsive Light-Dark PNG disiapkan. Native browser prototype proof8 cases, assets/fonts,9:16/no overflow/44px, keyboard/filter/context/recovery/errors0 pass; bukan API/HLS/production proof. Docs86/816, scoped formatting/diff pass; local scoped commit/receipt berikut. Desain masih Review; task003–014 tetap terdaftar dengan dependencies/contract refinement dan tidak dibatalkan otomatis. Tidak ada perubahan apps/packages/env/dependencies atau remote delivery baru.

PCAT-002 artifact receipt: local commit307710159cbd8a6d9a0f4d230d2ec1deaf2abc37,14 files termasuk selective index/spec/HTML/eight screenshots. Docs86/816/staged79/797, native prototype proof, format/diff/preservation dan normal lint/type/Commitlint hooks pass. Source aplikasi tidak berubah; task tetap Review menunggu desain. Receipt dicatat sesudah commit dan dapat masuk update task berikutnya; branch feat/public-catalog belum dipush/merged.

8 Oktober 2026 — PCAT-003: finite canonical kinds diterapkan sebelum SQL pagination; cursor/cache bound ke kinds, omit menjaga legacy fingerprint. Targeted Bun/HTTP/OpenAPI/compiled SQL dan root types/lint/build lulus; real DB acceptance tetap PCAT-012. Approval PCAT-002 commit a3ceba2d47c32326d7e25773a4370de5166cfd29 dengan normal hooks pass.

8 Oktober 2026 — PCAT-004: reuse generation fence existing, deterministic legacy-list concurrent fill/TTL60s/filter/failure proof; catalog26/179 dan build2 pass. PCAT-003 receipt fca1b478a8726fd977166338731dad47cd498066; API143/811 + web185/955 regression serta normal commit hooks pass.

8 Oktober 2026 — PCAT-005: signed poster API terpisah, uncached authorization, exact verified generation namespace/TTL ceiling dan no HLS/storage reads. Playback13/93, API151/883 dan root types3/lint1/build2 pass; fixture type failure diperbaiki lalu types rerun pass. PCAT-004 receipt a09728b09cbe57431ec76561938a0c1178bf3411 dengan normal hooks pass.

8 Oktober 2026 — PCAT-006: typed /videos public adapter + unsigned isomorphic/server-only readers, finite page20 filters, abort10s, cookie/auth stripped, malformed errors/status/identity/expiry validation. Web189/1016 serta root types3/lint1/build2 pass sesudah fixture/lint fixes; SSR route/import/dehydration proof tetap PCAT-009/013. PCAT-005 receipt046ccbd24cea17c74e1f08b3fefca43916b5859b normal hooks pass.

8 Oktober 2026 — PCAT-007: query first-page reset/append/cancel/keys/TTL dan max4 subscriber-dedup poster queue + use-public-* hooks. Signed cache ditempatkan di luar Query untuk menjamin no dehydration, bukan query signed yang dapat terdehydrate. State3/20, web192/1036, types3/lint1/build2 pass; actual UI/browser proof tetap PCAT-008–013. PCAT-006 receipt45c73dac15fe436bbea7405a19decd9a0bd0e1c1 normal hooks pass.

8 Oktober 2026 — PCAT-008: reusable shell/card/9:16 cover/states implemented, SSR cover1/3 dan root types3/lint1/build2 pass. Card menerima renderLink dari owner page untuk menjaga tipe/navigasi; Type/search collision diperbaiki. Actual viewport/keyboard/theme proof tetap PCAT-013 dan task acceptance tidak diasumsikan dari compilation. PCAT-007 receipt eb3d034dfddab5c0ceae5db0780cfd682ba3168c normal hooks pass.

8 Oktober 2026 — PCAT-012 independent proof dijalankan setelah PCAT-004/005 lebih awal dari UI: dedicated PostgreSQL + owned MinIO actual WebP1/30 pass, pages20/20/5/legacy/tombstone/archive/cache/profile/no auth/no-store. Fixture archive CHECK diperbaiki (published_at null) dan rerun pass. PCAT-008 implementation receipt 802b316c162d79fd60f2c2022fcd767a8808c6fd dengan normal hooks pass; actual UI matrix tetap PCAT-013.

8 Oktober 2026 — PCAT-009: real unsigned SSR20 Film/Standalone homepage, canonical URL type/unknown normalization, Query/manual cursor/reset/offline/recovery and temporary noindex. Web193/1039/types3/lint1/build2 pass; illegal server import at public route rejected, source restored and valid build restored. History/scroll/full browser matrix ditutup di PCAT-013. PCAT-012 receipt e16dc5151b59705a330cb1a182e5299247d3520d normal hooks pass.
