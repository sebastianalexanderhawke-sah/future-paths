import { z } from "zod";

import { parseAlternateSelfOutput } from "@/lib/ai/schemas/alternate-self";
import { parseCheckInOutput } from "@/lib/ai/schemas/check-in";
import { parseContradictionOutput } from "@/lib/ai/schemas/contradiction";
import { parseCrossroadOutput } from "@/lib/ai/schemas/crossroad";
import { parseDiscoveryQuestionOutput } from "@/lib/ai/schemas/discovery-question";
import {
  parseCurrentSelfFromBriefOutput,
  parseCurrentSelfOutput,
} from "@/lib/ai/schemas/current-self";
import { parseEmergingSituationOutput } from "@/lib/ai/schemas/emerging-situation";
import { parseForecastOutput } from "@/lib/ai/schemas/forecast";
import { parseFutureSelfOutput } from "@/lib/ai/schemas/future-self";
import { parseIdentityPromptOutput } from "@/lib/ai/schemas/identity-prompt";
import { parseIdentityUpdateOutput } from "@/lib/ai/schemas/identity-update";
import { parseMonthlyIdentityNarrativeOutput } from "@/lib/ai/schemas/monthly-identity-narrative";
import { parsePastAlternativePathOutput } from "@/lib/ai/schemas/past-alternative-path";
import { parsePathSetAuditOutput } from "@/lib/ai/schemas/path-set-audit";
import { parseReflectionQuestionOutput } from "@/lib/ai/schemas/reflection-question";
import { parseTimelineOutput } from "@/lib/ai/schemas/timeline";
import type { PromptId } from "@/lib/ai/prompts/ids";

const OUTPUT_PARSERS: Record<PromptId, (data: unknown) => unknown> = {
  "crossroad.generate": parseCrossroadOutput,
  "path_set.audit": parsePathSetAuditOutput,
  "discovery_question.generate": parseDiscoveryQuestionOutput,
  "check_in.generate": parseCheckInOutput,
  "identity_update.generate": parseIdentityUpdateOutput,
  "future_self.discover": parseFutureSelfOutput,
  "forecast.generate": parseForecastOutput,
  "current_self.generate": parseCurrentSelfOutput,
  "current_self.generate_from_brief": parseCurrentSelfFromBriefOutput,
  "identity_prompt.generate": parseIdentityPromptOutput,
  "contradiction.detect": parseContradictionOutput,
  "past_path.generate": parsePastAlternativePathOutput,
  "alternate_self.generate": parseAlternateSelfOutput,
  "timeline.generate": parseTimelineOutput,
  "monthly_identity_narrative.generate": parseMonthlyIdentityNarrativeOutput,
  "reflection_question.evaluate": parseReflectionQuestionOutput,
  "emerging_situation.detect": parseEmergingSituationOutput,
};

export function parsePromptOutput(promptId: PromptId, data: unknown): unknown {
  return OUTPUT_PARSERS[promptId](data);
}

export {
  parseAlternateSelfOutput,
  parseCheckInOutput,
  parseContradictionOutput,
  parseCrossroadOutput,
  parseDiscoveryQuestionOutput,
  parseCurrentSelfOutput,
  parseFutureSelfOutput,
  parseForecastOutput,
  parseIdentityPromptOutput,
  parseIdentityUpdateOutput,
  parseMonthlyIdentityNarrativeOutput,
  parsePastAlternativePathOutput,
  parseTimelineOutput,
};
