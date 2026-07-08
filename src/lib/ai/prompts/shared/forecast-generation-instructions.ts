import {
  GENERATION_BAN_LIST,
  GENERATION_PREFERENCE_LIST,
} from "@/lib/ai/prompts/shared/crossroad-instructions";

export const FUTURE_SELF_DISCOVER_RULES = `Identity discovery rules:

A Future Self is an emerging identity — not a prediction of events, not a personality assessment, and not a goal. It is who this person appears to be in the process of becoming, as revealed by their actual behavioral patterns. The question is: "Who is this person becoming?"

This output answers: "Based on what I keep choosing and doing, what kind of person am I becoming, and what does that mean for my future?"

- Generate 2-5 Future Selves. Only generate distinct identities — each must represent a meaningfully different version of who this person could become. If two futures describe substantially the same trajectory, merge them into one.
- Continuity: the context may include existing active future selves (each with a name and summary) from the previous generation. If a draft represents the same underlying identity as one of these, reuse its exact name — do not invent a new name just because the wording or framing changed. Only use a new name when the identity is genuinely new.
- A Future Self should not exist if there is insufficient behavioral evidence. Generate fewer futures rather than weak, repetitive, overlapping, or poorly supported ones.
- Every Future Self must be grounded in multiple pieces of evidence: situations, chosen paths, check-ins, reflections, identity updates, and recurring patterns. Never build a future from a single isolated event, and never invent evidence that was not given.
- New identities may emerge when new patterns appear. Existing identities may weaken when the behavior that supported them stops appearing.
- The context's \`mostRecentChosenPath\` is the single most recently chosen path, given separately from the rest of the chosen-path history. Always treat it as a potential source of a new or strengthening identity, not just one more data point folded into older patterns. If it points in a direction that diverges from an existing identity's established pattern, say so — reflect that divergence in the affected future's summary, likely_evolution, or why_emerging — rather than describing only the older pattern as if the newest decision hadn't happened.
- If \`currentSelf\` is present in context, use it as the grounding anchor for every Future Self. Each identity answers: "Given who this person is today, who might they become next?" — not "Who is this person?" Diverge from currentSelf; do not restate it. The \`currentSelf.observations\` field contains stable core traits — fixed starting conditions. The \`currentSelf.recent_growth\` field contains what is currently shifting. Treat recent_growth as the leading edge — the direction identities are most likely to extend from.
- Current Self consistency: Future Selves describe trajectories from who the person is now, not alternative present-day identities. If a Future Self implies present-day characteristics that contradict \`currentSelf\`, name the transition explicitly — what changes and why — rather than describing a different person as if today does not exist.
- If \`confirmedReflections\` is present, treat each entry as the highest-confidence evidence available — the person's own words, in full, about what an experience revealed about them. These are stronger than check-ins, identity updates, identity_impact fields, or any AI-generated summary. Future Selves should evolve from the traits expressed here. If a Future Self diverges from or contradicts a confirmed reflection, the why_emerging field or summary must explicitly name what would need to change for that to happen — do not silently ignore it.
- Check-ins may include inline \`reflection_question\` and \`reflection_answer\` fields; these are the same data as \`confirmedReflections\`. Do not treat them as additional evidence — use \`confirmedReflections\` as the authoritative list of answered reflections.
- Identity updates are AI-synthesized interpretations of check-ins, not independent events. When a check-in and an identity update describe the same experience, draw on both for depth rather than treating them as two separate pieces of evidence.
- Identities may be positive, negative, or mixed.
- movement_direction: whether this identity's likelihood is moving since the last generation — positive, negative, or unchanged. Base this on whether behavior, identity, circumstances, or direction have actually changed, not on routine activity alone. The exact size of the movement is calculated separately — focus only on which way it is heading, including for a future self appearing for the first time (use positive, never unchanged, for a newly emerging or returning trajectory).
- evidence_strength: one of Emerging, Moderate, or Strong.
- name: an identity label — who this person is becoming. Identity-style names are appropriate ("Self-Reliant Builder", "Community Builder", "Reflective Practitioner"). Keep it under 8 words and specific to this person's actual evidence, not generic. Avoid abstract nouns or spiritual/therapeutic framing.
  Good: "Self-Reliant Architect", "Community Builder", "Courageous Risk-Taker", "Quiet Rebuilder", "Natural Leader".
  Avoid: "Achiever", "Seeker of Truth", "Embodied Presence", "Authentic Self".
- summary: 1-2 sentences maximum. Explain why this identity is emerging — the recurring pattern and direction, not a recap of every event. Do not write a biography.
- core_behaviors: 3-5 specific behavioral patterns this person has been demonstrating. Use concrete, observable language. E.g., "Accepts job offers without negotiating salary", "Ends friendships quietly without confrontation", "Consistently applies for roles above current experience level". Describe behaviors, not traits.
- behavioral_evidence: 2-5 specific situations from the user's actual history that demonstrate this identity. Reference real events from the context — situation titles, chosen paths, check-in themes — not invented examples. If only 1-2 real references are available, include what exists; do not fabricate more.
- growth_opportunities: 3-5 specific ways this identity opens doors or creates value. Concrete and practical — not generic self-help language. What actually becomes possible for this specific person?
- blind_spots: 3-5 specific things this identity tends to miss, undervalue, or avoid. Honest and realistic — not judgmental. What does this way of being naturally not see?
- likely_evolution: 1-2 sentences, maximum 60 words. Who does this person become if these behavioral patterns solidify over years? Focus on identity, not events. Do not repeat the summary. End with one memorable realization, tension, or quality that defines who they are becoming.
- themes: 1-3 entries from the approved theme vocabulary that ground this trajectory in the evidence.
- why_emerging: a plain-language explanation of why this identity is appearing or strengthening right now, for a user who has never heard of themes, evidence tiers, or scoring. Maximum 2 sentences, maximum 50 words. Sentence 1 describes the concrete event, decision, action, or realization that caused the movement — reference real user events whenever possible. Sentence 2 explains why that event increases or decreases confidence in this specific identity — referencing the identity itself, not internal scoring logic. Do not mention themes, evidence, scores, percentages, categories, reality shifts, pattern strengthening, or any other system terminology. If movement_direction is unchanged, or there is nothing meaningful to explain, return an empty string.
  Bad: "Stability and Independence strengthened."
  Good: "You decided to move to San Antonio and stay with your aunt while looking for work. That makes a self-directed identity feel more likely because the move turns a possibility into a concrete plan."

Writing style:
- Use plain language. Write for someone quickly scanning on their phone. Keep sentences short.
- Avoid personality typing, motivational language, therapeutic language, academic language, excessive abstraction, and certainty about the future.
- Do not repeat the same evidence unnecessarily across identities.
- The reader should finish reading a Future Self and think "I can see how I could become that person" — not "the AI described my personality."

Avoid: vague identity labels, generic motivational language, personality typing, diagnosing the user, event forecasting, repeating the same identity under different names, ignoring contradictory evidence.`;

export const FUTURE_SELF_FORECAST_RULES = `${FUTURE_SELF_DISCOVER_RULES}

${GENERATION_BAN_LIST}

${GENERATION_PREFERENCE_LIST}`;
