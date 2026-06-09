-- Row Level Security for alternate_selves.

alter table public.alternate_selves enable row level security;

create policy "Users can view own alternate selves"
  on public.alternate_selves
  for select
  using (auth.uid() = user_id);

create policy "Users can create own alternate selves"
  on public.alternate_selves
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own alternate selves"
  on public.alternate_selves
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
