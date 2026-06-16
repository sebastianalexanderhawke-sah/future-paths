import {
  CHECK_IN_DIFFICULT_THEMES_PROMPT_TEXT,
  CHECK_IN_POSITIVE_THEMES_PROMPT_TEXT,
} from "@/lib/check-in-themes";
import { THEME_NAMES } from "@/types/enums";

export const APPROVED_THEME_NAMES = [...THEME_NAMES];

export const APPROVED_THEMES_PROMPT_TEXT = APPROVED_THEME_NAMES.join(", ");

export const STRICT_THEME_SELECTION_RULES = `Theme selection rules (strict — validation will reject any other value):
- Every themes[] entry MUST be exactly one of: ${APPROVED_THEMES_PROMPT_TEXT}
- Never invent themes. Never output free-form labels (e.g. "boundaries", "healing", "self-discovery").
- Each path must include 1-3 themes, all chosen ONLY from the approved list above.
- Use exact spelling and capitalization from the approved list.
- If a concept does not match exactly, map it to the closest approved theme before output (e.g. communication → Connection, patience → Stability, self-discovery → Curiosity, healing → Growth, boundaries → Independence).`;

export const APPROVED_THEME_DIRECTIONS = [
  "strengthened",
  "emerging",
  "weakened",
] as const;

export const CHECK_IN_HONEST_THEME_RULES = `Emotional honesty rules for check-in theme_changes (strict):
- Allow and encourage difficult themes when the check-in describes pain, loss, rejection, disappointment, or grief. Do not force positive framing onto negative experiences.
- When the check-in describes a painful outcome — rejection, loss, a relationship ending, disappointment — include the honest emotional themes that reflect that experience (Loneliness, Hurt, Disappointment, Grief, etc.) with appropriate statuses (present, processing, fading). Do not reframe painful experiences as growth or connection unless the check-in itself frames it that way. Emotional honesty matters more than positive framing.
- A check-in can include BOTH difficult and positive themes when the content genuinely reflects both (e.g. "I ended the friendship and feel sad but also relieved" → Grief: present + Independence: emerging).

Positive themes (use with strengthened or emerging — NOT present/processing/fading):
${CHECK_IN_POSITIVE_THEMES_PROMPT_TEXT}
Statuses for positive themes: strengthened, emerging, weakened

Difficult/honest themes (use with present, processing, or fading — NOT strengthened/emerging):
${CHECK_IN_DIFFICULT_THEMES_PROMPT_TEXT}
Statuses for difficult themes: present, processing, fading

Example:
Check-in: "we stopped talking, because she chose someone over me"
Bad output: Connection · strengthened
Good output: Hurt · present, Loneliness · present, Resilience · processing`;

export const STRICT_THEME_CHANGE_RULES = `Theme change rules (strict — validation will reject invalid output):
- theme_changes must contain 1-3 objects. Every object MUST include BOTH theme and direction.
- Never omit direction. Never output theme-only strings or objects missing direction.
- theme MUST be exactly one of the approved check-in themes listed below.
- direction MUST match the theme category:
  * Positive themes → strengthened, emerging, or weakened
  * Difficult themes → present, processing, or fading
- Never apply "strengthened" to Loneliness/Hurt/Grief/etc. Never apply "present" to Courage/Connection/etc.

${CHECK_IN_HONEST_THEME_RULES}`;
