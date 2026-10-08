# Repository Context — Detail dan tonton dari katalog

## Snapshot

- Repository: bayuaji17/vertical-movie-app.
- Base ref: feat/public-catalog-api (local dependency, belum remote delivery).
- Base SHA: `c75080f6febf07312b90a6d79ef945b7a96ab84d`.
- Analyzed at: 2026-10-07, Asia/Jakarta.
- Context status: historical baseline sebelum PCW; worktree clean pada snapshot ini. Implementasi/evidence terbaru dimiliki plan dan backlog, bukan klaim source saat ini.
- Working branch: feat/public-content-watch, dimulai dari PCAT closure; bukan origin/main.

## Product and Users

Pengunjung menemukan dan menonton published Film/Standalone/Series tanpa akun. User meminta lanjut dari PCAT; pada pertanyaan scope memilih semua jenis termasuk Series dan season/episode. Single-admin/auth/publication rules tetap sama; editor Series/Episode bukan permintaan ini. PRD-07/08 dan GR-02 menjadi acuan, [PCAT](../../tasks/public-catalog-api.md) dependency yang selesai lokal.

## Repository Map

| Subsystem                             | Role                                                                       |
| ------------------------------------- | -------------------------------------------------------------------------- |
| apps/api                              | Elysia, PostgreSQL/Drizzle, metadata/media/catalog/playback dan worker Bun |
| apps/web                              | TanStack Start, SSR Query, gateway, catalog UI, private admin dan player   |
| packages/auth                         | Better Auth single-admin server/client/types                               |
| docs                                  | Canonical product/architecture/design/runbook/plans/task evidence          |
| scripts                               | Documentation checker                                                      |
| .husky/root manifests/turbo           | Normal commit gates, Bun workspace, build orchestration                    |
| .agents/.commandcode/skills-lock.json | Installed repository skills; bukan target fitur                            |

## Architecture and Boundaries

Public catalog homepage PCAT memakai HomeStore UNION/count/keyset, unsigned DTO, native private thumbnail binary route, request-scoped SSR QueryClient/Eden. Callback CatalogService.invalidate pada successful publication/archive/metadata mutations sudah tersedia. Legacy CatalogStore digunakan PlaybackService; perubahan predicate/order legacy perlu regression proof, bukan redesign.

## Runtime and Data Flow

Homepage card dan featured View film/View details sama-sama membuka CatalogDetailDialog; dialog belum menyediakan navigasi. `/watch/$slug` sudah merender VerticalVideoPlayer, tetapi hanya player tanpa metadata/Series context/back navigation; callback memakai getBrowserApiBaseUrl dari VITE_API_URL, tidak public same-origin resolution seperti adapter PCAT. Route belum punya metadata loader/error/pending/next-episode UI.

Player Video.js React/core/hlsjs-video terpasang10.0.0-rc.4, local editable VideoSkin. Player memperoleh PlaybackInfo dalam state, renew expiry/play/seek/quality dengan position/pause preservation dan terminal guard. Callback belum menerima signal; on-unmount memakai mounted/epoch guard tetapi belum membatalkan network. Watch slug change belum memberi explicit identity key/reset sehingga old source tidak boleh dibiarkan saat menonton judul berbeda. Private preview memakai komponen/callback yang sama, wajib compatible.

Playback API `/videos/:slug/playback` dan `/playback/videos/:slug/{master.m3u8,variants/:index}` anonymous, fresh effective visibility/readiness/profile, private,no-store. Master/variant melalui gateway; signed init/segments/poster storage berlaku sampai expiry. Browse/detail tidak perlu meminta PlaybackInfo/playlist. SSR tidak memuat signed payload/player source. Terminal player error dialog berasal skin; app-level recovery perlu explicit Retry, bukan uncontrolled loop.

## Domain and Data Model

Videos slug globally unique (Movie/Standalone/Episode); Series slug unik di tabel terpisah. Season dan episode number unique per parent, positive; episode hierarchy locked setelah first publish. Legacy public videos DTO mempunyai kind/duration/hierarchy dan next endpoint memakai seasonNumber ASC/episodeNumber ASC dengan hidden child exclusion.

`CatalogService.seriesDetail` mencari parent dalam seriesList(limit100), lalu count per Series; ini tidak memadai sebagai detail route untuk seluruh home feed. Existing `/videos` memakai createdAt order tanpa public Series filter. Public episode list perlu server query terpisah, bounded pagination dan grouping/order season/episode; tidak download semua video lalu filter browser atau memakai admin API. HomeStore eligible CTE sudah memuat canonical parent/poster dan playable child gates yang dapat dipakai detail/list tanpa mengubah legacy.

## External Integrations

Existing PostgreSQL/MinIO/FFmpeg/Video.js/Eden; tidak perlu vendor atau dependency baru. Primary env dibaca hanya lewat runner ignored bila proof nyata diperlukan; endpoint/credentials tidak dicetak/dimasukkan docs. R2/Safari/perangkat fisik/production berada di luar proof lokal.

## Development, Testing, and Delivery

Bun1.4.2 native bun:test/app.handle, root check-types(API/web/auth)/lint(web)/build(API/web); docs:check/Prettier/diff/normal hooks. Dedicated media DB dan random loopback private MinIO bucket saja untuk reset/cleanup. Existing auth-browser-smoke harness dapat ditambah phase public-watch; media-playback/admin-media fixtures menyediakan actual HLS proof, PCAT browser fixture hanya SQL HLS-ready facts dan actual WebP sehingga tidak cukup membuktikan playback.

## Constraints and Conventions

No manual routeTree edits; generate-routes lewat CLI. Use typed Eden/type-only api/types, no cookies/admin effects untuk public. Schema tidak berubah default. Existing signed expiry/renewal/private preview harus tetap bekerja. Local task commits authorized oleh AGENTS; push/PR/merge/deploy belum diotorisasi. Primary checkout23 unrelated changes dipertahankan; aktif di managed WSL worktree, provided Windows cwd tidak tersedia.

## Relevant Active Work

PCAT selesai12 local commits sampai base SHA, belum push/merge. Tahap ini stacked dependency PCAT; jangan mengklaim source base sudah main. APUB/HOMEFE evidence tetap sejarah scope masing-masing; Watch/Series UI tidak ditutup oleh proof PCAT.

## Exploration Coverage

Inspected root instructions/index/product/workflow/manifests, full catalog/HomeStore/service/model/routes, schema video/season, watch/preview/VerticalVideoPlayer/skin, SSR/router/client/gateway and existing browser fixtures/workers. Video.js installed docs/index, HlsJsVideo/error/autoplay guides dan version-matched CLI10.0.0-rc.4 dibaca; unversioned CLI memberi10.0.1 mismatch sehingga instruksi itu tidak dipakai. Tidak menjalankan skin installation/upgrade; no repo dependency changes.

Excluded infrastructure secrets, production storage, editor/upload/publication expansion dan UI redesign. Query/transport/player source paths cukup untuk plan; actual multi-season/HLS runtime proof tetap implementation task.

## Unknowns and Assumptions

Scope semua tiga jenis/Series episode sudah dipilih user. Rekomendasi teknis: detail URL terpisah menurut kind, watch route slug existing, ordered paginated episodes grouped by season, Next episode manual, tanpa autoplay/auto-next/progress persistence. Exact DTO/parser/routing targets dibekukan sebelum UI task. R2/Safari bukan syarat local proof tahap ini.

## Evidence Index

Semua evidence pada base SHA Snapshot; path/symbol dipakai supaya tahan formatting.

| Claim                                           | Evidence                                                                                                                                       |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| PCAT done/local dependency                      | docs/tasks/public-catalog-api.md; git base SHA                                                                                                 |
| Dialog/featured belum navigate                  | apps/web/src/components/catalog/{catalog-detail-dialog,featured-film}.tsx                                                                      |
| Watch minimal/config resolution                 | apps/web/src/routes/watch.$slug.tsx; lib/api/client.ts:getBrowserApiBaseUrl                                                                    |
| Player expiry/epoch/state/private compatibility | components/vertical-video-player.tsx; routes/admin._authenticated.videos.$id.preview.tsx                                                       |
| Public fresh capability/readiness               | apps/api/src/modules/playback/{index,service}.ts                                                                                               |
| Legacy100/N+1/detail gap                        | modules/catalog/service.ts:series/seriesDetail; repository.ts:seriesList/seriesCount                                                           |
| Parent/child/current output gates               | modules/catalog/home-repository.ts:eligible; visibility.ts                                                                                     |
| Stable hierarchy/slug                           | db/schema/{videos,seasons,series}.ts                                                                                                           |
| SSR/request/cache separation                    | apps/web/src/router.tsx; lib/catalog/{catalog.server,public-catalog-queries}.ts                                                                |
| Actual-HLS vs SQL-ready fixture limits          | apps/api/test/integration/{media-playback-fixture,admin-media-browser-fixture,public-catalog-fixture}.ts; apps/web/test/auth-browser-smoke.mjs |
| Installed player reference                      | apps/web/node_modules/@videojs/react/docs/{llms.txt,reference/components/hlsjs-video.md,guides/playback-errors.md,guides/autoplay.md}          |
