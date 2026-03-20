import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const originalEnv = { ...process.env };

async function loadEnvModule() {
  vi.resetModules();
  return import('@/lib/env');
}

describe('env', () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('parses required env values and applies defaults', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    process.env.YOUTUBE_API_KEY = 'youtube-key';
    delete process.env.ZAI_BASE_URL;

    const { readEnv } = await loadEnvModule();
    const env = readEnv();

    expect(env.ZAI_BASE_URL).toBe('https://api.z.ai/api/coding/paas/v4');
  });

  it('throws a readable error when required env values are missing', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.YOUTUBE_API_KEY;

    const { readEnv } = await loadEnvModule();

    expect(() => readEnv()).toThrow(/Invalid environment variables:/);
  });
});
