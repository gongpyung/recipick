import { structuredRecipeSchema } from '@/lib/extraction/recipe-schema';
import type { StructuredRecipe } from '@/lib/extraction/types';

function stripMarkdownFence(input: string) {
  const trimmed = input.trim();

  if (!trimmed.startsWith('```')) {
    return trimmed;
  }

  const lines = trimmed.split('\n');
  if (lines.length <= 2) {
    return trimmed;
  }

  return lines.slice(1, -1).join('\n').trim();
}

function extractJSONObject(input: string) {
  const stripped = stripMarkdownFence(input);
  const firstBrace = stripped.indexOf('{');
  const lastBrace = stripped.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error('No JSON object found in model output.');
  }

  return stripped.slice(firstBrace, lastBrace + 1);
}

export function parseStructuredRecipeOutput(content: string): StructuredRecipe {
  const parsed = JSON.parse(extractJSONObject(content)) as unknown;
  return structuredRecipeSchema.parse(parsed);
}

export function summarizeValidationError(error: unknown) {
  if (!(error instanceof Error)) {
    return 'Unknown validation error';
  }

  return error.message.replace(/\s+/g, ' ').trim().slice(0, 500);
}
