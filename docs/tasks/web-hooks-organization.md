# Modul: Organisasi hooks web

> Status: WHOOK-001–003 Done; integrasi delivery WHOOK-004 In Progress · 8 Oktober 2026 · refactor structural disetujui pengguna.

## Tujuan modul

Memusatkan delapan custom hooks di `apps/web/src/hooks/use-*.ts` dan memperjelas hook vs component/provider/domain utility tanpa perubahan behavior. [Context](../plans/web-hooks-organization/repository-context.md), [plan](../plans/web-hooks-organization/implementation-plan.md), [workflow](../guides/development-workflow.md) dan root AGENTS menjadi acuan.

## User story: WHOOK-US-01

Sebagai pengembang, saya ingin hooks React aplikasi mempunyai folder dan prefix yang konsisten, sehingga lokasi state/effect logic mudah ditemukan dan import ownership jelas.

## Task: WHOOK-001 — Inventaris, context dan plan refactor

- Status: Done
- Owner: Codex
- Prioritas: P1
- Referensi: WHOOK-US-01; permintaan pengguna 8 Oktober 2026.
- Diperbarui: 2026-10-08
- Dependensi: commit/push plan katalog berhasil, branch baru dibuat.
- Ukuran: Dokumentasi bounded inventory delapan hooks.

### Ruang lingkup

Source trace/snapshot dan callers, context sebelum plan, backlog task/index; source tidak berubah.

### Acceptance criteria

- [x] Semua hook/pure helper/provider boundaries dan affected consumers dipetakan pada immutable SHA.
- [x] Plan execution/validation dan authorization tercatat; unrelated files dipertahankan.
- [x] Docs/format/whitespace dan local task commit lulus.

### Validasi

Static inventory/reverse imports, docs:check, scoped Prettier, git diff --check, preservation/scoped stage audit.

### Hasil dan bukti

Inventory delapan hooks diperiksa. Base `68a0053d3bc145f07c8bdf14490456436d0973a5`; remote plan head sama; branch baru dibuat setelah push. `bun run docs:check`, scoped Prettier dan `git diff --check` lulus. Source diff kosong pada commit planning; task commit `82e04958a14e42206acc97604e226a16a53aa9e1` berhasil dengan hooks. Receipt dicatat pada update task berikutnya.

### Commit task

- Pesan: `docs: plan web hook organization (WHOOK-001)`.
- SHA: `82e04958a14e42206acc97604e226a16a53aa9e1`.
- Hook/checks: docs 72/683, lint 1/types 3 task cache valid dan Commitlint lulus tanpa bypass.
- Ledger: dicatat setelah commit berhasil pada update task berikutnya.

### Blocker atau tindak lanjut

Tidak ada required approval baru; validation task documentation sebelum source refactor.

## Task: WHOOK-002 — Pusatkan delapan hooks dan update imports

- Status: Done
- Owner: Codex
- Prioritas: P1
- Referensi: WHOOK-US-01; source targets/kontrak pada plan.
- Diperbarui: 2026-10-08
- Dependensi: WHOOK-001
- Ukuran: File move/extraction/import updates dalam satu refactor coherent.

### Ruang lingkup

Move empat dedicated hooks admin; extract principal/session/theme/logout; shared ThemeContext; update consumers dan root hook conventions/index structure. Tidak memindah vendor API, pure utilities atau mengubah behavior.

### Acceptance criteria

- [x] Delapan `src/hooks/use-*.ts` memakai `useX`, tidak ada old runtime import/re-export.
- [x] Hook bodies/shared contexts/coordinator/effect semantics preserved; root naming convention tercatat.
- [x] Existing web tests, types/lint/build, import-boundary/SSR dan applicable browser smoke lulus atau unavailable terbukti dicatat.
- [x] Docs/scoped staging/preservation dan separate local task commit lulus.

### Validasi

`bun test apps/web/test`, `bun run check-types`, `bun run lint`, `bun run --cwd apps/web auth:import:proof`, final `bun run build`, `bun run --cwd apps/web auth:ssr:smoke`; browser auth cache/routes bila runner tersedia; docs:check, Prettier dan diff-check. Tidak reset real media/development DB untuk refactor ini.

### Hasil dan bukti

8 Oktober 2026: delapan custom hooks dipusatkan di src/hooks/use-*.ts; empat files dipindah dan empat hooks diekstrak. Shared ThemeContext di lib/theme/context.ts, AdminSessionContext existing dipertahankan; logout component memakai type-only hook contract. Seluruh hook function bodies diverifikasi identik terhadap base sebelum format; coordinator WeakMap tetap module-scoped. Direct consumers diperbarui, old runtime imports/re-exports tidak ditemukan. Root AGENTS dan index memuat hook ownership.

Actual validation: `bun test apps/web/test` lulus 158 tests/779 assertions, 0 fail; `bun run check-types` 3 task sukses (web dieksekusi, API/auth 2 cache valid) dalam 48.306s; `bun run lint` 1 web task sukses tanpa cache dalam 48.25s. `bun run --cwd apps/web auth:import:proof` lulus, client build menolak @repo/auth/server dan fixture restored. Final `bun run build` lulus 2 task (web fresh, API 1 cache valid) dalam 12.744s; `bun run --cwd apps/web auth:ssr:smoke` lulus admin/null/user/outage/stall, isolated cookie/multiple Set-Cookie, redirect/login dan safe HTML. Docs check 72 Markdown/684 local links, scoped format/diff-check lulus.

Browser UI smoke belum dijalankan: AUTH_BROWSER_NODE/AUTH_PLAYWRIGHT_MODULE/AUTH_BROWSER_EXECUTABLE tidak terkonfigurasi di environment maupun env app; tidak mengklaim browser/production proof baru. Refactor tidak mengubah algoritma/UI/media; native tests dan built SSR/import gates di atas merupakan bukti yang dijalankan. Preservation 22 unrelated dirty files lulus; styles/routeTree/login fixture/manifests/lockfile/Turbo/API/auth package tidak berubah. Task commit `d0e0cf4718b1cba693fd09256d21de99f2b50135` berhasil; hanya 28 source/instruction/docs files task di-stage. Commit hooks lulus tanpa bypass; receipt dicatat sesudah commit untuk WHOOK-003.

### Commit task

- Pesan: `refactor(web): centralize application hooks (WHOOK-002)`.
- SHA: `d0e0cf4718b1cba693fd09256d21de99f2b50135`.
- Hook/checks: staged-tree docs 65/665, hooks docs 72/684, lint 1/types 3 task cache valid dan Commitlint lulus tanpa bypass.
- Ledger: dicatat setelah commit berhasil pada update task berikutnya.

### Blocker atau tindak lanjut

WHOOK-001 prerequisite; browser runner availability diperiksa saat validation.

## Task: WHOOK-003 — Closure dokumentasi dan receipts

- Status: Done
- Owner: Codex
- Prioritas: P1
- Referensi: WHOOK-US-01; proof/receipt task sebelumnya.
- Diperbarui: 2026-10-08
- Dependensi: WHOOK-002
- Ukuran: Canonical status/ledger update.

### Ruang lingkup

Status implemented/verified lokal, actual task SHA/checks dan remote plan receipt pada backlog/plan/index; preserve historical paths dan limitations.

### Acceptance criteria

- [x] Source organization dan actual checks/limitations tercatat; task SHA tidak self-referential.
- [x] Unrelated work preserved; refactor branch lokal dan catalog branch remote dibedakan akurat.
- [x] Docs/format/whitespace/hooks serta local closure commit lulus.

### Validasi

Docs:check, scoped Prettier, git diff --check, staged-tree local links/anchors, staged audit dan commit hooks; runtime checks sebelumnya valid tanpa source change.

### Hasil dan bukti

WHOOK-001 `82e0495` dan WHOOK-002 `d0e0cf4718b1cba693fd09256d21de99f2b50135` berhasil. Source implemented/verified lokal dan actual checks/limitations dicatat; docs closure source-free, quality gates WHOOK-002 tetap valid. Catalog plan remote verified pada `68a0053d3bc145f07c8bdf14490456436d0973a5`; refactor branch lokal. Closure documentation commit `115f6e417266604f157a99c4e74059955a3f3db5` berhasil; hooks/format/whitespace lulus. Receipt ditulis sesudah commit dan dapat masuk dokumentasi task berikutnya, tanpa self-referential SHA.

### Commit task

- Pesan: `docs: record web hook organization verification (WHOOK-003)`.
- SHA: `115f6e417266604f157a99c4e74059955a3f3db5`.
- Hook/checks: docs 72/684, lint 1/types 3 task cache valid dan Commitlint lulus tanpa bypass; scoped Prettier/diff-check lulus.
- Ledger: receipt aktual dicatat setelah commit berhasil untuk update berikutnya.

### Blocker atau tindak lanjut

Push/PR/merge refactor memerlukan authorization terpisah; tidak termasuk push awal plan katalog.

## Task: WHOOK-004 — Integrasi dengan katalog main dan squash delivery

- Status: In Progress
- Owner: Codex
- Prioritas: P1
- Referensi: WHOOK-US-01; instruksi pengguna commit/push/merge squash 8 Oktober 2026.
- Dependensi: WHOOK-003; main `85f635049380df0f7fbc80725d37dfa79d96cc52`.

### Ruang lingkup

Integrasikan main yang sudah memuat katalog/detail/watch PR #11 ke branch hooks. Resolve index docs dengan mempertahankan kedua owner; update AppearanceMenu katalog ke `#/hooks/use-theme`. Source fitur katalog existing tetap menjadi baseline, bukan implementasi baru WHOOK.

### Acceptance criteria

- [x] Konflik docs index terselesaikan dan consumer katalog memakai hook baru.
- [ ] Tests/types/lint/import-boundary/build/SSR serta docs/format/diff lulus pada hasil integrasi.
- [ ] PR head diverifikasi, push/squash merge sesuai instruksi, source branch dipertahankan dan unrelated work dipulihkan.

### Validasi dan evidence

Receipt WHOOK-003 final `01e9956104351270d6ed1c5a2d0743aaccc897dc` berhasil; docs 72/684, scoped formatting/diff dan normal hooks lulus. Branch pushed pada SHA tersebut dan PR #12 dibuat. Fresh main berisi PR #11, menyebabkan konflik index README dan satu import useTheme yang perlu disesuaikan. Snapshot 23 unrelated paths disimpan dalam stash khusus selama integrasi; tidak di-stage untuk delivery.

Unit API/web hasil integrasi: `bun test apps/api/src apps/web/test`, 323 pass, 0 fail, 1727 assertions, 63 files, 19.15s. Root check-types 3 successful/2 cached, 27.473s; lint web fresh pass, 30.957s. Auth import proof menolak server import pada client dan memulihkan fixture. Root build 2 successful/0 cached, 8.859s. Built native auth SSR smoke awalnya exit1: fixture hanya menyediakan auth tetapi readiness probe homepage kini memanggil katalog. Probe dipindahkan ke `/admin/login`, memastikan status200 dan membatalkan body; tidak mengubah runtime aplikasi atau melemahkan assertions auth. SSR rerun lulus admin/null/user/outage/stall, login redirect/availability, cookie isolation/multiple Set-Cookie dan safe HTML. Lint diulang untuk perubahan harness. Browser UI smoke tidak dijalankan ulang karena runner env belum terkonfigurasi; bukti browser PCAT/PCW existing tetap historis. Docs 78/780 dan format/diff lulus sebelum receipt final; normal hooks wajib sebelum commit.

### Commit task

- Pesan: `fix(web): integrate hooks with current catalog (WHOOK-004)`.
- SHA: dicatat sesudah commit berhasil.
- Hooks: normal docs/lint/types/Commitlint wajib tanpa bypass.

### Tindak lanjut

Setelah delivery, refresh plan katalog awal terhadap main; plan lama tidak boleh mengulang fitur HOMEFE/PCAT/PCW yang sudah disetujui dan diimplementasikan.
