# Video Operations — metadata tahap A

Pada 3 Oktober 2026, backend metadata mendukung `standalone`, `movie`, dan `episode` pada branch `feat/video-metadata`. Enam tabel dan 16 endpoint admin tersedia. Validasi memakai PostgreSQL localhost dedicated dan `app.handle()` tanpa membuka port. Storage S3, upload, worker FFmpeg, publikasi, katalog publik, serta UI/gateway bisnis belum tersedia pada iterasi ini.

## Endpoint dan akses

Path Elysia adalah `/admin/series`, `/admin/genres`, dan `/admin/videos`; daftar lengkap kontrak ada pada [plan](VIDEO_IMPLEMENTATION_PLAN.md#kontrak-endpoint-tahap-a). Better Auth tetap `/api/auth/*`, dokumentasi Scalar `/openapi` dan `/openapi/json`.

Setiap endpoint konten membaca sesi native tanpa cookie cache, lalu memeriksa role admin, ban, dan expiry. Response privat memakai `Cache-Control: private, no-store`. Unauthorized 401, non-admin/banned 403, auth dependency unavailable 503. Field metadata divalidasi ketat; unknown fields dan status publikasi buatan client ditolak 422. Error domain memakai `{error:{code,message,requestId}}`; duplicate slug/nomor dan stale version menghasilkan 409.

Browser Eden saat ini memakai base `/api`, tetapi gateway web hanya meneruskan auth. Jangan menganggap `/api/admin/videos` sudah berfungsi. Integrasi browser, penerusan cookie, dan SSR bisnis mengikuti WEB-CONTENT-001. Proof backend memakai direct request dengan cookie native fixture; belum ada uji browser pengelolaan konten.

## Contoh alur

Kirim JSON berikut sebagai body `POST /admin/genres` dengan sesi admin:

```json
{ "name": "Drama", "slug": "drama" }
```

Simpan `id` genre dari response 201. `POST /admin/series` membuat series dan Season 1 dalam satu transaksi:

```json
{
  "title": "Cerita Baru",
  "slug": "cerita-baru",
  "originalLanguage": "id",
  "releaseYear": 2026,
  "genreIds": ["<genre-id>"]
}
```

`<genre-id>` dan placeholder ID berikut harus diganti UUID hasil API. Response 201 berbentuk `{series:{...},defaultSeason:{...}}`; tiap snapshot memiliki `id` dan `rowVersion:1`. Tambah season lewat `POST /admin/series/<series-id>/seasons` dengan `{"seasonNumber":2}`. Nomor unik per series dan tetap reserved setelah archive.

Episode memerlukan season yang tersedia dan belum diarsipkan. Body `POST /admin/videos`:

```json
{
  "kind": "episode",
  "title": "Episode 1",
  "seasonId": "<season-id>",
  "episodeNumber": 1
}
```

Response 201 adalah snapshot video draft dengan `seasonId`, `episodeNumber`, dan `genreIds`. `GET /admin/videos/<video-id>` menambahkan ringkasan series/season dan `effectiveGenres`. Genre episode mengikuti series ketika tidak ada override; `genreIds:[]` pada PATCH mengembalikan inheritance.

Movie memakai tabel videos yang sama tanpa season/nomor episode:

```json
{
  "kind": "movie",
  "title": "Film Panjang",
  "releaseYear": 2026,
  "releaseDate": "2026-10-03",
  "rightsConfirmed": true
}
```

`standalone` mengikuti kontrak yang sama. Durasi, resolusi, rasio, source URL, dan status transcode belum menjadi field input/output metadata. Tidak ada pembatasan durasi pendek/9:16 pada jenis movie. `rightsConfirmed` menyimpan timestamp/actor server; body tidak dapat menentukan audit actor/timestamp. Konfirmasi ini belum membuat video dapat dipublikasikan.

Edit via `PATCH /admin/videos/<video-id>`:

```json
{ "expectedVersion": 1, "title": "Judul Baru", "synopsis": null }
```

Response 200 memiliki `rowVersion:2`. Field absent mempertahankan nilai; null menghapus metadata optional. Versi lama ditolak 409. Set genre dan metadata diperbarui atomik. Kind immutable; slug/grouping terkunci setelah pernah terbit. Grouping PATCH hanya sah untuk episode. `releaseDate` adalah tanggal kalender `YYYY-MM-DD`, harus cocok dengan `releaseYear` jika keduanya terisi. Language menggunakan BCP 47 canonical.

Archive via `POST /admin/videos/<video-id>/archive` dengan `{"expectedVersion":2}`. Snapshot menjadi version 3 dan memiliki `archivedAt`. Pengulangan dengan versi 3 mengembalikan snapshot sama; versi 2 sudah stale. Archive tidak menghapus row/genre/child. Konten published atau parent dengan child published ditolak. Parent archived melarang perubahan/child baru. Archive series/season memakai path serupa sesuai plan.

List `GET /admin/videos?kind=episode&seriesId=<series-id>&limit=20` mendukung cursor, search title, dan filter season. Default limit 20, maksimum 100. Response `{items:[],nextCursor:null}` bila kosong. Gunakan nextCursor hanya bersama filter yang sama. Default list menyembunyikan row atau parent archived; `includeArchived=true` menyertakannya. Detail admin masih dapat membaca metadata archived.

## Migrasi dan recovery

History auth `0000`–`0002` tetap utuh. Tambahan konten:

| Migrasi               | Isi                                                      |
| --------------------- | -------------------------------------------------------- |
| `0003_content-series` | series, seasons, editorial/audit/publication constraints |
| `0004_content-videos` | videos, kind/episode constraints, rights confirmation    |
| `0005_content-genres` | genres, series_genres, video_genres                      |

Migrator full sekarang memiliki enam entry. Pada tindak lanjut VERIFY-001 tanggal 3 Oktober 2026, **migrasi development lokal telah diterapkan**: journal 3 → 6, keenam tabel/constraints tersedia, dan data auth existing tetap utuh. Backup custom-format di luar repo tervalidasi melalui `pg_restore --list`; restore penuh belum diuji. Production belum dimigrasikan. Sebelum rollout, operator memeriksa `DATABASE_URL` pada API tanpa menyalin credential ke log, menyiapkan backup dan prosedur restore, lalu meninjau SQL pending terhadap journal target. Command dari root:

```sh
bun run --cwd apps/api db:migrate
```

Jalankan sebelum runtime baru menerima request metadata. Command membaca env API dan hanya menerapkan migration pending; tidak berjalan otomatis saat HTTP request. Periksa enam entry journal dan keberadaan tabel/FK, lalu login serta buat/read/edit/archive fixture konten pada target rollout. Backup/restore dan smoke deployment belum dibuktikan oleh test lokal ini. Auth masih mengikuti [Auth Operations](AUTH_OPERATIONS.md).

Rollback binary ke versi sebelum metadata dapat meninggalkan tabel tambahan tanpa mengubah data auth. Pertahankan tabel/data konten; jangan melakukan DROP sebagai rollback otomatis. Jika masalah schema perlu perbaikan, gunakan forward migration dengan proof terpisah. Jangan rollback lalu menjalankan proof destruktif pada target aplikasi.

## Proof dan hasil validasi

Siapkan `CONTENT_TEST_DATABASE_URL` sesuai [Environment](ENVIRONMENT.md#proof-metadata-konten) pada API env atau environment shell. Hanya database `vertical_movie_app_content_test` di localhost yang diterima; schema `public` dan `drizzle` dihapus dan dibangun ulang. Jalankan serial:

```sh
bun run --cwd apps/api content:schema:proof
bun run --cwd apps/api content:runtime:proof
bun run --cwd apps/api test
bun run lint
bun run check-types
bun run build
```

Evidence 3 Oktober 2026:

| Pemeriksaan                                          | Hasil                                                               |
| ---------------------------------------------------- | ------------------------------------------------------------------- |
| API units/HTTP tanpa I/O eksternal                   | 30 pass, 120 assertions                                             |
| Content schema                                       | 4 pass, 26 assertions                                               |
| Content repository/service runtime                   | 10 pass, 78 assertions                                              |
| Content HTTP native auth + combined OpenAPI          | 5 pass, 79 assertions                                               |
| Regression auth schema/runtime/authorization/OpenAPI | 20 pass, 160 assertions, serial pada DB auth dedicated              |
| Frozen install                                       | Lulus; dependency/lockfile tidak berubah                            |
| Root lint                                            | Lulus untuk web; API tidak mempunyai lint script                    |
| Root check-types                                     | API/web/auth lulus, termasuk Eden positive/negative compile fixture |
| Root build                                           | Kedua app lulus; warning Base UI `use client` existing dari bundler |

Proof mencakup constraints, default season atomic, genre rollback, inheritance, parent/episode/expectedVersion races, archive data retention, auth denial/ban/expiry/outage, serta preservation ID/account/hash/session existing melewati migrasi additive. Bukti ini lokal; belum mencakup storage, media worker, browser bisnis, load test atau deployment production. Riwayat commit per task ada pada [ledger plan](VIDEO_IMPLEMENTATION_PLAN.md#commit-ledger-tahap-a).

## Task berikutnya — MEDIA-001

Refinement harus menghasilkan keputusan yang dapat diuji untuk provider/bucket/private delivery; operasi native `Bun.S3Client` yang diperlukan; single PUT versus multipart/resume browser untuk movie; batas ukuran, durasi, MIME dan timeout; CORS/expiry/abort/cleanup; identitas source immutable dan verifikasi object sebelum enqueue. Ukuran big integer dan kontrak checksum juga perlu ditetapkan. Tambahkan dependency alternatif hanya setelah bukti native tidak mencukupi. Setelah spike, MEDIA-002 membangun aset/upload session; WORKER-001/002 membangun queue/FFmpeg; PUBLISH-001 membuka publikasi. Belum ada dependency/storage client yang dipasang untuk roadmap tersebut.
