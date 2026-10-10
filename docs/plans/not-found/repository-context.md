# Repository context: Halaman Not Found frontend

## Snapshot

- Repository: `bayuaji17/vertical-movie-app`.
- Base ref: `main`; base SHA: `e94699d82b8f38dd5d2ffdc2db86cdf4f6779f55`.
- Analyzed at: 10 Oktober 2026 (Asia/Jakarta).
- Context status: snapshot perencanaan pada SHA di atas; periksa freshness sebelum implementasi.
- Planning branch: `chore/not-found-plan`.
- Request: pengguna meminta plan halaman not found; 10 Oktober 2026 pengguna memutuskan satu halaman 404 untuk semua kasus dengan satu tombol kembali ke home.

## Observed behavior

- URL yang tidak cocok dengan rute (`/nope`, `/admin/nope`) sudah dijawab HTTP 404, tetapi body hanya teks bawaan TanStack Router "Not Found" di dalam `<body>` tanpa shell, header, navigasi, token desain atau tema. Diamati dengan `curl` ke dev server pada SHA ini; title halaman hanya nama situs.
- Tidak ada `notFoundComponent`, `defaultNotFoundComponent` atau pemakaian `notFound()` pada `apps/web/src` selain yang disebut di bawah. `getRouter()` pada `apps/web/src/router.tsx` tidak mengatur penanganan not-found; root route `apps/web/src/routes/__root.tsx` hanya mendefinisikan `shellComponent`.
- `apps/web/src/start.ts` sudah mempertahankan status 403/404/503 dari `getResponseStatus()`, sehingga status 404 untuk URL tak dikenal tidak boleh hilang setelah halaman baru dibuat.
- Konten publik yang hilang saat ini ditangani per halaman: `routes/titles.$kind.$slug.tsx`, `components/public/video-detail.tsx` ("Video unavailable") dan `components/catalog/content-page.tsx` ("Title unavailable") menampilkan kartu sendiri meski status HTTP sudah 404. Redirect 307 pada `/videos/:slug` dan `/watch/:slug` berasal dari `normalizeCatalogLocation` (menambah `?type=all`), bukan dari penanganan slug tak ada; setelah redirect slug tak ada berstatus 404 dengan kartu tersebut. Halaman admin menampilkan "Content not found"/"Season not found"/"Episode not found" di dalam shell admin.
- Semua halaman publik dan admin sudah memakai `robots: noindex, nofollow` sementara; kebijakan indexing final masih keputusan terbuka pada [PRD](../../product/prd.md#keputusan-produk-yang-masih-terbuka).

## Repository map (bagian relevan)

| Area                                                  | Peran                                                                         |
| ----------------------------------------------------- | ----------------------------------------------------------------------------- |
| `apps/web/src/router.tsx`                             | Pembuatan router; tempat `defaultNotFoundComponent`.                          |
| `apps/web/src/routes/__root.tsx`                      | Shell dokumen, tema, settings head sync.                                      |
| `apps/web/src/routes/admin.tsx`                       | Layout `/admin` (subscribe auth change); parent login dan rute terotentikasi. |
| `apps/web/src/components/public/public-shell.tsx`     | Shell publik (header, tema, footer dari Site Settings).                       |
| `apps/web/src/components/catalog/appearance-menu.tsx` | Menu tema yang dipakai shell publik.                                          |
| `apps/web/src/components/ui/`                         | Primitive shadcn Base UI (`Button`, `Alert`, dll.).                           |
| `apps/web/src/start.ts`                               | Middleware status respons 403/404/503.                                        |
| `apps/web/test/*.test.ts(x)`, `*-ssr-smoke.mjs`       | Pola test unit dan smoke SSR yang dapat dipakai ulang.                        |
| `docs/design/design-system.md`                        | Acuan visual (Rhea, light/dark, token).                                       |

## Constraints dari repo

- Jangan edit `apps/web/src/routeTree.gen.ts` manual; hooks aplikasi berada di `apps/web/src/hooks/use-*.ts`.
- Halaman harus aman untuk anonim: tidak boleh membaca sesi admin, memuat data privat, atau membedakan respons untuk path `/admin/*` berdasarkan status login.
- Teks UI publik dan admin saat ini berbahasa Inggris; mengikuti itu kecuali pengguna memutuskan lain.
- Verifikasi lokal tidak menyatakan kesiapan production. Perubahan hanya frontend: tanpa schema, env atau dependensi baru.
