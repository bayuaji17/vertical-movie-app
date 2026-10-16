# Design system v2 — Alert & Toast selaras dengan Status konten

Revisi visual atas permintaan pengguna: hanya contoh Alert & Toast di bagian 08 mengikuti permukaan tint lembut dan ikon garis pada bagian 07. Sukses mengikuti Siap (lime lembut); alert pemrosesan gagal dan toast error mengikuti Gagal (merah lembut). Ukuran, isi dan posisi tetap. Tidak mengubah kode aplikasi.

Metode: built-in image generation. Referensi: `design-system-shadcn-v1.png`. Hasil: `design-system-shadcn-v2.png`. Versi awal dipertahankan untuk perbandingan.

## Prompt

```text
Use case: precise-object-edit.
Edit target: the attached complete Vertical Movie Design System board.
Change ONLY the visual styling of the THREE example feedback components in section 08 "Alert & Toast", which is the rightmost tile in the middle row. Use section 07 "Status konten", immediately to its left, as the EXACT style reference.
Preserve the entire board canvas and dimensions, all twelve sections, every other specimen, all labels/text, every position, size, spacing, all fonts and illustrations. No changes outside the three example components in section 08. Keep the section heading and "Toast · top center" caption unchanged.
Desired section 08 styling:
- Match the softly tinted surfaces, rounded corners, understated flat appearance, thin line icons and restrained semantic foregrounds of section 07's status badges. This means full softly colored alert/toast surfaces, not white cards with brightly filled icon circles.
- Top Alert "Video perlu perhatian": remove the orange border and orange filled icon circle. Use the SAME pale pink/red surface as the "Gagal" badge in section 07, a very subtle tonal border, red OUTLINED warning triangle matching the "Gagal" icon without a colored disc, readable deep-red title and quieter red-gray description. Preserve text "Video perlu perhatian", "Terjadi masalah saat memproses video.", and the "Coba lagi" button. Style that small button as a tonal outlined action with the same red semantic family.
- Success Toast "Login berhasil": use the SAME pale lime-green surface as the "Siap" badge in section 07, subtle tonal border, dark-green OUTLINED circle-check matching "Siap", no filled green disc or white icon. Deep-green title "Login berhasil" and quieter dark-green supporting text "Anda masuk ke dashboard."; muted green close x in its existing position.
- Error Toast "Login gagal": use the SAME pale pink surface as the "Gagal" badge in section 07, subtle tonal border, red OUTLINED warning triangle matching "Gagal", no filled red disc or white icon. Deep-red title "Login gagal" and quieter red-gray supporting text "Periksa email dan password."; muted red close x in existing position.
All three remain alerts/toasts with their original two-line content, generous internal padding and wide shape; do not shrink them into small badges. Keep original dimensions and placement. Use consistent rounded corners approximately 18px, nearly flat surfaces with no pronounced drop shadows. Every text line remains readable. Do not introduce orange/yellow/blue/purple accent colors in section 08. Preserve exact shadcn neutral/lime palette elsewhere. This is a tightly scoped style revision, not a board redesign. Output one complete crisp board, same resolution and aspect ratio, no watermark.
```

