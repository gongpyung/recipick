import type { PostgrestError } from '@supabase/supabase-js';

import { getSupabaseServerClient } from '@/lib/supabase/client';
import type {
  ExtractionInsert,
  ExtractionRow,
  ExtractionUpdate,
  VideoInsert,
  VideoRow,
} from '@/lib/supabase/types';
import type {
  ExtractionRecord,
  ExtractionStage,
  ExtractionStatus,
} from '@/lib/extraction/types';
import {
  ExtractionErrorCode,
  getExtractionErrorMessage,
  getExtractionErrorStatus,
} from '@/lib/extraction/errors';
import { parseYouTubeUrl } from '@/lib/youtube/url-parser';
import {
  fetchCaptions,
  fetchVideoMetadata,
  YouTubeApiError,
} from '@/lib/youtube/api-client';
import { cleanYouTubeText } from '@/lib/youtube/text-cleaner';

const EXTRACTION_TTL_MS = 24 * 60 * 60 * 1_000;
const PIPELINE_TIMEOUT_MS = 8_000;
const EXTRACTOR_VERSION = 'step1-foundation';

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

interface VideoQueryBuilder {
  eq(column: 'youtube_id', value: string): {
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
  upsert(values: VideoInsert, options: { onConflict: string }): VideoUpsertBuilder;
}

interface ExtractionEqBuilder {
  eq(column: 'id', value: string): Promise<{
    error: PostgrestError | null;
  }>;
}

interface ExtractionListBuilder {
  eq(column: 'video_id', value: string): {
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
  eq(column: 'id', value: string): {
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

function getSupabase() {
  return getSupabaseServerClient() as unknown as SupabaseSubset;
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
    error?.includes('지원하지 않는') ||
    error?.includes('Unsupported YouTube') ||
    error?.includes('Unsupported YouTube URL format')
  ) {
    return ExtractionErrorCode.UNSUPPORTED_URL;
  }

  return ExtractionErrorCode.INVALID_URL;
}

function mapUpstreamError(error: unknown) {
  if (error instanceof ExtractionServiceError) {
    return error;
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
      case 'METADATA_FETCH_FAILED':
      case 'CAPTIONS_FETCH_FAILED':
        return new ExtractionServiceError(
          ExtractionErrorCode.METADATA_FETCH_FAILED,
          error.message,
        );
      default:
        return new ExtractionServiceError(ExtractionErrorCode.INTERNAL_ERROR);
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

function selectReusableExtraction(extractions: ExtractionRow[]) {
  return (
    extractions.find((extraction) => isActiveStatus(extraction.status)) ??
    extractions.find(
      (extraction) =>
        extraction.status === 'completed' && isFresh(extraction.updated_at),
    ) ??
    null
  );
}

async function runPipeline(
  youtubeUrl: string,
  options?: { forceReExtract?: boolean },
) {
  const parsed = parseYouTubeUrl(youtubeUrl);

  if (!parsed.isValid || !parsed.videoId || !parsed.sourceType) {
    throw new ExtractionServiceError(mapUrlErrorToCode(parsed.error), parsed.error);
  }

  const existingVideo = await fetchExistingVideo(parsed.videoId);

  if (existingVideo && !options?.forceReExtract) {
    const reusableExtraction = selectReusableExtraction(
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

  const video = (await upsertVideo({
    youtube_url: youtubeUrl,
    youtube_id: parsed.videoId,
    source_type: parsed.sourceType,
  })) as VideoRow;

  const extraction = await createQueuedExtraction(video.id);
  const stageStartedAt = Date.now();
  const stageDurations: Partial<Record<ExtractionStage, number>> = {};
  const fetchImpl = abortableFetch(AbortSignal.timeout(PIPELINE_TIMEOUT_MS));

  try {
    await updateExtractionRecord(extraction.id, {
      status: 'processing',
      stage: 'fetching_metadata',
    });

    const metadataStartedAt = Date.now();
    const metadata = await fetchVideoMetadata(parsed.videoId, { fetchImpl });
    stageDurations.fetching_metadata = Date.now() - metadataStartedAt;

    await upsertVideo({
      id: video.id,
      youtube_url: youtubeUrl,
      youtube_id: parsed.videoId,
      source_type: parsed.sourceType,
      title: metadata.title,
      thumbnail_url: metadata.thumbnailUrl,
      description_text: metadata.description,
      source_language: metadata.language,
    });

    await updateExtractionRecord(extraction.id, {
      status: 'processing',
      stage: 'fetching_captions',
    });

    const captionsStartedAt = Date.now();
    const captions = await fetchCaptions(parsed.videoId, { fetchImpl });
    stageDurations.fetching_captions = Date.now() - captionsStartedAt;

    if (captions) {
      await upsertVideo({
        id: video.id,
        youtube_url: youtubeUrl,
        youtube_id: parsed.videoId,
        source_type: parsed.sourceType,
        caption_text: captions.text,
        source_language: captions.language ?? metadata.language,
      });
    }

    const cleanedText = cleanYouTubeText({
      title: metadata.title,
      description: metadata.description,
      captions: captions?.text,
    });

    stageDurations.structuring = Date.now() - stageStartedAt;

    await updateExtractionRecord(extraction.id, {
      status: 'processing',
      stage: 'structuring',
      raw_output_json: {
        cleanedText,
        metadata,
        captions,
        timings: stageDurations,
      },
      extractor_version: EXTRACTOR_VERSION,
    });

    return {
      extractionId: extraction.id,
      status: 'processing' as const,
      stage: 'structuring' as const,
      cached: false,
    };
  } catch (error) {
    const mappedError = mapUpstreamError(error);

    await updateExtractionRecord(extraction.id, {
      status: 'failed',
      stage: null,
      error_code: mappedError.code,
      error_message: mappedError.message,
    });

    throw mappedError;
  }
}

export async function createExtraction(
  youtubeUrl: string,
  options?: { forceReExtract?: boolean },
) {
  return runPipeline(youtubeUrl, options);
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
