# Implementation plan: dashboard metadata konten

## Plan metadata

- Status: ready untuk review scope; proposal UI belum disetujui dan implementasi belum diminta.
- Tanggal: 5 Oktober 2026.
- Repository: `bayuaji17/vertical-movie-app`.
- Base ref: `main`; base SHA / last validated SHA: `c5406282f8f3c86563ba7112ec43d2aa17f97da2`.
- Context: [repository-context.md](repository-context.md), disimpan sebelum plan ini.
- Backlog: [admin-content](../../tasks/admin-content.md).
- Branch planning: `chore/admin-content-plan`; branch implementasi yang diusulkan: `feat/admin-content-dashboard`.
- Otorisasi: pengguna meminta plan detail tahap pertama frontend pada 5 Oktober 2026. Root workflow mengotorisasi commit task planning; source runtime, instalasi komponen, push/PR/merge fitur ini belum diminta.

## Objective

Admin dapat menemukan movie/standalone, membuat draft dan menyimpan perubahan metadata melalui dashboard responsif dengan data PostgreSQL nyata. Sesi, akses privat, version conflict dan kegagalan tetap mengikuti API existing.

## Goals and non-goals

Iterasi 1 mencakup shell dashboard, list/search/kind/includeArchived/cursor, taxonomy selector, form create/detail/edit, safe mutation dan unsaved-change protection. Draft dapat disimpan sebelum video/sampul diunggah atau sinopsis/hak lengkap untuk publish.

Upload video/sampul, progres/resume, processing/readiness, aksi publish/archive, pengelolaan series/season/episode, genre CRUD, pengaturan situs dan katalog publik berada pada iterasi berikutnya. Tidak menambah analytics, metrik global palsu, rich text editor, auto-save, akun atau schema baru.

## Current behavior

Dashboard `/admin` memiliki informasi principal/logout saja. Protected layout, private-query cleanup dan same-origin gateway tersedia. Video API menyediakan metadata create/read/update untuk tiga kind, tetapi frontend iterasi ini hanya membuka movie/standalone. PATCH draft memakai expectedVersion; published/archived read-only. Cursor, taxonomy dan error domain sudah tersedia; metadata DTO belum membawa poster URL atau status job lengkap.

Context membedakan snapshot committed dan perubahan desain lokal yang sudah disetujui. Foundation final tidak boleh dianggap tersedia pada fresh checkout sebelum integrasi Git desain selesai.

## Desired behavior

### Halaman dan navigasi

| URL publik web              | Route file yang diusulkan di `apps/web/src/routes/` | Perilaku                                                                                                                             |
| --------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `/admin`                    | `admin._authenticated.index.tsx`                    | Dashboard existing dengan identitas sesi, heading Dashboard dan CTA Kelola konten/Buat draft; tidak menghitung total dari satu page. |
| `/admin/videos`             | `admin._authenticated.videos.index.tsx`             | List metadata movie/standalone, default movie, pencarian judul dan cursor.                                                           |
| `/admin/videos/new`         | `admin._authenticated.videos.new.tsx`               | Pilih movie/standalone lalu simpan draft.                                                                                            |
| `/admin/videos/$id`         | `admin._authenticated.videos.$id.index.tsx`         | Detail metadata, status editorial/source availability dan tombol edit jika draft.                                                    |
| `/admin/videos/$id/edit`    | `admin._authenticated.videos.$id.edit.tsx`          | Form edit draft dengan versi dari hasil detail yang dijadikan baseline.                                                              |
| `/admin/videos/$id/preview` | Route existing                                      | Tetap tersedia dengan guard/player existing; bukan entry wajib iterasi metadata.                                                     |

Route index baru harus menjadi leaf; jangan memakai detail `$id.tsx` tanpa Outlet yang menghalangi preview/edit. Gunakan generator untuk routeTree.gen.ts dan pastikan trailing slash/canonical routing serta direct refresh berjalan.

Sidebar desktop memakai Dashboard/Konten; mobile memakai trigger/panel dengan focus management. Navigasi hanya menautkan halaman yang berfungsi. Logout ditempatkan pada shell agar tersedia di semua halaman tanpa menggandakan workflow auth. Gunakan Bahasa Indonesia dan landmark/lang pada shell sesuai bahasa konten.

### Daftar konten

- Desktop: Table title, jenis, status editorial, diperbarui dan aksi detail/edit. Mobile: Card dengan informasi yang sama; satu sumber data Query, tidak menggandakan fetch.
- ToggleGroup memilih Film (`movie`) atau Standalone; tidak mengirim filter union yang API belum menerima. Default movie. Link create dapat membawa pilihan kind yang divalidasi.
- Search judul maksimal 200 karakter, debounce rekomendasi 300 ms; URL menyimpan search/kind/includeArchived. Perubahan filter mengosongkan rangkaian cursor dan tidak menampilkan hasil filter sebelumnya sebagai hasil baru.
- Checkbox “Sertakan arsip” sesuai API, default false. Ini active + archived, bukan hanya archived. Status ditampilkan, tetapi filter publicationStatus dan sort tidak ditawarkan karena API belum mendukungnya.
- Page size 20, urutan API createdAt/id descending. “Muat lagi” menggunakan nextCursor opaque; tidak ada total count, page number, decode cursor atau sorting satu page yang terlihat seperti sorting global.
- Empty katalog dan empty pencarian dibedakan; Skeleton initial loading, inline error/retry, serta load-more error yang mempertahankan halaman sebelumnya. Tidak menggunakan sourceAvailability untuk label HLS “Siap”.

### Form metadata

| Field UI/payload                   | Validasi/perilaku                                                                                                                                  |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Jenis / `kind`                     | Movie atau standalone saat create; tidak dikirim saat PATCH dan tidak bisa diganti.                                                                |
| Judul / `title`                    | Wajib, trim nonempty, maksimal 200 karakter.                                                                                                       |
| Slug / `slug`                      | Opsional create; jika kosong omit agar server menghasilkan. Manual max 180, lowercase kebab-case; edit title tidak otomatis mengubah slug.         |
| Judul asli / `originalTitle`       | Opsional/null, max 200.                                                                                                                            |
| Sinopsis / `synopsis`              | Opsional/null saat draft, max 500; tidak dibuat wajib hanya karena nanti diperlukan saat publish.                                                  |
| Deskripsi / `description`          | Plain text opsional/null, max 10000; tampilkan sebagai teks, tanpa HTML injection.                                                                 |
| Bahasa asli / `originalLanguage`   | Opsional/null, max 35, BCP 47; server canonicalization tetap otoritatif.                                                                           |
| Tahun / `releaseYear`              | Opsional/null, integer 1800–9999; string kosong tidak dikonversi menjadi 0.                                                                        |
| Tanggal / `releaseDate`            | Opsional/null, tanggal kalender valid YYYY-MM-DD; jika tahun ada harus konsisten.                                                                  |
| Genre / `genreIds`                 | Pilihan ID existing unik, maksimal 100. Paginated search/load-more, selected IDs tetap utuh walaupun opsi tidak ada pada page aktif. Kosong boleh. |
| Konfirmasi hak / `rightsConfirmed` | Checkbox eksplisit, default false pada create; pada edit berasal dari rightsConfirmedAt. Timestamp/actor tidak dikirim.                            |
| Versi / `expectedVersion`          | Hanya PATCH, dari baseline detail saat edit dimulai; tidak diambil diam-diam dari refetch baru.                                                    |

Create memakai whitelist payload; field opsional kosong/null ditentukan konsisten. PATCH hanya field berubah plus expectedVersion: clear nullable mengirim null, clear genre mengirim [], unchanged di-omit; simpan disabled bila tidak ada perubahan. Kind, publicationStatus, audit timestamps, sourceAvailability dan grouping tidak dikirim.

Form menggunakan TanStack Form existing, FieldGroup/Field/FieldSet, validasi inline, first-invalid focus, Alert dan toast existing. Edit tidak di-reset ketika background refetch terjadi saat form dirty. API sukses menyediakan metadata canonical dan versi terbaru; refetch detail hanya setelah keberhasilan, bukan untuk menimpa input gagal.

### Data, error dan mutation

- Pakai private Eden existing. Tipe request/response diturunkan dari kontrak; jangan menyalin DTO ke package baru. Base URL hilang/invalid menampilkan konfigurasi unavailable, tanpa fallback ke origin lain.
- Auth tetap SSR existing; metadata Query client-side setelah principal tersedia. Tidak menambah global server client/cookie atau mem-persist private cache. Query key berawalan `admin`, memasukkan identity, resource dan filter agar cleanup existing bekerja.
- Read memakai AbortSignal dan manual retry; tidak retry otomatis 401/403/404/422. Mutation POST/PATCH `retry: false`, disabled saat pending, tidak optimistic update untuk persistensi draft.
- Create success: invalidate list dan navigate detail ID dari server; kemudian read detail karena create DTO bukan detail penuh. PATCH success: invalidate list/detail dan terapkan baseline versi baru; kegagalan tidak menghapus input.
- 401/403 mengikuti privateApiFetcher/transisi existing; UI tidak membocorkan cache setelah sesi hilang. 404 menjadi “Konten tidak ditemukan”; 503/network tetap error/retry tanpa menganggap akses granted.
- `SLUG_CONFLICT`: error slug dengan input dipertahankan. `CONTENT_VERSION_CONFLICT`: input tetap tersedia, tidak auto-overwrite/retry; admin dapat memuat versi terbaru dengan konfirmasi jika form dirty. State/archived conflict menjadi readonly/refetch dengan penjelasan.
- 422 backend belum menyediakan map field terstruktur. Validasi lokal menghasilkan field error; server error ditampilkan inline sebagai form error kecuali code diketahui. Jangan menebak field dari substring pesan Inggris.
- POST create tidak idempotent: timeout/jaringan putus sesudah send bisa berarti data sudah tersimpan. Tampilkan hasil belum dapat dipastikan, pertahankan input dan arahkan cek daftar sebelum submit lagi; tidak menjanjikan exactly-once atau melakukan automatic replay.
- Dirty draft disimpan hanya pada memory form. Konfirmasi sebelum navigasi internal dan beforeunload sesuai dukungan browser; logout/sesi berakhir tetap memprioritaskan penutupan akses dan tidak memblokir redirect auth. Pesan browser bisa berbeda dan tidak dijamin pada force close mobile.

## Impact analysis

Perubahan utama hanya `apps/web` dengan reuse API/auth/gateway. Tidak ada endpoint/migration wajib berdasarkan kontrak yang telah ditelusuri. Jika implementasi menemukan kebutuhan status/poster/count di luar DTO, lakukan refinement task API terpisah; jangan menyisipkan scope upload/monitoring atau schema sebagai solusi tersembunyi.

Generated shadcn primitives dapat menyentuh CSS, hooks dan dependency transitif. Gunakan dry-run/diff, install dari `apps/web`, audit diff existing components/styles serta frozen lockfile jika script/dependency berubah. Bun.lock memiliki satu writer; jangan regenerasi komponen existing massal.

## Affected files and symbols

Path baru merupakan target yang diusulkan; buat bersama task, bukan placeholder sekarang. Evidence pada [context](repository-context.md#evidence-index).

| Path                                                                                                                                                                                             | Action | Symbols / alasan                                                                                   | Evidence                                                        |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `apps/web/src/components/admin/admin-shell.tsx`, `admin-navigation.tsx`, `admin-logout.tsx`                                                                                                      | create | Shell/sidebar dan reuse logout existing.                                                           | Protected layout dan AdminDashboardContent.                     |
| `apps/web/src/routes/admin._authenticated.tsx`, `admin._authenticated.index.tsx`                                                                                                                 | modify | Bungkus Outlet dengan shell; pertahankan guard/context dan heading/sesi.                           | requireAdminSession, ProtectedAdminLayout.                      |
| Route videos index/new/detail-index/edit pada tabel URL                                                                                                                                          | create | Loader/search/state dan halaman metadata.                                                          | API videos index/model.                                         |
| `apps/web/src/components/admin/content-list.tsx`, `content-filters.tsx`, `content-detail.tsx`, `content-form.tsx`, `genre-picker.tsx`                                                            | create | Table/cards, read-only detail dan reusable form.                                                   | Metadata DTO, UI primitives dan login form existing.            |
| `apps/web/src/lib/admin/content-client.ts`, `content-queries.ts`, `content-form.ts`, `content-errors.ts`, `use-unsaved-changes.ts`                                                               | create | Typed operations, keys, mapper/diff/errors/blocker; nama final diperiksa saat task.                | Private Eden, pagination, server metadata/errors, auth cleanup. |
| `apps/web/src/components/ui/sidebar.tsx`, `table.tsx`, `checkbox.tsx`, `toggle-group.tsx`, `empty.tsx`, `skeleton.tsx`, `alert-dialog.tsx` dan dependency source yang benar-benar diperlukan CLI | create | Primitives belum installed; review import/transitive hooks/Sheet/Dialog/Tooltip/Toggle sesuai CLI. | Shadcn info dan docs resmi.                                     |
| `apps/web/test/admin-content-client.test.ts`, `admin-content-form.test.ts`                                                                                                                       | create | Meaningful request/error/diff/cancellation/version behavior.                                       | bun:test existing; server tidak diimpor runtime.                |
| `apps/web/test/content-eden-contract.ts`, `session-cache.test.ts`                                                                                                                                | modify | Tambah contract/cleanup cases bila behavior baru membutuhkan.                                      | Existing compile-only contract/predicate.                       |
| `apps/web/test/admin-content-browser-smoke.mjs`, `admin-content-browser-worker.mjs`                                                                                                              | create | Browser flow/fixture; jangan mengganti auth proof dengan snapshot palsu.                           | Existing auth browser harness pattern.                          |
| `apps/web/test/auth-browser-worker.mjs`, `auth-routes-browser-worker.mjs`, `auth-native-browser-worker.mjs`, `auth-ssr-smoke.mjs`                                                                | modify | Sesuaikan selector hanya bila shell berubah; tujuan assertion auth tetap.                          | Existing dashboard/logout selectors.                            |
| `apps/web/src/routeTree.gen.ts`                                                                                                                                                                  | modify | Hanya output generator, tidak hand-edit.                                                           | generate-routes script/TanStack plugin.                         |
| `apps/web/package.json`, `bun.lock`                                                                                                                                                              | modify | Conditional: dependency transitif primitive atau script smoke bila dibutuhkan.                     | Resolved deps; tidak upgrade paket unrelated.                   |
| `apps/web/src/styles.css`                                                                                                                                                                        | modify | Conditional hasil CLI saja; preserve token/font/media existing dan pekerjaan desain lokal.         | Worktree design vs HEAD.                                        |
| `docs/plans/admin-content/*`, `docs/tasks/admin-content.md`                                                                                                                                      | create | Context/plan/evidence.                                                                             | Root documentation rules.                                       |
| `docs/README.md`                                                                                                                                                                                 | modify | Navigasi dan status proposal.                                                                      | Root documentation rules.                                       |

API/shared/auth/Turbo/env/player source tidak ditargetkan untuk iterasi metadata ini. Tidak ada env publik baru diperlukan.

## Implementation DAG

`ADMC-001 planning → ADMC-002 primitives → ADMC-004 shell → ADMC-005 list`.

`ADMC-001 → ADMC-003 typed data → ADMC-005`.

`ADMC-002 + ADMC-003 → ADMC-006 form mapper → ADMC-007 create`.

`ADMC-004 + ADMC-005 → ADMC-008 detail`.

`ADMC-006 + ADMC-008 → ADMC-009 edit`.

`ADMC-007 + ADMC-009 → ADMC-010 unsaved protection → ADMC-011 acceptance/closure`.

ADMC-011 juga bergantung pada semua task runtime. Eksekusi default satu task utama; DAG bukan permintaan menjalankan subagent. Setiap task selesai mempunyai commit terpisah sesuai root workflow.

## Implementation steps

### STEP-001 / ADMC-001 — Context dan planning

- Outcome: snapshot/plan/backlog serta navigasi siap review.
- Depends on: none.
- Files: feature context/plan, backlog dan docs index.
- Symbols: contracts/route map/evidence.
- Requirements: simpan context lebih dahulu, preserve perubahan lokal, source belum diubah.
- Validation: docs:check, Prettier, diff --check, scoped index/preservation dan hook commit.
- Acceptance criteria: plan terpetakan ke task/AC; commit lokal planning tanpa source implementasi/desain unrelated.

### STEP-002 / ADMC-002 — Fondasi komponen

- Outcome: primitives yang dibutuhkan dapat dipakai tanpa mengganti preset/token.
- Depends on: STEP-001 dan permintaan implementasi; recheck integrasi desain lokal.
- Files: ui primitives/transitive hooks; manifest/lock/CSS hanya jika diperlukan.
- Symbols: Sidebar/Table/Checkbox/ToggleGroup/Empty/Skeleton/AlertDialog.
- Requirements: read docs installed/config, CLI dry-run/diff dari web; audit source imports dan preserve existing components/tema. Pisahkan pekerjaan integrasi token/assets desain agar scope Git jelas.
- Validation: frozen install bila dependency/script berubah, root types/lint/build, inspeksi CLI diff; docs/evidence.
- Acceptance criteria: primitives compile, no mass overwrite, light/dark tokens existing terjaga; artifact fresh checkout menggunakan hanya tracked fondasi atau limitation dicatat sebelum acceptance visual.

### STEP-003 / ADMC-003 — Typed data dan private cache

- Outcome: operasi list/detail/genres/create/PATCH melalui Eden dengan satu error mapping.
- Depends on: STEP-001 dan permintaan implementasi.
- Files: lib/admin client/queries/errors, contract test dan unit behavior test.
- Symbols: createPrivateApiClient, admin query keys/options, ApiError handling.
- Requirements: infer types, signal/no-store/credentials, principal identity, retry false mutation, no runtime API import, cursor opaque, server canonical response.
- Validation: injected fetch success/401/403/404/409/422/503/network/abort, mutation no retry, compile positive/negative contracts; root gates.
- Acceptance criteria: failed responses bukan cached success, write payload typed, private cache cleaned dan konfigurasi invalid terkunci.

### STEP-004 / ADMC-004 — Shell dashboard

- Outcome: dashboard/nav/logout responsif untuk anak route existing dan baru.
- Depends on: STEP-002.
- Files: admin shell/navigation/logout, protected layout/index, existing smoke selectors bila perlu.
- Symbols: ProtectedAdminLayout/Outlet/AdminDashboardContent/logout.
- Requirements: guard tetap authoritative, session context tidak di-reset, heading Dashboard tetap, mobile focus/keyboard, action targets 44 px, no analytics/count fiction.
- Validation: login/logout/session regression, browser mobile/desktop/dark shell, SSR import/guard proof bila boundary berubah; root gates.
- Acceptance criteria: anonymous/forbidden/outage tetap terkunci, semua halaman anak mendapat shell; logout failure/success mempertahankan behavior existing.

### STEP-005 / ADMC-005 — Daftar/search/cursor

- Outcome: daftar movie/standalone nyata dengan state lengkap.
- Depends on: STEP-003, STEP-004.
- Files: videos index route, content-list/filters, query options.
- Symbols: list search params, paginated query, nextCursor.
- Requirements: tabel/cards, default movie, debounce, URL-filter reset, includeArchived semantics, no status filter/count/sort, error load-more tidak menghapus page.
- Validation: fixture 0/1/21+ rows, filter change while request pending, no duplicate entries/mixing pages, refresh/back/forward; root gates.
- Acceptance criteria: data sesuai filter API, nextCursor opaque, loading/empty/retry accessible, no misleading media readiness.

### STEP-006 / ADMC-006 — Form dan payload mapper

- Outcome: reusable metadata form serta create/patch mapper sesuai tabel field.
- Depends on: STEP-002, STEP-003.
- Files: content-form/genre-picker UI, lib/admin/content-form, behavior tests.
- Symbols: normalized form values, validation, changed-fields PATCH baseline.
- Requirements: TanStack Form/Field, limits/calendar/language, optional draft fields, paginated genre selection, explicit rights and immutable kind.
- Validation: meaningful fixtures trim/null/empty/limits/date-year/genre paging/diff unchanged vs clear, canonical values; keyboard field errors; root gates.
- Acceptance criteria: form dapat menyimpan metadata minimal tanpa source/sampul; mapper tidak membawa readonly/grouping fields dan no-op PATCH disabled.

### STEP-007 / ADMC-007 — Buat draft

- Outcome: POST movie/standalone lalu detail dengan ID hasil server.
- Depends on: STEP-006.
- Files: videos new route, form mutation/query integration.
- Symbols: create mutation, success navigation/list invalidation.
- Requirements: pending disables duplicate clicks, no auto replay; failure preserves input, uncertain network outcome dijelaskan, slug server tidak dihitung ulang client.
- Validation: sukses dua kind/title-only dan full metadata, 409 slug, 422, network/503, rapid double click; root gates.
- Acceptance criteria: satu submit UI satu POST, only confirmed success navigates dan draft dapat dibaca ulang.

### STEP-008 / ADMC-008 — Detail dan state readonly

- Outcome: detail metadata dapat dibuka langsung/refresh; edit hanya draft supported kind.
- Depends on: STEP-004, STEP-005.
- Files: videos detail index route/content-detail/query.
- Symbols: detail metadata, editorial state capability.
- Requirements: draft/published/archived/source availability ditampilkan tepat; missing/invalid ID accessible; episode yang dibuka langsung readonly dengan penjelasan scope; preview existing tidak terganggu.
- Validation: direct refresh, 404, canonical timestamps, three lifecycle states, unsupported episode, preview routing; root gates.
- Acceptance criteria: controls sesuai API, tidak menyamakan source available dengan HLS ready, tanpa actions publish/archive yang belum dibuat.

### STEP-009 / ADMC-009 — Edit dan version conflict

- Outcome: perubahan draft aman dan dapat ditinjau saat stale version.
- Depends on: STEP-006, STEP-008.
- Files: videos edit route/form/query/mapping/error integration.
- Symbols: initial baseline/rowVersion, patch mutation, conflict handling.
- Requirements: refetch tidak menimpa dirty form; changed-field whitelist + expectedVersion baseline, clear null/[]; 409 retain input dan explicit reload, published/archived race remains denied.
- Validation: two-tab version race, external edit/refetch while dirty, successful version increment, clear optional values/genres/rights; root gates.
- Acceptance criteria: no blind overwrite/retry, reload confirmation, success baseline canonical terbaru dan data persist setelah refresh.

### STEP-010 / ADMC-010 — Perubahan belum disimpan

- Outcome: navigasi pengguna tidak membuang input dirty tanpa konfirmasi.
- Depends on: STEP-007, STEP-009.
- Files: unsaved-changes hook, form routes dan AlertDialog composition.
- Symbols: dirty baseline, router blocker dan beforeunload lifecycle.
- Requirements: internal navigation/back, close dialog focus restore, clean state setelah save; auth expiry/logout bypass blocker dan clear private data.
- Validation: cancel/confirm navigation, clean/saved form, browser back, tab unload supported, session expiry/forced logout; root gates.
- Acceptance criteria: guard tidak menghambat keamanan auth atau membuat navigation loop; limitation force-close/browser dicatat.

### STEP-011 / ADMC-011 — Acceptance dan closure

- Outcome: hasil iterasi dibuktikan lintas UI/API/persistensi dan docs diperbarui.
- Depends on: STEP-002–010.
- Files: browser smoke fixture/worker, evidence/backlog/plan/index; scripts hanya bila diperlukan.
- Symbols: metadata end-to-end, auth/cache/isolation/responsiveness.
- Requirements: fixture untuk fault deterministic; satu alur persistence pada dedicated test DB melalui API existing. Jangan mutasi DB development tanpa task/otorisasi. Screenshot light/dark mobile/desktop, keyboard, loading/empty/error, actual API requests.
- Validation: existing tests + meaningful new tests, root types/lint/build, production Bun browser/SSR smoke, dedicated content proof, docs/format/whitespace; scripts/deps frozen install bila berubah.
- Acceptance criteria: seluruh iterasi-1 AC lulus dan setiap task committed; evidence jujur terhadap fixture/browser/DB. Upload/media/publish/Katalog dan production readiness tetap roadmap.

## Test requirements

| Area              | Bukti yang diperlukan                                                                                                                         |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| API client/cache  | Status failures thrown, identity/private key cleanup, abort, unchanged public clients, no mutation replay.                                    |
| Mapper/validation | Title/slug limits, blank/null/year/calendar/language, optional metadata, unique genre IDs, explicit rights, changed-fields/version.           |
| Listing           | 20+ cursor rows, filter reset, request race, archived-inclusive, empty/retry, back/refresh without mixed data.                                |
| Persistensi       | Movie dan standalone create/read/edit, minimal metadata, canonical DTO, version increment dan two-tab conflict di dedicated DB.               |
| Security          | Anonymous/non-admin/session expiry, gateway cookie scope, private cache removed, server import proof jika boundary berubah.                   |
| Browser           | 320/390/768/1024/1440 px; light/dark, no overflow, keyboard/focus/labels/44px, contrast rendered, unsaved/logout, no console hydration error. |

Gunakan Bun native tests untuk mapper/client behavior, bukan snapshot yang hanya mencocokkan markup atau test setiap komponen reversible. Browser scripts mengikuti harness existing dan adapter host Playwright; tidak otomatis menambah dependency besar. Fixture HTTP tidak membuktikan PostgreSQL persistence; kedua evidence dibedakan.

Setelah setiap runtime task selesai: `bun test apps/web/test`, `bun run check-types`, `bun run lint`, `bun run build`; tambah proof/browser yang relevan sesuai task. Jika backend berubah setelah refinement: `bun run --cwd apps/api test`, dedicated content schema/runtime proof dan migrations hanya jika schema berubah. Gate closure memakai hasil masih valid; ulangi setelah source/script/dependency berubah atau ada failure baru.

Planning saja: `bun run docs:check`, installed Prettier untuk Markdown berubah, `git diff --check`, staged snapshot docs dan preservation. Hooks tetap dijalankan, tidak bypass. Tidak melaporkan test implementasi yang belum dijalankan sebagai lulus.

## Constraints

Bun workspace; API tetap owns business rules, client type-only; no server secrets/DB/storage di frontend. No custom auth/gateway, no auto save/draft persistence, no manual route tree, no hosted CI baru. Root instructions mengatur commit task, branch prefix dan scope remote. Style/player/design worktree yang sudah ada tetap terjaga.

## Acceptance criteria

- [ ] Admin sah dapat list/search/load more movie/standalone serta create/read/edit draft dengan persistensi benar.
- [ ] Metadata title-only dapat disimpan; optional fields, rights dan genre mengikuti API.
- [ ] Published/archived serta episode di luar scope tidak dapat diedit melalui form iterasi ini.
- [ ] Version/slug/state/network/validation conflicts tidak menimpa input atau memicu replay tulis otomatis.
- [ ] Logout/expiry membersihkan cache private; UI dan endpoint tetap terlindungi.
- [ ] Semua halaman responsif/keyboard/light/dark; route preview existing tetap berfungsi.
- [ ] Test/gates/DB/browser evidence sesuai scope, docs/status dan commit per task selesai.

## Risks and mitigations

Form dirty vs refetch: baseline/version immutable sampai save/reload eksplisit. Cursor-filter race: key lengkap, signal dan reset pages. Create ambiguous outcome: no automatic retry, cek daftar sebelum submit ulang. Slug/key fields: whitelist serta server authority. UI readiness palsu: pakai status editorial/source literal, defer status job. Design untracked: integrate separately sebelum release/fresh-checkout acceptance. Primitive generator: preview diff dan stage hanya task. Auth regressions akibat pindah logout/shell: preserve handlers dan jalankan smoke existing.

## Rollback or recovery

Revert commit runtime task secara bertahap bila regressions; dashboard sesi existing dapat dipulihkan tanpa menghapus metadata yang sudah tersimpan. Tidak ada migration/schema/media baru pada scope ini. Jangan reset/stash seluruh worktree, menghapus objek bucket atau menghapus data konten untuk mengembalikan UI.

## Evidence

[Repository context](repository-context.md#evidence-index) memetakan source/kontrak/versi/worktree dan dokumentasi resmi. [Backlog](../../tasks/admin-content.md) menyimpan status serta bukti command aktual; plan ini belum evidence runtime fitur.

## Open decisions

Proposal default siap direview: movie/standalone dahulu; default movie; sidebar/table-cards; halaman form terpisah; Bahasa Indonesia; metadata complete dengan field optional. Tidak ada keputusan produk baru wajib yang menghalangi penulisan plan. Pengguna dapat menyesuaikan proposal sebelum meminta implementasi.

Integrasi Git desain lokal perlu dipastikan sebelum ADMC-002/final visual acceptance. Batas backend sudah diketahui; jika diminta status filter/global metrics/poster/readiness, perlu task kontrak terpisah. Menambahkan atau mengubah field metadata bukan bagian otomatis implementasi plan.

## Roadmap setelah iterasi 1

1. Upload sumber/sampul: UI signed multipart, part 2% dengan minimum 5 MiB, concurrency/resume/retry/status/abort mengikuti API dan limit approved. Refinement harus membahas reselection file dan resume browser; tidak menyimpan file dalam localStorage.
2. Monitoring worker: status queue/processing/ready/failed dan jalur pemulihan aktual. Kontrak display status/job perlu ditelusuri lebih jauh sebelum dianggap cukup.
3. Preview/publish/archive: reuse player dan endpoints existing, manual publish/readiness, rights dan stale/idempotency errors. Gunakan videojs skill saat playback diubah.
4. Series/season/episode: grouping forms, genre inheritance, numbering/version dan parent publication.
5. Katalog publik/detail/navigasi: memerlukan keputusan UX katalog tersisa; settings/subtitle mengikuti keputusan produk terpisah.

Roadmap bukan daftar task Ready atau perluasan acceptance iterasi 1. Jangan menerapkan semua sekaligus pada branch frontend pertama.

## Validation history

### 2026-10-05 — Freshness planning

- Result: valid.
- Plan base/current target SHA: `c5406282f8f3c86563ba7112ec43d2aa17f97da2`.
- Checked paths: routes/auth/Eden/gateway/Query/Form/UI configs, API metadata/models/pagination/errors, manifests/lock dan canonical docs.
- Changed relevant paths: dark CSS/design/index merupakan pekerjaan lokal existing; dua receipt build juga existing. Perubahan ini ditandai di context dan dipisahkan staging.
- Decision: plan teknis ready untuk review; recheck HEAD/affected paths/local design sebelum eksekusi dan jangan menganggap approval implementasi sudah diberikan.

## Execution log

- Context ditulis sebelum plan; source runtime/manifest/lock/route tree tidak diubah oleh task planning.
- Branch planning `chore/admin-content-plan` dibuat pada base SHA sesuai root purpose prefix dan workflow commit task lokal.
- Status/bukti pemeriksaan dokumen dan receipt ADMC-001 dicatat setelah benar-benar teramati pada backlog.
- Checks planning 5 Oktober 2026: docs:check worktree 50 Markdown/355 tautan, staged snapshot 43 Markdown/336 tautan, targeted Prettier dan whitespace lulus. Preservation 23 file existing selain indeks lulus; index staging memuat navigasi planning saja. Source/manifest/lock/route tree task tidak berubah; hasil hook/commit planning mengikuti receipt ADMC-001.
