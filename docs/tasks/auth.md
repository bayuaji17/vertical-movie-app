# Modul: Auth Admin Tunggal

## Tujuan modul

Admin tunggal dapat login email/password, menggunakan dashboard yang dilindungi, logout, dan memulihkan password melalui CLI. Pengunjung tetap mengakses halaman publik tanpa login. Referensi: PRD-01, PRD-07, GR-01, GR-02; [Architecture](../ARCHITECTURE.md), [API Development](../API_DEVELOPMENT.md), dan [rencana lengkap](../IMPLEMENTATION_PLAN.md).

Scope email/password + CLI provision/recovery + satu origin disetujui pengguna pada **1 Oktober 2026**. Status tiap task dan dependensinya dicatat di bawah; task tetap `Backlog` sampai prerequisite lulus. Semua task menggunakan owner **pengembang/agent pelaksana**, prioritas wajib berurutan, dan bukti aktual saat dikerjakan. Task ini tidak menetapkan sprint atau estimasi waktu kalender.

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

- Status: Done
- Owner: Pengembang/agent pelaksana
- Prioritas: P0 — ketiga
- Referensi: AUTH-US-01, PRD-01, GR-01, AC-01
- Dependensi: AUTH-002
- Ukuran: Kecil

### Ruang lingkup

Generate schema Better Auth sesuai konfigurasi aktual, termasuk limiter database; tinjau mapping snake_case/property, indeks dan timestamp. Buat singleton `admin_identity` milik API dengan fixed key/check constraint, unique user FK. Tambahkan migrasi SQL/metadata dan script migrasi eksplisit.

### Acceptance criteria

- [x] Migrasi fresh membuat semua tabel yang dibutuhkan; re-run tidak mengulang perubahan.
- [x] Database menolak singleton key lain, klaim admin kedua dan FK user yang tidak ada.
- [x] Generator/adapter memakai schema yang sama; tidak ada migrasi otomatis saat request.
- [x] Script memiliki cwd/env yang jelas dan tidak mencetak URL database.

### Validasi

Integrasi PostgreSQL lokal khusus test: fresh/re-run, introspeksi tabel/indeks, constraint/FK dan rollback. Smoke command migrator dengan URL database test; tidak menjalankan migrasi pada DB development.

### Hasil dan bukti

- Better Auth CLI `1.7.7` menghasilkan `src/db/schema/auth.ts` dari konfigurasi email/password dengan database rate limiting; Drizzle Kit menghasilkan migrasi awal berisi enam tabel (`user`, `session`, `account`, `verification`, `rate_limit`, `admin_identity`). SQL dan snapshot/journal hasil generator diperiksa.
- `admin_identity` memakai key default tetap `primary` dan check constraint, `user_id` unique, FK ke `user.id` dengan `ON DELETE RESTRICT`. SQLSTATE PostgreSQL membuktikan key kedua (23514), klaim kedua (23505), FK yang hilang (23503), serta transaksi user+identity rollback.
- Migrasi dijalankan dua kali pada database lokal baru `vertical_movie_app_auth_schema_test`; satu journal entry dan enam tabel tetap ada. Adapter Better Auth memakai object schema yang sama untuk membuat user dan row limiter.
- `bun run --cwd apps/api auth:schema:proof` lulus: 5 test, 19 assertion. `db:migrate` CLI lulus pada test DB dengan output generik; URL tidak dicetak. Database development tidak diubah.
- `bun install --frozen-lockfile`, API unit suite lulus (13 test/22 assertion), workspace type-check/build/lint, Prettier, dan `git diff --check` lulus setelah validasi akhir.
- Task dibuat menjadi commit khusus setelah seluruh acceptance dan gates lulus; SHA dicatat di git history.

### Blocker atau tindak lanjut

Tidak ada blocker. Schema belum diterapkan pada database development; endpoint dan konfigurasi instance auth diselesaikan pada AUTH-004.

## Task: AUTH-004 — Aktifkan endpoint dan kebijakan sesi Better Auth

- Status: Done
- Owner: Pengembang/agent pelaksana
- Prioritas: P0 — keempat
- Referensi: AUTH-US-01, PRD-01, GR-01/02, AC-02/04/06
- Dependensi: AUTH-003
- Ukuran: Kecil; pisahkan limiter bila proof membutuhkan pekerjaan mandiri

### Ruang lingkup

Konfigurasi `createAuthServer` di package pemilik, mount `/api/auth`, error handling aman, signup/fitur unsupported disabled, password/session/cookie/trusted origins, hook session-create dengan dependency policy admin, dan limiter PostgreSQL. `GET /` tetap publik.

### Acceptance criteria

- [x] Login/logout mengikuti payload Better Auth tanpa envelope aplikasi; credential salah gagal dengan pesan aman.
- [x] Signup/email reset unsupported ditolak melalui handler langsung; non-admin tidak mendapatkan sesi baru.
- [x] Sesi fixed 24 jam tanpa cookie cache; Origin asing ditolak; production cookie Secure/HttpOnly/SameSite sesuai policy.
- [x] Limiter aktif dan menghasilkan 429; ekstraksi key/IP tidak mempercayai spoof header browser.
- [x] Test fixture admin policy berbeda dari provisioning produk dan tidak dianggap bukti CLI selesai.

### Validasi

HTTP `app.handle` dan DB test: cookie flags, disabled endpoints, wrong credential, origin/CSRF, session expiry/revocation, limiter. Client policy default dicatat pada dokumentasi.

### Hasil dan bukti

- `apps/api/src/modules/auth/index.ts` menyusun instance Better Auth dengan schema Drizzle yang sudah dimigrasikan, email/password, signup off, password 12–128 karakter, sesi database fixed 24 jam, refresh/cookie-cache off, limiter database (lima percobaan sign-in per menit), dan allowlist endpoint HTTP hanya `/ok`, `/get-session`, `/sign-in/email`, dan `/sign-out`.
- API memeriksa `Origin` terhadap origin web persis melalui middleware Better Auth, termasuk login pertama tanpa cookie. Pemeriksaan ini ditambahkan setelah proof awal menunjukkan pemeriksaan bawaan tidak selalu memvalidasi origin login pertama.
- Hook pembuatan sesi memeriksa `admin_identity`; non-admin menerima 403 sebelum ada row sesi. Cookie bersifat host-only, HttpOnly, SameSite=Lax, dan Secure saat origin memakai HTTPS. GET `/` tetap publik.
- Belum ada proxy tepercaya, maka Better Auth tidak menggunakan `X-Forwarded-For`/header IP lain untuk limiter. Proof mengirim header spoof berbeda dan menghasilkan satu bucket database yang sama. Di production tanpa IP tepercaya, bucket ini sengaja global per path sampai reverse proxy ditetapkan.
- Database test runtime `vertical_movie_app_auth_runtime_test` dibatasi guard localhost/nama database dan boleh di-reset oleh proof; ini terpisah dari database development. Fixture admin hanya untuk menguji policy sesi dan bukan pengganti AUTH-005.
- `bun run --cwd apps/api auth:runtime:proof` lulus: 8 test, 44 assertion; mencakup login/logout/get-session, 24 jam tanpa refresh, credential salah, non-admin, Origin asing, endpoint signup/recovery disabled, rate limit 429/IP spoof, cookie production, dan root publik.
- `bun run check-types` lulus untuk API, web, dan `@repo/auth`. Pemeriksaan unit/API lengkap, build/lint workspace, migrasi ulang test DB, Prettier, dan diff check dilakukan sebelum commit khusus AUTH-004.
- Task mendapat commit tersendiri setelah seluruh acceptance dan gates lulus; commit dapat ditemukan di history branch.

### Blocker atau tindak lanjut

Tidak ada blocker. Task ini tidak memprovision admin production/local development; provisioning dilakukan AUTH-005 dan DTO/guard privat diselesaikan AUTH-007.

## User story: AUTH-US-02 — Provisioning dan pemulihan terkendali

Sebagai operator, saya ingin membuat satu admin dan memulihkan password lewat CLI, sehingga akses dapat dipulihkan tanpa membuka registrasi publik atau layanan email.

## Task: AUTH-005 — Provision admin tunggal melalui CLI

- Status: Done
- Owner: Pengembang/agent pelaksana
- Prioritas: P0 — kelima
- Referensi: AUTH-US-02, PRD-01, GR-01, AC-01
- Dependensi: AUTH-004
- Ukuran: Kecil

### Ruang lingkup

Service/repository API membuat user, credential account dan singleton dalam satu transaksi; CLI membaca password tersembunyi/stdin khusus. Hash public yang sama dengan Better Auth dihitung sebelum transaksi. Tidak membuat sesi atau menggunakan API privat library.

### Acceptance criteria

- [x] Provision pertama bisa login lewat endpoint nyata.
- [x] Retry identitas sama no-op tanpa mengganti password; identitas lain ditolak.
- [x] Provision bersamaan menghasilkan satu admin tanpa user/account parsial.
- [x] Failure injection rollback seluruh row; password/token/connection string tidak tercetak.

### Validasi

Unit orchestration dan DB integration concurrency/rollback/retry/login. Gunakan command `bun run --cwd apps/api admin:provision -- <admin-email>` dari root agar prompt interaktif dan stdin tersembunyi diteruskan; password tidak menjadi argumen.

### Hasil dan bukti

- Service memvalidasi/menormalisasi email, menolak password di luar panjang login 12–128, menghitung hash memakai `hashPassword` publik Better Auth sebelum transaksi, lalu membuat user, account provider `credential`, dan singleton dalam satu transaksi Drizzle.
- Advisory transaction lock menyerialisasi proses provisioning bersamaan; retry email yang sama no-op dan password tersimpan tidak berubah, sementara identitas lain atau user email yang sudah ada ditolak. Provisioning tidak membuat sesi.
- CLI `apps/api/src/modules/auth/provision-cli.ts` mengambil email sebagai argumen biasa dan password tanpa echo dari terminal atau satu baris stdin. Output/error tidak menampilkan password, hash, token, URL database, atau kredensial. Script menutup client pada semua hasil transaksi.
- `bun run --cwd apps/api auth:admin:proof` lulus pada database khusus `vertical_movie_app_auth_admin_test`: 6 test, 26 assertion. Proof mencakup login endpoint nyata, retry password tidak berubah, penolakan identitas kedua, race konkurensi (hanya satu user/account/admin), trigger failure yang me-rollback seluruh row, serta subprocess CLI dari stdin yang tidak membocorkan password/URL.
- Smoke interaktif via `bun run --cwd apps/api admin:provision -- <email>` mengembalikan no-op dengan password baru dan membuktikan input terminal tidak tampil. Jangan gunakan `--filter=api` untuk command interaktif pada Bun 1.4.2: smoke workspace filter tidak meneruskan stdin ke proses CLI.
- `createDatabase` kini memasukkan schema Drizzle supaya service dan client transaksi API memakai tipe schema auth yang sama. Database development tetap tidak dimigrasikan atau diprovision.
- `bun install --frozen-lockfile`, API unit suite, workspace type-check/build/lint, Prettier, dan `git diff --check` dijalankan sebelum commit khusus AUTH-005.

### Blocker atau tindak lanjut

Tidak ada blocker. Reset password dan pencabutan sesi diselesaikan AUTH-006.

## Task: AUTH-006 — Reset password dan cabut seluruh sesi

- Status: Done
- Owner: Pengembang/agent pelaksana
- Prioritas: P0 — keenam
- Referensi: AUTH-US-02, PRD-01, AC-07
- Dependensi: AUTH-005
- Ukuran: Kecil

### Ruang lingkup

CLI `admin:reset-password` menentukan target dari singleton, mengganti credential hash dan menghapus/mencabut seluruh session secara atomik. Tidak mengubah email/ID admin atau membuat user kedua.

### Acceptance criteria

- [x] Password lama dan semua cookie sesi lama ditolak, password baru berhasil.
- [x] Failure setelah update hash membuat transaksi rollback termasuk pencabutan sesi.
- [x] Admin belum diprovision menghasilkan error yang aman; identitas target tidak berasal dari argumen user ID.
- [x] Runbook menjelaskan recovery dan dampak logout semua perangkat.

### Validasi

Unit dan integration DB dengan beberapa sesi serta failure injection; smoke CLI tanpa password di argv/log. Jalankan proof lokal memakai `bun run --cwd apps/api auth:recovery:proof` dan gunakan hanya `AUTH_ADMIN_TEST_DATABASE_URL`.

### Hasil dan bukti

- `resetAdminPassword` memakai public Better Auth hasher, mengunci transaksi dengan advisory lock yang sama seperti provisioning, menemukan target dari singleton `primary`, memperbarui credential admin, lalu menghapus seluruh row session target dalam satu transaksi. Email, user ID, dan singleton tetap sama; tidak ada parameter user ID.
- CLI `bun run --cwd apps/api admin:reset-password` meminta password tersembunyi atau satu baris stdin. Password tidak ada di argv/output; pesan sukses menyatakan seluruh sesi dicabut, dan error untuk singleton yang belum ada tidak membocorkan identitas/database.
- PostgreSQL proof pada `vertical_movie_app_auth_admin_test` lulus: 4 test, 44 assertion. Dua sesi lama tidak berlaku lagi, password lama gagal dan password baru sukses; trigger pada penghapusan sesi membuktikan update hash dan session revoke rollback bersama; keadaan tanpa admin mengembalikan error CLI aman; argumen user ID ditolak.
- Runbook recovery dan dampak logout semua perangkat ditambahkan ke `docs/ENVIRONMENT.md`. Database development tidak dipakai.
- `bun install --frozen-lockfile`, API unit suite, workspace type-check/build/lint, Prettier, `git diff --check`, serta provisioning proof setelah ekstraksi input CLI dijalankan sebelum commit khusus AUTH-006.

### Blocker atau tindak lanjut

Tidak ada blocker. Jalankan recovery hanya pada database aplikasi yang sudah dimigrasikan dan setelah operator mengonfirmasi database target dari environment deployment.

## User story: AUTH-US-03 — Otorisasi API dan kontrak yang dapat dipercaya

Sebagai admin, saya ingin API memeriksa sesi dan hak saya serta mendokumentasikan endpoint aktif, sehingga operasi privat tetap aman saat dipanggil langsung.

## Task: AUTH-007 — Guard admin dan DTO sesi bertipe

- Status: Done
- Owner: Pengembang/agent pelaksana
- Prioritas: P0 — ketujuh
- Referensi: AUTH-US-03, PRD-01/07, GR-01/02, AC-03/09
- Dependensi: AUTH-004, AUTH-005
- Ukuran: Kecil

### Ruang lingkup

Macro `requireAdmin` memakai resolve/dependency eksplisit, database-backed session dan singleton user ID. Buat `GET /admin/session` dengan DTO minimum dan response schemas/error contract. Guard hanya rute privat.

### Acceptance criteria

- [x] No/invalid/expired/revoked session → 401; session non-admin fixture → 403; DB failure → error aman 503.
- [x] DTO hanya user id/name/email dan session expiry UTC; tanpa token/hash/internal row.
- [x] Fixture operasi tulis tidak dipanggil ketika akses ditolak; public route tetap 200 tanpa cookie.
- [x] Chaining/type `App` mempertahankan contract semua status yang dideklarasikan.

### Validasi

Native Bun `app.handle(new Request(...))`, scope/lifecycle tests, DB-backed authorization tests, type-check.

### Hasil dan bukti

- Macro `requireAdmin` berada pada `apps/api/src/modules/auth/admin/guard.ts` dan menerima `getSession`/`isAdminUser` eksplisit. Ia membaca sesi dari request headers untuk tiap request, lalu memeriksa singleton terkini; hanya rute admin yang mengaktifkan macro tersebut.
- `GET /admin/session` mengembalikan `{ user: { id, name, email }, session: { expiresAt } }`; `expiresAt` ISO 8601 UTC. Error aplikasi memuat code, message aman, dan requestId. Response schemas mendeklarasikan `200/401/403/503`; `App` tetap hasil chaining factory `createApp`.
- PostgreSQL proof pada `vertical_movie_app_auth_admin_test` lulus 4 test, 29 assertion: public root tanpa cookie, no/invalid/expired/revoked session, admin yang valid, identitas admin dicabut (403), query authorization gagal (503), DTO no-store, dan route write fixture tidak dijalankan saat guard menolak.
- `bun run check-types` berhasil untuk API, web, dan auth package; `bun run build`, API unit suite, `bun run --cwd apps/api auth:authorization:proof`, frozen install, lint, Prettier, dan diff check dijalankan sebelum commit khusus AUTH-007.

### Blocker atau tindak lanjut

Tidak ada blocker. Rute sesi terjaga; endpoint domain privat berikutnya memakai macro yang sama.

## Task: AUTH-008 — Scalar gabungan untuk API dan auth

- Status: Done
- Owner: Pengembang/agent pelaksana
- Prioritas: P0 — kedelapan
- Referensi: AUTH-US-03, keputusan Scalar pada API Development, AC-09
- Dependensi: AUTH-004, AUTH-007
- Ukuran: Kecil

### Ruang lingkup

Helper schema server auth, `@elysia/openapi`, merge schema paths/components, cookie security, tag/operationId, filter disabled endpoint dan prefix tepat sekali. Bootstrap async menginjeksi schema ke factory sinkron; satu auth instance/pool.

### Acceptance criteria

- [x] `/openapi` dan `/openapi/json` memuat route aktif aplikasi/auth dengan refs utuh.
- [x] Signup/fitur disabled tidak ditampilkan sebagai tersedia; public route tidak mewarisi admin security.
- [x] Konflik nama komponen terdeteksi; tidak menimpa schema diam-diam.
- [x] Referensi UI auth bawaan disabled; response raw auth tidak dimodifikasi merge helper.

### Validasi

Unit merge/ref/conflict tests, HTTP schema tests dan Scalar smoke, type-check/build, serta frozen install.

### Hasil dan bukti

- `@repo/auth/server` menyediakan helper `generateAuthOpenAPISchema()` dan konfigurasi Better Auth memasang `openAPI({ disableDefaultReference: true })`. Bootstrap menghasilkan schema dari instance auth yang sama sebelum listen lalu menginjeksi hasilnya ke factory Elysia yang tetap sinkron.
- Plugin `@elysia/openapi` menyusun route API; hook lokal Scalar hanya berjalan pada `/openapi/json` dan tidak mengubah kontrak Eden rute bisnis. Path/method allowlist auth sama dengan handler: `GET /ok`, `GET/POST /get-session`, `POST /sign-in/email`, dan `POST /sign-out`. Prefix `/api/auth` ditambahkan sekali, generator server tidak disalin, endpoint auth lain disaring, dan setiap operasi auth bertag `Better Auth` serta memiliki operation ID.
- Operasi login/status eksplisit publik (`security: []`). Session/logout dan `/admin/session` memakai `betterAuthSessionCookie`; scheme mengikuti secure cookie `__Secure-` saat konfigurasi HTTPS. Tidak ada security global yang diwariskan oleh katalog.
- Paths dan komponen digabung per kategori; benturan path, operation ID, dan nama schema menolak dokumen. Operasi serta `$ref` generator dipertahankan tanpa memutasi schema asal. Scalar adalah satu halaman utama; route referensi Better Auth dan route handler wildcard tidak tampil di schema.
- `bun test apps/api/src/plugins/openapi.test.ts apps/api/src/app.test.ts` lulus: 4 test, 8 assertion. Uji membuktikan merge tanpa mutasi dan penolakan konflik path/komponen.
- `bun run --cwd apps/api auth:openapi:proof` lulus: 2 test, 61 assertion. PostgreSQL URL dibatasi ke database test lokal `vertical_movie_app_auth_admin_test`; proof hanya membangun instance adapter dan tidak reset/migrasi database atau menjalankan query.
- Integration proof memverifikasi `/openapi` dan `/openapi/json`, status OpenAPI `3.1.1`, root/admin/auth route aktif, signup/reference disabled tersembunyi dan tetap 404, security login/public/session/logout/admin, cookie secure HTTPS, operation ID unik, serta seluruh `$ref` lokal dapat diselesaikan. `GET /api/auth/ok` tetap memberi payload raw Better Auth `{ ok: true }`.
- Auth runtime regression proof lulus 8 test/44 assertion; authorization proof lulus 4 test/29 assertion. Allowlist metode handler tetap sama dengan allowlist OpenAPI.
- Frozen install, workspace `check-types`, full build, web lint, seluruh API unit suite (21 test/38 assertion), Prettier, dan `git diff --check` lulus. Task mendapat commit khusus setelah review perubahan.

### Blocker atau tindak lanjut

Tidak ada blocker. Better Auth dan dokumen gabungan terverifikasi memakai OpenAPI `3.1.1`.

## User story: AUTH-US-04 — Login dan dashboard pada satu origin

Sebagai admin, saya ingin login, refresh/dashboard dan logout bekerja pada browser serta SSR, sehingga saya tidak kehilangan sesi atau melihat halaman privat tanpa izin.

## Task: AUTH-009 — Gateway same-origin dan konfigurasi env

- Status: Done
- Owner: Pengembang/agent pelaksana
- Prioritas: P0 — kesembilan
- Referensi: AUTH-US-04, keputusan same-origin, AC-02/04
- Dependensi: AUTH-004, AUTH-007
- Ukuran: Kecil; transport header/body satu batas review

### Ruang lingkup

Server routes web `/api/auth/*` dan `/api/admin/session` menuju upstream API tetap. Tambahkan server-only `API_INTERNAL_URL`, ubah samples/default public origin dan penerusan env Turbo web. Tidak hanya proxy development Vite.

### Acceptance criteria

- [x] Request method/body/query/cookie/Origin/status terjaga; multiple Set-Cookie utuh; response no-store.
- [x] Upstream fixed, header/filter/redirect/timeout aman; input tidak menjadi proxy URL bebas.
- [x] Gateway bekerja saat dev dan pada build Nitro yang dijalankan Bun.
- [x] Browser memakai origin web; URL internal/secret auth tidak masuk bundle; env lokal existing tidak ditimpa.

### Validasi

Regression test transport dengan upstream fake, smoke cookie lewat dev dan built server, frozen install bila script berubah, lint/type/build.

### Hasil dan bukti

- Server routes TanStack Start menerima semua method pada `/api/auth/*` dan GET `/api/admin/session`. Gateway memetakan sesi admin ke endpoint API tetap `/admin/session`; path dan query auth diteruskan sesuai jalurnya. `API_INTERNAL_URL` dibaca per request hanya di handler server; browser tetap memakai `VITE_API_URL` dengan origin web.
- Gateway menerima hanya origin HTTP(S) tanpa userinfo/path/query/fragment, menetapkan target upstream dari dua jalur tetap, mem-forward allowlist header browser tanpa Host/forwarded header, membatasi body request 1 MiB, dan memakai timeout/abort sampai body respons selesai. Redirect otomatis dimatikan; Location same-origin dibuat relatif dan host lain ditolak. Header respons di-allowlist, tiap Set-Cookie dipertahankan, dan semua respons gateway `Cache-Control: no-store`.
- `.env.example` web sudah berisi `VITE_API_URL=http://localhost:3000` dan `API_INTERNAL_URL=http://localhost:3001`; tidak ada env lokal yang ditimpa. Turbo sudah meneruskan `API_INTERNAL_URL` untuk dev/start dan hanya `VITE_API_URL` untuk build browser.
- `bun run --cwd apps/web auth:gateway:proof` lulus: 8 test dengan 35 expectation untuk forwarding, header filter, cookie ganda, status/no-store, path admin tetap, URL upstream tetap, redirect, konfigurasi invalid, batas body, dan timeout.
- `bun run --cwd apps/web auth:gateway:smoke` lulus terhadap upstream HTTP palsu melalui server Vite dev dan build Nitro/Bun: POST/DELETE, body/query/cookie/Origin, GET admin ke `/admin/session`, status 201, dua Set-Cookie, serta no-store.
- `bun install --frozen-lockfile`, `bun run check-types`, `bun run lint`, `bun run build`, Prettier, dan `git diff --check` lulus. Pencarian bundle `.output/public` tidak menemukan `API_INTERNAL_URL`, `createAuthGateway`, atau marker error internal gateway. Build hanya menampilkan warning directive module dari dependency client yang sudah ada.
- AUTH-009 dibuat menjadi commit tersendiri setelah semua acceptance dan validasi lulus.

### Blocker atau tindak lanjut

Tidak ada blocker implementasi lokal. Domain/TLS deployment belum dipilih; production domain/cookie belum dapat diverifikasi hingga konfigurasi deployment tersedia.

## Task: AUTH-010 — Client Eden dan pemeriksaan sesi SSR/browser

- Status: Done
- Owner: Pengembang/agent pelaksana
- Prioritas: P0 — kesepuluh
- Referensi: AUTH-US-04, keputusan Eden, AC-05/09
- Dependensi: AUTH-007, AUTH-009
- Ukuran: Kecil

### Ruang lingkup

API export `api/types`, dependency type-only web, client Eden/browser base origin web + `/api`, Better Auth client terpisah, session Query/helper, server function SSR dengan upstream fixed dan cookie per request.

### Acceptance criteria

- [x] `parseDate: false`, `credentials: include`, AbortSignal dan HTTP/network error ditangani.
- [x] Consumer mengenali DTO/status error tanpa runtime import API/auth server.
- [x] SSR dua request berbeda tidak berbagi cookie atau private query cache; hydration hanya DTO aman.
- [x] `401`, `403`, dan gangguan upstream dibedakan; belum ada login mutation yang dapat retry.

### Validasi

Type assertions untuk consumer, HTTP/network error state, request-isolation regression tests, bundle import review dan gate workspace.

### Hasil dan bukti

- Web memasang `@elysia/eden` `1.4.10` dan dependency workspace `api`; `App` hanya diimpor dengan `import type` dari `api/types`. `elysia` `1.4.30` adalah dev dependency web untuk menyamakan deklarasi peer Eden ketika TypeScript menginfer kontrak. Client Eden memakai base `/api` pada origin publik web, `parseDate: false`, `credentials: include`, `cache: no-store`, dan menerima AbortSignal per pemanggilan. Base URL hanya menerima origin HTTP(S) yang valid dengan path `/api`.
- `apps/web/src/lib/auth/client.ts` membuat Better Auth client terpisah melalui `@repo/auth/client`; credentials dikirim dengan `include`. Tidak ada import runtime `api` atau `@repo/auth/server` di client.
- `adminSessionQueryOptions` memakai key privat tetap dan QueryClient dari `getRouter()` yang baru untuk tiap router/request. SSR membaca cookie dari `getRequest()` pada pemanggilan server function tersebut, memvalidasi `API_INTERNAL_URL`, lalu memanggil API melalui origin internal tetap dan `/api/admin/session` (route API aktual `/admin/session`). Browser memakai Eden menuju gateway same-origin. Loader mengirim cookie per pemanggilan, meneruskan AbortSignal, dan hanya memproyeksikan whitelist DTO user serta `expiresAt`; cookie dan body error upstream tidak masuk hasil serializable.
- State membedakan 401 (`unauthenticated`), 403 (`forbidden`), HTTP upstream lain termasuk 503, kegagalan jaringan yang dipetakan Eden menjadi 503 internal tanpa Response, dan konfigurasi invalid. Abort tetap dibatalkan, bukan disamarkan sebagai kegagalan jaringan. API tetap menjadi otoritas sesi/admin.
- `bun run --cwd apps/web auth:session:proof` lulus: 4 test/22 assertion untuk tipe DTO/string tanggal, origin/path dan fetch config, cookie + AbortSignal pada dua load SSR paralel, state 401/403/HTTP 503/network, pembatalan request, hasil tanpa cookie, dan QueryClient request-isolation. `bun install --frozen-lockfile`, `bun run check-types`, `bun run lint`, dan `bun run build` lulus. Pemeriksaan bundle hasil build tidak menemukan konfigurasi `API_INTERNAL_URL` atau runtime API/auth server pada asset browser.
- Tidak dilakukan smoke login dengan database karena formulir dan dashboard adalah backlog AUTH-011/012; deployment domain/TLS juga belum tersedia.

### Blocker atau tindak lanjut

Tidak ada blocker untuk client dan loader sesi. AUTH-011 menggunakan Better Auth client ini untuk formulir; AUTH-012 menggunakan state SSR/browser untuk guard.

## Task: AUTH-011 — Form login admin yang aksesibel

- Status: Done — implementasi dan gate otomatis selesai
- Owner: Pengembang/agent pelaksana
- Prioritas: P0 — kesebelas
- Referensi: AUTH-US-04, PRD-01/08, Design System, AC-02/08
- Dependensi: AUTH-010
- Ukuran: Kecil

### Ruang lingkup

Halaman `/admin/login`, TanStack Form, komponen shadcn sesuai preset dan alias actual. Baca skill/docs komponen sebelum menambah primitive; jangan memasang ulang Button atau mengganti preset. Tidak memerlukan block login dari registry pihak ketiga.

### Acceptance criteria

- [x] Label email/password, autocomplete, validasi field, pending/disabled submit, safe credential error, 429 dan error jaringan jelas.
- [x] Sukses login memeriksa identitas admin lewat API, invalidasi sesi/router, lalu masuk dashboard.
- [x] Return target hanya path admin lokal yang tervalidasi, menolak URL eksternal/protocol-relative/login loop.
- [x] Keyboard/focus/error announcement disediakan, layout responsif untuk ponsel dan desktop; tidak ada signup/email recovery button yang tidak didukung.

### Validasi

Lint/type/build web dan browser manual login benar/salah/429/network error/submit ganda/redirect tampering; catat hasil per kondisi.

### Hasil dan bukti

- `apps/web/src/routes/admin.login.tsx` dan `components/auth/login-form.tsx` menyediakan halaman `/admin/login` memakai TanStack Form serta komponen Base UI shadcn. Email dinormalisasi, password tidak diubah; pending menonaktifkan field/tombol dan submit invalid memindahkan fokus ke field pertama.
- Sesi admin diverifikasi melalui query Eden setelah Better Auth sign-in; hanya state authenticated yang membersihkan/invalidate cache, menginvalidasi router, lalu menuju return target.
- `lib/auth/login.ts` menolak return target eksternal, protocol-relative, path non-admin, login loop, backslash, dan karakter kontrol; pesan error tidak menampilkan detail server. Retry otomatis login dinonaktifkan (`retry: 0`).
- `bun run --cwd apps/web auth:login:proof` lulus: 4 test/20 assertion. Web lint, type-check, production build dan `git diff --check` lulus. Nitro hasil build merespons `/admin/login?redirect=%2Fadmin` dengan HTTP 200; target eksternal dinormalisasi via 307 ke `/admin/login?redirect=%2Fadmin`.
- Browser manual untuk login benar/salah, 429, gangguan jaringan, submit ganda, keyboard, dan ukuran layar belum dijalankan karena browser runner tidak tersedia pada lingkungan ini. UI menyediakan keadaan dan perilaku tersebut; smoke HTTP hanya membuktikan render SSR dan sanitasi redirect.

### Blocker atau tindak lanjut

Konten dashboard dan logout berada di AUTH-012. Jalankan checklist browser manual saat browser test runner tersedia.

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
