# Admin Series, season dan episode — route dan state specification

> Status: implemented/verified lokal ASER-004–011; evidence pada backlog, baseline specification historis · 8 Oktober 2026 · Modul dan implementasi diminta pengguna. Menggunakan desain admin Rhea yang sudah tersedia; dokumen ini bukan raster approval atau proof runtime. Baseline `0550d0484ca27fbfacb96a033055f4045b636dad`.

## Alur dan routes

Entry **Manage seasons & episodes** di detail Series menuju seasons list. Season 1 hasil create API ditampilkan; tidak membuat default season di browser. Semua routes berada di layout admin authenticated existing dan memakai UUID validation sebelum request.

| URL                                                      | Halaman / Back                                                                       |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `/admin/series/$seriesId/seasons`                        | List season, Add season, View episodes/Edit season; Back to series detail existing.  |
| `/admin/series/$seriesId/seasons/new`                    | Form season; Back to seasons.                                                        |
| `/admin/series/$seriesId/seasons/$seasonId/edit`         | Form dari season/version snapshot; Back to seasons.                                  |
| `/admin/series/$seriesId/seasons/$seasonId`              | List episode, Add episode dan Edit season; Back to seasons.                          |
| `/admin/series/$seriesId/seasons/$seasonId/episodes/new` | Episode draft untuk season terpilih; Back to episode list.                           |
| `/admin/series/$seriesId/episodes/$episodeId`            | Metadata/grouping, media, readiness dan publication; Back to actual season dari DTO. |
| `/admin/series/$seriesId/episodes/$episodeId/edit`       | Edit draft; Back to detail episode.                                                  |

Episode mempunyai routes/type sendiri; URL Film/Standalone existing tidak dipakai sebagai navigasi episode baru. Invalid UUID, missing owner atau parent mismatch menampilkan not found/error aman, tanpa mutation. Route tree digenerate oleh CLI. Head seluruh halaman memakai English title/noindex/nofollow existing admin policy.

## Metadata dan kemampuan

Season: positive number hingga batas integer API, optional title200/description10000/release year1800–9999/calendar date yang cocok dengan tahun. Nomor unique tetap reserved setelah archive. Create tanpa expectedVersion; edit memakai rowVersion season, bukan Series. Published parent aktif boleh menambah season/episode sesuai API; archived parent menolak semua perubahan.

Episode: title200, slug180/lowercase single-hyphen, original title/language, synopsis500, description10000, release year/date, episode number dan konfirmasi hak. Genre picker existing: kosong berarti inherit Series, selection berarti override. Effective genres dibaca dari server. Season grouping boleh dipilih dari active seasons dalam Series yang sama sebelum first publish; tidak menawarkan pindah ke Series lain. Published/archived metadata read-only; slug/nomor/season tidak dapat diubah setelah first publish. Penomoran default hanya suggestion; unique/version conflicts selalu diputuskan API.

Existing preview/media inventory memakai UUID episode sebagai video owner. Batas source600s/512MB diambil dari inventory API; processing completion tidak auto-publish. Publish episode di Series draft mempunyai label **Published · Hidden until series is published**. Setelah Series published, link public tetap bergantung effective readiness. Series publish memerlukan fresh authoritative readiness, cover dan minimal satu episode published/playable. Series published archive tidak ditawarkan. Episode archive mempertahankan metadata/expiry policy dan tidak melakukan cascade/hard delete.

## State matrix

| State                      | Tampilan dan interaksi                                                                                                                                                                                          |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loading                    | Skeleton/role status; tidak menampilkan empty state sebelum response.                                                                                                                                           |
| Empty seasons/episodes     | Empty dengan deskripsi dan Add bila owner aktif; Add tidak melakukan auto create.                                                                                                                               |
| Read error                 | Alert + Try again; cached data boleh dibaca dengan stale notice, mutation disabled.                                                                                                                             |
| Parent archived            | Read-only list/detail; create/edit/media/publication disabled sesuai API.                                                                                                                                       |
| Dirty form                 | Save explicit; Cancel/Back memakai UnsavedChangesGuard dan discard dialog; beforeunload existing.                                                                                                               |
| Validation                 | Field data-invalid, control aria-invalid, FieldError; fokus error pertama; required/limits ditulis jelas.                                                                                                       |
| Saving                     | Pending ref mencegah double submit; controls disabled, status aria-live; tidak optimistic navigation/badge.                                                                                                     |
| Conflict/duplicate         | Input tetap; kode domain diterjemahkan; Reload latest version explicit memakai discard confirmation sebelum mengganti baseline.                                                                                 |
| Uncertain save             | Input tetap, jangan kirim ulang otomatis. Periksa current list/detail/GET dahulu; create tanpa idempotency tidak dijanjikan exactly-once.                                                                       |
| Offline                    | Cached metadata/form tetap terlihat; Save/Load more/Refresh/mutation disabled; online memberi explicit retry/refetch, bukan replay mutation.                                                                    |
| Owner/session change       | Abort read/write/reload/effects; late response tidak mengisi cache atau menavigasi owner baru. Unauthorized memprioritaskan auth transition dibanding dirty guard.                                              |
| Episode pagination         | Cursor20 manual Load more, no duplicate cards atau parallel append; append error mempertahankan pages/cursor dan Retry load more. Search/archive/season mengganti key dan membatalkan owner request sebelumnya. |
| Media busy/readiness stale | Publish/archive disabled, fresh server status diperiksa sebelum mengunci confirmation intent.                                                                                                                   |
| Unconfirmed publication    | Check status GET, stable idempotency key/version untuk retry intent identik; tidak auto retry atau memperbarui version lalu POST.                                                                               |

## Layout, tema dan aksesibilitas

Reuse AdminShell/PageHeading/Card/FieldGroup/Field/Input/NativeSelect/Textarea/Checkbox/Badge/Alert/Empty/Skeleton/DiscardDialog/Publication dialogs. Forms satu kolom mobile, dua kolom hanya metadata pasangan desktop; actions wrap/stack, min44px, label eksplisit, full title wrap dan synopsis multiline. Season list/cards membolehkan panjang tanpa horizontal overflow. Native select menggulir pilihan season, bukan popover custom. Theme mengikuti Light/Dark/System semantic tokens; tidak memasukkan palette baru.

Viewport acceptance320/390/768/1024/1440, English copy, keyboard Tab/Enter/Space, first invalid field focus, dialog focus return/cancel/Escape, no nested interactive elements dan long copy/list. No fixed action footer yang menutupi input. Styling baru menggunakan gap/layout, tanpa raw color override atau vendor primitive edits.

## Proof mapping

- ASER-004: season forms, dirty/stale/duplicate/archived/owner/Back dan actual saved metadata.
- ASER-005: episode grouping/genre/immutable/edit/search/archive/cursor/history.
- ASER-006/009: upload recovery, manual Preview/publication, owner busy/uncertain/offline, effective visibility dan archive consequences.
- ASER-007/008/010: readiness parity, HTTP/auth/version/idempotency/SQL races dan cache identity.
- ASER-011: built browser seluruh journey/responsive/keyboard/native auth regression. Screenshot/spec tidak menggantikan proof persistence/player.

Canonical implementation/task evidence: [plan](../plans/admin-series-episodes/implementation-plan.md) dan [backlog](../tasks/admin-series-episodes.md). Product rules: [PRD](../product/prd.md), [global rules](../product/global-rules.md); published parent lifecycle yang belum didukung tetap scope terpisah.
