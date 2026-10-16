# Modul: Design system final

## Tujuan modul

Menetapkan fondasi visual light/dark berdasarkan shadcn Base UI Rhea dan seluruh variabel warna yang sudah tersedia. Keputusan pengguna pada 3 Oktober 2026: light neutral dengan aksen lime, dark charcoal dengan background #1E201E, Alert & Toast selaras dengan Status konten. Branch dibuat sebelum perubahan: `codex/design-system-final`, basis `0d3bef87f6d2f9b0a2873078f9b560f092f13c53`.

## User story: DS-US-001

Sebagai pengembang, saya ingin referensi visual dan token light/dark yang sama dengan CSS, sehingga antarmuka dapat diterapkan secara konsisten.

## Task: DS-001 — Selaraskan fondasi token dark

- Status: Done
- Owner: Codex
- Prioritas: 1
- Referensi: DS-US-001; keputusan visual pengguna 3 Oktober 2026.
- Dependensi: Tidak ada.
- Ukuran: Kecil.

### Ruang lingkup

Hanya variabel tema `.dark` pada `apps/web/src/styles.css`; pertahankan light, primary lime, destructive, chart, font, radius, serta token media. Tidak mengubah logic aplikasi atau komponen autentikasi.

### Acceptance criteria

- [x] Background dark #1E201E dan permukaan pendukung konsisten.
- [x] Seluruh nama token dan mapping Tailwind dipertahankan.
- [x] Light/preset Base UI Rhea/neutral tidak diganti.

### Validasi

Review diff CSS, cek source light tidak berubah, pemeriksaan computed style pada referensi dan test login existing.

### Hasil dan bukti

CSS hanya berubah pada blok .dark. Background #1E201E; card/popover/sidebar #272A27; secondary/muted/accent/input #303430; border #424842; ring dan muted foreground #A8B0A8. Pemeriksaan source terhadap HEAD memastikan seluruh light, primary/destructive/chart, radius, mapping dan media tidak berubah. Tidak ada logic aplikasi yang diubah.

### Blocker atau tindak lanjut

Tidak ada.

## Task: DS-002 — Dokumentasikan dan render board final

- Status: Done
- Owner: Codex
- Prioritas: 2
- Referensi: DS-US-001; shadcn semantic theme variables.
- Dependensi: DS-001.
- Ukuran: Kecil.

### Ruang lingkup

Dokumen final, atlas seluruh token warna shadcn yang tersedia, HTML responsif sebagai referensi, JSON token, dan PNG light/dark besar. Board mengambil nilai dari CSS; status/alert/toast merupakan spesifikasi visual, belum implementasi komponen baru.

### Acceptance criteria

- [x] Seluruh 31 token warna shadcn ada pada atlas kedua mode dengan nilai CSS yang sama.
- [x] Status sukses/error serta alert/toast memiliki tint dan ikon konsisten.
- [x] Referensi membedakan komponen existing dari pola produk yang direncanakan.
- [x] Dua PNG besar, HTML, JSON, dan cara regenerasi tersedia di docs/design.
- [x] Indeks docs merujuk spesifikasi final.

### Validasi

Render Chromium; periksa token DOM vs CSS, tidak ada overflow pada mobile, screenshot kedua mode, tinjauan visual hasil PNG.

### Hasil dan bukti

Generator Bun mengekstrak 31 token warna per mode dan 15 alias media. JSON/atlas/HTML final berasal dari source CSS. Chromium mencocokkan seluruh nilai dan label (mismatch kosong), memverifikasi kesamaan background/border/foreground status vs alert/toast pada kedua mode, dan mengekspor dua PNG 3840 x 4312. Viewport 320/390/768/1024 pada dua mode tanpa overflow; pemilih tema dan semua font/gambar termuat, browser tanpa page error. Hasil ditinjau secara visual. Bukti: docs/design/design-system.validation.json. Dokumen final mencatat pola yang belum diimplementasikan serta batas kontras token light existing.

### Blocker atau tindak lanjut

Tidak ada.

## Task: DS-003 — Validasi hasil

- Status: Done
- Owner: Codex
- Prioritas: 3
- Referensi: DS-US-001; docs/guides/development-workflow.md.
- Dependensi: DS-001, DS-002.
- Ukuran: Kecil.

### Ruang lingkup

Jalankan test relevan existing, check-types, lint, build, review diff dan dokumentasikan evidence.

### Acceptance criteria

- [x] Test relevan, check-types, lint dan build lulus.
- [x] Bukti render dan pemeriksaan token dicatat.
- [x] Tidak ada perubahan logic atau file generated build dalam diff.

### Validasi

`bun run --cwd apps/web auth:login:proof`, `bun run check-types`, `bun run lint`, `bun run build`, `git diff --check`.

### Hasil dan bukti

Validasi 3 Oktober 2026: bun run --cwd apps/web auth:login:proof: 5 pass, 22 assertions; bun run check-types: 3 task sukses (API/auth cache, web dijalankan); bun run lint: 1 task web sukses; bun run build: API dan web sukses (API cache, web dijalankan). Build menampilkan warning use client dari dependency Base UI, tidak menggagalkan build. git diff --check lulus. Exporter Chromium dari runtime Windows yang tersedia lulus dengan evidence JSON. Tidak ada perubahan manifest/dependensi/schema, sehingga frozen install dan migrasi tidak diperlukan. Branch codex/design-system-final dibuat sebelum edit; belum dibuat commit/push.

### Blocker atau tindak lanjut

Tidak ada.
