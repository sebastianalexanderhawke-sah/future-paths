export const MONTHLY_IDENTITY_NARRATIVE_REQUIRED_FIELDS = `Every narrative object MUST include ALL of these fields (never omit any):
- month (string — copy the month field from the matching context.monthlyIdentityEvolution entry exactly)
- headline (string)
- opening_beginning (string)
- opening_end (string)
- why_this_changed (string)`;

export const MONTHLY_IDENTITY_NARRATIVE_PURPOSE = `Timeline answers a different question than the rest of this product. Current Self answers "Who am I today?" Future Selves answers "Who might I become?" Timeline answers "How have I changed?"

Write about identity, not events. Assume the reader already remembers what happened this month — they lived it. Your job is not to remind them of it. After reading, they should understand "How am I different now than I was earlier this month?" — not "What happened this month?" If a sentence would be unchanged by removing it and reading the underlying moment log instead, it isn't doing its job.

Do not retell the month's events or decisions unless absolutely necessary to make an identity shift legible — and even then, never more than a passing reference, never a list. Every field should explain how repeated experiences changed thinking, behavior, priorities, confidence, relationships, or decision-making, not what the experiences were.`;

export const MONTHLY_IDENTITY_NARRATIVE_HEADLINE_RULES = `Headline rules:
- One short sentence describing the month's biggest identity change.
- Observational, not motivational: state what changed, don't cheer for it.
- Name the shift in disposition or behavior, never the situation it happened in.
- Good: "Decisions started being made alone, without waiting for input." "Stability took priority over preference, even when that meant turning down better options."
- Bad: "A month of incredible growth!" (motivational) / "Applied to twelve jobs and moved apartments." (lists events, not a change)`;

export const MONTHLY_IDENTITY_NARRATIVE_OPENING_RULES = `Opening rules — two short paragraphs, exactly two:
- The first paragraph MUST begin with the exact words "At the beginning of the month".
- The second paragraph MUST begin with the exact words "By the end of the month".
- Each paragraph is 1-3 sentences. Together they should be readable in a few seconds.
- Compare mindset or behavior, not events — describe identity, habits, confidence, relationships, priorities, or decision-making. Never describe what happened, where, or about what.
- The reader already remembers the situations involved. Do not name them (no "the move", "the job search", "that friendship") — describe only how the person's approach, confidence, or priorities differed from the start of the month to the end.
- Good: "At the beginning of the month, decisions still waited for someone else's input. By the end of the month, calls were being made alone, before anyone had weighed in."
- Bad: "At the beginning of the month, you applied for two jobs. By the end of the month, you had three interviews scheduled." (lists events)
- Also bad: "At the beginning of the month, where to move and whether to repair an old friendship were both unresolved. By the end of the month, both had been decided." (names the situations instead of the underlying behavioral shift, even though no event is narrated in detail)
- Do not repeat the same idea in both paragraphs — the second should show movement away from the first, not restate it.
- This pair of paragraphs and the deterministic "How you changed" bullets (rendered separately, not visible to you) cover different ground: the bullets name the specific shifts, so use this opening for the broader before/after arc instead of listing the same shifts again.`;

export const MONTHLY_IDENTITY_NARRATIVE_WHY_CHANGED_RULES = `why_this_changed rules:
- One short paragraph (2-4 sentences) explaining the recurring behavior that caused the change — a pattern that repeated across the month, not a sequence of events.
- Synthesize across chosen paths, identity updates, check-ins, and future-trajectory movement in context.monthlyIdentityEvolution, but the output must describe the underlying pattern, not the evidence. Do not list, enumerate, or summarize what was done — if you find yourself writing "X, Y, and Z reinforced...", rewrite it without naming X, Y, or Z.
- Never mention percentages or numeric scores.
- Never name a theme (e.g. "Courage", "Independence") — describe the underlying behavior instead.
- Never mention internal product concepts like "Future Self," "Identity Update," "check-in," or "path."
- Good: "A pattern emerged of acting before certainty rather than waiting for it, repeating across unrelated situations rather than tied to any one decision. That consistency suggests a shift in default behavior, not a one-time reaction to a single moment."
- Bad: "Repeated decisions to broaden your job search, adapt to financial pressure, and consider relocation reinforced a habit of acting before certainty." (lists the individual decisions instead of naming only the pattern)
- Also bad: "Your Future Self percentage for 'Trades comfort for courage' rose 36%, and three Identity Updates referenced Courage." (numbers, theme names, internal concepts)`;

export const MONTHLY_IDENTITY_NARRATIVE_STYLE_RULES = `Global style rules, apply to every field:
- The month can read as positive, negative, or mixed — never force a positive spin onto evidence that doesn't support one. A month of avoidance, withdrawal, or strain is told as plainly as a month of progress.
- Avoid motivational language ("you've got this", "keep pushing", "amazing progress").
- Avoid therapy language ("hold space", "process your feelings", "honor your journey").
- Avoid generic self-help phrases ("level up", "unlock your potential", "lean into it", "embrace the journey", "growth mindset").
- Keep the tone observational, like a narrator describing a pattern, not a coach responding to it.
- Use simple, plain English. Short sentences over long ones.
- Every statement must be directly supported by the evidence in context.monthlyIdentityEvolution for that month. Never invent an event, decision, or outcome that isn't there — but support means "consistent with," not "restated from."
- Do not repeat the same idea across headline, opening_beginning, opening_end, and why_this_changed — each should add something the others don't.`;

export const MONTHLY_IDENTITY_NARRATIVE_DATA_PRIORITY = `Data priority when synthesizing each month — in this order:
1. identityChangeEvidence.identityUpdates are the most direct evidence of identity shifts.
2. identityChangeEvidence.checkIns show the lived, in-the-moment version of the same shifts — use them to ground the opening paragraphs in how mindset/behavior actually felt at the time.
3. futureShifts (identityChangeEvidence.futureShifts) show where that movement accumulated — use the direction, never the number.
4. chosenPaths are supporting evidence — the concrete decisions behind the pattern, not the pattern itself.
5. dominantThemes are the lowest-priority signal and must never be named directly in your output — they're for your own orientation only.

All of this evidence exists so you can infer the underlying behavioral pattern — not so you can recount it. Themes, decisions, and the "How you changed" bullets are computed deterministically outside this prompt — never re-derive or restate them as your output. Your only job is the month/headline/opening_beginning/opening_end/why_this_changed fields.`;
