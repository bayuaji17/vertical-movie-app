# Dokumentasi proyek

Indeks utama dokumentasi Vertical Movie App. Mulai dari [AGENTS.md root](../AGENTS.md) untuk aturan kerja, lalu baca spesifikasi, panduan dan backlog yang relevan. [README root](../README.md) berisi quick start. Status katalog, detail dan watch diperbarui 8 Oktober 2026.

## Struktur dan sumber acuan

| Folder             | Isi                                                                        |
| ------------------ | -------------------------------------------------------------------------- |
| `product/`         | Kebutuhan dan aturan produk; proposal tetap ditandai draft.                |
| `architecture/`    | Arsitektur, model data dan kontrak bersama kode saat ini.                  |
| `guides/`          | Workflow, konvensi API dan setup environment.                              |
| `operations/`      | Runbook, command, migrasi/recovery dan batas verifikasi.                   |
| `plans/<feature>/` | Context, plan dan riwayat; periksa SHA/status sebelum digunakan.           |
| `tasks/`           | Backlog per modul dengan ID, acceptance criteria, dependensi dan evidence. |
| `templates/`       | Template dokumentasi reusable.                                             |
| `design/`          | Design system, prompt dan artefak visual.                                  |

Aturan penamaan, ownership dan maintenance berada pada [Documentation rules](../AGENTS.md#documentation-rules). Jalankan `bun run docs:check` setelah perubahan dokumentasi; hook commit memeriksanya sebelum lint dan check-types.

## Produk, arsitektur dan desain

- [Ringkasan dashboard admin](design/admin-dashboard.md): layout/state implemented dan verified lokal8Oct melalui DASH.

- [Admin Series/season/episode](design/admin-series-episodes.md): route dan state specification editor memakai admin Rhea existing; implementasi diminta pengguna 8 Oktober 2026.

- [Kelanjutan katalog Film/Standalone](design/public-catalog.md): PCAT-002 disetujui pengguna 8 Oktober 2026; interactive HTML dan8 PNG Browse/Detail390/1440 Light/Dark. Prototype tetap artefak approval; runtime actual Film/Standalone verified pada PCAT-013.

- [PRD](product/prd.md): mendekati final; matriks PRD-01–10, keputusan produk dan gerbang rilis. Review awal 5 Oktober 2026, detail/watch PCW diperbarui 8 Oktober 2026; MVP lengkap belum selesai.
- [Aturan produk](product/global-rules.md): GR-01–09, batas signed URL/cache dan proposal UI/kebijakan; alur publik PCW diperbarui 8 Oktober 2026.
- [Arsitektur](architecture/overview.md): diagram/dataflow, schema/status dan rute aktif; kontrak detail/episode/watch PCW diperbarui 8 Oktober 2026, dengan batas UI/deployment/verification terpisah.
- [Model data video](architecture/video-data-model.md): series/season/video/genre dan aset/upload/job/attempt/rendition/operation.
- [Kontrak upload](architecture/media-upload-contract.md): S3 multipart, idempotency, freeze dan completion.
- [Design system](design/design-system.md): baseline spesifikasi desain dari Git, dipindahkan tanpa memasukkan perubahan desain lokal.
- [Dashboard desktop light/dark](design/admin-content-desktop-light.md): v2 English/avatar, tiga jenis dan pagination custom; desain disetujui, metadata dashboard diimplementasikan.
- [Dashboard mobile light/dark](design/admin-content-mobile.md): lima layouts light/dark disetujui; cards/form/drawer dan pagination metadata diimplementasikan.
- [Upload Media desktop/mobile light/dark](design/admin-media-upload.md): empat mockup disetujui pengguna 5 Oktober 2026; state/modal specification dan runtime responsif terverifikasi lokal 6 Oktober 2026.
- [Publish & Archive desktop/mobile light/dark](design/admin-publication.md): empat mockup disetujui pengguna 7 Oktober 2026; readiness, konfirmasi manual dan recovery runtime verified lokal, evidence APUB.

- [Homepage/katalog publik sebelumnya](design/home-catalog.md): arah mockup light desktop/mobile disetujui pengguna 7 Oktober 2026; API published Movie/Standalone/Series + SSR/cursor useInfiniteQuery/manual Load more dan poster privat implemented/verified lokal pada [PCAT](tasks/public-catalog-api.md), 7 Oktober 2026. Tahap dummy tetap sejarah. [Evidence desain](tasks/home-catalog-design.md), [context](plans/home-catalog/repository-context.md), [plan detail](plans/home-catalog/implementation-plan.md) dan [backlog HOMEFE](tasks/home-catalog.md).

Konsep visual: [dashboard light](design/dashboard-light-shadcn.prompt.md), [dashboard dark](design/dashboard-dark-shadcn.prompt.md) dan [login](design/login-light-shadcn-redesign.prompt.md). Screenshot login: [desktop](design/login-implemented-desktop.png) dan [mobile](design/login-implemented-mobile.png). Data mockup bukan bukti fitur selesai.

## Panduan development dan runbook

| Dokumen                                                | Tanggung jawab                                                            |
| ------------------------------------------------------ | ------------------------------------------------------------------------- |
| [Workflow development](guides/development-workflow.md) | Modul → story → task, status dan kriteria selesai.                        |
| [API development](guides/api-development.md)           | Inferensi Eden, lifecycle Elysia, auth, storage/worker dan pengujian Bun. |
| [Environment](guides/environment.md)                   | Setup env, konfigurasi publik/server dan variabel aktif/planned.          |
| [Template task](templates/task.md)                     | Backlog, acceptance criteria dan evidence.                                |
| [Operasi auth](operations/auth.md)                     | Native provision/reset/recovery, maintenance dan rollout.                 |
| [Operasi metadata video](operations/video-metadata.md) | Endpoint metadata, migration/recovery dan proof dedicated.                |
| [Operasi media](operations/media.md)                   | Upload, worker, HLS, publication/playback, cleanup dan gerbang rollout.   |

## Context dan plan per fitur

Site Settings: [context](plans/site-settings/repository-context.md), [plan](plans/site-settings/implementation-plan.md) dan [backlog SSET](tasks/site-settings.md). Pengguna meminta plan 9 Oktober 2026 setelah menerima direction empat field teks dan cache frontend/backend. Cache tiga lapis browser/server-web/API dengan TTL1 jam, shared deadline dan Save update disetujui pengguna9Oct; plan lengkap kini disetujui untuk implementasi9Oct. SSET-013 menambahkan server snapshot/single-flight dan API-call proof untuk SSR. Implementasi berjalan pada branch feat/site-settings; evidence mengikuti backlog.

Ringkasan dashboard admin: [context](plans/admin-dashboard/repository-context.md), [plan](plans/admin-dashboard/implementation-plan.md) dan [backlog DASH](tasks/admin-dashboard.md). Pengguna memilih dashboard dan meminta plan 8 Oktober 2026; plan/metrik disetujui pengguna dan ringkasan editorial/current jobs/latest/failures verified lokal8Oct; delivery melalui [PR #15](https://github.com/bayuaji17/vertical-movie-app/pull/15) disetujui pengguna 9 Oktober 2026 dengan normal merge dan source branch dipertahankan. Status remote aktual mengikuti PR. Pengaturan situs tetap modul terpisah.

Admin Series/season/episode: [context](plans/admin-series-episodes/repository-context.md), [plan](plans/admin-series-episodes/implementation-plan.md) dan [backlog ASER](tasks/admin-series-episodes.md). Modul dipilih pengguna 8 Oktober 2026; ASER-001–012 Done dan verified lokal: season/episode editor, upload/crop/Preview, Series/Episode Publish dan Episode Archive; native API/SQL serta built-browser journeys/regression lulus. Remote delivery disetujui pengguna 8 Oktober 2026 dan sedang diproses melalui normal merge dengan source branch dipertahankan; production belum dijalankan.

Organisasi hooks web: [context](plans/web-hooks-organization/repository-context.md), [plan](plans/web-hooks-organization/implementation-plan.md) dan [WHOOK](tasks/web-hooks-organization.md), scope structural disetujui pengguna 8 Oktober 2026. Delapan hooks berada di `apps/web/src/hooks/use-*.ts`; integrasi dengan katalog main diperiksa sebelum delivery.

Plan awal katalog Film/Standalone: [context historis](plans/public-catalog/repository-context.md), [plan execution](plans/public-catalog/implementation-plan.md) dan [backlog Film/Standalone](tasks/public-catalog.md). Pengguna menetapkan branch chore/public-catalog-plan sebagai plan lanjutan; PCAT-001–014 telah masuk main melalui [PR #13](https://github.com/bayuaji17/vertical-movie-app/pull/13), normal merge04b098b; Film/Standalone homepage/detail/watch verified dengan actual built Chromium dan dedicated PostgreSQL/MinIO/FFmpeg. Existing main/homepage/detail/watch adalah runtime baseline; perbedaan proposal dicatat, task tidak dibatalkan otomatis.

Detail dan tonton dari katalog: [context](plans/public-content-watch/repository-context.md), [plan detail](plans/public-content-watch/implementation-plan.md) dan [backlog PCW](tasks/public-content-watch.md). Pengguna meminta lanjut dan memilih Film/Standalone/Series beserta season/episode 7 Oktober 2026. PCW-000–008 implemented/verified lokal 8 Oktober 2026: detail Film/Standalone, Series dengan episode per season, watch HLS dan Next manual. Proof PostgreSQL/MinIO/FFmpeg serta Chromium development/build tersedia pada backlog. Evidence lokal PCW merupakan riwayat; source telah masuk baseline main melalui 85f6350 (#11), sebelum hooks65127a1. Progress/autoplay/editor/production bukan scope.

Logging request API memakai console implemented/verified lokal 7 Oktober 2026; [panduan](guides/api-development.md#logging-request-http), [context baseline](plans/api-request-logging/repository-context.md) dan [plan/evidence](plans/api-request-logging/implementation-plan.md) menjelaskan scope serta batas gateway/storage.

Publish & Archive admin Film/Standalone: [context snapshot](plans/admin-publication/repository-context.md) dan [implementation plan](plans/admin-publication/implementation-plan.md), disetujui pengguna 7 Oktober 2026. Scope mencakup readiness server, konfirmasi manual, version/idempotency/recovery dan proof akses publik; plan/empat desain approved, APUB-001–013 implemented/verified lokal; actual API/DB/MinIO/FFmpeg/built-browser proof dan local receipts pada backlog.

Integrasi katalog API ke homepage: [context](plans/public-catalog-api/repository-context.md), [plan detail](plans/public-catalog-api/implementation-plan.md) dan [backlog PCAT](tasks/public-catalog-api.md). Pengguna menyetujui point1/plan 7 Oktober 2026; PCAT-001–011 implemented/verified lokal. Feed Movie/Standalone/Series, cursor/filter, poster privat, SSR dan recovery memakai API; dev/built browser serta dedicated PG/MinIO proof lulus. Detail/watch dilanjutkan pada PCW; editor/production dan remote delivery tetap tahap tersendiri.

| Fitur              | Context                                                         | Plan                                                                                           | Penggunaan                                                                                                                                                                       |
| ------------------ | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth               | [Snapshot](plans/auth/repository-context.md)                    | [Plan awal](plans/auth/implementation-plan.md), [refactor native](plans/auth/refactor-plan.md) | Riwayat; command aktif berada di runbook auth.                                                                                                                                   |
| Video/media        | [Snapshot](plans/video/repository-context.md)                   | [Plan](plans/video/implementation-plan.md)                                                     | Keputusan, refinement, proof dan ledger; batas production tetap dicatat.                                                                                                         |
| Dokumentasi        | [Snapshot](plans/documentation/repository-context.md)           | [Plan](plans/documentation/implementation-plan.md)                                             | Organisasi kategori, aturan root, validasi dan review produk/arsitektur.                                                                                                         |
| Build web          | [Snapshot](plans/tanstack-build-warnings/repository-context.md) | [Plan](plans/tanstack-build-warnings/implementation-plan.md)                                   | Implemented/verified lokal: warning directive, batas import dan SSR; browser belum diuji.                                                                                        |
| Dashboard konten   | [Snapshot](plans/admin-content/repository-context.md)           | [Plan](plans/admin-content/implementation-plan.md)                                             | Implemented metadata: lima template responsif, Eden/Query, theme, pagination, create/detail/edit dan conflict; evidence lokal pada backlog.                                      |
| Upload Media admin | [Snapshot](plans/admin-media-upload/repository-context.md)      | [Plan](plans/admin-media-upload/implementation-plan.md)                                        | Plan/mockup disetujui; ADUP-001–015 Done; uploader source/cover, recovery/readiness dan auth cleanup implemented/verified lokal 6 Oktober 2026.                                  |
| Pemrosesan sampul  | [Snapshot](plans/admin-cover-processing/repository-context.md)  | [Plan](plans/admin-cover-processing/implementation-plan.md)                                    | ACOV-001–012 selesai lokal; resolusi crop rekomendasi dan startup hashing development; cover request-path dan built-browser MinIO proof lulus; R2/production belum diverifikasi. |

## Backlog dan evidence

- [Site Settings](tasks/site-settings.md): SSET-001 planning; SSET-002–013 backlog; plan lengkap disetujui dan implementasi berjalan9Oct.

- [Ringkasan dashboard admin](tasks/admin-dashboard.md): DASH-001–011 implemented/verified lokal; inventori/media/latest, private refresh, native SQL/auth dan built-browser15 width/theme proof.

- [Admin Series/season/episode](tasks/admin-series-episodes.md): ASER-001–012 Done; kontrak/editor/media/publication, API/SQL/browser proof dan local task receipts.

- [Organisasi hooks web](tasks/web-hooks-organization.md): refactor hooks/use-prefix serta integrasi katalog terbaru.
- [Katalog Film/Standalone](tasks/public-catalog.md): PCAT-001–014 Done lokal; contract/current proof dan receipts, dengan snapshot awal tetap historis.

- [Logging request API](tasks/api-request-logging.md): APILOG-001–003; dua event console per request, suite API dan demo development/build-start terverifikasi lokal.
- [Auth](tasks/auth.md): AUTH/AUTH-REF dan evidence lokal.
- [Video](tasks/videos.md): metadata dan compatibility lifecycle.
- [Media](tasks/media.md): konfigurasi, multipart, cleanup dan provider proof.
- [Worker](tasks/media-worker.md): queue, lease/retry, FFmpeg, retensi dan benchmark.
- [Publication/playback](tasks/media-publication.md): readiness, visibility, katalog, HLS dan player.
- [Publish & Archive admin](tasks/admin-publication.md): APUB-001–013 Done lokal; plan/desain approved, readiness/Publish/Archive Film/Standalone dan recovery verified API/DB/browser.
- [Database tooling](tasks/database-tooling.md): Drizzle Studio development.
- [Development verification](tasks/development-verification.md): quality gate, preservation migrasi dan upgrade Turbo 2.11.7 terverifikasi lokal.
- [Build web](tasks/web-build.md): baseline warning directive, plan filter logging dan verifikasi build/SSR.
- [Dashboard konten](tasks/admin-content.md): ADMC-001–016 dan ADMC-DES-001–004; metadata, tema, pagination/Series dan desain.
- [Upload Media admin](tasks/admin-media-upload.md): ADUP-001–015; ADUP-001–015 Done; evidence hashing, API/schema/worker, direct multipart, browser/recovery/auth dan local task commits.
- [Pemrosesan sampul](tasks/admin-cover-processing.md): ACOV-001–012 Done lokal; crop rekomendasi dan hashing tanpa reload development, crop/request-path, recovery dan built-browser MinIO proof terverifikasi; batas production pada backlog.
- [Dokumentasi](tasks/documentation.md): organisasi folder, aturan dan validasi.

## Gambaran implementasi saat ini

Custom React hooks aplikasi web berada di `apps/web/src/hooks/use-*.ts`; provider/context, query factories dan domain helpers tetap pada owner di `lib/`, komponen pada `components/`. Konvensi berada di root AGENTS; evidence pada [WHOOK](tasks/web-hooks-organization.md).

`apps/api` memiliki API Elysia, metadata, storage/upload, native poster request processing, publication/catalog/playback dan worker Bun/FFmpeg terpisah. `apps/web` memiliki TanStack Start, auth admin, ringkasan editorial/current jobs/latest dashboard, metadata editor, uploader Eden/Query responsif light/dark serta primitive crop Canvas 9:16, gateway same-origin, Video.js 10 RC, detail Film/Standalone, Series/episode dan watch kontekstual, serta preview admin. `packages/auth` memiliki Better Auth dengan entry server/client/types terpisah. Setelah merge PR #13, homepage memakai unsigned /videos SSR20, All/Films/Standalone URL type, cursor/Load more, browser-only signed poster queue, detail /videos/$slug dan filter-aware watch; verified lokal PCAT-001–014. Katalog tiga jenis/search/genre/binary poster pada main sebelumnya tetap riwayat dan API/rute Series existing tetap tersedia. Workspace diatur oleh `turbo.json`; env samples berada pada masing-masing app.

Media telah di-merge melalui [PR #3](https://github.com/bayuaji17/vertical-movie-app/pull/3). Development memakai MinIO dan production dirancang memakai Cloudflare R2 melalui env. Playback memakai HLS hasil transcoding dan lifecycle draft → published → archived. Bukti lokal serta fixture 10/30 menit ada pada runbook/backlog. R2 staging, Safari/native HLS, kapasitas 4 core/4 GB, full restore dan matriks stress yang belum terverifikasi tetap gerbang terpisah. Uploader Film/Standalone source+cover dan Series cover terverifikasi lokal; readiness/Publish/Archive Film/Standalone terverifikasi lokal 7 Oktober 2026. Editor season/episode, source/cover/Preview episode, Series/Episode Publish dan Episode Archive terverifikasi lokal 8 Oktober 2026 pada ASER. Subtitle dan acceptance production tetap lanjutan.
