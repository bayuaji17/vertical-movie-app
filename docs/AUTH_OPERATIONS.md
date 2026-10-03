# Operasi auth admin

Auth dimiliki `@repo/auth`: API menyuntikkan satu pool Bun SQL/Drizzle ke factory server, web memakai client native tanpa koneksi database. Command operator membaca env API tervalidasi dan tidak membuka HTTP listener. Jalankan command dari root dengan Bun 1.4.2. Jangan menaruh password pada argumen, history, file repo, atau output.

## Seed admin

Sesudah schema dimigrasikan dan env API tersedia:

```sh
bun run --cwd apps/api admin:provision -- admin@example.com "Admin"
```

Wrapper menjalankan **CLI resmi auth 1.7.7 `create-admin`** yang terpasang di workspace dengan config `apps/api/src/auth.ts`. Masukkan password pada prompt native tersembunyi (12–128 karakter). Role dipatok `admin`. Constraint database membatasi satu admin; seed berikutnya gagal dan tidak mengganti password akun existing. Command bukan operasi reset. CLI native dapat meninggalkan user tanpa credential jika account linking gagal; pulihkan identitas tersebut melalui reset native dalam maintenance, bukan insert/hash SQL buatan aplikasi.

## Recovery maintenance

1. Hentikan **seluruh instance API yang menerima login**, termasuk replica, worker HTTP, dan proses development. Pastikan request login yang sedang berjalan selesai/dibatalkan. Status health satu origin tidak membuktikan semua instance berhenti. Wrapper tidak menghentikan proses secara otomatis.
2. Pastikan backup dan akses operator ke database yang benar. Env API harus memakai origin/secret/schema yang sama dengan aplikasi.
3. Jalankan command berikut hanya setelah kondisi maintenance dipenuhi. Flag menyatakan konfirmasi operator; flag tidak mengunci/menghentikan instance lain.

```sh
bun run --cwd apps/api admin:reset-password -- admin@example.com --maintenance-confirmed
```

4. Masukkan password baru melalui prompt tersembunyi. Command memanggil `requestPasswordReset` dan `resetPassword` native; callback token hanya berada dalam memori instance operator. Tidak ada email, sesi admin, password flag, atau endpoint recovery publik. `revokeSessionsOnPasswordReset` aktif; hasil sukses juga memeriksa daftar sesi native sudah kosong. Pool ditutup dalam `finally`.
5. Hanya sesudah command sukses dan pencabutan terverifikasi, hidupkan API kembali. Verifikasi cookie sesi lama ditolak guard authoritative, password lama gagal, dan password baru berhasil. Snapshot UI/cookie cache dapat bertahan sementara; keputusan akses API selalu membaca sesi authoritative.

**Failure parsial:** reset native 1.7.7 mengonsumsi token, mengubah password, lalu mencabut sesi; seluruh urutan bukan satu transaksi. Jika update/revoke gagal, command memberi exit nonzero dan API tetap harus berhenti. Periksa schema/koneksi, perbaiki penyebab, lalu ulangi command untuk token baru dan reset/revoke native. Jangan reuse token, jangan melakukan writer SQL/password hashing sendiri, dan jangan restart sebelum sesi lama dicabut. Native reset juga dapat membuat credential account yang hilang akibat seed parsial.

**Batas concurrency:** proof lokal menahan verifikasi login lama, menjalankan reset/revoke, lalu melanjutkan login; sesi baru dari login lama masih bisa terbentuk. Karena itu reset online tidak dijanjikan atomic. Maintenance tanpa penerima/login in-flight adalah prasyarat MVP.

Endpoint HTTP operator (`admin/*`, signup, request/reset password, change password, dan mutasi profil) ditutup pada factory normal maupun instance recovery. Factory membedakan native server API calls dari request HTTP; fungsi operator tidak dipasang pada server HTTP.

## Migrasi expand → cutover → contract

Migrasi tidak berjalan saat API start dan tidak dijalankan otomatis pada database development/deployment. Verifikasi `DATABASE_URL` sendiri; jangan memakai variabel proof untuk deployment. Pada pemeriksaan akhir refactor, database development masih baseline. Pada 2 Oktober 2026, expand dan contract kemudian diterapkan pada `vertical_movie_app` di localhost:5433: journal berisi tiga migration, role admin native aktif, dan tabel `admin_identity` telah dihapus. ID admin, credential account, hash password, dan seluruh sesi existing diverifikasi tetap sama; tidak dilakukan seed atau reset password. Pembacaan user/account melalui adapter native berhasil, API root dan `/api/auth/get-session` anonymous kembali 200, dan OpenAPI native tersedia. Ini belum membuktikan login memakai password existing pada database development.

Backup custom-format PostgreSQL sebelum migrasi disimpan di luar repo pada `/home/bandev/.local/state/vertical-movie-app/backups/auth-before-native-1790958748407.dump` (direktori 700, file 600). Archive berhasil dibaca oleh `pg_restore --list`; restore penuh ke database lain belum diuji. Satu proses API development ditangguhkan selama backup/migrasi dan dilanjutkan kembali sesudah verifikasi. Deployment tetap memerlukan backup/restore dan cutover pada targetnya sendiri.

1. Backup PostgreSQL sebelum perubahan dan uji prosedur restore pada target operasional. Hentikan penerima login/mutasi auth selama migrasi. Backup mencakup user, account, session, verification, rate limiter dan journal Drizzle.
2. Jalankan ekspansi terbatas berikut. Command menyalin journal sampai migration `0001_native-admin-expand` ke folder sementara, menerapkannya, dan membersihkan folder/pool. `0000` dan `0001` tidak diubah.

```sh
bun run --cwd apps/api db:migrate -- --stage=expand
```

Ekspansi menambah role/ban/impersonation, backfill admin dari identity existing, serta constraint role canonical dan unique partial index satu admin. Preflight menolak identity tanpa credential. ID, email, hash, dan sesi tidak ditulis ulang.

3. Deploy kode native refactor ke **semua** API/web dan CLI operator. Verifikasi login existing, guard authoritative, SSR, logout, dan command operator. Schema expand masih memiliki tabel legacy sehingga rollback aplikasi sebelum contract dapat memakai snapshot sebelumnya; hentikan mutasi auth selama rollback, terutama seed native yang tidak membuat identity legacy. Jangan menjalankan operator lama bersama operator baru.
4. Sesudah semua consumer native dan verifikasi cutover selesai, stop penerima login/mutasi dan ambil backup cutover. Terapkan contract:

```sh
bun run --cwd apps/api db:migrate -- --stage=contract
```

Command contract menerapkan semua migration pending. Migration `0002_native-admin-contract` memeriksa identity legacy cocok dengan role admin dan credential sebelum DROP tabel singleton. DROP tanpa CASCADE menolak dependency tak terduga. Migration ulang idempotent. `db:migrate` tanpa flag juga menerapkan semua migration pending; gunakan tahap eksplisit untuk rollout bertahap di atas. Pada database kosong, seluruh migration dapat dijalankan sebelum seed native.

5. Verifikasi kembali akses admin dan native recovery pada schema final, baru buka API. Setelah DROP, aplikasi lama yang membaca `admin_identity` tidak kompatibel. Rollback membutuhkan restore backup konsisten saat semua penerima berhenti, atau forward fix native; tidak ada otomatis down migration. Jangan mengedit migration historis atau membuat singleton lewat SQL ad hoc.

Proof upgrade/contract berjalan hanya pada database PostgreSQL test yang dijaga host/nama. Ia membuktikan hash/ID/sesi existing tetap sama, login sebelum/sesudah contract berhasil, dan preflight mismatch menggagalkan DROP.

## Session dan cache

| Lapisan | Perilaku | Batas |
| --- | --- | --- |
| Better Auth session | Expiry tetap 24 jam; refresh sesi dimatikan | Login ulang setelah expiry. |
| Cookie cache native | Maksimum 60 detik; refresh cache dimatikan | Membantu pembacaan UI, bukan izin operasi privat. |
| TanStack Query | Satu key `['auth', 'session']`, whitelist snapshot/null, fresh maksimum 60 detik dibatasi expiry, retry otomatis dimatikan | Cache baru tiap router/request SSR; navigasi/preload fresh tidak fetch, stale concurrent dideduplicate. |
| Observer layout admin | Poll 60 detik hanya online/visible; focus/reconnect stale revalidates; timer expiry menutup UI | Background/offline tidak menjanjikan revocation langsung. |
| API guard privat | Native `getSession` dengan `disableCookieCache: true` setiap request, lalu role/ban/expiry | 401 missing/expired/revoked; 403 user/banned; 503 dependency failure. |
| SSR/gateway HTTP | `private, no-store`, fixed API internal origin, deadline 10 detik termasuk body | Cookie cache bukan HTTP/CDN cache. UI outage menutup konten privat meskipun cache lama ada. |

TTL Query dan cookie cache dapat menambah delay tampilan perubahan sesi/role hingga kira-kira dua jendela cache pada tab aktif, ditambah latency. Guard API tidak memakai jendela ini. Logout sukses membatalkan fetch, menghapus private query/data, dan mengirim notifikasi lintas tab tanpa token/snapshot; logout gagal tidak mengaku sesi tercabut. Login melakukan satu pembacaan authoritative sebelum navigasi. Halaman `/admin/login` memeriksa Query yang sama pada beforeLoad: admin aktif diarahkan ke return target admin tervalidasi (default `/admin`) sebelum form dirender, termasuk SSR/direct URL. Guard login tidak logout atau menghapus cache/cookie; navigasi fresh tidak menambah read. Anonymous/non-admin/banned/expired tetap dapat membuka form. Bila pemeriksaan dependency gagal, form tersedia dan data stale tidak dipakai untuk redirect. Response 401 dari API privat membersihkan snapshot; 403/5xx memicu revalidasi. Eden bisnis menggunakan `createPrivateApiClient` secara eksplisit, terpisah dari SDK auth.

## Validasi lokal dan deployment

`auth:adapter:proof`, `auth:schema:proof`, `auth:runtime:proof`, `auth:admin:proof`, `auth:recovery:proof`, `auth:authorization:proof`, `auth:openapi:proof` berada pada app API. Jalankan serial karena sebagian berbagi dedicated database. API unit memakai Bun native tanpa port/database. Web menyediakan `auth:gateway:proof`, `auth:session:proof`, `auth:login:proof`, `auth:guard:proof`, `auth:import:proof`, `auth:ssr:smoke`, `auth:gateway:smoke`, dan `auth:browser:smoke`. Negative import proof memulihkan fixture dalam finally; build normal harus diulang sesudahnya.

Browser runner dikonfigurasi dengan `AUTH_BROWSER_NODE`, `AUTH_PLAYWRIGHT_MODULE`, `AUTH_BROWSER_EXECUTABLE`, dan `AUTH_BROWSER_WORKER_PATH` sesuai runtime/path yang terpasang. Worker path harus dapat dibaca runner dan bukan file sumber repo. Web browser smoke memakai native SDK dengan HTTP fixture yang dapat mensimulasikan outage/race; `AUTH_BROWSER_RUNTIME=built AUTH_BROWSER_PHASE=all` menguji dua suite pada hasil build Bun/Nitro. API `auth:browser:smoke` memakai **Better Auth asli + PostgreSQL dedicated + Elysia + hasil build web**, bukan fixture respons auth. Command API tersebut mereset database admin proof, jadi tetap jalankan serial dan set `AUTH_ADMIN_TEST_DATABASE_URL` ke database test yang diizinkan.

Bukti lengkap dan commit per task berada pada [backlog auth](tasks/auth.md). Browser lokal Chromium lolos pada viewport mobile 390×844; cache/network suite juga berjalan di desktop. Hasil build lokal bukan deployment production. Domain/TLS, backup/restore target, reverse proxy, browser/perangkat lain dan production smoke masih pending. API belum mempercayai header IP proxy; Better Auth memakai bucket limiter bersama per-path saat IP tidak tersedia. Konfigurasi trusted proxy/IP harus dibuktikan pada deployment sebelum mengaktifkan header tersebut. Tidak ada GitHub CI baru.
