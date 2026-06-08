-- Moments: meaningful decisions and crossroads.

create table public.moments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  description text,
  current_understanding text,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index moments_user_id_idx on public.moments (user_id);
create index moments_user_id_status_idx on public.moments (user_id, status);
create index moments_created_at_idx on public.moments (created_at desc);

create trigger moments_set_updated_at
  before update on public.moments
  for each row
  execute function public.set_updated_at();
