# Dokumentasi proyek

Indeks utama dokumentasi Vertical Movie App. Mulai dari [AGENTS.md root](../AGENTS.md) untuk aturan kerja, lalu baca spesifikasi, panduan dan backlog yang relevan. [README root](../README.md) berisi quick start. Struktur/status publication diperbarui 7 Oktober 2026.

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

- [PRD](product/prd.md): mendekati final; keputusan inti, matriks implementasi PRD-01–10, keputusan produk tersisa dan gerbang rilis. Review repository 5 Oktober 2026; MVP lengkap belum selesai.
- [Aturan produk](product/global-rules.md): GR-01–09 selaras PRD/kode pada review 5 Oktober 2026; aturan inti, batas signed URL/cache dan proposal UI/kebijakan dipisahkan.
- [Arsitektur](architecture/overview.md): baseline implementasi pada review 5 Oktober 2026; diagram/dataflow, schema/status dan rute aktif, dengan batas UI/deployment/verification terpisah.
- [Model data video](architecture/video-data-model.md): series/season/video/genre dan aset/upload/job/attempt/rendition/operation.
- [Kontrak upload](architecture/media-upload-contract.md): S3 multipart, idempotency, freeze dan completion.
- [Design system](design/design-system.md): baseline spesifikasi desain dari Git, dipindahkan tanpa memasukkan perubahan desain lokal.
- [Dashboard desktop light/dark](design/admin-content-desktop-light.md): v2 English/avatar, tiga jenis dan pagination custom; desain disetujui, metadata dashboard diimplementasikan.
- [Dashboard mobile light/dark](design/admin-content-mobile.md): lima layouts light/dark disetujui; cards/form/drawer dan pagination metadata diimplementasikan.
- [Upload Media desktop/mobile light/dark](design/admin-media-upload.md): empat mockup disetujui pengguna 5 Oktober 2026; state/modal specification dan runtime responsif terverifikasi lokal 6 Oktober 2026.
- [Publish & Archive desktop/mobile light/dark](design/admin-publication.md): empat mockup disetujui pengguna 7 Oktober 2026; readiness, konfirmasi manual dan recovery runtime verified lokal, evidence APUB.

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

Logging request API memakai console implemented/verified lokal 7 Oktober 2026; [panduan](guides/api-development.md#logging-request-http), [context baseline](plans/api-request-logging/repository-context.md) dan [plan/evidence](plans/api-request-logging/implementation-plan.md) menjelaskan scope serta batas gateway/storage.

Publish & Archive admin Film/Standalone: [context snapshot](plans/admin-publication/repository-context.md) dan [implementation plan](plans/admin-publication/implementation-plan.md), disetujui pengguna 7 Oktober 2026. Scope mencakup readiness server, konfirmasi manual, version/idempotency/recovery dan proof akses publik; plan/empat desain approved, APUB-001–013 implemented/verified lokal; actual API/DB/MinIO/FFmpeg/built-browser proof dan local receipts pada backlog.

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

`apps/api` memiliki API Elysia, metadata, storage/upload, native poster request processing, publication/catalog/playback dan worker Bun/FFmpeg terpisah. `apps/web` memiliki TanStack Start, auth admin, metadata dashboard, uploader Eden/Query responsif light/dark serta primitive crop Canvas 9:16, gateway same-origin, Video.js 10 RC, watch dan preview minimal. `packages/auth` memiliki Better Auth dengan entry server/client/types terpisah. Workspace diatur oleh `turbo.json`; env samples berada pada masing-masing app.

Media telah di-merge melalui [PR #3](https://github.com/bayuaji17/vertical-movie-app/pull/3). Development memakai MinIO dan production dirancang memakai Cloudflare R2 melalui env. Playback memakai HLS hasil transcoding dan lifecycle draft → published → archived. Bukti lokal serta fixture 10/30 menit ada pada runbook/backlog. R2 staging, Safari/native HLS, kapasitas 4 core/4 GB, full restore dan matriks stress yang belum terverifikasi tetap gerbang terpisah. Uploader Film/Standalone source+cover dan Series cover terverifikasi lokal; readiness/Publish/Archive Film/Standalone terverifikasi lokal 7 Oktober 2026. Publication Series/episode, editor/upload episode dan subtitle merupakan pekerjaan lanjutan.
