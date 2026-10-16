# Design System — Vertical Movie

> Fondasi final · keputusan pengguna 3 Oktober 2026 · pemilik keputusan: pengguna; implementasi/dokumentasi: Codex. Light neutral + lime dan dark charcoal #1E201E. Pola produk pada board adalah spesifikasi visual untuk pengembangan berikutnya.

## Referensi final

- [Board light — PNG besar](design-system-final-light.png)
- [Board dark — PNG besar](design-system-final-dark.png)
- [Referensi HTML responsif dengan pemilih tema](design-system-final.html)
- [Atlas seluruh variabel warna](design-system.colors.md)
- [Token JSON](design-system.tokens.json)
- [Bukti render dan kontras](design-system.validation.json)

Nilai canonical berasal dari `apps/web/src/styles.css`: light pada `:root`, dark pada `.dark`, mapping utility pada `@theme inline`. HTML, JSON dan atlas dihasilkan langsung dari source ini agar nama/nilai tidak menyimpang. PNG merupakan render Chromium pada lebar 1920 CSS px dan device scale 2; periksa teks pada ukuran asli.

Konfigurasi `apps/web/components.json` tetap memakai `base-rhea`, Base UI, `baseColor: neutral`, `cssVariables: true`, dan Remixicon. Aksen lime mengikuti preset existing dengan dark surface override yang disetujui. #1E201E adalah custom override, bukan nilai shadcn neutral default. Tidak menjalankan ulang init/apply preset atau mengganti primitive.

Shadcn menggunakan pasangan surface/foreground dan override `.dark`; gunakan utility semantik seperti `bg-card text-card-foreground`. Konvensi mengikuti [dokumentasi theming resmi](https://ui.shadcn.com/docs/theming).

## Warna light dan dark

Light mempertahankan seluruh nilai preset existing. Dark menyelaraskan surface, foreground, input, border dan ring dengan charcoal; primary, destructive, chart dan pasangan sidebar-primary tetap dari preset existing.

| Fungsi                     | Light                                   | Dark                        |
| -------------------------- | --------------------------------------- | --------------------------- |
| Background                 | `oklch(1 0 0)`                          | `#1E201E`                   |
| Foreground                 | `oklch(0.145 0 0)`                      | `#F3F5F3`                   |
| Card / popover             | `oklch(1 0 0)`                          | `#272A27`                   |
| Secondary / muted / accent | Lihat atlas; nilai preset masing-masing | `#303430`                   |
| Muted foreground           | `oklch(0.556 0 0)`                      | `#A8B0A8`                   |
| Primary                    | `oklch(0.841 0.238 128.85)`             | `oklch(0.768 0.233 130.85)` |
| Primary foreground         | `oklch(0.405 0.101 131.063)`            | Sama dengan light           |
| Destructive                | `oklch(0.577 0.245 27.325)`             | `oklch(0.704 0.191 22.216)` |
| Border                     | `oklch(0.922 0 0)`                      | `#424842`                   |
| Input                      | `oklch(0.922 0 0)`                      | `#303430`                   |
| Ring                       | `oklch(0.708 0 0)`                      | `#A8B0A8`                   |

[Atlas](design-system.colors.md) memuat **31 token shadcn**: background/foreground; card, popover, primary, secondary, muted, accent dan pasangannya; destructive, border, input, ring; chart-1 sampai chart-5; serta delapan token sidebar. `muted` adalah permukaan, `muted-foreground` adalah teks pendukung. Input existing memakai `bg-input/50`; warna kontrol terlihat merupakan komposisi opacity dengan permukaan induk, bukan selalu swatch input literal.

Tidak ada token `success`, `warning`, `info` atau `destructive-foreground` pada CSS aplikasi saat finalisasi. Status sukses/error menggunakan turunan token existing. Chart tokens adalah cadangan preset, bukan penambahan fitur analitik.

Atlas juga mencatat **15 alias warna media** di `@theme inline`. Nilainya bergantung pada theme runtime player, tidak didefinisikan pada `:root`/`.dark` aplikasi, sehingga tidak dijadikan swatch global. Alias dan styling/player Video.js existing tidak diubah dalam pekerjaan ini.

## Tipografi, spasi, radius dan ikon

| Fondasi          | Ketentuan                                                         |
| ---------------- | ----------------------------------------------------------------- |
| Body/UI          | Inter Variable; regular 400, medium 500                           |
| Heading          | Space Grotesk Variable; medium 500, semibold 600                  |
| Skala referensi  | Caption 12, UI 14, body 16, section 24, heading 36, display 48 px |
| Spasi            | Grid 4 px; 4, 8, 12, 16, 24, 32                                   |
| Radius base      | `--radius: 0.625rem` = 10 px pada root 16 px                      |
| Radius turunan   | sm 6, md 8, lg 10, xl 14, 2xl 18, 3xl 22, 4xl 26 px               |
| Card existing    | `min(var(--radius-4xl), 24px)`                                    |
| Kontrol existing | rounded-2xl, umumnya 18 px                                        |
| Ikon             | Remixicon; outline 16/20/24 px; play utama boleh fill             |

Skala display/section adalah referensi halaman produk; ukuran komponen existing mengikuti source masing-masing. Ikon dekoratif memakai `aria-hidden`; aksi hanya ikon memerlukan nama aksesibel. Status selalu memakai teks dan ikon.

## Komponen dan state

Button, Card, Badge, Input, InputGroup, Field, Label, Textarea, Separator, Alert dan Toast tersedia di `apps/web/src/components/ui`. Gunakan variant existing sebelum menambah variant. Warna menggunakan token semantik, bukan nilai per halaman.

| Komponen      | Spesifikasi                                                                                |
| ------------- | ------------------------------------------------------------------------------------------ |
| Button        | default/outline/secondary/ghost/destructive/link; default, hover, focus, disabled, loading |
| Ukuran button | xs 24, sm 28, default 32, lg 36 px; login existing 44 px                                   |
| Input/Field   | Label, helper, invalid, disabled; `data-invalid` pada Field, `aria-invalid` pada kontrol   |
| InputGroup    | InputGroupInput/InputGroupTextarea dan addon untuk ikon/aksi                               |
| Card          | Header, Title, Description, Content dan Footer sesuai isi                                  |
| Status        | Draf, Menunggu, Diproses, Siap, Gagal, Terbit; progress dengan nilai/teks                  |
| Alert/Toast   | Judul, penjelasan, ikon outline, retry/aksi bila relevan; error inline tetap tersedia      |
| Navigasi      | Sidebar, breadcrumb dan tabs pada board adalah pola produk                                 |

Status konten, warna feedback, navigasi dan content cards pada board adalah **spesifikasi visual final**, belum implementasi fitur produk. Alert/Toast existing belum diubah menjadi seluruh variant tint pada board. Logic auth, notifikasi, timer, stack dan route tidak berubah.

## Status konten dan Alert & Toast

Bagian 07/08 memakai resep sama. Siap/Login berhasil menggunakan lime lembut dan outlined circle-check. Gagal/Video perlu perhatian/Login gagal menggunakan merah lembut dan outlined warning triangle. Tanpa disc ikon. Alert/toast tetap lebar dengan dua baris isi; status badge ringkas.

Resep board menggunakan `color-mix(in srgb, ...)` dari token existing. Ini warna turunan komponen, bukan variabel root baru:

| State  | Background                 | Border                       | Foreground                       |
| ------ | -------------------------- | ---------------------------- | -------------------------------- |
| Sukses | primary 12% + card 88%     | primary 30% + border 70%     | primary 35% + foreground 65%     |
| Error  | destructive 10% + card 90% | destructive 30% + border 70% | destructive 85% + foreground 15% |
| Netral | secondary                  | border bila outlined         | secondary-foreground             |
| Terbit | card/transparan            | border                       | foreground                       |

Contoh: `color-mix(in srgb, var(--primary) 12%, var(--card))`. Warna turunan berubah bersama tema. Ikon/judul/close memakai foreground state; supporting text tetap terbaca. Pemrosesan gagal mengikuti error, tidak memerlukan warning oranye baru. Toast existing top center dengan inset 16 px; error inline tetap tersedia setelah notifikasi hilang.

## Responsif dan pola produk

- Login existing: container 1152 px, gutter 24/32 px; dua kolom pada ≥1024 px; form terpusat dan ilustrasi disembunyikan di bawah breakpoint.
- Aksi utama mobile minimal 44 px. Kontrol compact pada board menunjukkan ukuran token; tentukan ukuran sentuh sesuai konteks.
- Katalog/tonton publik tanpa login. Card vertikal dan metadata jelas; susunan katalog mengikuti story implementasi.
- Media vertikal mempertahankan rasio 9:16; gunakan object contain bila diperlukan. Playback mengikuti Video.js existing.
- Board referensi empat/dua/satu kolom berdasarkan lebar; atlas delapan/empat/dua kolom. Ini layout dokumentasi, bukan perubahan route.

## Validasi dan aksesibilitas

Target produk WCAG 2.2 AA; periksa pasangan warna yang benar-benar dirender, fokus keyboard, label, status dan target sentuh. Pengukuran token pada Chromium canvas sRGB disimpan pada [JSON evidence](design-system.validation.json); bukan audit aksesibilitas lengkap.

Body/card light sekitar 19.8:1; dark background 14.97:1, dark card 13.25:1 dan muted dark 5.69:1. Dua pasangan light existing memiliki batas: muted/muted-foreground sekitar 4.35:1, sidebar-primary/sidebar-primary-foreground sekitar 2.96:1. Hindari teks kecil memakai pasangan tersebut; gunakan foreground yang cukup kontras atau validasi penyesuaian ketika mengimplementasikan komponen produk. Palet light dipertahankan.

Kedua mode diperiksa pada viewport 320, 390, 768, 1024 px tanpa horizontal overflow. Semua nama/nilai token diperiksa terhadap CSS. Browser tanpa page error. Test login, check-types, lint dan build dicatat pada [task design system](../tasks/design-system.md).

## Regenerasi

Dari root:

```sh
bun docs/design/build-design-system.mjs
```

Membaca CSS/font/ikon/artwork existing dan menulis HTML, JSON token serta atlas Markdown. Tidak memasang dependensi. Untuk PNG, gunakan instalasi Playwright/Chromium yang sudah tersedia pada host:

```sh
node docs/design/export-design-system.mjs
```

Exporter menerima `DESIGN_PLAYWRIGHT_MODULE` (module path/file URL), `DESIGN_BROWSER_EXECUTABLE` (executable path), atau argumen pertama/kedua setelah nama script. Gunakan runtime Node pada host pemilik Playwright; bila Playwright tersedia di Bun, script juga dapat dijalankan melalui Bun. PNG dan JSON evidence ditulis pada `docs/design/`. Tidak menambah dependensi browser pada package aplikasi.

## Referensi

- [shadcn/ui theming](https://ui.shadcn.com/docs/theming)
- [Task dan evidence](../tasks/design-system.md)
- [PRD](../product/prd.md)
- [Global Workflow](../guides/development-workflow.md)

## Integrasi runtime charcoal — 5 Oktober 2026

Override `.dark` approved menjadi source tracked pada ADMC-015: charcoal #1E201E, semantic surface/foreground/input/border/ring/sidebar. Light/preset dan styling media tetap utuh. Runtime memakai [CSS aplikasi](../../apps/web/src/styles.css), sehingga tidak membutuhkan artefak export lokal untracked. Theme/browser acceptance dashboard mengikuti [backlog](../tasks/admin-content.md); integrasi token tidak membuktikan seluruh UX/product board telah diimplementasikan.
