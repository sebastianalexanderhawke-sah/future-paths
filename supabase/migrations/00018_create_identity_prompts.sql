-- Identity prompts: user-scoped reflection questions.

create table public.identity_prompts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  prompt_type text not null check (
    prompt_type in ('theme_reflection', 'future_alignment', 'pattern_probe')
  ),
  question text not null,
  context text,
  themes jsonb not null default '[]'::jsonb,
  status text not null default 'pending' check (
    status in ('pending', 'answered', 'dismissed')
  ),
  created_at timestamptz not null default now()
);

create index identity_prompts_user_id_idx on public.identity_prompts (user_id);
create index identity_prompts_user_status_idx on public.identity_prompts (user_id, status);
