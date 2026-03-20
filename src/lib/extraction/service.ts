import type { PostgrestError } from '@supabase/supabase-js';

import {
  ExtractionErrorCode,
  getExtractionErrorMessage,
  getExtractionErrorStatus,
} from '@/lib/extraction/errors';
import { normalizeStructuredRecipe } from '@/lib/extraction/normalizer';
import { parseStructuredRecipeOutput, summarizeValidationError } from '@/lib/extraction/parser';
import { buildExtractionPrompt } from '@/lib/extraction/prompt';
import type {
  ExtractionStage,
  ExtractionStatus,
  StructuredRecipe,
  VideoSourceType,
} from '@/lib/extraction/types';
import { generateZaiJsonCompletion, ZaiClientError } from '@/lib/llm/zai';
import { createRecipeFromExtraction, getRecipeIdByExtractionId } from '@/lib/recipe/service';
import { getSupabaseServerClient } from '@/lib/supabase/client';
import type {
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
const PIPELINE_TIMEOUT_MS = 30_000;
const MIN_SOURCE_TEXT_LENGTH = 40;
const EXTRACTION_VALIDATION_ATTEMPTS = 2;
const EXTRACTOR_VERSION = 'step2-ai-extraction';

class ExtractionServiceError extends Error {
  constructor(
    public readonly code: ExtractionErrorCode,
    message?: string,
    public readonly status = getExtractionErrorStatus(code),
    options?: ErrorOptions,
  ) {
    super(message ?? getExtractionErrorMessage(code), options);
    this.name = 'ExtractionServiceError';
  }
}

interface ExtractionJobInput {
  extractionId: string;
  videoRowId: string;
  youtubeUrl: string;
  videoId: string;
  sourceType: VideoSourceType;
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

function mapUrlErrorToCode(error: string | undefined) {
  if (
    error?.includes('Unsupported YouTube') ||
    error?.includes('지원하지 않는')
  ) {
    return ExtractionErrorCode.UNSUPPORTED_URL;
  }

  return ExtractionErrorCode.INVALID_URL;
}

function mapUpstreamError(error: unknown) {
  if (error instanceof ExtractionServiceError) {
    return error;
  }

  if (error instanceof ZaiClientError) {
    if (error.status === 429) {
      return new ExtractionServiceError(
        ExtractionErrorCode.QUOTA_EXCEEDED,
        'AI 추출 요청이 많습니다. 잠시 후 다시 시도해주세요.',
      );
    }

    if (error.status === 408 || error.status >= 500) {
      return new ExtractionServiceError(
        ExtractionErrorCode.EXTRACTION_TIMEOUT,
        'AI 추출 처리 시간이 초과되었습니다.',
      );
    }

    return new ExtractionServiceError(
      ExtractionErrorCode.INTERNAL_ERROR,
      error.message,
      500,
      { cause: error },
    );
  }

  if (error instanceof YouTubeApiError) {
    switch (error.code) {
      case 'QUOTA_EXCEEDED':
        return new ExtractionServiceError(
          ExtractionErrorCode.QUOTA_EXCEEDED,
          error.message,
        );
      case 'VIDEO_NOT_FOUND':
        return new ExtractionServiceError(
          ExtractionErrorCode.VIDEO_NOT_FOUND,
          error.message,
        );
      case 'CAPTIONS_FETCH_FAILED':
        return new ExtractionServiceError(
          ExtractionErrorCode.CAPTIONS_NOT_AVAILABLE,
          '사용 가능한 자막을 가져오지 못했습니다.',
        );
      case 'METADATA_FETCH_FAILED':
      default:
        return new ExtractionServiceError(
          ExtractionErrorCode.METADATA_FETCH_FAILED,
          error.message,
        );
    }
  }

  if (error instanceof Error && error.name === 'AbortError') {
    return new ExtractionServiceError(
      ExtractionErrorCode.EXTRACTION_TIMEOUT,
      '추출 처리 시간이 초과되었습니다.',
    );
  }

  return new ExtractionServiceError(ExtractionErrorCode.INTERNAL_ERROR);
}

function assertNoSupabaseError(error: PostgrestError | null) {
  if (error) {
    throw new ExtractionServiceError(
      ExtractionErrorCode.INTERNAL_ERROR,
      error.message,
      500,
      { cause: error },
    );
  }
}

async function updateExtractionRecord(
  extractionId: string,
  patch: ExtractionUpdate,
) {
  const supabase = getSupabaseServerClient();
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
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('videos')
    .select('*')
    .eq('youtube_id', youtubeId)
    .maybeSingle();

  assertNoSupabaseError(error);
  return data;
}

async function fetchRecentExtractions(videoId: string) {
  const supabase = getSupabaseServerClient();
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
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('videos')
    .upsert(video, {
      onConflict: 'youtube_id',
    })
    .select('*')
    .single();

  assertNoSupabaseError(error);
  return data as VideoRow;
}

async function createQueuedExtraction(videoId: string) {
  const supabase = getSupabaseServerClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('extractions')
    .insert({
      video_id: videoId,
      status: 'queued',
      stage: 'validating_url',
      extractor_version: EXTRACTOR_VERSION,
      created_at: now,
      updated_at: now,
    })
    .select('*')
    .single();

  assertNoSupabaseError(error);
  return data;
}

async function selectReusableExtraction(extractions: ExtractionRow[]) {
  const active = extractions.find((extraction) =>
    isActiveStatus(extraction.status),
  );

  if (active) {
    return active;
  }

  for (const extraction of extractions) {
    if (
      extraction.status === 'completed' &&
      isFresh(extraction.updated_at) &&
      (await getRecipeIdByExtractionId(extraction.id))
    ) {
      return extraction;
    }
  }

  return null;
}

async function extractRecipeWithRetry(input: {
  youtubeUrl: string;
  videoId: string;
  sourceType: VideoSourceType;
  language: string | null;
  combinedText: string;
  usedSources: ('title' | 'description' | 'captions')[];
}) {
  let validationFeedback: string | undefined;
  let lastError: unknown;
  let lastContent = '';
  let lastModel: string | null = null;
  let lastUsage:
    | {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
      }
    | undefined;

  for (let attempt = 1; attempt <= EXTRACTION_VALIDATION_ATTEMPTS; attempt += 1) {
    const prompt = buildExtractionPrompt({
      youtubeUrl: input.youtubeUrl,
      videoId: input.videoId,
      sourceType: input.sourceType,
      language: input.language,
      usedSources: input.usedSources,
      combinedText: input.combinedText,
      validationFeedback,
    });

    const completion = await generateZaiJsonCompletion([
      { role: 'system', content: prompt.system },
      { role: 'user', content: prompt.user },
    ]);

    lastContent = completion.content;
    lastModel = completion.model;
    lastUsage = completion.usage;

    try {
      const recipe = parseStructuredRecipeOutput(completion.content);
      return {
        recipe,
        rawContent: completion.content,
        model: completion.model,
        usage: completion.usage,
        attempts: attempt,
      };
    } catch (error) {
      lastError = error;
      validationFeedback = summarizeValidationError(error);
    }
  }

  throw new ExtractionServiceError(
    ExtractionErrorCode.INTERNAL_ERROR,
    `AI 응답을 레시피 형식으로 검증하지 못했습니다. ${summarizeValidationError(lastError)}`,
    500,
    {
      cause: lastError,
      rawContent: lastContent,
      model: lastModel,
      usage: lastUsage,
    },
  );
}

function scheduleExtractionJob(job: ExtractionJobInput) {
  void processExtractionJob(job).catch(async (error) => {
    const mappedError = mapUpstreamError(error);

    await updateExtractionRecord(job.extractionId, {
      status: 'failed',
      stage: null,
      error_code: mappedError.code,
      error_message: mappedError.message,
      extractor_version: EXTRACTOR_VERSION,
    });
  });
}

async function processExtractionJob(job: ExtractionJobInput) {
  const stageDurations: Partial<Record<ExtractionStage, number>> = {};
  const fetchImpl = abortableFetch(AbortSignal.timeout(PIPELINE_TIMEOUT_MS));
  const pipelineStartedAt = Date.now();

  await updateExtractionRecord(job.extractionId, {
    status: 'processing',
    stage: 'fetching_metadata',
    error_code: null,
    error_message: null,
  });

  const metadataStartedAt = Date.now();
  const metadata = await fetchVideoMetadata(job.videoId, { fetchImpl });
  stageDurations.fetching_metadata = Date.now() - metadataStartedAt;

  const video = await upsertVideo({
    id: job.videoRowId,
    youtube_url: job.youtubeUrl,
    youtube_id: job.videoId,
    source_type: job.sourceType,
    title: metadata.title,
    thumbnail_url: metadata.thumbnailUrl,
    description_text: metadata.description,
    source_language: metadata.language,
  });

  await updateExtractionRecord(job.extractionId, {
    status: 'processing',
    stage: 'fetching_captions',
  });

  const captionsStartedAt = Date.now();
  const captions = await fetchCaptions(job.videoId, { fetchImpl });
  stageDurations.fetching_captions = Date.now() - captionsStartedAt;

  if (captions) {
    await upsertVideo({
      id: video.id,
      youtube_url: job.youtubeUrl,
      youtube_id: job.videoId,
      source_type: job.sourceType,
      title: metadata.title,
      thumbnail_url: metadata.thumbnailUrl,
      description_text: metadata.description,
      caption_text: captions.text,
      source_language: captions.language ?? metadata.language,
    });
  }

  const cleanedText = cleanYouTubeText({
    title: metadata.title,
    description: metadata.description,
    captions: captions?.text,
  });

  if (cleanedText.combinedText.trim().length < MIN_SOURCE_TEXT_LENGTH) {
    throw new ExtractionServiceError(
      ExtractionErrorCode.INSUFFICIENT_SOURCE_TEXT,
    );
  }

  await updateExtractionRecord(job.extractionId, {
    status: 'processing',
    stage: 'structuring',
    raw_output_json: {
      sourceText: cleanedText,
      metadata,
      captions,
      timings: stageDurations,
    },
  });

  const structuringStartedAt = Date.now();
  const extracted = await extractRecipeWithRetry({
    youtubeUrl: job.youtubeUrl,
    videoId: job.videoId,
    sourceType: job.sourceType,
    language: captions?.language ?? metadata.language,
    combinedText: cleanedText.combinedText,
    usedSources: cleanedText.usedSources,
  });
  stageDurations.structuring = Date.now() - structuringStartedAt;

  await updateExtractionRecord(job.extractionId, {
    status: 'processing',
    stage: 'normalizing',
    model_name: extracted.model,
  });

  const normalizingStartedAt = Date.now();
  const normalizedRecipe: StructuredRecipe = normalizeStructuredRecipe(
    {
      ...extracted.recipe,
      source: {
        youtubeUrl: job.youtubeUrl,
        videoId: job.videoId,
        sourceType: job.sourceType,
        language: captions?.language ?? metadata.language,
      },
    },
    {
      extractorVersion: EXTRACTOR_VERSION,
      model: extracted.model,
      usedSources: cleanedText.usedSources,
    },
  );
  stageDurations.normalizing = Date.now() - normalizingStartedAt;

  await updateExtractionRecord(job.extractionId, {
    status: 'processing',
    stage: 'saving',
    model_name: extracted.model,
    extractor_version: EXTRACTOR_VERSION,
    raw_output_json: {
      sourceText: cleanedText,
      metadata,
      captions,
      llm: {
        rawContent: extracted.rawContent,
        usage: extracted.usage,
        attempts: extracted.attempts,
        model: extracted.model,
      },
      normalizedRecipe,
      timings: {
        ...stageDurations,
        total: Date.now() - pipelineStartedAt,
      },
    },
  });

  const savingStartedAt = Date.now();
  const recipe = await createRecipeFromExtraction({
    videoId: video.id,
    extractionId: job.extractionId,
    recipe: normalizedRecipe,
  });
  stageDurations.saving = Date.now() - savingStartedAt;

  await updateExtractionRecord(job.extractionId, {
    status: 'completed',
    stage: null,
    model_name: extracted.model,
    extractor_version: EXTRACTOR_VERSION,
    error_code: null,
    error_message: null,
    raw_output_json: {
      sourceText: cleanedText,
      metadata,
      captions,
      llm: {
        rawContent: extracted.rawContent,
        usage: extracted.usage,
        attempts: extracted.attempts,
        model: extracted.model,
      },
      normalizedRecipe,
      recipeId: recipe.id,
      timings: {
        ...stageDurations,
        total: Date.now() - pipelineStartedAt,
      },
    },
  });
}

export async function createExtraction(
  youtubeUrl: string,
  options?: { forceReExtract?: boolean },
) {
  const parsed = parseYouTubeUrl(youtubeUrl);

  if (!parsed.isValid || !parsed.videoId || !parsed.sourceType) {
    throw new ExtractionServiceError(mapUrlErrorToCode(parsed.error), parsed.error);
  }

  const existingVideo = await fetchExistingVideo(parsed.videoId);

  if (existingVideo && !options?.forceReExtract) {
    const reusableExtraction = await selectReusableExtraction(
      await fetchRecentExtractions(existingVideo.id),
    );

    if (reusableExtraction) {
      return {
        extractionId: reusableExtraction.id,
        status: reusableExtraction.status,
        stage: reusableExtraction.stage,
        cached: true,
      };
    }
  }

  const video = await upsertVideo({
    id: existingVideo?.id,
    youtube_url: youtubeUrl,
    youtube_id: parsed.videoId,
    source_type: parsed.sourceType,
    title: existingVideo?.title ?? null,
    thumbnail_url: existingVideo?.thumbnail_url ?? null,
    description_text: existingVideo?.description_text ?? null,
    caption_text: existingVideo?.caption_text ?? null,
    source_language: existingVideo?.source_language ?? null,
  });

  const extraction = await createQueuedExtraction(video.id);
  scheduleExtractionJob({
    extractionId: extraction.id,
    videoRowId: video.id,
    youtubeUrl,
    videoId: parsed.videoId,
    sourceType: parsed.sourceType,
  });

  return {
    extractionId: extraction.id,
    status: extraction.status,
    stage: extraction.stage,
    cached: false,
  };
}

export async function getExtraction(extractionId: string) {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('extractions')
    .select('*')
    .eq('id', extractionId)
    .maybeSingle();

  assertNoSupabaseError(error);

  if (data?.status === 'completed') {
    await getRecipeIdByExtractionId(data.id);
  }

  return data;
}
