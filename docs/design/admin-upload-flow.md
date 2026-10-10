# Alur admin tambah video

> Status: approved plan, desain disetujui pengguna 10 Oktober 2026 · Sumber: kanvas desain [Alur Admin Upload Video](https://claude.ai/artifact/NaGoxkbairUuwLHuUmskia) (artefak eksternal privat milik pengguna; bukan bukti implementasi).

Stepper tiga langkah untuk Film/Standalone: **Details → Media → Review & publish**, memakai token design system yang ada (lime, Space Grotesk/Inter, sudut membulat, Light/Dark).

| Artboard          | Isi                                                                                                                                                                     |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Details           | Tipe (Film/Standalone/Series) dan judul wajib; "More details" opsional; Save & continue.                                                                                |
| Media — uploading | Kartu video tunggal (nama, ukuran, progress, Pause/Cancel), status Uploading → Processing → Ready; kartu Cover dengan lima frame, Adjust crop, Upload an image instead. |
| Media — ready     | Video dan Cover Ready; Continue to review aktif.                                                                                                                        |
| Review & publish  | Preview 9:16 tertanam, checklist readiness, centang rights/preview, Publish dan Save as draft.                                                                          |
| Publish dialog    | Ringkasan: tampil di katalog segera; archive tidak dapat dipulihkan.                                                                                                    |
| Content list      | Chip dan CTA langkah berikutnya per draft.                                                                                                                              |
| Mobile — Media    | Satu kolom 390 px, Continue menempel di bawah.                                                                                                                          |

State yang harus tercakup saat implementasi: loading, kosong, error, offline, upload paused/gagal/unknown, konflik versi, dan guard dirty/leave yang sudah ada. Genre multi-pilih dan halaman manajemen ada pada [plan admin-genres](../plans/admin-genres/implementation-plan.md). Series tidak termasuk.
