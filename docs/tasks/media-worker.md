# Modul: Worker Media dan Retensi

## Tujuan modul

Menghasilkan HLS terverifikasi melalui queue PostgreSQL dan proses Bun/FFmpeg di apps/api, di luar HTTP/transaksi. Retry/lease/timeout/retensi nomor 6–7 sudah disetujui; resource dibekukan setelah benchmark. Referensi [plan](../VIDEO_IMPLEMENTATION_PLAN.md), [model](../VIDEO_DATA_MODEL.md), [foundation](media.md) dan [Environment](../ENVIRONMENT.md).

## User story: WORKER-US-01

Sebagai admin, saya ingin pemrosesan tahan gangguan dan status yang benar, sehingga hanya HLS lengkap menjadi siap.

## User story: WORKER-US-02

Sebagai operator, saya ingin file sementara dibersihkan dan arsip dipertahankan, sehingga ruang kerja terkendali tanpa kehilangan aset yang harus disimpan.

## Aturan evidence bersama

Semua path kode adalah target future; nama simbol disesuaikan saat task dimulai. Gunakan bun:test dengan dependency clock/storage/process/DB yang diinjeksi dan app.handle untuk HTTP. Integrasi memakai PostgreSQL/bucket test dedicated, terpisah dari data development. Sesudah implementasi jalankan relevant tests, root check-types/lint/build; frozen install bila scripts/dependency berubah. Schema baru memerlukan generate/review migration additive, proof test DB serta migration development/preservation sesuai AGENTS. Production migration/deployment adalah rollout terpisah. Isi hasil command, bukti acceptance dan commit ketika task benar-benar Done. Status Backlog karena prerequisite belum selesai; finalisasi dokumen bukan proof runtime.

## Task: WORKER-001 — Schema job dan enqueue durable

- Status: Backlog
- Owner: Pengembang/agent pelaksana
- Prioritas: P1 — urutan mengikuti dependency
- Referensi: WORKER-US-01; PRD-04/05/06/07/09; keputusan nomor 1–7 pada plan
- Dependensi: MEDIA-COMPLETE-001, MEDIA-CLEANUP-001
- Ukuran: Satu hasil review; pecah kembali jika perubahan aktual tidak cukup kecil.

### Ruang lingkup

Buat apps/api/src/db/schema/jobs.ts, src/workers/queue.ts dan migration/schema exports; hubungkan enqueue pada complete setelah verifikasi storage. Persist identity asset/profile/generation, retry_at, counter, claim token dan timestamps.

### Acceptance criteria

- [ ] Completion/enqueue atomik di PostgreSQL setelah source freeze; replay/identity yang sama tidak menggandakan job. I/O storage di luar transaksi.
- [ ] FK/constraints menjaga owner/source; nullable pointer additive mempertahankan metadata/auth. Status queued tidak berarti ready/published.
- [ ] Job lama tidak aktif kembali setelah generation berubah; enqueue dapat ditemukan setelah restart API.

### Validasi

Dedicated DB race/rollback/restart proof, review SQL dan preservation data. Jalankan gate implementasi bersama sesuai scope.

### Hasil dan bukti

Belum diimplementasikan; tidak ada proof runtime atau commit implementasi dari finalisasi plan ini.

### Blocker atau tindak lanjut

WORKER-CLAIM-001 menggunakan schema ini; belum menjalankan FFmpeg.

## Task: WORKER-CLAIM-001 — Claim, heartbeat dan recovery lease

- Status: Backlog
- Owner: Pengembang/agent pelaksana
- Prioritas: P1 — urutan mengikuti dependency
- Referensi: WORKER-US-01; PRD-04/05/06/07/09; keputusan nomor 1–7 pada plan
- Dependensi: WORKER-001
- Ukuran: Satu hasil review; pecah kembali jika perubahan aktual tidak cukup kecil.

### Ruang lingkup

Implement apps/api/src/workers/queue.ts, queue.test.ts dan integration proof. Claim singkat dengan SKIP LOCKED, lease/claim token per attempt dan compare-and-set heartbeat/finish.

### Acceptance criteria

- [ ] Dua worker tidak memiliki claim aktif yang sama; lease 120 detik, heartbeat 15 detik, recovery poll 30 detik melalui env tervalidasi.
- [ ] Expired lease dapat dipulihkan; stale token tidak menulis progress/readiness atau mengaktifkan output. Retry transient maksimal 3 total attempt dengan delay 60/300 detik.
- [ ] Invalid input terminal tanpa retry; konfigurasi/resource tidak memadai menghasilkan health/error jelas dan tidak menghabiskan retry dengan busy loop.

### Validasi

Clock boundary dan DB parallel claim/death/stale finish tests. Jalankan gate implementasi bersama sesuai scope.

### Hasil dan bukti

Belum diimplementasikan; tidak ada proof runtime atau commit implementasi dari finalisasi plan ini.

### Blocker atau tindak lanjut

WORKER-002 memakai fencing token; WORKER-RUNTIME-001 menjalankan loop.

## Task: WORKER-002 — Runner transcode dan aktivasi HLS atomik

- Status: Backlog
- Owner: Pengembang/agent pelaksana
- Prioritas: P1 — urutan mengikuti dependency
- Referensi: WORKER-US-01; PRD-04/05/06/07/09; keputusan nomor 1–7 pada plan
- Dependensi: WORKER-CLAIM-001, HLS-PROFILE-001
- Ukuran: Satu hasil review; pecah kembali jika perubahan aktual tidak cukup kecil.

### Ruang lingkup

Buat apps/api/src/workers/{probe,transcode}.ts, schema renditions dan migration; Bun.spawn arg array serta workdir/prefix per attempt. Profil hls-v1 dan poster mengacu proof HLS-PROFILE-001/MEDIA-DESIGN-001; simpan fakta teknis authoritative.

### Acceptance criteria

- [ ] FFprobe/decode menolak duration/byte/codec/display ratio/resolution invalid sebelum output siap; rendition tidak upscale/crop/melebihi source. Poster WebP 1080×1920 sesuai standar.
- [ ] FFmpeg di luar HTTP/transaksi; encoding timeout max(900 detik,3×verified duration), stall 300 detik berdasarkan progress nyata, bukan heartbeat/log.
- [ ] Master/variant/init/semua segment lengkap di outputs/<asset>/<job>/<attempt>/; hasil uploaded/verifikasi sebelum transaksi mengaktifkan pointer dengan token/generation sah.
- [ ] Failure/cancellation/stale finish/retry tidak menjadikan partial output siap. Fakta sumber, HLS verified-ready dan tombstone object dipisahkan; penghapusan original tidak menghalangi playback.

### Validasi

Subprocess failures/timeouts/stall, DB + MinIO/FFmpeg integration no-audio/10 menit/30 menit dan stale generation. Jalankan gate implementasi bersama sesuai scope.

### Hasil dan bukti

Belum diimplementasikan; tidak ada proof runtime atau commit implementasi dari finalisasi plan ini.

### Blocker atau tindak lanjut

WORKER-RUNTIME-001 supervisi; WORKER-BENCH-001 menentukan resource sebelum rollout.

## Task: WORKER-RUNTIME-001 — Entry worker dan shutdown terkontrol

- Status: Backlog
- Owner: Pengembang/agent pelaksana
- Prioritas: P1 — urutan mengikuti dependency
- Referensi: WORKER-US-01; PRD-04/05/06/07/09; keputusan nomor 1–7 pada plan
- Dependensi: WORKER-002
- Ukuran: Satu hasil review; pecah kembali jika perubahan aktual tidak cukup kecil.

### Ruang lingkup

Buat apps/api/src/workers/index.ts, worker env loader/test serta script worker di apps/api/package.json. Queue/runner/recovery dengan satu pool/DI; env Turbo mengikuti bundled docs saat implementasi.

### Acceptance criteria

- [ ] Default MEDIA_WORKER_CONCURRENCY=1 per instance, integer invalid ditolak; berbeda dari concurrency upload 3 part per file. Multi-instance memakai claim DB.
- [ ] Retry/deadline/lease/recovery melalui env menjaga heartbeat < lease; thread/resource/workdir tervalidasi berdasarkan proof, tanpa asumsi /tmp disk.
- [ ] Shutdown berhenti claim baru dan menghentikan subprocess/child terkontrol; cleanup setelah process berhenti. Restart/death recovery bekerja. Health/progress aman tanpa signature/credential.
- [ ] Detail polling/probe/hard deadline/shutdown grace pada plan dibekukan dan dibuktikan sebelum Done; worker tidak menambah endpoint publik.

### Validasi

Restart/shutdown/dead-worker integration, env/process tests serta script/frozen-install gates. Jalankan gate implementasi bersama sesuai scope.

### Hasil dan bukti

Belum diimplementasikan; tidak ada proof runtime atau commit implementasi dari finalisasi plan ini.

### Blocker atau tindak lanjut

Runtime lokal belum membuktikan kapasitas server 4 GB.

## Task: WORKER-RETENTION-001 — Retensi sumber dan cleanup output gagal

- Status: Backlog
- Owner: Pengembang/agent pelaksana
- Prioritas: P1 — urutan mengikuti dependency
- Referensi: WORKER-US-02; PRD-04/05/06/07/09; keputusan nomor 1–7 pada plan
- Dependensi: WORKER-RUNTIME-001, PUBLISH-002
- Ukuran: Satu hasil review; pecah kembali jika perubahan aktual tidak cukup kecil.

### Ruang lingkup

Buat apps/api/src/workers/cleanup.ts, persist deletion claim/tombstone melalui migration bila perlu; sweep per jam. Serialisasi archive/reprocess/GC memakai DB claim, storage I/O di luar transaksi dan recovery idempotent.

### Acceptance criteria

- [ ] Original eligible 7 hari sejak HLS verified-ready termasuk draft, hanya non-archived tanpa job aktif. Metadata/provenance tetap tersedia; publish/playback tidak mensyaratkan HEAD terhadap original yang expired.
- [ ] Archive menyimpan semua aset konten valid selamanya termasuk original yang masih ada sebelum deletion claim menang. Archive tidak memulihkan original yang sudah dihapus; race mempunyai hasil terurut dan terlihat.
- [ ] Source failed terminal eligible 7 hari sejak kegagalan kecuali archived; partial output gagal 24 jam setelah attempt berhenti tanpa active pointer. Disk temp dibersihkan setelah proses berhenti. Archived tidak mempertahankan partial attempt invalid.
- [ ] Owner/pointer/active-job checks wajib; crash delete→tombstone pulih tanpa kehilangan metadata. Reprocess original expired memerlukan upload ulang.

### Validasi

Clock boundaries, DB archive/claim/reprocess races, storage fail/crash/recovery dan playback/publish tombstone fixture. Jalankan gate implementasi bersama sesuai scope.

### Hasil dan bukti

Belum diimplementasikan; tidak ada proof runtime atau commit implementasi dari finalisasi plan ini.

### Blocker atau tindak lanjut

Restore/republish di luar scope; tidak hard-delete metadata konten.

## Task: WORKER-BENCH-001 — Benchmark target 4 core dan RAM 4 GB

- Status: Backlog
- Owner: Pengembang/agent pelaksana
- Prioritas: P1 — urutan mengikuti dependency
- Referensi: WORKER-US-01; PRD-04/05/06/07/09; keputusan nomor 1–7 pada plan
- Dependensi: WORKER-RUNTIME-001
- Ukuran: Satu hasil review; pecah kembali jika perubahan aktual tidak cukup kecil.

### Ruang lingkup

Dokumentasikan hasil di docs/VIDEO_OPERATIONS.md dan ENVIRONMENT.md; fixture 10/30 menit dengan resource limit pada server/container test. Worker 2 vCPU/1,5 GiB/thread 1 adalah kandidat proposal nomor 8, belum terbukti.

### Acceptance criteria

- [ ] Catat wall time, peak RSS, CPU, source/intermediate/output/free disk dan overhead proses lain; ukur respons API selama job, disk penuh/OOM/timeout recovery.
- [ ] Bekukan encoder/decoder/filter thread, RAM/disk guard/workdir dan teknik eksekusi dari hasil; deadline tetap 3×duration/minimum 15 menit. Jika gagal, revisi resource/teknik sebelum rollout.
- [ ] Pisahkan proof development dari target server. Server/resource limit unavailable dicatat belum diuji, bukan production-ready.

### Validasi

Reproducible report versi FFmpeg/Bun, input/profile/limits dan hasil berhasil/gagal. Jalankan gate implementasi bersama sesuai scope.

### Hasil dan bukti

Belum diimplementasikan; tidak ada proof runtime atau commit implementasi dari finalisasi plan ini.

### Blocker atau tindak lanjut

Deployment/domain/provider/disk dan rollout tetap keputusan lanjutan; benchmark tidak deploy.
