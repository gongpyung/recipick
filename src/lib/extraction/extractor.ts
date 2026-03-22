import type { CleanedText } from '@/lib/youtube/text-cleaner';
import type { RecipeSource, StructuredRecipe } from '@/lib/extraction/types';
import { generateText, type LlmMessage } from '@/lib/llm/client';
import { normalizeStructuredRecipe } from '@/lib/extraction/normalizer';
import { parseStructuredRecipePayload } from '@/lib/extraction/parser';
import {
  buildExtractionMessages,
  buildRepairMessages,
} from '@/lib/extraction/prompts';
import { parseStructuredRecipe } from '@/lib/extraction/recipe-schema';
import {
  runWithSchemaRetry,
  SchemaRetryExhaustedError,
} from '@/lib/extraction/schema-retry';
import { ExtractionErrorCode } from '@/lib/extraction/errors';

export class ExtractorError extends Error {
  constructor(
    public readonly code:
      | ExtractionErrorCode.INVALID_MODEL_OUTPUT
      | ExtractionErrorCode.SCHEMA_VALIDATION_FAILED,
    message: string,
    public readonly details?: Record<string, unknown>,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'ExtractorError';
  }
}

interface ExtractStructuredRecipeInput {
  title: string;
  cleanedText: CleanedText;
  source: RecipeSource;
}

export interface ExtractStructuredRecipeResult {
  recipe: StructuredRecipe;
  model: string;
  attemptCount: number;
  rawOutput: string;
  requestId: string | null;
}

export async function extractStructuredRecipe({
  title,
  cleanedText,
  source,
}: ExtractStructuredRecipeInput): Promise<ExtractStructuredRecipeResult> {
  let latestRawOutput = '';
  let latestModel = '';
  let latestRequestId: string | null = null;

  try {
    const result = await runWithSchemaRetry({
      generate: async ({ attempt, previousIssues }) => {
        const messages: LlmMessage[] =
          attempt === 1
            ? buildExtractionMessages({
                youtubeUrl: source.youtubeUrl,
                videoId: source.videoId,
                sourceType: source.sourceType,
                language: source.language,
                title,
                descriptionText: cleanedText.descriptionText,
                captionText: cleanedText.captionText,
                combinedText: cleanedText.combinedText,
                usedSources: cleanedText.usedSources,
              })
            : buildRepairMessages({
                previousIssues,
                previousOutput: latestRawOutput,
                source: {
                  youtubeUrl: source.youtubeUrl,
                  videoId: source.videoId,
                  sourceType: source.sourceType,
                  language: source.language,
                  title,
                  descriptionText: cleanedText.descriptionText,
                  captionText: cleanedText.captionText,
                  combinedText: cleanedText.combinedText,
                  usedSources: cleanedText.usedSources,
                },
              });

        const completion = await generateText(messages);

        latestRawOutput = completion.content;
        latestModel = completion.model ?? '';
        latestRequestId =
          completion.rawResponse &&
          typeof completion.rawResponse.id === 'string'
            ? completion.rawResponse.id
            : null;

        return parseStructuredRecipePayload(completion.content);
      },
      validate: (payload) => parseStructuredRecipe(payload),
    });

    return {
      recipe: normalizeStructuredRecipe(result.result),
      model: latestModel,
      attemptCount: result.attempts,
      rawOutput: latestRawOutput,
      requestId: latestRequestId,
    };
  } catch (error) {
    if (error instanceof SchemaRetryExhaustedError) {
      throw new ExtractorError(
        ExtractionErrorCode.SCHEMA_VALIDATION_FAILED,
        error.message,
        {
          issues: error.issues,
          attempts: error.attempts,
          rawOutput: latestRawOutput,
        },
        { cause: error },
      );
    }

    if (error instanceof ExtractorError) {
      throw error;
    }

    throw new ExtractorError(
      ExtractionErrorCode.INVALID_MODEL_OUTPUT,
      'AI 응답을 구조화된 레시피로 변환하지 못했습니다.',
      { rawOutput: latestRawOutput },
      { cause: error },
    );
  }
}
