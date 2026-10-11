# Implementation plan: peningkatan logging

## Plan metadata

- Status: **implemented lokal** (LOG-001–008 Done, LOG-009 Review; 11 Oktober 2026). Disetujui (11 Oktober 2026). Pengguna menyetujui D1–D5 sebagaimana direkomendasikan ("setuju semua, langsung kerjakan semua"); skrip CLI tetap tidak ikut.
- Date: 11 Oktober 2026; decision owner: pengguna.
- Repository: `bayuaji17/vertical-movie-app`; base ref: `main`; base SHA: `ddcb2b1e8badfa816d798505bc5107113da05061`.
- Context: [repository-context.md](repository-context.md).
- Backlog: [logging-enhancement](../../tasks/logging-enhancement.md), LOG-001–009.
- Branch: `feat/logging-enhancement`.

## Objective

Operator dapat mengikuti satu request dari web ke API sampai respons, dan mengikuti setiap job media dari diambil sampai selesai/gagal beserta progres tiap tahap, hanya dari output console, tanpa membocorkan rahasia.

## Keputusan (disetujui pengguna 11 Oktober 2026, ditandai **D**)

- **D1 Body request/response.** Default tidak dicatat. Dengan `LOG_HTTP_BODIES=true` (ditolak saat `NODE_ENV=production`) JSON body dicatat terpotong 2 KB dengan redaksi nilai pada kunci sensitif; multipart, biner, rute `/api/auth/*`, upload part, dan respons berisi URL bertanda tangan/playback tidak pernah dicatat. Ini membalik pengecualian "payload" pada plan APILOG sehingga perlu persetujuan eksplisit.
- **D2 Level dan format.** `LOG_LEVEL=debug|info|warn|error` (default `debug` di development, `info` di production) dan `LOG_FORMAT=json|pretty` (default `pretty` satu baris berwarna di development, `json` di production). Tanpa library; satu modul `apps/api/src/shared/log.ts`.
- **D3 Korelasi.** Header `x-request-id`: web membuat UUID dan mengirimnya ke API, API memakai ID masuk bila UUID valid (selain itu membuat sendiri) dan mengembalikannya pada respons. Satu ID muncul di log web dan API.
- **D4 Granularitas progres worker.** Event per tahap (mulai/selesai + durasi) dan progres transcode setiap 10% durasi atau 15 detik (yang lebih jarang), memakai data `-progress` FFmpeg yang sudah dibaca; tidak ada log per segmen.
- **D5 Error.** Error 5xx dan job gagal dicatat dengan kode, nama/pesan, rantai penyebab terpotong dan, hanya di development, stack; stderr FFmpeg dicatat 4 KB terakhir saat gagal.

## Goals dan non-goals

Goals: modul log bersama dengan level/format/redaksi; request/response API diperkaya (query tersanitasi, header terpilih, ukuran, kode error, ID dua arah) dengan body opsional dev-only; log error terstruktur; log worker lengkap per tahap dengan progres dan alasan retry/pause/recovery/cleanup; log gateway dan fetch SSR di web; log proses (startup, shutdown, unhandled); dokumentasi field, env dan contoh debugging.

Non-goals: library logging, file log/rotasi/retensi, pengiriman ke kolektor/dashboard, metrik/tracing terdistribusi, log browser (client-side), IP/identitas pengguna, log SQL, perubahan kontrak respons API (kecuali header `x-request-id`), perubahan perilaku pemrosesan media.

## Desired behavior

### Bentuk event (JSON; pretty menampilkan field yang sama)

```text
{"timestamp":"…","level":"info","component":"worker","event":"job.stage","jobId":"…","assetId":"…","kind":"source","attempt":1,"stage":"transcode","phase":"progress","percent":40,"elapsedMs":18200}
{"timestamp":"…","level":"info","component":"api","event":"http.response","requestId":"…","method":"POST","path":"/admin/media/uploads","status":201,"durationMs":42.1,"requestBytes":312,"responseBytes":1204,"query":{"page":"1"}}
{"timestamp":"…","level":"error","component":"api","event":"http.error","requestId":"…","code":"CONTENT_VERSION_CONFLICT","status":409,"message":"…"}
```

- **Request/response (API):** `http.request` memuat method, path, query (nilai sensitif diganti `[redacted]`), `content-type`, `content-length`, `user-agent` terpotong, `origin`; `http.response` menambah status, durasi, ukuran respons, `errorCode` bila ada. Cookie/Authorization/Set-Cookie tidak pernah dicatat. Body hanya dengan D1.
- **Worker:** `worker.start` (konkurensi, lease, heartbeat, batas), `job.claimed` (jobId, assetId, kind, attempt, failures), `job.stage` untuk `disk_check`, `load_asset`, `download` (byte, durasi), `verify` (hash, EBML), `probe` (durasi media, resolusi, codec), `transcode` (mulai, tier, progres, selesai + durasi), `upload` (jumlah file, byte), `commit`; `job.completed` (total durasi) dan `job.failed` (kode `MEDIA_*`, apakah terminal/retry, penundaan retry, stderr FFmpeg terpotong), `job.paused` (alasan, waktu lanjut), `job.lease_lost`, `queue.recover` dan `cleanup` (jumlah), `worker.stop` (grace/abort). Setiap event membawa `jobId`/`assetId`/`attempt`.
- **Web:** `gateway.request` (method, path, status, upstream status, durasi, alasan timeout/abort/ukuran) dan `ssr.api_error` (operasi, status, requestId) dengan `x-request-id` yang diteruskan.
- **Proses:** startup (versi, mode, port, level), shutdown, `uncaughtException`/`unhandledRejection` sebagai `error`.

## Impact analysis

Hampir seluruhnya aditif dan di balik level log. Risiko: (1) kebocoran rahasia lewat query/body/error → redaksi dengan allowlist/denylist, test; (2) biaya CPU/memori membaca body → hanya saat D1 aktif dan dengan batas; (3) log mengubah perilaku saat sink gagal → semua penulisan dibungkus try/catch; (4) volume log progres → throttle D4; (5) mengonsumsi body request di Elysia dapat memengaruhi parsing → gunakan clone/hook yang tidak mengubah aliran, diverifikasi dengan test `app.handle`; (6) race antar slot worker → ID job/aset pada setiap event.

## Affected files and symbols

| File                                                                                   | Perubahan                                                        |
| -------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `apps/api/src/shared/log.ts` (+ test)                                                  | Level, format, redaksi, `createLogger(component)`, sink injeksi. |
| `apps/api/src/config/log-env.ts` (+ test), `.env.example`                              | Validasi `LOG_LEVEL`, `LOG_FORMAT`, `LOG_HTTP_BODIES`.           |
| `apps/api/src/plugins/logger.ts`, `errors.ts`                                          | Request/response/error diperkaya, `x-request-id`, body opsional. |
| `apps/api/src/workers/index.ts`, `runner.ts`, `queue.ts`, `transcode.ts`, `cleanup.ts` | Event worker, progres, retry/pause/recovery.                     |
| `apps/api/src/index.ts`                                                                | Startup/shutdown/unhandled via logger.                           |
| `apps/web/src/lib/server/*-gateway.ts`, `*.server.ts`                                  | Log gateway/SSR dan `x-request-id`.                              |
| `docs/guides/api-development.md`, `environment.md`, `operations/media.md`              | Field, env, contoh `jq`, panduan debugging worker.               |

## Implementation DAG

LOG-001 (persetujuan D1–D5) → LOG-002 (modul log + env) → LOG-003 (request/response API) dan LOG-004 (error API) dan LOG-006 (worker: siklus dan tahap) → LOG-007 (worker: progres transcode, retry/pause/recovery) ; LOG-003 → LOG-005 (web + korelasi) ; semuanya → LOG-008 (proses dan pembersihan `console.*`) → LOG-009 (dokumentasi dan bukti).

## Test and verification strategy

- Unit (`bun test`, sink injeksi): redaksi (kunci, query, URL bertanda tangan, rantai error), level/format, throttle progres, ID masuk valid/tidak valid, body dibatasi dan dilewati untuk multipart/auth.
- HTTP: `app.handle(new Request(...))` untuk semua jalur status (200/4xx/5xx/404/error handler) dan memastikan respons tidak berubah.
- Worker: job palsu/`process.test.ts` untuk urutan event; integrasi PostgreSQL/FFmpeg di suite terpisah menjalankan satu job nyata dan memeriksa urutan tahap serta progres monoton.
- Manual: unggah media lewat admin di dev dan ikuti log; `bun run check-types`, `lint`, `build`, `docs:check`.

## Rollout, rollback, dan batas

Aditif; rollback dengan revert commit. Default production tetap JSON `info` tanpa body. Tidak membuktikan kesiapan production atau retensi log.

## Open decisions

D1–D5 di atas; plus apakah skrip CLI (`provision`, `reset`, `migrate`, seed) ikut dipindah ke modul log (rekomendasi: tidak, output operator tetap polos).

## Execution history

- 11 Oktober 2026: context dan plan ditulis pada `feat/logging-enhancement`.
- 11 Oktober 2026: pengguna menyetujui D1–D5 dan meminta seluruh LOG-002–009 dikerjakan; modul log bersama dibuat sebagai paket `@repo/log` karena API dan web sama-sama membutuhkannya.

- 11 Oktober 2026: LOG-002–009 diimplementasikan lokal: paket `@repo/log`, request/response/error API, log worker per tahap dengan progres, gateway/SSR web dan korelasi `x-request-id`, dokumentasi; bukti nyata lewat suite integrasi worker dan API+web dev. Belum: unggahan manual via admin dengan worker berjalan.
