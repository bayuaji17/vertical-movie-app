# Modul: Dashboard metadata konten

> Status: planning · 5 Oktober 2026 · Permintaan pengguna: plan tahap pertama frontend. Usulan UX dan implementasi belum disetujui. Hasil pemeriksaan hanya dicatat setelah teramati.

## Tujuan modul

Admin dapat list/create/read/edit metadata movie/standalone melalui UI terlindungi dan responsif. Acuan: [context](../plans/admin-content/repository-context.md), [plan](../plans/admin-content/implementation-plan.md), [PRD](../product/prd.md), [workflow](../guides/development-workflow.md) dan [template task](../templates/task.md). Upload/sampul, worker status, preview/publish/archive actions dan hierarchy menjadi refinement berikutnya.

## User story: ADMC-US-00

Sebagai pengembang, saya ingin plan berdasarkan kontrak dan snapshot nyata agar implementasi dapat direview sebelum dimulai.

## User story: ADMC-US-01

Sebagai admin, saya ingin navigasi dashboard responsif serta logout yang tersedia di setiap halaman.

## User story: ADMC-US-02

Sebagai admin, saya ingin mencari dan membuka movie/standalone yang tersimpan dengan pagination yang benar.

## User story: ADMC-US-03

Sebagai admin, saya ingin membuat draft metadata tanpa harus mengunggah video lebih dahulu.

## User story: ADMC-US-04

Sebagai admin, saya ingin melihat dan mengedit draft tanpa menimpa perubahan lain atau kehilangan input saat gagal.

## User story: ADMC-US-05

Sebagai pengembang, saya ingin acceptance UI/API/persistensi dibuktikan sebelum iterasi dinyatakan selesai.

## Task: ADMC-001 — Context dan plan frontend

- Status: Done
- Owner: Pengembang/agent pelaksana
- Prioritas: P1 — planning
- Referensi: ADMC-US-00; PRD-01/02/03/08/09; GR-01/05/08; plan STEP-001.
- Diperbarui: 2026-10-05
- Dependensi: Tidak ada.
- Ukuran: Satu hasil review; target files/symbols mengikuti STEP-001. Pecah jika refinement menemukan scope lebih besar.

### Ruang lingkup

Analisis snapshot, context sebelum plan, backlog dan navigasi docs; preserve desain/receipt build existing. Source runtime tidak diubah.

### Acceptance criteria

- [x] Context/plan memuat snapshot, kontrak API, affected files, task/dependensi, error states dan validation nyata.
- [x] Plan membedakan proposal UX, runtime existing, desain worktree dan scope iterasi berikutnya.
- [x] Docs/format/whitespace/scoped index/preservation lulus; commit lokal planning terpisah.

### Validasi

docs:check, targeted Prettier, git diff --check, staged snapshot documentation, preservation hashes dan hooks.

### Hasil dan bukti

Context disimpan sebelum plan pada base SHA c5406282f8f3c86563ba7112ec43d2aa17f97da2; kontrak/read-only CLI ditinjau. Plan memuat 10 task runtime setelah task planning ini dan roadmap terpisah. 5 Oktober 2026: docs:check worktree lulus 50 Markdown/355 tautan, snapshot staged lulus 43 Markdown/336 tautan; targeted Prettier dan git diff --check lulus. Preservation hash 23 file existing selain indeks lulus; index stage hanya navigasi baru, desain/receipt build unrelated tidak ikut. Manifest/lock/generated route tree tidak berubah. Runtime dashboard belum diimplementasikan atau diuji; hooks dan SHA aktual dicatat setelah commit planning.

### Commit task

- Pesan: `docs(web): plan admin content dashboard (ADMC-001)`
- SHA: `74a894ff51060edaaf4bf57bbbb881670244e2e9`.
- Hook/checks: docs:check 50/355, lint 1 task dan check-types 3 task (cache valid), Commitlint lulus tanpa bypass.
- Ledger: Receipt aktual dicatat setelah commit berhasil untuk update task berikutnya.

### Blocker atau tindak lanjut

Tidak ada blocker penulisan plan; source runtime dan remote delivery belum diminta.

## Task: ADMC-002 — Fondasi primitives dashboard

- Status: Backlog
- Owner: Pengembang/agent pelaksana
- Prioritas: P1 — sesuai dependency
- Referensi: ADMC-US-01; PRD-02/08; GR-01/05/08; plan STEP-002.
- Diperbarui: 2026-10-05
- Dependensi: ADMC-001, ADMC-DES-001, permintaan implementasi dan recheck integrasi desain lokal.
- Ukuran: Satu hasil review; target files/symbols mengikuti STEP-002. Pecah jika refinement menemukan scope lebih besar.

### Ruang lingkup

Primitives yang belum installed dan dependency transitif source/manifest/lock/CSS yang benar-benar dibutuhkan. Review dry-run/diff dari apps/web.

### Acceptance criteria

- [ ] Sidebar/Table/Checkbox/ToggleGroup/Empty/Skeleton/AlertDialog tersedia dengan Base UI Rhea dan API yang ditinjau.
- [ ] Tidak overwrite komponen existing, token/font/player atau pekerjaan desain; integrasi Git fondasi final dicatat terpisah.
- [ ] Frozen install jika dependency/script berubah serta root gates lulus.

### Validasi

CLI docs/dry-run/diff, import review, conditional frozen install, root types/lint/build; tidak perlu unit test yang meniru primitives.

### Hasil dan bukti

Belum diimplementasikan atau diuji. Hasil runtime tidak disimpulkan dari plan.

### Commit task

- Pesan: Conventional Commit dengan ID ADMC-002 sesuai hasil implementasi.
- SHA: Belum dibuat.
- Hook/checks: Belum dijalankan untuk task ini.
- Ledger: Receipt aktual dicatat setelah commit berhasil untuk update task berikutnya.

### Blocker atau tindak lanjut

Menunggu review/permintaan implementasi dan dependency. Integrasi token/assets desain worktree harus dicatat sebagai pekerjaan tersendiri sebelum fresh-checkout visual acceptance.

## Task: ADMC-003 — Typed client dan private query cache

- Status: Backlog
- Owner: Pengembang/agent pelaksana
- Prioritas: P1 — sesuai dependency
- Referensi: ADMC-US-02; PRD-01/03/09; GR-01/05/08; plan STEP-003.
- Diperbarui: 2026-10-05
- Dependensi: ADMC-001 dan permintaan implementasi.
- Ukuran: Satu hasil review; target files/symbols mengikuti STEP-003. Pecah jika refinement menemukan scope lebih besar.

### Ruang lingkup

lib/admin content client/queries/errors, infer DTO/request dari Eden; operasi list/detail/genres/create/PATCH melalui gateway existing.

### Acceptance criteria

- [ ] Error HTTP/network/abort menjadi failure, signal diteruskan; base URL invalid menutup akses data.
- [ ] Query key admin memuat identity/filter; logout/expiry cleanup existing berlaku.
- [ ] POST/PATCH tanpa automatic retry; payload typed tanpa runtime import API/server secrets.

### Validasi

Injected fetch behavior tests, compile-only positive/negative contract, auth cache regression dan root tests/types/lint/build.

### Hasil dan bukti

Belum diimplementasikan atau diuji. Hasil runtime tidak disimpulkan dari plan.

### Commit task

- Pesan: Conventional Commit dengan ID ADMC-003 sesuai hasil implementasi.
- SHA: Belum dibuat.
- Hook/checks: Belum dijalankan untuk task ini.
- Ledger: Receipt aktual dicatat setelah commit berhasil untuk update task berikutnya.

### Blocker atau tindak lanjut

Menunggu review/permintaan implementasi dan dependency; tidak berstatus Ready hanya karena source API tersedia.

## Task: ADMC-004 — Shell dan navigasi admin responsif

- Status: Backlog
- Owner: Pengembang/agent pelaksana
- Prioritas: P1 — sesuai dependency
- Referensi: ADMC-US-01; PRD-01/02/08; GR-01/05/08; plan STEP-004.
- Diperbarui: 2026-10-05
- Dependensi: ADMC-002.
- Ukuran: Satu hasil review; target files/symbols mengikuti STEP-004. Pecah jika refinement menemukan scope lebih besar.

### Ruang lingkup

Admin shell/navigation/logout dan protected layout/index. Pertahankan authoritative guard, principal context serta workflow logout existing.

### Acceptance criteria

- [ ] Dashboard/Konten/CTA bekerja pada desktop dan mobile tanpa dead navigation atau fake analytics.
- [ ] Semua anak route tetap guarded; preview existing tetap dapat dirender.
- [ ] Logout success/failure, session expiry, forbidden/unavailable tetap benar; keyboard/focus/touch layout dapat dipakai.

### Validasi

Existing auth/session/gateway tests dan browser/SSR guard/logout smoke terkait, viewport light/dark, root gates.

### Hasil dan bukti

Belum diimplementasikan atau diuji. Hasil runtime tidak disimpulkan dari plan.

### Commit task

- Pesan: Conventional Commit dengan ID ADMC-004 sesuai hasil implementasi.
- SHA: Belum dibuat.
- Hook/checks: Belum dijalankan untuk task ini.
- Ledger: Receipt aktual dicatat setelah commit berhasil untuk update task berikutnya.

### Blocker atau tindak lanjut

Menunggu review/permintaan implementasi dan dependency; tidak berstatus Ready hanya karena source API tersedia.

## Task: ADMC-005 — Daftar metadata dengan search dan cursor

- Status: Backlog
- Owner: Pengembang/agent pelaksana
- Prioritas: P1 — sesuai dependency
- Referensi: ADMC-US-02; PRD-02/03/08/09; GR-01/05/08; plan STEP-005.
- Diperbarui: 2026-10-05
- Dependensi: ADMC-003, ADMC-004.
- Ukuran: Satu hasil review; target files/symbols mengikuti STEP-005. Pecah jika refinement menemukan scope lebih besar.

### Ruang lingkup

Route videos index, list table/mobile cards, kind/search/includeArchived URL state serta paginated Query.

### Acceptance criteria

- [ ] Movie/standalone, search max 200/debounce dan includeArchived sesuai API; tidak ada status filter/total count/global sort palsu.
- [ ] Cursor opaque, page size 20; filter berubah membuang pages lama dan request race tidak mencampur hasil.
- [ ] Initial/loading/empty/error/load-more retry accessible; load-more failure mempertahankan hasil yang sudah ada.

### Validasi

0/1/21+ rows, search/kind/archive changes, request cancellation/race, back/refresh dan browser mobile/desktop; root gates.

### Hasil dan bukti

Belum diimplementasikan atau diuji. Hasil runtime tidak disimpulkan dari plan.

### Commit task

- Pesan: Conventional Commit dengan ID ADMC-005 sesuai hasil implementasi.
- SHA: Belum dibuat.
- Hook/checks: Belum dijalankan untuk task ini.
- Ledger: Receipt aktual dicatat setelah commit berhasil untuk update task berikutnya.

### Blocker atau tindak lanjut

Menunggu review/permintaan implementasi dan dependency; tidak berstatus Ready hanya karena source API tersedia.

## Task: ADMC-006 — Reusable form metadata dan genre

- Status: Backlog
- Owner: Pengembang/agent pelaksana
- Prioritas: P1 — sesuai dependency
- Referensi: ADMC-US-03; PRD-03/08/09; GR-01/05/08; plan STEP-006.
- Diperbarui: 2026-10-05
- Dependensi: ADMC-002, ADMC-003.
- Ukuran: Satu hasil review; target files/symbols mengikuti STEP-006. Pecah jika refinement menemukan scope lebih besar.

### Ruang lingkup

TanStack Form UI, genre selector paginated, validasi dan whitelist mapper create/changed-field PATCH sesuai tabel field plan.

### Acceptance criteria

- [ ] Title-only draft valid; optional nullable/slug/year/date/BCP47/genre/rights mengikuti kontrak API.
- [ ] Genre selection mempertahankan selected IDs pada pagination/search; empty taxonomy tidak menghalangi draft.
- [ ] PATCH clear null/[] dibedakan dari unchanged, expectedVersion dari baseline, immutable/server-owned fields tidak dikirim.
- [ ] Field errors/focus/labels accessible; no-op save disabled, plain text tidak di-render HTML.

### Validasi

Meaningful mapper fixtures batas/normalisasi/calendar/year/genre/rights/diff; keyboard form verification dan root gates.

### Hasil dan bukti

Belum diimplementasikan atau diuji. Hasil runtime tidak disimpulkan dari plan.

### Commit task

- Pesan: Conventional Commit dengan ID ADMC-006 sesuai hasil implementasi.
- SHA: Belum dibuat.
- Hook/checks: Belum dijalankan untuk task ini.
- Ledger: Receipt aktual dicatat setelah commit berhasil untuk update task berikutnya.

### Blocker atau tindak lanjut

Menunggu review/permintaan implementasi dan dependency; tidak berstatus Ready hanya karena source API tersedia.

## Task: ADMC-007 — Buat draft movie dan standalone

- Status: Backlog
- Owner: Pengembang/agent pelaksana
- Prioritas: P1 — sesuai dependency
- Referensi: ADMC-US-03; PRD-03/09; GR-01/05/08; plan STEP-007.
- Diperbarui: 2026-10-05
- Dependensi: ADMC-006.
- Ukuran: Satu hasil review; target files/symbols mengikuti STEP-007. Pecah jika refinement menemukan scope lebih besar.

### Ruang lingkup

Route videos/new dan create mutation; sukses navigate detail dari ID server serta invalidate list.

### Acceptance criteria

- [ ] Satu submit pending satu POST, movie/standalone metadata minimal dan lengkap didukung.
- [ ] Hanya confirmed success menavigasi; slug/422/network/503 gagal mempertahankan input.
- [ ] Ambiguous POST outcome tidak otomatis diulang; UI menjelaskan cek daftar sebelum submit lagi.

### Validasi

Success dua kind, minimal/full form, slug conflict/invalid response/timeout, rapid clicks, typed payload browser dan root gates.

### Hasil dan bukti

Belum diimplementasikan atau diuji. Hasil runtime tidak disimpulkan dari plan.

### Commit task

- Pesan: Conventional Commit dengan ID ADMC-007 sesuai hasil implementasi.
- SHA: Belum dibuat.
- Hook/checks: Belum dijalankan untuk task ini.
- Ledger: Receipt aktual dicatat setelah commit berhasil untuk update task berikutnya.

### Blocker atau tindak lanjut

Menunggu review/permintaan implementasi dan dependency; tidak berstatus Ready hanya karena source API tersedia.

## Task: ADMC-008 — Detail konten dan readonly state

- Status: Backlog
- Owner: Pengembang/agent pelaksana
- Prioritas: P1 — sesuai dependency
- Referensi: ADMC-US-04; PRD-03/08/09; GR-01/05/08; plan STEP-008.
- Diperbarui: 2026-10-05
- Dependensi: ADMC-004, ADMC-005.
- Ukuran: Satu hasil review; target files/symbols mengikuti STEP-008. Pecah jika refinement menemukan scope lebih besar.

### Ruang lingkup

Route detail index leaf dan content-detail; statuses/timestamps/genre serta edit capability dari metadata existing.

### Acceptance criteria

- [ ] Direct link/refresh bekerja; invalid/missing ID punya state jelas tanpa membocorkan private data.
- [ ] Edit ditawarkan hanya draft movie/standalone; published/archived/episode unsupported readonly.
- [ ] Source availability tidak dilabeli sebagai readiness HLS; preview sibling routing tidak terganggu.

### Validasi

Lifecycle/kind fixtures, 404, direct refresh, timestamps/canonical metadata dan preview regression; root gates.

### Hasil dan bukti

Belum diimplementasikan atau diuji. Hasil runtime tidak disimpulkan dari plan.

### Commit task

- Pesan: Conventional Commit dengan ID ADMC-008 sesuai hasil implementasi.
- SHA: Belum dibuat.
- Hook/checks: Belum dijalankan untuk task ini.
- Ledger: Receipt aktual dicatat setelah commit berhasil untuk update task berikutnya.

### Blocker atau tindak lanjut

Menunggu review/permintaan implementasi dan dependency; tidak berstatus Ready hanya karena source API tersedia.

## Task: ADMC-009 — Edit draft dengan version conflict

- Status: Backlog
- Owner: Pengembang/agent pelaksana
- Prioritas: P1 — sesuai dependency
- Referensi: ADMC-US-04; PRD-03/09; GR-01/05/08; plan STEP-009.
- Diperbarui: 2026-10-05
- Dependensi: ADMC-006, ADMC-008.
- Ukuran: Satu hasil review; target files/symbols mengikuti STEP-009. Pecah jika refinement menemukan scope lebih besar.

### Ruang lingkup

Route edit, form baseline/version, PATCH mutation/error mapping dan success invalidation.

### Acceptance criteria

- [ ] Form baseline/rowVersion tidak berubah diam-diam akibat background refetch; payload hanya changed fields + expectedVersion.
- [ ] Stale version/slug/state/archived race mempertahankan input dan tidak auto-retry/overwrite.
- [ ] Reload terbaru memerlukan konfirmasi dirty; save sukses memakai metadata canonical/versi baru dan persist setelah refresh.

### Validasi

Two-tab race, background refetch saat dirty, clear nullable/genre/rights, stale conflict/reload/success flow; root gates.

### Hasil dan bukti

Belum diimplementasikan atau diuji. Hasil runtime tidak disimpulkan dari plan.

### Commit task

- Pesan: Conventional Commit dengan ID ADMC-009 sesuai hasil implementasi.
- SHA: Belum dibuat.
- Hook/checks: Belum dijalankan untuk task ini.
- Ledger: Receipt aktual dicatat setelah commit berhasil untuk update task berikutnya.

### Blocker atau tindak lanjut

Menunggu review/permintaan implementasi dan dependency; tidak berstatus Ready hanya karena source API tersedia.

## Task: ADMC-010 — Perlindungan input belum disimpan

- Status: Backlog
- Owner: Pengembang/agent pelaksana
- Prioritas: P1 — sesuai dependency
- Referensi: ADMC-US-04; PRD-03/08/09; GR-01/05/08; plan STEP-010.
- Diperbarui: 2026-10-05
- Dependensi: ADMC-007, ADMC-009.
- Ukuran: Satu hasil review; target files/symbols mengikuti STEP-010. Pecah jika refinement menemukan scope lebih besar.

### Ruang lingkup

Hook router blocker/beforeunload dan AlertDialog untuk create/edit dirty state; data hanya memory.

### Acceptance criteria

- [ ] Navigasi internal/back dapat dibatalkan atau dikonfirmasi; focus kembali benar dan guard hilang setelah save.
- [ ] Logout/session expiry/forbidden tetap dapat membersihkan cache dan mengunci akses tanpa navigation loop.
- [ ] Limitasi browser/force-close mobile dicatat; tidak menambah private localStorage persistence.

### Validasi

Cancel/confirm/clean/save/back/unload plus logout/expiry, browser keyboard dan root gates.

### Hasil dan bukti

Belum diimplementasikan atau diuji. Hasil runtime tidak disimpulkan dari plan.

### Commit task

- Pesan: Conventional Commit dengan ID ADMC-010 sesuai hasil implementasi.
- SHA: Belum dibuat.
- Hook/checks: Belum dijalankan untuk task ini.
- Ledger: Receipt aktual dicatat setelah commit berhasil untuk update task berikutnya.

### Blocker atau tindak lanjut

Menunggu review/permintaan implementasi dan dependency; tidak berstatus Ready hanya karena source API tersedia.

## Task: ADMC-011 — Acceptance UI, persistensi dan closure

- Status: Backlog
- Owner: Pengembang/agent pelaksana
- Prioritas: P1 — sesuai dependency
- Referensi: ADMC-US-05; PRD-01/02/03/08/09; GR-01/05/08; plan STEP-011.
- Diperbarui: 2026-10-05
- Dependensi: ADMC-002 sampai ADMC-010 serta ADMC-012.
- Ukuran: Satu hasil review; target files/symbols mengikuti STEP-011. Pecah jika refinement menemukan scope lebih besar.

### Ruang lingkup

Browser smoke fixtures/worker mengikuti harness existing; dedicated DB persistence lewat API, evidence/backlog/plan/index.

### Acceptance criteria

- [ ] Movie/standalone list/create/read/edit/conflict terbukti dengan API dan dedicated PostgreSQL, bukan fixture HTTP saja.
- [ ] Browser light/dark 320/390/768/1024/1440 px, keyboard/labels/contrast/loading/empty/error, auth cleanup dan preview routing lulus.
- [ ] Existing/new relevant tests, types/lint/build/docs/format/whitespace serta conditional frozen install lulus; limitations dicatat.
- [ ] Semua task runtime committed per task; scope upload/publish/series/katalog dan production readiness tidak diklaim selesai.

### Validasi

Root gates, production Bun browser/SSR proof terkait, dedicated content schema/runtime proof; tidak menghapus/mengisi DB development.

### Hasil dan bukti

Belum diimplementasikan atau diuji. Hasil runtime tidak disimpulkan dari plan.

### Commit task

- Pesan: Conventional Commit dengan ID ADMC-011 sesuai hasil implementasi.
- SHA: Belum dibuat.
- Hook/checks: Belum dijalankan untuk task ini.
- Ledger: Receipt aktual dicatat setelah commit berhasil untuk update task berikutnya.

### Blocker atau tindak lanjut

Menunggu review/permintaan implementasi dan dependency; tidak berstatus Ready hanya karena source API tersedia.

## Task: ADMC-012 — Theme switcher shared shell

- Status: Backlog
- Owner: Pengembang/agent pelaksana
- Prioritas: P1
- Referensi: ADMC-US-01; PRD-02/08; plan STEP-012; permintaan pengguna 5 Oktober 2026.
- Diperbarui: 2026-10-05
- Dependensi: ADMC-002, ADMC-004; permintaan implementasi.
- Ukuran: Shared control/preference/bootstrap dan meaningful theme verification.

### Ruang lingkup

Light/Dark/System di seluruh halaman admin, accessible names/active state, browser preference non-rahasia, media listener dan root bootstrap jika diperlukan. Target source mengikuti STEP-012; tidak mengubah media player atau menyimpan private form/cache.

### Acceptance criteria

- [ ] Semua lima halaman memiliki switcher yang sama dengan Light/Dark/System berfungsi melalui semantic tokens.
- [ ] Preference persisted, System mengikuti media change, storage unavailable/invalid preference punya fallback; default System merupakan proposal untuk review.
- [ ] Initial render/hydration tidak flash/mismatch; pergantian tema mempertahankan form dirty dan tidak memblokir auth expiry/logout.
- [ ] Keyboard/nama aksesibel/active state dan tests/browser/root gates lulus.

### Validasi

Mode/reload/persistence/system change/storage failure tests, browser keyboard/dirty form/SSR hydration; root tests/types/lint/build dan auth regression bila root berubah.

### Hasil dan bukti

Belum diimplementasikan. Mockup Light hanya menunjukkan posisi/appearance kontrol, bukan bukti theme switching runtime.

### Commit task

- Pesan: Conventional Commit dengan ID ADMC-012 sesuai implementasi.
- SHA: Belum dibuat.
- Hook/checks: Belum dijalankan untuk task runtime ini.
- Ledger: Receipt setelah commit berhasil.

### Blocker atau tindak lanjut

Menunggu review visual/permintaan implementasi dan dependency.

## User story: ADMC-US-06

Sebagai admin, saya ingin meninjau desain desktop light seluruh halaman dengan layout dan theme switcher yang konsisten sebelum implementasi.

## Task: ADMC-DES-001 — Desain desktop light lima halaman

- Status: Review
- Owner: Codex
- Prioritas: P1 — sebelum runtime tasks
- Referensi: ADMC-US-06; PRD-02/03/08; permintaan pengguna 5 Oktober 2026.
- Diperbarui: 2026-10-05
- Dependensi: ADMC-001 dan design system yang disetujui.
- Ukuran: Satu proposal visual konsisten untuk lima halaman dan refinement theme requirement.

### Ruang lingkup

Dashboard/list/create/detail/edit desktop light dalam lima PNG baru, shared Light/Dark/System control, prompt/referensi canonical di [desain desktop light](../design/admin-content-desktop-light.md), update context/plan/backlog/index. Preserve aset/CSS/desain lokal lain; tanpa implementasi app.

### Acceptance criteria

- [x] Lima halaman desktop light tersedia dengan brand/sidebar/header/theme switcher yang konsisten.
- [x] Form lengkap sesuai kontrak, jenis edit readonly, rights unchecked, status editorial/source terpisah; tanpa aksi/features di luar iterasi metadata.
- [x] Prompt, path, metode built-in, data contoh dan batas mockup dicatat; proposal belum dianggap approval visual atau runtime proof.
- [ ] Docs/format/whitespace, staged snapshot/preservation dan commit task terpisah lulus.

### Validasi

Inspeksi semua hasil image_gen, invariants/layout/copy/theme switcher, file PNG/dimensi, docs:check, targeted Prettier, diff --check, scoped staging dan preservation. Tidak menjalankan browser screenshot atau runtime app untuk mockup raster.

### Hasil dan bukti

Lima PNG final tersimpan di `docs/design/`, masing-masing 1536 × 1024 piksel. Built-in image_gen digunakan lima call utama dan tiga koreksi terarah; prompt persis serta referensi tersedia pada dokumen desain. Inspeksi visual semua output final lulus untuk shared shell/Light aktif, field metadata/genre/rights, jenis edit readonly, status editorial/source dan batas scope. Koreksi terakhir: badge Terbit netral, badge Draf berbahasa Indonesia dan helper sumber video tanpa istilah implementasi. Ini proposal visual dengan data contoh, bukan hasil browser atau theme switching runtime.

Pemeriksaan 5 Oktober 2026: `bun run docs:check` worktree lulus 51 Markdown/368 tautan; staged snapshot melalui checker yang sama lulus 44 Markdown/349 tautan. Targeted Prettier, `git diff --check` dan `git diff --cached --check` lulus. SHA-256 preservation 23 file existing selain indeks lulus; staged index hanya tiga perubahan navigasi milik task. Scope commit 10 file desain/dokumentasi; source/manifest/lock tidak berubah oleh task. Receipt hook/commit dicatat sesudah commit berhasil.

### Commit task

- Pesan: `docs(design): add admin desktop light mockups (ADMC-DES-001)`.
- SHA: Belum dibuat.
- Hook/checks: Menunggu hasil aktual.
- Ledger: Receipt dicatat setelah commit untuk update task berikutnya.

### Blocker atau tindak lanjut

Desain dark/mobile dan implementasi menjadi langkah setelah review; request ini hanya desktop light.
