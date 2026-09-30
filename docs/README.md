# Dokumentasi proyek

Ini adalah satu-satunya direktori dokumentasi proyek. `README.md` di root tetap menjadi panduan mulai cepat; file ini menjadi indeks dokumen produk dan teknik. Dokumen di bawah masih berupa draft untuk ditinjau, bukan deskripsi fitur yang sudah diimplementasikan.

## Dokumen draft

| Dokumen                               | Isi                                                                                     |
| ------------------------------------- | --------------------------------------------------------------------------------------- |
| [PRD](PRD.md)                         | Aplikasi tonton video vertikal, admin tunggal, penonton tanpa login, dan kriteria MVP.  |
| [Architecture](ARCHITECTURE.md)       | Tech stack pilihan, R2/S3-compatible storage, queue PostgreSQL, FFmpeg, dan alur media. |
| [Global Rules](GLOBAL_RULES.md)       | Usulan aturan produk dan teknik lintas fitur.                                           |
| [Global Workflow](GLOBAL_WORKFLOW.md) | Usulan alur dari kebutuhan sampai implementasi, validasi, dan rilis.                    |
| [Design System](DESIGN_SYSTEM.md)     | Usulan prinsip antarmuka, token, komponen, dan target aksesibilitas.                    |

Catat tanggal persetujuan dan pemilik keputusan di setiap dokumen. Pisahkan perilaku yang diusulkan dari kode yang sudah berjalan.

## Struktur saat ini

| Path                                  | Tanggung jawab                                                                                                                         |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/api/`                           | API Elysia di Bun. `src/index.ts` saat ini hanya memiliki `GET /` dan secara default berjalan pada port 3001.                          |
| `apps/web/`                           | Web TanStack Start. Rute ada di `src/routes/`; `src/routeTree.gen.ts` adalah file hasil generasi. Pengembangan default pada port 3000. |
| `turbo.json`                          | Definisi task workspace dan cache output build.                                                                                        |
| `.husky/` dan `commitlint.config.cjs` | Pemeriksaan sebelum commit dan validasi pesan Conventional Commits.                                                                    |

Kedua app saat ini masih berupa starter. Model domain video, kontrak API, dan integrasi web ke API belum diimplementasikan. Catat keputusan final di sini dengan mengacu pada kode dan skrip yang benar-benar ada.

## Bekerja di repo ini

Gunakan Bun 1.4.2 dari root repo:

```sh
bun install --frozen-lockfile
bun run dev
bun run lint
bun run check-types
bun run build
```

`dev` menjalankan kedua app. `build` menghasilkan `apps/api/dist/` dan `apps/web/.output/`; `bun run start` menjalankan hasil build dengan Bun. Gunakan filter `--filter=api` atau `--filter=web` untuk satu app. Saat ini lint hanya mencakup `web`, sedangkan pemeriksaan tipe dan build mencakup keduanya.

Gunakan pesan Conventional Commits seperti `feat(api): add movie endpoint`. Husky menjalankan lint dan pemeriksaan tipe sebelum commit, lalu Commitlint memvalidasi pesannya.
