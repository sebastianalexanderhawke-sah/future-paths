-- Row Level Security for contradictions and contradiction events.

alter table public.contradictions enable row level security;

create policy "Users can view own contradictions"
  on public.contradictions
  for select
  using (auth.uid() = user_id);

create policy "Users can create own contradictions"
  on public.contradictions
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own contradictions"
  on public.contradictions
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter table public.contradiction_events enable row level security;

create policy "Users can view own contradiction events"
  on public.contradiction_events
  for select
  using (auth.uid() = user_id);

create policy "Users can create own contradiction events"
  on public.contradiction_events
  for insert
  with check (auth.uid() = user_id);
