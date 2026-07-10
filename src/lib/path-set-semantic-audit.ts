import { getPromptDefinition } from "@/lib/ai/prompts/registry";
import { getIdentityAIProvider } from "@/lib/ai/providers";
import { pathSetAuditOutputSchema } from "@/lib/ai/schemas/path-set-audit";
import { getUsageTracker } from "@/lib/ai/usage";
import type { PathSetDiversityIssue, PathSetDiversityPath } from "@/lib/path-set-diversity";
import { reportError } from "@/lib/observability";

// Situations v3.1 — the tertiary diversity check: destination-level
// convergence judged by the model's own reasoning, not by lexical overlap.
// "Build A Small Team" and "Hire Specialist Contractors" share almost no
// vocabulary yet lead to the same life; only meaning comparison catches that.
//
// Runs as a small internal call through the same provider stack as every
// other generation (mock mode gets a deterministic clean verdict from the
// mock router). Deliberately does NOT consume the user's daily generation
// quota: it is a bounded guardrail (at most two tiny calls per situation),
// not a user-initiated generation. Usage is still tracked so the spend shows
// up in [ai-usage] telemetry.
//
// Fail-open: if the audit call itself errors, the set is treated as clean —
// a broken validator must never cost the user their paths.

const AUDIT_MAX_TOKENS = 800;

export async function auditPathSetDestinations(options: {
  userId: string;
  paths: PathSetDiversityPath[];
}): Promise<PathSetDiversityIssue[]> {
  const { userId, paths } = options;

  if (paths.length < 2) {
    return [];
  }

  const startedAt = Date.now();
  const prompt = getPromptDefinition("path_set.audit");
  const usageTracker = getUsageTracker();

  try {
    const provider = getIdentityAIProvider();

    const result = await provider.completeStructured({
      profile: "crossroad",
      promptId: prompt.promptId,
      promptVersion: prompt.promptVersion,
      context: {
        userId,
        profile: "crossroad",
        pathSetCandidates: paths.map((path) => ({
          title: path.title?.trim() ?? "",
          direction: path.direction?.trim() ?? "",
          description: path.description,
        })),
      },
      schema: pathSetAuditOutputSchema,
      options: { maxTokens: AUDIT_MAX_TOKENS, temperature: 0 },
    });

    if (provider.id !== "mock") {
      await usageTracker.track({
        userId,
        promptId: prompt.promptId,
        promptVersion: prompt.promptVersion,
        provider: provider.id,
        success: result.ok,
        durationMs: Date.now() - startedAt,
        ...(result.ok
          ? {
              inputTokens: result.usage?.inputTokens,
              outputTokens: result.usage?.outputTokens,
              cacheCreationInputTokens: result.usage?.cacheCreationInputTokens,
              cacheReadInputTokens: result.usage?.cacheReadInputTokens,
            }
          : { error: result.error }),
      });
    }

    if (!result.ok) {
      await reportError(
        "path-set-semantic-audit: audit call failed (failing open)",
        new Error(result.error),
        { userId },
      );
      return [];
    }

    // Only trust pairs whose titles match real candidates — a hallucinated
    // title would produce regeneration feedback about paths that don't exist.
    const knownTitles = new Map(
      paths
        .map((path) => path.title?.trim())
        .filter((title): title is string => !!title)
        .map((title) => [title.toLowerCase(), title] as const),
    );

    const issues: PathSetDiversityIssue[] = [];
    // The schema defaults these fields; the provider generic surfaces the
    // pre-parse (input) type, so guard anyway.
    for (const pair of result.data.convergent_pairs ?? []) {
      const a = knownTitles.get(pair.path_a.trim().toLowerCase());
      const b = knownTitles.get(pair.path_b.trim().toLowerCase());
      if (!a || !b || a === b) {
        continue;
      }

      issues.push({
        kind: "convergent_destinations",
        titles: [a, b],
        reason: pair.reason ?? "",
      });
    }

    return issues;
  } catch (error) {
    await reportError(
      "path-set-semantic-audit: unexpected failure (failing open)",
      error,
      { userId },
    );
    return [];
  }
}
