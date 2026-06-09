-- Row Level Security for identity_updates (append-only for users).

alter table public.identity_updates enable row level security;

create policy "Users can view own identity updates"
  on public.identity_updates
  for select
  using (auth.uid() = user_id);

create policy "Users can create own identity updates"
  on public.identity_updates
  for insert
  with check (auth.uid() = user_id);
