# Modul: Peningkatan logging

> Status: **Backlog** · 11 Oktober 2026 · Pengguna meminta peningkatan log untuk semua bagian, terutama progres worker dan request/response API (11 Oktober 2026). Plan: [implementation-plan](../plans/logging-enhancement/implementation-plan.md), context: [repository-context](../plans/logging-enhancement/repository-context.md). Base SHA `ddcb2b1e8badfa816d798505bc5107113da05061`.

## Tujuan modul

Operator dapat mengikuti request web → API dan setiap job media beserta progresnya dari console, tanpa rahasia dalam log. Referensi: [plan APILOG](../plans/api-request-logging/implementation-plan.md), [panduan API](../guides/api-development.md#logging-request-http).

## User story: LOG-US-01

Sebagai operator, saya ingin melihat request dan response API (termasuk error) dengan ID yang sama di web dan API, sehingga saya dapat menelusuri sumber kegagalan.

## User story: LOG-US-02

Sebagai operator, saya ingin melihat setiap tahap dan progres job media (download, verify, probe, transcode, upload, retry), sehingga saya tahu job berjalan, macet atau gagal dan alasannya.

## User story: LOG-US-03

Sebagai pengembang, saya ingin level dan format log yang dapat dikonfigurasi dan aman dari kebocoran rahasia, sehingga debugging lokal nyaman dan production tetap bersih.

## Task: LOG-001 — Setujui keputusan D1–D5

- Status: Backlog
- Owner: agent
- Prioritas: 1
- Referensi: LOG-US-01/02/03; [plan](../plans/logging-enhancement/implementation-plan.md)
- Diperbarui: 2026-10-11
- Dependensi: tidak ada
- Ukuran: sedang

### Ruang lingkup

Pengguna memutuskan D1 (body opsional dev-only), D2 (level/format), D3 (`x-request-id`), D4 (granularitas progres), D5 (detail error) dan apakah skrip CLI ikut; catat pemberi persetujuan dan tanggal pada plan.

### Acceptance criteria

- [ ] Keputusan dicatat beserta pemberi persetujuan dan tanggal.

### Validasi

`bun run docs:check`, Prettier, `git diff --check`.

### Hasil dan bukti

Belum ada.

### Commit task

- Pesan: `docs(api): ... (LOG-001)`
- SHA: belum dibuat
- Hook/checks: belum dijalankan
- Ledger: dicatat pada update dokumentasi berikutnya

### Blocker atau tindak lanjut

Tidak ada.

## Task: LOG-002 — Modul log bersama dan konfigurasi env

- Status: Backlog
- Owner: agent
- Prioritas: 2
- Referensi: LOG-US-01/02/03; [plan](../plans/logging-enhancement/implementation-plan.md)
- Diperbarui: 2026-10-11
- Dependensi: LOG-001
- Ukuran: sedang

### Ruang lingkup

`apps/api/src/shared/log.ts` (level, format json/pretty, redaksi, sink injeksi, tidak pernah melempar), `config/log-env.ts` untuk `LOG_LEVEL`/`LOG_FORMAT`/`LOG_HTTP_BODIES` (ditolak di production), `.env.example` dan `docs/guides/environment.md`.

### Acceptance criteria

- [ ] Level menyaring event; format json dan pretty memuat field sama.
- [ ] Redaksi menutup kunci sensitif, query, URL bertanda tangan dan rantai error; sink yang gagal tidak melempar.
- [ ] Env tidak valid ditolak dengan pesan jelas; body tidak dapat aktif di production.

### Validasi

`bun test` modul log dan env; `bun run check-types`.

### Hasil dan bukti

Belum ada.

### Commit task

- Pesan: `feat(api): ... (LOG-002)`
- SHA: belum dibuat
- Hook/checks: belum dijalankan
- Ledger: dicatat pada update dokumentasi berikutnya

### Blocker atau tindak lanjut

Tidak ada.

## Task: LOG-003 — Request/response API yang lebih kaya

- Status: Backlog
- Owner: agent
- Prioritas: 3
- Referensi: LOG-US-01/02/03; [plan](../plans/logging-enhancement/implementation-plan.md)
- Diperbarui: 2026-10-11
- Dependensi: LOG-002
- Ukuran: sedang

### Ruang lingkup

Perkaya `plugins/logger.ts`: query tersanitasi, header terpilih, ukuran request/response, `errorCode`, `x-request-id` masuk/keluar, body JSON opsional (D1) terpotong 2 KB dengan pengecualian auth/multipart/URL bertanda tangan.

### Acceptance criteria

- [ ] Semua jalur (200/4xx/5xx/404) menghasilkan pasangan request/response dengan ID sama dan respons tidak berubah.
- [ ] `x-request-id` UUID valid dipakai ulang, selain itu dibuat baru, dan dikembalikan di header respons.
- [ ] Cookie/Authorization tidak pernah muncul; body tidak muncul bila `LOG_HTTP_BODIES` mati atau rute dikecualikan.

### Validasi

Test `app.handle` dengan sink injeksi (termasuk kasus redaksi); `bun test` API.

### Hasil dan bukti

Belum ada.

### Commit task

- Pesan: `feat(api): ... (LOG-003)`
- SHA: belum dibuat
- Hook/checks: belum dijalankan
- Ledger: dicatat pada update dokumentasi berikutnya

### Blocker atau tindak lanjut

Tidak ada.

## Task: LOG-004 — Log error API terstruktur

- Status: Backlog
- Owner: agent
- Prioritas: 4
- Referensi: LOG-US-01/02/03; [plan](../plans/logging-enhancement/implementation-plan.md)
- Diperbarui: 2026-10-11
- Dependensi: LOG-002
- Ukuran: sedang

### Ruang lingkup

Catat 5xx dan `ContentError` pada handler error dengan kode, status, nama/pesan, rantai penyebab terpotong dan stack hanya di development.

### Acceptance criteria

- [ ] Setiap 5xx meninggalkan event `http.error` dengan `requestId`.
- [ ] 4xx yang diharapkan tercatat pada level `warn`/`info` tanpa stack.

### Validasi

Test error handler dengan sink injeksi.

### Hasil dan bukti

Belum ada.

### Commit task

- Pesan: `feat(api): ... (LOG-004)`
- SHA: belum dibuat
- Hook/checks: belum dijalankan
- Ledger: dicatat pada update dokumentasi berikutnya

### Blocker atau tindak lanjut

Tidak ada.

## Task: LOG-005 — Log web dan korelasi request

- Status: Backlog
- Owner: agent
- Prioritas: 5
- Referensi: LOG-US-01/02/03; [plan](../plans/logging-enhancement/implementation-plan.md)
- Diperbarui: 2026-10-11
- Dependensi: LOG-003
- Ukuran: sedang

### Ruang lingkup

Gateway web membuat dan meneruskan `x-request-id`, mencatat `gateway.request` (status, upstream status, durasi, timeout/abort/ukuran) dan `ssr.api_error` untuk kegagalan fetch server-side.

### Acceptance criteria

- [ ] ID yang sama muncul pada log web dan API untuk satu request.
- [ ] Tidak ada cookie/token/body dalam log web.

### Validasi

Test gateway/reader dengan sink injeksi; pemeriksaan manual dev.

### Hasil dan bukti

Belum ada.

### Commit task

- Pesan: `feat(web): ... (LOG-005)`
- SHA: belum dibuat
- Hook/checks: belum dijalankan
- Ledger: dicatat pada update dokumentasi berikutnya

### Blocker atau tindak lanjut

Tidak ada.

## Task: LOG-006 — Log worker: siklus hidup dan tahap job

- Status: Backlog
- Owner: agent
- Prioritas: 6
- Referensi: LOG-US-01/02/03; [plan](../plans/logging-enhancement/implementation-plan.md)
- Diperbarui: 2026-10-11
- Dependensi: LOG-002
- Ukuran: sedang

### Ruang lingkup

`worker.start/stop`, `job.claimed`, `job.stage` (disk_check, load_asset, download, verify, probe, transcode, upload, commit) dengan durasi, `job.completed`, `job.failed` (kode MEDIA_*, terminal/retry, penundaan), `job.paused`, `job.lease_lost`; ganti `console.*` dan `catch {}` yang menelan penyebab.

### Acceptance criteria

- [ ] Satu job menghasilkan urutan tahap lengkap dengan `jobId`/`assetId`/`attempt` pada setiap event.
- [ ] Kegagalan mencatat kode dan penyebab terpotong tanpa path privat/rahasia.

### Validasi

Test runner dengan job palsu; integrasi PostgreSQL/FFmpeg di suite terpisah.

### Hasil dan bukti

Belum ada.

### Commit task

- Pesan: `feat(api): ... (LOG-006)`
- SHA: belum dibuat
- Hook/checks: belum dijalankan
- Ledger: dicatat pada update dokumentasi berikutnya

### Blocker atau tindak lanjut

Tidak ada.

## Task: LOG-007 — Log worker: progres transcode, retry, recovery dan cleanup

- Status: Backlog
- Owner: agent
- Prioritas: 7
- Referensi: LOG-US-01/02/03; [plan](../plans/logging-enhancement/implementation-plan.md)
- Diperbarui: 2026-10-11
- Dependensi: LOG-006
- Ukuran: sedang

### Ruang lingkup

Progres FFmpeg (`-progress`) per 10% durasi atau 15 detik, stderr FFmpeg 4 KB terakhir saat gagal, jadwal retry/backoff, jumlah hasil `queue.recover` dan `cleanup`.

### Acceptance criteria

- [ ] Progres monoton dan tidak lebih sering dari batas; selalu ada event 100% atau gagal.
- [ ] Recovery dan cleanup mencatat jumlah item.

### Validasi

Unit throttle progres; satu job nyata di suite integrasi.

### Hasil dan bukti

Belum ada.

### Commit task

- Pesan: `feat(api): ... (LOG-007)`
- SHA: belum dibuat
- Hook/checks: belum dijalankan
- Ledger: dicatat pada update dokumentasi berikutnya

### Blocker atau tindak lanjut

Tidak ada.

## Task: LOG-008 — Log proses dan pembersihan console.*

- Status: Backlog
- Owner: agent
- Prioritas: 8
- Referensi: LOG-US-01/02/03; [plan](../plans/logging-enhancement/implementation-plan.md)
- Diperbarui: 2026-10-11
- Dependensi: LOG-003, LOG-004, LOG-006
- Ukuran: sedang

### Ruang lingkup

Startup/shutdown API dan worker lewat logger, `uncaughtException`/`unhandledRejection`; `console.*` aplikasi diganti (skrip CLI sesuai keputusan LOG-001).

### Acceptance criteria

- [ ] Tidak ada `console.*` langsung pada kode aplikasi API/web server selain yang diputuskan.
- [ ] Kegagalan start dan kesalahan tak tertangani tercatat dengan level `error`.

### Validasi

`grep` `console.` pada `apps/api/src` dan web server; `bun test`.

### Hasil dan bukti

Belum ada.

### Commit task

- Pesan: `feat(api): ... (LOG-008)`
- SHA: belum dibuat
- Hook/checks: belum dijalankan
- Ledger: dicatat pada update dokumentasi berikutnya

### Blocker atau tindak lanjut

Tidak ada.

## Task: LOG-009 — Dokumentasi, bukti dan penutupan

- Status: Backlog
- Owner: agent
- Prioritas: 9
- Referensi: LOG-US-01/02/03; [plan](../plans/logging-enhancement/implementation-plan.md)
- Diperbarui: 2026-10-11
- Dependensi: LOG-005, LOG-007, LOG-008
- Ukuran: kecil

### Ruang lingkup

Perbarui guide API (field event, contoh `jq`), `environment.md`, runbook media (cara mengikuti job), README docs; bukti job nyata di dev dan batas.

### Acceptance criteria

- [ ] Field event, env dan contoh debugging terdokumentasi.
- [ ] Satu unggahan nyata di dev diikuti dari log (tahap dan progres) dan dicatat.
- [ ] `check-types`, `lint`, `build`, `docs:check` lulus dan dicatat.

### Validasi

Lihat acceptance criteria.

### Hasil dan bukti

Belum ada.

### Commit task

- Pesan: `docs(api): ... (LOG-009)`
- SHA: belum dibuat
- Hook/checks: belum dijalankan
- Ledger: dicatat pada update dokumentasi berikutnya

### Blocker atau tindak lanjut

Tidak ada.
