-- Allow users to update their own reflection answers.
-- check_ins was append-only at creation; reflection answer adds a legitimate
-- user-editable field, so a scoped update policy is now required.

create policy "Users can update own check-ins"
  on public.check_ins
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
