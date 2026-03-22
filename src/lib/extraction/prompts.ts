import type { SourceUsage, VideoSourceType } from '@/lib/extraction/types';

export interface PromptSourceInput {
  youtubeUrl: string;
  videoId: string;
  sourceType: VideoSourceType;
  language: string | null;
  title: string;
  descriptionText: string;
  captionText: string | null;
  combinedText: string;
  usedSources: SourceUsage[];
}

function formatOptionalBlock(label: string, value: string | null) {
  return value ? `${label}:\n${value}` : `${label}:\n(none)`;
}

export function buildExtractionMessages(input: PromptSourceInput) {
  const systemPrompt = [
    'You convert YouTube cooking content into strict JSON recipe data.',
    'Return JSON only. Do not wrap it in prose.',
    'Never invent missing ingredients, amounts, servings, or steps.',
    'If something is unclear, keep nullable fields null and add warnings.',
    'Reject non-recipe videos by adding a NON_RECIPE_VIDEO warning with severity error.',
    'The JSON must match this shape exactly:',
    '{',
    '  "title": string,',
    '  "source": { "youtubeUrl": string, "videoId": string, "sourceType": "video" | "shorts", "language": string | null },',
    '  "baseServings": number | null,',
    '  "summary": string | null,',
    '  "ingredients": [{ "name": string, "amount": number | null, "amountText": string | null, "unit": string | null, "scalable": boolean, "note": string | null, "confidence": "high" | "medium" | "low" }],',
    '  "steps": [{ "stepNo": number, "text": string, "note": string | null, "confidence": "high" | "medium" | "low" }],',
    '  "tips": string[],',
    '  "warnings": [{ "code": "MISSING_QUANTITY" | "MISSING_BASE_SERVINGS" | "LOW_CONFIDENCE_INGREDIENT" | "LOW_CONFIDENCE_STEP" | "MULTIPLE_DISHES_DETECTED" | "NON_RECIPE_VIDEO" | "INSUFFICIENT_SOURCE_TEXT" | "OCR_REQUIRED_BUT_DISABLED", "message": string, "severity": "info" | "warning" | "error" }],',
    '  "confidence": "high" | "medium" | "low",',
    '  "extractionMeta": { "usedSources": ("title" | "description" | "captions" | "asr" | "ocr" | "vision")[], "model": string | null, "extractorVersion": string | null }',
    '}',
  ].join('\n');

  const userPrompt = [
    'Extract one structured cooking recipe from the following YouTube source.',
    `youtubeUrl: ${input.youtubeUrl}`,
    `videoId: ${input.videoId}`,
    `sourceType: ${input.sourceType}`,
    `language: ${input.language ?? 'unknown'}`,
    `usedSources: ${input.usedSources.join(', ') || 'none'}`,
    '',
    formatOptionalBlock('title', input.title),
    '',
    formatOptionalBlock('description', input.descriptionText),
    '',
    formatOptionalBlock('captions', input.captionText),
    '',
    'combined_cleaned_text:',
    input.combinedText,
  ].join('\n');

  return [
    { role: 'system' as const, content: systemPrompt },
    { role: 'user' as const, content: userPrompt },
  ];
}

export function buildRepairMessages(input: {
  source: PromptSourceInput;
  previousIssues: string[];
  previousOutput: string;
}) {
  const systemPrompt = [
    'Repair the previous recipe JSON so it satisfies the exact schema.',
    'Return JSON only.',
    'Do not add fields outside the schema.',
    'Do not invent unsupported facts.',
  ].join('\n');

  const userPrompt = [
    'The previous JSON failed validation. Fix it using the same source text.',
    '',
    'Validation issues:',
    ...input.previousIssues.map((issue) => `- ${issue}`),
    '',
    'Previous JSON:',
    input.previousOutput,
    '',
    'Source context:',
    `youtubeUrl: ${input.source.youtubeUrl}`,
    `videoId: ${input.source.videoId}`,
    `sourceType: ${input.source.sourceType}`,
    `language: ${input.source.language ?? 'unknown'}`,
    '',
    'combined_cleaned_text:',
    input.source.combinedText,
  ].join('\n');

  return [
    { role: 'system' as const, content: systemPrompt },
    { role: 'user' as const, content: userPrompt },
  ];
}
