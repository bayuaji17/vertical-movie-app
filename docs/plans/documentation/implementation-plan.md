# Implementation Plan — Documentation Organization

## Plan Metadata

- Status: executing
- Repository: bayuaji17/vertical-movie-app
- Base ref: main
- Base SHA: 68604daf3abe208f7f57c3b72b0a75d4467dfbc6
- Context: [Repository context](repository-context.md)
- Last validated SHA: 68604daf3abe208f7f57c3b72b0a75d4467dfbc6

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

- [ ] Semua dokumen canonical ada di kategori yang tepat dan terindeks.
- [ ] AGENTS.md root memuat aturan konsisten dan path aktif.
- [ ] Seluruh tautan/anchor lokal dan referensi path tervalidasi.
- [ ] Gate docs berjalan dari root dan hook commit.
- [ ] Isi historis/desain existing terjaga; hasil quality gate dicatat.

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

- Branch chore/docs-organization dari 68604daf3abe208f7f57c3b72b0a75d4467dfbc6.
- DOCS-001: 18 dokumen dipindahkan dan incoming/outgoing references serta indeks diselaraskan. Snapshot index diperiksa sebelum commit; perubahan desain lokal tidak termasuk.
- Pengguna mengotorisasi commit lokal per task pada 5 Oktober 2026; task berikutnya menambahkan aturan/checker dan ledger hasil akhir.
