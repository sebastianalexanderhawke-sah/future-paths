# Next Task

## Current task

Add code-side enforcement of trajectory/name differentiation across the
drafts produced within a single generation run. Today this is the only
remaining structural property of a generation that is purely prompt-promised
rather than code-owned: `FUTURE_SELF_DISCOVER_RULES` tells the model to
"only generate distinct trajectories" and merge near-duplicates, but nothing
in `future-selves.ts` checks that two drafts in the same batch don't land
with near-identical names or theme sets. Percentage differentiation is
already solved and code-owned (see `future-selves-status.md`); this is the
next gap of the same kind, so it takes priority over further percentage
work.

## Implementation goals

* After a generation run produces its drafts (in `generateFutureSelves()`,
  before continuity matching), detect drafts that are too similar to each
  other — reusing the existing `countThemeOverlap` / `jaccardSimilarity`
  helpers already used for continuity matching, applied pairwise within the
  new batch instead of against existing rows.
* Decide and implement a deterministic policy for a detected near-duplicate
  pair (e.g. merge into one, drop the weaker-evidence one, or keep both but
  log/flag) — the policy must be code-driven, not left to the model's
  judgment on a retry.
* Surface this as a real safeguard, not just a prompt instruction: the model
  ignoring "avoid duplicates" should not be able to produce two
  near-identical future selves with different names.

## Constraints

* Do not reopen percentage/normalization work — that model is complete and
  tested; only revisit it if this task reveals it's genuinely broken.
* Do not change the AI/code responsibility split: name, summary, benefits,
  consequences, prediction, themes, evidence_strength, and why_changed remain
  AI-owned content; only the dedup *decision* is code-owned.
* Do not change continuity matching (`matchDraftsToExisting`) behavior for
  matching against *existing* rows — this task is scoped to within-batch
  (draft vs. draft) comparison only.
* No new runtime dependencies.

## Success criteria

* A test where a generation batch contains two drafts with identical or
  near-identical theme sets (and/or names) is handled deterministically by
  code rather than silently producing two indistinguishable active futures.
* Existing `future-selves.test.ts` tests still pass unmodified.
* `npm run build` (or project's equivalent typecheck/build command) passes
  with no new errors.
