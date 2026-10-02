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
