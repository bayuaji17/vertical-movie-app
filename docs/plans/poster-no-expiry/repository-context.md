# Repository context: poster video tanpa waktu kedaluwarsa

## Snapshot

- Repository: `bayuaji17/vertical-movie-app`.
- Base ref: `main`; SHA yang diperiksa: `568e877` (sesudah PR #31–#34).
- Analyzed at: 16 Oktober 2026 (Asia/Jakarta).
- Context status: snapshot perencanaan pada SHA di atas; periksa freshness sebelum implementasi.
- Request: pengguna melaporkan bahwa poster/thumbnail video seharusnya tidak punya waktu expired; gambar yang tampil kepada viewer menjadi **kosong** bila halaman dibiarkan lama (16 Oktober 2026). Klarifikasi pengguna (16 Oktober 2026): **presigned URL tidak dipermasalahkan**; yang diinginkan adalah gambar yang sudah tampil tidak pernah kedaluwarsa/hilang. Penyebab di bawah berasal dari pembacaan kode; **belum direproduksi di browser** (task POSTER-002 membuktikannya lebih dulu).

## Observed behavior

Poster ditampilkan lewat dua jalur yang berbeda:

| Jalur                                                                                                                                                                                  | Dipakai di                                                                                                                              | Kedaluwarsa?                                                                                                                                                   |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /catalog/:kind/:id/poster` (`CatalogPosterService`): API men-stream WebP, same-origin lewat gateway `/api/catalog/…/poster`                                                       | Kartu katalog, Featured, Browse, dialog detail, detail Series (`components/catalog/poster.tsx`)                                         | **Tidak**. `Cache-Control: private, no-store`; kegagalan hanya memunculkan `poster-fallback.svg`.                                                              |
| URL **presigned** ke storage (`native.presign(...poster.webp, {expiresIn: ttl})`) dari `GET /videos/:slug/poster` (`PlaybackService.poster`) dan `GET /videos/:slug/playback` (`info`) | Poster halaman detail Film/Standalone (`public-poster.tsx` → `usePublicPoster`) dan poster `<video>` pada player (`playback.posterUrl`) | **Ya**. `ttl = ceil(durasi × 2 / 1000)` detik (`shared/media-readiness.ts`): video 60 detik → URL hidup **120 detik**; paling lama 1 jam untuk video 30 menit. |

Rantai yang membuat gambar kosong pada jalur kedua:

1. `PublicPoster` memakai `usePublicPoster` (`hooks/use-public-poster.ts`). Hook menyetel timer ke `expiresAt` paket poster; saat timer berbunyi ia melakukan `setPacket(null)` **sehingga `<img>` dilepas** dari DOM. Hanya satu pembaruan otomatis yang diizinkan (`automatic.current < 1`); pada kedaluwarsa kedua tampilan menjadi "Cover unavailable" + tombol "Retry cover". Jadi halaman yang dibiarkan beberapa kali TTL (menit untuk video pendek) kehilangan gambar — itu perilaku terprogram, bukan kegagalan jaringan.
2. Klien memvalidasi bahwa `expiresAt` tidak lebih dari `2 × durasi + 30 detik` (`lib/public/catalog-client.ts`), sehingga TTL pendek adalah bagian dari kontrak, bukan kebetulan.
3. Poster `<video>` memakai `playback.posterUrl` (`components/vertical-video-player.tsx`) yang ikut kedaluwarsa bersama playback. Pembaruan playback hanya berjalan saat video sedang **diputar** (timer `renew` mensyaratkan `!paused`), jadi pada player yang diam URL poster mati; URL baru juga mengubah `src` poster sehingga gambar dimuat ulang (kedip) setiap pembaruan.
4. Presigned URL itu sendiri tidak salah (dipertahankan atas arahan pengguna). Masalahnya ada dua: **umur URL terikat durasi video** (terlalu pendek untuk sebuah gambar) dan **klien menghapus gambar yang sudah tampil** ketika URL berakhir. Browser sebenarnya menahan bitmap gambar yang sudah dimuat selama `src`-nya tidak berubah dan elemennya tidak dilepas; hanya pengambilan **baru** yang memerlukan URL yang masih hidup.
5. Catatan keamanan yang sudah disepakati sebelumnya (`docs/guides/environment.md`): archive memblokir URL baru, URL yang sudah diterbitkan bertahan sampai expiry-nya. Memperpanjang umur URL **poster** memperpanjang jendela itu hanya untuk poster (bukan HLS), dan poster yang sama sudah dapat diambil anonim lewat `/catalog/…/poster` selama konten published.

Jalur lain (tidak berubah oleh pekerjaan ini): thumbnail admin `GET /admin/content/:type/:id/cover` (ETag, `max-age=300`, tidak memakai URL bertanda tangan) dan segmen HLS (URL presigned per segmen dengan pembaruan playback yang sudah ada — kedaluwarsa di sana disengaja).

## Repository map (bagian relevan)

| Area                                                                                                                                                                          | Peran                                                                                                     |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `apps/api/src/modules/playback/{service,index}.ts`, `shared/media-readiness.ts`                                                                                               | `info()` dan `poster()` yang membuat URL presigned + `expiresAt`; rute `/videos/:slug/{playback,poster}`. |
| `apps/api/src/modules/catalog/{poster-service,index}.ts`                                                                                                                      | Streaming WebP aman (`readWebpObject`, batas 5 MB, RIFF/WEBP) tanpa expiry; pola yang akan dipakai ulang. |
| `apps/api/src/modules/content/cover-service.ts`                                                                                                                               | Pola ETag/304 + cache privat singkat tanpa URL bertanda tangan (thumbnail admin).                         |
| `apps/web/src/hooks/use-public-poster.ts`, `lib/public/poster-state.ts`, `components/public/public-poster.tsx`, `lib/public/catalog-client.ts`, `lib/public/catalog-model.ts` | Antrean poster, paket bertanda tangan, timer kedaluwarsa, validasi TTL.                                   |
| `apps/web/src/components/vertical-video-player.tsx`, `lib/catalog/content-client.ts`                                                                                          | Poster `<video>` dari `playbackInfoSchema.posterUrl`, validasi URL poster.                                |
| `apps/web/src/lib/server/auth-gateway.ts`, `business-gateway.ts`, `tooling/catalog-poster-dev.ts`                                                                             | Allowlist route gambar, batas ukuran, cache header, workaround Nitro dev untuk `Sec-Fetch-Dest: image`.   |
| `docs/operations/media.md`, `docs/plans/public-content-watch/`, `docs/plans/watch-flow/`                                                                                      | Kontrak playback/poster dan keputusan sebelumnya yang harus diperbarui.                                   |

## Constraints dari repo

- Visibilitas publik: hanya konten published + `ready` + profil storage aktif yang boleh dilayani ke anonim (`CatalogStore`, `playbackReadiness`/`posterReadiness`); unpublish/archive harus berlaku paling lama dalam TTL cache katalog (60 detik).
- Route gambar pada gateway adalah allowlist eksak per path (`isPublicCatalogPoster`, `isAdminContentCover`): batas ukuran, tipe `image/webp`, status yang dikenal, dan cache header hanya untuk path itu; Vite dev memerlukan workaround `Sec-Fetch-Dest: image` per path.
- Kontrak API privat memakai TypeBox/Eden type-only; perubahan bentuk respons playback harus memperbarui skema web (`playbackInfoSchema`) dan test kontrak.
- Teks UI Inggris, target sentuh ≥ 44 px, gambar harus punya fallback yang terlihat (bukan area kosong).
- Evidence browser memakai Playwright headless di luar repo dengan database/bucket uji (pola DEL-007/CTBL-010).

## Gaps, risks, dan pertanyaan terbuka

- Kekeliruan hipotesis: bila reproduksi (POSTER-002) menunjukkan penyebab lain (mis. cache browser atau lazy-load), plan direvisi sebelum kode berubah.
- Episode tidak masuk indeks `home` katalog; rute poster `catalog` saat ini hanya untuk `movie|standalone|series`. Poster episode memerlukan rute yang memeriksa kesiapan playback (bukan home).
- Batas protokol: presigned SigV4 (S3/MinIO/R2) berumur paling lama 7 hari (604800 detik); "tanpa expired" secara harfiah hanya dapat dicapai oleh klien yang tidak membuang gambar dan memperbarui URL di latar belakang.
- Tab di latar belakang menunda timer; pembaruan latar belakang tidak boleh diandalkan pada waktu tepat (harus juga dipicu `visibilitychange`, `focus`, dan `online`).
- Browser menyimpan gambar presigned berdasarkan URL lengkap (termasuk tanda tangan); URL baru berarti unduhan baru. Kuantisasi waktu kedaluwarsa (URL identik dalam satu jendela) dapat dipertimbangkan tetapi bukan syarat.
