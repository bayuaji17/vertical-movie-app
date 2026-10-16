# Modul: poster video tidak hilang karena kedaluwarsa

> Status: **POSTER-001–003 Done; POSTER-004–006 Backlog (approved)** · 16 Oktober 2026 · Pengguna melaporkan poster video menjadi kosong bila halaman dibiarkan lama; presigned URL dipertahankan. Plan: [implementation-plan](../plans/poster-no-expiry/implementation-plan.md), context: [repository-context](../plans/poster-no-expiry/repository-context.md). Plan disetujui pengguna 16 Oktober 2026.

## Tujuan modul

Poster yang sudah tampil tidak pernah hilang selama halaman terbuka; kedaluwarsa presigned URL tidak lagi terlihat oleh viewer. Referensi: [media](../operations/media.md), [environment](../guides/environment.md), [public-content-watch](../plans/public-content-watch/implementation-plan.md), [watch-flow](../plans/watch-flow/implementation-plan.md).

## User story: POSTER-US-01

Sebagai viewer, saya ingin poster tetap terlihat walau halaman dibiarkan terbuka lama, sehingga halaman tidak tampak rusak saat saya kembali ke tab tersebut.

## User story: POSTER-US-02

Sebagai pemilik, saya ingin umur URL poster dapat diatur dan dipisahkan dari durasi video, sehingga keseimbangan antara kenyamanan viewer dan jendela akses setelah unpublish dapat saya tentukan.

## Task: POSTER-001 — Setujui keputusan D1–D7

- Status: Done
- Owner: agent
- Prioritas: 1
- Referensi: POSTER-US-01/02; [plan](../plans/poster-no-expiry/implementation-plan.md)
- Diperbarui: 2026-10-16
- Dependensi: tidak ada
- Ukuran: kecil

### Ruang lingkup

Pengguna meninjau D1–D7, terutama nilai default TTL poster (24 jam), TTL HLS (default 1 jam) dan apakah kuantisasi kedaluwarsa (D6) dikerjakan.

### Acceptance criteria

- [x] Setiap keputusan disetujui, diubah atau dikeluarkan secara tertulis, termasuk nilai TTL default.
- [x] Plan dan backlog ditandai `approved` dengan tanggal.

### Validasi

`bun run docs:check`.

### Hasil dan bukti

Pengguna menyetujui (16 Oktober 2026): URL poster berumur panjang (default 24 jam) dan gambar yang sudah tampil tidak pernah dilepas (D1–D5); URL video (HLS) berumur `2 × durasi` dengan default 1 jam (D7, efektif 1 jam karena durasi maksimum 30 menit). D6 tidak dikerjakan. Plan berstatus `approved`; `bun run docs:check` lulus.

### Commit task

- Pesan: `docs(web): plan posters that never blank on expiry (POSTER-001)`
- SHA: belum dibuat
- Hook/checks: belum dijalankan
- Ledger: dicatat pada update dokumentasi berikutnya

### Blocker atau tindak lanjut

Tidak ada.

## Task: POSTER-002 — Reproduksi dan baseline

- Status: Done
- Owner: agent
- Prioritas: 2
- Referensi: POSTER-US-01
- Diperbarui: 2026-10-16
- Dependensi: POSTER-001
- Ukuran: sedang

### Ruang lingkup

Worker browser dengan jam palsu (Playwright `clock`) pada kode saat ini: Film published siap (video dan poster nyata di MinIO uji), buka detail, majukan jam melewati TTL (`2 × durasi`), catat bahwa poster menjadi skeleton/"Cover unavailable"; amati juga poster player yang diam. Bila hasil berbeda dari hipotesis, plan direvisi.

### Acceptance criteria

- [x] Kegagalan terbukti dan terdokumentasi (screenshot, permintaan jaringan, TTL yang diamati).
- [x] Skenario yang sama disimpan sebagai uji yang harus lulus setelah perbaikan (worker yang sama tanpa `--baseline`, dijalankan pada POSTER-006).

### Validasi

Worker browser pada database/bucket uji.

### Hasil dan bukti

Dikerjakan 16 Oktober 2026 pada database uji dan bucket MinIO acak (bukan development), API + worker + web dev nyata, Chromium headless dengan jam palsu Playwright (`page.clock`). Harness kini ter-commit: `scripts/browser-proof.sh` (`libs`, `up [--public]`, `web`, `run`, `down`; state di `~/.cache/vertical-movie-proof`), fixture `content-delete-browser-fixture.ts` mendapat opsi `--public` (satu film published yang benar-benar siap: video 60 detik + sampul WebP nyata + hak + sinopsis), dan worker `apps/web/test/public-poster-expiry-browser-worker.mjs` (`--baseline` hanya mencatat, tanpa flag menegaskan perilaku akhir, `--real-wait` menunggu kedaluwarsa nyata). **Hasil baseline pada kode saat ini:** URL poster halaman detail `X-Amz-Expires=120` (video 60 detik × 2); setelah jam dimajukan 150 detik (melewati TTL) `<img>` sudah dilepas dan frame menampilkan "Cover unavailable" (`img=false loaded=false unavailable=true`), dan keadaan itu menetap pada lompatan berikutnya; selama itu terjadi 3 permintaan poster/playback. Kedaluwarsa nyata terkonfirmasi: setelah menunggu 125 detik URL lama dijawab storage **HTTP 403** (sebelumnya 200). Poster `<video>` pada halaman watch juga memakai `X-Amz-Expires=120`; selama diam atributnya tidak berubah dan tidak kosong, tetapi URL-nya sudah tidak valid sehingga pemuatan ulang akan gagal. Hipotesis plan terbukti untuk poster halaman detail; untuk player yang terbukti adalah URL pendek, bukan gambar yang hilang selama diam.

### Commit task

- Pesan: `test(web): reproduce poster blanking after expiry (POSTER-002)`
- SHA: belum dibuat
- Hook/checks: belum dijalankan
- Ledger: dicatat pada update dokumentasi berikutnya

### Blocker atau tindak lanjut

Tidak ada.

## Task: POSTER-003 — API: TTL poster terpisah dan dapat diatur

- Status: Done
- Owner: agent
- Prioritas: 3
- Referensi: POSTER-US-02; D1, D5
- Diperbarui: 2026-10-16
- Dependensi: POSTER-001
- Ukuran: kecil

### Ruang lingkup

Env `MEDIA_POSTER_URL_TTL_SECONDS` (default 86400, valid 60–604800) untuk URL poster dan `MEDIA_HLS_URL_TTL_SECONDS` (default 3600, valid 60–604800) untuk HLS, TTL efektif HLS = `max(2 × durasi, env)`; keduanya divalidasi saat start dan dipakai `PlaybackService.info()`/`poster()`/`playlist()` beserta `expiresAt`-nya. Konstanta batas dibagikan ke kontrak web. Dokumentasikan di `docs/guides/environment.md`, `.env.example` dan `docs/operations/media.md`.

### Acceptance criteria

- [x] Umur URL poster mengikuti env dan tidak bergantung pada durasi; umur URL HLS = `max(2×durasi, env)` (default 1 jam) dan `expiresAt` konsisten.
- [x] Nilai di luar rentang atau bukan bilangan bulat ditolak saat start dengan pesan jelas.
- [x] Test unit/HTTP dan proof playback yang ada lulus.

### Validasi

`bun test src` API, proof playback/media yang menyentuh poster.

### Hasil dan bukti

Dikerjakan 16 Oktober 2026. `config/playback-env.ts`: `loadUrlLifetimes()` (`MEDIA_POSTER_URL_TTL_SECONDS` default 86400, `MEDIA_HLS_URL_TTL_SECONDS` default 3600, bilangan bulat 60–604800, divalidasi saat API start dengan pesan yang menyebut variabelnya), `urlLifetimeBounds`, `defaultUrlLifetimes`; `index.ts` memvalidasi di awal dan menyuntikkan ke `PlaybackService` (parameter ke-6). `PlaybackService`: TTL HLS = `max(2×durasi, hlsMinSeconds)` untuk `info().expiresAt` dan presign playlist/init/segmen; URL poster pada `info()` dan `poster()` memakai `posterSeconds` dan `expiresAt`-nya mengikuti itu. Test: `playback-env.test.ts` (3 test), `playback/service.test.ts` diperbarui (durasi 600000/1800000/1333 ms → HLS 3600 detik dan poster 86400; kombinasi `max(2×durasi, minimum)`; poster dapat diatur 120 detik–7 hari dan bebas durasi; revoke tetap menutup URL baru), proof integrasi `public-film-catalog-proof` (`X-Amz-Expires=86400`), `media-worker-proof` dan `public-content-proof` lulus (6 test). `bun test src` API 215 lulus + 1 gagal sebelumnya (`truncated JPEG data…`); `tsc --noEmit` bersih. Dokumentasi: `apps/api/.env.example`, `docs/guides/environment.md` (dua env baru dan TTL), `docs/operations/media.md`, `docs/architecture/overview.md`.

### Commit task

- Pesan: `feat(api): configurable lifetimes for poster and HLS URLs (POSTER-003)`
- SHA: belum dibuat
- Hook/checks: belum dijalankan
- Ledger: dicatat pada update dokumentasi berikutnya

### Blocker atau tindak lanjut

Tidak ada selain POSTER-001.

## Task: POSTER-004 — Web: poster yang sudah tampil tidak dilepas

- Status: Backlog
- Owner: agent
- Prioritas: 4
- Referensi: POSTER-US-01; D2, D3, D5
- Diperbarui: 2026-10-16
- Dependensi: POSTER-003
- Ukuran: sedang

### Ruang lingkup

Tulis ulang `usePublicPoster`/`PublicPoster`: simpan URL terakhir yang termuat; pembaruan diam-diam pada 80% umur dan pada `visibilitychange`/`focus`/`online`; preload dengan `new Image()` lalu tukar `src` hanya bila berhasil; backoff 2/5/15/30/60 detik; fallback "Cover unavailable" hanya bila belum pernah ada gambar; validasi TTL klien memakai batas bersama (bukan `2×durasi+30 dtk`). Perbarui `PosterQueue`/test yang terdampak.

### Acceptance criteria

- [ ] Tidak ada jalur kode yang menghapus gambar yang sudah tampil karena waktu atau kegagalan pembaruan.
- [ ] Timer dan listener dibersihkan saat unmount; tidak ada permintaan ganda bersamaan.
- [ ] Fallback dan retry berfungsi saat gambar belum pernah termuat; target sentuh ≥ 44 px.

### Validasi

Test state/komponen dengan jam palsu; browser pada POSTER-006.

### Hasil dan bukti

Belum ada.

### Commit task

- Pesan: `fix(web): keep a displayed poster and renew its URL silently (POSTER-004)`
- SHA: belum dibuat
- Hook/checks: belum dijalankan
- Ledger: dicatat pada update dokumentasi berikutnya

### Blocker atau tindak lanjut

Tidak ada.

## Task: POSTER-005 — Web: poster player stabil

- Status: Backlog
- Owner: agent
- Prioritas: 5
- Referensi: POSTER-US-01; D4
- Diperbarui: 2026-10-16
- Dependensi: POSTER-003
- Ukuran: kecil

### Ruang lingkup

`vertical-video-player.tsx`: `poster` ditetapkan dari respons playback pertama per pemasangan dan tidak berubah saat playback diperbarui; pemasangan baru mengambil URL baru.

### Acceptance criteria

- [ ] Atribut `poster` tidak berubah selama pemasangan walau `playback` diperbarui.
- [ ] Tidak ada kedip saat pembaruan; test komponen/state lulus.

### Validasi

Test komponen; browser pada POSTER-006.

### Hasil dan bukti

Belum ada.

### Commit task

- Pesan: `fix(web): keep the player poster stable across playback renewals (POSTER-005)`
- SHA: belum dibuat
- Hook/checks: belum dijalankan
- Ledger: dicatat pada update dokumentasi berikutnya

### Blocker atau tindak lanjut

Tidak ada.

## Task: POSTER-006 — Bukti dan penutupan

- Status: Backlog
- Owner: agent
- Prioritas: 6
- Referensi: POSTER-US-01/02
- Diperbarui: 2026-10-16
- Dependensi: POSTER-002, POSTER-004, POSTER-005
- Ukuran: sedang

### Ruang lingkup

Ulangi skenario POSTER-002: poster detail dan player tetap tampil setelah jam dimajukan melewati beberapa TTL; tab disembunyikan lalu dikembalikan; offline/online; pembaruan diam-diam tercatat dan tanpa keadaan kosong; desktop dan mobile. Perbarui dokumentasi (media, environment, README, plan) dan jalankan gate penuh.

### Acceptance criteria

- [ ] Semua skenario lulus dengan hasil aktual dicatat.
- [ ] `check-types`, `lint`, `build`, `docs:check` lulus dan dicatat.

### Validasi

Worker browser, suite relevan, gate akhir.

### Hasil dan bukti

Belum ada.

### Commit task

- Pesan: `test(web): prove posters survive idle pages (POSTER-006)`
- SHA: belum dibuat
- Hook/checks: belum dijalankan
- Ledger: dicatat pada update dokumentasi berikutnya

### Blocker atau tindak lanjut

Tidak ada.
