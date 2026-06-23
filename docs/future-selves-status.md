# Future Selves — Status

## Completed architecture changes

* Stage/momentum model replaced by relative-likelihood model: each generation
  run produces 2-4 future selves whose `percentage` values sum to 100
  (`00035_future_selves_evidence_model.sql`).
* `previous_percentage` column added to support trend tracking without
  redesigning the percentage model (`00036_future_selves_previous_percentage.sql`).
* Evidence-driven trajectory-strength scoring implemented in
  `src/lib/future-selves.ts`:
  * `computeTrajectoryStrength()` sums weighted, recency-decayed evidence
    (identity updates, check-ins, chosen paths) that shares a theme with the
    draft.
  * `EVIDENCE_WEIGHTS`: `reality_shift` 8, `pattern_strengthened` 5,
    `theme_emerging` 3, `chosen_path` 2, `check_in` 1.
  * `evidenceDecay()`: full weight under 7 days, 0.75x under 30 days, 0.5x
    under 90 days, 0.25x floor beyond that (never reaches zero).
  * `normalizeToHundred()` proportionally rescales raw scores to sum to 100,
    preserving ordering and relative differences (min 1 per active future,
    drift corrected onto the largest value).
* Continuity matching (`matchDraftsToExisting`) carries identity/baseline
  across generations when the model renames a trajectory: exact name match
  first, then theme-overlap >= 2 with summary-similarity as a tiebreaker,
  assigned greedily as one-to-one.
* AI/code responsibility split is enforced: AI supplies name, summary,
  benefits, consequences, prediction, themes, evidence_strength, why_changed;
  code derives trajectory score, percentage, and trend (`previous_percentage`
  vs `percentage`) entirely outside the model's output.
* Regression test added (`future-selves.test.ts`) guarding against the
  25/25/25/25 equilibrium bug: four drafts with differentiated but
  overlapping theme evidence must produce four distinct percentages.
* Trajectory differentiation enforcement implemented in
  `src/lib/future-selves.ts`:
  * `isNearDuplicateTrajectory()` gates on theme-set Jaccard similarity
    >= 0.6, then confirms with name-token or summary-token Jaccard
    similarity >= 0.5 (either one).
  * `dedupeDrafts()` runs pairwise over a single batch (before continuity
    matching), keeping the draft with the higher `computeTrajectoryStrength()`
    raw score and dropping its near-duplicate twin; ties keep the
    earlier-indexed draft. Dropping a draft can shrink the batch — this is
    expected, not an error.
  * This was previously prompt-only (`FUTURE_SELF_DISCOVER_RULES`); it is
    now also code-enforced, matching the AI/code split already established
    for percentage.
  * Covered by a new test in `future-selves.test.ts` asserting a
    near-duplicate pair collapses to one inserted future while an unrelated
    third draft survives untouched.

## Known issues

* None open.

## Important design decisions

* Trajectory strength is **cumulative across all matching evidence**, not
  just the single strongest item — a `reality_shift` should outweigh several
  check-ins, but several check-ins should still outweigh one
  `theme_emerging`. This is why the weights are deliberately spread out.
* Trajectory strength is the **pre-normalization raw score**, not a +/- delta
  applied to the previous percentage. An additive delta on a fixed 0-100
  scale can't represent open-ended cumulative history (it either goes stale
  on a bounded lookback or saturates the clamp on an unbounded one) — this
  was explicitly rejected in favor of the current model.
* `previous_percentage` is **always snapshotted** on every active match, even
  when nothing changed — trend tracking compares "as of last generation," not
  "as of last change."
* Only an `evidence_strength`/status transition (not a percentage tick alone)
  marks Current Self stale — a percentage move with no strength change is
  too noisy a signal on its own.
* A zero-draft model response is treated as a failed generation, not a
  legitimate "nothing changed" signal — existing active futures are left
  untouched rather than faded, since the two cases are indistinguishable from
  the caller's side.
* Duplicate detection uses Jaccard similarity on theme sets, not raw overlap
  count — draft theme lists are short (1-3 entries), so a shared count of 2
  means something very different for a 2-theme list than a 5-theme list.
  Theme overlap is the gate; name/summary similarity only confirms it, the
  same "overlap gate, similarity confirms" pattern as continuity matching.

## Things already investigated (do not re-investigate)

* Root cause of the 25/25/25/25 equal-percentage bug: confirmed to be
  trajectories entering normalization with equal or near-equal raw values,
  not a normalization bug itself.
* Whether percentage should derive from a delta on `previous_percentage`:
  rejected, see design decisions above.
* Whether AI output should influence the percentage directly: rejected — AI
  fields and code-owned fields are now explicitly separated.
* Whether trajectory/name differentiation could be left to prompt
  instructions alone: rejected — now code-enforced via `dedupeDrafts()`.

## Things we should not re-investigate

* The evidence-weight ordering (reality_shift > pattern_strengthened >
  theme_emerging > chosen_path > check_in) — relative ordering matters, exact
  numbers don't.
* The decay tier boundaries (7/30/90 days) and the 0.25 floor.
* The continuity-matching gate (theme overlap >= 2, similarity as tiebreaker
  only, never an independent gate).
