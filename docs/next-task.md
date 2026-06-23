# Next Task

## Current task

Improve Future Self naming quality. Trajectory differentiation (no
near-duplicate futures within a batch) is now code-enforced (see
`future-selves-status.md`). The next gap of the same kind is naming: the
prompt (`FUTURE_SELF_DISCOVER_RULES`) already specifies detailed naming
rules — under 8 words, verb/action-led phrasing, never archetypes,
personality types, or role labels (explicitly bans examples like
"Disciplined Solo Builder", "Intentional Connector") — but nothing checks
that a returned `name` actually complies. The `name` field is validated only
by the generic `tentativeTextSchema` (`src/lib/ai/schemas/shared.ts`):
trim, banned-directive-phrase sanitization, length 1-2000. There is no
word-count cap and no archetype/label detection.

## Implementation goals

* Add code-side validation/normalization for `futureSelfDraftSchema.name`
  (`src/lib/ai/schemas/future-self.ts`) that enforces the rules the prompt
  already states, rather than trusting the model to follow them:
  * Word count cap (prompt says "under 8 words").
  * Detection of disallowed archetype/personality-label phrasing (the
    prompt's own ban list is a starting point) so violations are caught
    deterministically, not just discouraged.
* Decide a deterministic handling policy for a name that fails validation
  (e.g. reject the draft, truncate/reformat the name, or fall back to a
  theme-derived name) — must be code-driven, not a second AI call.

## Constraints

* Do not change trajectory scoring, percentage normalization, continuity
  matching, fading, `why_changed`, or the new duplicate-detection logic in
  `future-selves.ts` — all out of scope here.
* Do not change the AI/code responsibility split: `name` stays AI-authored
  content; only the validation/enforcement of its quality is code-owned.
* Do not rewrite `FUTURE_SELF_DISCOVER_RULES` wholesale — the rules
  themselves are already correct and validated by prior work; this task
  enforces them, it doesn't redefine them.
* No new runtime dependencies.

## Success criteria

* A test where a draft's name violates the word-count cap or matches a
  banned archetype/label pattern is caught and handled deterministically by
  code, not silently passed through.
* A test where a compliant name passes through unchanged.
* Existing `future-selves.test.ts` and schema tests still pass unmodified.
* `npm run build` (or project's equivalent typecheck/build command) passes
  with no new errors.
