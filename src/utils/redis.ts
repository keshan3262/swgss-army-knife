import { createClient } from "redis";

const redisClient = createClient({ url: 'redis://localhost:6379' });

const connectToRedisPromise = redisClient.connect().catch(error => {
  console.error('Error connecting to Redis', error);
  process.exit(1);
});

export async function claimTmpKey(key: string, data: any, ttlSeconds: number) {
  const client = await connectToRedisPromise;
  const res = await client.set(key, JSON.stringify(data), { NX: true, EX: ttlSeconds });

  return res === 'OK';
}

export async function finishTmpKey(key: string, data: any, ttlSeconds: number) {
  const client = await connectToRedisPromise;
  await client.set(key, JSON.stringify(data), { EX: ttlSeconds });
}

export async function getPlainValue(key: string) {
  const client = await connectToRedisPromise;
  const raw = await client.get(key);
  return raw ? JSON.parse(raw) : null;
}
