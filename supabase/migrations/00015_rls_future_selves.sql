-- Row Level Security for future_selves and future_self_events.

alter table public.future_selves enable row level security;

create policy "Users can view own future selves"
  on public.future_selves
  for select
  using (auth.uid() = user_id);

create policy "Users can create own future selves"
  on public.future_selves
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own future selves"
  on public.future_selves
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter table public.future_self_events enable row level security;

create policy "Users can view own future self events"
  on public.future_self_events
  for select
  using (auth.uid() = user_id);

create policy "Users can create own future self events"
  on public.future_self_events
  for insert
  with check (auth.uid() = user_id);
