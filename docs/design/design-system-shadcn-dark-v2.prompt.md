# Design system v2 — Dark mode

Versi dark dari board light v2 yang disetujui. Mempertahankan 12 bagian dan keselarasan Status konten dengan Alert & Toast. Token tema mengikuti `apps/web/src/styles.css`. Tidak mengubah kode aplikasi.

Metode: built-in image generation. Referensi: `design-system-shadcn-v2.png`. Hasil: `design-system-shadcn-dark-v2.png`.

## Prompt

```text
+Use case: style-transfer / ui-mockup.
Edit target: the attached approved light-mode Vertical Movie Design System v2 board. Create its complete DARK MODE counterpart as a large crisp landscape raster design-system board, matching the reference canvas proportions, grid, composition and all 12 numbered sections. Preserve every specimen, Indonesian wording, section numbering, typography, icons, photographs, sizes, spacing and placement. This is a theme conversion, not a redesign.

Match shadcn/ui Base UI Rhea styling, Inter body and Space Grotesk heading, Remixicon thin outline icons. Use existing project dark semantic palette:
- Overall canvas background #0a0a0a (oklch .145 neutral).
- Card, popover and sidebar surfaces #171717 (oklch .205 neutral).
- Muted and secondary surfaces #262626, white foreground #fafafa, muted text #a3a3a3.
- Borders white at 10% opacity; input borders white at 15% opacity, fine restrained lines.
- Primary vivid lime oklch(.768 .233 130.85), readable deep-green primary foreground oklch(.405 .101 131.063).
- Destructive red oklch(.704 .191 22.216). Error labels readable soft red on dark subtly red-tinted surfaces.
Keep clean flat neutral charcoal surfaces, modest rounding, visible focus rings, excellent text contrast, no blue/purple accents, no gradients/glow/neon effects.

Apply the dark palette consistently to header, all 12 tiles, typography, spacing squares, button states, fields, icons, status chips, alerts, toasts, nav, cards, responsive mockups:
01 Warna semantik: update the six swatches to actual dark semantic colors. Primary lime; Background #0a0a0a; Foreground #fafafa; Muted #262626; Border subtle gray; Destructive soft vivid red. Keep existing labels.
02 Tipografi: maintain all text and font examples in white/gray on charcoal.
03 Spasi & bentuk: muted charcoal spacing blocks and outline radius samples, readable labels.
04 Button: lime primary buttons with deep-green labels, charcoal secondary, dark outline with gray border, ghost green link, muted red destructive. Maintain default, focus, disabled and loading specimens.
05 Field & InputGroup: charcoal input surfaces, muted placeholder and icons, white values, red invalid outline and helper, visibly muted disabled state.
06 Ikon & aksi: light thin stroke icons, lime Tonton, charcoal/outline action buttons and avatar.
07 Status konten and 08 Alert & Toast MUST MATCH EACH OTHER, preserving the approved v2 styling:
- neutral Draft/Menunggu/Diproses chips charcoal with light-gray line icons and text.
- Siap chip dark low-opacity lime-tinted surface, fine green border, readable light lime-green text and outlined circle-check without filled icon disc.
- Gagal chip dark low-opacity red-tinted surface, fine red border, readable light coral/red text and outlined warning triangle without filled icon disc.
- Terbit outlined dark neutral chip with pale text and outlined circle-check.
- Progress track charcoal and lime fill, retain 68%.
- Alert Video perlu perhatian and Login gagal toast share EXACT SAME DARK RED semantic surface/border/foreground/icon treatment as Gagal chip; red outline retry action, red close X. Preserve all two-line contents.
- Login berhasil toast shares EXACT SAME DARK LIME semantic surface/border/foreground/icon treatment as Siap chip; outlined lime circle-check, lime close X. No white light-mode toast backgrounds. Preserve width, padding and two-line contents.
09 Navigasi: charcoal sidebar, darker/neutral selected row, light labels/icons, selected tabs modest gray raised surface.
10 Card & media: retain warm portrait photographic cover images unchanged; all surrounding card labels and content-type specimens converted to dark.
11 Layout responsif: convert both tiny desktop and mobile login mockups to the same dark theme while keeping miniature artwork/layout and lime CTA.
12 Light / Dark: this is a comparison specimen, retain the LEFT sample as LIGHT MODE with white surface and dark text, and RIGHT sample as DARK MODE. Keep headings Light mode and Dark mode. The surrounding tile is dark.
Header retains Vertical Movie logo and Design System title, subtitle Fondasi visual & komponen UI, shadcn/ui and Base UI · Rhea pills, date 3 Oktober 2026. Change the version pill from "v1.0 · Konsep" to "v2.0 · Dark". Keep footer small and legible against dark canvas. Output one polished complete board, no clipping, no watermark. Aim for the highest available resolution with dense text crisp and readable.
```
