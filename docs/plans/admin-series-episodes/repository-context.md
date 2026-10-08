# Repository context: admin Series, season dan episode

## Snapshot

- Repository: `bayuaji17/vertical-movie-app`.
- Base ref: `main`.
- Base SHA: `04b098bef9d210c1670f3a29c375208ef36805b9`.
- Analyzed at: 2026-10-08, Asia/Jakarta.
- Context status: historical baseline sebelum implementasi. Current source, freshness dan hasil dimiliki implementation plan/backlog; snapshot/base SHA di sini dipertahankan.
- Pengguna memilih Admin Series/season/episode sebagai modul berikutnya pada 8 Oktober 2026 setelah delivery katalog PR #13. Pemilihan modul bukan perubahan lifecycle parent atau approval production.

## Product and users

Satu admin mengelola Series → season → episode. Pengunjung menonton konten efektif published tanpa login. PRD-03/04/05/06/08/09 mencakup metadata, unggah, preview, publication, recovery dan responsivitas. Movie/standalone dan homepage Film/Standalone sudah mempunyai alur tersendiri; modul ini melengkapi ownership admin hierarchy existing.

## Repository map

| Subsystem                                     | Ownership                                                                                              |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `apps/api`                                    | Elysia, PostgreSQL/Drizzle, metadata, media, publication, private authorization dan worker Bun/FFmpeg. |
| `apps/web`                                    | TanStack Start/Router/Query, Eden type-only, admin UI/gateway serta public catalog/watch.              |
| `packages/auth`                               | Better Auth native, server/client/types terpisah.                                                      |
| `docs`                                        | Produk/kontrak/runbook, canonical context/plan/backlog, desain dan evidence.                           |
| `scripts`                                     | Validator dokumentasi.                                                                                 |
| `.agents`, `.commandcode`, `skills-lock.json` | Repository skills, symlink dan installation metadata.                                                  |
| `.husky`, root manifests                      | Conventional Commit hooks, Bun workspace dan Turbo quality gates.                                      |

## Architecture and boundaries

Handler privat memakai `requireAdmin` dan service/repository injected; domain rules tetap di API. Browser menuju same-origin `/api/admin/...` melalui gateway fixed `API_INTERNAL_URL`. Eden mengimpor `App` sebagai type; browser tidak mengimpor runtime backend atau auth server. SSR admin tidak melakukan query browser privat. Keys Query memakai prefix `admin` dan identitas sesi; logout/401 membatalkan query/effects dan membersihkan mutation cache.

## Runtime and data flow

1. `CreateContentView` menyimpan Series melalui client existing. API membuat Series dan Season 1 atomik.
2. `ContentDetailView` menampilkan seasons sebagai teks; belum ada editor/list episode. Cabang Series sudah memiliki upload cover.
3. API menyediakan create/list/patch/archive season dan create/list/detail/patch/archive episode. `GET /admin/videos` memfilter `kind`, `seriesId`, `seasonId`, search, archive dan opaque cursor sebelum pagination.
4. `createContentClient` hanya memiliki create Film/Standalone/Series dan patch/detail existing. Kontrak Episode memerlukan client terpisah agar tidak diberi alias Film/Standalone dalam navigasi baru.
5. `OwnerMediaPanel` memakai owner `video` atau `series`; policy API menerima episode. Detail admin saat ini tidak memasang media/publication panel untuk `kind=episode`.
6. Publication backend mempunyai POST video dan Series; GET readiness saat ini hanya video. Preview route video existing dapat digunakan kembali. Series readiness read model harus dibuat memakai predicate yang sama dengan publish, sebelum panel baru mengaktifkan aksi.

## Domain and data model

- Season number unik per Series, episode number unik per season; archive tidak membebaskan nomor. Season 1 sudah dibuat server, jangan diduplikasi client.
- Create season tidak membawa expectedVersion parent; PATCH memakai version milik season. Episode create tidak membawa expectedVersion; PATCH memakai version video. UI tidak mengarang audit actor/timestamps.
- `editable` backend menolak archived dan stale version; fungsi ini tidak melarang parent published. Episode draft tetap dapat disiapkan pada Series aktif published. Metadata video published tidak dapat direvisi; grouping/slug setelah first publish terkunci.
- Series/season bukan enum lifecycle video. `archiveState` parent menolak Series published, dan archive season menolak child published. Published episode dapat diarchive melalui API video dengan parent aktif. Jangan menawarkan archive Series published atau unpublish sebagai solusi: unpublish tidak tersedia.
- Episode published di Series draft tetap privat. Series publish memerlukan title/synopsis, cover siap, tidak ada upload aktif serta minimal satu episode published-ready. Series tanpa child playable disembunyikan tanpa otomatis mengubah status editorial.
- Backend video readiness mencakup active parents, verified HLS/cover/provenance, rights, metadata, lifecycle dan upload. API menjadi sumber kebenaran; status Ready uploader bukan Publish.
- Episode maksimum 600 detik/512.000.000 byte; crop cover dan pipeline media existing digunakan kembali. Source retention dan signed capability expiry mengikuti kontrak existing.

## External integrations

PostgreSQL menyimpan metadata/queue/audit; development MinIO privat dan production target R2 memakai env server. Bun/FFmpeg menghasilkan HLS, Better Auth mengotorisasi admin. Fondasi client/query tidak membutuhkan dependency, schema, env atau integrasi provider baru.

## Development, testing and delivery

Bun 1.4.2 tersedia di `/home/bandev/.bun/bin/bun`. Root `bun run check-types`, `bun run lint`, `bun run build`, `bun run docs:check`; tests native `bun test`. Private client/query tests menginjeksi fetcher dan menguji cancellation, identity, no-store, invalid responses serta uncertain writes. Existing metadata HTTP/SQL, media-Series, auth dan browser harness menjadi dependency evidence berikutnya; jangan menyatakan run historis sebagai run baru. DB proof memakai dedicated test DB; bila schema berubah, refine migration/preservation dan development migration sesuai AGENTS.

Local task commits diotorisasi AGENTS. Branch `feat/admin-series-episodes`; task baru tidak mempunyai otorisasi push/PR/merge tersendiri. Delivery katalog sebelumnya menggunakan normal merge [PR #13](https://github.com/bayuaji17/vertical-movie-app/pull/13), bukan bukti produksi.

## Constraints and conventions

Hooks baru tetap `apps/web/src/hooks/use-*.ts`, UI English dan dokumentasi developer Indonesia. Reuse approved admin shell/theme/primitives, form dirty guard, private cache policy dan upload owner controller. Tidak hand-edit route tree. Dokumentasi pada root `docs/`. Commit hanya task yang selesai setelah gates; pertahankan perubahan desain/build lokal unrelated.

## Relevant active work

PCAT-001–014 sudah masuk main melalui merge `04b098b`, head task closure `8bac3503ccd7381a82abd6d3955db6ad19c14d64`. Ada 23 path desain/build/dokumentasi lokal unrelated yang dipertahankan. Indeks docs mempunyai overlay desain lokal; stage bagian task baru saja. Backlog backend lama memakai status Review dengan evidence historis, sehingga tidak otomatis ditandai Done oleh plan baru.

## Exploration coverage

Ditinjau: root instructions/index/manifests, PRD/global rules/model/runbook, backlog dashboard/upload/publication, Series/Video schema HTTP/service/routes, publication readiness/publish, detail/form/media/publication UI, content/Eden clients, query factories, private results/transitions/cache, gateway, hooks dan existing tests. Worker/storage/auth ownership diklasifikasi lewat entry points/scripts dan callers. Pipeline encoder/R2/production tidak dibedah ulang karena fondasi metadata client tidak mengubahnya.

## Unknowns and assumptions

- UX baru mengikuti shell/forms existing; rincian season selector, route episode serta conflict/dirty states ditetapkan pada task state specification sebelum komponen.
- Published parent archive/restore/cascade membutuhkan keputusan produk tersendiri; tidak mengubahnya dalam modul ini.
- Season listing API tidak paginated; episode listing tetap bounded cursor20. Proof UI menangani season list panjang tanpa mengklaim batas count baru.
- API Series publish belum mempunyai GET readiness; parity, readiness reasons dan concurrent child/archive perlu proof nyata sebelum task publication Done.
- Penomoran default hanya suggestion dari snapshot; unique/version constraint server tetap authoritative.

## Evidence index

Seluruh source evidence berikut berasal dari SHA snapshot di atas; symbol digunakan agar tidak bergantung perubahan nomor baris.

| Claim                                        | Evidence                                                                                                                                                            |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Gap UI hierarchy/media Episode               | `apps/web/src/components/admin/content-detail.tsx`, `ContentDetailView`; `content-form.tsx`.                                                                        |
| Existing typed private client/query boundary | `apps/web/src/lib/admin/content-client.ts`, `createContentClient`; `content-queries.ts`, `contentKeys`.                                                             |
| Private gateway dan session cleanup          | `apps/web/src/lib/api/client.ts`, `createPrivateApiClient`; `lib/server/auth-gateway.ts`; `lib/auth/session-cache.ts`.                                              |
| Season/version/archive contracts             | `apps/api/src/modules/series/{index,model,service,repository}.ts`; `shared/content-metadata.ts`, `editable`/`archiveState`.                                         |
| Episode grouping/filter/edit/archive         | `apps/api/src/modules/videos/{index,model,service,repository}.ts`, `VideosService`.                                                                                 |
| Video readiness dan Series publish           | `apps/api/src/modules/publication/{index,readiness,service}.ts`, `assessVideoPublication`/`PublicationService.publish`.                                             |
| Existing hierarchy proof                     | `apps/api/test/integration/media-series-proof.test.ts`; `content-runtime-proof.test.ts`; `apps/web/test/content-eden-contract.ts`.                                  |
| Product scope dan gates                      | [PRD](../../product/prd.md), [aturan](../../product/global-rules.md), [workflow](../../guides/development-workflow.md), [runbook media](../../operations/media.md). |
