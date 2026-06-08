-- Paths: possible directions generated from a moment.

create table public.paths (
  id uuid primary key default gen_random_uuid(),
  moment_id uuid not null references public.moments (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  description text not null,
  benefits jsonb not null default '[]'::jsonb,
  consequences jsonb not null default '[]'::jsonb,
  future_shift text not null,
  themes jsonb not null default '[]'::jsonb,
  sort_order smallint not null check (sort_order >= 0 and sort_order <= 4),
  is_chosen boolean not null default false,
  is_locked boolean not null default false,
  chosen_at timestamptz,
  created_at timestamptz not null default now(),
  constraint paths_chosen_at_consistency check (
    (is_chosen = true and chosen_at is not null)
    or (is_chosen = false and chosen_at is null)
  )
);

create unique index paths_one_chosen_per_moment_idx
  on public.paths (moment_id)
  where (is_chosen = true);

create index paths_moment_id_idx on public.paths (moment_id);
create index paths_user_id_idx on public.paths (user_id);
create index paths_moment_id_is_chosen_idx on public.paths (moment_id, is_chosen);
