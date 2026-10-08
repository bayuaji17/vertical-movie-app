# Modul: Organisasi hooks web

> Status: In Progress · 8 Oktober 2026 · scope structural disetujui pengguna; katalog tetap draft terpisah.

## Tujuan modul

Memusatkan delapan custom hooks di `apps/web/src/hooks/use-*.ts` dan memperjelas hook vs component/provider/domain utility tanpa perubahan behavior. [Context](../plans/web-hooks-organization/repository-context.md), [plan](../plans/web-hooks-organization/implementation-plan.md), [workflow](../guides/development-workflow.md) dan root AGENTS menjadi acuan.

## User story: WHOOK-US-01

Sebagai pengembang, saya ingin hooks React aplikasi mempunyai folder dan prefix yang konsisten, sehingga lokasi state/effect logic mudah ditemukan dan import ownership jelas.

## Task: WHOOK-001 — Inventaris, context dan plan refactor

- Status: Review
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
- [ ] Docs/format/whitespace dan local task commit lulus.

### Validasi

Static inventory/reverse imports, docs:check, scoped Prettier, git diff --check, preservation/scoped stage audit.

### Hasil dan bukti

Inventory delapan hooks diperiksa. Base `68a0053d3bc145f07c8bdf14490456436d0973a5`; remote plan head sama; branch baru dibuat setelah push. `bun run docs:check`, scoped Prettier dan `git diff --check` lulus. Source diff masih kosong; local task commit/hooks pending.

### Commit task

- Pesan: `docs: plan web hook organization (WHOOK-001)`.
- SHA: belum dibuat.
- Hook/checks: pending.
- Ledger: dicatat setelah commit berhasil pada update task berikutnya.

### Blocker atau tindak lanjut

Tidak ada required approval baru; validation task documentation sebelum source refactor.

## Task: WHOOK-002 — Pusatkan delapan hooks dan update imports

- Status: Backlog
- Owner: Codex
- Prioritas: P1
- Referensi: WHOOK-US-01; source targets/kontrak pada plan.
- Diperbarui: 2026-10-08
- Dependensi: WHOOK-001
- Ukuran: File move/extraction/import updates dalam satu refactor coherent.

### Ruang lingkup

Move empat dedicated hooks admin; extract principal/session/theme/logout; shared ThemeContext; update consumers dan root hook conventions/index structure. Tidak memindah vendor API, pure utilities atau mengubah behavior.

### Acceptance criteria

- [ ] Delapan `src/hooks/use-*.ts` memakai `useX`, tidak ada old runtime import/re-export.
- [ ] Hook bodies/shared contexts/coordinator/effect semantics preserved; root naming convention tercatat.
- [ ] Existing web tests, types/lint/build, import-boundary/SSR dan applicable browser smoke lulus atau unavailable terbukti dicatat.
- [ ] Docs/scoped staging/preservation dan separate local task commit lulus.

### Validasi

`bun test apps/web/test`, `bun run check-types`, `bun run lint`, `bun run --cwd apps/web auth:import:proof`, final `bun run build`, `bun run --cwd apps/web auth:ssr:smoke`; browser auth cache/routes bila runner tersedia; docs:check, Prettier dan diff-check. Tidak reset real media/development DB untuk refactor ini.

### Hasil dan bukti

Belum diimplementasikan/divalidasi.

### Commit task

- Pesan: `refactor(web): centralize application hooks (WHOOK-002)`.
- SHA: belum dibuat.
- Hook/checks: pending.
- Ledger: dicatat setelah commit berhasil pada update task berikutnya.

### Blocker atau tindak lanjut

WHOOK-001 prerequisite; browser runner availability diperiksa saat validation.

## Task: WHOOK-003 — Closure dokumentasi dan receipts

- Status: Backlog
- Owner: Codex
- Prioritas: P1
- Referensi: WHOOK-US-01; proof/receipt task sebelumnya.
- Diperbarui: 2026-10-08
- Dependensi: WHOOK-002
- Ukuran: Canonical status/ledger update.

### Ruang lingkup

Status implemented/verified lokal, actual task SHA/checks dan remote plan receipt pada backlog/plan/index; preserve historical paths dan limitations.

### Acceptance criteria

- [ ] Source organization dan actual checks/limitations tercatat; task SHA tidak self-referential.
- [ ] Unrelated work preserved; refactor branch lokal dan catalog branch remote dibedakan akurat.
- [ ] Docs/format/whitespace/hooks serta local closure commit lulus.

### Validasi

Docs:check, scoped Prettier, git diff --check, staged-tree local links/anchors, staged audit dan commit hooks; runtime checks sebelumnya valid tanpa source change.

### Hasil dan bukti

Belum dikerjakan; mengikuti actual receipt setelah WHOOK-002.

### Commit task

- Pesan: `docs: record web hook organization verification (WHOOK-003)`.
- SHA: belum dibuat.
- Hook/checks: pending.
- Ledger: receipt aktual dicatat setelah commit berhasil untuk update berikutnya.

### Blocker atau tindak lanjut

Push/PR/merge refactor memerlukan authorization terpisah; tidak termasuk push awal plan katalog.
