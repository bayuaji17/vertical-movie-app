# Modul: Video, Series, dan Movie — Metadata Backend

## Tujuan modul

Menyediakan draf dan metadata backend untuk series multi-season, episode, movie panjang dan standalone. Referensi PRD-03/06/07/09, GR-03–07, [model](../VIDEO_DATA_MODEL.md), [plan](../VIDEO_IMPLEMENTATION_PLAN.md), [context](../VIDEO_REPOSITORY_CONTEXT.md). Ini backlog **tahap A**; media/upload/worker/publikasi ada pada roadmap plan dan belum Ready.

> Status per 3 Oktober 2026: implementasi tahap A disetujui pengguna; status setiap task diperbarui sesuai evidence. Base SHA `d1d3e0a36a4adf1c7198db7a1d36c49e9f1c93ed`. D1–D3 disetujui; status bergerak berdasarkan prerequisite. Tidak menetapkan sprint/estimasi kalender dan branch baru dan commit per task diotorisasi; migrasi development tetap terpisah.

## User story: VID-US-01 — Pengelompokan series dan season

Sebagai admin, saya ingin membuat series dan season, sehingga episode dapat disusun tanpa mengganti model saat serial bertambah panjang.

## User story: VID-US-02 — Draf episode movie dan video mandiri

Sebagai admin, saya ingin menyimpan dan mengedit unit video sesuai jenisnya, sehingga metadata tetap terjaga sebelum sumber diunggah.

## User story: VID-US-03 — Klasifikasi genre

Sebagai admin, saya ingin memakai genre yang konsisten untuk series dan video, sehingga klasifikasi dapat digunakan katalog kemudian.

## User story: VID-US-04 — API privat yang persisten dan bertipe

Sebagai pengembang, saya ingin kontrak admin tervalidasi dan terbukti dengan PostgreSQL, sehingga UI nanti menggunakan data dan izin yang benar.

## User story: VID-US-05 — Pengelolaan aman dan serah terima

Sebagai admin, saya ingin archive dan update tidak menghilangkan konten secara diam-diam, sehingga draf dapat dikelola dengan aman sebelum modul media tersedia.

## Aturan evidence dan validasi bersama

Task Done mensyaratkan acceptance di bawah dan aturan GLOBAL_WORKFLOW. Unit API memakai bun:test/app.handle tanpa port. Integrasi memakai database dedicated dan proof suite terpisah. File/symbol target dirinci dalam scope tiap task; membuat file/folder hanya saat dibutuhkan. Setelah script/dependency berubah, frozen install dan relevant gates wajib. Macro requireAdmin dipasang sebelum routes privat; clock/ID/DB/auth reader diinject. Hasil test/commit tidak diisi dari asumsi. Race/persistensi diuji PostgreSQL, bukan dianggap terbukti oleh fake repository.

## Task: VID-001 — Tetapkan keputusan metadata dan kontrak implementasi

- Status: Done
- Owner: Pengembang/agent pelaksana
- Prioritas: P0 — refinement sebelum implementasi
- Referensi: VID-US-01, PRD-03/06/07/09, GR-03–07, model/plan video
- Dependensi: Tidak ada
- Ukuran: Kecil per hasil; pecah menjadi subtask tetap bila implementasi melampaui satu hasil review.

### Ruang lingkup

Tinjau D1–D3: jenis konten, season default, enam tabel, field/batas input, genre inheritance, slug, archive dan expectedVersion. Periksa kontrak endpoint dan freshness terhadap SHA terbaru. Catat keputusan pengguna yang benar-benar diterima; tidak menganggap penulisan plan sebagai persetujuan implementasi.

**Target file/symbol:** `docs/VIDEO_DATA_MODEL.md`, `docs/VIDEO_IMPLEMENTATION_PLAN.md`, `docs/tasks/videos.md`, `docs/PRD.md`, `docs/ARCHITECTURE.md`. Factory/service/repository dan symbols mengikuti impact map plan; refinement memastikan nama sebelum file dibuat.

### Acceptance criteria

- [x] Keputusan D1–D3 tercatat beserta tanggal; perubahan kontrak tersinkron model/plan/backlog.
- [x] Affected file/symbol, input/output/error, dependency dan test requirement tersedia untuk seluruh task tahap A.
- [x] Freshness evidence kode diperiksa; status Ready hanya untuk task yang prerequisite sudah terpenuhi.

### Validasi

Review model dan mapping requirement→task→test; git diff affected source terhadap Base SHA. Tidak membutuhkan database/dependency install.

### Hasil dan bukti

D1–D3 disetujui pengguna. Freshness valid pada d1d3e0a; hanya dokumen planning dari sesi sebelumnya, tidak ada perubahan source. Branch feat/video-metadata dibuat sebelum implementasi. Kontrak field/routes/task/test direview; tahap A metadata, S3 tetap roadmap.

### Blocker atau tindak lanjut

Tidak ada blocker task ini. Tahap media dan integrasi web tetap mengikuti roadmap.

## Task: VID-002 — Tambahkan schema series dan seasons secara additive

- Status: Done
- Owner: Pengembang/agent pelaksana
- Prioritas: P1 — sesuai DAG dan urutan task
- Referensi: VID-US-01, PRD-03/06/07/09, GR-03–07, model/plan video
- Dependensi: VID-001
- Ukuran: Kecil per hasil; pecah menjadi subtask tetap bila implementasi melampaui satu hasil review.

### Ruang lingkup

Buat tabel series/seasons sesuai model §§2–4, actor FK native auth, named CHECK/UNIQUE/FK/indices dan migration generator berikutnya setelah 0002. Default Season 1 dibuat service pada VID-006, bukan trigger database. Export schema ke createDatabase/Drizzle Kit.

**Target file/symbol:** `apps/api/src/db/schema/series.ts`, `seasons.ts`, `index.ts`, `apps/api/drizzle/*`, `test/integration/content-schema-proof.test.ts`. Factory/service/repository dan symbols mengikuti impact map plan; refinement memastikan nama sebelum file dibuat.

### Acceptance criteria

- [x] Fresh migration membuat dua tabel dengan title/year-date/status/version checks yang benar.
- [x] Database menolak slug duplicate, parent tidak ada, nomor season <=0, nomor season duplicate pada series yang sama; nomor sama beda series sah.
- [x] Re-run migrasi aman; migration auth lama tidak berubah dan fixture user/account/session tetap sama.

### Validasi

Proof PostgreSQL dedicated: inspect constraints/indexes, fresh/re-run, invalid insert serta year/date NULL combinations. Type-check schema dan review SQL/snapshot/journal.

### Hasil dan bukti

Schema series/seasons dan migrasi generated 0003 additive selesai. PostgreSQL dedicated content proof: 2 pass/10 assertions, FK/nomor/title/year-date/slug serta migration re-run dan user preservation. Database development tidak dimigrasikan. Type-check/lint dijalankan hook commit.

### Blocker atau tindak lanjut

Tidak ada blocker task ini. Tahap media dan integrasi web tetap mengikuti roadmap.

## Task: VID-003 — Tambahkan schema video untuk episode movie dan standalone

- Status: Done
- Owner: Pengembang/agent pelaksana
- Prioritas: P1 — sesuai DAG dan urutan task
- Referensi: VID-US-02, PRD-03/06/07/09, GR-03–07, model/plan video
- Dependensi: VID-002
- Ukuran: Kecil per hasil; pecah menjadi subtask tetap bila implementasi melampaui satu hasil review.

### Ruang lingkup

Buat videos dan constraints §5: discriminator kind, season/episode pair, timestamps publikasi, hak konten, archive, version, actors. Jangan membuat pointer media yang target tablenya belum ada. Source schema tetap terpisah dari HTTP schema.

**Target file/symbol:** `apps/api/src/db/schema/videos.ts`, `index.ts`, `apps/api/drizzle/*`, `test/integration/content-schema-proof.test.ts`. Factory/service/repository dan symbols mengikuti impact map plan; refinement memastikan nama sebelum file dibuat.

### Acceptance criteria

- [x] Episode wajib season valid dan episode_number >0; movie/standalone wajib NULL pada kedua field tersebut, termasuk insert yang menghasilkan NULL pada CHECK.
- [x] Duplicate season/episode ditolak pada dua transaksi bersamaan; nomor sama berbeda season sah.
- [x] Kind invalid, publication timestamp tidak konsisten, rights timestamp/actor setengah terisi ditolak; metadata valid dengan release date/year optional diterima.
- [x] Migrasi additive dan auth preservation/re-run proof tetap lulus.

### Validasi

PostgreSQL schema proof dengan insert matrix tiga kind, null combinations, UNIQUE race, FK, rollback dan publication checks. Type-check serta diff SQL generated.

### Hasil dan bukti

Schema videos dan migrasi 0004 selesai; tiga jenis konten, CHECK pair nullable/hak/status, FK dan nomor episode unik. PostgreSQL proof 3 pass; race dua INSERT nomor sama hanya satu berhasil dan nomor sama pada season berbeda diterima. Type-check/lint hook commit.

### Blocker atau tindak lanjut

Tidak ada blocker task ini. Tahap media dan integrasi web tetap mengikuti roadmap.

## Task: VID-004 — Tambahkan taxonomy genre dan relasi konten

- Status: Done
- Owner: Pengembang/agent pelaksana
- Prioritas: P1 — sesuai DAG dan urutan task
- Referensi: VID-US-03, PRD-03/06/07/09, GR-03–07, model/plan video
- Dependensi: VID-003
- Ukuran: Kecil per hasil; pecah menjadi subtask tetap bila implementasi melampaui satu hasil review.

### Ruang lingkup

Buat genres/series_genres/video_genres, composite PK dan FK RESTRICT, reverse genre index, slug/name checks dan migration. Genre tidak disimpan sebagai string array/JSON konten.

**Target file/symbol:** `apps/api/src/db/schema/genres.ts`, `index.ts`, `apps/api/drizzle/*`, `test/integration/content-schema-proof.test.ts`. Factory/service/repository dan symbols mengikuti impact map plan; refinement memastikan nama sebelum file dibuat.

### Acceptance criteria

- [x] Duplicate slug/join dan referensi genre/video/series yang tidak ada ditolak.
- [x] Relasi genre tidak bisa orphan; valid many-to-many series maupun video diterima.
- [x] Kegagalan transaksi set relasi tidak menyisakan sebagian perubahan; SQL/journal additive tanpa menyentuh auth.

### Validasi

Proof FK/UNIQUE/transaction rollback pada database test explicit. Type-check dan review generated migration/index coverage.

### Hasil dan bukti

Enam tabel metadata lengkap melalui migrasi 0005 genres/relasi. PostgreSQL proof 4 pass: composite PK, FK, slug unique dan rollback replacement genre tanpa partial write. Index reverse genre tersedia. Type-check/lint hook commit.

### Blocker atau tindak lanjut

Tidak ada blocker task ini. Tahap media dan integrasi web tetap mengikuti roadmap.

## Task: VID-005 — Definisikan model HTTP error cursor dan dependency contracts

- Status: Done
- Owner: Pengembang/agent pelaksana
- Prioritas: P1 — sesuai DAG dan urutan task
- Referensi: VID-US-04, PRD-03/06/07/09, GR-03–07, model/plan video
- Dependensi: VID-004
- Ukuran: Kecil per hasil; pecah menjadi subtask tetap bila implementasi melampaui satu hasil review.

### Ruang lingkup

Buat schema request/response Elysia dan literal kinds/statuses; strict unknown/read-only field rejection; optional NULL/trim policy, UUID/lang/date/year, limit/cursor. Definisikan error domain aman serta named-constraint mapper SQLSTATE. Service input dipisahkan dari Context; DB/clock/UUID/admin reader diinjeksi. Pagination utility lokal API untuk listing lintas modul.

**Target file/symbol:** `apps/api/src/modules/series/model.ts`, `modules/videos/model.ts`, `modules/genres/model.ts`, `shared/content-error.ts`, `shared/content-pagination.ts`, `plugins/errors.ts`, `source unit tests`. Factory/service/repository dan symbols mengikuti impact map plan; refinement memastikan nama sebelum file dibuat.

### Acceptance criteria

- [x] Create union episode vs movie/standalone, PATCH minimal satu field serta expectedVersion valid; actor/status/media field dari klien ditolak.
- [x] Limit default20/max100, cursor panjang/format/sort/filter tervalidasi; input SQL selalu bound parameter.
- [x] Envelopes 404/409/422/503/500 redacted dengan requestId, tanpa SQL/credential; error auth existing dipertahankan.
- [x] DTO camelCase/time ISO/date-only benar dan tidak mengekspos row database seluruhnya.

### Validasi

bun:test table-driven untuk boundary nyata, null/empty, unknown fields, discriminator/cursor/error mapping; app.handle validators tanpa port; API type-check.

### Hasil dan bukti

Schema HTTP strict dan DTO/error/cursor/runtime injection contracts selesai. API source unit suite 25 pass/73 assertions; movie union menolak season/status/actor/technical input, cursor menolak query mismatch, date/calendar/language tervalidasi dan error constraint redacted. Type-check/lint hook commit.

### Blocker atau tindak lanjut

Tidak ada blocker task ini. Tahap media dan integrasi web tetap mengikuti roadmap.

## Task: VID-006 — Sediakan create read dan edit draf series

- Status: Done
- Owner: Pengembang/agent pelaksana
- Prioritas: P1 — sesuai DAG dan urutan task
- Referensi: VID-US-01, PRD-03/06/07/09, GR-03–07, model/plan video
- Dependensi: VID-005
- Ukuran: Kecil per hasil; pecah menjadi subtask tetap bila implementasi melampaui satu hasil review.

### Ruang lingkup

Buat service/factory series serta route POST/GET/PATCH /admin/series dan detail. Create series dan Season 1 satu transaksi; genre set ikut transaksi. Listing cursor bounded, search bound dan archive default hidden. PATCH atomik expectedVersion, slug tidak auto-rename dan lock setelah first publish. Handler menggunakan native guard scoped sebelum service.

**Target file/symbol:** `apps/api/src/modules/series/index.ts`, `admin.ts`, `service.ts`, `repository.ts`, `service.test.ts`, `index.test.ts`. Factory/service/repository dan symbols mengikuti impact map plan; refinement memastikan nama sebelum file dibuat.

### Acceptance criteria

- [x] Create sukses mengembalikan series/defaultSeason; gagal season/genre menyebabkan series tidak tersimpan.
- [x] GET/list memperlihatkan metadata benar termasuk empty/archived policy; input/title/slug collision memiliki status kontrak.
- [x] Dua PATCH versi sama hanya satu berhasil; metadata dan genre set tidak terpisah commit.
- [x] Null/non-admin/banned/outage tidak menjalankan service; private response no-store.

### Validasi

Unit domain dengan fake dependency failure/clock/ID; HTTP native tanpa port, repository query proof ditambahkan ke integrasi final. Model dan race nyata dibuktikan PostgreSQL pada VID-014.

### Hasil dan bukti

Series create/read/list/edit selesai; default Season1 dan genre atomik. API units 26 pass; PostgreSQL runtime 2 pass membuktikan rollback invalid genre, version conflict dan HTTP duplicate slug409. Mapper disesuaikan terhadap SQLSTATE pada errno native Bun SQL (temuan integration), tanpa raw error exposure. API type-check lulus; root lint/type-check hook commit.

### Blocker atau tindak lanjut

Tidak ada blocker task ini. Tahap media dan integrasi web tetap mengikuti roadmap.

## Task: VID-007 — Sediakan pengelolaan season dan nomor season

- Status: Done
- Owner: Pengembang/agent pelaksana
- Prioritas: P1 — sesuai DAG dan urutan task
- Referensi: VID-US-01, PRD-03/06/07/09, GR-03–07, model/plan video
- Dependensi: VID-006
- Ukuran: Kecil per hasil; pecah menjadi subtask tetap bila implementasi melampaui satu hasil review.

### Ruang lingkup

Tambahkan create/list season per series dan PATCH season. Nomor positif unik per series; seriesId immutable. Parent archived menolak create/edit. Nomor season tidak boleh diubah jika mempunyai episode yang pernah terbit; parent-first lock/version. UI judul optional tidak disimpan sebagai judul default palsu.

**Target file/symbol:** `apps/api/src/modules/series/admin.ts`, `model.ts`, `service.ts`, `repository.ts`, `module tests`. Factory/service/repository dan symbols mengikuti impact map plan; refinement memastikan nama sebelum file dibuat.

### Acceptance criteria

- [x] Series sederhana memiliki Season1 dan dapat menambah Season2; season list urut nomor, tidak memakai createdAt sebagai urutan episode.
- [x] Parent absent404/archived409, nomor duplicate409, invalid input422; episode tidak orphan.
- [x] PATCH version conflict serta renumber season dengan pernah-published child409; mutasi tanpa child published sah.

### Validasi

Domain/HTTP native tests untuk parent states/number/version; PostgreSQL UNIQUE/row lock proof pada integrasi akhir. Tidak menguji melalui port.

### Hasil dan bukti

Season create/list/edit selesai dengan parent-first lock, nomor unik per series dan optimistic version. PostgreSQL runtime 3 pass/17 assertions termasuk archived parent dan larangan renumber season dengan episode pernah terbit. API module HTTP tests dan root lint/type-check hook commit.

### Blocker atau tindak lanjut

Tidak ada blocker task ini. Tahap media dan integrasi web tetap mengikuti roadmap.

## Task: VID-008 — Sediakan create dan list taxonomy genre

- Status: Done
- Owner: Pengembang/agent pelaksana
- Prioritas: P1 — sesuai DAG dan urutan task
- Referensi: VID-US-03, PRD-03/06/07/09, GR-03–07, model/plan video
- Dependensi: VID-005
- Ukuran: Kecil per hasil; pecah menjadi subtask tetap bila implementasi melampaui satu hasil review.

### Ruang lingkup

POST/GET /admin/genres dengan guard, slug/name validation, query search/cursor bounded. Scope hanya create/list; tidak menambah taxonomy delete/rename/import. Simpan taxonomy sekali dan referensikan ID dari content.

**Target file/symbol:** `apps/api/src/modules/genres/index.ts`, `model.ts`, `service.ts`, `repository.ts`, `module tests`. Factory/service/repository dan symbols mengikuti impact map plan; refinement memastikan nama sebelum file dibuat.

### Acceptance criteria

- [x] Genre create/list bekerja dan empty results konsisten; name nonempty, slug duplicate409.
- [x] Cursor/limit/search tervalidasi dan query bound; filter mismatch cursor ditolak422.
- [x] Unauthorized atau auth outage tidak melakukan query/write; DTO tanpa infrastructure fields.

### Validasi

bun:test domain/HTTP native; PostgreSQL race duplicate slug dalam proof akhir; Eden/Scalar validation pada VID-013.

### Hasil dan bukti

Genre create/list API selesai. PostgreSQL runtime 4 pass/25 assertions: trimming, duplicate slug, pagination, search wildcard literal. API source unit suite 27 pass, termasuk denial tanpa service call. Root lint/type-check hook commit.

### Blocker atau tindak lanjut

Tidak ada blocker task ini. Tahap media dan integrasi web tetap mengikuti roadmap.

## Task: VID-009 — Sediakan pembuatan draf video semua jenis

- Status: Done
- Owner: Pengembang/agent pelaksana
- Prioritas: P1 — sesuai DAG dan urutan task
- Referensi: VID-US-02, PRD-03/06/07/09, GR-03–07, model/plan video
- Dependensi: VID-007, VID-008
- Ukuran: Kecil per hasil; pecah menjadi subtask tetap bila implementasi melampaui satu hasil review.

### Ruang lingkup

POST /admin/videos: movie/standalone tanpa grouping, episode membutuhkan season parent valid/unarchived. Default draft; rights confirmation dari aksi boolean eksplisit pada metadata diterjemahkan server menjadi timestamp/actor, bukan menerima raw timestamps. Validasi genre set dan parent dilakukan atomik; UNIQUE constraint tetap arbiter race.

**Target file/symbol:** `apps/api/src/modules/videos/index.ts`, `admin.ts`, `service.ts`, `repository.ts`, `model.ts`, `module tests`. Factory/service/repository dan symbols mengikuti impact map plan; refinement memastikan nama sebelum file dibuat.

### Acceptance criteria

- [x] Movie panjang dan standalone dapat dibuat tanpa season; episode tersimpan pada season benar dengan series derived, tidak duplicate seriesId.
- [x] Parent absent404/archived409, nomor/slug conflict409, incompatible union422; tidak ada partial video/genre write.
- [x] Status draft dan rowVersion1, audit actor dari sesi; title wajib, genre optional, source/URL/duration belum dibuat dummy.
- [x] Create HTTP privat guarded dan input publication/status/actor ditolak.

### Validasi

Unit/service tests tiga branches/failure rollback; HTTP app.handle body/auth; PostgreSQL parallel episode creation pada VID-014.

### Hasil dan bukti

Video draft create untuk movie/standalone/episode selesai, parent locks dan rights confirmation server-side. PostgreSQL runtime 5 pass/34 assertions: kind hierarchy, atomic genre rollback, missing parent dan duplicate episode race. API units 28 pass; lint/type-check hook commit.

### Blocker atau tindak lanjut

Tidak ada blocker task ini. Tahap media dan integrasi web tetap mengikuti roadmap.

## Task: VID-010 — Sediakan detail dan daftar video bertipe

- Status: Done
- Owner: Pengembang/agent pelaksana
- Prioritas: P1 — sesuai DAG dan urutan task
- Referensi: VID-US-02, PRD-03/06/07/09, GR-03–07, model/plan video
- Dependensi: VID-009
- Ukuran: Kecil per hasil; pecah menjadi subtask tetap bila implementasi melampaui satu hasil review.

### Ruang lingkup

GET list/detail metadata dengan kind/seriesId/seasonId/search/archive filters, limit/cursor, grouping derivation dan genreIds/effectiveGenres. Join genre/season tidak menggandakan items sehingga pagination dilakukan atas video IDs dulu bila perlu. Unknown video404; no public endpoint pada tahap ini.

**Target file/symbol:** `apps/api/src/modules/videos/admin.ts`, `service.ts`, `repository.ts`, `model.ts`, `shared/content-pagination.ts`, `module tests`. Factory/service/repository dan symbols mengikuti impact map plan; refinement memastikan nama sebelum file dibuat.

### Acceptance criteria

- [x] Detail episode membawa series/season yang benar; movie/standalone tidak mempunyai parent dan tidak membawa private file metadata.
- [x] Listing tied timestamps dan beberapa genre tidak menghasilkan duplicate/skip pada dataset stabil; nextCursor benar pada last page.
- [x] Episode kosong genre inherit series, override video mengalahkan inherit; kind/series/season filters konsisten.
- [x] Search parameterized, cursor tidak cocok filter ditolak; empty list dan includeArchived benar.

### Validasi

Native query/service/HTTP tests untuk join/filter/cursor mapping; DB fixture multicontent/multigenre dan EXPLAIN target indexes pada VID-014.

### Hasil dan bukti

Video list/detail/filter dan genre inheritance selesai. PostgreSQL runtime 6 pass: series/season grouping, no-parent movie, override/inheritance, cursor query binding dan tiga episode bertimestamp sama tanpa duplicate/skip. Query genre tidak menggandakan paging rows. Root lint/type-check hook commit.

### Blocker atau tindak lanjut

Tidak ada blocker task ini. Tahap media dan integrasi web tetap mengikuti roadmap.

## Task: VID-011 — Sediakan edit metadata genre dan relasi episode secara atomik

- Status: Done
- Owner: Pengembang/agent pelaksana
- Prioritas: P1 — sesuai DAG dan urutan task
- Referensi: VID-US-02, PRD-03/06/07/09, GR-03–07, model/plan video
- Dependensi: VID-010
- Ukuran: Kecil per hasil; pecah menjadi subtask tetap bila implementasi melampaui satu hasil review.

### Ruang lingkup

PATCH expectedVersion untuk metadata, rightsConfirmed, genreIds replace, dan episode season/number sebelum first publish. Kind immutable. Lock parent tujuan dan row terkait secara konsisten; UPDATE conditional version/transaction genre set. Slug tidak auto-update dan locked sesudah first publish. Rights false mengosongkan confirmation pair, true mengambil actor/time server.

**Target file/symbol:** `apps/api/src/modules/videos/admin.ts`, `model.ts`, `service.ts`, `repository.ts`, `module tests`. Factory/service/repository dan symbols mengikuti impact map plan; refinement memastikan nama sebelum file dibuat.

### Acceptance criteria

- [x] Dua update versi sama hanya satu sukses; stale request409 tidak mengganti metadata/genre.
- [x] Unknown genre422/parent404/archived409/conflicting episode409 rollback seluruh mutation.
- [x] Reassignment prepublication valid mempertahankan ID, menolak movie grouping/kind conversion/ever-published reassignment.
- [x] Genre [] mengembalikan inheritance episode; rights pair/audit/version konsisten; unknown/read-only fields422.

### Validasi

Native domain/HTTP failure cases dan meaningful PATCH race PostgreSQL pada VID-014; verify before/after snapshot dan transaction rollback.

### Hasil dan bukti

Video PATCH atomik selesai: expectedVersion, metadata/genre, rights confirmation dan episode reassignment prepublication. PostgreSQL runtime 7 pass membuktikan dua update versi sama hanya satu berhasil, genre invalid rollback metadata/version, movie grouping rejection, dan first-publication grouping lock. Parent locks diurutkan untuk perpindahan lintas series. Root lint/type-check hook commit.

### Blocker atau tindak lanjut

Tidak ada blocker task ini. Tahap media dan integrasi web tetap mengikuti roadmap.

## Task: VID-012 — Sediakan soft archive konten dan hierarchy

- Status: Done
- Owner: Pengembang/agent pelaksana
- Prioritas: P1 — sesuai DAG dan urutan task
- Referensi: VID-US-05, PRD-03/06/07/09, GR-03–07, model/plan video
- Dependensi: VID-006, VID-007, VID-011
- Ukuran: Kecil per hasil; pecah menjadi subtask tetap bila implementasi melampaui satu hasil review.

### Ruang lingkup

POST archive series/season/video dengan expectedVersion; reject published content dan parent yang masih punya child published. Draft child tidak dihapus/cascade; parent archive membuat child effectively hidden/immutable editorial. Same snapshot repeated archive boleh return200 bila expectedVersion sama current; stale version409. Restore/hard-delete/GC tidak ditambahkan. Media job checks dirancang extension saat queue tersedia, tidak query tabel future.

**Target file/symbol:** `apps/api/src/modules/series/admin.ts`, `service.ts`, `repository.ts`, `modules/videos/admin.ts`, `service.ts`, `repository.ts`, `module tests`. Factory/service/repository dan symbols mengikuti impact map plan; refinement memastikan nama sebelum file dibuat.

### Acceptance criteria

- [x] Archive draft mengisi archivedAt/version tanpa menghapus data atau genre; slug/nomor reserved.
- [x] Published atau parent dengan published child ditolak409; tidak terjadi orphan/cascade content.
- [x] Default list hidden, explicit detail/archive listing readable; mutation konten/parent archived ditolak.
- [x] Race create child vs archive parent konsisten melalui parent lock; repeat archive semantics terdokumentasi.

### Validasi

Native domain/HTTP states dan DB race/metadata retention pada VID-014; no storage call atau physical deletion.

### Hasil dan bukti

Archive series/season/video selesai tanpa cascade/hard delete. PostgreSQL runtime 8 pass: data retained, list visibility, repeat/stale version, mutation denial, published child protection dan archived-parent episode creation denial. Media-job checks tetap extension tahap queue; belum ada tabel media. Root lint/type-check hook commit.

### Blocker atau tindak lanjut

Tidak ada blocker task ini. Tahap media dan integrasi web tetap mengikuti roadmap.

## Task: VID-013 — Pasang modul ke factory bootstrap kontrak Eden dan Scalar

- Status: Done
- Owner: Pengembang/agent pelaksana
- Prioritas: P1 — sesuai DAG dan urutan task
- Referensi: VID-US-04, PRD-03/06/07/09, GR-03–07, model/plan video
- Dependensi: VID-008, VID-010, VID-012
- Ukuran: Kecil per hasil; pecah menjadi subtask tetap bila implementasi melampaui satu hasil review.

### Ruang lingkup

Inject repository/services/getSession/clock/ID dari composition root memakai pool existing; guard scoped pada admin routes. Mount module chaining sebelum schema aplikasi dihitung. Factory tetap tanpa port/env side effects dengan dependency absent503. Compile-only Eden contract memakai client yang sudah tersedia; auth SDK tetap terpisah.

**Target file/symbol:** `apps/api/src/app.ts`, `index.ts`, `types.ts`, `app.test.ts`, `plugins/openapi.test.ts`, `apps/web/test/content-eden-contract.ts`. Factory/service/repository dan symbols mengikuti impact map plan; refinement memastikan nama sebelum file dibuat.

### Acceptance criteria

- [x] Semua endpoints tahap A mounted dan unauthorized tidak menyentuh service; guard tidak bocor ke root/auth publik.
- [x] Type App/Eden menangkap response dan create union tanpa broad Elysia type/as-any; invalid body fixture ditolak compiler.
- [x] Scalar memuat business schemas/security/errors bersama auth fragment tanpa broken refs atau auth disabled routes terbuka.
- [x] Import factory/types tanpa env/live DB/port; bootstrap satu pool dan shutdown unchanged.

### Validasi

API native route matrix + OpenAPI regression; compile-only contract positif/@ts-expect-error negatif via relevant check-types. Root lint/build/type-check sesuai contract.

### Hasil dan bukti

16 endpoint bisnis dipasang statis sebelum Scalar; bootstrap menyuntikkan satu pool/repositories/services dan native session reader. API units 30 pass/120 assertions, semua endpoint anonymous401/no-store, strict payload422, absent dependency503, cookie security dan operation ID unik. Root check-types lulus termasuk Eden compile-only positive/negative; build dua app lulus (warning bundler Base UI existing). Root lint/type-check hook commit.

### Blocker atau tindak lanjut

Tidak ada blocker task ini. Tahap media dan integrasi web tetap mengikuti roadmap.

## Task: VID-014 — Buktikan alur metadata pada PostgreSQL dedicated

- Status: Done
- Owner: Pengembang/agent pelaksana
- Prioritas: P1 — sesuai DAG dan urutan task
- Referensi: VID-US-04, PRD-03/06/07/09, GR-03–07, model/plan video
- Dependensi: VID-013
- Ukuran: Kecil per hasil; pecah menjadi subtask tetap bila implementasi melampaui satu hasil review.

### Ruang lingkup

Integration proof terpisah test ./src dengan database allowlist khusus test; jangan memakai DB dev yang berisi akun existing. Buat fixture auth canonical lalu migrate additive; test app.handle dengan DB nyata/admin reader native dan data multi-season/movie. Tambahkan script content:schema:proof/content:runtime:proof bila diperlukan, tanpa CI. Internal token/fixture credential tidak dicetak.

**Target file/symbol:** `apps/api/test/integration/content-schema-proof.test.ts`, `content-runtime-proof.test.ts`, `apps/api/package.json`, `fixture helpers bila diperlukan`. Factory/service/repository dan symbols mengikuti impact map plan; refinement memastikan nama sebelum file dibuat.

### Acceptance criteria

- [x] Fresh/re-run/existing auth fixture preservation lulus; journal append dan password/session fixture tidak berubah.
- [x] Create series/default season/episode/movie/genre/detail/edit/archive alur lengkap persisten; error rollback dan expectedVersion/unique races terbukti nyata.
- [x] Auth native menolak anonymous/non-admin/banned/expired serta outage; service tidak write pada denial.
- [x] Suite fail-safe pada wrong target URL; environment/proof command tidak menggunakan DB development.
- [x] Movie metadata tidak punya cap durasi pendek/rasio9:16; tahap ini tidak mengklaim upload/transcode/playback.

### Validasi

bun run --cwd apps/api content:schema:proof dan content:runtime:proof sesudah scripts dibuat dengan env database test explicit. Frozen install setelah scripts berubah, source units dan relevant root gates.

### Hasil dan bukti

Proof PostgreSQL dedicated lulus: 19 test/183 assertions pada schema, runtime dan HTTP native; races expectedVersion/episode/parent archive serta rollback genre terbukti. Regression auth schema/runtime/authorization/OpenAPI 20 test/160 assertions lulus, termasuk ID/hash/session existing melalui enam migrasi. API unit 30 test/120 assertions dan root check-types lulus; frozen install tidak mengubah lockfile. Scripts proof dan sample CONTENT_TEST_DATABASE_URL tersedia; seluruh reset hanya database test localhost, DB development tidak dimigrasi.

### Blocker atau tindak lanjut

Tidak ada blocker task ini. Tahap media dan integrasi web tetap mengikuti roadmap.

## Task: VID-015 — Dokumentasikan hasil dan tutup iterasi metadata

- Status: Done
- Owner: Pengembang/agent pelaksana
- Prioritas: P1 — sesuai DAG dan urutan task
- Referensi: VID-US-05, PRD-03/06/07/09, GR-03–07, model/plan video
- Dependensi: VID-014
- Ukuran: Kecil per hasil; pecah menjadi subtask tetap bila implementasi melampaui satu hasil review.

### Ruang lingkup

Perbarui active route/schema status, command test/migration, examples request/response dan evidence aktual per task. Jelaskan backend metadata completion dan kebutuhan business gateway sebelum UI. Tulis runbook migrasi additive/rollback binary; jangan menjalankan migrasi dev/production dari task dokumentasi. Refinement backlog MEDIA/WORKER/PUBLISH berikutnya.

**Target file/symbol:** `docs/README.md`, `docs/API_DEVELOPMENT.md`, `docs/ENVIRONMENT.md`, `docs/VIDEO_REPOSITORY_CONTEXT.md`, `VIDEO_IMPLEMENTATION_PLAN.md`, `VIDEO_DATA_MODEL.md`, `tasks/videos.md`. Factory/service/repository dan symbols mengikuti impact map plan; refinement memastikan nama sebelum file dibuat.

### Acceptance criteria

- [x] Model/endpoint/examples sesuai kode, seluruh prerequisite/AC tahap A lulus sebelum plan completed; proof yang belum berjalan tidak ditandai pass.
- [x] Catatan gate lint/type-check/build/unit/integration dan diff nyata tersimpan dengan batas lingkungan.
- [x] Docs internal links valid; secrets/generated artifacts tidak masuk diff; history auth tetap utuh.
- [x] Next task MEDIA-001 mempunyai daftar open decisions provider/limits/upload resume/immutable source, tanpa instalasi speculative.

### Validasi

Root bun run lint/check-types/build, API units dan proof hanya diulang bila source/scripts berubah sejak hasil valid. Docs formatter/link check/git diff --check dan final diff review; Git action hanya bila pengguna meminta.

### Hasil dan bukti

Dokumentasi model/status/rute, runbook VIDEO_OPERATIONS, contoh request/response dan migrasi additive diperbarui. Tahap A selesai; 30 units, 19 content proof dan 20 auth regression tests lulus; root lint/type-check/build/frozen install lulus. Ledger commit setiap task dicatat; MEDIA-001 memerlukan keputusan provider/native S3/limits/multipart-resume/source immutable, tanpa dependency speculative. Link/anchor checker, formatter dan git diff --check menjadi gate akhir. DB development/production belum dimigrasi; gateway/UI/media tetap roadmap.

### Blocker atau tindak lanjut

Tidak ada blocker task ini. Tahap media dan integrasi web tetap mengikuti roadmap.
