# Modul: Auth Admin Tunggal

## Tujuan modul

Admin tunggal dapat login email/password, menggunakan dashboard yang dilindungi, logout, dan memulihkan password melalui CLI. Pengunjung tetap mengakses halaman publik tanpa login. Referensi: PRD-01, PRD-07, GR-01, GR-02; [Architecture](../ARCHITECTURE.md), [API Development](../API_DEVELOPMENT.md), dan [rencana lengkap](../IMPLEMENTATION_PLAN.md).

Scope email/password + CLI provision/recovery + satu origin disetujui pengguna pada **1 Oktober 2026**. Status tiap task dan dependensinya dicatat di bawah; task tetap `Backlog` sampai prerequisite lulus. Semua task menggunakan owner **pengembang/agent pelaksana**, prioritas wajib berurutan, dan bukti aktual saat dikerjakan. Task ini tidak menetapkan sprint atau estimasi waktu kalender.

> Status aktif 2 Oktober 2026: AUTH-REF-001–010 selesai dan memiliki commit per task. AUTH-001–013 di bawah dipertahankan sebagai riwayat. Kontrak/command native aktif ada pada [Auth Operations](../AUTH_OPERATIONS.md); expand/contract database development selesai pada AUTH-FUP-001; rollout deployment masih pending.

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
- Bukti schema CLI: `packages/auth/test/fixtures/auth-probe.config.ts` → schema Drizzle di `apps/api/test/fixtures/auth-probe-schema.ts`; SQL migrasi fixture tersimpan di `apps/api/test/fixtures/auth-probe-migrations/` pada proof awal. Fixture legacy ini dihapus pada AUTH-REF-009; proof final memakai schema canonical dan migrasi aplikasi.
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

- Status: Done — guard SSR/browser dan logout
- Owner: Pengembang/agent pelaksana
- Prioritas: P0 — kedua belas
- Referensi: AUTH-US-04, PRD-01/07, GR-01/02, AC-05/06
- Dependensi: AUTH-011
- Ukuran: Kecil

### Ruang lingkup

Layout admin umum, login di luar pathless authenticated guard, dashboard minimum berisi identitas dan logout. Pemeriksaan SSR dan browser sebelum menampilkan halaman; cache privat dibersihkan pada logout sukses/penolakan sesi.

### Acceptance criteria

- [x] Direct URL, refresh dan client navigation tanpa sesi menuju login tanpa flash dashboard.
- [x] Sesi sah menampilkan dashboard; non-admin ditolak; dependency error memiliki retry dan tidak dianggap login kosong.
- [x] Logout sukses mencabut sesi, membersihkan query/router state dan kembali ke login; kegagalan logout ditampilkan dengan benar.
- [x] Expiry/recovery/session revocation ditangani pada akses berikutnya; homepage publik tetap terbuka.

### Validasi

Browser manual direct/refresh/nav/expiry/logout/recovery lintas tab/back button; SSR response/cache inspection dan gate web.

### Hasil dan bukti

- `admin.tsx` membungkus route admin dengan `Cache-Control: private, no-store`; `/admin/login` tetap sibling publik terhadap `admin._authenticated.tsx`. Pathless guard memeriksa API melalui query sesi dengan `retry: false` sebelum dashboard dapat render; state `unauthenticated` menghapus cache admin lalu redirect sambil mempertahankan path lokal, `forbidden` menolak akses, dan `unavailable` menahan dashboard serta menyediakan retry.
- Dashboard menampilkan DTO admin yang sudah di-whitelist dan expiry ISO UTC. Logout memanggil Better Auth tanpa retry; hanya respons sukses yang membatalkan/menghapus query `auth`/`admin`, menginvalidasi router, lalu mengganti route ke login. Error logout tetap terlihat dan tidak mengklaim sesi tercabut. Query publik tidak ikut dihapus.
- `bun run --cwd apps/web auth:guard:proof` lulus: 1 test/3 assertion untuk pembersihan cache privat sambil mempertahankan data publik. `auth:login:proof` lulus 5 test/22 assertion. Workspace type-check, lint dan build lulus.
- Nitro/Bun SSR memakai API fixture lokal untuk status sesi: tanpa cookie, `/admin?tab=videos` mengembalikan 307 ke login dengan target terenkripsi lokal dan `Cache-Control: private, no-store`; cookie admin merender identitas/dashboard dengan `no-store`; 403 menampilkan akses ditolak; 503 menampilkan retry tanpa identitas/dashboard; `/` publik tetap HTTP 200.
- Prettier check pada seluruh file AUTH-012 lulus. `bun run --cwd apps/web check` masih gagal pada lima file repo yang tidak diubah task ini: `.cta.json`, `prettier.config.js`, `README.md`, `src/components/ui/button.tsx`, dan `src/lib/utils.ts`.
- Browser manual lintas tab/back button, interaksi tombol logout, serta koneksi ke PostgreSQL aktual belum dijalankan pada AUTH-012; browser runner tidak tersedia. Server-side route guards dan callback logout sudah tercakup oleh code/type checks, cache proof, serta SSR fixture smoke. Verifikasi alur terhadap Better Auth/PostgreSQL dijadwalkan pada AUTH-013.

### Blocker atau tindak lanjut

Guard endpoint domain API tetap menjadi otoritas. AUTH-013 menyelesaikan integrated acceptance dan runbook; checklist browser manual tetap perlu dijalankan pada lingkungan browser.

## User story: AUTH-US-05 — Bukti selesai dan operasi yang dapat diulang

Sebagai pemilik proyek, saya ingin bukti alur auth dan panduan operasional, sehingga hasil implementasi dapat ditinjau, dijalankan ulang, dan dipulihkan.

## Task: AUTH-013 — Validasi modul dan perbarui runbook

- Status: Done — proof lokal dan runbook selesai; smoke manual browser/deployment dicatat sebagai tindak lanjut
- Owner: Pengembang/agent pelaksana
- Prioritas: P0 — terakhir
- Referensi: AUTH-US-05, semua AC-01..AC-10 dan Definition of Done workflow
- Dependensi: AUTH-001, AUTH-002, AUTH-003, AUTH-004, AUTH-005, AUTH-006, AUTH-007, AUTH-008, AUTH-009, AUTH-010, AUTH-011, AUTH-012
- Ukuran: Kecil; validasi alur lengkap setelah bukti per task tersedia

### Ruang lingkup

Jalankan integrated acceptance flow, quality gates, browser smoke, dan tulis command/migration/provision/recovery/origin/secret policy yang benar-benar ada pada root docs. Review diff dan catat hasil semua task, tanpa menganggap deploy production telah dijalankan.

### Acceptance criteria

- [x] AC-01..AC-10 memiliki bukti API, database, gateway, loader SSR, dan build yang sesuai; AC-02, AC-05, AC-06, dan AC-08 yang membutuhkan browser tetap ditandai pending pada plan.
- [x] `bun install --frozen-lockfile`, unit API, DB integration terpisah, lint web, type-check semua workspace, build kedua app, dan diff check lulus.
- [x] README/Architecture/Environment/API Development dan backlog mencerminkan kode, script, origin, folder/test aktual.
- [x] Verifikasi lokal/build/production yang belum dilakukan dibedakan; tidak ada rahasia pada source/log/docs dan `docs/design/` tetap utuh.

### Validasi

Validasi lokal 2 Oktober 2026; perintah auth terperinci ada pada Test Requirements rencana. Jalankan proof PostgreSQL secara serial karena beberapa mereset schema. Smoke Vite/Nitro memakai API fixture. Browser UI manual dan deployment production tidak tersedia dalam environment ini; jangan menyamakan HTTP smoke dengan verifikasi visual/interaksi.

### Hasil dan bukti

- `bun install --frozen-lockfile` dan `bun run --cwd apps/api test` lulus; API suite: 21 test/38 assertion.
- PostgreSQL proofs lulus: `auth:adapter:proof` 2/16, `auth:schema:proof` 5/19, `auth:runtime:proof` 8/44, `auth:admin:proof` 6/26, `auth:recovery:proof` 4/44, `auth:authorization:proof` 4/29, dan `auth:openapi:proof` 2/61 (test/expectation). Proof memakai database lokal auth test dengan guard host/nama DB; tidak menggunakan database development.
- Web proofs lulus: `auth:gateway:proof` 8/35, `auth:session:proof` 4/22, `auth:login:proof` 5/22, dan `auth:guard:proof` 1/3. `auth:gateway:smoke` menjalankan Vite dev dan server Nitro/Bun hasil build, memeriksa method, path, cookie ganda, status dan `no-store` terhadap API fixture.
- `bun run check-types`, `bun run lint`, `bun run build`, serta `git diff --check` lulus. Build berhasil dengan peringatan directive module dari dependency; task memakai hasil cache Turbo. `bun run --cwd apps/web check` pernah gagal pada lima file baseline yang tidak berubah (`.cta.json`, `prettier.config.js`, `README.md`, `src/components/ui/button.tsx`, `src/lib/utils.ts`); file itu tidak diubah dalam backlog ini.
- Smoke SSR fixture AUTH-012 yang tercatat di bagian sebelumnya membuktikan anonymous redirect/no-store, admin dashboard, non-admin denial, upstream error, dan halaman publik. Bukti itu memakai API fixture, bukan browser atau server deployment.
- Environment tidak memiliki browser executable atau browser runner. Checklist login benar/salah/429/network, double submit, keyboard/focus, viewport mobile/desktop, lintas tab/back, dan logout visual masih pending. Domain/TLS, reverse-proxy trust, migrasi database development, provisioning development, dan production smoke juga belum dilakukan. `docs/design/` tetap untracked dan tidak disentuh.
- Runbook memperbarui command proof yang benar, batas DB test, command migrasi/provision/reset, same-origin browser/API, secret policy, dan status deployment. Tidak ada secret ditulis atau dicetak.

### Blocker atau tindak lanjut

Tindak lanjut: jalankan browser smoke untuk menutup AC-02/AC-05/AC-06/AC-08 saat browser runner tersedia; setelah domain dipilih, verifikasi HTTPS/cookie dan reverse proxy di deployment. Storage/media di luar scope modul ini.

Arahan refactor diperinci pengguna pada 2 Oktober 2026. Desain lengkap ada pada [AUTH_REFACTOR_PLAN.md](../AUTH_REFACTOR_PLAN.md). Task AUTH-001–013 tetap menjadi riwayat. ID AUTH-REF-001–005 dipertahankan; scope web/cleanup/acceptance dipecah menjadi AUTH-REF-006–010. Rencana induk disetujui pengguna pada 2 Oktober 2026. Checklist rinci di bawah merupakan rencana eksekusi; kode belum diimplementasikan. AUTH-REF-001 berstatus Ready karena scope/AC jelas dan tidak memiliki dependensi; task lain tetap Backlog sampai dependensinya selesai.

## Revisi berikutnya — package auth dan TanStack isomorphic/Query

### User story AUTH-REF-US01 — Satu pemilik auth

Sebagai pengembang, saya ingin seluruh auth berasal dari entry client/server package, sehingga konfigurasi, tipe dan migrasi konsisten tanpa duplikasi lifecycle.

### User story AUTH-REF-US02 — Akses admin aman

Sebagai operator, saya ingin dashboard terlindungi pada refresh/SSR/navigasi dan API mengotorisasi setiap request privat, sehingga akun selain admin tidak memperoleh data privat.

### User story AUTH-REF-US03 — Cache session saat navigasi

Sebagai admin, saya ingin snapshot session dipakai bersama guard/UI selama masih fresh, sehingga perpindahan halaman tidak selalu menghubungi backend dan perubahan akses tetap direvalidasi.

### User story AUTH-REF-US04 — Seed dan recovery native

Sebagai operator, saya ingin membuat/memulihkan satu admin memakai API/CLI Better Auth lokal, sehingga credential/session dikelola library tanpa email service.

### Aturan eksekusi task refactor

- Source kode saat rencana diperinci masih mengikuti baseline; dokumen pada commit `8369a59` disetujui pengguna pada 2 Oktober 2026.
- Urutan: **001 -> 002 -> 004 -> 005 -> 006 -> 007 -> 008 -> 003 -> 009 -> 010**. ID tetap, prioritas mengikuti urutan ini.
- Checklist `AUTH-REF-xxx.yy` adalah langkah implementasi dalam parent task. Centang hanya setelah langkah dilakukan; parent Done memerlukan seluruh AC dan bukti.
- Ubah task berikutnya menjadi Ready ketika dependensi selesai dan preflight tersedia; jangan menganggap persetujuan rencana sebagai hasil implementasi.
- Satu commit per parent task selesai sesuai arahan pengguna. Jika ukuran task saat eksekusi terlalu besar, pecah menjadi task delivery yang lebih kecil dengan ID/AC/dependensi jelas sebelum melanjutkan.
- Commit hanya file task; perubahan skill/skills-lock/design yang sudah ada tidak disertakan. Branch tetap `feat/auth-admin-module`.
- Schema baseline milik package dipindah pada 001, field plugin dan expand migration pada 002, bootstrap native pada 004; contract/drop singleton hanya pada 009.
- Daftar command adalah rencana validasi. Jangan menjalankan migration/seed/reset dengan env development saat mengerjakan proof; gunakan guard DB khusus test. Tidak menjalankan shutdown/maintenance pada proses pengguna saat hanya menyusun rencana.
- Setiap hasil proof dicatat dengan command, source SHA, tanggal, jumlah test atau network request, fixture/runtime, dan hasil lulus/gagal/pending. Jangan menulis password/token/cookie/database URL.
- Lint/type-check dapat memakai cache Turbo bila source relevan tidak berubah. Klaim browser/request-count/production memerlukan proof perilaku aktual, terpisah dari cache build.

### Task: AUTH-REF-001 — Konfigurasi, schema, dan kontrak native pada package auth

- Status: Done
- Owner: Codex
- Prioritas: 1 dalam urutan eksekusi refactor.
- Referensi: AUTH-REF-US01; AUTH_REFACTOR_PLAN.md; AGENTS.md; API_DEVELOPMENT.md.
- Dependensi: Tidak ada.
- Ukuran: Satu perubahan ownership dan public entry point.

#### Ruang lingkup

Pindahkan opsi Better Auth, plugin admin, schema auth dan policy ke packages/auth; factory menerima DB/config secara eksplisit. Sediakan factory client dengan adminClient, server HTTP session reader contract, proyeksi DTO aman, dan inferensi type-only. API/web tetap hanya memiliki composition/framework adapter. Tambahkan dependency Drizzle langsung bila schema membutuhkannya, selaras versi API. Pertahankan compatibility wrapper sampai expand migration dan cutover API selesai, agar commit task tetap runnable tanpa memakai kolom plugin sebelum migrasi.

#### Peta file dan keluaran

Path bertanda baru adalah target yang dibuat saat eksekusi, bukan file yang sudah diimplementasikan.

| File atau area                                                           | Perubahan yang direncanakan                                                                         |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| `packages/auth/src/client.ts, server.ts, types.ts`                       | Tetapkan API ekspor dan factory yang terkonfigurasi; pertahankan compatibility wrapper sementara.   |
| `packages/auth/src/internal/options.ts, schema.ts, projection.ts (baru)` | Pisahkan opsi produk/plugin, schema baseline dan proyeksi murni.                                    |
| `packages/auth/package.json, bun.lock`                                   | Tambahkan Drizzle langsung jika diperlukan; versi mengikuti API dan lock diaudit.                   |
| `apps/api/src/db/schema/auth.ts, index.ts`; `modules/auth/index.ts`      | Re-export schema baseline package dengan identitas tabel/kolom tetap; consumer lama tetap runnable. |
| `packages/auth/src/*.test.ts (baru), test/fixtures/*`                    | Proof import/factory/proyeksi dan fixture konfigurasi plugin.                                       |

#### Kontrak dan batas task

- Factory menerima database yang sudah dibuat, origin publik, secret dan secureCookies; tidak menerima arbitrary callback/role override dari browser.
- Ekspor tipe AuthServer/AuthClient/SessionSnapshot memakai inferensi native/plugin. Snapshot berisi user.id/name/email/role/banned dan expiresAt UTC, tanpa token/account.
- Client factory memasang adminClient dan policy publik yang aman. Policy panjang password dipakai UI agar batas 12–128 tidak diduplikasi sebagai aturan independen.
- Reader server vanilla SDK dan reader browser memiliki kontrak hasil yang sama: snapshot atau null; error dependency bertipe; keduanya menerima cancellation tanpa menyimpan cookie pada global state.

#### Rencana implementasi terurut

- [x] **AUTH-REF-001.01 — Audit public surface.** Inventaris seluruh consumer re-export lama, helper crypto, schema dan DTO; tulis pemetaan ekspor lama ke ekspor tujuan. Tidak mengubah native API payload.
- [x] **AUTH-REF-001.02 — Pindahkan schema baseline.** Pindahkan tabel/relations tanpa mengganti SQL name/column/model mapping; API menjadi re-export. Kolom plugin ditambahkan pada AUTH-REF-002.
- [x] **AUTH-REF-001.03 — Susun factory terkonfigurasi.** Pusatkan appName/basePath/origin/CSRF/password/session/rate-limit/plugin dan mode HTTP versus operator. Mode operator hanya tersedia pada bootstrap server yang dipercaya.
- [x] **AUTH-REF-001.04 — Konfigurasi client dan tipe.** Pasang plugin pada factory client; ekspor inferensi type-only dan policy publik. Uji bahwa React SDK tidak menarik server/DB.
- [x] **AUTH-REF-001.05 — Definisikan reader/proyeksi.** Sediakan helper proyeksi allowlist dan kontrak reader HTTP native; implementasi transport/SSR lengkap dilanjutkan AUTH-REF-006.
- [x] **AUTH-REF-001.06 — Pertahankan jalur kompatibel.** Jangan mengaktifkan admin schema pada bootstrap lama. Compatibility wrapper lama tetap hanya untuk fase migrasi dan diberi lokasi penghapusan AUTH-REF-009.
- [x] **AUTH-REF-001.07 — Validasi dan dokumentasikan.** Periksa type/adapter/proyeksi dan perubahan dependency; catat ekspor sementara serta readiness migrasi, lalu commit parent task.

#### Acceptance criteria

- [x] Semua impor runtime library/plugin/adapter auth ada di package; app menggunakan @repo/auth/client atau /server dan import type /types.
- [x] Import package tidak membaca env, membuat pool atau menginisialisasi singleton session user.
- [x] Client/types tidak membawa DB, secret, atau runtime server; inferensi role/plugin dan DTO aman bekerja.
- [x] Factory server baru menerima instance DB API dan dikonfigurasi dengan plugin admin serta signup publik nonaktif; bootstrap DB lama tetap memakai compatibility wrapper hingga expand migration.
- [x] Perubahan schema ownership tidak menghapus tabel/credential atau mengubah migrasi terapan.

#### Validasi

Pemeriksaan tipe package/API/web, frozen install jika dependency/script berubah, adapter/type proof dan bundle inspection. Runtime database plugin dibuktikan setelah migrasi AUTH-REF-002.

**Matriks skenario:**

| Skenario                                       | Hasil yang harus dibuktikan                                                                     |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Import client/types tanpa env API              | Tidak ada pool/network/auth instance yang dibuat; tidak membutuhkan secret.                     |
| Proyeksi fixture memuat token/hash/IP tambahan | Output hanya field allowlist, tanggal UTC, tipe role/plugin terinferensi.                       |
| Factory dengan fake adapter/config             | Config native/plugin terbentuk tanpa membuka port/pool atau menerima override publik.           |
| Consumer lama sebelum expand migration         | API/web masih type-check dan jalur baseline tidak memakai kolom plugin baru.                    |
| Client build                                   | Runtime server/SQL/secret tidak ada pada client; enforcement deny rule diperketat AUTH-REF-006. |

**Perintah rencana dari root:**

```sh
bun run check-types
bun run lint
bun run build
bun test packages/auth/src
```

Perintah ini belum dijalankan sebagai validasi refactor. Sesudah perubahan dependency/script, jalankan `bun install --frozen-lockfile`; proof DB dijalankan serial pada database khusus test. Browser proof mengacu pada runner yang dibuktikan tersedia saat eksekusi.

#### Gerbang cutover dan commit

Factory baru dan kontrak tersedia tetapi runtime API lama belum dipindah. Jangan membuat task Ready berikutnya sebelum compatibility/type proofs lulus; jangan menyatakan plugin sudah aktif pada DB lama.

Commit setelah acceptance criteria task terpenuhi: `refactor(auth): centralize native auth configuration`. Simpan SHA, hasil command, skenario dan batas evidence pada bagian Hasil dan bukti. Checklist langkah implementasi tidak otomatis berarti acceptance criteria sudah lulus.

#### Hasil dan bukti

- Factory/plugin/policy dan schema baseline dipusatkan di @repo/auth; API masih menggunakan compatibility wrapper sampai expand/cutover. Tidak ada env/pool saat import, client memakai adminClient, types dan proyeksi DTO aman tersedia. Reader contract tersedia; transport SSR di AUTH-REF-006.
- Frozen install, check-types seluruh workspace, lint web dan build kedua app lulus. Unit package 3 test/14 assertion, API unit 21 test/38 assertion, schema proof PostgreSQL baseline 5 test/19 assertion lulus pada DB khusus lokal.
- Bundle browser tidak memuat API_INTERNAL_URL, drizzle-orm atau adapter server. Migration baseline tidak berubah; akun development tidak disentuh. Commit khusus task: refactor(auth): centralize native auth configuration.

SHA task: `b2a1e48`.

#### Blocker atau tindak lanjut

AUTH-REF-002 memperluas schema database; API handler/guard berpindah pada AUTH-REF-004.

### Task: AUTH-REF-002 — Expand migration role/plugin dan admin yang sudah ada

- Status: Done
- Owner: Codex
- Prioritas: 2 dalam urutan eksekusi refactor.
- Referensi: AUTH-REF-US01; AUTH_REFACTOR_PLAN.md; AGENTS.md; API_DEVELOPMENT.md.
- Dependensi: AUTH-REF-001.
- Ukuran: Satu migrasi eksplisit dan proof upgrade data lama.

#### Ruang lingkup

Tambahkan field plugin sesuai generator 1.7.7, backfill role admin dari admin_identity, role default user, constraint role kanonis dan unique index admin tunggal. Tabel singleton tetap tersedia sampai seluruh consumer berpindah.

#### Peta file dan keluaran

Path bertanda baru adalah target yang dibuat saat eksekusi, bukan file yang sudah diimplementasikan.

| File atau area                                                                    | Perubahan yang direncanakan                                                                         |
| --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `packages/auth/src/internal/schema.ts`                                            | Tambahkan field admin plugin serta constraint role kanonis/admin tunggal.                           |
| `packages/auth/test/fixtures/auth-schema.config.ts`                               | Konfigurasi generator sesuai factory/plugin native, tidak membuat HTTP server.                      |
| `apps/api/drizzle/* (migration SQL dan meta baru)`                                | Expand migration additive, backfill role dari singleton; nomor berikutnya mengikuti journal aktual. |
| `apps/api/test/integration/auth-schema-proof.test.ts`; `auth-admin-proof.test.ts` | Proof upgrade akun/constraint/plugin, tetap menggunakan database test yang dilindungi.              |
| `apps/api/src/db/schema/auth.ts, index.ts`; `docs/ENVIRONMENT.md`                 | Pastikan agregator schema dan runbook menunjukkan kapan migration harus diterapkan.                 |

#### Kontrak dan batas task

- Input migrasi adalah schema lama berisi user/account/session/admin_identity. Output adalah schema tambahan kompatibel plugin; singleton tetap tersedia.
- role memiliki default user dan nilai kanonis user/admin. Unique index role admin menolak admin kedua; tidak membuka jalur adminUserIds/multirole.
- Backfill menggunakan userId dari singleton, bukan email khusus atau credential hardcoded. Tidak melakukan hashing/reset/seed saat migrasi.

#### Rencana implementasi terurut

- [x] **AUTH-REF-002.01 — Generate schema pembanding.** Jalankan CLI/generator 1.7.7 ke output sementara; bandingkan field/default/nullability/SQL mapping. Jangan menimpa schema produksi dengan hasil generator mentah.
- [x] **AUTH-REF-002.02 — Perluas schema package.** Tambahkan role/banned/banReason/banExpires/impersonatedBy sesuai declaration, dengan mapping yang menjaga tabel lama.
- [x] **AUTH-REF-002.03 — Tuliskan expand migration.** Urutkan penambahan kolom -> validasi data -> backfill -> constraint/index. Migration metadata dibuat dari tooling yang sudah dipakai repo, bukan pengeditan journal sembarang.
- [x] **AUTH-REF-002.04 — Siapkan fixture upgrade.** Pada DB test khusus, terapkan migration baseline saja dan masukkan admin/credential/session lama; ambil fingerprint ID/email/hash secara in-memory.
- [x] **AUTH-REF-002.05 — Buktikan upgrade.** Terapkan expand migration; bandingkan fingerprint dan lakukan login melalui factory native. Pastikan sesi/credential tidak terhapus.
- [x] **AUTH-REF-002.06 — Uji invariant dan rollback operasional.** Uji concurrent native createUser/admin CLI equivalent dan role gabungan/invalid. Simpan tabel lama untuk rollback aplikasi sebelum contract; jangan membuat down migration destruktif otomatis.
- [x] **AUTH-REF-002.07 — Catat langkah penerapan.** Dokumentasikan backup/preflight dan kewajiban expand sebelum cutover API. Validasi tidak menjalankan migration pada DB development secara otomatis.

#### Acceptance criteria

- [x] ID/email/hash/account admin lama dipertahankan dan native login tetap berhasil.
- [x] Field role/banned/banReason/banExpires/impersonatedBy kompatibel dengan plugin.
- [x] Admin kedua ditolak termasuk dua operasi concurrent; role gabungan tidak melewati invariant.
- [x] Data invalid menghentikan migrasi, tanpa reset schema development atau penghapusan akun diam-diam.
- [x] Migrasi baru tidak mengubah migration file yang sudah diterapkan; singleton lama belum dihapus.

#### Validasi

Proof serial pada DB test khusus: upgrade schema lama berisi akun/session, login admin lama, penolakan role/admin kedua termasuk konkurensi, serta kompatibilitas schema native.

**Matriks skenario:**

| Skenario                                                     | Hasil yang harus dibuktikan                                                          |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| Baseline account -> expand -> login native                   | ID/email/hash tidak berubah; login password lama berhasil.                           |
| Dua create-admin concurrent                                  | Hanya satu admin persisted; kegagalan kedua jelas tanpa account orphan.              |
| Role admin,user/unknown melalui native path atau SQL fixture | Constraint menolak; tidak melewati invariant.                                        |
| Data singleton tidak konsisten                               | Migrasi gagal terkontrol; tidak mengganti admin pilihan sendiri.                     |
| Schema check/plugin operations pada DB hasil migrasi         | Field/default/mapping dan journal compatible; baseline migration file tetap identik. |

**Perintah rencana dari root:**

```sh
bun run --cwd apps/api auth:schema:proof
bun run --cwd apps/api auth:admin:proof
bun run --cwd apps/api auth:adapter:proof
bun run check-types
```

Perintah ini belum dijalankan sebagai validasi refactor. Sesudah perubahan dependency/script, jalankan `bun install --frozen-lockfile`; proof DB dijalankan serial pada database khusus test. Browser proof mengacu pada runner yang dibuktikan tersedia saat eksekusi.

#### Gerbang cutover dan commit

Migration dan proof additive selesai di DB test. Penerapan DB development/deployment adalah langkah terpisah yang dicatat; API native tidak dinyalakan sebelum DB target melewati expand.

Commit setelah acceptance criteria task terpenuhi: `feat(auth): migrate native admin roles`. Simpan SHA, hasil command, skenario dan batas evidence pada bagian Hasil dan bukti. Checklist langkah implementasi tidak otomatis berarti acceptance criteria sudah lulus.

#### Hasil dan bukti

- CLI Better Auth 1.7.7 generate ke /tmp menghasilkan field role/banned/banReason/banExpires/impersonatedBy dengan mapping snake_case yang sesuai. Drizzle Kit 0.31.11 menghasilkan 0001 dan metadata; ditambahkan preflight credential serta backfill dari admin_identity sebelum constraint/index. Migration 0000 tetap identik.
- Schema proof 8 test/36 assertion lulus: upgrade mempertahankan ID/email/hash/account/session, login native berhasil, hanya satu createUser concurrent menjadi admin tanpa account orphan kedua, role gabungan/unknown ditolak, data invalid menggagalkan dan me-rollback expansion. Adapter proof 2 test/16 assertion dan legacy admin regression 6 test/26 assertion lulus.
- Semua proof memakai database test lokal khusus. Database development tidak dimigrasi atau akun direset. Backup/preflight, expand sebelum cutover, serta batas rollback aplikasi dicatat dalam AUTH_REFACTOR_PLAN.md. Gate tipe dan lint dijalankan hook commit. Commit: feat(auth): migrate native admin roles.

SHA task: `55d8caf`.

#### Blocker atau tindak lanjut

Contract migration penghapusan admin_identity hanya pada AUTH-REF-009.

### Task: AUTH-REF-003 — Seed CLI resmi dan recovery native dalam maintenance

- Status: Done
- Owner: Codex
- Prioritas: 8 dalam urutan eksekusi refactor.
- Referensi: AUTH-REF-US04; AUTH_REFACTOR_PLAN.md; AGENTS.md; API_DEVELOPMENT.md.
- Dependensi: AUTH-REF-001, AUTH-REF-002, AUTH-REF-004.
- Ukuran: Composition entry operator, script seed dan wrapper recovery.

#### Ruang lingkup

Sediakan auth.ts composition entry tanpa HTTP listen; gunakan CLI auth 1.7.7 create-admin dengan password prompt. Recovery memakai requestPasswordReset/resetPassword native, callback token di memori, revokeSessionsOnPasswordReset, tanpa email/admin session. Jalankan recovery ketika semua API penerima login dihentikan; writer lama dihapus pada cleanup.

#### Peta file dan keluaran

Path bertanda baru adalah target yang dibuat saat eksekusi, bukan file yang sudah diimplementasikan.

| File atau area                                                                    | Perubahan yang direncanakan                                                            |
| --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `apps/api/src/auth.ts (baru)`                                                     | Composition entry CLI native dari factory package; tidak import index.ts/listen.       |
| `apps/api/src/modules/auth/provision-cli.ts, reset-cli.ts, cli-input.ts`          | Seed menjalankan CLI resmi; reset hanya prompt/orchestration native/memori/cleanup.    |
| `packages/auth/src/server.ts, internal/options.ts`                                | Mode operator dan native API; konfigurasi default HTTP tetap menutup operasi operator. |
| `apps/api/package.json`; `packages/auth/package.json bila diperlukan`             | Script memakai binary auth 1.7.7 lokal melalui Bun; tidak menggunakan @latest.         |
| `apps/api/test/integration/auth-admin-proof.test.ts, auth-recovery-proof.test.ts` | Proof CLI/runtime/recovery/failure/concurrency; unit operator lama disesuaikan.        |

#### Kontrak dan batas task

- Seed input: email/name dan password prompt tersembunyi; role dipatok admin untuk command aplikasi. Akun existing tidak direset oleh seed.
- Recovery input: identitas admin dan password baru melalui prompt; callback sendResetPassword menyimpan token di memori hanya pada mode operator.
- Recovery native request/reset mengaktifkan revokeSessionsOnPasswordReset. Pengembalian sukses tidak mencetak token/password/cookie; failure memakai exit code nonzero dan pesan aman.
- Precondition maintenance: seluruh instance API penerima login berhenti. Wrapper tidak mematikan proses sembarang dan health check satu origin tidak membuktikan seluruh instance sudah berhenti.

#### Rencana implementasi terurut

- [x] **AUTH-REF-003.01 — Sediakan config entry CLI.** Buat auth.ts yang membaca env API tervalidasi dan membuat DB/factory tanpa listen; buktikan loader CLI menemukan config dan plugin.
- [x] **AUTH-REF-003.02 — Alihkan command seed.** Resolve binary workspace yang terpasang; jalankan create-admin dengan email/name/role/config yang eksplisit tanpa password flag. Pertahankan wrapper hanya untuk cwd/prompt/resource orchestration.
- [x] **AUTH-REF-003.03 — Bangun mode recovery.** Callback token hanya pada instance operator; jalankan requestPasswordReset lalu resetPassword native. Bersihkan reference token/password saat selesai dan close pool dalam finally.
- [x] **AUTH-REF-003.04 — Tuliskan maintenance preflight.** Operator memastikan semua penerima login berhenti; catat maintenance confirmation pada runbook/flow command. Jangan menganggap app advisory lock lama melindungi native login.
- [x] **AUTH-REF-003.05 — Buktikan hasil native.** Di DB test, gunakan cookie sesi lama untuk memastikan denial, password lama gagal/new password berhasil, expiry/replay reset gagal; public HTTP reset tetap tertutup.
- [x] **AUTH-REF-003.06 — Tangani failure parsial.** Uji gagal update password/gagal revoke; command tidak memberi sukses atau membuka API. Runbook menyediakan pengulangan reset native/pencabutan native yang didukung versi sebelum restart, tanpa SQL writer.
- [x] **AUTH-REF-003.07 — Reproduksi race dan commit.** Jalankan controlled concurrent-login proof untuk mencatat batas upstream; uji maintenance menghilangkan race. Writer lama belum dihapus sampai AUTH-REF-009.

#### Acceptance criteria

- [x] CLI resmi menemukan config/env dan menghasilkan admin yang bisa login; existing admin tidak dibuat ulang.
- [x] Password/token tidak tercetak atau berada dalam argumen/source; wrapper menutup resource miliknya.
- [x] Recovery berhasil tanpa email/session admin; token expired/replay ditolak native.
- [x] Password lama dan session lama ditolak setelah recovery maintenance dan restart.
- [x] Failure parsial dicatat; API dibuka kembali hanya setelah pencabutan session terverifikasi.
- [x] Race login-vs-reset dari review diuji dan batas native dicatat; tidak mengklaim reset online atomic.
- [x] Endpoint operator tetap tertutup pada public HTTP.

#### Validasi

DB test khusus: native seed/reset, expiry/replay, pencabutan, failure injection, maintenance/restart dan reproduksi concurrency upstream. Verifikasi command Bun/config/prompt tanpa password flag.

**Matriks skenario:**

| Skenario                                                | Hasil yang harus dibuktikan                                                           |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| CLI pada database kosong/migrated                       | Satu admin native tercipta dan dapat login; stderr/stdout tidak membocorkan password. |
| CLI kedua pada existing admin, termasuk concurrent      | Admin kedua ditolak constraint; admin existing tidak diubah.                          |
| Request/reset tanpa email/admin session                 | Callback memori berjalan; reset selesai; API route operator tetap ditutup.            |
| Token expired/replay dan failure parsial                | Native denial/exit nonzero; tidak melaporkan sukses; resource closed.                 |
| Sesi lama/password lama setelah reset maintenance       | Ditolak; new password valid; pengujian tidak memakai credential admin development.    |
| Login lama dipause saat reset online versus maintenance | Hasil race dicatat apa adanya; hanya maintenance menjadi jaminan MVP.                 |

**Perintah rencana dari root:**

```sh
bun run --cwd apps/api auth:admin:proof
bun run --cwd apps/api auth:recovery:proof
bun run --cwd apps/api auth:runtime:proof
bun run check-types
```

Perintah ini belum dijalankan sebagai validasi refactor. Sesudah perubahan dependency/script, jalankan `bun install --frozen-lockfile`; proof DB dijalankan serial pada database khusus test. Browser proof mengacu pada runner yang dibuktikan tersedia saat eksekusi.

#### Gerbang cutover dan commit

Seed/recovery selesai setelah proof native dan maintenance lulus. Jika failure native belum punya langkah pemulihan yang terbukti, task belum Done. Tidak menjalankan seed/reset terhadap akun development pada task ini tanpa instruksi eksekusi khusus.

Commit setelah acceptance criteria task terpenuhi: `refactor(auth): provision and recover admins natively`. Simpan SHA, hasil command, skenario dan batas evidence pada bagian Hasil dan bukti. Checklist langkah implementasi tidak otomatis berarti acceptance criteria sudah lulus.

#### Hasil dan bukti

CLI resmi auth 1.7.7 memuat apps/api/src/auth.ts tanpa HTTP listen; prompt native diuji dengan Bun PTY, tanpa password flag atau credential development. Admin proof: 4 pass/18 assertions; recovery proof: 8 pass/46 assertions; runtime: 8 pass/44 assertions; package: 3 pass/14 assertions; check-types lulus. Proof mencakup seed kedua/concurrent, min password, expiry/replay, endpoint HTTP operator tertutup, update/revoke parsial dan exit nonzero aman, native retry, orphan credential repair, serta race login/reset online. Runbook AUTH_OPERATIONS.md mewajibkan seluruh penerima login dan request in-flight berhenti. Database development/credential existing tidak diubah. Commit: feat(auth): use native admin provisioning and recovery.

SHA task: `09cfe99`.

#### Blocker atau tindak lanjut

Reset online tanpa downtime merupakan keputusan/proof terpisah apabila native race belum teratasi; cleanup writer pada AUTH-REF-009.

### Task: AUTH-REF-004 — Session native, cookie cache, dan guard API authoritative

- Status: Done
- Owner: Codex
- Prioritas: 3 dalam urutan eksekusi refactor.
- Referensi: AUTH-REF-US02; AUTH_REFACTOR_PLAN.md; AGENTS.md; API_DEVELOPMENT.md.
- Dependensi: AUTH-REF-001, AUTH-REF-002.
- Ukuran: Cutover handler/policy API dengan proof authorization.

#### Ruang lingkup

Bootstrap memakai factory package dan satu pool API. Handler native mengikuti allowlist package. Aktifkan cookie cache pendek untuk snapshot UI; macro Elysia privat memanggil auth.api.getSession dengan disableCookieCache:true dan mengecek role/banned sebelum service.

#### Peta file dan keluaran

Path bertanda baru adalah target yang dibuat saat eksekusi, bukan file yang sudah diimplementasikan.

| File atau area                                                                           | Perubahan yang direncanakan                                                        |
| ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `apps/api/src/index.ts, modules/auth/index.ts`                                           | Bootstrap factory package, hapus perakitan config/hook singleton dari jalur aktif. |
| `apps/api/src/modules/auth/admin/guard.ts, index.ts, model.ts`                           | Adapter Elysia ke principal/role native; DTO legacy sementara tetap kompatibel.    |
| `apps/api/src/app.ts`; `packages/auth/src/server.ts, internal/options.ts`                | Handler raw native dan allowlist package; scope private guard dan cookie cache.    |
| `apps/api/src/app.test.ts`; `modules/auth/admin/guard.test.ts (baru bila dibutuhkan)`    | HTTP authorization dengan injected dependency/spies tanpa membuka port.            |
| `apps/api/test/integration/auth-runtime-proof.test.ts, auth-authorization-proof.test.ts` | Session/cookie cache terhadap revocation dan role/banned DB terkini.               |

#### Kontrak dan batas task

- Guard menerima dependency auth native dan mengembalikan principal aman atau respons 401/403/503; tidak menerima isAdminUser yang membaca singleton SQL.
- Setiap endpoint privat menggunakan getSession(headers, disableCookieCache:true); expiry/role/banned diperiksa sebelum service.
- Cookie cache enabled/maxAge60/refreshCachefalse hanya untuk snapshot UI. fixed session24h, password policy, CSRF/origin/rate limit tidak berubah.
- GET /admin/session sementara tetap memberi DTO lama kepada web baseline, namun mendapatkan identitas dari guard native yang sama.

#### Rencana implementasi terurut

- [x] **AUTH-REF-004.01 — Pastikan expand terpasang pada target test.** Preflight schema plugin sebelum bootstrap native; jangan melakukan migrate otomatis ketika request masuk.
- [x] **AUTH-REF-004.02 — Alihkan bootstrap.** Buat DB/factory sekali, injeksikan instance ke handler/guard/OpenAPI; pertahankan onStop menutup resource.
- [x] **AUTH-REF-004.03 — Pasang handler.** API raw request diteruskan ke auth.handler hanya pada path/method yang diizinkan. Payload/status/cookie SDK tidak dibungkus ulang.
- [x] **AUTH-REF-004.04 — Ubah macro requireAdmin.** Named plugin dan resolve memakai session authoritative; hasil role/banned normalisasi native dijadikan principal aman. Gunakan chaining dan scope private.
- [x] **AUTH-REF-004.05 — Pertahankan adapter legacy.** Jangan menghapus /admin/session sebelum web berpindah; adapter safe DTO tidak menjadi sumber auth baru dan tidak memakai admin_identity.
- [x] **AUTH-REF-004.06 — Buktikan penolakan.** Uji missing/expired/revoked/non-admin/banned/DB outage dan private fixture service spy. Semua public route tetap bebas auth.
- [x] **AUTH-REF-004.07 — Uji cache berbeda dengan izin.** Pertahankan cookie cache fresh, ubah/revoke state melalui native operasi/fixture yang tepat, lalu buktikan API privat menolak. Catat observed DB/session behavior.

#### Acceptance criteria

- [x] Pool DB/auth instance dibuat sekali per proses API dan pool ditutup onStop.
- [x] Guard tidak lagi bergantung pada lookup admin_identity; role native menjadi sumber kebenaran.
- [x] 401 untuk missing/expired/revoked; 403 untuk session valid dengan role salah/banned; dependency failure menjadi 503.
- [x] Cookie cache yang masih fresh tidak membuat session revoked/role berubah/banned lolos endpoint privat.
- [x] Hook/plugin scope dan registration order benar; route publik tetap dapat diakses.
- [x] Service privat tidak terpanggil pada denial; native error/cookie contract dipertahankan.

#### Validasi

Bun unit app.handle tanpa port, PostgreSQL native session/authorization proofs dan cache-cookie-versus-DB test. Type-only API contract tetap inferred.

**Matriks skenario:**

| Skenario                                       | Hasil yang harus dibuktikan                                              |
| ---------------------------------------------- | ------------------------------------------------------------------------ |
| Anonymous/expired/revoked -> private fixture   | 401 dan service spy nol.                                                 |
| Valid user non-admin/banned -> private fixture | 403 atau native invalid-session401 bila sesi sudah dicabut; service nol. |
| DB/adapter error                               | 503 aman tanpa stack/SQL; tidak memberi principal.                       |
| Fresh cached cookie + revoke/role change       | Authoritative private endpoint tetap menolak.                            |
| Public GET / ketika auth down                  | Tetap dapat diakses; hook private tidak bocor.                           |
| Lifecycle pool                                 | Factory/pool satu per bootstrap; onStop close sekali.                    |

**Perintah rencana dari root:**

```sh
bun run --cwd apps/api test
bun run --cwd apps/api auth:runtime:proof
bun run --cwd apps/api auth:authorization:proof
bun run check-types
bun run build --filter=api
```

Perintah ini belum dijalankan sebagai validasi refactor. Sesudah perubahan dependency/script, jalankan `bun install --frozen-lockfile`; proof DB dijalankan serial pada database khusus test. Browser proof mengacu pada runner yang dibuktikan tersedia saat eksekusi.

#### Gerbang cutover dan commit

Role native menjadi sumber guard API, sementara jalur UI lama masih runnable. Perilaku HTTP operator tertutup dan revocation authoritative harus lulus sebelum web mengandalkan snapshot native.

Commit setelah acceptance criteria task terpenuhi: `refactor(api): authorize admins with native sessions`. Simpan SHA, hasil command, skenario dan batas evidence pada bagian Hasil dan bukti. Checklist langkah implementasi tidak otomatis berarti acceptance criteria sudah lulus.

#### Hasil dan bukti

- Bootstrap API kini membuat satu pool Bun SQL/Drizzle dan satu factory package; instance yang sama dipakai handler, guard, generator OpenAPI, dengan close onStop. Guard menerima native getSession dan selalu meminta disableCookieCache:true; role/banned/expiry diperiksa sebelum service. /admin/session masih adapter DTO sementara untuk web lama.
- Unit API 27 test/66 assertion lulus termasuk service spy pada missing/expired/user/banned/outage dan route publik. PostgreSQL runtime 8 test/44 assertion, authorization 5 test/36 assertion serta OpenAPI 2 test/61 assertion lulus. Proof menyimpan cookie cache fresh dan membuktikan role berubah/banned/revoked tetap ditolak API privat.
- Origin eksplisit diperiksa melalui middleware native package: proof menemukan native menerima login non-browser dengan foreign Origin tanpa Fetch Metadata; rule one-origin tetap ditegakkan. Native session bagi non-admin tidak memberi akses admin. Compatibility provisioning lama sementara mengisi role admin sampai CLI cutover.
- API build lulus; hook commit memvalidasi tipe/lint. Database development belum mendapat expand migration. Commit: refactor(api): authorize admins with native sessions.

SHA task: `2280906`.

#### Blocker atau tindak lanjut

Endpoint legacy /admin/session dipertahankan sementara sampai consumer web berpindah; dihapus AUTH-REF-009.

### Task: AUTH-REF-005 — Gateway native, callback publik, cookie, dan deadline

- Status: Done
- Owner: Codex
- Prioritas: 4 dalam urutan eksekusi refactor.
- Referensi: AUTH-REF-US02; AUTH_REFACTOR_PLAN.md; AGENTS.md; API_DEVELOPMENT.md.
- Dependensi: AUTH-REF-004.
- Ukuran: Satu perbaikan transport dan proof dev/production runtime.

#### Ruang lingkup

Selaraskan fixed upstream/allowlist/path-method dari package, public origin callback, raw SDK contract, multiple Set-Cookie, deadline/cancellation dan manual redirect. Transport tidak melakukan validasi token atau mengubah auth response menjadi envelope baru.

#### Peta file dan keluaran

Path bertanda baru adalah target yang dibuat saat eksekusi, bukan file yang sudah diimplementasikan.

| File atau area                                                 | Perubahan yang direncanakan                                                                   |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `apps/web/src/lib/server/auth-gateway.ts`                      | Forwarding/deadline/callback sesuai origin publik yang dikonfigurasi.                         |
| `apps/web/src/routes/api/auth/$.ts`                            | Handler gateway native; route legacy admin/session belum dihapus.                             |
| `packages/auth/src/server.ts dan internal policy transport`    | Kebijakan path/method/origin yang aman diekspor lewat server entry, tanpa membocorkan secret. |
| `apps/web/test/auth-gateway.test.ts, auth-gateway-smoke.mjs`   | Tambah regression public callback, multi cookie, deadline/cancel.                             |
| `apps/web/.env.example`; `docs/ENVIRONMENT.md jika diperlukan` | Jelaskan sumber public origin yang sama dengan API; internal URL tetap server-only.           |

#### Kontrak dan batas task

- Browser /api/auth/* -> API_INTERNAL_URL/api/auth/*, mempertahankan query/method/body/status yang diizinkan. Origin target tidak berasal dari Host atau input browser.
- Public origin harus berasal dari configured origin tervalidasi yang konsisten dengan API, memakai konfigurasi yang sudah ada bila cukup; bukan arbitrary forwarded header.
- Location origin relatif/public/internal yang diperbolehkan direwrite aman ke same-origin path; external origin ditolak tanpa follow request atau forwarding cookie.
- Gateway errors tetap error transport dengan status/code aman; native upstream response tetap kontrak SDK. Semua output auth private/no-store.

#### Rencana implementasi terurut

- [x] **AUTH-REF-005.01 — Tetapkan konfigurasi origin.** Resolve fixed internal dan configured public origin secara server-only; validasi scheme/no userinfo/path. Pastikan runtime Nitro menerima konfigurasi yang diperlukan.
- [x] **AUTH-REF-005.02 — Pusatkan operation policy.** Gunakan allowlist package untuk path/method; pertahankan limit body dan header allowlist; jangan membaca cookie/token untuk menentukan izin.
- [x] **AUTH-REF-005.03 — Benarkan redirect/callback.** Terima public callback valid yang sebelumnya gagal; rewrite Location ke path lokal dan tolak origin asing, termasuk redirect credentials.
- [x] **AUTH-REF-005.04 — Teruskan respons native.** Raw status/body/retry headers dan semua Set-Cookie dipertahankan; forced private/no-store termasuk denial/config error.
- [x] **AUTH-REF-005.05 — Selaraskan abort/deadline.** Gabungkan request abort dan batas10s; timer/listener dibersihkan dalam finally; jangan swallow abort menjadi login failure.
- [x] **AUTH-REF-005.06 — Uji portless transport.** Fixture mock upstream memeriksa tidak ada follow request ke foreign origin, cookie tepat, dan deadline override pendek pada test.
- [x] **AUTH-REF-005.07 — Buktikan kedua runtime.** Smoke Vite dan hasil build Bun/Nitro; catat public origin/internal path dan cookie properties tanpa nilai credential.

#### Acceptance criteria

- [x] Callback absolut pada origin publik yang dikonfigurasi mempertahankan respons/cookie; origin asing ditolak.
- [x] API_INTERNAL_URL adalah fixed target server, tidak menjadi callback publik atau input browser.
- [x] Semua Set-Cookie diteruskan tanpa digabung/rusak; cache-control private/no-store benar.
- [x] Upstream stalled berhenti dalam deadline 10 detik dengan error unavailable; cancellation dibedakan.
- [x] Redirect tidak mengirim cookie ke origin asing; path/method operator ditutup.
- [x] Gateway berjalan pada Vite dan hasil build Bun/Nitro.

#### Validasi

Bun gateway unit/proof dan HTTP smoke dev serta production build: callback, foreign origin, multi-cookie, deadline/abort/path/method/redirect.

**Matriks skenario:**

| Skenario                                             | Hasil yang harus dibuktikan                                              |
| ---------------------------------------------------- | ------------------------------------------------------------------------ |
| Native login callback http://localhost:3000/admin    | Gateway sukses; Location/cookie sesuai public origin.                    |
| Absolute external/protocol-relative foreign Location | Ditolak; cookie tidak dikirim ke target; fetch spy hanya fixed upstream. |
| Dua Set-Cookie termasuk comma pada Expires           | Dua header utuh dan attributes tetap.                                    |
| API_INTERNAL_URL kosong/invalid dan upstream stalled | 503/unavailable atau timeout transport terdefinisi; tidak menggantung.   |
| Request abort/path traversal/method operator         | Cancellation/denial sesuai; tidak forward operasi terlarang.             |
| Vite versus Bun/Nitro smoke                          | Body/status/cache-control/multiple cookies konsisten.                    |

**Perintah rencana dari root:**

```sh
bun run --cwd apps/web auth:gateway:proof
bun run build --filter=web
bun run --cwd apps/web auth:gateway:smoke
bun run check-types
```

Perintah ini belum dijalankan sebagai validasi refactor. Sesudah perubahan dependency/script, jalankan `bun install --frozen-lockfile`; proof DB dijalankan serial pada database khusus test. Browser proof mengacu pada runner yang dibuktikan tersedia saat eksekusi.

#### Gerbang cutover dan commit

Gateway native benar pada kedua runtime; SSR reader belum dipindah. Parameter timeout singkat test dibedakan dari timeout10s production.

Commit setelah acceptance criteria task terpenuhi: `fix(auth): preserve native gateway cookies and callbacks`. Simpan SHA, hasil command, skenario dan batas evidence pada bagian Hasil dan bukti. Checklist langkah implementasi tidak otomatis berarti acceptance criteria sudah lulus.

#### Hasil dan bukti

- Gateway memakai operation policy package, fixed internal origin dan configured public origin. Callback public/internal direwrite ke path relatif; origin asing/userinfo ditolak, cookie tidak di-forward ke redirect asing. Multiple Set-Cookie/raw body/status/retry headers dipertahankan dengan private,no-store.
- Deadline 10s mencakup request dan response body; body auth dibatasi 1 MiB. Cancellation mengembalikan transport 499 terpisah dari timeout 504/unavailable 503. Timer/listener dibersihkan. Operator path serta metode yang salah ditutup.
- Gateway proof 10 test/44 assertion lulus termasuk callback publik yang sebelumnya 502, multiple cookie, wrong method/operator, stalled headers/body dan cancellation. Smoke Vite dev dan built Bun/Nitro lulus: raw status201, POST/logout, query/body/cookie/Origin, callback /admin dan dua Set-Cookie utuh.
- Web build dan workspace check-types lulus. ENVIRONMENT/Turbo start meneruskan VITE_API_URL sebagai origin publik server, selaras konfigurasi API. Browser runner Windows Chromium berhasil diinisialisasi untuk task selanjutnya. Commit: fix(auth): preserve native gateway cookies and callbacks.

SHA task: `a034faf`.

#### Blocker atau tindak lanjut

Reader SSR AUTH-REF-006 memakai prinsip transport/deadline yang sama; OpenAPI/runbook final pada AUTH-REF-010.

### Task: AUTH-REF-006 — Reader session isomorphic dan SSR aman

- Status: Done
- Owner: Codex
- Prioritas: 5 dalam urutan eksekusi refactor.
- Referensi: AUTH-REF-US02; AUTH_REFACTOR_PLAN.md; AGENTS.md; API_DEVELOPMENT.md.
- Dependensi: AUTH-REF-001, AUTH-REF-004, AUTH-REF-005.
- Ukuran: Cutover session transport SSR/browser dan boundary serialization.

#### Ruang lingkup

Gunakan createIsomorphicFn; browser membaca SDK dari entry client, SSR memakai server-only request-scoped reader dari entry server. Reader HTTP server memakai vanilla native SDK tanpa pool/secret. SSR bypass cookie cache, forward cookie request dan Set-Cookie, deadline, klasifikasi null vs outage, dan DTO aman.

#### Peta file dan keluaran

Path bertanda baru adalah target yang dibuat saat eksekusi, bukan file yang sudah diimplementasikan.

| File atau area                                                                        | Perubahan yang direncanakan                                                                    |
| ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `packages/auth/src/internal/server-session.ts, projection.ts`; `server.ts, client.ts` | Implementasi pembaca HTTP vanilla/browser SDK dan output snapshot aman.                        |
| `apps/web/src/lib/auth/client.ts, session.ts, session.server.ts (baru)`               | Composition SDK, selector isomorphic dan adapter request-scoped TanStack.                      |
| `apps/web/vite.config.ts`                                                             | Import protection client terhadap @repo/auth/server, dengan server branch terhapus saat build. |
| `apps/web/test/auth-session.test.ts`; `auth-gateway-smoke.mjs`                        | Native fixtures, SSR cookie/error/deadline dan dua request berbeda.                            |
| `apps/web/src/lib/auth/api-client.ts`                                                 | Session reader berhenti bergantung Eden; business client tetap dipertahankan hingga cleanup.   |

#### Kontrak dan batas task

- readSession({signal}) -> SessionSnapshot|null atau AuthDependencyError; SDK error dibedakan dari sukses null. Cookie/origin tidak menjadi input browser/serverFn.
- Cabang SSR mengambil request cookie dan fixed API internal URL, get-session disableCookieCache:true, cache no-store, deadline10s.
- Cabang browser memakai instance authClient public origin dan credentials include; proyeksi field allowlist dilakukan sebelum Query/serialization.
- Response Set-Cookie diteruskan lewat API header TanStack per request. Semua reader state terisolasi; tidak memakai singleton cookie/DTO.

#### Rencana implementasi terurut

- [x] **AUTH-REF-006.01 — Implementasikan reader package.** SDK vanilla untuk server dan SDK React client untuk browser; centralize proyeksi/typed error. Jangan memakai customSession yang mengubah DB outage menjadi null.
- [x] **AUTH-REF-006.02 — Buat adapter server-only.** Ambil getRequest saat pemanggilan, runtime internal URL, signal request; kombinasikan signal dan deadline. Tidak membaca env/cookie pada module scope.
- [x] **AUTH-REF-006.03 — Forward headers secara eksplisit.** Ambil multi Set-Cookie respons SDK melalui surface fetch yang didukung versi; append pada respons TanStack yang sama dan pasang private/no-store.
- [x] **AUTH-REF-006.04 — Gunakan createIsomorphicFn.** Cabang server memanggil utility server-only request-scoped; cabang client SDK. Bila RPC dipilih, gunakan serverFn handler; browser tidak menserialisasikan AbortSignal/cookie/origin sebagai payload.
- [x] **AUTH-REF-006.05 — Selaraskan state caller.** Map snapshot/null/error secara konsisten agar API outage tidak diperlakukan sebagai logout; cancelled request tidak ditulis sebagai query sukses.
- [x] **AUTH-REF-006.06 — Enforce import boundary.** Specifier @repo/auth/server ditolak pada client; public types type-only. Negative build fixture sementara harus gagal lalu dibersihkan; build normal lulus.
- [x] **AUTH-REF-006.07 — Buktikan SSR.** Admin direct link/refresh/null/non-admin/outage, request isolation, cookie output, deadline dan safe HTML projection; Query tuning dilakukan AUTH-REF-007.

#### Acceptance criteria

- [x] SSR/browser membaca native get-session; Eden /admin/session bukan sumber baru.
- [x] SSR memakai cookie request saat ini, fixed internal origin dan authoritative read; tidak ada shared cookie/session state.
- [x] Browser tidak dapat menyuplai cookie/origin target server; server runtime/config tidak masuk client bundle.
- [x] DTO Query/HTML tidak mengandung token/hash/account/IP/secret; UTC expiresAt konsisten.
- [x] Session kosong tetap anonymous, 5xx/network/deadline tetap unavailable; tidak memakai customSession yang menyamarkan error.
- [x] Set-Cookie upstream diteruskan dan SSR stalled selesai dalam deadline; request abort tetap cancellation.

#### Validasi

Reader/transport proof, build import-deny rule untuk @repo/auth/server, bundle scan dengan sentinel secret nonproduksi, SSR HTTP anonymous/admin/non-admin/outage serta dua request terisolasi.

**Matriks skenario:**

| Skenario                                             | Hasil yang harus dibuktikan                                                         |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------- |
| SDK success snapshot/null dan SDK 5xx/network error  | Snapshot atau anonymous tepat; outage throw typed error.                            |
| Request A admin, B anonymous/concurrent user lain    | Cookie/principal/Set-Cookie tidak silang antar response.                            |
| Set-Cookie cookie-cache response                     | Semua cookie diteruskan pada SSR web response.                                      |
| Native response memuat token/IP/account-like fixture | Tidak ada field rahasia pada output reader atau HTML.                               |
| Upstream stall versus incoming abort                 | Deadline terbatas; cancellation berbeda dari availability failure.                  |
| Illegal server import dan clean build                | Negative fixture fails; browser assets tidak mengandung runtime DB/server/sentinel. |

**Perintah rencana dari root:**

```sh
bun run --cwd apps/web auth:session:proof
bun run --cwd apps/web auth:gateway:proof
bun run check-types
bun run build
```

Perintah ini belum dijalankan sebagai validasi refactor. Sesudah perubahan dependency/script, jalankan `bun install --frozen-lockfile`; proof DB dijalankan serial pada database khusus test. Browser proof mengacu pada runner yang dibuktikan tersedia saat eksekusi.

#### Gerbang cutover dan commit

Kedua cabang native menghasilkan kontrak aman/error konsisten. Server-only/request isolation dan cookie forwarding wajib lulus sebelum hydration/cache tuning.

Commit setelah acceptance criteria task terpenuhi: `refactor(web): read native sessions isomorphically`. Simpan SHA, hasil command, skenario dan batas evidence pada bagian Hasil dan bukti. Checklist langkah implementasi tidak otomatis berarti acceptance criteria sudah lulus.

#### Hasil dan bukti

- Package server memakai vanilla SDK request-scoped ke fixed /api/auth/get-session?disableCookieCache=true; browser memakai React SDK getSession melalui entry client. createIsomorphicFn memilih server-only helper versus browser tanpa RPC input cookie/origin. SDK result diproyeksi sebelum Query/serialization; outage throw AuthDependencyError, cancellation dipertahankan.
- SSR mengambil cookie saat request, menggabungkan request/query cancellation dan deadline10s, append setiap Set-Cookie ke response TanStack, dan private/no-store. Tidak membuka pool atau memakai secret API di web. Compatibility UI facade sementara sampai task Query/guard.
- Native reader proof 4 test/28 assertion lulus: dua cookie paralel terisolasi, fixed endpoint/authoritative flag, semua cookie output, native browser credentials, whitelist DTO, null/5xx/network/deadline/abort dan QueryClient isolation.
- Negative build fixture menolak @repo/auth/server lalu memulihkan file; clean build lulus. Built SSR smoke admin/anonymous/user/outage/stall lulus, multi Set-Cookie dan no-store utuh, token/IP/hash fixture tidak muncul di HTML. Import protection specifier eksplisit aktif. Gate tipe/lint pada commit. Commit: refactor(web): read native sessions isomorphically.

SHA task: `3664ee4`.

#### Blocker atau tindak lanjut

AUTH-REF-007 menyatukan hydration dan cache; browser UI guard pada AUTH-REF-008.

### Task: AUTH-REF-007 — TanStack Query sebagai cache snapshot auth tunggal

- Status: Done
- Owner: Codex
- Prioritas: 6 dalam urutan eksekusi refactor.
- Referensi: AUTH-REF-US03; AUTH_REFACTOR_PLAN.md; AGENTS.md; API_DEVELOPMENT.md.
- Dependensi: AUTH-REF-006.
- Ukuran: Satu query options/observer/cache integration dan network proof.

#### Ruang lingkup

Satu key/options untuk guard dan UI, queryClient.query dengan staleTime 60 detik, gcTime 5 menit, dan retry false; QueryClient per router/SSR request serta SSR hydration integration. Layout observer focus/reconnect/poll visible-online serta expiry. Tidak memasang native useSession reader kedua.

#### Peta file dan keluaran

Path bertanda baru adalah target yang dibuat saat eksekusi, bukan file yang sudah diimplementasikan.

| File atau area                                                           | Perubahan yang direncanakan                                                                   |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| `apps/web/src/lib/auth/session.ts, session-cache.ts`                     | Satu key/options, freshness/expiry, cache lifecycle helpers.                                  |
| `apps/web/src/router.tsx, integrations/tanstack-query/root-provider.tsx` | Per-router QueryClient dan SSR integration/hydration tunggal.                                 |
| `apps/web/src/routes/admin._authenticated.tsx`                           | Hubungkan shared options/query observer; keputusan akses final pada AUTH-REF-008.             |
| `apps/web/test/session-cache.test.ts, auth-session.test.ts`              | Clock/network-count proofs dan cache isolation.                                               |
| `apps/web/test/auth-browser-smoke.* (baru bila runner tersedia)`         | Browser route/hydration/preload/focus/reconnect trace; pilihan runner diverifikasi saat task. |

#### Kontrak dan batas task

- Query key final ['auth','session']; data hanya snapshot/null; dependency error throw. Satu QueryClient per SSR/router, browser mempertahankan instance.
- staleTime60s/gcTime5m/retryfalse, effective freshUntil tidak melewati expiresAt. queryClient.query options imperative dipisah dari observer-only polling/focus options sesuai type versi.
- Polling observer60s hanya saat layout aktif/visible/online; expiry timer mengunci/revalidate ketika sesi habis. Timer/listener dibersihkan saat unmount.
- HTTP no-store tetap berlaku; cache Query hanya memory snapshot, tidak persistent localStorage/service-worker/CDN.

#### Rencana implementasi terurut

- [x] **AUTH-REF-007.01 — Pusatkan key dan options.** Semua consumer guard/UI memakai satu key/queryFn/TTL; old admin-session key hanya dihapus/invalidate pada transisi cutover.
- [x] **AUTH-REF-007.02 — Pertahankan SSR integration tunggal.** QueryClient dibuat dalam factory router/context; gunakan setupRouterSsrQueryIntegration yang sudah ada, tanpa provider/dehydrate kedua.
- [x] **AUTH-REF-007.03 — Pisahkan options imperative/observer.** Guard memanggil queryClient.query; useQuery memakai options observer dengan focus/reconnect/poll/retry terkontrol; tidak memasang useSession native reader.
- [x] **AUTH-REF-007.04 — Batasi freshness oleh expiry.** Guard mengecek expiresAt setiap akses; expiry scheduler layout memicu penguncian/query update pada waktunya, termasuk ketika halaman idle.
- [x] **AUTH-REF-007.05 — Atur revalidation aktif.** Konfigurasi visible/online supaya interval/focus tidak membuat request ganda/background polling. Navigasi fresh tidak memaksa invalidate/refetch.
- [x] **AUTH-REF-007.06 — Uji network timeline.** Dengan clock/fetch spies: SSR1, hydrate0, fresh navigation0, stale navigation1, concurrent/preload1. Pisahkan focus/poll/expiry sebagai trigger tambahan.
- [x] **AUTH-REF-007.07 — Buktikan Turbo consumer invalidation.** Inspeksi dry-run/hash; ubah source auth secara sementara lalu buktikan build consumer cache berubah. Pulihkan perubahan probe; jangan menambah build package auth hanya untuk cache.
- [x] **AUTH-REF-007.08 — Rekam browser evidence.** Gunakan runner/browser yang tersedia, tanpa instalasi tooling spekulatif. Jika belum tersedia, catat AC browser pending sehingga task belum Done.

#### Acceptance criteria

- [x] SSR QueryClient terisolasi per request; browser mempertahankan satu cache selama navigation.
- [x] Hydration fresh tidak menambah session request; N navigasi/preload fresh tanpa event lain menambah nol request.
- [x] Fetch concurrent dedup; navigasi stale menunggu satu fetch sebelum guard menentukan akses.
- [x] Focus/reconnect/poll/expiry diuji terpisah; tab background/offline tidak polling; fresh cache tidak melampaui session expiry.
- [x] Tidak ada Query auth global pada halaman publik atau observer native kedua.
- [x] Outage tidak disimpan sebagai sukses/anonymous; data lama setelah error tidak dipakai membuka dashboard.

#### Validasi

Bun cache/network behavior proof dan browser/network recording untuk SSR hydration, fresh/stale/preload/dedup, active/background tab, focus/reconnect/expiry. Perubahan source package harus menginvalidasi build consumer Turbo.

**Matriks skenario:**

| Skenario                                          | Hasil yang harus dibuktikan                                                                  |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| SSR lalu hydrate fresh                            | Total session HTTP read1, tidak ada fetch kedua.                                             |
| N navigation/preload fresh tanpa event lain       | Tambahan0; query key/observer sama.                                                          |
| Stale navigation dan beberapa consumer concurrent | Tambahan1; guard menunggu hasil sebelum akses.                                               |
| Focus/reconnect/poll visible, background/offline  | Revalidation sesuai stale policy; background/offline0.                                       |
| Expiry lebih cepat dari TTL dan idle layout       | Snapshot tidak memberi akses setelah expiresAt; observer/timer cleanup.                      |
| Fetch failure dengan cache sukses lama            | Query error tidak berubah menjadi sukses anonymous; layout dapat mengunci pada AUTH-REF-008. |

**Perintah rencana dari root:**

```sh
bun run --cwd apps/web auth:guard:proof
bun run --cwd apps/web auth:session:proof
bun run check-types
bun run build
```

Perintah ini belum dijalankan sebagai validasi refactor. Sesudah perubahan dependency/script, jalankan `bun install --frozen-lockfile`; proof DB dijalankan serial pada database khusus test. Browser proof mengacu pada runner yang dibuktikan tersedia saat eksekusi.

#### Gerbang cutover dan commit

Counts/cache expiry dan SSR isolation terbukti. Browser/network AC belum terpenuhi jika hanya unit/HTTP fixture tersedia; jangan menandai Done berdasarkan cache hit build.

Commit setelah acceptance criteria task terpenuhi: `feat(web): cache auth snapshots with tanstack query`. Simpan SHA, hasil command, skenario dan batas evidence pada bagian Hasil dan bukti. Checklist langkah implementasi tidak otomatis berarti acceptance criteria sudah lulus.

#### Hasil dan bukti

- Query auth final memakai satu key [auth,session], snapshot/null saja, staleTime60s dibatasi expiry, gcTime5m, retryfalse. Guard memakai queryClient.query; observer hanya di protected layout, focus/reconnect stale dan interval60s visible-online. Expiry timer mengunci/mengosongkan snapshot; error dengan cached data mengunci UI.
- QueryClient tetap dibuat per router/request dan SSR integration existing dipakai satu kali. Tidak memakai native useSession observer kedua; HTTP tetap no-store, Query tidak dipersist ke storage.
- Cache proof 2 test/10 assertion serta native reader 4 test/28 assertion lulus. Chromium/Playwright Windows runner lulus terhadap Vite dengan fixture native: SSR1/hydrate0, tiga navigasi/preload fresh tambahan0, concurrent stale tambahan1, offline0, reconnect1, polling visible1, visibility hidden0, focus stale1, outage menghilangkan dashboard dari DOM, expiry idle mengunci. Clock/event/visibility dikendalikan runner; ini bukan klaim wall-clock untuk tab suspended/offline.
- Runner menunggu hydration React sebelum interaksi; percobaan navigasi terlalu dini pada clock paused diperbaiki dalam test. Browser fixtures tidak memakai credential development. File auth-browser-smoke/worker menyediakan runner dengan AUTH_BROWSER_NODE, AUTH_PLAYWRIGHT_MODULE, AUTH_BROWSER_EXECUTABLE, AUTH_BROWSER_WORKER_PATH.
- Probe Turbo dry-run sebelum/sesudah perubahan sementara source auth menunjukkan hash API c73da1e6b8c6c917 -> 8200da55bcffed0b dan web b1b97f17505bafcf -> d827efb3aeb3f1a5; source dipulihkan. Tidak perlu build package auth tambahan. Build web/check-types lulus; hook lint/type untuk commit. Commit: feat(web): cache auth snapshots with tanstack query.

SHA task: `1be8a2d`.

#### Blocker atau tindak lanjut

AUTH-REF-008 menghubungkan invalidation dengan routing/login/logout. Bukti browser pending bila runner belum tersedia.

### Task: AUTH-REF-008 — Protected admin routes dan transisi login/logout

- Status: Done
- Owner: Codex
- Prioritas: 7 dalam urutan eksekusi refactor.
- Referensi: AUTH-REF-US02, AUTH-REF-US03; AUTH_REFACTOR_PLAN.md; AGENTS.md; API_DEVELOPMENT.md.
- Dependensi: AUTH-REF-007.
- Ukuran: Integrasi pathless guard, reactive layout dan mutation transitions.

#### Ruang lingkup

beforeLoad induk menunggu Query lalu redirect/throw sebelum loader anak. Layout mengamati query yang sama. Native login/logout memperbarui Query/router, membatalkan/hapus cache privat; lintas tab bridge hanya notifikasi tanpa data personal. Denial API privat ikut invalidation.

#### Peta file dan keluaran

Path bertanda baru adalah target yang dibuat saat eksekusi, bukan file yang sudah diimplementasikan.

| File atau area                                                                                                 | Perubahan yang direncanakan                                                            |
| -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `apps/web/src/routes/admin._authenticated.tsx, admin._authenticated.index.tsx`                                 | beforeLoad denial sebelum loader anak dan observer layout reaktif.                     |
| `apps/web/src/routes/admin.login.tsx, admin._authenticated.index.tsx`; `components/auth/login-form.tsx`        | Form dan logout existing: native SDK entry client serta Query transitions.             |
| `apps/web/src/lib/auth/login.ts, session-cache.ts`                                                             | Safe redirect, UI error/policy, cancel/remove snapshot privat dan invalidation bridge. |
| `apps/web/test/admin-login.test.ts, session-cache.test.ts`; `admin-route-guard.test.ts (baru bila diperlukan)` | Guard loader spies, mutation race/outage/lintas tab.                                   |
| `apps/web/test/auth-browser-smoke.*`                                                                           | Login/logout/refresh/back/two-tab/network acceptance.                                  |

#### Kontrak dan batas task

- beforeLoad query fresh/stale -> admin principal atau redirect401/controlled403/503 error; denied tidak return context yang membiarkan child loader lanjut.
- Layout observer mengikuti Query, menutup Outlet pada null/non-admin/banned/expired/error walau cache data sukses lama masih ada.
- Mutasi login/logout native dari package; snapshots tidak dibuat dari payload login mentah. Private query prefix auth/admin dicancel/remove dan router invalidate.
- Notifikasi lintas tab hanya jenis auth-changed; tidak menyimpan role/token/credential pada channel/storage. Pesan memicu authoritative read/invalidation, bukan memberikan izin.

#### Rencana implementasi terurut

- [x] **AUTH-REF-008.01 — Ubah beforeLoad.** Gunakan queryClient.query options bersama; periksa role/banned/expiry, validasi redirect lokal, throw redirect/error sebelum loader anak. Login tetap di luar pathless guard.
- [x] **AUTH-REF-008.02 — Jadikan layout reaktif.** Observe Query yang sama; error/null/denial menutup Outlet dan cancel data privat segera. State route context lama tidak mengalahkan state observer baru.
- [x] **AUTH-REF-008.03 — Alihkan login transition.** Native signIn -> cancel/remove cache lama -> force authoritative read sekali -> navigate hanya admin valid. UI password policy berasal dari package; error401/403/429/network tetap jelas.
- [x] **AUTH-REF-008.04 — Alihkan logout transition.** Native signOut sukses -> cancel in-flight Query -> hapus data privat -> set anonymous -> invalidate/navigate. Gagal logout memberi error tanpa klaim server session dicabut.
- [x] **AUTH-REF-008.05 — Tangani private API failure.** 401 clears/redirects,403 locks/revalidates,503/network stays unavailable/retry; jangan terapkan handler pada media/public requests.
- [x] **AUTH-REF-008.06 — Tambahkan invalidation lintas tab.** Gunakan surface SDK publik bila tersedia tanpa reader kedua; bila tidak, bridge event browser tipis untuk invalidation. Cleanup subscription dan cegah ping-pong invalidation.
- [x] **AUTH-REF-008.07 — Uji denial/race.** Spies membuktikan child loader/private query tidak dimulai pada initial denial; pending response sebelum logout tidak mengisi principal kembali.
- [x] **AUTH-REF-008.08 — Rekam alur browser.** Login benar/salah/429, refresh/direct link, outage, role change, expiry idle, dua tab/back; catat request counts dan DOM/private-content absence.

#### Acceptance criteria

- [x] /admin/login di luar guard; hanya admin tidak banned/session belum expired yang masuk.
- [x] Anonymous redirect tujuan lokal aman; forbidden/outage mengunci dashboard; loader anak dan private HTML tidak muncul saat denied.
- [x] Background denial/error menutup Outlet dan cancel query privat walau Query menyimpan data sukses lama.
- [x] Login sukses membaca session authoritative sekali sebelum navigate; payload login/token tidak masuk cache.
- [x] Logout sukses menghapus cache privat dan fetch in-flight tidak mengisi snapshot admin kembali.
- [x] Logout gagal tidak diklaim telah revoke; lintas tab/back navigation tidak menampilkan data privat lama.
- [x] API401 mengarahkan login, API403 mengunci/revalidasi, outage memberi retry tanpa loop login.

#### Validasi

Guard/transition tests dengan spy loader/service, HTTP SSR statuses/HTML, browser login/logout/query-in-flight/multitab/back/expiry/outage dan network counts.

**Matriks skenario:**

| Skenario                                                | Hasil yang harus dibuktikan                                                         |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Initial anonymous/non-admin/DB outage                   | Redirect/403/503 sesuai; child loader spy0, tidak ada private HTML.                 |
| Cached admin lalu revoked/banned/expired/failed refetch | Outlet menutup; pending private queries cancel; tidak menggunakan data sukses lama. |
| Login successful native tetapi role user                | Dashboard tidak dibuka; UI denial, tidak cache token login.                         |
| Logout saat session fetch tertahan                      | Set anonymous/private erased; delayed fetch tidak memulihkan admin.                 |
| Logout network failure                                  | Error visible; tidak menjanjikan revoke sukses.                                     |
| Logout di tab A dan back/navigation tab B               | Tab B invalidates/locks; pesan hanya trigger, tidak membawa data personal.          |

**Perintah rencana dari root:**

```sh
bun run --cwd apps/web auth:login:proof
bun run --cwd apps/web auth:guard:proof
bun run --cwd apps/web auth:session:proof
bun run lint
bun run check-types
bun run build --filter=web
```

Perintah ini belum dijalankan sebagai validasi refactor. Sesudah perubahan dependency/script, jalankan `bun install --frozen-lockfile`; proof DB dijalankan serial pada database khusus test. Browser proof mengacu pada runner yang dibuktikan tersedia saat eksekusi.

#### Gerbang cutover dan commit

Admin-only guard/API tetap aman pada SSR/navigasi/revalidation. Task belum Done jika browser/lintas-tab proof yang diwajibkan belum tersedia.

Commit setelah acceptance criteria task terpenuhi: `refactor(web): enforce admin route access`. Simpan SHA, hasil command, skenario dan batas evidence pada bagian Hasil dan bukti. Checklist langkah implementasi tidak otomatis berarti acceptance criteria sudah lulus.

#### Hasil dan bukti

- beforeLoad induk memakai requireAdminSession dan throw redirect/denial/dependency error sebelum loader anak. Protected layout mengamati Query yang sama, membatalkan/hapus query admin saat denied/error, dan memberi principal live lewat React context tanpa session reader kedua. SSR request middleware mempertahankan status403/503 eksplisit karena Router terpasang default merender exception dengan500.
- Login native -> cancel/hapus data privat -> satu read authoritative -> admin-only navigate; raw token login tidak dicache. Logout native sukses -> cancel fetch -> snapshotnull/private erased -> router/login. Logout gagal mempertahankan status sesi dan menampilkan pesan aman. Password policy berasal package.
- Bridge BroadcastChannel hanya auth-changed, memakai satu transport per tab sehingga publisher tidak memicu fetch sendiri; notifikasi beruntun diantre untuk pemeriksaan ulang terakhir, subscription dibersihkan. Private Eden client opt-in menangani401/403/5xx; client publik tidak memakai hook ini.
- Guard/cache proof 10 test/31 assertion lulus, termasuk loader spy0 pada anonymous/user/banned/expired/outage, in-flight result tidak memulihkan admin, API401 clear dan403/outage tetap terkunci setelah revalidation gagal. Login policy proof 5 test/21 assertion lulus. Frozen install dan type/build lulus; lint/type hook commit.
- Built SSR smoke lulus dengan anonymous redirect, user403, outage503, bounded stall, cookies terisolasi dan tanpa private HTML. Chromium browser phase routes pada viewport390x844 lulus login salah/429/non-admin/admin, authoritative1, cache tanpa token, refresh, logout failure, role lock, delayed fetch setelah logout, dua tab dan Back/direct-link denial. Cache browser regression SSR1/hydrate0/fresh0/stale1/focus/reconnect/poll/expiry juga lulus.
- Commit: refactor(web): enforce admin route access. Domain/TLS deployment belum diverifikasi; semua browser credential adalah fixture.

SHA task: `35387c3`.

#### Blocker atau tindak lanjut

AUTH-REF-009 menghapus jalur session/writer lama setelah semua consumer berpindah.

### Task: AUTH-REF-009 — Hapus auth legacy dan contract migration singleton

- Status: Done
- Owner: Codex
- Prioritas: 9 dalam urutan eksekusi refactor.
- Referensi: AUTH-REF-US01; AUTH_REFACTOR_PLAN.md; AGENTS.md; API_DEVELOPMENT.md.
- Dependensi: AUTH-REF-003, AUTH-REF-008.
- Ukuran: Cleanup jalur mati dan satu contract migration.

#### Ruang lingkup

Hapus endpoint GET /admin/session/gateway-nya, Eden DTO khusus auth, SQL provisioning/recovery/helper hash dan lookup singleton yang tidak dipakai. Hapus admin_identity melalui migrasi baru setelah role cutover, tetap pertahankan Eden bisnis.

#### Peta file dan keluaran

Path bertanda baru adalah target yang dibuat saat eksekusi, bukan file yang sudah diimplementasikan.

| File atau area                                                                    | Perubahan yang direncanakan                                                                          |
| --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `apps/api/src/modules/auth/admin-provision.ts, admin-recovery.ts dan tests lama`  | Hapus writer/hashing custom setelah seed/reset native memiliki proof.                                |
| `apps/api/src/modules/auth/admin/index.ts, model.ts`; `app.ts`                    | Hapus endpoint/DTO /admin/session tanpa merusak reusable guard bisnis.                               |
| `apps/web/src/routes/api/admin/session.ts`; `lib/auth/api-client.ts`              | Hapus route auth legacy/DTO Eden; pertahankan business client/type-only App.                         |
| `apps/api/src/db/schema/admin.ts, index.ts`; `apps/api/drizzle/* (contract baru)` | Hapus singleton schema/tabel setelah preflight role cutover.                                         |
| `packages/auth/src/server.ts`; `apps/api/package.json`; `proof fixtures`          | Hapus compatibility exports/command legacy; tests mempertahankan invariants dengan native lifecycle. |

#### Kontrak dan batas task

- Contract migration menerima schema expand dengan role backfilled; preflight memastikan setiap legacy identity setara role admin dan semua consumer sudah pindah.
- Guard Elysia tetap reusable untuk private business routes; endpoint custom /admin/session tidak lagi didaftarkan API atau web gateway.
- Ekspor hashPassword/verifyPassword/raw legacy factory yang hanya mendukung writer aplikasi dihentikan bila tidak dibutuhkan consumer native; tidak menghapus dependency Eden bisnis.

#### Rencana implementasi terurut

- [x] **AUTH-REF-009.01 — Audit consumer sebelum hapus.** rg seluruh imports/routes/schema/writers; identifikasi test yang mengunci implementasi lama versus perilaku yang masih wajib.
- [x] **AUTH-REF-009.02 — Hapus jalur session custom.** Hapus route web/API/DTO khusus auth; jika directory kosong biarkan generator merapikan via command generate-routes, tidak hand-edit routeTree.gen.ts.
- [x] **AUTH-REF-009.03 — Hapus writer dan compatibility.** Seed/reset CLI native tetap entry yang didukung; hilangkan SQL credential/session writes dari aplikasi serta exports/hook singleton legacy.
- [x] **AUTH-REF-009.04 — Perbarui tests/fixtures.** Pertahankan proof credential migration/one-admin/revocation melalui API native; fixture SQL tetap boleh untuk persiapan/inspection, bukan production auth lifecycle.
- [x] **AUTH-REF-009.05 — Buat contract migration.** Preflight kesetaraan identity/role; hapus FK/tabel admin_identity melalui migration baru. Jangan mengubah expand/baseline migration yang sudah diterapkan.
- [x] **AUTH-REF-009.06 — Buktikan tiga tahap.** Baseline account -> expand -> native consumer -> contract -> login/logout/recovery; fingerprint credential tetap sama. Dokumentasikan batas rollback setelah DROP.
- [x] **AUTH-REF-009.07 — Audit final lalu commit.** Tidak ada session endpoint/writer custom aktif; business API/Eden tetap type-only/inferred. Generated assets/build tidak masuk commit.

#### Acceptance criteria

- [x] Tidak ada consumer legacy /admin/session atau writer/hash credential/session aplikasi.
- [x] Tidak ada impor auth library langsung pada app; konfigurasi package adalah sumber tunggal.
- [x] Contract migration hanya berjalan setelah backfill/cutover; akun/credential tetap bisa login.
- [x] Eden/type-only api/types bisnis tidak berubah menjadi dependency runtime API pada browser.
- [x] Proof yang masih relevan dipindah ke perilaku native; baseline migration tidak diubah.

#### Validasi

rg import/path/writer audit, frozen install bila script/dependency berubah, type/build dan proof upgrade+contract DB khusus test. Diff review memeriksa perubahan tetap scoped.

**Matriks skenario:**

| Skenario                                             | Hasil yang harus dibuktikan                                                             |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------- |
| DB baseline sampai contract                          | Existing admin credential/login tetap valid dan singleton benar-benar tidak diperlukan. |
| Tabel lama hilang; API guard/session SDK             | Login/admin guard/native get-session tetap bekerja.                                     |
| GET legacy /admin/session dan web /api/admin/session | 404/tidak terdaftar sesuai router; tidak menjadi alias diam-diam.                       |
| Remaining business Eden import graph                 | Hanya api/types type-only; tidak menarik index/app runtime ke browser.                  |
| Source audit custom writer/imports                   | Tidak ada production lifecycle hash/session SQL; fixture inspection dijelaskan.         |
| Contract preflight data mismatch                     | Gagal sebelum DROP; runbook rollback terbatas jelas.                                    |

**Perintah rencana dari root:**

```sh
bun run --cwd apps/api auth:schema:proof
bun run --cwd apps/api auth:admin:proof
bun run --cwd apps/api auth:authorization:proof
bun run --cwd apps/api auth:recovery:proof
bun run check-types
bun run build
```

Perintah ini belum dijalankan sebagai validasi refactor. Sesudah perubahan dependency/script, jalankan `bun install --frozen-lockfile`; proof DB dijalankan serial pada database khusus test. Browser proof mengacu pada runner yang dibuktikan tersedia saat eksekusi.

#### Gerbang cutover dan commit

Cleanup hanya sesudah task operator dan web selesai. Contract tidak dieksekusi pada DB development/deployment otomatis; recovery DB sesudah DROP memakai backup-forward fix yang terdokumentasi.

Commit setelah acceptance criteria task terpenuhi: `refactor(auth): remove legacy auth ownership`. Simpan SHA, hasil command, skenario dan batas evidence pada bagian Hasil dan bukti. Checklist langkah implementasi tidak otomatis berarti acceptance criteria sudah lulus.

#### Hasil dan bukti

Audit source: tidak ada writer/hash auth produksi atau impor library auth langsung pada apps. /admin/session dan gateway legacy dihapus; business Eden tetap type-only api/types di lib/api/client.ts. Schema package canonical; fixture schema legacy/compatibility factory/raw crypto exports dihapus. Migration 0002 preflight role/credential lalu DROP tanpa CASCADE; baseline/expand tidak diubah. Upgrade baseline→expand→login native→contract menjaga ID/hash/session: schema 5 pass/24 assertions; adapter 2/15; runtime 8/44; authorization 5/36; OpenAPI 2/56; admin 4/18; recovery 8/46. API unit 22/56 dan web proofs 29/122 lulus; check-types/build lulus, Vite+Nitro gateway smoke membuktikan legacy path404. Contract belum diterapkan pada DB development. Commit: refactor(auth): remove legacy auth ownership.

SHA task: `34402ea`.

#### Blocker atau tindak lanjut

Backup/maintenance/rollback contract migration didokumentasikan AUTH-REF-010; tidak reset database development.

### Task: AUTH-REF-010 — Regression acceptance, OpenAPI, dan runbook final

- Status: Done
- Owner: Codex
- Prioritas: 10 dalam urutan eksekusi refactor.
- Referensi: AUTH-REF-US01–04; AUTH_REFACTOR_PLAN.md; AGENTS.md; API_DEVELOPMENT.md.
- Dependensi: AUTH-REF-005, AUTH-REF-009.
- Ukuran: Konsolidasi bukti perilaku, API spec dan dokumentasi.

#### Ruang lingkup

Selaraskan Scalar/allowlist/schema native, environment/package/pool ownership, seed/reset/migration maintenance dan cache semantics. Jalankan regression lintas API/web/DB/browser, catat evidence dan commit masing-masing backlog.

#### Peta file dan keluaran

Path bertanda baru adalah target yang dibuat saat eksekusi, bukan file yang sudah diimplementasikan.

| File atau area                                                                                    | Perubahan yang direncanakan                                                                 |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `apps/api/src/plugins/openapi.ts, openapi.test.ts`; `test/integration/auth-openapi-proof.test.ts` | Filter spec native sesuai allowlist final, hapus /admin/session.                            |
| `docs/ENVIRONMENT.md, API_DEVELOPMENT.md, README.md`                                              | Runbook public/internal env, package/pool/guard, seed/reset/maintenance dan command aktual. |
| `docs/AUTH_REFACTOR_PLAN.md, IMPLEMENTATION_PLAN.md, REPOSITORY_CONTEXT.md`                       | Bedakan target versus hasil implementasi, source SHA tervalidasi dan baseline riwayat.      |
| `docs/tasks/auth.md`                                                                              | Evidence per AC/task, commit dan daftar pending browser/deployment yang benar.              |
| `Relevant API/web suites`; `apps/web/package.json, turbo.json hanya bila proof menuntut`          | Consolidated regression dan audit task graph/env/cache tanpa hosted CI.                     |

#### Kontrak dan batas task

- Spec memperlihatkan hanya native path/method yang aktif; operator HTTP tertutup dan legacy endpoint tidak muncul sebagai public contract.
- Runbook menuliskan satu public origin, fixed internal target, satu pool/API, web tanpa DB secret, native auth lifecycle dan snapshot Query.
- Evidence mencakup command/status/count/runtime/config nonsecret/source SHA; unit, PostgreSQL, HTTP smoke, browser dan production dibedakan.

#### Rencana implementasi terurut

- [x] **AUTH-REF-010.01 — Selaraskan OpenAPI lebih dahulu.** Merge paths/components native dan business Elysia tanpa merusak refs/security; filter path/method final, verifikasi Scalar runtime.
- [x] **AUTH-REF-010.02 — Perbarui runbook.** Dokumentasikan expand/cutover/contract, backup/maintenance, native seed/reset, default24h/TTL60s/deadline10s dan trusted proxy yang masih pending.
- [x] **AUTH-REF-010.03 — Jalankan relevant suites.** Unit API, proofs DB serial, web transport/session/guard/login, build smoke; setiap suite memakai guarded dedicated DB/fixture.
- [x] **AUTH-REF-010.04 — Buktikan end-to-end lokal.** Dengan browser available, rekam login/refresh/navigation/cache/dedup/logout/two-tab/outage; tidak menyamakan fixture HTTP dengan browser acceptance.
- [x] **AUTH-REF-010.05 — Audit dependency/build/env.** Frozen install jika dependency/script berubah, bundling server boundary, Turbo graph/hash consumer dan env runtime. Auth tetap TS source tanpa package build terpisah.
- [x] **AUTH-REF-010.06 — Lengkapi evidence per task.** Untuk setiap AC catat test/hasil/artifact/commit; tandai pending jelas. Jangan mengubah task Done jika AC wajib belum terbukti.
- [x] **AUTH-REF-010.07 — Final diff/commit review.** Lint/type/build/diff checks, Conventional Commit, hanya file task relevan. Skill installs/skills-lock/design yang sudah ada tetap milik pekerjaan sebelumnya.

#### Acceptance criteria

- [x] Scalar/spec hanya memuat path/method aktif; operator HTTP tertutup tidak ditampilkan sebagai public API aktif.
- [x] Temuan review callback/deadline memiliki regression; race reset dijelaskan sesuai proof/maintenance, tanpa klaim native otomatis menyelesaikannya.
- [x] Runbook membedakan cache UI/cookie/HTTP dan authorization authoritative; command/env API/web jelas tanpa secret.
- [x] Lint, workspace type-check, build, frozen install bila perlu dan relevant suites lulus dengan evidence aktual.
- [x] Browser/network acceptance memiliki hasil nyata; yang belum tersedia tetap pending, bukan Done.
- [x] Setiap task selesai memiliki commit/evidence; deployment/domain/TLS/proxy/production smoke terpisah.

#### Validasi

Root lint/check-types/build/diff-check, native Bun API suites, DB proofs serial, web transport/session/guard/browser network proof; audit bundle/Turbo consumer cache invalidation dan dokumentasi links.

**Matriks skenario:**

| Skenario                                  | Hasil yang harus dibuktikan                                                                 |
| ----------------------------------------- | ------------------------------------------------------------------------------------------- |
| OpenAPI paths/methods versus real HTTP    | Spec cocok allowlist; operator/legacy absent; refs/security valid.                          |
| Known callback/deadline regressions       | Public callback cookie utuh; SSR/gateway stall bounded.                                     |
| Migration/operator/API/browser acceptance | Tidak ada kehilangan admin/credential atau private loader/data pada denial.                 |
| Client import/bundle/Turbo env            | Server boundary enforced; no secret; source auth menginvalidasi consumer build.             |
| Documentation evidence audit              | Semua claim didukung run aktual; browser/domain/TLS/proxy/production pending tetap dicatat. |

**Perintah rencana dari root:**

```sh
bun run --cwd apps/api test
bun run --cwd apps/api auth:openapi:proof
bun run --cwd apps/web auth:gateway:smoke
bun run lint
bun run check-types
bun run build
git diff --check
```

Perintah ini belum dijalankan sebagai validasi refactor. Sesudah perubahan dependency/script, jalankan `bun install --frozen-lockfile`; proof DB dijalankan serial pada database khusus test. Browser proof mengacu pada runner yang dibuktikan tersedia saat eksekusi.

#### Gerbang cutover dan commit

Task final hanya Done ketika AC mandatory termasuk browser/network evidence sudah terpenuhi. Domain/TLS/proxy/production bukan gate lokal dan dicatat sebagai deployment pending; tidak menambah GitHub CI.

Commit setelah acceptance criteria task terpenuhi: `docs(auth): document and verify native auth refactor`. Simpan SHA, hasil command, skenario dan batas evidence pada bagian Hasil dan bukti. Checklist langkah implementasi tidak otomatis berarti acceptance criteria sudah lulus.

#### Hasil dan bukti

Regresi source final pada feat/auth-admin-module (parent 34402ea + perubahan task ini): frozen install tanpa lock changes; root lint web, check-types API/web/package, build dua app dan git diff --check lulus. Native unit API22/package3, web29, PostgreSQL serial34: 88 test lulus. Final schema proof memakai command Bun db:migrate --stage=expand, bukan hanya helper; CLI native stderr disanitasi, seed tetap hidden prompt dan duplicate tidak mengubah password. Command expand/cutover/contract dan rollback backup ditulis pada AUTH_OPERATIONS.md. Source app tidak mengimpor library auth langsung; auth package tetap TS-source/no-build terpisah. Negative import build menolak @repo/auth/server dan fixture dipulihkan; build normal sesudahnya lulus. Turbo source dependency hashes sudah dibuktikan AUTH-REF-007. Vite dan built Bun/Nitro gateway smoke lulus cookie/callback/status/no-store/legacy404; SSR smoke admin/null/user403/outage503/stall10s/cookie isolation/safe HTML lulus. Browser Chromium cache+routes pada Vite dan built Bun/Nitro lulus SSR1/hydration0/fresh0/stale dedup1/offline0/focus/reconnect/poll1, expiry/outage lock, login401/429/non-admin/admin authoritative1, logout failure, in-flight cancellation, dua tab, Back/direct-link. Tambahan native end-to-end browser memakai Better Auth asli + Elysia + PostgreSQL dedicated + built Bun/Nitro: login/non-admin/SSR refresh/native HttpOnly cookie/whitelist snapshot/fresh navigation0/logout/cross-tab/Back lulus, viewport390x844. Semua credential browser adalah fixture. Docs aktif/history diselaraskan; 56 link internal diverifikasi. DB development dicek read-only: migration baseline1, role column belum ada; credential existing tidak direset. Commit: docs(auth): document and verify native auth refactor. SHA commit final dapat ditemukan dari commit yang memuat task ini.

#### Blocker atau tindak lanjut

Tidak menambah GitHub CI. Domain/TLS/trusted proxy dan production smoke menunggu deployment yang belum ditentukan.

## Ringkasan acceptance refactor final — 2 Oktober 2026

| Suite | Hasil | Lingkungan/batas |
| --- | --- | --- |
| API unit / package unit / web proofs | 22 / 3 / 29 pass | Bun native; HTTP API unit tanpa port; mock transport web. |
| Adapter / schema | 2 / 5 pass | PostgreSQL dedicated; rollback adapter, staged migration CLI, existing ID/hash/session, contract/preflight. |
| Runtime / seed / recovery / authorization / OpenAPI | 8 / 4 / 8 / 5 / 2 pass | Database dedicated serial; CLI PTY; native reset failure/race/maintenance; cookie cache bypass guards; Scalar refs/paths. |
| Gateway Vite + built Bun/Nitro / SSR built | Pass | Cookie/status/callback/no-store/legacy404, 403/503, deadline, request isolation, safe HTML. |
| Chromium cache + routes, Vite dan built Bun/Nitro | Pass | SDK native + HTTP fixture; network counts, mobile390×844, cancellation, outage, expiry, lintas tab. |
| Chromium native end-to-end | Pass | Better Auth asli + PostgreSQL dedicated + Elysia + build Bun/Nitro, mobile390×844. |
| Frozen install / lint / type-check / build / import boundary | Pass | Bun1.4.2, Turbo2.11.5; lint hanya web; auth source dikompilasi consumer; no server import browser. |

Source kode task AUTH-REF-001–009 dapat diperiksa pada SHA masing-masing; task010 berisi evidence/runbook, staged migration CLI, safe CLI diagnostics dan browser runner final. Setiap task telah di-commit sesudah validasi. Skenario deployment belum dijalankan: domain/TLS/trusted proxy/IP, backup/restore target, browser/perangkat lain, production smoke. Pada saat commit refactor final, rollout database development juga belum dijalankan; status itu diperbarui oleh AUTH-FUP-001 di bawah. Detail current/database/maintenance tidak disamakan dengan hasil proof test.


## User story: AUTH-US-FUP — Operasi development dan feedback auth

Sebagai admin, saya ingin database development menggunakan schema native dan menerima feedback saat menjalankan login/logout.

## Task: AUTH-FUP-001 — Terapkan migrasi native pada database development

- Status: Done
- Owner: Pengembang/agent pelaksana
- Prioritas: P0
- Referensi: AUTH-US-FUP, permintaan migrasi pengguna 2 Oktober 2026
- Dependensi: AUTH-REF-001–010
- Ukuran: Operasi lokal terarah

### Ruang lingkup

Backup dan migrasi expand → verifikasi native → contract pada database development yang dikonfigurasi API, tanpa seed/reset credential.

### Acceptance criteria

- [x] Target localhost:5433/vertical_movie_app terverifikasi dan backup dibuat sebelum perubahan.
- [x] Expand/contract selesai, journal tiga migration dan tabel legacy dihapus.
- [x] ID admin, credential account, hash password dan seluruh sesi existing tetap sama.
- [x] Adapter native membaca user/account admin dan API development kembali berjalan.

### Validasi

Backup pg_dump custom-format dengan akses file 600, pg_restore --list exit 0; helper migrator yang sama dengan CLI aplikasi menjalankan expand dan contract secara bertahap. Perbandingan identitas/hash/sesi dilakukan di memori tanpa mencetak secret. HTTP root/get-session anonymous/OpenAPI native diperiksa setelah proses dilanjutkan.

### Hasil dan bukti

2 Oktober 2026: migrationCount=3, nativeAdmin=true, identityAndHashPreserved=true, sessionsPreserved=true, legacyTableRemoved=true. API root, get-session anonymous dan OpenAPI JSON 200; route native tersedia dan legacy admin/session tidak ada. Lokasi backup dan batas verifikasi tercatat pada Auth Operations. Tidak ada login memakai password existing atau reset akun. Commit: docs(auth): record development database migration.

### Blocker atau tindak lanjut

Restore penuh dan rollout deployment masih pending. AUTH-FUP-002 menambahkan toast auth pada web.


## Task: AUTH-FUP-002 — Feedback toast shadcn untuk aksi auth

- Status: Done
- Owner: Pengembang/agent pelaksana
- Prioritas: P1
- Referensi: AUTH-US-FUP, permintaan toast pengguna 2 Oktober 2026
- Dependensi: AUTH-FUP-001
- Ukuran: UI dan acceptance auth terarah

### Ruang lingkup

Komponen toast resmi shadcn Base UI sesuai preset proyek, satu Toaster global, feedback login/logout dan retry sesi manual. Tidak ada toast dari polling atau navigasi otomatis.

### Acceptance criteria

- [x] Loading berubah menjadi sukses/gagal dalam toast yang sama untuk login, logout, dan retry sesi manual.
- [x] Login sukses hanya setelah verifikasi admin; non-admin, credential salah dan limiter memberikan feedback gagal.
- [x] Logout gagal mempertahankan sesi; sukses tetap terlihat setelah navigasi dan invalidation lintas tab berjalan.
- [x] Validasi field gagal memberi feedback tanpa request; alert/form error dan disabled state tetap berfungsi.
- [x] Frozen install, lint, check-types, build dan browser acceptance hasil build lulus.

### Validasi

Native auth/session/guard unit proofs, browser Chromium 390×844 melalui HTTP fixture yang menahan request untuk membuktikan loading, hasil toast, navigasi, outage/retry dan logout lintas tab. Root lint/type/build serta frozen install.

### Hasil dan bukti

Komponen dipasang melalui bunx --bun shadcn@latest add @shadcn/toast; Button existing dipertahankan. Native toast.promise memproses loading → result dan rethrow error untuk alert inline yang aman. Toaster berada di root sehingga hasil aksi bertahan setelah navigasi. Hasil pemeriksaan retry membaca status Query karena router.invalidate dapat resolve meskipun guard gagal. Validasi final: frozen install tanpa perubahan dependency/lockfile; lint web, check-types API/web/package dan root build dua app lulus. Native auth/login/guard/cache proofs: 19 test, 81 assertions lulus. Browser Chromium 390×844 pada hasil build Bun/Nitro lulus validasi tanpa request, loading → result dalam elemen toast yang sama, login401/429/non-admin/admin, authoritative read sekali, snapshot aman, refresh, logout gagal, retry sesi gagal/pulih, role lock, in-flight cancellation, logout sukses setelah navigasi, dua tab dan Back/direct-link denial. Pesan inline pada browser workers diberi scope main agar tidak ambigu dengan deskripsi toast. SSR smoke hasil build juga lulus admin/null/user403/outage503/stall timeout, cookie isolation, multi Set-Cookie dan whitelist HTML. API lokal root/get-session anonymous 200; halaman login web tersedia setelah canonical redirect. Commit: feat(web): add auth operation toasts.

### Blocker atau tindak lanjut

Rollout deployment mengikuti AUTH-FUP-001; tidak menambah dependensi, endpoint, atau persistence toast.


## Task: AUTH-FUP-003 — Posisikan toast di top center

- Status: Done
- Owner: Pengembang/agent pelaksana
- Prioritas: P1
- Referensi: AUTH-US-FUP, permintaan pengguna 3 Oktober 2026
- Dependensi: AUTH-FUP-002
- Ukuran: Penyesuaian layout komponen web

### Ruang lingkup

ToastViewport berada di tengah atas dengan jarak 1rem dan margin horizontal responsif. Root memakai anchor/origin atas, stack berkembang ke bawah, animasi masuk/keluar ke atas, dan swipe dismiss ke atas. Aksi auth tetap menggunakan manager native yang sama.

### Acceptance criteria

- [x] Toast berada di top center pada viewport mobile dan desktop tanpa overflow horizontal.
- [x] Stack collapsed menunjukkan toast berikutnya di bawah; hover memperluas stack ke bawah dengan gap.
- [x] Swipe ke atas dan tombol tutup berhasil menghapus toast.
- [x] Lint, check-types, build dan pemeriksaan formatting lulus.

### Validasi

Root bun run lint, bun run check-types dan bun run build. Prettier check komponen. Pemeriksaan browser sementara melalui Playwright Chromium pada dev web menggunakan validasi field kosong, tanpa login atau request credential.

### Hasil dan bukti

3 Oktober 2026: Chromium 390×844 dan 1280×900 lolos center horizontal (toleransi 1px), posisi atas 16px, batas viewport, stack collapsed/expanded mengarah ke bawah, swipe up dismiss dan tombol tutup. Screenshot mobile diperiksa secara visual. Lint web, check-types kedua app/package, build kedua app serta formatting/diff check lulus. Implementasi mengikuti konsep custom position Base UI pada https://base-ui.com/react/components/toast#custom-position. Commit: fix(web): position toasts at top center.

### Blocker atau tindak lanjut

Tidak ada untuk perubahan layout lokal ini.


## Task: AUTH-FUP-004 — Redirect sesi admin aktif dari halaman login

- Status: Done
- Owner: Pengembang/agent pelaksana
- Prioritas: P1
- Referensi: AUTH-US-FUP, issue pengguna 3 Oktober 2026
- Dependensi: AUTH-REF-007–008, AUTH-FUP-002
- Ukuran: Guard login dan regresi navigasi

### Ruang lingkup

Tambahkan beforeLoad pada /admin/login yang membaca sesi native melalui Query bersama. Admin aktif diarahkan ke tujuan admin internal yang tervalidasi sebelum form muncul. Guard ini tidak logout atau menghapus cache/sesi. Anonymous, user non-admin dan sesi banned/expired tetap dapat mengakses login. Bila service tidak dapat diperiksa, form login tersedia untuk retry native tanpa redirect berdasarkan data stale.

### Acceptance criteria

- [x] Admin aktif membuka login lewat SSR/direct URL atau navigasi client lalu kembali ke dashboard tanpa login ulang.
- [x] Cache Query fresh dipakai bersama tanpa request tambahan; cookie dan sesi native tetap sama.
- [x] Anonymous/non-admin/banned/expired tidak dialihkan ke dashboard; return target berbahaya kembali ke /admin.
- [x] Logout tetap menuju login, tanpa redirect loop atau menghidupkan kembali principal lama.
- [x] Unit guard, SSR, browser native/fixture, lint, check-types dan build lulus.

### Validasi

Bun guard tests, SSR smoke, browser fixture Vite dan native Better Auth + PostgreSQL dedicated pada hasil build Bun/Nitro. Pemeriksaan root lint/type/build. Tidak memakai credential atau cleanup database development.

### Hasil dan bukti

Sebelum perubahan, route login hanya memvalidasi search dan merender form; tidak ada pemeriksaan sesi aktif. beforeLoad kini memakai redirectActiveAdmin dengan Query/reader isomorphic native yang sama. Hanya admin tidak banned dengan sesi belum expired diarahkan ke target internal tervalidasi memakai replace; tidak ada signOut atau cache cleanup pada guard login. Error dependency tidak memakai data stale untuk redirect dan form tetap tersedia.

3 Oktober 2026: guard/cache 16 test, 55 assertions lulus; lint web, check-types API/web/package, root build dua app dan diff check lulus. SSR smoke membuktikan admin aktif dialihkan sebelum form dirender dengan return target query/hash dan no-store; anonymous/user/outage masih menerima login200. Browser Chromium memakai Better Auth asli + PostgreSQL dedicated + Elysia + hasil build Bun/Nitro: navigasi client ke login, URL langsung, refresh dan Back kembali ke dashboard, native session token serta snapshot sama, navigasi fresh menambah nol read, logout/lintas tab/Back denial tetap lulus. Fixture Vite cache dan routes juga lulus SSR1/hydration0/fresh0/stale dedup1/offline/focus/reconnect/poll/expiry/outage, login401/429/non-admin/admin, toast/loading/retry, logout failure dan race/lintas tab. Tidak ada reset akun/sesi database development. Commit: fix(auth): redirect active admins away from login.

### Blocker atau tindak lanjut

Tidak ada blocker untuk fix lokal ini. Domain/TLS/production tetap mengikuti backlog deployment.


## Task: AUTH-FUP-005 — Logout menuju login tanpa halaman error perantara

- Status: Done
- Owner: Codex
- Prioritas: P2
- Referensi: AUTH-US-FUP; laporan dan screenshot pengguna 3 Oktober 2026
- Dependensi: AUTH-REF-008, AUTH-FUP-002, AUTH-FUP-004
- Ukuran: Transisi logout dan regresi browser

### Ruang lingkup

Perbaiki layout protected agar status tanpa sesi tidak merender error layanan selama redirect. Setelah signOut SDK native berhasil, bersihkan Query privat dan kirim notifikasi lintas tab, navigasi replace ke login, lalu invalidasi route yang tersimpan. Pertahankan error layanan sebenarnya, penolakan role, toast dan perilaku logout gagal.

### Acceptance criteria

- [x] Logout berhasil menuju login tanpa menampilkan halaman sesi unavailable atau akses ditolak.
- [x] Tab lain mengikuti logout; request sesi tertunda tidak mengembalikan principal lama dan Back tetap terkunci.
- [x] Logout gagal mempertahankan dashboard serta toast/error; outage dan role non-admin tetap memiliki halaman error yang sesuai.
- [x] Regresi browser development/build, guard/cache/login tests, lint, check-types, build dan formatting lulus.

### Validasi

Observer DOM pada dua tab merekam setiap heading error selama logout dengan request sesi tertunda. Runner browser memakai SDK Better Auth native dengan HTTP fixture dedicated pada Vite dan hasil build Bun/Nitro. Gunakan proof guard/cache/login existing dan quality gates root.

### Hasil dan bukti

3 Oktober 2026: sebelum fix, assertion browser gagal karena heading "Sesi admin belum dapat diperiksa" sempat muncul. Setelah fix, kedua tab lolos dengan daftar heading error kosong hingga login muncul. Uji browser development dan build lolos toast loading/hasil, logout gagal, outage/retry, role lock, race, lintas tab dan Back denial. Guard/cache/login: 21 test dan 77 assertions lulus. Lint, check-types, build kedua app, formatting tiga file kode dan diff check lulus. Tidak memakai akun atau mengubah database development. Commit: fix(auth): skip session error screen during logout.

### Blocker atau tindak lanjut

Tidak ada untuk perbaikan transisi ini.
