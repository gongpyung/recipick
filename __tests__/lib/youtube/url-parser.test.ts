import { describe, expect, it } from 'vitest';

import { parseYouTubeUrl } from '@/lib/youtube/url-parser';

describe('parseYouTubeUrl', () => {
  it.each([
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtube.com/watch?v=dQw4w9WgXcQ',
    'https://m.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtu.be/dQw4w9WgXcQ',
    'https://www.youtube.com/shorts/dQw4w9WgXcQ',
    'https://youtube.com/shorts/dQw4w9WgXcQ?si=test',
  ])('accepts supported YouTube URLs: %s', (url) => {
    expect(parseYouTubeUrl(url)).toEqual(
      expect.objectContaining({
        isValid: true,
        videoId: 'dQw4w9WgXcQ',
      }),
    );
  });

  it('keeps watch URLs valid when extra query params are present', () => {
    expect(
      parseYouTubeUrl(
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10s&list=abc123&si=xyz',
      ),
    ).toEqual({
      isValid: true,
      videoId: 'dQw4w9WgXcQ',
      sourceType: 'video',
    });
  });

  it('rejects invalid inputs', () => {
    expect(parseYouTubeUrl('')).toEqual({
      isValid: false,
      error: 'YouTube URL is required.',
    });

    expect(parseYouTubeUrl('https://example.com/watch?v=dQw4w9WgXcQ')).toEqual({
      isValid: false,
      error: 'Unsupported YouTube URL format.',
    });

    expect(parseYouTubeUrl('https://www.youtube.com/watch?v=')).toEqual({
      isValid: false,
      error: 'Missing or invalid YouTube video ID.',
    });

    expect(parseYouTubeUrl('https://www.youtube.com/watch')).toEqual({
      isValid: false,
      error: 'Missing or invalid YouTube video ID.',
    });
  });

  it('rejects insecure http URLs and malformed ids', () => {
    expect(parseYouTubeUrl('http://www.youtube.com/watch?v=dQw4w9WgXcQ')).toEqual(
      {
        isValid: false,
        error: 'Only HTTPS YouTube URLs are supported.',
      },
    );

    expect(parseYouTubeUrl('https://youtu.be/not-valid')).toEqual({
      isValid: false,
      error: 'Missing or invalid YouTube video ID.',
    });
  });
});
