import type { SourceUsage, VideoSourceType } from '@/lib/extraction/types';

interface ExtractionPromptInput {
  youtubeUrl: string;
  videoId: string;
  sourceType: VideoSourceType;
  language: string | null;
  usedSources: SourceUsage[];
  combinedText: string;
  validationFeedback?: string;
}

export function buildExtractionPrompt({
  youtubeUrl,
  videoId,
  sourceType,
  language,
  usedSources,
  combinedText,
  validationFeedback,
}: ExtractionPromptInput) {
  const system = [
    'You extract structured cooking recipes from YouTube text.',
    'Return JSON only.',
    'Do not invent missing facts.',
    'If information is uncertain, keep nullable fields null and add warnings.',
    'A valid recipe must have at least one cooking step.',
    'Use warning codes only from this set: MISSING_QUANTITY, MISSING_BASE_SERVINGS, LOW_CONFIDENCE_INGREDIENT, LOW_CONFIDENCE_STEP, MULTIPLE_DISHES_DETECTED, NON_RECIPE_VIDEO, INSUFFICIENT_SOURCE_TEXT, OCR_REQUIRED_BUT_DISABLED.',
    'Confidence values must be high, medium, or low.',
    'Severity values must be info, warning, or error.',
    'Units should stay close to the source text when uncertain.',
  ].join(' ');

  const user = [
    'Extract a structured recipe from the following YouTube source text.',
    'If the video is not a recipe or the text is insufficient, reflect that using warnings and low confidence instead of fabricating details.',
    '',
    'Required JSON shape:',
    JSON.stringify(
      {
        title: 'string',
        source: {
          youtubeUrl: 'string',
          videoId: 'string',
          sourceType: 'video | shorts',
          language: 'string | null',
        },
        baseServings: 'number | null',
        summary: 'string | null',
        ingredients: [
          {
            name: 'string',
            amount: 'number | null',
            amountText: 'string | null',
            unit: 'string | null',
            scalable: 'boolean',
            note: 'string | null',
            confidence: 'high | medium | low',
          },
        ],
        steps: [
          {
            stepNo: 'integer >= 1',
            text: 'string',
            note: 'string | null',
            confidence: 'high | medium | low',
          },
        ],
        tips: ['string'],
        warnings: [
          {
            code: 'allowed warning code',
            message: 'string',
            severity: 'info | warning | error',
          },
        ],
        confidence: 'high | medium | low',
        extractionMeta: {
          usedSources: ['title | description | captions | asr | ocr | vision'],
          model: 'string | null',
          extractorVersion: 'string | null',
        },
      },
      null,
      2,
    ),
    '',
    `youtubeUrl: ${youtubeUrl}`,
    `videoId: ${videoId}`,
    `sourceType: ${sourceType}`,
    `language: ${language ?? 'unknown'}`,
    `usedSources: ${usedSources.join(', ') || 'none'}`,
    '',
    'Source text:',
    combinedText,
  ];

  if (validationFeedback) {
    user.push('', 'Fix the previous JSON validation issues:', validationFeedback);
  }

  return {
    system,
    user: user.join('\n'),
  };
}
