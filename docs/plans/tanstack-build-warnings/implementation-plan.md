# Implementation plan: warning build TanStack

## Plan metadata

- Status: ready; proposal teknis, source fix belum diimplementasikan.
- Diperbarui: 2026-10-05.
- Repository: `bayuaji17/vertical-movie-app`.
- Base ref: `main`; base SHA / last validated SHA: `b60f7676101d94c8725528dbef02b92c28eeee32`.
- Branch: `fix/tanstack-build-warnings`.
- Context: [repository-context.md](repository-context.md), disimpan sebelum plan ini.
- Backlog: [web-build](../../tasks/web-build.md).
- Otorisasi saat ini: branch dan plan, beserta commit lokal planning menurut workflow root. Implementasi/remote delivery belum diminta.

## Objective

Build TanStack tetap berhasil dengan batas SSR/auth yang sama, sambil menghilangkan warning directive dependency yang dikenali pada pipeline saat ini. Developer tetap melihat diagnostik lain.

## Goals and non-goals

Tangani warning `MODULE_LEVEL_DIRECTIVE` untuk pasangan package/directive pada baseline. Optimasi chunk >500 kB, upgrade package, aktivasi RSC/compiler, perubahan UI/player/API/database dan konfigurasi Turbo di luar scope.

## Current behavior

Baseline build berhasil dengan 135 warning: client satu `use no memo`; SSR nol; Nitro 133 `use client` dan satu `use no memo`. Semua berasal dari dependency. Lampiran pengguna adalah subset 70 warning. Vite dan Nitro memiliki jalur konfigurasi tersendiri; fix client saja tidak menangani mayoritas warning.

Rolldown 1.2.11 menyediakan `onLog`, code/ID/location dan pesan ANSI. Nitro mempunyai `onwarn` dengan ignore rules existing; Vite menyediakan default handler yang meneruskan mekanisme tersebut. API legacy `onwarn` dan alias deprecated Vite `build.rollupOptions` tidak dipilih untuk konfigurasi baru.

## Desired behavior

Satu handler build bertipe sesuai Vite/Rolldown terpasang menghentikan log hanya bila semuanya cocok:

1. Level warn dan code `MODULE_LEVEL_DIRECTIVE`.
2. ID diagnostic terstruktur berada dalam `node_modules`; normalisasi separator Windows/Bun nested paths dan identifikasi package pada segmen node_modules terakhir. ID hilang/tidak jelas diteruskan.
3. Directive pada header pesan setelah normalisasi ANSI cocok dengan allowlist pasangan package/directive.
4. `use client` hanya untuk `@base-ui/react`, `@base-ui/utils`, `@tanstack/react-router`, `@tanstack/react-query`, `@tanstack/react-form`, `@videojs/react`; `use no memo` hanya untuk `react-compiler-runtime`.

Log lain diteruskan melalui `defaultHandler(level, log)` dengan log/level asli. Filter mengatur diagnostik tanpa transform directive atau bundle. Review allowlist jika package atau pipeline RSC/compiler berubah.

## Impact analysis

Hubungkan handler ke Vite `build.rolldownOptions.onLog` dan Nitro `rolldownConfig.onLog`. Pertahankan Nitro preset Bun, external Sentry existing, plugin order, PORT/HOST dan import protection. Efektivitas serta composition Nitro harus dibuktikan pada build nyata; sesuaikan lokasi wiring berdasarkan resolved environment bila diperlukan, tanpa memperluas filter.

## Affected files and symbols

| Path                                                        | Action | Symbols                          | Reason / evidence                                                             |
| ----------------------------------------------------------- | ------ | -------------------------------- | ----------------------------------------------------------------------------- |
| `apps/web/build/log-filter.ts`                              | create | Handler dan allowlist            | Tooling web di luar source bundle; types melalui Vite, tanpa dependency baru. |
| `apps/web/vite.config.ts`                                   | modify | build options dan opsi nitro     | Jalur Vite/Nitro ditelusuri pada context.                                     |
| `apps/web/test/build-log-filter.test.ts`                    | create | Bun diagnostic regression tests  | Buktikan batas suppression dan default forwarding.                            |
| `docs/tasks/web-build.md`                                   | modify | WEB-BUILD-001–003                | Status, AC, command/results dan SHA aktual.                                   |
| `docs/plans/tanstack-build-warnings/implementation-plan.md` | modify | Freshness/execution log          | Bukti eksekusi dan penyesuaian wiring.                                        |
| `docs/plans/tanstack-build-warnings/repository-context.md`  | modify | Snapshot bila stale              | Refresh hanya jika perubahan relevan membatalkan bukti.                       |
| `docs/README.md`                                            | modify | Navigasi/status plan dan backlog | Stage hanya hunk task; desain lokal terpisah.                                 |

Manifest/lockfile, stylesheet, komponen dan route tree generated tetap di luar scope. Tsconfig web mencakup semua TypeScript; helper/test harus lolos konfigurasi types/lint existing.

## Implementation DAG

`WEB-BUILD-001 / STEP-001 → WEB-BUILD-002 / STEP-002 → WEB-BUILD-003 / STEP-003`.

## Implementation steps

### STEP-001 — Reproduksi, context dan plan

- Outcome: branch fix, baseline, diagnosis dan proposal terdokumentasi.
- Depends on: none.
- Files: context, plan, backlog, indeks docs.
- Symbols: config/plugin graph dan diagnostic metadata.
- Requirements: snapshot SHA, versi, baseline per environment, source/vendor evidence dan batas scope.
- Validation: baseline build tanpa cache, probe in-memory, docs:check, Prettier, whitespace/scoped staging/preservation.
- Acceptance criteria: plan ready berdasarkan evidence; source fix belum berubah; commit planning lokal setelah checks lulus.

### STEP-002 — Filter spesifik dan wiring

- Outcome: warning allowlist hilang; diagnostic lain diteruskan.
- Depends on: STEP-001 dan permintaan implementasi.
- Files: helper, vite.config.ts, regression test dan evidence backlog/plan.
- Symbols: onLog, build.rolldownOptions, nitro.rolldownConfig.
- Requirements: kondisi filter lengkap di atas dan default handler existing. Jangan memakai silent logging, blanket checks, menghapus directive atau menambah dependency.
- Validation: test diagnostic nyata dari probe, build web tanpa cache, existing tests dan root types/lint/build.
- Acceptance criteria: semua warning baseline dalam allowlist hilang di client/SSR/Nitro, diagnostic non-target tetap actionable, gate lulus dan commit task terpisah.

### STEP-003 — Verifikasi build, SSR dan closure

- Outcome: artefak dan batas import tetap valid dengan evidence akhir.
- Depends on: STEP-002.
- Files: backlog/plan/index; konfigurasi hanya bila pemeriksaan menemukan failure.
- Symbols: production entry Bun, import protection, SSR smoke existing.
- Requirements: log build baru, routes/client asset graph valid, warning chunk tetap terlihat. Metadata output nondeterministic bukan failure otomatis.
- Validation: negative import proof dengan fixture dipulihkan, lalu build production final yang sukses dan SSR smoke existing pada backend/port terisolasi. Catat browser/hydration belum terverifikasi jika tidak menjalankan smoke browser yang sesuai. Root gates/docs/preservation; tidak mengulang gate yang masih valid tanpa perubahan/failure baru.
- Acceptance criteria: import server tetap menggagalkan client build, SSR smoke lulus, entry .output/server/index.mjs tersedia, diagnostic target bersih, evidence lengkap dan commit closure terpisah. Remote delivery hanya saat diminta.

## Test requirements

Test perilaku mencakup pasangan allowlist aktual; scoped package/Bun nested ID; separator Windows; package mirip tetapi bukan target; source aplikasi; ID kosong; directive asing/use server; use no memo pada package lain; code warning berbeda; info/debug; pesan ANSI dan format tak dikenal. Kasus di luar allowlist harus meneruskan log asli tepat ke default handler. Fixture merepresentasikan metadata probe terpasang; bukan test yang hanya mencocokkan isi konfigurasi.

Command implementasi: `bun test apps/web/test`, `bun run --cwd apps/web auth:import:proof`, `bun run check-types`, `bun run lint`, `bun run build --force`, `bun run --cwd apps/web auth:ssr:smoke`, `bun run docs:check`, targeted Prettier dan `git diff --check`. Import proof dijalankan sebelum build sukses terakhir karena failure proof disengaja. Jika script/dependency berubah, tambahkan frozen install.

## Constraints

Tidak menyaring berdasarkan substring directive saja, node_modules saja atau seluruh code MODULE_LEVEL_DIRECTIVE. Pertahankan protection/env/private boundaries dan desain existing. Tidak menjalankan migrasi, integration DB/storage/FFmpeg atau production rollout.

## Acceptance criteria

- [ ] Target warning dependency hilang dari build baru client/SSR/Nitro.
- [ ] Source/unknown directives dan diagnostic lain tetap dilaporkan; build error tetap gagal.
- [ ] Regression/existing tests, negative import proof, SSR smoke dan quality gates lulus.
- [ ] Artefak Bun/routes tetap valid; browser yang belum diuji tidak diklaim lulus.
- [ ] Docs/receipt konsisten, satu commit per task dan pekerjaan lokal lain terjaga.

## Risks and mitigations

Filter luas berisiko menyembunyikan masalah: batasi pasangan package/directive dan forward default. Nitro bisa mengganti konfigurasi top-level: wire opsi Nitro dan periksa environment nyata. Format warning dapat berubah: format yang tak dikenali diteruskan. Aktivasi RSC/compiler nanti memerlukan review semantik baru; plan ini tidak menjanjikan suppression selalu aman pada pipeline lain.

## Rollback or recovery

Revert commit filter/helper/wiring melalui commit biasa bila terjadi regresi. Kembali ke konfigurasi baseline dengan warning terlihat; tidak ada data/schema/media yang perlu dipulihkan. Jangan reset/stash seluruh pekerjaan desain pengguna.

## Evidence

[Context dan evidence index](repository-context.md#evidence-index) merekam snapshot, source/vendor terpasang dan referensi resmi. [Backlog](../../tasks/web-build.md) memiliki results terperinci. Keberhasilan baseline bukan bukti fix sudah bekerja.

## Open decisions

Tidak ada keputusan produk yang menghalangi scope directive. Optimasi chunk/upgrade/RSC/compiler merupakan pekerjaan terpisah bila diminta. Efektivitas wiring dan batas smoke browser harus dibuktikan saat implementasi.

## Validation history

### 2026-10-05 — Freshness planning

- Result: valid.
- Plan base SHA/current target SHA: `b60f7676101d94c8725528dbef02b92c28eeee32`.
- Checked paths: config/manifests/lockfile, tests, context dan vendor Vite/Rolldown/Nitro.
- Changed relevant paths: belum ada source/config/dependency task berubah; desain existing terpisah.
- Decision: ready. Recheck SHA/affected paths sebelum implementasi; commit dokumen saja tidak otomatis membatalkan baseline.

## Execution log

- Branch fix dibuat dari base SHA; lampiran dan vendor ditelusuri.
- Baseline `bun run build --filter=web --force` lulus: 2 task tanpa cache, 10.651 detik, 135 warning directive dan warning chunk terpisah. Probe in-memory memastikan metadata tersedia tanpa mengubah source/config.
- Context disimpan sebelum plan/backlog. Source fix, proof pascaperubahan dan remote delivery belum dijalankan; hasil docs checks/commit planning dicatat setelah teramati.
- Docs:check worktree 47 Markdown/336 tautan dan snapshot index 40 Markdown/317 tautan lulus; targeted Prettier dan whitespace lulus. Preservation 21 file existing selain indeks lulus; indeks hanya men-stage navigasi task. Source/config/lockfile unchanged pada freshness sebelum commit.
