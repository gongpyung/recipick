create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.videos (id),
  extraction_id uuid not null unique references public.extractions (id),
  title text not null,
  summary text,
  base_servings numeric,
  confidence text not null check (confidence in ('high', 'medium', 'low')),
  tips_json jsonb not null default '[]'::jsonb,
  is_user_edited boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_recipes_video_id
  on public.recipes (video_id);

create table if not exists public.ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  sort_order integer not null,
  name text not null,
  amount_value numeric,
  amount_text text,
  unit text,
  scalable boolean not null default true,
  note text,
  confidence text not null check (confidence in ('high', 'medium', 'low'))
);

create index if not exists idx_ingredients_recipe_id
  on public.ingredients (recipe_id);

create table if not exists public.steps (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  step_no integer not null,
  text text not null,
  note text,
  confidence text not null check (confidence in ('high', 'medium', 'low'))
);

create index if not exists idx_steps_recipe_id
  on public.steps (recipe_id);

create table if not exists public.warnings (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  code text not null,
  message text not null,
  severity text not null check (severity in ('info', 'warning', 'error'))
);

create index if not exists idx_warnings_recipe_id
  on public.warnings (recipe_id);
