-- Current self: one updatable identity summary per user.

create table public.current_self (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  headline text not null,
  summary text not null,
  themes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create index current_self_user_id_idx on public.current_self (user_id);
