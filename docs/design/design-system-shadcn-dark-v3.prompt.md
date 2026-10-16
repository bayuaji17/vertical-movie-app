# Design system v3 — Navy charcoal

Revisi dark mode menggunakan palet yang disetujui: background `#1A2333`, card/sidebar `#222D40`, input/hover `#2B384D`, border `#3A4960`, teks utama `#F1F5F9`, teks sekunder `#A8B5C8`. Aksen lime dan keselarasan Status konten dengan Alert & Toast dipertahankan. Palet ini adalah usulan visual yang disetujui, belum diterapkan pada kode aplikasi.

Metode: built-in image generation. Referensi: `design-system-shadcn-dark-v2.png`. Hasil: `design-system-shadcn-dark-v3.png`. Versi sebelumnya dipertahankan.

## Prompt

```text
+Use case: precise-object-edit / ui-mockup.
Edit target: attached Vertical Movie dark-mode design-system board.
Primary request: convert ONLY the neutral dark palette to the user-approved navy charcoal palette. Preserve the exact entire board layout, all twelve sections, every specimen, numbering, text, typography, line icons, spacing, geometry, photographs and lime accent colors. No redesign.

Use these exact new theme colors:
Background: #1A2333 (navy charcoal). Replace all near-black canvas areas with this color, including header and footer.
Card / sidebar surfaces: #222D40. All twelve section tiles use this elevated surface on the #1A2333 canvas.
Input / hover / muted / secondary surfaces: #2B384D.
Borders / separators: #3A4960, restrained thin lines.
Main text: #F1F5F9.
Secondary text and muted icons: #A8B5C8.
Keep existing vivid lime primary, with dark-green primary foreground. Keep destructive red and the warm photographic cover images unchanged.
The visible neutral surface layers should be clearly navy-charcoal and blue-gray, soft and flat, not pure black. Avoid black neutral surfaces, gradients, glow, purple or saturated blue effects. Use shadcn/ui Base UI Rhea styling.

Apply new neutral colors to EVERY dark specimen including buttons, fields, icon action buttons, neutral status chips, progress track, nav/sidebar, tabs, content-type chips, miniature desktop and mobile login mockups in section 11, and the DARK sample in section 12. The LIGHT sample in section 12 must remain white/light with its original dark text, lime accent, original pale success icon circle and colors.
Section 01 swatches must now visibly match the new palette: Background #1A2333, Foreground #F1F5F9, Muted #2B384D, Border #3A4960; retain Primary lime and Destructive red. Keep existing labels and text.
Section 07 Status konten and 08 Alert & Toast must remain matching semantic treatments: Siap chip and Login berhasil toast use identical restrained low-opacity lime-tinted dark surfaces with lime outline icons and readable lime text. Gagal chip, Video perlu perhatian alert and Login gagal toast use identical restrained low-opacity red-tinted dark surfaces with coral red outline icons and readable coral text. Blend their semantic tints over the new navy surfaces, with consistent soft thin semantic borders. No filled icon discs. Keep alert and toasts original shape, content and retry/close controls.
All photographs and light example colors unchanged. Retain logo, header and footer. Change the header version pill from "v2.0 · Dark" to "v3.0 · Dark". Maintain highest available crisp output, same whole landscape board aspect ratio and size. No crop, no extra text, no watermark.
```
