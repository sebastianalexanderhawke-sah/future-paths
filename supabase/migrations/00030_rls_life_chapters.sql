-- Row Level Security for life chapters and evidence.

alter table public.life_chapters enable row level security;

create policy "Users can view own life chapters"
  on public.life_chapters
  for select
  using (auth.uid() = user_id);

create policy "Users can create own life chapters"
  on public.life_chapters
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own life chapters"
  on public.life_chapters
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own life chapters"
  on public.life_chapters
  for delete
  using (auth.uid() = user_id);

alter table public.life_chapter_evidence enable row level security;

create policy "Users can view own life chapter evidence"
  on public.life_chapter_evidence
  for select
  using (auth.uid() = user_id);

create policy "Users can create own life chapter evidence"
  on public.life_chapter_evidence
  for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own life chapter evidence"
  on public.life_chapter_evidence
  for delete
  using (auth.uid() = user_id);
