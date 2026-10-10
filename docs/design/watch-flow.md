# Alur detail dan tonton publik — WFLOW-001

> Status: **disetujui pengguna** 11 Oktober 2026 ("oke setuju", atas preview dan keputusan D1–D7 sebagaimana direkomendasikan) · disusun 10 Oktober 2026 · branch `feat/watch-flow-redesign`. Persetujuan dicatat pada [WFLOW-001](../tasks/watch-flow.md#task-wflow-001--setujui-desain-dan-keputusan-d1d7). Prototype bukan bukti API, HLS, atau perilaku runtime.

## Artefak review

[Preview HTML interaktif](watch-flow-preview.html) memakai token warna dan font dari `apps/web/src/styles.css` serta data fixture; tidak memanggil API dan tidak memuat video. Kontrol review di luar product viewport memilih viewport (Desktop 1440×900, Mobile 390×844, Tablet 768×1024), Light/Dark, layar dan state. Layout memakai container query sehingga mengikuti lebar viewport yang dipilih, bukan lebar jendela browser. Search pada preview memakai debounce 300 ms nyata terhadap fixture agar perilakunya dapat dinilai.

| Layar                  | State yang dapat dipilih                                                            |
| ---------------------- | ----------------------------------------------------------------------------------- |
| Browse + search        | live, searching, results, empty, error, offline                                     |
| Detail Film/Standalone | default, loading, offline, error                                                    |
| Detail Series          | default, loading episodes, load more, episodes error                                |
| Watch Film/Standalone  | default, loading playback, playback error                                           |
| Watch Episode          | tengah, ended (Up next), episode terakhir, episode pertama, episodes error, offline |

Viewer yang memblokir skrip (misalnya panel pratinjau aplikasi desktop) menampilkan salinan statis tanpa JavaScript dengan kontrol radio yang sama (tanpa demo debounce langsung); salinan itu dibangkitkan oleh [build-watch-flow-preview.mjs](build-watch-flow-preview.mjs) dari fungsi render yang sama, jalankan ulang skrip itu setelah mengubah preview lalu format dengan Prettier. Buka berkas di browser untuk demo debounce langsung.

Screenshot PNG belum dibuat: lingkungan penulisan tidak memiliki browser. Reviewer membuka HTML langsung; PNG 390/1440 Light/Dark dapat diekspor setelah persetujuan bila diperlukan.

## Breakpoint dan grid

| Lebar    | Browse grid | Detail                                     | Watch                                                                |
| -------- | ----------- | ------------------------------------------ | -------------------------------------------------------------------- |
| < 640 px | 2 kolom     | Poster 132 px di samping judul, CTA sticky | Top bar 56 px, player penuh lebar, info dan panel di bawah           |
| 640–1023 | 3 kolom     | Poster 220 px, CTA inline                  | Seperti mobile; player dibatasi tinggi viewport dan di tengah        |
| ≥ 1024   | 5 kolom     | Poster 360 px kiri, info kanan, CTA inline | Player kiri (tinggi = viewport − top bar − 48 px), rail 560 px kanan |

Rasio 9:16 tidak pernah di-crop atau di-stretch: lebar player diturunkan dari tinggi yang tersedia (`min(100%, (100svh − 56 px) × 9/16)`). Implementasi memakai `svh`/`dvh` agar address bar mobile tidak menutup kontrol.

## Browse dan search

- Toolbar: segmented All/Films/Standalone (kiri) dan input search (kanan, 340 px) di ≥ 640 px; pada mobile search penuh lebar di bawah filter.
- **Search hanya debounce.** Tidak ada tombol submit dan Enter tidak diperlukan. Permintaan dikirim 300 ms setelah ketikan terakhir; selama komposisi IME (`compositionstart` → `compositionend`) debounce ditahan. Nilai di-trim, maksimum 200 karakter (sesuai API), input kosong = daftar tanpa pencarian.
- Indikator: spinner kecil di dalam input selama debounce+request (tanpa layout shift), status teks `aria-live="polite"` di bawah toolbar ("Searching…", "12 results for “night”", "0 results for “zzz”") dan skeleton kartu saat memuat.
- Tombol Clear (×) muncul bila ada teks; Escape juga mengosongkan. Fokus tetap di input setelah clear.
- Hasil memakai filter yang sedang aktif. Mengubah filter mempertahankan teks; mengubah teks mempertahankan filter.
- URL: `/?type=film&q=night`; `type=all` dan `q` kosong tidak ditulis. Perubahan `q` memakai `replace` agar tombol Back tidak dipenuhi ketikan; perubahan filter tetap `push`. Request sebelumnya dibatalkan (AbortSignal) ketika query key berubah. Kunci query menyertakan `q` ter-normalisasi.
- Sumber data: API `GET /catalog` sudah mempunyai `search`, `kind`, `genreId`, cursor dan `total` (lihat [API publik](../architecture/overview.md)). Hasil tetap memakai Load more manual dan skeleton append.
- State: loading awal (skeleton), empty ("No results for “…”" + Clear search), error ("Could not search" + Retry search; hasil sebelumnya tetap), offline (input dinonaktifkan, "Reconnect to search"). Search dinonaktifkan saat offline dan tidak mengirim permintaan.
- Series: kartu Series memakai badge "Series" dan "N seasons" bila keputusan D6 menyertakan Series di Browse.

## Detail Film/Standalone (`/videos/:slug`)

- Mobile: tautan "Back to browse", poster 132 px dan blok judul (badge, durasi, h1, genre) berdampingan, sinopsis dipotong 4 baris dengan "Read more", CTA "Watch now" lebar penuh menempel di bawah (safe-area).
- Desktop: poster 360 px di kiri; kanan memuat badge, durasi, h1 (48 px), genre, sinopsis, CTA inline.
- State: loading skeleton, offline (alert + CTA nonaktif), stale + Refresh (copy sekarang), error + Retry, 404 → halaman Not Found.

## Detail Series (`/series/:slug`)

- Header sama seperti Film dengan "2 seasons · 6 episodes", CTA "Play S1 E1".
- Daftar episode: tabs untuk ≤ 4 season, select bila lebih; hanya season terpilih. Baris: nomor (E1), judul, sinopsis 2 baris, durasi; seluruh baris tautan ≥ 44 px ke `/watch/:slug`.
- State: loading episodes (skeleton 4 baris), Load more episodes, error + Retry episodes, empty ("No episodes are currently available.").

## Watch (`/watch/:slug`)

- Top bar 56 px menggantikan header 80 px: Back (ikon + label di desktop), judul terpotong (Series: "Series · S1 E3"), menu tema.
- Player memakai `VerticalVideoPlayer` existing; perilaku renewal/Retry playback tidak berubah. Tanpa autoplay.
- Mobile: player lalu info (badge, S/E, durasi, h1, sinopsis 3 baris), Previous/Next dua kolom, panel Episodes (select season + daftar), seluruhnya dalam satu scroll.
- Desktop: breadcrumb "Series › Season 1 › Episode 3", h1 32 px, Previous/Next, panel Episodes dengan scroll internal (maks. 340 px) dan episode aktif ditandai (`aria-current`, aksen primary).
- Film/Standalone: rail berisi info dan tombol "Details"; tanpa panel episode.
- Akhir episode: kartu "Up next · S1 E4 — Thorns" dengan tombol "Play next" di atas kontrol player; tanpa countdown/auto-advance.
- Episode terakhir: Next dinonaktifkan dan pesan "You’re all caught up." + "Back to series"; episode pertama: Previous dinonaktifkan.
- State: loading playback, Playback error ("Playback interrupted" + Retry playback), episodes error (Retry episodes), offline (alert, player tidak dimuat).

## Aksesibilitas dan perilaku

- Satu `h1` per halaman; landmark `main`, `nav`, `role="search"`; fokus berpindah ke `h1` saat pindah episode. Tombol dan tautan ≥ 44 px, fokus terlihat (`ring`).
- Tab season memakai pola tabs (`role="tablist"`, panah kiri/kanan) atau select native bila banyak.
- Daftar episode berupa `<ul>` tautan; episode aktif `aria-current="true"`.
- `prefers-reduced-motion` memperlambat spinner dan tidak memakai animasi lain; skeleton hanya pulse opacity.
- Light/Dark/System memakai token semantik yang sama dengan [design system](design-system.md); tanpa warna hard-coded pada runtime.

## Keputusan (disetujui pengguna 11 Oktober 2026)

| ID  | Keputusan                                                                                                                                         | Rekomendasi                                                                                                                                     |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Konteks Back tidak di URL; riwayat dipakai bila detail dibuka dari grid, selain itu `/`.                                                          | Setuju (sudah diimplementasikan di WFLOW-002).                                                                                                  |
| D2  | `/titles/$kind/$slug` dialihkan ke `/videos/:slug`; Series tetap `/series/:slug`.                                                                 | Setuju.                                                                                                                                         |
| D3  | Watch memakai top bar ramping 56 px.                                                                                                              | Setuju.                                                                                                                                         |
| D4  | Tanpa autoplay; akhir episode menampilkan kartu "Up next" berupa tombol.                                                                          | Setuju.                                                                                                                                         |
| D5  | Daftar episode teks saja (API episode tidak membawa poster).                                                                                      | Setuju.                                                                                                                                         |
| D6  | Search dan Browse menyertakan Series? API `GET /catalog` mendukung `kind=series`; keputusan 8 Oktober 2026 membatasi homepage ke Film/Standalone. | Sertakan Series pada search dan grid dengan badge "Series" dan filter tambahan "Series"; butuh persetujuan karena mengubah keputusan 8 Oktober. |
| D7  | Search: debounce 300 ms tanpa tombol submit, `q` di URL dengan `replace`, minimum 1 karakter.                                                     | Setuju sesuai permintaan pengguna 10 Oktober 2026.                                                                                              |

## Evidence dan batas

Pengguna menyetujui preview dan D1–D7 dengan satu pernyataan ("oke setuju") tanpa perubahan per butir; D6 mengubah keputusan 8 Oktober 2026 (homepage khusus Film/Standalone) menjadi Browse dan search yang menyertakan Series. Prototype diperiksa dengan render smoke terhadap seluruh kombinasi viewport/tema/layar/state (138 kombinasi tanpa error) menggunakan stub DOM; tampilan visual belum dilihat di browser oleh agent dan PNG belum dibuat. Preview tidak membuktikan API, cache, SSR, navigasi riwayat, player, aksesibilitas atau performa.
