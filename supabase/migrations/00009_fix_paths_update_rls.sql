-- Fix paths UPDATE RLS: allow locking (is_locked false → true) while blocking updates to locked paths.

drop policy if exists "Users can update own unlocked paths" on public.paths;

create policy "Users can update own unlocked paths"
  on public.paths
  for update
  using (auth.uid() = user_id and is_locked = false)
  with check (auth.uid() = user_id);
