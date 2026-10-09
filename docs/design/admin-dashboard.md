# Dashboard admin — layout dan state

> Status: specification approved melalui approval plan pengguna 8 Oktober 2026; runtime implemented dan verified lokal melalui DASH-010 pada built Bun/Nitro/Chromium dengan real dedicated PostgreSQL.15 width/theme cases lulus; empty/large synthetic UI fixtures dan SQL publication/job fixtures dibedakan dari native auth/media regression. Rhea shell/token existing dipakai; tidak mengklaim mockup lama sebagai approval metrik baru. [Plan](../plans/admin-dashboard/implementation-plan.md), [backlog](../tasks/admin-dashboard.md).

## Struktur halaman

`/admin` memakai shell/nav/avatar Appearance existing. Heading Dashboard dengan subtitle "An overview of your content and current media jobs." Actions Create draft, View content dan Refresh. Waktu snapshot UTC tampil setelah data valid; tidak mengganti timestamp ketika refresh gagal.

Empat cards Film/Standalone/Series/Episodes, total dan Draft/Published/Archived/Unpublished (last bucket hanya muncul bila >0). Header Content inventory. Cards bukan status-filter controls. View films/standalone/series memakai existing content type; Episodes mempunyai helper "Manage episodes from a series." Helper editorial: "Published is an editorial status. Episodes may remain hidden until their series is published. Archiving a parent does not change each episode's status."

Section Current media jobs: Queued, Running, Retry, Failed. Unit source/cover job current dengan generation/pointer/owner-parent predicate plan. Helper "Counts refer to current source and cover jobs, not content items. Running reflects the last recorded job state." Tidak menjanjikan live worker health atau publication readiness.

Needs attention maksimal5 failures memakai title, type dan Source/Cover; Open content typed Link canonical. Empty: "No current failed media jobs." Latest created maksimal8 top-level owners memakai title/type/status/created date dan View content Link. Empty: "No content yet. Create a draft to get started." Account info Name/Email/Role/Session/expiry tetap tersedia di bagian bawah.

Desktop: empat inventory cards bila ruang cukup, media empat statuses, latest/attention dua columns. Pada320/390 cards dan list bertumpuk; 768 memakai dua inventory columns; 1024/1440 empat. Semua title wrap dan list item min-width0, controls min44px, semantic colors/badge variants. No poster/video/chart atau fake runtime data. Heading hierarchy h1→h2; count labels memakai accessible definition lists; tanggal menggunakan time/UTC; aria-live tidak mengumumkan seluruh inventori setiap poll.

## State dan acceptance mapping

| State/aksi                                 | UI behavior                                                                                 | Proof task           |
| ------------------------------------------ | ------------------------------------------------------------------------------------------- | -------------------- |
| Initial read                               | Skeleton; tidak menampilkan totals0 sebelum actual success                                  | DASH-005/006/010     |
| Empty success                              | Real0 pada4 cards/4 jobs, empty lists dan actions usable                                    | DASH-006/007/009/010 |
| Refresh pending                            | Last good data tetap terlihat, aria-busy dan Refresh disabled/deduplicated                  | DASH-005/010         |
| Read failure tanpa data                    | Alert safe/unavailable dan Retry; tidak menampilkan0                                        | DASH-005/006/010     |
| Read failure dengan data                   | Stale label dan previous snapshot time, Retry                                               | DASH-005/010         |
| Offline                                    | Offline label dan last good snapshot bila ada; Refresh disabled; reconnect stale revalidate | DASH-005/010         |
| Theme switch                               | Data/query identity/links tidak berubah                                                     | DASH-010             |
| Session loss/late read                     | Layout removes private sections, timers/fetch/cache stop; response lama tidak reseed        | DASH-005/008/010     |
| Publication/grouping/media changes         | Invalidation cancel/fence old read, next summary matches confirmed DB                       | DASH-008/009/010     |
| Unknown Series unpublished/archived parent | Truthful normalized partition, child editorial preserved                                    | DASH-003/009/010     |
| Media history/retry/executor               | Only current jobs counted once; failed5 matches count predicate                             | DASH-003/007/009/010 |
| Latest8/failed5 ties                       | Stable order; no hidden cap100; typed routes owner/episode                                  | DASH-003/007/009/010 |
| Background/error polling                   | No background/offline interval; failures pause30s poll until recovery                       | DASH-005/010         |
| Keyboard/width/theme                       | Focus visible, 44px targets, no horizontal overflow;15 width/theme cases                    | DASH-010             |

## Batas scope

Ringkasan read-only; tidak menambahkan settings/analytics/global queue monitor/reprocess/archive actions. Raster mockup tidak diminta; implementation memakai component specification di atas. Acceptance actual database/browser harus tercatat sebelum status dokumen berubah menjadi implemented/verified.
