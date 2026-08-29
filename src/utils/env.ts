import { z } from 'zod';

export const envSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  BASE_URL: z.url({ protocol: /^http(s)?$/ }).optional(),
  PG_DB_URL: z.url({ protocol: /^postgres$/ }),
  REDIS_URL: z.url({ protocol: /^redis$/ })
}).superRefine(
  (data) => {
    if (!data.BASE_URL) {
      data.BASE_URL = `http://localhost:${data.PORT}`;
    }
  }
);

export type Env = z.infer<typeof envSchema>;

export const validate = (raw: Record<string, unknown>): Env => {
  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    const lines = parsed.error.issues
      .map((i) => `  ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid configuration:\n${lines}\nCompare your .env with .env.example.`);
  }
  return parsed.data;
};
