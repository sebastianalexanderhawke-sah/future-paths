-- Supporting index for per-user, newest-first check-in reads.
--
-- The AI context builders (current_self, future_self) and the reflection
-- queue now apply ORDER BY created_at DESC LIMIT n directly in SQL instead of
-- fetching a user's full check-in history and truncating in memory. Those
-- queries filter by user_id and sort by created_at; this composite index lets
-- the database return the newest n rows without scanning or sorting the
-- user's whole history.

create index if not exists check_ins_user_created_at_idx
  on public.check_ins (user_id, created_at desc);
