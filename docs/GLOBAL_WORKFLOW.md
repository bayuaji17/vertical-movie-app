# Draft Global Workflow — Vertical Movie App

> Status: **Draft untuk ditinjau** · Diperbarui 30 September 2026 · Alur kerja pengembangan untuk admin tunggal dan penonton tanpa login.

## Dari kebutuhan ke rilis

1. **Tetapkan kebutuhan.** Pilih butir `PRD-xx`, perjelas kriteria penerimaan dan keputusan terbuka yang memengaruhinya.
2. **Rancang batas.** Perbarui [Architecture](ARCHITECTURE.md) dan kontrak API jika menyentuh data, otorisasi, unggah, atau publikasi. Rekam pilihan vendor dan alasan setelah disetujui.
3. **Rancang pengalaman.** Tentukan alur, keadaan kosong/progres/gagal, dan pemeriksaan aksesibilitas menurut [Design System](DESIGN_SYSTEM.md).
4. **Implementasikan potongan vertikal.** Kerjakan web dan API yang diperlukan oleh satu hasil pengguna; jangan menganggap halaman mock sebagai fitur selesai.
5. **Validasi dan tinjau.** Buktikan kriteria penerimaan, jalankan pemeriksaan repo yang relevan, lalu tinjau keamanan akses video privat dan perubahan dokumentasi.
6. **Rilis dan amati.** Tentukan migrasi, konfigurasi, pemantauan, serta rencana pemulihan sesuai infrastruktur yang nantinya dipilih. Alur rilis produksi belum ditetapkan.

Urutan potongan awal yang disarankan: skema PostgreSQL/Drizzle dan provisioning admin → sesi Better Auth serta perlindungan API/dashboard → draf dan konfigurasi admin → unggah ke R2/layanan kompatibel S3 → queue PostgreSQL dan worker FFmpeg → pratinjau dan terbit → katalog serta pemutaran publik tanpa login → tarik publikasi dan pemulihan kegagalan. Setiap potongan harus menghasilkan perilaku yang dapat diperiksa sebelum lanjut.

## Alur kerja repo saat ini

Jalankan perintah dari root dengan Bun yang sesuai `package.json`:

```sh
bun install --frozen-lockfile
bun run dev
bun run lint
bun run check-types
bun run build
```

`bun run dev` menjalankan kedua app. Filter task dengan `--filter=api` atau `--filter=web` jika pekerjaan terbatas pada satu app. Saat ini `lint` hanya menjalankan lint web karena API belum memiliki skrip lint; `check-types` dan `build` mencakup kedua app. Setelah skrip atau dependensi berubah, jalankan instalasi frozen dan pemeriksaan yang relevan.

Husky menjalankan lint dan pemeriksaan tipe sebelum commit. Commitlint memvalidasi pesan Conventional Commits pada hook `commit-msg`, misalnya `feat(api): add video drafts` atau `docs: update admin workflow`. Pemeriksaan hook tidak menggantikan tinjauan perilaku. Pertahankan perubahan worktree yang sudah ada dan periksa isi commit sebelum membuatnya.

## Kriteria selesai per perubahan

- Kebutuhan `PRD-xx` dan aturan `GR-xx` yang terkait jelas pada deskripsi perubahan.
- API memeriksa identitas admin pada operasi privat, input, dan status yang relevan; akses katalog/tonton publik tidak meminta login. Web menampilkan hasil berhasil dan gagal.
- Bila mengubah data, periksa skema dan migrasi Drizzle, termasuk dampak pada data autentikasi Better Auth dan pengaturan situs.
- Untuk perubahan database atau storage, coba API native Bun yang relevan pada versi repo dan uji kompatibilitasnya dengan Drizzle, Better Auth, serta provider S3 yang dipilih.
- Untuk perubahan media, uji alur berkas tidak valid, izin unggah kedaluwarsa, unggah terputus, job ganda, worker mati saat FFmpeg berjalan, lease kedaluwarsa, retry, keluaran gagal diunggah, dan syarat terbit yang tidak terpenuhi sesuai ruang lingkupnya. Periksa juga akses video setelah publikasi ditarik sesuai kebijakan distribusi yang disetujui.
- Untuk perubahan player atau tata letak, periksa pemutaran di ponsel dan desktop, kontrol keyboard, serta keadaan loading/error Video.js.
- Perintah kualitas yang relevan berhasil, dan hasilnya dilaporkan sesuai yang benar-benar dijalankan. Verifikasi produksi/perangkat nyata dicatat terpisah bila belum dilakukan.
- Dokumentasi di root `docs/` diperbarui ketika kontrak, perintah, atau keputusan berubah. Perubahan struktur, runtime, atau kepemilikan dokumen juga memperbarui [indeks docs](README.md).

## Perubahan keputusan

Gunakan status `Draft` sampai pemilik produk/teknis menyetujui isinya. Setelah persetujuan, tulis tanggal dan keputusan pada dokumen terkait. Jika implementasi menyimpang dari keputusan yang disetujui, perbarui dokumen serta alasan perubahan dalam pekerjaan yang sama. Tidak ada workflow CI, strategi branching, atau kebijakan deploy yang ditetapkan oleh draft ini.
