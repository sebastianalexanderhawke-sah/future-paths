-- Row Level Security for identity prompts and responses.

alter table public.identity_prompts enable row level security;

create policy "Users can view own identity prompts"
  on public.identity_prompts
  for select
  using (auth.uid() = user_id);

create policy "Users can create own identity prompts"
  on public.identity_prompts
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own identity prompts"
  on public.identity_prompts
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter table public.identity_prompt_responses enable row level security;

create policy "Users can view own identity prompt responses"
  on public.identity_prompt_responses
  for select
  using (auth.uid() = user_id);

create policy "Users can create own identity prompt responses"
  on public.identity_prompt_responses
  for insert
  with check (auth.uid() = user_id);
