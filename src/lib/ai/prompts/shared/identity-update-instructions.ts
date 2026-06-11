import { IDENTITY_UPDATE_TYPES } from "@/types/enums";

export const APPROVED_IDENTITY_UPDATE_TYPES = [...IDENTITY_UPDATE_TYPES];

export const APPROVED_IDENTITY_UPDATE_TYPES_PROMPT_TEXT =
  APPROVED_IDENTITY_UPDATE_TYPES.join(", ");

export const STRICT_IDENTITY_UPDATE_TYPE_RULES = `Identity update type rules (strict — validation will reject any other value):
- update_type MUST be exactly one of: ${APPROVED_IDENTITY_UPDATE_TYPES_PROMPT_TEXT}
- Never invent alternative labels (e.g. "shift", "emerging_pattern", "pattern", "strengthened", "reality").
- Use exact spelling from the approved list.
- Choose the closest approved type:
  - reality_shift: first check-in on a moment, or when prediction meets lived outcome
  - theme_emerging: a theme newly appearing that was not present in prior check-ins
  - pattern_strengthened: a theme recurring with greater weight across check-ins`;
