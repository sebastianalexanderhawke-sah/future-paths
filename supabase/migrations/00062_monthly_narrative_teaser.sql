-- Timeline "Becoming" phase: a dedicated one-sentence cover teaser.
--
-- The chapter cover previously borrowed the first sentence of
-- opening_beginning as its teaser, which meant the opening portraits could
-- never be rendered inside the chapter without repeating the cover. With a
-- dedicated teaser, "The Person You Were Becoming" can show the full
-- beginning/end identity portraits while the cover keeps its own line.
--
-- Empty string marks a legacy row (generated before the teaser existed).
-- Historical months still never regenerate: legacy rows keep the old
-- rendering (first-sentence teaser + deterministic movement bullets), and
-- only the current month upgrades to the new format on its next generation.

alter table public.monthly_identity_narratives
  add column if not exists teaser text not null default '';
