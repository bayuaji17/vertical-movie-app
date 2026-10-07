# Implementation plan: homepage dan katalog FE dengan dummy JSON

## Plan metadata

- Status: **implemented/verified lokal — 7 Oktober 2026**.
- Tanggal: 7 Oktober 2026.
- Repository: `bayuaji17/vertical-movie-app`.
- Base ref: `feat/home-catalog-mockup`.
- Base SHA: `b90edaaaca83187726218286fdaf253958a483fe`.
- Context: [repository-context.md](repository-context.md).
- Last validated SHA: `f03030e3a009a2ad41c659d509640fc434f4f513`.
- Backlog canonical: [HOMEFE-000–010](../../tasks/home-catalog.md).
- Otorisasi pengguna: mockup disetujui dan plan detail diminta; seluruh data tahap ini dummy JSON, fokus FE. Pengguna menyetujui implementasi setelah klarifikasi useInfiniteQuery. Runtime FE selesai dan terverifikasi lokal; playback/API tetap di luar tahap ini.

## Objective

Mengganti starter route `/` dengan homepage/katalog sesuai [mockup approved](../../design/home-catalog.md), lengkap dengan interaksi lokal, tanpa dependency data/API/storage/auth. Hasil nanti harus dapat dilihat pada web dev dan build Bun/Nitro walau API dihentikan.

## Goals and non-goals

Dalam scope: public header/nav/appearance, intro, featured Film, poster catalog Film/Series/Standalone, pencarian, filter jenis/genre, latest ordering, Load more, empty/fallback, detail dialog lokal, responsive/light-dark/system dan page metadata.

Di luar scope: membaca API/Eden/gateway untuk katalog, login pengunjung, database/migrasi, publication/admin, watch/HLS, signed URL, episode navigation/player, favorites/history/likes/rating, remote images dan hosted CI/deployment. Tidak membuat MSW/mock HTTP server karena JSON langsung cukup.

## Current behavior

Pada baseline planning, home masih starter dengan demo MP4 eksternal. Theme root sudah tersedia. Watch existing memanggil API playback. Pada baseline, komponen public catalogue belum ada; primitive shadcn sudah mencukupi. Tabel evidence/fakta berada pada [context](repository-context.md#evidence-index).

## Desired behavior

### Halaman, komposisi dan copy

Route tetap `/`; tidak membuat route baru untuk Browse atau detail pada tahap ini. Home/brand mengembalikan ke bagian atas dan reset filter; Browse mengarahkan focus/scroll ke section `#catalog`, mempertahankan filter. Di mobile menu berupa Sheet, menutup sesudah navigasi. Gunakan semantic anchor/link sesuai aksi, bukan tautan placeholder `href="#"`.

Header desktop: logo/brand, Home/Browse, search dan Appearance. Mobile: brand, Appearance/menu, search pada baris berikutnya. Satu search control aktif per breakpoint, keduanya membaca state yang sama; kontrol yang hidden tidak bisa menerima fokus. Navigasi tidak meminta sesi/admin.

Intro: STORIES IN PORTRAIT / Find your next story. / Films, series, and short stories. Watch without an account. Featured: After the Rain, metadata Film/Drama/18 min, synopsis pada desktop; mobile boleh menyembunyikan synopsis agar ringkas, thumbnail tetap portrait. Feature muncul hanya pada default query kosong, kind all dan genre all; saat melakukan pencarian/filter, fokus visual pada hasil katalog. Tidak membuat carousel/autoplay.

CTA dummy utama diusulkan **View film**, menggantikan Watch film dari raster untuk membuka detail tanpa menjanjikan playback. View details dan klik kartu membuka dialog yang sama. Series menampilkan detail title/synopsis/genre/jumlah episode; tidak membuka endpoint/list episode. Dialog mempunyai title/description, close button, Escape/focus trap/focus return, scroll internal bila layar pendek. Tidak ada disabled play button atau dummy URL menuju route watch API.

Footer: brand dan Vertical stories. Open to everyone. Copy English mengikuti desain; tidak menambahkan data demo/peringatan teknis ke flow utama. Batas dummy dicatat pada dokumentasi.

### Kontrak JSON dan tipe lokal

Satu source `apps/web/src/data/catalog.json`, imported statically. `catalog-schema.ts` memakai Zod existing untuk parse sekali dan menginfer tipe; UI menerima model lokal, bukan import DTO API. Aktifkan `resolveJsonModule: true` pada tsconfig web bila type check import JSON membutuhkannya; plan menetapkan setting eksplisit agar perilaku jelas.

```json
{
  "schemaVersion": 1,
  "featuredId": "film-after-the-rain",
  "genres": [
    { "id": "drama", "label": "Drama" },
    { "id": "mystery", "label": "Mystery" },
    { "id": "slice-of-life", "label": "Slice of life" },
    { "id": "comedy", "label": "Comedy" },
    { "id": "documentary", "label": "Documentary" }
  ],
  "items": [
    {
      "id": "film-after-the-rain",
      "slug": "after-the-rain",
      "kind": "movie",
      "title": "After the Rain",
      "synopsis": "A chance encounter on a rainy evening brings two strangers closer to home.",
      "genreIds": ["drama"],
      "poster": "/images/catalog/after-the-rain.png",
      "publishedAt": "2026-10-06T10:00:00Z",
      "durationMs": 1080000
    },
    {
      "id": "series-the-last-train",
      "slug": "the-last-train",
      "kind": "series",
      "title": "The Last Train",
      "synopsis": "A late departure turns an ordinary journey into a mystery.",
      "genreIds": ["mystery"],
      "poster": "/images/catalog/the-last-train.png",
      "publishedAt": "2026-10-06T09:00:00Z",
      "episodeCount": 8
    }
  ]
}
```

Contoh di atas parsial; fixture final berisi **18 items, masing-masing enam movie/series/standalone**. Enam pertama: After the Rain; The Last Train; A Small Beginning; Letters to Home; Midnight Kitchen; City in Motion. Durasi fixture mengikuti raster 18/4/24/6 min, episode counts 8/6. Dua belas sisanya fiktif, dapat reuse enam poster; ID/title/slug harus unik. Sediakan judul panjang/Unicode untuk proof layout, serta publishedAt sama untuk proof tie-break. Timestamp selalu string ISO UTC, bukan nilai runtime acak.

Validasi: kind discriminated union; movie/standalone durationMs positif, series episodeCount integer positif; field jenis yang tidak relevan ditolak; ID/slug unik, genre IDs tersedia, featuredId menunjuk movie, poster path lokal saja. Hindari casts `as CatalogItem[]` yang menutupi mismatch. Fixture tidak berisi token/credential/storage key, source URL, status worker atau metadata admin.

`catalog-data.ts` mengexport parsed read-only items/genres/featured. Selector halaman tetap pure. Adapter queryFn mengembalikan Promise dari hasil JSON lokal karena useInfiniteQuery memerlukan kontrak query; tanpa fetch, timeout atau simulasi latensi. Integrasi API dapat mengganti adapter pada task lanjutan, tanpa membuat HTTP mock sekarang.

### Query, filter, urutan dan Load more

Refinement pengguna 7 Oktober 2026: gunakan **TanStack Query useInfiniteQuery**, tetap dengan dummy JSON. Tombol Load more adalah pemicu fetchNextPage; tidak menambahkan IntersectionObserver atau automatic scroll trigger.

State React hanya search/kind/genre/selectedItemId; halaman/loaded items dimiliki infinite query. Reuse QueryClient per router dan setupRouterSsrQueryIntegration existing. Buat catalog-queries.ts dengan infiniteQueryOptions dan hook useInfiniteQuery; tidak membuat QueryClient singleton atau provider baru.

Query key: ['catalog', 'dummy', schemaVersion, { search: normalizedSearch, kind, genreId, pageSize: 6 }]. Prefix publik terpisah dari admin/auth. pageParam merupakan offset numerik, initialPageParam=0. Pure getCatalogPage menerapkan title/synopsis search trim/case-insensitive, kind+genre AND, publishedAt descending/id ascending, lalu slice(offset, offset+6). Return { items, total, nextOffset }; nextOffset undefined bila habis, termasuk hasil kosong. getNextPageParam(lastPage) mengembalikan lastPage.nextOffset. UI meratakan data.pages.flatMap(page => page.items), tanpa visibleCount atau salinan array loaded items.

Adapter queryFn mengembalikan Promise dari JSON yang sudah diparse, membaca signal dan menghormati cancellation; tidak memanggil API atau mengambil JSON lewat HTTP. Gunakan networkMode='always' karena sumbernya lokal, staleTime=Infinity, retry=false, serta refetchOnMount/refetchOnWindowFocus/refetchOnReconnect=false. Tidak memakai maxPages yang membuang halaman awal. QueryClient existing tetap memiliki batas garbage collection existing untuk query tidak aktif.

SSR dan initial render memakai initialData { pages: [getCatalogPage(filters, 0)], pageParams: [0] } yang dibangun dari fixture yang sama untuk setiap key. Shape InfiniteData dipertahankan; initialPageParam tidak undefined. Default server/client menampilkan enam kartu pada semua ukuran. Tidak menunggu API/server loader baru atau membuat skeleton/delay palsu.

Load more memanggil fetchNextPage({ cancelRefetch: false }) hanya bila hasNextPage && !isFetching; button disabled saat isFetching dan memakai isFetchingNextPage untuk busy state yang nyata. Tetap pertahankan halaman lama saat memuat; button hilang ketika hasNextPage=false. Klik cepat ganda harus tidak menambah request halaman/duplikasi/cancel-restart.

Perubahan search/kind/genre yang sudah dinormalisasi mengganti query key dan memulai dari offset0. Untuk menjaga requirement kembali ke enam termasuk saat kembali ke filter yang pernah memuat18, reset cache **key katalog tujuan saja**: cancelQueries({ queryKey: nextKey, exact: true }), seed first-page InfiniteData lewat setQueryData, lalu commit state filter. Ini dilakukan pada event, bukan render. Hook memakai options/key yang sama; jangan clear/reset seluruh QueryClient. Batalkan query lama yang sedang memuat agar hasil filter lama tidak masuk UI baru. Reset filters/Home menggunakan prosedur yang sama. Dialog, resize, theme dan Load more sendiri tidak mengganti key/reset pages.

Search input tidak memakai debounce/timer atau persist URL/storage pada tahap ini. Query key memakai nilai query yang normal, sehingga perubahan case/whitespace yang tidak mengubah arti tidak mengulang reset. Genre All genres berasal dari fixture; ToggleGroup single selection tidak boleh kosong. Reload kembali default, preference tema tetap existing.

Latest releases adalah **label urutan tetap**, bukan dropdown kosong/sort selector baru walau raster mobile menyerupai button. Semua genre/jenis tetap selectable untuk menguji hasil kosong. Empty memakai Empty primitive, teks No titles found dan Reset filters; reset mengembalikan query/kind/genre dan cache first-page serta fokus search yang aktif. Result count memakai live region polite dengan pesan ringkas, tanpa membanjiri announce saat mengetik.

### Poster, asset dan responsivitas

Enam source poster lokal berada di `apps/web/public/images/catalog/`; tidak memakai screenshot UI besar sebagai gambar poster dan tidak memakai URL Unsplash/CDN/API. Recreate scene approved lewat imagegen bila tidak ada source mandiri, simpan prompt/metode pada backlog/design. Assets dipilih/diperiksa sebelum implementasi page; fallback SVG lokal netral dapat dibuat sebagai code-native asset.

Frame selalu `aspect-[9/16]`; source image portrait dan object-fit cover, tidak stretch. Width/height intrinsic diketahui. Poster hero eager; grid memakai lazy/decoding async sesuai posisi, semua frame punya reserved space untuk mencegah layout shift. Failed image mengganti src sekali ke fallback lokal; fallback failure tidak membuat retry loop. Gambar di tombol kartu dekoratif memakai alt kosong bila accessible name sudah title; hindari announce ganda.

Gutter mobile 16px, desktop 24–48px; content max sekitar1376px, padding menyesuaikan lebar. Default grid dua kolom pada320–639px, tiga pada640–1023px, empat pada1024–1279px, enam pada≥1280px. Title boleh wrap dua/baris alami; type/genre dapat wrap. Pada320px, filter jenis dapat wrap ke dua baris; hindari horizontal overflow halaman. Mobile feature thumbnail dan text sejajar bila cukup ruang; pada320px dapat ditumpuk, tetap dalam panel.

Touch actions/search/filter target44CSSpx, visible keyboard focus, landmarks/skip link, heading order, contrast dan reduced motion. Sheet/Dialog bounded viewport dengan safe-area padding sesuai kebutuhan. Feature/grid bukan forced fixed-height canvas. Tidak menggunakan window.innerWidth untuk menentukan hasil SSR atau batch count.

Light mengikuti mockup approved; Dark/System memakai token CSS existing tanpa nilai hardcoded tiap halaman. Appearance dropdown publik hanya tiga mode, tidak mengambil Admin ThemeMenu yang menyertakan identity/session. Reuse useTheme dan theme bootstrap; hindari provider kedua. Fidelity dark adalah semantic rendering/contrast, bukan mockup dark baru.

## Impact analysis

Data/UI/state entirely apps/web; docs mencatat approval dan batas dummy. Tidak ada perubahan kontrak/schema API. Route index mengganti starter beserta import/player demo lama, override title/description pada head. Provider root/router/gateway/watch/auth tetap current. Type config hanya import JSON. Shared UI source hanya disentuh bila target44px tidak bisa dicapai dengan props/layout existing; harus direview tersendiri, tidak merombak primitive global.

## Affected files and symbols

| Path                                                                           | Action | Symbols / hasil                               | Alasan dan evidence                                                 |
| ------------------------------------------------------------------------------ | ------ | --------------------------------------------- | ------------------------------------------------------------------- |
| `apps/web/src/routes/index.tsx`                                                | modify | Route/Home/head                               | Entry starter pada context lines1–30; compose public page/metadata. |
| `apps/web/tsconfig.json`                                                       | modify | compilerOptions.resolveJsonModule             | Import JSON typed; strict config existing.                          |
| `apps/web/src/data/catalog.json`                                               | create | 18 fixture items, genres, featuredId          | Satu source dummy; tidak mempunyai API fetch.                       |
| `apps/web/src/lib/catalog/catalog-schema.ts`                                   | create | CatalogDataSchema/CatalogItem                 | Zod existing, local discriminated union.                            |
| `apps/web/src/lib/catalog/catalog-data.ts`                                     | create | catalogData                                   | Parse JSON; provide immutable data.                                 |
| `apps/web/src/lib/catalog/catalog-selectors.ts`                                | create | filter/sort/paginate/metadata helpers         | Pure local behavior, meaningful tests.                              |
| `apps/web/src/lib/catalog/catalog-queries.ts`                                  | create | catalogInfiniteOptions/query key/page adapter | useInfiniteQuery local JSON, installed React Query 5.104.0.         |
| `apps/web/src/components/catalog/public-shell.tsx`                             | create | PublicShell/Header/MobileNavigation           | Public UI composed from installed primitives.                       |
| `apps/web/src/components/catalog/appearance-menu.tsx`                          | create | AppearanceMenu                                | Public theme menu uses useTheme, no admin import.                   |
| `apps/web/src/components/catalog/featured-film.tsx`                            | create | FeaturedFilm                                  | Approved hero/compact mobile.                                       |
| `apps/web/src/components/catalog/poster.tsx`                                   | create | Poster                                        | Aspect9/16, fallback, reserved space.                               |
| `apps/web/src/components/catalog/catalog-card.tsx`                             | create | CatalogCard                                   | Movie/Series/Standalone metadata; local detail action.              |
| `apps/web/src/components/catalog/catalog-filters.tsx`                          | create | CatalogSearch/CatalogFilters                  | InputGroup, ToggleGroup, NativeSelect.                              |
| `apps/web/src/components/catalog/catalog-grid.tsx`                             | create | CatalogGrid/empty/loadMore                    | Grid, results state and button, no async data logic.                |
| `apps/web/src/components/catalog/catalog-detail-dialog.tsx`                    | create | CatalogDetailDialog                           | Installed Dialog; callback/focus return, no watch routing.          |
| `apps/web/src/components/catalog/home-page.tsx`                                | create | HomePage/local reducer or state               | Own filters/selectedItem; useInfiniteQuery owns pages.              |
| `apps/web/public/images/catalog/*`                                             | create | Six PNG posters/fallback SVG                  | Static local assets; folder absent at base.                         |
| `apps/web/test/home-catalog-data.test.ts`                                      | create | Fixture/selector behavior tests               | bun:test conventions existing.                                      |
| `apps/web/test/home-catalog-browser-worker.mjs`                                | create | DOM/network/SSR screenshots proof             | Existing host-module Playwright pattern.                            |
| `docs/design/home-catalog.md`                                                  | modify | Approval/asset/runtime limits                 | Canonical visual source.                                            |
| `docs/product/prd.md`, `docs/product/global-rules.md`                          | modify | Scope/status update                           | Approved direction ≠ implemented MVP.                               |
| `docs/plans/home-catalog/*.md`, `docs/tasks/home-catalog.md`, `docs/README.md` | modify | Plan/ledger/evidence/index                    | Canonical planning and task closure.                                |

No planned routeTree change because no routes are added. No planned package manifest/lock change; generated dist/.output/.turbo artifacts stay ignored. Source can co-locate smaller components if the ownership remains clear; update impact table before deviating.

## Implementation DAG

```mermaid
flowchart LR
  A[HOMEFE-001 JSON and selectors] --> D[HOMEFE-004 featured]
  B[HOMEFE-002 local poster assets] --> D
  A --> E[HOMEFE-005 poster grid]
  B --> E
  D --> E
  A --> F[HOMEFE-006 search filters load more]
  E --> F
  C[HOMEFE-003 public shell and appearance] --> H[HOMEFE-008 route integration responsive]
  A --> G[HOMEFE-007 local details]
  D --> G
  D --> H
  E --> H
  F --> H
  G --> H
  H --> I[HOMEFE-009 browser and SSR proof]
  I --> J[HOMEFE-010 full gates and closure]
```

DAG menunjukkan dependensi; tidak mewajibkan agent paralel. Commit per task setelah AC/checks pass; perubahan bun.lock tetap satu writer jika akhirnya dependency diperlukan.

## Implementation steps

Detail acceptance, affected files, requirements dan validation untuk setiap ID disimpan satu kali pada [backlog canonical](../../tasks/home-catalog.md). Tabel ini memetakan urutan/outcome tanpa menyalin checklist backlog.

| Step       | Outcome                                            | Depends on  | Files/symbols                                  | Validation/completion                                                                           |
| ---------- | -------------------------------------------------- | ----------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| HOMEFE-001 | Typed fixture18 + selector deterministik           | None        | data JSON/lib catalog/tsconfig/test            | Fixture/AND filter/stable order/batch-boundary tests dan web types pass.                        |
| HOMEFE-002 | Six separate local posters + fallback              | None        | public images/design evidence                  | Native size,9:16 assets, local paths, no remote source, format/file review.                     |
| HOMEFE-003 | Accessible header/nav/appearance                   | None        | public-shell/appearance-menu                   | Reuse primitives/theme; shell web lint/types, pending browser flow on009.                       |
| HOMEFE-004 | Featured desktop/mobile section                    | 001,002     | featured-film/poster                           | Correct metadata/9:16 frame, action callback, selectors and types/lint pass.                    |
| HOMEFE-005 | Three-kind poster cards/grid                       | 001,002,004 | poster/card/grid                               | Metadata count/duration + responsive grid, tests/types/lint pass.                               |
| HOMEFE-006 | Search/filters/local infinite query/empty          | 001,005     | catalog-queries/catalog-filters/grid/home-page | Selector + QueryClient tests: scoped reset/cancellation/rapid click; types/lint.                |
| HOMEFE-007 | Local metadata detail dialog                       | 001,004     | catalog-detail-dialog                          | No API/watch import, title/focus return/viewport behavior planned on009.                        |
| HOMEFE-008 | Replace route / and responsive polish              | 003–007     | index/home-page/catalog components             | Route head, coherent callbacks, web build/types/lint; visual/browser debug.                     |
| HOMEFE-009 | Browser, SSR and API-independent proof             | 008         | browser worker/evidence                        | Matrix below pass; console/network/ratio/layout assertions and screenshots.                     |
| HOMEFE-010 | Full root gates, canonical status and final review | 009         | docs + only necessary fixes                    | Relevant existing tests/types/lint/build/docs/format/diff + task commit, no source API changes. |

## Test requirements

### Unit behavior and fixture integrity

Use bun:test in web/test; no snapshots/component test framework. Cases: unique IDs/slugs and local poster paths, referenced genre/featured kind, field exclusivity by kind, empty fixture allowed for pure selector, trim/case-insensitive title/synopsis search, AND filter combination, unknown genre gives zero results, equal timestamps tie-break, offset0→6→12, EOF/empty nextOffset, InfiniteQueryObserver/QueryClient integration pages6→12→18/no duplicate, scoped cache reset when filter/query changes, duration formatting versus episodeCount. Tests assert observable lists/metadata rather than duplicating implementation logic.

Relevant existing theme tests must pass. Broad auth/browser database suites are not required solely because public components use the existing theme hook; run impacted suites if a shared/auth/provider file actually changes.

### Browser proof

Development and built Bun/Nitro: no cookies or admin fixture, API upstream stopped/unreachable, public interactions work. Observer must see **zero catalog/auth/playback/API requests** throughout initial load, search, genre/type, Load more, drawer, theme and detail. Block `/api/**` and any external API origin, fail on attempted request rather than treating failed requests as proof. Same-origin HTML/router module/JS/CSS/font/image requests are expected.

Viewports320×800,390×844,768×1024,1024×900,1440×1000,1920×1080. Light and Dark on all sizes; System preference/persistence tested on one mobile and one desktop. At each size check no page horizontal overflow, all poster bounding boxes width/height9/16 within1CSSpx, controls visible, title/genre wrap, dialog/sheet safe bounds, viewport resize preserves query/results/theme and does not reset loaded count.

Flows: initialData default6; fetchNextPage12/18 and hasNextPage=false; rapid double-click/cancellation; filterA18→filterB→filterA reset6 without affecting admin query cache; query by title/synopsis and whitespace; kind/genre AND; no results and reset; featured hidden on search/filter and restored on reset; Home reset and Browse focus; mobile drawer closes; details correct for movie/series/standalone; Escape/focus return; theme roundtrip/reload; keyboard-only search/filter/cards/menu; long title; failed image fallback once; zero page/hydration errors.

SSR built proof: anonymous GET / yields brand/title/initial fixture content, no API dependency, matching initial six before/after hydration, no random dates/window-count mismatch. Page title/description identify Vertical Movie rather than starter. Network proof must cover HTML/server dependency via unreachable API, not only browser intercept. Capture light desktop/mobile and dark examples under docs/design with distinct implemented filenames; actual commands/harness args/results in backlog. Reuse available Playwright runtime, do not install browser dependencies into web for this proof.

### Commands planned for implementation

From root with Bun1.4.2; these are future checks, not results observed during planning:

```sh
bun test apps/web/test/home-catalog-data.test.ts apps/web/test/admin-theme.test.ts
bun run check-types
bun run lint
bun run build
bun run docs:check
bun run --bun prettier --check <changed-supported-files>
git diff --check
```

Browser worker arguments mirror existing workers: base URL, host Playwright module/executable and screenshot prefix. Confirm actual available paths before invoking; record the exact command at execution. Frozen install after script/dependency changes; no DB migration unless scope is separately refined to a schema task. API test suite remains unchanged by this plan.

## Constraints

No request/API/session behind apparently static UI, including prefetch of /watch. No fake API errors/loading delay or global error pages for bundled JSON. Fixture parse error is a build/test authoring failure; first page valid disediakan initialData secara sinkron; queryFn lokal tetap mengikuti Promise/cancellation contract. User-visible recoverable states are empty results and image fallback. Reuse installed shadcn source and read version-matched component docs before coding. Keep theme/primitive dependencies explicit, no global state store/library unless concrete need emerges.

## Acceptance criteria

- [x] Approved light visual reproduced using real components, not a full-page raster background.
- [x] Typed local JSON18 items drives all visible metadata/search/filter/details; no duplicated hardcoded item arrays.
- [x] No API/auth/playback requests; dev and SSR/build remain functional with API down.
- [x] All/Film/Series/Standalone + genre/search + stable latest + Load more work according to specifications.
- [x] Empty/reset, image fallback, focus/nav/dialog and appearance behave correctly.
- [x] Exact CSS9/16 poster ratio, responsive matrix, no overflow, meaningful targets/contrast verified.
- [x] No starter/Mux demo on homepage; watch/admin/auth behavior not redirected or replaced.
- [x] Tests, root gates, browser proof, screenshots, canonical docs and per-task local commits have actual evidence.

## Risks and mitigations

| Risk                                                 | Mitigation                                                                                               |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Dummy slug sent to live watch route                  | Local dialog only, no router link/prefetch to watch; observer fails on attempted API request.            |
| Raster ratios/copy do not map to real mobile CSS     | Lock9/16, deliberate breakpoint grid, wrap, measured DOM proof; raster is hierarchy reference.           |
| Different counts between SSR/mobile hydration        | Batch6 at all widths; CSS handles columns, no viewport-based data selection.                             |
| Photo asset depends on external service              | Bundle six local assets + fallback; generation/source proof tracked.                                     |
| Filter excludes loaded cards but stale count remains | Normalized query key, Query-owned pages dan scoped reset/cancellation; cache/filter race tests.          |
| Shared admin/theme regressions                       | Import hook/primitives directly, do not import admin shell/session; run theme test and scoped freshness. |
| Main checkout changes during parallel work           | Keep worktree, pinned SHA, inspect affected diff before coding/delivery; no force merge.                 |
| UI model mistaken for current public API             | Local catalog union documented; future API adapter/resource mapping is a separate task.                  |

## Rollback or recovery

Each task local commit is a bounded rollback point. Revert relevant feature commits when authorized; preserve unrelated parallel changes. Dummy fixture errors fixed in JSON/schema before task Done, asset failures use fallback. No DB/storage rollback or production migration involved. Do not deploy/push/merge as part of this plan.

## Evidence

Planning evidence and source index are in [context](repository-context.md). Design generation/commits historic in [HOMEDES-001](../../tasks/home-catalog-design.md). Plan authoring validation and later task results belong to [HOMEFE ledger](../../tasks/home-catalog.md); intended checks are not marked passed in this plan.

## Open decisions

Pengguna menyetujui plan setelah refinement useInfiniteQuery. CTA View film dan View details membuka dialog metadata lokal; fixture18, batch6 dan Load more manual telah diimplementasikan. Integrasi API, pemilihan featured/data published nyata dan alur katalog ke playback adalah tahap lanjutan.

## Validation history

### 7 Oktober 2026 — pre-authoring freshness

- Result: valid for planning.
- Plan base SHA/current worktree SHA: `b90edaaaca83187726218286fdaf253958a483fe`.
- Main checkout current SHA: `4cf00a97dffe9568a966f8889ae798fed3acdb17`.
- Checked paths: apps/web routes/components/lib/theme/config/tests; catalog API models; manifests/lock/AGENTS.
- Changed relevant runtime paths between main and mockup baselines: none; intervening main APUB commit adds docs only.
- Decision: write context first then plan on attached worktree; refresh again after implementation is requested.

## Execution log

### 7 Oktober 2026 — planning closure freshness

- Result: valid for planning; status tetap ready untuk review, bukan executing.
- Current target SHA: `ab15400d7f8eee9fa305d60cd4f155c639d10b6d`.
- Diff scoped apps/packages/manifests/lock/Turbo/AGENTS terhadap base: kosong; perubahan commit hanya delapan Markdown planning/approval/index.
- Decision: context/plan tetap valid; recheck target/source lagi sebelum implementasi.

Runtime tasks belum dimulai. Context disimpan sebelum plan. Commit planning HOMEFE-000: `ab15400d7f8eee9fa305d60cd4f155c639d10b6d`; branch `feat/home-catalog-mockup`, pre-write SHA `b90edaaaca83187726218286fdaf253958a483fe`. Delapan Markdown berubah; docs:check (62 Markdown/591 links), Prettier write/check, diff check dan hook docs/lint/types/Commitlint lulus. Lint/types melalui cache Turbo; tidak ada test/build runtime baru dalam task dokumentasi. Ledger pascacommit ini mencatat hasil nyata. Tidak ada push/PR/merge/deploy.

## Refinement useInfiniteQuery — 7 Oktober 2026

Pengguna memperjelas infinite query TanStack Query sebagai pola pengelolaan halaman. Ini mengganti proposal awal visibleCount/state-only; sumber tetap dummy JSON dan Load more manual. Installed package apps/web/node_modules/@tanstack/react-query 5.104.0 dan query-core bundled source diperiksa; useInfiniteQuery/infiniteQueryOptions/InfiniteData/pageParam/next-page contract tersedia. Acuan [Infinite Queries resmi](https://tanstack.com/query/latest/docs/framework/react/guides/infinite-queries). Tidak ada upgrade dependency atau perubahan runtime pada refinement plan ini.

Freshness: SHA 509d3870f12ad5aa562342bcb6fee778c97cf602, source router/Query provider dan package installed diperiksa langsung; runtime belum berubah sejak base plan. HOMEFE-006 diperluas mencakup options/adapter/caching/SSRseed; HOMEFE-009 mencakup paginated-query race/zero-network proof. Evidence doc/commit refinement dicatat pada HOMEFE-011.

### Implementation approval — 7 Oktober 2026

Pengguna menyetujui plan setelah klarifikasi useInfiniteQuery. Default detail dialog lokal diterima. Freshness pada SHA 24a591885194c21458841a5f705323596748d1e9: diff apps/packages/manifests/lock/AGENTS terhadap base kosong; worktree clean sebelum edit. Checkout utama terpisah tetap dipertahankan.

- HOMEFE-001: bun test apps/web/test/home-catalog-data.test.ts: 5 pass, 0 fail; web check-types lulus. Schema strict, fixture immutable, 18 judul dan selector batch6; reset cache UI ditutup pada HOMEFE-006/009. SHA task sebelumnya: `24a591885194c21458841a5f705323596748d1e9`.

- HOMEFE-002: Enam native PNG 941x1672 dilihat satu per satu; scene sesuai, file lokal plus fallback SVG 900x1600. Ukuran source mendekati9:16 dicatat pada design; frame CSS exact9:16 diuji browser009. Source original dipertahankan; tidak ada runtime remote images. SHA task sebelumnya: `06bf4f0c8e910efa7f14620567646bc70505158c`.

- HOMEFE-003: Public shell memakai Button/Sheet dan appearance radio menu dengan ThemeProvider existing; tidak ada import admin/session. Web lint dan types lulus pada hook HOMEFE-002. Browser focus/nav/theme diuji HOMEFE-009. SHA task sebelumnya: `c13c674ec0696d2ef932fbd6e9f21fe497bcc797`.

- HOMEFE-004: FeaturedFilm dan Poster menggunakan satu item fixture, callback detail lokal, frame aspect9/16, reservasi dimensi, eager hero/lazy grid dan fallback sekali. Tests10, root types/lint serta build lulus; DOM ratio difinalisasi HOMEFE-009. SHA task sebelumnya: `94737b5f3ca03abcc668a7eaa316bad107a28c37`.

- HOMEFE-005: CatalogCard/Grid merender Film, Series dan Standalone, metadata duration/count, wrapping judul dan grid2/3/4/6cols. Callback detail lokal, empty melalui primitive Empty, Load more manual dengan busy guard. Tests10/types/lint/build lulus; browser009 menutup flow/viewport. SHA task sebelumnya: `130465ffc88545ccfa2b6d6d02581bb2c931459b`.

- HOMEFE-006: Tests katalog/query dan tema:10 pass,0fail,63assertions. QueryClient/InfiniteQueryObserver membuktikan6-12-18, concurrent dedup, AbortSignal cancellation, cache revisit reset dan latest filter wins; cache admin tetap utuh. Canonical key, initialData SSR, networkMode always dan filter primitives tersedia; wiring HomePage disimpan pada task008 setelah dialog007. SHA task sebelumnya: `435cfc486921c883d0b568f3c6cd2b1fba2555de`.

- HOMEFE-007: Dialog lokal memakai primitive Dialog, Title/Description, close44px, Escape/focus return dan max-height85svh dengan internal scroll. Film/Series/Standalone memakai metadata fixture; tidak ada router watch/API. Browser matrix12 ukuran-tema serta long-title dialog sudah melewati assertion bounds/focus pada development; proof lengkap009 masih berjalan. SHA task sebelumnya: `0e291c7fa5947236d92b7321c475fc44f1f09295`.

- HOMEFE-008: Route / mengganti starter/Mux dengan HomePage. Metadata public,18fixtures/useInfiniteQuery/manualLoadMore, featured conditional, state filter/selection, Home reset/Browse focus terhubung. Development browser matrix12 lulus: SSR6,pages6-12-18,zero API/auth/playback/external requests,zero hydrationerrors,theme/nav/dialog/ratio/targets/empty/cache revisit/long title/resize/fallback. Polish: menu tema closeOnClick, search sebelumappearance desktop, image failure sebelumhydration ditangani melalui image.complete. Root build lulus; watch/admin/API source tidak berubah. SHA task sebelumnya: `bdb8b34f1e50dfb3863d0f73260166bb2179c32f`.

- HOMEFE-009: Development3147 dan built Bun/Nitro3148 browser worker lulus; API_INTERNAL_URL diarahkan ke127.0.0.1:59999 yang unreachable. Masing-masing matrix12 (320/390/768/1024/1440/1920 Light/Dark), SSR6, pages6-12-18, zero API/auth/playback/externalrequests, zero console/hydrationerrors. Filter/cache/rapidclick/keyboard/focus trap/focusreturn/mobileBrowse/themepersistence/System/resize/longtitle/empty/imagefallback lulus. Source failures2,fallback1,tidakloop. Delapan screenshotdilihat, enamfoto terload sebelumcapture. Exact invocation dan batas Chromium dicatat di bawah. SHA task sebelumnya: `0d379a4766ab06adda17247c88ef32f1ab3c7054`.

- HOMEFE-010: Final gates:10 tests/63assertions pass; root check-types3packages pass (web fresh,API/auth cached unchanged); lintweb fresh pass; buildAPI/web pass (webfresh,APIcached); docs:check62files593links pass. Browser development+build matrix12 each pass. Scoped diff API/auth/admin/watch/routeTree/manifests/lock kosong. Canonical PRD/globalrules/design/index/plan diperbarui; real API/production limits tetap jelas. Prettier dan diffcheck final dicatat setelah update ini. SHA task sebelumnya: `f03030e3a009a2ad41c659d509640fc434f4f513`.
