"use server";

import { choosePath } from "@/lib/paths";
import { getMoment, createMoment } from "@/lib/moments";
import { generatePaths } from "@/lib/paths";
import type { Path } from "@/types/database";
import {
  isAiAuditEnabled,
  toRawPathsAudit,
  type DecisionSimulatorAudit,
} from "@/lib/ai-audit";

export type DecisionSimulatorResult = {
  momentId: string;
  currentUnderstanding: string;
  paths: Path[];
  audit?: DecisionSimulatorAudit;
};

export type DecisionSimulatorResponse =
  // momentId is present when the situation was created but path generation
  // failed afterward — the situation is kept so the caller can offer to
  // resume generation against it instead of creating a duplicate.
  | { error: string; result: null; momentId?: string }
  | { error: null; result: DecisionSimulatorResult };

export async function runDecisionSimulatorAction(input: {
  situationText: string;
  contextSummary: string | null;
  clientToken?: string | null;
}): Promise<DecisionSimulatorResponse> {
  const title = input.situationText.trim();

  if (!title) {
    return { error: "Situation text is required.", result: null };
  }

  const momentResult = await createMoment({
    title,
    description: input.contextSummary,
    clientToken: input.clientToken,
  });

  if ("error" in momentResult) {
    return { error: momentResult.error, result: null };
  }

  const pathsResult = await generatePaths(momentResult.moment.id);

  if ("error" in pathsResult) {
    return { error: pathsResult.error, result: null, momentId: momentResult.moment.id };
  }

  const refreshedMoment = await getMoment(momentResult.moment.id);

  if ("error" in refreshedMoment) {
    return { error: refreshedMoment.error, result: null, momentId: momentResult.moment.id };
  }

  return {
    error: null,
    result: {
      momentId: momentResult.moment.id,
      currentUnderstanding:
        refreshedMoment.moment.current_understanding ??
        "Your situation has been explored through several possible directions.",
      paths: pathsResult.paths,
      ...(isAiAuditEnabled()
        ? { audit: { rawPaths: toRawPathsAudit(pathsResult.paths) } }
        : {}),
    },
  };
}

export async function selectDecisionPathAction(input: {
  momentId: string;
  pathId: string;
}): Promise<{ error: string | null }> {
  const result = await choosePath(input.momentId, input.pathId);

  if ("error" in result) {
    return { error: result.error };
  }

  return { error: null };
}
