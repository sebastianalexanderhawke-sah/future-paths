import {
  GENERATION_BAN_LIST,
  GENERATION_PREFERENCE_LIST,
} from "@/lib/ai/prompts/shared/crossroad-instructions";

export const FUTURE_SELF_DISCOVER_RULES = `Future self discovery rules (Future Forecast blind spots):
- Discover 1-3 future selves from recurring theme signals in the user's situation and paths.
- Each future self must describe a concrete life trajectory — not an abstract archetype or therapy label.
- name: short, human-readable label tied to what this person does in life (e.g. "The One Who Keeps Reaching Out", "The One Who Stays Put", "The One Who Takes The Job").
- description: what actually happens in this trajectory — events, relationships, routines, commitments, relocations, partnerships, failures, or turning points.
- Do not write descriptions about inner landscape, self-awareness, reflection, closure, or emotional processing.
- Each description must answer "What happens?" across the next months — not "What do I think about?"
- Good: "You keep initiating contact and several old friendships restart over the year.", "You accept the role, relocate, and most new friendships form at work."
- Bad: "You may become someone who gains clarity about what you truly want.", "You deepen your relationship with your inner landscape."
- Stay grounded in the user's situation. Do not invent hobbies, cities, or relationships they never mentioned unless clearly implied by context.`;

export const FUTURE_SELF_FORECAST_RULES = `${FUTURE_SELF_DISCOVER_RULES}

${GENERATION_BAN_LIST}

${GENERATION_PREFERENCE_LIST}`;
