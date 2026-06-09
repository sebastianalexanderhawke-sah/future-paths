-- Future self events: append-only momentum and lifecycle changes.

create table public.future_self_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  future_self_id uuid not null references public.future_selves (id) on delete cascade,
  event_type text not null check (
    event_type in ('emerged', 'grew', 'faded', 'returned')
  ),
  momentum_before smallint check (momentum_before >= 0 and momentum_before <= 100),
  momentum_after smallint not null check (momentum_after >= 0 and momentum_after <= 100),
  summary text,
  created_at timestamptz not null default now()
);

create index future_self_events_user_created_at_idx
  on public.future_self_events (user_id, created_at desc);

create index future_self_events_future_self_id_idx
  on public.future_self_events (future_self_id);
