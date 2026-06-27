-- Backfill "Confirmed." placeholder values with the accepted prediction text.
--
-- The old workflow stored the literal string 'Confirmed.' in reflection_answer
-- when a user accepted the AI's prediction, instead of copying identity_impact.
-- The current workflow stores whatever the user submits (textarea pre-filled
-- with identity_impact), so new rows are never affected.
--
-- This update only targets exact 'Confirmed.' matches, leaving all user-written
-- answers untouched. Rows with a NULL identity_impact are skipped.

update public.check_ins
set reflection_answer = identity_impact
where reflection_answer = 'Confirmed.'
  and identity_impact is not null
  and identity_impact <> '';
