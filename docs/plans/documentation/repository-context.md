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

## Delivery bertahap — 5 Oktober 2026

Pengguna mengotorisasi commit lokal per task. Snapshot ini menyediakan struktur dan referensi DOCS-001; implementasi aturan/checker serta evidence penutupan diserahkan pada commit task berikutnya. Aset dan perubahan desain existing tetap terpisah.
