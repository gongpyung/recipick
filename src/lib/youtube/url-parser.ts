const SUPPORTED_WATCH_HOSTS = new Set([
  'www.youtube.com',
  'youtube.com',
  'm.youtube.com',
]);

const SHORT_HOST = 'youtu.be';
const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

export interface ParseResult {
  isValid: boolean;
  videoId?: string;
  sourceType?: 'video' | 'shorts';
  error?: string;
}

function invalid(error: string): ParseResult {
  return {
    isValid: false,
    error,
  };
}

function parseVideoId(candidate: string | null | undefined) {
  const normalized = candidate?.trim();

  if (!normalized) {
    return null;
  }

  return VIDEO_ID_PATTERN.test(normalized) ? normalized : null;
}

export function parseYouTubeUrl(input: string): ParseResult {
  const trimmed = input.trim();

  if (!trimmed) {
    return invalid('YouTube URL is required.');
  }

  let url: URL;

  try {
    url = new URL(trimmed);
  } catch {
    return invalid('Invalid URL format.');
  }

  if (url.protocol !== 'https:') {
    return invalid('Only HTTPS YouTube URLs are supported.');
  }

  const hostname = url.hostname.toLowerCase();

  if (hostname === SHORT_HOST) {
    const videoId = parseVideoId(url.pathname.split('/').filter(Boolean)[0]);

    if (!videoId) {
      return invalid('Missing or invalid YouTube video ID.');
    }

    return {
      isValid: true,
      videoId,
      sourceType: 'video',
    };
  }

  if (!SUPPORTED_WATCH_HOSTS.has(hostname)) {
    return invalid('Unsupported YouTube URL format.');
  }

  if (url.pathname === '/watch') {
    const videoId = parseVideoId(url.searchParams.get('v'));

    if (!videoId) {
      return invalid('Missing or invalid YouTube video ID.');
    }

    return {
      isValid: true,
      videoId,
      sourceType: 'video',
    };
  }

  const pathSegments = url.pathname.split('/').filter(Boolean);

  if (pathSegments[0] === 'shorts') {
    const videoId = parseVideoId(pathSegments[1]);

    if (!videoId) {
      return invalid('Missing or invalid YouTube shorts ID.');
    }

    return {
      isValid: true,
      videoId,
      sourceType: 'shorts',
    };
  }

  return invalid('Unsupported YouTube URL format.');
}
