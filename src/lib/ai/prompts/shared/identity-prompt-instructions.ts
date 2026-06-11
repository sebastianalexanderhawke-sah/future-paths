import { IDENTITY_PROMPT_TYPES } from "@/types/enums";

export const APPROVED_IDENTITY_PROMPT_TYPES = [...IDENTITY_PROMPT_TYPES];

export const APPROVED_IDENTITY_PROMPT_TYPES_PROMPT_TEXT =
  APPROVED_IDENTITY_PROMPT_TYPES.join(", ");

export const STRICT_IDENTITY_PROMPT_TYPE_RULES = `Identity prompt type rules (strict — validation will reject any other value):
- prompt_type MUST be exactly one of: ${APPROVED_IDENTITY_PROMPT_TYPES_PROMPT_TEXT}
- Never invent prompt_type labels (e.g. pattern_reflection, tension_exploration, identity_signal, reflection, self_reflection).
- Use exact spelling from the approved list, including underscores.
- If uncertain, map the concept to the closest approved type before output:
  - theme_reflection: recurring themes across paths, check-ins, or current self
  - future_alignment: alignment or tension with an active future self trajectory
  - pattern_probe: probing a recent identity shift or emerging pattern`;
