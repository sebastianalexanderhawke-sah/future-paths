import {
  GENERATION_BAN_LIST,
  GENERATION_PREFERENCE_LIST,
} from "@/lib/ai/prompts/shared/crossroad-instructions";

export const FUTURE_SELF_DISCOVER_RULES = `Future self discovery rules:

A Future Self is not a prediction of events. A Future Self is a possible version of the person that becomes more or less likely based on their situations, chosen paths, check-ins, reflections, identity updates, and recurring patterns. Future Selves are trajectories.

This output answers: "Based on my recent actions and choices, what kinds of people am I becoming, what are the benefits of those paths, what might those paths cost me, and who could I become if I continue?"

- Generate 2-5 future selves. Only generate distinct trajectories — each must represent a meaningfully different direction the person's life could move toward. If two futures describe substantially the same trajectory, merge them into one rather than listing both.
- Continuity: the context may include existing active future selves (each with a name and summary) from the previous generation. If a draft represents the same underlying trajectory as one of these, reuse its exact name — do not invent a new name just because the wording or framing changed. Only use a new name when the trajectory is genuinely new, not already covered by an existing one.
- A future self should not exist if there is insufficient evidence. Generate fewer futures rather than weak, repetitive, overlapping, or poorly supported ones.
- Every future self must be grounded in multiple pieces of evidence: situations, chosen paths, check-ins, reflections, identity updates, and recurring patterns. Never build a future from a single isolated event, and never invent evidence that was not given.
- New futures may emerge when new patterns appear. Existing futures may weaken when evidence stops appearing.
- Futures may be positive, negative, or mixed.
- movement_direction: whether this trajectory's likelihood is moving since the last generation — positive, negative, or unchanged. Base this on whether behavior, identity, circumstances, or direction have actually changed, not on routine activity alone. The exact size of the movement is calculated separately — focus only on which way it is heading, including for a future self appearing for the first time (use positive, never unchanged, for a newly emerging or returning trajectory).
- evidence_strength: one of Emerging, Moderate, or Strong.
- name: describes a future life direction or trajectory — the way a close observer would describe what this person is doing with their life, not a label for who they are. Prefer verb-led or action-led phrasing (what they do, choose, build, or move toward). Never use personality types, archetypes, identities, character labels, role labels, or self-help language. Keep it under 8 words and specific to this person's actual evidence, not generic.
  Avoid: "Disciplined Solo Builder", "Intentional Connector", "Independent Achiever", "Urban Explorer", "Strategic Thinker".
  Prefer: "Builds a life in a new city", "Invests deeply in a small circle", "Creates stability before taking risks", "Chooses independence over certainty", "Builds work around freedom", "Stays rooted close to family".
- summary: 1-2 sentences maximum. Explain why this future is emerging — the recurring pattern and direction, not a recap of every event. Do not write a biography.
- benefits: what becomes better if this future grows. 3-5 short, concrete bullet points focused on practical gains.
- consequences: the tradeoffs, costs, sacrifices, risks, vulnerabilities, or neglected areas specific to this future if it grows — not generic self-improvement language. 3-5 short bullet points, each meaningful enough to make the person stop and think about whether they want this future.
- prediction: Maximum 2 sentences, maximum 60 words. This is the most important field. It answers "If I continue making choices like this for years, who might I become?" Focus on the future identity — not a detailed explanation of how it comes about. Do not repeat the summary, restate the benefits, or restate the consequences. Do not write a mini essay. End with one memorable realization, tension, or question. Do not predict specific events — predict the person.
- themes: 1-3 entries from the approved theme vocabulary that ground this trajectory in the evidence.
- why_changed: a plain-language explanation of this generation's movement, for a user who has never heard of themes, evidence tiers, or scoring. Maximum 2 sentences, maximum 50 words. Sentence 1 describes the concrete event, decision, action, or realization that caused the movement — reference real user events whenever possible. Sentence 2 explains why that event increases or decreases confidence in this specific future — referencing the future itself, not internal scoring logic. Do not mention themes, evidence, scores, percentages, categories, reality shifts, pattern strengthening, or any other system terminology. If movement_direction is unchanged, or there is nothing meaningful to explain, return an empty string.
  Bad: "Stability and Independence strengthened."
  Good: "You decided to move to San Antonio and stay with your aunt while looking for work. That makes a self-directed future feel more likely because the move turns a possibility into a concrete plan."

Writing style:
- Use plain language. Write for someone quickly scanning on their phone. Keep sentences short.
- Avoid archetypes, personality typing, motivational language, therapeutic language, academic language, excessive abstraction, and certainty about the future.
- Do not repeat the same evidence or themes unnecessarily across futures.
- The reader should finish a future self thinking "I can see how I could become that person" — not "the AI described my personality."

Avoid: archetypes, generic motivational language, personality typing, diagnosing the user, event forecasting, repeating the same trajectory under different names, ignoring contradictory evidence.`;

export const FUTURE_SELF_FORECAST_RULES = `${FUTURE_SELF_DISCOVER_RULES}

${GENERATION_BAN_LIST}

${GENERATION_PREFERENCE_LIST}`;
