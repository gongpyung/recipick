import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),
  YOUTUBE_API_KEY: z.string().min(1, 'YOUTUBE_API_KEY is required'),
  ZAI_API_KEY: z.string().min(1).optional(),
  ZAI_BASE_URL: z
    .string()
    .url('ZAI_BASE_URL must be a valid URL')
    .default('https://api.z.ai/api/coding/paas/v4'),
  ZAI_MODEL: z.string().min(1).optional(),
});

export type AppEnv = z.infer<typeof envSchema>;

let cachedEnv: AppEnv | null = null;

function formatIssues(error: z.ZodError) {
  return error.issues.map((issue) => {
    const path = issue.path.join('.') || 'env';
    return `- ${path}: ${issue.message}`;
  });
}

export function readEnv(): AppEnv {
  if (cachedEnv) {
    return cachedEnv;
  }

  const result = envSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY,
    ZAI_API_KEY: process.env.ZAI_API_KEY,
    ZAI_BASE_URL: process.env.ZAI_BASE_URL,
    ZAI_MODEL: process.env.ZAI_MODEL,
  });

  if (!result.success) {
    throw new Error(
      `Invalid environment variables:\n${formatIssues(result.error).join('\n')}`,
    );
  }

  cachedEnv = result.data;
  return cachedEnv;
}

export function resetEnvForTests() {
  cachedEnv = null;
}
