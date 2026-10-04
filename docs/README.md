# Dokumentasi proyek

Indeks utama dokumentasi Vertical Movie App. Mulai dari [AGENTS.md root](../AGENTS.md) untuk aturan kerja, lalu baca spesifikasi, panduan dan backlog yang relevan. [README root](../README.md) berisi quick start. Struktur diperbarui 4 Oktober 2026.

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

| Fitur       | Context                                                         | Plan                                                                                           | Penggunaan                                                               |
| ----------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Auth        | [Snapshot](plans/auth/repository-context.md)                    | [Plan awal](plans/auth/implementation-plan.md), [refactor native](plans/auth/refactor-plan.md) | Riwayat; command aktif berada di runbook auth.                           |
| Video/media | [Snapshot](plans/video/repository-context.md)                   | [Plan](plans/video/implementation-plan.md)                                                     | Keputusan, refinement, proof dan ledger; batas production tetap dicatat. |
| Dokumentasi | [Snapshot](plans/documentation/repository-context.md)           | [Plan](plans/documentation/implementation-plan.md)                                             | Organisasi kategori, aturan root, validasi dan review produk/arsitektur. |
| Build web   | [Snapshot](plans/tanstack-build-warnings/repository-context.md) | [Plan](plans/tanstack-build-warnings/implementation-plan.md)                                   | Filter Vite/Nitro implemented; verifikasi import/SSR berjalan.           |

## Backlog dan evidence

- [Auth](tasks/auth.md): AUTH/AUTH-REF dan evidence lokal.
- [Video](tasks/videos.md): metadata dan compatibility lifecycle.
- [Media](tasks/media.md): konfigurasi, multipart, cleanup dan provider proof.
- [Worker](tasks/media-worker.md): queue, lease/retry, FFmpeg, retensi dan benchmark.
- [Publication/playback](tasks/media-publication.md): readiness, visibility, katalog, HLS dan player.
- [Database tooling](tasks/database-tooling.md): Drizzle Studio development.
- [Development verification](tasks/development-verification.md): quality gate, preservation migrasi dan upgrade Turbo 2.11.7 terverifikasi lokal.
- [Build web](tasks/web-build.md): baseline warning directive, plan filter logging dan verifikasi build/SSR.
- [Dokumentasi](tasks/documentation.md): organisasi folder, aturan dan validasi.

## Gambaran implementasi saat ini

`apps/api` memiliki API Elysia, metadata, storage/upload, publication/catalog/playback dan worker Bun/FFmpeg terpisah. `apps/web` memiliki TanStack Start, auth admin, gateway same-origin, Video.js 10 RC, watch dan preview minimal. `packages/auth` memiliki Better Auth dengan entry server/client/types terpisah. Workspace diatur oleh `turbo.json`; env samples berada pada masing-masing app.

Media telah di-merge melalui [PR #3](https://github.com/bayuaji17/vertical-movie-app/pull/3). Development memakai MinIO dan production dirancang memakai Cloudflare R2 melalui env. Playback memakai HLS hasil transcoding dan lifecycle draft → published → archived. Bukti lokal serta fixture 10/30 menit ada pada runbook/backlog. R2 staging, Safari/native HLS, kapasitas 4 core/4 GB, full restore dan matriks stress yang belum terverifikasi tetap gerbang terpisah. Dashboard upload lengkap dan subtitle merupakan pekerjaan lanjutan.
