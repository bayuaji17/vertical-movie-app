# Aturan development API

> Ditetapkan untuk pengembangan `apps/api` pada 1 Oktober 2026 atas permintaan pengguna. Struktur di bawah menjadi pedoman ketika modul diimplementasikan; direktori dan integrasi yang belum dibutuhkan dibuat bersama task terkait.

## Ruang lingkup dan kondisi saat ini

API menggunakan TypeScript strict, Elysia, dan Bun sesuai versi root `package.json`. API memiliki logika domain dan akses data aplikasi. **Eden Treaty dipilih pengguna pada 1 Oktober 2026** untuk konsumsi kontrak Elysia oleh web. Web tidak menjalankan ulang aturan publikasi atau otorisasi sebagai pengganti validasi server.

Fondasi API memiliki factory Elysia tanpa listen, env tervalidasi, satu pool Bun SQL/Drizzle dan shutdown. Route aktif: `GET /`, handler native Better Auth `/api/auth/*`, serta Scalar `/openapi` dan `/openapi/json`. API mengimpor factory/schema dari `@repo/auth/server`, menyuntikkan pool yang sama; package tidak membaca env atau membuat pool global. Schema auth dimiliki package dan diekspor ulang API untuk migrasi. Macro `requireAdmin` memanggil getSession native dengan disableCookieCache setiap rute privat, kemudian mengecek role admin, ban dan expiry; register sebelum rute privat dengan chaining Elysia. Auth publik hanya status/login/logout/session; operator HTTP tertutup. Seed memakai CLI resmi dan recovery memakai reset native selama maintenance. `/admin/session` dan singleton/writer custom sudah dihapus. Guard web tidak menggantikan otorisasi endpoint bisnis. Eden bisnis tetap type-only `api/types`; auth browser/SSR memakai SDK package. Lihat [Auth Operations](AUTH_OPERATIONS.md) untuk konfigurasi, command, failure, migration dan bukti. Storage/worker belum dipasang.

Instruksi agent tetap berada di [AGENTS.md](../AGENTS.md). Ikuti [Global Workflow](GLOBAL_WORKFLOW.md), [Template Task](TASK_TEMPLATE.md), dan [Environment](ENVIRONMENT.md). Kontrak produk yang belum disetujui di [Architecture](ARCHITECTURE.md) tetap berupa rancangan.

## Struktur folder tujuan

```text
apps/api/
├── src/
│   ├── index.ts                  # Startup HTTP, listen, dan shutdown
│   ├── app.ts                    # Factory createApp; komposisi tanpa listen
│   ├── types.ts                  # Ekspor type-only App untuk Eden
│   ├── auth.ts                   # Config CLI operator native; tidak listen
│   ├── config/
│   │   └── env.ts                # Pembacaan dan validasi konfigurasi server
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── provision-cli.ts  # Orkestrasi CLI resmi create-admin
│   │   │   ├── reset-cli.ts      # Orkestrasi reset native dalam maintenance
│   │   │   ├── cli-input.ts      # Input password recovery tersembunyi
│   │   │   └── admin/
│   │   │       ├── guard.ts      # Macro requireAdmin untuk route privat
│   │   │       └── model.ts      # Schema error guard admin
│   │   ├── videos/
│   │   │   ├── index.ts          # Komposisi rute publik dan admin
│   │   │   ├── public.ts         # Baca video terbit tanpa login
│   │   │   ├── admin.ts          # Operasi video yang memerlukan admin
│   │   │   ├── model.ts          # Schema request/response, tipe, error domain
│   │   │   ├── service.ts        # Aturan bisnis dan transisi publikasi
│   │   │   ├── repository.ts     # Query modul jika perlu dipisahkan
│   │   │   ├── service.test.ts   # Unit test aturan domain dengan bun:test
│   │   │   └── index.test.ts     # Test rute/schema/lifecycle tanpa membuka port
│   │   ├── media/                # Unggah dan aset; pola file sama sesuai kebutuhan
│   │   └── settings/             # Pengaturan yang boleh diubah admin
│   ├── plugins/
│   │   ├── admin.ts              # Guard lintas modul bila domain admin memerlukannya
│   │   ├── errors.ts             # Pemetaan error HTTP dan request ID
│   │   ├── openapi.ts            # Komposisi dokumentasi Scalar dan schema auth
│   │   └── logger.ts             # Logging request dengan redaksi rahasia
│   ├── db/
│   │   ├── client.ts             # Factory pool Bun SQL dan Drizzle
│   │   ├── migrate.ts            # Migrator eksplisit, tidak berjalan pada request
│   │   └── schema/
│   │       ├── auth.ts           # Re-export schema canonical @repo/auth/server
│   │       ├── index.ts          # Schema gabungan untuk migrasi/adapter
│   │       ├── videos.ts
│   │       ├── media.ts
│   │       ├── jobs.ts
│   │       └── settings.ts
│   ├── storage/
│   │   └── client.ts             # Factory Bun S3 client dan operasi storage
│   ├── workers/
│   │   ├── index.ts              # Startup worker terpisah dari HTTP
│   │   ├── queue.ts              # Klaim, lease, retry, dan penyelesaian job
│   │   └── transcode.ts          # Orkestrasi FFprobe/FFmpeg dan hasil media
│   └── shared/                   # Kode lokal yang dipakai beberapa modul
├── drizzle/                      # Migrasi SQL dan metadata hasil generasi
├── scripts/                      # Provisioning admin atau operasi terkontrol
├── test/
│   └── integration/              # Pengujian PostgreSQL/storage/worker
├── drizzle.config.ts             # Konfigurasi schema dan output migrasi Drizzle
├── .env.example
├── package.json
└── tsconfig.json
```

Modul kecil cukup memakai `index.ts`, `model.ts`, dan `service.ts` sesuai kebutuhan. Pisahkan `public.ts`/`admin.ts` ketika satu modul memiliki dua kelompok akses. Tambahkan `repository.ts` ketika query perlu dipakai ulang, kompleks, atau diuji terpisah; query sederhana boleh berada pada service. Jangan membuat direktori kosong atau file placeholder agar seluruh pohon terlihat lengkap.

### Tanggung jawab dan arah dependensi

| Bagian            | Tanggung jawab                                                                                    | Batas                                                                              |
| ----------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `index.ts`        | Membuat resource, memulai HTTP, menangani shutdown.                                               | Tidak memuat aturan bisnis.                                                        |
| `app.ts`          | Membuat instance Elysia dengan dependensi eksplisit dan memasang plugin/modul.                    | Import tidak membuka port, pool, atau menjalankan worker.                          |
| Rute modul        | Validasi HTTP, sesi, status, cookie, dan pemanggilan service.                                     | Tidak menjalankan FFmpeg atau transaksi bisnis panjang.                            |
| `model.ts`        | Schema transport, tipe turunannya, dan error milik modul.                                         | Schema HTTP dipisahkan dari schema tabel Drizzle.                                  |
| `service.ts`      | Aturan domain, koordinasi data, dan transaksi yang diperlukan.                                    | Menerima input serta dependensi terpilih; tidak menerima seluruh Elysia `Context`. |
| `repository.ts`   | Query terparameterisasi, filter akses data, dan operasi melalui transaksi yang diberikan service. | Tidak membaca cookie atau menentukan status HTTP.                                  |
| `db/`, `storage/` | Adapter infrastruktur yang dipakai HTTP dan worker.                                               | Tidak mengimpor controller/modul HTTP.                                             |
| `workers/`        | Memproses job persisten dan menjalankan subprocess media.                                         | Tidak mengimpor entry point HTTP atau bergantung pada request.                     |

Arah utama: **rute → service → repository/client infrastruktur**. Service boleh memakai service modul lain melalui ekspor yang jelas; jangan mengimpor controller atau detail repository modul lain. Hindari dependensi melingkar. Gunakan injeksi dependensi melalui factory atau constructor untuk resource seperti database, storage, waktu, dan logger yang dibutuhkan pengujian.

Kode lokal API yang benar-benar dipakai beberapa modul boleh masuk `shared/`; helper khusus satu modul tetap di modul tersebut. Pindahkan kode ke `packages/` hanya ketika API dan web benar-benar membutuhkan kode yang sama. Jangan mengekspor client database, env, atau server auth ke browser.

## Penulisan TypeScript dan penamaan

- Gunakan ESM serta named export. Gunakan `import type` untuk tipe; impor antarworkspace melalui entry point publik package.
- Gunakan nama kode berbahasa Inggris: `camelCase` untuk fungsi/variabel, `PascalCase` untuk tipe/class/schema seperti `PublishVideoBody`, dan `UPPER_SNAKE_CASE` untuk konstanta tetap.
- Nama folder/file memakai `kebab-case`, misalnya `upload-session.ts`. Nama kolom/tabel PostgreSQL memakai `snake_case`; properti kontrak HTTP memakai `camelCase` dengan pemetaan eksplisit.
- Pertahankan TypeScript strict. Hindari `any`, assertion berantai, dan non-null assertion yang hanya menyembunyikan input belum divalidasi. Data eksternal yang belum diperiksa memakai `unknown`.
- Utamakan inferensi lokal; tulis tipe pada batas service, input/output domain, dan dependensi. Turunkan tipe request/response dari schema Elysia dan tipe tabel dari Drizzle agar definisi tidak diduplikasi.
- Service yang mengelola dependensi dapat berupa class dengan constructor eksplisit; fungsi murni digunakan untuk transformasi atau aturan tanpa resource. Hindari base class/repository generik sebelum ada kebutuhan konkret.
- Gunakan guard clause untuk validasi dan penolakan awal. Fungsi memiliki satu tanggung jawab; pecah ketika beberapa aturan atau efek samping membuat hasil sulit ditinjau.
- Await operasi yang memengaruhi keberhasilan request/job. Pekerjaan media tahan restart harus masuk queue PostgreSQL; jangan memulainya sebagai promise yang dilepas di handler.
- Komentar menjelaskan alasan, constraint, atau keputusan yang tidak terlihat dari kode. Jangan menuliskan ulang operasi yang sudah jelas.
- Format mengikuti Prettier root: default indentasi dua spasi, kutip ganda, dan semicolon untuk API selama tidak ada konfigurasi repo yang menggantinya. Hindari perubahan format file lain di luar task.

## Eden Treaty dan batas kontrak API–web

Elysia mendefinisikan kontrak server; Eden adalah client bertipe yang mengonsumsinya. `apps/web` menggunakan `@elysia/eden` `1.4.10` dan dependency pengembangan Elysia `1.4.30` untuk menyelesaikan inferensi peer yang kompatibel dengan API. Dokumentasi resmi saat ini memakai `@elysia/eden`; referensi skill lama masih menyebut `@elysiajs/eden`. Versi terpasang dan peer dependency telah diperiksa saat AUTH-010.

1. `app.ts` mengekspor factory `createApp` dan tipe `App = ReturnType<typeof createApp>`. Factory mengembalikan hasil chaining seluruh modul dengan tipe hasil inferensi; jangan menulis return type umum `Elysia` yang menghapus informasi rute.
2. `types.ts` hanya mengekspor `App` melalui `export type`; package API sudah menyediakan entry point `api/types`. Tambahkan dependensi `api: workspace:*` pada web saat konsumen kontrak dibuat. Browser hanya menggunakan `import type`; jangan impor runtime `app.ts` atau `index.ts` ke web.
3. Kontrak tetap dimiliki API; jangan membuat salinan DTO/rute di web atau package baru hanya untuk menduplikasi tipe. TypeScript consumer harus dapat menyelesaikan seluruh impor dalam deklarasi kontrak, termasuk tipe Bun bila diperlukan. Gunakan impor relatif/entry point workspace yang jelas; alias API tidak boleh diselesaikan sebagai alias web.
4. Client web berada di `apps/web/src/lib/auth/api-client.ts`; `treaty` menerima kontrak dari import type-only `api/types`. URL publik dari `VITE_API_URL` divalidasi sebagai origin HTTP(S) sebelum ditambahkan base `/api`; konfigurasi yang hilang/invalid membuat loader mengembalikan state konfigurasi unavailable, bukan fallback ke origin lain.
5. Tipe Eden tidak menegakkan akses runtime. Schema Elysia, pemeriksaan admin, dan query publik tetap wajib pada server. Endpoint Better Auth menggunakan client `@repo/auth/client`; direct upload ke signed URL dan pemutaran media memakai mekanismenya sendiri.

Contoh berikut adalah pola tujuan; factory, entry point, dan client tersebut belum ada pada starter:

```ts
// apps/api/src/app.ts
import { Elysia, t } from "elysia";

export const createApp = () =>
  new Elysia().get("/", () => "Hello Elysia", {
    response: t.String(),
  });

export type App = ReturnType<typeof createApp>;
```

```ts
// apps/api/src/types.ts
export type { App } from "./app";
```

```ts
// apps/web/src/lib/api/client.ts
import { treaty } from "@elysia/eden";
import type { App } from "api/types";

export const createApiClient = (apiUrl: string) =>
  treaty<App>(apiUrl, { parseDate: false });
```

Panggilan Eden mengembalikan `data`/`error`; tangani HTTP error sebelum memakai data. Query/mutation TanStack Query harus mengubah hasil error menjadi exception yang sesuai agar request gagal tidak masuk cache sukses. Tangani juga penolakan promise akibat jaringan/abort, teruskan `AbortSignal` pada fetch, dan jangan retry operasi tulis tanpa idempotensi. Bentuk ini mengikuti [respons Eden](https://elysiajs.com/eden/treaty/response).

Konfigurasi client ditetapkan eksplisit: pertahankan `parseDate: false` agar timestamp DTO tetap string UTC sesuai kontrak HTTP. Browser mengirim sesi pada operasi admin dengan opsi fetch `credentials: "include"` setelah konfigurasi origin/cookie disiapkan. Untuk SSR, buat client yang meneruskan cookie yang diperlukan **per request** ke origin API yang ditetapkan server; jangan menyimpan cookie pengguna pada singleton global. Jangan meneruskan semua header request secara bebas. Lihat [konfigurasi Eden](https://elysiajs.com/eden/treaty/config).

Gunakan `status(code, payload)` atau helper `status` pada konteks handler untuk respons aplikasi agar kode status dan body terinferensi sebagai satu kontrak. Hindari hanya mengatur `set.status` atau mengembalikan `Response` mentah untuk endpoint JSON bertipe. Response mentah tetap diperbolehkan untuk handler Better Auth, redirect, atau streaming yang memang memerlukannya; cakupan inferensinya harus jelas.

## Lifecycle, scope, dan komposisi plugin

Alur normal: **request → parse → transform/derive → validasi input → beforeHandle/resolve → handler → afterHandle → validasi response → mapResponse → afterResponse**. `onError` menangani jalur error; tidak menjadi tahap sukses. Berikut pembagian tugas proyek berdasarkan [lifecycle Elysia](https://elysiajs.com/essential/life-cycle):

| Tahap                        | Penggunaan                                                   |
| ---------------------------- | ------------------------------------------------------------ |
| `onRequest`                  | Request ID dan pemeriksaan awal; body/params belum tersedia. |
| `onParse`                    | Parser khusus bila parser bawaan tidak cukup.                |
| `onTransform` / `derive`     | Normalisasi sebelum validasi; input belum dipercaya.         |
| Validasi input               | Memeriksa schema rute.                                       |
| `resolve` / `onBeforeHandle` | Konteks tervalidasi, sesi, dan otorisasi admin.              |
| Handler                      | Memanggil service dan membentuk hasil bertipe.               |
| `onAfterHandle`              | Penyesuaian hasil/header yang sesuai kontrak.                |
| `mapResponse`                | Konversi HTTP bila diperlukan.                               |
| `onAfterResponse`            | Logging/cleanup setelah respons.                             |
| `onError`                    | Memetakan exception/validation error secara aman.            |

Konteks pengguna berasal dari `resolve`, bukan state/decorator yang dipakai bersama. `derive` berjalan sebelum validasi; `resolve` berjalan sesudahnya. Masing-masing berbagi urutan registrasi dengan transform/beforeHandle. Return nilai dari `onRequest` atau `beforeHandle` dapat menghentikan jalur normal; hook observasi yang tidak mengganti respons tidak boleh return payload.

### Aturan scope dan urutan

| Scope hook | Jangkauan                                            |
| ---------- | ---------------------------------------------------- |
| `local`    | Instance pemilik dan turunannya; default hook biasa. |
| `scoped`   | Instance pemilik, parent langsung, dan turunannya.   |
| `global`   | Memperluas hook ke seluruh komposisi aplikasi.       |

`onRequest` adalah pengecualian: event awal ini tidak memilih rute dan bersifat global. Gunakan untuk kebijakan request lintas aplikasi; otorisasi admin berada pada kelompok privat. Interceptor lain memengaruhi rute/plugin yang didaftarkan sesudahnya. Hook lokal suatu plugin tidak otomatis melindungi rute parent yang memakainya. Dasar scope ini dijelaskan pada [plugin Elysia](https://elysiajs.com/essential/plugin).

- Susun komposisi: observabilitas/CORS/error mapping dengan scope yang disengaja → modul auth/publik/admin → startup HTTP di `index.ts`. Jika plugin error/logging perlu menjangkau seluruh rute, deklarasikan scope yang tepat; letak `.use()` saja tidak cukup.
- Pasang dependensi tipe seperti model, database, dan macro secara eksplisit pada modul yang memakainya. Utamakan factory yang mengembalikan instance Elysia baru dengan chaining daripada callback generik yang memutasi instance parent.
- Beri plugin nama stabil dan `seed` bila konfigurasinya membedakan instance. Jangan menyamakan identitas plugin dengan konfigurasi berbeda hingga salah satunya terhapus oleh deduplikasi.
- `plugins/admin.ts` menyediakan macro `requireAdmin` dengan `resolve` untuk sesi dan identitas admin. Aktifkan pada rute privat atau melalui guard yang melingkupi kelompok admin; jangan menaikkan hook auth menjadi `global`. Pola macro mengacu pada [panduan macro](https://elysiajs.com/patterns/macro).
- Pilihan `.as("scoped")`/`.as("global")` harus ditinjau karena mengangkat hook/schema dalam instance. Gunakan scope pada hook tertentu jika hanya satu kebijakan perlu diekspor.
- Jangan membungkus ulang payload JSON melalui `onAfterHandle`/`mapResponse` global tanpa schema yang mencerminkan hasil akhirnya; perubahan runtime harus tetap sesuai tipe Eden. Jangan konsumsi body Better Auth atau respons streaming dalam logging/mapping generik.
- `onAfterResponse` digunakan untuk observasi/cleanup; transaksi domain dan enqueue job yang diperlukan untuk sukses harus selesai sebelum mengirim respons. Tidak ada jaminan pekerjaan setelah respons akan bertahan jika proses mati.
- Pertahankan rute domain yang perlu kontrak Eden sebagai komposisi statis. Bila task membutuhkan plugin async/lazy, tunggu `app.modules` pada pengujian sebelum request dan buktikan perilaku startup serta inferensi tipenya.

## Rute, validasi, dan kontrak HTTP

Gunakan instance Elysia sebagai controller modul, handler inline, dan method chaining agar inferensi konteks terjaga. Plugin yang menambah model atau konteks harus dipasang eksplisit pada modul yang memakainya. Tentukan scope hook secara sengaja; autentikasi admin tidak boleh ikut membatasi rute publik. Pasang hook sebelum rute yang harus dipengaruhinya dan beri nama stabil pada plugin yang membutuhkan deduplikasi. Pola ini mengacu pada [panduan Elysia](https://elysiajs.com/essential/best-practice).

- Validasi `body`, `params`, dan `query`, serta header/cookie ketika dipakai sebagai input terstruktur. Gunakan `t` dari Elysia; tambahkan validator lain hanya bila ada kebutuhan yang belum dipenuhi.
- Ekspor schema dari `model.ts` dan turunkan tipe melalui `typeof Schema.static`. Gunakan nama model berawalan modul jika didaftarkan melalui `.model()` untuk menghindari tabrakan.
- Definisikan response schema untuk status berhasil dan error yang menjadi kontrak endpoint. Bentuk data publik dan admin dipisahkan; jangan langsung mengembalikan row database atau seluruh objek sesi.
- Endpoint publik hanya membaca video terbit dengan aset siap. Syarat akses ditegakkan pada query/service, termasuk endpoint detail dan penerbitan izin media.
- Pertahankan nama rute kandidat di Architecture sampai task kontrak menetapkan perubahan. Rute privat berada di kelompok `/admin`; endpoint Better Auth mengikuti handler resminya. Jangan menambahkan prefix versi API secara sepihak.
- Tentukan batas pagination, urutan yang stabil, batas input, dan filter yang diizinkan pada endpoint daftar. Jangan menerima nama kolom atau klausa SQL bebas dari klien.
- Serialisasikan waktu sebagai ISO 8601 UTC; simpan timestamp PostgreSQL yang merepresentasikan kejadian sebagai `timestamptz`. Simpan ukuran berkas dalam byte dan dokumentasikan satuan durasi/resolusi sebelum kontrak digunakan web.

Contoh schema pada `modules/videos/model.ts` ketika modul dibuat:

```ts
import { t } from "elysia";

export const CreateVideoBody = t.Object({
  title: t.String({ minLength: 1, maxLength: 200 }),
});

export type CreateVideoInput = typeof CreateVideoBody.static;
```

Batas judul pada contoh adalah ilustrasi; nilai final dicatat pada acceptance criteria modul video. Handler mengambil `body` yang sudah divalidasi, lalu meneruskannya ke service tanpa mengirim seluruh konteks request.

### Error dan status

Untuk endpoint aplikasi baru, gunakan error terstruktur `{ error: { code, message, requestId } }`. `code` stabil, misalnya `VIDEO_NOT_READY`; `message` aman ditampilkan dan tidak berisi stack trace atau rahasia. Kontrak endpoint milik Better Auth mengikuti Better Auth dan tidak dibungkus ulang.

| Status        | Penggunaan                                                                        |
| ------------- | --------------------------------------------------------------------------------- |
| `200` / `201` | Baca/perubahan berhasil; `201` untuk resource baru.                               |
| `202`         | Job berhasil dicatat untuk diproses; bukan bukti transcode selesai.               |
| `204`         | Berhasil tanpa body jika kontrak memilihnya.                                      |
| `400` / `422` | Input tidak valid; gunakan `422` untuk kegagalan schema Elysia.                   |
| `401` / `403` | Sesi tidak sah / identitas tidak berhak menjadi admin.                            |
| `404`         | Resource tidak ditemukan atau tidak tersedia bagi publik.                         |
| `409`         | Konflik/transisi tidak sah, termasuk terbit sebelum aset siap.                    |
| `413` / `415` | Payload terlalu besar / format media tidak didukung pada jalur yang memeriksanya. |
| `500` / `503` | Kesalahan internal / dependensi tidak tersedia sesuai kontrak.                    |

Error domain milik modul didefinisikan di `model.ts` dan dipetakan di controller atau plugin `errors.ts`. Kegagalan domain yang diperkirakan dapat dikembalikan sebagai hasil bertipe; tangani sebelum membentuk respons HTTP dengan `status(...)`. Jangan mengembalikan objek `Error` mentah sebagai payload sukses. Kesalahan infrastruktur yang dilempar ditangani melalui `onError`, dicatat dengan redaksi, dan menghasilkan respons aman.

Return `status(...)` mengirim respons langsung dan tidak melewati `onError`; throw masuk jalur error. Karena respons dari `onError` lintas aplikasi belum tentu otomatis muncul sebagai union error tiap rute, deklarasikan response schema status error yang memang menjadi kontrak rute/guard dan buktikan inferensinya di consumer Eden. Jangan menganggap error runtime bertipe hanya karena body-nya berbentuk JSON. Lihat [error handling Elysia](https://elysiajs.com/patterns/error-handling).

## Dokumentasi API — OpenAPI dan Scalar

**Gunakan satu halaman Scalar untuk dokumentasi endpoint aplikasi dan Better Auth.** Keputusan ini ditetapkan pengguna pada 1 Oktober 2026. `apps/api` memasang plugin OpenAPI Elysia; bootstrap menggabungkan schema Better Auth dari instance yang sama sebelum server listen. Dokumentasi pengembangan tetap berada di root `docs/`.

| Bagian                   | Fungsi dan kepemilikan                                                                        |
| ------------------------ | --------------------------------------------------------------------------------------------- |
| `/openapi`               | UI Scalar utama, disediakan `apps/api` melalui plugin OpenAPI Elysia.                         |
| `/openapi/json`          | Spesifikasi OpenAPI gabungan untuk tooling dan pemeriksaan kontrak.                           |
| Schema endpoint aplikasi | Dihasilkan dari rute dan schema Elysia pada modul API.                                        |
| Schema Better Auth       | Dihasilkan dari instance auth yang dikonfigurasi API melalui `@repo/auth`; digabung pada API. |
| Root `docs/`             | Aturan kode, keputusan arsitektur, alur domain/auth, dan backlog implementasi.                |

Path UI dan JSON mengikuti default [plugin OpenAPI Elysia](https://elysiajs.com/plugins/openapi). Paket aktif `@elysia/openapi` harus mengikuti dokumentasi resminya; referensi skill lama menyebut nama package terdahulu `@elysiajs/openapi`.

### Endpoint aplikasi tampil otomatis

- Endpoint yang didaftarkan pada instance Elysia utama atau modul yang dikomposisikan melalui `.use()` masuk ke dokumentasi secara otomatis setelah plugin dipasang. Endpoint baru harus ikut terlihat pada schema dan Scalar ketika versi aplikasi yang memuat rute tersebut dijalankan.
- Berikan setiap endpoint `detail.summary`, `detail.tags`, dan `detail.operationId` yang unik/stabil. Gunakan `detail.description` untuk aturan akses, transisi status, idempotensi, atau efek samping yang perlu dipahami consumer.
- Definisikan schema request dan response sesuai status HTTP yang didokumentasikan. Dokumentasikan pagination, satuan nilai, dan contoh payload tanpa credential asli; jangan menulis salinan kontrak JSON secara manual di Markdown.
- Kelompokkan endpoint dengan tag `Videos`, `Media`, `Settings`, dan `Better Auth`; tambahkan tag lain saat modul benar-benar memerlukannya. Operasi publik dan admin harus memiliki deskripsi akses yang jelas.
- `detail.hide: true` atau konfigurasi exclusion dipakai hanya jika endpoint sengaja tidak didokumentasikan dan alasannya tercatat. Menyembunyikan endpoint tidak memberi perlindungan akses; macro/guard admin tetap memeriksa request.
- Schema keamanan mengikuti mekanisme sesi yang benar-benar digunakan. Jangan mendeklarasikan bearer JWT jika aplikasi memakai cookie sesi. Rute publik tidak boleh mewarisi persyaratan admin dari dokumentasi global; nyatakan `security: []` bila perlu menghapus security yang diwariskan.

### Penggabungan Better Auth

1. Konfigurasi server auth memasang `openAPI({ disableDefaultReference: true })` dan mengekspor helper `generateAuthOpenAPISchema()` dari entry point server `@repo/auth/server`. Helper menerima instance auth yang sama dengan handler; jangan membuat instance auth atau pool database kedua untuk dokumentasi. Opsi Better Auth menonaktifkan halaman referensi bawaannya. Lihat [plugin OpenAPI Better Auth](https://better-auth.com/docs/plugins/open-api).
2. Bootstrap memanggil generator satu kali sebelum listen. Fragment auth diinjeksikan ke factory `createApp` yang tetap sinkron; generator tidak berjalan pada request bisnis.
3. Plugin Elysia menghasilkan path aplikasi. Hook lokal di plugin `api.openapi` dipasang sebelum generator route dan hanya memproses respons `/openapi/json`; ia menggabungkan fragment Better Auth tanpa mengubah kontrak respons rute bisnis. Path auth diberi prefix mount `/api/auth` tepat satu kali; `servers` dari schema Better Auth tidak disalin agar base path tidak terulang.
4. Hanya operasi yang aktif pada handler yang masuk katalog: `GET /ok`, `GET/POST /get-session`, `POST /sign-in/email`, dan `POST /sign-out`. Path dan metode lain dihapus dari dokumen dan tetap ditolak handler. Operasi diberi tag `Better Auth` serta operation ID yang stabil. Operasi session/logout dan admin memakai security cookie; status/login eksplisit `security: []`, sedangkan root aplikasi tanpa security global.
5. Schema parameters, request body, response, components, dan `$ref` Better Auth dipertahankan. Komponen digabung per kategori; nama path/operation ID/schema yang bentrok menyebabkan startup atau pembuatan dokumen gagal, bukan overwrite diam-diam. Cookie scheme mengikuti konfigurasi deployment: `better-auth.session_token` untuk HTTP lokal dan `__Secure-better-auth.session_token` untuk HTTPS.
6. Better Auth dan dokumen gabungan menggunakan OpenAPI `3.1.1`. Integration proof memeriksa references internal, tag, operation ID, security, filter endpoint, dan halaman Scalar; jangan hanya mengganti field versi untuk menyamarkan schema yang tidak kompatibel.

Komposisi OpenAPI berada di `apps/api/src/app.ts` dan transformasi/merge dokumen di `apps/api/src/plugins/openapi.ts`. Hook hanya mengubah response katalog OpenAPI; ia tidak membungkus response bisnis. Jangan menjalankan generator pada setiap request bisnis atau membuat factory kontrak Eden mengembalikan promise tanpa menyesuaikan konsumen tipenya.

Dokumentasi OpenAPI menerangkan kontrak HTTP. Consumer endpoint aplikasi tetap memakai Eden Treaty dan consumer auth memakai `@repo/auth/client`; menggabungkan schema auth ke Scalar tidak otomatis membuat endpoint handler `.mount()` terinferensi pada Eden.

### Bukti validasi saat implementasi

- Pastikan test memastikan rute aplikasi/modul baru masuk ke `/openapi/json` dan rute yang sengaja disembunyikan mengikuti konfigurasi.
- Periksa path auth terhadap URL handler sebenarnya, operation ID, tag, response, dan security scheme. Semua `$ref` harus dapat diselesaikan; konflik nama dan prefix ganda harus terdeteksi.
- Verifikasi Scalar menampilkan endpoint aplikasi serta auth dan dapat mengirim request dengan sesi yang sesuai pada environment development.
- Pastikan metadata security tidak ikut membuat katalog publik meminta login, dan respons `401`/`403` sesuai pemeriksaan admin sebenarnya.
- Jalankan validasi spesifikasi gabungan serta pemeriksaan tipe API/web yang relevan. Catat hasil pada task integrasi; halaman UI yang terbuka saja tidak membuktikan kontrak sudah benar.

## Autentikasi dan konfigurasi

- Konfigurasi Better Auth dimiliki `packages/auth`; API menyediakan adapter database dan secret melalui `@repo/auth/server`. `app.ts` memasang handler tersebut; `modules/auth/admin/guard.ts` menyediakan macro authorization authoritative untuk rute bisnis privat.
- Sesi valid tidak otomatis berarti admin. Verifikasi identitas admin tunggal yang disediakan melalui provisioning terkontrol; pendaftaran publik dinonaktifkan. Pengunjung katalog/player tidak perlu akun.
- Session memakai native `/api/auth/get-session`, role/admin plugin, dan projection whitelist sebelum cache/SSR. Web memakai reader isomorphic dan TanStack Query; guard parent menolak sebelum child loaders. Form ada di `/admin/login`; `/admin/session` lama tidak tersedia. Lifecycle operator mengikuti runbook native, tanpa writer SQL aplikasi.
- Trusted origin, CORS, cookie, dan alur permintaan web ke API ditetapkan bersama task auth. Jangan menggunakan wildcard origin untuk request berkredensial.
- Pembacaan env API dipusatkan di `config/env.ts` dan divalidasi saat startup HTTP. Worker mengikuti konfigurasi prosesnya saat dibuat; jangan membuat client dengan credential kosong.
- Rahasia tetap di env API yang diabaikan Git. Daftarkan variabel baru tanpa nilai asli di `.env.example`, [Environment](ENVIRONMENT.md), dan konfigurasi env task Turbo yang relevan.
- Script database proof auth adalah `auth:adapter:proof`, `auth:schema:proof`, `auth:runtime:proof`, `auth:admin:proof`, `auth:recovery:proof`, `auth:authorization:proof`, dan `auth:openapi:proof`. Masing-masing membatasi localhost/nama database; beberapa mereset schema, jadi jalankan satu per satu. Tidak ada script generik `test:integration`; detail env dan dampak reset ada di [Environment](ENVIRONMENT.md) serta [backlog](tasks/auth.md).
- Database, storage client, dan instance auth dibuat sekali per proses lalu diberikan ke consumer; jangan membuat pool baru setiap request. Database Bun SQL dibuat oleh bootstrap dan ditutup pada shutdown. Factory tidak membuka port atau koneksi saat diimpor.

## Database dan migrasi

- Kompatibilitas Bun SQL, `drizzle-orm/bun-sql`, dan Better Auth Drizzle adapter telah dibuktikan pada versi yang dikunci di [backlog auth](tasks/auth.md). Migrasi dan operasi auth/admin juga diuji terarah pada database test lokal. Proof membatasi operasi yang diuji; expand/contract refactor belum diterapkan pada database development dan proof tidak menyatakan production-ready.
- Query memakai parameter binding dari Drizzle atau tagged template Bun SQL. Jangan menggabungkan input pengguna menjadi SQL mentah. Identifier dinamis harus berasal dari daftar server yang tetap.
- Schema tabel berada di `src/db/schema/`; migrasi SQL dan metadata generasi berada di `apps/api/drizzle/`. Schema Better Auth dihasilkan dari konfigurasi package auth dan schema admin ditinjau sebelum migrasi.
- Jalankan `bun run --cwd apps/api db:migrate` secara eksplisit; jangan membuat/mengubah tabel otomatis saat request masuk. Migrator Bun SQL membaca env API `DATABASE_URL`, memakai path migrasi tetap dari source, dan meredaksi error agar URL tidak tercetak.
- Gunakan constraint, foreign key, unique index, dan transaksi untuk invariant persisten. Pembaruan aset dan enqueue job harus atomik. Transaksi diselesaikan sebelum I/O storage atau FFmpeg.
- Perubahan schema yang memengaruhi data perlu rencana migrasi/backfill dan bukti pada database pengujian. Jangan mengubah skema atau menghapus data dev melalui test.
- Operasi berulang seperti enqueue, upload completion, dan publish memakai identitas operasi serta pemeriksaan transisi di database; penanganan idempotensi tidak cukup disimpan pada memori proses.

## Storage, queue, dan worker

- Object storage memakai R2 atau S3 compatible. Evaluasi `Bun.S3Client` untuk operasi yang dibutuhkan; credential hanya di API. Database menyimpan metadata/key objek, bukan berkas video.
- Server menentukan key objek. URL unggah dibatasi ke admin, objek, metode, dan waktu berlaku. Sebelum enqueue, verifikasi objek yang benar, ukuran/format yang diizinkan, serta hubungan aset dengan video.
- Queue persisten berada di PostgreSQL. Klaim menggunakan transaksi singkat yang aman terhadap worker bersamaan, misalnya `FOR UPDATE SKIP LOCKED`, disertai identitas claim/lease dan retry yang terbatas.
- Heartbeat memperpanjang lease untuk pekerjaan panjang. Penyelesaian job bersyarat pada claim yang masih dimiliki; worker lama yang kehilangan lease tidak boleh menimpa hasil worker baru.
- Asumsikan job dapat diproses lebih dari sekali. Pisahkan key hasil tiap percobaan, validasi seluruh keluaran sebelum status `ready`, dan cegah publish dari hasil parsial. `LISTEN/NOTIFY` hanya sinyal tambahan; tabel tetap sumber kebenaran.
- Jalankan FFprobe/FFmpeg melalui `Bun.spawn` dengan argumen array; jangan menyisipkan judul/path pengguna ke shell command. Periksa exit code, batasi resource/waktu, dan gunakan direktori sementara milik job dengan cleanup pada sukses/gagal.
- Saat shutdown worker, hentikan klaim baru, selesaikan atau hentikan subprocess secara terkontrol, dan biarkan mekanisme lease/retry memulihkan pekerjaan yang belum selesai.
- Profil transcode, kebijakan media publik/cache, batas unggah, dan HLS disiapkan pada task development terkait. Status `published` tidak menggantikan kontrol akses object storage.

## Logging dan validasi perubahan

Log terstruktur berisi level, waktu, request/job ID, operasi, hasil, dan durasi. Jangan log password, connection string, secret, cookie sesi, header otorisasi, URL bertanda tangan, atau body unggahan. Catat alasan kegagalan worker yang aman; detail sensitif tidak masuk respons publik.

Untuk perubahan API, jalankan dari root sesuai ruang lingkup:

```sh
bun run check-types --filter=api
bun run build --filter=api
```

Setelah perubahan script/dependensi, jalankan `bun install --frozen-lockfile` dan pemeriksaan yang relevan. Husky tetap menjalankan lint web dan pemeriksaan tipe seluruh workspace sebelum commit. API belum memiliki script lint; jangan melaporkan `bun run lint` sebagai pemeriksaan lint API. Script `test` API menjalankan native Bun suite di `src`; test yang membutuhkan PostgreSQL nyata tetap berada di suite integrasi terpisah.

## Unit test API — Bun native

**Gunakan test runner native Bun (`bun test`) dan API `bun:test` untuk unit test API.** Ini mengikuti [rekomendasi pengujian Elysia](https://elysiajs.com/patterns/unit-test), yang memakai `Request`/`Response` dan `app.handle()` untuk pengujian HTTP tanpa membuka port. Runner, assertion, lifecycle test, dan mocking disediakan Bun; tidak perlu memasang Jest atau Vitest untuk unit test API. Lihat [Bun test runner](https://bun.com/docs/test).

### Penempatan dan batas pengujian

| Jenis               | Lokasi                                                                      | Yang diperiksa                                                                           |
| ------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Unit domain         | `src/modules/<module>/service.test.ts` atau `<nama>.test.ts` di dekat kode. | Aturan domain, transisi status, dan hasil gagal/berhasil dengan dependensi fake/mock.    |
| Modul HTTP          | `src/modules/<module>/index.test.ts` atau `public.test.ts`/`admin.test.ts`. | Input/output, status, otorisasi, scope plugin, dan lifecycle melalui instance modul/app. |
| Unit adapter/worker | File `*.test.ts` dekat implementasi.                                        | Orkestrasi, keputusan retry/lease, dan cleanup dengan I/O/subprocess yang diinjeksi.     |
| Integrasi           | `test/integration/*.test.ts`.                                               | Database, storage, adapter auth, atau subprocess nyata pada lingkungan test terpisah.    |

- Gunakan `describe`, `it`/`test`, dan `expect` dari `bun:test`. Nama test menjelaskan perilaku dan hasilnya, bukan hanya nama fungsi.
- Unit test bersifat deterministik: tidak membutuhkan PostgreSQL, bucket, jaringan, atau FFmpeg sungguhan. Injeksikan dependensi dan gunakan `mock`/`spyOn` dari `bun:test` bila perlu. Test yang membutuhkan I/O nyata masuk kategori integrasi.
- Buat app dan state fake baru untuk setiap test; jangan mengimpor `src/index.ts` yang memanggil `listen`. Gunakan factory modul atau `createApp` yang menerima dependensi pengujian.
- Gunakan URL lengkap seperti `http://localhost/videos` pada `new Request`. Untuk JSON, isi method, `Content-Type`, dan body. Assert status HTTP serta body/efek domain yang relevan.
- Test handler melalui `app.handle()` agar schema dan hook ikut berjalan. Jika plugin async/lazy digunakan, tunggu `app.modules` sebelum request. Jangan hanya memanggil handler langsung lalu menganggap lifecycle sudah diuji.
- Gunakan hook `beforeEach`/`afterEach` untuk setup/cleanup yang diperlukan. Pulihkan spy dengan `mock.restore()` dan reset state mock/fake yang dipakai ulang. Utamakan injeksi dependensi daripada `mock.module` yang dapat memengaruhi impor test lain; [mocking Bun](https://bun.com/docs/test/mocks) menjelaskan batasnya.
- Uji perilaku yang terkait acceptance criteria: input batas, penolakan akses, transisi ilegal, dan jaminan service tulis tidak dipanggil setelah validasi gagal. Jangan menjadikan jumlah test atau persentase coverage sebagai satu-satunya bukti kualitas.

### Contoh test HTTP dengan native Bun

Contoh mandiri berikut memperlihatkan penolakan input sebelum service tulis dipanggil. Rute ini adalah fixture test, bukan endpoint produk yang sudah dibuat:

```ts
import { describe, expect, it, mock } from "bun:test";
import { Elysia, t } from "elysia";

describe("video request validation", () => {
  it("rejects an empty title before calling the write service", async () => {
    const createVideo = mock((_input: { title: string }) => ({
      id: "video-1",
    }));
    const app = new Elysia().post("/videos", ({ body }) => createVideo(body), {
      body: t.Object({ title: t.String({ minLength: 1 }) }),
    });

    const response = await app.handle(
      new Request("http://localhost/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "" }),
      }),
    );

    expect(response.status).toBe(422);
    expect(createVideo).not.toHaveBeenCalled();
  });
});
```

Pada test modul nyata, import factory modul/service yang sedang diperiksa; jangan menyalin implementasinya menjadi fixture baru karena itu tidak membuktikan perilaku kode produk.

### Perintah dan status tooling

Setelah file test tersedia, jalankan dari root repo:

```sh
bun test ./apps/api/src
bun test ./apps/api/src/modules/videos/service.test.ts
bun test --watch ./apps/api/src
```

Script `test` API menjalankan suite native Bun di `src`; dari root gunakan `bun run --cwd apps/api test`. Proof PostgreSQL terisolasi dijalankan lewat command `auth:*:proof` yang didaftarkan di `apps/api/package.json`, bukan satu suite `test:integration` umum. Siapkan env khususnya dan periksa guard/nama database sebelum menjalankan. Root Husky menjalankan lint web dan type-check sebelum commit; konfigurasi CI hosted tidak termasuk workflow proyek saat ini.

Perubahan aturan bisnis, validasi, atau lifecycle API menyertakan test perilaku yang relevan pada task implementasinya. Perbaikan bug menyertakan regression test bila perilakunya dapat diuji. Catat command, hasil, dan bukti pada backlog modul; test tidak menggantikan `check-types`, karena Bun menjalankan TypeScript tanpa pemeriksaan tipe penuh.

Test integrasi menggunakan database/bucket khusus test dengan konfigurasi eksplisit; jangan memakai database dev `vertical_movie_app` untuk cleanup destruktif. Verifikasi batas akses, transisi status, rollback, duplicate job, lease kedaluwarsa, dan keluaran parsial sesuai risiko perubahan. Catat hasil yang benar-benar dijalankan pada task; pemeriksaan manual/produksi yang belum dilakukan tetap disebut belum diverifikasi.

Pada task Eden/lifecycle, buktikan juga bahwa:

- Rute publik tetap dapat diakses tanpa sesi; admin tanpa sesi mendapat `401` dan identitas tidak berhak mendapat `403` tanpa memanggil service tulis.
- Input tidak valid ditolak sebelum `resolve`/service; urutan hook dan scope plugin sesuai komposisi sebenarnya, termasuk penolakan awal dan exception.
- Pemeriksaan tipe consumer menerima input valid, menolak input keliru, dan mengenali status/body error yang dideklarasikan. Kode API, env, dan credential tidak masuk bundle runtime web.
- TanStack Query masuk keadaan error pada kegagalan HTTP, serta SSR tidak memakai cookie milik request lain. Perubahan kontrak API menjalankan pemeriksaan tipe API dan web.

## Alur pengerjaan modul

1. Buat backlog `docs/tasks/<module>.md` dari Template Task dan hubungkan kebutuhan produk yang relevan.
2. Tetapkan kontrak input/output, batas akses, dependensi, dan acceptance criteria sebelum implementasi.
3. Tambahkan hanya file/schema/dependensi yang diperlukan task; selesaikan satu perubahan yang dapat ditinjau.
4. Validasi perilaku dan jalankan gate yang relevan. Perbarui kontrak, Environment, dan indeks docs jika terdampak.
5. Gunakan Conventional Commits seperti `feat(api): add video drafts` dan catat bukti validasi pada task.

Perubahan standar ini harus memperbarui dokumen yang sama dan tautan pada root AGENTS/indeks docs. Keputusan produk atau operasional yang masih terbuka dituntaskan pada backlog modul sebelum digunakan sebagai kontrak tetap.
