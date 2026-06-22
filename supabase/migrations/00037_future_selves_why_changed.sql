-- Future selves: persist a short, human-readable explanation of the most
-- recent percentage movement, written by the model from the same evidence
-- it already sees — so the UI can answer "what happened" without exposing
-- internal scoring concepts (themes, evidence tiers, scores).

alter table public.future_selves
  add column why_changed text not null default '';
