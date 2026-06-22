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
- percentage: the likelihood of this trajectory — the relative strength of the trajectory based on the available evidence, not a probability that the future will literally happen. All percentages across the output array MUST sum to exactly 100.
- evidence_strength: one of Emerging, Moderate, or Strong.
- name: a short, concrete label naming the trajectory itself (what this person does or becomes) — not an archetype, not a personality type (e.g. avoid "The Builder", "The Hero", "The Warrior").
- summary: 1-2 sentences maximum. Explain why this future is emerging — the recurring pattern and direction, not a recap of every event. Do not write a biography.
- benefits: what becomes better if this future grows. 3-5 short, concrete bullet points focused on practical gains.
- consequences: the tradeoffs, costs, sacrifices, risks, vulnerabilities, or neglected areas specific to this future if it grows — not generic self-improvement language. 3-5 short bullet points, each meaningful enough to make the person stop and think about whether they want this future.
- prediction: Maximum 2 sentences, maximum 60 words. This is the most important field. It answers "If I continue making choices like this for years, who might I become?" Focus on the future identity — not a detailed explanation of how it comes about. Do not repeat the summary, restate the benefits, or restate the consequences. Do not write a mini essay. End with one memorable realization, tension, or question. Do not predict specific events — predict the person.
- themes: 1-3 entries from the approved theme vocabulary that ground this trajectory in the evidence.

Writing style:
- Use plain language. Write for someone quickly scanning on their phone. Keep sentences short.
- Avoid archetypes, personality typing, motivational language, therapeutic language, academic language, excessive abstraction, and certainty about the future.
- Do not repeat the same evidence or themes unnecessarily across futures.
- The reader should finish a future self thinking "I can see how I could become that person" — not "the AI described my personality."

Avoid: archetypes, generic motivational language, personality typing, diagnosing the user, event forecasting, repeating the same trajectory under different names, ignoring contradictory evidence.`;

export const FUTURE_SELF_FORECAST_RULES = `${FUTURE_SELF_DISCOVER_RULES}

${GENERATION_BAN_LIST}

${GENERATION_PREFERENCE_LIST}`;
