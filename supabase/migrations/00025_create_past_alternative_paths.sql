-- Past alternative paths: plausible directions that existed at the time.

create table public.past_alternative_paths (
  id uuid primary key default gen_random_uuid(),
  past_crossroad_id uuid not null references public.past_crossroads (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  description text not null,
  themes jsonb not null default '[]'::jsonb,
  possible_future_shift text not null,
  sort_order smallint not null check (sort_order >= 0 and sort_order <= 4),
  is_selected boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index past_alternative_paths_one_selected_idx
  on public.past_alternative_paths (past_crossroad_id)
  where (is_selected = true);

create index past_alternative_paths_crossroad_id_idx
  on public.past_alternative_paths (past_crossroad_id);

create index past_alternative_paths_user_id_idx
  on public.past_alternative_paths (user_id);
