import type {
  ExtractionRecord,
  ExtractionStage,
  ExtractionStatus,
  IngredientRecord,
  RecipeConfidence,
  RecipeRecord,
  StepRecord,
  VideoRecord,
  VideoSourceType,
  WarningRecord,
} from '@/lib/extraction/types';

export interface Database {
  public: {
    Tables: {
      videos: {
        Row: VideoRecord;
        Insert: {
          id?: string;
          youtube_url: string;
          youtube_id: string;
          source_type: VideoSourceType;
          title?: string | null;
          thumbnail_url?: string | null;
          description_text?: string | null;
          caption_text?: string | null;
          source_language?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          youtube_url?: string;
          youtube_id?: string;
          source_type?: VideoSourceType;
          title?: string | null;
          thumbnail_url?: string | null;
          description_text?: string | null;
          caption_text?: string | null;
          source_language?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      extractions: {
        Row: ExtractionRecord;
        Insert: {
          id?: string;
          video_id: string;
          status?: ExtractionStatus;
          stage?: ExtractionStage | null;
          model_name?: string | null;
          extractor_version?: string | null;
          raw_output_json?: ExtractionRecord['raw_output_json'];
          error_code?: string | null;
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          video_id?: string;
          status?: ExtractionStatus;
          stage?: ExtractionStage | null;
          model_name?: string | null;
          extractor_version?: string | null;
          raw_output_json?: ExtractionRecord['raw_output_json'];
          error_code?: string | null;
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'extractions_video_id_fkey';
            columns: ['video_id'];
            isOneToOne: false;
            referencedRelation: 'videos';
            referencedColumns: ['id'];
          },
        ];
      };
      recipes: {
        Row: RecipeRecord;
        Insert: {
          id?: string;
          video_id: string;
          extraction_id: string;
          title: string;
          summary?: string | null;
          base_servings?: number | null;
          confidence: RecipeConfidence;
          tips_json?: string[];
          is_user_edited?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          video_id?: string;
          extraction_id?: string;
          title?: string;
          summary?: string | null;
          base_servings?: number | null;
          confidence?: RecipeConfidence;
          tips_json?: string[];
          is_user_edited?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'recipes_extraction_id_fkey';
            columns: ['extraction_id'];
            isOneToOne: true;
            referencedRelation: 'extractions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'recipes_video_id_fkey';
            columns: ['video_id'];
            isOneToOne: false;
            referencedRelation: 'videos';
            referencedColumns: ['id'];
          },
        ];
      };
      ingredients: {
        Row: IngredientRecord;
        Insert: {
          id?: string;
          recipe_id: string;
          sort_order: number;
          name: string;
          amount_value?: number | null;
          amount_text?: string | null;
          unit?: string | null;
          scalable?: boolean;
          note?: string | null;
          confidence: RecipeConfidence;
        };
        Update: {
          id?: string;
          recipe_id?: string;
          sort_order?: number;
          name?: string;
          amount_value?: number | null;
          amount_text?: string | null;
          unit?: string | null;
          scalable?: boolean;
          note?: string | null;
          confidence?: RecipeConfidence;
        };
        Relationships: [
          {
            foreignKeyName: 'ingredients_recipe_id_fkey';
            columns: ['recipe_id'];
            isOneToOne: false;
            referencedRelation: 'recipes';
            referencedColumns: ['id'];
          },
        ];
      };
      steps: {
        Row: StepRecord;
        Insert: {
          id?: string;
          recipe_id: string;
          step_no: number;
          text: string;
          note?: string | null;
          confidence: RecipeConfidence;
        };
        Update: {
          id?: string;
          recipe_id?: string;
          step_no?: number;
          text?: string;
          note?: string | null;
          confidence?: RecipeConfidence;
        };
        Relationships: [
          {
            foreignKeyName: 'steps_recipe_id_fkey';
            columns: ['recipe_id'];
            isOneToOne: false;
            referencedRelation: 'recipes';
            referencedColumns: ['id'];
          },
        ];
      };
      warnings: {
        Row: WarningRecord;
        Insert: {
          id?: string;
          recipe_id: string;
          code: WarningRecord['code'];
          message: string;
          severity: WarningRecord['severity'];
        };
        Update: {
          id?: string;
          recipe_id?: string;
          code?: WarningRecord['code'];
          message?: string;
          severity?: WarningRecord['severity'];
        };
        Relationships: [
          {
            foreignKeyName: 'warnings_recipe_id_fkey';
            columns: ['recipe_id'];
            isOneToOne: false;
            referencedRelation: 'recipes';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

type PublicSchema = Database['public'];

export type VideoRow = PublicSchema['Tables']['videos']['Row'];
export type VideoInsert = PublicSchema['Tables']['videos']['Insert'];
export type VideoUpdate = PublicSchema['Tables']['videos']['Update'];

export type ExtractionRow = PublicSchema['Tables']['extractions']['Row'];
export type ExtractionInsert = PublicSchema['Tables']['extractions']['Insert'];
export type ExtractionUpdate = PublicSchema['Tables']['extractions']['Update'];

export type RecipeRow = PublicSchema['Tables']['recipes']['Row'];
export type RecipeInsert = PublicSchema['Tables']['recipes']['Insert'];
export type RecipeUpdate = PublicSchema['Tables']['recipes']['Update'];

export type IngredientRow = PublicSchema['Tables']['ingredients']['Row'];
export type IngredientInsert = PublicSchema['Tables']['ingredients']['Insert'];
export type IngredientUpdate = PublicSchema['Tables']['ingredients']['Update'];

export type StepRow = PublicSchema['Tables']['steps']['Row'];
export type StepInsert = PublicSchema['Tables']['steps']['Insert'];
export type StepUpdate = PublicSchema['Tables']['steps']['Update'];

export type WarningRow = PublicSchema['Tables']['warnings']['Row'];
export type WarningInsert = PublicSchema['Tables']['warnings']['Insert'];
export type WarningUpdate = PublicSchema['Tables']['warnings']['Update'];
