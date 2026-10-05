# Implementation plan: dashboard metadata konten

## Plan metadata

- Status: implemented dan verified lokal pada 5 Oktober 2026; semua task runtime committed terpisah.
- Tanggal: 5 Oktober 2026.
- Repository: `bayuaji17/vertical-movie-app`.
- Base ref planning: `main`; base SHA: `c5406282f8f3c86563ba7112ec43d2aa17f97da2`. Eksekusi dimulai pada `e5043eb14d3dc7f8429fa7e70c51bf87242a31dc`; freshness closure diperiksa pada `ec7ea091bb20073479d86721502c3e994393eea8` beserta perubahan task ADMC-011.
- Context: [repository-context.md](repository-context.md), disimpan sebelum plan ini.
- Backlog: [admin-content](../../tasks/admin-content.md).
- Branch planning: `chore/admin-content-plan`; branch implementasi: `feat/admin-content-dashboard`.
- Otorisasi: pengguna meminta plan detail tahap pertama frontend, kemudian desain desktop light untuk lima halaman dengan theme switcher pada 5 Oktober 2026. Root workflow mengotorisasi commit task planning/desain; Implementasi runtime/komponen disetujui pengguna pada 5 Oktober 2026; push/PR/merge tanpa squash disetujui pengguna pada 5 Oktober 2026 setelah acceptance; deployment production tetap di luar permintaan.

## Objective

Admin dapat menemukan Film/Standalone/Series, membuat draft dan menyimpan perubahan metadata melalui dashboard responsif dengan data PostgreSQL nyata. Sesi, akses privat, version conflict dan kegagalan tetap mengikuti API existing.

## Goals and non-goals

Iterasi 1 mencakup shell dashboard dengan theme switcher, list/search/type/includeArchived/page/pageSize, taxonomy selector, form create/detail/edit, safe mutation dan unsaved-change protection. Draft dapat disimpan sebelum video/sampul diunggah atau sinopsis/hak lengkap untuk publish.

Upload video/sampul, progres/resume, processing/readiness, aksi publish/archive, pengelolaan season/episode (metadata Series masuk iterasi ini), genre CRUD, pengaturan situs dan katalog publik berada pada iterasi berikutnya. Tidak menambah analytics, metrik global palsu, rich text editor, auto-save, akun atau schema baru.

## Snapshot sebelum implementasi (sejarah)

Dashboard `/admin` memiliki informasi principal/logout saja. Protected layout, private-query cleanup dan same-origin gateway tersedia. Video API menyediakan metadata create/read/update untuk tiga kind, serta resource Series tersendiri. Requirement v2 frontend membuka Film/Standalone/Series. PATCH draft memakai expectedVersion; published/archived read-only. Cursor, taxonomy dan error domain sudah tersedia; total/page belum tersedia dan perlu ADMC-013; metadata DTO belum membawa poster URL atau status job lengkap.

Context membedakan snapshot committed dan perubahan desain lokal yang sudah disetujui. Foundation final tidak boleh dianggap tersedia pada fresh checkout sebelum integrasi Git desain selesai.

## Desired behavior

### Halaman dan navigasi

| URL publik web                | Route file di apps/web/src/routes/               | Perilaku                                                                              |
| ----------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------- |
| /admin                        | admin._authenticated.index.tsx                   | Dashboard, Create draft/View content; tidak menampilkan analytics palsu.              |
| /admin/content                | admin._authenticated.content.index.tsx           | Film/Standalone/Series, search, Include archived, server pagination/custom page size. |
| /admin/content/new            | admin._authenticated.content.new.tsx             | Tiga jenis, conditional fields; POST video atau Series sesuai resource.               |
| /admin/content/:type/:id      | admin._authenticated.content.$type.$id.index.tsx | Detail typed video/Series; type whitelist film/standalone/series.                     |
| /admin/content/:type/:id/edit | admin._authenticated.content.$type.$id.edit.tsx  | Edit draft resource immutable dan expectedVersion baseline.                           |
| /admin/videos/:id/preview     | Route existing                                   | Guard/player existing tetap berfungsi.                                                |

Namespace content adalah implementasi v2 untuk lima template yang sama; rute metadata v1 tidak dibuat; template generik diterapkan. Film dipetakan ke movie; Series bukan video kind. Generator route tree digunakan saat runtime tasks.
Route index baru harus menjadi leaf; jangan memakai detail `$id.tsx` tanpa Outlet yang menghalangi preview/edit. Gunakan generator untuk routeTree.gen.ts dan pastikan trailing slash/canonical routing serta direct refresh berjalan.

Sidebar desktop memakai Dashboard/Content; mobile memakai trigger/panel dengan focus management. Navigasi hanya menautkan halaman yang berfungsi. Logout ditempatkan pada shell agar tersedia di semua halaman tanpa menggandakan workflow auth. Avatar/name/chevron di kanan atas membuka identity dan Appearance Light/Dark/System; Log out tetap kiri bawah. Gunakan English untuk semua copy UI dan landmark/lang shell, tanpa mengubah bahasa metadata asli.

### Desain desktop dan theme switcher

Pengguna meminta mockup desktop light seluruh lima halaman sebelum implementasi. Referensi dan prompt berada pada [desain desktop light](../../design/admin-content-desktop-light.md), task ADMC-DES-001 (history) dan ADMC-DES-002 (v2). Dua penggunaan modal konfirmasi (dirty navigation dan reload saat conflict) disetujui pengguna; screenshot halaman normal tidak menutupi form dengan overlay.

Theme switcher merupakan requirement shared shell pada setiap halaman: Light/Dark/System di dalam avatar dropdown, dengan nama aksesibel/expanded state/focus return, Light aktif pada mockup sekarang. Dashboard menunjukkan dropdown terbuka; halaman lain menunjukkan trigger tertutup. Task ADMC-012 menangani runtime preference non-rahasia, System/media change, bootstrap tanpa flash/hydration mismatch dan form state tetap utuh saat tema berubah. Referensi mobile berada pada [desain mobile](../../design/admin-content-mobile.md). Screenshot list mobile mendemokan custom3 dengan range1–3of42/page1of14; default runtime tetap10. Header hamburger/drawer menggantikan sidebar, Log out tetap footer drawer; form/detail satu kolom, cards untuk list.

Default aplikasi yang diusulkan adalah System jika belum ada preferensi; desain tahap ini tetap Light. Preferensi tema boleh dipersist, private metadata/cache/form tidak dipersist. Desktop dark v2 diminta pengguna pada ADMC-DES-003 sebagai pasangan light; mobile diminta pengguna pada ADMC-DES-004 sebagai sepuluh pasangan light/dark. Mockup kedua tema tidak membuktikan theme switching runtime.

### Daftar konten

- Desktop: Table title, jenis, status editorial, diperbarui dan aksi detail/edit. Mobile: Card dengan informasi yang sama; satu sumber data Query, tidak menggandakan fetch.
- ToggleGroup memilih Film (`movie`), Standalone atau Series. Default Film. Parameter UI type dan API resource dibedakan; create dapat membawa type yang divalidasi.
- Search judul maksimal 200 karakter, debounce rekomendasi 300 ms; URL menyimpan search/type/includeArchived/page/pageSize. Perubahan filter/page size reset page 1 dan tidak menampilkan hasil filter sebelumnya sebagai hasil baru.
- Checkbox “Include archived” sesuai API, default false. Ini active + archived, bukan hanya archived. Status ditampilkan, tetapi filter publicationStatus dan sort tidak ditawarkan karena API belum mendukungnya.
- Pagination bernomor Previous/Next dan page buttons memakai total server sesuai filter. Usulan default pageSize 10, preset 10/25/50/100 dan Custom integer 1–100; invalid custom mempertahankan nilai aktif. Total/numbered access adalah kontrak ADMC-013, bukan hasil menghitung items cursor. createdAt/id descending tetap deterministic; tidak menawarkan global sort baru.
- Empty katalog dan empty pencarian dibedakan; Skeleton initial loading, inline error/retry, serta page error yang mempertahankan hasil sebelumnya dan menandainya sebagai hasil request lama. Tidak menggunakan sourceAvailability untuk label HLS “Siap”.

### Form metadata

| Field UI/payload                   | Validasi/perilaku                                                                                                                                    |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Jenis / `kind`                     | Film/Standalone memakai Video DTO; Series resource tersendiri. Jenis tidak dikirim saat PATCH dan tidak dapat diganti.                               |
| Judul / `title`                    | Wajib, trim nonempty, maksimal 200 karakter.                                                                                                         |
| Slug / `slug`                      | Opsional create; jika kosong omit agar server menghasilkan. Manual max 180, lowercase kebab-case; edit title tidak otomatis mengubah slug.           |
| Judul asli / `originalTitle`       | Opsional/null, max 200.                                                                                                                              |
| Sinopsis / `synopsis`              | Opsional/null saat draft, max 500; tidak dibuat wajib hanya karena nanti diperlukan saat publish.                                                    |
| Deskripsi / `description`          | Plain text opsional/null, max 10000; tampilkan sebagai teks, tanpa HTML injection.                                                                   |
| Bahasa asli / `originalLanguage`   | Opsional/null, max 35, BCP 47; server canonicalization tetap otoritatif.                                                                             |
| Tahun / `releaseYear`              | Opsional/null, integer 1800–9999; string kosong tidak dikonversi menjadi 0.                                                                          |
| Tanggal / `releaseDate`            | Opsional/null, tanggal kalender valid YYYY-MM-DD; jika tahun ada harus konsisten.                                                                    |
| Genre / `genreIds`                 | Pilihan ID existing unik, maksimal 100. Paginated search/load-more, selected IDs tetap utuh walaupun opsi tidak ada pada page aktif. Kosong boleh.   |
| Konfirmasi hak / `rightsConfirmed` | Film/Standalone saja: checkbox eksplisit default false; edit dari rightsConfirmedAt. Series tidak mengirim field ini. Timestamp/actor tidak dikirim. |
| Versi / `expectedVersion`          | Hanya PATCH, dari baseline detail saat edit dimulai; tidak diambil diam-diam dari refetch baru.                                                      |

Series memakai completionStatus Ongoing/Completed, default ongoing; editorial fields bersama, tanpa video source/rights fields. Create response series.id + defaultSeason ditangani eksplisit; Season 1 hanya ringkasan readonly, editor season/episode tetap di luar scope. Detail mengganti source/rights cards dengan completion status dan ringkasan season.

Create memakai whitelist payload per resource; field opsional kosong/null ditentukan konsisten. PATCH hanya field berubah plus expectedVersion: clear nullable mengirim null, clear genre mengirim [], unchanged di-omit; simpan disabled bila tidak ada perubahan. Kind, publicationStatus, audit timestamps, sourceAvailability dan grouping tidak dikirim.

Form menggunakan TanStack Form existing, FieldGroup/Field/FieldSet, validasi inline, first-invalid focus, Alert dan toast existing. Edit tidak di-reset ketika background refetch terjadi saat form dirty. API sukses menyediakan metadata canonical dan versi terbaru; refetch detail hanya setelah keberhasilan, bukan untuk menimpa input gagal.

### Data, error dan mutation

- Pakai private Eden existing. Tipe request/response diturunkan dari kontrak; jangan menyalin DTO ke package baru. Base URL hilang/invalid menampilkan konfigurasi unavailable, tanpa fallback ke origin lain.
- Auth tetap SSR existing; metadata Query client-side setelah principal tersedia. Tidak menambah global server client/cookie atau mem-persist private cache. Query key berawalan `admin`, memasukkan identity, resource dan filter agar cleanup existing bekerja.
- Read memakai AbortSignal dan manual retry; tidak retry otomatis 401/403/404/422. Mutation POST/PATCH `retry: false`, disabled saat pending, tidak optimistic update untuk persistensi draft.
- Create success: invalidate list dan navigate typed detail; Video memakai id dan Series memakai series.id dari response server; kemudian read detail karena create DTO bukan detail penuh. PATCH success: invalidate list/detail dan terapkan baseline versi baru; kegagalan tidak menghapus input.
- 401/403 mengikuti privateApiFetcher/transisi existing; UI tidak membocorkan cache setelah sesi hilang. 404 menjadi “Content not found”; 503/network tetap error/retry tanpa menganggap akses granted.
- `SLUG_CONFLICT`: error slug dengan input dipertahankan. `CONTENT_VERSION_CONFLICT`: input tetap tersedia, tidak auto-overwrite/retry; admin dapat memuat versi terbaru dengan konfirmasi jika form dirty. State/archived conflict menjadi readonly/refetch dengan penjelasan.
- 422 backend belum menyediakan map field terstruktur. Validasi lokal menghasilkan field error; server error ditampilkan inline sebagai form error kecuali code diketahui. Jangan menebak field dari substring pesan Inggris.
- POST create tidak idempotent: timeout/jaringan putus sesudah send bisa berarti data sudah tersimpan. Tampilkan hasil belum dapat dipastikan, pertahankan input dan arahkan cek daftar sebelum submit lagi; tidak menjanjikan exactly-once atau melakukan automatic replay.
- Dirty draft disimpan hanya pada memory form. Konfirmasi sebelum navigasi internal dan beforeunload sesuai dukungan browser; logout/sesi berakhir tetap memprioritaskan penutupan akses dan tidak memblokir redirect auth. Pesan browser bisa berbeda dan tidak dijamin pada force close mobile.

## Impact analysis

Perubahan runtime mencakup apps/web serta kontrak listing apps/api pada ADMC-013. Proposal endpoint baru GET /admin/content dengan type/page/pageSize/search/includeArchived dan respons typed items/total/page/pageSize/totalPages; list cursor existing dipertahankan agar konsumen lain tidak rusak. Total/count memakai filter dan snapshot read yang sama, order createdAt/id descending; repository dispatch videos vs series, backend tetap requireAdmin. Tidak memerlukan schema baru berdasarkan kebutuhan saat ini; recheck query/index/performance sebelum implementasi. ADMC-014 mengintegrasikan metadata Series existing. Tidak menyisipkan upload/monitoring/publication.

Generated shadcn primitives dapat menyentuh CSS, hooks dan dependency transitif. Gunakan dry-run/diff, install dari `apps/web`, audit diff existing components/styles serta frozen lockfile jika script/dependency berubah. Bun.lock memiliki satu writer; jangan regenerasi komponen existing massal.

## Affected files and symbols

Path baru merupakan target yang diusulkan; buat bersama task, bukan placeholder sekarang. Evidence pada [context](repository-context.md#evidence-index).

| Path                                                                                                                                                                                             | Action | Symbols / alasan                                                                                   | Evidence                                                           |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `apps/web/src/components/admin/admin-shell.tsx`, `admin-navigation.tsx`, `admin-logout.tsx`                                                                                                      | create | Shell/sidebar dan reuse logout existing.                                                           | Protected layout dan AdminDashboardContent.                        |
| `apps/web/src/routes/admin._authenticated.tsx`, `admin._authenticated.index.tsx`                                                                                                                 | modify | Bungkus Outlet dengan shell; pertahankan guard/context dan heading/sesi.                           | requireAdminSession, ProtectedAdminLayout.                         |
| Route content index/new/typed-detail/edit pada tabel URL                                                                                                                                         | create | Loader/search/state dan halaman metadata.                                                          | API videos index/model.                                            |
| `apps/web/src/components/admin/content-list.tsx`, `content-filters.tsx`, `content-detail.tsx`, `content-form.tsx`, `genre-picker.tsx`                                                            | create | Table/cards, read-only detail dan reusable form.                                                   | Metadata DTO, UI primitives dan login form existing.               |
| `apps/web/src/lib/admin/content-client.ts`, `content-queries.ts`, `content-form.ts`, `content-errors.ts`, `use-unsaved-changes.ts`                                                               | create | Typed operations, keys, mapper/diff/errors/blocker; nama final diperiksa saat task.                | Private Eden, pagination, server metadata/errors, auth cleanup.    |
| `apps/web/src/components/ui/sidebar.tsx`, `table.tsx`, `checkbox.tsx`, `toggle-group.tsx`, `empty.tsx`, `skeleton.tsx`, `alert-dialog.tsx` dan dependency source yang benar-benar diperlukan CLI | create | Primitives belum installed; review import/transitive hooks/Sheet/Dialog/Tooltip/Toggle sesuai CLI. | Shadcn info dan docs resmi.                                        |
| `apps/web/test/admin-content-client.test.ts`, `admin-content-form.test.ts`                                                                                                                       | create | Meaningful request/error/diff/cancellation/version behavior.                                       | bun:test existing; server tidak diimpor runtime.                   |
| `apps/web/test/content-eden-contract.ts`, `session-cache.test.ts`                                                                                                                                | modify | Tambah contract/cleanup cases bila behavior baru membutuhkan.                                      | Existing compile-only contract/predicate.                          |
| `apps/web/test/admin-content-browser-smoke.mjs`, `admin-content-browser-worker.mjs`                                                                                                              | create | Browser flow/fixture; jangan mengganti auth proof dengan snapshot palsu.                           | Existing auth browser harness pattern.                             |
| `apps/web/test/auth-browser-worker.mjs`, `auth-routes-browser-worker.mjs`, `auth-native-browser-worker.mjs`, `auth-ssr-smoke.mjs`                                                                | modify | Sesuaikan selector hanya bila shell berubah; tujuan assertion auth tetap.                          | Existing dashboard/logout selectors.                               |
| `apps/web/src/routeTree.gen.ts`                                                                                                                                                                  | modify | Hanya output generator, tidak hand-edit.                                                           | generate-routes script/TanStack plugin.                            |
| `apps/web/package.json`, `bun.lock`                                                                                                                                                              | modify | Conditional: dependency transitif primitive atau script smoke bila dibutuhkan.                     | Resolved deps; tidak upgrade paket unrelated.                      |
| `apps/web/src/styles.css`                                                                                                                                                                        | modify | Conditional hasil CLI saja; preserve token/font/media existing dan pekerjaan desain lokal.         | Worktree design vs HEAD.                                           |
| `docs/plans/admin-content/*`, `docs/tasks/admin-content.md`                                                                                                                                      | create | Context/plan/evidence.                                                                             | Root documentation rules.                                          |
| `docs/README.md`                                                                                                                                                                                 | modify | Navigasi dan status proposal.                                                                      | Root documentation rules.                                          |
| `apps/web/src/components/admin/theme-switcher.tsx`, `apps/web/src/lib/theme/preferences.ts`, `apps/web/src/lib/theme/bootstrap.ts`                                                               | create | Preferensi Light/Dark/System, accessible control dan bootstrap.                                    | Requirement pengguna 5 Oktober 2026; shared shell/tokens existing. |
| `apps/web/src/routes/__root.tsx`                                                                                                                                                                 | modify | Conditional bootstrap tema sebelum hydration, tanpa global preference user.                        | Root shell existing; ADMC-012.                                     |
| `docs/design/admin-content-desktop-light.md` dan lima PNG desktop light                                                                                                                          | create | Proposal visual dan prompt; ADMC-DES-001.                                                          | Request pengguna sebelum implementasi.                             |

Target tambahan ADMC-013: `apps/api/src/modules/content/{index,model,service,repository}.ts` dan adjacent bun:test; `apps/api/src/app.ts` untuk pemasangan module; `apps/web/src/lib/server/auth-gateway.ts` dan gateway tests untuk allowlist; `docs/architecture/overview.md` serta runbook metadata untuk kontrak aktif sesudah implementasi. Target ADMC-014 menggunakan typed content routes/form/client dari tabel. Primitives Avatar/DropdownMenu/Select/Pagination ditinjau bersama ADMC-002; tidak menjalankan install saat desain.

API listing/model/repository dan gateway allowlist menjadi target ADMC-013; shared/auth/Turbo/env/player behavior tetap mengikuti scope existing. Tidak ada env publik baru diperlukan.

## Implementation DAG

`ADMC-001 planning → ADMC-002 primitives → ADMC-004 shell → ADMC-005 list`.

`ADMC-001 → ADMC-DES-001 history → ADMC-DES-002 desktop light v2 → ADMC-002`; request implementasi dan review visual tetap diperlukan sebelum runtime tasks.

`ADMC-002 + ADMC-004 → ADMC-012 theme switcher → ADMC-011 acceptance/closure`.

`ADMC-001 → ADMC-013 pagination API → ADMC-003 typed data → ADMC-005`; `ADMC-003 + ADMC-006 → ADMC-014 Series → ADMC-007/008/009`.

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
- Depends on: STEP-001, ADMC-DES-002 dan permintaan implementasi; recheck integrasi desain lokal.
- Files: ui primitives/transitive hooks; manifest/lock/CSS hanya jika diperlukan.
- Symbols: Sidebar/Table/Checkbox/ToggleGroup/Empty/Skeleton/AlertDialog.
- Requirements: read docs installed/config, CLI dry-run/diff dari web; audit source imports dan preserve existing components/tema. Pisahkan pekerjaan integrasi token/assets desain agar scope Git jelas.
- Validation: frozen install bila dependency/script berubah, root types/lint/build, inspeksi CLI diff; docs/evidence.
- Acceptance criteria: primitives compile, no mass overwrite, light/dark tokens existing terjaga; artifact fresh checkout menggunakan hanya tracked fondasi atau limitation dicatat sebelum acceptance visual.

### STEP-003 / ADMC-003 — Typed data dan private cache

- Outcome: operasi list/detail/genres/create/PATCH melalui Eden dengan satu error mapping.
- Depends on: STEP-001, STEP-013 dan permintaan implementasi.
- Files: lib/admin client/queries/errors, contract test dan unit behavior test.
- Symbols: createPrivateApiClient, admin query keys/options, ApiError handling.
- Requirements: infer types, signal/no-store/credentials, principal identity, retry false mutation, no runtime API import, typed resource/page parameters, cursor opaque untuk taxonomy existing, server canonical response.
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

### STEP-005 / ADMC-005 — Daftar/search/pagination

- Outcome: daftar Film/Standalone/Series nyata dengan state lengkap.
- Depends on: STEP-003, STEP-004, STEP-013.
- Files: content index route, content-list/filters, query options.
- Symbols: list search params, paginated query, page/pageSize/total.
- Requirements: tabel/cards, default movie, debounce, URL-filter reset, includeArchived semantics, no unsupported status filter/sort, server total dan custom page size, error tidak menghapus hasil yang ditandai stale.
- Validation: fixture 0/1/21+ rows, filter change while request pending, no duplicate entries/mixing pages, refresh/back/forward; root gates.
- Acceptance criteria: data/range/total sesuai filter API, numbered pagination dan custom 1–100, loading/empty/retry accessible, no misleading media readiness.

### STEP-006 / ADMC-006 — Form dan payload mapper

- Outcome: reusable metadata form serta create/patch mapper sesuai tabel field.
- Depends on: STEP-002, STEP-003.
- Files: content-form/genre-picker UI, lib/admin/content-form, behavior tests.
- Symbols: normalized form values, validation, changed-fields PATCH baseline.
- Requirements: TanStack Form/Field, limits/calendar/language, optional draft fields, paginated genre selection, explicit rights and immutable kind.
- Validation: meaningful fixtures trim/null/empty/limits/date-year/genre paging/diff unchanged vs clear, canonical values; keyboard field errors; root gates.
- Acceptance criteria: form dapat menyimpan metadata minimal tanpa source/sampul; mapper tidak membawa readonly/grouping fields dan no-op PATCH disabled.

### STEP-007 / ADMC-007 — Buat draft

- Outcome: POST Film/Standalone/Series lalu typed detail dengan ID hasil server.
- Depends on: STEP-006, STEP-014.
- Files: content new route, form mutation/query integration.
- Symbols: create mutation, success navigation/list invalidation.
- Requirements: pending disables duplicate clicks, no auto replay; failure preserves input, uncertain network outcome dijelaskan, slug server tidak dihitung ulang client.
- Validation: sukses tiga jenis/title-only dan full metadata, 409 slug, 422, network/503, rapid double click; root gates.
- Acceptance criteria: satu submit UI satu POST, only confirmed success navigates dan draft dapat dibaca ulang.

### STEP-008 / ADMC-008 — Detail dan state readonly

- Outcome: detail metadata dapat dibuka langsung/refresh; edit hanya draft supported kind.
- Depends on: STEP-004, STEP-005.
- Files: content typed detail index route/content-detail/query.
- Symbols: detail metadata, editorial state capability.
- Requirements: draft/published/archived/source availability ditampilkan tepat; missing/invalid ID accessible; episode yang dibuka langsung readonly dengan penjelasan scope; preview existing tidak terganggu.
- Validation: direct refresh, 404, canonical timestamps, three lifecycle states, unsupported episode, preview routing; root gates.
- Acceptance criteria: controls sesuai API, tidak menyamakan source available dengan HLS ready, tanpa actions publish/archive yang belum dibuat.

### STEP-009 / ADMC-009 — Edit dan version conflict

- Outcome: perubahan draft aman dan dapat ditinjau saat stale version.
- Depends on: STEP-006, STEP-008.
- Files: typed content edit route/form/query/mapping/error integration.
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
- Depends on: STEP-002–010, STEP-012–014.
- Files: browser smoke fixture/worker, evidence/backlog/plan/index; scripts hanya bila diperlukan.
- Symbols: metadata end-to-end, auth/cache/isolation/responsiveness.
- Requirements: fixture untuk fault deterministic; satu alur persistence pada dedicated test DB melalui API existing. Jangan mutasi DB development tanpa task/otorisasi. Screenshot light/dark mobile/desktop, keyboard, loading/empty/error, actual API requests.
- Validation: existing tests + meaningful new tests, root types/lint/build, production Bun browser/SSR smoke, dedicated content proof, docs/format/whitespace; scripts/deps frozen install bila berubah.
- Acceptance criteria: seluruh iterasi-1 AC lulus dan setiap task committed; evidence jujur terhadap fixture/browser/DB. Upload/media/publish/Katalog dan production readiness tetap roadmap.

### STEP-012 / ADMC-012 — Theme switcher shared shell

- Outcome: Light/Dark/System dapat dipilih dari seluruh halaman admin tanpa kehilangan input.
- Depends on: STEP-002, STEP-004 dan requirement pengguna pada desain.
- Files: `apps/web/src/components/admin/theme-switcher.tsx`, `apps/web/src/lib/theme/preferences.ts`, `apps/web/src/lib/theme/bootstrap.ts`, shared shell; `apps/web/src/routes/__root.tsx` hanya untuk bootstrap yang benar-benar diperlukan. Theme behavior tests/browser case dan conditional primitives sesuai hasil registry review.
- Symbols: validated theme mode, storage fallback, media listener, bootstrap dan accessible theme control.
- Requirements: non-rahasia preference persisted, System mengikuti prefers-color-scheme, no server global preference/cookie leakage, bootstrap before hydration tanpa flash, avatar dropdown accessible names/expanded state, keyboard/Escape/focus return dan Appearance menu selected state. Cache/form tetap utuh; jangan memakai dark overrides per halaman atau merombak palet source existing.
- Validation: tiga mode, reload/persist, System media change, invalid preference/storage unavailable, keyboard, no hydration warning/flash pada browser dan unsaved form tetap utuh; root tests/types/lint/build serta auth SSR regression bila root shell berubah.
- Acceptance criteria: shared switcher bekerja pada semua lima halaman, preference tidak memuat data admin/private form, source tokens light/dark existing digunakan dan fresh-checkout design dependency tercatat.

### STEP-013 / ADMC-013 — Kontrak pagination server

- Outcome: numbered pages dan total filter tersedia untuk tiga jenis tanpa merusak list cursor existing.
- Depends on: refinement v2 dan permintaan implementasi.
- Files: apps/api content list module/model/service/repository, shared query helpers bila benar-benar dibutuhkan; apps/web gateway allowlist bila /admin/content belum diizinkan; API contract/runbook/task.
- Requirements: GET /admin/content proposal type=film|standalone|series, page positif/pageSize integer 1–100, search/includeArchived; typed item union, total/page/pageSize/totalPages, deterministic createdAt/id order. requireAdmin dan parameterized query; count/data filter serta snapshot sama. Invalid/out-of-range/empty behavior terdokumentasi; tidak menghitung total client. Existing endpoints dan DTO cursor tidak berubah.
- Validation: bun:test HTTP authorization/query/DTO/error, dedicated PostgreSQL proof pagination/filter parity/empty/last-page/concurrent change dan meaningful query performance; root types/lint/build/docs. Tidak ada schema/migration wajib yang diasumsikan; bila schema berubah ikuti migration gate.
- Acceptance criteria: total akurat dan page boundaries benar untuk Film/Standalone/Series, old consumers tetap lulus; implementasi/evidence aktual pada backlog ADMC-013.

### STEP-014 / ADMC-014 — Metadata Series dan resource dispatch

- Outcome: tiga pilihan list/create/detail/edit mengakses model resource yang benar.
- Depends on: STEP-003, STEP-006; ADMC-DES-002.
- Files: content typed routes/client/query/form/detail/errors serta resource behavior tests.
- Requirements: Film→movie/Standalone→standalone melalui videos; Series lewat series, completionStatus, nested create response/defaultSeason. Tidak mengirim kind series/rightsConfirmed/video source pada Series. Field editorial bersama/expectedVersion tetap; type immutable. Season/episode editor tetap roadmap. Form/detail Series mengikuti template v2 dengan fields/cards conditional.
- Validation: tiga jenis create/read/edit, server canonical values, response nested, invalid type/ID, input retained on conflict, no payload leakage; dedicated persistence/browser/root gates.
- Acceptance criteria: tiga jenis bukan pilihan dekoratif; Series berjalan tanpa diperlakukan sebagai video, episode tidak terbuka di scope ini.

## Test requirements

| Area              | Bukti yang diperlukan                                                                                                                                                            |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API client/cache  | Status failures thrown, identity/private key cleanup, abort, unchanged public clients, no mutation replay.                                                                       |
| Mapper/validation | Title/slug limits, blank/null/year/calendar/language, optional metadata, unique genre IDs, explicit rights, changed-fields/version.                                              |
| Listing           | 42+ rows, numbered boundaries/last page, total/filter parity, presets/custom/invalid size/reset, request race, archived-inclusive, empty/retry, back/refresh without mixed data. |
| Persistensi       | Movie dan standalone create/read/edit, minimal metadata, canonical DTO, version increment dan two-tab conflict di dedicated DB.                                                  |
| Security          | Anonymous/non-admin/session expiry, gateway cookie scope, private cache removed, server import proof jika boundary berubah.                                                      |
| Browser           | 320/390/768/1024/1440 px; light/dark, no overflow, keyboard/focus/labels/44px, contrast rendered, unsaved/logout, no console hydration error.                                    |
| Theme             | Light/Dark/System, persistence preference non-rahasia, System media change, storage fallback, keyboard/labels, no flash/hydration error dan dirty form utuh.                     |

Gunakan Bun native tests untuk mapper/client behavior, bukan snapshot yang hanya mencocokkan markup atau test setiap komponen reversible. Browser scripts mengikuti harness existing dan adapter host Playwright; tidak otomatis menambah dependency besar. Fixture HTTP tidak membuktikan PostgreSQL persistence; kedua evidence dibedakan.

Setelah setiap runtime task selesai: `bun test apps/web/test`, `bun run check-types`, `bun run lint`, `bun run build`; tambah proof/browser yang relevan sesuai task. Jika backend berubah setelah refinement: `bun run --cwd apps/api test`, dedicated content schema/runtime proof dan migrations hanya jika schema berubah. Gate closure memakai hasil masih valid; ulangi setelah source/script/dependency berubah atau ada failure baru.

Planning saja: `bun run docs:check`, installed Prettier untuk Markdown berubah, `git diff --check`, staged snapshot docs dan preservation. Hooks tetap dijalankan, tidak bypass. Tidak melaporkan test implementasi yang belum dijalankan sebagai lulus.

## Constraints

Bun workspace; API tetap owns business rules, client type-only; no server secrets/DB/storage di frontend. No custom auth/gateway, no auto save/draft persistence, no manual route tree, no hosted CI baru. Root instructions mengatur commit task, branch prefix dan scope remote. Style/player/design worktree yang sudah ada tetap terjaga.

## Acceptance criteria

- [x] Admin sah dapat list/search/page Film/Standalone/Series dengan server total serta page size custom serta create/read/edit draft dengan persistensi benar.
- [x] Metadata title-only dapat disimpan; optional fields, rights dan genre mengikuti API.
- [x] Published/archived serta episode di luar scope tidak dapat diedit melalui form iterasi ini.
- [x] Version/slug/state/network/validation conflicts tidak menimpa input atau memicu replay tulis otomatis.
- [x] Logout/expiry membersihkan cache private; UI dan endpoint tetap terlindungi.
- [x] Semua halaman responsif/keyboard/light/dark; shared theme switcher bekerja tanpa kehilangan input dan route preview existing tetap berfungsi.
- [x] Test/gates/DB/browser evidence sesuai scope, docs/status dan commit per task selesai.

## Risks and mitigations

Form dirty vs refetch: baseline/version immutable sampai save/reload eksplisit. Cursor-filter race: key lengkap, signal dan reset pages. Create ambiguous outcome: no automatic retry, cek daftar sebelum submit ulang. Slug/key fields: whitelist serta server authority. UI readiness palsu: pakai status editorial/source literal, defer status job. Design untracked: integrate separately sebelum release/fresh-checkout acceptance. Primitive generator: preview diff dan stage hanya task. Auth regressions akibat pindah logout/shell: preserve handlers dan jalankan smoke existing.

## Rollback or recovery

Revert commit runtime task secara bertahap bila regressions; dashboard sesi existing dapat dipulihkan tanpa menghapus metadata yang sudah tersimpan. Tidak ada migration/schema/media baru pada scope ini. Jangan reset/stash seluruh worktree, menghapus objek bucket atau menghapus data konten untuk mengembalikan UI.

## Evidence

[Repository context](repository-context.md#evidence-index) memetakan source/kontrak/versi/worktree dan dokumentasi resmi. [Backlog](../../tasks/admin-content.md) menyimpan status serta bukti command aktual; evidence runtime aktual tercatat pada backlog dan closure execution log di bawah.

## Open decisions

Tidak ada keputusan terbuka yang menghalangi scope metadata iterasi 1. Namespace `/admin/content`, default Film/System, page size default 10, preset 10/25/50/100 dan custom 1–100 sudah diimplementasikan sesuai rencana yang disetujui. API numbered pagination/Series dan integrasi charcoal CSS memiliki task/commit tersendiri. Visual runtime memakai fondasi tracked; artefak desain lokal unrelated tetap dipertahankan.

Status job/poster/global metrics, upload/publication, season/episode dan katalog memerlukan refinement iterasi berikutnya. Menambahkan field baru bukan perluasan otomatis scope ini.

## Roadmap setelah iterasi 1

1. Upload sumber/sampul: UI signed multipart, part 2% dengan minimum 5 MiB, concurrency/resume/retry/status/abort mengikuti API dan limit approved. Refinement harus membahas reselection file dan resume browser; tidak menyimpan file dalam localStorage.
2. Monitoring worker: status queue/processing/ready/failed dan jalur pemulihan aktual. Kontrak display status/job perlu ditelusuri lebih jauh sebelum dianggap cukup.
3. Preview/publish/archive: reuse player dan endpoints existing, manual publish/readiness, rights dan stale/idempotency errors. Gunakan videojs skill saat playback diubah.
4. Season/episode: hierarchy editor, genre inheritance, numbering/version dan parent publication; metadata Series termasuk iterasi 1 v2.
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
- Receipt ADMC-001: `74a894ff51060edaaf4bf57bbbb881670244e2e9`, docs(web): plan admin content dashboard (ADMC-001). Hooks docs:check 50/355, lint 1 task/types 3 task cache valid dan Commitlint lulus tanpa bypass. Commit hanya context/plan/backlog/navigasi; status Done/receipt dicatat sesudah commit untuk pembaruan task berikutnya. Plan tetap proposal ready untuk review, bukan implementasi completed; branch belum dipush.

### 2026-10-05 — Refinement desain sebelum implementasi

- Freshness: valid pada HEAD `74a894ff51060edaaf4bf57bbbb881670244e2e9`; perubahan HEAD sejak base hanya dokumentasi planning. Source kontrak/frontend tidak berubah.
- Pengguna meminta lima halaman desktop light dan theme switcher. Modal dirty-navigation/reload-conflict telah disetujui pada percakapan setelah plan.
- Tambahkan ADMC-DES-001 untuk proposal gambar dan ADMC-012 untuk shared theme behavior; closure ADMC-011 bergantung pada ADMC-012. Image design menggunakan fondasi worktree yang disetujui, tanpa memasukkannya otomatis ke commit task ini.
- Hasil generate/visual/docs/commit dicatat pada [backlog](../../tasks/admin-content.md) dan [referensi desain](../../design/admin-content-desktop-light.md) setelah teramati. Source runtime belum diimplementasikan.
- Receipt ADMC-DES-001: `ace666f4a4a6d1971df42e12763ec9871e808e8b`, commit lokal lima PNG/desain/prompt dan refinement theme/modal. Inspeksi visual/dimensi, docs worktree 51/368 dan staged 44/349, targeted format/whitespace/preservation lulus; hooks docs/lint/types/Commitlint lulus. Status Done berarti aset selesai dibuat dan committed; approval visual pengguna serta runtime theme/mobile/dark tetap terpisah. Receipt pascacommit disimpan untuk pembaruan task berikutnya.

### 2026-10-05 — Revisi desktop v2

- Freshness ace666f4a4a6d1971df42e12763ec9871e808e8b; source tetap identik base. Context refinement disimpan sebelum plan diubah.
- User meminta avatar/dropdown kanan atas, tema di menu, logout sidebar, English UI, Film/Standalone/Series dan pagination/custom page size; requirement v1 dua jenis/load-more/Bahasa Indonesia diganti.
- ADMC-DES-002 menghasilkan lima mockup v2; ADMC-013/014 menambah dependency kontrak listing dan Series. Scope visual tidak berarti implementasi API/route disetujui atau verified. Namespace generic content adalah proposal teknis; preview existing dipertahankan.
- Prompt dan evidence gambar berada pada desain canonical; checks/commit aktual mengikuti backlog.
- Receipt ADMC-DES-002: `71a9dfb67f379afcd6b7411d2788587f284f7ed3`. Lima PNG v2 dan canonical refinement committed lokal; docs worktree 51/373/staged 44/354, format/whitespace/preservation serta hooks docs/lint/types/Commitlint lulus. Done berarti aset revisi selesai; approval hasil visual dan source runtime tetap terpisah. Receipt pascacommit dicatat untuk task berikutnya.

### 2026-10-05 — Desktop dark v2 dan cleanup

- Pengguna menyetujui desain light v2 dan meminta dark mode serta penghapusan file lama; lima PNG v1 superseded dihapus, light v2 tetap pasangan reference.
- Snapshot 71a9dfb67f379afcd6b7411d2788587f284f7ed3; source tidak berubah. ADMC-DES-003 memakai built-in image_gen recolor kelima halaman, Dark selected pada dashboard dropdown.
- Canonical desain mencakup light/dark, palette/prompt dan current links; legacy prompts/links retired, receipt historis tetap disimpan di Git/backlog.
- Runtime/backlog ADMC-002–014 belum diimplementasikan; hasil pemeriksaan/commit dark dicatat setelah teramati pada task desain.
- Receipt ADMC-DES-003: `0ef62913b98d85517fc663319830d3247263e1d9`; lima dark v2 + cleanup lima v1 committed. Visual/dimensi, 28 file preservation, docs worktree 51/374/staged 44/355, targeted format/whitespace serta hooks docs/lint/types/Commitlint lulus. Receipt pascacommit untuk task berikutnya; Done berarti aset selesai, bukan runtime/theme switching verified.

### 2026-10-05 — Mobile light/dark v2

- User meminta mobile dari desktop yang disetujui; snapshot 0ef62913b98d85517fc663319830d3247263e1d9, source unchanged. Context disimpan sebelum refinement plan.
- ADMC-DES-004 menghasilkan lima halaman × dua tema, single-column/drawer/card navigation dan custom pagination sample3. Header/avatar/Appearance/resource fields mengikuti canonical desktop; scope hanya assets/docs.
- Prompt/evidence serta data contoh/batas full-page capture ada pada canonical mobile; runtime responsive/theme/drawer/touch/browser acceptance tetap tasks implementasi. Checks/commit aktual dicatat setelah teramati.

- Receipt ADMC-DES-004: `e5043eb14d3dc7f8429fa7e70c51bf87242a31dc`; sepuluh mobile PNG/canonical prompts dan refinement docs committed lokal. Visual/PNG, preservation 33 file, docs worktree 52/391/staged 45/372, format/whitespace dan hooks docs/lint/types/Commitlint lulus. Receipt pascacommit untuk pembaruan task berikutnya; Done berarti aset selesai, approval visual dan responsive/theme/drawer runtime tetap terpisah.

### 2026-10-05 — Implementasi disetujui

- Branch `feat/admin-content-dashboard` dibuat dari `e5043eb`; freshness diperiksa, context diperbarui sebelum plan. Pengguna menyetujui desain/rencana dan implementasi Eden, TanStack Query, DRY, commit setiap task.
- Urutan: ADMC-013, ADMC-002, ADMC-003, ADMC-004, ADMC-012, ADMC-005, ADMC-006, ADMC-014, ADMC-008, ADMC-007, ADMC-009, ADMC-010, ADMC-011. Dependency UI create/edit/detail diselesaikan bertahap; route generator tetap owner route tree.
- Foundation charcoal CSS lokal disetujui tetapi belum tracked; integrasi token menjadi task terpisah ADMC-015 sebelum theme/browser acceptance, tanpa memasukkan artefak unrelated. Tidak membuat schema baru; proof PostgreSQL memakai dedicated database.

- Receipt ADMC-013: `841db1736f9625ada7968830a77ca70acfc1cd86`; checks/AC teramati ada pada backlog. Commit lokal, belum push/PR/merge.

- Receipt ADMC-002: `97718bc243d86ed08dad01074f383f496c5cdd48`; checks/AC teramati ada pada backlog. Commit lokal, belum push/PR/merge.

- Receipt ADMC-003: `b44b8dbf1dbe598f85a5bc3edb6251b58f515746`; checks/AC teramati ada pada backlog. Commit lokal, belum push/PR/merge.

- Receipt ADMC-004: `d66c78407d462f0b3c7027e55ed3321d22958308`; checks/AC teramati ada pada backlog. Commit lokal, belum push/PR/merge.

- Eksekusi ADMC-015 memisahkan integrasi override `.dark` approved dari primitive task. Theme ADMC-012 akan ditutup sesudah form runtime tersedia agar input preservation dapat diuji. Metadata Series dispatch tersedia pada client/mapper; ADMC-014 menutup validasi resource/persistensi sesudah halaman runtime.

- Receipt ADMC-015: `2f3d95e3454c5787d22865a8fc52593f5c2fcfed`; checks/AC teramati ada pada backlog. Commit lokal, belum push/PR/merge.

- Receipt ADMC-005: `8dd531147dfb01e5ff0742dc8978a9f9938a5da5`; checks/AC teramati ada pada backlog. Commit lokal, belum push/PR/merge.

- Receipt ADMC-016: `0cc865157946d59c6a888f4fef01a6c601ab1966`; checks/AC teramati ada pada backlog. Commit lokal, belum push/PR/merge.

- Receipt ADMC-006: `8720ba4283b0603aebb49fce9a3633a4db71e727`; checks/AC teramati ada pada backlog. Commit lokal, belum push/PR/merge.

- Receipt ADMC-008: `c90349bd07aa618bc3043b6555d21554bc5ee11b`; checks/AC teramati ada pada backlog. Commit lokal, belum push/PR/merge.

- Receipt ADMC-007: `86d6b9f8b5b38d70dfa7486cb068a308f3f45a2d`; checks/AC teramati ada pada backlog. Commit lokal, belum push/PR/merge.

- Receipt ADMC-009: `b932a1764760255090790264131a3ef65c162ddf`; checks/AC teramati ada pada backlog. Commit lokal, belum push/PR/merge.

- Receipt ADMC-010: `778a57583f18a8bd87de43c64ad7841ffcc5196c`; checks/AC teramati ada pada backlog. Commit lokal, belum push/PR/merge.

- Receipt ADMC-012: `4ec8bc1912fdba9b5b792fa6a9bd8172855f9c97`; checks/AC teramati ada pada backlog. Commit lokal, belum push/PR/merge.

- Receipt ADMC-014: `ec7ea091bb20073479d86721502c3e994393eea8`; checks/AC teramati ada pada backlog. Commit lokal, belum push/PR/merge.

### 2026-10-05 — Acceptance lokal ADMC-011

Semua lima template metadata aktif melalui Eden/type-only contract dan TanStack Query. Read cache/cancellation dan write no-retry dipisahkan; normalized form, immutable version baseline, dirty protection dan auth lock/cleanup telah dibuktikan. Tidak ada perubahan schema/dependency/player/watch/preview source atau database development.

| Pemeriksaan aktual                                                             | Hasil                                                                                                                                                                                                                                                             |
| ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bun test apps/api/src packages/auth/src apps/web/test`                        | 158 tests / 621 assertions lulus.                                                                                                                                                                                                                                 |
| Dedicated API/PostgreSQL pagination ADMC-013                                   | 2 tests / 52 assertions lulus.                                                                                                                                                                                                                                    |
| Dedicated API/PostgreSQL metadata ADMC-014                                     | 2 tests / 61 assertions lulus, tiga resource serta stale rollback.                                                                                                                                                                                                |
| `bun run check-types`, `bun run lint`, `bun run build`                         | 3 paket types, web lint dan API/web build lulus.                                                                                                                                                                                                                  |
| `bun run --cwd apps/web auth:ssr:smoke`                                        | Native Bun/Nitro SSR/auth/cookie/isolation/locking lulus sesudah final build.                                                                                                                                                                                     |
| `bun run --cwd apps/web auth:import:proof` (ADMC-012)                          | Client/server import violation sengaja ditolak; fixture dipulihkan dan build berikutnya lulus.                                                                                                                                                                    |
| `AUTH_BROWSER_PHASE=all` dengan content test database melalui harness existing | Cache/auth/content phases lulus. Business metadata menggunakan API/PostgreSQL nyata, sesi/error dikontrol auth fixture.                                                                                                                                           |
| Browser responsif/theme                                                        | Lima template × dua tema × lima lebar = 50 kombinasi. Light/Dark/System, pagination/filter race, double-submit, genre cursor, nullable clear, two-tab conflict, dirty cancel/confirm/back/logout, keyboard/labels/contrast dan no overflow/hydration error lulus. |
| `bun install --frozen-lockfile`                                                | 770 installs diperiksa; tanpa perubahan dependency/lock.                                                                                                                                                                                                          |

Browser dijalankan dengan bundled host Playwright/Edge dan built Bun server; bukti bukan Safari/perangkat mobile fisik/full assistive technology audit. beforeunload bergantung kebijakan browser. Profiling dataset production, R2/FFmpeg/upload/publication serta rollout production tetap di luar proof ini. Empat screenshot runtime disimpan pada canonical [desktop](../../design/admin-content-desktop-light.md) dan [mobile](../../design/admin-content-mobile.md), terpisah dari mockup.

Perbaikan acceptance: checkbox memakai label eksplisit, page di luar batas dijepit setelah fresh result, dialog menjaga gutter 320 px, welcome card memakai card surface setelah primary-tint text terukur 4.49379:1, dan response write dikonfirmasi sebelum navigasi. UUID validator digunakan bersama agar tidak berulang. Palette approved tetap sama.

Preservation audit terhadap snapshot sebelum implementasi lulus untuk file unrelated; existing design boards/build receipts tetap terpisah dari staging. Tidak menambah CI, membuka PR, push atau merge. Format/docs/whitespace/staged-document/hook results serta SHA actual closure ditambahkan sesudah teramati.

- Closure checks teramati: targeted Prettier/whitespace lulus; docs worktree 52 Markdown/409 links dan staged-only snapshot 45 Markdown/390 links lulus. Preservation 21 file unrelated lulus; staging terbatas 26 file milik acceptance dan partial index. Latest script lint lulus; hooks/commit acceptance dicatat pascacommit.

- Receipt ADMC-011: `b5ccd0c2ec0deb97abaf122b5e10938b712249fc`; checks/AC teramati ada pada backlog. Commit lokal, belum push/PR/merge.

- Acceptance commit berhasil: `b5ccd0c2ec0deb97abaf122b5e10938b712249fc`; docs/lint/types/Commitlint lulus tanpa bypass. ADMC-011 Done. Receipt ini ditulis setelah commit berhasil, tidak menggunakan SHA self-referential. Source branch tetap lokal; remote delivery memerlukan permintaan pengguna.

### 2026-10-05 — Otorisasi delivery Git

Pengguna meminta commit, push, PR dan merge **tanpa squash** setelah acceptance implementasi. Delivery memakai `feat/admin-content-dashboard` ke `main`, merge commit dan mempertahankan branch sumber. `git fetch origin` teramati: target `origin/main` ancestor HEAD, 0 commit berbeda di sisi base dan 21 commit fitur/planning/desain di sisi head sebelum receipt otorisasi ini; tidak ada konflik integrasi. PR branch belum ada saat pengecekan.

Task implementation dan receipt sudah committed hingga `afa5a09`; validasi runtime ADMC-011 tetap berlaku karena sesudahnya hanya dokumentasi. Perubahan worktree lama (design system/boards dan receipt build) disnapshot untuk preservation dan tidak ikut staging/push. Command/result/docs/format/hooks delivery dicatat setelah teramati; hasil merge tidak dinyatakan sebelum dikonfirmasi GitHub.

#### Checkpoint sebelum merge PR — 5 Oktober 2026

- Receipt otorisasi: `3ec2d4a05474463d3cd64da2cda010484ba9092d`; Prettier/docs 52 Markdown/409 links/whitespace dan hooks docs/lint/types/Commitlint lulus tanpa bypass.
- `git push -u origin feat/admin-content-dashboard` berhasil; HEAD lokal dan origin sama pada SHA receipt otorisasi tersebut.
- [PR #6: feat(web): implement admin content dashboard](https://github.com/bayuaji17/vertical-movie-app/pull/6) dibuka ke `main` dan di-attach pada task. Snapshot GitHub teramati OPEN/MERGEABLE/CLEAN, head cocok dengan origin; tidak ada hosted checks pada snapshot.
- Delivery menggunakan merge commit dengan pemeriksaan exact head, tanpa squash/rebase, dan branch sumber dipertahankan. Hasil final/merge SHA harus dikonfirmasi dari PR GitHub; checkpoint ini mendahului aksi merge.
- Source runtime tidak berubah setelah acceptance; test/DB/browser/SSR/build evidence ADMC-011 masih valid. Snapshot preservation mencakup 23 perubahan lokal unrelated; hanya plan receipt ini yang ditambahkan. Tidak ada rollout production atau perubahan schema.
