import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resetEnvForTests } from '@/lib/env';
import { generateText, LlmClientError } from '@/lib/llm/client';

const originalEnv = { ...process.env };

function createJsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

function getRequestPayload(fetchImpl: ReturnType<typeof vi.fn>, callIndex = 0) {
  const request = fetchImpl.mock.calls[callIndex]?.[1];
  return request && typeof request.body === 'string'
    ? JSON.parse(request.body)
    : null;
}

describe('generateText', () => {
  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
      YOUTUBE_API_KEY: 'youtube-key',
      ZAI_API_KEY: 'zai-key',
      ZAI_BASE_URL: 'https://api.z.ai/api/coding/paas/v4',
      ZAI_MODEL: 'glm-5-turbo',
    };
    resetEnvForTests();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    resetEnvForTests();
  });

  it('returns assistant content from a successful response', async () => {
    const fetchImpl = vi.fn(async () =>
      createJsonResponse({
        id: 'resp_123',
        model: 'glm-5-turbo',
        choices: [
          {
            message: {
              content: '```json\n{"title":"김치찌개"}\n```',
            },
          },
        ],
      }),
    );

    const result = await generateText(
      [{ role: 'user', content: 'extract recipe' }],
      { fetchImpl },
    );

    expect(result.attempt).toBe(1);
    expect(result.model).toBe('glm-5-turbo');
    expect(result.content).toContain('김치찌개');
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.z.ai/api/coding/paas/v4/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Authorization: 'Bearer zai-key',
        }),
      }),
    );
    expect(getRequestPayload(fetchImpl)).toEqual({
      model: 'glm-5-turbo',
      temperature: 0.1,
      messages: [{ role: 'user', content: 'extract recipe' }],
      response_format: { type: 'json_object' },
    });
  });

  it('retries once on a 429 response', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        createJsonResponse({ error: { message: 'rate limited' } }, 429),
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          model: 'glm-5-turbo',
          choices: [
            {
              message: {
                content: '{"title":"된장찌개"}',
              },
            },
          ],
        }),
      );

    const result = await generateText(
      [{ role: 'user', content: 'extract recipe' }],
      { fetchImpl },
    );

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(result.attempt).toBe(2);
    expect(getRequestPayload(fetchImpl, 0)).toMatchObject({
      response_format: { type: 'json_object' },
    });
    expect(getRequestPayload(fetchImpl, 1)).toMatchObject({
      response_format: { type: 'json_object' },
    });
  });

  it('fails when the api key is missing', async () => {
    delete process.env.ZAI_API_KEY;
    resetEnvForTests();

    await expect(
      generateText([{ role: 'user', content: 'extract recipe' }]),
    ).rejects.toBeInstanceOf(LlmClientError);
  });
});
