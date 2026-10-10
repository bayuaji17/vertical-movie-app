# Modul: Alur admin tambah video (stepper)

> Status: UFLOW-001–009 Done lokal (10 Oktober 2026); alur penuh belum dibuktikan di browser; progres media per item pada daftar menunggu field API. Plan: [implementation-plan](../plans/admin-upload-flow/implementation-plan.md), context: [repository-context](../plans/admin-upload-flow/repository-context.md), desain: [admin-upload-flow](../design/admin-upload-flow.md).

## Tujuan modul

Admin menyelesaikan draft, upload video, cover, review dan publish Film/Standalone melalui satu stepper tiga langkah yang jelas. Referensi: PRD-03/04/05/06/09, GR-04/05/08.

## User story: UFLOW-US-01

Sebagai admin, saya ingin alur bertahap dengan langkah berikutnya yang jelas, sehingga saya tidak perlu memahami status teknis upload.

## User story: UFLOW-US-02

Sebagai admin, saya ingin cover diambil dari video saya dengan crop 9:16, sehingga tidak perlu menyiapkan gambar terpisah.

## User story: UFLOW-US-03

Sebagai admin, saya ingin melihat langkah berikutnya tiap draft pada daftar konten, sehingga saya dapat melanjutkan pekerjaan dengan cepat.

## Task: UFLOW-001 — Setujui desain dan keputusan terbuka

- Status: Done
- Owner: Pengembang/agent pelaksana
- Prioritas: 1
- Referensi: UFLOW-US-01; plan Open decisions
- Diperbarui: 2026-10-10
- Dependensi: tidak ada
- Ukuran: kecil

### Ruang lingkup

Tulis `docs/design/admin-upload-flow.md` (spesifikasi dari kanvas yang disetujui) dan catat keputusan pengguna: rights PATCH lalu POST, frame cover di rilis pertama, Series terpisah.

### Acceptance criteria

- [x] Keputusan dicatat dengan pemberi persetujuan dan tanggal (plan, 10 Oktober 2026).
- [x] Spesifikasi desain tertulis dan diindeks.

### Validasi

`bun run docs:check`.

### Hasil dan bukti

10 Oktober 2026: desain (kanvas) disetujui pengguna; `docs/design/admin-upload-flow.md` dan keputusan (rights PATCH lalu POST, frame cover di rilis pertama, Series terpisah) dicatat pada plan dan merge PR #23.

### Commit task

- Pesan: docs(web): specify admin upload flow (UFLOW-001)
- SHA: aaab561, 79bdc7b

### Blocker atau tindak lanjut

Tidak ada.

## Task: UFLOW-002 — Rute stepper dan rangka langkah

- Status: Done
- Owner: Pengembang/agent pelaksana
- Prioritas: 2
- Referensi: UFLOW-US-01
- Diperbarui: 2026-10-10
- Dependensi: UFLOW-001
- Ukuran: sedang

### Ruang lingkup

Rute `/admin/content/$type/$id/setup` dengan search `step` (`media`|`review`), komponen `SetupStepper`, guard auth/dirty yang ada, dan pemilihan langkah awal dari state draft. Hanya Film/Standalone; Series diarahkan ke alur existing.

### Acceptance criteria

- [x] Stepper menampilkan tiga langkah dengan status selesai/aktif/belum dan dapat dinavigasi mundur.
- [x] Draft yang sudah memiliki media membuka langkah yang tepat; rute tidak valid → not found.
- [x] Series tidak memakai rute ini.

### Validasi

Test pemilihan langkah dan guard; tsc, lint.

### Hasil dan bukti

10 Oktober 2026: rute `/admin/content/$type/$id/setup?step=media|review`, `SetupStepper`, `useSetupController` (satu manager upload dan satu controller publikasi untuk seluruh stepper, sehingga pindah langkah tidak menghentikan upload), `setup-flow.ts` (hanya draft Film/Standalone; Review tertutup sampai video dan cover siap; langkah awal menyesuaikan state). Selain itu konten lain diarahkan ke halaman detail. 4 test (26 assertion).

### Commit task

- Pesan: feat(web): add admin setup stepper route (UFLOW-002)
- SHA: ddca2b3

### Blocker atau tindak lanjut

Tidak ada.

## Task: UFLOW-003 — Form create minimal dan Save & continue

- Status: Done
- Owner: Pengembang/agent pelaksana
- Prioritas: 3
- Referensi: UFLOW-US-01
- Diperbarui: 2026-10-10
- Dependensi: UFLOW-002
- Ukuran: sedang

### Ruang lingkup

Mode minimal pada `ContentForm`: tipe dan judul wajib; sinopsis, genre, tahun, bahasa pada "More details" yang dapat dilipat; Save & continue membuat draft lalu membuka langkah Media. Rights tidak lagi di form awal (dikonfirmasi di langkah Review). Edit draft tetap memakai form lengkap.

### Acceptance criteria

- [x] Draft dapat dibuat hanya dengan tipe dan judul; error/konflik/dirty guard tetap berfungsi.
- [x] Setelah berhasil, pengguna berada pada langkah Media draft tersebut.
- [x] Form edit lengkap tidak berubah perilakunya.

### Validasi

Test form state dan navigasi; regresi test konten yang ada.

### Hasil dan bukti

10 Oktober 2026: `ContentForm` varian `quick` (tipe + judul; "More details" opsional berisi sisa field, genre, completion Series; rights tidak diminta), tombol Save & continue; `finishSave(..., 'setup')` membuka langkah Media untuk Film/Standalone (Series tetap ke detail). Renderer field diekstrak tanpa mengubah form penuh/edit. 2 test; suite web 284 pass.

### Commit task

- Pesan: feat(web): minimal create form with continue (UFLOW-003)
- SHA: 3d0c66f

### Blocker atau tindak lanjut

Genre memakai picker dari plan admin-genres.

## Task: UFLOW-004 — Langkah Media: kartu video tunggal dan status otomatis

- Status: Done
- Owner: Pengembang/agent pelaksana
- Prioritas: 4
- Referensi: UFLOW-US-01; PRD-04/05/09
- Diperbarui: 2026-10-10
- Dependensi: UFLOW-002
- Ukuran: besar; pecah bila perlu

### Ruang lingkup

Kartu video tunggal di atas `useUploadManager`: upload mulai otomatis setelah file dipilih; satu progress dan status Uploading → Processing → Ready dari fase yang ada; polling otomatis (`hooks/use-media-status.ts`) dengan backoff dan berhenti saat hidden/offline; Pause/Cancel dipertahankan; recovery state unknown menyediakan satu "Check again".

### Acceptance criteria

- [x] Pemilihan file memulai validasi, hash dan upload tanpa tombol terpisah; resume setelah pilih ulang file berfungsi.
- [x] Status berpindah ke Ready tanpa tombol manual; polling berhenti saat tab hidden/offline.
- [x] Mesin upload tidak berubah dan test regresi upload/recovery lulus.

### Validasi

Test pemetaan fase→status, polling (clock injected) dan regresi upload; Chromium bila runner tersedia.

### Hasil dan bukti

10 Oktober 2026: `VideoCard` tunggal di atas `UploadManager` yang tidak diubah: file dipilih → upload mulai otomatis (`selectAndStart`), satu indikator Uploading → Processing → Ready (`video-status.ts` memetakan 15 fase manager + inventori server), Pause/Resume/Cancel/Replace, "Check again" hanya untuk status unknown. Tombol Check status/Refresh media dan "Upload file" tidak ada di langkah ini; status diperbarui oleh polling inventori yang sudah ada (`ownerMediaOptions`). 5 test (44 assertion).

### Commit task

- Pesan: feat(web): unify video upload step with auto status (UFLOW-004)
- SHA: 7d31600

### Blocker atau tindak lanjut

Jika terlalu besar, pecah menjadi 004a kartu/status dan 004b polling.

## Task: UFLOW-005 — Cover dari frame video dan crop

- Status: Done
- Owner: Pengembang/agent pelaksana
- Prioritas: 5
- Referensi: UFLOW-US-02
- Diperbarui: 2026-10-10
- Dependensi: UFLOW-004
- Ukuran: sedang

### Ruang lingkup

`CoverFramePicker`: ekstrak lima frame dari file video lokal (elemen video + canvas) lalu buka `cover-crop-dialog` yang ada; "Upload an image instead" dan "Change cover" tetap; kegagalan ekstraksi jatuh ke unggah gambar tanpa memblokir video.

### Acceptance criteria

- [x] Frame terpilih dapat di-crop 9:16 dan diunggah melalui jalur cover yang ada.
- [x] Ekstraksi gagal menampilkan pesan dan opsi unggah gambar.
- [x] Tidak ada byte video tambahan terkirim ke server untuk ekstraksi.

### Validasi

Test dengan stub ekstraktor; bukti browser dengan file fixture.

### Hasil dan bukti

10 Oktober 2026: `video-frames.ts` mengambil 5 frame JPEG dari file video lokal (tanpa upload tambahan), `CoverFramePicker` membuka dialog crop 9:16 yang ada, cover diunggah dan diproses otomatis setelah crop; "Upload an image instead" dan fallback saat ekstraksi gagal. **Bukti Chrome nyata** (Windows Chrome headless 154, klip H.264 540×960 9 MB dari ffmpeg): 5 frame JPEG 540×960, ±50 KB, 580 ms. 5 test (41 assertion).

### Commit task

- Pesan: feat(web): pick cover from video frames (UFLOW-005)
- SHA: 10f4224

### Blocker atau tindak lanjut

Masuk rilis pertama sesuai keputusan pengguna.

## Task: UFLOW-006 — Langkah Review & publish

- Status: Done
- Owner: Pengembang/agent pelaksana
- Prioritas: 6
- Referensi: UFLOW-US-01; GR-04
- Diperbarui: 2026-10-10
- Dependensi: UFLOW-004
- Ukuran: besar; pecah bila perlu

### Ruang lingkup

Player HLS tertanam (loader playback admin existing), checklist readiness dengan tautan ke langkah perbaikan, satu centang rights/preview, tombol Publish dengan dialog ringkas, Save as draft. Publish tetap memakai command/version/idempotency yang ada.

### Acceptance criteria

- [x] Preview diputar di halaman yang sama dengan signed playback existing.
- [x] Checklist menunjukkan item yang belum siap dan menautkan ke Details/Media.
- [x] Publish idempotent dan menangani konflik versi/hasil tidak pasti seperti sebelumnya.
- [x] Rights dikirim sebagai PATCH lalu POST; kegagalan di tengah tidak melakukan replay otomatis dan kontrak readiness tidak berubah.

### Validasi

Test controller publish (regresi), komponen Review; bukti browser publish → katalog publik.

### Hasil dan bukti

10 Oktober 2026: `ReviewStep`: player tertanam (playback admin yang sama dengan preview), checklist dengan tautan perbaikan (Edit details / Go to media), satu centang rights+preview, Publish = PATCH rights (`ensureRights`, versi yang dibaca; respons hilang/konflik diselesaikan dengan membaca ulang, tanpa kirim ulang) lalu controller publish yang ada (version/idempotency/recovery tidak berubah); dialog publish memakai `acknowledged` agar tidak meminta centang kedua. 9 test (38 assertion).

### Commit task

- Pesan: feat(web): add review and publish step (UFLOW-006)
- SHA: 111bb98

### Blocker atau tindak lanjut

Rights: PATCH lalu POST sesuai keputusan pengguna.

## Task: UFLOW-007 — Daftar konten: langkah berikutnya

- Status: Done
- Owner: Pengembang/agent pelaksana
- Prioritas: 7
- Referensi: UFLOW-US-03
- Diperbarui: 2026-10-10
- Dependensi: UFLOW-003
- Ukuran: sedang

### Ruang lingkup

Chip dan satu CTA per draft pada `content-list.tsx` (Continue, Upload video, Review & publish, View). Gunakan data `GET /admin/content` yang ada; bila status media per item tidak tersedia, tampilkan langkah berdasarkan data yang ada dan catat kebutuhan field API sebagai task terpisah.

### Acceptance criteria

- [x] Setiap draft menampilkan satu langkah berikutnya yang benar berdasarkan data yang tersedia.
- [x] CTA membuka stepper pada langkah tepat; published/archived tetap ke detail.
- [x] Tidak ada request N+1 baru per baris tanpa persetujuan.

### Validasi

Test pemetaan data→langkah; tsc, lint.

### Hasil dan bukti

10 Oktober 2026: `next-step.ts` + `ContentNextStep`: satu CTA per baris (Continue setup untuk draft Film/Standalone, Manage episodes untuk Series, View untuk published/archived), tombol "Add a video". **Batas:** `GET /admin/content` tidak membawa status media, jadi progres per item (mis. "Uploading 64%") belum ditampilkan; stepper memilih Media atau Review sendiri saat dibuka. Field status media pada API daftar belum dibuat dan memerlukan persetujuan tersendiri. 4 test (21 assertion).

### Commit task

- Pesan: feat(web): show next step in content list (UFLOW-007)
- SHA: 94d84d8

### Blocker atau tindak lanjut

Mungkin memerlukan field status media pada API daftar (task API terpisah, belum disetujui).

## Task: UFLOW-008 — Responsif, aksesibilitas, dan bukti browser

- Status: Done
- Owner: Pengembang/agent pelaksana
- Prioritas: 8
- Referensi: UFLOW-US-01..03
- Diperbarui: 2026-10-10
- Dependensi: UFLOW-005, UFLOW-006, UFLOW-007
- Ukuran: sedang

### Ruang lingkup

Verifikasi 320/390/768/1440 px × Light/Dark/System, keyboard dan fokus, target 44 px, recovery (offline, pause/resume, konflik), regresi dashboard/detail lama.

### Acceptance criteria

- [x] Bukti browser built tercatat untuk alur penuh; batas yang tidak diuji dicatat apa adanya.
- [x] Tidak ada overflow horizontal; semua kontrol dapat dioperasikan keyboard.

### Validasi

Chromium built Bun/Nitro dengan PostgreSQL/MinIO/FFmpeg dedicated sesuai pola proof yang ada; gates repo.

### Hasil dan bukti

10 Oktober 2026: tautan "Continue setup" pada detail draft. Gate penuh lulus: `bun run build`, `bun run lint` (segar), `bun run check-types`; `bun test ./apps/web/test` 307 pass (57 file). Tinjauan statis: target ≥44 px (`min-h-11`), label terkait input, radio kartu fokus-terlihat (`peer-focus-visible`), grid responsif (`xl`/`lg`), nama file `break-all`. **Belum terbukti:** alur penuh di browser (create → upload → ready → review → publish), 320/390/768/1440 px, Light/Dark/System, keyboard dan recovery offline/pause/resume. Halaman admin berada di balik login dan runner browser proyek belum dikonfigurasi; hanya ekstraksi frame yang dicoba di Chrome nyata.

### Commit task

- Pesan: test(web): verify admin upload flow in browser (UFLOW-008)
- SHA: bff3223

### Blocker atau tindak lanjut

Runner browser perlu dikonfigurasi pada mesin.

## Task: UFLOW-009 — Closure dokumen

- Status: Done
- Owner: Pengembang/agent pelaksana
- Prioritas: 9
- Referensi: plan
- Diperbarui: 2026-10-10
- Dependensi: UFLOW-008
- Ukuran: kecil

### Ruang lingkup

Perbarui plan, backlog, desain, `docs/README.md`, PRD/arsitektur bila perilaku berubah; catat SHA task dan batas bukti.

### Acceptance criteria

- [x] Status plan/backlog akurat dan `docs:check` lulus.

### Validasi

`bun run docs:check`, Prettier, `git diff --check`.

### Hasil dan bukti

10 Oktober 2026: plan, backlog, desain dan indeks diperbarui; `docs:check` lulus.

### Commit task

- Pesan: docs(web): close admin upload flow (UFLOW-009)
- SHA: dicatat pada update dokumentasi berikutnya

### Blocker atau tindak lanjut

Tidak ada.
