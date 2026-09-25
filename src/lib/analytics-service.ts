import { prisma } from "@/lib/prisma";

export async function getLinkAnalytics(linkId: string) {
  const link = await prisma.link.findUnique({ where: { id: linkId } });
  if (!link) return null;

  const clicks = await prisma.click.findMany({
    where: { linkId },
    select: { country: true, device: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  const byDate = new Map<string, number>();
  const byCountry = new Map<string, number>();
  const byDevice = new Map<string, number>();

  for (const click of clicks) {
    const dateKey = click.createdAt.toISOString().slice(0, 10);
    byDate.set(dateKey, (byDate.get(dateKey) ?? 0) + 1);
    byCountry.set(click.country, (byCountry.get(click.country) ?? 0) + 1);
    byDevice.set(click.device, (byDevice.get(click.device) ?? 0) + 1);
  }

  return {
    link: {
      id: link.id,
      code: link.code,
      longUrl: link.longUrl,
      clickCount: link.clickCount,
      createdAt: link.createdAt,
    },
    dailyClicks: Array.from(byDate.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    byCountry: Array.from(byCountry.entries())
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count),
    byDevice: Array.from(byDevice.entries())
      .map(([device, count]) => ({ device, count }))
      .sort((a, b) => b.count - a.count),
    totalClicks: clicks.length,
  };
}
