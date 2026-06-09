-- Row Level Security for past crossroads, alternative paths, and alternate selves.

alter table public.past_crossroads enable row level security;

create policy "Users can view own past crossroads"
  on public.past_crossroads
  for select
  using (auth.uid() = user_id);

create policy "Users can create own past crossroads"
  on public.past_crossroads
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own past crossroads"
  on public.past_crossroads
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter table public.past_alternative_paths enable row level security;

create policy "Users can view own past alternative paths"
  on public.past_alternative_paths
  for select
  using (auth.uid() = user_id);

create policy "Users can create own past alternative paths"
  on public.past_alternative_paths
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own past alternative paths"
  on public.past_alternative_paths
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own past alternative paths"
  on public.past_alternative_paths
  for delete
  using (auth.uid() = user_id);

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
