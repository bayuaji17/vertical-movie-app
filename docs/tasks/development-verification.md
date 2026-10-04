# Modul: Verifikasi penyelesaian dan migrasi development

> Diperbarui 5 Oktober 2026. VERIFY-001 selesai; VERIFY-002 telah lulus validasi lokal dan menunggu commit task.

## Tujuan modul

Menerapkan instruksi pengguna 3 Oktober 2026: sesudah implementasi jalankan test yang tersedia, check-types, lint yang tersedia, build, dan migrasi development jika schema backend berubah. Referensi [Global Workflow](../guides/development-workflow.md), [API Development](../guides/api-development.md), serta [Video Operations](../operations/video-metadata.md).

## User story: VERIFY-US-01

Sebagai pengembang, saya ingin hasil implementasi terverifikasi dan schema development sesuai kode, sehingga fitur siap dicoba tanpa migration pending yang terlewat.

## Task: VERIFY-001 — Terapkan gerbang penyelesaian dan migrasi metadata lokal

- Status: Done
- Owner: Codex
- Prioritas: P1
- Referensi: VERIFY-US-01, instruksi pengguna 3 Oktober 2026
- Dependensi: VID-015
- Ukuran: Satu tindak lanjut operasional dan dokumentasi

### Ruang lingkup

Catat aturan di AGENTS/Global Workflow/API Development. Tinjau target dan migration pending, backup development lokal, apply `0003`–`0005`, lalu verifikasi enam tabel, journal dan preservation data auth. Jalankan test existing yang relevan, root check-types/lint/build. Proof tetap memakai database dedicated. Pertahankan file desain pengguna; satu commit tindak lanjut pada `feat/video-metadata` sesuai otorisasi commit per task.

### Acceptance criteria

- [x] Aturan test/check-types/lint/build serta migrasi schema backend development tercatat.
- [x] Migrasi berhasil pada `vertical_movie_app` localhost:5433; journal 3 menjadi 6 dan enam tabel konten tersedia.
- [x] Backup di luar repo tervalidasi; row user/account/session/verification/rate_limit existing tidak berubah selama migration verification.
- [x] Test available dan gate kualitas lulus; integrasi tidak mereset database development.
- [x] Status operasional dan batas lingkungan diperbarui; file desain dan kredensial tidak masuk commit.

### Validasi

`bun run --cwd apps/api test`, `bun run --cwd packages/auth test`, `bun test apps/web/test`, `content:schema:proof` dan `content:runtime:proof` pada DB test dedicated; `bun run check-types`, `bun run lint`, `bun run build`. Migration `bun run --cwd apps/api db:migrate`; bandingkan journal, tabel/constraints, dan snapshot auth tanpa mencetak isi. Formatter, local link checker, `git diff --check`, review staged paths dan hook commit.

### Hasil dan bukti

Migration berhasil: journal 3 → 6; enam tabel, 28 CHECK, 13 FK, 6 primary key dan 5 UNIQUE metadata tersedia (37 NOT NULL dicatat terpisah oleh PostgreSQL 18). Snapshot kelima tabel auth tetap sama. Backup custom-format `/home/bandev/.local/state/vertical-movie-app/backups/content-before-migration-1791002954806.dump` di luar repo, file mode 600, archive `pg_restore --list` lulus; full restore belum diuji pada tindak lanjut ini. Bun test API 30 pass/120 assertions, package auth 3 pass/14 assertions, web 35 pass/146 assertions, content schema 4 pass/26 assertions dan content runtime/HTTP 15 pass/157 assertions: total 87 pass/463 assertions. Root check-types API/web/auth dan lint web lulus (cache valid); root build API/web lulus dengan dua task dieksekusi. Aturan penyelesaian dan status migrasi tercatat pada panduan repo. Formatter/local link checker/diff check dijalankan sebelum commit.

### Blocker atau tindak lanjut

Tidak ada blocker migrasi. Integrasi S3/media dan gateway/UI bisnis mengikuti roadmap; deployment production belum dijalankan.

## User story: VERIFY-US-02

Sebagai pengembang, saya ingin tooling workspace mengikuti rilis stabil terbaru yang kompatibel, sehingga task development dan quality gate tetap berjalan.

## Task: VERIFY-002 — Update Turborepo ke 2.11.7

- Status: Review
- Owner: Codex
- Prioritas: P1
- Referensi: VERIFY-US-02; permintaan pengguna 5 Oktober 2026; [workflow](../guides/development-workflow.md).
- Diperbarui: 2026-10-05
- Dependensi: Tidak ada
- Ukuran: Satu upgrade patch dependency root dan lockfile.

### Ruang lingkup

Snapshot sebelum implementasi: `7c943981ee96a8c94f4ed15960042e5a927e51c1` pada `chore/docs-organization`. Root memakai `turbo ^2.11.5`, lockfile/binary 2.11.5, Bun 1.4.2; workspace API/web/auth dan konfigurasi `turbo.json` telah diperiksa. Skill `turborepo` serta bundled docs 2.11.5 (`docs/README.md`, upgrading dan referensi run) dibaca sebelum perubahan.

Pengguna mengotorisasi update ke versi terbaru. Registry npm `dist-tags.latest` pada 5 Oktober 2026 menunjukkan 2.11.7, diterbitkan 2 Oktober 2026. [Rilis 2.11.6](https://github.com/vercel/turborepo/releases/tag/v2.11.6) dan [2.11.7](https://github.com/vercel/turborepo/releases/tag/v2.11.7) diperiksa; tidak mencantumkan migration wajib untuk upgrade patch ini. Pertahankan pola caret dependency dan konfigurasi task bila valid; jangan mengubah dependency lain atau pekerjaan desain lokal.

### Acceptance criteria

- [x] Root dependency dan seluruh paket platform Turbo di lockfile memakai 2.11.7; dependency lainnya tidak berubah.
- [x] Frozen install, binary version dan dry-run task dev API/web berhasil dengan konfigurasi existing.
- [x] Test API/auth/web, check-types, lint, build, docs:check, formatter dan whitespace check lulus.
- [ ] Commit lokal VERIFY-002 dibuat dengan hook normal dan hanya perubahan task.

### Validasi

Update memakai `bun add --dev 'turbo@^2.11.7'`; baca kembali bundled docs versi baru. Jalankan `bun install --frozen-lockfile`, binary lokal `--version`, `bun run dev --dry=json`, test existing API/auth/web, `bun run check-types`, `bun run lint`, `bun run build`, `bun run docs:check`, targeted Prettier dan `git diff --check`.

### Hasil dan bukti

5 Oktober 2026: `bun add --dev 'turbo@^2.11.7'` berhasil. Review lockfile membuktikan hanya Turbo dan enam paket platform `@turbo/*` berubah; pola caret dipertahankan. `bun install --frozen-lockfile` lulus (770 installs/947 packages, tanpa perubahan). Binary lokal melaporkan 2.11.7. Bundled docs 2.11.7 dibaca kembali, termasuk README, running tasks dan referensi run/configuration; `turbo.json` tetap kompatibel.

`bun run dev --dry=json` lulus: `api#dev` dan `web#dev` memakai command existing, persistent dan tanpa cache. Dry-run memeriksa graph/configuration development; bukan bukti server development atau browser live. Tidak ada perubahan schema, sehingga task ini tidak memerlukan migrasi database.

`bun test apps/api/src packages/auth/src apps/web/test`: 112 pass, 0 fail, 438 assertions dalam 27 file. `bun run check-types --force`: 3 task lulus; `bun run lint --force`: 1 task web lulus; `bun run build --force`: 2 task API/web lulus. Ketiga gate menjalankan ulang task tanpa cache. Build web menampilkan warning bundler tentang module directive dan ukuran chunk, tetapi berhasil.

`bun run docs:check`: 44 Markdown/319 local links lulus. Pemeriksaan snapshot scoped index: 37 Markdown/300 local links, tanpa error. Targeted Prettier dan `git diff --check` (worktree/index) lulus. Snapshot hash membuktikan 23 file existing tidak berubah sebelum index mendapat update task; perubahan desain pada index lokal tetap dipertahankan dan dikecualikan dari staging. Staged paths hanya `package.json`, `bun.lock`, indeks dokumentasi dan backlog ini; root AGENTS dan konfigurasi Turbo tidak berubah.

### Commit task

- Pesan: `chore(deps): update turborepo to 2.11.7 (VERIFY-002)`
- SHA: Belum dibuat.
- Hook/checks: Belum dijalankan.
- Ledger: SHA aktual dicatat setelah commit, untuk pembaruan dokumentasi berikutnya.

### Blocker atau tindak lanjut

Tidak ada blocker pada review awal.
