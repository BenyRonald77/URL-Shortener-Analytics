import type { CacheProvider } from "./types";
import { MemoryCacheProvider } from "./memory-provider";

export type { CacheProvider } from "./types";

export const LINK_CACHE_PREFIX = "link:";

let cachedProvider: CacheProvider | undefined;

/**
 * Factory singleton. Import RedisCacheProvider dilakukan secara dinamis
 * (lazy) agar mode "memory" (default) tidak wajib menyiapkan koneksi Redis
 * sama sekali.
 */
export async function getCacheProvider(): Promise<CacheProvider> {
  if (cachedProvider) return cachedProvider;

  const kind = (process.env.CACHE_PROVIDER || "memory").toLowerCase();
  const ttl = Number(process.env.CACHE_TTL_SECONDS ?? 3600);

  if (kind === "redis" && process.env.REDIS_URL) {
    const { RedisCacheProvider } = await import("./redis-provider");
    cachedProvider = new RedisCacheProvider(process.env.REDIS_URL, ttl);
  } else {
    const maxEntries = Number(process.env.CACHE_MAX_ENTRIES ?? 5000);
    cachedProvider = new MemoryCacheProvider(maxEntries, ttl);
  }

  return cachedProvider;
}
