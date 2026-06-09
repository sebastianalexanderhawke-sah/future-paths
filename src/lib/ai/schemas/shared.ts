import { z } from "zod";

import {
  CONTRADICTION_TYPES,
  FUTURE_SELF_STAGES,
  IDENTITY_PROMPT_TYPES,
  IDENTITY_UPDATE_TYPES,
  LIFE_CHAPTER_EVIDENCE_TYPES,
  THEME_NAMES,
} from "@/types/enums";

const BANNED_PHRASES = [
  "you should",
  "you must",
  "you need to",
  "you are diagnosed",
  "you have to",
];

export const themeNameSchema = z.enum(THEME_NAMES);

export const themeChangeSchema = z.object({
  theme: themeNameSchema,
  direction: z.enum(["strengthened", "emerging", "weakened"]),
});

export const tentativeTextSchema = z
  .string()
  .trim()
  .min(1)
  .max(2000)
  .refine(
    (value) => !BANNED_PHRASES.some((phrase) => value.toLowerCase().includes(phrase)),
    "Text must avoid directive or diagnostic language.",
  );

export const themesSchema = z.array(themeNameSchema).min(1).max(3);

export const identityUpdateTypeSchema = z.enum(IDENTITY_UPDATE_TYPES);
export const futureSelfStageSchema = z.enum(FUTURE_SELF_STAGES);
export const identityPromptTypeSchema = z.enum(IDENTITY_PROMPT_TYPES);
export const contradictionTypeSchema = z.enum(CONTRADICTION_TYPES);
export const lifeChapterEvidenceTypeSchema = z.enum(LIFE_CHAPTER_EVIDENCE_TYPES);

export function assertTentativeLanguage(value: string): string {
  return tentativeTextSchema.parse(value);
}
