# Repository context: Alur detail dan tonton publik

## Snapshot

- Repository: `bayuaji17/vertical-movie-app`.
- Base ref: `main`; base SHA: `f1b1d184fe6d410d976495c65bbeef75ad85cc83`.
- Analyzed at: 10 Oktober 2026 (Asia/Jakarta).
- Context status: snapshot perencanaan pada SHA di atas; periksa freshness sebelum implementasi.
- Planning/implementation branch: `feat/watch-flow-redesign`.
- Request: pengguna meminta saran UI/UX yang lebih baik untuk alur menonton (desktop dan mobile, terutama video tunggal dan Series dengan episode), menghapus `?type=all` dari `/videos/:slug` dan `/watch/:slug`, dan menyetujui arah navigasi ke `/videos/:slug` dan `/watch/:slug`.

## Observed behavior

- URL detail muncul sebagai `/videos/test-film-1?type=all`. Parameter `type` (`all | film | standalone`) hanya konteks filter homepage, tetapi dibawa ke detail dan watch: `components/public/catalog-browser.tsx` menautkan `/videos/:slug` dengan `search={{ type }}`, `components/public/video-detail.tsx` meneruskannya ke `/watch/$slug`, dan `routes/watch.$slug.tsx` memakainya untuk tombol "Back to details"/"Back to browse" serta logo/Browse pada `PublicShell`.
- `routes/videos.$slug.tsx` dan `routes/watch.$slug.tsx` memakai `validateSearch: catalogSearch` (selalu menghasilkan `type`) dan `beforeLoad: normalizeCatalogLocation` (redirect ke `?type=all` bila nilai tidak valid).
- Dua tumpukan UI publik berdampingan:
  - `components/public/*` (`PublicShell`, `CatalogBrowser`, `VideoDetail`) untuk `/` dan `/videos/:slug`, dengan `type`.
  - `components/catalog/*` (`PublicShell` versi lain dengan `onHome/onBrowse`, `ContentPage`, `EpisodeList`) untuk `/titles/$kind/$slug` dan `/series/$slug`, tanpa `type`.
    `components/catalog/home-page.tsx` (`HomePage`) tidak dirujuk route mana pun; periksa sebelum menghapus.
- Homepage hanya memuat `movie,standalone` (`catalogKinds` pada `lib/public/catalog-model.ts`); Series tidak muncul di grid dan hanya dicapai lewat tautan langsung/admin (`/series/$slug`).
- Halaman watch (`routes/watch.$slug.tsx`): dua kolom `md:grid-cols-[minmax(240px,360px)_1fr]`; tombol Back berada di atas player sehingga player turun di mobile; player `aspect-[9/16] w-full` tanpa batas tinggi viewport; header publik tinggi 80 px tetap tampil; tombol Back to series hanya kembali ke daftar, bukan menampilkan episode lain; episode lain hanya lewat satu tombol "Next episode" (tanpa Previous, tanpa daftar episode, tanpa posisi S/E saat ini di daftar).
- Detail Series (`ContentPage`/`EpisodeList`): satu daftar vertikal per season dengan teks saja, tanpa pemilih season, tanpa CTA "Play first episode", jumlah season/episode hanya sebagai "N episodes loaded · M available", pagination manual 20 item.
- Detail Film/Standalone ada pada dua rute (`/videos/:slug` dan `/titles/$kind/$slug`) dengan layout dan copy berbeda; `catalog-detail-dialog.tsx` dan `featured-film.tsx` menautkan ke `/titles/...` dan `/watch/...`.
- Pengguna melaporkan `?type=all` terlihat pada `http://localhost:3000/videos/test-film-1?type=all`.
- Tautan ke `/watch/$slug` tanpa `search` dari admin (`publication-panel.tsx`, `owner-publication.tsx`) dan dari `ContentPage`, sehingga URL watch saat ini tidak konsisten (kadang berparameter, kadang tidak).

## Repository map (bagian relevan)

| Area                                                                        | Peran                                                                    |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `apps/web/src/routes/videos.$slug.tsx`, `watch.$slug.tsx`                   | Rute detail/watch dengan `validateSearch`/`normalizeCatalogLocation`.    |
| `apps/web/src/routes/series.$slug.tsx`, `titles.$kind.$slug.tsx`            | Detail Series dan detail Film/Standalone alternatif.                     |
| `apps/web/src/lib/public/catalog-model.ts`, `catalog-navigation.ts`         | `CatalogType`, `catalogSearch`, redirect `?type=`.                       |
| `apps/web/src/components/public/*`                                          | Shell, browser, card, detail Film/Standalone.                            |
| `apps/web/src/components/catalog/content-page.tsx`, `public-shell.tsx`      | Detail Series/episode, shell alternatif.                                 |
| `apps/web/src/components/vertical-video-player.tsx`                         | Player Video.js 9:16, renewal signed URL; jangan diubah perilakunya.     |
| `apps/web/src/lib/catalog/content-queries.ts`, `content-model.ts`           | Query detail/episodes/watch/next dan skema Zod strict.                   |
| `apps/api/src/modules/catalog/index.ts`                                     | API publik: `/videos/:slug`, `/videos/:slug/next`, `/series/:slug`, dll. |
| `apps/web/test/public-*.test.ts*`, `public-film-catalog-browser-worker.mjs` | Test dan browser worker yang merujuk `type`; perlu diperbarui.           |
| `.agents/skills/videojs`, `docs/design/design-system.md`                    | Skill player dan acuan visual wajib.                                     |

## Constraints dari repo

- Hanya `apps/web`; API tidak diubah. `WatchVideo` hanya membawa `seriesSlug`, season, episode; daftar episode datang dari `contentEpisodesOptions(seriesSlug)` (cursor 20, strict schema) dan judul Series dari `contentDetailOptions('series', slug)`.
- PRD: tanpa autoplay (keputusan 8 Oktober 2026), noindex sementara, rasio 9:16 tanpa crop/stretch (PRD-08), target keyboard dan tombol ≥44 px, tanpa overflow 320–1920 px, Light/Dark/System.
- Gunakan skill `videojs` dan dokumentasi bundel player sebelum menyentuh playback. `routeTree.gen.ts` tidak diedit manual.
- Not Found: slug tak ada tetap `notFound()` ([plan NF](../not-found/implementation-plan.md)); redirect legacy tidak boleh mengubah hasil 404.
- Teks UI berbahasa Inggris. Tidak ada schema, env, atau dependensi baru yang direncanakan.
