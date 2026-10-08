# Katalog publik Film/Standalone — PCAT-002

> Status: **disetujui pengguna; implementasi runtime berlangsung** · 8 Oktober 2026 · plan yang dipilih: `chore/public-catalog-plan` pada `68a0053`; runtime baseline main `65127a1`, working branch `feat/public-catalog`. Pengguna menyetujui desain dengan “ok, setuju”; bukan bukti API/HLS production.

## Artefak review

[Preview HTML interaktif](public-catalog-preview.html) memakai CSS semantic tokens yang disalin dari `apps/web/src/styles.css`, Inter/Space Grotesk dan enam artwork lokal existing. Review controls di luar product viewport memilih 1440×900 atau 390×844, Light/Dark/System, Browse/Detail/Watch dan states. Data20 kartu adalah fixture desain; tidak dibaca dari API atau dipakai production components. Tidak membutuhkan raster baru dari imagegen karena layout dibuat langsung dalam HTML/CSS dengan artwork existing.

| Layar  | Desktop light                                     | Desktop dark                                     | Mobile light                                     | Mobile dark                                     |
| ------ | ------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------ | ----------------------------------------------- |
| Browse | [PNG](public-catalog-home-desktop-light-v1.png)   | [PNG](public-catalog-home-desktop-dark-v1.png)   | [PNG](public-catalog-home-mobile-light-v1.png)   | [PNG](public-catalog-home-mobile-dark-v1.png)   |
| Detail | [PNG](public-catalog-detail-desktop-light-v1.png) | [PNG](public-catalog-detail-desktop-dark-v1.png) | [PNG](public-catalog-detail-mobile-light-v1.png) | [PNG](public-catalog-detail-mobile-dark-v1.png) |

PNG menampilkan first viewport; grid20 dapat discroll, Load more berada sesudah grid. HTML adalah owner ukuran/layout/state; screenshot bukan full-page proof.

## Browse dan detail

Header brand/Browse/Appearance memakai theme existing; tidak membaca account/admin session. Browse heading, copy “Find your next story.”, All/Films/Standalone dan grid portrait9:16. Desktop5 kolom, medium3, mobile2; kartu menampilkan title, Film/Standalone dan durasi, tanpa genre/release date yang tidak ada pada legacy DTO. Empty, error, stale dan cover failure memakai teks/action, bukan warna saja. Target kontrol44px; ring fokus semantic.

Kartu membuka detail dengan context jenis; Watch now menuju watch dengan context yang sama. Back menjaga filter. Proposal URL `/?type=all|film|standalone`, `/videos/$slug?type=...`, `/watch/$slug?type=...`; preview memakai query tambahan untuk kontrol review, bukan kontrak runtime. Unknown type dinormalisasi all. Scroll restoration production memakai Router/Query sesuai plan, bukan dianggap terbukti oleh prototype.

Desktop detail menempatkan cover360×640 kiri dan title/type/duration/synopsis/Watch now kanan. Mobile memprioritaskan judul, metadata, sinopsis dan Watch now sebelum poster full-width agar intent dapat diakses tanpa melewati cover tinggi. Konten panjang dapat discroll dan tidak dipotong; poster tidak distretch. Cover error tidak memblokir title/navigation.

Watch design memakai identity/title/type/duration/back dan stage9:16. Implementasi akan mereuse player/skin Video.js existing, tanpa autoplay atau auto-next baru. Prototype stage adalah representasi state, **tidak memuat video/audio/HLS**. Play pada prototype hanya memperlihatkan recovery state untuk review.

## State matrix dan copy

| State             | Copy / action                                                                          | Perilaku target                                                      |
| ----------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Initial pending   | Loading videos… / Loading video…                                                       | Reserved9:16 skeleton; tanpa fixture fallback dalam production.      |
| Empty all         | No videos yet / Check back soon for more stories.                                      | Bukan network error atau katalog dummy.                              |
| Empty filtered    | No videos in this category / Browse all                                                | Reset filter eksplisit.                                              |
| First-page error  | Could not load videos / Retry                                                          | Tidak menampilkan hasil filter lama sebagai current.                 |
| Load more pending | Loading…                                                                               | Kartu existing tetap; append skeleton dan serialized action.         |
| Load more error   | More videos could not be loaded. Your current videos are still here. / Retry load more | Cursor yang sama; belum menjadi cursor/API proof dalam prototype.    |
| Stale metadata    | Showing previously loaded videos. Refresh to see the latest. / Refresh                 | Snapshot display-only; actual refresh mulai traversal baru.          |
| Cover failed      | Cover unavailable / Retry cover                                                        | Fallback/title usable; bounded renewal menurut kontrak yang dipilih. |
| Missing/archived  | Video unavailable / Back to browse                                                     | Missing/hidden sama; dependency503 tetap separate error.             |
| Offline           | You are offline. Reconnect to load more stories. / Retry                               | Tidak antre mutation, Watch intent disabled pada detail.             |
| Playback expired  | Playback interrupted / Retry playback                                                  | Actual player single-inflight refresh/seek preservation direuse.     |

## Keputusan desain yang disetujui

Current main approved implementation memiliki Movie/Standalone/Series, search/genre, page6/publishedAt, filter state lokal, `/titles/$kind/$slug`, dan binary private poster. Plan yang dipilih pengguna mengusulkan scope Film/Standalone, page20/createdAt, URL filter, `/videos/$slug`, dan signed poster DTO. Prototype memperlihatkan scope visual **plan yang dipilih**, tidak menghapus current Series/search/genre atau mengganti kontrak runtime.

Pengguna menyetujui Film/Standalone, grid20/Load more, URL type, detail `/videos/$slug`, English dan noindex/nofollow sementara pada alur baru. Implementasi berlangsung sesuai DAG; API/rute Series dan direct episode watch existing tetap compatible. Cache fence, unsigned SSR, public client dan player identity guards direuse. Kebijakan indexing jangka panjang tetap keputusan produk terpisah. Lihat [freshness context](../plans/public-catalog/repository-context.md#freshness-untuk-plan-yang-dipilih-pengguna) dan [plan](../plans/public-catalog/implementation-plan.md).

## Evidence dan batas

Command/results prototype/browser/docs serta local commit dicatat pada [PCAT-002](../tasks/public-catalog.md#task-pcat-002--spesifikasi-dan-desain-katalogdetailwatch). Pengguna menyetujui desain pada 8 Oktober 2026 dengan “ok, setuju”. Preview tidak membuktikan SQL/cursor, SSR hydration production, access/archive, signed expiry, networking atau playback nyata. Bukti WHOOK/API/PCW sebelumnya tetap evidence dari task/runtime masing-masing.
