create extension if not exists pgcrypto;

create table if not exists public.videos (
  id uuid primary key default gen_random_uuid(),
  youtube_url text not null,
  youtube_id text not null unique,
  source_type text not null check (source_type in ('video', 'shorts')),
  title text,
  thumbnail_url text,
  description_text text,
  caption_text text,
  source_language text,
  created_at timestamptz not null default now()
);

create index if not exists idx_videos_youtube_id
  on public.videos (youtube_id);

create table if not exists public.extractions (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.videos (id),
  status text not null default 'queued'
    check (status in ('queued', 'processing', 'completed', 'failed')),
  stage text
    check (
      stage is null
      or stage in (
        'validating_url',
        'fetching_metadata',
        'fetching_captions',
        'structuring',
        'normalizing',
        'saving'
      )
    ),
  model_name text,
  extractor_version text,
  raw_output_json jsonb,
  error_code text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_extractions_video_id
  on public.extractions (video_id);

create index if not exists idx_extractions_status
  on public.extractions (status);

create index if not exists idx_extractions_video_status
  on public.extractions (video_id, status);
