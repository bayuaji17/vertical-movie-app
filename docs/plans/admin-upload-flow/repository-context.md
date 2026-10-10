# Repository context: Alur admin tambah video (stepper)

## Snapshot

- Repository: `bayuaji17/vertical-movie-app`.
- Base ref: `main`; base SHA: `acffe2dcdad62ddf003ff1ae2aa2db4ed8dce07a`.
- Analyzed at: 10 Oktober 2026 (Asia/Jakarta).
- Context status: snapshot perencanaan pada SHA di atas; periksa freshness sebelum implementasi.
- Planning branch: `chore/admin-upload-flow-plan`.
- Request: pengguna menilai alur admin membuat video, upload video dan upload thumbnail terlalu rumit; menyetujui arah desain (stepper tiga langkah) pada 10 Oktober 2026 dan meminta branch plan. Desain: [kanvas](https://claude.ai/artifact/NaGoxkbairUuwLHuUmskia) (artefak eksternal, privat milik pengguna).

## Observed flow (kode saat ini)

1. `/admin/content/new` — `components/admin/content-create.tsx` merender `ContentForm` lengkap (type, judul, sinopsis, genre, rights, dan lainnya) dan `useContentEditor().finishSave` mengarahkan ke detail.
2. `/admin/content/$type/$id` — `content-detail.tsx` menampilkan kartu metadata read-only, lalu `VideoPublicationMedia` (`publication-panel.tsx`): kartu Publication (checklist tujuh syarat, tombol Preview/Publish/Archive) dan `MediaPanelView` (`media-panel.tsx`).
3. `MediaPanelView` merender dua `MediaUploadCard` terpisah (source dan poster). Tiap kartu memiliki state `UploadPhase` sendiri (checking, hashing, uploading, paused, unknown, needs-prepare, processing, completed, failed) dan tombol manual _Check status_, _Refresh media_, _Cancel_. Cover memakai `cover-crop-dialog.tsx`.
4. Preview berada di rute terpisah `/admin/videos/$id/preview`; Publish/Archive memakai dialog dari `publication-dialogs.tsx` dan controller `use-publication`/`use-owner-publication`.
5. Series memakai alur terpisah (season/episode editor, ASER) dan tidak termasuk plan ini.

## Hal yang membuat alur terasa rumit (observed dari struktur kode dan teks UI)

- Satu halaman detail memuat metadata, checklist, dan dua uploader; tidak ada urutan langkah.
- Istilah teknis tampil (_Check upload status_, state needs-prepare, _Refresh media_) dan status tidak otomatis diperbarui.
- Rights dikonfirmasi di form metadata awal, padahal relevan saat publish; preview dan publish terpisah rute.
- Daftar konten tidak menunjukkan langkah berikutnya per draft.

## Repository map (bagian relevan)

| Area                                                                                                                             | Peran                                                                               |
| -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `apps/web/src/components/admin/content-create.tsx`, `content-form.tsx`, `content-detail.tsx`, `content-list.tsx`                 | Create, form, detail, daftar.                                                       |
| `apps/web/src/components/admin/media-panel.tsx`, `media-upload-card.tsx`, `cover-crop-dialog.tsx`, `media-processing-status.tsx` | Uploader dan cover.                                                                 |
| `apps/web/src/hooks/use-upload-manager.ts`, `lib/admin/upload-*`                                                                 | Mesin upload (hash, multipart, resume, recovery) — sudah punya bukti; tidak diubah. |
| `apps/web/src/components/admin/publication-panel.tsx`, `publication-dialogs.tsx`, `hooks/use-publication.ts`                     | Readiness, Preview, Publish, Archive.                                               |
| `apps/web/src/routes/admin._authenticated.videos.$id.preview.tsx`                                                                | Preview admin.                                                                      |
| `apps/api/src/modules/media`, `publication`, `content`                                                                           | API upload/publication/metadata (tidak diubah oleh plan ini kecuali dinyatakan).    |

## Constraints dari repo

- Mesin upload dan kontrak API media/publication dipertahankan; perubahan hanya presentasi dan orkestrasi web.
- Tanpa edit `routeTree.gen.ts`; hooks di `apps/web/src/hooks/`; komponen di `src/components`.
- Readiness/publish tetap authoritative di API; acknowledgement preview tetap bukan bukti audit.
- Tidak ada schema, env atau dependensi baru yang direncanakan.
