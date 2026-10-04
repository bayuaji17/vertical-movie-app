# Dashboard content — desktop light

> Status: proposal visual v2 untuk review pengguna · 5 Oktober 2026 · Avatar/dropdown, English UI, Film/Standalone/Series dan pagination disetujui sebagai requirement oleh pengguna. Mockup dibuat oleh Codex melalui built-in image_gen; bukan implementasi atau browser screenshot.

## Scope dan acuan

Acuan: [design system](design-system.md), [plan](../plans/admin-content/implementation-plan.md) dan [backlog](../tasks/admin-content.md). Revisi menggunakan light neutral/lime, Base UI Rhea, Inter/Space Grotesk dan Remixicon. Semua copy UI berbahasa Inggris; dokumentasi developer tetap Bahasa Indonesia. Contoh metadata dan jumlah baris adalah data fiktif. Teks/warna raster diselaraskan kembali dengan semantic source tokens saat implementasi.

## Halaman v2

Lima template halaman tetap dipakai. Namespace frontend generik berikut diusulkan agar Series tidak ditempatkan sebagai video kind; path v1 belum diimplementasikan. Preview existing tetap pada /admin/videos/:id/preview.

| Halaman         | Path frontend yang diusulkan    | Referensi desktop                                                    |
| --------------- | ------------------------------- | -------------------------------------------------------------------- |
| Dashboard       | `/admin`                        | [Dashboard + dropdown terbuka](admin-dashboard-desktop-light-v2.png) |
| Content list    | `/admin/content`                | [List + pagination](admin-content-list-desktop-light-v2.png)         |
| Create draft    | `/admin/content/new`            | [Create + tiga jenis](admin-content-create-desktop-light-v2.png)     |
| Content details | `/admin/content/:type/:id`      | [Details — contoh Film](admin-content-detail-desktop-light-v2.png)   |
| Edit draft      | `/admin/content/:type/:id/edit` | [Edit — contoh Film](admin-content-edit-desktop-light-v2.png)        |

`:type` whitelist film/standalone/series; dispatch resource API tetap video atau series sesuai model. Detail/edit screenshot menggunakan Film untuk meninjau komposisi; perbedaan Series wajib diterapkan pada ADMC-014, bukan dipalsukan sebagai VideoDto. Template frontend dan URL masih proposal; tidak mengubah route existing sekarang.

## Shared shell dan avatar dropdown

Sidebar berisi Dashboard/Content. Footer hanya Log out di kiri bawah. Trigger akun di kanan atas memakai avatar initials AD, nama Admin dan chevron. Avatar/identitas berasal dari sesi saat runtime; initials merupakan fallback jika image tidak tersedia. Dropdown sejajar kanan berisi identitas admin, email dan grup Appearance: Light/Dark/System. Light dipilih dengan ikon/checkmark. Tidak menambah halaman account, billing, upgrade atau notifikasi dari screenshot referensi.

Dashboard menampilkan dropdown terbuka; empat halaman lain menampilkan dropdown tertutup dengan trigger yang sama. Theme switcher hanya di dalam dropdown; tidak ada switcher terpisah di top bar. Akses keyboard, focus return/Escape, accessible name/expanded state dan pilihan tema diperlukan saat implementasi. Header/palette/form tetap konsisten.

Preferensi tema non-rahasia dapat dipersist; default System masih proposal. System mengikuti prefers-color-scheme; bootstrap mencegah flash/hydration mismatch dan perubahan tema tidak membuang form dirty. Metadata/cache/form privat tidak dipersist. Aset ini tidak membuktikan switching runtime, dark atau mobile.

## Content type dan conditional metadata

Pilihan list/create: Film, Standalone, Series; default Film. Film memetakan `movie`, Standalone ke `standalone` pada API videos. Series adalah resource tersendiri pada API series; bukan `kind: series` pada video. Episode tidak menjadi pilihan top-level; season/episode editor, upload serta publication actions tetap tahap berikutnya.

Field editorial bersama tetap title/slug/original title/language/synopsis/description/release year/date/genres. Film/Standalone memiliki rightsConfirmed; Series menggunakan completionStatus (Ongoing/Completed) dan tidak mempunyai source video/rightsConfirmed sendiri. Create Series mengembalikan series + default Season 1 dari API existing. Detail Series mengganti kartu source/rights dengan completion status dan ringkasan Season 1 readonly; tidak menawarkan upload/publish seolah series adalah video. Jenis/resource tidak dapat diubah saat edit. Dirty-navigation dan conflict-reload memakai dua confirmation dialogs yang telah disetujui.

## Pagination dan custom page size

List mengganti Load more dengan Previous/Next, tombol nomor halaman, range serta total hasil filter. Default 10; pilihan yang diusulkan 10/25/50/100, dengan input Custom integer 1–100. Custom yang valid diterapkan melalui Enter/blur; input tidak valid menampilkan inline error dan mempertahankan page size aktif. Perubahan jenis/search/includeArchived/page size kembali ke page 1; URL dan query key memasukkan seluruh parameter. Batas 100 merupakan proposal operasional, bukan angka yang diminta pengguna.

Mockup menampilkan 10 baris, `Showing 1–10 of 42`, page 1 dari 5. Angka hanya contoh. Implementasi memerlukan total/filter dan akses halaman dari server; jangan menghitung total dari page/cursor yang sudah diunduh. API existing hanya mengembalikan items/nextCursor, sehingga ADMC-013 menjadi dependensi listing. Saat data berubah/halaman terakhir kosong, refetch total dan clamp page tanpa mencampur hasil request lama. Empty/error/loading, disabled boundaries dan last-page range perlu diverifikasi.

## Evidence v2

Built-in image_gen dipakai untuk lima edit utama dan dua koreksi avatar. Dashboard memakai v1 + screenshot dropdown dari pengguna; empat halaman memakai aset v1 masing-masing. Screenshot referensi hanya acuan bentuk dropdown; tidak menyalin fitur billing/upgrade. Semua output final diperiksa: English UI, avatar kanan atas, menu tema, Log out kiri bawah, pilihan tiga jenis, 10 baris/pagination/custom serta form jenis readonly saat edit. Kelima PNG 1536 × 1024 piksel, mode 100644; original generator dan lima v1 tetap disimpan. Source aplikasi, API/database dan dependency tidak diubah.

## Prompt set v2

Prompt berikut disimpan verbatim; transparent_background=false, referenced_image_paths sesuai target/referensi di atas.

### dashboard

```text
Use case: ui-mockup / text-localization and precise-object-edit.
Input image 1 is the existing Vertical Movie dashboard edit target. Input image 2 is ONLY a dropdown layout reference from shadcn, not the application to copy. Revise image 1 into a refined English desktop light dashboard, 1536x1024. Preserve the neutral white/lime palette, sidebar width, brand Vertical Movie, icon style, cards, crisp Inter/Space Grotesk typography, hairline borders and page layout.
Shared shell REVISION: sidebar navigation "Dashboard" active and "Content" inactive. REMOVE sidebar account identity block. Keep a single outlined "Log out" button at bottom left. Top bar left breadcrumb "Admin / Dashboard". REMOVE the separate top-right theme switcher. Replace it with a compact rounded account trigger at the extreme top right: circle avatar with initials AD, "Admin", small chevron. The avatar opens a right-aligned dropdown below the header. SHOW THIS DROPDOWN OPEN in this dashboard screenshot, width about 270px, white rounded panel with subtle shadow and hairline border. Dropdown has identity row avatar AD, bold Admin, muted admin@example.test, separator, label "Appearance", and three menu options with outline icons "Light" (sun, selected with checkmark and subtle lime highlight), "Dark" (moon), "System" (monitor). NO account settings/profile edit/billing/subscription/notifications/team/upgrade/logout items in the dropdown. Keep the menu top-right, do not cover essential central dashboard text.
Translate every UI text into natural English, including footer and badges. Dashboard heading "Dashboard"; subtitle "Manage your content metadata in one place."
Welcome panel headline "Welcome back, Admin"; subtitle "Start with a well-organized draft."; body "Create and manage films, standalone videos, and series before uploading."
Two action cards: "Create a new draft", helper "Save the title and initial content metadata.", lime button "+ Create draft"; "Manage content", helper "Find content and update draft metadata.", outlined "View content →".
Lower card "Administrator account": "Name" / Admin, "Email" / admin@example.test, "Role" / Administrator, "Session" / "Active" quiet neutral badge. This card starts below the welcome/action cards as before.
Do not add metrics, statistics, charts, upload controls, posters or publish/archive actions. Reference screenshot's upgrade/billing/account/notifications links are NOT features of this app. Only preserve its menu visual style. All content English. Avatar/dropdown/theme revision must be easy to inspect. Flat app screenshot with no browser chrome.
```

### list

```text
Use case: ui-mockup / text-localization and precise-object-edit. Input image 1 is the existing page EDIT TARGET. Revise it into the requested English desktop light v2. Preserve flat screenshot 1536x1024, white/light neutral surfaces, lime primary, charcoal text, thin borders, Inter/Space Grotesk, Remixicon outline styling, generous gutters, left sidebar width and brand Vertical Movie. Sidebar nav "Dashboard", "Content" (Content active). REMOVE lower sidebar account block, keep only outlined "Log out" at bottom-left. Header right: REMOVE standalone theme switcher. In the upper-right corner place a compact rounded account trigger with AD initials circle avatar, "Admin", chevron. Dropdown is CLOSED on this page; do not show Light/Dark/System outside the menu. It opens identity (Admin, admin@example.test), then Appearance options Light/Dark/System with Light selected; that open state is shown on dashboard asset. Keep trigger identical across pages. ALL UI labels, copy, examples, button text and status text in ENGLISH. No Indonesian text. No extra account/billing/upgrade/notifications features. Do not add uploads/publish/archive/delete, players, posters or charts. Keep full controls/content inside frame.
Page /admin/videos, breadcrumb "Admin / Content". Heading "Content", subtitle "Find and manage films, standalone videos, and series.", lime "+ Create draft". Filter toolbar has three distinct tabs "Film" (selected), "Standalone", "Series"; search "Search content..."; unchecked "Include archived". Keep clean data TABLE. Columns "Title", "Type", "Status", "Updated", "Actions". Render exactly TEN compact rows fitting canvas:
After the Rain / Film / Draft / Oct 5, 2026 / View, Edit
A Day in Bandung / Film / Published / Oct 4, 2026 / View
Before Sunrise / Film / Draft / Oct 4, 2026 / View, Edit
The Same Room / Film / Published / Oct 3, 2026 / View
Waiting for Sunset / Film / Draft / Oct 3, 2026 / View, Edit
The Way Home / Film / Draft / Oct 2, 2026 / View, Edit
Last Train / Film / Draft / Oct 2, 2026 / View, Edit
City Lights / Film / Published / Oct 1, 2026 / View
Small Promises / Film / Draft / Oct 1, 2026 / View, Edit
A Second Chance / Film / Draft / Sep 30, 2026 / View, Edit.
Neutral Draft gray badge; Published white neutral bordered badge, NOT green. REPLACE Load more entirely with table footer pagination. Footer left "Rows per page" followed by compact selector showing "10" and chevron, plus a separate small numeric input labelled "Custom" showing placeholder "1–100". Footer center "Showing 1–10 of 42". Footer right Previous disabled left arrow, page buttons "1" selected subtle lime, "2", "3", "4", "5", Next right arrow. Entire footer is visible and clear. The count is fictional mock data. No global stats, thumbnails or row selection.
```

### create

```text
Use case: ui-mockup / text-localization and precise-object-edit. Input image 1 is the existing page EDIT TARGET. Revise it into the requested English desktop light v2. Preserve flat screenshot 1536x1024, white/light neutral surfaces, lime primary, charcoal text, thin borders, Inter/Space Grotesk, Remixicon outline styling, generous gutters, left sidebar width and brand Vertical Movie. Sidebar nav "Dashboard", "Content" (Content active). REMOVE lower sidebar account block, keep only outlined "Log out" at bottom-left. Header right: REMOVE standalone theme switcher. In the upper-right corner place a compact rounded account trigger with AD initials circle avatar, "Admin", chevron. Dropdown is CLOSED on this page; do not show Light/Dark/System outside the menu. It opens identity (Admin, admin@example.test), then Appearance options Light/Dark/System with Light selected; that open state is shown on dashboard asset. Keep trigger identical across pages. ALL UI labels, copy, examples, button text and status text in ENGLISH. No Indonesian text. No extra account/billing/upgrade/notifications features. Do not add uploads/publish/archive/delete, players, posters or charts. Keep full controls/content inside frame.
Page /admin/videos/new, breadcrumb "Admin / Content / Create draft". Back link "Back to content". Heading "Create draft"; subtitle "Save initial metadata. Video and cover can be added later." Form type control has THREE choices "Film" selected, "Standalone", "Series", identical visual importance. English field labels: "Main information", "Title *", "Slug" empty placeholder "Generated if left empty", "Original title", "Original language", "Synopsis", "Description"; "Additional metadata", "Release year", "Release date", "Genres". Values title "After the Rain", original title "After the Rain", language "en", synopsis "An unexpected meeting after the rain changes two lives.", empty description "Add a content description", year2026, date10/01/2026, genre checkbox chips Drama and Romance selected, Comedy and Thriller unchecked. UNCHECKED "I own the rights to use this content". Right card "About drafts", copy "A title is required. Other metadata can be completed later.", neutral "Draft" badge, "This content is not visible in the public catalog.", inset "Add video and cover in the next stage." Buttons "Cancel", "Save draft". Film selected so video fields are appropriate; Series will use separate series metadata model when selected, not rights/video fields. Do not show Series-specific fields on this Film example. Keep all fields and buttons visible.
```

### detail

```text
Use case: ui-mockup / text-localization and precise-object-edit. Input image 1 is the existing page EDIT TARGET. Revise it into the requested English desktop light v2. Preserve flat screenshot 1536x1024, white/light neutral surfaces, lime primary, charcoal text, thin borders, Inter/Space Grotesk, Remixicon outline styling, generous gutters, left sidebar width and brand Vertical Movie. Sidebar nav "Dashboard", "Content" (Content active). REMOVE lower sidebar account block, keep only outlined "Log out" at bottom-left. Header right: REMOVE standalone theme switcher. In the upper-right corner place a compact rounded account trigger with AD initials circle avatar, "Admin", chevron. Dropdown is CLOSED on this page; do not show Light/Dark/System outside the menu. It opens identity (Admin, admin@example.test), then Appearance options Light/Dark/System with Light selected; that open state is shown on dashboard asset. Keep trigger identical across pages. ALL UI labels, copy, examples, button text and status text in ENGLISH. No Indonesian text. No extra account/billing/upgrade/notifications features. Do not add uploads/publish/archive/delete, players, posters or charts. Keep full controls/content inside frame.
Page /admin/videos/:id, breadcrumb "Admin / Content / After the Rain". Back "Back to content". Main title "After the Rain", subtitle "Content metadata details", quiet badges "Film", "Draft", right lime "Edit metadata". Left card "Content information", rows Title After the Rain; Slug after-the-rain; Original title After the Rain; Synopsis An unexpected meeting after the rain changes two lives.; Description Not added yet; Original language English (en); Release year2026; Release date October 1, 2026; Genres Drama, Romance. Right cards "Content status" with Draft and "Not visible in the public catalog."; "Source video" with "Not uploaded" and "The source video is not available yet. Upload in the next stage."; "Content rights" with "Not confirmed" and "Required before publishing." Audit "Created October 5, 2026" and "Updated October 5, 2026". This detail is a Film example; series separate model is accessible via Content type selection, do not fake source video for series.
```

### edit

```text
Use case: ui-mockup / text-localization and precise-object-edit. Input image 1 is the existing page EDIT TARGET. Revise it into the requested English desktop light v2. Preserve flat screenshot 1536x1024, white/light neutral surfaces, lime primary, charcoal text, thin borders, Inter/Space Grotesk, Remixicon outline styling, generous gutters, left sidebar width and brand Vertical Movie. Sidebar nav "Dashboard", "Content" (Content active). REMOVE lower sidebar account block, keep only outlined "Log out" at bottom-left. Header right: REMOVE standalone theme switcher. In the upper-right corner place a compact rounded account trigger with AD initials circle avatar, "Admin", chevron. Dropdown is CLOSED on this page; do not show Light/Dark/System outside the menu. It opens identity (Admin, admin@example.test), then Appearance options Light/Dark/System with Light selected; that open state is shown on dashboard asset. Keep trigger identical across pages. ALL UI labels, copy, examples, button text and status text in ENGLISH. No Indonesian text. No extra account/billing/upgrade/notifications features. Do not add uploads/publish/archive/delete, players, posters or charts. Keep full controls/content inside frame.
Page /admin/videos/:id/edit, breadcrumb "Admin / Content / Edit draft". Back "Back to details". Heading "Edit draft", subtitle "Update metadata for After the Rain.", quiet "Unsaved changes". Translate ALL labels from existing target into English: Main information, Title*, Slug, Original title, Original language, Synopsis, Description, Additional metadata, Release year, Release date, Genres. Values After the Rain; after-the-rain; After the Rain; en; edited synopsis "In the city rain, two strangers find a reason to begin again."; description placeholder "Add a content description"; year2026; date10/01/2026. Drama and Romance selected; Comedy/Thriller unselected. Rights unchecked label "I own the rights to use this content". READONLY "Content type" Film, helper "Content type cannot be changed." Do not make mutable type selector in edit. Right card "Editing a draft", badge Draft, "Changes are saved when you select Save changes."; helper "Changing the title does not change the slug."; note "If a conflict occurs, your input is preserved." Footer "Discard changes" and "Save changes". Preserve all important form fields; compact layout entirely inside screen.
```

## Prompt koreksi v2

### Avatar dashboard

```text
Use case: ui-mockup / precise-object-edit. Input image1 is edit target. Change ONLY account trigger presentation in the upper-right header: enclose existing AD circle avatar, Admin text and down chevron together in one compact white rounded rectangle with thin light-gray border matching the established 160x48px control. Change BOTH AD circle backgrounds (header trigger and dropdown identity) from pale lime to pale neutral gray. Preserve their dark text. Keep the OPEN dropdown, its placement/content and selected Light row lime highlight exactly. Keep all other English page content, left sidebar, Log out button, palette, canvas, text and layout unchanged. No new items.
```

### Avatar create

```text
Use case: ui-mockup / precise-object-edit. Input image1 is edit target. Change ONLY the AD circle avatar background in the upper-right account trigger from pale lime to pale neutral gray. Keep dark AD text, Admin, chevron and the thin-bordered rounded account trigger unchanged. Preserve every form field, English text, Film/Standalone/Series selector, selected Film, unchecked rights, sidebar, Log out button, canvas and light palette exactly. No other changes.
```

## Riwayat v1

V1 berbahasa Indonesia, dua jenis dan Load more; requirement tersebut diganti v2 di atas. Aset dipertahankan sebagai sejarah: [dashboard](admin-dashboard-desktop-light-v1.png), [list](admin-content-list-desktop-light-v1.png), [create](admin-content-create-desktop-light-v1.png), [detail](admin-content-detail-desktop-light-v1.png), [edit](admin-content-edit-desktop-light-v1.png). Evidence pembuatan v1 ada pada ADMC-DES-001.

### Historical prompt set v1

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

### Historical corrections v1

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
