# Next Task

## Current task

Evaluate Future Self naming quality and trajectory distinctness using real
generations. Scoring (trajectory strength, percentage, path responsiveness),
narrative context (newest chosen path exposure), and percentage-movement
disclosure (every non-zero delta now always has an explanation, AI-authored
or deterministic fallback) are all done (see `future-selves-status.md`).
Before building any further code-side enforcement, evaluate how real model
output actually behaves across two axes:

1. Naming quality against `FUTURE_SELF_DISCOVER_RULES`'s stated rules
   (under 8 words, verb/action-led phrasing, no archetypes/personality
   types/role labels — e.g. the prompt's own banned examples: "Disciplined
   Solo Builder", "Intentional Connector").
2. Trajectory distinctness in practice: now that `mostRecentChosenPath` is a
   dedicated signal and `dedupeDrafts()` removes near-duplicates within a
   batch, do real generations actually produce meaningfully distinct
   trajectories that respond to the newest path, or do they still drift
   toward generic/overlapping framing despite the code-side guardrails?

This is an evaluation pass, not an implementation pass.

## Implementation goals

* Run real `generateFutureSelves()` generations (not the mocked test stub)
  against representative accounts/evidence and collect the resulting drafts
  (name, summary, themes, why_changed).
* Check each generated name against the prompt's naming rules individually.
* Check whether trajectories that share themes with a newly chosen path
  actually reflect that path in their narrative (summary/why_changed), per
  the new `mostRecentChosenPath` prompt rule.
* Quantify violation/failure rates for both axes, and characterize the
  failure modes actually seen (too many words? archetype-style naming?
  narrative ignoring the newest path despite the new context field?
  near-duplicates slipping past the 0.6/0.5 similarity thresholds?).
* Produce a recommendation: is further code-side enforcement worth building
  for either axis, and if so, which specific rule(s)/threshold(s) need it.

## Constraints

* Do not change trajectory scoring, percentage normalization, continuity
  matching, fading, or duplicate-detection logic in `future-selves.ts` — all
  out of scope here.
* Do not modify `FUTURE_SELF_DISCOVER_RULES`, the `mostRecentChosenPath`
  context wiring, or any other prompt/context code as part of this task —
  this is observation, not a tuning pass.
* Do not implement naming enforcement or stricter dedup thresholds yet —
  that's gated on this evaluation's findings.
* No new runtime dependencies.

## Success criteria

* A concrete sample of real generated drafts (not mocked/synthetic) checked
  against the naming rules and against narrative responsiveness to
  `mostRecentChosenPath`.
* A clear count or rate of violations/failures, by category.
* A written recommendation on whether/what to enforce in code next.
