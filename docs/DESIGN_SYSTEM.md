# Draft Design System — Vertical Movie App

> Status: **Draft untuk ditinjau** · Diperbarui 30 September 2026 · Fokus pada pengalaman tonton video vertikal mobile first, desktop yang nyaman, dan dashboard admin tunggal.

## Keadaan saat ini dan prinsip

Web saat ini baru memakai Tailwind CSS dan halaman starter. TanStack Form dan TanStack Query sudah tercantum sebagai dependensi; shadcn/ui dan Video.js belum dipasang. Belum ada identitas merek, token warna, komponen produk, atau pola player yang disetujui. Seluruh nilai dan pola di sini adalah usulan untuk memulai desain.

1. **Video sebagai pusat:** pengalaman pengunjung menempatkan video vertikal di area utama, dengan navigasi ke video lain yang mudah dijangkau.
2. **Mobile first, desktop terancang:** ponsel memberi fokus pada pemutaran; desktop mempertahankan rasio video dan memakai ruang samping untuk metadata atau navigasi.
3. **Akses langsung:** katalog dan player publik tidak menampilkan gerbang login atau ajakan membuat akun sebagai syarat menonton.
4. **Kemajuan admin terlihat:** draf, progres unggah, pemrosesan, siap, gagal, dan terbit memiliki teks serta aksi yang jelas.
5. **Kendali pengguna:** pemutaran, unggah ulang, dan perubahan visibilitas terjadi melalui tindakan yang dapat dipahami.

## Fondasi visual kandidat

| Bagian    | Usulan awal                                                                                                 | Catatan keputusan                                                                                     |
| --------- | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Warna     | Token semantik `background`, `surface`, `text`, `muted`, `border`, `accent`, `success`, `warning`, `danger` | Palet merek dan mode terang/gelap belum dipilih; uji kontras sebelum menetapkan nilai.                |
| Tipografi | Skala 14, 16, 20, 28, 36 px dengan tinggi baris yang nyaman                                                 | Jenis huruf dan kebutuhan bahasa lain belum dipilih. Teks isi utama mulai 16 px.                      |
| Spasi     | Kelipatan 4 px; jarak formulir dasar 16–24 px                                                               | Sesuaikan menurut hasil uji pada layar sempit.                                                        |
| Radius    | 8 px untuk input/kartu kecil, 12 px untuk panel                                                             | Belum menjadi token final.                                                                            |
| Media     | Pratinjau berbingkai rasio 9:16 sebagai bentuk utama                                                        | Kebijakan file dengan rasio lain belum diputuskan di PRD. Jangan memotong konten tanpa pemberitahuan. |
| Gerak     | Transisi singkat untuk umpan balik, hormati `prefers-reduced-motion`                                        | Hindari animasi yang mengaburkan status pemrosesan.                                                   |

Saat diimplementasikan, definisikan token yang disetujui melalui CSS `@theme` Tailwind v4 dan komponen web berbasis shadcn/ui yang menggunakan token semantik. Simpan komponen di `apps/web`; paket UI bersama baru diperlukan bila kedua app benar-benar memakainya. Hindari nilai warna yang tersebar langsung di tiap halaman.

## Pola komponen

| Komponen                  | Keadaan minimum                               | Perilaku penting                                                                                                 |
| ------------------------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Tombol aksi               | default, hover, focus, disabled, loading      | Label menyebut tindakan; tombol terbit tidak aktif bila prasyarat belum terpenuhi dan menjelaskan sebabnya.      |
| Field metadata            | kosong, terisi, invalid, disabled             | Label terlihat, pesan kesalahan dekat field, nilai draf tidak hilang saat terjadi kesalahan.                     |
| Pengunggah video          | idle, validating, uploading, uploaded, failed | Tampilkan format/batas yang berlaku, progres dan cara mencoba kembali; input file dapat dipakai dengan keyboard. |
| Kartu status              | pending, processing, ready, failed, published | Gunakan teks dan ikon selain warna; status yang berubah diumumkan secara wajar ke teknologi bantu.               |
| Pratinjau/player Video.js | loading, ready, playback error                | Pertahankan rasio video, kontrol putar/jeda dan volume, fokus terlihat, caption saat tersedia.                   |
| Dialog konfirmasi         | open, submitting, error                       | Jelaskan konsekuensi menarik publikasi dan kembalikan fokus setelah dialog ditutup.                              |
| Notifikasi                | success, warning, error                       | Pesan spesifik, tidak menutup informasi penting terlalu cepat.                                                   |

## Tata letak awal

- **Katalog publik:** hanya menampilkan video terbit, tanpa login. Pola daftar, urutan, dan navigasi antarvideo masih keputusan produk.
- **Halaman tonton di ponsel:** video vertikal menjadi fokus, dengan kontrol yang terjangkau dan metadata yang tetap dapat diakses.
- **Halaman tonton di desktop:** video tetap berasio vertikal dalam lebar yang dibatasi; area samping dapat memuat judul, deskripsi, dan navigasi.
- **Dashboard admin:** daftar video dengan judul, status, dan aksi utama; keadaan kosong mengarah ke pembuatan draf. Pengaturan sistem memiliki area yang terpisah dari pengelolaan video.
- **Editor video:** satu kolom pada layar sempit; pada ruang cukup, formulir dan pratinjau dapat berdampingan. Status penyimpanan dan pemrosesan terlihat tanpa mengandalkan posisi saja.
- **Responsif:** pilih breakpoint berdasarkan ruang yang dibutuhkan konten saat implementasi, lalu periksa viewport sempit, lebar, dan orientasi berubah.

## Aksesibilitas dan penerimaan desain

Target yang diusulkan adalah [WCAG 2.2 AA](https://www.w3.org/TR/WCAG22/). Uji kontras token yang dipilih, urutan fokus, label formulir, pesan kesalahan, ukuran target sentuh, dan penggunaan tanpa mouse. Siapkan caption untuk video prarekaman; keputusan apakah caption menjadi syarat wajib terbit harus diselesaikan di [PRD](PRD.md). Hindari autoplay bersuara. Uji player dengan keyboard dan teknologi bantu sebelum rilis publik.

Desain belum selesai sampai alur publik tanpa login dan alur admin mencakup keadaan normal, kosong, menunggu, gagal, serta terbit pada ponsel dan desktop. Pilihan merek, palet, tipografi, ikon, kebijakan caption, pola katalog, dan versi/integrasi Video.js tetap terbuka.

## Referensi

- [Tailwind CSS theme variables](https://tailwindcss.com/docs/theme)
- [shadcn/ui for TanStack Start](https://ui.shadcn.com/docs/installation/tanstack)
- [Video.js documentation](https://videojs.com/guides/embeds)
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
