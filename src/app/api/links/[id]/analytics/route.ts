import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { getLinkAnalytics } from "@/lib/analytics-service";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const auth = await requireSession();
  if ("response" in auth) return auth.response;

  const result = await getLinkAnalytics(params.id);
  if (!result) {
    return NextResponse.json({ error: "Link tidak ditemukan" }, { status: 404 });
  }

  return NextResponse.json(result);
}
