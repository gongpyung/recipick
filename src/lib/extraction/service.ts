import type { PostgrestError } from '@supabase/supabase-js';

import {
  ExtractorError,
  extractStructuredRecipe,
} from '@/lib/extraction/extractor';
import {
  ExtractionErrorCode,
  getExtractionErrorMessage,
  getExtractionErrorStatus,
} from '@/lib/extraction/errors';
import { normalizeStructuredRecipe } from '@/lib/extraction/normalizer';
import type {
  ExtractionRecord,
  ExtractionStage,
  ExtractionStatus,
  StructuredRecipe,
} from '@/lib/extraction/types';
import { LlmClientError } from '@/lib/llm/client';
import {
  getRecipeIdByExtractionId,
  saveRecipeAggregate,
} from '@/lib/recipe/service';
import { getSupabaseServerClient } from '@/lib/supabase/client';
import type {
  ExtractionInsert,
  ExtractionRow,
  ExtractionUpdate,
  VideoInsert,
  VideoRow,
} from '@/lib/supabase/types';
import {
  fetchCaptions,
  fetchVideoMetadata,
  YouTubeApiError,
} from '@/lib/youtube/api-client';
import { cleanYouTubeText } from '@/lib/youtube/text-cleaner';
import { parseYouTubeUrl } from '@/lib/youtube/url-parser';

const EXTRACTION_TTL_MS = 24 * 60 * 60 * 1_000;
const PIPELINE_TIMEOUT_MS = 90_000;
const CAPTION_STAGE_TIMEOUT_MS = 20_000;
const STALE_EXTRACTION_MS = 2 * 60 * 1_000;
const EXTRACTOR_VERSION = 'step2-ai-engine';
const MIN_SOURCE_TEXT_CHARS = 40;

interface VideoQueryBuilder {
  eq(
    column: 'youtube_id',
    value: string,
  ): {
    maybeSingle(): Promise<{
      data: VideoRow | null;
      error: PostgrestError | null;
    }>;
  };
}

interface VideoUpsertBuilder {
  select(columns: string): {
    single(): Promise<{
      data: VideoRow;
      error: PostgrestError | null;
    }>;
  };
}

interface VideosTableClient {
  select(columns: string): VideoQueryBuilder;
  upsert(
    values: VideoInsert,
    options: { onConflict: string },
  ): VideoUpsertBuilder;
}

interface ExtractionEqBuilder {
  eq(
    column: 'id',
    value: string,
  ): Promise<{
    error: PostgrestError | null;
  }>;
}

interface ExtractionListBuilder {
  eq(
    column: 'video_id',
    value: string,
  ): {
    order(
      column: 'updated_at',
      options: { ascending: boolean },
    ): {
      limit(limit: number): Promise<{
        data: ExtractionRow[] | null;
        error: PostgrestError | null;
      }>;
    };
  };
  eq(
    column: 'id',
    value: string,
  ): {
    maybeSingle(): Promise<{
      data: ExtractionRecord | null;
      error: PostgrestError | null;
    }>;
  };
}

interface ExtractionsTableClient {
  update(values: ExtractionUpdate): ExtractionEqBuilder;
  select(columns: string): ExtractionListBuilder;
  insert(values: ExtractionInsert): {
    select(columns: string): {
      single(): Promise<{
        data: ExtractionRow;
        error: PostgrestError | null;
      }>;
    };
  };
}

interface SupabaseSubset {
  from(table: 'videos'): VideosTableClient;
  from(table: 'extractions'): ExtractionsTableClient;
}

interface ExtractionServiceErrorOptions extends ErrorOptions {
  status?: number;
  details?: Record<string, unknown>;
}

class ExtractionServiceError extends Error {
  public readonly status: number;
  public readonly details?: Record<string, unknown>;

  constructor(
    public readonly code: ExtractionErrorCode,
    message?: string,
    options?: ExtractionServiceErrorOptions,
  ) {
    super(message ?? getExtractionErrorMessage(code), options);
    this.name = 'ExtractionServiceError';
    this.status = options?.status ?? getExtractionErrorStatus(code);
    this.details = options?.details;
  }
}

function getSupabase(): SupabaseSubset {
  const client: unknown = getSupabaseServerClient();
  return client as SupabaseSubset;
}

function createPipelineController(timeoutMs: number) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timeoutId);
      controller.abort();
    },
  };
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string) {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      const error = new Error(`${label} timed out after ${ms}ms`);
      error.name = 'AbortError';
      reject(error);
    }, ms);

    promise.then(resolve, reject).finally(() => clearTimeout(timeoutId));
  });
}

function abortableFetch(signal: AbortSignal): typeof fetch {
  return async (input, init) => {
    const nestedController = new AbortController();
    const abort = () => nestedController.abort(signal.reason);

    if (signal.aborted) {
      abort();
    } else {
      signal.addEventListener('abort', abort, { once: true });
    }

    try {
      return await fetch(input, {
        ...init,
        signal: nestedController.signal,
      });
    } finally {
      signal.removeEventListener('abort', abort);
    }
  };
}

function isActiveStatus(status: ExtractionStatus) {
  return status === 'queued' || status === 'processing';
}

function isFresh(updatedAt: string) {
  return Date.now() - new Date(updatedAt).getTime() <= EXTRACTION_TTL_MS;
}

function isStaleActiveExtraction(extraction: ExtractionRow) {
  return (
    isActiveStatus(extraction.status) &&
    Date.now() - new Date(extraction.updated_at).getTime() > STALE_EXTRACTION_MS
  );
}

function mapUrlErrorToCode(error: string | undefined) {
  if (
    error?.includes('지원하지 않는') ||
    error?.includes('Unsupported YouTube') ||
    error?.includes('Unsupported YouTube URL format')
  ) {
    return ExtractionErrorCode.UNSUPPORTED_URL;
  }

  return ExtractionErrorCode.INVALID_URL;
}

function assertNoSupabaseError(error: PostgrestError | null) {
  if (error) {
    throw new ExtractionServiceError(
      ExtractionErrorCode.INTERNAL_ERROR,
      error.message,
      {
        status: 500,
        cause: error,
      },
    );
  }
}

function mergeDebugPayload(
  current: Record<string, unknown> | null,
  patch: Record<string, unknown> | undefined,
) {
  if (!patch) {
    return current;
  }

  return {
    ...(current ?? {}),
    ...patch,
  };
}

function summarizeCleanedText(
  cleanedText: ReturnType<typeof cleanYouTubeText>,
) {
  return {
    combinedLength: cleanedText.combinedText.length,
    descriptionLength: cleanedText.descriptionText.length,
    captionLength: cleanedText.captionText?.length ?? 0,
    usedSources: cleanedText.usedSources,
    combinedPreview: cleanedText.combinedText.slice(0, 1_500),
  };
}

function mapUpstreamError(error: unknown) {
  if (error instanceof ExtractionServiceError) {
    return error;
  }

  if (error instanceof ExtractorError) {
    return new ExtractionServiceError(error.code, error.message, {
      cause: error,
      details: error.details,
    });
  }

  if (error instanceof LlmClientError) {
    const code =
      error.code === 'LLM_RATE_LIMITED'
        ? ExtractionErrorCode.LLM_RATE_LIMITED
        : error.code === 'INVALID_MODEL_OUTPUT'
          ? ExtractionErrorCode.INVALID_MODEL_OUTPUT
          : ExtractionErrorCode.LLM_REQUEST_FAILED;

    return new ExtractionServiceError(code, error.message, {
      status: error.status,
      cause: error,
      details: error.details,
    });
  }

  if (error instanceof YouTubeApiError) {
    switch (error.code) {
      case 'QUOTA_EXCEEDED':
        return new ExtractionServiceError(
          ExtractionErrorCode.QUOTA_EXCEEDED,
          error.message,
          { cause: error },
        );
      case 'VIDEO_NOT_FOUND':
        return new ExtractionServiceError(
          ExtractionErrorCode.VIDEO_NOT_FOUND,
          error.message,
          { cause: error },
        );
      case 'METADATA_FETCH_FAILED':
      case 'CAPTIONS_FETCH_FAILED':
        return new ExtractionServiceError(
          ExtractionErrorCode.METADATA_FETCH_FAILED,
          error.message,
          { cause: error },
        );
      default:
        return new ExtractionServiceError(ExtractionErrorCode.INTERNAL_ERROR);
    }
  }

  if (error instanceof Error && error.name === 'AbortError') {
    return new ExtractionServiceError(
      ExtractionErrorCode.EXTRACTION_TIMEOUT,
      '추출 처리 시간이 초과되었습니다.',
      {
        status: 504,
        cause: error,
      },
    );
  }

  return new ExtractionServiceError(ExtractionErrorCode.INTERNAL_ERROR);
}

async function selectReusableExtraction(extractions: ExtractionRow[]) {
  const activeExtraction = extractions.find((extraction) =>
    isActiveStatus(extraction.status),
  );

  if (activeExtraction) {
    if (isStaleActiveExtraction(activeExtraction)) {
      return null;
    }

    return activeExtraction;
  }

  for (const extraction of extractions) {
    if (extraction.status !== 'completed' || !isFresh(extraction.updated_at)) {
      continue;
    }

    const recipeId = await getRecipeIdByExtractionId(extraction.id);

    if (recipeId) {
      return extraction;
    }
  }

  return null;
}

async function updateExtractionRecord(
  extractionId: string,
  patch: ExtractionUpdate,
) {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('extractions')
    .update({
      ...patch,
      updated_at: new Date().toISOString(),
    })
    .eq('id', extractionId);

  assertNoSupabaseError(error);
}

async function fetchExistingVideo(youtubeId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('videos')
    .select('*')
    .eq('youtube_id', youtubeId)
    .maybeSingle();

  assertNoSupabaseError(error);
  return data;
}

async function fetchRecentExtractions(videoId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('extractions')
    .select('*')
    .eq('video_id', videoId)
    .order('updated_at', { ascending: false })
    .limit(10);

  assertNoSupabaseError(error);
  return data ?? [];
}

async function upsertVideo(video: VideoInsert) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('videos')
    .upsert(video, {
      onConflict: 'youtube_id',
    })
    .select('*')
    .single();

  assertNoSupabaseError(error);
  return data;
}

async function createQueuedExtraction(videoId: string) {
  const supabase = getSupabase();
  const now = new Date().toISOString();
  const payload: ExtractionInsert = {
    video_id: videoId,
    status: 'queued',
    stage: 'validating_url',
    extractor_version: EXTRACTOR_VERSION,
    created_at: now,
    updated_at: now,
  };
  const { data, error } = await supabase
    .from('extractions')
    .insert(payload)
    .select('*')
    .single();

  assertNoSupabaseError(error);
  return data;
}

function ensureSufficientSourceText(
  cleanedText: ReturnType<typeof cleanYouTubeText>,
) {
  const condensedLength = cleanedText.combinedText.replace(/\s/g, '').length;

  if (condensedLength < MIN_SOURCE_TEXT_CHARS) {
    throw new ExtractionServiceError(
      ExtractionErrorCode.INSUFFICIENT_SOURCE_TEXT,
      getExtractionErrorMessage(ExtractionErrorCode.INSUFFICIENT_SOURCE_TEXT),
    );
  }
}

function ensureRecipeVideo(recipe: StructuredRecipe) {
  const nonRecipeWarning = recipe.warnings.find(
    (warning: StructuredRecipe['warnings'][number]) =>
      warning.code === 'NON_RECIPE_VIDEO' && warning.severity === 'error',
  );

  if (nonRecipeWarning) {
    throw new ExtractionServiceError(
      ExtractionErrorCode.NON_RECIPE_VIDEO,
      nonRecipeWarning.message,
    );
  }
}

async function processExtractionPipeline(input: {
  extraction: ExtractionRow;
  video: VideoRow;
  youtubeUrl: string;
  videoId: string;
  sourceType: VideoInsert['source_type'];
}) {
  const { extraction, sourceType, video, videoId, youtubeUrl } = input;
  const stageDurations: Partial<Record<ExtractionStage, number>> = {};
  const pipeline = createPipelineController(PIPELINE_TIMEOUT_MS);
  const fetchImpl = abortableFetch(pipeline.signal);
  let rawOutputJson: Record<string, unknown> | null = null;

  const runStage = async <T>(
    stage: ExtractionStage,
    task: () => Promise<T>,
  ): Promise<T> => {
    await updateExtractionRecord(extraction.id, {
      status: 'processing',
      stage,
      extractor_version: EXTRACTOR_VERSION,
      raw_output_json: rawOutputJson,
    });

    const startedAt = Date.now();
    const result = await task();
    stageDurations[stage] = Date.now() - startedAt;
    return result;
  };

  try {
    const metadata = await runStage('fetching_metadata', () =>
      fetchVideoMetadata(videoId, { fetchImpl }),
    );

    const captions = await runStage('fetching_captions', () =>
      withTimeout(
        fetchCaptions(videoId, { fetchImpl }),
        CAPTION_STAGE_TIMEOUT_MS,
        'fetchCaptions',
      ),
    );

    await upsertVideo({
      id: video.id,
      youtube_url: youtubeUrl,
      youtube_id: videoId,
      source_type: sourceType,
      title: metadata.title,
      thumbnail_url: metadata.thumbnailUrl,
      description_text: metadata.description,
      caption_text: captions?.text ?? null,
      source_language: captions?.language ?? metadata.language,
    });

    const cleanedText = cleanYouTubeText({
      title: metadata.title,
      description: metadata.description,
      captions: captions?.text,
    });

    ensureSufficientSourceText(cleanedText);

    rawOutputJson = mergeDebugPayload(rawOutputJson, {
      source: {
        youtubeUrl,
        videoId,
        sourceType,
        language: captions?.language ?? metadata.language,
      },
      metadata: {
        title: metadata.title,
        channelName: metadata.channelName,
        durationSeconds: metadata.durationSeconds,
      },
      captions: captions
        ? {
            language: captions.language,
            isAutoGenerated: captions.isAutoGenerated,
          }
        : null,
      cleanedText: summarizeCleanedText(cleanedText),
      timings: stageDurations,
    });

    const extracted = await runStage('structuring', async () => {
      const result = await extractStructuredRecipe({
        title: metadata.title,
        cleanedText,
        source: {
          youtubeUrl,
          videoId,
          sourceType,
          language: captions?.language ?? metadata.language,
        },
      });

      rawOutputJson = mergeDebugPayload(rawOutputJson, {
        llm: {
          model: result.model,
          attemptCount: result.attemptCount,
          requestId: result.requestId,
          rawOutputPreview: result.rawOutput.slice(0, 1_500),
        },
      });

      return result;
    });

    const normalizedRecipe = await runStage('normalizing', async () => {
      const recipe = normalizeStructuredRecipe({
        ...extracted.recipe,
        extractionMeta: {
          ...extracted.recipe.extractionMeta,
          usedSources:
            extracted.recipe.extractionMeta?.usedSources ??
            cleanedText.usedSources,
          model:
            extracted.model ?? extracted.recipe.extractionMeta?.model ?? null,
          extractorVersion: EXTRACTOR_VERSION,
        },
      });

      ensureRecipeVideo(recipe);
      rawOutputJson = mergeDebugPayload(rawOutputJson, {
        normalizedRecipe: {
          title: recipe.title,
          baseServings: recipe.baseServings,
          ingredientCount: recipe.ingredients.length,
          stepCount: recipe.steps.length,
          warningCodes: recipe.warnings.map(
            (warning: StructuredRecipe['warnings'][number]) => warning.code,
          ),
          confidence: recipe.confidence,
        },
      });

      return recipe;
    });

    const persistedRecipe = await runStage('saving', async () => {
      try {
        return await saveRecipeAggregate({
          videoId: video.id,
          extractionId: extraction.id,
          recipe: normalizedRecipe,
        });
      } catch (error) {
        throw new ExtractionServiceError(
          ExtractionErrorCode.RECIPE_SAVE_FAILED,
          getExtractionErrorMessage(ExtractionErrorCode.RECIPE_SAVE_FAILED),
          {
            cause: error instanceof Error ? error : undefined,
          },
        );
      }
    });

    rawOutputJson = mergeDebugPayload(rawOutputJson, {
      timings: stageDurations,
      persistedRecipe: {
        id: persistedRecipe.id,
        extractionId: persistedRecipe.extractionId,
        videoId: persistedRecipe.videoId,
      },
    });

    await updateExtractionRecord(extraction.id, {
      status: 'completed',
      stage: null,
      model_name:
        persistedRecipe.extractionMeta?.model ?? extracted.model ?? null,
      extractor_version: EXTRACTOR_VERSION,
      raw_output_json: rawOutputJson,
      error_code: null,
      error_message: null,
    });
  } catch (error) {
    const mappedError = mapUpstreamError(error);

    await updateExtractionRecord(extraction.id, {
      status: 'failed',
      stage: null,
      extractor_version: EXTRACTOR_VERSION,
      raw_output_json: mergeDebugPayload(rawOutputJson, {
        timings: stageDurations,
        failure: {
          code: mappedError.code,
          message: mappedError.message,
        },
      }),
      error_code: mappedError.code,
      error_message: mappedError.message,
    });
  } finally {
    pipeline.cleanup();
  }
}

export async function createExtraction(
  youtubeUrl: string,
  options?: { forceReExtract?: boolean },
) {
  const parsed = parseYouTubeUrl(youtubeUrl);
  const videoId = parsed.videoId;
  const sourceType = parsed.sourceType;

  if (!parsed.isValid || !videoId || !sourceType) {
    throw new ExtractionServiceError(
      mapUrlErrorToCode(parsed.error),
      parsed.error,
    );
  }

  const existingVideo = await fetchExistingVideo(videoId);

  if (existingVideo && !options?.forceReExtract) {
    const reusableExtraction = await selectReusableExtraction(
      await fetchRecentExtractions(existingVideo.id),
    );

    if (reusableExtraction) {
      const recipeId =
        reusableExtraction.status === 'completed'
          ? await getRecipeIdByExtractionId(reusableExtraction.id)
          : null;

      return {
        extractionId: reusableExtraction.id,
        status: reusableExtraction.status,
        stage: reusableExtraction.stage,
        recipeId: recipeId ?? undefined,
        cached: true,
      };
    }
  }

  const video = await upsertVideo({
    youtube_url: youtubeUrl,
    youtube_id: videoId,
    source_type: sourceType,
  });
  const extraction = await createQueuedExtraction(video.id);
  setTimeout(() => {
    void processExtractionPipeline({
      extraction,
      video,
      youtubeUrl,
      videoId,
      sourceType,
    });
  }, 0);

  return {
    extractionId: extraction.id,
    status: 'queued' as const,
    stage: 'validating_url' as const,
    cached: false,
  };
}

export async function getExtraction(
  extractionId: string,
): Promise<ExtractionRecord | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('extractions')
    .select('*')
    .eq('id', extractionId)
    .maybeSingle();

  assertNoSupabaseError(error);
  return data;
}
