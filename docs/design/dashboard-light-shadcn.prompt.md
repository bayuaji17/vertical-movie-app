# Dashboard light mode — shadcn/ui

Konsep visual berdasarkan PRD dan design system proyek. Menyesuaikan `apps/web/components.json` (base-rhea, neutral, Remixicon) serta ukuran dan radius Button yang terpasang. Ini adalah mockup dengan data contoh, bukan implementasi halaman.

Dibuat dengan built-in image generation, memakai `dashboard-light.png` sebagai referensi. Hasil: `dashboard-light-shadcn.png`.

Acuan komponen: [Sidebar](https://ui.shadcn.com/docs/components/base/sidebar), [Card](https://ui.shadcn.com/docs/components/base/card), [Table](https://ui.shadcn.com/docs/components/base/table), [Badge](https://ui.shadcn.com/docs/components/base/badge), [Button](https://ui.shadcn.com/docs/components/base/button).

## Prompt

```text
Use case: ui-mockup / style-transfer.
Edit target: the attached light-mode Vertical Movie admin dashboard.
Primary request: Restyle and recompose this same dashboard into an unmistakable, polished shadcn/ui dashboard, specifically matching the project's current Base UI "base-rhea" style, neutral base palette, lime primary, Inter text, subtle Space Grotesk headings, Remixicon thin line icons. This is an intentional substantial restyling of the UI, not simply rounding one button.
Canvas: single high-fidelity flat front-view complete desktop UI screenshot, landscape approximately 1600x1100, high resolution crisp readable typography. No physical device mockup, no perspective, no presentation labels outside UI.
Visual hierarchy: shadcn admin application aesthetic; comfortable compact 14px body text, small 12px muted descriptions, 28px medium/semibold page heading instead of oversized heavy display type, 32px summary numbers. Restrained font weights and colors, precise alignment. White main background, very pale NEUTRAL gray sidebar, near-black foreground, true neutral-gray secondary text (no slate/blue tint), 1px neutral-gray borders. A small lime primary button and lime progress indicator are intentional accents; most components are monochrome. No gradients or glows or colored card backgrounds. Broad cards have 18-20px rounded corners matching base-rhea, compact 32px-high rounded buttons with approximately 16px radii, inputs 36px high with 12px radii, small status badges with 10px radii. Shadows at most faint and small. This should look like a real app assembled from shadcn Sidebar, Breadcrumb, Card, Alert, Tabs, InputGroup, Select, Table, Badge, Progress, Avatar and Button components, not an illustration of an app.
Layout: 232px sidebar with generous but compact navigation. Brand remains "Vertical Movie" with simple lime square play mark and tiny "Admin" subtitle. Add understated nav group labels "Konten" for Dashboard, Video, Pemrosesan, then "Sistem" for Pengaturan. Sidebar active "Dashboard" is a neutral gray rounded menu item with near-black text, not lime-filled. Sidebar links each have a thin line icon, smaller than the previous design. At bottom an account block with gray avatar A, "Admin", "Administrator" and chevrons.
Top header height 56px: SidebarTrigger icon, short vertical Separator, breadcrumb "Admin / Dashboard"; right outline small rounded "Lihat situs", ghost sun icon, Avatar A. All elements align.
Main body 24px gutters and 20px gaps. Page title "Dashboard" and description "Kelola video, pantau proses, dan siapkan publikasi." Primary lime rounded button plus icon "Unggah video" on right.
Keep four Card summary tiles on one row: "Total video" 24, small footer "Semua video yang Anda kelola"; "Terbit" 18, footer "Video sudah publik"; "Draf & siap" 4, footer "Video belum terbit"; "Dalam proses" 2, footer "Video sedang diproses". Tiny muted line icon aligned at top-right of each card. No chart, growth percentage, visitor analytics or revenue.
An understated full-width shadcn Alert with WHITE background, neutral border and small red warning icon, black message "1 video perlu perhatian" and small outline rounded button "Lihat detail". The row is compact, not a huge yellow strip.
Below, a balanced grid with about 68% width video management card and 32% width processing/ready cards, all aligned.
Video management Card header "Video terbaru", muted description "Pantau status dan kelola publikasi video.", ghost text action "Lihat semua" with arrow. Under this add a standard muted-gray shadcn TabsList of three tabs "Semua video" (active white inner tab), "Terbit", "Draf". Then a search InputGroup with search icon and text "Cari video..." and compact Select "Semua status".
Table columns "Video", "Status", "Diperbarui", plus blank actions heading. Hairline row dividers, white rows, no chunky cell borders. Preserve these five rows and exact data:
"Senja di Ujung Kota", "02:34", badge "Terbit", "1 Okt 2026", action "Kelola".
"Ruang untuk Pulang", "03:12", badge "Siap terbit", "1 Okt 2026", action "Pratinjau".
"Langkah Pertama", "01:48", badge "Diproses", "1 Okt 2026", action "Detail".
"Hujan di Jendela", "02:06", badge "Gagal", "30 Sep 2026", action "Coba lagi".
"Cerita Pagi", "01:56", badge "Draf", "30 Sep 2026", action "Edit".
Every video cell has a narrow portrait 9:16 cinematic cover approximately 32px x 57px, never square, matching the reference film subjects and warm/cool photographic palette. Text next to it. Compact outline/ghost rounded row actions, vertical three-dot DropdownMenuTrigger for each row.
Status badges: mostly monochrome neutral outline/secondary style with small identifying icons; "Siap terbit" can have a restrained lime tint, "Gagal" a very subtle red tint and red text, "Terbit" neutral outline with check, "Diproses" neutral secondary with spinner, "Draf" neutral secondary with pen. No bright blue badges.
Right upper Card "Antrean pemrosesan", muted description "2 video sedang disiapkan". Two simple queue items separated by a shadcn Separator instead of nested outlined boxes. First "Langkah Pertama", small secondary badge "Diproses", thin rounded lime Progress bar and "68%". Second "Di Balik Cahaya", small neutral outline badge "Menunggu". Small 9:16 thumbnail at the left of each. Quiet footer "Status diperbarui otomatis."
Right lower Card "Siap diterbitkan", small secondary Badge "1". Clearly vertical 9:16 cover approx 72 x 128 px of the softly lit woman in the reference "Ruang untuk Pulang"; beside it title "Ruang untuk Pulang", small muted subtitle "Video siap", small check plus "Metadata lengkap". CardFooter separated with thin neutral line, two compact rounded buttons "Pratinjau" outline and "Terbitkan" lime primary.
Preserve functionality and Indonesian content of the reference. This is a SINGLE ADMIN video management MVP, not a team workspace. No team switcher, series, episodes, comments, subscribers, charts, revenues, audience analytics or extra modules. Keep the overall light mode, white/neutral surfaces, lime identity and vertical thumbnails; data is illustrative. The final screen must be sophisticated, cohesive, visibly more compact and recognizable as shadcn/ui, and legible at normal desktop viewing.
```
