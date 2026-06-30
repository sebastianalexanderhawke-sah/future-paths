-- Add Identity Platform columns to future_selves.
-- All columns are nullable so existing rows are unaffected.

alter table public.future_selves
  add column if not exists identity_id text,
  add column if not exists confidence smallint check (confidence >= 0 and confidence <= 100),
  add column if not exists dimension_breakdown jsonb,
  add column if not exists supporting_observations jsonb,
  add column if not exists supporting_situations jsonb,
  add column if not exists opposing_observations jsonb;

-- One active future per identity per user in the new pipeline.
-- NULL identity_id rows (legacy AI-discovered futures) are excluded.
create unique index if not exists future_selves_user_identity_idx
  on public.future_selves (user_id, identity_id)
  where identity_id is not null;
