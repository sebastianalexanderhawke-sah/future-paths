export const MONTHLY_IDENTITY_NARRATIVE_REQUIRED_FIELDS = `Every narrative object MUST include ALL of these fields (never omit any):
- month (string — copy the month field from the matching context.monthlyIdentityEvolution entry exactly)
- headline (string)
- teaser (string)
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

export const MONTHLY_IDENTITY_NARRATIVE_TEASER_RULES = `Teaser rules:
- One sentence, shown on the chapter's closed cover beneath the headline.
- Its job is to make someone want to open the chapter — a line from a book's back cover, not a summary.
- It must NOT copy or lightly rephrase any sentence from opening_beginning, opening_end, or the headline: the reader sees the teaser first and the paragraphs right after, so a repeated line reads as a glitch.
- Good: "The waiting had a shape by now, and this was the month it cracked." / "Nobody else noticed anything change. That was the point."
- Bad: repeating opening_beginning's first sentence / "This month you grew a lot." (motivational summary)`;

export const MONTHLY_IDENTITY_NARRATIVE_OPENING_RULES = `Narrative rules — two short paragraphs, rendered as a "Beginning of {month} → End of {month}" comparison inside a section titled "The Person You Were Becoming":

Together the two paragraphs answer exactly one question: "How was I changing as a person?" — never "What happened this month?" Keep both simple and reflective; a reader should get through the whole section in under 30 seconds.

opening_beginning answers: "Who was this person when the month began?"

One concise paragraph, 2–4 short sentences, no more. Describe their mindset, decision-making, confidence, and beliefs as the month opened: what they trusted, what they hesitated over, what they believed about themselves. Ground it in the month's actual evidence — but describe the person the evidence reveals, never the evidence itself.

Good opening_beginning examples (style only — write from the actual evidence, not these words):
  "You were still waiting for certainty before every move. Deciding felt like something that happened to you, not something you did."
  "You didn't fully trust your own judgment yet. A choice only felt real once someone else agreed with it."
  "The month began with you protecting what was familiar. Safe and right still felt like the same thing."

opening_end answers: "Who was emerging by the end — and in what direction were they moving?"

One concise paragraph, 2–4 short sentences, no more. Describe how their mindset, confidence, or way of deciding had shifted — a direction of movement, never a finished transformation. The person is still mid-becoming; never declare the change complete. Close with one sentence describing the kind of person these decisions are gradually shaping — the direction, left open-ended, never a destination or a goal reached.

The most recent month in context is usually still in progress. Write its opening_end in the present tense — who this person is becoming right now — never as a sealed ending or a month looked back on. Completed months may speak of who the person had become by their end; the current month may not.

Good opening_end examples (style only — write from the actual evidence, not these words):
  "By the end, you were deciding sooner and explaining less. Someone is taking shape who moves first and makes sense of it after."
  "The doubt was still there, but it had stopped being in charge. You're becoming someone who can act while still unsure."
  "You had started trusting your own reasons. Little by little, these choices are shaping a person who doesn't wait for permission."

Event rules — the hard line between this section and "What Changed":
- Never name or describe specific events: jobs, applications, interviews, moves, cities, relationships, breakups, projects, purchases. Those render separately under "What Changed".
- Instead, explain what living through those experiences changed in the person: what they now believe, how they now decide, what no longer scares them, what weighs differently.
- Test every sentence: if it answers "what happened?", cut it or rewrite it as what it changed in the person.

Never reference the user's Future Selves: no future-self names, no "future self", "future you", or "the person you'll be" phrasing. The destination stays open.

Write simply: short plain sentences, no drama, no cleverness for its own sake. Do not open opening_beginning with "At the beginning of the month."

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
- Do not repeat the same idea across headline, teaser, opening_beginning, and opening_end — each should add something the others don't.`;

export const MONTHLY_IDENTITY_NARRATIVE_DATA_PRIORITY = `Read the evidence to understand the person — not to recount the events:

1. identityChangeEvidence.identityUpdates — these name what actually shifted in how the person operates. Read them to understand who this person was becoming.
2. identityChangeEvidence.checkIns — these show what the person was experiencing in the moment. Use them to understand the emotional texture of the month: what they were uncertain about, what they were pushing through, what they were putting off.
3. futureShifts (identityChangeEvidence.futureShifts) — use the direction to understand what movement looked like. Never name the number, and never name the future self it points at.
4. chosenPaths — the decisions made. Use them to understand what the person's actions revealed about who they were, not to describe what they decided.
5. dominantThemes — orientation only. Never name a theme in your output.

All of this exists so you can describe the person, not the month. The goal is two portraits — who they were, and who was emerging — separated by the evidence of change. Your only output is month, headline, teaser, opening_beginning, and opening_end.`;
