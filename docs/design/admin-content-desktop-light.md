# Dashboard content — desktop light dan dark

> Status: desain desktop/mobile light/dark disetujui pengguna 5 Oktober 2026; dashboard metadata kini diimplementasikan. Raster mockup tetap artefak desain, bukan screenshot runtime. Evidence implementasi pada [backlog](../tasks/admin-content.md).

## Scope dan acuan

Pasangan [desain mobile light/dark](admin-content-mobile.md) tersedia untuk lima halaman yang sama.

Acuan: [design system](design-system.md), [plan](../plans/admin-content/implementation-plan.md) dan [backlog](../tasks/admin-content.md). Revisi menggunakan light neutral/lime, Base UI Rhea, Inter/Space Grotesk dan Remixicon. Semua copy UI berbahasa Inggris; dokumentasi developer tetap Bahasa Indonesia. Contoh metadata dan jumlah baris adalah data fiktif. Teks/warna raster diselaraskan kembali dengan semantic source tokens saat implementasi.

## Halaman v2

Lima template halaman tetap dipakai. Namespace frontend generik berikut diterapkan agar Series tidak ditempatkan sebagai video kind; namespace v1 sudah digantikan. Preview existing tetap pada /admin/videos/:id/preview.

| Halaman         | Path frontend aktif             | Referensi desktop                                                    |
| --------------- | ------------------------------- | -------------------------------------------------------------------- |
| Dashboard       | `/admin`                        | [Dashboard + dropdown terbuka](admin-dashboard-desktop-light-v2.png) |
| Content list    | `/admin/content`                | [List + pagination](admin-content-list-desktop-light-v2.png)         |
| Create draft    | `/admin/content/new`            | [Create + tiga jenis](admin-content-create-desktop-light-v2.png)     |
| Content details | `/admin/content/:type/:id`      | [Details — contoh Film](admin-content-detail-desktop-light-v2.png)   |
| Edit draft      | `/admin/content/:type/:id/edit` | [Edit — contoh Film](admin-content-edit-desktop-light-v2.png)        |

`:type` whitelist film/standalone/series; dispatch resource API tetap video atau series sesuai model. Detail/edit screenshot menggunakan Film untuk meninjau komposisi; perbedaan Series wajib diterapkan pada ADMC-014, bukan dipalsukan sebagai VideoDto. Template frontend dan URL telah diterapkan pada iterasi metadata; daftar kontrak/resource tetap mengikuti plan canonical.

## Shared shell dan avatar dropdown

Sidebar berisi Dashboard/Content. Footer hanya Log out di kiri bawah. Trigger akun di kanan atas memakai avatar initials AD, nama Admin dan chevron. Avatar/identitas berasal dari sesi saat runtime; initials merupakan fallback jika image tidak tersedia. Dropdown sejajar kanan berisi identitas admin, email dan grup Appearance: Light/Dark/System. Light dipilih dengan ikon/checkmark. Tidak menambah halaman account, billing, upgrade atau notifikasi dari screenshot referensi.

Dashboard menampilkan dropdown terbuka; empat halaman lain menampilkan dropdown tertutup dengan trigger yang sama. Theme switcher hanya di dalam dropdown; tidak ada switcher terpisah di top bar. Akses keyboard, focus return/Escape, accessible name/expanded state dan pilihan tema runtime dibuktikan pada ADMC-011. Header/palette/form tetap konsisten.

Preferensi tema non-rahasia dapat dipersist; default System diterapkan pada iterasi metadata. System mengikuti prefers-color-scheme; bootstrap mencegah flash/hydration mismatch dan perubahan tema tidak membuang form dirty. Metadata/cache/form privat tidak dipersist. Dark tersedia sebagai pasangan raster pada bagian di bawah; aset tidak membuktikan switching runtime atau mobile.

## Content type dan conditional metadata

Pilihan list/create: Film, Standalone, Series; default Film. Film memetakan `movie`, Standalone ke `standalone` pada API videos. Series adalah resource tersendiri pada API series; bukan `kind: series` pada video. Episode tidak menjadi pilihan top-level; season/episode editor, upload serta publication actions tetap tahap berikutnya.

Field editorial bersama tetap title/slug/original title/language/synopsis/description/release year/date/genres. Film/Standalone memiliki rightsConfirmed; Series menggunakan completionStatus (Ongoing/Completed) dan tidak mempunyai source video/rightsConfirmed sendiri. Create Series mengembalikan series + default Season 1 dari API existing. Detail Series mengganti kartu source/rights dengan completion status dan ringkasan Season 1 readonly; tidak menawarkan upload/publish seolah series adalah video. Jenis/resource tidak dapat diubah saat edit. Dirty-navigation dan conflict-reload memakai dua confirmation dialogs yang telah disetujui.

## Pagination dan custom page size

List mengganti Load more dengan Previous/Next, tombol nomor halaman, range serta total hasil filter. Default 10; pilihan 10/25/50/100, dengan input Custom integer 1–100. Custom yang valid diterapkan melalui Enter/blur; input tidak valid menampilkan inline error dan mempertahankan page size aktif. Perubahan jenis/search/includeArchived/page size kembali ke page 1; URL dan query key memasukkan seluruh parameter. Batas 100 mengikuti rencana teknis yang disetujui pengguna; bukan limit media.

Mockup menampilkan 10 baris, `Showing 1–10 of 42`, page 1 dari 5. Angka hanya contoh. Implementasi memerlukan total/filter dan akses halaman dari server; jangan menghitung total dari page/cursor yang sudah diunduh. API cursor existing tetap items/nextCursor; GET /admin/content pada ADMC-013 menyediakan numbered totals. Saat data berubah/halaman terakhir kosong, refetch total dan clamp page tanpa mencampur hasil request lama. Empty/error/loading, disabled boundaries dan last-page range perlu diverifikasi.

## Evidence v2

Built-in image_gen dipakai untuk lima edit utama dan dua koreksi avatar. Dashboard memakai v1 + screenshot dropdown dari pengguna; empat halaman memakai aset v1 masing-masing. Screenshot referensi hanya acuan bentuk dropdown; tidak menyalin fitur billing/upgrade. Semua output final diperiksa: English UI, avatar kanan atas, menu tema, Log out kiri bawah, pilihan tiga jenis, 10 baris/pagination/custom serta form jenis readonly saat edit. Kelima light-v2 PNG 1536 × 1024 piksel, mode 100644; pada saat ADMC-DES-002, original generator dan lima v1 masih disimpan. V1 dihapus pada ADMC-DES-003 sesuai permintaan pengguna. Source aplikasi, API/database dan dependency tidak diubah.

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

## Desktop dark v2

Permintaan pengguna 5 Oktober 2026: hapus versi lama lalu buat dark mode dari desain v2. Lima light-v1 PNG dan prompt v1 dihapus dari worktree; riwayat tetap tersedia di Git commit ADMC-DES-001/002. Light v2 dipertahankan sebagai desain terbaru/pasangan dark, bukan aset superseded. Canonical ini mencakup kedua tema.

| Halaman         | Referensi dark                                                   |
| --------------- | ---------------------------------------------------------------- |
| Dashboard       | [Dark + dropdown terbuka](admin-dashboard-desktop-dark-v2.png)   |
| Content list    | [Dark list + pagination](admin-content-list-desktop-dark-v2.png) |
| Create draft    | [Dark create](admin-content-create-desktop-dark-v2.png)          |
| Content details | [Dark details](admin-content-detail-desktop-dark-v2.png)         |
| Edit draft      | [Dark edit](admin-content-edit-desktop-dark-v2.png)              |

Palet mengikuti [design system dark](design-system.md): background/sidebar #1E201E, card/popover #272A27, muted/input #303430, border #424842, foreground #F3F5F3 dan supporting text #A8B0A8; primary lime dari token dark. Welcome/selected states memakai dark olive tint; badge Draft/Published tetap netral. Dashboard memilih Dark di dalam Appearance, sementara empat halaman lainnya mempertahankan dropdown closed. English, Film/Standalone/Series, Log out kiri bawah, pagination/custom dan seluruh metadata mengikuti light v2. Mockup raster tidak membuktikan nilai piksel token persis, contrast audit numerik, switching runtime atau mobile.

Built-in image_gen memakai lima edit utama dengan light v2 sebagai referenced_image_paths, ditambah satu koreksi badge Draft pada detail; transparent_background=false. Kelima final output diinspeksi: semua field/copy English, layout/menu/avatar, logout, pagination/10 rows/custom, conditional badges/checkbox dan dark surfaces sesuai scope. Kelima PNG 1536 × 1024 piksel/mode100644 tersimpan di docs/design. Hasil dokumen/commit mengikuti receipt ADMC-DES-003. Ini inspeksi mockup, bukan browser runtime/contrast audit.

## Prompt set dark v2

### Dark dashboard

```text
Use case: ui-mockup / precise-object-edit.
Input image1 is the exact English desktop light v2 page EDIT TARGET. Convert ONLY its colors into the approved Vertical Movie DARK THEME. Preserve identical 1536x1024 canvas, layout, geometry, gutters, sidebar/header width/height, account avatar trigger at upper right, bottom-left Log out, every English label/example/field/button, typography, icons, page controls and selected states. Flat high-fidelity screenshot; no browser chrome, no device frame.
Dark semantic palette: background and sidebar #1E201E charcoal; card/popover/header elevated #272A27; muted/secondary/input #303430; hairline borders #424842; foreground #F3F5F3; supporting text #A8B0A8. Primary lime oklch(0.768 0.233 130.85), with dark olive/dark readable text on solid lime buttons. Selected navigation/tabs/chips use subtle dark olive lime tint, readable light/lime foreground, NOT glaring white/pale-light backgrounds. Inputs use dark gray fill, dark borders, white values and readable muted placeholder. All status badges use neutral dark surfaces and white text; Published remains neutral outlined, not green. Avatar circle neutral dark gray with light AD text. Transparent/outline buttons dark surfaces, light text, visible borders. NO white cards, light-background fields or light gray panels.
No redesign, no new fields/actions, no deleted content, no light switcher in header, no change in metadata/rights/state, no extra controls. Ensure comfortable dark contrast throughout. Retain english spelling and all exact copy. This is recoloring of the provided page, not a different design.
Dashboard: dropdown REMAINS OPEN at top right. Identity Admin/admin@example.test, Appearance options Light/Dark/System. Change selected theme from Light to DARK: Dark row uses subtle dark lime selection and checkmark; Light row unselected; System unselected. Welcome panel becomes understated dark olive tint #303C24 with light heading and muted light body, NOT bright pale lime. Preserve all dashboard action/account cards and exact content. No change in layout.
```

### Dark list

```text
Use case: ui-mockup / precise-object-edit.
Input image1 is the exact English desktop light v2 page EDIT TARGET. Convert ONLY its colors into the approved Vertical Movie DARK THEME. Preserve identical 1536x1024 canvas, layout, geometry, gutters, sidebar/header width/height, account avatar trigger at upper right, bottom-left Log out, every English label/example/field/button, typography, icons, page controls and selected states. Flat high-fidelity screenshot; no browser chrome, no device frame.
Dark semantic palette: background and sidebar #1E201E charcoal; card/popover/header elevated #272A27; muted/secondary/input #303430; hairline borders #424842; foreground #F3F5F3; supporting text #A8B0A8. Primary lime oklch(0.768 0.233 130.85), with dark olive/dark readable text on solid lime buttons. Selected navigation/tabs/chips use subtle dark olive lime tint, readable light/lime foreground, NOT glaring white/pale-light backgrounds. Inputs use dark gray fill, dark borders, white values and readable muted placeholder. All status badges use neutral dark surfaces and white text; Published remains neutral outlined, not green. Avatar circle neutral dark gray with light AD text. Transparent/outline buttons dark surfaces, light text, visible borders. NO white cards, light-background fields or light gray panels.
No redesign, no new fields/actions, no deleted content, no light switcher in header, no change in metadata/rights/state, no extra controls. Ensure comfortable dark contrast throughout. Retain english spelling and all exact copy. This is recoloring of the provided page, not a different design.
Content list: exactly ten rows, Film/Standalone/Series tabs with Film selected; Include archived unchecked. Preserve row titles/actions/status, ten rows and pagination footer: Rows per page10, Custom1–100, Showing1–10 of42, numbered1..5 with page1active and disabled previous arrow. Avatar dropdown stays CLOSED; theme is Dark but no visible standalone theme control.
```

### Dark create

```text
Use case: ui-mockup / precise-object-edit.
Input image1 is the exact English desktop light v2 page EDIT TARGET. Convert ONLY its colors into the approved Vertical Movie DARK THEME. Preserve identical 1536x1024 canvas, layout, geometry, gutters, sidebar/header width/height, account avatar trigger at upper right, bottom-left Log out, every English label/example/field/button, typography, icons, page controls and selected states. Flat high-fidelity screenshot; no browser chrome, no device frame.
Dark semantic palette: background and sidebar #1E201E charcoal; card/popover/header elevated #272A27; muted/secondary/input #303430; hairline borders #424842; foreground #F3F5F3; supporting text #A8B0A8. Primary lime oklch(0.768 0.233 130.85), with dark olive/dark readable text on solid lime buttons. Selected navigation/tabs/chips use subtle dark olive lime tint, readable light/lime foreground, NOT glaring white/pale-light backgrounds. Inputs use dark gray fill, dark borders, white values and readable muted placeholder. All status badges use neutral dark surfaces and white text; Published remains neutral outlined, not green. Avatar circle neutral dark gray with light AD text. Transparent/outline buttons dark surfaces, light text, visible borders. NO white cards, light-background fields or light gray panels.
No redesign, no new fields/actions, no deleted content, no light switcher in header, no change in metadata/rights/state, no extra controls. Ensure comfortable dark contrast throughout. Retain english spelling and all exact copy. This is recoloring of the provided page, not a different design.
Create draft: Film/Standalone/Series radio choices with Film selected; every metadata field/genre remains, Drama/Romance selected, rights checkbox UNCHECKED. Preserve About drafts card and all text, Cancel/Save draft. Dropdown CLOSED.
```

### Dark detail

```text
Use case: ui-mockup / precise-object-edit.
Input image1 is the exact English desktop light v2 page EDIT TARGET. Convert ONLY its colors into the approved Vertical Movie DARK THEME. Preserve identical 1536x1024 canvas, layout, geometry, gutters, sidebar/header width/height, account avatar trigger at upper right, bottom-left Log out, every English label/example/field/button, typography, icons, page controls and selected states. Flat high-fidelity screenshot; no browser chrome, no device frame.
Dark semantic palette: background and sidebar #1E201E charcoal; card/popover/header elevated #272A27; muted/secondary/input #303430; hairline borders #424842; foreground #F3F5F3; supporting text #A8B0A8. Primary lime oklch(0.768 0.233 130.85), with dark olive/dark readable text on solid lime buttons. Selected navigation/tabs/chips use subtle dark olive lime tint, readable light/lime foreground, NOT glaring white/pale-light backgrounds. Inputs use dark gray fill, dark borders, white values and readable muted placeholder. All status badges use neutral dark surfaces and white text; Published remains neutral outlined, not green. Avatar circle neutral dark gray with light AD text. Transparent/outline buttons dark surfaces, light text, visible borders. NO white cards, light-background fields or light gray panels.
No redesign, no new fields/actions, no deleted content, no light switcher in header, no change in metadata/rights/state, no extra controls. Ensure comfortable dark contrast throughout. Retain english spelling and all exact copy. This is recoloring of the provided page, not a different design.
Details: preserve all metadata and three right cards Content status/Source video/Content rights, badges Film/Draft, Not uploaded/Not confirmed, audit text, Edit metadata button. Dropdown CLOSED. No new source preview or publication action.
```

### Dark edit

```text
Use case: ui-mockup / precise-object-edit.
Input image1 is the exact English desktop light v2 page EDIT TARGET. Convert ONLY its colors into the approved Vertical Movie DARK THEME. Preserve identical 1536x1024 canvas, layout, geometry, gutters, sidebar/header width/height, account avatar trigger at upper right, bottom-left Log out, every English label/example/field/button, typography, icons, page controls and selected states. Flat high-fidelity screenshot; no browser chrome, no device frame.
Dark semantic palette: background and sidebar #1E201E charcoal; card/popover/header elevated #272A27; muted/secondary/input #303430; hairline borders #424842; foreground #F3F5F3; supporting text #A8B0A8. Primary lime oklch(0.768 0.233 130.85), with dark olive/dark readable text on solid lime buttons. Selected navigation/tabs/chips use subtle dark olive lime tint, readable light/lime foreground, NOT glaring white/pale-light backgrounds. Inputs use dark gray fill, dark borders, white values and readable muted placeholder. All status badges use neutral dark surfaces and white text; Published remains neutral outlined, not green. Avatar circle neutral dark gray with light AD text. Transparent/outline buttons dark surfaces, light text, visible borders. NO white cards, light-background fields or light gray panels.
No redesign, no new fields/actions, no deleted content, no light switcher in header, no change in metadata/rights/state, no extra controls. Ensure comfortable dark contrast throughout. Retain english spelling and all exact copy. This is recoloring of the provided page, not a different design.
Edit draft: preserve Unsaved changes and immutable Film content type, every field/genre/date/rights checkbox UNCHECKED, Editing a draft guidance and Discard changes/Save changes. Dropdown CLOSED. All fields and bottom buttons fit the original canvas.
```

## Prompt koreksi dark

Koreksi status detail menggunakan output dark detail awal sebagai referenced_image_paths.

```text
Use case: ui-mockup / precise-object-edit. Input image1 is the edit target, the completed Vertical Movie DARK detail screenshot. Change ONLY the small "Draft" badge immediately below the main title next to the "Film" badge. Its background is currently olive green; replace with neutral dark gray #303430 and white #F3F5F3 text, matching the neutral Draft badge in the right Content status card. Leave the right status badge unchanged. Preserve every other color, text, geometry, cards, metadata, controls, avatar, sidebar, Log out, full 1536x1024 canvas and dark palette exactly. No redesign, no other changes.
```

## Screenshot runtime — acceptance 5 Oktober 2026

Contoh daftar konten pada build Bun/Nitro: [light desktop](admin-content-implemented-light-desktop.png) dan [dark desktop](admin-content-implemented-dark-desktop.png). Data berasal dari fixture test PostgreSQL; account/title/total bukan data production. Semua lima template diuji pada lima lebar viewport dan dua tema; rincian flow/proof/batas dimiliki backlog ADMC-011. Screenshot ini berbeda dari mockup AI di atas. Kartu sambutan memakai bg-card standar setelah ukuran kontras teks pada tinted surface sedikit di bawah 4,5:1; palette/token approved tetap dipertahankan.
