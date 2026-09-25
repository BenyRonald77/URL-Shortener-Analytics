import { customAlphabet } from "nanoid";
import { prisma } from "@/lib/prisma";
import { getCacheProvider, LINK_CACHE_PREFIX } from "@/lib/cache";

// Hindari karakter ambigu (0/O, 1/l/I) supaya kode pendek mudah dibaca/diketik ulang.
const ALPHABET = "23456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
const CODE_LENGTH = Number(process.env.SHORT_CODE_LENGTH ?? 7);
const generateCode = customAlphabet(ALPHABET, CODE_LENGTH);

export class LinkError extends Error {}

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isValidSlug(value: string): boolean {
  return /^[a-zA-Z0-9-_]{3,40}$/.test(value);
}

async function generateUniqueCode(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = generateCode();
    const existing = await prisma.link.findUnique({ where: { code: candidate } });
    if (!existing) return candidate;
  }
  throw new LinkError("Gagal membuat kode unik, coba lagi");
}

export async function createShortLink(params: { longUrl: string; customSlug?: string }) {
  if (!isValidUrl(params.longUrl)) {
    throw new LinkError("URL tidak valid (harus diawali http:// atau https://)");
  }

  let code = params.customSlug?.trim();
  if (code) {
    if (!isValidSlug(code)) {
      throw new LinkError("Slug hanya boleh huruf, angka, - dan _, panjang 3-40 karakter");
    }
    const existing = await prisma.link.findUnique({ where: { code } });
    if (existing) throw new LinkError("Slug ini sudah digunakan link lain");
  } else {
    code = await generateUniqueCode();
  }

  const link = await prisma.link.create({ data: { code, longUrl: params.longUrl } });

  const cache = await getCacheProvider();
  await cache.set(`${LINK_CACHE_PREFIX}${link.code}`, JSON.stringify({ id: link.id, longUrl: link.longUrl }));

  return link;
}

export async function listLinks() {
  return prisma.link.findMany({ orderBy: { createdAt: "desc" } });
}

export async function getLink(code: string) {
  return prisma.link.findUnique({ where: { code } });
}

type CachedLink = { id: string; longUrl: string };

/**
 * Lookup kode → URL asli lewat cache terlebih dahulu; hanya query database
 * saat cache-miss, lalu mengisi cache untuk request berikutnya. Ini yang
 * membuat redirect pada link populer tidak selalu membebani database.
 */
export async function resolveLinkByCode(
  code: string,
): Promise<(CachedLink & { fromCache: boolean }) | null> {
  const cache = await getCacheProvider();
  const cacheKey = `${LINK_CACHE_PREFIX}${code}`;

  const cached = await cache.get(cacheKey);
  if (cached) {
    try {
      const parsed = JSON.parse(cached) as CachedLink;
      return { ...parsed, fromCache: true };
    } catch {
      // cache berisi data korup — abaikan, lanjut ke database di bawah
    }
  }

  const link = await prisma.link.findUnique({
    where: { code },
    select: { id: true, longUrl: true },
  });
  if (!link) return null;

  await cache.set(cacheKey, JSON.stringify({ id: link.id, longUrl: link.longUrl }));
  return { id: link.id, longUrl: link.longUrl, fromCache: false };
}
