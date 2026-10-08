# Repository context: ringkasan dashboard admin

## Snapshot

- Repository: `bayuaji17/vertical-movie-app`.
- Base ref: `main`; base SHA: `65fcc2b58d5b316e8c44b2d99e28baf2e90e4f8c`.
- Analyzed at: 2026-10-08, Asia/Jakarta; context status: current.
- Pengguna memilih dashboard terlebih dahulu dan meminta plan pada 8 Oktober 2026. Persetujuan pemilihan modul bukan persetujuan implementasi atau seluruh rincian metrik.
- Remote `main` diverifikasi melalui `git ls-remote`; cocok dengan snapshot. Context disimpan sebelum implementation plan.

## Product and users

Satu admin mengelola Film/Standalone/Series, season dan episode; pengunjung menonton tanpa akun. [PRD-02](../../product/prd.md#kebutuhan-produk-dan-kondisi-implementasi) mencakup ringkasan konten dan konfigurasi situs, tetapi keduanya mempunyai scope terpisah. Pengaturan situs belum mempunyai field yang disepakati. Modul ini mengusulkan ringkasan baca di `/admin`, bukan analytics penonton atau pengaturan situs.

## Repository map

| Subsystem                                     | Peran                                                                                                        |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `apps/api`                                    | Elysia, PostgreSQL/Drizzle melalui Bun SQL, metadata, upload, publication/catalog/playback dan worker FFmpeg |
| `apps/web`                                    | TanStack Start, Eden type-only, TanStack Query, protected admin shell, theme dan UI shadcn Base UI Rhea      |
| `packages/auth`                               | Better Auth server/client/types, native session dan operator CLI                                             |
| `docs`                                        | Spesifikasi, guides/runbooks, feature context/plan dan backlog                                               |
| `scripts`                                     | Validator dokumentasi root                                                                                   |
| `.agents`, `.commandcode`, `skills-lock.json` | Skills repo dan metadata instalasi                                                                           |
| `.husky`, root manifests/config               | Bun/Turbo, format, lint, types dan Conventional Commit hooks                                                 |

## Architecture and boundaries

`apps/api/src/app.ts:createApp` menggabungkan modul secara chained dan menginferensikan `App`; `index.ts` menyuntikkan satu pool/repository/service. `api/types` hanya mengekspor tipe. Web memakai private client dan gateway same-origin fixed-upstream. Guard admin berlaku hanya pada private routes. Import factory tidak membuka koneksi/listener. Tidak ada package bersama baru yang diperlukan untuk ringkasan ini.

## Runtime and data flow

Saat ini `/admin/_authenticated/` hanya membaca `useAdminPrincipal`, lalu merender welcome, Create draft/View content dan identitas/sesi. Tidak ada query statistik atau endpoint ringkasan. Parent route mengatur `private, no-store` dan native session guard. Query admin existing browser-only, memakai key identity, signal, retry:false dan cleanup sesi.

Endpoint `/admin/content` menerima tepat satu type Film/Standalone/Series per request; repository menghitung dan mengambil satu page dalam repeatable-read/read-only. Ia tidak menyediakan total gabungan, episode global, ringkasan jobs atau mixed latest list. Menghitung dari page yang dimuat browser akan salah; agregasi SQL baru pada modul dashboard adalah kandidat yang sesuai.

Mutation helpers existing `invalidateContent`, `invalidateSeries`, `invalidateMedia`, `invalidatePublication` dan `invalidateOwnerPublication` perlu ditelusuri ulang untuk invalidation dashboard setelah hasil write confirmed. Guard/cleanup menolak late private effects; jangan merepopulasi query setelah logout/session loss.

## Domain and data model

- `videos.kind`: `movie`, `standalone`, `episode`; UI memakai label Film. Video editorial status `draft/published/archived`.
- `series` memakai status `draft/published/unpublished` dan `archivedAt` terpisah. Series archived tidak boleh dihitung sebagai draft; nilai `unpublished` existing tidak boleh dihilangkan diam-diam.
- Episode published di Series draft belum publik. Parent archive tidak mengubah editorial state semua child. Hitungan editorial dan effective public visibility berbeda.
- Pointer owner `sourceAssetId/posterAssetId` menetapkan aset current; `media_assets.generation` dan unique `(asset_id,generation)` pada `media_jobs` menetapkan job current.
- Job states `queued/running/retry/succeeded/failed/cancelled`; executor `worker` atau `request` (poster). Job history/attempt bukan unit hitungan media current. Running di database bukan bukti worker sehat.
- Source tombstone setelah retensi tidak menghilangkan provenance atau HLS. Hitungan metadata/jobs tidak memerlukan HEAD/read storage atau FFmpeg.
- Existing createdAt/id order dan `contentSearch` hanya mendukung type/search/includeArchived/page/pageSize. Tidak ada filter publication-status atau episode global yang boleh dijanjikan oleh link dashboard.

## External integrations

Ringkasan membutuhkan PostgreSQL dan native admin authorization. MinIO/R2, Bun.Image, FFmpeg dan player tidak dipanggil oleh endpoint ringkasan; worker/request processor tetap menulis state existing. Bukti R2/perangkat/kapasitas production berada di scope terpisah.

## Development, testing and delivery

Bun 1.4.2 dari root; API native unit tests dan Elysia `app.handle`, web native tests, root types/lint/build. Root lint hanya web. SQL proof memakai dedicated `vertical_movie_app_content_test` melalui guarded fixture, serial terhadap reset suite lain. Browser harness existing mempunyai phases content/series/media/publication dan harus diperluas secara eksplisit untuk dashboard; phase dashboard belum tersedia pada snapshot. Native cookie guard proof dipisahkan dari browser injected-auth fixtures.

Planning hanya mengubah Markdown; gate docs:check, scoped Prettier dan diff check. Tidak menjalankan migration atau menganggap kualitas runtime sudah dibuktikan ulang. Local task commits diotorisasi root workflow; push/PR/merge/deployment memerlukan instruksi tersendiri.

## Constraints and conventions

Ikuti [API development](../../guides/api-development.md), [workflow](../../guides/development-workflow.md), [task template](../../templates/task.md) dan root AGENTS. Hook aplikasi baru berada di `src/hooks/use-*.ts`, tanpa barrel. Jangan edit routeTree generated. UI memakai token CSS existing, English, Light/Dark/System, mobile first dan controls 44px. Dashboard mockup lama secara eksplisit mengecualikan statistik pada scope metadata; layout metrik baru merupakan proposal modul ini, bukan desain yang telah disetujui sebelumnya.

## Relevant active work

ASER selesai dan masuk main melalui [PR #14](https://github.com/bayuaji17/vertical-movie-app/pull/14). PCAT/PCW dan uploader/publication merupakan regression surface. Ada 23 path lokal unrelated pada desain/build docs; 22 non-index files mempunyai snapshot hash dan README original disimpan di ignored `.turbo`. Tidak termasuk artefak dashboard atau staging planning.

## Exploration coverage

Inspected: PRD/global rules, index/workflow/template/API guide, auth boundary, dashboard/admin layout, content transport/query/list filters, media/publication/Series invalidators, schema videos/series/content-columns/assets/jobs, content repository, bootstrap/manifests, guarded SQL fixture dan browser harness, serta existing design spec/token conventions. Deep player/transcoder, production infrastructure dan SQL runtime execution tidak diperlukan untuk menentukan read-only summary dan belum menjadi proof baru.

## Unknowns and assumptions

Usulan metrik/layout, latest8 dan failed5 serta refresh30s dijelaskan di plan dan menunggu review pengguna. Tidak ada schema/env/dependency change yang teridentifikasi; jika EXPLAIN atau implementation menemukan kebutuhan index, refine scope dan jalankan migration/preservation gates sebelum mengubah schema. Tidak ada SLO numerik production yang telah disepakati.

## Evidence index

Semua path berikut diperiksa pada snapshot di atas; symbol lebih stabil daripada line range.

| Claim                                     | Source/symbol                                                                                                                        |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Ringkasan/settings belum lengkap          | `docs/product/prd.md`, PRD-02 dan open decisions                                                                                     |
| Dashboard sekarang statis terhadap konten | `apps/web/src/routes/admin._authenticated.index.tsx:AdminDashboard`                                                                  |
| Session gate dan no-store                 | `apps/web/src/routes/admin._authenticated.tsx:Route`, `packages/auth/src/internal/options.ts`                                        |
| API factory/DI/type contract              | `apps/api/src/app.ts:createApp`, `apps/api/src/index.ts`, `apps/api/src/types.ts`                                                    |
| Single-type count/page snapshot           | `apps/api/src/modules/content/repository.ts:createContentPageRepository`                                                             |
| Series/video lifecycle berbeda            | `apps/api/src/db/schema/{series,videos,content-columns}.ts`                                                                          |
| Current asset/generation/executor         | `apps/api/src/db/schema/{media,jobs}.ts`, `apps/api/src/modules/media/repository.ts:MediaStore`                                      |
| Scope-safe query refresh                  | `apps/web/src/lib/admin/{content,series,media,publication,owner-publication}-queries.ts`, `apps/web/src/lib/auth/private-effects.ts` |
| Existing navigation/filter limits         | `apps/web/src/lib/admin/content-list-state.ts:contentSearch`                                                                         |
| Dedicated integration/browser gates       | `apps/api/test/integration/content-fixture.ts`, `apps/web/test/auth-browser-smoke.mjs`                                               |
| Existing shell/theme; old mockup scope    | `apps/web/src/components/admin/admin-shell.tsx`, `apps/web/src/styles.css`, `docs/design/admin-content-desktop-light.md`             |
