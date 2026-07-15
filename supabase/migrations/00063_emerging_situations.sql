-- Emerging Situations: Reflection can suggest that a situation's recent
-- check-ins/reflections have become a different story than the one the
-- situation originally began with.
--
-- The suggestion is stored on the moment itself — at most one per situation:
--   emerging_situation: jsonb { title, description, detected_at,
--   source_check_in_id } written by the detection pipeline only when the
--   AI reports high confidence. Never created automatically as a situation;
--   it only prefills the creation flow, which the user edits and submits.
--
--   emerging_situation_dismissed_at: set when the user chooses "Dismiss".
--   A dismissed situation is never re-evaluated (detection also skips it,
--   so no AI quota is spent on a suggestion the user has already declined).

alter table public.moments
  add column if not exists emerging_situation jsonb,
  add column if not exists emerging_situation_dismissed_at timestamptz;
