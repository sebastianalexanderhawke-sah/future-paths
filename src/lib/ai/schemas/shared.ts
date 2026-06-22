import { z } from "zod";

import {
  isDifficultCheckInTheme,
  isValidDirectionForTheme,
} from "@/lib/check-in-themes";
import {
  CHECK_IN_THEME_NAMES,
  CONTRADICTION_TYPES,
  FUTURE_SELF_EVIDENCE_STRENGTHS,
  IDENTITY_PROMPT_TYPES,
  IDENTITY_UPDATE_TYPES,
  LIFE_CHAPTER_EVIDENCE_TYPES,
  THEME_NAMES,
  type CheckInThemeName,
  type ThemeChangeDirection,
} from "@/types/enums";

const BANNED_PHRASES = [
  "you should",
  "you must",
  "you need to",
  "you are diagnosed",
  "you have to",
];

// Sanitizes banned directive/diagnostic phrases rather than rejecting the whole
// string. Sentence-start occurrences are removed and the remainder is
// re-capitalised. Mid-sentence occurrences are removed with surrounding
// whitespace collapsed to a single space; a console.warn is emitted so
// we can monitor how often Claude produces these in practice.
function sanitizeBannedPhrases(value: string): string {
  let result = value;

  for (const phrase of BANNED_PHRASES) {
    // Escape any regex-special characters (defensive; current phrases have none).
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    // Sentence-start: phrase is the very first token (trim has already run).
    const startRe = new RegExp(`^${escaped}[,\\s]*`, "i");
    if (startRe.test(result)) {
      result = result.replace(startRe, "");
      if (result.length > 0) {
        result = result.charAt(0).toUpperCase() + result.slice(1);
      }
      // Only one phrase can occupy the start; move on to the next phrase.
      continue;
    }

    // Mid-sentence: phrase appears after the start.
    const midRe = new RegExp(`\\s*${escaped}\\s*`, "ig");
    if (midRe.test(result)) {
      const original = result;
      result = result.replace(midRe, " ").replace(/\s{2,}/g, " ").trim();
      console.warn(
        `[tentativeTextSchema] Sanitized mid-sentence directive language. Before: "${original}" After: "${result}"`,
      );
    }
  }

  return result;
}

export const themeNameSchema = z.enum(THEME_NAMES);

export const checkInThemeNameSchema = z.enum(CHECK_IN_THEME_NAMES);

export const themeChangeSchema = z.object({
  theme: themeNameSchema,
  direction: z.enum(["strengthened", "emerging", "weakened"]),
});

/** Check-in theme_changes: positive + difficult themes with category-appropriate statuses. */
export const checkInThemeChangeSchema = z
  .object({
    theme: checkInThemeNameSchema,
    direction: z.enum([
      "strengthened",
      "emerging",
      "weakened",
      "present",
      "processing",
      "fading",
    ]),
  })
  .superRefine((value, ctx) => {
    if (!isValidDirectionForTheme(value.theme, value.direction)) {
      const kind = isDifficultCheckInTheme(value.theme)
        ? "present, processing, or fading"
        : "strengthened, emerging, or weakened";
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Theme "${value.theme}" requires direction to be one of: ${kind}`,
        path: ["direction"],
      });
    }
  }) satisfies z.ZodType<{ theme: CheckInThemeName; direction: ThemeChangeDirection }>;

// .transform() sanitizes banned phrases; .pipe() then enforces min/max on the
// sanitised result (a string that was fully composed of banned phrases becomes
// empty and fails .min(1)).
export const tentativeTextSchema = z
  .string()
  .trim()
  .transform(sanitizeBannedPhrases)
  .pipe(z.string().min(1).max(2000));

export const themesSchema = z.array(themeNameSchema).min(1).max(3);

export const identityUpdateTypeSchema = z.enum(IDENTITY_UPDATE_TYPES);
export const futureSelfEvidenceStrengthSchema = z.enum(FUTURE_SELF_EVIDENCE_STRENGTHS);
export const identityPromptTypeSchema = z.enum(IDENTITY_PROMPT_TYPES);
export const contradictionTypeSchema = z.enum(CONTRADICTION_TYPES);
export const lifeChapterEvidenceTypeSchema = z.enum(LIFE_CHAPTER_EVIDENCE_TYPES);

export const benefitsConsequencesListSchema = z.array(tentativeTextSchema).min(3).max(5);

export function assertTentativeLanguage(value: string): string {
  return tentativeTextSchema.parse(value);
}
