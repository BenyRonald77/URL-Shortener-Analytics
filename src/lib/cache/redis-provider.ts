import Redis from "ioredis";
import type { CacheProvider } from "./types";

/**
 * Implementasi cache berbasis Redis untuk deployment multi-instance, di mana
 * cache in-memory per proses tidak lagi mencukupi karena tidak terbagi
 * antar instance. Diaktifkan lewat CACHE_PROVIDER=redis + REDIS_URL.
 */
export class RedisCacheProvider implements CacheProvider {
  private client: Redis;

  constructor(
    url: string,
    private readonly defaultTtlSeconds: number = 3600,
  ) {
    this.client = new Redis(url);
  }

  async get(key: string): Promise<string | undefined> {
    const value = await this.client.get(key);
    return value ?? undefined;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    await this.client.set(key, value, "EX", ttlSeconds ?? this.defaultTtlSeconds);
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }
}
