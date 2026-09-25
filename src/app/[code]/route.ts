import { NextResponse } from "next/server";
import { recordClick } from "@/lib/click-service";
import { detectCountry } from "@/lib/geo";
import { resolveLinkByCode } from "@/lib/link-service";
import { detectBrowser, detectDevice } from "@/lib/user-agent";

export const dynamic = "force-dynamic";

/**
 * Handler redirect publik `/{code}`. Next.js App Router mengutamakan route
 * literal (mis. /login, /dashboard, /api/*) sebelum segmen dinamis ini,
 * jadi tidak ada konflik dengan halaman lain di aplikasi.
 */
export async function GET(request: Request, { params }: { params: { code: string } }) {
  const resolved = await resolveLinkByCode(params.code);

  if (!resolved) {
    return new NextResponse("Short link tidak ditemukan", { status: 404 });
  }

  const userAgent = request.headers.get("user-agent") || "";
  const referrer = request.headers.get("referer");

  // Fire-and-forget: pencatatan klik best-effort, tidak boleh menunda
  // response redirect ke pengunjung (FR-4). Kegagalan pencatatan klik
  // di-log saja, bukan menggagalkan redirect.
  recordClick({
    linkId: resolved.id,
    country: detectCountry(request),
    device: detectDevice(userAgent),
    browser: detectBrowser(userAgent),
    referrer,
  }).catch((error) => {
    console.error("Gagal mencatat klik:", error);
  });

  return NextResponse.redirect(resolved.longUrl);
}
