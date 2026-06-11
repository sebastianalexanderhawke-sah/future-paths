import { CONTRADICTION_TYPES } from "@/types/enums";
import { APPROVED_THEMES_PROMPT_TEXT } from "@/lib/ai/prompts/shared/theme-instructions";

export const APPROVED_CONTRADICTION_TYPES = [...CONTRADICTION_TYPES];

export const APPROVED_CONTRADICTION_TYPES_PROMPT_TEXT =
  APPROVED_CONTRADICTION_TYPES.join(", ");

export const STRICT_CONTRADICTION_TYPE_RULES = `Contradiction type rules (strict — validation will reject any other value):
- contradiction_type MUST be exactly one of: ${APPROVED_CONTRADICTION_TYPES_PROMPT_TEXT}
- Never invent contradiction_type labels (e.g. approach_avoidance, values_conflict, identity_role_conflict, pattern_vs_trajectory).
- Use exact spelling from the approved list, including underscores.
- If uncertain, map the concept to the closest approved type before output:
  - current_vs_future: present identity patterns vs an emerging future trajectory
  - dual_future: two active future selves pulling in different directions
  - stated_vs_lived: what was reflected in a prompt response vs lived identity patterns`;

export const STRICT_CONTRADICTION_SOURCE_REFS_RULES = `source_refs rules (strict):
- source_refs MUST be a JSON object, never an array or string.
- Allowed keys only: current_self_id, future_self_ids, prompt_response_ids
- current_self_id: optional UUID string from context.currentSelf.id
- future_self_ids: optional array of UUID strings from context.futureSelves
- prompt_response_ids: optional array of UUID strings from context.answeredPrompts response ids
- Use UUIDs from context JSON only; never invent ids.
- Typical shapes by type:
  - current_vs_future: { current_self_id, future_self_ids: [id] }
  - dual_future: { future_self_ids: [id1, id2] }
  - stated_vs_lived: { current_self_id, prompt_response_ids: [id] }`;

export const STRICT_CONTRADICTION_THEME_RULES = `Theme selection rules (strict — validation will reject any other value):
- Every themes[] entry MUST be exactly one of: ${APPROVED_THEMES_PROMPT_TEXT}
- themes MUST contain 1-3 items. Never return more than 3 themes.
- Never invent theme names (e.g. boundaries, healing, self-discovery, uncertainty).
- Use exact spelling and capitalization from the approved list.
- If more than 3 themes are relevant, choose the 3 strongest for the tension before output.
- If uncertain, map the concept to the closest approved theme (e.g. communication → Connection, patience → Stability, self-discovery → Curiosity, boundaries → Independence).`;
