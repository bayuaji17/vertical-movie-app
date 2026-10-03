# Login admin — redesign light mode

Mockup visual sesuai permintaan pengguna pada 3 Oktober 2026, belum diimplementasikan. Acuan: screenshot login existing, `apps/web/src/components/auth/login-form.tsx`, `apps/web/src/routes/admin.login.tsx`, serta shadcn/ui base-rhea dan token lime/neutral proyek.

Konsep: komposisi dua kolom dengan panel visual video vertikal dan form email/password. Copy bantuan diringkas. Ikon tampilkan password merupakan usulan UI dalam mockup. Tidak menambahkan login sosial, pendaftaran, atau pemulihan password publik. Sumber gambar adalah ilustrasi fotografis hasil generasi.

Dibuat memakai built-in image generation. Hasil: `login-light-shadcn-redesign.png`.

## Prompt

```text
Use case: ui-mockup.
Asset type: redesigned single-admin LOGIN PAGE for Vertical Movie App, LIGHT MODE, shadcn/ui Base UI base-rhea.
Reference image role: attached screenshot is the CURRENT LOGIN PAGE to redesign. It includes browser chrome, bookmarks, tabs, operating system taskbar and development tools. These are NOT part of the design. Output ONLY the finished website interface. Use the reference to understand the existing product and two-field email/password flow, not to preserve the oversized plain card.
Primary request: A polished, restrained, beautifully composed login redesign consistent with a vertical-film platform and earlier lime/neutral shadcn designs. Single administrator signs in with email and password to manage videos. Produce a high fidelity design screenshot, not working code.
Canvas and framing: complete desktop page approximately 1600x1000, flat front-facing interface, no device mockup, no browser chrome, no perspective, no inset mobile screen, no presentation labels. Generous whitespace, sophisticated precise alignment, calm inviting light theme.
Design system: white #ffffff main background, extremely pale neutral gray #fafafa, charcoal text, muted gray #737373, fine light neutral borders, lime primary approx #a3e635 with dark green-charcoal foreground. Inter UI/body typography, Space Grotesk headings. Remixicon thin-line icons. Base-rhea-like rounded compact shadcn Button, InputGroup, Card and Badge treatment, rounded corners 16-24px on broad panels, 12-16px on fields/buttons, minimal shadows and no heavy effects. Inputs readable 14-16px labels and body copy, form controls roughly 44px high. Never lime text on white for critical text. Lime is for brand mark and primary button.
Page header with generous 48px side gutters: left small lime square containing dark play triangle and wordmark exactly "Vertical Movie", tiny muted secondary label "Admin" beneath or alongside. Right a quiet ghost text link with arrow-left icon "Kembali ke beranda". Header no heavy bar, no navigation menu, no theme selector needed.
Centerpiece: centered two-column login composition about 1120px wide, balanced left 55% right 45%, no huge boxed outer card. Left a softly neutral-gray rounded panel about 560px wide and 600px tall, right a clean WHITE form area approx 370px wide, with 64px horizontal separation. Main composition vertically centered with sufficient white margins.
LEFT VISUAL PANEL:
At top-left small outlined Badge with subtle film icon "Studio admin".
Below modest editorial heading on two lines "Kelola video\nvertikal." approximately 40px semibold Space Grotesk. Under it concise muted copy exactly "Unggah, siapkan, dan terbitkan video dari satu dashboard." in two short readable lines.
Lower half features a deliberate cinematic arrangement of TWO portrait 9:16 photographic stills with rounded corners, slightly overlapping at different vertical positions. Foreground portrait about 162px x 288px depicts a young Indonesian woman near a city rooftop at amber sunset; supporting rear portrait about 140px x 249px depicts a softly lit indoor scene with window light. Realistic independent-short-film photography, rich but gentle color; preserve 9:16 rectangles and upright human proportions. Not a video player, no play controls or progress bars. Tiny lime geometric play mark or vertical frame outline may subtly connect to the brand, but no cartoon illustration, no stock office people, no fake admin charts.
These images visually evoke the app's vertical content without overwhelming the form. Gentle small shadows only. Left panel is pale neutral gray, not a dark cinematic full-bleed block.
RIGHT FORM:
Top small icon in 40px pale neutral rounded square depicting lock thin outline.
Main h1 text exactly "Masuk ke admin", approximately 28px medium/semibold, followed by muted two-line description "Gunakan akun administrator untuk mengelola katalog video."
A deliberate 28px gap then the form. Form uses shadcn FieldGroup and two labelled InputGroups.
First label exact "Email". Under it rounded neutral very light gray InputGroup, left mail thin icon, placeholder exact "admin@example.com", no filled user data.
Second label exact "Password". Under it same width/height neutral InputGroup, left lock thin icon, masked example dots and right subtle eye icon indicating show/hide. Quiet small helper line immediately below exact "Minimal 12 karakter." No provisioning terminology or repeated paragraphs.
Primary action full form width, rounded lime button exactly "Masuk" with small arrow-right at far right; dark readable text. Button height around 44px, same alignment as inputs.
Below button about 24px gap and a very subtle Separator. Then a small gray lock/shield icon and concise note "Khusus akun administrator." on one line, supporting second line "Akses diberikan oleh pengelola situs." in readable muted small font. This is a discreet access note, not a warning banner.
No remember-me checkbox, no OAuth provider buttons, no signup, no forgot-password link, no public password-recovery function, no terms acceptance, no form validation error state or spinner in this default screenshot. Do not invent authentication options outside the existing email/password workflow.
FOOTER: bottom center tiny muted text "Vertical Movie · Panel administrator". No taskbar, no debug badge, no technical storage/auth/database mentions.
Constraints: Everything is light mode; preserve single-admin account model and two fields. Indonesian exact text, clean highly legible rendering, strong contrast, no illegible tiny labels, no gradients or neon glows, no purple/blue tint, no dashboards or admin sidebar, no social metrics. This should feel markedly more refined and balanced than the reference, while implementable with existing shadcn components. One fully visible desktop login concept.
```

