# PRD — Vertical Movie App

> Status: **Mendekati final — keputusan inti disetujui, rincian produk tersisa terbuka** · Review repository 5 Oktober 2026; media cover diperbarui 6 Oktober 2026 · Pemilik keputusan produk: pengguna. Snapshot review awal `790e174a9fef748564450244d05038fce8e9bdbd` tetap historis. Pembaruan sampul mencatat keputusan crop dan bukti implementasi ACOV-009; tidak menetapkan keputusan produk baru. Implementasi MVP lengkap dan kesiapan production belum dinyatakan selesai.

## Gambaran produk

Vertical Movie App menyediakan katalog dan pemutaran **video vertikal 9:16**, mengutamakan ponsel dengan tata letak desktop yang tetap nyaman. Pengunjung menemukan dan menonton konten published **tanpa login**. **Satu admin** masuk menggunakan email/password untuk mengelola konten, unggahan, pratinjau dan publikasi. Tidak ada pendaftaran publik atau akun kreator tambahan; provisioning dan pemulihan admin melalui CLI.

Konten terdiri dari **movie**, **standalone** (video mandiri tanpa series), serta **series → season → episode**. Movie/standalone dapat berdurasi sampai 30 menit; episode sampai 10 menit. Semua jenis memakai aturan sumber dan sampul seragam, dengan batas ukuran sumber menurut jenis konten. Model/kontrak teknis dimiliki [model data video](../architecture/video-data-model.md) dan [kontrak upload](../architecture/media-upload-contract.md).

Auth, backend metadata, upload, worker HLS, publikasi, katalog API dan playback sudah tersedia. Update status implementasi 6 Oktober 2026: web mempunyai login, dashboard metadata dan uploader responsif Film/Standalone/Series, serta halaman tonton dan preview minimal. Homepage masih starter; dashboard publication, editor season/episode, katalog web lengkap dan pengaturan situs masih lanjutan. Keberadaan API atau mockup belum memenuhi seluruh alur MVP.

## Peran dan akses

| Peran         | Akses                                                                                                                                                                          |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Pengunjung    | Membuka katalog dan menonton konten yang efektif published tanpa akun.                                                                                                         |
| Admin tunggal | Mengelola series/season/video dan sampul, mengunggah, mempratinjau hasil siap, menerbitkan dan mengarsipkan konten; konfigurasi situs hanya untuk field yang nanti disepakati. |

API memeriksa sesi dan otorisasi setiap operasi privat. Preview konten yang belum publik memerlukan admin. Rahasia database/auth/storage berada pada konfigurasi server dan tidak dikelola melalui dashboard. Detail auth/provisioning ada pada [runbook auth](../operations/auth.md).

## Tujuan dan batas MVP

- Admin menyelesaikan alur **draft → unggah → proses → preview → published → archived** melalui aplikasi, termasuk status dan pemulihan kegagalan.
- Pengunjung menemukan konten published dan menonton HLS tanpa login; pola katalog/navigasi final tetap keputusan terbuka.
- Layar ponsel dan desktop mempertahankan proporsi 9:16 serta menyediakan kontrol yang dapat dioperasikan lewat keyboard.
- Dashboard menyediakan pengelolaan konten dan konfigurasi situs yang aman; field konfigurasi belum ditetapkan.
- Subtitle merupakan fitur opsional dan tidak menjadi syarat wajib MVP. Format/alur penyediaannya belum ditetapkan atau diimplementasikan.

Rekomendasi personal/feed algoritmik, komentar, akun pengunjung, langganan/pembayaran, analitik penonton rinci dan aplikasi native berada di luar MVP. Restore/republish konten archived, penggantian source konten published dan perubahan grouping setelah first publish belum tersedia; jangan menjadikannya bagian alur yang dijanjikan tanpa keputusan dan task tersendiri.

## Keputusan inti yang disetujui

### Sumber video dan sampul

| Parameter        | Ketentuan                                                                                                                                                                                                                                                             |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rasio            | Sumber video wajib portrait 9:16; rotasi dan pixel aspect ratio diperhitungkan. Sumber gambar sampul boleh memiliki rasio lain, lalu admin memilih crop portrait 9:16 tanpa upscale.                                                                                  |
| Resolusi video   | Sisi pendek tampilan 480–1080 piksel dan sisi panjang maksimal 1920; sumber 1440p/4K ditolak. Hasil tidak melebihi sumber.                                                                                                                                            |
| Format sumber    | MP4/MOV/MKV dengan H.264/H.265; WebM dengan VP8/VP9. Ekstensi/MIME merupakan validasi awal; container, codec, dimensi, durasi dan decode diperiksa worker.                                                                                                            |
| Episode          | Maksimal 600 detik dan 512 MB (512.000.000 byte).                                                                                                                                                                                                                     |
| Movie/standalone | Maksimal 1.800 detik dan 1,5 GB (1.500.000.000 byte), menggantikan batas 512 MB sebelumnya sesuai persetujuan 3 Oktober 2026.                                                                                                                                         |
| Acuan ekspor     | H.264 SDR 1080p24–30, video 4–6 Mbps (default 6 Mbps), audio AAC 128 kbps; batas ukuran mencakup audio/container dan diutamakan atas acuan bitrate.                                                                                                                   |
| Sampul           | Gambar diam JPG/JPEG/PNG/WebP maksimal 5.000.000 byte dan 40 MP. Area crop harus sekurangnya 1080 × 1920 tanpa upscale. Browser mengirim hasil crop WebP (fallback PNG) tepat 1080 × 1920; API memverifikasi lalu menyimpan output WebP 1080 × 1920. Animasi ditolak. |

### Upload, storage dan pemrosesan

Development memakai **MinIO**, production dirancang memakai **Cloudflare R2 melalui S3-compatible**, dipilih melalui env server. Satu bucket aplikasi privat per environment menyimpan sumber dan output pada prefix terpisah. Source asli tidak digunakan untuk streaming. Pergantian env tidak memindahkan objek yang sudah ada; konfigurasi aktif dimiliki [environment guide](../guides/environment.md).

Upload memakai **S3 multipart**, termasuk sampul kecil satu part. Target part 2% ukuran aktual dengan minimum 5 MiB selain part terakhir, maksimal 3 part paralel per file, session 24 jam sejak dibuat dan URL part maksimal 15 menit dibatasi sisa session. Resume merekonsiliasi part sukses; completion membekukan source dan enqueue secara atomik. Status upload completed belum berarti media siap atau published. Uploader browser Film/Standalone source+cover dan Series cover tersedia pada detail draft: validasi awal, full-file SHA-256, progress multipart, pause/reselection resume serta status processing/Ready. Evidence lokal 6 Oktober 2026 pada [backlog ADUP](../tasks/admin-media-upload.md); upload episode tetap di luar iterasi ini.

Sampul baru diproses melalui private API request setelah upload selesai; browser menunggu respons terminal dan hasil terverifikasi. Worker terpisah tetap memproses HLS video, legacy poster job bermode `worker`, dan cleanup. Cover baru tidak bergantung pada worker yang berjalan; alur, timeout dan batas recovery ada pada [runbook media](../operations/media.md#pemrosesan-poster-tanpa-worker--acov-005).

Job disimpan pada PostgreSQL; worker Bun menjalankan FFmpeg di luar request HTTP dan transaksi database. Parameter worker melalui env, **concurrency default 1**. Retry/lease/timeout/recovery mengikuti keputusan dan implementasi yang dicatat pada [runbook media](../operations/media.md) serta [backlog worker](../tasks/media-worker.md); kapasitas production menunggu benchmark.

Profil **hls-v1** menghasilkan H.264 SDR, AAC 128 kbps bila audio tersedia, output maksimal 30 fps, fMP4 dengan target segment 6 detik dan kualitas adaptif. Target bitrate video 480p/720p/1080p adalah 1,2/2,5/4,5 Mbps; hanya rendition yang dapat dibuat tanpa upscale tersedia. Sumber tanpa audio tetap dapat diputar tanpa track audio. Kode saat ini menormalisasi frame rate dan melakukan tone mapping HDR ke SDR; fixture HDR/VFR sudah mempunyai evidence lokal, sedangkan kompatibilitas/visual/perangkat nyata tetap bagian verifikasi.

### Publikasi, akses dan cache

Lifecycle **video** adalah **draft → published → archived**; upload, aset dan job mempunyai status terpisah. Model lifecycle series/season tidak otomatis mengikuti enum video; archive parent menyembunyikan child dari akses publik sesuai pemeriksaan parent. Restore/cascade fisik dan republish belum tersedia.

Publish dilakukan manual setelah admin mempratinjau hasil. API mensyaratkan judul/sinopsis, konfirmasi hak konten, source terverifikasi, HLS aktif lengkap serta sampul terverifikasi. Source yang sudah dihapus oleh retensi tetap mempunyai metadata/provenance sehingga HLS siap masih dapat dipublikasikan dan diputar. Completion atau transcode tidak melakukan autopublish; API tidak mencatat bukti bahwa admin sudah melihat preview sebagai gate tersendiri.

Episode boleh disiapkan published saat series masih draft, tetapi hanya efektif publik ketika series published, parent aktif dan seluruh syarat playable terpenuhi. Publish series mensyaratkan metadata/poster siap dan minimal satu episode published-ready. Series tanpa episode efektif playable disembunyikan dari katalog tanpa otomatis mengubah status editorial.

Master/variant playlist melalui API yang memeriksa akses; init/segment langsung dari bucket melalui signed GET URL. **TTL playback = 2× durasi aktual terverifikasi** sejak URL diterbitkan, dibulatkan ke detik. Player meminta ulang playback saat expiry/play/seek/pergantian kualitas dengan pemeriksaan akses baru dan mempertahankan posisi/pause.

Metadata/katalog memakai TTL 60 detik dan invalidation setelah perubahan terkait berhasil commit; lintas instance atau cache browser mengikuti TTL/refetch. DTO playback dan playlist memakai `private, no-store`. Jika cache payload signed diaktifkan, freshness privat maksimal min(300 detik, sisa umur URL), tidak melewati expiry; implementasi MinIO memakai fallback `private, no-store`. Archive menghentikan penerbitan URL baru. URL lama berlaku sampai expiry dan buffer/data yang sudah diterima tidak dapat ditarik kembali; tidak menjanjikan pencabutan instan.

### Retensi dan pemulihan

Video asli non-archived eligible dihapus paling cepat **7 hari setelah HLS lengkap verified-ready**, tanpa job aktif. Konten archived mempertahankan semua file valid yang masih ada, termasuk source, selamanya. Source yang sudah dihapus tidak muncul kembali ketika konten diarsipkan; archive setelah deletion claim tidak membatalkan penghapusan yang telah diklaim. HLS/sampul siap tetap tersedia dan metadata/provenance dipertahankan.

Upload dapat dilanjutkan selama session 24 jam; abort eksplisit segera. Upload lengkap yang gagal validasi dan output attempt gagal dikarantina 24 jam lalu dibersihkan melalui sweep terkontrol; source terminal gagal eligible setelah 7 hari sejak gagal tanpa job aktif. Cleanup berjalan pada namespace/claim yang tercatat dan dapat dipulihkan, bukan lifecycle bucket tujuh hari tanpa pengecualian. Worker tersedia tetapi harus dijalankan sebagai proses terpisah agar job dan cleanup diproses.

Transient processing failure dapat retry otomatis. Setelah failure terminal, koreksi source pada draft dilakukan melalui upload session baru; belum ada endpoint manual reprocess. Mengunggah ulang diperlukan ketika source untuk pemrosesan ulang sudah tidak ada.

## Alur pengguna yang ditargetkan

### Admin

1. Login sebagai admin tunggal, pilih movie/standalone atau kelola series/season/episode.
2. Buat draft, isi metadata dan konfirmasi hak konten, lalu unggah source dan sampul.
3. Lihat validasi/progres upload dan status pemrosesan; resume/retry mengikuti state yang masih diizinkan.
4. Preview HLS yang siap, kemudian publish manual. Episode yang parent series belum published tetap tidak terlihat publik.
5. Kelola metadata yang masih dapat diedit atau archive konten. Katalog/URL baru mengikuti visibility; URL lama mengikuti expiry.

Ini alur produk target. API, watch/preview minimal dan dashboard metadata Film/Standalone/Series tersedia; upload/pemrosesan/publication UI serta hierarchy editor untuk menyelesaikan alur penuh masih pekerjaan frontend.

### Pengunjung

1. Buka katalog tanpa login dan pilih konten efektif published.
2. Tonton HLS 9:16 dengan kontrol playback dan kualitas adaptif; renewal URL berlangsung selama akses masih sah.
3. Berpindah konten melalui UX yang disepakati. API next episode sudah tersedia, tetapi UI navigasi belum terintegrasi.

## Kebutuhan produk dan kondisi implementasi

Status memuat review awal pada snapshot di atas dan update metadata dashboard yang disetujui pengguna pada 5 Oktober 2026. Evidence baru dimiliki [backlog admin content](../tasks/admin-content.md), sementara hasil media historis tidak diulang oleh update ini. ID kebutuhan tetap dipertahankan. Status backlog media Review/In Progress/Blocked tidak otomatis dinaikkan oleh review PRD.

| ID     | Prioritas | Kebutuhan / acceptance criteria                                                                                                      | Kondisi saat review                                                                                                                                                                                                                              |
| ------ | --------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| PRD-01 | Wajib     | Satu admin terprovision dapat login; dashboard dan operasi tulis terlindungi; signup publik tidak tersedia.                          | Implementasi auth/guard/CLI dan UI login/dashboard sesi tersedia; evidence lokal pada runbook auth.                                                                                                                                              |
| PRD-02 | Wajib     | Dashboard menampilkan pengelolaan/ringkasan konten dan konfigurasi situs yang ditentukan tanpa nilai rahasia.                        | Dashboard metadata Film/Standalone/Series, search/pagination dan create/detail/edit tersedia. Konfigurasi situs dan ringkasan global belum tersedia; field pengaturan masih terbuka.                                                             |
| PRD-03 | Wajib     | Admin menyimpan draft metadata untuk movie/standalone/episode dan sampul terkait; input salah ditampilkan jelas.                     | Backend metadata/hierarchy/genre/versioning tersedia; form Film/Standalone/Series, error/conflict/dirty-navigation tersedia. Upload sampul Film/Standalone/Series tersedia; editor season/episode masih lanjutan.                                |
| PRD-04 | Wajib     | Validasi format/ukuran, progres, resume dan hasil upload terlihat; kegagalan tidak mempublikasikan konten.                           | API multipart/status/freeze dan proof MinIO tersedia; UI upload source/cover tahap pertama tersedia; resume/hash, readiness dan failure recovery terverifikasi lokal pada ADUP-001–015. Upload episode dan acceptance production tetap lanjutan. |
| PRD-05 | Wajib     | Admin melihat status menunggu/diproses/siap/gagal dan mempratinjau output siap.                                                      | Worker/status API dan halaman preview HLS minimal tersedia; status processing/readiness per owner dan Preview gate tersedia pada uploader; halaman monitoring global belum tersedia.                                                             |
| PRD-06 | Wajib     | Publish hanya untuk konten siap dengan metadata/hak lengkap; archive menutup katalog/playback baru sesuai kontrak expiry.            | Service publish/archive/parent visibility tersedia dengan evidence lokal; aksi/form pengelolaan di dashboard belum tersedia.                                                                                                                     |
| PRD-07 | Wajib     | Pengunjung menemukan katalog dan menonton tanpa login dengan kontrol keyboard.                                                       | API katalog/detail/next dan halaman watch/player tersedia; homepage katalog/navigasi masih belum diimplementasikan.                                                                                                                              |
| PRD-08 | Wajib     | Ponsel/desktop mempertahankan rasio 9:16 dan alur yang dapat digunakan tanpa crop/stretch tersembunyi.                               | Player/login dan metadata dashboard mempunyai fondasi responsif/light-dark. Katalog, dashboard media lengkap dan acceptance perangkat sasaran masih lanjutan.                                                                                    |
| PRD-09 | Wajib     | Status kegagalan jelas, retry aman tanpa publikasi ganda atau kehilangan metadata.                                                   | Idempotency, resume, retry/lease/recovery/cleanup dan renewal tersedia di backend/player; UI pause/reselection resume/check status/cancel tersedia; recovery episode dan sebagian stress proof masih tersisa.                                    |
| PRD-10 | Opsional  | Bila subtitle disediakan, admin dapat menambahkan aset valid dan pengunjung memilih track; tanpa subtitle tidak menghalangi publish. | Opsional disetujui 4 Oktober 2026; format/language/timing/unggah/persistensi/delivery subtitle belum tersedia. Kontrol caption player saja bukan fitur subtitle selesai.                                                                         |

Evidence implementation ada pada [runbook auth](../operations/auth.md), [metadata](../operations/video-metadata.md), [media](../operations/media.md), [backlog media](../tasks/media.md), [worker](../tasks/media-worker.md) dan [publication/playback](../tasks/media-publication.md). Trace source dan batas review ada pada [context review PRD](../plans/documentation/repository-context.md#review-prd--5-oktober-2026).

## Kriteria keberhasilan MVP

MVP diterima ketika admin menyelesaikan alur konten melalui UI dan pengunjung menemukan serta menonton hasilnya pada perangkat sasaran, termasuk kondisi gagal, akses privat/publik dan expiry. Kesiapan backend saja belum cukup untuk menerima MVP.

| Ukuran                      | Kriteria sebelum penerimaan/rilis                                                                 | Kondisi                                                                                              |
| --------------------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Pengelolaan/publikasi       | Alur draft sampai publish/archive dapat dijalankan admin melalui UI; kegagalan bisa ditangani.    | Backend dan UI metadata tersedia; UI upload/publication serta acceptance alur penuh masih tersisa.   |
| Media                       | Format/limit/9:16, rendition HLS dan ketahanan upload/worker dibuktikan sesuai batas produk.      | Evidence lokal MinIO/FFmpeg/fixture tersedia; visual/stress/resource/platform masih mempunyai batas. |
| Tonton publik               | Published dapat ditemukan dan diputar tanpa login; konten tersembunyi tidak memberi akses baru.   | API/watch tersedia; katalog UI dan acceptance perangkat tersisa.                                     |
| Responsivitas/aksesibilitas | Login, dashboard, katalog dan player dapat digunakan di ponsel/desktop dengan kontrol yang jelas. | Belum acceptance seluruh layar/perangkat.                                                            |

Tidak menetapkan angka SLO, persentase keberhasilan atau biaya sebagai keputusan final tanpa baseline pengukuran.

## Keputusan produk yang masih terbuka

1. **UX katalog/navigasi:** daftar/grid atau scroll/swipe, filter/pencarian dan aturan urutan final. API saat ini memakai createdAt/id descending serta next episode berdasarkan season/episode ascending; ini perilaku kode, belum persetujuan UX produk.
2. **Konfigurasi situs:** field yang boleh diedit admin, validasi dan tampilan publiknya. Rahasia infrastruktur tetap konfigurasi server.
3. **Kebijakan konten:** hak cipta, konten terlarang, pelaporan/penanganan laporan serta pengindeksan halaman publik.
4. **Subtitle opsional:** format, bahasa, timing dan alur penyediaan/validasi. Ketidakadaan subtitle tidak menghalangi MVP atau publish.
5. **Fitur lanjutan lifecycle:** kebutuhan/prioritas restore/republish, perubahan source published serta cascade parent. MVP tidak menjanjikan fitur yang belum diputuskan ini.

Provider/env/HLS, batas sumber/sampul, multipart, readiness, TTL/cache, retensi dan kebijakan worker yang sudah disetujui bukan lagi pertanyaan produk terbuka. Kebutuhan bukti teknis dicatat sebagai gerbang verifikasi berikut.

## Gerbang verifikasi dan rollout yang belum selesai

- R2 staging/end-to-end, CORS/signing/freeze/cleanup dan compatibility provider production belum dibuktikan; MinIO lokal tidak menggantikannya.
- Safari/native HLS, perangkat sasaran, kualitas visual serta matriks stress/resource/timeout/supervisor yang belum lengkap tetap verifikasi tersendiri.
- Target awal 4 core/RAM 4 GB perlu benchmark worker bersama beban aplikasi/database; spesifikasi target bukan bukti kapasitas.
- Provider server/domain/disk, konfigurasi deployment/TLS, migrasi production dan backup/full restore belum dituntaskan. Docker Compose/reverse proxy pada [proposal deployment](../plans/video/implementation-plan.md#nomor-8--rekomendasi-deployment-production-dan-r2-belum-disetujui) merupakan rancangan yang belum dijalankan, bukan bukti rollout.

Tanggal/command/hasil historis dan batas fixture dimiliki runbook/backlog, tidak diulang sebagai hasil test baru di PRD ini. Kelengkapan spesifikasi, kelengkapan fitur dan readiness production merupakan status yang berbeda.

## Acuan dan riwayat review

Keputusan produk disetujui pengguna pada 1–4 Oktober 2026 tercatat pada [plan video](../plans/video/implementation-plan.md) dan runbook/backlog terkait. Review 5 Oktober 2026 memperbaiki klaim media belum tersedia, enum lifecycle lama, retensi tanpa runtime dan open questions yang sudah diputuskan; tidak memberikan persetujuan menyeluruh untuk semua rincian MVP yang tersisa.

[Global Rules](global-rules.md) dan [Architecture](../architecture/overview.md) telah diselaraskan pada review 5 Oktober 2026. Proposal UI/kebijakan, pekerjaan frontend dan gerbang production yang tersisa tetap ditandai. Untuk status implemented gunakan kode saat ini dan runbook aktif; historical plan tidak mengalahkan keputusan pengguna atau instruksi root. [Design System](../design/design-system.md) menjadi acuan visual; spesifikasi/mockup bukan bukti implementasi layar produk.
