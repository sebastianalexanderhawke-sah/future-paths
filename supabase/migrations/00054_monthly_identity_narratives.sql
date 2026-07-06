-- Persisted monthly identity narratives.
--
-- The Timeline previously regenerated every month's AI narrative on every
-- page view. Narratives are grounded solely in that month's evidence, so a
-- settled historical month's narrative never changes — regenerating it per
-- view was pure latency and AI cost. This table stores one narrative draft
-- per (user, month): historical months are written once and never
-- regenerated; the current month is regenerated only when its evidence
-- fingerprint changes.
--
-- Only the AI-authored fields are stored (headline and the two opening
-- paragraphs). Everything deterministic — how-you-changed bullets,
-- comparisons, evidence counts — is still computed at read time from the
-- evolution data, so stored narratives can never drift from the evidence
-- they sit next to.

create table if not exists public.monthly_identity_narratives (
  id                    uuid        primary key default gen_random_uuid(),
  user_id               uuid        not null references auth.users(id) on delete cascade,
  -- Month label as produced by monthly-identity-evolution (e.g. "June 2026").
  month                 text        not null,
  headline              text        not null,
  opening_beginning     text        not null default '',
  opening_end           text        not null default '',
  -- Deterministic summary of the evidence this narrative was generated from;
  -- a mismatch on the current month is what triggers regeneration.
  evidence_fingerprint  text        not null,
  generated_at          timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create unique index if not exists monthly_identity_narratives_user_month_idx
  on public.monthly_identity_narratives (user_id, month);

alter table public.monthly_identity_narratives enable row level security;

create policy "Users can read own monthly narratives"
  on public.monthly_identity_narratives for select
  using (auth.uid() = user_id);

create policy "Users can insert own monthly narratives"
  on public.monthly_identity_narratives for insert
  with check (auth.uid() = user_id);

create policy "Users can update own monthly narratives"
  on public.monthly_identity_narratives for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own monthly narratives"
  on public.monthly_identity_narratives for delete
  using (auth.uid() = user_id);
