# PRD — URL Shortener + Analytics

| | |
|---|---|
| **Dokumen** | Product Requirements Document |
| **Produk** | URL Shortener + Analytics |
| **Versi** | 1.0 |
| **Tanggal** | 25 September 2026 |
| **Pemilik Produk** | BenyRonald77 |
| **Status** | Draft — untuk implementasi |

---

## 1. Latar Belakang & Tujuan

Proyek ini dibuat sebagai studi kasus **system design** ringkas namun
representatif: layanan pemendek URL yang setiap redirect-nya harus cepat
(butuh strategi caching), sekaligus mencatat setiap klik untuk kebutuhan
analitik (negara & jenis perangkat pengunjung).

### Tujuan Produk

1. Memendekkan URL panjang menjadi kode pendek yang mudah dibagikan.
2. Redirect dari kode pendek ke URL asli secepat mungkin, dengan lapisan
   **caching** agar tidak selalu membebani database pada link populer.
3. Mencatat setiap klik (**pelacakan klik**) beserta metadata dasarnya:
   waktu, negara pengunjung (dari header geolokasi IP), jenis perangkat, dan
   referrer.
4. Menyediakan **dashboard analytics** per link: tren klik dari waktu ke
   waktu, serta grafik distribusi per negara & per perangkat.

### Tujuan Terukur

| Metrik | Target |
|---|---|
| Redirect untuk link yang sedang populer (cache hit) | dilayani tanpa query database |
| Pencatatan klik tidak memperlambat redirect | dicatat secara asinkron/non-blocking terhadap response redirect |
| Dashboard analytics menampilkan breakdown negara & perangkat | per link, real-time dari data klik tersimpan |

## 2. Target Pengguna

| Peran | Deskripsi | Akses |
|---|---|---|
| **Admin** | Membuat & mengelola short link, melihat analytics | Login (single tenant) |
| **Pengunjung** | Mengklik short link, diarahkan ke URL asli | Publik, tanpa login |

## 3. Lingkup (Scope)

### 3.1 Dalam Lingkup (MVP)

1. **Shorten URL**: admin memasukkan URL panjang (+ opsi custom slug), sistem menghasilkan kode pendek unik.
2. **Redirect**: mengakses `/{code}` mengarahkan (HTTP 302) ke URL asli.
3. **Caching layer**: lookup kode → URL asli melalui cache in-memory (abstraksi `CacheProvider` yang bisa diganti implementasi Redis di production) sebelum jatuh ke query database, mengurangi beban DB pada link yang sering diakses.
4. **Pelacakan klik**: setiap redirect mencatat baris `Click` (waktu, negara, jenis perangkat, browser, referrer) tanpa memperlambat response redirect ke pengunjung.
5. **Dashboard manajemen link**: daftar link milik admin beserta total klik, buat link baru.
6. **Dashboard analytics per link**: grafik jumlah klik per hari, grafik distribusi klik per negara, grafik distribusi klik per jenis perangkat.

### 3.2 Luar Lingkup (fase berikutnya)

- Multi-user dengan kepemilikan link per user (MVP: single admin tenant).
- QR code generator untuk short link.
- Custom domain per link.
- Proteksi password / expiry date per link.
- Geolokasi IP presisi tinggi (database MaxMind dsb.) — MVP memakai header geolokasi dari edge/CDN bila tersedia, dengan fallback "Unknown" yang dijelaskan secara eksplisit di dokumentasi (lihat Risiko).

## 4. Alur Pengguna Utama

### 4.1 Alur — Membuat Short Link

1. Admin login ke dashboard.
2. Memasukkan URL panjang, opsional custom slug.
3. Sistem memvalidasi URL & keunikan slug, menyimpan ke database, menulis entri ke cache.
4. Dashboard menampilkan short link yang siap dibagikan.

### 4.2 Alur — Pengunjung Mengklik Short Link

1. Pengunjung membuka `https://domain/{code}`.
2. Sistem mencari `code` di cache; bila cache miss, query database lalu isi cache.
3. Sistem merespons redirect (302) ke URL asli **tanpa menunggu** pencatatan klik selesai (fire-and-forget / non-blocking).
4. Secara paralel, sistem mencatat `Click`: timestamp, negara (dari header edge geolokasi bila ada), jenis perangkat & browser (parsing User-Agent), referrer, dan menambah counter klik link.

### 4.3 Alur — Melihat Analytics

1. Admin membuka halaman detail sebuah link.
2. Dashboard menampilkan: total klik, grafik klik harian (30 hari terakhir), pie/bar chart distribusi negara, pie/bar chart distribusi perangkat.

## 5. Kebutuhan Fungsional

| ID | Kebutuhan | Prioritas |
|---|---|---|
| FR-1 | Sistem membuat kode pendek unik (auto-generate atau custom slug tervalidasi) untuk setiap URL panjang | Must |
| FR-2 | Redirect `/{code}` mengarahkan ke URL asli dengan status HTTP 302 | Must |
| FR-3 | Lookup kode→URL memakai cache sebelum ke database; cache diisi otomatis saat link baru dibuat maupun saat cache-miss | Must |
| FR-4 | Setiap redirect mencatat data klik (waktu, negara, perangkat, browser, referrer) tanpa menunda response ke pengunjung | Must |
| FR-5 | Dashboard menampilkan daftar link admin beserta total klik masing-masing | Must |
| FR-6 | Halaman detail link menampilkan grafik tren klik harian | Must |
| FR-7 | Halaman detail link menampilkan distribusi klik per negara & per jenis perangkat | Must |
| FR-8 | Slug custom yang bentrok dengan slug lain ditolak dengan pesan jelas | Should |

## 6. Kebutuhan Non-Fungsional

| Kategori | Kebutuhan |
|---|---|
| **Performa** | Redirect untuk link yang ada di cache tidak melakukan query database |
| **Skalabilitas** | Cache diabstraksi lewat interface (`CacheProvider`) sehingga implementasi in-memory (MVP/single-instance) bisa diganti Redis (multi-instance/production) tanpa mengubah logika redirect |
| **Keandalan** | Kegagalan pencatatan klik tidak boleh membuat redirect gagal — pencatatan bersifat best-effort |
| **Keamanan** | Endpoint manajemen link (buat/lihat analytics) memerlukan autentikasi; endpoint redirect bersifat publik by design |

## 7. Arsitektur Teknis (Ringkasan)

- **Framework**: Next.js (TypeScript, App Router) — frontend, API routes, dan route handler redirect dalam satu codebase.
- **Database**: PostgreSQL via Prisma ORM (SQLite untuk development lokal).
- **Caching**: abstraksi `CacheProvider` (`get`, `set`, `del`) dengan implementasi default in-memory (Map + TTL + batas ukuran/LRU sederhana), siap diganti implementasi Redis (`ioredis`) di production lewat environment variable, tanpa mengubah kode pemanggil.
- **Analytics**: agregasi query Prisma (`groupBy`) atas tabel `Click`, divisualisasikan dengan Recharts.
- **Device/browser detection**: parsing User-Agent ringan tanpa dependensi berat (regex-based).
- **Geolokasi negara**: dibaca dari header yang disuntikkan edge/CDN (mis. `x-vercel-ip-country`, `cf-ipcountry`) bila platform deployment menyediakannya; bila tidak ada, dicatat sebagai `"Unknown"`.

### 7.1 Entitas Data Utama

- `AdminUser` — akun admin.
- `Link` — kode pendek (unik), URL asli, jumlah klik (denormalized counter), waktu dibuat.
- `Click` — link terkait, waktu, negara, jenis perangkat, browser, referrer.

## 8. Kriteria Penerimaan — MVP

- [ ] Admin bisa membuat short link (auto/kustom) dan link tersebut berfungsi redirect ke URL asli.
- [ ] Redirect pada link yang sama berulang kali tidak selalu memicu query database (terverifikasi lewat cache hit).
- [ ] Setiap klik tercatat dengan metadata negara/perangkat/waktu yang bisa diverifikasi di database.
- [ ] Halaman analytics menampilkan grafik tren klik harian serta distribusi negara & perangkat yang sesuai data yang tercatat.
- [ ] Slug custom yang sudah dipakai ditolak dengan pesan error yang jelas.

## 9. Roadmap Implementasi

| # | Milestone |
|---|---|
| 1 | PRD |
| 2 | Scaffold Next.js + Prisma |
| 3 | Schema database & seed |
| 4 | Autentikasi admin |
| 5 | API shorten link + layer caching |
| 6 | Redirect handler + pelacakan klik |
| 7 | Dashboard manajemen link |
| 8 | Halaman analytics (grafik negara/perangkat) |
| 9 | README & dokumentasi deployment |

## 10. Risiko & Mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Header geolokasi IP tidak tersedia di semua platform hosting (hanya disuntikkan oleh edge/CDN tertentu) | Negara pengunjung tercatat "Unknown" | Didokumentasikan secara eksplisit di README; arsitektur tetap memungkinkan penambahan penyedia geolokasi IP pihak ketiga di kemudian hari tanpa mengubah skema data |
| Cache in-memory tidak terbagi antar instance saat deployment multi-instance | Cache-hit ratio menurun pada skala besar | Abstraksi `CacheProvider` memungkinkan swap ke Redis (shared cache) tanpa mengubah logika redirect |
| Pencatatan klik gagal (mis. database sedang sibuk) | Data analytics tidak lengkap untuk klik tersebut | Pencatatan bersifat best-effort/non-blocking — kegagalannya di-log, tidak menggagalkan redirect ke pengunjung |
