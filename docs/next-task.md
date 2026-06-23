# Next Task

## Current task

Evaluate Future Self naming quality using real generations. Trajectory
differentiation and path responsiveness are both done (see
`future-selves-status.md`). Before building code-side naming enforcement
(word-count cap, archetype/label detection — the previously planned next
step), first evaluate whether real model output actually violates the
prompt's naming rules (`FUTURE_SELF_DISCOVER_RULES` in
`src/lib/ai/prompts/shared/forecast-generation-instructions.ts`) often enough
to justify it. This is an evaluation pass, not an implementation pass.

## Implementation goals

* Run real `generateFutureSelves()` generations (not the mocked test stub)
  against representative accounts/evidence and collect the resulting
  `name` values.
* Check each generated name against the prompt's own stated rules: under 8
  words, verb/action-led phrasing, no archetypes/personality
  types/role labels (e.g. the prompt's own banned examples: "Disciplined
  Solo Builder", "Intentional Connector").
* Quantify how often real generations violate these rules, and characterize
  the failure modes actually seen (too many words? archetype-style naming?
  something not anticipated by the existing rules?).
* Produce a recommendation: is code-side enforcement worth building, and if
  so, which specific rule(s) need it most.

## Constraints

* Do not change trajectory scoring, percentage normalization, continuity
  matching, fading, `why_changed`, or duplicate-detection logic in
  `future-selves.ts` — all out of scope here.
* Do not modify `FUTURE_SELF_DISCOVER_RULES` or any other prompt as part of
  this task — this is observation, not a prompt-tuning pass.
* Do not implement the word-count/archetype enforcement itself yet — that
  was the prior plan, but it's now gated on this evaluation's findings.
* No new runtime dependencies.

## Success criteria

* A concrete sample of real generated names (not mocked/synthetic) checked
  against each naming rule individually.
* A clear count or rate of rule violations, by rule.
* A written recommendation on whether/what to enforce in code next.
