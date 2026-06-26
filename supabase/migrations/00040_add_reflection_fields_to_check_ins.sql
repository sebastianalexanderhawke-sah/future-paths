-- Add reflection question and answer columns to check-ins.
-- reflection_question: AI-generated question set after a meaningful check-in.
-- reflection_answer:   user-typed answer; NULL means unanswered.

alter table public.check_ins
  add column if not exists reflection_question text,
  add column if not exists reflection_answer text;
