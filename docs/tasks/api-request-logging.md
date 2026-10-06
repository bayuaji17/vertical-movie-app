# Modul: API Request Logging

## Tujuan modul

Operator dapat melihat setiap request yang mencapai API dan hasilnya pada console server memakai `console.log`, tanpa library logging. Plan disetujui pengguna 7 Oktober 2026; implementasi bertahap pada branch `feat/api-request-logging`.

Acuan: [plan](../plans/api-request-logging/implementation-plan.md), [context](../plans/api-request-logging/repository-context.md), [API Development](../guides/api-development.md), [workflow](../guides/development-workflow.md) dan [Architecture](../architecture/overview.md). Ini kebutuhan operasional langsung dari pengguna; tidak mengklaim requirement produk PRD baru.

## User story: APILOG-STORY-001

Sebagai operator server, saya ingin melihat request API saat masuk dan setelah selesai, sehingga saya dapat memastikan hit mencapai API dan mengetahui status serta durasinya.

## Task: APILOG-001 — Plugin logging console

- Status: Done
- Owner: Codex/pengembang API
- Prioritas: 1
- Referensi: APILOG-STORY-001; APILOG-001 pada plan canonical
- Diperbarui: 2026-10-07
- Dependensi: scope disetujui dan freshness valid pada HEAD `1afa736`
- Ukuran: kecil, satu plugin dan behavior tests

### Ruang lingkup

Buat `apps/api/src/plugins/logger.ts` dan test beside module. Event masuk/completion memakai native console, field allowlist, ID internal dan clock monotonic. State request per instance; logger tidak mengubah HTTP atau mengambil payload. Detail format/lifecycle mengikuti plan canonical.

### Acceptance criteria

- [x] Event masuk langsung terlihat sebelum handler lambat selesai.
- [x] Completion tunggal dengan status aktual dan durasi nonnegatif untuk matriks lifecycle plan.
- [x] ID/state request paralel dan instance terisolasi.
- [x] Tidak mencetak credential/payload/query/raw error; event tetap satu baris.
- [x] Sink failure tidak mengubah HTTP; tests dan quality gates lulus.

### Validasi

`bun test ./apps/api/src/plugins/logger.test.ts`, root check-types/lint/build, docs:check dan diff check sebelum commit. Test app.handle tanpa port memakai sink/clock fake dan menunggu completion asynchronous.

### Hasil dan bukti

7 Oktober 2026: plugin dan tests dibuat; focused `bun test ./apps/api/src/plugins/logger.test.ts` lulus 6 tests/61 assertions. Matriks meliputi raw/custom/set/override status, guard early return, 404, handled/unhandled/parse/validation errors, nested plugin, Promise handler, concurrency/app isolation, body/response streams, encoded/truncated path dan sink failure synchronous/asynchronous. Root bun run check-types (3 tasks), bun run lint (web) dan bun run build (API/web) lulus; Prettier, bun run docs:check (62 Markdown/552 links) dan git diff --check lulus. Commit task dilakukan setelah review diff.

### Commit task

- Pesan rencana: `feat(api): add console request logger (APILOG-001)`
- SHA: `d4a45de45c61ab5b219b922f94d4a9dafd3c0651`
- Hook/checks: docs:check, lint web, check-types tiga workspace dan Commitlint lulus pada commit
- Ledger: dicatat pada update APILOG-002

### Blocker atau tindak lanjut

Scope telah disetujui pengguna; lanjut APILOG-002 setelah criteria/checks dan commit lulus.

## Task: APILOG-002 — Logging seluruh komposisi API

- Status: Done
- Owner: Codex/pengembang API
- Prioritas: 2
- Referensi: APILOG-STORY-001; APILOG-002 pada plan canonical
- Diperbarui: 2026-10-07
- Dependensi: APILOG-001
- Ukuran: kecil, integrasi factory dan regression tests

### Ruang lingkup

Pasang logger paling awal pada chaining `createApp`, dengan dependency output test opsional. Pertahankan return type inferred dan existing response/guard/error mapper. Perluas `apps/api/src/app.test.ts` untuk komposisi root/auth/admin/public/OpenAPI/404.

### Acceptance criteria

- [x] Semua request yang mencapai factory tercatat tanpa filter/sampling.
- [x] Auth Response, admin early rejection, validation/error dan unknown route mencetak status aktual.
- [x] Header/body/cache/security/OpenAPI existing dan inferensi Eden tetap lulus.
- [x] Tidak ada completion ganda atau state campur antar-request/app.
- [x] Suite API dan root quality gates lulus.

### Validasi

Focused logger/app tests, `bun run --cwd apps/api test`, root check-types/lint/build, docs:check/diff check dan hook sebelum commit.

### Hasil dan bukti

7 Oktober 2026: factory memasang logger sebelum seluruh route dan menerima `requestLogger` dependency untuk test. Focused app/logger suite lulus 11 tests/215 assertions, mencakup 13 request route-family dan guard 403/503. Header cookie auth, private/public cache dan payload tetap diperiksa. Integrasi menemukan edge case Elysia 1.4.30: komposisi dengan error-hook array kosong melewatkan afterResponse pada unmatched route. Plugin menambahkan global onError observer tanpa return untuk menjaga jalur default dan memicu completion; regression `/unknown` kini lulus tanpa log ganda. bun run --cwd apps/api test lulus 109 tests/562 assertions pada 24 files; bun run check-types (3 tasks), bun run lint (web), bun run build (API/web), docs:check (62 Markdown/552 links), Prettier dan git diff --check lulus.

### Commit task

- Pesan rencana: `feat(api): log requests across app routes (APILOG-002)`
- SHA: `17fc66f622a9296c973bb1d5470e96ccc7471b2f`
- Hook/checks: docs:check, lint web, check-types tiga workspace dan Commitlint lulus
- Ledger: dicatat pada update APILOG-003

### Blocker atau tindak lanjut

APILOG-001; lanjut APILOG-003 setelah criteria/checks dan commit lulus.

## Task: APILOG-003 — Panduan dan verifikasi output server

- Status: Review
- Owner: Codex/pengembang API
- Prioritas: 3
- Referensi: APILOG-STORY-001; APILOG-003 pada plan canonical
- Diperbarui: 2026-10-07
- Dependensi: APILOG-002
- Ukuran: kecil, panduan dan bukti akhir

### Ruang lingkup

Update API guide, indeks, plan/backlog dengan logging aktif, contoh/cara melihat console, batas gateway/storage/durasi dan evidence nyata. Demo hanya read-only root/unknown route pada server lokal development dan build/start existing.

### Acceptance criteria

- [x] Start/completion nyata terlihat pada stdout development dan hasil build/start.
- [x] Format, status/durasi, scope dan batas traffic dijelaskan dalam API guide.
- [x] Native API tests, root check-types/lint/build, format/docs:check/diff check lulus dan dicatat.
- [x] Commit per task beserta SHA yang sudah tersedia dicatat tanpa self-reference.
- [x] Tidak ada dependency/env/schema atau perubahan unrelated dalam commit.

### Validasi

`bun run dev --filter=api`, read-only request lokal; build lalu `bun run --cwd apps/api start` pada port tersedia. Jalankan `bun run --cwd apps/api test`, `bun run check-types`, `bun run lint`, `bun run build`, `bun run docs:check`, Prettier changed Markdown dan `git diff --check`. Jangan mengklaim production proof dari demo lokal.

### Hasil dan bukti

7 Oktober 2026: API guide/index diperbarui. `bun .turbo/request-logging-smoke.mjs` menjalankan root `bun run dev --filter=api` dan start hasil build dari `apps/api` pada port ephemeral, secara berurutan. Keduanya lulus: GET `/` 200 dan `/logging-smoke-missing` 404, tepat 2 start + 2 completion, ID/path/status sesuai, durasi nonnegatif dan query sentinel tidak tercetak. Subprocess demo dihentikan; harness/output ignored pada `.turbo`, tidak masuk commit. Source sama dengan APILOG-002 yang telah lulus 109 API tests/562 assertions, root check-types/lint/build. Final Prettier, bun run docs:check (62 Markdown/555 links) dan git diff --check lulus; hook diperiksa saat commit dokumentasi. Tidak ada perubahan dependency/env/schema atau migrasi; production deployment belum diuji.

### Commit task

- Pesan rencana: `docs(api): document verified request logging (APILOG-003)`
- SHA: belum dibuat
- Hook/checks: format/docs/diff lulus; code gates APILOG-002 pada source yang sama lulus; hasil hook dicatat setelah commit
- Ledger: SHA terakhir dicatat pada update dokumentasi berikutnya; jangan menebak SHA commit sendiri

### Blocker atau tindak lanjut

APILOG-002. Push/PR/merge/deploy di luar otorisasi plan.
