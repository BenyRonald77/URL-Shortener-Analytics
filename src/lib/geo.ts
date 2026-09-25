/**
 * Negara pengunjung dibaca dari header geolokasi IP yang disuntikkan oleh
 * edge/CDN (Vercel, Cloudflare, dsb). Aplikasi ini TIDAK memanggil layanan
 * geolokasi IP pihak ketiga sendiri — bila platform hosting tidak
 * menyuntikkan header tersebut, negara tercatat "Unknown" (lihat catatan
 * risiko di docs/PRD.md).
 */
export function detectCountry(request: Request): string {
  const headers = request.headers;
  const candidates = [
    headers.get("x-vercel-ip-country"),
    headers.get("cf-ipcountry"),
    headers.get("x-country-code"),
  ];

  const found = candidates.find((value) => value && value.toUpperCase() !== "XX");
  return found ? found.toUpperCase() : "Unknown";
}
