export type ExtractionStatus = 'queued' | 'processing' | 'completed' | 'failed';

export type ExtractionStage =
  | 'validating_url'
  | 'fetching_metadata'
  | 'fetching_captions'
  | 'structuring'
  | 'normalizing'
  | 'saving';

export type VideoSourceType = 'video' | 'shorts';

export type RecipeConfidence = 'high' | 'medium' | 'low';
export type WarningSeverity = 'info' | 'warning' | 'error';
export type SourceUsage =
  | 'title'
  | 'description'
  | 'captions'
  | 'asr'
  | 'ocr'
  | 'vision';

export type RecipeWarningCode =
  | 'MISSING_QUANTITY'
  | 'MISSING_BASE_SERVINGS'
  | 'LOW_CONFIDENCE_INGREDIENT'
  | 'LOW_CONFIDENCE_STEP'
  | 'MULTIPLE_DISHES_DETECTED'
  | 'NON_RECIPE_VIDEO'
  | 'INSUFFICIENT_SOURCE_TEXT'
  | 'OCR_REQUIRED_BUT_DISABLED';

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

export interface RecipeSource {
  youtubeUrl: string;
  videoId: string;
  sourceType: VideoSourceType;
  language: string | null;
}

export interface RecipeIngredient {
  name: string;
  amount: number | null;
  amountText: string | null;
  unit: string | null;
  scalable: boolean;
  note: string | null;
  confidence: RecipeConfidence;
}

export interface RecipeStep {
  stepNo: number;
  text: string;
  note: string | null;
  confidence: RecipeConfidence;
}

export interface RecipeWarning {
  code: RecipeWarningCode;
  message: string;
  severity: WarningSeverity;
}

export interface RecipeExtractionMeta {
  usedSources?: SourceUsage[];
  model?: string | null;
  extractorVersion?: string | null;
}

export interface StructuredRecipe {
  title: string;
  source: RecipeSource;
  baseServings: number | null;
  summary: string | null;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  tips: string[];
  warnings: RecipeWarning[];
  confidence: RecipeConfidence;
  extractionMeta?: RecipeExtractionMeta;
}

export interface RecipeRecord {
  id: string;
  video_id: string;
  extraction_id: string;
  title: string;
  summary: string | null;
  base_servings: number | null;
  confidence: RecipeConfidence;
  tips_json: string[];
  is_user_edited: boolean;
  created_at: string;
  updated_at: string;
}

export interface IngredientRecord {
  id: string;
  recipe_id: string;
  sort_order: number;
  name: string;
  amount_value: number | null;
  amount_text: string | null;
  unit: string | null;
  scalable: boolean;
  note: string | null;
  confidence: RecipeConfidence;
}

export interface StepRecord {
  id: string;
  recipe_id: string;
  step_no: number;
  text: string;
  note: string | null;
  confidence: RecipeConfidence;
}

export interface WarningRecord {
  id: string;
  recipe_id: string;
  code: RecipeWarningCode;
  message: string;
  severity: WarningSeverity;
}

export interface PersistedRecipe extends StructuredRecipe {
  id: string;
  videoId: string;
  extractionId: string;
  isUserEdited: boolean;
  updatedAt: string;
}
