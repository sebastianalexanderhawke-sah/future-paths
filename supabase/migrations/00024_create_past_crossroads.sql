-- Past crossroads: significant decisions that already happened.

create table public.past_crossroads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  what_happened text not null,
  why_chosen text,
  life_stage text,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index past_crossroads_user_status_idx
  on public.past_crossroads (user_id, status);

create index past_crossroads_user_created_at_idx
  on public.past_crossroads (user_id, created_at desc);
