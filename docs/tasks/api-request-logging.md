# Modul: API Request Logging

## Tujuan modul

Operator dapat melihat setiap request yang mencapai API dan hasilnya pada console server memakai `console.log`, tanpa library logging. Status 6 Oktober 2026: proposed, menunggu persetujuan plan oleh pengguna; belum ada implementasi/evidence runtime.

Acuan: [plan](../plans/api-request-logging/implementation-plan.md), [context](../plans/api-request-logging/repository-context.md), [API Development](../guides/api-development.md), [workflow](../guides/development-workflow.md) dan [Architecture](../architecture/overview.md). Ini kebutuhan operasional langsung dari pengguna; tidak mengklaim requirement produk PRD baru.

## User story: APILOG-STORY-001

Sebagai operator server, saya ingin melihat request API saat masuk dan setelah selesai, sehingga saya dapat memastikan hit mencapai API dan mengetahui status serta durasinya.

## Task: APILOG-001 — Plugin logging console

- Status: Backlog
- Owner: Codex/pengembang API
- Prioritas: 1
- Referensi: APILOG-STORY-001; APILOG-001 pada plan canonical
- Diperbarui: 2026-10-06
- Dependensi: persetujuan scope plan dan pemeriksaan freshness
- Ukuran: kecil, satu plugin dan behavior tests

### Ruang lingkup

Buat `apps/api/src/plugins/logger.ts` dan test beside module. Event masuk/completion memakai native console, field allowlist, ID internal dan clock monotonic. State request per instance; logger tidak mengubah HTTP atau mengambil payload. Detail format/lifecycle mengikuti plan canonical.

### Acceptance criteria

- [ ] Event masuk langsung terlihat sebelum handler lambat selesai.
- [ ] Completion tunggal dengan status aktual dan durasi nonnegatif untuk matriks lifecycle plan.
- [ ] ID/state request paralel dan instance terisolasi.
- [ ] Tidak mencetak credential/payload/query/raw error; event tetap satu baris.
- [ ] Sink failure tidak mengubah HTTP; tests dan quality gates lulus.

### Validasi

`bun test ./apps/api/src/plugins/logger.test.ts`, root check-types/lint/build, docs:check dan diff check sebelum commit. Test app.handle tanpa port memakai sink/clock fake dan menunggu completion asynchronous.

### Hasil dan bukti

Belum dikerjakan; belum ada test/check implementasi yang dijalankan.

### Commit task

- Pesan rencana: `feat(api): add console request logger (APILOG-001)`
- SHA: belum dibuat
- Hook/checks: belum dijalankan untuk implementasi
- Ledger: catat SHA aktual pada update task berikutnya

### Blocker atau tindak lanjut

Menunggu persetujuan proposal; lanjut APILOG-002 setelah criteria/checks dan commit lulus.

## Task: APILOG-002 — Logging seluruh komposisi API

- Status: Backlog
- Owner: Codex/pengembang API
- Prioritas: 2
- Referensi: APILOG-STORY-001; APILOG-002 pada plan canonical
- Diperbarui: 2026-10-06
- Dependensi: APILOG-001
- Ukuran: kecil, integrasi factory dan regression tests

### Ruang lingkup

Pasang logger paling awal pada chaining `createApp`, dengan dependency output test opsional. Pertahankan return type inferred dan existing response/guard/error mapper. Perluas `apps/api/src/app.test.ts` untuk komposisi root/auth/admin/public/OpenAPI/404.

### Acceptance criteria

- [ ] Semua request yang mencapai factory tercatat tanpa filter/sampling.
- [ ] Auth Response, admin early rejection, validation/error dan unknown route mencetak status aktual.
- [ ] Header/body/cache/security/OpenAPI existing dan inferensi Eden tetap lulus.
- [ ] Tidak ada completion ganda atau state campur antar-request/app.
- [ ] Suite API dan root quality gates lulus.

### Validasi

Focused logger/app tests, `bun run --cwd apps/api test`, root check-types/lint/build, docs:check/diff check dan hook sebelum commit.

### Hasil dan bukti

Belum dikerjakan; runtime belum berubah.

### Commit task

- Pesan rencana: `feat(api): log requests across app routes (APILOG-002)`
- SHA: belum dibuat
- Hook/checks: belum dijalankan untuk implementasi
- Ledger: catat SHA aktual pada update task berikutnya

### Blocker atau tindak lanjut

APILOG-001; lanjut APILOG-003 setelah criteria/checks dan commit lulus.

## Task: APILOG-003 — Panduan dan verifikasi output server

- Status: Backlog
- Owner: Codex/pengembang API
- Prioritas: 3
- Referensi: APILOG-STORY-001; APILOG-003 pada plan canonical
- Diperbarui: 2026-10-06
- Dependensi: APILOG-002
- Ukuran: kecil, panduan dan bukti akhir

### Ruang lingkup

Update API guide, indeks, plan/backlog dengan logging aktif, contoh/cara melihat console, batas gateway/storage/durasi dan evidence nyata. Demo hanya read-only root/unknown route pada server lokal development dan build/start existing.

### Acceptance criteria

- [ ] Start/completion nyata terlihat pada stdout development dan hasil build/start.
- [ ] Format, status/durasi, scope dan batas traffic dijelaskan dalam API guide.
- [ ] Native API tests, root check-types/lint/build, format/docs:check/diff check lulus dan dicatat.
- [ ] Commit per task beserta SHA yang sudah tersedia dicatat tanpa self-reference.
- [ ] Tidak ada dependency/env/schema atau perubahan unrelated dalam commit.

### Validasi

`bun run dev --filter=api`, read-only request lokal; build lalu `bun run --cwd apps/api start` pada port tersedia. Jalankan `bun run --cwd apps/api test`, `bun run check-types`, `bun run lint`, `bun run build`, `bun run docs:check`, Prettier changed Markdown dan `git diff --check`. Jangan mengklaim production proof dari demo lokal.

### Hasil dan bukti

Belum dikerjakan. Checks plan-only tidak membuktikan runtime logger.

### Commit task

- Pesan rencana: `docs(api): document verified request logging (APILOG-003)`
- SHA: belum dibuat
- Hook/checks: belum dijalankan untuk implementasi
- Ledger: SHA terakhir dicatat pada update dokumentasi berikutnya; jangan menebak SHA commit sendiri

### Blocker atau tindak lanjut

APILOG-002. Push/PR/merge/deploy di luar otorisasi plan.
