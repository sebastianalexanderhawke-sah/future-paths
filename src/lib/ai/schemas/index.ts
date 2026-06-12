import { z } from "zod";

import { parseAlternateSelfOutput } from "@/lib/ai/schemas/alternate-self";
import { parseCheckInOutput } from "@/lib/ai/schemas/check-in";
import { parseContradictionOutput } from "@/lib/ai/schemas/contradiction";
import { parseCrossroadOutput } from "@/lib/ai/schemas/crossroad";
import { parseCurrentSelfOutput } from "@/lib/ai/schemas/current-self";
import { parseForecastOutput } from "@/lib/ai/schemas/forecast";
import { parseFutureSelfOutput } from "@/lib/ai/schemas/future-self";
import { parseIdentityPromptOutput } from "@/lib/ai/schemas/identity-prompt";
import { parseIdentityUpdateOutput } from "@/lib/ai/schemas/identity-update";
import { parsePastAlternativePathOutput } from "@/lib/ai/schemas/past-alternative-path";
import { parseTimelineOutput } from "@/lib/ai/schemas/timeline";
import type { PromptId } from "@/lib/ai/prompts/ids";

const OUTPUT_PARSERS: Record<PromptId, (data: unknown) => unknown> = {
  "crossroad.generate": parseCrossroadOutput,
  "check_in.generate": parseCheckInOutput,
  "identity_update.generate": parseIdentityUpdateOutput,
  "future_self.discover": parseFutureSelfOutput,
  "forecast.generate": parseForecastOutput,
  "current_self.generate": parseCurrentSelfOutput,
  "identity_prompt.generate": parseIdentityPromptOutput,
  "contradiction.detect": parseContradictionOutput,
  "past_path.generate": parsePastAlternativePathOutput,
  "alternate_self.generate": parseAlternateSelfOutput,
  "timeline.generate": parseTimelineOutput,
};

export function parsePromptOutput(promptId: PromptId, data: unknown): unknown {
  return OUTPUT_PARSERS[promptId](data);
}

export {
  parseAlternateSelfOutput,
  parseCheckInOutput,
  parseContradictionOutput,
  parseCrossroadOutput,
  parseCurrentSelfOutput,
  parseFutureSelfOutput,
  parseForecastOutput,
  parseIdentityPromptOutput,
  parseIdentityUpdateOutput,
  parsePastAlternativePathOutput,
  parseTimelineOutput,
};
