# Dashboard admin — konsep light mode

Mockup desktop berdasarkan `docs/product/prd.md` (PRD-02 hingga PRD-06 dan PRD-09) dan `docs/design/design-system.md`. Data video dan angka pada gambar adalah contoh. Gambar merupakan konsep desain, bukan fitur yang telah diimplementasikan.

Dibuat memakai built-in image generation. Hasil akhir: `dashboard-light.png`.

## Prompt generasi

```text
Use case: ui-mockup
Asset type: high fidelity desktop admin dashboard design concept for the Vertical Movie App, light mode.
Primary request: Generate one beautifully resolved, production-plausible UI screenshot based on this actual product brief: a single administrator manages individual vertical videos. Workflow is draft, upload, processing, preview, publish, unpublish. Visitors watch published videos without logging in. Dashboard focuses on media management and actionable processing states. No audience analytics, revenue, subscriptions, teams or episode management.
Composition: One flat front-facing desktop application screen, landscape approximately 1600 x 1100, crisp readable text, entire application visible, no laptop/device frame, no perspective, no surrounding presentation board. A 220px full-height left sidebar, narrow top header, spacious main content with 32px gutters, disciplined alignment and deliberate hierarchy. Main content has a full-width headline and four compact summary cards, then two columns: left approximately 70% a recent-video table, right approximately 30% processing queue and a compact ready-to-publish card. Make the whole screen feel calm, carefully art-directed and functional, not a generic analytics template.
Style: existing product design system uses white and neutral light-gray surfaces, charcoal text, lime green primary accent, Inter body typography and Space Grotesk headings, elegant 10px radii, thin neutral borders, very restrained shadows, clean Remixicon-style line icons. Lime buttons must have dark text. All structural surfaces LIGHT MODE. Film imagery supplies restrained cinematic color. Status pills combine small icons and words, not colors alone. Strong text contrast.
Exact interface text in Indonesian:
Sidebar header has a small lime icon shaped as a vertical rectangle with a dark play triangle, and brand text "Vertical Movie", tiny supporting label "ADMIN".
Sidebar links "Dashboard" (active with a pale lime background and dark green text), "Video", "Pemrosesan", "Pengaturan". No other primary modules. Bottom account block "Admin" and "Administrator", subtle log-out icon.
Top bar breadcrumb "Admin / Dashboard". Right an outlined external-link button "Lihat situs", a sun icon indicating light theme, and a simple round avatar with letter "A".
Main title "Dashboard". Under title "Kelola video, pantau proses, dan siapkan publikasi." On right primary lime button with plus icon "Unggah video".
Four equal overview cards in one row with small line icons and clearly hierarchical dark large numbers: "Total video" 24; "Terbit" 18; "Draf & siap" 4; "Dalam proses" 2. No growth arrows, line charts or audience statistics. Below the number use short supporting labels where needed. Total video must correspond to these counts. The 4 drafts include ready and failed unpublished videos; avoid double counting.
Immediately under summaries a slim pale amber actionable banner with warning icon: "1 video perlu perhatian" and small action "Lihat detail". This represents a failed unpublished draft.
Large left card titled "Video terbaru" with small right text link "Lihat semua". Below a tidy search field "Cari video..." and outlined dropdown "Semua status". Then an elegant five-row table with column labels "Video", "Status", "Diperbarui", "Aksi".
Each video cell contains a small portrait 9:16 cinematic thumbnail, video title and small duration. Fictional Indonesian cinematic stills, realistic film photography, no readable text within thumbnails:
Row 1 "Senja di Ujung Kota", duration "02:34", atmospheric sunset-city portrait, status "Terbit" with green check icon, date "1 Okt 2026", action "Kelola" plus three-dot menu.
Row 2 "Ruang untuk Pulang", duration "03:12", softly lit interior portrait, status "Siap terbit" with lime check icon, date "1 Okt 2026", action "Pratinjau" plus three-dot menu.
Row 3 "Langkah Pertama", duration "01:48", urban street silhouette, status "Diproses" with spinner icon and muted blue pill, date "1 Okt 2026", action "Detail".
Row 4 "Hujan di Jendela", duration "02:06", rain window portrait still, status "Gagal" with red warning icon and soft red pill, date "30 Sep 2026", action "Coba lagi".
Row 5 "Cerita Pagi", duration "01:56", warm morning portrait still, status "Draf" with neutral edit icon and neutral gray pill, date "30 Sep 2026", action "Edit".
Keep table readable, spacious but not sparse, row dividers hairline, vertical posters not stretched.
Right upper panel titled "Antrean pemrosesan", small subtitle "2 video sedang disiapkan". First queue item "Langkah Pertama" with small status "Diproses" and thin lime progress bar labelled "68%"; second queue item "Di Balik Cahaya" with status "Menunggu". Include quiet text "Status diperbarui otomatis." No infrastructure jargon, storage provider, FFmpeg or database references.
Right lower card titled "Siap diterbitkan" with count pill "1". Contains one clearly portrait 9:16 cover image, moderately sized and displayed uncropped, for "Ruang untuk Pulang", and short subtitle "Video siap • Metadata lengkap". An outlined "Pratinjau" button and a lime "Terbitkan" button. Prioritize compact fitting without making a giant media player.
Constraints: One coherent desktop admin dashboard screenshot. Pixel-level crisp UI, realistic hierarchy, correct Indonesian labels, no invented analytics, no creator marketplace, no comments, no fake project-management features, no serial/episode concepts, no dark sidebar, no blue primary accents, no glassmorphism, no decorative gradients, no illegible tiny fonts, no watermark. All numbers and content are illustrative mock data.
```

## Prompt perbaikan thumbnail

```text
undefined
```
