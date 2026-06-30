-- Immutable behavioral observation ledger.
-- Each row is one atomic behavioral observation extracted from a completed situation.
-- Rows are never updated or deleted — this is an append-only accounting ledger.
-- Dimension scores are computed on demand in application code by running
-- all observations through the static signal→dimension map in behavior-signals.ts.
CREATE TABLE IF NOT EXISTS public.behavior_observations (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  moment_id     uuid        NOT NULL REFERENCES public.moments(id) ON DELETE CASCADE,
  observation   text        NOT NULL,
  signals       text[]      NOT NULL DEFAULT '{}',
  source_type   text        NOT NULL DEFAULT 'situation_complete',
  extracted_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS behavior_observations_user_id_idx
  ON public.behavior_observations (user_id);

CREATE INDEX IF NOT EXISTS behavior_observations_moment_id_idx
  ON public.behavior_observations (moment_id);

ALTER TABLE public.behavior_observations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own behavior observations"
  ON public.behavior_observations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own behavior observations"
  ON public.behavior_observations FOR INSERT
  WITH CHECK (auth.uid() = user_id);
