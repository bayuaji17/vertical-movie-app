# Modul: Desain homepage dan katalog publik

## Tujuan modul

Menyediakan konsep visual beranda/katalog publik yang selaras PRD-07/08, tanpa mengubah aplikasi. [Spesifikasi desain](../design/home-catalog.md).

## User story: HOMEDES-US-001

Sebagai pengunjung tanpa akun, saya ingin menemukan Film, Series dan Standalone dengan sampul portrait serta metadata ringkas, sehingga dapat memilih cerita untuk ditonton.

## Task: HOMEDES-001 — Mockup desktop dan mobile light

- Status: Done
- Owner: Codex
- Prioritas: 1
- Referensi: HOMEDES-US-001; PRD-07/08; GR-02; [design system](../design/design-system.md).
- Diperbarui: 2026-10-07
- Dependensi: Tidak ada; keputusan UX katalog final tetap terbuka.
- Ukuran: Satu hasil desain yang dapat ditinjau.

### Ruang lingkup

Dua mockup raster light, prompt exact, spesifikasi proposal dan index. Worktree terpisah pada branch `feat/home-catalog-mockup`, basis `313e31a14891ac0f91265a3557576b44791309d7`. Pertahankan mockup lama dan pekerjaan paralel di checkout utama.

### Acceptance criteria

- [x] Desktop/mobile tersedia di docs/design dengan prompt yang dapat ditinjau.
- [x] Brand neutral/lime, poster portrait, Film/Series/Standalone, akses tanpa login dan hierarki konten terlihat.
- [x] Usulan featured/search/filter/urutan dibedakan dari kontrak API dan persetujuan produk.
- [x] Review visual, format Markdown, docs:check dan diff check lulus; commit task dibuat tanpa perubahan aplikasi.

### Validasi

Built-in image_gen dan review visual kedua hasil; header PNG/dimensi; Prettier pada Markdown task; `bun run docs:check`; `git diff --check`; hook commit dokumentasi/lint/check-types.

### Hasil dan bukti

7 Oktober 2026: built-in image_gen menghasilkan desktop melalui tiga panggilan sukses (awal + dua koreksi); mobile melalui dua panggilan sukses (draft enam kartu + final dua kartu). Satu request mobile gagal sebelum generasi karena reference path null, kemudian dijalankan ulang dengan path eksplisit. Final disalin ke docs/design; original tidak dihapus. Desktop menampilkan enam judul dengan dua dari setiap kind; mobile dua judul awal dan semua tab jenis. Semua poster portrait dan metadata terbaca, feature final terpisah dari intro, Load more/footer terlihat. Header PNG: desktop 1254 × 1254, 1.769.235 bytes; mobile 887 × 1774, 1.683.017 bytes.

Generator tidak mengikuti seluruh dimensi/frame numerik prompt. Rasio poster raster adalah pendekatan portrait, belum presisi 9:16; implementasi wajib memakai CSS aspect-ratio 9/16. Mockup mobile bukan bukti layout CSS 384 px atau target sentuh, dan Latest releases divisualisasikan seperti kontrol, walau pilihan urutannya belum disepakati. Hasil bukan implementasi atau bukti kesiapan production.

Worktree terisolasi; frozen install Bun 1.4.2 lulus (760 packages) tanpa perubahan lock/manifest. Final `bun run docs:check` lulus: 59 Markdown, 553 local links/anchors; Prettier write/check pada lima Markdown task lulus; `git diff --check` lulus. Hook dicatat sesudah commit. Tidak ada perubahan runtime/schema; test/build aplikasi tidak diulang untuk task desain/dokumentasi.

### Commit task

- Pesan: `docs(design): add public catalog mockups (HOMEDES-001)`
- SHA artefak: `67ad290ccb0f8ada34b51f2455df4eae97eba607`.
- Hook/checks: docs:check lulus (59 Markdown/553 links), lint web 1/1 dan check-types API/auth/web 3/3 lulus melalui cache Turbo; Commitlint lulus. Tidak bypass hook.
- Ledger: Update sesudah commit artefak, termasuk normalisasi mode PNG ke 100644. Branch lokal saja; belum push/PR/merge.

### Blocker atau tindak lanjut

Persetujuan arah visual, UX katalog dan integrasi backend/web masih pekerjaan lanjutan.
