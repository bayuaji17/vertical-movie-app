# Modul: Publication, Catalog dan Integrasi Playback

## Tujuan modul

Admin publish manual setelah preview; viewer tanpa akun mendapat katalog/playback sesuai effective visibility. Lifecycle draft → published → archived, syarat publikasi nomor 5 dan delivery/cache nomor 4 disetujui. Referensi [plan](../plans/video/implementation-plan.md), [model](../architecture/video-data-model.md), [media](media.md), [worker](media-worker.md), [video](videos.md). Gateway/player integrasi web lanjutan; desain dashboard tetap pekerjaan terpisah.

## User story: PUBLISH-US-01

Sebagai admin, saya ingin publish/archive konsisten, sehingga hanya konten siap tampil dan arsip aman disimpan.

## User story: PUBLIC-US-01

Sebagai penonton tanpa akun, saya ingin katalog dan HLS yang dapat diputar, sehingga saya dapat menonton konten yang diterbitkan.

## Aturan evidence bersama

Runtime inti telah diimplementasikan pada feat/media-backend; path/simbol final serta hasil proof tersedia pada [Media Operations](../operations/media.md). Scope dan checklist berikut menjadi acuan review; checkbox belum dicentang bila seluruh matriks acceptance belum dibuktikan. Gunakan bun:test dengan dependency clock/storage/process/DB yang diinjeksi dan app.handle untuk HTTP. Integrasi memakai PostgreSQL/bucket test dedicated, terpisah dari data development. Sesudah implementasi jalankan relevant tests, root check-types/lint/build; frozen install bila scripts/dependency berubah. Schema baru memerlukan generate/review migration additive, proof test DB serta migration development/preservation sesuai AGENTS. Production migration/deployment adalah rollout terpisah. Isi hasil command, bukti acceptance dan commit ketika task benar-benar Done. Status Review menunjukkan implementasi/proof lokal tersedia; In Progress menunjukkan matriks masih tersisa; Blocked menunjukkan lingkungan eksternal belum tersedia.

## Task: PUBLISH-001 — Publikasi video manual dengan readiness gate

- Status: Review
- Owner: Pengembang/agent pelaksana
- Prioritas: P1 — urutan mengikuti dependency
- Referensi: PUBLISH-US-01; PRD-04/05/06/07/09; keputusan nomor 1–7 pada plan
- Dependensi: VID-016, WORKER-RUNTIME-001, HLS-DELIVERY-001
- Ukuran: Satu hasil review; pecah kembali jika perubahan aktual tidak cukup kecil.

### Ruang lingkup

Tambahkan service publication/operation repository pada apps/api/src/modules/videos/, schema content_operations/migration, routes model serta wiring typed Elysia/Eden/Scalar. Predicate readiness bersama query publik, audit/version/idempotency.

### Acceptance criteria

- [ ] Publish admin memerlukan title/synopsis, hierarchy/slug valid, verified source facts, current HLS job/outputs siap, poster siap dan rights confirmation timestamp/actor. Subtitle opsional, jika ada valid/siap. Original habis retensi tidak menghalangi publish bila provenance/HLS sah.
- [ ] Worker ready tidak autopublish; incomplete draft tetap sah. Episode boleh published saat series draft tetapi belum terlihat publik; grouping terkunci setelah first publish.
- [ ] Lock/version/idempotency menangani readiness/generation/parent race; replay mempertahankan timestamp, same key different payload 409. Rekomendasi teknis dedup MVP sepanjang umur row; pruning task terpisah.
- [ ] Guard sebelum service/I/O, private no-store; endpoint/DTO/errors dibekukan dalam model/Scalar sebelum Done. Status saja tidak memberi izin object storage.

### Validasi

Readiness/guard HTTP tests dan DB publish/version/parent/source races termasuk original tombstone. Jalankan gate implementasi bersama sesuai scope.

### Hasil dan bukti

4 Oktober2026, feat/media-backend (belum commit): Publish manual readiness/version/owner locks/idempotency audit/result tersedia; worker tidak autopublish, original tombstone tetap playable. RealMinIO E2E readiness/replay/conflict lulus; subtitle/revision di luar scope. Gate root dan batas lingkungan pada [Media Operations](../operations/media.md). Checklist lengkap hanya dicentang setelah seluruh matriks AC terbukti.

### Blocker atau tindak lanjut

PUBLISH-002 archive; PUBLISH-SERIES-001 membuka series. Restore/republish/revisi published di luar task.

## Task: PUBLISH-002 — Archive published dan invalidasi visibility

- Status: Review
- Owner: Pengembang/agent pelaksana
- Prioritas: P1 — urutan mengikuti dependency
- Referensi: PUBLISH-US-01; PRD-04/05/06/07/09; keputusan nomor 1–7 pada plan
- Dependensi: PUBLISH-001
- Ukuran: Satu hasil review; pecah kembali jika perubahan aktual tidak cukup kecil.

### Ruang lingkup

Perbarui video archive service/repository/routes dan after-commit invalidation hooks; interaction deletion claim schema/service media eksplisit. Metadata draft archive existing mengikuti compatibility VID-016 tanpa memperluas cascade parent.

### Acceptance criteria

- [ ] Published → archived atomik expectedVersion/actor/timestamp; hilang dari katalog dan API berhenti memberi URL baru. Aset valid yang masih ada dipertahankan termasuk original.
- [ ] Replay/race publish/archive/source deletion claim konsisten; response menjelaskan original sudah terhapus bila claim sebelumnya menang, tidak menjanjikan recovery file.
- [ ] Cache metadata/catalog diinvalidasi setelah commit dengan TTL 60 detik fallback. Signed URL lama berlaku sampai expiry; buffer/cache tidak ditarik kembali.
- [ ] Series/season cascade/restore/republish/hard deletion tidak dibuat otomatis; regression existing parent rules.

### Validasi

DB archive/publish/delete-claim races dan access/cache tests; issued-before/after archive melalui proof delivery. Jalankan gate implementasi bersama sesuai scope.

### Hasil dan bukti

4 Oktober2026, feat/media-backend (belum commit): Published→archived dengan expectedVersion/actor/timestamp, sourceAvailability dan after-commit cache invalidation tersedia. E2E catalog hilang/new playback404/old signed payload masih valid dan retensi claim recovery lulus. Replay memakai rowVersion saat ini; stale version409. Gate root dan batas lingkungan pada [Media Operations](../operations/media.md). Checklist lengkap hanya dicentang setelah seluruh matriks AC terbukti.

### Blocker atau tindak lanjut

WORKER-RETENTION-001 mengaktifkan physical GC; PUBLIC-001/002 memakai predicate efektif.

## Task: PUBLISH-SERIES-001 — Publikasi series dengan satu episode siap

- Status: Review
- Owner: Pengembang/agent pelaksana
- Prioritas: P1 — urutan mengikuti dependency
- Referensi: PUBLISH-US-01; PRD-04/05/06/07/09; keputusan nomor 1–7 pada plan
- Dependensi: PUBLISH-001
- Ukuran: Satu hasil review; pecah kembali jika perubahan aktual tidak cukup kecil.

### Ruang lingkup

Tambahkan series publication service/model/routes dan series_operations/migration bila perlu di apps/api; predicate bersama tanpa mengubah lifecycle series implisit.

### Acceptance criteria

- [ ] Series publish memerlukan title/synopsis/poster dan minimal satu episode published/ready dengan parent tidak archived. Tanpa child playable tersembunyi katalog tanpa autoubah status editorial.
- [ ] Parent lock konsisten; series publish bersamaan dengan child archive tidak membocorkan hidden episode. Dedup/audit/version/no-store sesuai kontrak video.
- [ ] Counts/next episode/genre tidak mencakup child tersembunyi; lifecycle/cascade parent di luar kebutuhan publish ditangguhkan.

### Validasi

Readiness tests dan DB child/parent publication races serta guarded HTTP schema proof. Jalankan gate implementasi bersama sesuai scope.

### Hasil dan bukti

4 Oktober2026, feat/media-backend (belum commit): Publish series poster+setidaknya satu episode ready, owner locks dan episode hidden dalam parent draft tersedia. DB proof series/retention3/26 lulus; counts/next/season gaps dan no-child hidden tanpa auto-status change. Gate root dan batas lingkungan pada [Media Operations](../operations/media.md). Checklist lengkap hanya dicentang setelah seluruh matriks AC terbukti.

### Blocker atau tindak lanjut

PUBLIC-001 menguji effective visibility lintas kind.

## Task: PUBLIC-001 — Katalog dan detail konten efektif published

- Status: In Progress
- Owner: Pengembang/agent pelaksana
- Prioritas: P1 — urutan mengikuti dependency
- Referensi: PUBLIC-US-01; PRD-04/05/06/07/09; keputusan nomor 1–7 pada plan
- Dependensi: PUBLISH-002, PUBLISH-SERIES-001
- Ukuran: Satu hasil review; pecah kembali jika perubahan aktual tidak cukup kecil.

### Ruang lingkup

Buat apps/api/src/modules/catalog/{index,model,service,repository}.ts, factory/bootstrap dan compile-only Eden fixture. Bekukan endpoint/list/detail/next-episode typed sebelum implementasi; tanpa viewer account.

### Acceptance criteria

- [ ] Viewer tanpa login hanya mendapat DTO whitelisted effective playable; draft/archived/hidden/absent 404 setara. Kind/hierarchy/cursor stabil, tanpa source key/private metadata.
- [ ] Counts/next episode/series listing memakai predicate sama; series tanpa child playable tersembunyi. Original expired tidak menghilangkan HLS playable sah.
- [ ] Unsigned metadata/catalog TTL 60 detik dengan after-commit invalidation. Signed poster/playback DTO dipisah dari metadata cache dan private no-store; factory import tanpa I/O.

### Validasi

HTTP app.handle dan DB visibility/pagination/gaps/counts/cache TTL/race; Eden compile. Jalankan gate implementasi bersama sesuai scope.

### Hasil dan bukti

4 Oktober2026, feat/media-backend (belum commit): Whitelisted public catalog/list/detail/next dan series/count predicate shared; unsigned cache60s+invalidate tersedia. DB series/gaps/tombstone dan E2E HTTP404/visibility lulus; advanced cache/pagination race matrix masih terbuka. Gate root dan batas lingkungan pada [Media Operations](../operations/media.md). Checklist lengkap hanya dicentang setelah seluruh matriks AC terbukti.

### Blocker atau tindak lanjut

PUBLIC-002 playback; backend proof tidak membuktikan gateway tersedia.

## Task: PUBLIC-002 — API playlist dan signed payload HLS

- Status: Review
- Owner: Pengembang/agent pelaksana
- Prioritas: P1 — urutan mengikuti dependency
- Referensi: PUBLIC-US-01; PRD-04/05/06/07/09; keputusan nomor 1–7 pada plan
- Dependensi: PUBLIC-001, HLS-DELIVERY-001
- Ukuran: Satu hasil review; pecah kembali jika perubahan aktual tidak cukup kecil.

### Ruang lingkup

Buat apps/api/src/modules/playback/{index,model,service}.ts dan adapter delivery storage. DTO/master/variant rewrite namespace berdasarkan HLS-DELIVERY-001; admin preview dependency sama dengan izin berbeda.

### Acceptance criteria

- [ ] Master/variant API memeriksa published visibility/admin preview; init/segment/caption direct signed GET. Source asli bukan playback; traversal/external URI/namespace tak sah ditolak.
- [ ] TTL ceil(2×verifiedDurationMs/1000); renewal reauthorize tidak extend URL lama. DTO/playlist no-store; private payload freshness min(300 detik,sisa URL), fallback no-cache/no-store bila header provider belum terbukti.
- [ ] Worker HLS asli valid di MinIO termasuk Range/seek/quality switch; archive menolak URL baru, old URLs/cache mengikuti expiry. Signature/credential tidak persisten/log/bundle.

### Validasi

MinIO worker→preview→manual publish→catalog/playback→archive E2E, controlled expiry/refresh dan HTTP/namespace fixtures. Full R2 E2E terpisah sebelum rollout. Jalankan gate implementasi bersama sesuai scope.

### Hasil dan bukti

4 Oktober2026, feat/media-backend (belum commit): Playback DTO/master/variant reauthorization plus direct signed init/segment2×duration tersedia. Public tanpa login dan private preview guard; traversal/no-store/private Range/E2E lulus. Gate root dan batas lingkungan pada [Media Operations](../operations/media.md). Checklist lengkap hanya dicentang setelah seluruh matriks AC terbukti.

### Blocker atau tindak lanjut

WEB-CONTENT-001/002 browser integration; MEDIA-R2-001 storage proof bukan full R2 E2E.

## Task: WEB-CONTENT-001 — Gateway bisnis dan playlist same-origin

- Status: Review
- Owner: Pengembang/agent pelaksana
- Prioritas: P1 — urutan mengikuti dependency
- Referensi: PUBLIC-US-01; PRD-04/05/06/07/09; keputusan nomor 1–7 pada plan
- Dependensi: PUBLIC-002
- Ukuran: Satu hasil review; pecah kembali jika perubahan aktual tidak cukup kecil.

### Ruang lingkup

Buat gateway bounded apps/web/src/lib/server/ dan src/routes/api/; import type App/Eden existing. Route tree hanya generated tooling. Scope transport, artefak desain dashboard tidak masuk.

### Acceptance criteria

- [ ] Fixed upstream API_INTERNAL_URL, strip satu /api bisnis; cookie per request hanya admin, tanpa secret leak/SSRF/open proxy. Auth gateway path native dipertahankan.
- [ ] Playlist/DTO no-store/status/errors preserved; segment direct storage, tanpa proxy payload web. URL API playback sesuai public origin/path gateway.
- [ ] Eden compile/SSR isolation terbukti; localhost tidak membuktikan domain/TLS/trusted proxy production.

### Validasi

Gateway/header/isolation tests dan browser proof Vite serta built Bun/Nitro; check-types/lint/build. Jalankan gate implementasi bersama sesuai scope.

### Hasil dan bukti

4 Oktober2026, feat/media-backend (belum commit): Gateway business bounded/allowlist/same-origin write/public cookie stripping tersedia, route generated. Auth+business unit12/52 dan Chromium realHLS melalui Vite serta built Bun/Nitro lulus. Gate root dan batas lingkungan pada [Media Operations](../operations/media.md). Checklist lengkap hanya dicentang setelah seluruh matriks AC terbukti.

### Blocker atau tindak lanjut

WEB-CONTENT-002 player; dashboard multipart UI rinci saat scope UI disetujui.

## Task: WEB-CONTENT-002 — Player HLS dengan renewal URL

- Status: Review
- Owner: Pengembang/agent pelaksana
- Prioritas: P1 — urutan mengikuti dependency
- Referensi: PUBLIC-US-01; PRD-04/05/06/07/09; keputusan nomor 1–7 pada plan
- Dependensi: WEB-CONTENT-001
- Ukuran: Satu hasil review; pecah kembali jika perubahan aktual tidak cukup kecil.

### Ruang lingkup

Ubah apps/web/src/components/vertical-video-player.tsx dan integrasi halaman minimal preview/playback. Gunakan installed videojs skill/CLI/bundled docs versi installed; adapter dependency setelah proof, tanpa perubahan desain dashboard.

### Acceptance criteria

- [x] Portrait 9:16 dan adaptive source-available 480p–1080p; semua URI/MIME/CORS benar dengan output worker. Native Safari/hls.js dibuktikan sesuai perangkat tersedia.
- [x] Expiry pause/seek/quality switch meminta URL baru, reauthorize dan menjaga position/paused state; retry bounded, archived/unauthorized error tanpa renewal loop.
- [x] Full episode/movie 10/30 menit dan TTL 2×duration/expiry controlled fixture. Browser/platform unavailable tercatat belum diuji, bukan lolos.
- [x] Frozen install bila dependency/scripts berubah; tests relevan dan root check-types/lint/build. MP4 demo bukan bukti HLS produk.

### Validasi

Chromium/Firefox dan Safari/native HLS bila tersedia; controlled-clock/network fault serta actual playback/seek. Jalankan gate implementasi bersama sesuai scope.

### Hasil dan bukti

4 Oktober2026, feat/media-backend (belum commit): Video.js10.0.0-rc.4 HLS adapter pin sama, minimal watch/preview, renewal posisi/pause/bounded access errors tersedia. Chromium realHLS12s pause26s→seek8s lulus di Vite dan built runtime. Quality-switch tiga tier dan terminal404 tanpa loop lulus di Vite serta built Bun/Nitro (masing-masing1/70). Full episode10min1/66 dan movie30min1/63 membuktikan duration/near-end seek; TTL2×duration dan fractional ceiling diuji service4/15. Safari/native HLS unavailable. Gate root dan batas lingkungan pada [Media Operations](../operations/media.md). Checklist lengkap hanya dicentang setelah seluruh matriks AC terbukti.

### Blocker atau tindak lanjut

Full R2 worker/public/browser E2E serta benchmark/restore/deployment evidence gate rollout; tidak deploy otomatis.
