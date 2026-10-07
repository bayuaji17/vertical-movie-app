# Repository Context — Integrasi katalog publik

## Snapshot

- Repository: [bayuaji17/vertical-movie-app](https://github.com/bayuaji17/vertical-movie-app).
- Base ref: `main` / `origin/main`.
- Base SHA: `ba42d00728e66dd9cbeb0f3d916ae8ddea339f4b` (merge homepage PR #10).
- Analyzed at: 2026-10-07T03:28:57Z.
- Context status: current pada snapshot; refresh sebelum implementasi.
- Mode: planning. Pengguna memilih rekomendasi point1 dan meminta plan detail; runtime belum diotorisasi oleh permintaan plan.
- Checkout analisis: worktree homepage existing; tree `42ec6568d226398b49a92c5ec974febf02979eea` identik dengan base merge di atas. Branch lokal planning: `feat/public-catalog-api` dari base. Checkout utama mempunyai perubahan desain/docs terpisah dan tidak dipakai untuk penulisan ini.

## Product and Users

Pengunjung melihat katalog published tanpa akun. Homepage dummy yang disetujui sudah mempunyai Film, Series dan Standalone, featured Film, search title/synopsis, filter jenis/genre, dialog metadata, Light/Dark/System, SSR enam kartu, Load more manual dan skeleton halaman berikutnya. Scope point1 mengganti sumber data homepage dengan API nyata. Detail route publik baru, integrasi watch, editor season/episode, player dan production rollout merupakan fitur lanjutan.

PRD-07/08 dan GR-02 relevan. Urutan produksi belum disetujui: fixture memakai publishedAt descending/id ascending, sedangkan API video memakai createdAt/id descending. Rekomendasi urutan dan featured dalam plan merupakan proposal, bukan keputusan produk yang sudah implemented.

## Repository Map

| Subsystem                                          | Peran / relevansi                                                                                                                                           |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/api`                                         | Elysia/Bun, PostgreSQL/Drizzle, metadata, katalog, publication, storage/playback dan worker. Pemilik query published, DTO publik, poster dan cache backend. |
| `apps/web`                                         | TanStack Start/Router/Query, homepage, admin, same-origin gateway dan watch. Pemilik adapter Eden, SSR, pagination/filter dan state UI.                     |
| `packages/auth`                                    | Better Auth single-admin, exports server/client/types; tidak perlu perubahan fitur ini.                                                                     |
| `docs`                                             | PRD/aturan, architecture, guides/runbooks, desain dan backlog/plan canonical.                                                                               |
| `scripts`                                          | `check-docs.mjs`; validator yang dijalankan pada dokumen baru.                                                                                              |
| `.agents`, `.commandcode`, `skills-lock.json`      | Skill konfigurasi repository; player skill hanya untuk perubahan audio/video.                                                                               |
| `.husky`, `commitlint.config.cjs`                  | Hook docs/lint/types dan Conventional Commit per task.                                                                                                      |
| `package.json`, `bun.lock`, `turbo.json`, `.npmrc` | Workspace Bun/Turbo dan dependency/config; tidak membutuhkan library baru berdasarkan scope yang ditelusuri.                                                |
| `README.md`, `AGENTS.md`, `.gitignore`, `LICENSE`  | Quick start, instruksi, exclusion env/build/cache dan lisensi.                                                                                              |

## Architecture and Boundaries

- API factory typed `createApp` menyusun `createCatalogModule`, publication dan playback melalui method chaining. `apps/api/src/types.ts` mengekspor kontrak App untuk import type Eden; runtime API/auth/config tidak boleh masuk bundle browser.
- Bootstrap `apps/api/src/index.ts` membuat satu CatalogService dan menghubungkan `catalogService.invalidate` ke PublicationService, VideosService dan SeriesService. GenresService saat ini tidak menerima invalidation katalog.
- Browser memakai `/api/...`; `apps/web/src/routes/api/$.ts` meneruskan lewat business gateway. Allowlist saat ini hanya admin business, videos, series dan playback; `/api/catalog` belum diterima.
- Business gateway menolak semua redirect, membuang cookie pada public business requests/responses dan membuffer respons dengan batas default1.048.576 byte. Poster binary baru memerlukan batas respons terpisah atau strategi delivery lain; jangan menganggap image redirect/ukuran besar otomatis didukung.
- API_INTERNAL_URL adalah server-only trusted config. SSR publik tidak memerlukan session/auth, cookie atau inbound Host sebagai target jaringan.
- QueryClient baru dibuat untuk setiap router melalui `getContext`; SSR Query integration sudah tersedia. Homepage saat ini belum memiliki loader API. Installed Query core5.104.0 menyediakan queryClient.query/infiniteQuery dan menandai ensure helpers deprecated; react-start1.168.59 mengekspor createIsomorphicFn/createServerOnlyFn. Plan mengikuti sumber paket terpasang.

## Runtime and Data Flow

### Homepage saat ini

`routes/index.tsx → HomePage → catalogInfiniteOptions → getCatalogPage → catalog.json`. Query key memakai namespace dummy, initialData synchronous, offset0/6/12, staleTime Infinity dan networkMode always. Filter transition cancel exact keys lalu seed page dummy; ini tidak cocok untuk network API. Komponen filters/labels/featured langsung mengimpor fixture. CatalogGrid mengasumsikan query.data/total tersedia dan belum menangani error/initial loading.

Schema fixture memakai ID slug, genre minimal satu, poster lokal PNG dan featuredId wajib Film. Backend memakai UUID; konten nyata bisa tanpa genre dan katalog bisa kosong/tanpa Film. API view model harus dipisahkan dari validasi fixture, dengan union movie/standalone/series, composite identity kind+UUID dan genre opsional.

### API saat ini

| Endpoint API internal        | Perilaku yang diamati                                                                                                                     |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /videos?limit&cursor`   | PublicVideoListDto, cursor createdAt/id, termasuk episode yang efektif playable; tanpa search/kind/genre/poster/publishedAt/total.        |
| `GET /videos/:slug`          | Metadata satu video efektif playable.                                                                                                     |
| `GET /videos/:slug/next`     | Episode berikutnya berdasarkan seasonNumber/episodeNumber; bukan pagination homepage.                                                     |
| `GET /series`                | Daftar parent published aktif, maksimal100 rows, lalu count playable per parent melalui loop; tidak cursor-paginated.                     |
| `GET /series/:slug`          | Lookup dari daftar series di atas.                                                                                                        |
| `GET /videos/:slug/playback` | DTO HLS/poster bertanda tangan dan expiresAt; memeriksa visibility/profile/readiness. Tidak layak dipanggil per kartu hanya untuk poster. |
| `GET /admin/genres`          | Taxonomy privat; pengunjung tidak boleh memakainya sebagai filter publik.                                                                 |

Cache CatalogService: Map bounded100 entries, TTL60s, invalidation clear setelah mutation terkait. Cache insertion sesudah awaited read belum mempunyai generation fence; in-flight read bisa mengisi kembali data lama setelah invalidation. Cache baru harus mempertimbangkan race tersebut.

## Domain and Data Model

- `videos`: movie/standalone/episode; UUID, slug, metadata, publishedAt/firstPublishedAt, rights, sourceAssetId/posterAssetId dan status editorial.
- `series → seasons → videos`: parent/season active gate memengaruhi visibility episode; series hanya tampak bila published, metadata lengkap dan ada child efektif playable.
- `genres`, `video_genres`, `series_genres`: taxonomy UUID/slug/name dan relasi many-to-many. Genre card Series berasal dari parent, bukan gabungan genre episode.
- `media_assets`, `media_jobs`: state, owner, provider/bucket, generation/readyJobId, facts, outputPrefix/outputFiles. Thumbnail menggunakan poster ready output, bukan source/original.
- CatalogStore.playable menggabungkan status editorial/rights/duration, source/HLS/poster readiness dan parent visibility. Publication dan PlaybackService bergantung pada CatalogStore; ekstraksi predicate harus mempertahankan perilaku legacy.
- SeriesList saat ini tidak memeriksa ulang current parent poster job; endpoint homepage baru perlu gate poster parent untuk kartu valid. Genre join tidak boleh menggandakan kartu/count.
- publishedAt PostgreSQL dapat memiliki precision mikrodetik. Cursor baru tidak boleh kehilangan precision karena konversi Date.toISOString tiga digit bila SQL mengurutkan timestamp lebih presisi.

Tidak ditemukan kebutuhan tabel konten baru. Index publishedAt/genre/visibility tambahan harus dibuktikan dengan EXPLAIN pada test dataset; migration hanya bila hasil mengharuskan perubahan schema/index.

## External Integrations

PostgreSQL melalui Bun SQL/Drizzle; development storage MinIO, target production R2; poster WebP dan HLS output existing. Bun native S3Client mendukung storage access. Secret/provider/bucket/object key tetap server-only. Playback signing TTL2×verified duration dan renewal existing tidak diubah oleh integrasi katalog.

Proposal plan memakai poster URL same-origin yang menyajikan binary WebP, sehingga metadata katalog tetap unsigned. Ini mempunyai biaya traffic melalui API/web dan memerlukan response limit/gateway test khusus; merupakan rekomendasi desain yang akan ditinjau, bukan runtime sekarang.

## Development, Testing, and Delivery

- Bun1.4.2; root types meliputi API/web/auth, root lint hanya web, root build API/web.
- Test unit API memakai bun:test dan app.handle(Request); test web existing memakai bun:test serta browser worker Playwright melalui runner existing.
- `media-fixture.ts` hanya menerima loopback database `vertical_movie_app_media_test`; reset destruktif tidak boleh memakai development. Storage/browser proof memakai random test bucket.
- Baseline latest delivery HOMEFE-013 mempunyai285 tests/1455 assertions dan built homepage/skeleton proof. Ini evidence historis pada source dummy, bukan bukti integrasi API baru.
- Planning hanya memerlukan docs:check, Prettier dan diff checks. Hook normal local commit juga memeriksa lint/types; tidak mengklaim runtime test baru dari planning.
- Standing workflow AGENTS mengotorisasi local task commits; push/PR/merge plan baru tidak otomatis diotorisasi oleh delivery fitur sebelumnya.

## Constraints and Conventions

Pertahankan tampilan dan accessibility yang disetujui, pageSize6 serta manual Load more. Gunakan Eden type-only contract, error throw yang aman, AbortSignal, namespace public catalog dan request-scoped SSR. Jangan mengosongkan private admin cache pada kegagalan katalog publik. Tidak hand-edit routeTree, install dependency, membuat env baru, membuka signup atau memperluas player/editor scope.

## Relevant Active Work

Main sudah mencakup homepage dummy PR #10 dan publication Film/Standalone PR #9. Perubahan desain/build docs lokal checkout utama berada di luar fitur. Canonical HOMEFE tetap menyimpan bukti tahap dummy; modul PCAT akan menyimpan integrasi API sehingga baseline historis tidak ditulis ulang sebagai API proof.

## Exploration Coverage

Inspected: root instructions/index/manifests/tooling; semua subsystem top-level; PRD/global rules/media runbook; catalog model/store/service/routes, app/bootstrap; publication poster gate/shared readiness; playback sebagai caller, bukan target perubahan; genre/schema/publication timestamps; home query/schema/selectors/components; Eden client/gateway/SSR/router; task template/workflow dan unit/integration/browser harness.

Excluded: secrets/env aktual, production provider/DB, worker encoder details, design export lokal dan perubahan player. Exclusion tidak menutup gap kontrak homepage; proof provider/performance sesungguhnya tetap task implementasi.

## Unknowns and Assumptions

Proposal yang perlu persetujuan plan: semua tiga jenis tetap tersedia; order publishedAt-desc/id-asc/kind-asc; featured Film terbaru; debounce300ms; poster same-origin binary; detail tetap dialog tanpa watch integration. Ukuran/volume katalog nyata, response WebP maksimum dan index yang diperlukan belum diukur. Keberadaan tabel/backend tidak membuktikan adanya published rows di development; empty catalog harus sah tanpa seed dummy otomatis.

## Evidence Index

Semua path/symbol di bawah diperiksa pada tree base SHA di Snapshot; path lebih tahan perubahan daripada line ranges.

| Kesimpulan                                  | Evidence path / symbol                                                                                                                                                                                                               |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Scope dan keputusan urutan belum final      | `docs/product/prd.md`:PRD-07/08, Keputusan produk yang masih terbuka; `docs/product/global-rules.md`:GR-02; `docs/plans/home-catalog/implementation-plan.md`                                                                         |
| Local initialData/offset/fixture dependency | `apps/web/src/lib/catalog/catalog-queries.ts`:catalogInfiniteOptions/createCatalogTransition; `catalog-selectors.ts`:getCatalogPage; `components/catalog/home-page.tsx`:HomePage                                                     |
| Fixture/UI assumptions                      | `apps/web/src/lib/catalog/catalog-schema.ts`:CatalogDataSchema; `components/catalog/catalog-filters.tsx`; `poster.tsx`; `catalog-grid.tsx`                                                                                           |
| Legacy routes/DTO                           | `apps/api/src/modules/catalog/index.ts`:createCatalogModule; `model.ts`:CatalogQuery/PublicVideoDto/PublicSeriesDto; `service.ts`:CatalogService                                                                                     |
| Visibility, precision dan hierarchy         | `apps/api/src/modules/catalog/repository.ts`:CatalogStore; `apps/api/src/db/schema/{videos,series,seasons,genres,content-columns}.ts`; `apps/api/src/shared/content-pagination.ts`:parseList/page                                    |
| Poster/provider gate dan legacy dependency  | `apps/api/src/shared/media-readiness.ts`:playbackReadiness/posterReadiness; `modules/playback/service.ts`:PlaybackService.info; `modules/publication/service.ts`:publish                                                             |
| DI/invalidation/typed consumers             | `apps/api/src/{app,index,types}.ts`; `modules/genres/service.ts`; `apps/web/src/lib/api/client.ts`:createApiClient                                                                                                                   |
| Gateway gaps / cookie isolation             | `apps/web/src/lib/server/auth-gateway.ts`:targetPaths/forwardedResponseHeaders/createAuthGateway; `business-gateway.ts`; `routes/api/$.ts`                                                                                           |
| SSR per-router cache                        | `apps/web/src/router.tsx`:getRouter; `integrations/tanstack-query/root-provider.tsx`:getContext; `lib/auth/session.server.ts`:server-only request pattern                                                                            |
| Real proof / tooling                        | `apps/api/test/integration/media-fixture.ts`, `media-publication-proof.test.ts`, `media-series-proof.test.ts`; `apps/web/test/{home-catalog-browser-worker,auth-browser-smoke}.mjs`; app/root package.json; `docs/templates/task.md` |
