import type { CacheProvider } from "./types";

type Entry = { value: string; expiresAt: number };

/**
 * Cache in-memory sederhana dengan TTL dan batas ukuran (eviction LRU
 * berbasis urutan insersi Map). Cocok untuk development atau deployment
 * single-instance; tidak terbagi antar instance saat multi-instance
 * (lihat RedisCacheProvider untuk kasus itu).
 */
export class MemoryCacheProvider implements CacheProvider {
  private store = new Map<string, Entry>();

  constructor(
    private readonly maxEntries: number = 5000,
    private readonly defaultTtlSeconds: number = 3600,
  ) {}

  async get(key: string): Promise<string | undefined> {
    const entry = this.store.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }

    // Sentuh entri ini agar dianggap paling baru dipakai (LRU).
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (!this.store.has(key) && this.store.size >= this.maxEntries) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey !== undefined) this.store.delete(oldestKey);
    }

    const ttl = ttlSeconds ?? this.defaultTtlSeconds;
    this.store.set(key, { value, expiresAt: Date.now() + ttl * 1000 });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }
}
