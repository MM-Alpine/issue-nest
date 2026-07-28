import 'dotenv/config';
import { z } from 'zod';

/**
 * Environment contract. Parsed once at import time so the process fails fast and
 * loudly instead of throwing deep inside a request. See docs/02 §13.
 */
const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  TEST_DATABASE_URL: z.string().optional(),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('1d'),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
});

export type Env = z.infer<typeof EnvSchema>;

function loadEnv(): Env {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const lines = parsed.error.issues.map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`);
    console.error(
      `Invalid environment configuration:\n${lines.join(
        '\n',
      )}\n\nCopy the example env files from the README and fill them in.`,
    );
    process.exit(1);
  }
  return parsed.data;
}

export const env = loadEnv();

export const isTest = env.NODE_ENV === 'test';
export const isProduction = env.NODE_ENV === 'production';
