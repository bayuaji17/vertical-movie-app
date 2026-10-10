# Halaman Not Found

> Status: implemented lokal, spesifikasi komponen · 10 Oktober 2026 · Keputusan pengguna pada [plan](../plans/not-found/implementation-plan.md#decisions). Belum ada mockup raster; spesifikasi ini bukan bukti implementasi.

Satu halaman 404 dipakai untuk semua kasus: rute tak dikenal (termasuk `/admin/*`) dan konten publik berslug yang tidak ada (`/videos/$slug`, `/watch/$slug`, `/titles/$kind/$slug`, `/series/$slug`). Tidak ada varian publik/admin dan halaman tidak membaca sesi.

## Konten

| Elemen     | Teks (Inggris)                                                           |
| ---------- | ------------------------------------------------------------------------ |
| Kode       | `404` (dekoratif, `aria-hidden`)                                         |
| Heading    | `Page not found`                                                         |
| Penjelasan | `The page you are looking for does not exist or is no longer available.` |
| Tombol     | `Back to home` → `/`                                                     |

Path yang diminta tidak ditampilkan. Tidak ada tautan lain.

## Tata letak dan gaya

- Satu kolom di tengah viewport (`min-h-svh`, `main#main-content`), lebar konten maksimum `max-w-md`, jarak 16 px pada 320 px dan lebih lega pada ≥768 px.
- Token semantik design system (`bg-background`, `text-foreground`, `text-muted-foreground`, `Button` default); tanpa warna hard-code. Light/Dark/System mengikuti `ThemeProvider` root.
- Heading `h1`; tombol `min-h-11` (≥44 px) dengan fokus terlihat; tanpa animasi.
- Tanpa overflow horizontal pada 320 px; teks membungkus.

## Metadata dan status

`robots: noindex, nofollow` dari halaman; judul dokumen "Page not found" diatur di client setelah hidrasi (head root memiliki title situs). Title pada HTML SSR tetap nama situs. Respons HTTP 404 dipertahankan oleh `apps/web/src/start.ts`.

## State

| State                        | Perilaku                                                           |
| ---------------------------- | ------------------------------------------------------------------ |
| Normal                       | Halaman di atas.                                                   |
| Settings gagal               | Halaman tetap tampil; tidak bergantung pada Site Settings.         |
| Offline                      | Halaman statis tetap tampil; tombol memakai navigasi router biasa. |
| Gangguan 503/jaringan konten | Bukan 404: state Retry konten yang ada dipertahankan.              |
