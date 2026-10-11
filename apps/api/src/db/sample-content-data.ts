// Fixture text for db:seed:sample (see seed-sample-content.ts). Drafts only, Indonesian copy.
export type Title = {
  slug: string;
  title: string;
  synopsis: string;
  year: number;
  genres: string[];
};
export type Episode = { title: string; synopsis: string };
export type Show = Title & { seasons: Episode[][] };

export const genreNames = [
  "Drama",
  "Thriller",
  "Romance",
  "Comedy",
  "Mystery",
  "Sci-Fi",
  "Horror",
  "Documentary",
];
export const films: Title[] = [
  {
    slug: "hujan-di-ujung-malam",
    title: "Hujan di Ujung Malam",
    synopsis:
      "Kurir malam menerima paket yang dilarang dibuka. Sebelum subuh ia harus memilih siapa yang bisa dipercaya di kota yang basah dan sepi.",
    year: 2026,
    genres: ["Thriller", "Mystery"],
  },
  {
    slug: "surat-untuk-laras",
    title: "Surat untuk Laras",
    synopsis:
      "Tiga puluh surat tak terkirim ditemukan di loteng rumah lama. Setiap surat membuka satu rahasia keluarga yang selama ini disimpan rapat.",
    year: 2025,
    genres: ["Drama", "Romance"],
  },
  {
    slug: "kopi-terakhir",
    title: "Kopi Terakhir",
    synopsis:
      "Pemilik warung kopi tua menutup toko di hari terakhir bulan ini. Para pelanggan lama datang membawa cerita yang belum sempat dibagi.",
    year: 2025,
    genres: ["Drama"],
  },
  {
    slug: "kabur-sebelum-subuh",
    title: "Kabur Sebelum Subuh",
    synopsis:
      "Dua sahabat salah naik travel dan harus kembali ke kota sebelum pernikahan sang kakak dimulai, dengan satu motor dan sisa uang untuk bensin.",
    year: 2026,
    genres: ["Comedy", "Thriller"],
  },
  {
    slug: "lampu-kota-mati",
    title: "Lampu Kota Mati",
    synopsis:
      "Listrik padam serentak di seluruh kota selama satu malam. Seorang teknisi menyadari pola padamnya bukan kebetulan dan mengikuti jejaknya.",
    year: 2026,
    genres: ["Sci-Fi", "Mystery"],
  },
  {
    slug: "rumah-nenek",
    title: "Rumah Nenek",
    synopsis:
      "Liburan di rumah nenek berubah ketika cucu-cucunya mendengar langkah dari kamar yang selalu terkunci sejak nenek meninggal.",
    year: 2024,
    genres: ["Horror", "Mystery"],
  },
];
export const standalones: Title[] = [
  {
    slug: "tiga-menit-sebelum-hujan",
    title: "Tiga Menit Sebelum Hujan",
    synopsis:
      "Seorang pedagang jemuran di pasar punya tiga menit untuk menyelamatkan dagangan sebelum langit pecah dan semua orang berlari.",
    year: 2026,
    genres: ["Comedy"],
  },
  {
    slug: "ojol-terakhir",
    title: "Ojol Terakhir",
    synopsis:
      "Pesanan terakhir malam itu mengantar pengemudi ke alamat yang sama dengan rumah masa kecilnya, tanpa penumpang dan tanpa nomor.",
    year: 2025,
    genres: ["Drama"],
  },
  {
    slug: "pesan-dari-lantai-9",
    title: "Pesan dari Lantai 9",
    synopsis:
      "Pesan suara salah kirim terus masuk ke ponsel seorang resepsionis. Suaranya meminta tolong dari lantai gedung yang tidak pernah ada.",
    year: 2026,
    genres: ["Thriller", "Horror"],
  },
  {
    slug: "pasar-malam",
    title: "Pasar Malam",
    synopsis:
      "Dokumenter pendek tentang para pedagang pasar malam yang membangun dan membongkar kota kecil mereka setiap hari sebelum matahari terbit.",
    year: 2025,
    genres: ["Documentary"],
  },
];
export const shows: Show[] = [
  {
    slug: "kos-17",
    title: "Kos 17",
    synopsis:
      "Sepuluh penghuni kos dengan satu kamar mandi, satu ibu kos yang tahu segalanya, dan seribu urusan yang selalu bocor ke lorong.",
    year: 2025,
    genres: ["Comedy", "Drama"],
    seasons: [
      [
        {
          title: "Kamar Kosong",
          synopsis: "Penghuni baru datang tepat saat aturan kos berubah.",
        },
        {
          title: "Listrik Patungan",
          synopsis: "Tagihan membengkak dan semua orang punya teori sendiri.",
        },
        {
          title: "Malam Jumat",
          synopsis: "Suara dari lantai dua membuat lorong mendadak ramai.",
        },
        {
          title: "Ibu Kos Pulang Kampung",
          synopsis: "Tanpa pengawasan, aturan kos diuji satu per satu.",
        },
      ],
      [
        {
          title: "Musim Hujan",
          synopsis: "Atap bocor memaksa semua penghuni berbagi satu kamar.",
        },
        {
          title: "Kunci Duplikat",
          synopsis: "Sebuah kunci hilang dan kecurigaan menyebar cepat.",
        },
        {
          title: "Perpisahan",
          synopsis: "Satu per satu penghuni lama berkemas untuk pergi.",
        },
      ],
    ],
  },
  {
    slug: "lorong-waktu",
    title: "Lorong Waktu",
    synopsis:
      "Lorong stasiun lama yang selalu terlambat satu menit mempertemukan lima orang asing dengan versi kota mereka dari tahun yang berbeda.",
    year: 2026,
    genres: ["Sci-Fi", "Mystery"],
    seasons: [
      [
        {
          title: "Terlambat Satu Menit",
          synopsis: "Kereta terakhir tiba di jam yang seharusnya sudah lewat.",
        },
        {
          title: "Peron Tujuh",
          synopsis: "Seorang masinis menemukan peron yang tidak ada di peta.",
        },
        {
          title: "Karcis Kemarin",
          synopsis: "Karcis bertanggal besok membuka pintu yang selalu macet.",
        },
        {
          title: "Penjaga Loket",
          synopsis: "Seseorang tahu persis kapan setiap penumpang akan tiba.",
        },
        {
          title: "Kereta Pertama",
          synopsis: "Semua jalur bertemu di satu titik sebelum fajar.",
        },
      ],
    ],
  },
  {
    slug: "dapur-mak-ratna",
    title: "Dapur Mak Ratna",
    synopsis:
      "Warung makan keluarga yang hampir tutup mendapat peluang kedua ketika cucu yang lama merantau pulang membawa resep dan banyak rencana.",
    year: 2025,
    genres: ["Drama", "Romance"],
    seasons: [
      [
        {
          title: "Pulang",
          synopsis: "Cucu kembali ke kampung dan menemukan dapur yang sepi.",
        },
        {
          title: "Resep Rahasia",
          synopsis: "Sebuah buku catatan lama mengubah menu hari itu.",
        },
        {
          title: "Antrean Pertama",
          synopsis: "Warung ramai lagi dan satu kenalan lama ikut mengantre.",
        },
      ],
    ],
  },
];

export const allVideoSlugs = [
  ...films.map((f) => f.slug),
  ...standalones.map((s) => s.slug),
  ...shows.flatMap((show) =>
    show.seasons.flatMap((eps, i) =>
      eps.map((_, n) => `${show.slug}-s${i + 1}e${n + 1}`),
    ),
  ),
];
