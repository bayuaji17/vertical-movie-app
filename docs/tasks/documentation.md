# Modul: Dokumentasi

> Diperbarui 5 Oktober 2026. Owner: pengembang/agent. Scope dan aturan diminta pengguna; evidence dicatat setelah pemeriksaan aktual. Pengguna mengotorisasi commit lokal per task setelah task selesai.

## Tujuan modul

Dokumentasi mudah ditemukan, memiliki sumber acuan yang jelas dan konsisten selama development. Ikuti [aturan root](../../AGENTS.md#documentation-rules), [indeks](../README.md), [context](../plans/documentation/repository-context.md) dan [plan](../plans/documentation/implementation-plan.md).

## User story: DOCS-STORY-001

Sebagai pengembang, saya ingin menemukan spesifikasi, panduan dan riwayat fitur di lokasi yang konsisten agar perubahan tidak menghasilkan dokumentasi duplikat atau tautan rusak.

## Task: DOCS-001 — Kelompokkan dokumen dan perbarui referensi

- Status: Done
- Owner: pengembang/agent
- Prioritas: 1
- Referensi: DOCS-STORY-001, context/plan dokumentasi
- Diperbarui: 2026-10-04
- Dependensi: tidak ada
- Ukuran: satu migrasi struktur dokumentasi

### Ruang lingkup

Pindahkan 18 dokumen ke kategori product/architecture/guides/operations/plans/templates/design, pertahankan tasks/aset desain, hitung ulang link relatif dan perbarui indeks/root README/komentar env sample.

### Acceptance criteria

- [x] Root docs hanya berisi README sebagai dokumen.
- [x] Dokumen aktif/historis dikelompokkan dan terindeks.
- [x] Tautan lokal dan anchor valid; referensi path lama diperbarui.
- [x] Keputusan, ID, evidence dan aset existing dipertahankan.

### Validasi

`bun run docs:check`, perbandingan snapshot/isi dan hash aset, formatter serta `git diff --check`.

### Hasil dan bukti

Branch `chore/docs-organization` dari `68604daf3abe208f7f57c3b72b0a75d4467dfbc6`. Seluruh 18 dokumen dan referensi dipindahkan, checker/formatter/whitespace lulus. Sequence ID historis dan 13 file protected tetap sama; hasil rinci ada pada execution log plan.

### Blocker atau tindak lanjut

Tidak ada blocker.

## Task: DOCS-002 — Terapkan aturan root dan gate dokumentasi

- Status: Done
- Owner: pengembang/agent
- Prioritas: 2
- Referensi: DOCS-STORY-001, root AGENTS
- Diperbarui: 2026-10-04
- Dependensi: DOCS-001
- Ukuran: satu aturan proses dan checker

### Ruang lingkup

Aturan lokasi/nama/canonical/status/evidence/link pada AGENTS root; `scripts/check-docs.mjs`, script `docs:check` dan hook commit. Workflow dan task template merujuk aturan yang sama.

Tambahan keputusan 5 Oktober 2026: commit setiap task setelah acceptance criteria dan checks lulus, gunakan pesan Conventional Commit dengan ID task, pisahkan pekerjaan lain dan catat SHA aktual. Push/PR/merge tetap mengikuti otorisasi operasi tersebut.

### Acceptance criteria

- [x] Aturan jelas dan tidak disalin sebagai instruksi terpisah pada apps.
- [x] Checker lulus untuk dokumentasi repo yang telah dirapikan.
- [x] Fixture terisolasi membuktikan penolakan lokasi/nama/path/link/anchor yang salah.
- [x] Hook menjalankan gate docs sebelum lint/check-types.
- [x] Aturan commit per task konsisten pada root, workflow dan template; tidak ada bypass hook.

### Validasi

Checker positif dan smoke negatif pada temporary fixture di luar repo. Verifikasi script package dan hook tanpa membuat commit.

### Hasil dan bukti

Aturan root, checker dan hook aktif; 10 smoke cases terisolasi lulus. Verifikasi awal menjalankan script tanpa commit; otorisasi 5 Oktober 2026 kemudian menyerahkan task dalam commit `29dd9325a2d9a01ae7fa0ae10cd001c1355eada0` dengan hook tanpa bypass. Status ledger diselaraskan menjadi Done pada pembaruan DOCS-004; tidak ada dependensi baru.

### Blocker atau tindak lanjut

Tidak ada blocker.

## Task: DOCS-003 — Verifikasi dan handoff

- Status: Done
- Owner: pengembang/agent
- Prioritas: 3
- Referensi: DOCS-STORY-001, plan STEP-003
- Diperbarui: 2026-10-04
- Dependensi: DOCS-001, DOCS-002
- Ukuran: satu penutupan verifikasi

### Ruang lingkup

Pemeriksaan dokumentasi, frozen install, root types/lint/build karena script/hook berubah; review diff dan preservation pekerjaan desain existing.

### Acceptance criteria

- [x] Checker, formatter, whitespace dan quality gate relevan lulus.
- [x] Tidak ada perubahan runtime aplikasi, kredensial, database atau artefak desain.
- [x] Plan/evidence dan indeks mencerminkan hasil aktual.

### Validasi

`bun run docs:check`, `bun install --frozen-lockfile`, `bun run check-types`, `bun run lint`, `bun run build`, targeted Prettier, `git diff --check` dan hash preservation.

### Hasil dan bukti

4 Oktober 2026: frozen install (770 installs/947 packages), check-types (3 task), lint (1 task) dan build (2 task) lulus. Targeted formatter, docs checker, smoke dan preservation juga lulus. Otorisasi 5 Oktober 2026 menambahkan commit lokal per task: snapshot index setiap commit diverifikasi, hook lulus, smoke 10 kasus dan frozen/build diulang dengan hasil lulus. Runtime integration/production proof tidak dijalankan ulang untuk perubahan dokumentasi. Push/PR/merge tidak diminta.

### Blocker atau tindak lanjut

Tidak ada blocker.

## Ledger commit task — 5 Oktober 2026

| Task     | Commit                                   | Evidence                                                                                           |
| -------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------- |
| DOCS-001 | bbd34602dcdbaca30e51c5ce95668a41c9b3223c | Snapshot index dan hook docs/lint/check-types/Commitlint lulus tanpa bypass                        |
| DOCS-002 | 29dd9325a2d9a01ae7fa0ae10cd001c1355eada0 | Snapshot index dan hook docs/lint/check-types/Commitlint lulus tanpa bypass                        |
| DOCS-003 | 790e174a9fef748564450244d05038fce8e9bdbd | Snapshot index 37 Markdown/263 tautan dan hook docs/lint/check-types/Commitlint lulus tanpa bypass |
| DOCS-004 | 846929a82b1b9c6c1ae5516afa29f5004d01597c | Snapshot index 37 Markdown/271 tautan dan hook docs/lint/check-types/Commitlint lulus tanpa bypass |
| DOCS-005 | 1f45728d5a0aeeecae48149ae538997c04f122f2 | Snapshot index 37 Markdown/284 tautan dan hook docs/lint/check-types/Commitlint lulus tanpa bypass |

SHA dicatat sesudah commit berhasil. Push/PR/merge tidak dilakukan. Commit task terakhir dicatat pada pembaruan ledger berikutnya.

## User story: DOCS-STORY-002

Sebagai pemilik produk/pengembang, saya ingin PRD membedakan kebutuhan yang disetujui, implementasi saat ini dan keputusan yang tersisa agar perencanaan fitur memakai acuan yang akurat.

## Task: DOCS-004 — Review dan selaraskan PRD dengan repository

- Status: Done
- Owner: pengembang/agent
- Prioritas: 4
- Referensi: DOCS-STORY-002, PRD-01–10, [context review](../plans/documentation/repository-context.md#review-prd--5-oktober-2026), [plan STEP-004](../plans/documentation/implementation-plan.md#step-004--review-dan-selaraskan-prd)
- Diperbarui: 2026-10-05
- Dependensi: DOCS-003
- Ukuran: satu review canonical PRD dan pembaruan navigasi/evidence

### Ruang lingkup

Review source API/auth/schema/worker serta route/UI web dan runbook/backlog pada SHA `790e174a9fef748564450244d05038fce8e9bdbd`. Perbarui PRD dan index; catat context terlebih dahulu, lalu perluas plan. Receipt DOCS-003 dan closure ledger DOCS-002 diselaraskan tanpa mengubah status backlog media. Perubahan desain existing tetap terpisah.

### Acceptance criteria

- [x] ID PRD-01–10 dan keputusan pengguna tetap terjaga; status mendekati final tidak mengesahkan keputusan baru.
- [x] Klaim media/lifecycle/publikasi/retensi lama diperbaiki berdasarkan source; UI dan proof yang belum lengkap tetap eksplisit.
- [x] Open decisions produk dipisahkan dari implementasi frontend dan verification/rollout gaps.
- [x] Index/context/plan/evidence selaras; checker/format/whitespace serta snapshot index lulus sebelum commit lokal scoped tanpa bypass.

### Validasi

Review statis source terhadap snapshot; cross-check requirement ID, batas ukuran/durasi, multipart/HLS/TTL/retensi dengan kode dan keputusan historis. `bun run docs:check`, targeted Prettier, `git diff --check`, isolated index check dan audit staging. Hook menjalankan docs/lint/types/Commitlint. Tidak mengulang proof database/storage/browser/production untuk perubahan dokumentasi.

### Hasil dan bukti

Review menemukan PRD sudah tertinggal: backend media dan watch/preview tersedia tetapi UI konten/katalog/configuration belum lengkap. Hasil review ditulis di PRD dengan source trace pada context. Validasi 5 Oktober 2026: `bun run docs:check` lulus 44 Markdown/290 tautan; targeted Prettier dan `git diff --check` lulus. Snapshot index hanya lima file task lulus 37 Markdown/271 tautan. Sepuluh ID PRD dan 13 file desain protected tetap sama; HEAD freshness valid. Ini review statis dan pemeriksaan dokumentasi, bukan proof runtime/production baru.

### Commit task

- Pesan: `docs(product): align PRD with current repository (DOCS-004)`
- SHA: receipt aktual dicatat pada execution log plan setelah commit berhasil; dapat masuk commit task berikutnya.
- Hook/checks: docs/Prettier/whitespace/index checks lulus; hooks docs/lint/types/Commitlint dijalankan oleh commit, hasil aktual dicatat pada receipt.
- Ledger: SHA aktual dicatat setelah commit berhasil dan dapat masuk pembaruan task berikutnya.

### Blocker atau tindak lanjut

Tidak ada blocker review. Global Rules dan Architecture memerlukan review terpisah; keputusan produk terbuka dan proof production tidak dianggap diselesaikan oleh task ini.

## Task: DOCS-005 — Review dan selaraskan Global Rules

- Status: Done
- Owner: pengembang/agent
- Prioritas: 5
- Referensi: DOCS-STORY-002, GR-01–09, [context review](../plans/documentation/repository-context.md#review-global-rules--5-oktober-2026), [plan STEP-005](../plans/documentation/implementation-plan.md#step-005--review-dan-selaraskan-global-rules)
- Diperbarui: 2026-10-05
- Dependensi: DOCS-004
- Ukuran: satu review canonical aturan lintas fitur

### Ruang lingkup

Global Rules, referensi status pada PRD/index dan canonical context/plan/backlog pada snapshot `846929a82b1b9c6c1ae5516afa29f5004d01597c`. Receipt DOCS-004 masuk pembaruan ledger berikutnya. Pertanyaan PRD yang dilewati pengguna dan proposal UI/kebijakan tidak dianggap disetujui; runtime/source/schema/desain tidak diubah.

### Acceptance criteria

- [x] ID GR-01–09 dan subject rule dipertahankan; ketentuan inti/implementasi/proposal tersisa dibedakan.
- [x] Provider, visibility/expiry/cache dan signed URL respons playback selaras source/PRD; credential tetap privat.
- [x] Instruksi proses merujuk root/guides; klaim semua dokumen draft diperbaiki dan PRD/index status selaras.
- [x] Checker/formatter/whitespace/index snapshot serta preservation lulus; commit scoped tanpa bypass.

### Validasi

Review statis auth/catalog/publication/media/playback/config/worker dan PRD/runbook. `bun run docs:check`, targeted Prettier, `git diff --check`, index snapshot/checker, GR ID/PRD preservation serta staging audit. Hooks docs/lint/types/Commitlint. Tidak menjalankan ulang integrasi atau migration/production untuk task docs ini.

### Hasil dan bukti

Review mengoreksi provider final terbuka, signed URL dilarang seluruh respons publik, akses/cache belum ditetapkan dan klaim semua dokumen draft. Preview admin, old URL expiry, HLS/source dan batas retensi dijelaskan; parameter rinci dimiliki PRD/kontrak/runbook. Verifikasi 5 Oktober 2026: `bun run docs:check` lulus 44 Markdown/303 tautan; targeted Prettier dan whitespace lulus. Snapshot index enam file scoped lulus 37 Markdown/284 tautan. GR-01–09, keputusan/open questions PRD dan 13 file desain protected tetap terjaga; HEAD freshness valid. Ini review statis/dokumentasi, bukan proof runtime/production baru.

### Commit task

- Pesan: `docs(product): align global rules with approved decisions (DOCS-005)`
- SHA: receipt aktual dicatat pada execution log setelah commit berhasil dan dapat masuk pembaruan task berikutnya.
- Hook/checks: docs/Prettier/whitespace/index lulus; hooks docs/lint/types/Commitlint dijalankan oleh commit dan hasil aktual dicatat pada receipt.
- Ledger: receipt DOCS-004 dicatat dari hasil aktual; receipt DOCS-005 sesudah commit berhasil.

### Blocker atau tindak lanjut

Tidak ada blocker review. Architecture masih memerlukan review terpisah; proposal PRD/UI/kebijakan dan proof production tidak diselesaikan oleh task ini.

## User story: DOCS-STORY-003

Sebagai pengembang, saya ingin overview arsitektur menjelaskan batas API/web/worker/storage/database dan kontrak aktif agar implementasi berikutnya tidak memakai rute atau status dari draft lama.

## Task: DOCS-006 — Review dan selaraskan Architecture

- Status: Done
- Owner: pengembang/agent
- Prioritas: 6
- Referensi: DOCS-STORY-003, [context review](../plans/documentation/repository-context.md#review-architecture--5-oktober-2026), [plan STEP-006](../plans/documentation/implementation-plan.md#step-006--review-dan-selaraskan-architecture)
- Diperbarui: 2026-10-05
- Dependensi: DOCS-005
- Ukuran: satu review canonical overview arsitektur

### Ruang lingkup

Overview, referensi status pada PRD/Global Rules/index serta context/plan/backlog pada snapshot `1f45728d5a0aeeecae48149ae538997c04f122f2`. Receipt DOCS-005 masuk ledger berikutnya. Dokumentasi saja, tanpa source/schema/env/dependency/asset desain atau perubahan keputusan produk.

### Acceptance criteria

- [x] Klaim media/worker/queue/HLS/gateway bisnis belum tersedia diperbaiki dan diagram delivery bukan TBD.
- [x] Dataflow, status video/parent/asset/session/job, native/SDK dan rute aktif sesuai source; source asli bukan playback.
- [x] Batas frontend/config/subtitle/deployment/proof production jelas; parameter policy merujuk pemilik canonical dan referensi teknis/evidence historis dipertahankan.
- [x] PRD/Global Rules/index merujuk status terbaru; checker/format/whitespace/index/preservation lulus, commit scoped tanpa bypass.

### Validasi

Review bootstrap/factory, gateway/client/routes, DB/schema/migration source, storage/media/worker dan runbook; cross-check rute/status. `bun run docs:check`, targeted Prettier, `git diff --check`, snapshot index, preservasi referensi teknis/PRD/GR/desain dan audit staging. Hooks docs/lint/types/Commitlint; tidak mengulang DB/storage/browser atau migration/build untuk perubahan docs saja.

### Hasil dan bukti

Architecture diperbarui dari draft integrasi menjadi baseline implemented pada snapshot, lengkap diagram delivery, alur freeze/enqueue/worker/activation, enum source dan kontrak route saat ini. UI dan production gates tetap eksplisit. Verifikasi 5 Oktober 2026: checker worktree 44 Markdown/318 tautan, scoped index tujuh dokumen 37 Markdown/299 tautan, targeted formatter dan whitespace lulus. Sebanyak 28 path route unik pada ringkasan cocok dengan module source; referensi teknis, keputusan PRD/GR dan 13 file desain protected tetap sama. HEAD freshness valid. Ini review statis/dokumentasi, bukan proof runtime/DB/production baru.

### Commit task

- Pesan: `docs(architecture): align overview with current implementation (DOCS-006)`
- SHA: receipt aktual dicatat setelah commit berhasil pada execution log dan dapat masuk pembaruan task berikutnya.
- Hook/checks: docs/Prettier/whitespace/index dan consistency/preservation lulus; hooks docs/lint/types/Commitlint dijalankan oleh commit dan hasil aktual dicatat pada receipt.
- Ledger: receipt DOCS-005 aktual dimasukkan; receipt DOCS-006 setelah commit berhasil.

### Blocker atau tindak lanjut

Tidak ada blocker review overview. Full audit model data/plan historis serta gerbang UI/production tidak dianggap selesai oleh task ini; source/schema aktif dan runbook tetap acuan status implemented.
