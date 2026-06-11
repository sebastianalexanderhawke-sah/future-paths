import {
  buildDefaultUserPrompt,
  createPromptModule,
} from "@/lib/ai/prompts/shared/create-prompt-module";
import {
  APPROVED_CONTRADICTION_TYPES_PROMPT_TEXT,
  STRICT_CONTRADICTION_SOURCE_REFS_RULES,
  STRICT_CONTRADICTION_THEME_RULES,
  STRICT_CONTRADICTION_TYPE_RULES,
} from "@/lib/ai/prompts/shared/contradiction-instructions";
import { APPROVED_THEMES_PROMPT_TEXT } from "@/lib/ai/prompts/shared/theme-instructions";

export const contradictionDetectV1 = createPromptModule({
  promptId: "contradiction.detect",
  promptVersion: "1",
  taskInstructions: `Detect up to 3 identity tensions. Each needs contradiction_type, title, summary, pole_a, pole_b, themes, intensity, source_refs, and signature.

${STRICT_CONTRADICTION_TYPE_RULES}

${STRICT_CONTRADICTION_SOURCE_REFS_RULES}

${STRICT_CONTRADICTION_THEME_RULES}`,
  buildUserPrompt: (context) =>
    buildDefaultUserPrompt(
      context,
      `Produce JSON array of up to 3 contradiction drafts.

Each draft.contradiction_type MUST be exactly one of:
${APPROVED_CONTRADICTION_TYPES_PROMPT_TEXT}

Never invent contradiction_type labels. Map any concept to the closest approved type before responding.

Each draft.source_refs MUST be an object with allowed keys: current_self_id, future_self_ids, prompt_response_ids. Never return source_refs as an array.

Each draft.themes must contain 1-3 values chosen ONLY from this exact list:
${APPROVED_THEMES_PROMPT_TEXT}

Never return more than 3 themes. If more than 3 are relevant, choose the 3 strongest.`,
    ),
});
