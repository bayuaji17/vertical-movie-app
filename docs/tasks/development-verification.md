# Modul: Verifikasi penyelesaian dan migrasi development

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
