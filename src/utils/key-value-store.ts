import { createClient } from "redis";

const redisClient = createClient({ url: process.env.REDIS_URL ?? 'redis://localhost:6379' });

class MemoryStore {
  private content: Record<string, { value: string, expiresAt: number }> = {};

  async set(key: string, value: string, { NX, EX }: { NX?: boolean, EX?: number }) {
    const contentValue = { value, expiresAt: EX === undefined ? Infinity : Date.now() + EX * 1000 };

    if (NX && this.content[key]) {
      return null;
    }

    this.content[key] = contentValue;

    return 'OK';
  }

  async get(key: string) {
    const content = this.content[key];

    if (content === undefined) {
      return null;
    }

    if (content.expiresAt < Date.now()) {
      delete this.content[key];
      return null;
    }

    return content.value;
  }

  async del(key: string) {
    delete this.content[key];
  }
}

const storePromise = redisClient.connect().catch((e) => {
  console.error('Failed to connect to Redis, using memory store');
  console.error(e);

  return new MemoryStore();
});

export async function claimTmpKey(key: string, data: any, ttlSeconds: number) {
  const store = await storePromise;
  const res = await store.set(key, JSON.stringify(data), { NX: true, EX: ttlSeconds });

  return res === 'OK';
}

export async function finishTmpKey(key: string, data: any, ttlSeconds: number) {
  const store = await storePromise;
  await store.set(key, JSON.stringify(data), { EX: ttlSeconds });
}

export async function getPlainValue(key: string) {
  const store = await storePromise;
  const raw = await store.get(key);
  return raw ? JSON.parse(raw) : null;
}
