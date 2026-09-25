import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/api-auth";
import { createShortLink, LinkError, listLinks } from "@/lib/link-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireSession();
  if ("response" in auth) return auth.response;

  const links = await listLinks();
  return NextResponse.json({ links });
}

const schema = z.object({
  longUrl: z.string().min(1).max(2048),
  customSlug: z.string().max(40).optional(),
});

export async function POST(request: Request) {
  const auth = await requireSession();
  if ("response" in auth) return auth.response;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
  }

  try {
    const link = await createShortLink(parsed.data);
    return NextResponse.json({ link });
  } catch (error) {
    if (error instanceof LinkError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
