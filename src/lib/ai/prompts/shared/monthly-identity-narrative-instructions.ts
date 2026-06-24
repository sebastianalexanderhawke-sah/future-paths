export const MONTHLY_IDENTITY_NARRATIVE_REQUIRED_FIELDS = `Every narrative object MUST include ALL of these fields (never omit any):
- month (string — copy the month field from the matching context.monthlyIdentityEvolution entry exactly)
- title (string)
- summary (string)
- identity_changes (array, 3-5 strings)`;

export const MONTHLY_IDENTITY_NARRATIVE_TITLE_RULES = `Title rules:
- Write a short, chapter-style title (3-6 words), like a chapter heading in a memoir.
- Good examples: "Stepping Into The Unknown", "Choosing Stability Under Pressure", "Rebuilding Connection", "Acting Before Certainty", "Protecting Long-Term Goals", "Building Momentum Through Uncertainty".
- Never use: a month/date summary (e.g. "June 2026 Recap"), a generic label (e.g. "Growth Period"), a plain list of themes (e.g. "Courage And Independence"), or a literal activity description (e.g. "Applied For Jobs").`;

export const MONTHLY_IDENTITY_NARRATIVE_SUMMARY_RULES = `Summary rules:
- Write 2-4 sentences.
- Must explain: the dominant pattern this month, what changed, and what identity movement occurred.
- Write about becoming, not activity — describe the shift in who this person is turning into, not a log of what they did.
- Good: "Financial pressure forced several difficult decisions this month, but a consistent pattern emerged: action instead of waiting. Job applications expanded, follow-up became more proactive, and uncertainty was met with movement rather than hesitation. This period suggests growing comfort with acting before certainty exists."
- Bad: "This month you applied for jobs and followed up with employers." (this only restates activity, with no identity movement)`;

export const MONTHLY_IDENTITY_NARRATIVE_IDENTITY_CHANGES_RULES = `Identity changes rules — these are the most important output, read them carefully:
- Produce 3-5 bullets.
- Each bullet must describe identity evolution (a shift in disposition, comfort, willingness, or priority), never a literal action taken.
- Good: "More willing to act without certainty", "Less dependent on ideal conditions before starting", "More comfortable carrying responsibility alone", "More focused on stability than preference".
- Bad: "Applied for jobs", "Moved cities", "Sent applications" (these are activities, not identity changes — never produce bullets like this).`;

export const MONTHLY_IDENTITY_NARRATIVE_DATA_PRIORITY = `Data priority when synthesizing each month — in this order:
1. identity_changes (in context.monthlyIdentityEvolution[].identityChangeEvidence.identityUpdates) should drive the narrative — they are direct evidence of identity shifts.
2. futureShifts (context.monthlyIdentityEvolution[].identityChangeEvidence.futureShifts) explain where that identity movement accumulated — cite the future(s) that gained or lost the most.
3. chosenPaths (context.monthlyIdentityEvolution[].identityChangeEvidence.chosenPaths) are supporting evidence — the concrete decisions behind the pattern, not the pattern itself.
4. dominantThemes are the lowest-priority signal — useful for color, not the basis for the title or summary on their own.`;
