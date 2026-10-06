# Homepage dan katalog publik

> Status: **Usulan visual v1 — belum disetujui sebagai UX produk** · 7 Oktober 2026 · Pemilik keputusan: pengguna; pembuat mockup: Codex. Snapshot source `313e31a14891ac0f91265a3557576b44791309d7`.

## Tujuan dan acuan

Beranda yang membantu pengunjung menemukan Film, Series dan Standalone published tanpa akun. Acuan: [PRD-07/08 dan keputusan katalog terbuka](../product/prd.md#keputusan-produk-yang-masih-terbuka), [aturan publik](../product/global-rules.md), [design system](design-system.md) dan token runtime `apps/web/src/styles.css`.

Mockup memakai light neutral/lime, Inter/Space Grotesk dan sampul portrait 9:16. Copy English mengikuti mockup admin terbaru. Semua judul, foto, genre, durasi dan jumlah episode adalah fixture fiktif. Ini permintaan desain; tidak mengubah route homepage atau player.

## Usulan tata letak

Desktop: header brand/Home/Browse/search/appearance; judul editorial singkat; satu featured Film; toolbar jenis/genre; enam poster satu baris; Load more dan footer minimal. Mobile: header compact, search satu baris penuh, feature ringkas dengan thumbnail portrait di samping informasi, filter jenis, katalog dua kolom dan Load more. Mockup mobile menampilkan dua judul awal; desktop enam. Ini contoh jumlah kartu, bukan kontrak page size API. Konten dapat memanjang secara alami; tidak dipaksa muat satu viewport.

Film/Standalone membuka detail/tonton; Series mengarah ke detail series/daftar episode. Poster Series memakai jumlah episode, bukan durasi total. Tidak menampilkan status editorial atau data admin.

Featured placement, search, filter jenis/genre, urutan katalog dan tujuan navigasi adalah usulan untuk review pengguna. DTO katalog saat snapshot hanya menerima limit/cursor; API video/series terpisah. Pencarian/filter maupun featured selection memerlukan keputusan dan task implementasi tersendiri. Episode tidak dijanjikan sebagai kartu top-level terpisah.

## Artefak

- [Desktop light v1](home-catalog-desktop-light-v1.png) dan [prompt termasuk koreksi](home-catalog-desktop-light-v1.prompt.md).
- [Mobile light v1](home-catalog-mobile-light-v1.png) dan [prompt termasuk refinement](home-catalog-mobile-light-v1.prompt.md).

Built-in image_gen; tidak memakai CLI/API key. Desktop melalui generasi awal dan dua koreksi layout; mobile melalui draft panjang dan refinement feature/page size. Original generator dipertahankan; final disalin ke worktree proyek. Mockup lama [homepage light](homepage-light-shadcn.prompt.md) adalah histori individual-video dan tidak menjadi spesifikasi saat ini.

## Validasi dan batas

Review visual, lokasi artefak dan pemeriksaan dokumentasi dicatat pada [HOMEDES-001](../tasks/home-catalog-design.md). Raster bukan bukti rasio CSS presisi, keyboard/focus, target sentuh, kontras numerik atau responsivitas runtime. Dark mode dan state loading/empty/error dapat dirancang setelah arah dasar direview.
