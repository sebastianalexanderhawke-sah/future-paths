import { FUTURE_SELF_EVIDENCE_STRENGTHS } from "@/types/enums";

export const APPROVED_FUTURE_SELF_EVIDENCE_STRENGTHS = [...FUTURE_SELF_EVIDENCE_STRENGTHS];

export const APPROVED_FUTURE_SELF_EVIDENCE_STRENGTHS_PROMPT_TEXT =
  APPROVED_FUTURE_SELF_EVIDENCE_STRENGTHS.join(", ");

export const STRICT_FUTURE_SELF_EVIDENCE_STRENGTH_RULES = `Future self evidence_strength rules (strict — validation will reject any other value):
- evidence_strength MUST be exactly one of: ${APPROVED_FUTURE_SELF_EVIDENCE_STRENGTHS_PROMPT_TEXT}
- Never invent labels (e.g. high, low, weak, confirmed, speculative).
- Use exact spelling and capitalization from the approved list.
- If uncertain, map the concept to the closest approved value:
  - Emerging: only one or two pieces of evidence, early or tentative
  - Moderate: a handful of consistent signals across multiple sources
  - Strong: a recurring pattern repeated across many check-ins, reflections, and chosen paths`;
