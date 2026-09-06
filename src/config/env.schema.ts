import { z } from 'zod';

export const envSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  BASE_URL: z.url({ protocol: /^http(s)?$/ }).optional(),
  DB_URL: z.string().regex(/^postgresql:\/\/[^:@]+:@[^:]+:\d+\/[^?]+(\?.*)?$/),
  REDIS_URL: z.url({ protocol: /^redis$/ })
}).superRefine(
  (data) => {
    if (!data.BASE_URL) {
      data.BASE_URL = `http://localhost:${data.PORT}`;
    }
  }
);
