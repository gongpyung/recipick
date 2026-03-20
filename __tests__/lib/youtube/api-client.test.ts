import { beforeEach, describe, expect, it, vi } from 'vitest';

const originalEnv = { ...process.env };
const fetchTranscriptMock = vi.fn();

class MockYoutubeTranscriptDisabledError extends Error {}
class MockYoutubeTranscriptNotAvailableError extends Error {}
class MockYoutubeTranscriptNotAvailableLanguageError extends Error {}
class MockYoutubeTranscriptVideoUnavailableError extends Error {}

vi.mock('youtube-transcript', () => ({
  YoutubeTranscriptDisabledError: MockYoutubeTranscriptDisabledError,
  YoutubeTranscriptNotAvailableError: MockYoutubeTranscriptNotAvailableError,
  YoutubeTranscriptNotAvailableLanguageError:
    MockYoutubeTranscriptNotAvailableLanguageError,
  YoutubeTranscriptVideoUnavailableError:
    MockYoutubeTranscriptVideoUnavailableError,
  fetchTranscript: fetchTranscriptMock,
}));

async function loadApiClient() {
  vi.resetModules();
  return import('@/lib/youtube/api-client');
}

function createJsonResponse(
  body: unknown,
  init: {
    status?: number;
  } = {},
) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

describe('api-client', () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    process.env.YOUTUBE_API_KEY = 'youtube-key';
    process.env.ZAI_BASE_URL = 'https://api.z.ai/api/coding/paas/v4';
    fetchTranscriptMock.mockReset();
    vi.unstubAllGlobals();
  });

  it('fetches normalized video metadata', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        createJsonResponse({
          items: [
            {
              snippet: {
                title: 'Recipe Title',
                description: 'Detailed description',
                channelTitle: 'Channel Name',
                defaultLanguage: 'ko',
                thumbnails: {
                  high: {
                    url: 'https://img.youtube.com/high.jpg',
                  },
                },
              },
              contentDetails: {
                duration: 'PT1H2M3S',
              },
            },
          ],
        }),
      ),
    );

    const { fetchVideoMetadata } = await loadApiClient();

    await expect(fetchVideoMetadata('dQw4w9WgXcQ')).resolves.toEqual({
      title: 'Recipe Title',
      description: 'Detailed description',
      thumbnailUrl: 'https://img.youtube.com/high.jpg',
      channelName: 'Channel Name',
      language: 'ko',
      durationSeconds: 3723,
    });
  });

  it('retries metadata requests once after a timeout', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(
        Object.assign(new Error('Request aborted'), {
          name: 'AbortError',
        }),
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          items: [
            {
              snippet: {
                title: 'Recovered metadata',
                description: '',
                channelTitle: '',
                thumbnails: {},
              },
              contentDetails: {
                duration: 'PT15M',
              },
            },
          ],
        }),
      );

    vi.stubGlobal('fetch', fetchMock);

    const { fetchVideoMetadata } = await loadApiClient();
    const result = await fetchVideoMetadata('dQw4w9WgXcQ');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.durationSeconds).toBe(900);
  });

  it('maps quota failures to a readable error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        createJsonResponse(
          {
            error: {
              message: 'Quota exceeded',
              errors: [{ reason: 'quotaExceeded' }],
            },
          },
          { status: 403 },
        ),
      ),
    );

    const { fetchVideoMetadata } = await loadApiClient();

    await expect(fetchVideoMetadata('dQw4w9WgXcQ')).rejects.toMatchObject({
      name: 'YouTubeApiError',
      code: 'QUOTA_EXCEEDED',
    });
  });

  it('prefers manual Korean captions over auto-generated captions', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        createJsonResponse({
          items: [
            {
              snippet: {
                language: 'en',
                trackKind: 'ASR',
              },
            },
            {
              snippet: {
                language: 'ko',
                trackKind: 'standard',
              },
            },
          ],
        }),
      ),
    );
    fetchTranscriptMock.mockResolvedValue([
      {
        text: '양념을 섞습니다.',
        duration: 1,
        offset: 0,
        lang: 'ko',
      },
    ]);

    const { fetchCaptions } = await loadApiClient();

    await expect(fetchCaptions('dQw4w9WgXcQ')).resolves.toEqual({
      text: '양념을 섞습니다.',
      language: 'ko',
      isAutoGenerated: false,
    });
    expect(fetchTranscriptMock).toHaveBeenCalledWith('dQw4w9WgXcQ', {
      lang: 'ko',
    });
  });

  it('falls back to transcript fetching when captions.list is unavailable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        createJsonResponse(
          {
            error: {
              message: 'Insufficient permission',
              errors: [{ reason: 'forbidden' }],
            },
          },
          { status: 403 },
        ),
      ),
    );
    fetchTranscriptMock
      .mockRejectedValueOnce(new MockYoutubeTranscriptNotAvailableLanguageError())
      .mockRejectedValueOnce(new MockYoutubeTranscriptNotAvailableLanguageError())
      .mockRejectedValueOnce(new MockYoutubeTranscriptNotAvailableLanguageError())
      .mockRejectedValueOnce(new MockYoutubeTranscriptNotAvailableLanguageError())
      .mockResolvedValueOnce([
        {
          text: 'Fallback caption text',
          duration: 1,
          offset: 0,
          lang: 'en',
        },
      ]);

    const { fetchCaptions } = await loadApiClient();

    await expect(fetchCaptions('dQw4w9WgXcQ')).resolves.toEqual({
      text: 'Fallback caption text',
      language: 'en',
      isAutoGenerated: false,
    });
  });

  it('returns null when captions are unavailable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(createJsonResponse({ items: [] })),
    );
    fetchTranscriptMock.mockRejectedValue(
      new MockYoutubeTranscriptNotAvailableError(),
    );

    const { fetchCaptions } = await loadApiClient();

    await expect(fetchCaptions('dQw4w9WgXcQ')).resolves.toBeNull();
  });

  const manualSmokeTest = process.env.YOUTUBE_SMOKE_VIDEO_ID ? it : it.skip;

  manualSmokeTest('runs a manual caption smoke test when configured', async () => {
    const { fetchCaptions } = await loadApiClient();
    const result = await fetchCaptions(process.env.YOUTUBE_SMOKE_VIDEO_ID!);

    expect(result).not.toBeNull();
  });
});
