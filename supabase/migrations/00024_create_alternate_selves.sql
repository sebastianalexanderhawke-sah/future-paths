-- Alternate selves: past-oriented unrealized identity trajectories.

create table public.alternate_selves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  decision_title text not null,
  chosen_path text not null,
  unchosen_path text not null,
  name text not null,
  road_not_taken text not null,
  alternate_self text not null,
  what_remains_available text not null,
  themes jsonb not null default '[]'::jsonb,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index alternate_selves_user_status_idx
  on public.alternate_selves (user_id, status);

create index alternate_selves_user_created_at_idx
  on public.alternate_selves (user_id, created_at desc);
