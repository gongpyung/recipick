export type ExtractionStatus =
  | 'queued'
  | 'processing'
  | 'completed'
  | 'failed';

export type ExtractionStage =
  | 'validating_url'
  | 'fetching_metadata'
  | 'fetching_captions'
  | 'structuring'
  | 'normalizing'
  | 'saving';

export type VideoSourceType = 'video' | 'shorts';

export interface VideoRecord {
  id: string;
  youtube_url: string;
  youtube_id: string;
  source_type: VideoSourceType;
  title: string | null;
  thumbnail_url: string | null;
  description_text: string | null;
  caption_text: string | null;
  source_language: string | null;
  created_at: string;
}

export interface ExtractionRecord {
  id: string;
  video_id: string;
  status: ExtractionStatus;
  stage: ExtractionStage | null;
  model_name: string | null;
  extractor_version: string | null;
  raw_output_json: Record<string, unknown> | null;
  error_code: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}
