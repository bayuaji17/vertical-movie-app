# Repository Context — Documentation

## Snapshot

- Repository: bayuaji17/vertical-movie-app
- Base ref: main
- Base SHA: 68604daf3abe208f7f57c3b72b0a75d4467dfbc6
- Analyzed at: 2026-10-04
- Context status: current

## Product and Users

Aplikasi video vertikal dengan admin tunggal dan penonton publik. Tujuan pekerjaan ini adalah dokumentasi yang konsisten untuk development.

## Repository Map

apps/api memiliki Elysia/Drizzle/storage/worker; apps/web memiliki TanStack Start/player; packages/auth memiliki Better Auth. docs berisi spesifikasi, panduan, runbook, plan, backlog dan desain. AGENTS.md mengatur proses repo; README.md root merupakan quick start. .agents/.commandcode dan skills-lock.json mengelola skill; .husky/commitlint menjaga quality gate; turbo.json mengatur task workspace.

## Architecture and Boundaries

Dokumentasi proyek dipusatkan pada docs dan instruksi agent pada AGENTS.md root. Struktur saat ini mempunyai 18 dokumen uppercase pada root docs selain indeks; context/plan auth dan video bercampur dengan referensi aktif. Tidak ada AGENTS.md turunan.

## Runtime and Data Flow

Bun/Turbo menjalankan API, web dan worker terpisah. Path dokumentasi bukan dependency runtime. .env.example dan README root menautkan dokumentasi sehingga ikut terdampak pemindahan.

## Domain and Data Model

Metadata/media/publication tidak berubah. ID PRD, GR, task dan keputusan pengguna harus dipertahankan.

## External Integrations

PostgreSQL, MinIO/R2 dan browser bukan target perubahan. Tidak membaca kredensial atau mengoperasikan database/storage.

## Development, Testing, and Delivery

Root memiliki Bun/Prettier, lint, check-types, build dan Husky. Belum ada docs:check. Request mengotorisasi branch baru dan perubahan dokumentasi/aturan; tidak meminta Git delivery tambahan pada pekerjaan ini.

## Constraints and Conventions

Branch chore/docs-organization berasal dari SHA snapshot. Stylesheet, konten design system dan artefak desain existing harus dipertahankan; pemindahan dokumen boleh memperbarui referensi path. Tidak mengedit managed Turborepo block atau installed skills.

## Relevant Active Work

Media sudah merge pada PR3. Worktree desain existing mencakup stylesheet, DESIGN_SYSTEM, bagian README, tasks/design-system serta artefak docs/design.

## Exploration Coverage

Diperiksa: tree Git, seluruh daftar docs, root AGENTS/README/package/Husky, workflow/template, tautan silang dan script desain. Runtime apps tidak dianalisis ulang karena hanya komentar env sample/link dokumentasi yang berubah. Installed/vendor docs dikecualikan.

## Unknowns and Assumptions

Taksonomi dipilih berdasarkan fungsi; plans menyimpan konteks/riwayat per fitur, bukan spesifikasi aktif. Tidak menghapus evidence historis atau memindahkan aset desain.

## Evidence Index

Path dalam teks menunjuk lokasi dokumen sesudah reorganisasi pada worktree. Sumber file pada base SHA dapat diperiksa melalui tautan immutable pada [mapping plan](implementation-plan.md#affected-files-and-symbols); struktur baru belum berada pada base commit tersebut.

Baseline analisis adalah SHA 68604daf3abe208f7f57c3b72b0a75d4467dfbc6, dengan perubahan worktree desain dibedakan: AGENTS.md (ownership/gates), docs/README.md (indeks semula), workflow/template (status/AC/evidence), package.json dan .husky/pre-commit (task/hook), README.md/.env.example (reverse links), docs/design/build-design-system.mjs dan export-design-system.mjs (aset tetap).

## Hasil verifikasi reorganisasi — 4 Oktober 2026

Branch `chore/docs-organization` tetap pada base SHA; 18 dokumen dipindahkan tanpa mengubah ID keputusan/task. Struktur kini memiliki kategori dan indeks canonical, root documentation rules serta gate `docs:check` pada package/hook. Verifikasi lulus: 44 Markdown/280 tautan, 10 smoke cases, frozen install, check-types, lint, build, formatter dan whitespace. 13 file protected dan managed block agent tetap identik. Evidence rinci berada pada [execution log](implementation-plan.md#execution-log); tidak ada Git delivery atau rollout tambahan.

## Otorisasi commit per task — 5 Oktober 2026

Pengguna menambahkan aturan commit lokal setelah setiap task selesai. Keputusan ini berlaku pada pekerjaan berikutnya dan tiga task dokumentasi yang telah selesai tetapi belum di-commit. Branch tetap `chore/docs-organization`; pre-write HEAD `68604daf3abe208f7f57c3b72b0a75d4467dfbc6`. Dokumen/stylesheet/aset desain existing dipertahankan sebagai perubahan lokal terpisah; index commit memakai baseline desain yang sudah berada di Git dengan path baru. Commit task tidak mengotorisasi push/PR/merge atau rollout.

## Ledger commit task — 5 Oktober 2026

| Task     | Commit                                   | Evidence                                                                    |
| -------- | ---------------------------------------- | --------------------------------------------------------------------------- |
| DOCS-001 | bbd34602dcdbaca30e51c5ce95668a41c9b3223c | Snapshot index dan hook docs/lint/check-types/Commitlint lulus tanpa bypass |

SHA dicatat sesudah commit berhasil. Push/PR/merge tidak dilakukan. Commit task terakhir dicatat pada pembaruan ledger berikutnya.
