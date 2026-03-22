type UsedSource = 'title' | 'description' | 'captions';

export interface CleanedText {
  combinedText: string;
  descriptionText: string;
  captionText: string | null;
  usedSources: UsedSource[];
}

const TIMESTAMP_PATTERN = /(?:\[\s*)?\d{1,2}:\d{2}(?::\d{2})?(?:\s*])?/g;
const URL_PATTERN = /https?:\/\/\S+|www\.\S+/gi;
const HASHTAG_PATTERN = /(^|\s)#[^\s#]+/g;

function normalizeWhitespace(value: string) {
  return value
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

function removeTimestamps(value: string) {
  return value.replace(TIMESTAMP_PATTERN, ' ');
}

function removeLinksAndHashtags(value: string) {
  return value.replace(URL_PATTERN, ' ').replace(HASHTAG_PATTERN, '$1');
}

function dedupeConsecutiveLines(lines: string[]) {
  const deduped: string[] = [];

  for (const line of lines) {
    const lastLine = deduped.at(-1);

    if (lastLine?.toLowerCase() === line.toLowerCase()) {
      continue;
    }

    deduped.push(line);
  }

  return deduped;
}

function cleanBlock(value: string | null | undefined) {
  if (!value) {
    return '';
  }

  const lines = value
    .split('\n')
    .map((line) => removeLinksAndHashtags(removeTimestamps(line)))
    .map((line) => normalizeWhitespace(line))
    .filter(Boolean);

  return dedupeConsecutiveLines(lines).join('\n');
}

export function cleanYouTubeText(input: {
  title?: string | null;
  description?: string | null;
  captions?: string | null;
}): CleanedText {
  const titleText = cleanBlock(input.title);
  const descriptionText = cleanBlock(input.description);
  const captionText = cleanBlock(input.captions);
  const parts: string[] = [];
  const usedSources: UsedSource[] = [];

  if (titleText) {
    parts.push(titleText);
    usedSources.push('title');
  }

  if (descriptionText) {
    parts.push(descriptionText);
    usedSources.push('description');
  }

  if (captionText) {
    parts.push(captionText);
    usedSources.push('captions');
  }

  return {
    combinedText: parts.join('\n\n'),
    descriptionText,
    captionText: captionText || null,
    usedSources,
  };
}
