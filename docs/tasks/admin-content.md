# Modul: Dashboard metadata konten

> Status: planning · 5 Oktober 2026 · Permintaan pengguna: plan tahap pertama frontend. Requirement v2 disetujui pengguna; desain/rencana dan implementasi disetujui pengguna 5 Oktober 2026; runtime In Progress. Hasil pemeriksaan hanya dicatat setelah teramati.

## Task: ADMC-DES-004 — Desain mobile light/dark v2

- Status: Done
- Owner: Codex
- Prioritas: P1
- Referensi: ADMC-US-06; permintaan pengguna 5 Oktober 2026.
- Diperbarui: 2026-10-05
- Dependensi: ADMC-DES-002/003 dan desktop v2.
- Ukuran: Sepuluh PNG — lima halaman × light/dark; responsive design proposal, tanpa source runtime.

### Ruang lingkup

Mobile dashboard/list/create/detail/edit English, hamburger/drawer navigation, avatar/Appearance kanan atas, Log out pada footer drawer. List cards/pagination/custom; form/detail satu kolom. Light dibuat lebih dahulu, dark mengikuti mobile light. Desktop tetap utuh; canonical mobile prompt/evidence dan plan/context/backlog/index diperbarui.

### Acceptance criteria

- [x] Sepuluh aset mobile portrait tersedia, shared header/avatar/menu dan kedua palet konsisten dengan desktop v2.
- [x] Semua metadata/actions/create tiga jenis/edit immutable/rights/genre/state tersedia pada single-column flow; list cards/custom3/range1–3of42/page1of14 konsisten.
- [x] Dashboard dropdown menunjukkan theme aktif; navigasi drawer/log out, safe touch/scroll dan batas screenshot vs runtime dicatat.
- [x] Prompt/path/tool/PNG/visual proof, preservation/docs/format/whitespace/staged snapshot serta commit task lulus.

### Validasi

Native image inspection semua output, PNG dimensions/mode, theme pair/layout/fields/copy invariants, desktop/source/unrelated hash preservation; docs:check, targeted Prettier, diff/scoped index dan existing hooks. Full-page raster bukan hasil browser responsiveness/keyboard/runtime.

### Hasil dan bukti

Built-in image_gen: sepuluh panggilan utama, tanpa koreksi tambahan. Sepuluh final native previews inspected; English/fields/actions/dropdown aktif/list cards dan custom3/range1–3of42/page1of14 tersedia. Header PNG: kelima light 836×1881, kelima dark 836×1882, mode100644; perbedaan tinggi generator dicatat tanpa resize. Canonical memuat exact prompts dan batas raster/header/touch vs runtime. Hash preservation 33 file (23 unrelated selain indeks +10 desktop v2) lulus; source runtime task tidak diubah. `bun run docs:check` worktree lulus 52 Markdown/391 tautan, staged snapshot 45 Markdown/372 tautan. Targeted Prettier dan whitespace lulus; index hanya 16 file assets/docs milik task, perubahan indeks existing tetap terpisah. Hasil hooks/commit menyusul receipt pascacommit.

### Commit task

- Pesan: docs(design): add admin mobile mockups (ADMC-DES-004).
- SHA: `e5043eb14d3dc7f8429fa7e70c51bf87242a31dc`.
- Hook/checks: docs:check 52/391, lint 1 task/types 3 task (cache valid), Commitlint lulus tanpa bypass. Commit 16 file assets/docs; belum push/PR/merge.
- Ledger: Receipt pascacommit untuk task berikutnya.

### Blocker atau tindak lanjut

Mobile visual untuk review; source runtime belum diimplementasikan.

## Task: ADMC-DES-003 — Desktop dark v2 dan cleanup aset lama

- Status: Done
- Owner: Codex
- Prioritas: P1
- Referensi: ADMC-US-06; permintaan pengguna 5 Oktober 2026.
- Diperbarui: 2026-10-05
- Dependensi: ADMC-DES-002 dan design system dark approved.
- Ukuran: Lima pasangan dark dari mockup v2 + penghapusan lima PNG v1 yang superseded.

### Ruang lingkup

Built-in image_gen dark recolor dashboard/list/create/detail/edit. Preserve English/avatar/Appearance/Log out/three types/pagination/forms, Dark selected pada dropdown dashboard terbuka. Hapus lima admin desktop light-v1 PNG dari worktree (history Git tetap ada), tetap simpan light v2 sebagai pasangan desain terbaru. Update canonical desain/prompt/context/plan/backlog/index dan semua link legacy aktif; preserve source/aset desain unrelated.

### Acceptance criteria

- [x] Lima dark mockup memakai charcoal #1E201E dan semantic palette dark; layout/data/controls sesuai light v2.
- [x] Dashboard dropdown memilih Dark; empat halaman lain closed; semua teks dan controls tetap terbaca serta form/pagination utuh.
- [x] Lima PNG v1 dihapus dan semua link aktif diperbarui; light v2 dan pekerjaan existing tetap utuh, prompt/tool/path tercatat.
- [x] Inspeksi visual/PNG, docs/format/whitespace/scoped preservation dan commit task lulus.

### Validasi

Native inspection lima output, PNG dimensi/mode, hash preservation source/light v2/unrelated, docs:check dan staged snapshot, targeted Prettier/diff; hook commit existing. Mockup bukan browser runtime atau audit contrast numerik.

### Hasil dan bukti

Built-in image_gen: lima edit + satu koreksi badge Draft detail. Kelima final native output inspected; dark palette/English/fields/avatar/dropdown/Log out/pagination/custom sesuai light v2, dashboard memilih Dark. PNG 1536×1024/mode100644. Lima v1 PNG dan prompt/links legacy retired; light-v2 serta 23 existing unrelated file hash preservation lulus (28 total). Prompt/dark evidence disimpan di canonical desain. `bun run docs:check` worktree lulus 51 Markdown/374 tautan; staged snapshot lulus 44 Markdown/355 tautan setelah link anchor ke design-system worktree diganti link dokumen tracked. Targeted Prettier, diff/check cached lulus; scope staging 15 file termasuk 5 penghapusan v1, index hanya perubahan navigasi/format task. Hook/commit dicatat setelah teramati.

### Commit task

- Pesan: docs(design): add admin dark mockups (ADMC-DES-003).
- SHA: `0ef62913b98d85517fc663319830d3247263e1d9`.
- Hook/checks: docs:check 51/374, lint 1 task/types 3 task (cache valid) dan Commitlint lulus tanpa bypass. Commit 15 file, termasuk lima penghapusan v1/lima dark baru; belum push/PR/merge.
- Ledger: Receipt pascacommit untuk task berikutnya.

### Blocker atau tindak lanjut

Source runtime/mobile tetap belum dikerjakan; request ini desktop dark dari desain v2.

## Tujuan modul

Admin dapat list/create/read/edit metadata Film/Standalone/Series melalui UI terlindungi dan responsif. Acuan: [context](../plans/admin-content/repository-context.md), [plan](../plans/admin-content/implementation-plan.md), [PRD](../product/prd.md), [workflow](../guides/development-workflow.md) dan [template task](../templates/task.md). Upload/sampul, worker status, preview/publish/archive actions dan hierarchy menjadi refinement berikutnya.

## User story: ADMC-US-00

Sebagai pengembang, saya ingin plan berdasarkan kontrak dan snapshot nyata agar implementasi dapat direview sebelum dimulai.

## User story: ADMC-US-01

Sebagai admin, saya ingin navigasi dashboard responsif serta logout yang tersedia di setiap halaman.

## User story: ADMC-US-02

Sebagai admin, saya ingin mencari dan membuka Film/Standalone/Series yang tersimpan dengan pagination yang benar.

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

- Status: Done
- Owner: Pengembang/agent pelaksana
- Prioritas: P1 — sesuai dependency
- Referensi: ADMC-US-01; PRD-02/08; GR-01/05/08; plan STEP-002.
- Diperbarui: 2026-10-05
- Dependensi: ADMC-001, ADMC-DES-002, permintaan implementasi dan recheck integrasi desain lokal.
- Ukuran: Satu hasil review; target files/symbols mengikuti STEP-002. Pecah jika refinement menemukan scope lebih besar.

### Ruang lingkup

Primitives yang belum installed dan dependency transitif source/manifest/lock/CSS yang benar-benar dibutuhkan. Review dry-run/diff dari apps/web.

### Acceptance criteria

- [x] Sidebar/Table/Checkbox/ToggleGroup/Empty/Skeleton/AlertDialog tersedia dengan Base UI Rhea dan API yang ditinjau.
- [x] Tidak overwrite komponen existing, token/font/player atau pekerjaan desain; integrasi Git fondasi final dicatat terpisah.
- [x] Frozen install jika dependency/script berubah serta root gates lulus.

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

### Evidence implementasi — 5 Oktober 2026

Shadcn base-rhea/Remixicon official docs + CLI dry-run reviewed; 11 new primitives, existing button deliberately skipped. No manifests/lock/preset/CSS changed. Existing auth guard/cache: 16 tests/55 assertions pass. Root types 3 tasks, lint 1 task and build 2 tasks pass; registry inline type imports fixed to repository top-level import-type convention after initial lint failure. Sidebar implemented later by shell using Sheet/shared navigation; no redundant Sidebar dependency.

Commit lokal berikutnya merekam task ini; SHA aktual dicatat pascacommit.

- Receipt commit task: `97718bc243d86ed08dad01074f383f496c5cdd48`; hooks docs/lint/types/Commitlint lulus tanpa bypass.

## Task: ADMC-003 — Typed client dan private query cache

- Status: Done
- Owner: Pengembang/agent pelaksana
- Prioritas: P1 — sesuai dependency
- Referensi: ADMC-US-02; PRD-01/03/09; GR-01/05/08; plan STEP-003.
- Diperbarui: 2026-10-05
- Dependensi: ADMC-001 dan permintaan implementasi. Tambahan refinement v2: ADMC-013.
- Ukuran: Satu hasil review; target files/symbols mengikuti STEP-003. Pecah jika refinement menemukan scope lebih besar.

### Ruang lingkup

lib/admin content client/queries/errors, infer DTO/request dari Eden; operasi list/detail/genres/create/PATCH melalui gateway existing.

### Acceptance criteria

- [x] Error HTTP/network/abort menjadi failure, signal diteruskan; base URL invalid menutup akses data.
- [x] Query key admin memuat identity/filter; logout/expiry cleanup existing berlaku.
- [x] POST/PATCH tanpa automatic retry; payload typed tanpa runtime import API/server secrets.

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

### Evidence implementasi — 5 Oktober 2026

Six native behavior tests/28 assertions pass: filters/credentials/no-store/signal, 401 cleanup/public preservation, 403/404/409/422/503, cancellation, identity keys, nested Series create, one POST on lost connection and invalid configuration. Eden 1.4.10 synthetic fetch-error 503 is normalized separately from HTTP failures; Root check-types (3 tasks), lint (1), build (2) pass. Types inferred from API only; no API/server runtime import or cache persistence.

Commit lokal berikutnya merekam task ini; SHA aktual dicatat pascacommit.

- Receipt commit task: `b44b8dbf1dbe598f85a5bc3edb6251b58f515746`; hooks docs/lint/types/Commitlint lulus tanpa bypass. Lint import spacing failures fixed and hooks rerun successfully.

## Task: ADMC-015 — Integrasi token charcoal approved

- Status: Review
- Owner: Codex
- Prioritas: P1
- Referensi: desain final disetujui pengguna 3 Oktober 2026; implementasi disetujui 5 Oktober 2026.
- Diperbarui: 2026-10-05
- Dependensi: ADMC-002.
- Ukuran: CSS semantic tokens existing + scoped documentation.

### Ruang lingkup

Masukkan override `.dark` approved yang sudah ada pada worktree ke source tracked; tidak mengubah light/preset/nama token/player. Artefak boards/exports unrelated tetap tidak distage. Desain runtime fresh checkout memakai CSS sebagai source canonical, bukan ketergantungan pada untracked JSON/HTML.

### Acceptance criteria

- [x] Charcoal #1E201E serta pasangan semantic tokens dark approved menjadi tracked.
- [x] Light dan existing semantic contract/preset/media styling tetap utuh; scope staging hanya CSS/token notes/evidence.
- [x] Root types/lint/build/docs/whitespace serta commit lulus.

### Validasi

Review diff CSS; root gates dan existing auth regression. Exact screenshot/contrast runtime ditinjau pada ADMC-011, berbeda dari token integration.

### Hasil dan bukti

Menunggu checks aktual.

### Commit task

Pesan: `style(web): integrate approved charcoal tokens (ADMC-015)`; SHA setelah commit.

### Blocker atau tindak lanjut

Tidak menganggap artefak final desain untracked sudah tersedia pada checkout lain.

### Evidence implementasi — 5 Oktober 2026

CSS diff reviewed: only approved dark overrides, unchanged light/media/preset. Root types 3 tasks, lint 1, build 2 passed (valid cache from matching source). Design notes staged against HEAD to preserve pre-existing full design-system edits/exports; CSS token integration intentionally owns approved existing override. Prior shell auth native/SSR/browser proofs remain unchanged. Docs/staged checks below.

Commit lokal berikutnya merekam task ini; SHA aktual dicatat pascacommit.

## Task: ADMC-004 — Shell dan navigasi admin responsif

- Status: Done
- Owner: Pengembang/agent pelaksana
- Prioritas: P1 — sesuai dependency
- Referensi: ADMC-US-01; PRD-01/02/08; GR-01/05/08; plan STEP-004.
- Diperbarui: 2026-10-05
- Dependensi: ADMC-002.
- Ukuran: Satu hasil review; target files/symbols mengikuti STEP-004. Pecah jika refinement menemukan scope lebih besar.

### Ruang lingkup

Admin shell/navigation/logout dan protected layout/index. Pertahankan authoritative guard, principal context serta workflow logout existing.

### Acceptance criteria

- [x] Dashboard/Konten/CTA bekerja pada desktop dan mobile tanpa dead navigation atau fake analytics.
- [x] Semua anak route tetap guarded; preview existing tetap dapat dirender.
- [x] Logout success/failure, session expiry, forbidden/unavailable tetap benar; keyboard/focus/touch layout dapat dipakai.

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

### Evidence implementasi — 5 Oktober 2026

Shared AdminShell/one logout controller; sidebar at lg, focus-managed titled mobile Sheet, top-right avatar identity menu, English private lock screens, skip link and real principal account. Child routes keep existing authoritative guard/context. New content navigation/action cards are added with ADMC-005/007 once targets exist; theme is ADMC-012. Auth guard/cache/session: 20 tests/83 assertions pass; SSR Bun smoke passes admin/null/non-admin/outage/stall/cookie/no-secret checks. Built Bun/Nitro browser cache + routes proof passed: login/logout failures, loading/result toasts, role lock, in-flight logout, cross-tab/back denial and no transient error screen. Mobile drawer hides the background access tree while open; assertion closes the drawer before checking Dashboard. Root check-types (3), lint (1), build (2) pass.

Commit lokal berikutnya merekam task ini; SHA aktual dicatat pascacommit.

- Receipt commit task: `d66c78407d462f0b3c7027e55ed3321d22958308`; hooks docs/lint/types/Commitlint lulus tanpa bypass.

## Task: ADMC-005 — Daftar metadata dengan search dan pagination

- Status: Backlog
- Owner: Pengembang/agent pelaksana
- Prioritas: P1 — sesuai dependency
- Referensi: ADMC-US-02; PRD-02/03/08/09; GR-01/05/08; plan STEP-005.
- Diperbarui: 2026-10-05
- Dependensi: ADMC-003, ADMC-004. Tambahan refinement v2: ADMC-013.
- Ukuran: Satu hasil review; target files/symbols mengikuti STEP-005. Pecah jika refinement menemukan scope lebih besar.

### Ruang lingkup

Route videos index, list table/mobile cards, kind/search/includeArchived URL state serta paginated Query.

### Acceptance criteria

- [ ] Film/Standalone/Series, search/debounce dan Include archived; total filter dari ADMC-013, tanpa status filter/sort palsu.
- [ ] Numbered pages, default 10/preset 10/25/50/100 dan Custom 1–100; filter/size reset page 1 dan request race tidak mencampur hasil.
- [ ] Loading/empty/error/page retry accessible; page error mempertahankan hasil lama bertanda stale, range/boundaries benar.

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
- Dependensi: ADMC-006. Tambahan refinement v2: ADMC-014.
- Ukuran: Satu hasil review; target files/symbols mengikuti STEP-007. Pecah jika refinement menemukan scope lebih besar.

### Ruang lingkup

Route videos/new dan create mutation; sukses navigate detail dari ID server serta invalidate list.

### Acceptance criteria

- [ ] Satu submit pending satu POST, Film/Standalone/Series metadata didukung melalui resource benar (ADMC-014).
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
- Dependensi: ADMC-004, ADMC-005. Tambahan refinement v2: ADMC-014.
- Ukuran: Satu hasil review; target files/symbols mengikuti STEP-008. Pecah jika refinement menemukan scope lebih besar.

### Ruang lingkup

Route detail index leaf dan content-detail; statuses/timestamps/genre serta edit capability dari metadata existing.

### Acceptance criteria

- [ ] Direct link/refresh bekerja; invalid/missing ID punya state jelas tanpa membocorkan private data.
- [ ] Edit hanya draft Film/Standalone/Series; published/archived/episode readonly dan Series tidak membawa rights/source video.
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
- Dependensi: ADMC-006, ADMC-008. Tambahan refinement v2: ADMC-014.
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
- Dependensi: ADMC-002 sampai ADMC-010 serta ADMC-012–014.
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

Avatar dropdown kanan atas berisi identity/Appearance Light/Dark/System; English UI, Log out kiri bawah; accessible names/expanded/focus return/active state, browser preference non-rahasia, media listener dan root bootstrap jika diperlukan. Target source mengikuti STEP-012; tidak mengubah media player atau menyimpan private form/cache.

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

- Status: Done
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
- [x] Docs/format/whitespace, staged snapshot/preservation dan commit task terpisah lulus.

### Validasi

Inspeksi semua hasil image_gen, invariants/layout/copy/theme switcher, file PNG/dimensi, docs:check, targeted Prettier, diff --check, scoped staging dan preservation. Tidak menjalankan browser screenshot atau runtime app untuk mockup raster.

### Hasil dan bukti

Lima PNG final tersimpan di `docs/design/`, masing-masing 1536 × 1024 piksel. Built-in image_gen digunakan lima call utama dan tiga koreksi terarah; prompt persis serta referensi tersedia pada dokumen desain. Inspeksi visual semua output final lulus untuk shared shell/Light aktif, field metadata/genre/rights, jenis edit readonly, status editorial/source dan batas scope. Koreksi terakhir: badge Terbit netral, badge Draf berbahasa Indonesia dan helper sumber video tanpa istilah implementasi. Ini proposal visual dengan data contoh, bukan hasil browser atau theme switching runtime.

Pemeriksaan 5 Oktober 2026: `bun run docs:check` worktree lulus 51 Markdown/368 tautan; staged snapshot melalui checker yang sama lulus 44 Markdown/349 tautan. Targeted Prettier, `git diff --check` dan `git diff --cached --check` lulus. SHA-256 preservation 23 file existing selain indeks lulus; staged index hanya tiga perubahan navigasi milik task. Scope commit 10 file desain/dokumentasi; source/manifest/lock tidak berubah oleh task. Receipt hook/commit dicatat sesudah commit berhasil.

### Commit task

- Pesan: `docs(design): add admin desktop light mockups (ADMC-DES-001)`.
- SHA: `ace666f4a4a6d1971df42e12763ec9871e808e8b`.
- Hook/checks: docs:check 51/368, lint 1 task/types 3 task (cache valid) dan Commitlint lulus tanpa bypass. Sepuluh file desain/dokumentasi committed; PNG memakai mode 100644. Belum push/PR/merge.
- Ledger: Receipt dicatat setelah commit untuk update task berikutnya.

### Blocker atau tindak lanjut

Desain dark/mobile dan implementasi menjadi langkah setelah review; request ini hanya desktop light.

## Task: ADMC-013 — Kontrak pagination server

- Status: Done
- Owner: Codex/pengembang pelaksana
- Prioritas: P1
- Referensi: plan; revisi pengguna 5 Oktober 2026.
- Diperbarui: 2026-10-05
- Dependensi: Requirement v2 dan permintaan implementasi.
- Ukuran: Satu hasil review menurut scope berikut.

### Ruang lingkup

Proposal GET /admin/content type/page/pageSize/search/includeArchived dengan typed items/total/page/pageSize/totalPages. Dispatch videos/series, requireAdmin, order createdAt/id deterministic, count/data memakai filter dan snapshot sama. Cursor endpoints existing tetap kompatibel; gateway allowlist ditinjau. Lihat STEP-013.

### Acceptance criteria

- [x] Tiga jenis, total filter, numbered boundaries dan custom 1–100 akurat; invalid/empty/out-of-range behavior terdokumentasi.
- [x] HTTP authorization/query/DTO tests serta dedicated PostgreSQL filter/count/snapshot/performance proof dan root gates lulus; existing consumers tidak rusak.

### Validasi

bun:test HTTP; dedicated DB pagination/filter parity/last page/concurrent writes; root types/lint/build/docs. Bila schema berubah ikuti migration gate.

### Hasil dan bukti

Belum implemented. Current DTO hanya items/nextCursor; angka 42 pada mockup merupakan contoh.

### Commit task

- Pesan: Conventional Commit dengan ID ADMC-013.
- SHA: Belum dibuat.
- Hook/checks: Menunggu hasil aktual.
- Ledger: Receipt pascacommit untuk task berikutnya.

### Blocker atau tindak lanjut

Visual v2 untuk review; runtime belum diminta/diimplementasikan.

### Evidence implementasi — 5 Oktober 2026

HTTP/regression: 16 tests/74 assertions pass (content/videos/series/gateway). Dedicated PostgreSQL: 2 tests/52 assertions pass; 43 rows per resource, boundaries, wildcard literals and concurrent count/page parity. Root check-types (3 tasks), lint (1), build (2) pass. No schema migration or development DB mutation. Offset pagination beyond the last returns an empty page; large-dataset profiling remains a deployment check.

Commit lokal berikutnya merekam task ini; SHA aktual dicatat pascacommit.

- Receipt commit task: `841db1736f9625ada7968830a77ca70acfc1cd86`; hooks docs/lint/types/Commitlint lulus tanpa bypass.

## Task: ADMC-014 — Metadata Series dan resource dispatch

- Status: Backlog
- Owner: Codex/pengembang pelaksana
- Prioritas: P1
- Referensi: plan; revisi pengguna 5 Oktober 2026.
- Diperbarui: 2026-10-05
- Dependensi: ADMC-003, ADMC-006, ADMC-DES-002 dan permintaan implementasi.
- Ukuran: Satu hasil review menurut scope berikut.

### Ruang lingkup

Lima template content melayani Film/Standalone/Series, conditional fields/cards dan typed routes/client/forms. Film→movie/Standalone→standalone, Series resource terpisah dengan completionStatus/nested create response/defaultSeason. Season 1 readonly; hierarchy editor tetap roadmap. Lihat STEP-014.

### Acceptance criteria

- [ ] Tidak mengirim kind series/rights/source video pada Series; create/read/edit editorial/completionStatus dan expectedVersion sesuai kontrak.
- [ ] Resource immutable, payload isolation, nested response, errors/dirty input, browser dan dedicated persistence/root gates dibuktikan.

### Validasi

Mapper/resource/contract behavior, tiga jenis create/read/edit, invalid type/ID/conflict dan dedicated persistence/browser/root gates.

### Hasil dan bukti

Belum implemented. Screenshot Film adalah acuan layout; template Series conditional menjadi pekerjaan task ini.

### Commit task

- Pesan: Conventional Commit dengan ID ADMC-014.
- SHA: Belum dibuat.
- Hook/checks: Menunggu hasil aktual.
- Ledger: Receipt pascacommit untuk task berikutnya.

### Blocker atau tindak lanjut

Visual v2 untuk review; runtime belum diminta/diimplementasikan.

## Task: ADMC-DES-002 — Revisi desktop light v2

- Status: Done
- Owner: Codex/pengembang pelaksana
- Prioritas: P1
- Referensi: plan; revisi pengguna 5 Oktober 2026.
- Diperbarui: 2026-10-05
- Dependensi: ADMC-DES-001 dan screenshot pengguna.
- Ukuran: Satu hasil review menurut scope berikut.

### Ruang lingkup

Lima PNG v2: avatar/dropdown kanan atas dan Appearance; Log out kiri bawah; English UI; Film/Standalone/Series; numbered pagination/custom page size. Canonical prompt/desain/context/plan/backlog/index diperbarui. Preserve v1 dan pekerjaan existing.

### Acceptance criteria

- [x] Lima mockup English light memiliki avatar kanan atas/Log out kiri bawah; dashboard menunjukkan dropdown Light/Dark/System terbuka, lainnya closed.
- [x] List/create memiliki tiga jenis; list tepat 10 baris/page/range/total/custom, form lengkap/edit type readonly.
- [x] Prompt/tool/path/data contoh dan kebutuhan API/Series dicatat; semua final visual/invariants diperiksa.
- [x] Docs/format/whitespace/staged snapshot/preservation dan commit task lokal lulus.

### Validasi

Native image inspection, PNG dimensions/mode, read-only kontrak Video/Series/list, docs:check/Prettier/diff/scoped staging. Tanpa browser/runtime proof.

### Hasil dan bukti

Built-in image_gen: lima edit utama dan dua koreksi avatar. Semua final inspected; kelima PNG 1536×1024/mode100644 disimpan di docs/design. v1/source/runtime tetap utuh. `bun run docs:check` worktree lulus 51 Markdown/373 tautan; staged snapshot checker lulus 44 Markdown/354 tautan. Targeted Prettier, `git diff --check` dan `git diff --cached --check` lulus; hash preservation 23 file existing selain indeks lulus. Staging 10 file milik task; index hanya navigasi/format terkait tanpa aset desain lokal unrelated. Hook/receipt commit dicatat sesudah berhasil.

### Commit task

- Pesan: docs(design): revise admin desktop mockups (ADMC-DES-002).
- SHA: `71a9dfb67f379afcd6b7411d2788587f284f7ed3`.
- Hook/checks: docs:check 51/373, lint 1 task/types 3 task (cache valid) dan Commitlint lulus tanpa bypass. Sepuluh file desain/dokumentasi committed; source runtime tidak diubah; belum push/PR/merge.
- Ledger: Receipt pascacommit untuk task berikutnya.

### Blocker atau tindak lanjut

Visual v2 untuk review; runtime belum diminta/diimplementasikan.
