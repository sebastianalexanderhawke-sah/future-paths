import type { z } from "zod";

import { runStructuredGeneration } from "@/lib/ai/orchestrator";
import { runStreamingGeneration } from "@/lib/ai/stream";
import { crossroadOutputSchema } from "@/lib/ai/schemas/crossroad";
import {
  auditPathSetDiversity,
  describePathSetDiversityIssues,
  type PathSetDiversityIssue,
} from "@/lib/path-set-diversity";
import { auditPathSetDestinations } from "@/lib/path-set-semantic-audit";
import type { GenerationResult } from "@/lib/ai/types";
import { reportError } from "@/lib/observability";

// Typed as the schema's INPUT shape, matching persistGeneratedPaths — the
// optional fields carry schema defaults at runtime, and z.ZodType<T> can only
// bind one of the two shapes.
export type CrossroadOutput = z.input<typeof crossroadOutputSchema>;

export type DiverseCrossroadResult = GenerationResult<CrossroadOutput> & {
  /** Issues still present in the returned set (fail-open acceptance).
   *  Undefined on failure or when the returned set passed validation. */
  remainingDiversityIssues?: PathSetDiversityIssue[];
};

// Situations v3 — the single entry point for generating a situation's path
// set, shared by the synchronous generatePaths flow and the streaming
// /api/stream/decision-simulator route so every path set faces the same
// set-level diversity validation before it is persisted.
//
// Flow: generate → audit the whole set → if the set fails, regenerate ONCE
// with the audit's findings injected as regenerationFeedback → return the
// better of the two attempts. Fail-open by design: a user must never be left
// pathless because both attempts were imperfectly diverse — the remaining
// issues are reported for observability instead.
//
// v3.1 audit hierarchy per attempt: the deterministic checks run first
// (unique directions, assumption challenge, degenerate duplicates); only a
// set that passes those earns the semantic destination audit — a small
// internal model call asking, for every pair, whether the two roads lead to
// meaningfully different lives one year out. Deterministic failures skip the
// semantic call: the set is being regenerated anyway.
export async function generateDiverseCrossroadSet(options: {
  userId: string;
  momentId: string;
  /** Present for the streaming flow. Only the FIRST attempt streams — the
   *  client renders those paths progressively and the final result event
   *  replaces them wholesale, so a silent second attempt stays coherent. */
  onChunk?: (text: string) => void;
}): Promise<DiverseCrossroadResult> {
  const base = {
    userId: options.userId,
    profile: "crossroad" as const,
    promptId: "crossroad.generate" as const,
    schema: crossroadOutputSchema,
  };

  const first = options.onChunk
    ? await runStreamingGeneration(
        { ...base, overrides: { momentId: options.momentId } },
        options.onChunk,
      )
    : await runStructuredGeneration({
        ...base,
        overrides: { momentId: options.momentId },
      });

  if (!first.ok) {
    return first;
  }

  const firstIssues = await auditAttempt(options.userId, first.data);
  if (firstIssues.length === 0) {
    return first;
  }

  const second = await runStructuredGeneration({
    ...base,
    overrides: {
      momentId: options.momentId,
      diversityFeedback: describePathSetDiversityIssues(firstIssues),
    },
  });

  if (!second.ok) {
    // The retry attempt failed outright (timeout, quota, provider error).
    // The first attempt parsed and persists fine — ship it with its issues.
    await reportDiversityAcceptance(options.momentId, firstIssues, "retry_failed");
    return { ...first, remainingDiversityIssues: firstIssues };
  }

  const secondIssues = await auditAttempt(options.userId, second.data);
  if (secondIssues.length === 0) {
    return second;
  }

  // Both attempts imperfect: accept whichever set has fewer diversity issues
  // (ties go to the retry, which at least saw the feedback).
  const better =
    secondIssues.length <= firstIssues.length
      ? { result: second, issues: secondIssues }
      : { result: first, issues: firstIssues };

  await reportDiversityAcceptance(options.momentId, better.issues, "both_attempts_flagged");
  return { ...better.result, remainingDiversityIssues: better.issues };
}

/**
 * v3.1 validation hierarchy for one attempt: deterministic checks first
 * (primary: unique directions; secondary: assumption challenge; plus the
 * degenerate-duplication guard), then — only for sets that pass them — the
 * semantic destination audit. The semantic auditor fails open internally, so
 * an audit outage can only ever under-flag, never block generation.
 */
async function auditAttempt(
  userId: string,
  data: CrossroadOutput,
): Promise<PathSetDiversityIssue[]> {
  const deterministic = auditPathSetDiversity(data.paths);
  if (!deterministic.ok) {
    return deterministic.issues;
  }

  return auditPathSetDestinations({ userId, paths: data.paths });
}

async function reportDiversityAcceptance(
  momentId: string,
  issues: PathSetDiversityIssue[],
  reason: "retry_failed" | "both_attempts_flagged",
): Promise<void> {
  // Observability only — acceptance is deliberate, so this must never throw
  // into the generation flow.
  try {
    await reportError(
      "crossroad-generation: accepted path set with diversity issues",
      new Error(reason),
      {
        momentId,
        issueKinds: issues.map((issue) => issue.kind).join(","),
        issueCount: issues.length,
      },
    );
  } catch {
    // Reporting failures are not the user's problem.
  }
}
