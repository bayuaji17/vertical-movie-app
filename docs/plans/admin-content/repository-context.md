# Repository context: dashboard pengelolaan konten

## Snapshot

- Repository: `bayuaji17/vertical-movie-app`.
- Base ref: `main`.
- Base SHA: `c5406282f8f3c86563ba7112ec43d2aa17f97da2`.
- Analyzed at: `2026-10-04T21:24:26Z` (5 Oktober 2026 WIB), sesi planning frontend.
- Context status: current untuk snapshot tersebut; runtime baru belum diuji pada planning ini.
- Scope pengguna: plan detail tahap pertama frontend, yaitu layout dashboard, daftar konten, membuat dan mengedit draft. Implementasi belum diminta.
- Dokumen: [PRD](../../product/prd.md), [aturan produk](../../product/global-rules.md), [arsitektur](../../architecture/overview.md), [design system](../../design/design-system.md), [workflow](../../guides/development-workflow.md).

## Product and users

Satu admin mengelola movie, standalone dan hierarchy series/season/episode; pengunjung menonton published tanpa login. Iterasi yang direncanakan mencakup metadata movie/standalone. Upload, processing, preview/publish/archive melalui dashboard dan hierarchy menjadi iterasi berikutnya, tanpa mengubah lifecycle atau menjanjikan seluruh MVP selesai.

PRD-01/02/03/08/09 dan GR-01/05/08 relevan: akses privat, pengelolaan metadata, responsif dan pemulihan kegagalan. PRD-04/05/06 hanya dependensi roadmap pada iterasi ini.

## Repository map

| Subsystem                                     | Peran dan batas                                                                                                                                  |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `apps/web`                                    | TanStack Start/React, routes, SSR auth, Query/Form, Eden dan UI shadcn; pemilik perubahan runtime yang diusulkan.                                |
| `apps/api`                                    | Elysia, metadata, PostgreSQL/Drizzle, upload/storage, worker FFmpeg, publication/catalog/playback. API metadata menjadi kontrak yang dikonsumsi. |
| `packages/auth`                               | Better Auth server/client/types, CLI provisioning serta tipe sesi. Tidak membuat package bersama baru untuk frontend ini.                        |
| `docs`                                        | Product/architecture/guides/operations, feature context/plan dan backlog canonical.                                                              |
| `scripts`                                     | Pemeriksaan struktur/link dokumentasi.                                                                                                           |
| `.agents`, `.commandcode`, `skills-lock.json` | Skills terpasang, symlink dan metadata instalasi.                                                                                                |
| `.husky`, `commitlint.config.cjs`             | Docs/lint/types dan Conventional Commits.                                                                                                        |
| Root manifests/lock/Turbo                     | Bun workspace, task graph, env dan output cache.                                                                                                 |
| Root README/LICENSE/gitignore/npmrc/AGENTS    | Quick start, lisensi, batas tracked files dan instruksi.                                                                                         |

## Architecture and boundaries

- `apps/web/src/routes/admin.tsx` memasang notifikasi perubahan auth dan header private/no-store. `admin._authenticated.tsx` melakukan authoritative guard sebelum anak route, menyediakan principal/context dan mengunci UI pada unavailable/forbidden.
- `admin._authenticated.index.tsx` baru informasi sesi dan logout. Tidak ada list/create/edit konten. `/admin/videos/$id/preview` sudah ada sebagai route terlindungi minimal; jangan menggantinya dengan route detail yang menelan anak preview.
- Eden ada di `apps/web/src/lib/api/client.ts`; kontrak hanya `import type` dari `api/types`. `createPrivateApiClient` menghubungkan 401/403/5xx dengan transisi auth existing.
- QueryClient dibuat per router context di `integrations/tanstack-query/root-provider.tsx`; private query berawalan `admin` dibersihkan ketika sesi berakhir/logout/perubahan auth. Cookie tidak boleh disimpan pada singleton.
- Gateway `/api/$` memakai origin upstream tetap `API_INTERNAL_URL`; browser memakai `VITE_API_URL` sebagai origin publik lalu `/api`. Whitelist sudah mencakup videos/genres. Gateway memeriksa same-origin write, mempertahankan no-store dan membatasi proxy; jangan menggandakan gateway.
- Pilihan implementasi yang direkomendasikan: auth tetap SSR, data metadata privat dimuat melalui browser Query setelah principal tersedia. Ini menghindari jalur cookie SSR metadata baru; server mengirim shell/loading, bukan data placeholder yang diklaim nyata.

## Runtime and data flow

`Admin → protected route → browser private Eden → /api/admin/videos atau genres → business gateway → Elysia admin guard → service → PostgreSQL → DTO → Query cache → UI`.

Mutation mengirim request dengan credentials dan no-store melalui client existing. API tetap otoritatif untuk schema, akses dan state; validasi frontend hanya feedback. POST create belum memiliki idempotency key. PATCH membutuhkan expectedVersion; operasi tulis tidak boleh otomatis diulang.

## Domain and data model

| Kontrak source                                         | Fakta yang memengaruhi plan                                                                                                                                                                                                                     |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `modules/videos/index.ts`                              | POST/list/detail/PATCH/archive metadata privat tersedia.                                                                                                                                                                                        |
| `modules/videos/model.ts`                              | Create movie/standalone tanpa season/episodeNumber; kind immutable pada PATCH. Detail/list mencakup metadata, publicationStatus, firstPublishedAt, rowVersion, rightsConfirmedAt, genreIds/effectiveGenres, sourceAvailability.                 |
| `shared/content-model.ts`                              | Title 1–200; originalTitle 200; synopsis 500; description 10000; originalLanguage 35; slug max 180 lowercase kebab-case; year 1800–9999; date ISO; genreIds unik maksimal 100.                                                                  |
| `shared/content-metadata.ts`                           | Title trim nonempty; nullable blank menjadi null; bahasa canonical BCP 47; tanggal kalender valid dan year/date konsisten. Slug default dihitung server pada create, tidak otomatis mengikuti edit title.                                       |
| `modules/videos/service.ts`                            | PATCH menolak archived/published, stale version dan perubahan tertentu sesudah first publish; error domain membedakan version/state/slug. Rights timestamp/actor milik server, bukan input UI.                                                  |
| `shared/content-pagination.ts`, `videos/repository.ts` | Default 20, max 100; urutan createdAt/id descending; nextCursor terikat filter. Filter kind/search/includeArchived/seriesId/seasonId; tidak ada status, sort atau total count. includeArchived menambah archived ke hasil, bukan archived-only. |
| `modules/genres/index.ts`, `model.ts`                  | GET/POST taxonomy tersedia; GET paginated. Iterasi ini memilih genre existing dan memuat opsi lanjut, tanpa UI membuat genre. Genre kosong tidak menghalangi draft.                                                                             |

List/detail metadata tidak menyediakan poster URL, durasi sumber, persentase transcode atau readiness lengkap. sourceAvailability bukan status HLS. Ringkasan angka global, filter publicationStatus atau poster nyata memerlukan kontrak/task tambahan; jangan menyimpulkannya dari satu page.

## External integrations

Bun, PostgreSQL dan same-origin web/API sudah menjadi fondasi. MinIO/R2 dan FFmpeg tersedia di backend, tetapi tidak dipanggil untuk operasi metadata UI ini. Tidak ada email/public signup, analytics, site settings atau provider baru yang perlu ditambahkan.

Versi resolved saat planning: React Query 5.104.0, Form 1.33.5, Router 1.170.40, Start 1.168.59, Base UI 1.8.0, shadcn 4.21.0, Eden 1.4.10. Tidak meng-upgrade paket sebagai bagian plan.

## Development, testing, and delivery

- Bun sesuai `package.json`, root commands check-types/lint/build; web tests existing di `apps/web/test`; API native unit/integration dibedakan. Route tree dibuat generator, tidak diedit tangan.
- Existing proofs: `content-eden-contract.ts`, tests auth/session/gateway, auth import/SSR/browser smoke. Hasil historis build fix tidak dianggap test dashboard baru.
- Planning membutuhkan docs:check, targeted Prettier dan whitespace. Implementasi nanti membutuhkan relevant tests, root types/lint/build; browser verification untuk layout/form/conflict/auth. Persistence proof memakai dedicated test DB, tidak menghapus/mengisi DB development secara diam-diam.
- Root workflow mengotorisasi commit lokal setiap task setelah checks. Request ini hanya plan; push/PR/merge dan implementasi belum diminta untuk fitur ini. Squash branch build sebelumnya bukan default fitur berikutnya.

## Constraints and conventions

Gunakan semantic tokens, Inter/Space Grotesk, Remixicon, komponen Base UI Rhea; light menjadi acuan awal dan dark tetap divalidasi. Installed components: Badge/InputGroup/Toast/Alert/Field/Separator/Input/Label/Textarea/Button/Card. Sidebar/Table/Checkbox/ToggleGroup/Empty/Skeleton/AlertDialog belum terpasang; periksa registry/docs, dry-run/diff dan install hanya saat task membutuhkan.

CLI info mendeteksi alias `#`; components.json memakai `@/`, dan tsconfig mengizinkan keduanya. Ikuti `#/` pada kode app yang ditulis, review hasil generated imports tanpa refactor alias global. Jangan impor API/auth server pada bundle client atau menyimpan private Query data/draft form pada localStorage.

## Relevant active work

Snapshot Git hanya mencakup HEAD, sedangkan stylesheet dark, dokumentasi desain, PNG/HTML/token/validation dan backlog desain adalah pekerjaan lokal yang sudah ada. Design system lokal menyatakan persetujuan 3 Oktober 2026; `.dark` di worktree menggunakan #1E201E, sementara HEAD masih token dark lama. Artefak final belum tracked pada HEAD.

Indeks docs juga mempunyai perubahan desain lokal; plan harus menambahkan navigasi dengan staging hunk sendiri. Dua receipt dokumen build ada sebagai perubahan lokal setelah PR #5 merge. Jangan menggabungkan pekerjaan tersebut ke commit planning. Sebelum implementasi, recheck status dan koordinasikan integrasi token/assets yang sudah disetujui sebagai pekerjaan terpisah; screenshot worktree saja tidak membuktikan fresh checkout mempunyai fondasi final.

## Exploration coverage

Ditinjau: instruksi/index, product/global rules/architecture/design/workflow, root/app/auth manifests, protected routes/logout/session/gateway/Eden, Query provider, metadata models/services/repositories/pagination/errors/genres, tests/contracts dan skill/CLI shadcn. Semua top-level subsystem diklasifikasikan.

Tidak menjalankan endpoint nyata, DB/storage/worker atau browser saat planning. Runtime media/perangkat/R2/deployment tidak menjadi dependency list/create/edit metadata. Kode player tidak diubah; videojs skill wajib pada iterasi yang mengubah playback. Tidak mengaudit ulang seluruh auth atau backend yang tidak terkait.

## Unknowns and assumptions

- Usulan UX: sidebar responsif, list desktop/cards mobile, halaman form terpisah, Bahasa Indonesia, metadata movie/standalone dahulu. Ini proposal plan, bukan keputusan UX baru yang sudah disetujui.
- Integrasi Git artefak/token desain lokal perlu dicatat sebelum acceptance visual fresh checkout; tidak menjadi alasan menulis ulang palet.
- Genre existing diasumsikan bisa kosong; selector tetap paginated. Tidak menambahkan seed otomatis.
- Tidak ada data API status global/poster pada metadata; roadmap upload/monitoring perlu refinement kontrak tersendiri.

## Evidence index

Seluruh evidence source berikut pada SHA snapshot di atas, kecuali design worktree dan CLI/web documentation yang secara eksplisit bertanggal planning:

1. Route guard/session/logout: `apps/web/src/routes/admin.tsx`, `admin._authenticated.tsx`, `admin._authenticated.index.tsx`, `lib/auth/session.ts`, `session-cache.ts`, `transitions.ts`.
2. Kontrak/client/gateway: `apps/web/src/lib/api/client.ts`, `lib/server/auth-gateway.ts`, `lib/server/business-gateway.ts`, `routes/api/$.ts`, `apps/api/src/types.ts`; type-only boundary dan allowlist.
3. Metadata/schema/version/filters: `apps/api/src/modules/videos/{index,model,service,repository}.ts`, `shared/{content-model,content-metadata,content-pagination,content-error}.ts`; operasi dan batas yang dipetakan di atas.
4. Taxonomy: `apps/api/src/modules/genres/{index,model}.ts`; optional selection dan pagination.
5. UI dan tooling: `apps/web/components.json`, `tsconfig.json`, `components/ui`, `components/auth/login-form.tsx`, manifests, root workflow; existing TanStack Form/Field/Toast serta scripts.
6. Desain worktree: `apps/web/src/styles.css`, [design system](../../design/design-system.md), `docs/tasks/design-system.md` yang masih untracked; dibandingkan HEAD, bukan diasumsikan committed.
7. Shadcn: `bunx --bun shadcn@latest info --json` pertama gagal ENOENT readme.md pada runner; fallback CLI installed `bun run --bun shadcn info --json` lulus. Docs command latest dan installed lulus. Keduanya read-only; manifest/lock tidak berubah.
8. Referensi resmi yang dibaca 5 Oktober 2026: [Sidebar](https://ui.shadcn.com/docs/components/base/sidebar), [Table](https://ui.shadcn.com/docs/components/base/table), [Checkbox](https://ui.shadcn.com/docs/components/base/checkbox), [Toggle Group](https://ui.shadcn.com/docs/components/base/toggle-group), [Empty](https://ui.shadcn.com/docs/components/base/empty), [Skeleton](https://ui.shadcn.com/docs/components/base/skeleton), [Alert Dialog](https://ui.shadcn.com/docs/components/base/alert-dialog). Periksa kembali API versi installed saat implementasi.

## Refinement desain — 5 Oktober 2026

Pada HEAD `74a894ff51060edaaf4bf57bbbb881670244e2e9`, source apps/web/API tetap identik snapshot; HEAD hanya menambahkan dokumen planning. Pengguna meminta desain desktop light lima halaman dengan theme switcher sebelum implementasi. Theme runtime belum tersedia, sehingga plan menambahkan ADMC-012 sebagai requirement baru shared shell. Dua modal konfirmasi dirty-navigation/reload-conflict disetujui. Screenshot adalah mockup AI dengan data contoh, bukan bukti route/browser/runtime; design tokens worktree tetap pekerjaan lokal yang sudah ada.
