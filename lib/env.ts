import { z } from 'zod/v4';

/**
 * Server-side environment validation.
 * Imported by lib/mongodb.ts so it runs on first DB connection (effectively app startup).
 * Fail-fast: if any required var is missing, the app crashes immediately with a clear message.
 */

const envSchema = z.object({
  // Database
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),

  // Auth
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  ADMIN_JWT_SECRET: z.string().min(32, 'ADMIN_JWT_SECRET is required and must be at least 32 characters (must differ from JWT_SECRET)'),

  // LLM providers (at least one must be set)
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is required'),

  // Admin
  ADMIN_PASSWORD: z.string().min(8, 'ADMIN_PASSWORD must be at least 8 characters'),
});

type Env = z.infer<typeof envSchema>;

let _env: Env | null = null;

export function validateEnv(): Env {
  if (_env) return _env;

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = z.prettifyError(result.error);
    console.error('\n❌ Environment validation failed:\n');
    console.error(formatted);
    console.error('\nFix the above issues in your .env.local file and restart.\n');
    throw new Error('Missing or invalid environment variables. See console output above.');
  }

  _env = result.data;
  return _env;
}

export const env = new Proxy({} as Env, {
  get(_, key: string) {
    const validated = validateEnv();
    return validated[key as keyof Env];
  },
});
