# Design system — visual board v1

Konsep visual dibuat pada 3 Oktober 2026 berdasarkan implementasi login, token CSS, komponen shadcn/ui base-rhea dan PRD terkini. Ini adalah gambar untuk ditinjau sebelum penyusunan spesifikasi final atau perubahan komponen. Tidak mengubah aplikasi.

Fondasi tersedia: lime/neutral, Inter, Space Grotesk, Remixicon, primitive Button/Input/InputGroup/Card/Badge/Field/Alert/Toast/Separator, login 44px dan layout desktop mulai 1024px. Sidebar/Tabs/Avatar, alur status media dan kartu katalog pada board adalah pola usulan; bukan fitur frontend yang telah tersedia. Scope metadata terkini mengakomodasi Video/Movie/Episode serta Series.

Metode: built-in image generation. Referensi gaya: `login-implemented-desktop.png`. Hasil: `design-system-shadcn-v1.png`, resolusi aktual **1536 × 1024 px**. Permintaan 3840 × 2560 pada prompt tidak dihasilkan oleh generator; file disimpan pada resolusi asli tanpa upscale.

Board adalah referensi visual konseptual; nilai token kanonis tetap berada di `apps/web/src/styles.css` dan ukuran komponen pada sumber masing-masing. `muted` adalah warna permukaan; teks sekunder memakai `muted-foreground`. Caption generatif pada swatch bukan pengganti kontrak token. Empat kolom dan tiga baris pada hasil mempertahankan seluruh 12 bagian.

## Prompt generasi

```text
Use case: ui-mockup / productivity-visual.
Asset type: one LARGE HIGH-RESOLUTION professional DESIGN SYSTEM BOARD for the Vertical Movie application, based on its existing implementation and approved UI mockups.
Reference image role: the attached login implementation screenshot is a STYLE REFERENCE for real product branding, lime/neutral palette, typographic feel, rounded shadcn components and responsive login composition. It is NOT the board layout. Ignore the bottom-right developer tool badge.
Primary request: Create a complete beautiful design-system specimen image that can be zoomed and used as a visual reference. Render at the largest available high-resolution output, ideally 3840 x 2560 pixels, broad landscape 3:2 composition, exceptionally crisp legible typography and UI details. ONE single board, entire board visible, no device mockup, no browser chrome, no perspective, no external margins or watermark. This is a system sheet, not a website screenshot or dashboard.
Design language: shadcn/ui Base UI, installed preset "base-rhea", neutral base color, lime primary, Remixicon-style thin line icons. MAIN BOARD is light mode white/very light neutral gray, charcoal text. Use disciplined 3-column by 4-row modular specimen grid, generous 56px margins, 28px gutters, precise consistent alignment. Each numbered section is a white specimen card with subtle neutral border, 24px radius, fine understated shadow, clean header and sufficient internal padding. Tiny muted captions must remain readable; concise text, no long explanations. Actual widget examples dominate. Restrained decoration; only photographic media specimens contain vivid colors. Black headings, lime limited to primary actions/branding/progress/ready badges. All section typography aligned; no dense overlapping cells. No gradients, glows, glass effects, faux 3D, blue or purple brand accents.
Header: small lime rounded-square dark play-triangle brand mark and wordmark "Vertical Movie" at left. Large heading "Design System" next to or underneath it. Subtitle exact "Fondasi visual & komponen UI". Right neutral outlined badges "shadcn/ui", "Base UI · Rhea", "v1.0 · Konsep". Small right line "3 Oktober 2026". Header clearly separates brand title from numbered specimen sections.
Use 12 sections, numbered 01 to 12 in reading order, in a disciplined grid. Headings in Indonesian; exact text below. Each sample needs breathing room, readable labels and visually accurate component anatomy.

01 "Warna semantik"
Show a neat 2x3 swatch grid with rounded swatches and labels:
"Primary" saturated lime following oklch(0.841 0.238 128.85);
"Background" white;
"Foreground" near-black #0a0a0a;
"Muted" very pale gray approx #f5f5f5;
"Border" soft gray approx #e5e5e5;
"Destructive" restrained medium red.
The lime swatch shows a dark tiny play icon to establish readable foreground. Small footer caption "Gunakan token semantik". Do not print unreliable hex approximations for primary; swatch names sufficient.

02 "Tipografi"
Display readable actual type specimens, heading font Space Grotesk and UI/body font Inter:
"Space Grotesk" — "Kelola video vertikal." as a large headline sample.
"Inter" — "Cerita yang mudah ditemukan." as body sample.
Show a compact type scale with actual visible size contrast: "48 / Display", "36 / Heading", "24 / Section", "16 / Body", "14 / UI", "12 / Caption". Clear weight contrast medium/semibold headings and regular body, not everything bold.

03 "Spasi & bentuk"
A set of horizontal spacing rulers with small labels "4", "8", "12", "16", "24", "32" and muted small-unit caption "px · grid 4".
Below, rounded-corner outline specimens labelled "Base 10", "Kontrol 18", "Card 24" (all px), visually distinct corners and modest sizes.
A quiet bottom size line "Compact 32 · Login 44". These reflect the actual 32px default buttons/inputs and 44px tall approved login controls; do not falsely label 44px as every button's default.

04 "Button"
Two rows of actual shadcn button variants with compact 32px specimen heights and consistent rounded 18px corners:
lime primary button with plus icon "Unggah video";
neutral secondary "Simpan";
white thin-border outline "Pratinjau";
ghost plain "Kembali";
soft red destructive "Hapus";
link-style "Lihat semua".
Below a state row with small labels "Default", "Focus", "Disabled", "Loading" and corresponding lime buttons: focus visible neutral ring, disabled reduced opacity, loading spinner and "Memproses...".
Small footer "24 / 28 / 32 / 36 px · form 44 px". No fake bright green focus glow.

05 "Field & InputGroup"
Two stacked examples with visible labels and icons:
"Email" over soft-gray rounded input, mail thin icon, placeholder "admin@example.com".
"Password" over same field, lock icon and masked dots, helper "Minimal 12 karakter." No show-password control, since current code deliberately keeps masking.
Then a smaller invalid field with red outline and short error "Email tidak valid." and a compact neutral disabled example.
Small caption "Label, helper, error, focus". Preserve clean shadcn Field/InputGroup appearance.

06 "Ikon & aksi"
A neat array of thin Remixicon-style 16px, 20px and 24px icons with concise samples: play, film, mail, lock, upload, search, settings, arrow-right, ellipsis.
Show icon-only outline button, icon-and-label "Tonton" button, and an A Avatar specimen.
Small captions "Remixicon · 16 / 20 / 24" and "Aksi utama mobile ≥ 44 px". The Avatar is a component specimen proposal, not a new visitor account feature.

07 "Status konten"
A balanced wrapping row of small shadcn badges combining icons and text: "Draf", "Menunggu", "Diproses", "Siap", "Terbit", "Gagal".
Neutral gray secondary pills for Draft/Waiting/Processing; subdued lime-ready badge; published neutral outline with check; restrained red failure badge with warning.
Below a thin lime progress bar labelled "Diproses" and "68%".
Add a tiny outlined chip or footer caption "Pola usulan". Domain status components are design specimens, not a claim the whole media workflow is implemented.

08 "Alert & Toast"
A compact white bordered Alert with warning icon and text "Video perlu perhatian" plus tiny outline "Coba lagi".
Below two small rounded Toast specimens with close x icons: check icon, title "Login berhasil", description "Anda masuk ke dashboard."; error icon, title "Login gagal", description "Periksa email dan password."
A miniature page locator above or beside the Toast shows it anchored TOP CENTER, caption exact "Toast · top center". NO bottom-right toast arrangement. Status text remains legible. Colors quiet, not large saturated error blocks.

09 "Navigasi"
A small light-neutral Sidebar menu specimen, group label "Konten"; active "Dashboard" uses neutral-gray fill, plus inactive "Video" and "Series" with thin icons. Under a separator group "Sistem", inactive "Pengaturan".
Beside or below it a Breadcrumb "Admin / Video" and a muted shadcn TabsList with "Semua", "Draf", "Terbit" (selected inner white tab).
Tiny caption "Pola usulan". These demonstrate new catalog/admin navigation proposals without implying frontend implementation.

10 "Card & media"
Two modest portrait 9:16 cinematic cover specimens, ratio EXACT 9:16, small enough to fit tile, captions aligned: "Senja di Ujung Kota" and "Ruang untuk Pulang". Use realistic Indonesian independent-film photography, amber city sunset and softly lit window interior; natural photos, no text embedded in imagery, no distortion. Each image has a small duration overlay "02:34" or "03:12" and restrained play affordance.
Below or beside them a few neutral small type chips "Video", "Movie", "Episode" acknowledging the current approved metadata direction.
Small captions "Card · ring halus" and "Cover vertikal 9:16". No landscape movie-player policy, subscriptions, social metrics or ratings.

11 "Layout responsif"
Schematic but highly polished miniature website layouts, no physical phone frames:
A wide miniature desktop LOGIN with left pale-gray visual panel and right two-input login form, labelled "Desktop ≥ 1024".
Next to it a tall narrow mobile LOGIN with compact brand header and only the stacked form, labelled "Mobile < 1024".
Muted dimension labels "Container 1152", "Gutter 24 / 32". The visual panel disappears on mobile. Focus on actual responsive login, not invented mobile sidebar behavior or an implemented public feed.
Tiny footer "Form terpusat pada layar kecil".

12 "Light / Dark"
Side-by-side small shadcn Card/widget specimens, light white and dark charcoal. Both show a tiny title "Video siap", small description "Metadata lengkap", outline "Pratinjau" and lime "Terbitkan" action.
Dark: near-black background #0a0a0a, charcoal card #171717, secondary #262626, off-white text #fafafa, gray muted #a3a3a3, low-opacity white border and slightly less intense lime primary.
Light: white surfaces, charcoal text, neutral hairline borders, lime primary.
Small captions "Token yang sama, tema berbeda" and "Dark mode · contoh token". Do not turn the entire board into dark mode.

Bottom footer across full board below specimen grid:
"Kontras terbaca · Fokus terlihat · Status memakai teks + ikon"
Then smaller concise line "Login & primitive: tersedia · Navigasi & pola konten: usulan"
Constraints: Accurate visual system for the actual project. No unsupported features such as public login/signup, OAuth, billing, team management, comments, audience analytics or recommendation feed. Series/movie/episode are valid current metadata categories but avoid episode-management layouts here. Include all twelve sections, all complete in frame. Board must be visual and usable, not a long text infographic. Maintain consistent shadcn rounded neutral components, lime identity, elegant typography and high clarity at zoom. Exact Indonesian labels wherever quoted. Do not claim accessibility certification or full implementation; this is a visual concept for review.
```

## Prompt refinement

```text
Use case: precise-object-edit / high-resolution refinement.
Edit this COMPLETE Vertical Movie design system board. Preserve its excellent existing 4-column by 3-row arrangement, all twelve numbered sections, all Indonesian text, all dimensions and labels, every specimen, both media photographs and miniature responsive layouts. Keep the entire board fully visible, same landscape 3:2 aspect ratio.
Primary request: Produce a LARGE crisp detailed board at actual output resolution 3840x2560 pixels if supported; redraw fine text and icons for high-resolution zoom clarity rather than introducing blur. Largest available image size.
Make ONLY two content corrections: (1) In section 04 "Button", change the blue text and blue arrow of "Lihat semua" to readable dark green so the system contains only lime and neutral brand accents. (2) In section 06 "Ikon & aksi", replace the heart inside the small outline icon-only button with a thin settings gear icon; keep that button's size, border and location. The product does not have a social-like feature.
Everything else stays exactly the same. Remain light-mode shadcn/ui Base UI Rhea, white/neutral surfaces, lime primary, Inter and Space Grotesk font appearance, crisp thin icons, understated borders, no new gradients or shadows, no device frames, no external labels, no watermark.
```

