-- Row Level Security for forecasts table.

alter table public.forecasts enable row level security;

create policy "Users can view own forecasts"
  on public.forecasts for select
  using (auth.uid() = user_id);

create policy "Users can create own forecasts"
  on public.forecasts for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own forecasts"
  on public.forecasts for delete
  using (auth.uid() = user_id);
