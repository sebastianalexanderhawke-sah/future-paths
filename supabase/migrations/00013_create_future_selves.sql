-- Future selves: identity trajectories emerging from theme patterns.

create table public.future_selves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  description text not null,
  stage text not null check (
    stage in ('possible', 'emerging', 'future_self')
  ),
  momentum smallint not null default 0 check (momentum >= 0 and momentum <= 100),
  themes jsonb not null default '[]'::jsonb,
  status text not null default 'active' check (status in ('active', 'faded')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

create index future_selves_user_status_momentum_idx
  on public.future_selves (user_id, status, momentum desc);

create index future_selves_user_id_idx
  on public.future_selves (user_id);
