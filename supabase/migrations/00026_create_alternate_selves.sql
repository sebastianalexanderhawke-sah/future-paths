-- Alternate selves: generated output from a past crossroad and selected alternative path.

create table public.alternate_selves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  past_crossroad_id uuid not null references public.past_crossroads (id) on delete cascade,
  selected_alternative_path_id uuid not null references public.past_alternative_paths (id) on delete cascade,
  name text not null,
  road_not_taken text not null,
  alternate_self text not null,
  what_remains_available text not null,
  themes jsonb not null default '[]'::jsonb,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (past_crossroad_id)
);

create index alternate_selves_user_status_idx
  on public.alternate_selves (user_id, status);

create index alternate_selves_past_crossroad_id_idx
  on public.alternate_selves (past_crossroad_id);
