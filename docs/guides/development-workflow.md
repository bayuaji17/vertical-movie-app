# Global Workflow — Vertical Movie App

> Diperbarui 3 Oktober 2026. **Keputusan disetujui pengguna:** gunakan Agile dan pecah setiap modul menjadi task kecil; setelah implementasi jalankan test yang tersedia, check-types, lint yang tersedia, build, serta migrasi development jika schema backend berubah. Rincian alur produk/rilis yang belum disetujui tetap berupa draft.

## Agile dan pembagian pekerjaan

Susun pekerjaan dengan urutan **modul → user story → task kecil**. Modul mempunyai tujuan pengguna dan batas yang jelas, user story menjelaskan kebutuhan aktor, dan task menghasilkan satu perubahan konkret yang dapat ditinjau serta divalidasi. Sebuah modul selesai ketika story dan task wajibnya memenuhi acceptance criteria; jumlah task selesai saja tidak membuktikan alur pengguna selesai.

1. **Refinement backlog.** Petakan modul ke PRD dan arsitektur. Urutkan story menurut nilai pengguna, risiko, dan dependensi; pecah story menjadi task sebelum mulai implementasi.
2. **Planning iterasi.** Pilih tujuan iterasi dan task berstatus `Ready` sesuai kapasitas. Durasi iterasi, estimasi, dan alat board akan ditetapkan bersama saat development dimulai; jangan menganggap seluruh modul harus selesai dalam satu iterasi.
3. **Implementasi bertahap.** Kerjakan satu task utama sampai dapat diperiksa. Catat blocker dan keputusan saat ditemukan; perubahan kebutuhan kembali ke backlog untuk diprioritaskan.
4. **Review hasil.** Periksa acceptance criteria dan demo hasil iterasi. Task yang masih gagal divalidasi kembali ke `In Progress`.
5. **Retrospective.** Catat kendala dan perbaikan cara kerja, lalu gunakan umpan balik untuk iterasi berikutnya.

### Standar task kecil

- Satu tujuan konkret dan ruang lingkup terbatas; pisahkan pekerjaan independen atau hasil yang membutuhkan review berbeda.
- Cantumkan ID, owner, prioritas, dependensi, acceptance criteria, dan cara validasi sebelum task berstatus `Ready`.
- Bila task belum dapat diperkirakan karena pilihan teknis belum jelas, buat task investigasi dengan keluaran keputusan/proof yang konkret.
- Pecah implementasi per batas yang diperlukan, misalnya konfigurasi → skema/migrasi → endpoint → UI → pemeriksaan alur. Tetap rencanakan pemeriksaan integrasi untuk hasil pengguna lintas task.
- Catat hasil dan bukti validasi. Gunakan [template task](../templates/task.md) pada `docs/tasks/<module>.md` saat menyusun backlog modul.

### Status pekerjaan

| Status        | Makna dan syarat perpindahan                                                                                                             |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `Backlog`     | Kebutuhan tercatat, tetapi belum siap dikerjakan.                                                                                        |
| `Ready`       | Ruang lingkup/acceptance criteria jelas dan dependensi yang diperlukan tersedia.                                                         |
| `In Progress` | Implementasi aktif pada task tersebut.                                                                                                   |
| `Review`      | Implementasi dan bukti validasi siap diperiksa.                                                                                          |
| `Done`        | Acceptance criteria serta kriteria selesai yang relevan terpenuhi.                                                                       |
| `Blocked`     | Ada hambatan konkret; catat penyebab dan task/keputusan yang diperlukan. Kembali ke `Ready` atau `In Progress` setelah hambatan selesai. |

## Dari kebutuhan ke rilis

1. **Tetapkan kebutuhan.** Pilih butir `PRD-xx`, perjelas kriteria penerimaan dan keputusan terbuka yang memengaruhinya.
2. **Rancang batas.** Perbarui [Architecture](../architecture/overview.md) dan kontrak API jika menyentuh data, otorisasi, unggah, atau publikasi. Rekam pilihan vendor dan alasan setelah disetujui.
3. **Rancang pengalaman.** Tentukan alur, keadaan kosong/progres/gagal, dan pemeriksaan aksesibilitas menurut [Design System](../design/design-system.md).
4. **Implementasikan potongan vertikal.** Kerjakan web dan API yang diperlukan oleh satu hasil pengguna; jangan menganggap halaman mock sebagai fitur selesai.
5. **Validasi dan tinjau.** Buktikan kriteria penerimaan, jalankan pemeriksaan repo yang relevan, lalu tinjau keamanan akses video privat dan perubahan dokumentasi.
6. **Rilis dan amati.** Tentukan migrasi, konfigurasi, pemantauan, serta rencana pemulihan sesuai infrastruktur yang nantinya dipilih. Alur rilis produksi belum ditetapkan.

Urutan potongan awal yang disarankan: skema PostgreSQL/Drizzle dan provisioning admin → sesi Better Auth serta perlindungan API/dashboard → draf dan konfigurasi admin → unggah MinIO development/R2 production via env → queue PostgreSQL dan worker FFmpeg HLS → pratinjau dan terbit → katalog serta pemutaran publik tanpa login → archive video published dan pemulihan kegagalan. Keputusan provider/env/HLS disetujui 3 Oktober 2026; setiap potongan harus menghasilkan perilaku yang dapat diperiksa sebelum lanjut.

## Alur kerja repo saat ini

Jalankan perintah dari root dengan Bun yang sesuai `package.json`:

```sh
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
bun install --frozen-lockfile
bun run dev
bun run lint
bun run check-types
bun run build
```

Salin env sekali ketika setup lokal; jika file sudah ada, lengkapi nilai yang diperlukan tanpa menimpanya. Lihat [Environment](environment.md) untuk variabel aktif dan placeholder integrasi. `bun run dev` menjalankan kedua app. Filter task dengan `--filter=api` atau `--filter=web` jika pekerjaan terbatas pada satu app. Saat ini `lint` hanya menjalankan lint web; `check-types` mencakup kedua app dan `@repo/auth`, sedangkan `build` mencakup kedua app. Setelah skrip atau dependensi berubah, jalankan instalasi frozen dan pemeriksaan yang relevan.

Husky menjalankan pemeriksaan dokumentasi, lint dan pemeriksaan tipe sebelum commit. Commitlint memvalidasi pesan Conventional Commits pada hook `commit-msg`, misalnya `feat(api): add video drafts` atau `docs: update admin workflow`. Pemeriksaan hook tidak menggantikan tinjauan perilaku. Pertahankan perubahan worktree yang sudah ada dan periksa isi commit sebelum membuatnya.

## Kriteria selesai per perubahan

Sebelum melaporkan implementasi selesai, jalankan test yang sudah tersedia dan relevan, `bun run check-types`, lint yang tersedia melalui `bun run lint`, lalu `bun run build`. Catat command, scope, dan hasil; perbaiki failure sebelum task Done. Jika backend mengubah schema database, buat/tinjau migration dan jalankan `bun run --cwd apps/api db:migrate` pada database development lokal yang dikonfigurasi, lalu periksa journal, tabel/constraints, dan preservation data existing. Target harus dipastikan; proof integrasi tetap memakai database test dedicated. Aturan ini disetujui pengguna pada 3 Oktober 2026 dan tidak menggantikan otorisasi rollout production. Hook commit tidak menjalankan seluruh gate ini.

- Kebutuhan `PRD-xx` dan aturan `GR-xx` yang terkait jelas pada deskripsi perubahan.
- API memeriksa identitas admin pada operasi privat, input, dan status yang relevan; akses katalog/tonton publik tidak meminta login. Web menampilkan hasil berhasil dan gagal.
- Perubahan aturan bisnis/validasi/lifecycle API menyertakan test perilaku yang relevan memakai native `bun:test`; jalankan suite yang terdampak dan catat hasil pada task. Ikuti [standar unit test API](api-development.md#unit-test-api--bun-native); suite integrasi menggunakan environment test terpisah.
- Bila mengubah data, periksa skema dan migrasi Drizzle, termasuk dampak pada data autentikasi Better Auth dan pengaturan situs.
- Untuk perubahan database atau storage, coba API native Bun yang relevan pada versi repo dan uji kompatibilitasnya dengan Drizzle, Better Auth, serta provider S3 yang dipilih.
- Untuk perubahan media, uji alur berkas tidak valid, izin unggah kedaluwarsa, unggah terputus, job ganda, worker mati saat FFmpeg berjalan, lease kedaluwarsa, retry, keluaran gagal diunggah, dan syarat terbit yang tidak terpenuhi sesuai ruang lingkupnya. Periksa juga akses video setelah publikasi ditarik sesuai kebijakan distribusi yang disetujui.
- Untuk perubahan player atau tata letak, periksa pemutaran di ponsel dan desktop, kontrol keyboard, serta keadaan loading/error Video.js.
- Perintah kualitas yang relevan berhasil, dan hasilnya dilaporkan sesuai yang benar-benar dijalankan. Verifikasi produksi/perangkat nyata dicatat terpisah bila belum dilakukan.
- Dokumentasi di root `docs/` diperbarui ketika kontrak, perintah, atau keputusan berubah. Perubahan struktur, runtime, atau kepemilikan dokumen juga memperbarui [indeks docs](../README.md).

## Dokumentasi selama development

Ikuti [Documentation rules pada root AGENTS](../../AGENTS.md#documentation-rules) dan [indeks docs](../README.md). Sebelum implementasi, baca spesifikasi, panduan dan backlog terkait. Pekerjaan yang membutuhkan plan memakai context dan implementation plan di `docs/plans/<feature>/`; catat snapshot SHA dan periksa freshness sebelum eksekusi.

Saat kontrak, command atau keputusan berubah, perbarui dokumen canonical dalam perubahan yang sama. Pertahankan ID task dan catat evidence pada backlog/plan pemiliknya. Pisahkan proposal, keputusan disetujui, implementasi lokal dan proof production. Rename dokumen juga memperbarui link masuk/keluar, komentar referensi dan indeks.

Perubahan dokumentasi saja diperiksa dengan `bun run docs:check`, Prettier dan `git diff --check`; perubahan tooling/script menjalankan quality gate terkait. Hasil verifikasi menyebut command, scope, tanggal, hasil dan batas yang belum terbukti.

## Commit setelah task selesai

> Disetujui pengguna 5 Oktober 2026: setiap task yang selesai dibuatkan commit tersendiri.

Setelah acceptance criteria dan pemeriksaan yang relevan lulus, periksa diff, stage hanya perubahan task beserta dokumentasi yang diperlukan, lalu buat commit lokal Conventional Commits dengan ID task, misalnya `feat(api): add upload status endpoint (MEDIA-UP-003)`. Kerjakan commit ini sebelum beralih ke task berikutnya; tidak perlu meminta izin commit ulang atau menunggu seluruh modul selesai.

Jika pemeriksaan atau hook gagal, perbaiki kegagalannya dan ulangi tanpa bypass. Pertahankan perubahan lokal milik pekerjaan lain. Catat SHA aktual dan hasil pemeriksaan pada ledger task/plan sesudah commit; pembaruan ini dapat masuk commit task berikutnya. Jangan menebak SHA commit yang sedang dibuat. Status `Done` memerlukan acceptance criteria, validasi dan commit task berhasil; commit sendiri tidak membuktikan seluruh kriteria terpenuhi.

Aturan ini mengotorisasi commit lokal. Push, PR, merge dan deployment tetap mengikuti instruksi pengguna untuk operasi tersebut. Riwayat task lama tetap dipertahankan; task dokumentasi yang sudah selesai tetapi belum di-commit diserahkan sebagai commit terpisah sesuai aturan baru.

## Perubahan keputusan

Keputusan Agile dan pembagian modul menjadi task kecil disetujui pengguna pada 1 Oktober 2026. Gunakan status `Draft` untuk keputusan produk/teknis lain sampai disetujui, lalu tulis tanggal dan keputusan pada dokumen terkait. Jika implementasi menyimpang dari keputusan yang disetujui, perbarui dokumen serta alasan perubahan dalam pekerjaan yang sama. Prefix penamaan branch mengikuti root AGENTS; workflow ini belum menetapkan CI, model integrasi branch, durasi sprint, atau kebijakan deploy. MinIO development, R2 production, selector env dan HLS VOD disetujui pengguna pada 3 Oktober 2026; detail/proof mengikuti [backlog media](../tasks/media.md).
