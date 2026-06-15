-- Forecasts: persists generated forecast output per moment.
-- Supports initial forecasts and subsequent regenerations triggered by check-ins.

create table public.forecasts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  moment_id uuid not null references public.moments (id) on delete cascade,
  path_id uuid references public.paths (id) on delete set null,
  sections_json jsonb not null,
  situation_summary text,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index forecasts_user_id_idx on public.forecasts (user_id);
create index forecasts_moment_id_idx on public.forecasts (moment_id);
create index forecasts_moment_id_generated_at_idx
  on public.forecasts (moment_id, generated_at desc);
