-- Timeline events: immutable identity history.

create table public.timeline_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  event_type text not null check (
    event_type in ('moment_created', 'paths_generated', 'path_chosen')
  ),
  reference_type text not null check (reference_type in ('moment', 'path')),
  reference_id uuid not null,
  title text not null,
  summary text,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index timeline_events_user_occurred_at_idx
  on public.timeline_events (user_id, occurred_at desc);

create index timeline_events_user_event_type_idx
  on public.timeline_events (user_id, event_type);

create index timeline_events_reference_idx
  on public.timeline_events (reference_type, reference_id);
