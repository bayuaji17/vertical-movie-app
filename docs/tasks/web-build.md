# Modul: Build web

> Diperbarui 5 Oktober 2026. Implementasi disetujui pengguna 5 Oktober 2026; hasil dan status task dicatat setelah verifikasi.

## Tujuan modul

Build web memiliki diagnostik berguna dan mempertahankan runtime SSR/Bun serta batas import. Acuan: [workflow](../guides/development-workflow.md), [architecture](../architecture/overview.md), [context](../plans/tanstack-build-warnings/repository-context.md), [plan](../plans/tanstack-build-warnings/implementation-plan.md).

## User story: WEB-BUILD-US-01

Sebagai pengembang, saya ingin warning dependency yang dikenali ditangani secara terbatas agar log mudah diperiksa dan diagnostic lain tetap terlihat.

## Task: WEB-BUILD-001 — Reproduksi warning dan susun plan

- Status: Done
- Owner: Codex
- Prioritas: P1
- Referensi: WEB-BUILD-US-01, plan STEP-001, permintaan pengguna 5 Oktober 2026.
- Diperbarui: 2026-10-05
- Dependensi: Tidak ada
- Ukuran: Satu context/plan dan branch fix.

### Ruang lingkup

Analisis lampiran/config/vendor/test pada SHA `b60f7676101d94c8725528dbef02b92c28eeee32`; branch `fix/tanstack-build-warnings`, context sebelum plan, backlog dan navigasi. Pertahankan 22 file lokal desain/index/stylesheet existing.

### Acceptance criteria

- [x] Branch prefix fix dibuat dari main dan scope warning diidentifikasi.
- [x] Baseline direproduksi; versi, environment dan metadata ditelusuri.
- [x] Context/plan/backlog memuat affected files, dependency, AC, validation dan rollback.
- [x] Docs/format/whitespace/scoped staging lulus; commit planning tanpa source fix/desain existing.

### Validasi

Build web tanpa cache, analisis per environment/package, probe Rolldown in-memory, docs:check, targeted Prettier, whitespace, staging dan preservation.

### Hasil dan bukti

`bun run build --filter=web --force` lulus: 2 task API dependency/web tanpa cache dalam 10.651 detik. Total 135 warning directive (client 1, SSR 0, Nitro 134) dari 7 package; lampiran subset 70 warning. Probe memastikan code/ID/location tersedia dan directive pada pesan ANSI. Proposal memakai onLog Vite/Nitro dengan pasangan package/directive spesifik dan default forwarding. Source fix belum diimplementasikan. Docs checks dan receipt commit menyusul hasil aktual.

Dokumentasi 5 Oktober 2026: docs:check worktree 47 Markdown/336 tautan dan snapshot index 40 Markdown/317 tautan lulus; targeted Prettier dan whitespace lulus. Sebanyak 21 file existing selain indeks tidak berubah; indeks mempertahankan desain lokal melalui staging hunk task. Source/config/lockfile tidak berubah. Empat staged paths hanya context, plan, backlog dan navigasi.

### Commit task

- Pesan: `docs(web): plan TanStack build warning fix (WEB-BUILD-001)`.
- SHA: `cff4096feed95018ac756f593bf7c1a9863db70f`.
- Hook/checks: docs:check 47/336, lint 1 task dan check-types 3 task (cache valid), Commitlint lulus tanpa bypass.
- Ledger: Receipt/status Done dicatat setelah commit untuk pembaruan dokumen task berikutnya; branch lokal belum dipush.

### Blocker atau tindak lanjut

Planning tidak terblokir; implementasi menunggu permintaan eksekusi.

## Task: WEB-BUILD-002 — Filter warning dan wiring

- Status: Review
- Owner: Codex
- Prioritas: P1
- Referensi: WEB-BUILD-US-01, plan STEP-002.
- Diperbarui: 2026-10-05
- Dependensi: WEB-BUILD-001; implementasi disetujui pengguna.
- Ukuran: Helper, wiring konfigurasi dan regression test.

### Ruang lingkup

Helper build logging, Vite/Nitro onLog dan native Bun diagnostic regression test sesuai affected files/aturan filter pada plan. Pertahankan opsi Nitro/plugin/env/import protection.

### Acceptance criteria

- [x] Hanya pasangan package/directive target dengan ID dependency valid disaring.
- [x] Unknown/source/missing ID, Windows/Bun path, ANSI dan code log lain diuji; default forwarding benar.
- [x] Build semua environment tanpa cache serta test/types/lint/build/docs lulus.
- [ ] Commit task terpisah; source/desain/dependency di luar scope terjaga.

### Validasi

Test diagnostic forwarding dan existing web tests; build tanpa cache, root quality gates, docs/format/whitespace. Recheck freshness sebelum source berubah.

### Hasil dan bukti

5 Oktober 2026: helper apps/web/tooling/log-filter.ts memakai type-only Vite BuildOptions dan Bun.stripANSI native. Vite build.rolldownOptions.onLog dan Nitro rolldownConfig.onLog memakai handler yang sama; opsi preset/external/plugin/env/import protection existing tetap. Folder tooling dipilih karena build di-ignore Git/formatter; tidak menambah dependency atau mengubah ignore rules.

Native Bun web tests: 59 pass, 0 fail, 197 assertions; 22 test baru memeriksa batas suppression/default forwarding. Probe Rolldown nyata in-memory lulus: known dependency disaring, source use server diteruskan. Root check-types 3 task lulus (web dieksekusi ulang, API/auth cache valid), lint web 1 task lulus setelah unnecessary optional chain diperbaiki, build --force 2 task lulus tanpa cache dalam 9.79 detik. Log client/SSR/Nitro menunjukkan 0 MODULE_LEVEL_DIRECTIVE; warning ukuran chunk tetap terlihat. Hash 22 file existing tetap sama sebelum index status diperbarui; manifests/lockfile/generated route tree tidak berubah.

### Commit task

Pesan: fix(web): filter known build directive warnings (WEB-BUILD-002). SHA/hook aktual dicatat sesudah commit; docs/format/whitespace dan scoped index diperiksa sebelum commit.

### Blocker atau tindak lanjut

Implementasi disetujui pengguna. Optimasi chunk terpisah.

## Task: WEB-BUILD-003 — Verifikasi production build dan closure

- Status: Backlog
- Owner: Pengembang/agent saat implementasi diminta
- Prioritas: P1
- Referensi: WEB-BUILD-US-01, plan STEP-003.
- Diperbarui: 2026-10-05
- Dependensi: WEB-BUILD-002
- Ukuran: Verifikasi build/runtime dan evidence.

### Ruang lingkup

Negative import proof, build sukses final, SSR smoke existing pada fixture/port terisolasi, perbandingan artefak/routes dan update backlog/plan/index. Tidak ada deployment atau proof database/storage.

### Acceptance criteria

- [ ] Warning target hilang; warning chunk/diagnostic lain tetap terlihat.
- [ ] Import server terlarang tetap menggagalkan client build; fixture dipulihkan.
- [ ] Build final/SSR smoke lulus, entry Bun dan route/client asset graph valid.
- [ ] Gates/docs/preservation lulus; browser/hydration yang belum diuji dicatat.
- [ ] Evidence/receipt dan commit closure selesai.

### Validasi

`bun run --cwd apps/web auth:import:proof` sebelum build final sukses; `bun run --cwd apps/web auth:ssr:smoke`. Pakai gate STEP-002 yang masih valid; ulangi jika perubahan/failure baru. Docs/format/whitespace/preservation sebelum commit.

### Hasil dan bukti

Belum dijalankan untuk fix; baseline bukan bukti behavior pascaperubahan.

### Commit task

Belum dibuat; gunakan Conventional Commit ber-ID WEB-BUILD-003 dan catat SHA sesudah berhasil.

### Blocker atau tindak lanjut

Menunggu WEB-BUILD-002. Push/PR/merge memerlukan instruksi delivery tersendiri; squash branch sebelumnya bukan default branch ini.
