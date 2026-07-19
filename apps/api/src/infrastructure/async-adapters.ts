export interface CacheAdapter {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface QueueAdapter {
  enqueue<T>(topic: string, payload: T, options?: { idempotencyKey?: string }): Promise<void>;
}

export class InMemoryCacheAdapter implements CacheAdapter {
  private readonly values = new Map<string, { value: unknown; expiresAt: number }>();
  async get<T>(key: string): Promise<T | null> {
    const item = this.values.get(key);
    if (!item || item.expiresAt < Date.now()) return null;
    return item.value as T;
  }
  async set<T>(key: string, value: T, ttlSeconds: number) {
    this.values.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }
  async delete(key: string) {
    this.values.delete(key);
  }
}

export class InlineQueueAdapter implements QueueAdapter {
  async enqueue<T>(_topic: string, _payload: T): Promise<void> {
    // The modular monolith performs first-version work inline. Redis can replace this adapter later.
  }
}
