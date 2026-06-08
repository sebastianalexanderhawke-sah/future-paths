-- Check-ins: reality layer connecting decisions to outcomes.

create table public.check_ins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  moment_id uuid not null references public.moments (id) on delete cascade,
  path_id uuid not null references public.paths (id) on delete cascade,
  reflection text not null,
  reality_summary text not null,
  theme_changes jsonb not null default '[]'::jsonb,
  identity_impact text not null,
  created_at timestamptz not null default now()
);

create index check_ins_user_id_idx on public.check_ins (user_id);
create index check_ins_moment_id_idx on public.check_ins (moment_id);
create index check_ins_moment_id_created_at_idx
  on public.check_ins (moment_id, created_at desc);
