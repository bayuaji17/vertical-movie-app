# Implementation plan: Halaman Not Found frontend

## Plan metadata

- Status: **implemented lokal** (10 Oktober 2026): NF-001–005 Done, NF-006 Review karena bukti browser parsial; bukan klaim kesiapan production.
- Date: 10 Oktober 2026; decision owner: pengguna.
- Repository: `bayuaji17/vertical-movie-app`; base ref: `main`; base SHA: `e94699d82b8f38dd5d2ffdc2db86cdf4f6779f55`.
- Context: [repository-context.md](repository-context.md), disimpan sebelum plan ini.
- Backlog: [not-found](../../tasks/not-found.md), NF-001–006.
- Planning branch: `chore/not-found-plan`; implementation branch (saran): `feat/not-found-page`.

## Objective

Semua URL yang tidak dapat dipenuhi menampilkan **satu** halaman 404 yang sama, dengan HTTP 404, `noindex` dan satu tombol "Back to home" ke `/`.

## Keputusan pengguna (10 Oktober 2026)

- `/admin/*` yang tidak dikenal tetap mengembalikan not found (halaman yang sama dengan publik).
- `/videos/:slug` dan `/watch/:slug` yang tidak ada mengembalikan not found, bukan kartu "unavailable" per halaman.
- Hanya satu halaman not found; satu tombol yang mengarah ke home.

## Goals dan non-goals

Goals: satu komponen `NotFoundPage` tanpa varian; `defaultNotFoundComponent` pada router; rute publik dengan slug tak ada (`/videos/$slug`, `/watch/$slug`, `/titles/$kind/$slug`, `/series/$slug`) melempar `notFound()` bila API menjawab 404/422; title/robots/status benar; aksesibel dan responsif; test dan bukti browser.

Non-goals: error 503/gangguan jaringan pada konten (tetap state Retry yang ada); not-found di dalam editor admin yang valid (`Content not found` pada `/admin/content/:id` dan sejenisnya tetap, karena itu rute sah dengan data hilang — dicatat sebagai keputusan terbuka); halaman error 500 umum; pencarian di halaman 404; kebijakan indexing final; perubahan API, schema, env atau dependensi.

## Current behavior

Lihat [context](repository-context.md#observed-behavior): 404 sudah berstatus benar tetapi hanya teks polos bawaan router tanpa shell/tema/navigasi.

## Desired behavior

- **Satu halaman:** heading "Page not found", penjelasan singkat generik dan satu tombol "Back to home" (`/`). Tanpa path yang diminta, tanpa tautan lain. Tampil di dalam document root (ThemeProvider), tanpa shell admin dan tanpa membaca sesi, sehingga identik untuk anonim dan admin.
- **Sumber 404:** URL tanpa rute (termasuk `/admin/*`) dan konten publik yang tidak ada (API 404/422) pada `/videos/$slug`, `/watch/$slug`, `/titles/$kind/$slug`, `/series/$slug`. Gangguan sementara (503/jaringan) tetap memakai state error dengan Retry yang sudah ada, bukan 404.
- **Status HTTP:** tetap 404 melalui `start.ts`; title `Page not found · {siteName}`, `robots: noindex, nofollow`.
- **Redirect kanonik:** `normalizeCatalogLocation` menambahkan `?type=all` (307) sebelum loader. Slug tak ada tetap menerima 307 lalu 404 pada URL kanonik; hasil akhir 404. Menghilangkan 307 ini memerlukan pengecekan slug sebelum redirect dan tidak termasuk plan ini kecuali pengguna meminta.
- **Tema/aksesibilitas:** token semantik, Light/Dark/System tanpa flash; satu `h1`, landmark `main`, fokus terlihat, tombol ≥44 px, tanpa overflow horizontal pada 320 px.
- **Copy:** Inggris, selaras dengan UI saat ini.

## Impact analysis

Hanya `apps/web`. Risiko rendah: perubahan terkonsentrasi pada router/komponen baru. Risiko utama: (1) menimpa status 404 oleh render router; (2) pembaruan root `loader` Site Settings gagal sehingga halaman 404 ikut gagal; (3) shell publik bergantung pada Query context yang harus tersedia di root.

## Affected files and symbols

| File                                                                                                    | Perubahan                                                                                                             |
| ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `apps/web/src/components/not-found-page.tsx` (baru)                                                     | `NotFoundPage` tunggal dengan satu tombol ke `/`.                                                                     |
| `apps/web/src/router.tsx`                                                                               | `defaultNotFoundComponent`.                                                                                           |
| `apps/web/src/routes/__root.tsx`                                                                        | Pastikan halaman dirender di dalam `ThemeProvider`; fallback `defaultSiteSettings`.                                   |
| `apps/web/src/routes/videos.$slug.tsx`, `watch.$slug.tsx`, `titles.$kind.$slug.tsx`, `series.$slug.tsx` | Loader melempar `notFound()` untuk 404/422; komponen "unavailable" untuk kasus ini dihapus atau tidak lagi dijangkau. |
| `apps/web/test//not-found-*.test.tsx`, `*-ssr-smoke.mjs`                                                | Test unit render dan smoke SSR status/robots/no-leak.                                                                 |
| `docs/design/not-found.md` (baru, bila NF-001 disetujui)                                                | Spesifikasi komponen/state yang disetujui.                                                                            |
| `docs/README.md`, `docs/tasks/not-found.md`                                                             | Indeks dan backlog.                                                                                                   |

## Implementation DAG

NF-001 (persetujuan desain) → NF-002 (komponen) → NF-003 (router/URL tak dikenal) dan NF-004 (konten publik hilang) → NF-005 (test) → NF-006 (bukti browser dan closure).

## Implementation steps

1. **NF-001** Pengguna menyetujui copy dan tata letak; tulis `docs/design/not-found.md` ringkas.
2. **NF-002** Bangun `NotFoundPage` tunggal (satu tombol "Back to home").
3. **NF-003** Pasang `defaultNotFoundComponent`; head title/robots; pastikan `/admin/*` tak dikenal memakai halaman yang sama tanpa memicu guard sesi.
4. **NF-004** Ubah loader rute publik berslug agar `notFound()` dilempar untuk 404/422; pertahankan status 404 dan state Retry untuk 503.
5. **NF-005** Test: render halaman, SSR smoke (status 404, robots, tanpa pantulan path, anonim = admin), slug tak ada → 404 pada empat rute, 503 tetap Retry.
6. **NF-006** Chromium dev/built: 320/390/768/1440 × Light/Dark/System, keyboard, tanpa overflow; perbarui dokumen.

## Test requirements

`bun test` untuk test baru dan suite web terdampak; `bun run check-types`, `bun run lint`, `bun run build`; SSR smoke pada hasil build; `bun run docs:check` untuk perubahan dokumen. Browser proof memakai runner yang tersedia; jika tidak ada, catat sebagai belum diuji, bukan lulus.

## Constraints

Aturan root `AGENTS.md`: tanpa edit `routeTree.gen.ts`, hooks di `src/hooks/`, komponen di `src/components`, commit per task dengan ID task, tanpa bypass hook, push/PR/merge sesuai otorisasi pengguna.

## Acceptance criteria

- [x] URL tak dikenal (termasuk `/admin/*`) menampilkan satu halaman 404 dengan HTTP 404, `noindex, nofollow` dan satu tombol ke home (dev server; title SSR masih nama situs).
- [x] Slug tak ada pada `/videos/$slug`, `/watch/$slug`, `/titles/$kind/$slug` dan `/series/$slug` menampilkan halaman yang sama; 503/jaringan tetap state Retry.
- [x] Respons tidak berbeda untuk anonim dan admin; tidak ada pembacaan sesi.
- [ ] Light/Dark/System, 320–1920 px, keyboard dan target 44 px terbukti pada browser.
- [ ] Tests, check-types, lint, build dan docs:check lulus; evidence dicatat per task.

## Risks and mitigations

| Risiko                                      | Mitigasi                                                                          |
| ------------------------------------------- | --------------------------------------------------------------------------------- |
| Router menimpa status 404                   | Smoke SSR memeriksa status; `start.ts` sudah mempertahankan 404.                  |
| Root loader settings gagal pada halaman 404 | Fallback `defaultSiteSettings`; test dengan upstream settings gagal.              |
| Kebocoran status login lewat `/admin/*`     | Satu halaman tanpa sesi; test membandingkan anonim vs sesi fixture.               |
| 404 salah untuk gangguan sementara          | Hanya 404/422 yang memicu `notFound()`; 503/jaringan tetap Retry; test eksplisit. |
| Pantulan path ke HTML                       | Tidak menampilkan path; test dengan path berisi markup.                           |

## Rollback or recovery

Hapus `defaultNotFoundComponent` dan komponen baru; perilaku kembali ke teks bawaan router. Tidak ada schema/env/data yang berubah.

## Decisions

Disetujui pengguna 10 Oktober 2026:

1. Halaman admin sah dengan data hilang (`/admin/content/:id`, season/episode) tetap memakai "Content not found" di shell admin.
2. Redirect 307 kanonik `?type=all` tetap.
3. Copy berbahasa Inggris.

## Evidence

Observasi `curl` 10 Oktober 2026 pada dev server: `/nope` dan `/admin/nope` → 404 dengan teks polos; `/videos/nope` → 307 ke `?type=all` (kanonikalisasi), lalu 404 dengan kartu "Video unavailable". Belum ada proof implementasi.

## Execution log

- 10 Oktober 2026: context dan plan ditulis pada base SHA di atas; status proposed.
- 10 Oktober 2026: pengguna memutuskan satu halaman 404 untuk semua kasus (`/admin/*`, `/videos/:slug`, `/watch/:slug`) dengan satu tombol ke home; plan diperbarui.
- 10 Oktober 2026: pengguna menyetujui tiga keputusan sisa (admin sah tetap, 307 tetap, copy Inggris); plan approved.
- 10 Oktober 2026: NF-001–005 diimplementasikan dan di-commit pada `feat/not-found-page` (6999e45, ef45165, 3c6db7b, 1c88ac9, 84d2d80); NF-006 closure dengan batas bukti browser pada backlog.
