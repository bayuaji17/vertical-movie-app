# Homepage dan katalog publik

> Status: **Arah visual v1 disetujui pengguna — tahap FE dummy direncanakan, belum implemented** · Persetujuan 7 Oktober 2026 · Pemilik keputusan: pengguna; pembuat mockup/plan: Codex. Snapshot generasi source `313e31a14891ac0f91265a3557576b44791309d7` tetap historis.

## Tujuan dan acuan

Beranda yang membantu pengunjung menemukan Film, Series dan Standalone published tanpa akun. Acuan: [PRD-07/08 dan keputusan katalog terbuka](../product/prd.md#keputusan-produk-yang-masih-terbuka), [aturan publik](../product/global-rules.md), [design system](design-system.md) dan token runtime `apps/web/src/styles.css`.

Mockup memakai light neutral/lime, Inter/Space Grotesk dan sampul portrait 9:16. Copy English mengikuti mockup admin terbaru. Semua judul, foto, genre, durasi dan jumlah episode adalah fixture fiktif. Ini permintaan desain; tidak mengubah route homepage atau player.

## Usulan tata letak

Desktop: header brand/Home/Browse/search/appearance; judul editorial singkat; satu featured Film; toolbar jenis/genre; enam poster satu baris; Load more dan footer minimal. Mobile: header compact, search satu baris penuh, feature ringkas dengan thumbnail portrait di samping informasi, filter jenis, katalog dua kolom dan Load more. Mockup mobile menampilkan dua judul awal; desktop enam. Ini contoh jumlah kartu, bukan kontrak page size API. Konten dapat memanjang secara alami; tidak dipaksa muat satu viewport.

Film/Standalone membuka detail/tonton; Series mengarah ke detail series/daftar episode. Poster Series memakai jumlah episode, bukan durasi total. Tidak menampilkan status editorial atau data admin.

Grid, featured placement serta search/filter adalah arah visual yang disetujui pengguna 7 Oktober 2026. Semantik interaksi, jumlah fixture/batch dan CTA dummy dijabarkan untuk review pada [implementation plan](../plans/home-catalog/implementation-plan.md); bukan seluruh detail runtime dianggap disetujui melalui raster. DTO katalog saat snapshot hanya menerima limit/cursor; API video/series terpisah. Integrasi API/featured selection nyata menjadi tahap lanjutan. Episode tidak dijanjikan sebagai kartu top-level terpisah.

## Keputusan tahap frontend — 7 Oktober 2026

Pengguna meminta fokus FE dengan dummy JSON dan belum memakai API. [Context](../plans/home-catalog/repository-context.md), [plan detail](../plans/home-catalog/implementation-plan.md) dan [backlog HOMEFE](../tasks/home-catalog.md) menjadi pemilik rincian implementasi. Usulan default: 18 fixture items, batch enam tanpa perbedaan SSR/mobile, detail dialog lokal dan CTA View film. Refinement pengguna 7 Oktober 2026 memakai useInfiniteQuery TanStack Query, queryFn JSON lokal dan Load more manual; detail caching/SSR/page contract berada pada plan. Dua kartu pada raster mobile hanya contoh tampilan; source fixture tetap sama di semua viewport. Playback/real published data bukan hasil tahap ini.

## Artefak

- [Desktop light v1](home-catalog-desktop-light-v1.png) dan [prompt termasuk koreksi](home-catalog-desktop-light-v1.prompt.md).
- [Mobile light v1](home-catalog-mobile-light-v1.png) dan [prompt termasuk refinement](home-catalog-mobile-light-v1.prompt.md).

Built-in image_gen; tidak memakai CLI/API key. Desktop melalui generasi awal dan dua koreksi layout; mobile melalui draft panjang dan refinement feature/page size. Original generator dipertahankan; final disalin ke worktree proyek. Mockup lama [homepage light](homepage-light-shadcn.prompt.md) adalah histori individual-video dan tidak menjadi spesifikasi saat ini.

## Validasi dan batas

Review visual, lokasi artefak dan pemeriksaan dokumentasi dicatat pada [HOMEDES-001](../tasks/home-catalog-design.md). Raster bukan bukti rasio CSS presisi, keyboard/focus, target sentuh, kontras numerik atau responsivitas runtime. Dark mode dan state loading/empty/error dapat dirancang setelah arah dasar direview.

## Poster fixture lokal — HOMEFE-002, 7 Oktober 2026

Enam foto dibuat terpisah dengan ImageGen, memakai mockup approved sebagai referensi fotografi. Prompt tiap scene meminta satu foto sinematik portrait 9:16 tanpa teks/logo/UI, lighting natural, grain halus dan warna hangat. Original generated image dipertahankan; copy PNG digunakan di public/images/catalog. Dua belas judul tambahan menggunakan ulang enam gambar ini.

| Asset                   | Scene prompt                                                                                                                                                                                                                     | Original generation                                                                                                         |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `after-the-rain.png`    | two Indonesian young adults sit together at a glass bus shelter on rainy evening, restrained candid connection, amber street lamps reflected on wet pavement, dark jackets and beige coat, wide enough to see full seated bodies | `C:\Users\bayua\.codex\generated_images\01a11282-df54-74b1-abf1-4b66162aa357\exec-ec5a8e74-ee42-4c8e-9c57-2ba612ec62e1.png` |
| `the-last-train.png`    | Indonesian woman carrying a suitcase beside a passenger train on a platform at dusk, peach violet sunset, quiet mystery, full body                                                                                               | `C:\Users\bayua\.codex\generated_images\01a11282-df54-74b1-abf1-4b66162aa357\exec-c0714218-6d40-4447-beed-8640c9194fa2.png` |
| `a-small-beginning.png` | Indonesian woman tends lush potted plants by apartment window, morning light, soft city skyline, intimate hopeful everyday moment                                                                                                | `C:\Users\bayua\.codex\generated_images\01a11282-df54-74b1-abf1-4b66162aa357\exec-5baa31b5-3a7e-4b97-84cc-42b02dbcb15b.png` |
| `letters-to-home.png`   | Indonesian woman reading a handwritten letter at rustic countryside window, green fields outside, soft golden daylight, letter has no legible writing                                                                            | `C:\Users\bayua\.codex\generated_images\01a11282-df54-74b1-abf1-4b66162aa357\exec-13adee55-026c-4e25-9b8b-dd4cf100396e.png` |
| `midnight-kitchen.png`  | two Indonesian male friends cooking together in cozy kitchen at night, amber hanging pendant lamps, smiling candid moment, hands working on cutting board                                                                        | `C:\Users\bayua\.codex\generated_images\01a11282-df54-74b1-abf1-4b66162aa357\exec-8a659926-6c83-4880-9c37-c4c11b8d5278.png` |
| `city-in-motion.png`    | rear view Indonesian cyclist riding toward Jakarta skyline on calm morning city street, soft hazy light, blue and warm neutral tones                                                                                             | `C:\Users\bayua\.codex\generated_images\01a11282-df54-74b1-abf1-4b66162aa357\exec-3c35197a-f27c-4d92-b1e6-fae54a3b68d8.png` |

Semua output native PNG 941×1672 (rasio 0.5628, mendekati 9:16), telah dilihat satu per satu; enam scene sesuai dan tidak mengandung UI. Penyesuaian teknis terhadap ukuran source plan: output native dipertahankan tanpa resize/crop, sedangkan frame CSS menggunakan exact 9:16 + object-cover. Selisih lebar native dari rasio tepat hanya 0.5 pixel. Hero eager, kartu lazy, dimensi reservasi 900×1600, fallback SVG lokal 900×1600. Batas fallback satu perpindahan source mencegah retry loop.

Tidak ada external CDN atau network image service pada runtime. Native copy menjaga file regular; permission 100644 diverifikasi melalui Git. Browser rasio/failed-image proof ditutup di HOMEFE-009.
