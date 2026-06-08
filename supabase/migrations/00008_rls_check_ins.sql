-- Row Level Security for check_ins (append-only for users).

alter table public.check_ins enable row level security;

create policy "Users can view own check-ins"
  on public.check_ins
  for select
  using (auth.uid() = user_id);

create policy "Users can create own check-ins"
  on public.check_ins
  for insert
  with check (auth.uid() = user_id);
