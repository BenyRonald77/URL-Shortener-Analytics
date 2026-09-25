/**
 * Abstraksi cache agar logika redirect tidak terikat ke implementasi
 * tertentu. MVP memakai in-memory (cukup untuk single-instance/dev), siap
 * diganti Redis di production (multi-instance) hanya lewat environment
 * variable, tanpa mengubah kode pemanggil.
 */
export interface CacheProvider {
  get(key: string): Promise<string | undefined>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
}
