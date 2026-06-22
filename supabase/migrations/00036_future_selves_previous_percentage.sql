-- Future selves: persist the previous generation's percentage so trend
-- direction and delta can be computed at read time, without redesigning
-- the existing percentage/evidence_strength model.

alter table public.future_selves
  add column previous_percentage smallint
  check (previous_percentage >= 0 and previous_percentage <= 100);
