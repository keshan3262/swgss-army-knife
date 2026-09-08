import { z } from 'zod';
import { envSchema } from '../config/env.schema';

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
