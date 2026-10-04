# Repository context: warning build TanStack

## Snapshot

- Repository: `bayuaji17/vertical-movie-app`.
- Base ref: `main`.
- Base SHA: `b60f7676101d94c8725528dbef02b92c28eeee32`.
- Analyzed at: `2026-10-05T02:36:30+07:00`.
- Context status: current; source fix belum diimplementasikan.
- Branch kerja: `fix/tanstack-build-warnings`, dibuat dari base SHA atas permintaan pengguna.

## Product and users

Aplikasi video vertikal dengan admin dan pengunjung publik; produk dimiliki [PRD](../../product/prd.md) dan [Global Rules](../../product/global-rules.md). Tujuan perubahan ini adalah mengurangi diagnostik build dependency yang tidak actionable untuk pipeline saat ini, sambil mempertahankan diagnostik lain dan batas import server/client. Tidak mengubah kebutuhan produk.

## Repository map

| Subsystem                   | Peran dan relevansi                                                                                         |
| --------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `apps/web/`                 | TanStack Start React, Vite, Nitro/Bun; pemilik konfigurasi build dan fix.                                   |
| `apps/api/`                 | Elysia, metadata/media dan worker; tidak diubah oleh fix. Build dependency tetap ikut pada root filter web. |
| `packages/auth/`            | Better Auth entry server/client/types; proteksi import server pada client harus tetap aktif.                |
| `docs/`                     | Spesifikasi, panduan, runbook, context/plan dan backlog canonical.                                          |
| `scripts/`, `.husky/`       | Checker dokumentasi dan quality gate commit.                                                                |
| Root manifests/config       | Bun workspace, Turbo 2.11.7, lockfile; upgrade dependency/config Turbo bukan scope fix.                     |
| `.agents/`, `.commandcode/` | Skill repository dan symlink agent; tidak diubah.                                                           |

## Architecture and boundaries

`apps/web/vite.config.ts` memakai `defineConfig`, loadEnv PORT/HOST, devtools, Nitro preset Bun, Tailwind, `tanstackStart` dan `viteReact`. Import protection memakai `behavior: 'error'` dengan larangan client `@repo/auth/server`. Konfigurasi tidak memasang plugin RSC atau React Compiler secara eksplisit; keberadaan package RSC/compiler pada dependency tree bukan bukti pipeline tersebut aktif.

Source komponen UI/player juga mengandung `'use client'`, tetapi seluruh warning pada baseline yang diamati berasal dari `node_modules`. Jangan menghapus directive source/dependency untuk merapikan log. Rendering SSR/hydration dan runtime Bun harus tetap seperti [overview](../../architecture/overview.md).

## Runtime and data flow

Root `bun run build --filter=web --force` → Turbo → build API sebagai dependency dan `web#build` → `bun run --bun vite build` → environment client → SSR → Nitro → `apps/web/.output/server/index.mjs` dan public assets. `apps/web/package.json` menjalankan artefak server dengan Bun.

Versi hasil resolusi lokal/lockfile: Vite 8.3.1, Rolldown 1.2.11, TanStack React Start 1.168.59, Router 1.170.40, plugin React 6.1.1, Nitro 3.0.260610-beta, Bun 1.4.2 dan Turbo 2.11.7.

## Domain and data model

Tidak ada perubahan model konten, schema, database, storage, worker atau kontrak playback. Migration/proof database tidak diperlukan untuk fix konfigurasi logging build ini.

## External integrations

Warning berasal dari library UI/React lintas bundler. [Rolldown directives](https://rolldown.rs/in-depth/directives#other-directives) menjelaskan bundler tidak mengetahui semantik directive tambahan dan dapat mengeluarkan warning ketika directive tidak dipertahankan. Ini tidak membuktikan kerusakan runtime aplikasi.

[Vite build options](https://vite.dev/config/build-options#build-rolldownoptions) menyediakan `build.rolldownOptions`; `build.rollupOptions` merupakan alias deprecated. [Rolldown onLog](https://rolldown.rs/reference/InputOptions.onLog) menyediakan callback level/log/defaultHandler; [onwarn](https://rolldown.rs/reference/InputOptions.onwarn) merupakan API legacy. Dokumentasi live ini dicocokkan dengan types/source versi terpasang.

## Development, testing and delivery

- Pemilik command dan kriteria selesai: [workflow](../../guides/development-workflow.md) dan root AGENTS.
- Test existing web berada pada `apps/web/test`; proof import boundary sengaja mencoba import server dan mengembalikan fixture melalui `finally`.
- `auth:ssr:smoke` memakai backend fixture/port terisolasi untuk memeriksa SSR/admin/login/cookie/failure handling pada build production. Bukan pemeriksaan hydration browser.
- Root check-types mencakup API/web/auth; lint hanya web; build API/web.
- Commit lokal per task setelah checks lulus. Push/PR/merge branch baru belum diminta; pengecualian squash branch dokumentasi sebelumnya tidak berlaku otomatis.

## Constraints and conventions

Gunakan Bun, dependency terpasang, prefix branch `fix/` dan dokumentasi root. Pertahankan plugin order, import protection, Nitro preset Bun, konfigurasi PORT/HOST, external Sentry existing dan generated route tree. Hindari `logLevel: 'silent'`, penghapusan directive, plugin tambahan, upgrade dependency, atau blanket `checks.moduleLevelDirective: false`.

## Relevant active work

Saat mulai terdapat 22 file lokal desain/index/stylesheet yang berubah atau belum tracked; semuanya pekerjaan existing di luar scope. `docs/README.md` memiliki tautan artefak desain lokal, sehingga staging update navigasi harus memakai hunk task saja. `fix/tanstack-build-warnings` dibuat dengan mempertahankan perubahan ini.

## Exploration coverage

Root instructions/index/workflow/template, manifests/config, overview/Global Rules, import boundary/SSR proofs dan source UI terkait directive telah diperiksa. Types dan implementation Vite/Rolldown/Nitro ditelusuri untuk logging. API/worker/database diklasifikasikan tanpa mengulang proof integrasi karena tidak terdampak.

Baseline 5 Oktober 2026: `bun run build --filter=web --force` lulus, dua task dieksekusi tanpa cache dalam 10.651 detik. Client: satu `use no memo`; SSR: nol warning directive; Nitro: 133 `use client` dan satu `use no memo`. Total 135. Warning ukuran chunk >500 kB tetap ada dan terpisah. Lampiran pengguna berisi subset 70 warning (69 `use client`, satu `use no memo`), bukan log build lengkap.

| Package pada baseline    | Jumlah warning lintas environment |
| ------------------------ | --------------------------------: |
| `@base-ui/react`         |                                72 |
| `@base-ui/utils`         |                                12 |
| `@tanstack/react-router` |                                20 |
| `@tanstack/react-query`  |                                15 |
| `@tanstack/react-form`   |                                 5 |
| `@videojs/react`         |                                 9 |
| `react-compiler-runtime` |                                 2 |

Probe Rolldown virtual in-memory memastikan warning mempunyai `level: 'warn'`, `code: 'MODULE_LEVEL_DIRECTIVE'`, `id`, `loc.file` dan `message` berformat ANSI. Nama directive berada pada pesan, bukan field directive terstruktur. Tidak menulis perubahan konfigurasi/source untuk probe ini.

## Unknowns and assumptions

Klasifikasi noise bersifat inferensi berdasarkan pipeline non-RSC yang dikonfigurasi dan build yang berhasil, bukan verifikasi semua semantik dependency. Efektivitas filter serta komposisi callback pada environment Nitro perlu dibuktikan saat implementasi; source Nitro menggabungkan `rolldownConfig`, `rollupConfig` dan konfigurasi environment. Semua log di luar allowlist, ID hilang, atau directive yang tidak dikenal harus tetap dilaporkan.

## Evidence index

Semua bukti repository merujuk base SHA di atas; types/source vendor merujuk versi terpasang yang dikunci oleh `bun.lock`.

| Bukti                                                                                                     | Kesimpulan                                                                                                                      |
| --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web/vite.config.ts`: config/plugins/importProtection                                                | Pemilik fix, environment dan batas auth.                                                                                        |
| `apps/web/package.json`, `package.json`, `turbo.json`, `bun.lock`                                         | Command, runtime/output, dependency graph dan versi.                                                                            |
| `apps/web/test/auth-import-boundary-proof.mjs`                                                            | Negative proof build untuk import server pada client.                                                                           |
| `apps/web/test/auth-ssr-smoke.mjs`                                                                        | SSR fixture terisolasi dan cakupan smoke existing.                                                                              |
| Vite 8.3.1 `dist/node/chunks/node.js`: `onRollupLog`, `normalizeUserOnWarn`                               | User `onLog` meneruskan log ke default/Vite/Nitro handlers.                                                                     |
| Rolldown 1.2.11 `dist/shared/logging-*.d.mts`, `define-config-*.d.mts`                                    | Metadata diagnostic, `onLog`, deprecation `onwarn` dan checks.                                                                  |
| Nitro terpasang `dist/vite.mjs`: `getBundlerConfig`; `dist/_build/vite.env.mjs`: `createNitroEnvironment` | Nitro merupakan build environment tersendiri; ada merge konfigurasi dan handler warning existing.                               |
| Lampiran pengguna dan baseline build/probe teramati 5 Oktober 2026                                        | Warning dependency direproduksi; build tidak gagal; metadata cocok untuk filter spesifik. Log mentah temporary tidak masuk Git. |
