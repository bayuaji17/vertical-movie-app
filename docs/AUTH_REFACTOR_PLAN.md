# Revisi auth: Better Auth sebagai pemilik lifecycle

- Status: rencana refactor; kode saat ini belum mengikuti seluruh revisi ini.
- Tanggal: 2 Oktober 2026, Asia/Jakarta.
- Dasar: arahan pengguna untuk memakai Better Auth pada session, login, password recovery, role, dan seed admin, serta mengurangi request sesi saat navigasi.
- Versi yang diperiksa: Better Auth dan CLI `auth` 1.7.7 pada lockfile dan source terpasang.
- Scope produk tetap: satu admin, email/password, signup publik nonaktif, recovery melalui CLI lokal tanpa layanan email, dan satu origin publik web/API.
- Implementasi AUTH-001–013 merupakan riwayat implementasi sebelumnya. Dokumen ini mengubah desain berikutnya; tidak menyatakan refactor sudah dijalankan.

## Keputusan desain

| Area | Pemilik dan penggunaan berikutnya |
| --- | --- |
| Login/logout | SDK Better Auth `signIn.email` dan `signOut`, dengan handler native. |
| Session | `auth.api.getSession` pada API dan endpoint native `/api/auth/get-session`; React memakai `authClient.useSession`. Tidak memakai Eden sebagai lifecycle auth. |
| Role/permission | Plugin `admin()`/`adminClient()` serta access control Better Auth. Guard rute bisnis hanya mengintegrasikan hasil session/permission library. |
| Seed admin | CLI resmi `auth create-admin` setelah konfigurasi plugin dan migrasi tersedia. Password melalui prompt CLI, bukan argumen atau dokumentasi. |
| Recovery tanpa email | Wrapper operator yang memanggil `requestPasswordReset` dan `resetPassword` native. Callback `sendResetPassword` hanya pada instance CLI menangkap token di memori; token tidak dicetak. Aktifkan `revokeSessionsOnPasswordReset: true`. |
| Database | Schema/migrasi Drizzle tetap dikelola API, mengikuti schema Better Auth dan plugin admin. Tidak ada penulisan/hash credential atau penghapusan session buatan aplikasi. |
| Transport | Gateway same-origin tetap diperlukan karena Better Auth berada pada API Elysia. Gateway meneruskan cookie/status dan menerapkan deadline; ia tidak menentukan lifecycle auth. |

`admin.setUserPassword` pada versi ini membutuhkan session admin dan tidak otomatis mencabut session. Karena itu operasi tersebut tidak menggantikan recovery satu-satunya admin yang lupa password. Jalur request/reset native dengan callback CLI mempertahankan scope tanpa layanan email. Endpoint recovery HTTP publik tetap ditutup; kemampuan recovery hanya tersedia dalam proses operator lokal.

Plugin admin mendukung lebih dari satu admin. Aturan satu admin merupakan invariant produk, bukan kemampuan otomatis plugin. Migrasi memakai role Better Auth sebagai sumber kebenaran dan mempertahankan invariant melalui constraint yang sesuai. Akun admin development yang sudah ada dimigrasikan; tidak dibuat ulang dan credential tidak diganti.

## Cache session

1. Satu subscription `useSession` berada pada layout admin yang tetap mounted saat berpindah ke halaman anak. Guard browser tidak memanggil `fetchQuery({ staleTime: 0 })` atau `getSession` pada setiap navigasi. Gunakan lifecycle refresh/invalidation native setelah login/logout, perubahan session, fokus kembali, dan reconnect.
2. Usulan awal client: `sessionOptions.refetchInterval: 60`, `refetchOnWindowFocus: true`, dan `refetchWhenOffline: false`. Polling dan lifecycle native memberikan revalidasi; mount awal boleh melakukan satu revalidasi. Jangan menjanjikan semua perpindahan lintas layout atau refresh dokumen tanpa request.
3. Usulan awal server: `session.cookieCache.enabled: true`, `maxAge: 60`, dan `refreshCache: false`. Cookie cache mempersingkat pembacaan database; request ke endpoint session tetap terjadi saat client melakukan revalidasi. Cache ini bukan cache HTTP bersama.
4. Untuk operasi bisnis privat yang sensitif, gunakan `getSession({ query: { disableCookieCache: true }, headers })` dan permission library dari identitas terkini sebelum service dijalankan. Cache UI tidak memberikan izin melakukan operasi API.
5. Refresh dokumen/SSR tetap memeriksa session per request dengan deadline dan meneruskan cookie hanya ke API internal tetap. Rahasia Better Auth tetap hanya berada pada API. `hydrateSession` tersedia pada client versi terpasang; gunakan bila payload native/customSession yang aman serta tipe inferensinya sudah dibuktikan. Hydration tidak menjamin mount awal tanpa revalidasi.
6. Role/session yang dicabut dapat sementara masih terlihat di UI sampai revalidasi. TTL cookie dan interval client adalah dua lapisan berbeda; jangan mengklaim batas gabungannya hanya 60 detik. Uji batas tampilan dan penolakan operasi sensitif secara terpisah.

## Urutan implementasi

Acceptance criteria dan bukti per task dicatat pada [backlog auth](tasks/auth.md). Seluruh task berikut masih Backlog:

- AUTH-REF-001 — Konfigurasi dan kontrak native Better Auth
- AUTH-REF-002 — Migrasi role dan admin yang sudah ada
- AUTH-REF-003 — Seed dan recovery melalui API/CLI library
- AUTH-REF-004 — Session native, cache client, dan guard API
- AUTH-REF-005 — Transport, dokumentasi, dan regression suite

## Referensi

- [Better Auth Admin plugin dan CLI create-admin](https://better-auth.com/docs/plugins/admin).
- [Session management dan cookie cache](https://better-auth.com/docs/concepts/session-management).
- [Password reset dan revokeSessionsOnPasswordReset](https://better-auth.com/docs/authentication/email-password).
- [TanStack Start integration](https://better-auth.com/docs/integrations/tanstack).

Fungsi `hydrateSession`, kebutuhan session pada `setUserPassword`, dan dukungan seed CLI juga diperiksa pada source/declaration versi 1.7.7 yang terpasang. TTL 60 detik merupakan usulan implementasi awal, bukan hasil benchmark atau perubahan yang sudah aktif.
