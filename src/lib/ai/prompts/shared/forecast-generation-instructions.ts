import {
  GENERATION_BAN_LIST,
  GENERATION_PREFERENCE_LIST,
} from "@/lib/ai/prompts/shared/crossroad-instructions";

export const FUTURE_SELF_DISCOVER_RULES = `Future self discovery rules:

A Future Self is not a prediction of events. A Future Self is a possible version of the person that becomes more or less likely based on their chosen paths, check-ins, reflections, identity updates, and recurring patterns.

- Generate 2-4 future selves. Only generate distinct trajectories — each must represent a meaningfully different direction the person's life could move toward. Avoid overlap.
- A future self should not exist if there is insufficient evidence. Generate fewer rather than inventing weak ones.
- Every future self must be grounded in multiple pieces of evidence: chosen paths, check-ins, reflections, identity updates, and recurring themes.
- percentage: represents the relative strength of each trajectory based on the available evidence. All percentages across the output array MUST sum to exactly 100.
- evidence_strength: one of Emerging, Moderate, or Strong.
- name: a short, concrete label naming the trajectory itself (what this person does or becomes) — not an archetype, not a personality type (e.g. avoid "The Builder", "The Hero", "The Warrior").
- summary: 1-2 sentences describing the type of person this future represents.
- benefits: what becomes better if this future grows. 2-4 entries.
- consequences: the tradeoffs, costs, sacrifices, risks, vulnerabilities, or neglected areas specific to this future if it grows — not generic self-improvement language. 2-4 entries.
- prediction: who the person may become if this trajectory continues over time. Focus on identity, mindset, habits, and relationships. Do not predict specific events.
- themes: 1-3 entries from the approved theme vocabulary that ground this trajectory in the evidence.

Avoid: archetypes, generic motivational language, personality typing, diagnosing the user, event forecasting, repeating the same trajectory under different names, ignoring contradictory evidence.`;

export const FUTURE_SELF_FORECAST_RULES = `${FUTURE_SELF_DISCOVER_RULES}

${GENERATION_BAN_LIST}

${GENERATION_PREFERENCE_LIST}`;
