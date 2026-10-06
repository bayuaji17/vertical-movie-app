# Implementation Plan: logging request API dengan console

## Plan Metadata

- Status: completed; APILOG-001–003 Done, implemented/verified lokal 7 Oktober 2026.
- Tanggal: 7 Oktober 2026; proposal awal 6 Oktober 2026.
- Repository: `bayuaji17/vertical-movie-app`.
- Base ref: `main`.
- Base SHA: `4f3c9141017ac85e5e999e3ce72b66c6d45aea30`.
- Context: [repository-context.md](repository-context.md).
- Last validated SHA: `17fc66f622a9296c973bb1d5470e96ccc7471b2f`.
- Otorisasi: pengguna menyetujui plan melalui "oke approve" pada 7 Oktober 2026; mencakup implementasi dan local task commits sesuai workflow. Push/PR/merge/deploy belum diotorisasi.

## Objective

Setiap request HTTP yang mencapai `apps/api` terlihat pada console server saat masuk dan setelah selesai, lengkap dengan method, path, status dan durasi, tanpa library logging.

## Goals and Non-goals

Tujuan: satu plugin logger Elysia, default aktif di development/production, seluruh route termasuk auth/OpenAPI/404 tercakup, output satu baris per event dan request bersamaan dapat dikorelasikan. Tidak ada sampling atau pengecualian health/OpenAPI pada tahap ini.

Di luar scope: library logger, file log/rotation, collector/dashboard/analytics, SQL/job logging, perubahan worker, browser logging, IP/user identity, payload/stack trace dan perubahan kontrak response. Tidak menambah env, dependency, script, tabel atau migrasi. Penyatuan ID error DTO dan header lintas gateway merupakan pekerjaan terpisah bila dibutuhkan.

## Current Behavior

Baseline analisis 6 Oktober 2026: API mencetak startup/shutdown tetapi belum memiliki access logger. `createApp` menyusun root, auth, modul bisnis/publik/playback dan OpenAPI. Error mapper serta guard mengembalikan beragam status; native auth mengembalikan `Response`. Web gateway menghapus prefix `/api` untuk bisnis. Bukti baseline berada pada [context](repository-context.md#evidence-index). Setelah APILOG-002, seluruh factory memiliki logging aktif; perilaku saat ini dijelaskan pada [API guide](../../guides/api-development.md#logging-request-http).

## Desired Behavior

Gunakan `console.log(JSON.stringify(record))` dengan field allowlist, tanpa warna ANSI atau output multiline. Dua event memakai ID internal yang sama:

```json
{"timestamp":"2026-10-06T14:45:00.000Z","event":"http.request","requestId":"server-generated-uuid","method":"GET","path":"/admin/videos"}
{"timestamp":"2026-10-06T14:45:00.018Z","event":"http.response","requestId":"server-generated-uuid","method":"GET","path":"/admin/videos","status":200,"durationMs":18}
```

- `timestamp`: ISO 8601 UTC dari clock; `durationMs`: clock monotonic `performance.now()`, angka nonnegatif, dibulatkan maksimal dua desimal.
- `requestId`: UUID dibuat server khusus korelasi log; tidak mengambil header client dan tidak mengubah DTO/header response.
- `method` dan `path`: method HTTP dan URL pathname API; query/hash tidak dicetak dan pathname tetap encoded, dibatasi panjangnya 512 karakter. JSON serialization meng-escape control character agar event tetap satu baris.
- `status`: status response aktual; pertimbangkan `Response.status`, custom status Elysia dan `set.status`, termasuk error serta early return. Urutan pemilihan dibuktikan pada versi terpasang.
- Semua event memakai `console.log`, termasuk 4xx/5xx; status menjadi penanda kegagalan. Tidak mencetak raw error, message/cause, body, response payload, header, cookie, password, token, signed URL atau IP.
- Request yang belum selesai tetap memiliki `http.request`. Bila proses mati sebelum completion, `http.response` dapat tidak ada; plan tidak menjanjikan durable logging.

## Impact Analysis

Logger dipasang di awal chaining `createApp`, sebelum root/modul/auth/OpenAPI, dengan lifecycle global. Injeksi dependency terbatas output dan clock memudahkan test; default tetap native console/waktu. State request disimpan pada `WeakMap<Request, ...>` milik instance plugin supaya tidak bercampur antar-request/factory; hapus setelah completion.

`onRequest` mencatat event masuk dan metadata. `onAfterResponse` menjadi titik completion sesuai [dokumentasi lifecycle resmi](https://elysiajs.com/essential/life-cycle#after-response). Handler logging mengembalikan `undefined`, tidak mengubah status/header/body dan tidak menggantikan error mapper. Global `onError` observer tanpa return diperlukan untuk coverage unmatched route pada komposisi Elysia 1.4.30; tidak mencetak log tambahan. WeakMap state dihapus saat completion sehingga satu request tidak mendapat completion ganda. Bila responseValue masih Promise, logger menunggu settlement tanpa membaca payload/stream.

Factory output tidak boleh diberi return type `Elysia` umum. Body/stream auth/upload/playback tidak dibaca, di-clone atau ditunggu untuk memperoleh payload. Error dari sink logging tidak boleh menggagalkan request atau menghasilkan unhandled rejection.

Batas traffic: rejection di web gateway dan transfer direct MinIO/R2 tidak muncul pada log API. Path bisnis yang tampil adalah path upstream, misalnya `/admin/videos`. Durasi completion tidak membuktikan waktu transfer client/storage.

## Affected Files and Symbols

| Path                                                    | Action | Symbols                           | Reason                                                          | Evidence                                   |
| ------------------------------------------------------- | ------ | --------------------------------- | --------------------------------------------------------------- | ------------------------------------------ |
| `apps/api/src/plugins/logger.ts`                        | create | `createRequestLogger`             | Plugin bernama, metadata, formatting dan lifecycle console.     | Lokasi logger direncanakan pada API guide. |
| `apps/api/src/plugins/logger.test.ts`                   | create | HTTP behavior tests               | Status/coverage, isolation, redaksi dan sink failure.           | Pola `bun:test` pada app/module tests.     |
| `apps/api/src/app.ts`                                   | modify | `AppDependencies`, `createApp`    | Pasang logger awal dan dependency test opsional.                | Factory static existing.                   |
| `apps/api/src/app.test.ts`                              | modify | Test komposisi app                | Buktikan root/auth/admin/public/OpenAPI/404 pada factory nyata. | Test factory existing.                     |
| `docs/guides/api-development.md`                        | modify | Logging request                   | Dokumentasikan perilaku aktif setelah implementasi.             | Placeholder logger dan panduan lifecycle.  |
| `docs/plans/api-request-logging/implementation-plan.md` | modify | Status, validation, execution log | Catat hasil/check/commit aktual.                                | Plan ini.                                  |
| `docs/tasks/api-request-logging.md`                     | modify | APILOG-001–003                    | Backlog dan evidence canonical.                                 | Template task.                             |
| `docs/README.md`                                        | modify | Fitur/backlog logging             | Status/navigation canonical.                                    | Index docs.                                |

`index.ts`, gateway web, auth package, error mapper, schema, env dan manifests tidak perlu berubah untuk rancangan ini.

## Implementation DAG

```text
APILOG-001: plugin + behavior tests
    -> APILOG-002: komposisi createApp + regression tests
        -> APILOG-003: panduan + quality gates + demo lokal
```

## Implementation Steps

### APILOG-001 — Plugin console dengan metadata request

- Outcome: plugin yang mencetak satu event masuk dan satu event completion pada Elysia test app.
- Depends on: none setelah scope disetujui dan freshness diperiksa.
- Files: `apps/api/src/plugins/logger.ts`, `apps/api/src/plugins/logger.test.ts` serta ledger plan/backlog.
- Symbols: `createRequestLogger`, dependency output/waktu, emitter completion.
- Requirements: schema output di atas; plugin bernama/global; default console; state request isolated; hook tidak mengubah response atau membaca payload; sink failure tidak memengaruhi HTTP.
- Validation: `bun test ./apps/api/src/plugins/logger.test.ts`, quality gates implementasi dan hooks sebelum commit.
- Acceptance criteria: event start terlihat sebelum handler lambat selesai; status 200/201/204/302/401/403/404/409/422/500/503 benar; raw Response dan custom status teruji; setiap request yang selesai mendapat satu completion; data sensitif tidak masuk output.

### APILOG-002 — Integrasikan pada seluruh factory API

- Outcome: logging aktif pada komposisi aplikasi nyata tanpa perubahan kontrak API/Eden.
- Depends on: APILOG-001.
- Files: `apps/api/src/app.ts`, `apps/api/src/app.test.ts` serta ledger plan/backlog.
- Symbols: `AppDependencies`, `createApp`.
- Requirements: `.use(createRequestLogger(...))` sebelum root/module/OpenAPI; output test diinjeksikan, default runtime console. Auth Response dan error scoped tetap memiliki status/header/body semula.
- Validation: `bun test ./apps/api/src/app.test.ts ./apps/api/src/plugins/logger.test.ts`, `bun run --cwd apps/api test`, root quality gates dan hooks sebelum commit.
- Acceptance criteria: root, auth success/rejection, admin early rejection, validation/handled domain error, katalog/playback, OpenAPI dan unknown route terlihat; response/cache/security/OpenAPI/inferensi existing tetap lulus; request bersamaan dan dua instance app tidak bercampur.

### APILOG-003 — Dokumentasikan penggunaan dan buktikan hasil

- Outcome: guide aktif dan evidence lokal lengkap, status plan/backlog mencerminkan hasil nyata.
- Depends on: APILOG-002.
- Files: `docs/guides/api-development.md`, indeks, plan dan backlog logging.
- Symbols: bagian logging dan evidence/commit ledger.
- Requirements: format dan event didokumentasikan, cara melihat terminal API lewat `bun run dev --filter=api` atau `bun run --cwd apps/api start`, batas gateway/storage dan durasi dijelaskan; catat seluruh commit task yang sudah tersedia.
- Validation: Prettier, `bun run docs:check`, `git diff --check`, API tests, `bun run check-types`, `bun run lint`, `bun run build`. Demo port lokal memakai konfigurasi existing hanya membaca root/unknown route; verifikasi stdout runtime development dan build/start.
- Acceptance criteria: dua event nyata terlihat, status/durasi/correlation sesuai; semua gate lulus; tidak ada dependency/env/schema baru atau perubahan unrelated dalam commit.

## Test Requirements

1. Start langsung keluar sebelum deferred handler diselesaikan; completion hanya sesudah handler selesai.
2. Plain result, `set.status`, Elysia custom status, Web Standard `Response` (redirect/no-content), early guard return, validation, error domain handled, error 500 dan 404 tanpa route.
3. Scope lintas nested plugins, factory nyata dan OpenAPI; tidak ada completion ganda pada error.
4. Request paralel dengan urutan completion berbeda dan dua app berbeda tidak berbagi request ID/state.
5. Query yang berisi token/signed URL, body credential, cookie/authorization/header, response payload dan raw error rahasia tidak tercetak. Path control character/encoded dan panjang berlebih tetap satu baris terbatas.
6. Sink yang melempar tidak mengubah HTTP atau menimbulkan unhandled rejection; logger tidak mengonsumsi stream.
7. Test menunggu hook asynchronous melalui signal sink completion dengan timeout, bukan mengasumsikan `await app.handle` sudah mencetak log.

Semua behavior tests memakai native `bun:test`, dependency fake dan `app.handle`, tanpa membuka port/DB/storage/FFmpeg. Demo startup/stdout terpisah dari unit tests.

## Constraints

Gunakan Bun dan existing Elysia `1.4.30`, chaining, private-only auth serta kontrak Eden type-only. Tidak menambah library, schema, env, script atau CI. Commit per task sesuai AGENTS setelah criteria/checks lulus; branch implementasi disarankan `feat/api-request-logging`. Push/PR/merge/deploy memerlukan otorisasi tersendiri. Preserve perubahan worktree existing.

## Acceptance Criteria

- [x] Setiap request yang mencapai API langsung terlihat, semua route tanpa sampling.
- [x] Request selesai mendapat satu log hasil dengan status HTTP aktual, durasi nonnegatif dan ID korelasi start/finish.
- [x] Semua output memakai native console.log; tidak ada library logging.
- [x] Tidak mencetak body/header/query/response/raw error atau mengubah kontrak HTTP/auth/Eden.
- [x] Test lifecycle/isolation/redaksi/sink failure, suite API dan quality gates lulus.
- [x] Panduan, backlog dan ledger mencatat bukti serta commit task aktual.

## Risks and Mitigations

| Risiko                                                                 | Penanganan                                                                       |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Completion/status berbeda pada Response, early return atau error       | Matriks status dan factory tests pada versi terpasang.                           |
| Hook asynchronous membuat assertion terlalu awal atau completion ganda | Signal completion di test dan emitter idempoten bila diperlukan.                 |
| Traffic ramai menghasilkan banyak output                               | Dua record kecil/allowlisted, tidak serialisasi payload; sampling di luar scope. |
| Detail rahasia masuk query/body/error                                  | Tidak mengambil field tersebut; test sentinel pada output.                       |
| Output console gagal                                                   | Sink failure diisolasi; tidak mengganti response.                                |
| Request terputus/proses mati sebelum completion                        | Event start tetap menjadi jejak best-effort; tidak menjanjikan audit durable.    |

## Rollback or Recovery

Lepas registrasi logger dan dependency test pada `createApp`, atau revert commit implementasi logger/integrasi yang terkait sesuai review. Tidak ada migration atau perubahan data untuk dipulihkan. Kembalikan guide/status agar tidak mengklaim logging aktif setelah rollback.

## Evidence

[Context beserta evidence index](repository-context.md#evidence-index) mendukung affected paths dan batas request. [Backlog canonical](../../tasks/api-request-logging.md) menjadi pemilik bukti task. [Lifecycle resmi Elysia](https://elysiajs.com/essential/life-cycle) mendukung pemilihan hook; coverage/status lokal belum diuji sebelum implementasi.

## Open Decisions

Format JSON satu baris, dua event, ID log internal dan default semua request disetujui pengguna 7 Oktober 2026. Tidak ada keputusan scope yang masih terbuka.

## Validation History

### 2026-10-07 — implementasi

- Result: valid.
- Plan base SHA: `4f3c9141017ac85e5e999e3ce72b66c6d45aea30`.
- Current target SHA: `17fc66f622a9296c973bb1d5470e96ccc7471b2f` pada branch `feat/api-request-logging`.
- Checked paths: logger/tests, factory/app tests, API guide, plan/backlog/index, gateway/auth serta manifests.
- Changed relevant paths: perubahan plugin/factory/tests pada APILOG-001/002 sesuai scope; tidak ada drift unrelated pada source.
- Decision: implementasi valid; code gates APILOG-002 tetap berlaku pada source yang sama. APILOG-003 hanya memperbarui dokumentasi dan demo read-only.

### 2026-10-06T21:42:06+07:00

- Result: valid untuk evidence rencana.
- Plan base SHA/current target SHA: `4f3c9141017ac85e5e999e3ce72b66c6d45aea30`.
- Checked paths: `apps/api`, `apps/web/src/lib/server`, `packages/auth`, manifests, panduan/spec terkait.
- Changed relevant paths: source API/gateway/auth tidak berbeda dari HEAD; perubahan desain/build-docs existing dicatat pada context.
- Decision: plan dapat direview; cek HEAD dan diff affected paths lagi sebelum implementasi.

## Execution Log

- 6 Oktober 2026: source/panduan dan dependency lifecycle dibaca; context ditulis sebelum plan/backlog. Hanya dokumentasi rencana dibuat; runtime logging belum diimplementasikan. Hasil checks dokumentasi dicatat setelah benar-benar dijalankan.
- 6 Oktober 2026: Prettier pada tiga dokumen rencana/backlog dan indeks lulus; `bun run docs:check` lulus (62 Markdown, 552 local links/anchors); `git diff --check` lulus. Checks ini hanya memvalidasi dokumentasi. Commit plan lokal memakai pesan `docs(api): plan console request logging (APILOG-PLAN)`; SHA aktual dilaporkan setelah commit berhasil, bukan ditulis sebagai self-reference.
- 7 Oktober 2026: commit plan `1afa736a620d9cf072a4d3cf8b33a8f1ff534815` menjadi HEAD pre-write; source API/auth/gateway, manifest/lock dan API guide tidak berubah dari base plan. Freshness valid. Branch implementasi `feat/api-request-logging` dibuat; semua perubahan desain/build-docs existing dipertahankan.
- APILOG-001: plugin dibuat, 6 behavior tests/61 assertions lulus pada `bun test ./apps/api/src/plugins/logger.test.ts`. Native `onRequest` tidak menerima options scope; hook ini global secara native. Completion menunggu raw Promise handler yang belum selesai sebelum mencetak, tanpa membaca stream. Status mengikuti merge Elysia: Response non-200 dipertahankan, Response 200 memakai `set.status`. Proof mencakup override 202, nested/error/404, request paralel/app terpisah, redaksi dan sync/async sink failure. Gate sebelum commit dicatat pada backlog.
- APILOG-001 commit: `d4a45de45c61ab5b219b922f94d4a9dafd3c0651`; focused tests, root check-types/lint/build, format/docs/diff dan Husky/Commitlint lulus. Task Done; logger belum dipasang pada factory di commit ini.
- APILOG-002: factory memasang logger paling awal. Focused tests lulus 11 tests/215 assertions. Proof app nyata menemukan kebutuhan hook observasi tambahan yang diizinkan plan: global onError observer tanpa return supaya unmatched route tetap menjalankan afterResponse pada Elysia 1.4.30 ketika app.event.error berupa array kosong. Pemetaan response existing dipertahankan; full gates sebelum commit ada pada backlog.
- APILOG-002 commit: `17fc66f622a9296c973bb1d5470e96ccc7471b2f`; API suite 109 tests/562 assertions, root check-types/lint/build dan docs/format/diff serta hook/Commitlint lulus. Task Done.
- APILOG-003 demo 7 Oktober 2026: `bun .turbo/request-logging-smoke.mjs` menjalankan root `bun run dev --filter=api` dan `bun run --cwd apps/api start` secara berurutan pada port ephemeral. Masing-masing menerima GET root 200 dan unknown route 404, menghasilkan tepat 4 event dengan ID korelasi sama per pair, durasi nonnegatif dan query sentinel tidak tercetak. Hanya request read-only; subprocess demo dihentikan. Harness/result sementara ignored pada `.turbo`, tidak masuk Git. Ini proof lokal development dan executable hasil build, bukan deployment production.
- APILOG-003 commit: `beb5fa288b2c8d52c07ee98e13d3133559c52ad4`; API guide/index/evidence diperbarui, Prettier, docs:check (62 Markdown/555 links), diff check dan Husky/Commitlint lulus. Source tidak berubah setelah code gates APILOG-002. SHA aktual dan status Done dicatat pada finalisasi ledger berikutnya; tidak ada push/PR/merge/deploy.
