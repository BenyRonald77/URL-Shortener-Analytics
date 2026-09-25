# URL Shortener + Analytics

Layanan pemendek URL dengan studi kasus **system design** ringkas: lapisan
**caching** untuk redirect cepat, **pelacakan klik** non-blocking, dan
**dashboard analytics** (tren klik harian, distribusi per negara & perangkat).

Lihat dokumen perencanaan lengkap di [`docs/PRD.md`](./docs/PRD.md).

## Fitur Utama

- **Shorten URL** — buat kode pendek otomatis atau custom slug.
- **Redirect cepat dengan caching** — lookup kode→URL lewat lapisan cache (`CacheProvider`) sebelum jatuh ke database; default in-memory (cukup untuk dev/single-instance), siap diganti Redis untuk multi-instance tanpa mengubah logika redirect.
- **Pelacakan klik non-blocking** — setiap redirect mencatat waktu, negara (dari header geolokasi edge/CDN), jenis perangkat & browser (parsing User-Agent), dan referrer — tanpa menunda response ke pengunjung.
- **Dashboard manajemen link** — daftar link beserta jumlah klik, salin short link sekali klik.
- **Analytics per link** — grafik tren klik harian, distribusi negara, dan distribusi perangkat (Recharts).

## Arsitektur Singkat

```
Pengunjung → GET /{code} → cache lookup (hit/miss) → 302 redirect
                                 │
                                 └─→ (async, tidak menunda redirect) catat Click ke DB
```

- **Caching**: `src/lib/cache/` — interface `CacheProvider` + implementasi `MemoryCacheProvider` (default) & `RedisCacheProvider` (opsional, aktif via env). Lihat bagian [Caching](#caching) di bawah.
- **Redirect & click tracking**: `src/app/[code]/route.ts` — route dinamis di root yang hanya "menyerap" path yang tidak cocok dengan route literal lain (`/login`, `/dashboard`, `/api/*`, dst).
- **Analytics**: agregasi klik (per hari/negara/perangkat) dihitung di `src/lib/analytics-service.ts`.

## Menjalankan Secara Lokal

```bash
npm install
cp .env.example .env
npm run prisma:migrate   # migrasi + seed (2 link contoh, 14 hari histori klik)
npm run dev
```

Buka `http://localhost:3000/login` — akun demo: `admin@short.test` / `admin123`.

Coba short link hasil seed: `http://localhost:3000/promo-agustus` (redirect
sekaligus mencatat klik ke database).

## Caching

Diatur lewat `CACHE_PROVIDER` di `.env`:

- `memory` (default) — cache in-memory per proses. Cukup untuk development
  atau deployment single-instance. **Tidak** terbagi antar instance saat
  aplikasi di-scale horizontal.
- `redis` — cache dibagikan lewat Redis (`REDIS_URL`), diperlukan saat
  aplikasi berjalan di lebih dari satu instance agar cache-hit tetap efektif.
  Implementasi ada di [`src/lib/cache/redis-provider.ts`](./src/lib/cache/redis-provider.ts),
  memakai `ioredis`.

Menambah provider baru (mis. Memcached) cukup dengan membuat class yang
mengimplementasikan interface `CacheProvider` (`get`, `set`, `del`) di
`src/lib/cache/`, tanpa mengubah kode redirect maupun API shorten.

## Pelacakan Klik & Geolokasi

- **Perangkat & browser**: diklasifikasikan dari header `User-Agent` (parsing
  ringan berbasis regex di `src/lib/user-agent.ts`) menjadi
  desktop/mobile/tablet/bot.
- **Negara**: dibaca dari header geolokasi IP yang disuntikkan platform
  edge/CDN (`x-vercel-ip-country` di Vercel, `cf-ipcountry` di Cloudflare).
  Aplikasi ini **tidak** memanggil layanan geolokasi IP pihak ketiga sendiri
  — bila di-deploy di platform yang tidak menyuntikkan header tersebut
  (mis. server biasa tanpa CDN di depannya), negara akan tercatat
  `"Unknown"`. Untuk akurasi penuh di semua environment, tambahkan lookup ke
  database geolokasi IP (mis. MaxMind GeoLite2) sebagai langkah lanjutan.
- Pencatatan klik bersifat **best-effort**: kegagalan penulisan (mis. DB
  sedang sibuk) di-log ke console, tidak pernah menggagalkan redirect ke
  pengunjung.

## Struktur Proyek

```
docs/PRD.md                          Dokumen PRD
prisma/schema.prisma                 Skema database (link, klik, admin)
prisma/seed.ts                        Data contoh + histori klik 14 hari
src/lib/cache/                        Abstraksi caching (memory & redis provider)
src/lib/link-service.ts               Logika shorten link + lookup via cache
src/lib/click-service.ts              Pencatatan klik
src/lib/user-agent.ts, geo.ts         Parsing device/browser & negara
src/lib/analytics-service.ts          Agregasi data untuk grafik
src/app/[code]/route.ts               Redirect handler publik
src/app/dashboard, src/app/links/[id] Dashboard & halaman analytics
src/app/api                           API routes
```

## Skrip yang Tersedia

| Skrip | Keterangan |
|---|---|
| `npm run dev` | Jalankan development |
| `npm run build` / `npm start` | Build & jalankan production |
| `npm run typecheck` | Cek tipe TypeScript |
| `npm run prisma:migrate` | Migrasi database (development) |
| `npm run prisma:seed` | Jalankan seed data contoh |

## Deployment

1. Set `DATABASE_URL` (disarankan PostgreSQL untuk production — ubah
   `provider` di `prisma/schema.prisma`), `JWT_SECRET`, `APP_BASE_URL`.
2. Untuk deployment **multi-instance**, set `CACHE_PROVIDER=redis` dan
   `REDIS_URL` agar cache konsisten di semua instance.
3. Deploy di belakang CDN/edge yang menyuntikkan header geolokasi IP (mis.
   Vercel atau Cloudflare) agar data negara pada analytics akurat.
4. Build: `npm run build`, jalankan: `npm start`.

## Catatan Keamanan

- Password admin di-hash dengan bcrypt.
- Endpoint manajemen link & analytics memerlukan sesi login (JWT cookie httpOnly); endpoint redirect `/{code}` memang publik by design.
- Custom slug divalidasi format (`[a-zA-Z0-9-_]{3,40}`) dan keunikannya sebelum disimpan.
