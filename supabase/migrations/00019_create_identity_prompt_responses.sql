-- Identity prompt responses: one answer per prompt.

create table public.identity_prompt_responses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  prompt_id uuid not null references public.identity_prompts (id) on delete cascade,
  response text not null,
  themes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (prompt_id)
);

create index identity_prompt_responses_user_id_idx
  on public.identity_prompt_responses (user_id);

create index identity_prompt_responses_prompt_id_idx
  on public.identity_prompt_responses (prompt_id);
