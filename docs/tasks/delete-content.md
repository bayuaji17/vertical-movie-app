# Modul: Hapus konten draft dan archived

> Status: **Backlog** · 13 Oktober 2026 · Pengguna meminta fitur hapus untuk konten draft dan archived. Plan: [implementation-plan](../plans/delete-content/implementation-plan.md), context: [repository-context](../plans/delete-content/repository-context.md).

## Tujuan modul

Admin menghapus permanen Film, Standalone, Episode, Season dan Series yang tidak published, termasuk relasi, aset dan objek storage, dengan penolakan yang jelas untuk konten published atau sibuk. Referensi: PRD-03/06, [model data video](../architecture/video-data-model.md).

## User story: DEL-US-01

Sebagai admin, saya ingin menghapus draft yang salah atau tidak jadi dipakai, sehingga daftar konten dan slug tidak terisi sampah.

## User story: DEL-US-02

Sebagai admin, saya ingin menghapus konten archived yang tidak dibutuhkan lagi, sehingga storage dan katalog admin bersih.

## User story: DEL-US-03

Sebagai admin, saya ingin konfirmasi yang menjelaskan konsekuensinya dan penolakan yang jelas untuk konten published atau sedang diproses, sehingga saya tidak menghapus data secara tidak sengaja.

## Task: DEL-001 — Setujui keputusan D1–D6

- Status: Backlog
- Owner: agent
- Prioritas: 1
- Referensi: DEL-US-01/02/03; [plan](../plans/delete-content/implementation-plan.md)
- Diperbarui: 2026-10-13
- Dependensi: tidak ada
- Ukuran: sedang

### Ruang lingkup

Pengguna memutuskan D1 (yang boleh dihapus), D2 (hard delete), D3 (cascade), D4 (konten sibuk ditolak), D5 (tombstone + worker, audit lewat log) dan D6 (bentuk API/UI); catat pemberi persetujuan dan tanggal pada plan.

### Acceptance criteria

- [ ] Keputusan dicatat beserta pemberi persetujuan dan tanggal.

### Validasi

`bun run docs:check`, Prettier, `git diff --check`.

### Hasil dan bukti

Belum ada.

### Commit task

- Pesan: `docs(api): ... (DEL-001)`
- SHA: belum dibuat
- Hook/checks: belum dijalankan
- Ledger: dicatat pada update dokumentasi berikutnya

### Blocker atau tindak lanjut

Tidak ada.

## Task: DEL-002 — Skema tombstone storage dan primitif repository

- Status: Backlog
- Owner: agent
- Prioritas: 2
- Referensi: DEL-US-01/02/03; [plan](../plans/delete-content/implementation-plan.md)
- Diperbarui: 2026-10-13
- Dependensi: DEL-001
- Ukuran: sedang

### Ruang lingkup

Tabel `media_storage_tombstones` dan migrasi Drizzle; primitif repository untuk mengumpulkan aset/sesi/job/rendition/attempt turunan dan menghapusnya berurutan (FK melingkar diputus), dalam transaksi yang sama dengan pencatatan tombstone.

### Acceptance criteria

- [ ] Migrasi additive dan dapat diterapkan di development tanpa mengubah data.
- [ ] Primitif menghapus seluruh turunan sebuah pemilik dan mencatat tombstone untuk setiap objek/prefix.
- [ ] Kegagalan di tengah membatalkan seluruh transaksi.

### Validasi

Integrasi PostgreSQL uji khusus; `db:migrate` pada development.

### Hasil dan bukti

Belum ada.

### Commit task

- Pesan: `feat(api): ... (DEL-002)`
- SHA: belum dibuat
- Hook/checks: belum dijalankan
- Ledger: dicatat pada update dokumentasi berikutnya

### Blocker atau tindak lanjut

Tidak ada.

## Task: DEL-003 — Hapus video, movie, standalone dan episode

- Status: Backlog
- Owner: agent
- Prioritas: 3
- Referensi: DEL-US-01/02/03; [plan](../plans/delete-content/implementation-plan.md)
- Diperbarui: 2026-10-13
- Dependensi: DEL-002
- Ukuran: sedang

### Ruang lingkup

`DELETE /admin/videos/:id?expectedVersion=n`: admin-only, status draft/archived, penolakan published (`CONTENT_STATE_CONFLICT`) dan sibuk (`CONTENT_BUSY`), `expectedVersion`, ringkasan respons, invalidasi cache katalog, log `content.deleted`.

### Acceptance criteria

- [ ] Draft dan archived terhapus beserta relasinya; published ditolak.
- [ ] Upload berjalan atau job aktif menghasilkan 409 dengan pesan tindakan.
- [ ] Ulangan menghasilkan 404; slug dan nomor episode dapat dipakai ulang.

### Validasi

Test HTTP `app.handle`; integrasi PostgreSQL.

### Hasil dan bukti

Belum ada.

### Commit task

- Pesan: `feat(api): ... (DEL-003)`
- SHA: belum dibuat
- Hook/checks: belum dijalankan
- Ledger: dicatat pada update dokumentasi berikutnya

### Blocker atau tindak lanjut

Tidak ada.

## Task: DEL-004 — Hapus season dan series (cascade)

- Status: Backlog
- Owner: agent
- Prioritas: 4
- Referensi: DEL-US-01/02/03; [plan](../plans/delete-content/implementation-plan.md)
- Diperbarui: 2026-10-13
- Dependensi: DEL-002
- Ukuran: sedang

### Ruang lingkup

`DELETE /admin/seasons/:id` dan `/admin/series/:id`: cascade episode/season sesuai D3, ringkasan jumlah, aturan status dan sibuk yang sama, admin-only.

### Acceptance criteria

- [ ] Series menghapus semua season, episode, relasi genre dan aset poster.
- [ ] Season menghapus episodenya; season/series published atau sibuk ditolak.
- [ ] Tidak ada baris yatim setelah penghapusan.

### Validasi

Test HTTP; integrasi PostgreSQL dengan Series berisi dua season dan beberapa episode berisi aset.

### Hasil dan bukti

Belum ada.

### Commit task

- Pesan: `feat(api): ... (DEL-004)`
- SHA: belum dibuat
- Hook/checks: belum dijalankan
- Ledger: dicatat pada update dokumentasi berikutnya

### Blocker atau tindak lanjut

Tidak ada.

## Task: DEL-005 — Sapuan tombstone di worker

- Status: Backlog
- Owner: agent
- Prioritas: 5
- Referensi: DEL-US-01/02/03; [plan](../plans/delete-content/implementation-plan.md)
- Diperbarui: 2026-10-13
- Dependensi: DEL-002
- Ukuran: sedang

### Ruang lingkup

Sapuan tiap 60 detik pada slot maintenance: hapus objek atau semua key prefix dari tombstone untuk provider/bucket aktif, idempoten dengan retry, tandai selesai, log `cleanup.tombstone`/`cleanup.item_failed`.

### Acceptance criteria

- [ ] Objek source, poster, output dan staging terhapus setelah konten dihapus.
- [ ] Kegagalan storage tidak menghilangkan tombstone dan diulang pada sapuan berikutnya.
- [ ] Tidak pernah menghapus objek di luar tombstone atau bucket lain.

### Validasi

Integrasi MinIO + worker; test unit sapuan dengan storage palsu.

### Hasil dan bukti

Belum ada.

### Commit task

- Pesan: `feat(api): ... (DEL-005)`
- SHA: belum dibuat
- Hook/checks: belum dijalankan
- Ledger: dicatat pada update dokumentasi berikutnya

### Blocker atau tindak lanjut

Tidak ada.

## Task: DEL-006 — UI hapus pada admin

- Status: Backlog
- Owner: agent
- Prioritas: 6
- Referensi: DEL-US-01/02/03; [plan](../plans/delete-content/implementation-plan.md)
- Diperbarui: 2026-10-13
- Dependensi: DEL-003, DEL-004
- Ukuran: sedang

### Ruang lingkup

Klien API, mutasi, `AlertDialog` konsekuensi (Series mengetik judul), tombol Delete pada detail dan daftar/baris, nonaktif untuk published, penanganan error `CONTENT_BUSY`/versi/404, invalidasi query dan navigasi.

### Acceptance criteria

- [ ] Delete tersedia untuk draft/archived dan nonaktif dengan alasan untuk published.
- [ ] Dialog menampilkan jumlah season/episode/aset; Series memerlukan judul yang diketik.
- [ ] Setelah sukses daftar, detail dan dashboard diperbarui tanpa muat ulang manual.

### Validasi

Test komponen; bukti browser development.

### Hasil dan bukti

Belum ada.

### Commit task

- Pesan: `feat(web): ... (DEL-006)`
- SHA: belum dibuat
- Hook/checks: belum dijalankan
- Ledger: dicatat pada update dokumentasi berikutnya

### Blocker atau tindak lanjut

Tidak ada.

## Task: DEL-007 — Bukti integrasi dan browser

- Status: Backlog
- Owner: agent
- Prioritas: 7
- Referensi: DEL-US-01/02/03; [plan](../plans/delete-content/implementation-plan.md)
- Diperbarui: 2026-10-13
- Dependensi: DEL-005, DEL-006
- Ukuran: sedang

### Ruang lingkup

Integrasi PostgreSQL + MinIO + worker untuk movie, episode, season dan series; bukti browser menghapus draft, archived dan Series berisi episode dengan media.

### Acceptance criteria

- [ ] Tidak ada baris atau objek yatim setelah sapuan.
- [ ] Alur UI berjalan di browser pada desktop dan mobile.

### Validasi

Suite integrasi baru dan worker browser; hasil dicatat.

### Hasil dan bukti

Belum ada.

### Commit task

- Pesan: `test(api): ... (DEL-007)`
- SHA: belum dibuat
- Hook/checks: belum dijalankan
- Ledger: dicatat pada update dokumentasi berikutnya

### Blocker atau tindak lanjut

Tidak ada.

## Task: DEL-008 — Dokumentasi dan penutupan

- Status: Backlog
- Owner: agent
- Prioritas: 8
- Referensi: DEL-US-01/02/03; [plan](../plans/delete-content/implementation-plan.md)
- Diperbarui: 2026-10-13
- Dependensi: DEL-007
- Ukuran: sedang

### Ruang lingkup

Perbarui runbook metadata/media, model data video, README docs, panduan API; catat batas dan rollout.

### Acceptance criteria

- [ ] Kontrak, aturan, urutan hapus, tombstone dan perilaku worker terdokumentasi.
- [ ] `check-types`, `lint`, `build`, `docs:check` lulus dan dicatat.

### Validasi

Lihat acceptance criteria.

### Hasil dan bukti

Belum ada.

### Commit task

- Pesan: `docs(api): ... (DEL-008)`
- SHA: belum dibuat
- Hook/checks: belum dijalankan
- Ledger: dicatat pada update dokumentasi berikutnya

### Blocker atau tindak lanjut

Tidak ada.
