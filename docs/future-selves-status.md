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
* Path responsiveness implemented in `src/lib/future-selves.ts` — now in its
  third iteration (flat weight override -> decaying additive boost ->
  overlap-proportional boost):
  * The single most-recently-chosen path (by `chosen_at`, across the user's
    full path history, recomputed fresh every generation via
    `mostRecentChosenAt()`) keeps the normal `EVIDENCE_WEIGHTS.chosen_path`
    (2) base contribution — identical architecture to every other historical
    chosen path — and additionally earns a separate
    `MOST_RECENT_CHOSEN_PATH_RECENCY_BOOST` (18) on top, scaled by two
    independent factors:
    * `recencyBoostDecay()`: a fast, independent 3-day half-life
      (`0.5 ^ (ageDays / 3)`), much quicker than the standard 7/30/90-day
      `EVIDENCE_DECAY_TIERS` — the boost is meant to be predictive and
      short-lived, naturally overtaken by check-ins/identity updates (which
      use the slower, never-zero decay) as they accumulate.
    * Overlap ratio: `countThemeOverlap(futureThemes, path.themes) /
      path.themes.length` — the boost scales with how much of the chosen
      path's theme set this future actually shares, not a boolean "shares
      at least one theme" gate.
  * Rationale for the overlap scaling: live investigation against real
    account data (see "things already investigated" below) found the
    boolean gate applied an *identical* flat boost to every active future
    sharing any theme with the chosen path — which, with real multi-theme
    active futures, is routinely most or all of them, so the equal bonus
    canceled out entirely under `normalizeToHundred` and produced zero
    visible movement, contradicting the feature's purpose.
  * Covered by tests in `future-selves.test.ts`: a fresh single-theme path
    still produces the original 62/38 split (no regression from the decay
    rework); the same path 10 days later produces a much smaller 53/47
    split (fast decay); a 35-day-old path is overtaken by two same-day
    check-ins on a competing future (decay eventually loses to confirmatory
    evidence); and four futures with 3/3, 2/3, 1/3, and 0/3 theme overlap
    with a fresh 3-theme path produce strictly ordered, distinct
    percentages (47/33/19/1) instead of an equal split.
* Newest chosen path exposed to Future Self generation as a dedicated
  context field (`src/lib/ai/context/slices.ts`, `builder.ts`, `truncate.ts`):
  * `mostRecentChosenPath` (description, themes, chosen_at, future_shift) is
    a top-level field on `IdentityContextBundle`, populated in
    `loadFutureSelfContext()` from the newest row (`order by chosen_at desc`)
    of the same chosen-paths query that already feeds `pathThemes` — no
    duplicate query, no duplicate history in the prompt.
  * `enforceContextLimits`/`enforceTotalJsonLimit` truncate and preserve it
    the same way `chosenPath` already is, so it survives total-JSON-size
    reduction instead of being silently dropped under a large context.
  * `FUTURE_SELF_DISCOVER_RULES` now explicitly tells the model to treat
    `mostRecentChosenPath` as a potential source of divergence and reflect
    that in summary/prediction/why_changed, rather than describing only
    older accumulated patterns.
  * This closes the gap where scoring already reacted to a newly chosen path
    (path responsiveness, above) but the generated narrative had no
    dedicated signal to notice or talk about that same decision.
  * Covered by new tests in `src/lib/ai/context/builder.test.ts` and
    `truncate.test.ts`.
* Every non-zero percentage change now produces a user-visible explanation,
  not just ones where the model happened to populate `why_changed`
  (`src/lib/future-self-trend.ts`, `src/components/futures/future-card.tsx`):
  * `getFutureSelfExplanation()` is the single source of disclosure text: it
    returns `null` when `delta === 0` (nothing to disclose), the AI-authored
    `why_changed` verbatim whenever it's non-empty (always preferred), and
    otherwise a deterministic fallback chosen purely by delta direction.
  * Fallback strings are static and evidence-free — they describe *relative*
    movement (this trajectory vs. others), never fabricate specific evidence
    the model didn't supply. Decrease: "This trajectory did not gain new
    supporting evidence, but other trajectories strengthened more strongly,
    reducing its relative likelihood." Increase: "This trajectory gained
    relative likelihood because recent evidence aligned more closely with
    this direction than with competing trajectories."
  * `FutureCard`'s disclosure (expand arrow + "Why it changed" body) now
    renders whenever `delta !== 0`, full stop — previously it additionally
    required `why_changed !== ""`, which left percentage moves with no AI
    explanation displaying an arrow with nothing behind it.
  * No changes to trajectory scoring, normalization, continuity matching,
    deduplication, generation prompts, or schemas — this is purely a
    presentation-layer fix to when/what the disclosure shows.
  * Covered by new tests in `future-self-trend.test.ts`.
* Code-side Future Self naming enforcement implemented in
  `src/lib/future-selves.ts`:
  * `isValidFutureSelfName()` rejects names over 8 words and the
    "[Adjective(s)] [Identity Noun]" archetype/personality-label shape
    (`looksLikeIdentityLabel()`, via closed `IDENTITY_LABEL_ADJECTIVES` and
    `IDENTITY_LABEL_NOUNS` sets) — a structural check, not a literal
    deny-list, so it generalizes past the prompt's own banned examples
    ("Disciplined Solo Builder", "Intentional Connector").
  * `rewriteFutureSelfName()` deterministically replaces an invalid name
    with a trajectory-style phrase keyed off the draft's first theme
    (`THEME_TRAJECTORY_NAME`) — no AI call, no fabricated evidence.
  * Applied only inside the `computed` map in `generateFutureSelves()`,
    after `dedupeDrafts()`/`matchDraftsToExisting()` have already run on the
    model's original name, so it has zero effect on those decisions.
  * Known limitation, confirmed against real account data: only the insert
    path writes `name` to the database — both update paths intentionally
    omit it (continuity is supposed to keep the existing name). A
    previously-stored invalid name on a continuity-matched row is therefore
    never retroactively corrected by this enforcement; it only prevents
    *new* invalid names from being written.
  * Covered by new tests in `future-selves.test.ts`.
* Dominant-theme-pair distinctness implemented in `src/lib/future-selves.ts`:
  * `dominantThemePairKey()` takes a draft's first two themes (or its single
    theme, if only one exists), order-independent.
  * `enforceDominantThemePairDistinctness()` runs right after
    `dedupeDrafts()`, pairwise/greedy over a single batch: drafts sharing a
    dominant pair collapse to the one with the higher
    `computeTrajectoryStrength()` raw score, ties keep the earlier-indexed
    draft, and no replacement future is generated.
  * Closes a gap `dedupeDrafts()` leaves open: two drafts can have
    different-enough wording to fail its near-duplicate Jaccard gates while
    still leading with the same two themes and feeling redundant to users.
  * Known limitation, confirmed against real account data: this only ever
    evaluates freshly generated AI drafts before continuity matching — it
    never re-evaluates the persisted active set as a whole, so a
    dominant-pair collision that existed in storage before this enforcement
    shipped is not retroactively resolved; it can only be resolved by one
    side later fading from lack of evidence.
  * Covered by new tests in `future-selves.test.ts`.

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
* Path responsiveness is an additive boost layered on top of the unchanged
  base `EVIDENCE_WEIGHTS.chosen_path` contribution, not a weight override and
  not a global weight change — only the single newest chosen path ever
  receives `MOST_RECENT_CHOSEN_PATH_RECENCY_BOOST`, scaled by its own fast
  decay and by theme-overlap ratio with the receiving future. This design
  evolved twice after confirming numerically (against real account data)
  that (1) scaling `EVIDENCE_WEIGHTS.chosen_path` itself doesn't produce
  visible movement, and (2) a boolean "shares any theme" gate applies an
  equal boost to every future that qualifies, which collapses to no net
  movement once more than one active future overlaps the chosen path — see
  "things already investigated" below.

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
* Whether a flat increase to `EVIDENCE_WEIGHTS.chosen_path` (tried up to 10x
  in simulation) would make a new path choice visible: rejected — confirmed
  numerically to barely move displayed percentages, because the same scaling
  factor inflates the entire historical chosen-path sum, not just the new
  contribution. The fix targets only the single newest path instead.
* Whether the most-recent-path boost should gate on a boolean "shares any
  theme with the future" check: rejected — confirmed against real account
  data that this applies an identical flat boost to every future sharing
  any theme with the chosen path (commonly most/all active futures at
  once), producing zero net percentage movement after normalization.
  Replaced with overlap-ratio scaling
  (`countThemeOverlap(futureThemes, path.themes) / path.themes.length`).

## Things we should not re-investigate

* The evidence-weight ordering (reality_shift > pattern_strengthened >
  theme_emerging > chosen_path > check_in) — relative ordering matters, exact
  numbers don't.
* The decay tier boundaries (7/30/90 days) and the 0.25 floor.
* The continuity-matching gate (theme overlap >= 2, similarity as tiebreaker
  only, never an independent gate).
