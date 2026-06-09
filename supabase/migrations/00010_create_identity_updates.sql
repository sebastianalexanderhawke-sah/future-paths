-- Identity updates: curated meaningful identity shifts.

create table public.identity_updates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  moment_id uuid not null references public.moments (id) on delete cascade,
  check_in_id uuid not null references public.check_ins (id) on delete cascade,
  update_type text not null check (
    update_type in ('reality_shift', 'theme_emerging', 'pattern_strengthened')
  ),
  title text not null,
  summary text not null,
  themes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index identity_updates_user_created_at_idx
  on public.identity_updates (user_id, created_at desc);

create index identity_updates_moment_id_idx
  on public.identity_updates (moment_id);

create index identity_updates_check_in_id_idx
  on public.identity_updates (check_in_id);
