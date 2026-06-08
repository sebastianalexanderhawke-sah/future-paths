-- Row Level Security for Phase 1 tables.

alter table public.profiles enable row level security;
alter table public.moments enable row level security;
alter table public.paths enable row level security;
alter table public.timeline_events enable row level security;

-- profiles

create policy "Users can view own profile"
  on public.profiles
  for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- moments

create policy "Users can view own moments"
  on public.moments
  for select
  using (auth.uid() = user_id);

create policy "Users can create own moments"
  on public.moments
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own moments"
  on public.moments
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own moments"
  on public.moments
  for delete
  using (auth.uid() = user_id);

-- paths

create policy "Users can view own paths"
  on public.paths
  for select
  using (auth.uid() = user_id);

create policy "Users can create own paths"
  on public.paths
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own unlocked paths"
  on public.paths
  for update
  using (auth.uid() = user_id and is_locked = false)
  with check (auth.uid() = user_id and is_locked = false);

create policy "Users can delete own unlocked paths"
  on public.paths
  for delete
  using (auth.uid() = user_id and is_locked = false);

-- timeline_events (append-only for users)

create policy "Users can view own timeline events"
  on public.timeline_events
  for select
  using (auth.uid() = user_id);

create policy "Users can create own timeline events"
  on public.timeline_events
  for insert
  with check (auth.uid() = user_id);
