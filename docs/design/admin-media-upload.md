# Admin media upload — desktop dan mobile light/dark

> Status: **empat mockup disetujui pengguna** · 5 Oktober 2026. Approval eksplisit pengguna: “oke approve”. ADUP-006 Done; uploader runtime belum diimplementasikan.

## Scope dan acuan

Referensi: [plan disetujui](../plans/admin-media-upload/implementation-plan.md), [backlog ADUP](../tasks/admin-media-upload.md), [design system](design-system.md), [detail desktop existing](admin-content-desktop-light.md), [detail mobile existing](admin-content-mobile.md) dan [PRD](../product/prd.md#sumber-video-dan-sampul).

Tambahkan section **Upload media** pada detail draft `/admin/content/:type/:id`, di bawah metadata. Tidak menambah halaman. Film/Standalone menerima source+cover; Series hanya cover. Metadata, route preview HLS existing dan jenis resource tetap authoritative. Copy produk English; dokumentasi developer Bahasa Indonesia. Nama konten, status, ukuran/progress dan email merupakan contoh fiktif.

Empat raster menjadi acuan komposisi, bukan screenshot aplikasi yang telah berjalan. Metadata pada raster diringkas untuk menonjolkan section baru; implementasi tetap mempertahankan seluruh field detail existing, termasuk original title, description dan release date. Tidak menjadikan ringkasan mockup alasan menghapus field.

## Empat layout acuan

| Layout        | Artefak                                     | Fokus                                                           |
| ------------- | ------------------------------------------- | --------------------------------------------------------------- |
| Desktop light | [PNG](admin-media-upload-desktop-light.png) | Dua card sejajar; avatar dropdown terbuka dengan Light dipilih. |
| Desktop dark  | [PNG](admin-media-upload-desktop-dark.png)  | Komposisi desktop sama; dropdown memilih Dark.                  |
| Mobile light  | [PNG](admin-media-upload-mobile-light.png)  | Card satu kolom; drawer/avatar dropdown tertutup.               |
| Mobile dark   | [PNG](admin-media-upload-mobile-dark.png)   | Komposisi mobile sama dengan charcoal semantic theme.           |

Target desktop pada prompt 1536×1408; mobile 864×2560 menggambarkan full-page scroll pada sekitar390 CSS px. Dimensi aktual kedua desktop **1070×1470** dan kedua mobile **793×1983** dari header PNG; pasangan light/dark sama, tanpa resize. Safe layouts320/390/768/1024/1440, contrast audit, keyboard, theme switching dan device interaction harus dibuktikan pada implementasi, bukan pada raster.

## Shell dan theme switcher

Sidebar desktop memakai logo Vertical Movie, Dashboard/Content dengan Content aktif, serta Log out di kiri bawah. Header berisi breadcrumb, avatar AD/Admin/chevron di kanan atas. Dropdown hanya identity Admin/admin@example.test dan Appearance: Light/Dark/System; tidak menambahkan account settings, billing, notifications atau logout kedua.

Desktop menampilkan menu terbuka agar pilihan tema terlihat. Tombol Edit metadata berada di title area dan harus tetap terlihat. Mobile memakai hamburger/brand/avatar; drawer tertutup pada screenshot. Drawer menampung Dashboard/Content dan Log out pada footer; pilihan tema tetap di avatar dropdown. Preferensi System menggunakan shell existing, bukan desain menu baru.

Light mempertahankan white/neutral dan lime; dark memakai background#1E201E, card/popover#272A27, secondary/input#303430, border#424842, foreground#F3F5F3 dan supporting#A8B0A8. Lime primary sesuai semantic source tokens. Badge Draft/Uploading/Not uploaded netral; merah hanya tindakan destructive dan error. Raster bukan bukti nilai piksel token atau audit kontras numerik.

## Resource conditional

| Resource           | Kartu media dan aturan                                                                                                                                                |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Film               | Source video + Cover image; Film badge; source≤30menit/1.500.000.000byte.                                                                                             |
| Standalone         | Dua kartu yang sama; Standalone badge; source≤30menit/1.500.000.000byte.                                                                                              |
| Series             | Hanya Cover image; tidak menampilkan source empty placeholder, rights video atau Preview HLS untuk series. Completion status/Season1 readonly existing dipertahankan. |
| Published/archived | Informasi media read-only; tidak menampilkan drop target, choose, retry upload atau replace.                                                                          |
| Episode            | Editor/upload episode berada di luar scope iterasi ini.                                                                                                               |

Raster utama menunjukkan Film. Perbedaan Standalone/Series/read-only adalah specification di atas; tidak mengklaim empat PNG telah memperlihatkan seluruh variant.

Aturan awal source: MP4/MOV/MKV/WebM,9:16,480–1080 sisi pendek, sisi panjang≤1920; worker authoritative untuk codec, durasi, geometry dan decode. Cover: still JPG/JPEG/PNG/WebP,≤5.000.000byte,9:16,min1080×1920; hasilWebP1080×1920. MB/GB pada copy batas adalah unit desimal, bukan MiB/GiB. Tidak menambah quality/provider selector atau cropper.

## State utama pada raster

Source sedang Uploading: `after-the-rain.mp4`,600MB. **Sent62% =372MB**; **Verified60% =360MB,30of50parts**. Dua angka berbeda karena byte in-flight belum authoritative. Pause dan Cancel upload aktif; tidak ada Upload/Complete kedua yang bisa diklik saat attempt aktif.

Cover Not uploaded: choose native file tetap tersedia selain drag/drop. Tidak ada gambar preview fiktif sebelum file dipilih. Choose cover masih dapat memilih/memeriksa file, lalu mengantre karena satu file upload aktif per tab. Jangan menambahkan dua scheduler masing-masing3PUT yang melampaui total cap.

Media readiness menunjukkan Source: uploading / Cover: not uploaded; Preview HLS disabled. Editorial Draft tetap terpisah. Tidak menampilkan publish, player original, transcode percentage atau ETA. HLS preview hanya diaktifkan berdasarkan capability server setelah current source+cover/output/provenance eligible; copy ringkas raster bukan pengganti semua server checks.

## State specification untuk implementasi

| State                  | Copy/action English                             | Perilaku                                                                       |
| ---------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------ |
| Empty                  | Choose video / Choose cover                     | Rules terlihat; browser validation tidak mengklaim codec valid.                |
| Selected               | File name/size · Upload video/Upload cover      | Memulai pemeriksaan file; poster selection dapat memakai temporary object URL. |
| Checking file          | Checking file · Cancel check                    | Hash progress nyata dari byte diperiksa; bukan network progress.               |
| Queued locally         | Waiting for the current upload                  | Source/cover tidak dikirim paralel sebagai dua file aktif.                     |
| Uploading              | Sent / Verified · Pause · Cancel upload         | Sent termasuk in-flight, Verified dari server; percent dapat direconcile.      |
| Paused                 | Upload paused · Resume · Cancel upload          | Session tetap ada dan expiry tidak diperpanjang.                               |
| Reselect after reload  | Select the same file to resume                  | Full digest harus cocok sebelum PUT; memilih ulang bukan auto-upload.          |
| Wrong file             | This file does not match the upload             | Choose the same file / Cancel upload; tidak mengirim byte campuran.            |
| Expired/legacy pending | Upload expired / Restart required               | Explicit new attempt atau abort/restart sesuai capability; tidak fake resume.  |
| Finalizing             | Finalizing upload · Checking status             | 100% sent belum completed; unknown response direconcile.                       |
| Upload completed       | Upload complete · Waiting for processing        | Completed bukan Ready atau Published.                                          |
| Queued/running/retry   | Processing source / Processing cover            | Indeterminate; progressSeconds bukan persen/ETA.                               |
| Processing failed      | Processing failed · Choose a new file           | Kode aman; tidak menawarkan manual reprocess API yang belum tersedia.          |
| Ready per role         | Source ready / Cover ready                      | Current media readiness authoritative; satu role ready belum cukup preview.    |
| All eligible           | Media ready · Preview HLS                       | Existing preview route, tanpa player baru pada panel.                          |
| Unknown/error          | Could not check upload status · Check again     | Actions unsafe disabled; storage403 bukan auth logout.                         |
| Read-only              | Uploads are unavailable for this content status | Tidak ada upload/replace; existing media info dipertahankan.                   |

State table bukan evidence runtime atau semua variant raster. Auth loss menghentikan hash/XHR/queue dan clear private state; perubahan theme mempertahankan selected File/attempt. Retry hanya bounded missing parts dengan reconcile; error inline tetap tersedia setelah toast.

## Modal dan interaksi

| Trigger                | Title/body English                                                                                                                                      | Actions                               |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| Cancel active attempt  | Cancel upload? · Stop this upload and discard its unfinished attempt? Your content metadata will stay.                                                  | Keep uploading / Cancel upload        |
| Replace current source | Replace source video? · The new file will replace this draft's source when the upload completes. It must finish processing before preview is available. | Keep current file / Choose new video  |
| Replace current cover  | Replace cover image? · The new image will replace this draft's cover when the upload completes.                                                         | Keep current cover / Choose new cover |
| Leave during hash/PUT  | Leave this upload? · Pause before leaving. Select the same file when you return to resume.                                                              | Stay / Pause and leave                |

Tidak membuat dialog tambahan saat logout/auth loss, dan tidak membuat upload navigation prompt kedua bila metadata guard sudah memiliki pending transition. Dialog di atas adalah specification, belum raster terpisah atau behavior tested. Mobile width320px memakai full-width/wrapping controls, focus return/Escape, tidak ada sticky footer menutup button. Minimum touch target44CSSpx, labels dan throttled aria-live saat implementasi; respect reduced motion.

## Metode, prompts dan evidence

Built-in `image_gen`, transparent_background=false, dipakai untuk setiap asset/variant. Source references telah diinspeksi sebelum dipakai. Final disalin ke `docs/design/`; originals generator dipertahankan. Prompt set verbatim dicatat di bawah. Proses tidak mengubah `apps/api`, `apps/web`, schema, package dependency atau worker.

Empat final diperiksa secara visual: English UI; source sedang upload dan cover belum dipilih; Sent62%/Verified60% terpisah; Pause/Cancel/Choose cover tersedia; Preview HLS disabled; Edit metadata terlihat; desktop memakai menu Appearance Light/Dark sesuai tema dan logout di kiri bawah; mobile tanpa sidebar desktop. Tidak ada publish/original player/transcode persen atau ETA.

Lima panggilan built-in menghasilkan empat final: desktop light, satu targeted correction untuk tombol Edit metadata, mobile light dan dua recolor dark. Candidate desktop sebelum correction tidak dipilih sebagai deliverable. Header/magic PNG, pasangan dimensi dan preservation diperiksa terpisah dari inspeksi visual. Bukti docs/commit berada pada [ADUP-006](../tasks/admin-media-upload.md). Pengguna menyetujui keempat final melalui “oke approve” pada 5 Oktober 2026; visual acceptance selesai. Verification runtime tetap menjadi task implementasi.

## Prompt set

### Desktop light

```text
Use case: ui-mockup.
Asset type: project-bound high-fidelity desktop LIGHT full-page app screenshot, requested canvas 1536 x 1408.
Input image 1: visual style and existing content-detail shell REFERENCE only. Create a new Upload Media detail-page mockup, not a new route. Preserve its Vertical Movie brand, left sidebar, white/neutral surfaces, lime buttons, Inter/Space Grotesk typography, Remixicon outline icons, thin borders and Rhea rounded cards. Flat orthographic screenshot, no browser chrome, device frame, watermark, montage or design annotations.
Page /admin/content/film/:id. Header breadcrumb "Admin / Content / After the Rain". Sidebar "Dashboard", "Content" selected with pale lime tint; outlined "Log out" anchored bottom left. Upper-right account trigger: AD avatar, "Admin", chevron. SHOW right-aligned avatar DROPDOWN OPEN: identity "Admin", "admin@example.test", separator, "Appearance", options "Light", "Dark", "System"; Light selected/checkmarked. No standalone theme switcher or extra profile/billing/logout menu items. Keep menu clear of upload cards and important actions.
Main area: "Back to content", heading "After the Rain", subtitle "Content details", neutral badges "Film" and "Draft", outlined "Edit metadata" action. Metadata remains above upload section: clean "Content information" card with paired rows "Title" / "After the Rain", "Slug" / "after-the-rain", "Synopsis" / "An unexpected meeting after the rain changes two lives.", "Language" / "English", "Release year" / "2026", "Genres" / "Drama" / "Romance". Adjacent compact "Content status" card "Draft" and "Not visible in the public catalog."; "Content rights" card "Confirmed". No publication/archive actions.
Below metadata, strong section title "Upload media", helper "Upload a source video and a vertical cover for this draft." Two equally sized media cards side by side, spacious padding.
LEFT card "Source video", muted role caption "Original file", outlined neutral badge "Uploading". File icon, "after-the-rain.mp4", "600 MB". Small rule text "MP4, MOV, MKV or WebM · 9:16 · 480–1080p", next line "Up to 30 minutes · Max 1.5 GB". Upload progress section exact copy "Sent 62%" on left; "372 MB / 600 MB" on right. Lime determinate bar 62%. Below it exact copy "Verified 60% · 360 MB · 30 of 50 parts". Small sentence "Upload complete does not mean media ready." Row of outlined "Pause" and subtle destructive text-outline "Cancel upload". No active Upload button while uploading, no completed checkmark, no HLS video player, no transcode percent or ETA.
RIGHT card "Cover image", neutral badge "Not uploaded". Bordered dashed upload zone with image outline icon, exact text "Choose a vertical cover", supporting "or drag and drop an image", lime "Choose cover" button. Beneath text "JPG, PNG or WebP · 9:16", "At least 1080 × 1920 · Max 5 MB". Small neutral note "One file uploads at a time. The cover will queue after the video." No fake photo/thumbnail while no cover selected.
Below two cards, full-width restrained status callout "Media readiness" with text "Source: uploading · Cover: not uploaded" and "HLS preview becomes available after both files finish processing." A clearly disabled "Preview HLS" button, disabled styling and no play area. Editorial Draft remains independent of media states. English only, exact spelling, realistic clear hierarchy and generous whitespace. All required controls inside canvas; page may be taller than the reference to show upload below metadata. No quality selector, provider selector, statistics, settings, subtitle, publish button, auto retry percentage, original video playback or storage credential UI. Design reference only, not functioning UI.
```

### Desktop light correction

```text
Use case: ui-mockup / precise-object-edit.
Input image 1 is the exact Upload Media desktop LIGHT mockup EDIT TARGET. Preserve its native canvas size, every card, surface, typography, sidebar/logout, avatar dropdown with Light selected, metadata rows, media rules, file names, progress numbers, Sent62% / Verified60%, Pause/Cancel/Choose cover, and disabled Preview HLS.
Make exactly ONE change: add a visible outlined button with a small pencil icon and exact label "Edit metadata" to the page-title area. Place it on the SAME horizontal row as Film and Draft badges, to the RIGHT of those badges with comfortable spacing, within the left content column. It must stay LEFT of the open avatar dropdown and must not be covered by it. Keep all other pixels/layout/content as unchanged as possible; no added features, no missing controls, no restyled cards. English only.
```

### Mobile light

```text
Use case: ui-mockup.
Asset type: high-fidelity full-page MOBILE LIGHT app screenshot for the existing Vertical Movie admin content details page.
Input image 1: the approved mobile detail screenshot, visual shell/reference only. Input image 2: newly designed desktop upload layout, reference for the EXACT copy/states, not a desktop image to shrink. Compose a new native phone-width single-column layout, requested canvas 864 x 2560 representing about 390 CSS px and a vertically scrolling page. No phone frame, browser bar, status bar, collage or annotation board. White neutral surfaces, lime primary, Inter/Space Grotesk, outline icons, subtle borders, 16 CSS px gutters, body14–16 CSS px, headings24–28, rounded Rhea cards, touch controls44px. Do not shrink font to fit a viewport.
Header: hamburger, lime play mark and "Vertical Movie", AD avatar + chevron at extreme upper right. Avatar dropdown CLOSED in this image; Appearance Light/Dark/System remains accessible via avatar. Sidebar drawer CLOSED, contains Dashboard/Content/Log out at bottom when opened; do not put desktop sidebar or logout into content.
Main top: "Back to content", "After the Rain", "Content details", neutral "Film" and "Draft" badges, full-width outlined "Edit metadata". Above uploads a COMPACT but complete summary card "Content information": Title / After the Rain; Slug / after-the-rain; Synopsis / An unexpected meeting after the rain changes two lives.; Language / English; Release year /2026; Genres /Drama and Romance. Adjacent fields from desktop must stack and wrap. Compact "Content status": "Draft", "Not visible in the public catalog." and "Content rights: Confirmed".
Next heading "Upload media", sentence "Upload a source video and a vertical cover for this draft."
STACK card1 then card2, NEVER two columns.
Card1 "Source video", caption "Original file", neutral outlined "Uploading" badge. "after-the-rain.mp4", "600 MB". Rules "MP4, MOV, MKV or WebM · 9:16 · 480–1080p", wrapping line "Up to 30 minutes · Max 1.5 GB". Exact upload progress: "Sent 62%", "372 MB / 600 MB"; lime 62% bar. Beneath exact text "Verified 60% · 360 MB", line "30 of 50 parts". Note "Upload complete does not mean media ready." Two clearly readable outlined controls "Pause" and "Cancel upload" with destructive treatment only cancel; wrap if needed.
Card2 "Cover image", neutral "Not uploaded" badge; dashed drop target with image icon, "Choose a vertical cover", "or drag and drop an image", prominent lime "Choose cover". Rules "JPG, PNG or WebP · 9:16", "At least 1080 × 1920 · Max 5 MB". Note "One file uploads at a time. The cover will queue after the video." No cover thumbnail before selection.
Last full-width compact "Media readiness" card: "Source: uploading", "Cover: not uploaded", sentence "HLS preview becomes available after both files finish processing."; clearly disabled "Preview HLS" button with no player.
Every card/control visible in full-page scroll capture; comfortable English typography, filename can wrap, no horizontal overflow. Keep statuses internally consistent and editorial Draft independent. No metadata fields turned into editable upload form, no original-video playback, no publish/archive controls, no transcode percentages/ETA, no provider/settings selection, no statistics. All text English, no invented controls.
```

### Desktop dark

```text
Use case: ui-mockup / precise-object-edit.
Asset type: desktop DARK Upload Media mockup.
Input image 1 is the final desktop LIGHT upload mockup edit target.
Convert the reference into the approved DARK THEME ONLY. Keep identical canvas, layout geometry, card positions, controls, icons, exact English copy, all file/progress numbers and states. Background/sidebar #1E201E, card/popover/header #272A27, secondary/input #303430, borders #424842, foreground #F3F5F3, supporting #A8B0A8; lime primary oklch(0.768 0.233 130.85), dark readable primary button text. Selected navigation uses subtle dark olive tint, not bright pale panels. Neutral Uploading/Draft/Not uploaded badges remain neutral. Destructive cancel subdued red with dark surface, disabled preview visibly disabled. No white/light cards or white dropdown. Do not change 62% Sent /60% Verified,600 MB file,372 MB sent/360 MB verified,30 of50 parts, read-only Draft status, source and cover card content. No extra UI, no cropped controls, no transcode percentage, no original video player, no publish button.
In the OPEN avatar dropdown, retain identity Admin/admin@example.test and Appearance Light/Dark/System. Change selected/checkmarked theme from Light to DARK: Light unselected, Dark selected with dark olive tint and checkmark, System unselected. Keep Edit metadata beside Film/Draft badges visible and never covered. Do not change any other copy or layout.
```

### Mobile dark

```text
Use case: ui-mockup / precise-object-edit.
Asset type: MOBILE DARK full-page Upload Media mockup.
Input image 1 is the final MOBILE LIGHT upload mockup edit target.
Convert the reference into the approved DARK THEME ONLY. Keep identical canvas, layout geometry, card positions, controls, icons, exact English copy, all file/progress numbers and states. Background/sidebar #1E201E, card/popover/header #272A27, secondary/input #303430, borders #424842, foreground #F3F5F3, supporting #A8B0A8; lime primary oklch(0.768 0.233 130.85), dark readable primary button text. Selected navigation uses subtle dark olive tint, not bright pale panels. Neutral Uploading/Draft/Not uploaded badges remain neutral. Destructive cancel subdued red with dark surface, disabled preview visibly disabled. No white/light cards or white dropdown. Do not change 62% Sent /60% Verified,600 MB file,372 MB sent/360 MB verified,30 of50 parts, read-only Draft status, source and cover card content. No extra UI, no cropped controls, no transcode percentage, no original video player, no publish button.
Preserve native mobile full-page portrait canvas and single-column card order, touch-sized controls and all wrapped lines. Header hamburger/Vertical Movie/AD avatar stays compact. Avatar dropdown and navigation drawer remain CLOSED; Appearance still available through avatar. Do not add desktop sidebar, top-level theme switcher, logout in the content, extra buttons or any menu overlay. Edit metadata remains visible. Match desktop dark palette; do not turn light neutral badges into success green.
```
