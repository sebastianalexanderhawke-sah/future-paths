-- Contradictions: surfaced identity tensions between competing signals.

create table public.contradictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  contradiction_type text not null check (
    contradiction_type in ('current_vs_future', 'dual_future', 'stated_vs_lived')
  ),
  title text not null,
  summary text not null,
  pole_a text not null,
  pole_b text not null,
  themes jsonb not null default '[]'::jsonb,
  intensity smallint not null default 50 check (intensity >= 0 and intensity <= 100),
  status text not null default 'active' check (
    status in ('active', 'softened', 'resolved', 'faded')
  ),
  source_refs jsonb not null default '{}'::jsonb,
  signature text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, signature)
);

create index contradictions_user_status_idx
  on public.contradictions (user_id, status);

create index contradictions_user_created_at_idx
  on public.contradictions (user_id, created_at desc);
