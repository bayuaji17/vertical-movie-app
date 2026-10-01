# Implementation Plan: Modul Auth Admin Tunggal

## Plan Metadata

- Status: **executing**; AUTH-001 sampai AUTH-004 selesai, setiap task dikomit setelah acceptance dan validasinya lulus.
- Repository: `bayuaji17/vertical-movie-app`.
- Base ref: `main`.
- Base SHA: `bff1ced88f7ade37d454370ccf7d95a47cbf3aea`.
- Context: [REPOSITORY_CONTEXT.md](REPOSITORY_CONTEXT.md).
- Backlog kanonis: [tasks/auth.md](tasks/auth.md).
- Last validated SHA: `bff1ced88f7ade37d454370ccf7d95a47cbf3aea`.
- Tanggal: 1 Oktober 2026, Asia/Jakarta.
- Scope yang disetujui pengguna: email/password, satu admin melalui CLI, recovery melalui CLI tanpa layanan email, dan satu origin web/API.
- Implementasi dan commit terpisah setelah setiap task disetujui pengguna pada 1 Oktober 2026. Push, PR, merge, dan deploy tidak termasuk permintaan tersebut.

## Objective

Admin yang diprovision secara terkendali dapat login, membuka dashboard yang dilindungi, logout, dan memulihkan password. API menegakkan identitas admin pada setiap endpoint privat; halaman publik tetap dapat dibuka tanpa sesi. Hasil modul berupa alur nyata dari PostgreSQL sampai UI, bukan hanya formulir atau guard browser.

## Goals and Non-goals

Termasuk: fondasi PostgreSQL/Drizzle auth, konfigurasi Better Auth di package pemilik, CLI provision/reset, endpoint sesi admin, guard API, gateway same-origin, Eden type-only, pemeriksaan SSR/browser, login/logout, dashboard minimum, Scalar gabungan, dan bukti validasi.

Tidak termasuk: registrasi publik, akun penonton/kreator, OAuth, MFA/passkey, layanan email, reset lewat email, UI pengelolaan banyak pengguna, konten/ringkasan video dashboard, storage, worker, atau perubahan player. Deployment production/domain final tetap pekerjaan terpisah.

## Current Behavior

Pada planning base SHA, API hanya `GET /` dan langsung membuka port; belum ada Drizzle, auth route, provisioning, atau test API. Implementasi branch kini memisahkan app/bootstrap, memvalidasi env dan membuat Bun SQL/Drizzle client, serta menutupnya saat shutdown. Schema auth/admin dan migrasi eksplisit dibuat AUTH-003 serta diuji hanya pada database PostgreSQL test; database development belum dimigrasi. AUTH-004 memasang login/logout/session Better Auth dengan kebijakan satu admin; CLI provisioning, gateway, dan UI auth masih belum dibuat. Lihat [context](REPOSITORY_CONTEXT.md) untuk baseline source dan batas pemeriksaan.

## Desired Behavior

### Identitas dan lifecycle admin

- Tabel aplikasi `admin_identity`: singleton key dengan constraint nilai tetap, user ID unik dan FK ke tabel user Better Auth. Hanya satu identitas berhak menjadi admin.
- `admin:provision` membaca email/nama dan password dari input terkontrol; password melalui prompt tersembunyi atau stdin khusus, bukan argumen CLI. Menggunakan public password hasher Better Auth yang sama dengan konfigurasi server.
- Provisioning membuat user, account `providerId: credential`/`accountId: userId`, dan klaim singleton dalam satu transaksi. Hash dilakukan sebelum transaksi. Pemanggilan ulang untuk identitas sama adalah no-op, tidak mengganti password; identitas berbeda ditolak. Provisioning bersamaan tidak meninggalkan akun/session parsial. Tidak membuat sesi login.
- `admin:reset-password` mencari user melalui singleton, mengganti hash dan mencabut semua sesi dalam satu transaksi. Tidak menerima user ID arbitrer dan tidak mengubah identitas admin. Sesudahnya password lama dan cookie lama ditolak.
- HTTP instance selalu menonaktifkan signup. CLI tidak menyalakan signup pada HTTP instance dan tidak menggunakan API privat `$context`/internal adapter Better Auth. Mapping credential harus diuji terhadap source/generator versi yang dipasang.

### Auth server dan kontrak API

- Factory `createAuthServer` di `@repo/auth/server` menerima adapter, origin publik, secret, dan dependency kebijakan admin yang diinjeksi API. Import tidak membuat pool atau membaca secret.
- Base path auth **`/api/auth`**. Login/logout/session memakai Better Auth client. Tidak membungkus payload atau body raw handler dengan envelope aplikasi.
- Hook sebelum pembuatan sesi menolak user selain singleton; `requireAdmin` juga memvalidasi sesi dari database dan identitas pada setiap request privat. Missing/invalid/expired/revoked session → `401`; sesi valid milik non-admin → `403`; database gagal → respons dependency error aman, tanpa memberi akses.
- Endpoint aplikasi minimum **`GET /admin/session`** dengan DTO `{ user: { id, name, email }, session: { expiresAt } }`. Timestamp UTC string; tidak mengirim token sesi, account hash, atau row lengkap. Response schema `200/401/403/503`, error `{ error: { code, message, requestId } }` dan inferensi Eden harus dibuktikan.
- `GET /` tetap publik. Gunakan fixture test rute tulis privat untuk membuktikan service tidak dipanggil setelah penolakan; jangan menambah endpoint tulis palsu ke produk.
- Default usulan: password 12–128 karakter; session `expiresIn` 24 jam dan `disableSessionRefresh: true`; cookie cache nonaktif. Sesi fixed menghindari refresh cookie tersembunyi pada SSR dan menjamin batas waktu yang mudah diperiksa.
- Cookie sesi HttpOnly, SameSite=Lax, host-only; Secure pada HTTPS production. `trustedOrigins` berasal dari origin web tetap; validasi Origin/CSRF Better Auth tetap aktif. Operasi tulis aplikasi berbasis cookie juga wajib memiliki pemeriksaan origin sebelum dijalankan saat modul berikutnya dibuat.
- Rate limit aktif juga pada test eksplisit, login usulan 5/60 detik per key, storage PostgreSQL. Verifikasi ekstraksi IP/trusted proxy pada adapter Bun dan pencegahan spoof header. Jangan menganggap storage database membuktikan counter aman terhadap semua race; uji perilaku yang dibutuhkan. Respons `429` dan retry header ditangani UI.
- Endpoint fitur yang tidak dipakai, seperti signup, email reset, change-email/delete-user, ditolak sesuai konfigurasi/disabled paths versi 1.7.7. Endpoint session yang diperlukan tetap aktif. Daftar final harus diuji dan tercermin di OpenAPI.

### Origin, gateway, dan SSR

| Pemanggil               | URL yang dipakai                                | Tujuan internal                     |
| ----------------------- | ----------------------------------------------- | ----------------------------------- |
| Browser Better Auth     | `<web-origin>/api/auth/*`                       | `<API_INTERNAL_URL>/api/auth/*`     |
| Browser Eden            | base `<web-origin>/api`, route `/admin/session` | `<API_INTERNAL_URL>/admin/session`  |
| SSR sesi admin          | origin upstream tetap + `/admin/session`        | API Elysia, cookie request saat ini |
| UI                      | `/admin/login`, `/admin`                        | TanStack Start                      |
| Dokumentasi development | API `/openapi`, `/openapi/json`                 | Scalar/schema gabungan pada API     |

Server routes TanStack Start menjadi gateway transport, tanpa auth server/database di web. Pada modul ini gateway hanya meneruskan auth dan endpoint sesi admin; tidak membuat proxy URL bebas atau mem-forward semua path. Nama file target `api.auth.$.ts` dan `api.admin.session.ts` harus dikonfirmasi lewat generator versi terpasang.

Konfigurasi lokal target:

```text
API: PORT=3001
API: BETTER_AUTH_URL=http://localhost:3000
API: WEB_ORIGIN=http://localhost:3000
Web: VITE_API_URL=http://localhost:3000
Web: API_INTERNAL_URL=http://localhost:3001
```

`VITE_API_URL` tetap origin publik, tetapi sesudah task same-origin nilainya adalah origin gateway web. Package client auth memakai origin tersebut dengan base path `/api/auth`; client Eden menambahkan `/api`. `API_INTERNAL_URL` hanya konfigurasi server web, tidak dipublikasikan dalam bundle. Env lokal yang ada tidak ditimpa; dokumentasikan perubahan manual dan restart yang diperlukan. Production menggunakan origin HTTPS publik aktual dan upstream internal tetap.

Gateway mempertahankan method/query/body, cookie, Origin, content type, status, serta beberapa header `Set-Cookie` tanpa menggabungkannya dengan koma. Filter header hop-by-hop, host dan forwarded header yang tidak dipercaya, batasi upstream tetap, gunakan abort/timeout, dan jangan mengikuti redirect upstream otomatis ke host lain. Auth/session respons `Cache-Control: no-store`; kegagalan upstream menghasilkan error aman tanpa logging credential.

SSR memakai server function/helper dengan cookie per request. Hanya cookie Better Auth yang diperlukan diteruskan ke upstream yang diizinkan; tidak ada singleton client berisi header pengguna. Browser navigation memakai Eden dengan `credentials: include`, `parseDate: false`, error HTTP/network masuk keadaan error TanStack Query. Jangan serialisasi seluruh objek Better Auth ke loader/router context.

Layout `/admin` bersifat umum; `/admin/login` berada di luar guard. Pathless layout `admin._authenticated` melindungi halaman `/admin`. `401` menuju login dengan tujuan lokal yang tervalidasi; `403` menampilkan penolakan, dependency/network failure menampilkan retry, bukan dianggap logout. Pending/session check tidak menampilkan dashboard. Setelah login periksa endpoint admin, invalidasi router/query; setelah logout sukses bersihkan cache privat, invalidasi, dan pindah ke login. Jika logout gagal, tampilkan kegagalan tanpa menyatakan sesi tercabut.

### Scalar

Tambahkan plugin Better Auth `openAPI({ disableDefaultReference: true })`. Bootstrap menggenerasikan schema sekali dari instance yang sama dan menginjeksi hasil ke `createApp`/plugin OpenAPI Elysia. Gabungkan paths/components dengan deteksi konflik, prefix tepat sekali, `$ref` utuh, dan security cookie yang benar. Dokumentasi hanya memuat endpoint yang memang aktif; endpoint auth yang disabled harus disaring jika generator masih mencantumkannya. `GET /` tidak mendapat syarat login. UI auth bawaan tidak menjadi halaman referensi kedua.

## Impact Analysis

Fondasi `index.ts` perlu dipisah dari komposisi agar test tanpa port dan contract type-only aman. Database serta schema hanya dibuat untuk auth/admin identity/rate-limit. `packages/auth` tetap pemilik konfigurasi Better Auth; web hanya mengonsumsi client/types. Perubahan origin menyentuh env samples, env Turbo web, client dan dokumentasi. Penambahan server route/SSR harus bekerja pada Vite development dan output Nitro/Bun yang dibangun.

Tidak ada data produk lama yang diketahui dari source. Keadaan database aktual harus diperiksa sebelum migrasi, tanpa membaca/mencetak connection string atau mengasumsikan database kosong. Tidak ada prerequisite untuk memasang storage/FFmpeg atau mengganti UI starter publik.

## Affected Files and Symbols

Path berikut adalah set target; file dibuat hanya pada task yang membutuhkan. Test perilaku mengikuti task pemilik. Bukti source mengacu SHA metadata; path baru adalah desain yang diturunkan dari `API_DEVELOPMENT.md` dan entry point aktual.

| Path                                                                                          | Action | Symbols                                         | Reason                                                       | Evidence                                  |
| --------------------------------------------------------------------------------------------- | ------ | ----------------------------------------------- | ------------------------------------------------------------ | ----------------------------------------- |
| `apps/api/package.json`, `bun.lock`                                                           | modify | scripts/dependencies                            | Drizzle, test, migrasi dan operasi admin                     | manifest API; standar test/database       |
| `packages/auth/package.json`                                                                  | modify | dependencies/peers                              | Adapter Drizzle sesuai Better Auth; peer ORM bila diperlukan | manifest auth dan adapter type terpasang  |
| `packages/auth/src/server.ts`                                                                 | modify | `createAuthServer`, adapter/schema/hash helpers | Factory dan ekspor khusus server                             | re-export sekarang; ownership docs        |
| `packages/auth/src/client.ts`, `types.ts`                                                     | modify | `createProjectAuthClient`, inferred types       | Client terkonfigurasi tanpa dependency server runtime        | entry point sekarang                      |
| `apps/api/src/index.ts`                                                                       | modify | bootstrap/shutdown                              | Resource wiring dan listen saja                              | `.listen()` starter                       |
| `apps/api/src/app.ts`, `types.ts`                                                             | create | `createApp`, `App`                              | Komposisi diinjeksi dan export type-only                     | folder target API docs                    |
| `apps/api/src/config/env.ts`, `env.test.ts`                                                   | create | `readApiEnv`                                    | Validasi konfigurasi auth dan origin                         | Environment/API docs                      |
| `apps/api/src/db/client.ts`, `schema/auth.ts`, `schema/admin.ts`                              | create | `createDatabase`, auth/admin tables             | Bun SQL/Drizzle dan constraint singleton                     | aturan DB; adapter docs                   |
| `apps/api/drizzle.config.ts`, `apps/api/drizzle/**`, `apps/api/scripts/migrate.ts`            | create | migration tooling                               | Schema dan migrasi eksplisit                                 | aturan DB                                 |
| `apps/api/scripts/provision-admin.ts`, `reset-admin-password.ts`                              | create | CLI entry points                                | Provision/recovery terkendali                                | PRD-01; scope disetujui                   |
| `apps/api/src/modules/auth/{index,model,service,repository}.ts`                               | create | `createAuthModule`, admin identity operations   | HTTP auth dan domain operasi CLI                             | struktur/tanggung jawab API docs          |
| `apps/api/src/plugins/{admin,errors,openapi}.ts`                                              | create | `requireAdmin`, safe errors, schema merge       | Guard privat dan Scalar                                      | lifecycle/error/OpenAPI docs              |
| `apps/api/src/**/*.test.ts`                                                                   | create | unit/HTTP behavior                              | Konfigurasi, scope, guard, CLI orchestration, schema         | standar Bun test                          |
| `apps/api/test/integration/auth.test.ts`                                                      | create | real PostgreSQL auth suite                      | Migrasi, login, rollback, reset/revoke                       | standar integration                       |
| `apps/api/package.json`                                                                       | modify | `exports["./types"]`                            | Web hanya import type `api/types`                            | kontrak Eden docs                         |
| `apps/web/package.json`                                                                       | modify | `@elysia/eden`, `api: workspace:*`              | Type dependency dan client endpoint aplikasi                 | pilihan Eden                              |
| `apps/web/src/lib/{auth-client,api-client,admin-session}.ts`                                  | create | auth client, Eden factory, session query        | Transport browser dan cache sesi                             | router/Query source                       |
| `apps/web/src/lib/{api-proxy,admin-session}.server.ts`                                        | create | fixed upstream proxy, SSR session               | Same-origin/SSR tanpa DB web                                 | keputusan origin; server routes/functions |
| `apps/web/src/routes/api.auth.$.ts`, `api.admin.session.ts`                                   | create | server route handlers                           | Gateway narrow                                               | konvensi TanStack Start                   |
| `apps/web/src/routes/{admin,admin.login,admin._authenticated,admin._authenticated.index}.tsx` | create | public admin layout, login, protected layout    | Login di luar guard; dashboard minimum                       | PRD-01; routes sekarang                   |
| `apps/web/src/components/auth/login-form.tsx`, `components/ui/*` yang diperlukan              | create | accessible form primitives                      | TanStack Form dan preset UI yang ada                         | Design System/components.json             |
| `apps/web/src/router.tsx`, `routes/__root.tsx`                                                | modify | context typing bila diperlukan                  | Integrasi sesi/request tanpa singleton                       | router/Query source                       |
| `apps/api/.env.example`, `apps/web/.env.example`, `turbo.json`                                | modify | origin/public/internal env                      | Same-origin dan env runtime server web                       | env samples/Turbo bundled docs            |
| `docs/{README,ARCHITECTURE,ENVIRONMENT,API_DEVELOPMENT}.md`, `docs/tasks/auth.md`             | modify | contracts/runbooks/evidence                     | Dokumentasikan hasil dan command aktual                      | workflow dan kepemilikan docs             |

`routeTree.gen.ts` adalah output generator yang mungkin berubah, bukan target edit manual. `docs/design/` tetap di luar scope. Dependensi/script baru tidak dipasang pada sesi planning ini.

## Implementation DAG

Setiap AUTH-ID di [backlog](tasks/auth.md) juga ID step stabil di plan ini. Cabang DAG menunjukkan dependensi teknis, bukan instruksi menjalankan multi-agent.

```text
AUTH-001 → AUTH-002 → AUTH-003 → AUTH-004
AUTH-004 → AUTH-005 → AUTH-006
AUTH-004 + AUTH-005 → AUTH-007
AUTH-004 + AUTH-007 → AUTH-008
AUTH-004 + AUTH-007 → AUTH-009
AUTH-007 + AUTH-009 → AUTH-010 → AUTH-011 → AUTH-012
AUTH-001..AUTH-012 → AUTH-013
```

## Implementation Steps

Detail scope, acceptance criteria, validasi, owner, status dan bukti setiap step berada pada [backlog kanonis](tasks/auth.md). Ringkasan file/symbol di sini mengikat backlog ke impact map.

| Step     | Outcome                                                 | Depends on         | Files / symbols                                                        | Requirements                                                             | Validation / completion                                                                                  |
| -------- | ------------------------------------------------------- | ------------------ | ---------------------------------------------------------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| AUTH-001 | **Done** — proof kompatibilitas dan versi terkunci      | none               | Manifest, server exports, CLI/schema test fixture                      | Bun SQL + Drizzle + Better Auth transaction/migrator                     | Lulus: PostgreSQL test, adapter rollback, credential login/session, generated migration, workspace gates |
| AUTH-002 | **Done** — konfigurasi, lifecycle, dan boundary package | AUTH-001           | env, db client, app/types, bootstrap, auth exports; native test script | Validasi secret/origin; pool diinjeksi; type-only export                 | Unit env/lifecycle, type-check/build, startup lokal; factory terpisah dari listen                        |
| AUTH-003 | **Done** — schema auth/admin dan migrasi eksplisit      | AUTH-002           | db/schema, drizzle config/migrations, migrate script                   | Tabel auth/rate-limit, singleton dengan FK/constraint                    | Lulus: fresh/re-run, adapter pakai schema sama, constraint/rollback DB test, migrasi tidak mencetak URL  |
| AUTH-004 | **Done** — handler auth aman dan limiter                | AUTH-003           | server factory, auth module, errors                                    | Signup disabled; policy session, cookie/origin, rate limit; public route | Lulus HTTP/DB: login salah/benar, disabled endpoints, Origin, 429, logout (8 test/44 assertion)          |
| AUTH-005 | Provisioning satu admin                                 | AUTH-004           | service/repository, provision CLI, exported hasher                     | Credential mapping actual; transaksi singleton; stdin rahasia            | Retry no-op, konkurensi, failed write rollback, login hasil provision                                    |
| AUTH-006 | Recovery password mencabut sesi                         | AUTH-005           | reset CLI, service/repository                                          | Password update + revoke satu transaksi; singleton tetap                 | Password/cookie lama gagal, password baru berhasil, rollback tidak parsial                               |
| AUTH-007 | Guard admin dan endpoint typed                          | AUTH-004, AUTH-005 | admin plugin, auth DTO/service/controller                              | 401/403/503; ID cocok; tidak bocor guard ke public                       | app.handle; service tulis tidak dipanggil saat gagal; schema/inferensi DTO                               |
| AUTH-008 | Scalar gabungan aktual                                  | AUTH-004, AUTH-007 | OpenAPI plugin/helper, bootstrap                                       | Paths/components/ref/security; hide disabled endpoints                   | Schema merge conflict/ref tests, `/openapi/json` dan UI smoke                                            |
| AUTH-009 | Transport same-origin dev/production build              | AUTH-004, AUTH-007 | server routes/proxy, samples, Turbo env                                | Fixed upstream, multiple Set-Cookie, no-store, request forwarding        | Raw HTTP/cookie tests dan smoke output Nitro/Bun; tidak ada proxy bebas                                  |
| AUTH-010 | Eden dan sesi SSR/browser                               | AUTH-007, AUTH-009 | manifests, clients, server function, session query                     | Type-only App; per-request cookie; parseDate false; error state          | Type consumer, HTTP/network failure, SSR dua request terisolasi, bundle review                           |
| AUTH-011 | Login admin usable                                      | AUTH-010           | login route/form/primitives                                            | TanStack Form; validation/pending/error/429; redirect lokal aman         | Lint/type/build; manual mobile/desktop/keyboard dan sukses/gagal                                         |
| AUTH-012 | Dashboard guard dan logout                              | AUTH-011           | layout/routes, cache invalidation                                      | SSR/direct URL guard; login di luar guard; logout gagal/sukses           | Manual refresh/navigation/expiry/logout; public tetap terbuka                                            |
| AUTH-013 | Alur lengkap dan runbook                                | AUTH-001..AUTH-012 | integration suite, docs/backlog                                        | Seluruh acceptance dan deploy/recovery instructions                      | Frozen install + gates + DB integration + browser smoke; bukti aktual tercatat                           |

## Test Requirements

| Lapisan                 | Perilaku wajib                                                                                                                                                                               |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit konfigurasi/domain | Env wajib/URL invalid/secret kosong; no secret logging; provisioning no-op/conflict; operasi recovery menyusun transaksi yang benar.                                                         |
| HTTP Elysia native Bun  | Public tanpa cookie 200; private no/invalid/expired/revoked session 401; non-admin 403; dependency down gagal aman; scope tidak global; service tulis tidak dipanggil pada penolakan.        |
| Better Auth HTTP/DB     | Login benar/salah; signup dan email reset disabled; user non-admin tidak mendapat sesi baru; Origin asing/CSRF ditolak; rate limit 429; logout mencabut cookie/session.                      |
| PostgreSQL nyata        | Migrasi fresh dan re-run; singleton/FK; dua provision bersamaan menghasilkan satu admin; fault injection rollback seluruh row; reset atomik dan sesi lintas instance dicabut.                |
| Dokumentasi             | Auth prefix sekali, enabled routes, `$ref` resolve, konflik komponen tidak diam-diam overwrite, cookie security, public route tanpa security admin.                                          |
| Web transport/SSR       | Semua Set-Cookie utuh; upstream tetap; cookie request A tidak muncul di B; timeout/error; secret/server package tidak masuk browser; no-store.                                               |
| Browser manual          | Login sukses/salah/429/network error, submit ganda, redirect lokal aman, reload/direct URL, expiry, logout/recovery lintas tab, keyboard/focus/error announcement, mobile 390px dan desktop. |

Test unit/API di source memakai `bun:test`; suite DB tetap terpisah. Untuk helper transport web yang merupakan batas sesi, regression test terarah dapat memakai native Bun tanpa framework baru; rendering UI divalidasi melalui browser smoke dan gate web. Jangan menghitung mocked session sebagai bukti adapter auth nyata.

Perintah target dari root setelah script tersedia:

```sh
bun install --frozen-lockfile
bun test ./apps/api/src
bun test ./apps/api/test/integration
bun run lint
bun run check-types
bun run build
git diff --check
```

Suite integrasi wajib membaca `TEST_DATABASE_URL` eksplisit, memastikan database berbeda dari development/production, dan berhenti jika target tidak aman. Script API `test` menjadi `bun test ./src`, `test:integration` menjadi `bun test ./test/integration` dijalankan dengan cwd API. Command migrasi/provision/reset disediakan script API dan didokumentasikan lewat `bun run --filter=api <script>`, dengan verifikasi cwd/env script aktual. Tidak menambahkan CI atau test Turbo cached untuk database.

## Constraints

Ikuti AGENTS, API Development dan Global Workflow. Bun native didahulukan; alternatif driver butuh hasil proof dan alasan konkret. Jangan mengubah file env lokal tanpa kebutuhan/izin tersendiri, mencetak secret, atau menjalankan test destruktif pada DB dev. Tidak menambah shared package baru, placeholder domain media, admin user-management plugin umum, atau perubahan player. Preserve `docs/design/` dan output generated; operasi Git mengikuti permintaan pengguna berikutnya.

## Acceptance Criteria

- [ ] AC-01: Satu admin dapat diprovision melalui CLI; pengulangan tidak mengubah credential; percobaan kedua/bersamaan tidak memberi identitas admin tambahan atau row parsial. AUTH-003/005.
- [ ] AC-02: Login email/password admin bekerja lewat origin web; credential salah, signup publik, email reset yang tidak didukung, dan sesi user lain tidak membuka dashboard. AUTH-004/009/011.
- [ ] AC-03: API privat memeriksa sesi + user ID setiap request dan mengembalikan 401/403/503 yang tepat; public tetap tanpa login. AUTH-007.
- [ ] AC-04: Cookie dev dan production sesuai policy; Origin asing ditolak; rate limit 429; gateway mempertahankan Set-Cookie/no-store. AUTH-004/009.
- [ ] AC-05: SSR, direct URL, refresh, dan client navigation tidak menampilkan dashboard sebelum sesi sah; cookie antarrequest tidak tercampur. AUTH-010/012.
- [ ] AC-06: Logout sukses mencabut sesi dan cache privat; expired/revoked session meminta login; logout/network failure memberi pesan yang benar. AUTH-004/012.
- [ ] AC-07: Recovery CLI mengganti password dan mencabut semua sesi secara atomik; identitas admin tetap sama; failure tidak memberi keadaan parsial. AUTH-006.
- [ ] AC-08: Login dapat dipakai keyboard, ponsel dan desktop dengan label, pending/error, dan tujuan redirect yang aman. AUTH-011.
- [ ] AC-09: Eden type-only dan Scalar gabungan mencerminkan route/error/security aktif, tanpa server dependency/secret/token pada DTO SSR browser. AUTH-008/010.
- [ ] AC-10: Frozen install, test native, integration DB test terpisah, lint web, type-check semua workspace, build kedua app, dan runbook memiliki hasil nyata. AUTH-013.

## Risks and Mitigations

| Risiko                                             | Mitigasi                                                                                                                                                               |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Native driver/adapter transaksi tidak sesuai versi | Spike dahulu; transaction adapter default false di versi terpasang, set eksplisit setelah proof; jangan menyatakan seluruh login atomik hanya dari satu rollback test. |
| Provisioning menyisakan user/credential saat race  | Single transaksi untuk row dan singleton + database constraint; test race/fault injection.                                                                             |
| Email atau sesi biasa dianggap admin               | Persistent singleton user ID, session-create policy dan guard setiap request.                                                                                          |
| Cookie hilang ketika proxy/SSR                     | Canonical public URL, host-only cookie, multi Set-Cookie test, refresh sesi dinonaktifkan untuk tahap awal.                                                            |
| Shared cache mengungkap dashboard request lain     | Client/query per request, DTO terbatas, no-store, dua-request isolation test.                                                                                          |
| IP limiter berasal dari spoof header/proxy         | Fixed upstream, header trust eksplisit, proof runtime Bun; jangan percaya forwarded header browser.                                                                    |
| Dokumentasi auth menampilkan fitur disabled        | Filter berdasarkan konfigurasi, schema refs/security test, tidak menganggap generate otomatis sudah benar.                                                             |
| Build menginisialisasi auth/DB tanpa env runtime   | Lazy bootstrap/pure exports; build/type-only import tanpa pool/live DB.                                                                                                |

## Rollback or Recovery

Migrasi dijalankan eksplisit sesudah review SQL dan pemeriksaan schema yang ada. Simpan backup sebelum perubahan pada lingkungan berisi data. Utamakan forward-fix; rollback kode dapat menghentikan akses admin tanpa drop tabel. Jangan rollback dengan menghapus data auth secara otomatis. Recovery credential memakai CLI yang terdokumentasi dan mencabut seluruh sesi; rotasi secret adalah prosedur terpisah dengan dampak sesi diuji. Gateway tetap ditutup terhadap upstream yang tidak ditentukan ketika konfigurasi gagal.

## Evidence

Snapshot repo dan indeks bukti: [Repository Context](REPOSITORY_CONTEXT.md#evidence-index), SHA metadata. Keputusan pengguna pada chat 1 Oktober 2026 menetapkan metode login, recovery CLI, dan same-origin. Ketentuan satu admin/publik/Scalar/Eden/native test berasal dari dokumen repo yang ditinjau, bukan asumsi dari proyek lain.

Referensi primer diperiksa pada 1 Oktober 2026:

- [Drizzle Bun SQL](https://orm.drizzle.team/docs/connect-bun-sql): native driver tersedia; docs sekarang mencontohkan RC. Kandidat stabil harus diperiksa melalui package export dan proof versi terpasang.
- [Better Auth Drizzle adapter](https://better-auth.com/docs/adapters/drizzle): adapter PostgreSQL/schema mapping; gunakan generator auth dan migrasi Drizzle.
- [Better Auth options](https://better-auth.com/docs/reference/options) dan [email/password](https://better-auth.com/docs/authentication/email-password): konfigurasi metode login dan endpoint.
- [Session management](https://better-auth.com/docs/concepts/session-management): expiry/refresh/cookie cache/revocation. Default rencana di atas adalah pilihan proyek, bukan klaim default library.
- [Cookies](https://better-auth.com/docs/concepts/cookies): origin/cookie policy dan same-origin melalui proxy.
- [Rate limit](https://better-auth.com/docs/concepts/rate-limit): storage database dan schema limiter. Batas 5/60 adalah usulan proyek.
- [Elysia Better Auth](https://elysiajs.com/integrations/better-auth), [OpenAPI Better Auth](https://better-auth.com/docs/plugins/open-api): mount dan schema auth untuk dokumentasi gabungan.
- [TanStack Start server routes](https://tanstack.com/start/latest/docs/framework/react/guide/server-routes) dan [server functions](https://tanstack.com/start/latest/docs/framework/react/guide/server-functions): gateway raw HTTP dan akses SSR.
- Source library terpasang: Better Auth `dist/crypto/index.d.mts`, `dist/api/routes/sign-up.mjs`; Drizzle adapter `dist/index.d.mts` menjelaskan opsi `transaction` default false.
- Turbo bundled `docs/README.md` dan `docs/crafting-your-repository/using-environment-variables.mdx`: penerusan runtime env server web dan cache build.

Metadata npm diperiksa tanpa install: `drizzle-orm` stable **0.45.3**, `drizzle-kit` **0.31.11**, `@elysia/eden` **1.4.10**, `@elysia/openapi` **1.4.16**, `@elysiajs/cors` **1.4.2**. Export `drizzle-orm/bun-sql` ada pada **0.45.2** yang memenuhi peer adapter terpasang; rekomendasi awal mencoba **0.45.3** + **0.31.11**, memverifikasi peer/export/transaksi pada AUTH-001, dan tidak memilih RC otomatis. `@better-auth/drizzle-adapter` yang ditambahkan pada package pemilik harus cocok **1.7.7**; dependency ORM runtime dimiliki API, dengan peer pada auth bila adapter membutuhkan resolusi langsung. Versi final dicatat setelah proof, bukan dijamin oleh metadata ini.

## Open Decisions

Tidak ada keputusan produk auth yang menghalangi penyusunan rencana: metode login/recovery/origin sudah disetujui. Detail berikut adalah keluaran task terjadwal:

1. AUTH-001 selesai: `drizzle-orm` 0.45.3, `drizzle-kit` 0.31.11, Better Auth CLI/adapter 1.7.7; generated SQL diterapkan dengan Drizzle ORM Bun SQL pada database test lokal. Callback transaksi adapter dengan `transaction: true` rollback terbukti; atomicity endpoint sign-up multi-operation masih harus diverifikasi AUTH-004/005.
2. AUTH-002/004: catat default operasional password/sesi/limiter dan policy IP sesuai runtime; ubah nilai hanya bersama test/docs.
3. AUTH-009: pastikan server routes/headers/cookie bekerja pada TanStack Start/Nitro/Bun yang terpasang.
4. Deployment berikutnya: domain HTTPS, upstream, trusted reverse proxy/TLS. Modul lokal tidak mengklaim production sudah tervalidasi.

## Validation History

### 2026-10-01 — planning

- Result: **valid** pada snapshot lokal.
- Plan base/current target SHA: `bff1ced88f7ade37d454370ccf7d95a47cbf3aea`.
- Checked paths: manifests/source/config/docs dalam Evidence Index; instruksi AGENTS dan worktree status.
- Changed relevant tracked paths saat awal analisis: tidak ada; `docs/design/` untracked dan tidak disentuh.
- Decision: file/dependency/DAG/acceptance dipetakan; tidak ada aplikasi/migrasi/test production yang dieksekusi. Validasi ulang HEAD dan affected paths sebelum implementasi, serta periksa perubahan dokumen rencana yang masih uncommitted.

## Execution Log

Planning: context → plan → backlog ditinjau pada base SHA. Scope dan permintaan branch/commit tiap task disetujui pengguna pada 1 Oktober 2026. Branch `feat/auth-admin-module` dibuat dari base SHA. Dokumen rencana disimpan pada commit `a700e52`.

AUTH-001 — `Done`, commit `ad585f2`: dependency dikunci; schema Better Auth generated; Bun SQL/Drizzle/adapter diuji pada PostgreSQL 18.6 `vertical_movie_app_auth_test`; callback rollback, credential signup, HTTP login, dan get-session lulus (2 test/16 assertion). Frozen install, workspace type-check, full build, lint, Prettier source, dan diff check lulus.

AUTH-002 — `Done`, commit `85c379d`: env tervalidasi tanpa membocorkan nilai sensitif; Bun SQL/Drizzle client dan app lifecycle diinjeksi; bootstrap menangani shutdown; API mengekspor kontrak type-only dan factory auth tersedia di package pemilik. API unit suite, frozen install, workspace checks, startup lokal, dan diff check lulus. Perubahan same-origin hanya menyentuh sample dan nilai local API yang masih default; web `.env` kustom dipertahankan.

AUTH-003 — `Done`: generator Better Auth membuat enam tabel model termasuk limiter database; `admin_identity` menegakkan key `primary`, FK user, dan singleton. SQL migration dijalankan fresh dan rerun pada database lokal khusus test; adapter menggunakan schema hasil generator, constraint, dan rollback teruji. Script eksplisit memakai Bun SQL, cukup membaca DATABASE_URL, dan meredaksi kegagalan. Detail bukti dan command ada di backlog; task mendapat commit tersendiri setelah gates.

AUTH-004 — `Done`: login/logout/session Better Auth aktif dengan signup/recovery dan operasi akun lain disabled; session hanya dibuat bagi user pada `admin_identity`, berumur tetap 24 jam, tanpa cookie cache atau refresh. Origin web diperiksa pada setiap request dengan Origin; cookie HTTPS Secure/HttpOnly/SameSite=Lax dan host-only; limiter database menolak percobaan keenam per menit tanpa mempercayai header IP dari klien. HTTP/DB runtime proof pada database khusus test lulus 8 test/44 assertion; fixture admin hanya membuktikan kebijakan sesi, bukan provisioning. Detail gates serta batas bucket rate limit ada di backlog.

Validasi context dokumen sebelum eksekusi: Prettier lulus pada empat dokumen; pemeriksa Bun memvalidasi 24 tautan lokal, 13 task contract, dependensi DAG dan acceptance AC-01..AC-10.
