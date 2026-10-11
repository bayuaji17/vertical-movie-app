# Repository context: peningkatan logging

## Snapshot

- Repository: `bayuaji17/vertical-movie-app`.
- Base ref: `main`; base SHA: `ddcb2b1e8badfa816d798505bc5107113da05061`.
- Analyzed at: 11 Oktober 2026 (Asia/Jakarta).
- Context status: snapshot perencanaan pada SHA di atas; periksa freshness sebelum implementasi.
- Branch: `feat/logging-enhancement`.
- Request: pengguna meminta peningkatan log untuk semua bagian, terutama worker (setiap progres harus terlihat) dan request/response API lain, agar debugging lebih mudah (11 Oktober 2026).

## Observed behavior

- API: `apps/api/src/plugins/logger.ts` (`createRequestLogger`) mencetak dua baris JSON per request (`http.request`, `http.response`) dengan `timestamp`, `event`, `requestId`, `method`, `path`, `status`, `durationMs`. Tanpa query, header, ukuran body, kode error, level atau format yang dapat dikonfigurasi; ID dibuat per request dan tidak dikirim ke klien atau web. Dokumen: [plan APILOG](../api-request-logging/implementation-plan.md) (selesai 7 Oktober 2026, di luar scope waktu itu: payload, stack trace, file log).
- Error: handler error (`plugins/errors.ts`, `shared/content-error.ts`) memetakan ke respons tanpa mencatat penyebab; kegagalan 5xx tidak meninggalkan jejak selain baris `http.response`.
- Worker (`apps/api/src/workers`): `index.ts` hanya mencetak "Media worker started with concurrency N", `Media job <id>: <state>` dan pesan error generik ("dependency unavailable; retrying"); exception ditelan (`catch {}`) tanpa penyebab. `runner.ts` melewati tahap disk check, ambil aset, unduh sumber + SHA-256, verifikasi EBML, probe, transcode HLS (FFmpeg `-progress pipe:1`, progres hanya masuk heartbeat DB), unggah output, commit; tidak ada log per tahap, durasi tahap, progres transcode, retry/backoff, lease/heartbeat hilang, recovery atau cleanup. Kode error `MEDIA_*` hanya tersimpan di DB.
- Web (`apps/web/src/lib/server/auth-gateway.ts`, `business-gateway.ts`): gateway `/api/*` meneruskan request ke API dengan timeout dan batas ukuran, tanpa log; kegagalan fetch SSR (`readCatalog…OnServer` dan sejenisnya) menjadi status HTTP/State UI tanpa log server.
- Skrip CLI (`provision-cli`, `reset-cli`, `migrate`, seed) memakai `console.*` langsung; itu output operator, bukan target peningkatan kecuali disebut.
- Tidak ada `LOG_LEVEL`/`LOG_FORMAT` di `docs/guides/environment.md`; tidak ada library logging dan keputusan 7 Oktober 2026 melarang menambahnya untuk request logging.

## Repository map (bagian relevan)

| Area                                                                                   | Peran                                                                 |
| -------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `apps/api/src/plugins/logger.ts`, `logger.test.ts`                                     | Logger request existing dan test (`app.handle`, sink injeksi).        |
| `apps/api/src/plugins/errors.ts`, `shared/content-error.ts`                            | Pemetaan error ke respons.                                            |
| `apps/api/src/index.ts`, `workers/index.ts`                                            | Startup/shutdown API dan loop worker (konkurensi, recovery, cleanup). |
| `apps/api/src/workers/runner.ts`, `queue.ts`, `transcode.ts`, `probe.ts`, `cleanup.ts` | Eksekusi job, antrean PostgreSQL, FFmpeg/ffprobe, pembersihan.        |
| `apps/api/src/config/*.ts`                                                             | Validasi env (tempat `LOG_*`).                                        |
| `apps/web/src/lib/server/*-gateway.ts`, `lib/*/*.server.ts`                            | Gateway dan pembacaan server-side ke API.                             |
| `docs/guides/api-development.md`, `docs/guides/environment.md`, `docs/operations/*`    | Pemilik dokumentasi logging, env dan runbook.                         |

## Constraints dari repo

- Bun native; tanpa library logging baru kecuali disetujui. FFmpeg dijalankan melalui subprocess Bun di luar request dan transaksi; log tidak boleh menahan atau mengubah perilaku request/job (sink gagal tidak boleh mengubah HTTP/job).
- Rahasia tidak boleh masuk log: cookie, `Authorization`, token, password, secret env, kunci/URL bertanda tangan (`X-Amz-*`, `Signature`), isi multipart/biner, path sumber privat. Aturan produk/aksesibilitas publik tidak berubah.
- Perubahan API/skema/env didokumentasikan pada root `docs/` (`environment.md`, guide API, runbook media); `.env.example` diperbarui bila ada variabel baru.
- Test API memakai `bun:test` dan sink log yang disuntikkan; test yang butuh PostgreSQL/FFmpeg tetap di suite integrasi.
