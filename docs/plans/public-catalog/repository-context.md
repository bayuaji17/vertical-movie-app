# Repository context: katalog publik Film/Standalone

## Snapshot

- Repository: `bayuaji17/vertical-movie-app`; remote `origin` memakai GitHub repository tersebut.
- Base ref: `feat/admin-publication` (checkout lokal; bukan klaim freshness remote `main`).
- Base SHA: `634f7d46885692b32489b109c687d337e0e55511`.
- Analyzed at: 2026-10-08, Asia/Jakarta.
- Context status: **historical initial snapshot**; fakta source di bawah memakai base awal. Freshness untuk kelanjutan plan ada pada review berikut.
- Permintaan pengguna: lanjut prioritas nomor 1 dan buat plan. Scope awal yang diusulkan sebelumnya: homepage → detail → watch Film/Standalone. Persetujuan membuat plan bukan persetujuan seluruh keputusan UX atau implementasi.
- Context disimpan sebelum [implementation plan](implementation-plan.md); task canonical pada [public-catalog](../../tasks/public-catalog.md).

## Freshness untuk plan yang dipilih pengguna

8 Oktober 2026: pengguna menegaskan branch `chore/public-catalog-plan`, head `68a0053d3bc145f07c8bdf14490456436d0973a5`, sebagai plan yang harus dilanjutkan. Penutupan task002–014 sebagai superseded pada branch lokal `chore/public-catalog-reconciliation` adalah keputusan Codex yang terlalu dini dan **tidak digunakan sebagai execution plan**. Branch itu tetap dipertahankan sebagai riwayat lokal, tidak dipush.

Working branch `feat/public-catalog` dimulai dari main `65127a107bad7606ef17dc908cc41777e25b1848`, sesudah requested hooks squash PR #12. Dokumen plan awal identik dengan planning branch; runtime memakai main terbaru sehingga hooks dan hasil PR #11 tetap tersedia. Context review ini ditulis sebelum refinement plan/PCAT-002.

| Requirement plan awal        | Fakta source main terbaru                                                                              | Dampak kelanjutan                                                                                                                        |
| ---------------------------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Browse Film/Standalone       | `/catalog` + homepage sudah melayani Movie/Standalone/Series, search/genre, page6                      | Bukan acceptance otomatis untuk proposal Film/Standalone/page20/URL filter. Desain PCAT-002 memperlihatkan scope plan awal untuk review. |
| Kinds pada legacy `/videos`  | Legacy query masih limit/cursor; kind filter memakai endpoint `/catalog`                               | PCAT-003 tetap punya kontrak berbeda; jangan mengubah legacy tanpa compatibility proof.                                                  |
| Cache invalidation fence     | `CatalogService.entry/invalidate` sudah memiliki generation guard                                      | Reuse dan validasi task004; tidak membuat implementasi kedua.                                                                            |
| Signed poster DTO            | `CatalogPosterService.get` menyediakan binary WebP same-origin/private/no-store                        | Usulan signed poster dan expiry state belum sama dengan current contract. Catat perbedaan sebelum task005/007.                           |
| URL filter + `/videos/$slug` | Filter katalog state lokal; detail memakai `/titles/$kind/$slug` dan `/series/$slug`                   | Scope navigasi/route belum diimplementasikan persis plan awal. Preview desain belum mengubah routes atau fitur Series.                   |
| SSR/playback/hooks           | Unsigned SSR readers, public client, contextual watch, identity/abort guards dan hooks folder tersedia | Reuse sumber terkini; regression dan integration hanya saat task source dijalankan.                                                      |

PCAT-002 adalah deliverable desain, bukan penggantian homepage saat ini. Approval desain/keputusan kontrak dicatat sebelum task UI. Bukti PCAT API/PCW existing dipakai sebagai referensi, tidak dianggap proof bahwa seluruh acceptance plan awal lulus. Tidak menyatakan plan selesai hanya berdasarkan overlap fitur.

## Product and users

Pengunjung tanpa akun menemukan dan menonton video published yang efektif playable. Film memetakan API `kind=movie`; Standalone memetakan `kind=standalone`. Alur admin Film/Standalone sampai Publish/Archive telah implemented/verified lokal pada [APUB](../../tasks/admin-publication.md). Katalog web belum tersedia: homepage masih starter/demo, watch minimal tersedia. Kebutuhan terkait PRD-07/08/09 dan GR-02/03/05/06/08; lihat [PRD](../../product/prd.md) dan [Global Rules](../../product/global-rules.md).

UX katalog, filter/search/urutan final dan kebijakan pengindeksan publik masih terbuka dalam PRD. Grid poster, Load more dan urutan createdAt/id descending merupakan proposal tahap pertama; urutan itu sesuai source saat ini, bukan label “baru dipublish”. Series/episode discovery, subtitle dan pengaturan situs mempunyai scope lain.

## Repository map

| Subsistem                                                   | Peran/relevansi                                                                                                                                |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/api/`                                                 | Elysia, PostgreSQL/Drizzle Bun SQL, catalog/publication/playback, native S3 signing dan worker FFmpeg. Kontrak serta visibility authoritative. |
| `apps/web/`                                                 | TanStack Start/Router/Query, type-only Eden, same-origin gateway, shadcn Base UI, theme dan Video.js. Owner layar katalog/detail/watch.        |
| `packages/auth/`                                            | Better Auth server/client/types; operasi admin existing. Katalog tidak perlu reader sesi atau login.                                           |
| `docs/`                                                     | Canonical product/architecture/guides/operations/design/tasks/plans. Status implemented dipisahkan dari proposal dan production proof.         |
| `scripts/`                                                  | `check-docs.mjs`: kategori/nama, local link/anchor dan retired path validator.                                                                 |
| `.agents/`, `.commandcode/`, `skills-lock.json`             | Skill repository, symlink dan metadata instalasi. Tidak perlu perubahan untuk fitur ini.                                                       |
| `.husky/`, `commitlint.config.cjs`                          | Gate docs/lint/types dan Conventional Commits; local task commit sudah diotorisasi root AGENTS.                                                |
| Root manifests, `bun.lock`, `turbo.json`                    | Bun workspace dan quality gates. Tidak ada kebutuhan dependency/pipeline baru yang terbukti.                                                   |
| `README.md`, `AGENTS.md`, `LICENSE`, `.gitignore`, `.npmrc` | Quick start, aturan kerja, lisensi dan konfigurasi repo. Tidak perlu diubah oleh implementasi katalog.                                         |

## Architecture and boundaries

`apps/api/src/app.ts:createApp` memasang catalog dan playback tanpa listen; `src/index.ts` menyuntikkan satu CatalogStore, CatalogService, PlaybackService, storage profile dan callback invalidation sesudah mutation. Catalog/Playback tidak memakai guard admin pada public routes. Worker/HLS/upload/signing existing tidak perlu dipindahkan atau diduplikasi.

`apps/web/src/lib/api/client.ts:createApiClient` memakai `import type App` dari `api/types`; browser origin berasal dari `VITE_API_URL`, lalu `/api`. Client default memakai credentials include/cache no-store; `createPrivateApiClient` menambahkan auth transition. Pembaca katalog harus memakai public fetcher tanpa private transition, cookie atau authorization.

`src/lib/server/auth-gateway.ts` business allowlist sudah mencakup `/api/videos/...`; gateway menghapus satu prefix `/api`, memakai fixed `API_INTERNAL_URL`, menghapus cookie/authorization untuk public business path dan mengeluarkan `private, no-store`. Endpoint poster pada namespace `/videos` dapat memakai gateway ini tanpa perlu memperlebar allowlist. Cache 60 detik merupakan cache service metadata, bukan alasan membuat signed DTO/cache HTML publik.

Router membuat QueryClient per context (`src/router.tsx`, `src/integrations/tanstack-query/root-provider.tsx`) dan integrasi SSR Query tersedia. Pola `createIsomorphicFn` + `createServerOnlyFn` pada auth merupakan contoh batas server/client, tetapi pembaca katalog baru harus tidak memanggil auth reader atau meneruskan sesi. Signed poster/playback harus browser-only dan tidak masuk SSR HTML/dehydration.

## Runtime and data flow

### Katalog metadata

1. `GET /videos` → CatalogQuery (`limit`, `cursor`) → CatalogService.list → parseList(`public-videos`) → CatalogStore.playable → page → PublicVideoListDto.
2. Store melakukan filter readiness source/HLS/poster current-generation, published/rights/metadata, duration sesuai kind dan parent aktif/published bagi episode; urutan `(createdAt,id)` descending sebelum limit.
3. Default limit 20, maksimal 100; cursor version 1 base64url mengikat scope dan filter. API public belum menerima filter kind/search. List saat ini dapat mencakup episode.
4. DTO: id, slug, title, synopsis, kind, durationMs, seasonNumber, episodeNumber, seriesSlug. Tidak ada cover URL, genre atau release/publication timestamp.
5. `GET /videos/:slug`, `/videos/:slug/next`, `/series`, `/series/:slug` memakai effective visibility. Next episode existing tetap kompatibilitas, bukan UX tahap pertama.
6. CatalogService menyimpan metadata unsigned pada Map, TTL 60 detik, maksimal 100 key sebelum clear. `invalidate()` clear sesudah publish/archive/metadata mutation. Read in-flight dapat menulis kembali cache setelah clear karena belum ada revision guard: ini risiko source yang dapat diuji deterministik.

### Poster dan playback

`GET /videos/:slug/playback` → PlaybackService.info → uncached `store.playable` → playbackReadiness(profile/duration/HLS prefix) + posterReadiness(outputFiles/namespace) → masterUrl, signed posterUrl, expiresAt. TTL `ceil(2 × verifiedDurationMs / 1000)`. Service memakai native `S3Client.presign`; source asli tidak disajikan sebagai playback. Belum ada public endpoint poster terpisah.

Rancangan kartu katalog membutuhkan kapabilitas cover tanpa meminta playback DTO/master untuk semua kartu. Inferensi: tambah method `PlaybackService.poster` dan DTO/route `GET /videos/:slug/poster`, reuse row/readiness/signing; metadata list/detail tetap unsigned. Poster bytes tetap direct storage. Tidak diperlukan tabel/media asset baru menurut data source yang diperiksa.

### Web

- `src/routes/index.tsx` menampilkan “Welcome to TanStack Start”, Button dan MP4 demo; belum membaca catalog.
- `src/routes/watch.$slug.tsx` memakai callback browser `.videos({slug}).playback.get()` dan VerticalVideoPlayer dalam max-w-sm; belum ada metadata, navigation shell, route-level not-found atau detail page.
- `src/components/vertical-video-player.tsx` memakai Video.js `10.0.0-rc.4` dan HlsJsVideo, aspect 9:16, playsInline, renew/seek/paused preservation, terminal bounded error serta epoch guards. Integration tidak perlu mengganti skin/adapter.
- Root lang `en`, judul starter, theme bootstrap/ThemeProvider/toast; English merupakan proposal konsistensi copy UI publik. Per-route metadata dapat mengganti judul starter tanpa mengubah judul admin.
- ThemeMenu berada dalam folder admin tetapi membaca provider publik; item menu dapat direuse tanpa data/account admin. Empty/Skeleton/ToggleGroup/Badge/Alert/Button existing tersedia.

## Domain and data model

| Data/invariant                                          | Implikasi                                                                                                                   |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `videos.kind`: movie/standalone/episode                 | Filter Film/Standalone harus di SQL sebelum pagination; filter browser setelah limit akan membuat halaman kosong/skip.      |
| source/poster + readyJobId/generation/facts/outputFiles | Poster URL hanya dari output terverifikasi dan storage profile yang cocok; jangan sign source/original atau path dari user. |
| unsigned PublicVideo DTO                                | Tetap terpisah dari kapabilitas temporer; server fetch/SSR boleh hanya metadata unsigned.                                   |
| cursor `(createdAt,id)` dan filter version 1            | Normalize kinds; cursor filter berbeda harus ditolak, bukan melanjutkan dataset lain.                                       |
| archived/draft/absent/hidden                            | API detail/poster/playback harus tidak membocorkan konten privat; cached katalog bisa tertinggal hingga batas freshness.    |
| original source tombstone                               | HLS playable/provenance sah tetap dapat ditonton; detail/cover jangan mensyaratkan original HEAD.                           |

## External integrations

PostgreSQL untuk catalog; MinIO untuk proof lokal; R2 production belum diverifikasi. Browser proof memakai runner Node/Playwright/Chromium yang sudah dikonfigurasi terpisah dari dependency runtime. Native FFmpeg worker diperlukan untuk proof media nyata; unit memakai injected store/signer/clock. Tidak ada rekomendasi provider baru atau perubahan env/deployment dalam scope.

## Development, testing, and delivery

- Root Bun minimum/required development 1.4.2; binary lokal `/home/bandev/.bun/bin/bun` diverifikasi 1.4.2, belum tersedia default PATH.
- API `test` = `bun test ./src`; catalog belum memiliki test colocated. Playback service/manifest dan shared pagination memiliki test. Integrasi media-series/publication/hls memakai dedicated `vertical_movie_app_media_test` dengan reset guard, wajib serial.
- Web tests native Bun di `apps/web/test`; business-gateway dan auth import/SSR/browser harness existing dapat direuse. `media-playback-fixture.ts`/`media-playback-browser.mjs` membuktikan HLS watch actual; APUB browser harness membuktikan anonymous watch setelah publish.
- Root gates implementasi: relevant tests, check-types (api/web/auth), lint (web), build (api/web). Docs-only: docs:check, scoped Prettier, git diff --check. Commit hook menambah docs/lint/types.
- Run `bun run --cwd apps/web generate-routes` setelah perubahan route; routeTree generated, tidak hand-edit. Frozen install hanya bila scripts/dependencies berubah; migration development/preservation bila schema berubah.
- Commit tiap task dengan ID; push/PR/merge/deployment memerlukan instruksi tersendiri. Freshness target branch/source sebelum implementasi.

## Constraints and conventions

Ikuti root [AGENTS](../../../AGENTS.md), [API development](../../guides/api-development.md), [workflow](../../guides/development-workflow.md), [environment](../../guides/environment.md) dan [design system](../../design/design-system.md). Semantic tokens/Base UI Rhea/Remixicon; light/dark, primary lime dan dark #1E201E existing. Card poster 9:16 tanpa stretch/crop tersembunyi; kontrol sentuh minimal 44px.

Installed videojs skill dan bundled React docs rc.4 dibaca untuk planning watch. CLI unpinned mencetak instruksi 10.0.1 dan mismatch; perintah pinned `bunx --bun @videojs/cli@10.0.0-rc.4 agents init --method shadcn --framework react` dari apps/web menghasilkan instruksi matching. Hanya generator instruksi dijalankan, tidak init/add/install player; root lockfile/source tetap utuh.

## Relevant active work

Awal task ada 23 file dirty existing: docs index/design system, web-build evidence, export/prompt/PNG/JSON desain dan backlog design system. Semua dipertahankan; perubahan index katalog harus ditambahkan ke overlay dan hanya hunk milik katalog di-stage. Source/manifest/lockfile target bersih pada base SHA. Remote belum di-fetch; current main harus diperiksa sebelum execution jika dipakai sebagai base.

## Exploration coverage

Inspected: root instructions/manifests/hooks, semua top-level subsystem, PRD/Global Rules/architecture, catalog seluruh modul, playback index/service/readiness, pagination, bootstrap/factory, browser gateway/client/SSR/query/router/home/watch/theme/player dan proof fixtures/test owners. Cakupan cukup untuk memetakan API → SQL → unsigned DTO → web serta media authorization/signing.

Tidak menjalankan proof runtime/DB/storage atau audit ulang seluruh worker/auth; tidak mengubah produk, source, schema, env/dependencies. Safari/native HLS/R2/resource/full restore tetap gerbang existing, bukan proof baru planning.

## Unknowns and assumptions

- Grid/Load more vs feed, filter, jumlah item, copy dan desain final belum disetujui. Proposal dibekukan dalam plan untuk review, bukan langsung menjadi approved PRD.
- Search/genre/sort alternatif diusulkan ditunda agar tahap ini fokus discover/detail/watch; tidak ada search yang hanya memfilter halaman termuat.
- Kebijakan indexing/share metadata belum disepakati: proposal sementara noindex untuk rute publik baru sampai keputusan produk; tidak menambah canonical origin/env atau social image signed.
- Server-only public fetch memakai API_INTERNAL_URL yang sudah ada; correctness import protection/hydration/status perlu dibuktikan saat implementation, bukan diasumsikan dari auth proof.

## Evidence index

Seluruh source berikut dibaca pada SHA snapshot di atas; dokumen desain disebut sebagai working-tree overlay bila berbeda dari commit.

| Bukti/path/simbol                                                                                                              | Mendukung                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| `apps/api/src/modules/catalog/{index,model,service,repository}.ts`: createCatalogModule, CatalogService, CatalogStore.playable | Public routes, DTO, readiness, ordering, cache dan celah kinds/poster.     |
| `apps/api/src/shared/content-pagination.ts`: parseList/page                                                                    | Cursor filter binding dan limit.                                           |
| `apps/api/src/modules/playback/{index,service}.ts`, `src/shared/media-readiness.ts`                                            | Signed DTO, uncached visibility, namespace/profile/TTL dan native presign. |
| `apps/api/src/{app,index}.ts`                                                                                                  | Factory contract/DI/invalidation dan public route scope.                   |
| `apps/web/src/lib/api/client.ts`, `lib/server/{auth,business}-gateway.ts`                                                      | Type-only Eden, fixed upstream dan public header stripping.                |
| `apps/web/src/{router.tsx,integrations/tanstack-query/root-provider.tsx}`, `lib/auth/{session.ts,session.server.ts}`           | Query/SSR lifecycle dan existing isomorphic boundary pattern.              |
| `apps/web/src/routes/{index.tsx,watch.$slug.tsx,__root.tsx}`                                                                   | Starter homepage, minimal watch, root language/theme.                      |
| `apps/web/src/components/vertical-video-player.tsx`, `components/videojs/`, `components/admin/theme-menu.tsx`                  | Reusable player/theme dan current renewal guards.                          |
| `apps/api/test/integration/{media-series-proof.test.ts,media-publication-proof.test.ts,media-playback-fixture.ts}`             | Dedicated fixture/reset dan visibility/actual playback proof owners.       |
| `apps/web/test/{business-gateway.test.ts,auth-import-boundary-proof.mjs,auth-browser-smoke.mjs}`                               | Gateway regression, client import protection dan browser harness owners.   |
| `package.json`, `apps/{api,web}/package.json`, `packages/auth/package.json`, `.husky/pre-commit`                               | Runtime, scripts, workspace quality gates/commit workflow.                 |
| `docs/product/{prd,global-rules}.md`, `docs/architecture/overview.md`, `docs/operations/media.md`                              | Product scope, unapproved UX/indexing, media/production limits.            |

## Validation history

2026-10-08: HEAD/source snapshot diperiksa lokal; source target tidak mempunyai diff terhadap base. Overlay docs dipisahkan dari facts source. Context ditulis sebelum plan. Freshness execution belum dilakukan karena implementasi belum diminta.

## Execution freshness — 8 Oktober 2026

Source/proof head `bf881cd1b9b33bc58ec829a78b0b961fa9ec40a7` pada feat/public-catalog memakai baseline main65127a1 dan plan pilihan chore/public-catalog-plan68a0053. Desain/kelanjutan disetujui pengguna8 Oktober 2026; Film/Standalone homepage20/type, unsigned SSR/detail dan signed cover queue/browser watch implemented/verified lokal. API/Series/episode direct routes dan custom hooks convention dipertahankan. Snapshot awal dan PCAT/PCW3-kind behavior di atas tetap sejarah; current contracts pada PRD/architecture/runbook, evidence dan receipts pada backlog/plan. Remote delivery/production tidak diambil dari local proof.
