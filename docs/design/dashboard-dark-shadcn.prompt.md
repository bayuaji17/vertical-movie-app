# Dashboard shadcn/ui — dark mode

Konsep visual dark mode dari `dashboard-light-shadcn.png`, dibuat memakai built-in image generation. Mengacu pada token `.dark` dalam `apps/web/src/styles.css`. Layout dan data contoh mengikuti versi light mode. Hasil akhir: `dashboard-dark-shadcn.png`.

## Prompt

```text
Use case: style-transfer.
Asset type: high fidelity shadcn/ui admin dashboard screenshot, dark mode.
Edit target: the supplied Vertical Movie light-mode shadcn dashboard screenshot.
Primary request: Produce its DARK MODE counterpart. Change ONLY theme colors and the theme-toggle icon. Preserve exactly the entire layout, canvas aspect ratio and dimensions, spacing, component sizes, typography, corner radii, every Indonesian word, all numeric counts, all dates and durations, all table rows, tabs, buttons, status icons, progress value 68%, the small brand play symbol, navigation and every cinematic thumbnail photograph. No redesign, no new features or text. Keep it one flat front-facing full desktop screenshot, without device frame or presentation board.
Color treatment derived from installed shadcn neutral dark tokens:
Main background near-black neutral #0a0a0a (background oklch 0.145).
Sidebar and cards slightly lighter charcoal #171717 (card/sidebar oklch 0.205).
Text off-white #fafafa; muted text readable medium-light neutral gray #a3a3a3 (muted foreground oklch 0.708).
Secondary and muted components dark neutral #262626 (muted oklch 0.269).
Borders subtle white at approximately 10 percent opacity, input borders approximately 15 percent opacity. Hairline dividers.
Primary lime slightly toned down from light mode (oklch 0.768 0.233 130.85); lime buttons and brand mark have dark readable text/icons, no glow. Keep lime progress bar. Only "Unggah video", "Terbitkan", branding and ready status use lime accents.
Sidebar active Dashboard neutral #262626 with off-white text. Summary card icons neutral dark secondary backgrounds and light-gray outlines.
TabsList #262626; selected "Semua video" lighter charcoal with white text and subtle border. Inputs dark transparent or charcoal, muted placeholder, neutral borders. Outline action buttons dark surfaces, subtle neutral outlines, off-white text.
Badges Terbit, Diproses, Draf, Menunggu neutral secondary surfaces with off-white or light-gray icons/text. Siap terbit dark subdued green/lime-tinted surface, readable lime text/icon. Gagal subdued dark-red background and soft red text/icon.
Alert "1 video perlu perhatian" very subtle dark-red tinted charcoal panel, subdued red border and soft red warning icon; label off-white. Maintain its exact geometry.
Cinematic thumbnails must retain their original natural photographic colors and 9:16 proportions; DO NOT invert or darken the photos.
Theme-toggle top-right sun becomes a moon thin line icon. Avatar A becomes dark neutral surface with off-white letter. Other icons become light neutral.
Maintain understated shadcn Base UI base-rhea design: compact components, consistent rounded corners, no gradients, no glows, no glass effects, no blue/purple cast, no loss of text contrast. Absolutely preserve all content and layout. Crisp pixel-level UI, legible text.
```
