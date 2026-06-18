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

export const IDENTITY_UPDATE_TONE_RULES = `Title and summary tone rules (strict):
- Avoid: healing, growth, emotional processing, self-discovery, "inner journey" language, and literary/poetic headlines (e.g. "When X Met Y").
- title: a short, concrete, plain-language phrase naming what this revealed, what assumption was challenged, what became clearer, or what pattern emerged — not a poetic or therapy-style headline.
  Good: "Direct Asks Get Better Results Than Waiting", "Friendship Doesn't Always Read As Romantic Interest"
  Bad: "When Courage Met an Unexpected Outcome", "A Journey Toward Self-Understanding"
- summary: 1-2 short, direct sentences grounded in the actual events — what was revealed, what assumption broke, what became clearer, or what pattern repeated. Not an abstract reflection on inner growth or emotional healing.
  Good: "Waiting for her to make the first move didn't work twice in a row. Direct asks get a faster, clearer answer."
  Bad: a paragraph reflecting on personal growth, healing, or who you are becoming.`;
