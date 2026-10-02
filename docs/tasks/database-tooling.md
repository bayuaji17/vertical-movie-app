# Modul: Database Tooling

## Tujuan modul

Pengembang dapat memeriksa database development melalui Drizzle Studio dengan konfigurasi milik API.

## User story: DBTOOLS-US-01 — Database browser lokal

Sebagai pengembang, saya ingin membuka schema dan tabel database lokal dari satu command root.

## Task: DBTOOLS-001 — Tambahkan Drizzle Kit Studio

- Status: Done
- Owner: Pengembang/agent pelaksana
- Prioritas: P1
- Referensi: DBTOOLS-US-01, permintaan pengguna 3 Oktober 2026
- Dependensi: Schema dan koneksi database API tersedia
- Ukuran: Konfigurasi CLI development

### Ruang lingkup

Command db:studio pada API dan root. Studio membaca DATABASE_URL dari env API, memakai schema canonical dan bind loopback port4983. Drizzle Kit0.31.11 tidak mendukung Bun SQL untuk Studio; driver postgres ditambahkan hanya sebagai devDependency API. Runtime aplikasi tetap Bun SQL.

### Acceptance criteria

- [x] Command root/API menjalankan Studio dengan env API dan schema yang sama.
- [x] Server lokal aktif dan koneksi/introspeksi PostgreSQL berhasil tanpa migrasi atau perubahan data.
- [x] Tidak ada URL database/secret hardcoded dan server bind127.0.0.1.
- [x] Frozen install, lint, check-types dan build lulus; command didokumentasikan.

### Validasi

Startup Studio, pemeriksaan binding dan request introspeksi read-only. Audit manifest/lockfile serta root quality gates.

### Hasil dan bukti

3 Oktober 2026: command root menjalankan Drizzle Kit0.31.11 melalui Bun, membaca config/env API dan memakai postgres3.4.9. Binding terverifikasi 127.0.0.1:4983. Request Studio init mengembalikan dialect postgresql/driver postgres/schemaFiles1; proxy SELECT information_schema memastikan database vertical_movie_app dengan tabel account, rate_limit, session, user dan verification. Tidak menjalankan migration atau menulis data. Config tanpa DATABASE_URL tetap berhasil dimuat untuk generate. Frozen install tanpa perubahan tambahan; root lint/type/build serta diff check lulus. Lockfile hanya menambah dependency postgres pada API dan satu record paket. Command dan akses UI dijelaskan di README/Environment. Commit: chore(api): add local drizzle studio tooling.

### Blocker atau tindak lanjut

Tidak ada.
