# Implementation Plan — Documentation Organization

## Plan Metadata

- Status: completed
- Repository: bayuaji17/vertical-movie-app
- Base ref: main
- Base SHA: 68604daf3abe208f7f57c3b72b0a75d4467dfbc6
- Context: [Repository context](repository-context.md)
- Last validated SHA: 29dd9325a2d9a01ae7fa0ae10cd001c1355eada0

## Objective

Rapikan docs dan jadikan aturan dokumentasi bagian AGENTS.md root agar development berikutnya konsisten.

## Goals and Non-goals

Kelompokkan dokumen, perbarui semua referensi, sediakan pemeriksaan lokal dan aturan maintenance. Isi keputusan, riwayat evidence, kode aplikasi dan desain existing dipertahankan.

## Current Behavior

18 dokumen uppercase bercampur pada root docs; belum ada pemeriksaan dokumentasi otomatis.

## Desired Behavior

README sebagai satu-satunya dokumen root docs; folder product/architecture/guides/operations/plans/tasks/templates/design memakai kebab-case. Instruksi proses berada pada AGENTS.md root. bun run docs:check memeriksa struktur, tautan, anchor dan path dokumen lama; hook commit menjalankannya.

## Impact Analysis

Pemindahan memengaruhi tautan Markdown, path dalam teks dan komentar env sample. Path relatif harus dihitung dari lokasi dokumen baru. Artefak/binary/script desain tidak dipindahkan atau digenerasikan ulang.

## Affected Files and Symbols

| Path                                                                                                                                                                                              | Action | Symbols                 | Reason                           | Evidence                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----------------------- | -------------------------------- | ------------------------------------ |
| [Sumber pada base SHA](https://github.com/bayuaji17/vertical-movie-app/blob/68604daf3abe208f7f57c3b72b0a75d4467dfbc6/docs/PRD.md) → docs/product/prd.md                                           | rename | dokumen dan tautan      | Pisahkan per fungsi              | Indeks/source pada base SHA          |
| [Sumber pada base SHA](https://github.com/bayuaji17/vertical-movie-app/blob/68604daf3abe208f7f57c3b72b0a75d4467dfbc6/docs/GLOBAL_RULES.md) → docs/product/global-rules.md                         | rename | dokumen dan tautan      | Pisahkan per fungsi              | Indeks/source pada base SHA          |
| [Sumber pada base SHA](https://github.com/bayuaji17/vertical-movie-app/blob/68604daf3abe208f7f57c3b72b0a75d4467dfbc6/docs/DESIGN_SYSTEM.md) → docs/design/design-system.md                        | rename | dokumen dan tautan      | Pisahkan per fungsi              | Indeks/source pada base SHA          |
| [Sumber pada base SHA](https://github.com/bayuaji17/vertical-movie-app/blob/68604daf3abe208f7f57c3b72b0a75d4467dfbc6/docs/ARCHITECTURE.md) → docs/architecture/overview.md                        | rename | dokumen dan tautan      | Pisahkan per fungsi              | Indeks/source pada base SHA          |
| [Sumber pada base SHA](https://github.com/bayuaji17/vertical-movie-app/blob/68604daf3abe208f7f57c3b72b0a75d4467dfbc6/docs/VIDEO_DATA_MODEL.md) → docs/architecture/video-data-model.md            | rename | dokumen dan tautan      | Pisahkan per fungsi              | Indeks/source pada base SHA          |
| [Sumber pada base SHA](https://github.com/bayuaji17/vertical-movie-app/blob/68604daf3abe208f7f57c3b72b0a75d4467dfbc6/docs/MEDIA_UPLOAD_CONTRACT.md) → docs/architecture/media-upload-contract.md  | rename | dokumen dan tautan      | Pisahkan per fungsi              | Indeks/source pada base SHA          |
| [Sumber pada base SHA](https://github.com/bayuaji17/vertical-movie-app/blob/68604daf3abe208f7f57c3b72b0a75d4467dfbc6/docs/API_DEVELOPMENT.md) → docs/guides/api-development.md                    | rename | dokumen dan tautan      | Pisahkan per fungsi              | Indeks/source pada base SHA          |
| [Sumber pada base SHA](https://github.com/bayuaji17/vertical-movie-app/blob/68604daf3abe208f7f57c3b72b0a75d4467dfbc6/docs/ENVIRONMENT.md) → docs/guides/environment.md                            | rename | dokumen dan tautan      | Pisahkan per fungsi              | Indeks/source pada base SHA          |
| [Sumber pada base SHA](https://github.com/bayuaji17/vertical-movie-app/blob/68604daf3abe208f7f57c3b72b0a75d4467dfbc6/docs/GLOBAL_WORKFLOW.md) → docs/guides/development-workflow.md               | rename | dokumen dan tautan      | Pisahkan per fungsi              | Indeks/source pada base SHA          |
| [Sumber pada base SHA](https://github.com/bayuaji17/vertical-movie-app/blob/68604daf3abe208f7f57c3b72b0a75d4467dfbc6/docs/TASK_TEMPLATE.md) → docs/templates/task.md                              | rename | dokumen dan tautan      | Pisahkan per fungsi              | Indeks/source pada base SHA          |
| [Sumber pada base SHA](https://github.com/bayuaji17/vertical-movie-app/blob/68604daf3abe208f7f57c3b72b0a75d4467dfbc6/docs/AUTH_OPERATIONS.md) → docs/operations/auth.md                           | rename | dokumen dan tautan      | Pisahkan per fungsi              | Indeks/source pada base SHA          |
| [Sumber pada base SHA](https://github.com/bayuaji17/vertical-movie-app/blob/68604daf3abe208f7f57c3b72b0a75d4467dfbc6/docs/VIDEO_OPERATIONS.md) → docs/operations/video-metadata.md                | rename | dokumen dan tautan      | Pisahkan per fungsi              | Indeks/source pada base SHA          |
| [Sumber pada base SHA](https://github.com/bayuaji17/vertical-movie-app/blob/68604daf3abe208f7f57c3b72b0a75d4467dfbc6/docs/MEDIA_OPERATIONS.md) → docs/operations/media.md                         | rename | dokumen dan tautan      | Pisahkan per fungsi              | Indeks/source pada base SHA          |
| [Sumber pada base SHA](https://github.com/bayuaji17/vertical-movie-app/blob/68604daf3abe208f7f57c3b72b0a75d4467dfbc6/docs/REPOSITORY_CONTEXT.md) → docs/plans/auth/repository-context.md          | rename | dokumen dan tautan      | Pisahkan per fungsi              | Indeks/source pada base SHA          |
| [Sumber pada base SHA](https://github.com/bayuaji17/vertical-movie-app/blob/68604daf3abe208f7f57c3b72b0a75d4467dfbc6/docs/IMPLEMENTATION_PLAN.md) → docs/plans/auth/implementation-plan.md        | rename | dokumen dan tautan      | Pisahkan per fungsi              | Indeks/source pada base SHA          |
| [Sumber pada base SHA](https://github.com/bayuaji17/vertical-movie-app/blob/68604daf3abe208f7f57c3b72b0a75d4467dfbc6/docs/AUTH_REFACTOR_PLAN.md) → docs/plans/auth/refactor-plan.md               | rename | dokumen dan tautan      | Pisahkan per fungsi              | Indeks/source pada base SHA          |
| [Sumber pada base SHA](https://github.com/bayuaji17/vertical-movie-app/blob/68604daf3abe208f7f57c3b72b0a75d4467dfbc6/docs/VIDEO_REPOSITORY_CONTEXT.md) → docs/plans/video/repository-context.md   | rename | dokumen dan tautan      | Pisahkan per fungsi              | Indeks/source pada base SHA          |
| [Sumber pada base SHA](https://github.com/bayuaji17/vertical-movie-app/blob/68604daf3abe208f7f57c3b72b0a75d4467dfbc6/docs/VIDEO_IMPLEMENTATION_PLAN.md) → docs/plans/video/implementation-plan.md | rename | dokumen dan tautan      | Pisahkan per fungsi              | Indeks/source pada base SHA          |
| AGENTS.md, docs/README.md, README.md, apps/*/.env.example                                                                                                                                         | modify | aturan dan indeks/link  | Perbarui ownership dan path      | Root instructions/reverse references |
| scripts/check-docs.mjs                                                                                                                                                                            | create | pemeriksaan dokumentasi | Cegah regresi struktur/link      | Belum ada docs checker               |
| package.json, .husky/pre-commit                                                                                                                                                                   | modify | docs:check              | Jalankan gate development/commit | Script dan hook existing             |
| docs/tasks/documentation.md                                                                                                                                                                       | create | DOCS-001–003            | Catat AC/evidence                | Workflow/template existing           |

## Implementation DAG

STEP-001 → STEP-002 → STEP-003

## Implementation Steps

### STEP-001 — Organisasi dokumen

- Outcome: dokumen dikelompokkan dan tautan dihitung ulang.
- Depends on: none
- Files: mapping pada affected files, docs/README.md, README.md, .env.example.
- Symbols: path Markdown dan referensi tekstual.
- Requirements: preserve isi/evidence, kebab-case, aset existing tetap.
- Validation: daftar file, perbandingan konten sebelum/sesudah, link/anchor checker.
- Acceptance criteria: tidak ada dokumen lama atau tautan lokal rusak.

### STEP-002 — Aturan dan gate

- Outcome: proses dokumentasi konsisten.
- Depends on: STEP-001
- Files: AGENTS.md, guides/development-workflow.md, templates/task.md, scripts/check-docs.mjs, package.json, .husky/pre-commit.
- Symbols: docs:check dan kategori/maintenance.
- Requirements: sumber acuan jelas, context/plan per fitur, status/evidence, update in-place, indeks, pengecualian vendor/generated.
- Validation: jalankan checker positif dan failure fixture terisolasi.
- Acceptance criteria: checker menolak broken link/anchor, lokasi/nama salah dan referensi path lama.

### STEP-003 — Verifikasi dan handoff

- Outcome: perubahan siap ditinjau di branch baru.
- Depends on: STEP-002
- Files: plan/context, docs/tasks/documentation.md dan diff scoped.
- Symbols: evidence hasil checks.
- Requirements: tidak menyerap desain existing atau mengklaim proof runtime baru.
- Validation: docs:check, formatter, whitespace, frozen install, root check-types/lint/build; hash file protected.
- Acceptance criteria: seluruh gate relevan pass dan scope/referensi dicatat.

## Test Requirements

Validasi Markdown dan smoke negatif checker dengan folder fixture di luar repo, tanpa dependensi baru. Root checks sesuai instruksi repo; database migration tidak berlaku.

## Constraints

Satu root AGENTS.md; preserve managed block, credential, binary assets dan runtime. Branch chore/docs-organization; tidak ada commit/push/PR yang diminta dalam request ini.

## Acceptance Criteria

- [x] Semua dokumen canonical ada di kategori yang tepat dan terindeks.
- [x] AGENTS.md root memuat aturan konsisten dan path aktif.
- [x] Seluruh tautan/anchor lokal dan referensi path tervalidasi.
- [x] Gate docs berjalan dari root dan hook commit.
- [x] Isi historis/desain existing terjaga; hasil quality gate dicatat.

## Risks and Mitigations

Broken cross-links: transform destination relatif sebelum penggantian teks. Artefak desain aktif: snapshot/hash dan perubahan hanya referensi pada Markdown. Duplication: update canonical document, jangan buat laporan sesi baru.

## Rollback or Recovery

Mapping sumber→tujuan tercatat; snapshot teks dan hash disimpan di temporary workspace eksternal sebelum mutasi. Tidak ada operasi delete rekursif.

## Evidence

[Context](repository-context.md); mapping di atas; hasil validation dicatat setelah eksekusi.

## Open Decisions

Tidak ada keputusan yang menghalangi pekerjaan; kategori merupakan pilihan implementasi dokumentasi.

## Validation History

### 2026-10-04

- Result: valid
- Plan base SHA: 68604daf3abe208f7f57c3b72b0a75d4467dfbc6
- Current target SHA: 68604daf3abe208f7f57c3b72b0a75d4467dfbc6
- Checked paths: root instructions, docs, hook/scripts, README dan env sample comments.
- Changed relevant paths: desain existing disnapshot dan dipertahankan.
- Decision: laksanakan reorganisasi dalam scope pengguna.

## Execution Log

- Branch chore/docs-organization dibuat dari 68604daf3abe208f7f57c3b72b0a75d4467dfbc6; konteks ditulis sebelum plan.
- Snapshot konten dan hash file protected disimpan di temporary workspace di luar Git.
- STEP-001 selesai: 18 dokumen dipindahkan, referensi relatif/tekstual diperbarui, indeks diringkas berdasarkan ownership dan anchor storage/HLS yang lama diperbaiki. Sumber pada SHA awal dipertahankan sebagai tautan GitHub immutable pada mapping di atas.
- STEP-002 selesai: root AGENTS mengatur kategori, kebab-case, canonical ownership, context/plan per fitur, status/evidence, maintenance dan validation. Checker, script package, hook, workflow dan template selaras. Skenario smoke terisolasi lulus 10 kasus, termasuk dokumen valid, history URL, root/category/name/folder, index coverage, target/anchor dan repository boundary.
- STEP-003 selesai pada 4 Oktober 2026: `bun run docs:check` lulus 44 Markdown/280 tautan lokal; formatter targeted dan `git diff --check` lulus. `bun install --frozen-lockfile` memeriksa 770 installs/947 packages tanpa perubahan; `bun run check-types` 3 task, `bun run lint` 1 task dan `bun run build` 2 task lulus.
- Preservation lulus: 13 file stylesheet/aset/script/JSON desain protected identik; sequence ID PRD/GR/task pada seluruh 18 dokumen tetap sama; managed block Turborepo tidak berubah. `.env.example` hanya mengubah komentar path; runtime aplikasi/dependency/database/storage tidak berubah.
- Handoff berupa perubahan lokal pada branch baru. Tidak ada commit/push/PR tambahan yang dilakukan untuk pekerjaan ini.

## Tindak lanjut commit per task — 5 Oktober 2026

Pengguna mengotorisasi commit lokal untuk setiap task yang selesai. DOCS-002 diperluas untuk menyelaraskan aturan tersebut pada root AGENTS, workflow dan template. DOCS-001, DOCS-002 dan DOCS-003 akan dibuat sebagai commit terpisah; staging mempertahankan baseline desain yang sudah committed dan mengecualikan perubahan/aset desain lokal existing. Snapshot index tiap commit diperiksa dengan checker dan hook tanpa bypass. SHA aktual dicatat setelah commit; operasi remote tidak diminta.

## Ledger commit task — 5 Oktober 2026

Verifikasi penutupan 5 Oktober 2026: checker worktree lulus 44 Markdown/282 tautan dan smoke terisolasi 10 kasus; snapshot index DOCS-001 lulus 37 Markdown/259 tautan dan DOCS-002 lulus 37/263. Frozen install 770/947 tanpa perubahan serta root build 2 task lulus menggunakan cache valid. Setiap commit menjalankan docs/lint/check-types/Commitlint tanpa bypass. Root source tidak berubah; 13 file desain protected tetap identik.

| Task     | Commit                                   | Evidence                                                                    |
| -------- | ---------------------------------------- | --------------------------------------------------------------------------- |
| DOCS-001 | bbd34602dcdbaca30e51c5ce95668a41c9b3223c | Snapshot index dan hook docs/lint/check-types/Commitlint lulus tanpa bypass |
| DOCS-002 | 29dd9325a2d9a01ae7fa0ae10cd001c1355eada0 | Snapshot index dan hook docs/lint/check-types/Commitlint lulus tanpa bypass |

SHA dicatat sesudah commit berhasil. Push/PR/merge tidak dilakukan. Commit task terakhir dicatat pada pembaruan ledger berikutnya.
