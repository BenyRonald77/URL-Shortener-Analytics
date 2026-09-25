import { prisma } from "@/lib/prisma";
import type { DeviceType } from "@/lib/constants";

export async function recordClick(params: {
  linkId: string;
  country: string;
  device: DeviceType;
  browser: string;
  referrer?: string | null;
}) {
  await prisma.$transaction([
    prisma.click.create({
      data: {
        linkId: params.linkId,
        country: params.country,
        device: params.device,
        browser: params.browser,
        referrer: params.referrer ?? undefined,
      },
    }),
    prisma.link.update({
      where: { id: params.linkId },
      data: { clickCount: { increment: 1 } },
    }),
  ]);
}
