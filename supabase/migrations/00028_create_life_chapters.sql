-- Life chapters: narrative periods in the user's Timeline.

create table public.life_chapters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  period_label text not null,
  starts_at date not null,
  ends_at date not null,
  summary text not null,
  themes jsonb not null default '[]'::jsonb,
  includes_current_self boolean not null default false,
  status text not null default 'active' check (status in ('active', 'archived')),
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, period_label)
);

create index life_chapters_user_status_sort_idx
  on public.life_chapters (user_id, status, sort_order);

create index life_chapters_user_created_at_idx
  on public.life_chapters (user_id, created_at desc);
