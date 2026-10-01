# Modul: Auth Admin Tunggal

## Tujuan modul

Admin tunggal dapat login email/password, menggunakan dashboard yang dilindungi, logout, dan memulihkan password melalui CLI. Pengunjung tetap mengakses halaman publik tanpa login. Referensi: PRD-01, PRD-07, GR-01, GR-02; [Architecture](../ARCHITECTURE.md), [API Development](../API_DEVELOPMENT.md), dan [rencana lengkap](../IMPLEMENTATION_PLAN.md).

Scope email/password + CLI provision/recovery + satu origin disetujui pengguna pada **1 Oktober 2026**. AUTH-001 dan AUTH-002 selesai; task dependen tetap `Backlog` sampai prerequisite lulus. Semua task menggunakan owner **pengembang/agent pelaksana**, prioritas wajib berurutan, dan bukti aktual saat dikerjakan. Task ini tidak menetapkan sprint atau estimasi waktu kalender.

## User story: AUTH-US-01 — Fondasi autentikasi persisten

Sebagai pengelola sistem, saya ingin konfigurasi dan data auth tersimpan dengan benar, sehingga sesi admin dapat diverifikasi dan dipulihkan setelah restart.

## Task: AUTH-001 — Buktikan kompatibilitas driver dan adapter

- Status: Done
- Owner: Pengembang/agent pelaksana
- Prioritas: P0 — pertama
- Referensi: AUTH-US-01, PRD-01, evaluasi Bun SQL pada API Development
- Dependensi: Tidak ada
- Ukuran: Spike kecil; hentikan dan pecah bila menemukan ketidakcocokan

### Ruang lingkup

Periksa peer/export versi kandidat Drizzle stabil, Bun 1.4.2, Better Auth/adapter 1.7.7, dan migrator. Jalankan proof di database test yang eksplisit. Lock versi setelah terbukti. Detail kandidat tersedia pada Evidence rencana; tidak mengganti driver atau memilih RC secara otomatis.

### Acceptance criteria

- [x] Bun SQL + Drizzle dapat select/write; callback transaksi adapter yang melempar error rollback seluruh row user+account.
- [x] CLI Better Auth 1.7.7 menghasilkan schema Drizzle; migrasi yang digenerate diterapkan melalui `drizzle-orm/bun-sql/migrator`; handler HTTP menyimpan credential, public `verifyPassword` cocok, login mengeluarkan cookie, dan get-session membaca kembali user/sesi.
- [x] `transaction: true` ditetapkan eksplisit setelah proof. Ini membuktikan callback transaksi adapter; sign-up multi-operation tetap tidak dianggap sebagai satu transaksi bila versi endpoint tidak membungkusnya.
- [x] Proof hanya menyentuh database baru `vertical_movie_app_auth_test` pada PostgreSQL lokal; test gagal-aman untuk URL yang bukan localhost/database tersebut.

### Validasi

Proof query/transaksi dan auth pada database test; type-check kandidat; review peer dependencies dan generator. Proof tidak digeneralisasi menjadi seluruh operasi auth production terbukti.

### Hasil dan bukti

- Dependency dikunci: `drizzle-orm` 0.45.3 pada API, `drizzle-kit` 0.31.11 sebagai dev dependency API, `@better-auth/drizzle-adapter` 1.7.7 serta CLI `auth` 1.7.7 pada `@repo/auth`.
- Bukti schema CLI: `packages/auth/test/fixtures/auth-probe.config.ts` → schema Drizzle di `apps/api/test/fixtures/auth-probe-schema.ts`; SQL migrasi fixture tersimpan di `apps/api/test/fixtures/auth-probe-migrations/`.
- Native Bun suite lulus: 2 test, 16 assertion; database nyata PostgreSQL 18.6 khusus test.
- `bun install --frozen-lockfile`, `bun run check-types`, `bun run build`, `bun run lint`, Prettier untuk source TypeScript/JSON, dan `git diff --check` lulus.
- `drizzle-kit push` dicoba hanya sebelum ada schema di database test; perintah berhenti karena meminta `pg`, `postgres`, atau driver provider lain. Tidak ada driver alternatif dipasang dan tidak ada perubahan database yang terjadi lewat perintah tersebut. Pembuatan schema berhasil dengan SQL migrasi Drizzle yang dijalankan Drizzle ORM menggunakan Bun SQL.
- Commit AUTH-001 dibuat setelah validasi; SHA dicatat pada history commit. No proof atau test memakai database development.

### Blocker atau tindak lanjut

Tidak ada blocker kompatibilitas. Gunakan migrator Bun SQL dan schema generated; jadikan hasil `push` yang meminta driver server alternatif sebagai alasan untuk tidak menggunakannya.

## Task: AUTH-002 — Siapkan konfigurasi, factory dan boundary package

- Status: Done
- Owner: Pengembang/agent pelaksana
- Prioritas: P0 — kedua
- Referensi: AUTH-US-01, API Development, Environment
- Dependensi: AUTH-001
- Ukuran: Kecil

### Ruang lingkup

Buat validasi env API, factory Bun SQL/Drizzle, `createApp`, type-only `App`, dan bootstrap/shutdown. Siapkan factory/ekspor auth server/client/types tanpa side effect. Pasang hanya dependency hasil proof dan ubah placeholder test API menjadi native Bun. File target ada pada impact map rencana.

### Acceptance criteria

- [x] Secret kosong/kurang panjang, database URL dan origin invalid ditolak dengan pesan aman.
- [x] Import factory/type tidak membuka port, pool, atau membaca secret; build tidak membutuhkan live DB.
- [x] API memberi adapter/env; web tidak mengimpor server runtime auth.
- [x] Script test API hanya menjalankan source unit suite; frozen install berhasil setelah dependency berubah.

### Validasi

Unit konfigurasi/request, `bun install --frozen-lockfile`, test native API, type-check workspace, build, lint web, smoke API lokal dan graceful shutdown, serta pemeriksaan diff.

### Hasil dan bukti

- `loadApiEnv` memvalidasi port, URL PostgreSQL ber-host, secret minimal 32 karakter, dan origin HTTP(S); nilai auth publik wajib sama. Error tidak menyertakan secret atau kredensial database.
- `createDatabase` memakai `Bun.SQL` dan `drizzle-orm/bun-sql`; SQL client bersifat unopened hingga dipakai. `createApp` tetap dapat diuji tanpa port dan menutup database yang diinjeksi ketika berhenti.
- Bootstrap membuat database sekali, menjalankan Elysia, dan menangani `SIGINT`/`SIGTERM`; skema dan endpoint auth belum dipasang.
- `@repo/auth/server` menyediakan `createAuthServer(options)` bersama adapter dan helper hash terverifikasi. Entry point `@repo/auth/client`/`types` tetap terpisah; API memiliki `api/types` type-only.
- API suite native Bun kini hanya menjalankan `./src`; migrasi/proof PostgreSQL tetap terpisah.
- `bun run --cwd apps/api test` lulus: 11 test pada tiga file source (19 assertion), termasuk validasi env, HTTP tanpa port, dan pembuatan client yang belum terkoneksi.
- `bun install --frozen-lockfile`, `bun run check-types`, `bun run build`, `bun run lint`, startup API lokal, dan `git diff --check` lulus.
- Task di-commit setelah seluruh acceptance dan validasi terpenuhi; SHA dicatat di execution log rencana.

### Blocker atau tindak lanjut

Tidak ada blocker; schema dan migrasi tetap ruang lingkup AUTH-003.

## Task: AUTH-003 — Buat schema dan migrasi auth/admin

- Status: Backlog
- Owner: Pengembang/agent pelaksana
- Prioritas: P0 — ketiga
- Referensi: AUTH-US-01, PRD-01, GR-01, AC-01
- Dependensi: AUTH-002
- Ukuran: Kecil

### Ruang lingkup

Generate schema Better Auth sesuai konfigurasi aktual, termasuk limiter database; tinjau mapping snake_case/property, indeks dan timestamp. Buat singleton `admin_identity` milik API dengan fixed key/check constraint, unique user FK. Tambahkan migrasi SQL/metadata dan script migrasi eksplisit.

### Acceptance criteria

- [ ] Migrasi fresh membuat semua tabel yang dibutuhkan; re-run tidak mengulang perubahan.
- [ ] Database menolak singleton key lain, klaim admin kedua dan FK user yang tidak ada.
- [ ] Generator/adapter memakai schema yang sama; tidak ada migrasi otomatis saat request.
- [ ] Script memiliki cwd/env yang jelas dan tidak mencetak URL database.

### Validasi

Integrasi PostgreSQL: fresh/re-run, introspeksi tabel/indeks, constraint/FK dan rollback. Review SQL sebelum menerapkan pada DB dev.

### Hasil dan bukti

Belum diimplementasikan atau diuji.

### Blocker atau tindak lanjut

Menunggu AUTH-002. Jangan menyimpulkan database aktual kosong hanya dari starter source.

## Task: AUTH-004 — Aktifkan endpoint dan kebijakan sesi Better Auth

- Status: Backlog
- Owner: Pengembang/agent pelaksana
- Prioritas: P0 — keempat
- Referensi: AUTH-US-01, PRD-01, GR-01/02, AC-02/04/06
- Dependensi: AUTH-003
- Ukuran: Kecil; pisahkan limiter bila proof membutuhkan pekerjaan mandiri

### Ruang lingkup

Konfigurasi `createAuthServer` di package pemilik, mount `/api/auth`, error handling aman, signup/fitur unsupported disabled, password/session/cookie/trusted origins, hook session-create dengan dependency policy admin, dan limiter PostgreSQL. `GET /` tetap publik.

### Acceptance criteria

- [ ] Login/logout mengikuti payload Better Auth tanpa envelope aplikasi; credential salah gagal dengan pesan aman.
- [ ] Signup/email reset unsupported ditolak melalui handler langsung; non-admin tidak mendapatkan sesi baru.
- [ ] Sesi fixed 24 jam tanpa cookie cache; Origin asing ditolak; production cookie Secure/HttpOnly/SameSite sesuai policy.
- [ ] Limiter aktif dan menghasilkan 429; ekstraksi key/IP tidak mempercayai spoof header browser.
- [ ] Test fixture admin policy berbeda dari provisioning produk dan tidak dianggap bukti CLI selesai.

### Validasi

HTTP `app.handle` dan DB test: cookie flags, disabled endpoints, wrong credential, origin/CSRF, session expiry/revocation, limiter. Client policy default dicatat pada dokumentasi.

### Hasil dan bukti

Belum diimplementasikan atau diuji.

### Blocker atau tindak lanjut

Menunggu AUTH-003. Provisioning aktual pada AUTH-005; DTO/guard privat pada AUTH-007.

## User story: AUTH-US-02 — Provisioning dan pemulihan terkendali

Sebagai operator, saya ingin membuat satu admin dan memulihkan password lewat CLI, sehingga akses dapat dipulihkan tanpa membuka registrasi publik atau layanan email.

## Task: AUTH-005 — Provision admin tunggal melalui CLI

- Status: Backlog
- Owner: Pengembang/agent pelaksana
- Prioritas: P0 — kelima
- Referensi: AUTH-US-02, PRD-01, GR-01, AC-01
- Dependensi: AUTH-004
- Ukuran: Kecil

### Ruang lingkup

Service/repository API membuat user, credential account dan singleton dalam satu transaksi; CLI membaca password tersembunyi/stdin khusus. Hash public yang sama dengan Better Auth dihitung sebelum transaksi. Tidak membuat sesi atau menggunakan API privat library.

### Acceptance criteria

- [ ] Provision pertama bisa login lewat endpoint nyata.
- [ ] Retry identitas sama no-op tanpa mengganti password; identitas lain ditolak.
- [ ] Provision bersamaan menghasilkan satu admin tanpa user/account parsial.
- [ ] Failure injection rollback seluruh row; password/token/connection string tidak tercetak.

### Validasi

Unit orchestration dan DB integration concurrency/rollback/retry/login. Command target `bun run --filter=api admin:provision`; buktikan cwd/env script actual.

### Hasil dan bukti

Belum diimplementasikan atau diuji.

### Blocker atau tindak lanjut

Menunggu AUTH-004 dan credential schema actual; recovery hanya AUTH-006.

## Task: AUTH-006 — Reset password dan cabut seluruh sesi

- Status: Backlog
- Owner: Pengembang/agent pelaksana
- Prioritas: P0 — keenam
- Referensi: AUTH-US-02, PRD-01, AC-07
- Dependensi: AUTH-005
- Ukuran: Kecil

### Ruang lingkup

CLI `admin:reset-password` menentukan target dari singleton, mengganti credential hash dan menghapus/mencabut seluruh session secara atomik. Tidak mengubah email/ID admin atau membuat user kedua.

### Acceptance criteria

- [ ] Password lama dan semua cookie sesi lama ditolak, password baru berhasil.
- [ ] Failure setelah update hash membuat transaksi rollback termasuk pencabutan sesi.
- [ ] Admin belum diprovision menghasilkan error yang aman; identitas target tidak berasal dari argumen user ID.
- [ ] Runbook menjelaskan recovery dan dampak logout semua perangkat.

### Validasi

Unit dan integration DB dengan beberapa sesi serta failure injection; smoke CLI tanpa password di argv/log.

### Hasil dan bukti

Belum diimplementasikan atau diuji.

### Blocker atau tindak lanjut

Menunggu AUTH-005; jangan menjalankan reset pada credential aktual sebagai test.

## User story: AUTH-US-03 — Otorisasi API dan kontrak yang dapat dipercaya

Sebagai admin, saya ingin API memeriksa sesi dan hak saya serta mendokumentasikan endpoint aktif, sehingga operasi privat tetap aman saat dipanggil langsung.

## Task: AUTH-007 — Guard admin dan DTO sesi bertipe

- Status: Backlog
- Owner: Pengembang/agent pelaksana
- Prioritas: P0 — ketujuh
- Referensi: AUTH-US-03, PRD-01/07, GR-01/02, AC-03/09
- Dependensi: AUTH-004, AUTH-005
- Ukuran: Kecil

### Ruang lingkup

Macro `requireAdmin` memakai resolve/dependency eksplisit, database-backed session dan singleton user ID. Buat `GET /admin/session` dengan DTO minimum dan response schemas/error contract. Guard hanya rute privat.

### Acceptance criteria

- [ ] No/invalid/expired/revoked session → 401; session non-admin fixture → 403; DB failure → error aman 503.
- [ ] DTO hanya user id/name/email dan session expiry UTC; tanpa token/hash/internal row.
- [ ] Fixture operasi tulis tidak dipanggil ketika akses ditolak; public route tetap 200 tanpa cookie.
- [ ] Chaining/type `App` mempertahankan contract semua status yang dideklarasikan.

### Validasi

Native Bun `app.handle(new Request(...))`, scope/lifecycle tests, DB-backed authorization tests, type-check.

### Hasil dan bukti

Belum diimplementasikan atau diuji.

### Blocker atau tindak lanjut

Menunggu AUTH-004/005; penerimaan sesi non-admin hanya fixture untuk rejection test.

## Task: AUTH-008 — Scalar gabungan untuk API dan auth

- Status: Backlog
- Owner: Pengembang/agent pelaksana
- Prioritas: P0 — kedelapan
- Referensi: AUTH-US-03, keputusan Scalar pada API Development, AC-09
- Dependensi: AUTH-004, AUTH-007
- Ukuran: Kecil

### Ruang lingkup

Helper schema server auth, `@elysia/openapi`, merge schema paths/components, cookie security, tag/operationId, filter disabled endpoint dan prefix tepat sekali. Bootstrap async menginjeksi schema ke factory sinkron; satu auth instance/pool.

### Acceptance criteria

- [ ] `/openapi` dan `/openapi/json` memuat route aktif aplikasi/auth dengan refs utuh.
- [ ] Signup/fitur disabled tidak ditampilkan sebagai tersedia; public route tidak mewarisi admin security.
- [ ] Konflik nama komponen terdeteksi; tidak menimpa schema diam-diam.
- [ ] Referensi UI auth bawaan disabled; response raw auth tidak dimodifikasi merge helper.

### Validasi

Unit transform/ref/conflict tests, HTTP schema tests dan Scalar smoke, type-check/build.

### Hasil dan bukti

Belum diimplementasikan atau diuji.

### Blocker atau tindak lanjut

Menunggu AUTH-004/007; verifikasi OpenAPI semantic version actual, bukan mengganti label versi saja.

## User story: AUTH-US-04 — Login dan dashboard pada satu origin

Sebagai admin, saya ingin login, refresh/dashboard dan logout bekerja pada browser serta SSR, sehingga saya tidak kehilangan sesi atau melihat halaman privat tanpa izin.

## Task: AUTH-009 — Gateway same-origin dan konfigurasi env

- Status: Backlog
- Owner: Pengembang/agent pelaksana
- Prioritas: P0 — kesembilan
- Referensi: AUTH-US-04, keputusan same-origin, AC-02/04
- Dependensi: AUTH-004, AUTH-007
- Ukuran: Kecil; transport header/body satu batas review

### Ruang lingkup

Server routes web `/api/auth/*` dan `/api/admin/session` menuju upstream API tetap. Tambahkan server-only `API_INTERNAL_URL`, ubah samples/default public origin dan penerusan env Turbo web. Tidak hanya proxy development Vite.

### Acceptance criteria

- [ ] Request method/body/query/cookie/Origin/status terjaga; multiple Set-Cookie utuh; response no-store.
- [ ] Upstream fixed, header/filter/redirect/timeout aman; input tidak menjadi proxy URL bebas.
- [ ] Gateway bekerja saat dev dan pada build Nitro yang dijalankan Bun.
- [ ] Browser memakai origin web; URL internal/secret auth tidak masuk bundle; env lokal existing tidak ditimpa.

### Validasi

Regression test transport dengan upstream fake, smoke cookie lewat dev dan built server, frozen install bila script berubah, lint/type/build.

### Hasil dan bukti

Belum diimplementasikan atau diuji.

### Blocker atau tindak lanjut

Menunggu AUTH-004/007. Domain/TLS deployment belum dipilih; dokumentasikan konfigurasi lokal dan batas verifikasi.

## Task: AUTH-010 — Client Eden dan pemeriksaan sesi SSR/browser

- Status: Backlog
- Owner: Pengembang/agent pelaksana
- Prioritas: P0 — kesepuluh
- Referensi: AUTH-US-04, keputusan Eden, AC-05/09
- Dependensi: AUTH-007, AUTH-009
- Ukuran: Kecil

### Ruang lingkup

API export `api/types`, dependency type-only web, client Eden/browser base origin web + `/api`, Better Auth client terpisah, session Query/helper, server function SSR dengan upstream fixed dan cookie per request.

### Acceptance criteria

- [ ] `parseDate: false`, `credentials: include`, AbortSignal dan HTTP/network error ditangani.
- [ ] Consumer mengenali DTO/status error tanpa runtime import API/auth server.
- [ ] SSR dua request berbeda tidak berbagi cookie atau private query cache; hydration hanya DTO aman.
- [ ] `401`, `403`, dan gangguan upstream dibedakan; tidak retry login mutation otomatis.

### Validasi

Type assertions untuk consumer, HTTP/network error state, request-isolation regression tests, bundle import review dan gate workspace.

### Hasil dan bukti

Belum diimplementasikan atau diuji.

### Blocker atau tindak lanjut

Menunggu AUTH-007/009; API tetap sumber otorisasi.

## Task: AUTH-011 — Form login admin yang aksesibel

- Status: Backlog
- Owner: Pengembang/agent pelaksana
- Prioritas: P0 — kesebelas
- Referensi: AUTH-US-04, PRD-01/08, Design System, AC-02/08
- Dependensi: AUTH-010
- Ukuran: Kecil

### Ruang lingkup

Halaman `/admin/login`, TanStack Form, komponen shadcn sesuai preset dan alias actual. Baca skill/docs komponen sebelum menambah primitive; jangan memasang ulang Button atau mengganti preset. Tidak memerlukan block login dari registry pihak ketiga.

### Acceptance criteria

- [ ] Label email/password, autocomplete, validasi field, pending/disabled submit, safe credential error, 429 dan error jaringan jelas.
- [ ] Sukses login memeriksa identitas admin lewat API, invalidasi sesi/router, lalu masuk dashboard.
- [ ] Return target hanya path admin lokal yang tervalidasi, menolak URL eksternal/protocol-relative/login loop.
- [ ] Keyboard/focus/error announcement bekerja, layout 390px dan desktop nyaman; tidak ada signup/email recovery button yang tidak didukung.

### Validasi

Lint/type/build web dan browser manual login benar/salah/429/network error/submit ganda/redirect tampering; catat hasil per kondisi.

### Hasil dan bukti

Belum diimplementasikan atau diuji.

### Blocker atau tindak lanjut

Menunggu AUTH-010; konten dashboard video berada di modul berikutnya.

## Task: AUTH-012 — Proteksi dashboard dan logout

- Status: Backlog
- Owner: Pengembang/agent pelaksana
- Prioritas: P0 — kedua belas
- Referensi: AUTH-US-04, PRD-01/07, GR-01/02, AC-05/06
- Dependensi: AUTH-011
- Ukuran: Kecil

### Ruang lingkup

Layout admin umum, login di luar pathless authenticated guard, dashboard minimum berisi identitas dan logout. Pemeriksaan SSR dan browser sebelum menampilkan halaman; cache privat dibersihkan pada logout sukses/penolakan sesi.

### Acceptance criteria

- [ ] Direct URL, refresh dan client navigation tanpa sesi menuju login tanpa flash dashboard.
- [ ] Sesi sah menampilkan dashboard; non-admin ditolak; dependency error memiliki retry dan tidak dianggap login kosong.
- [ ] Logout sukses mencabut sesi, membersihkan query/router state dan kembali ke login; kegagalan logout ditampilkan dengan benar.
- [ ] Expiry/recovery/session revocation ditangani pada akses berikutnya; homepage publik tetap terbuka.

### Validasi

Browser manual direct/refresh/nav/expiry/logout/recovery lintas tab/back button; SSR response/cache inspection dan gate web.

### Hasil dan bukti

Belum diimplementasikan atau diuji.

### Blocker atau tindak lanjut

Menunggu AUTH-011; UI tidak menggantikan guard API.

## User story: AUTH-US-05 — Bukti selesai dan operasi yang dapat diulang

Sebagai pemilik proyek, saya ingin bukti alur auth dan panduan operasional, sehingga hasil implementasi dapat ditinjau, dijalankan ulang, dan dipulihkan.

## Task: AUTH-013 — Validasi modul dan perbarui runbook

- Status: Backlog
- Owner: Pengembang/agent pelaksana
- Prioritas: P0 — terakhir
- Referensi: AUTH-US-05, semua AC-01..AC-10 dan Definition of Done workflow
- Dependensi: AUTH-001, AUTH-002, AUTH-003, AUTH-004, AUTH-005, AUTH-006, AUTH-007, AUTH-008, AUTH-009, AUTH-010, AUTH-011, AUTH-012
- Ukuran: Kecil; validasi alur lengkap setelah bukti per task tersedia

### Ruang lingkup

Jalankan integrated acceptance flow, quality gates, browser smoke, dan tulis command/migration/provision/recovery/origin/secret policy yang benar-benar ada pada root docs. Review diff dan catat hasil semua task, tanpa menganggap deploy production telah dijalankan.

### Acceptance criteria

- [ ] AC-01..AC-10 rencana memiliki bukti aktual, termasuk race/rollback, revoke lintas instance, SSR isolation dan cookie gateway.
- [ ] `bun install --frozen-lockfile`, unit API, DB integration terpisah, lint web, type-check semua workspace, build kedua app, dan diff check lulus.
- [ ] README/Architecture/Environment/API Development dan backlog mencerminkan kode, script, origin, folder/test aktual.
- [ ] Verifikasi lokal/build/production yang belum dilakukan dibedakan; tidak ada rahasia pada source/log/docs dan `docs/design/` tetap utuh.

### Validasi

Perintah pada Test Requirements rencana dan browser checklist di atas; record command, tanggal, hasil, serta artefak aman. Catat commit/PR hanya jika benar-benar dibuat dengan scope yang diminta.

### Hasil dan bukti

Belum diimplementasikan atau diuji. Bukti sesi planning: repository context dan plan disusun pada SHA yang tercantum; bukan bukti fitur auth berjalan.

### Blocker atau tindak lanjut

Semua prerequisite wajib lulus. Hosting/domain/TLS dan production smoke merupakan tindak lanjut deployment; storage/media bukan scope modul ini.
