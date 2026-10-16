# Implementation plan: poster video tidak hilang karena kedaluwarsa

## Plan metadata

- Status: **approved** (16 Oktober 2026). Pengguna menyetujui URL poster berumur panjang dan gambar yang tampil tidak pernah dilepas (D1, D2–D5 untuk poster), serta menetapkan URL video (HLS) berumur `2 × durasi` dengan default 1 jam (D7). D6 (kuantisasi) tidak disetujui dan tidak dikerjakan. Implementasi menunggu perintah pengguna.
- Date: 16 Oktober 2026; decision owner: pengguna.
- Repository: `bayuaji17/vertical-movie-app`; base ref: `main` (SHA pada context).
- Context: [repository-context.md](repository-context.md).
- Backlog: [poster-no-expiry](../../tasks/poster-no-expiry.md), POSTER-001–006.
- Branch usulan: `fix/poster-no-expiry`.

## Objective

Begitu sebuah poster **tampil**, ia tidak pernah hilang atau kosong selama halaman terbuka, berapa lama pun dibiarkan. Presigned URL tetap dipakai; kedaluwarsanya tidak lagi terlihat oleh viewer.

## Akar masalah (ringkas)

1. URL presigned poster berumur `2 × durasi` (video 60 detik → 120 detik).
2. `usePublicPoster` melepas `<img>` yang sudah tampil saat URL berakhir dan hanya memperbarui sekali; kedaluwarsa kedua → "Cover unavailable".
3. Poster `<video>` memakai URL yang berubah setiap playback diperbarui, dan tidak diperbarui saat video diam.

Detail: [context](repository-context.md#observed-behavior).

## Keputusan yang diusulkan (**D**; rekomendasi tebal)

- **D1 Umur URL poster dilepas dari durasi video dan dibuat panjang.** URL poster (pada `GET /videos/:slug/poster` dan `posterUrl` di playback) berumur tetap, dapat diatur lewat env `MEDIA_POSTER_URL_TTL_SECONDS`; **default 24 jam, batas 60 detik–7 hari** (batas SigV4). HLS diatur terpisah (D7). _Kompromi yang perlu Anda putuskan:_ URL poster yang sudah terbit tetap hidup setelah konten di-unpublish sampai TTL habis (aturan "URL lama bertahan sampai expiry" yang sudah ada; poster juga sudah terbuka untuk anonim selama published). **24 jam** menyeimbangkan itu dengan umur halaman yang wajar; 7 hari lebih mendekati "tanpa expired"; 1 jam lebih ketat.
- **D2 Gambar yang sudah tampil tidak pernah dilepas.** `usePublicPoster` menyimpan URL terakhir yang berhasil dimuat; kedaluwarsa tidak menghapus `src`. Pembaruan berjalan **diam-diam di latar belakang**: minta URL baru sebelum habis (di 80% umur) dan juga saat `visibilitychange` (tab terlihat), `focus`, dan `online`; muat URL baru dengan `new Image()` dan **tukar `src` hanya setelah berhasil dimuat**. Selama pembaruan gagal, gambar lama tetap tampil.
- **D3 Kegagalan hanya terlihat bila gambar belum pernah berhasil dimuat.** Aturan "satu kali auto-renew lalu 'Cover unavailable'" diganti: percobaan ulang tanpa batas dengan backoff (2, 5, 15, 30 detik, lalu 60 detik) selama halaman terlihat dan online. "Cover unavailable" + "Retry cover" hanya muncul bila belum ada gambar yang pernah tampil; jika sudah ada, gambar tetap dan pembaruan terus dicoba diam-diam.
- **D4 Poster player stabil per pemasangan.** `poster` pada `<video>` ditetapkan sekali dari respons playback pertama dan **tidak diubah** oleh pembaruan playback berikutnya (yang hanya menyegarkan HLS); jadi tidak ada kedip dan tidak bergantung pada kedaluwarsa. Pemasangan baru mengambil URL baru.
- **D5 Kontrak.** Respons tetap berbentuk sama (`posterUrl`, `expiresAt`), tetapi `expiresAt` poster kini mengikuti D1; validasi klien (`expiry <= now + 2×durasi + 30 dtk`) diganti dengan batas `MEDIA_POSTER_URL_TTL_SECONDS` (diumumkan lewat konstanta bersama di kontrak, bukan angka ajaib di dua tempat). Tidak ada rute baru, tidak ada perubahan gateway.
- **D6 (opsional) Kuantisasi kedaluwarsa: tidak dikerjakan.** Tidak disetujui pengguna; dapat diusulkan ulang bila pembaruan latar belakang terbukti mahal.
- **D7 Umur URL video (HLS): `2 × durasi`, dengan default 1 jam (disetujui pengguna 16 Oktober 2026).** TTL efektif = `max(2 × durasi, MEDIA_HLS_URL_TTL_SECONDS)`; env baru opsional, **default 3600 detik, rentang 60–604800**. Karena durasi maksimum yang diterima sistem 30 menit, `2 × durasi` tidak pernah melebihi 1 jam, jadi dengan default efektifnya **tepat 1 jam untuk semua video** (video 60 detik: 2 menit → 1 jam). Berlaku untuk playlist/segmen presigned dan `expiresAt` playback; mekanisme pembaruan player yang ada tidak diubah. _Kompromi:_ jendela URL video yang sudah terbit setelah unpublish/archive naik dari ≤ 2× durasi menjadi 1 jam (URL baru tetap diblokir seketika).

Tidak termasuk: mekanisme pembaruan HLS di player (tidak diubah; hanya umurnya, D7), poster katalog (`/catalog/…/poster`, sudah tanpa expiry), thumbnail admin, perubahan format/ukuran poster.

## Desired behavior

- Halaman detail dibiarkan berjam-jam (atau berhari-hari bila tab tetap terbuka): poster tetap terlihat; tidak ada saat poster menjadi skeleton/kosong.
- Saat tab kembali aktif atau jaringan pulih, URL diperbarui diam-diam; gambar tidak berkedip (tukar hanya setelah URL baru termuat).
- Poster player tidak berubah ketika playback diperbarui.
- Jaringan putus: gambar tetap; bila belum pernah termuat tampil fallback dengan retry, lalu pulih otomatis saat online.

## Impact analysis

| Area                            | Perubahan                                                                                                                                                | Risiko                                                                                                                                 |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/api` playback + config    | TTL poster terpisah (`MEDIA_POSTER_URL_TTL_SECONDS`) dan TTL HLS minimum 1 jam (`MEDIA_HLS_URL_TTL_SECONDS`), dipakai `info()`, `poster()`, `playlist()` | URL poster (24 jam) dan video (1 jam) bertahan lebih lama setelah unpublish (D1, D7); validasi env; test yang mengasumsikan `2×durasi` |
| `apps/web` hook/komponen poster | Tulis ulang `usePublicPoster` (pembaruan diam-diam, preload-lalu-tukar, backoff), `PublicPoster`                                                         | Race pembaruan; kebocoran timer; regresi test `public-video-state`                                                                     |
| `apps/web` player               | Poster ditetapkan sekali per pemasangan                                                                                                                  | Poster tertinggal saat sumber berubah (ditangani lewat pemasangan baru)                                                                |
| Docs                            | `docs/guides/environment.md` (env baru, TTL), `docs/operations/media.md`, README, backlog                                                                | —                                                                                                                                      |

## Rencana kerja (backlog POSTER)

1. **POSTER-001** Setujui D1–D6, termasuk nilai TTL default.
2. **POSTER-002** Reproduksi dan baseline di browser dengan jam palsu (Playwright `clock`) pada kode saat ini; disimpan sebagai uji regresi.
3. **POSTER-003** API: TTL poster (24 jam) dan TTL HLS (`max(2×durasi, 1 jam)`) terpisah dan dapat diatur; konstanta kontrak; test unit/HTTP dan dokumentasi env.
4. **POSTER-004** Web: tulis ulang `usePublicPoster`/`PublicPoster` (D2, D3) dan perbarui validasi TTL klien (D5); test state/komponen.
5. **POSTER-005** Web: poster player stabil per pemasangan (D4); test.
6. **POSTER-006** Bukti dan penutupan: skenario POSTER-002 diulang (poster tetap setelah jam dimajukan melewati TTL berkali-kali, tab disembunyikan lalu dikembalikan, offline/online, desktop dan mobile), dokumentasi dan gate penuh.

Dependensi: POSTER-004/005 setelah POSTER-003; POSTER-006 terakhir.

## Validasi

- Unit/HTTP API: umur URL poster = env (60 dtk–7 hari); umur URL HLS = `max(2×durasi, env)` (default 1 jam); kontrak playback; test lama yang mengasumsikan `2×durasi` diperbarui.
- Web: pembaruan diam-diam tidak pernah menghapus gambar; tukar hanya setelah preload berhasil; backoff dan pemicu `visibilitychange`/`focus`/`online`; tidak ada timer yang tersisa saat unmount; fallback hanya bila belum pernah termuat; poster player tidak berubah saat playback diperbarui.
- Browser (Chromium headless, API + worker + MinIO nyata, database/bucket uji, jam palsu): poster detail dan player tetap tampil setelah jam dimajukan melewati beberapa TTL; pembaruan diam-diam tercatat pada jaringan; tidak pernah ada keadaan kosong.
- Gate akhir: `bun run check-types`, `bun run lint`, `bun run build`, `bun run docs:check`.

## Rollout dan batas

Lokal pada branch fitur; push/PR/merge dan rollout produksi memerlukan otorisasi tersendiri. Tanpa migrasi database dan tanpa perubahan gateway. Dua env baru bersifat opsional (poster 24 jam, HLS 1 jam). "Tanpa expired" dicapai di sisi viewer (gambar tidak dilepas, pembaruan diam-diam); URL presigned tetap berumur terbatas oleh protokol (maksimum 7 hari).

## Execution history

- 16 Oktober 2026: context dan plan ditulis; direvisi sesudah klarifikasi pengguna (presigned dipertahankan, rute stabil/ETag dikeluarkan dari scope).
- 16 Oktober 2026: pengguna menyetujui poster 24 jam + gambar tidak dilepas, menetapkan HLS `2×durasi` default 1 jam (D7); D6 tidak dikerjakan. POSTER-001 selesai.
