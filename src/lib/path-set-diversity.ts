// Situations v3 — set-level diversity validation for generated path sets.
//
// The investigation behind Situations v3 found that per-path rules cannot
// prevent convergence: five individually valid paths can still be five
// implementations of one strategy. This module judges the SET — it runs after
// schema validation and before persistence, and a rejection triggers one
// regeneration with explicit feedback (see crossroad-generation.ts).
//
// v3.1 validation hierarchy:
//   PRIMARY   — unique `direction` labels (this file): a set that gives two
//               paths the same destination has admitted they are one path.
//   SECONDARY — assumption diversity (this file): at least one path must
//               challenge the user's framing.
//   TERTIARY  — destination meaning (path-set-semantic-audit.ts): the model
//               judges every pair by "would this person's life look
//               meaningfully different one year from now?". Lexical overlap
//               is NOT used to judge destinations — the only text check left
//               here is a guard against near-identical prose (a degenerate
//               generation glitch, not a similarity metric).
//
// This module stays deterministic and AI-free; convergent_destinations
// issues are produced by the semantic auditor and share this issue type.

export type PathSetDiversityPath = {
  title?: string;
  description: string;
  direction?: string;
  challenges_assumption?: string;
  future_shift: string;
};

export type PathSetDiversityIssue =
  | {
      kind: "shared_direction";
      direction: string;
      titles: string[];
    }
  | {
      kind: "implementation_variants";
      titles: [string, string];
    }
  | {
      // v3.1: produced by the semantic destination audit — two paths whose
      // labels and wording differ but whose roads lead to the same life.
      kind: "convergent_destinations";
      titles: [string, string];
      reason: string;
    }
  | { kind: "missing_assumption_challenge" };

export type PathSetDiversityAudit = {
  ok: boolean;
  issues: PathSetDiversityIssue[];
};

const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "before", "but", "by", "for",
  "from", "how", "if", "in", "into", "is", "it", "its", "may", "more", "most",
  "not", "of", "on", "or", "our", "so", "than", "that", "the", "their",
  "them", "then", "there", "these", "this", "to", "toward", "towards", "up",
  "was", "were", "what", "when", "where", "which", "while", "who", "will",
  "with", "without", "you", "your",
]);

function contentTokens(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((token) => token.length > 2 && !STOP_WORDS.has(token)),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) {
    return 0;
  }

  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) {
      intersection += 1;
    }
  }

  return intersection / (a.size + b.size - intersection);
}

/** v3.1: lexical similarity no longer judges destinations (that is the
 *  semantic audit's job — wording measures prose, not meaning). This
 *  threshold only guards against DEGENERATE output: the same path emitted
 *  twice with near-identical text. Genuinely different roads never come
 *  close (production audit average within a situation: ~0.10). */
const NEAR_IDENTICAL_TEXT_THRESHOLD = 0.75;

function normalizeDirection(direction: string): string {
  return [...contentTokens(direction)].sort().join(" ");
}

function pathLabel(path: PathSetDiversityPath, index: number): string {
  const title = path.title?.trim();
  if (title) {
    return title;
  }

  return `path ${index + 1}`;
}

/**
 * Judges a generated path set as a whole. Returns every issue found so a
 * regeneration prompt can name all of them at once.
 */
export function auditPathSetDiversity(
  paths: PathSetDiversityPath[],
): PathSetDiversityAudit {
  const issues: PathSetDiversityIssue[] = [];

  // 1. Shared direction labels: the model's own admission that two paths
  //    lead to the same destination. Empty labels contribute nothing here —
  //    the lexical backstop below still covers them.
  const byDirection = new Map<string, { direction: string; titles: string[] }>();
  paths.forEach((path, index) => {
    const raw = path.direction?.trim() ?? "";
    const normalized = normalizeDirection(raw);
    if (!normalized) {
      return;
    }

    const entry = byDirection.get(normalized) ?? { direction: raw, titles: [] };
    entry.titles.push(pathLabel(path, index));
    byDirection.set(normalized, entry);
  });

  for (const entry of byDirection.values()) {
    if (entry.titles.length >= 2) {
      issues.push({
        kind: "shared_direction",
        direction: entry.direction,
        titles: entry.titles,
      });
    }
  }

  // 2. Degenerate-duplication guard: near-identical prose means the model
  //    emitted the same path twice. This is NOT a destination judgment —
  //    meaning-level convergence is the semantic audit's job.
  const tokenSets = paths.map((path) =>
    contentTokens(`${path.title ?? ""} ${path.description}`),
  );
  for (let i = 0; i < paths.length; i += 1) {
    for (let j = i + 1; j < paths.length; j += 1) {
      if (jaccard(tokenSets[i], tokenSets[j]) >= NEAR_IDENTICAL_TEXT_THRESHOLD) {
        issues.push({
          kind: "implementation_variants",
          titles: [pathLabel(paths[i], i), pathLabel(paths[j], j)],
        });
      }
    }
  }

  // 3. Assumption challenge: every set must contain at least one path that
  //    questions the user's framing.
  const hasChallenge = paths.some(
    (path) => (path.challenges_assumption ?? "").trim().length > 0,
  );
  if (!hasChallenge) {
    issues.push({ kind: "missing_assumption_challenge" });
  }

  return { ok: issues.length === 0, issues };
}

/**
 * Renders audit issues as the plain-language regeneration feedback the
 * crossroad prompt's regenerationFeedback rule expects.
 */
export function describePathSetDiversityIssues(
  issues: PathSetDiversityIssue[],
): string {
  const lines = issues.map((issue) => {
    switch (issue.kind) {
      case "shared_direction":
        return `The paths ${issue.titles.map((t) => `"${t}"`).join(" and ")} lead to the same destination ("${issue.direction}"). They are implementations of one direction — keep the strongest and replace the rest with genuinely different directions.`;
      case "implementation_variants":
        return `The paths "${issue.titles[0]}" and "${issue.titles[1]}" are near-duplicates — they differ in wording, tooling, timing, scale, or sequence, not in where the road leads. Merge them and add a genuinely different direction.`;
      case "convergent_destinations":
        return `The paths "${issue.titles[0]}" and "${issue.titles[1]}" lead to essentially the same life one year from now${issue.reason ? ` — ${issue.reason.replace(/\.$/, "")}` : ""}. Keep the strongest one and replace the other with a genuinely different destination.`;
      case "missing_assumption_challenge":
        return `No path questions an assumption in the user's framing. Include at least one path that challenges the framing itself and names that assumption in its challenges_assumption field.`;
    }
  });

  return lines.join("\n");
}
