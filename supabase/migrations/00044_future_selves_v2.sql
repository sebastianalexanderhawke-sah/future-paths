-- Future Selves v2: behavioral identity architecture.
-- Renames benefit/consequence framing to growth_opportunity/blind_spot,
-- replaces prediction with likely_evolution, renames why_changed to why_emerging,
-- and adds core_behaviors and behavioral_evidence for behavioral pattern tracking.

ALTER TABLE public.future_selves
  ADD COLUMN IF NOT EXISTS core_behaviors       text[]  NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS behavioral_evidence  text[]  NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS growth_opportunities text[]  NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS blind_spots          text[]  NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS likely_evolution     text    NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS why_emerging         text    NOT NULL DEFAULT '';

-- Preserve existing data under the new field names.
-- benefits and consequences are jsonb arrays; unpack them to text[].
UPDATE public.future_selves SET
  growth_opportunities = ARRAY(SELECT jsonb_array_elements_text(benefits)),
  blind_spots          = ARRAY(SELECT jsonb_array_elements_text(consequences)),
  likely_evolution     = prediction,
  why_emerging         = why_changed;

-- Drop the old columns.
ALTER TABLE public.future_selves
  DROP COLUMN IF EXISTS benefits,
  DROP COLUMN IF EXISTS consequences,
  DROP COLUMN IF EXISTS prediction,
  DROP COLUMN IF EXISTS why_changed;
