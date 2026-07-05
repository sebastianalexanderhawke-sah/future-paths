-- Narrative provenance for Future Selves.
--
-- A Future Self's narrative (why_emerging, growth_opportunities, blind_spots,
-- likely_evolution) is written once when the identity first emerges and is
-- otherwise stable. Two failure modes made that policy silently wrong:
--
--   1. If the explanation AI call failed on the first-emergence run, the
--      hard-coded fallback text was persisted — and because a row then
--      existed, it was never regenerated. Generic boilerplate became the
--      identity's permanent narrative.
--   2. A narrative written at Emerging evidence keeps its "the evidence so
--      far is limited" framing forever, even after the identity's live
--      numbers climb to Strong — the card contradicts itself.
--
-- narrative_source records whether the stored narrative came from real AI
-- generation ('ai') or the fallback ('fallback'); fallback narratives are
-- repaired on the next generation run. narrative_evidence_strength records
-- the evidence tier the narrative was written at, so the application can
-- regenerate exactly when the tier has since increased — and never otherwise.

alter table public.future_selves
  add column if not exists narrative_source text not null default 'ai'
    check (narrative_source in ('ai', 'fallback')),
  add column if not exists narrative_evidence_strength text
    check (narrative_evidence_strength in ('Emerging', 'Moderate', 'Strong'));

-- Backfill: fallback narratives are the two exact why_emerging constants the
-- application has always used (src/lib/ai/explain-identity.ts,
-- fallbackExplanation). Matching them identifies every fallback-authored row
-- precisely, so existing users' boilerplate narratives get repaired on their
-- next generation run.
update public.future_selves
   set narrative_source = 'fallback'
 where why_emerging in (
   'This identity is beginning to emerge from a small number of specific behavioral choices. The pattern is real, but it has not yet repeated across enough situations to call it established.',
   'This identity pattern is appearing across your recent situations and behavioral choices.'
 );

-- Best available estimate for rows written before this column existed: assume
-- the narrative was written at the row's current evidence tier. This never
-- triggers a spurious regeneration (the tiers are equal), and future tier
-- increases regenerate as intended.
update public.future_selves
   set narrative_evidence_strength = evidence_strength
 where narrative_evidence_strength is null
   and evidence_strength is not null;
