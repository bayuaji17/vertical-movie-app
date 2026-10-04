# Template task development

Gunakan satu dokumen modul di `docs/tasks/<module>.md` saat backlog modul mulai disusun. Setiap task mempunyai ID tetap dan diperbarui dalam dokumen tersebut. Jangan membuat folder dokumentasi baru di aplikasi.

```markdown
# Modul: <nama>

## Tujuan modul

<Hasil pengguna yang ingin dicapai dan referensi PRD/aturan/arsitektur.>

## User story: <ID story>

Sebagai <aktor>, saya ingin <aksi>, sehingga <manfaat>.

## Task: <MODULE-001> — <judul dengan satu hasil konkret>

- Status: Backlog
- Owner: <pengembang/agent>
- Prioritas: <urutan dalam modul>
- Referensi: <story, PRD-xx, GR-xx, link spesifikasi/plan canonical>
- Diperbarui: <YYYY-MM-DD>
- Dependensi: <ID task yang diperlukan atau tidak ada>
- Ukuran: <perkiraan kecil; pecah jika tidak cukup jelas>

### Ruang lingkup

<Apa yang dibuat/diubah, batas yang relevan, dan aplikasi/package pemilik.>

### Acceptance criteria

- [ ] <Hasil yang dapat dibuktikan, termasuk kondisi gagal bila relevan.>
- [ ] <Kriteria tambahan yang diperlukan untuk hasil task ini.>

### Validasi

<Perintah atau pemeriksaan perilaku yang diperlukan untuk acceptance criteria.>

### Hasil dan bukti

<Perubahan, tanggal/scope, command aktual dan hasil, keputusan, batas yang belum terbukti, serta commit/PR hanya bila telah dibuat.>

### Commit task

- Pesan: <Conventional Commit dengan ID task>
- SHA: <SHA aktual setelah commit berhasil; sebelum commit tulis belum dibuat>
- Hook/checks: <command dan hasil aktual>
- Ledger: <SHA dicatat pada update dokumentasi berikutnya bila commit task sudah dibuat>

### Blocker atau tindak lanjut

<Dependensi yang belum tersedia atau task lanjutan dengan ID-nya.>
```

Status mengikuti [Global Workflow](../guides/development-workflow.md). Task `Done` harus memenuhi acceptance criteria dan kriteria selesai yang relevan. Contoh pembagian modul auth: `AUTH-001` validasi konfigurasi server → `AUTH-002` skema/migrasi tabel auth → `AUTH-003` instance auth dan endpoint → `AUTH-004` otorisasi admin → `AUTH-005` formulir login dan pengujian alur. Ini contoh pembagian, bukan sprint atau implementasi yang sudah dimulai.

Mulai keputusan 5 Oktober 2026, commit setiap task secara terpisah setelah acceptance criteria dan checks lulus. Sertakan hanya perubahan task, gunakan ID task pada pesan, dan catat SHA aktual setelah commit. Push/PR/merge bukan bagian otomatis dari commit task.
