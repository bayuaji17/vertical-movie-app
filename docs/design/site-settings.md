# Site settings

> Status: approved component/state specification · 2026-10-09 · Pengguna meminta implementasi plan lengkap. Runtime proof mengikuti [backlog SSET](../tasks/site-settings.md); specification ini bukan bukti browser/production.

Halaman `/admin/settings` menggunakan admin shell Rhea existing, semantic tokens dan Light/Dark/System. Navigasi Settings tersedia pada sidebar desktop dan drawer mobile. Identitas tetap pada admin/login; empat field hanya mengganti tampilan publik.

Form dan preview satu kolom pada320/390/768/1024, dua kolom ketika cukup ruang pada1440. FieldGroup/Field mengaitkan label, bantuan, counter Unicode dan error dengan input. Site name/Tagline memakai Input; Site description/Footer text memakai Textarea tetapi nilai tetap single-line plain text. Nilai opsional kosong tidak tampil pada preview/publik. Control minimum44px, unbroken names wrap, keyboard/focus mengikuti komponen Base UI.

Preview menampilkan brand, Browse/tagline/description/footer sebagai teks React. Preview memakai draft dan jelas menandai unsaved; ia tidak mengubah Query publik. Branding publik baru diperbarui dari respons Save yang sudah dikonfirmasi.

| State                    | Feedback dan tindakan                                                                                  |
| ------------------------ | ------------------------------------------------------------------------------------------------------ |
| Loading/read unavailable | Skeleton atau alert dan Try again; tidak menyimpan fallback sebagai data admin.                        |
| Pristine/dirty/invalid   | Saved values/Unsaved changes, validation per field; Save hanya valid dan dirty.                        |
| Saving/checking          | Input/actions dikunci, duplicate Save dicegah.                                                         |
| Saved                    | Changes saved dan last saved timestamp; baseline diganti respons committed.                            |
| Conflict/stale           | Draft dipertahankan; Reload saved values meminta discard confirmation bila dirty, lalu fresh1.         |
| Unknown                  | Save not confirmed; Check saved values membandingkan state observed, tidak replay Save.                |
| Offline                  | Draft dapat diedit, Save/check/reload dinonaktifkan.                                                   |
| Cancel/leave             | Discard confirmation; Cancel kembali ke last confirmed values; navigation/beforeunload guard existing. |
| Auth loss                | Scope/abort/draft dihapus oleh private effects; layout existing menangani login/forbidden.             |

Detail field/kontrak/deadline/cache tetap pada [plan](../plans/site-settings/implementation-plan.md#desired-behavior); evidence SQL/browser dan limitations berada pada backlog. Tidak ada raster mockup baru atau klaim browser sebelum proof actual dijalankan.
