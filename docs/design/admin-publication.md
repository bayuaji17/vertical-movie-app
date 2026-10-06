# Desain admin Publish & Archive

> Status: **Desain disetujui pengguna** · 7 Oktober 2026 · Plan disetujui pengguna melalui “oke setuju”; empat raster/state specification disetujui melalui “ok setuju” pada 7 Oktober 2026. Source baseline `4cf00a97dffe9568a966f8889ae798fed3acdb17`, runtime UI belum diimplementasikan.

## Scope dan sumber acuan

Extension pada detail `/admin/content/:type/:id` untuk Film/Standalone non-episode. Acuan: [plan](../plans/admin-publication/implementation-plan.md), [context](../plans/admin-publication/repository-context.md), [backlog APUB](../tasks/admin-publication.md), [dashboard desktop](admin-content-desktop-light.md), [mobile](admin-content-mobile.md), [upload](admin-media-upload.md) dan [design system](design-system.md). Token runtime authoritative pada `apps/web/src/styles.css`, shadcn Base UI Rhea dari `apps/web/components.json`; English UI dan developer docs Indonesia.

Pengguna menyetujui keempat raster dan state specification melalui “ok setuju” setelah review visual. Sesuai APUB-002, runtime UI memakai desain yang diterima. Aksi dan kontrak di bawah adalah desain untuk implementasi, bukan bukti endpoint/UI baru sudah aktif.

## Layout acuan

| Layout        | Artefak                                    | Dimensi PNG aktual |
| ------------- | ------------------------------------------ | ------------------ |
| desktop-light | [PNG](admin-publication-desktop-light.png) | 1150 × 1367        |
| desktop-dark  | [PNG](admin-publication-desktop-dark.png)  | 1150 × 1368        |
| mobile-light  | [PNG](admin-publication-mobile-light.png)  | 801 × 1962         |
| mobile-dark   | [PNG](admin-publication-mobile-dark.png)   | 801 × 1964         |

Keempat raster menunjukkan **Draft siap publish**, dengan enam checks lulus, source/cover Ready, rights Confirmed dan tanpa active uploads. Ready to publish berbeda dari Published. Desktop menunjukkan checklist dua kolom dan Source/Cover sejajar; mobile memakai checklist satu kolom, tombol penuh dan Source/Cover bertumpuk. Primary Publish video lime; Preview video dan Refresh status outline.

Dimensi PNG dibaca dari header, tanpa resize: pasangan desktop mempunyai tinggi berbeda 1 px dan pasangan mobile berbeda 2 px dari generator. PNG menunjukkan komposisi/theme, bukan ukuran viewport CSS atau bukti pixel-identical theme conversion. Target implementasi tetap 320/390/768/1024/1440 CSS px; layout runtime/focus/contrast/overflow harus dibuktikan di APUB-012.

## Shell, metadata dan placement

Pertahankan shared desktop sidebar Dashboard/Content dan Log out di footer kiri, header breadcrumbs serta AD/Admin avatar. Mobile memakai hamburger, wordmark dan AD/avatar chevron; tidak menampilkan desktop sidebar. Dropdown akun tetap identity + Appearance Light/Dark/System, menu tertutup pada empat acuan. Tidak menambah notifikasi, billing, user/creator team, analytics atau page baru.

Heading mengikuti runtime existing: **Content details**, deskripsi **Review content metadata and its current state.** Back to content dan Edit metadata tetap action existing. Judul Film/Standalone berada pada metadata card, bersama badge type/editorial status. Raster meringkas metadata/record information agar Publication terlihat; implementasi mempertahankan original title/language, synopsis/description, release date/year, genres, sourceAvailability serta seluruh record dates/version yang sudah ada. Ringkasan raster tidak mengotorisasi penghapusan field atau redesain detail existing. Posisi Edit metadata runtime tetap mengikuti page heading existing; posisi visual pada card mobile bukan perubahan kontrak navigation.

Tambahkan section **Publication** sesudah metadata/video information/record cards dan sebelum Upload media. Jika media panel existing mempunyai Preview video sendiri, gunakan satu entry Preview yang konsisten pada Publication untuk owner yang didukung; jangan membuat dua uploader/controller/inventory fetch independen. Unsupported Series/episode mempertahankan detail/media workflow existing tanpa action publikasi ini.

Light memakai surface white/neutral, text near-black dan semantic border. Dark mengikuti source: background #1E201E, card/sidebar #272A27, muted/input #303430, border #424842, text #F3F5F3 dan muted #A8B0A8. Lime berasal dari primary token existing; warna raster adalah pendekatan generator, bukan pengganti CSS. Font runtime Inter/Space Grotesk dan Remixicon existing, tanpa dependency tambahan.

## Publication checklist

| Server code      | Label English                  | State dan correction action                                                                                                                     |
| ---------------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| ACTIVE_DRAFT     | Active draft                   | Passed hanya draft aktif; published/archived membatasi action lifecycle.                                                                        |
| TITLE            | Title provided                 | Blocked: Add a title before publishing. → Edit metadata.                                                                                        |
| SYNOPSIS         | Synopsis provided              | Blocked: Add a synopsis before publishing. → Edit metadata.                                                                                     |
| RIGHTS           | Content rights confirmed       | Blocked: Confirm content rights in metadata. → Edit metadata. Server memerlukan actor dan timestamp, bukan checkbox tampilan saja.              |
| VERIFIED_MEDIA   | Verified video and cover ready | Blocked: Finish processing the video and cover before publishing. → Upload media. Compound gate mengikuti policy server dan verified duration.  |
| NO_ACTIVE_UPLOAD | No active uploads              | Blocked: Finish or cancel the active upload before publishing. → Upload media.                                                                  |
| ACTIVE_PARENTS   | Parent content available       | Non-episode not-applicable tidak perlu row kosong. Episode capability server tetap future boundary; UI episode tidak dirender pada iterasi ini. |

Check lulus memakai ikon check + label; blocked memakai ikon/teks alasan dan correction link, bukan warna saja. Jangan mengartikan Source available, Ready role atau canPreview sebagai seluruh canPublish. VERIFIED_MEDIA sengaja satu compound check; source/HLS/cover detail tersedia pada inventory existing tanpa granular policy palsu di browser. Original deleted oleh retensi tidak menjadi blocker bila provenance/output sah.

Ready state: badge **Ready to publish**, copy **This draft is not publicly available.** Callout **Preview the video before publishing.** Desktop actions Preview video / Refresh status / Publish video; mobile Preview video / Publish video / Refresh status bertumpuk dengan primary jelas. Blocked tetap menampilkan disabled Publish dengan alasan dalam teks; Preview mengikuti canPreview inventory, bukan dibuka dari checklist tebakan.

## State specification

| State                       | Copy/action English                                                    | Perilaku target                                                                                                                                     |
| --------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Initial                     | Loading publication status…                                            | Skeleton; no action dari cached capability.                                                                                                         |
| Readiness error             | Publication status unavailable. / Refresh status                       | Alert + safe refresh; mutation disabled.                                                                                                            |
| Cached stale / mismatch     | Showing previously loaded status. Refresh before continuing.           | Read data masih boleh tampil; version/capability lama tidak mengaktifkan confirm.                                                                   |
| Draft blocked               | Not ready to publish                                                   | Checklist + alasan/correction; manual refresh.                                                                                                      |
| Draft ready                 | Ready to publish / This draft is not publicly available.               | Preview tersedia, Publish membuka dialog.                                                                                                           |
| Local same-owner work       | Finish or pause the current file preparation before publishing.        | Local hash/selection/initiate/finalization membatasi intent; server active session tetap blocker meski paused. Upload owner lain tidak global lock. |
| Refresh before confirmation | Checking the latest status…                                            | Fresh metadata/readiness/inventory direkonsiliasi; confirmation belum aktif.                                                                        |
| Publishing                  | Publishing…                                                            | Satu intent/key; no double submit/optimistic Published; pending live status.                                                                        |
| Published current           | Published / Available through the public playback API.                 | Open public video memakai watch existing; Archive tersedia. Tidak mengklaim homepage katalog telah selesai.                                         |
| Archiving                   | Archiving…                                                             | Satu expectedVersion command; lifecycle badge belum diubah optimistically.                                                                          |
| Archived current            | Archived / This video is not publicly available.                       | Tidak ada Publish/Archive/Restore/Edit/Upload/Preview unsupported. Read-only existing information dipertahankan.                                    |
| Unconfirmed outcome         | The result could not be confirmed. Check publication status.           | Check status membaca GET; bukan POST ulang otomatis.                                                                                                |
| Published + refresh failure | Published. Status refresh is unavailable.                              | Confirmed acknowledgement dipisahkan dari current/stale view; Refresh status, tanpa duplicate publish.                                              |
| Archived + refresh failure  | Archived. Status refresh is unavailable.                               | Confirmed acknowledgement tersimpan, current data diberi stale label.                                                                               |
| Version conflict            | This content changed. Review the latest status before continuing.      | Refresh; batalkan intent lama bila payload berubah; tidak auto-bump expectedVersion.                                                                |
| Media busy                  | Finish or cancel the active upload before publishing.                  | Reload inventory; action menuju uploader, bukan silent publish retry.                                                                               |
| No longer publishable       | This draft is no longer ready to publish.                              | Current checklist/error, safe refresh.                                                                                                              |
| Idempotency conflict        | This publication attempt could not be reused. Check the latest status. | Check status sebelum new intent/key; tidak menyembunyikan error.                                                                                    |
| Session ended               | Your session has ended. Sign in again.                                 | Existing auth transition membersihkan private effects/intent.                                                                                       |
| Forbidden                   | You do not have permission to manage this content.                     | Existing session recheck, no user/account selector.                                                                                                 |
| Offline                     | You are offline. Reconnect and check the latest status.                | Tanpa mutation queue/resend saat reconnect.                                                                                                         |

## Publish confirmation dialog

Trigger hanya draft eligible dengan server canPublish, inventory canPreview dan tanpa local work owner yang sama. Sebelum dialog siap, lakukan fresh reads. RowVersion/kind/state/readiness berubah → update current status, batalkan acknowledgement dan minta review lagi.

- Title: **Publish video?**
- Identity summary: **After the Rain · Film** (contoh; actual title/type escaped).
- Body: **This video will be available to visitors without signing in.**
- Saved rights row: **Content rights: Confirmed**; acknowledgement tidak mengganti rights metadata server.
- Required checkbox: **I have reviewed the preview and want to publish this video.** Ini acknowledgement lokal per dialog, bukan DB field, bukti durasi tontonan atau server audit preview.
- Actions: **Cancel** outline, **Publish video** primary lime. Confirm disabled sampai acknowledgement dan fresh capability valid. Checkbox/label dapat wrap; no truncation.
- Pending: **Publishing…**, immutable same key/payload; dismiss tidak berarti POST dibatalkan di server. Bila user menutup/mengganti resource saat pending, existing private effects/generation guard mencegah callback ke resource lain; saat kembali baca state final.
- Unknown/error: inline recovery copy dari state matrix. **Check status** terlebih dahulu. Explicit **Retry publish** hanya ketika current draft/version sesuai dan menggunakan exact old key/payload; perubahan payload memerlukan review/acknowledgement/key baru.

Dialog desktop max-width mengikuti installed AlertDialog; mobile lebar viewport minus gutters dan scrollable content bila perlu. Initial focus pada Cancel atau heading, bukan destructive automatic confirm; checkbox keyboard-operable. Escape/Cancel sebelum submit mengirim nol mutation; focus dikembalikan ke trigger. Pending dialog tetap dapat dibaca screen reader dengan live region dan safe close behavior, tanpa tombol ganda yang mengirim intent kedua.

## Archive confirmation dialog

Trigger hanya Film/Standalone published aktif, bukan draft/archived/Series/episode. Fresh current metadata version dikunci untuk intent. Belum ada endpoint restore/republish dan Archive tidak berarti hard delete.

- Title: **Archive video?**
- Identity summary: current title/type.
- Body: **Visitors will no longer be able to request new playback access for this video. Previously issued media links may work until they expire.**
- Preservation: **Valid files that are still available will be retained. A source file already removed by retention will not be restored.**
- Lifecycle note: **Restoring or republishing archived videos is not available.**
- Actions: **Cancel** safe outline, **Archive video** destructive variant sesuai token existing, bukan label Delete.
- Pending: **Archiving…**; request expectedVersion-only, tidak menambahkan idempotencyKey.
- Unknown: **Check status** lebih dulu. Current archived → konfirmasi final state tanpa request attribution. Current published/version sama → explicit retry expectedVersion lama; changed version → review ulang. Version409 bukan automatic failed-safe bila current row sudah archived oleh request lain.

No restore/republish shortcut, delete-file checkbox, server admin secrets atau instant revocation promise. Valid sourceAvailability deleted/deleting dijelaskan sebagai informasi source existing, bukan readiness playback atau recovery janji.

## Responsive, theme dan accessibility acceptance

Specification target: viewport320/390/768/1024/1440, Light/Dark/System, keyboard Tab/Space/Enter/Escape, focus trap/return, target44px, semantic status/alert/live announcement, reason text selain ikon/warna, long title/file/status wraps dan reduced motion. Desktop dapat memakai checklist dua kolom bila muat; mobile satu kolom. Source/Cover stack pada mobile sebagaimana corrected raster. Tidak ada sticky action footer menutupi uploader atau dialog controls.

Theme switch tidak mereset intent/checkbox/checklist atau selected File existing. Successful mutation acknowledgement tidak boleh hilang hanya karena read refresh gagal. Business 5xx dengan admin valid tidak menjadi logout otomatis; authoritative auth verdict tetap existing pipeline. Native browser/device/contrast/focus checks belum dijalankan pada task desain; acceptance runtime pemilik APUB-010/012.

## Metode dan evidence visual

Built-in **image_gen**, transparent_background=false, digunakan untuk lima panggilan: desktop light baru, mobile light candidate baru, targeted mobile single-column correction, desktop dark recolor dan final mobile dark recolor. References dashboard/upload existing diinspeksi sebelum digunakan. Empat selected deliverables disalin ke `docs/design/`; generator originals dipertahankan di default generated-images directory. Candidate mobile dua-kolom tidak menjadi final dan hanya disimpan pada task cache ignored.

Inspeksi visual selected outputs: enam check labels correct, Draft + Ready to publish coherent, source/cover Ready, rights Confirmed, no Archive on draft, English copy, primary lime dan secondary outline, desktop sidebar/footer, mobile tanpa sidebar, correct single-column media/cards, closed avatar menus. Dark pasangan mempertahankan komposisi/text dengan charcoal appearance. Metadata ringkasan/placement yang berbeda dari exact runtime dijelaskan di atas; implementasi memakai source/contract, bukan menghapus field berdasarkan raster.

Magic PNG/dimensi/ukuran/SHA-256 divalidasi via Bun tanpa image editing/resize. Documentation/format/preservation/hook receipts dimiliki [APUB-002](../tasks/admin-publication.md), bukan test screenshot application. Belum ada approval visual pengguna atau perubahan runtime/API/schema/dependency.

## Prompt set aktual

Prompts berikut adalah verbatim built-in requests; referenced local images berperan style references untuk generation dan edit targets untuk correction/recolor.

### Desktop light

Generation; references approved desktop upload light dan mobile upload dark.

```text
Use case: ui-mockup. Asset type: high-fidelity web admin dashboard UI design for Vertical Movie. Create a new publication-ready content-details mockup, extending the two reference images' approved Base UI/shadcn Rhea visual language. Image 1 is desktop light reference for shell and typography. Image 2 is mobile dark reference for compact navigation and theme grammar. These are style references; older upload-progress state and controls must change to an all-media-ready draft. English UI only, exact text, clean realistic flat software screenshot, no photographic device frame, no perspective, no annotations or decorative gradients. Inter body, Space Grotesk headings, crisp Remixicon-like outline icons, white/offwhite surfaces, near-black text, thin light-gray borders, rounded cards and buttons. Primary lime approximately #B8F542; the published status has not happened. Preserve navigation content: Vertical Movie play logo, Dashboard, Content, only Log out in sidebar footer, AD/Admin avatar with chevron and closed menu. No billing, teams, analytics, notifications, extra settings or public catalog page.

State: Film draft with metadata and rights complete; source and cover finished processing, no active uploads; ready for manual publish but not published. Page heading "Content details", subtext "Review content metadata and its current state." Actions "Back to content" and outlined "Edit metadata". Metadata card title "After the Rain", badges "Film" and "Draft". Compact readable metadata fields: "Slug" / "after-the-rain"; "Synopsis" / "An unexpected meeting after the rain changes two lives."; "Language" / "English"; "Release year" / "2026"; "Genres" / "Drama" / "Romance". Separate compact row/card "Record information" with "Rights: Confirmed" and "Version: 3". These summaries are a mockup; do not invent new product fields.

Make the full-width Publication card the main new visual focus, immediately after metadata/record information and before Upload media. Heading "Publication", outlined badge "Ready to publish", subtitle "This draft is not publicly available." Show a compact explicit checklist with six rows and small neutral check icons: "Active draft", "Title provided", "Synopsis provided", "Content rights confirmed", "Verified video and cover ready", "No active uploads". Under the checklist a muted callout "Preview the video before publishing." Action row outlined "Preview video", outlined "Refresh status", primary lime "Publish video". Publish is enabled but does not imply it has happened. Do not display Archive on a draft. Never add a preview player here.

Below Publication, show "Upload media", compact two role cards "Source video" and "Cover image", each with a neutral "Ready" badge. Filenames "after-the-rain.mp4" and "after-the-rain-cover.webp". Subtext "Processing complete". No drop zones, selected files, active transfer progress, Pause/Cancel upload or ETA. Avoid oversized preview art: file and image outline icons suffice. Caption "Upload completion, media readiness and publication are separate steps." All important controls legible and fully visible, tasteful generous space, restrained shadows, no dark theme for this new light output.
Composition: tall full webpage capture, landscape desktop canvas approximately 1600 by 1900 pixels, one desktop layout only. Persistent sidebar approximately 240 pixels wide on the left; Content active with pale-lime tint, Log out left bottom. Top horizontal breadcrumb "Admin / Content / After the Rain", AD Admin avatar right. Main width to the right with readable broad cards and spacious gutters. Metadata summary may use two columns; Publication card spans main width. Source and Cover cards side by side below. No mobile views or modal overlays on this output.
```

### Mobile light candidate

Generation; references yang sama. Candidate media dua kolom diganti oleh targeted correction.

```text
Use case: ui-mockup. Asset type: high-fidelity web admin dashboard UI design for Vertical Movie. Create a new publication-ready content-details mockup, extending the two reference images' approved Base UI/shadcn Rhea visual language. Image 1 is desktop light reference for shell and typography. Image 2 is mobile dark reference for compact navigation and theme grammar. These are style references; older upload-progress state and controls must change to an all-media-ready draft. English UI only, exact text, clean realistic flat software screenshot, no photographic device frame, no perspective, no annotations or decorative gradients. Inter body, Space Grotesk headings, crisp Remixicon-like outline icons, white/offwhite surfaces, near-black text, thin light-gray borders, rounded cards and buttons. Primary lime approximately #B8F542; the published status has not happened. Preserve navigation content: Vertical Movie play logo, Dashboard, Content, only Log out in sidebar footer, AD/Admin avatar with chevron and closed menu. No billing, teams, analytics, notifications, extra settings or public catalog page.

State: Film draft with metadata and rights complete; source and cover finished processing, no active uploads; ready for manual publish but not published. Page heading "Content details", subtext "Review content metadata and its current state." Actions "Back to content" and outlined "Edit metadata". Metadata card title "After the Rain", badges "Film" and "Draft". Compact readable metadata fields: "Slug" / "after-the-rain"; "Synopsis" / "An unexpected meeting after the rain changes two lives."; "Language" / "English"; "Release year" / "2026"; "Genres" / "Drama" / "Romance". Separate compact row/card "Record information" with "Rights: Confirmed" and "Version: 3". These summaries are a mockup; do not invent new product fields.

Make the full-width Publication card the main new visual focus, immediately after metadata/record information and before Upload media. Heading "Publication", outlined badge "Ready to publish", subtitle "This draft is not publicly available." Show a compact explicit checklist with six rows and small neutral check icons: "Active draft", "Title provided", "Synopsis provided", "Content rights confirmed", "Verified video and cover ready", "No active uploads". Under the checklist a muted callout "Preview the video before publishing." Action row outlined "Preview video", outlined "Refresh status", primary lime "Publish video". Publish is enabled but does not imply it has happened. Do not display Archive on a draft. Never add a preview player here.

Below Publication, show "Upload media", compact two role cards "Source video" and "Cover image", each with a neutral "Ready" badge. Filenames "after-the-rain.mp4" and "after-the-rain-cover.webp". Subtext "Processing complete". No drop zones, selected files, active transfer progress, Pause/Cancel upload or ETA. Avoid oversized preview art: file and image outline icons suffice. Caption "Upload completion, media readiness and publication are separate steps." All important controls legible and fully visible, tasteful generous space, restrained shadows, no dark theme for this new light output.
Composition: one tall full-page mobile screenshot at approximately 390 CSS pixel layout scale, output around 864 by 2304 pixels. No device frame and no desktop sidebar. Top compact hamburger, Vertical Movie logo/wordmark, AD avatar and chevron, menu closed. Heading/actions/metadata/record summary/Publication/Source/Cover stack in one column. Publication checklist fully readable. Below callout place full-width outlined Preview video, then full-width primary lime Publish video, then subtle Refresh status. All touch controls minimum 44 CSS px; no horizontal overflow or sticky footer; metadata text wraps naturally. Important new Publication card should occupy central area with full content visible. Keep neutral-white light theme. No desktop view or modal overlays in this output.
```

### Mobile light final correction

Edit target mobile candidate; Source/Cover stack tanpa mengganti metadata/Publication.

```text
Use case: precise-object-edit / UI layout correction. Edit target Image 1 is a new mobile light Publication ready-state mockup. Make EXACTLY ONE layout change: in the bottom Upload media section, stack the Source video and Cover image cards vertically, each taking the full mobile content width, with Source first then Cover underneath. This is essential for a 390 CSS pixel mobile layout. Expand canvas height only as needed so both complete cards remain visible without truncation. Source filename remains "after-the-rain.mp4"; Cover filename must be fully readable as "after-the-rain-cover.webp". Each retains "Ready" and "Processing complete". Keep every other pixel/layout/text/theme as unchanged as possible: mobile header, Content details heading, metadata/rights/version, six readiness checks, publication Draft state, Preview video / Publish video / Refresh status full-width buttons, all spacing and white/lime styling. No added content or controls, no desktop sidebar, no modal. Opaque tall screenshot, not transparent.
```

### Desktop dark

Edit target selected desktop light; theme recolor.

```text
Use case: lighting-weather / UI recolor. Edit target Image 1 is the newly generated approved-structure desktop Publication ready-state mockup. Make one change only: change its LIGHT THEME to the project's DARK charcoal theme. Preserve exact page dimensions, layout, all readable English text, metadata, six checklist checks, icons, buttons, navigation, spacing, and Ready to publish but still Draft state. Background #1E201E; card, sidebar, header/popover #272A27; muted/secondary/action outlines surfaces #303430; border #424842; main text #F3F5F3; muted text #A8B0A8; lime primary action approximately #A8E820 with dark text. Make secondary buttons legible with charcoal outlines and light icons/text. Ready chips remain restrained; Content active uses subtle charcoal-lime accent, not neon flood. Primary Publish video remains lime. Preserve all no-Archive draft semantics, closed AD/Admin menu and sidebar Log out. No other changes, no blue/navy black theme, no missing text/controls, no extra decorative gradients or devices. Opaque screenshot, not transparent.
```

### Mobile dark

Edit target selected corrected mobile light; theme recolor.

```text
Use case: lighting-weather / UI recolor. Edit target Image 1 is the final MOBILE LIGHT Publication ready-state mockup. Make exactly one change: recolor LIGHT to the existing DARK charcoal theme. Preserve original dimensions, exact layout and all English text, single-column mobile header/metadata/checklist/full-width buttons, vertically stacked Source video then Cover image, all full filenames, Draft state and Ready to publish state. Colors: background #1E201E; header/card surfaces #272A27; muted/secondary #303430; borders #424842; main text #F3F5F3; muted text #A8B0A8; primary Publish video lime #A8E820 with dark foreground. Secondary Preview video/Refresh status/Edit metadata outlines charcoal with light text/icons. Status chips restrained charcoal surfaces, Ready to publish still editorial draft. Keep all text/controls intact and no added Archive button on draft, no side-by-side media cards, no sidebar, modal, device frame, blue/navy theme or decorative gradients. Opaque full-page mobile UI.
```
