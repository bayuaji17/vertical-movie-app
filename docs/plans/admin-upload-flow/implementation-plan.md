# Implementation plan: Alur admin tambah video (stepper)

## Plan metadata

- Status: **proposed** — desain disetujui pengguna 10 Oktober 2026; plan menunggu persetujuan implementasi.
- Date: 10 Oktober 2026; decision owner: pengguna.
- Repository: `bayuaji17/vertical-movie-app`; base ref: `main`; base SHA: `acffe2dcdad62ddf003ff1ae2aa2db4ed8dce07a`.
- Context: [repository-context.md](repository-context.md).
- Backlog: [admin-upload-flow](../../tasks/admin-upload-flow.md), UFLOW-001–009.
- Desain: [admin-upload-flow](../../design/admin-upload-flow.md); kategori ditangani oleh [plan admin-categories](../admin-categories/implementation-plan.md).
- Planning branch: `chore/admin-upload-flow-plan`; implementation branch (saran): `feat/admin-upload-flow`.

## Objective

Admin Film/Standalone menyelesaikan draft → video → cover → review → publish melalui satu stepper tiga langkah (Details, Media, Review & publish) dengan satu indikator status media yang diperbarui otomatis, tanpa istilah teknis dan tanpa berpindah rute untuk preview.

## Goals dan non-goals

Goals: stepper di rute baru; form create minimal; kartu video tunggal dengan upload otomatis dan status berurutan; cover dari frame video lokal + crop yang ada + unggah gambar; review dengan preview tertanam, checklist yang menautkan ke langkah perbaikan, rights, dan publish; daftar konten dengan langkah berikutnya; responsif 320–1440 px; test dan bukti browser.

Non-goals: perubahan mesin upload, kontrak API media/publication, alur Series/season/episode (lanjutan), restore/republish, subtitle, upload yang berlanjut setelah tab ditutup, perubahan production/storage.

## Current behavior

Lihat [context](repository-context.md#observed-flow-kode-saat-ini).

## Desired behavior

Mengikuti desain tujuh artboard (Details, Media uploading, Media ready, Review, Publish dialog, daftar konten, mobile).

- **Details:** hanya tipe dan judul wajib; sinopsis, genre/kategori, tahun dan bahasa pada bagian "More details" (opsional). "Save & continue" membuat draft lalu membuka langkah Media. Kategori diatur melalui [plan admin-categories](../admin-categories/implementation-plan.md).
- **Media:** satu kartu video; file dipilih → validasi, hash dan upload mulai otomatis; satu progress bar dan status _Uploading → Processing → Ready_ dari state `UploadPhase`/`OwnerMedia` yang ada; status dibaca otomatis (polling dengan interval wajar dan berhenti saat tab tersembunyi/offline); tombol Pause dan Cancel tetap; tombol _Check status_/_Refresh media_ dihapus dari alur normal (recovery state "unknown" tetap menyediakan satu tombol "Check again"). Cover: pemilih 5 frame dari file video lokal → dialog crop 9:16 yang ada → upload cover yang ada; "Upload an image instead" tetap. Continue aktif saat video dan cover Ready.
- **Review & publish:** player HLS tertanam memakai loader playback admin yang ada; checklist dari readiness API (tautan perbaikan menuju langkah terkait); satu centang rights/preview; tombol Publish membuka dialog ringkas. Publish tetap memakai command, version dan idempotency yang ada. **Keputusan terbuka:** rights saat ini adalah syarat readiness dari metadata; memindahkannya ke langkah Review memerlukan PATCH metadata sebelum POST publish (tidak atomik) atau perubahan API.
- **Daftar konten:** chip langkah berikutnya dan satu tombol aksi per draft (Continue/Upload video/Review & publish/View). Data yang tersedia pada `GET /admin/content` menentukan seberapa akurat; field status media per item mungkin memerlukan perubahan API (lihat UFLOW-007).
- Detail halaman lama tetap untuk konten published/archived dan sebagai tampilan read-only.

## Impact analysis

Hanya `apps/web`. Risiko tertinggi: regresi mesin upload (hash/resume/recovery/auth cleanup/leave guard) bila orkestrasi baru memanggilnya berbeda; mitigasi dengan mempertahankan `useUploadManager` dan menambah test sebelum refactor tampilan.

## Affected files and symbols

| File                                                             | Perubahan                                                      |
| ---------------------------------------------------------------- | -------------------------------------------------------------- |
| `routes/admin._authenticated.content.$type.$id.setup.tsx` (baru) | Rute stepper dengan search `step=media\|review`.               |
| `components/admin/setup/*` (baru)                                | `SetupStepper`, `MediaStep`, `ReviewStep`, `CoverFramePicker`. |
| `content-create.tsx`, `content-form.tsx`                         | Mode minimal + "More details".                                 |
| `media-upload-card.tsx`, `media-panel.tsx`                       | Dipakai ulang/dipecah; status disederhanakan.                  |
| `publication-panel.tsx`, `publication-dialogs.tsx`               | Checklist/dialog dipakai ulang di Review.                      |
| `content-list.tsx`                                               | Chip dan CTA langkah berikutnya.                               |
| `hooks/use-media-status.ts` (baru, bila perlu)                   | Polling status otomatis.                                       |

## Implementation DAG

UFLOW-001 → UFLOW-002 → UFLOW-003; UFLOW-002 → UFLOW-004 → UFLOW-005; UFLOW-004 → UFLOW-006; UFLOW-003 → UFLOW-007; UFLOW-005,006,007 → UFLOW-008 → UFLOW-009.

## Test requirements

Unit: pemetaan fase upload → status tunggal, pemilihan langkah, polling, pemilih frame (ekstraksi frame dengan stub). Regresi: suite upload/publication yang ada. Browser built (Chromium): alur penuh create → upload → ready → review → publish pada 390/768/1440 Light/Dark, keyboard, dan recovery (offline, pause/resume). `bun run check-types`, `bun run lint`, `bun run build`, `bun run docs:check`.

## Constraints

Aturan root `AGENTS.md`; commit per task dengan ID; tanpa bypass hook; push/PR/merge sesuai otorisasi pengguna.

## Acceptance criteria

- [ ] Admin menyelesaikan Film/Standalone dari Add a video sampai Publish melalui stepper tanpa membuka halaman detail.
- [ ] Upload mulai otomatis dan status media diperbarui tanpa tombol manual; recovery tetap tersedia.
- [ ] Cover dapat dipilih dari frame video, di-crop 9:16 atau diunggah sebagai gambar.
- [ ] Review menampilkan preview tertanam dan checklist dengan tautan perbaikan; Publish idempotent dan aman terhadap konflik versi.
- [ ] Daftar konten menunjukkan langkah berikutnya per draft.
- [ ] Mesin upload dan kontrak API tidak berubah; test regresi lulus.
- [ ] Gates dan bukti browser dicatat per task.

## Risks and mitigations

| Risiko                                                      | Mitigasi                                                                 |
| ----------------------------------------------------------- | ------------------------------------------------------------------------ |
| Regresi upload/resume/leave guard                           | Pertahankan `useUploadManager`; test regresi sebelum perubahan tampilan. |
| Ekstraksi frame gagal pada codec/format tertentu di browser | Fallback "Upload an image instead"; tidak memblokir upload video.        |
| Polling membebani API                                       | Interval dengan backoff; berhenti saat hidden/offline.                   |
| Rights dipindah memecah atomisitas                          | Keputusan terbuka; default PATCH lalu POST dengan recovery yang jelas.   |
| Next-step di daftar membutuhkan data per item               | UFLOW-007 mulai dari data yang ada; API tambahan sebagai task terpisah.  |

## Rollback or recovery

Rute stepper baru dapat dilepas dan tautan "Add a video" dikembalikan ke `/admin/content/new`; halaman detail lama tetap berfungsi. Tidak ada schema/env/data yang berubah.

## Open decisions (menunggu pengguna)

1. Rights: PATCH lalu POST di UI, atau ubah API agar rights dikirim saat publish?
2. Ekstraksi frame cover masuk rilis pertama atau menyusul setelah stepper stabil?
3. Series (season/episode) dikerjakan terpisah setelah modul ini?

## Evidence

Observasi kode pada base SHA. Belum ada bukti implementasi.

## Execution log

- 10 Oktober 2026: context dan plan ditulis; status proposed. Desain dibuat sebagai kanvas dan disetujui pengguna.
