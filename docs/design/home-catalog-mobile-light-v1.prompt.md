# Prompt homepage/katalog mobile light v1

> Usulan visual · 7 Oktober 2026 · Built-in image_gen · [Spesifikasi](home-catalog.md).

Reference: output desktop intermediate setelah koreksi pertama; dipakai untuk identitas scene/copy/palet, bukan layout. Final desktop mempunyai koreksi layout tambahan.

```text
Use case: ui-mockup / precise-object-edit.
Input image1 is the desktop public catalog STYLE, COPY and PHOTOGRAPH REFERENCE, not a layout to shrink.
Create ONE continuous MOBILE FULL-PAGE screenshot of the same Vertical Movie public homepage, LIGHT MODE. Portrait canvas very tall, about768x3072px (384 CSSpx width at2x scale). FULL SCROLL PAGE, no phone frame, no browser chrome, no status bar, no side-by-side screens. Include all six cards, button and footer; extend canvas height as needed.
Shared style: white/neutral/lime, Inter and Space Grotesk, shadcn Base UI Rhea rounded controls and neutral fine borders, Remixicon outlines. Comfortable readable mobile text: body14-16 CSSpx, title32 CSSpx,16px horizontal gutters,44CSSpx touch controls. NO microscopic desktop fonts or horizontal overflow.
Mobile header compact: left lime play-square brand mark and "Vertical Movie", right outlined sun theme button and hamburger. No avatar/login/admin features. Under header full-width rounded search field "Search titles...". The hamburger is closed; Home/Browse live in the menu. No desktop navigation links squeezed into header.
Intro tiny "STORIES IN PORTRAIT", heading on two lines "Find your next story.", helper "Films, series, and short stories. Watch without an account."
Featured panel pale-gray single-column: badge "Featured film", heading "After the Rain", short synopsis EXACT "A chance encounter on a rainy evening brings two strangers closer to home.", metadata "Film / Drama / 18 min", lime play "Watch film" button beside outline "View details" button, BOTH readable. Below text centered portrait rainy-bus-shelter poster from reference, EXACT9:16 width144 CSSpx height256CSSpx. Light padding around entire photograph, no landscape crop. Poster is static, no embedded player controls.
Catalog below: "Browse the catalog", helper "Explore films, series, and standalone videos."; compact four tabs "All" selected pale lime, "Film", "Series", "Standalone" in one comfortable row. Second toolbar row: "All genres" outlined chevron filter left, "Latest releases" quiet text right.
TWO-COLUMN poster grid,3 rows, each image EXACT portrait9:16, width170CSSpx height302CSSpx,12px column gap. Preserve six scene identities and order from desktop:
row1 After the Rain / Film / Drama / overlay18min; The Last Train / Series / Mystery / overlay8episodes.
row2 A Small Beginning / Standalone / Slice of life / overlay4min; Letters to Home / Film / Drama / overlay24min.
row3 Midnight Kitchen / Series / Comedy / overlay6episodes; City in Motion / Standalone / Documentary / overlay6min.
Titles directly below photographs,14px semibold, can wrap naturally. Type badge+genre below title; long genre can wrap, no clipped labels. Compact dark duration or episode badges inside lower-right images. Do not use series total durations or extra play circles. Photographs must remain vertical, DO NOT shorten them to fit canvas.
Below full grid, centered outline "Load more" down-arrow button, then subtle divider and compact "Vertical Movie" footer with "Vertical stories. Open to everyone.".
All content visible on one continuous long page. No additional features, signup, watchlist, likes, ratings, trending, admin badges, pricing, active playback, device frame or watermark. Preserve poster identities and English spelling. THIS MUST BE MOBILE RECOMPOSITION AT384CSSPX, not scaled desktop.
```

## Refinement final: feature compact dan dua kartu awal

Final memakai desktop light final sebagai reference untuk scene/copy/style. Prompt:

```text
Use case: ui-mockup, mobile public catalog.
Input image1 is a STYLE AND PHOTOGRAPH REFERENCE. Generate a NEW mobile app SCREENSHOT, NOT a poster of a website or a centered phone screen on a wide background. Fill the ENTIRE width with the mobile interface. Portrait canvas768x2048px. Content left edge32px, right edge736px: ONLY32px horizontal gutters. No extra surrounding white margin, no device frame.
Keep the same English brand and public catalog and neutral/lime shadcn style. Content inside screenshots is384CSSpx wide at2x. All UI body text approximately28-32 rasterpx. Controls88rasterpx high where touchable.
Header brand "Vertical Movie", sun and hamburger aligned right. Search "Search titles..." full width below. Intro "Find your next story." two lines and "Films, series, and short stories. Watch without an account."
COMPACT FEATURE: rounded pale neutral-gray panel across full704px content width, about400px tall. Left about420px text: small "Featured film" pill, "After the Rain" title, "Film · Drama · 18 min", lime "Watch film" and outline "View details" stacked. Right a small rainy bus-shelter poster, width144px height256px EXACT9:16 fully inside panel. OMIT the long synopsis in this mobile compact feature. Do not use a giant centered feature photo.
Next "Browse the catalog", helper "Explore films, series, and standalone videos." Tabs All selected/Film/Series/Standalone in a full-width row. Second row All genres filter on left and Latest releases right.
SHOW ONLY TWO CATALOG ITEMS IN THIS MOBILE INITIAL PAGE, SAME FIRST TWO AS DESKTOP, then Load more. This mobile draft shows2items; the desktop draft shows6. REMOVE remaining four items from this screenshot. Crucially BOTH poster images MUST be TALL PORTRAIT9:16: width336px,height598px. Two side-by-side posters with32px gap, spanning704px content width. No square thumbnails. First "After the Rain" rainy shelter with two adults,18min badge; second "The Last Train" woman at dusk station,8episodes badge. Under images large readable titles; small Film / Drama and Series / Mystery type/genre respectively. Portrait photographs taller than their widths, never shorten them to fit.
Below two cards centered "Load more", thin divider, compact Vertical Movie footer "Vertical stories. Open to everyone."
Make an edge-to-edge mobile web app full-page screenshot:704px main content on768pxwide output; no wide side margins. Maintain9:16 images, clear heading, readable type/genre. No signup/account/admin/player/watchlist/likes. No other content.
```
