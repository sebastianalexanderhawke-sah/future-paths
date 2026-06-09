-- Contradiction events: append-only lifecycle audit trail.

create table public.contradiction_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  contradiction_id uuid not null references public.contradictions (id) on delete cascade,
  event_type text not null check (
    event_type in ('detected', 'intensified', 'softened', 'resolved', 'faded')
  ),
  intensity_before smallint check (intensity_before >= 0 and intensity_before <= 100),
  intensity_after smallint check (intensity_after >= 0 and intensity_after <= 100),
  summary text,
  created_at timestamptz not null default now()
);

create index contradiction_events_user_created_at_idx
  on public.contradiction_events (user_id, created_at desc);

create index contradiction_events_contradiction_id_idx
  on public.contradiction_events (contradiction_id);
