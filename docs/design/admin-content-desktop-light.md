# Dashboard konten — desktop light

> Status: proposal visual untuk review pengguna · 5 Oktober 2026 · Dibuat oleh Codex menggunakan built-in image generation. Permintaan pengguna: desain desktop light untuk seluruh lima halaman, dengan theme switcher. Bukan implementasi aplikasi atau hasil browser screenshot.

## Scope dan acuan

Acuan: [design system](design-system.md), [plan metadata](../plans/admin-content/implementation-plan.md) dan [backlog](../tasks/admin-content.md). Gunakan Base UI Rhea, semantic light neutral/lime, Inter/Space Grotesk, Remixicon dan whitespace yang konsisten. Mockup memakai data contoh; teks/font/warna raster menjadi referensi komposisi dan harus diselaraskan dengan source tokens saat implementasi.

## Halaman

| Halaman       | Path frontend            | Referensi desktop                                   |
| ------------- | ------------------------ | --------------------------------------------------- |
| Dashboard     | `/admin`                 | [Dashboard](admin-dashboard-desktop-light-v1.png)   |
| Daftar konten | `/admin/videos`          | [Daftar](admin-content-list-desktop-light-v1.png)   |
| Buat draft    | `/admin/videos/new`      | [Buat](admin-content-create-desktop-light-v1.png)   |
| Detail konten | `/admin/videos/:id`      | [Detail](admin-content-detail-desktop-light-v1.png) |
| Edit draft    | `/admin/videos/:id/edit` | [Edit](admin-content-edit-desktop-light-v1.png)     |

Sidebar hanya Dashboard/Konten; identitas akun serta Keluar tetap pada footer. Header dan theme switcher berada pada posisi yang sama. Form memiliki dua kolom utama: metadata dan guidance/status, dengan seluruh informasi penting terbaca pada desktop. Daftar tanpa thumbnail/count global/status filter; detail memisahkan status editorial dari source availability.

## Theme switcher

Permintaan theme switcher dicatat sebagai requirement shared shell. Kontrol menunjukkan tiga pilihan Light (matahari), Dark (bulan) dan System (monitor); Light aktif pada semua mockup ini. Ikon Dark/System memerlukan accessible label/tooltip saat implementasi; bukan ikon dekoratif tanpa nama. Pilihan tersedia pada seluruh halaman admin dan bukan field metadata konten.

Behavior yang diusulkan untuk task runtime ADMC-012: pilihan eksplisit persisted sebagai preferensi non-rahasia browser, System mengikuti prefers-color-scheme, bootstrap sebelum hydration mencegah flash dan perubahan tema tidak membuang input form. Default awal aplikasi diusulkan System jika belum ada preferensi; visual yang diminta sekarang secara eksplisit Light. Theme preference boleh disimpan, private cache/metadata/form tetap tidak dipersist ke localStorage. Tema dark penuh dan mobile akan dibuat setelah review desain desktop light; aset tahap ini tidak membuktikan implementasi dark/mobile.

## Batas alur dan modal

Draft memerlukan judul; field lain boleh kosong. Form create/edit merupakan halaman penuh. Jenis immutable saat edit. Belum ada upload/publish/archive action dalam desain iterasi metadata; source tersedia juga bukan readiness HLS.

Dua penggunaan AlertDialog yang disetujui pengguna: meninggalkan dirty form dan memuat versi terbaru sesudah conflict. Modal diposisikan sebagai overlay terpusat dengan judul/deskripsi, aksi aman default dan focus management. Screenshot utama menunjukkan halaman normal tanpa overlay agar seluruh konten dapat direview. Toast/inline error mengikuti design system, bukan modal sukses.

## Evidence dan hasil

Lima aset final dibuat melalui built-in image_gen: lima call utama dan tiga koreksi terarah. Dashboard dibuat dahulu; empat halaman memakai dashboard sebagai reference shell. Koreksi terakhir menetralkan badge Terbit pada daftar, mengganti badge Draft menjadi Draf pada form buat, dan menyederhanakan penjelasan sumber video pada detail. Semua hasil final diperiksa secara visual: sidebar/header/theme control konsisten, Light aktif, field form lengkap dan aksi sesuai scope metadata. Kelima PNG berukuran 1536 × 1024 piksel; semuanya memakai data contoh. Tidak menjalankan implementasi/browser app, install dependencies atau API/database writes untuk menghasilkan mockup.

## Prompt set

Prompt disimpan verbatim agar arah visual dapat diulang. image_gen transparent_background=false; empat turunan memakai dashboard desktop sebagai referenced_image_paths. Output built-in disalin ke docs/design; original generator tetap disimpan.

### Dashboard

```text
Use case: ui-mockup.
Asset type: high-fidelity desktop web app design screenshot for Vertical Movie admin, light theme first.
Canvas: one flat straight-on full desktop screen, landscape approximately 1536x1024 pixels. Render clean crisp readable real Indonesian UI, not a wireframe, no device mockup, no browser chrome, no collage or explanatory annotations outside UI.
Shared visual system: polished shadcn Base UI Rhea, white/neutral surfaces, faint gray page background #FAFAFA, subtle #E5E5E5 hairline borders, charcoal text, bright lime primary oklch(0.841 0.238 128.85) with dark olive button text. Inter UI text and Space Grotesk headings. Restrained 14/18/24px corners, spacious 4px grid, thin Remixicon outline icons, minimal shadows. A mature product interface with excellent hierarchy and readable typography, no decorative gradients.
Shared shell: fixed full-height 232px left sidebar, small lime rounded square play logo and brand "Vertical Movie", small "ADMIN" section label, only navigation "Dashboard" with home icon and "Konten" with film icon; footer "Admin" and "admin@example.test", outlined "Keluar" with logout icon. Main top bar 72px with contextual breadcrumb left. Theme switcher at upper right as a compact clearly visible rounded segmented control with SUN / MOON / MONITOR icons corresponding to Light / Dark / System. Sun is selected and visibly labelled "Light"; moon and monitor have clear line icons. The same switcher and shell must appear on every page. Do not add team switchers, notifications, search-command bar, analytics, public site settings or navigation items not specified.
Typography: natural Indonesian text, exact important labels supplied below, no lorem ipsum. Use generous space, balanced density and realistic form/control dimensions. All values are fictional examples. Keep controls and page content fully inside the frame.
Page: Dashboard, path /admin. Sidebar Dashboard active in a pale lime row; Konten inactive. Top bar breadcrumb "Admin / Dashboard".
Content: page heading "Dashboard", supporting text "Kelola metadata konten Anda dari satu tempat."
A large understated pale lime welcome panel, LEFT headline "Selamat datang, Admin", subtitle "Mulai dari draf yang rapi.", short copy "Buat dan kelola movie serta video standalone sebelum proses unggah.", small outlined film icon motif on right, no photos.
Below welcome, two equal elegant white action cards. Card 1 film-plus outline icon, title "Buat draft baru", description "Simpan judul dan metadata awal konten.", lime button "+ Buat draft". Card 2 stacked-film outline icon, title "Kelola konten", description "Temukan konten dan perbarui metadata draft.", outlined button "Lihat konten →".
Lower white bordered card "Akun administrator", two-column key/value rows: "Nama" / "Admin", "Email" / "admin@example.test", "Peran" / "Administrator", "Sesi" / "Aktif" with a neutral subtle badge. Enough natural white space below; no database IDs or session secrets.
Crucial exclusions: no numeric totals, no stats cards, no charts, no revenue/watchers, no video posters, no upload/transcode progress, no publish/archive action buttons. This iteration is metadata-only.
```

### Daftar konten

```text
Use case: ui-mockup.
Asset type: high-fidelity desktop web app design screenshot for Vertical Movie admin, light theme first.
Canvas: one flat straight-on full desktop screen, landscape approximately 1536x1024 pixels. Render clean crisp readable real Indonesian UI, not a wireframe, no device mockup, no browser chrome, no collage or explanatory annotations outside UI.
Shared visual system: polished shadcn Base UI Rhea, white/neutral surfaces, faint gray page background #FAFAFA, subtle #E5E5E5 hairline borders, charcoal text, bright lime primary oklch(0.841 0.238 128.85) with dark olive button text. Inter UI text and Space Grotesk headings. Restrained 14/18/24px corners, spacious 4px grid, thin Remixicon outline icons, minimal shadows. A mature product interface with excellent hierarchy and readable typography, no decorative gradients.
Shared shell: fixed full-height 232px left sidebar, small lime rounded square play logo and brand "Vertical Movie", small "ADMIN" section label, only navigation "Dashboard" with home icon and "Konten" with film icon; footer "Admin" and "admin@example.test", outlined "Keluar" with logout icon. Main top bar 72px with contextual breadcrumb left. Theme switcher at upper right as a compact clearly visible rounded segmented control with SUN / MOON / MONITOR icons corresponding to Light / Dark / System. Sun is selected and visibly labelled "Light"; moon and monitor have clear line icons. The same switcher and shell must appear on every page. Do not add team switchers, notifications, search-command bar, analytics, public site settings or navigation items not specified.
Typography: natural Indonesian text, exact important labels supplied below, no lorem ipsum. Use generous space, balanced density and realistic form/control dimensions. All values are fictional examples. Keep controls and page content fully inside the frame.
Input image 1: edit target and exact shell/style reference. Transform this dashboard screenshot into the page below. Preserve exact canvas proportions, same left sidebar width, header height, brand, sidebar footer account/logout, neutral/lime palette, font treatment, borders and upper-right Light/Dark/System segmented theme switcher with Light selected. Change only active navigation, breadcrumb and main page content. Konten is active and Dashboard inactive. One complete desktop screenshot; no collage.
Page: Konten, path /admin/videos. Breadcrumb "Admin / Konten". Main heading "Konten", subtitle "Temukan dan kelola metadata movie serta standalone." Header right lime "+ Buat draft".
Below heading, a full-width white bordered card with filter toolbar: left segmented "Film" selected, "Standalone" unselected; a wide search input with magnifier and placeholder "Cari judul konten..."; right unchecked checkbox "Sertakan arsip". Clear deliberate spacing. A simple clean shadcn data table, NOT thumbnail grid. Columns "Judul", "Jenis", "Status", "Diperbarui", "Aksi". Six fictional film rows with readable titles and optionally tiny genre line below:
"Langit Setelah Hujan" / "Film" / "Draf" / "5 Okt 2026" / "Detail" and "Edit";
"Satu Hari di Bandung" / "Film" / "Terbit" / "4 Okt 2026" / "Detail";
"Pulang Sebelum Pagi" / "Film" / "Draf" / "4 Okt 2026" / "Detail" and "Edit";
"Ruang yang Sama" / "Film" / "Terbit" / "3 Okt 2026" / "Detail";
"Menunggu Senja" / "Film" / "Draf" / "3 Okt 2026" / "Detail" and "Edit";
"Jalan Kembali" / "Film" / "Draf" / "2 Okt 2026" / "Detail" and "Edit".
Quiet neutral badges for editorial states, subtle separators and aligned compact actions. Footer a centered outlined "Muat lagi" button. No numbered pages, no total count, no sorting arrows, no status filter or archive-only tab. No fabricated HLS "Siap" badges or source thumbnails, no delete action. Keep bottom whitespace intentional.
```

### Buat draft

```text
Use case: ui-mockup.
Asset type: high-fidelity desktop web app design screenshot for Vertical Movie admin, light theme first.
Canvas: one flat straight-on full desktop screen, landscape approximately 1536x1024 pixels. Render clean crisp readable real Indonesian UI, not a wireframe, no device mockup, no browser chrome, no collage or explanatory annotations outside UI.
Shared visual system: polished shadcn Base UI Rhea, white/neutral surfaces, faint gray page background #FAFAFA, subtle #E5E5E5 hairline borders, charcoal text, bright lime primary oklch(0.841 0.238 128.85) with dark olive button text. Inter UI text and Space Grotesk headings. Restrained 14/18/24px corners, spacious 4px grid, thin Remixicon outline icons, minimal shadows. A mature product interface with excellent hierarchy and readable typography, no decorative gradients.
Shared shell: fixed full-height 232px left sidebar, small lime rounded square play logo and brand "Vertical Movie", small "ADMIN" section label, only navigation "Dashboard" with home icon and "Konten" with film icon; footer "Admin" and "admin@example.test", outlined "Keluar" with logout icon. Main top bar 72px with contextual breadcrumb left. Theme switcher at upper right as a compact clearly visible rounded segmented control with SUN / MOON / MONITOR icons corresponding to Light / Dark / System. Sun is selected and visibly labelled "Light"; moon and monitor have clear line icons. The same switcher and shell must appear on every page. Do not add team switchers, notifications, search-command bar, analytics, public site settings or navigation items not specified.
Typography: natural Indonesian text, exact important labels supplied below, no lorem ipsum. Use generous space, balanced density and realistic form/control dimensions. All values are fictional examples. Keep controls and page content fully inside the frame.
Input image 1: edit target and exact shell/style reference. Transform this dashboard screenshot into the page below. Preserve exact canvas proportions, same left sidebar width, header height, brand, sidebar footer account/logout, neutral/lime palette, font treatment, borders and upper-right Light/Dark/System segmented theme switcher with Light selected. Change only active navigation, breadcrumb and main page content. Konten is active and Dashboard inactive. One complete desktop screenshot; no collage.
Page: Buat draft, path /admin/videos/new. Breadcrumb "Admin / Konten / Buat draft". Top content small back link "← Kembali ke konten", heading "Buat draft", supporting text "Simpan metadata awal. Video dan sampul dapat ditambahkan nanti."
Main content uses a wide left form card (around two thirds) and a narrow right guidance/status card. Fit all fields and bottom actions visibly inside the desktop canvas with compact 40px inputs and tidy two-column rows. Field sections: "Informasi utama" and "Metadata tambahan", medium readable labels, white subtle-bordered rounded inputs and pale optional helper text. Include title/slug two-column row, original title/language two-column row, synopsis textarea about 64px high, description textarea about 72px high, release year/date two-column row, genre selection and rights checkbox. Do not include upload pickers, posters, a video player, publication buttons, JSON, database IDs or backend version/debug information.
At top of main form "Jenis konten" with Film selected / Standalone unselected pill toggle.
Use exact fields and example values: "Judul *" / "Langit Setelah Hujan"; "Slug" / empty placeholder "Otomatis jika dikosongkan"; "Judul asli" / "After the Rain"; "Bahasa asli" / "id"; "Sinopsis" / "Pertemuan tak terduga setelah hujan mengubah perjalanan dua orang."; "Deskripsi" / empty with placeholder "Tambahkan deskripsi konten"; "Tahun rilis" / "2026"; "Tanggal rilis" / "01/10/2026"; "Genre" checkbox chips Drama and Romansa checked, Komedi and Thriller unchecked; rights checkbox UNCHECKED with label "Saya memiliki hak untuk menggunakan konten ini".
Right guidance white card title "Tentang draft", text "Judul wajib diisi.", then "Metadata lainnya dapat dilengkapi nanti.", divider, simple neutral Draft badge and helper "Konten belum tampil di katalog publik." Pale inset note "Unggah video dan sampul pada tahap berikutnya." Do not create actual upload buttons.
Bottom actions aligned right below form: outlined "Batalkan", bright lime "Simpan draft". No validation-error overlay or modal in this normal screen.
```

### Detail konten

```text
Use case: ui-mockup.
Asset type: high-fidelity desktop web app design screenshot for Vertical Movie admin, light theme first.
Canvas: one flat straight-on full desktop screen, landscape approximately 1536x1024 pixels. Render clean crisp readable real Indonesian UI, not a wireframe, no device mockup, no browser chrome, no collage or explanatory annotations outside UI.
Shared visual system: polished shadcn Base UI Rhea, white/neutral surfaces, faint gray page background #FAFAFA, subtle #E5E5E5 hairline borders, charcoal text, bright lime primary oklch(0.841 0.238 128.85) with dark olive button text. Inter UI text and Space Grotesk headings. Restrained 14/18/24px corners, spacious 4px grid, thin Remixicon outline icons, minimal shadows. A mature product interface with excellent hierarchy and readable typography, no decorative gradients.
Shared shell: fixed full-height 232px left sidebar, small lime rounded square play logo and brand "Vertical Movie", small "ADMIN" section label, only navigation "Dashboard" with home icon and "Konten" with film icon; footer "Admin" and "admin@example.test", outlined "Keluar" with logout icon. Main top bar 72px with contextual breadcrumb left. Theme switcher at upper right as a compact clearly visible rounded segmented control with SUN / MOON / MONITOR icons corresponding to Light / Dark / System. Sun is selected and visibly labelled "Light"; moon and monitor have clear line icons. The same switcher and shell must appear on every page. Do not add team switchers, notifications, search-command bar, analytics, public site settings or navigation items not specified.
Typography: natural Indonesian text, exact important labels supplied below, no lorem ipsum. Use generous space, balanced density and realistic form/control dimensions. All values are fictional examples. Keep controls and page content fully inside the frame.
Input image 1: edit target and exact shell/style reference. Transform this dashboard screenshot into the page below. Preserve exact canvas proportions, same left sidebar width, header height, brand, sidebar footer account/logout, neutral/lime palette, font treatment, borders and upper-right Light/Dark/System segmented theme switcher with Light selected. Change only active navigation, breadcrumb and main page content. Konten is active and Dashboard inactive. One complete desktop screenshot; no collage.
Page: Detail konten, path /admin/videos/:id. Breadcrumb "Admin / Konten / Langit Setelah Hujan". Small back link "← Kembali ke konten". Main heading "Langit Setelah Hujan", secondary text "Detail metadata konten", neutral badges "Film" and "Draf", right prominent lime pencil-icon button "Edit metadata".
Main two-column layout: wide left white bordered "Informasi konten" read-only card, narrow right stacked status cards. Main metadata fields neatly grouped with subtle separators, no form inputs:
"Judul" = "Langit Setelah Hujan";
"Slug" = "langit-setelah-hujan";
"Judul asli" = "After the Rain";
"Sinopsis" = "Pertemuan tak terduga setelah hujan mengubah perjalanan dua orang.";
"Deskripsi" = "Belum ditambahkan";
"Bahasa asli" = "Indonesia (id)";
"Tahun rilis" = "2026";
"Tanggal rilis" = "1 Oktober 2026";
"Genre" = two small chips "Drama", "Romansa".
Right top card "Status konten", badge "Draf", helper "Belum tampil di katalog publik." Second card "Sumber video", neutral simple file icon, label "Belum diunggah", helper "Ketersediaan sumber berbeda dari kesiapan HLS." No video/poster imagery or controls. Third card "Hak konten", plain label "Belum dikonfirmasi", helper "Diperlukan sebelum publikasi." At bottom quiet audit text "Dibuat 5 Oktober 2026" and "Diperbarui 5 Oktober 2026". No publish/archive/delete/preview button on source-not-uploaded draft.
```

### Edit draft

```text
Use case: ui-mockup.
Asset type: high-fidelity desktop web app design screenshot for Vertical Movie admin, light theme first.
Canvas: one flat straight-on full desktop screen, landscape approximately 1536x1024 pixels. Render clean crisp readable real Indonesian UI, not a wireframe, no device mockup, no browser chrome, no collage or explanatory annotations outside UI.
Shared visual system: polished shadcn Base UI Rhea, white/neutral surfaces, faint gray page background #FAFAFA, subtle #E5E5E5 hairline borders, charcoal text, bright lime primary oklch(0.841 0.238 128.85) with dark olive button text. Inter UI text and Space Grotesk headings. Restrained 14/18/24px corners, spacious 4px grid, thin Remixicon outline icons, minimal shadows. A mature product interface with excellent hierarchy and readable typography, no decorative gradients.
Shared shell: fixed full-height 232px left sidebar, small lime rounded square play logo and brand "Vertical Movie", small "ADMIN" section label, only navigation "Dashboard" with home icon and "Konten" with film icon; footer "Admin" and "admin@example.test", outlined "Keluar" with logout icon. Main top bar 72px with contextual breadcrumb left. Theme switcher at upper right as a compact clearly visible rounded segmented control with SUN / MOON / MONITOR icons corresponding to Light / Dark / System. Sun is selected and visibly labelled "Light"; moon and monitor have clear line icons. The same switcher and shell must appear on every page. Do not add team switchers, notifications, search-command bar, analytics, public site settings or navigation items not specified.
Typography: natural Indonesian text, exact important labels supplied below, no lorem ipsum. Use generous space, balanced density and realistic form/control dimensions. All values are fictional examples. Keep controls and page content fully inside the frame.
Input image 1: edit target and exact shell/style reference. Transform this dashboard screenshot into the page below. Preserve exact canvas proportions, same left sidebar width, header height, brand, sidebar footer account/logout, neutral/lime palette, font treatment, borders and upper-right Light/Dark/System segmented theme switcher with Light selected. Change only active navigation, breadcrumb and main page content. Konten is active and Dashboard inactive. One complete desktop screenshot; no collage.
Page: Edit draft, path /admin/videos/:id/edit. Breadcrumb "Admin / Konten / Edit draft". Small back link "← Kembali ke detail". Heading "Edit draft", supporting text "Perbarui metadata Langit Setelah Hujan.", small neutral indicator "Perubahan belum disimpan".
Main content uses a wide left form card (around two thirds) and a narrow right guidance/status card. Fit all fields and bottom actions visibly inside the desktop canvas with compact 40px inputs and tidy two-column rows. Field sections: "Informasi utama" and "Metadata tambahan", medium readable labels, white subtle-bordered rounded inputs and pale optional helper text. Include title/slug two-column row, original title/language two-column row, synopsis textarea about 64px high, description textarea about 72px high, release year/date two-column row, genre selection and rights checkbox. Do not include upload pickers, posters, a video player, publication buttons, JSON, database IDs or backend version/debug information.
Use same structure as create page for continuity. "Jenis konten" read-only badge "Film" with helper "Jenis konten tidak dapat diubah."; do NOT show a mutable Film/Standalone toggle. Exact field labels: "Judul *", "Slug", "Judul asli", "Bahasa asli", "Sinopsis", "Deskripsi", "Tahun rilis", "Tanggal rilis", "Genre".
Values: title "Langit Setelah Hujan"; slug "langit-setelah-hujan"; original title "After the Rain"; language "id"; synopsis edited value "Di tengah hujan kota, dua orang menemukan alasan untuk memulai kembali."; description empty placeholder "Tambahkan deskripsi konten"; release year "2026"; date "01/10/2026"; selected genre chips Drama and Romansa with Komedi/Thriller unselected. UNCHECKED rights checkbox "Saya memiliki hak untuk menggunakan konten ini".
Right white guidance card "Mengedit draft", neutral Draf badge, short text "Perubahan tersimpan setelah Anda memilih Simpan perubahan."; divider, helper "Judul tidak otomatis mengubah slug.", then inset subtle note "Saat terjadi konflik, input Anda tetap dipertahankan." No raw version numbers/expectedVersion/debug fields or conflict modal in this normal screen.
Footer outlined "Batalkan perubahan" and lime "Simpan perubahan". Preserve source not-uploaded state and do not introduce upload/publish/archive actions.
```

## Prompt koreksi akhir

Tiga koreksi memakai screenshot halaman terkait sebagai referenced_image_paths; dashboard dan edit memakai output awal sebagai aset final.

### Koreksi akhir — list

```text
Use case: ui-mockup / precise-object-edit. Input image 1 is the edit target. Change ONLY the two "Terbit" status badges: use a white/translucent card background with thin light-gray border and charcoal text/dot, a quiet neutral published badge consistent with the existing design system. Keep "Draf" badges gray, all text/table rows/controls/layout/theme switcher/sidebar/canvas unchanged. Do not alter data or add controls. Keep complete desktop light screen and all five-page shared design invariants intact. This is a tiny correction, not a redesign.
```

### Koreksi akhir — create

```text
Use case: ui-mockup / precise-object-edit. Input image 1 is the edit target. Change ONLY the right guidance card status badge text from "Draft" to the exact Indonesian word "Draf" (D-r-a-f). Preserve all other text, fields, checkbox states, positions, buttons, full screenshot, shared sidebar, theme switcher and light palette exactly. Keep complete desktop light screen and all five-page shared design invariants intact. This is a tiny correction, not a redesign.
```

### Koreksi akhir — detail

```text
Use case: ui-mockup / precise-object-edit. Input image 1 is the edit target. Change ONLY the helper copy beneath "Belum diunggah" in the Sumber video card to two readable lines: "Video sumber belum tersedia." and "Unggah pada tahap berikutnya." Remove the technical HLS helper sentence. Keep all other content/cards/data/layout/theme switcher/sidebar/canvas exactly unchanged. Keep complete desktop light screen and all five-page shared design invariants intact. This is a tiny correction, not a redesign.
```
