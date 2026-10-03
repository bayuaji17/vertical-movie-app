# Draft PRD — Vertical Movie App

> Status: **Draft untuk ditinjau** · Diperbarui 30 September 2026 · Deskripsi produk dan pilihan stack dari pemilik proyek sudah dicatat; rincian MVP di bawah masih memerlukan keputusan.

## Gambaran produk

Vertical Movie App adalah aplikasi untuk menonton video vertikal. Pengalaman menonton dirancang **mobile first** dan tetap nyaman di desktop. Pengunjung dapat menemukan dan menonton video yang telah diterbitkan **tanpa login**. Hanya ada **satu admin** yang masuk ke dashboard untuk mengatur sistem, mengunggah dan mengelola video, serta menerbitkannya.

Fondasi auth admin sudah diimplementasikan; fitur konten masih belum tersedia. Istilah _video_ berarti satu unit yang dapat diputar dan diterbitkan. Pada 3 Oktober 2026 pengguna meminta rancangan yang mengakomodasi series dengan banyak video serta movie panjang. Usulan relasinya adalah series → season → episode, bersama movie dan video mandiri tanpa season; detail model dan aturan masih untuk ditinjau pada [Rancangan Data Video](VIDEO_DATA_MODEL.md).

## Peran dan akses

| Peran         | Akses                                                                                                                       |
| ------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Pengunjung    | Membuka katalog dan menonton video terbit tanpa akun atau sesi login.                                                       |
| Admin tunggal | Masuk ke dashboard, mengelola konfigurasi sistem dan video, mengunggah, mempratinjau, menerbitkan, serta menarik publikasi. |

Pendaftaran mandiri dan akun kreator lain tidak termasuk ruang lingkup. Provisioning dan pemulihan admin menggunakan CLI native yang sudah diimplementasikan; lihat [Auth Operations](AUTH_OPERATIONS.md). Sistem tidak membuka pendaftaran admin publik.

## Tujuan dan batas MVP yang diusulkan

- Admin dapat menyelesaikan alur draf → unggah → proses → pratinjau → terbit, lalu mengelola video yang sudah diterbitkan.
- Pengunjung dapat membuka daftar video terbit sederhana dan menonton video vertikal tanpa login. Urutan daftar dan navigasi antarvideo perlu diputuskan.
- Tampilan utama bekerja pada layar ponsel dan tetap memiliki komposisi yang sengaja dirancang untuk desktop.
- Dashboard menyediakan konfigurasi dasar yang disepakati, seperti identitas situs dan pengaturan publik yang aman untuk diedit. Daftar pengaturan final masih terbuka; rahasia infrastruktur tidak diedit melalui dashboard.

Rekomendasi personal, feed algoritmik, komentar, akun pengunjung, langganan, pembayaran, analitik penonton rinci, dan aplikasi native berada di luar draft MVP ini. Series/episode dan movie masuk scope rancangan backend atas permintaan pengguna 3 Oktober 2026; urutan delivery dan detail season/publikasinya mengikuti [plan video](VIDEO_IMPLEMENTATION_PLAN.md).

## Alur pengguna

### Admin

1. Admin masuk ke dashboard melalui autentikasi yang dibatasi untuk akun admin tunggal.
2. Admin membuat draf, mengisi judul, deskripsi singkat, dan sampul, lalu memilih video vertikal.
3. Sistem memvalidasi berkas, menampilkan progres unggah, dan memproses video agar dapat diputar.
4. Admin melihat status serta pratinjau; kegagalan menampilkan sebab dan tindakan untuk mencoba kembali.
5. Admin menerbitkan video yang siap. Video muncul di halaman publik dan dapat dibuka melalui tautan.
6. Admin dapat memperbarui pengaturan yang diizinkan dan menarik publikasi bila diperlukan.

### Pengunjung

1. Pengunjung membuka aplikasi tanpa login dan melihat video yang telah diterbitkan.
2. Pengunjung membuka video, menonton dengan kontrol pemutaran, lalu berpindah ke video lain melalui navigasi publik yang disepakati.
3. Pada desktop, pemutar vertikal tetap terbaca dan tidak diregangkan mengikuti lebar layar; ruang tambahan dapat dipakai untuk informasi dan navigasi.

## Kebutuhan produk

| ID     | Prioritas | Kebutuhan                      | Kriteria penerimaan awal                                                                                                                                        |
| ------ | --------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PRD-01 | Wajib     | Akses admin tunggal            | Hanya akun admin yang disediakan secara terkendali dapat masuk; dashboard dan semua operasi tulis ditolak bagi pengunjung; tidak ada pendaftaran admin publik.  |
| PRD-02 | Wajib     | Dashboard dan konfigurasi      | Admin dapat melihat ringkasan video dan mengubah pengaturan sistem yang telah ditentukan; nilai rahasia tidak ditampilkan atau diubah di dashboard.             |
| PRD-03 | Wajib     | Draf dan metadata video        | Admin dapat menyimpan judul, deskripsi, dan sampul sebagai draf; kesalahan input terlihat dekat field.                                                          |
| PRD-04 | Wajib     | Unggah video                   | Admin melihat validasi format/ukuran, progres, serta hasil unggah; kegagalan tidak menerbitkan video. Batas media belum diputuskan.                             |
| PRD-05 | Wajib     | Pemrosesan dan pratinjau       | Admin dapat melihat status menunggu, diproses, siap, atau gagal dan mempratinjau hasil yang siap.                                                               |
| PRD-06 | Wajib     | Terbit dan tarik publikasi     | Terbit hanya berhasil saat metadata wajib lengkap dan video siap; video terbit terlihat publik, sedangkan draf dan video yang ditarik tidak.                    |
| PRD-07 | Wajib     | Katalog dan tonton tanpa login | Pengunjung dapat melihat daftar video terbit dan memutar video tanpa autentikasi; kontrol pemutar dapat digunakan lewat keyboard.                               |
| PRD-08 | Wajib     | Tata letak responsif           | Layar ponsel mengutamakan video vertikal; desktop memiliki tata letak yang nyaman tanpa meregangkan atau memotong video secara diam-diam.                       |
| PRD-09 | Wajib     | Pemulihan kegagalan            | Gangguan unggah, pemrosesan, dan publikasi menampilkan status yang jelas; percobaan ulang tidak membuat publikasi ganda atau menghapus metadata yang tersimpan. |
| PRD-10 | Usulan    | Teks pendamping video          | Admin dapat menambahkan caption/subtitle dan pengunjung dapat mengaktifkannya saat tersedia. Syarat wajib caption saat terbit perlu keputusan.                  |

## Aturan publikasi awal

- Draf dan hasil unggah yang belum siap hanya tersedia bagi admin.
- Pemutaran publik hanya menggunakan video berstatus terbit; akses ke berkas media perlu mengikuti status tersebut.
- Tindakan unggah atau terbit harus aman jika permintaannya dikirim ulang.
- Admin menyatakan memiliki hak untuk menerbitkan video. Kebijakan konten dan penanganan laporan perlu diputuskan sebelum peluncuran publik.

## Ukuran keberhasilan yang diusulkan

| Ukuran                 | Cara membaca                                                                         | Target                                 |
| ---------------------- | ------------------------------------------------------------------------------------ | -------------------------------------- |
| Keberhasilan publikasi | Admin dapat menyelesaikan draf sampai video terbit dan memulihkan kegagalan          | Kriteria uji sebelum rilis             |
| Keberhasilan media     | Proporsi unggah/pemrosesan yang mencapai status siap, dipisah menurut penyebab gagal | Ditentukan setelah batas media dipilih |
| Pemutaran publik       | Video terbit dapat ditemukan dan diputar tanpa login pada perangkat sasaran          | Kriteria uji sebelum rilis             |
| Responsivitas          | Alur tonton dan dashboard dapat digunakan di ponsel serta desktop                    | Kriteria uji sebelum rilis             |

## Keputusan terbuka

1. Bentuk katalog dan cara berpindah video: daftar biasa, scroll/swipe vertikal, atau pola lain; termasuk aturan urutannya.
2. Daftar pengaturan yang dapat diubah admin. Provisioning/pemulihan akun admin sudah tersedia melalui CLI native; lihat [Auth Operations](AUTH_OPERATIONS.md).
3. Batas durasi, ukuran, format, rasio aspek, serta resolusi video dan sampul.
4. Provider object storage final (Cloudflare R2 atau layanan kompatibel S3), profil keluaran FFmpeg, distribusi, retensi, dan biaya per unggahan. Queue pemrosesan memakai PostgreSQL.
5. Apakah caption wajib untuk terbit dan bagaimana admin menyediakannya.
6. Kebijakan hak cipta, konten terlarang, pelaporan, moderasi, dan pengindeksan halaman publik.
7. Detail season default, genre/metadata, visibilitas parent series dan episode, serta kebijakan movie landscape pada [model video](VIDEO_DATA_MODEL.md#12-keputusan-untuk-ditinjau).

Lihat [Architecture](ARCHITECTURE.md) untuk batas sistem dan stack, [Global Rules](GLOBAL_RULES.md) untuk aturan lintas fitur, dan [Design System](DESIGN_SYSTEM.md) untuk rancangan antarmuka.
