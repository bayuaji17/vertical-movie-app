# Kontrak implementasi upload media

Implementasi pada branch feat/media-backend, berdasarkan plan yang disetujui. S3 multipart eksplisit menggunakan AWS SDK karena Bun 1.4.2 tidak menyediakan initiate/list/complete/abort multipart browser. Native Bun S3 dipakai untuk file/read/write/presign GET. Proof MinIO dan Chromium sudah lulus; kompatibilitas R2 tetap memerlukan credentials dan proof terpisah.

## Identitas dan state

Aset memiliki tepat satu owner video atau series; series hanya boleh memiliki poster. Provider, bucket dan key persisten, unik dan berasal dari server. Pointer source/poster memakai composite FK (asset, owner); role pointer diperiksa service. Upload video baru hanya diperbolehkan pada draft dengan parent aktif; mengganti media konten published memerlukan alur lain. Sumber aktif diperbarui setelah freeze sukses. Poster series mengikuti pemeriksaan status yang sama.

POST /admin/media/uploads menerima ownerType, ownerId, kind, filename, contentType, sizeBytes (decimal string), idempotencyKey UUID. Ukuran video mengikuti kind owner: episode 512000000 byte, movie/standalone 1500000000 byte; poster 5000000 byte. Filename ekstensi hanya pemeriksaan awal; container/codec/durasi/rasio/animasi/decode merupakan fakta worker, bukan klaim upload. Request hash SHA-256 dari field canonical; key identik dan payload berbeda menghasilkan 409. Geometry max(ceil(size/50),5242880) disimpan sekali; part terakhir dapat lebih kecil. Response size bigint berupa decimal string; ETag bukan SHA-256.

Session initializing -> pending -> completing -> completed, atau initializing/pending -> aborting -> aborted/expired. Kegagalan validasi terminal menjadi failed. Claim memiliki token dan deadline; retries setelah deadline dapat mengambil kembali claim. Satu session aktif per owner/kind. Semua transaksi pendek: lock parent series, season, video, kemudian session/asset; operasi storage di luar transaksi. Concurrent duplicate pada claim aktif mendapatkan 409 untuk retry; replay completed mengembalikan hasil yang sama.

GET /admin/media/uploads/:id mengembalikan progress dari ListParts; part verified tidak memerlukan PUT ulang. POST .../:id/parts menerima partNumber dan menerbitkan URL dengan TTL min(900,floor(sisa session)). URL tidak diterbitkan setelah expiry/non-pending. Renewal tidak memperpanjang session. POST .../:id/complete merekonsiliasi ListParts beserta geometry, CompleteMultipartUpload, HEAD staging, conditional CopyObjectIfMatch ke sources/<asset>/original (atau sources/<asset>/poster-original), HEAD final; kemudian update asset/session dan pointer atomik. Retry setelah provider completion menggunakan HEAD staging untuk recovery. Claim harus masih dimiliki pada commit; stale completion tidak mengaktifkan pointer.

POST .../:id/abort mengklaim transisi sebelum abort I/O; repeated abort aman. Expiry dihitung sejak initiate (24 jam). Session gagal setelah objek lengkap dikarantina 24 jam. Sweeper hanya menggunakan key persisten milik session, bukan menyapu bucket. Final source tidak dihapus oleh upload sweeper; retensi 7 hari mulai HLS verified-ready di worker, dengan exemption archived sesuai plan.

## Pemrosesan dan bukti

Schema constraints, races PostgreSQL, routes dengan injected storage/clock, dan end-to-end MinIO dibuktikan terpisah. Completion enqueue satu media_job dalam transaksi yang sama. GET status mengembalikan processing.state/jobState/progressSeconds/attempts/failureCode/verifiedReadyAt; upload completed belum berarti siap ditonton. Worker dijalankan terpisah. Proof schema/race 4 test dan MinIO→worker→publish→playback→archive lulus. Rincian command dan batas platform pada [Media Operations](../operations/media.md). Tidak ada transaksi berisi storage network atau FFmpeg. Seluruh response upload private, no-store; credentials dan signed URL tidak dilog atau dipersistenkan.

## Owner inventory — ADUP-003

**Implemented/local verified · 5 Oktober 2026**, scope disetujui pengguna melalui [plan uploader](../plans/admin-media-upload/implementation-plan.md). Runtime browser uploader dan identity migration masih task berikutnya pada [backlog](../tasks/admin-media-upload.md).

`GET /admin/media/owners/:ownerType/:ownerId` menerima `video` atau `series` dengan UUID, requireAdmin dan private/no-store. Response whitelist membawa owner/version/status/canUpload/canPreview, source inventory (null untuk Series), poster inventory serta aturan format/ukuran/dimensi/durasi dan upload concurrency/TTL dari config server. `canUpload` hanya draft/parent aktif; otorisasi akhir tetap pada setiap operasi kontrol.

Setiap role mempunyai `current` dari pointer owner, `active` session dan `lastAttempt` dengan urutan createdAt/id descending stabil. `busy` menyatakan slot sedang dimiliki session; descriptor hanya untuk actor pembuat session. Current asset tidak diganti oleh pending/failed replacement. Setelah complete, pointer/version baru atomik dari service existing. Summary processing memuat state/job/progress/attempt/failure; status unknown bukan ready. `originalAvailable` terpisah dari preview HLS supaya retensi original tidak mematikan playback valid.

Inventory memakai snapshot repeatable-read/read-only. GET tidak mengubah expiry, mengambil claim, memanggil ListParts, menandatangani URL atau mengekspos provider/bucket/objectKey/uploadId/claim/credential. Descriptor aman: ID, nama/MIME/ukuran, geometry, status/expiry/completion/failure; fingerprint null dan resume false pada tahap ini. Session status endpoint tetap merekonsiliasi ListParts untuk satu session yang dipantau.

`canPreview` memakai query existing `CatalogStore.preview`, lalu unsigned profile/output identity/duration/poster checks yang juga digunakan PlaybackService. Tidak menerbitkan URL saat polling. Original yang sudah dihapus dapat tetap memiliki HLS valid; preview endpoint tetap memeriksa readiness/akses saat dibuka. Readiness output di sini berdasarkan fakta/provenance DB hasil worker; inventory tidak melakukan audit semua objek bucket.

Evidence HTTP/native/dedicated PG, regression playback serta scope platform dicatat pada backlog ADUP-003, bukan klaim production readiness.
