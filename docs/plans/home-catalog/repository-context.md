# Repository context: homepage dan katalog dummy

## Snapshot

- Repository: `bayuaji17/vertical-movie-app`.
- Base ref: `feat/home-catalog-mockup`.
- Base SHA: `b90edaaaca83187726218286fdaf253958a483fe`.
- Analyzed at: `2026-10-07T01:55:28+07:00`.
- Context status: current untuk snapshot; review source, bukan proof runtime baru.
- Checkout utama saat review: `chore/admin-publication-plan`, SHA `4cf00a97dffe9568a966f8889ae798fed3acdb17`.
- Permintaan pengguna 7 Oktober 2026: mockup homepage/katalog disetujui; buat plan detail FE dengan dummy JSON, tanpa langsung mengambil API. Implementasi belum diminta.
- Worktree mockup dipakai kembali agar perubahan desain/planning tidak menyentuh pekerjaan paralel pada checkout utama.

## Product and users

Pengunjung menemukan Film, Series dan Standalone tanpa akun. Arah visual light desktop/mobile [disetujui pengguna](../../design/home-catalog.md); [PRD-07/08](../../product/prd.md) dan [GR-02](../../product/global-rules.md) tetap acuan. Tahap ini adalah prototipe FE data lokal, bukan katalog published nyata atau bukti playback MVP.

## Repository map

| Subsystem                                     | Peran dan batas                                                                                                                                     |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web`                                    | TanStack Start/React, Vite/Nitro Bun, TanStack Router/Query, shadcn Base UI; pemilik seluruh runtime tahap ini.                                     |
| `apps/api`                                    | Elysia, Drizzle/PostgreSQL, storage/upload/worker, katalog dan playback; dibaca untuk memahami perbedaan DTO, bukan dependency data homepage dummy. |
| `packages/auth`                               | Better Auth server/client/types serta CLI admin; tidak dibutuhkan homepage publik.                                                                  |
| `docs`                                        | Product, architecture, guides, operations, design, plans dan tasks canonical.                                                                       |
| `scripts`                                     | Checker kategori/nama/link/anchor Markdown.                                                                                                         |
| `.agents`, `.commandcode`, `skills-lock.json` | Skill lokal, symlink dan metadata.                                                                                                                  |
| `.husky`, `commitlint.config.cjs`             | Pre-commit docs/lint/types dan Conventional Commits.                                                                                                |
| Root manifests, `bun.lock`, `turbo.json`      | Bun workspace dan quality gates; perubahan konfigurasi hanya bila dibutuhkan.                                                                       |
| Root README, AGENTS, LICENSE, gitignore/npmrc | Quick start, instruksi, lisensi dan batas generated/ignored files.                                                                                  |

## Architecture and boundaries

- `apps/web/src/routes/index.tsx:1–30`: homepage masih starter, button contoh dan VerticalVideoPlayer dengan MP4 Mux eksternal. Mengganti homepage berarti melepas penggunaan demo di route ini, bukan merombak player existing.
- `apps/web/src/routes/__root.tsx:22–74`: root metadata masih starter; ThemeProvider, bootstrap tema, Toaster dan devtools global tersedia. Metadata homepage dapat dioverride pada route index.
- `apps/web/src/routes/watch.$slug.tsx:6–20`: route watch membuat callback Eden `videos({ slug }).playback.get()`. Mengarahkan slug dummy ke route ini akan melanggar batas data lokal.
- `apps/web/src/lib/theme/provider.tsx`, `preferences.ts`: Light/Dark/System, localStorage, bootstrap sebelum hydration, storage event dan system media query sudah tersedia. Reuse tanpa provider/storage key kedua.
- Primitive tersedia: Button, Badge, Card, InputGroup, Field, ToggleGroup, NativeSelect, DropdownMenu, Sheet, Dialog, Empty, Skeleton, Separator. Jangan menambahkan Select/Tabs dari import yang belum tersedia.
- AdminShell dan ThemeMenu berada dalam modul admin; reuse pola/primitive serta hook tema, bukan import keseluruhan shell/session admin ke homepage.
- `apps/web/tsconfig.json`: alias `#/*` dan `@/*`, strict, bundler module resolution; belum mengaktifkan `resolveJsonModule` secara eksplisit. Plan memasukkan setting ini dan membuktikannya lewat type/build checks.
- `apps/web/components.json`: base-rhea, rsc false, neutral, CSS variables, Remixicon; CSS runtime menjadi sumber token. Tidak menjalankan preset init ulang.

## Runtime and data flow

Saat ini: homepage → komponen demo → MP4 eksternal. Watch → browser Eden → gateway/API playback. Homepage tidak memiliki katalog/store public.

Target tahap dummy: import JSON lokal → validasi typed sekali → pure selectors → state React → public components → dialog detail lokal. Tidak ada fetch JSON, server function katalog, Eden, Query fetcher, session query atau server API loader pada jalur baru. JSON dan gambar dikemas/disajikan oleh aplikasi web sendiri; request asset HTML/JS/CSS/font/gambar tetap normal.

## Domain and data model

API video memakai kind movie/standalone/episode; Series adalah resource terpisah. `apps/api/src/modules/catalog/model.ts` mempunyai video items/nextCursor dan series items terpisah, query hanya limit/cursor. Tidak mengklaim public API sudah menyediakan gabungan/filter/search/featured yang diusulkan.

Model UI fixture dapat memakai union `movie | series | standalone` karena bukan DTO server. Field episodeCount hanya untuk Series; durationMs hanya untuk Film/Standalone. ID/slug, genre IDs, poster path, title/synopsis dan publishedAt fiktif diperlukan untuk UI. Tidak menyalin metadata privat, hak konten, storage key atau status worker.

## External integrations

Tidak menambah backend/storage/auth atau koneksi data. Gambar final mockup masih raster gabungan, bukan enam poster source terpisah. Folder public belum ada pada snapshot; task asset perlu membuat poster lokal dan fallback. Sumber asset direncanakan dari imagegen berdasarkan scene mockup approved; tidak mengunduh poster film pihak ketiga atau memakai remote image CDN.

Tidak mengubah playback/audio/video. Bila scope berubah menjadi player dummy, skill videojs dan bundled docs menjadi gerbang refinement sebelum implementasi; jangan menyelipkan playback di task katalog.

## Development, testing, and delivery

Bun 1.4.2; root commands `bun run dev`, `check-types`, `lint`, `build` dan `docs:check`. Lint hanya web, types API/auth/web, build API/web. Tests web existing memakai bun:test pada `apps/web/test/`; browser workers memakai Playwright host yang diinjeksi sebagai module/executable, tanpa dependency browser dalam app.

Planning Markdown: Prettier, docs:check, diff check. Implementasi nanti: tes selector/fixture yang bermakna, regresi tema existing, proof browser dengan API diblokir, root types/lint/build, lalu task commit lokal. Tidak membuat hosted CI, migrasi, deployment atau remote Git dalam scope ini.

## Constraints and conventions

Dokumentasi feature pada folder ini, backlog pada [home-catalog.md](../../tasks/home-catalog.md). Baca guide/workflow/task template dan source sebelum perubahan behavior. Poster CSS wajib aspect-ratio 9/16; gambar raster mockup bukan bukti presisi. Copy English; light menjadi acuan visual utama, dark/system menggunakan semantic tokens existing. Responsive grid tidak bergantung pada screen width di SSR data selector.

Tidak hand-edit routeTree.gen.ts, mengganti auth guards, mengubah API, atau menambah shared package. Branch existing dipertahankan; commit setiap task setelah AC/checks lulus, dengan ID. Push/PR/merge tetap operasi tersendiri.

## Relevant active work

Checkout utama mempunyai plan Publish & Archive admin APUB dan perubahan lokal design/build docs. Perbandingan `313e31a… → 4cf00a9…` menunjukkan hanya docs index/plan/backlog APUB; diff scoped apps/packages/manifests/lock/Turbo/AGENTS kosong. Snapshot mockup berbeda karena dua commit asset/docs. Source runtime yang ditelusuri masih sama antara kedua checkout; tidak perlu merge plan APUB untuk menulis plan homepage.

Saat implementasi diminta, recheck current target SHA dan semua path pada impact table; pekerjaan admin paralel bisa berubah sesudah planning. Shared primitives/theme/CSS hanya diubah bila benar-benar diperlukan dan harus diperiksa kembali.

## Exploration coverage

Inspected: indeks docs, PRD/global-rules, workflow/template, desain/mockup/backlog, route homepage/root/watch, theme, router/Query provider, admin shell/theme patterns, installed primitives, styles/config/manifests, tests/browser harness, API catalog DTO, commit history dan workspace status. API/DB/FFmpeg/runtime production tidak diuji karena tidak termasuk request planning FE.

Evidence cukup untuk file targets, dependency boundaries dan validation plan. Browser/SSR/build behavior baru tetap belum diuji. Desain detail dialog tambahan dan perilaku search/filter/pagination adalah spesifikasi implementasi yang diajukan pada plan, bukan dianggap seluruhnya sudah disetujui lewat raster.

## Unknowns and assumptions

- Default rencana untuk CTA/kartu: dialog detail dummy; playback berada di luar tahap ini. Pertanyaan opsional sudah dikirim; bila pengguna memilih player lokal, refine plan sebelum coding.
- Label CTA utama diubah dari Watch film menjadi View film dalam tahap dummy agar tindakannya sesuai dialog. Ini usulan copy dalam plan.
- Enam kartu desktop versus dua mobile pada raster hanyalah contoh viewport; JSON nyata fixture berisi 18 judul dan batch awal enam pada semua ukuran untuk SSR deterministik.
- Dark tidak membutuhkan mockup baru; fidelity utama light, dark tetap wajib terbaca/berfungsi.

## Evidence index

Semua path source di bawah direview terhadap base SHA di Snapshot; source runtime juga dibandingkan dengan checkout utama tanpa perbedaan.

| Claim                                   | Evidence                                                                                                              |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Homepage starter + external demo        | `apps/web/src/routes/index.tsx`, Home, lines 1–30                                                                     |
| Root theme/metadata/SSR shell           | `apps/web/src/routes/__root.tsx`, RootDocument, lines 22–74                                                           |
| Watch would call API                    | `apps/web/src/routes/watch.$slug.tsx`, Watch/load, lines 6–20                                                         |
| Existing theme persistence/bootstrap    | `apps/web/src/lib/theme/provider.tsx`, useTheme; `preferences.ts`, themeBootstrap                                     |
| Public API is not unified UI fixture    | `apps/api/src/modules/catalog/model.ts`, CatalogQuery/PublicVideoDto/PublicSeriesDto                                  |
| Installed primitives/config/fonts       | `apps/web/src/components/ui/`, `components.json`, `src/styles.css`                                                    |
| Tests/tooling/gates                     | `apps/web/package.json`, `test/admin-theme.test.ts`, `test/admin-content-browser-worker.mjs`, root package and .husky |
| Approved mockup plus limitations        | `docs/design/home-catalog.md`, `docs/tasks/home-catalog-design.md`, source images; approval user 7 October 2026       |
| Main checkout new work is documentation | Git diff 313e31a…→4cf00a9…, APUB docs/index only                                                                      |
