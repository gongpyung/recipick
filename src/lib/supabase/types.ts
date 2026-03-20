import type {
  ExtractionRecord,
  ExtractionStage,
  ExtractionStatus,
  VideoRecord,
  VideoSourceType,
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
