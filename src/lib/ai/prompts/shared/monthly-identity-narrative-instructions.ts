export const MONTHLY_IDENTITY_NARRATIVE_REQUIRED_FIELDS = `Every narrative object MUST include ALL of these fields (never omit any):
- month (string — copy the month field from the matching context.monthlyIdentityEvolution entry exactly)
- headline (string)
- opening_beginning (string)
- opening_end (string)`;

export const MONTHLY_IDENTITY_NARRATIVE_PURPOSE = `A monthly chapter is not a summary of the month. It is a story about who the user was at the beginning of the month and who they had become by the end. The month is the bridge between those two versions of the person.

Timeline exists to answer one question: "How did I become who I am?" Not what happened. Not what was decided. But who this person was, and who they became.

Use the month's evidence — situations, check-ins, identity shifts — to paint a portrait of the person at two moments in time. Everything in the evidence exists to describe the person, not the events.

Someone reading several months in sequence should be able to watch themselves becoming someone new over time. Each chapter is one step in that becoming.`;

export const MONTHLY_IDENTITY_NARRATIVE_HEADLINE_RULES = `Headline rules:
- One short sentence naming what changed in the person by the end of the month.
- Observational, not motivational — state the shift plainly.
- Name the change in the person, never the situation it happened in.
- Good: "Decisions started being made alone, without waiting for input." / "Stability took priority over preference, even when that meant turning down better options."
- Bad: "A month of incredible growth!" (motivational) / "Applied to twelve jobs and moved apartments." (lists events, not the person)`;

export const MONTHLY_IDENTITY_NARRATIVE_OPENING_RULES = `Narrative rules — two paragraphs:

opening_beginning answers: "Who was this person when the month began?"

Use the month's situations to describe the person — not to describe the situations. Draw a portrait from the evidence: the emotional state they were in, the weight they were carrying, what they were holding onto or avoiding. Ground the portrait in the actual month. A person who is uncertain about a move, anxious about starting something, holding onto a relationship, waiting on work, or avoiding a difficult decision — that is a person. Write about that person.

Good opening_beginning examples (style only — write from the actual evidence, not these words):
  "You were still waiting. Not for anything specific — just waiting for the point where it would feel safe to move."
  "You'd been holding something loosely for months. You knew what it was. You weren't ready to name it."
  "The decision had already been made somewhere underneath everything. You just hadn't said it out loud yet."
  "There was a version of this you'd been putting off. The month began with it still unresolved, still sitting in the background of every other thing."

opening_end answers: "Who had this person become by the end of the month?"

Again, ground this in what the situations showed about the person. Show what became different about them — not just that they acted, but what their actions revealed about who they were becoming. The reader should feel they are meeting a different version of the same person.

Good opening_end examples (style only — write from the actual evidence, not these words):
  "By the end, you weren't waiting anymore. Not because the path had gotten clearer — it hadn't — but because you'd stopped needing it to be."
  "Something had settled. Not resolution exactly, but a kind of acceptance that the uncertainty was yours to carry, and that carrying it didn't mean you were stuck."
  "You said it out loud. And saying it turned out to be the thing — not the decision itself, but the moment it stopped being internal."
  "You were still in the same situation. But you were different inside it. That was the change."

Together, the two paragraphs should feel like meeting someone at the beginning of a chapter and finding them again at the end. The reader should feel the distance between those two people.

Each paragraph is 2–4 sentences. Do not open opening_beginning with "At the beginning of the month." Write freely, in a biographical voice.

Banned words and phrases — any of these in the output means it failed:
  patterns / themes / suggests / indicates / appears / reinforces / identity / trajectory
  "This suggests" / "It appears" / "This reflects" / "What made this month distinct"
  "It may have" / "Situational" / "Default way of operating" / "This month brought"
  "One might say" / "It seems" / "These choices" / "This decision" / "A pattern emerged"
  "At the beginning of the month" / "By the end of the month"`;

export const MONTHLY_IDENTITY_NARRATIVE_STYLE_RULES = `Global style rules, apply to every field:
- Write like an author, not an analyst. Observe and describe; do not interpret or explain.
- The month can read as positive, negative, or mixed — never force a positive spin onto evidence that doesn't support one. A month of avoidance, withdrawal, or strain is told as plainly as a month of progress.
- Avoid motivational language ("you've got this", "keep pushing", "amazing progress").
- Avoid therapy language ("hold space", "process your feelings", "honor your journey").
- Avoid generic self-help phrases ("level up", "unlock your potential", "lean into it", "embrace the journey", "growth mindset").
- Use simple, plain English. Short sentences over long ones.
- Every statement must be directly supported by the evidence in context.monthlyIdentityEvolution for that month. Never invent an event, decision, or outcome that isn't there — but support means "consistent with," not "restated from."
- Do not repeat the same idea across headline, opening_beginning, and opening_end — each should add something the others don't.`;

export const MONTHLY_IDENTITY_NARRATIVE_DATA_PRIORITY = `Read the evidence to understand the person — not to recount the events:

1. identityChangeEvidence.identityUpdates — these name what actually shifted in how the person operates. Read them to understand who this person was becoming.
2. identityChangeEvidence.checkIns — these show what the person was experiencing in the moment. Use them to understand the emotional texture of the month: what they were uncertain about, what they were pushing through, what they were putting off.
3. futureShifts (identityChangeEvidence.futureShifts) — use the direction to understand what movement looked like. Never name the number.
4. chosenPaths — the decisions made. Use them to understand what the person's actions revealed about who they were, not to describe what they decided.
5. dominantThemes — orientation only. Never name a theme in your output.

All of this exists so you can describe the person, not the month. The goal is two portraits — before and after — separated by the evidence of change. Your only output is month, headline, opening_beginning, and opening_end.`;
