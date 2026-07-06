-- Partial index for the unanswered-reflection summary.
--
-- getUnansweredReflectionSummary runs on every protected page (it feeds the
-- sidebar badge and the "Needs Attention" card). It previously scanned every
-- check-in that ever received a reflection question; it now issues a count
-- and an oldest-pending lookup, both of which this index answers directly.
-- The predicate matches the query exactly: a question exists and the answer
-- is missing (NULL or empty string — both mean unanswered).

create index if not exists check_ins_unanswered_reflection_idx
  on public.check_ins (user_id, created_at)
  where reflection_question is not null
    and (reflection_answer is null or reflection_answer = '');
