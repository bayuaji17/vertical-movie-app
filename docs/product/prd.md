# Draft PRD — Vertical Movie App

> Status: **Draft rincian MVP** · Diperbarui 4 Oktober 2026 · Deskripsi produk dan pilihan stack dari pemilik proyek sudah dicatat. MinIO development, Cloudflare R2 production melalui S3-compatible, selector env, HLS VOD dan resolusi sumber/keluaran 480p–1080p disetujui; batas sumber/sampul, multipart 2%, profil hls-v1, kontrak akses/cache dan syarat publikasi disetujui. Implementasi media/publikasi, retensi dan rincian teknis masih lanjutan.

## Gambaran produk

Vertical Movie App adalah aplikasi untuk menonton video vertikal. Pengalaman menonton dirancang **mobile first** dan tetap nyaman di desktop. Pengunjung dapat menemukan dan menonton video yang telah diterbitkan **tanpa login**. Hanya ada **satu admin** yang masuk ke dashboard untuk mengatur sistem, mengunggah dan mengelola video, serta menerbitkannya.

Fondasi auth dan backend metadata sudah diimplementasikan. Metadata series → season → episode, movie panjang, dan standalone disetujui pada 3 Oktober 2026 dan diuji lokal; UI konten, upload/sampul, pemrosesan, publikasi dan katalog tetap lanjutan. Istilah _video_ berarti satu unit yang dapat diputar dan diterbitkan setelah tahap media siap. Detail model ada pada [Rancangan Data Video](../architecture/video-data-model.md); endpoint dan batas implementasi ada pada [Video Operations](../operations/video-metadata.md).

Pengguna memilih satu bucket aplikasi per environment pada 4 Oktober 2026. Kontrak nomor 4 disepakati 4 Oktober 2026: seluruh bucket privat, sources/ untuk input dan outputs/ untuk hasil immutable, master/variant playlist melalui API dan init/segment/caption langsung dari storage melalui signed GET URL. TTL playback disetujui 4 Oktober 2026: 2× durasi video aktual terverifikasi sejak URL diterbitkan; cache bila diaktifkan wajib memiliki expiry/invalidation, dengan cache terkait signed URL tidak melewati expiry URL. Cache metadata TTL 60 detik, playlist no-store dan cache segment privat maksimal min(300 detik, sisa umur URL) disetujui 4 Oktober 2026; proof response headers/invalidation masih diperlukan; archive menghentikan URL baru sementara URL lama berlaku sampai expiry. Kontrak akses memakai expiry URL lama, bukan pencabutan instan; tidak menjanjikan revocation instan atau CDN/custom-domain presign.

Lifecycle video disetujui 4 Oktober 2026: **draft → published → archived**, tanpa status produk unpublished. Status upload/processing tetap terpisah. Schema/layanan metadata saat ini masih memakai draft/published/unpublished plus archived_at; perubahan lifecycle adalah pekerjaan lanjutan, belum implementasi atau migrasi pada sesi ini.

Keputusan [syarat publikasi nomor 5](../plans/video/implementation-plan.md#nomor-5--syarat-publikasi-disetujui-4-oktober-2026) disetujui 4 Oktober 2026: judul/sinopsis/source/HLS/poster siap serta rights confirmation, subtitle opsional dan publish manual setelah pratinjau; visibility episode mengikuti series. Series publish memerlukan metadata/poster dan minimal satu episode published yang siap. Implementasi belum tersedia.

Retensi disepakati 4 Oktober 2026: video asli 7 hari dan file konten archived disimpan permanen. Pengecualian archived mencakup semua aset konten, termasuk video asli; Titik awal retensi sejak HLS verified-ready, upload session 24 jam dan cleanup gagal disetujui 4 Oktober 2026; proof implementasi masih pending. Detail pada [nomor 6](../plans/video/implementation-plan.md#nomor-6--retensi-dan-cleanup-disetujui-4-oktober-2026). Implementasi perlu source deletion tombstone agar HLS siap tetap dapat dipublikasikan/diputar setelah objek sumber dihapus; reprocess membutuhkan unggah ulang. Tidak ada cleanup runtime atau lifecycle bucket yang diaktifkan.

[Rekomendasi deployment nomor 8](../plans/video/implementation-plan.md#nomor-8--rekomendasi-deployment-production-dan-r2-belum-disetujui) dicatat sebagai belum disetujui: satu server Linux dengan proses web/API/worker/PostgreSQL terpisah via Docker Compose, reverse proxy HTTPS, bucket R2 privat/token scoped/CORS, volume DB/workspace serta backup/restore proof. Target uji pengguna 4 core/RAM 4 GB; provider/domain/disk belum ditentukan. Kandidat worker 1,5 GiB/2 vCPU/thread 1 serta kapasitas keseluruhan menunggu benchmark; same-origin dan signed S3 delivery mengikuti keputusan yang sudah ada. Tidak ada Dockerfile/Compose/provisioning/deployment/migration baru.

## Peran dan akses

| Peran         | Akses                                                                                                                                  |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Pengunjung    | Membuka katalog dan menonton video terbit tanpa akun atau sesi login.                                                                  |
| Admin tunggal | Masuk ke dashboard, mengelola konfigurasi sistem dan video, mengunggah, mempratinjau, menerbitkan, serta mengarsipkan video published. |

Pendaftaran mandiri dan akun kreator lain tidak termasuk ruang lingkup. Provisioning dan pemulihan admin menggunakan CLI native yang sudah diimplementasikan; lihat [Auth Operations](../operations/auth.md). Sistem tidak membuka pendaftaran admin publik.

## Tujuan dan batas MVP yang diusulkan

- Admin dapat menyelesaikan alur draf → unggah → proses → pratinjau → terbit, lalu mengelola video yang sudah diterbitkan.
- Pengunjung dapat membuka daftar video terbit sederhana dan menonton video vertikal tanpa login. Urutan daftar dan navigasi antarvideo perlu diputuskan.
- Tampilan utama bekerja pada layar ponsel dan tetap memiliki komposisi yang sengaja dirancang untuk desktop.
- Dashboard menyediakan konfigurasi dasar yang disepakati, seperti identitas situs dan pengaturan publik yang aman untuk diedit. Daftar pengaturan final masih terbuka; rahasia infrastruktur tidak diedit melalui dashboard.

Rekomendasi personal, feed algoritmik, komentar, akun pengunjung, langganan, pembayaran, analitik penonton rinci, dan aplikasi native berada di luar draft MVP ini. Series/episode dan movie masuk scope rancangan backend atas permintaan pengguna 3 Oktober 2026; urutan delivery dan detail season/publikasinya mengikuti [plan video](../plans/video/implementation-plan.md).

## Alur pengguna

### Admin

1. Admin masuk ke dashboard melalui autentikasi yang dibatasi untuk akun admin tunggal.
2. Admin membuat draf, mengisi judul, deskripsi singkat, dan sampul, lalu memilih video vertikal.
3. Sistem memvalidasi berkas, menampilkan progres unggah, dan memproses video agar dapat diputar.
4. Admin melihat status serta pratinjau; kegagalan menampilkan sebab dan tindakan untuk mencoba kembali.
5. Admin menerbitkan video yang siap. Video muncul di halaman publik dan dapat dibuka melalui tautan.
6. Admin dapat memperbarui pengaturan yang diizinkan dan mengarsipkan video published. Video archived hilang dari katalog; aturan penutupan URL media lama ditetapkan pada refinement delivery.

### Pengunjung

1. Pengunjung membuka aplikasi tanpa login dan melihat video yang telah diterbitkan.
2. Pengunjung membuka video, menonton dengan kontrol pemutaran, lalu berpindah ke video lain melalui navigasi publik yang disepakati.
3. Pada desktop, pemutar vertikal tetap terbaca dan tidak diregangkan mengikuti lebar layar; ruang tambahan dapat dipakai untuk informasi dan navigasi.

## Kebutuhan produk

| ID     | Prioritas | Kebutuhan                      | Kriteria penerimaan awal                                                                                                                                                                                       |
| ------ | --------- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PRD-01 | Wajib     | Akses admin tunggal            | Hanya akun admin yang disediakan secara terkendali dapat masuk; dashboard dan semua operasi tulis ditolak bagi pengunjung; tidak ada pendaftaran admin publik.                                                 |
| PRD-02 | Wajib     | Dashboard dan konfigurasi      | Admin dapat melihat ringkasan video dan mengubah pengaturan sistem yang telah ditentukan; nilai rahasia tidak ditampilkan atau diubah di dashboard.                                                            |
| PRD-03 | Wajib     | Draf dan metadata video        | Admin dapat menyimpan judul, deskripsi, dan sampul sebagai draf; kesalahan input terlihat dekat field.                                                                                                         |
| PRD-04 | Wajib     | Unggah video                   | Admin melihat validasi format/ukuran, progres, serta hasil unggah; kegagalan tidak menerbitkan video. Batas sumber dan sampul mengikuti keputusan media yang disetujui.                                        |
| PRD-05 | Wajib     | Pemrosesan dan pratinjau       | Admin dapat melihat status menunggu, diproses, siap, atau gagal dan mempratinjau hasil yang siap.                                                                                                              |
| PRD-06 | Wajib     | Terbit dan archive             | Terbit hanya berhasil saat metadata wajib lengkap dan video siap; video terbit terlihat publik, sedangkan draft dan video archived tidak muncul di katalog.                                                    |
| PRD-07 | Wajib     | Katalog dan tonton tanpa login | Pengunjung dapat melihat daftar video terbit dan memutar video tanpa autentikasi; kontrol pemutar dapat digunakan lewat keyboard.                                                                              |
| PRD-08 | Wajib     | Tata letak responsif           | Layar ponsel mengutamakan video vertikal; desktop memiliki tata letak yang nyaman tanpa meregangkan atau memotong video secara diam-diam.                                                                      |
| PRD-09 | Wajib     | Pemulihan kegagalan            | Gangguan unggah, pemrosesan, dan publikasi menampilkan status yang jelas; percobaan ulang tidak membuat publikasi ganda atau menghapus metadata yang tersimpan.                                                |
| PRD-10 | Usulan    | Teks pendamping video          | Admin dapat menambahkan caption/subtitle dan pengunjung dapat mengaktifkannya saat tersedia. Subtitle opsional untuk MVP; jika dilampirkan, format/bahasa/timing/akses harus valid dan aset siap saat publish. |

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
2. Daftar pengaturan yang dapat diubah admin. Provisioning/pemulihan akun admin sudah tersedia melalui CLI native; lihat [Auth Operations](../operations/auth.md).
3. Kebijakan audio/HDR/VFR/fps di luar acuan. Yang disetujui: resolusi sumber/keluaran 480p–1080p, sumber 1440p/4K ditolak; target ekspor H.264 SDR/AAC 128 kbps, acuan 1080p24–30 pada 4–6 Mbps (default 6 Mbps); sumber 60 fps tetap mengikuti size limit aktual, dengan batas terbaru per kind: movie/standalone maksimal 30 menit dan 1,5 GB (1.500.000.000 byte), episode maksimal 10 menit dan 512 MB. Batas file diutamakan atas acuan bitrate; budget total movie/standalone penuh 30 menit sekitar 6,67 Mbps. Sumber MP4/MOV/MKV dengan H.264/H.265 serta WebM dengan VP8/VP9 diterima setelah validasi aktual/decode. Semua video dan poster/sampul wajib portrait 9:16; rasio lain ditolak tanpa upscale/crop. Standar sampul seragam antarjenis konten: gambar diam JPG/JPEG/PNG/WebP maksimal 5 MB, sumber minimal 1080 × 1920 portrait 9:16, hasil WebP 1080 × 1920; sumber lebih besar diperkecil. Detail pada [plan video](../plans/video/implementation-plan.md#format-sumber-durasi-dan-poster--disetujui-3-oktober-2026).
4. Profil keluaran HLS FFmpeg, distribusi semua playlist/segment, retensi, pencabutan akses dan biaya per unggahan. Provider disetujui 3 Oktober 2026: MinIO development, Cloudflare R2 production melalui S3-compatible, dipilih melalui env. Queue memakai PostgreSQL. S3 multipart dengan part kecil disetujui untuk upload media; sampul kecil dapat memakai satu part. Part target 2% ukuran aktual dengan minimum 5 MiB selain part terakhir disetujui. **hls-v1 disetujui 4 Oktober 2026**: H.264 SDR, AAC 128 kbps bila audio tersedia, target video 480p/720p/1080p 1,2/2,5/4,5 Mbps, output maksimal 30 fps, segment fMP4 dengan target 6 detik dan pemilihan kualitas adaptif; tanpa crop/upscale, hanya kualitas yang dapat dibuat dari sumber. Detail encoder/GOP/SAR/VFR/MIME serta kualitas visual dan compatibility tetap memerlukan proof HLS-PROFILE-001. Session upload 24 jam serta retensi/cleanup nomor 6 sudah disetujui; maksimal 3 part paralel per file/URL part 15 menit dibatasi sisa session juga disetujui; identity resume dan proof implementasi masih refinement. Distribusi/TTL/cache serta batas akses sesudah archive mengikuti kontrak nomor 4 yang sudah disepakati.
5. Format subtitle, alur unggah/validasi dan cara admin menyediakannya. Subtitle opsional untuk MVP sudah disetujui 4 Oktober 2026; kewajiban subtitle saat publish tidak lagi menjadi pertanyaan terbuka.
6. Kebijakan hak cipta, konten terlarang, pelaporan, moderasi, dan pengindeksan halaman publik.
7. Season default dan metadata/genre D1–D3 sudah disetujui; syarat publikasi serta visibilitas parent series/episode D4 disetujui 4 Oktober 2026. Lifecycle/cascade archive/restore series/season dan rincian teknis media D5 masih perlu refinement; retensi/cleanup nomor 6 disetujui dan proof implementasi masih pending pada [model video](../architecture/video-data-model.md#12-keputusan-untuk-ditinjau).

Lihat [Architecture](../architecture/overview.md) untuk batas sistem dan stack, [Global Rules](global-rules.md) untuk aturan lintas fitur, dan [Design System](../design/design-system.md) untuk rancangan antarmuka.
