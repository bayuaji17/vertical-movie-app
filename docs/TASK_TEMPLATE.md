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
- Referensi: <story, PRD-xx, GR-xx, keputusan teknik>
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

<Perubahan, hasil validasi, keputusan, dan commit/PR bila telah dibuat.>

### Blocker atau tindak lanjut

<Dependensi yang belum tersedia atau task lanjutan dengan ID-nya.>
```

Status mengikuti [Global Workflow](GLOBAL_WORKFLOW.md). Task `Done` harus memenuhi acceptance criteria dan kriteria selesai yang relevan. Contoh pembagian modul auth: `AUTH-001` validasi konfigurasi server → `AUTH-002` skema/migrasi tabel auth → `AUTH-003` instance auth dan endpoint → `AUTH-004` otorisasi admin → `AUTH-005` formulir login dan pengujian alur. Ini contoh pembagian, bukan sprint atau implementasi yang sudah dimulai.
