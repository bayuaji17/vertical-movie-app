# Design system v4 — Charcoal #1E201E

Revisi visual dark mode dengan base `#1E201E` sesuai permintaan pengguna. Warna pendukung: card/sidebar `#272A27`, input/hover/muted `#303430`, border `#424842`, teks utama `#F3F5F3`, teks sekunder `#A8B0A8`. Aksen lime, foto, dan keselarasan Status konten dengan Alert & Toast dipertahankan. Kode aplikasi tidak diubah.

Metode: built-in image generation. Referensi: `design-system-shadcn-dark-v3.png`. Hasil: `design-system-shadcn-dark-v4.png`. Versi sebelumnya dipertahankan.

## Prompt

```text
+Use case: precise-object-edit / ui-mockup.
Edit target: attached complete Vertical Movie dark-mode design-system board v3.
Change ONLY the neutral palette to a charcoal with a subtle green undertone using the user-specified exact base color #1E201E. Preserve the entire composition, twelve numbered sections, all specimens, exact Indonesian text, typography, sizes, spacing, line icons, photographs and vivid lime accent. This is a color revision, not a redesign.

New palette:
Overall background, header and footer canvas: #1E201E.
Elevated card and sidebar surfaces: #272A27.
Input, hover, muted and secondary surfaces: #303430.
Thin subtle borders and separators: #424842.
Main text and primary neutral icons: #F3F5F3.
Muted text and secondary neutral icons: #A8B0A8.
These are neutral charcoal colors with a very subtle green undertone, not navy or blue. Remove ALL navy and blue-gray neutral surfaces from the reference. Do not use pure black for the canvas. Do not exaggerate the green undertone into a saturated forest-green theme.
Keep existing vivid lime primary buttons, deep-green primary labels, semantic destructive red, portrait photographs and the LIGHT comparison sample unchanged.
Use flat shadcn/ui Base UI Rhea surfaces, no texture, glow, gradients, or theatrical lighting.

Apply the new neutral palette consistently to every numbered tile, header badges, section number chips, field surfaces, button states, outlined actions, neutral status chips, progress track, tabs, navigation and sidebar, content-type chips, miniature dark desktop and mobile login samples in section 11, and dark comparison sample in section 12.
Update section 01 semantic swatches: Background #1E201E, Foreground #F3F5F3, Muted #303430, Border #424842; preserve the original lime Primary and red Destructive swatches. Existing swatch captions unchanged.
Section 07 Status konten and 08 Alert & Toast retain their matching approved semantic styling:
- Siap chip and Login berhasil toast: identical subtle dark lime-tinted surfaces blended over the new charcoal, fine lime border, readable lime text, outlined circle-check without filled icon disc.
- Gagal chip, Video perlu perhatian alert and Login gagal toast: identical subtle dark red-tinted surfaces blended over the new charcoal, fine red border, readable coral text, outlined warning triangle without filled icon disc.
Preserve all alert and toast two-line content, width, padding, action and close controls. Keep the 68% progress value and lime fill.
Section 12 LEFT Light mode card MUST retain its original white surface, dark text, pale green icon circle and lime button. RIGHT Dark mode card must use new charcoal palette. Surrounding tile uses new dark card surface.
Header version pill becomes "v4.0 · Dark", retain all other labels including date "3 Oktober 2026". Keep footer legible. Output one complete crisp landscape board at the same aspect ratio and highest available resolution. No crop, no extra text, no watermark.
```
