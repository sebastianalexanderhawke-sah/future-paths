import { APPROVED_THEMES_PROMPT_TEXT } from "@/lib/ai/prompts/shared/theme-instructions";

export const TIMELINE_CHAPTER_REQUIRED_FIELDS = `Every chapter object MUST include ALL of these fields (never omit any):
- title (string)
- period_label (string)
- starts_at (YYYY-MM-DD)
- ends_at (YYYY-MM-DD)
- summary (string)
- themes (array, 1-3 approved theme names)
- includes_current_self (boolean)
- evidence (array, up to 8 evidence objects; may be empty)
- strength (number >= 0)

Every evidence object MUST include ALL of these fields (never omit any):
- evidence_type (moment | path | check_in | identity_update | future_self | contradiction | alternate_self)
- evidence_id (UUID string referencing context)
- label (string)
- occurred_at (ISO timestamp string)
- sort_priority (integer 0-100)`;

export const TIMELINE_STRICT_THEME_RULES = `Theme selection rules (strict — validation will reject any other value):
- Every chapter themes[] entry MUST be exactly one of: ${APPROVED_THEMES_PROMPT_TEXT}
- Never invent theme names (e.g. Roots, Discovery, Purpose, Adaptability, Honesty, Commitment).
- Each chapter must include 1-3 themes, all chosen ONLY from the approved list above.
- Use exact spelling and capitalization from the approved list.
- If uncertain, map the concept to the closest approved theme before output (e.g. discovery → Curiosity, purpose → Reflection, commitment → Stability, honesty → Courage, adaptability → Growth, roots → Belonging).`;
