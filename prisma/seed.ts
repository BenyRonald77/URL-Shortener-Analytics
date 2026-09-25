import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DeviceType } from "../src/lib/constants";

const prisma = new PrismaClient();

const COUNTRIES = ["ID", "SG", "MY", "US", "IN"];
const DEVICES: (typeof DeviceType)[keyof typeof DeviceType][] = [
  DeviceType.MOBILE,
  DeviceType.MOBILE,
  DeviceType.DESKTOP,
  DeviceType.DESKTOP,
  DeviceType.TABLET,
];
const BROWSERS = ["Chrome", "Safari", "Firefox", "Edge"];
const REFERRERS = ["https://twitter.com/", "https://instagram.com/", null, null];

function daysAgo(n: number, hour: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - n);
  date.setHours(hour, Math.floor(Math.random() * 60), 0, 0);
  return date;
}

async function main() {
  const passwordHash = await bcrypt.hash("admin123", 10);
  await prisma.adminUser.upsert({
    where: { email: "admin@short.test" },
    update: {},
    create: { name: "Admin", email: "admin@short.test", passwordHash },
  });

  const linkDefs = [
    { code: "promo-agustus", longUrl: "https://example.com/promo/agustus-ceria" },
    { code: "docs-produk", longUrl: "https://example.com/docs/panduan-produk" },
  ];

  for (const def of linkDefs) {
    const link = await prisma.link.upsert({
      where: { code: def.code },
      update: {},
      create: { code: def.code, longUrl: def.longUrl },
    });

    const existingClicks = await prisma.click.count({ where: { linkId: link.id } });
    if (existingClicks > 0) continue;

    let total = 0;
    for (let day = 13; day >= 0; day--) {
      const clicksToday = 2 + ((day * 3) % 6); // pola deterministik, bukan random murni
      for (let i = 0; i < clicksToday; i++) {
        await prisma.click.create({
          data: {
            linkId: link.id,
            country: COUNTRIES[(day + i) % COUNTRIES.length],
            device: DEVICES[(day + i) % DEVICES.length],
            browser: BROWSERS[(day + i) % BROWSERS.length],
            referrer: REFERRERS[(day + i) % REFERRERS.length],
            createdAt: daysAgo(day, 8 + (i % 12)),
          },
        });
        total += 1;
      }
    }

    await prisma.link.update({ where: { id: link.id }, data: { clickCount: total } });
  }

  console.log("Seed selesai:");
  console.log("- Login admin: admin@short.test / admin123");
  console.log(`- ${linkDefs.length} link contoh dengan 14 hari histori klik`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
