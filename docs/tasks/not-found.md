# Modul: Halaman Not Found

> Status: plan approved · 10 Oktober 2026 · Pengguna meminta plan dan memutuskan satu halaman 404 untuk semua kasus dengan satu tombol ke home (10 Oktober 2026); belum ada implementasi. Plan: [implementation-plan](../plans/not-found/implementation-plan.md), context: [repository-context](../plans/not-found/repository-context.md). Base SHA `e94699d82b8f38dd5d2ffdc2db86cdf4f6779f55`.

## Tujuan modul

Semua URL yang tidak dapat dipenuhi (rute tak dikenal termasuk `/admin/*`, serta slug konten publik yang tidak ada) menampilkan satu halaman 404 dengan status HTTP 404, `noindex` dan satu tombol kembali ke home. Referensi: PRD-07/08, GR-02/08.

## User story: NF-US-01

Sebagai pengunjung, saya ingin halaman 404 yang jelas dengan satu tombol kembali ke home, sehingga saya tidak buntu saat membuka URL yang salah.

## User story: NF-US-02

Sebagai pengguna, saya ingin URL `/admin/*`, `/videos/:slug` atau `/watch/:slug` yang salah menampilkan halaman 404 yang sama, sehingga perilakunya konsisten dan status login tidak terbongkar.

## Task: NF-001 — Setujui desain dan keputusan terbuka

- Status: Backlog
- Owner: Pengguna (keputusan) / agent (spesifikasi)
- Prioritas: 1
- Referensi: NF-US-01/02; plan bagian Open decisions
- Diperbarui: 2026-10-10
- Dependensi: tidak ada
- Ukuran: kecil

### Ruang lingkup

Keputusan terbuka sudah disetujui pengguna 10 Oktober 2026 (lihat plan); tulis `docs/design/not-found.md` (copy, tata letak, state, breakpoint) dan perbarui `docs/README.md`.

### Acceptance criteria

- [x] Keputusan terbuka dicatat beserta pemberi persetujuan dan tanggal (plan, 10 Oktober 2026).
- [ ] Spesifikasi desain disetujui pengguna.

### Validasi

`bun run docs:check`, Prettier, `git diff --check`.

### Hasil dan bukti

Belum dikerjakan.

### Commit task

- Pesan: `docs(web): specify not-found page (NF-001)`
- SHA: belum dibuat

### Blocker atau tindak lanjut

Menunggu persetujuan pengguna.

## Task: NF-002 — Komponen NotFoundPage

- Status: Backlog
- Owner: Pengembang/agent pelaksana
- Prioritas: 2
- Referensi: NF-US-01/02; design system
- Diperbarui: 2026-10-10
- Dependensi: NF-001
- Ukuran: kecil

### Ruang lingkup

`apps/web/src/components/not-found-page.tsx`: satu halaman tanpa varian, token semantik, satu `h1`, landmark `main`, satu tombol "Back to home" ke `/` (≥44 px). Tanpa hook sesi.

### Acceptance criteria

- [ ] Halaman menampilkan heading, penjelasan generik dan satu tombol ke home.
- [ ] Tidak memanggil hook sesi dan tidak merender path yang diminta.

### Validasi

Test render komponen; `bun run check-types`, `bun run lint`.

### Hasil dan bukti

Belum dikerjakan.

### Commit task

- Pesan: `feat(web): add not-found page component (NF-002)`
- SHA: belum dibuat

### Blocker atau tindak lanjut

Tidak ada.

## Task: NF-003 — Router: URL tak dikenal termasuk /admin/*

- Status: Backlog
- Owner: Pengembang/agent pelaksana
- Prioritas: 3
- Referensi: NF-US-01/02; `apps/web/src/router.tsx`, `routes/__root.tsx`, `start.ts`
- Diperbarui: 2026-10-10
- Dependensi: NF-002
- Ukuran: kecil

### Ruang lingkup

`defaultNotFoundComponent` pada `getRouter()`, title `Page not found · {siteName}`, `robots noindex, nofollow`, fallback `defaultSiteSettings` bila settings gagal. `/admin/*` tak dikenal memakai halaman yang sama tanpa memicu `requireAdminSession`.

### Acceptance criteria

- [ ] URL tak dikenal (publik dan `/admin/*`) → HTTP 404 dengan halaman yang sama.
- [ ] Respons identik untuk anonim dan admin; rute admin valid dan guard login tidak berubah.
- [ ] Title/robots benar; halaman tetap tampil bila settings gagal.

### Validasi

SSR smoke pada build; test terdampak; `bun run build`.

### Hasil dan bukti

Belum dikerjakan.

### Commit task

- Pesan: `feat(web): render not-found page for unknown routes (NF-003)`
- SHA: belum dibuat

### Blocker atau tindak lanjut

Tidak ada.

## Task: NF-004 — Konten publik yang tidak ada menjadi 404

- Status: Backlog
- Owner: Pengembang/agent pelaksana
- Prioritas: 4
- Referensi: NF-US-01/02; `routes/videos.$slug.tsx`, `watch.$slug.tsx`, `titles.$kind.$slug.tsx`, `series.$slug.tsx`
- Diperbarui: 2026-10-10
- Dependensi: NF-002
- Ukuran: kecil–sedang

### Ruang lingkup

Loader rute publik berslug melempar `notFound()` bila API menjawab 404/422, sehingga halaman yang sama tampil. 503/jaringan tetap state Retry. Kartu "Video unavailable"/"Title unavailable" untuk kasus 404/422 dihapus atau tidak lagi dijangkau. Redirect kanonik `?type=all` tidak diubah.

### Acceptance criteria

- [ ] Slug tak ada pada empat rute → halaman 404 yang sama dengan HTTP 404.
- [ ] 503/jaringan tetap menampilkan state Retry, bukan 404.
- [ ] Konten yang ada, preload dan navigasi katalog tidak berubah.

### Validasi

Test perilaku loader/komponen; smoke SSR slug tak ada.

### Hasil dan bukti

Belum dikerjakan.

### Commit task

- Pesan: `feat(web): return not-found for missing public content (NF-004)`
- SHA: belum dibuat

### Blocker atau tindak lanjut

Tidak ada.

## Task: NF-005 — Test perilaku dan SSR

- Status: Backlog
- Owner: Pengembang/agent pelaksana
- Prioritas: 5
- Referensi: plan Test requirements
- Diperbarui: 2026-10-10
- Dependensi: NF-003, NF-004
- Ukuran: kecil

### Ruang lingkup

Test unit render dan smoke SSR: status 404, robots, tanpa pantulan path berisi markup, anonim = admin, settings gagal, slug tak ada pada empat rute, 503 tetap Retry.

### Acceptance criteria

- [ ] Semua kasus di atas tercakup dan lulus.
- [ ] Suite web terdampak, check-types, lint dan build lulus.

### Validasi

`bun test` terdampak, `bun run check-types`, `bun run lint`, `bun run build`.

### Hasil dan bukti

Belum dikerjakan.

### Commit task

- Pesan: `test(web): cover not-found rendering and status (NF-005)`
- SHA: belum dibuat

### Blocker atau tindak lanjut

Tidak ada.

## Task: NF-006 — Bukti browser dan closure dokumen

- Status: Backlog
- Owner: Pengembang/agent pelaksana
- Prioritas: 6
- Referensi: plan Acceptance criteria
- Diperbarui: 2026-10-10
- Dependensi: NF-005
- Ukuran: kecil

### Ruang lingkup

Chromium dev/built: 320/390/768/1440 × Light/Dark/System, keyboard/fokus, tanpa overflow; perbarui plan, backlog dan `docs/README.md`.

### Acceptance criteria

- [ ] Evidence browser tercatat; bila runner tidak tersedia dicatat belum diuji.
- [ ] Status plan/backlog dan indeks docs diperbarui; `docs:check` lulus.

### Validasi

Smoke browser, `bun run docs:check`.

### Hasil dan bukti

Belum dikerjakan.

### Commit task

- Pesan: `docs(web): close not-found verification (NF-006)`
- SHA: belum dibuat

### Blocker atau tindak lanjut

Tidak ada.
