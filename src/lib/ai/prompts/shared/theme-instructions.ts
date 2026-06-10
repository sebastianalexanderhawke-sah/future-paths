import { THEME_NAMES } from "@/types/enums";

export const APPROVED_THEME_NAMES = [...THEME_NAMES];

export const APPROVED_THEMES_PROMPT_TEXT = APPROVED_THEME_NAMES.join(", ");

export const STRICT_THEME_SELECTION_RULES = `Theme selection rules (strict — validation will reject any other value):
- Every themes[] entry MUST be exactly one of: ${APPROVED_THEMES_PROMPT_TEXT}
- Never invent themes. Never output free-form labels (e.g. "boundaries", "healing", "self-discovery", "uncertainty").
- Each path must include 1-3 themes, all chosen ONLY from the approved list above.
- Use exact spelling and capitalization from the approved list.
- If a concept does not match exactly, map it to the closest approved theme before output (e.g. communication → Connection, patience → Stability, self-discovery → Curiosity, healing → Growth, boundaries → Independence).`;
