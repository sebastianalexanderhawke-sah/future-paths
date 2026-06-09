-- Row Level Security for current_self.

alter table public.current_self enable row level security;

create policy "Users can view own current self"
  on public.current_self
  for select
  using (auth.uid() = user_id);

create policy "Users can create own current self"
  on public.current_self
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own current self"
  on public.current_self
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
