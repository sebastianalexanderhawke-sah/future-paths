-- Situation polarity: which approved themes a moment could strengthen
-- (opportunity) versus weaken (risk), generated in the same AI call that
-- produces its candidate paths rather than a separate request.

alter table public.moments add column opportunity_themes jsonb not null default '[]'::jsonb;
alter table public.moments add column risk_themes jsonb not null default '[]'::jsonb;
