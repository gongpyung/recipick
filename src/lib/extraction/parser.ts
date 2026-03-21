import { SchemaRetryableError } from '@/lib/extraction/schema-retry';

function extractFencedJsonBlock(text: string) {
  const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);

  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  return null;
}

function extractBalancedJson(text: string) {
  const startIndex = text.indexOf('{');
  const endIndex = text.lastIndexOf('}');

  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
    return null;
  }

  return text.slice(startIndex, endIndex + 1).trim();
}

export function extractJsonCandidate(text: string) {
  return extractFencedJsonBlock(text) ?? extractBalancedJson(text);
}

export function parseStructuredRecipePayload(text: string) {
  const candidate = extractJsonCandidate(text);

  if (!candidate) {
    throw new SchemaRetryableError('JSON payload was not found.', [
      'response: JSON payload was not found in the model output.',
    ]);
  }

  try {
    return JSON.parse(candidate) as unknown;
  } catch (error) {
    throw new SchemaRetryableError(
      'JSON payload could not be parsed.',
      ['response: JSON payload could not be parsed.'],
      { cause: error },
    );
  }
}
