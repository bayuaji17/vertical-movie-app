# Draft Global Rules — Vertical Movie App

> Status: **Draft untuk ditinjau** · 30 September 2026 · Aturan produk dan teknik di bawah perlu disetujui sebelum dianggap kebijakan tetap. Instruksi kerja repo yang berlaku saat ini ada di [`AGENTS.md`](../AGENTS.md).

## Aturan produk lintas fitur

| ID    | Aturan yang diusulkan                                                                                                      | Dampak pada implementasi                                                                    |
| ----- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| GR-01 | Hanya satu akun admin yang disediakan secara terkendali dapat mengelola sistem; pendaftaran mandiri publik tidak tersedia. | Better Auth digunakan untuk sesi admin; API memeriksa hak admin pada tiap operasi privat.   |
| GR-02 | Pengunjung dapat melihat katalog dan menonton video terbit tanpa login.                                                    | Endpoint baca publik tidak mensyaratkan sesi atau akun pengunjung.                          |
| GR-03 | Draf, aset yang belum siap, dan video yang ditarik tidak dapat ditonton publik.                                            | Respons API dan akses media mengikuti status publikasi yang tersimpan.                      |
| GR-04 | Penerbitan memerlukan metadata wajib, video siap, dan pernyataan hak konten oleh admin.                                    | API menolak transisi yang tidak memenuhi syarat dengan alasan yang dapat ditindaklanjuti.   |
| GR-05 | Gangguan jaringan atau pemrosesan tidak boleh menghapus metadata yang sudah disimpan.                                      | Simpan draf lebih awal; status gagal dan jalur ulang terlihat jelas.                        |
| GR-06 | Pengulangan permintaan unggah, callback pemrosesan, atau terbit tidak boleh membuat hasil ganda.                           | Rancang identitas operasi dan transisi status yang aman diulang.                            |
| GR-07 | Informasi publik hanya memuat video terbit dan pengaturan yang memang dimaksudkan untuk publik.                            | Respons publik dipisahkan dari data admin, autentikasi, dan infrastruktur.                  |
| GR-08 | Admin dan pengunjung menerima pesan status yang jelas dan dapat diakses.                                                   | Teks status tidak hanya bergantung pada warna; kontrol utama dapat dipakai dengan keyboard. |
| GR-09 | Aturan hak cipta, pelaporan, dan moderasi harus disetujui sebelum publikasi untuk pengguna nyata.                          | Rilis publik menunggu kebijakan dan alur penanganan konten.                                 |

## Aturan implementasi

- API Elysia adalah sumber kebenaran untuk validasi domain, otorisasi admin, status video, dan penerbitan. Web TanStack Start menyajikan interaksi dan tidak dapat mengesahkan transisi hanya dari state klien.
- PostgreSQL menyimpan data terstruktur melalui Drizzle. Better Auth hanya melayani login admin; pengunjung tidak memerlukan akun. Pengaturan yang dapat diedit admin dipisahkan dari rahasia server.
- Validasi berkas dilakukan sejak pemilihan file untuk memberi umpan balik cepat, lalu ditegakkan lagi oleh layanan yang menerima unggahan dan memproses media.
- Simpan berkas video pada Cloudflare R2 atau layanan kompatibel S3, bukan di PostgreSQL. Database hanya menyimpan referensi objek, metadata, dan status. Provider final masih terbuka.
- Simpan job transcode secara persisten di PostgreSQL. Jalankan FFmpeg dari worker Bun di luar proses permintaan HTTP dan di luar transaksi database; perubahan status harus tahan terhadap job duplikat, worker berhenti, dan percobaan ulang.
- Prioritaskan API native Bun untuk operasi yang cocok, terutama `Bun.S3Client` dan driver Drizzle berbasis `Bun.SQL`. Verifikasi dukungan operasi dan kompatibilitas dengan library terpilih; catat alasan bila memakai alternatif.
- Batasi izin unggah pada admin, objek, operasi, dan masa berlaku yang diperlukan. Jangan anggap URL bertanda tangan langsung tidak dapat dipakai setelah video ditarik; kebijakan akses dan cache media harus ditetapkan sebelum rilis publik.
- Rahasia, token, dan URL bertanda tangan tidak masuk log, dokumen, atau respons publik. Konfigurasi lingkungan perlu didaftarkan tanpa nilai rahasia ketika diimplementasikan.
- Kontrak API dan perubahan status harus dapat ditelusuri ke kebutuhan `PRD-xx`; perubahan perilaku memperbarui dokumen yang terkait.
- Gunakan Bun untuk instalasi, skrip, build, dan runtime; pertahankan batas `apps/api` dan `apps/web`. Paket bersama hanya dibuat bila kedua app benar-benar memerlukan kode yang sama.
- Jangan mengedit `apps/web/src/routeTree.gen.ts` secara manual. Jangan memasukkan `dist/`, `.output/`, atau `.turbo/` ke commit.

## Aturan antarmuka yang diusulkan

- Aksi destruktif atau yang mengubah visibilitas video memerlukan label dan konsekuensi yang jelas.
- Pengalaman tonton diutamakan untuk ponsel, sementara desktop memiliki tata letak yang dirancang khusus; video vertikal tidak diregangkan atau dipotong tanpa pemberitahuan.
- Status unggah/pemrosesan harus terlihat sebagai teks, termasuk ketika gagal atau membutuhkan aksi ulang.
- Pemutaran video tidak dimulai dengan suara tanpa tindakan pengguna. Sediakan kontrol putar/jeda, indikator fokus, dan jalur caption sesuai keputusan aksesibilitas.
- Target aksesibilitas awal adalah WCAG 2.2 AA; audit dan keputusan penerapan caption dicatat sebelum rilis publik. Lihat [Design System](DESIGN_SYSTEM.md).

## Urutan sumber keputusan

Kode dan skrip saat ini menjelaskan **apa yang sudah berjalan**; [`AGENTS.md`](../AGENTS.md) menjelaskan **cara bekerja di repo**. [PRD](PRD.md), [Architecture](ARCHITECTURE.md), dokumen ini, [Global Workflow](GLOBAL_WORKFLOW.md), dan [Design System](DESIGN_SYSTEM.md) masih berstatus draft. Ketika disetujui, catat tanggal, pemilik keputusan, dan perubahan ruang lingkup di dokumen terkait agar usulan tidak keliru dianggap implementasi.
