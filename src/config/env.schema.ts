import { z } from 'zod';

export const envSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  BASE_URL: z.url({ protocol: /^http(s)?$/ }).optional(),
  PG_DB_HOST: z.string().min(1),
  PG_DB_PORT: z.coerce.number().int().min(1).max(65535).default(5432),
  REDIS_URL: z.url({ protocol: /^redis$/ })
}).superRefine(
  (data) => {
    if (!data.BASE_URL) {
      data.BASE_URL = `http://localhost:${data.PORT}`;
    }
  }
);
