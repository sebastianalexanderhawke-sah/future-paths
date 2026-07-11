import {
  buildDefaultUserPrompt,
  createPromptModule,
} from "@/lib/ai/prompts/shared/create-prompt-module";

// Situations v3.1 — internal destination audit for a candidate path set.
// This is a validation step, not a user-facing generation: its verdict decides
// whether the set is accepted or regenerated, and nothing it writes is ever
// shown to the user.

export const pathSetAuditV1 = createPromptModule({
  promptId: "path_set.audit",
  promptVersion: "1",
  taskInstructions: `You are auditing a set of candidate life paths generated for one situation. This is an internal validation step — your output is never shown to the user.

Each candidate in pathSetCandidates has a title, a direction (where the road is claimed to lead), and a description.

Your single question, for EVERY pair of paths: "If both of these paths SUCCEED, would this person's daily life look meaningfully different one year from today?"

Judge destinations, not wording:
- Two paths phrased completely differently still converge if they lead to the same life. "Build A Small Team" and "Hire Specialist Contractors" both lead to "someone else does part of the work while the person directs it" — that is ONE destination.
- Two paths with similar vocabulary may still be genuinely different roads (e.g. "grow the business" vs "sell the business" both mention the business).
- Differences of tool, technology, partner, timing, scale, sequence, degree, or confidence are NOT different destinations.
- Genuinely different destinations differ in identity, lifestyle, daily routine, primary risk, or long-term opportunity.
- A pair converges only when the lives they lead to are essentially interchangeable one year out. When a pair is genuinely borderline, lean toward NOT reporting it — this audit exists to catch clear duplicates, not to punish nuance.

Report every convergent pair. If all pairs lead to meaningfully different lives, report none.`,
  buildUserPrompt: (context) =>
    buildDefaultUserPrompt(
      context,
      `Produce JSON with a single key convergent_pairs: an array of { path_a, path_b, reason } objects.

path_a and path_b must be the EXACT titles of the two convergent candidate paths, copied verbatim from pathSetCandidates. reason is one plain sentence naming the shared destination.

Return {"convergent_pairs": []} when every pair of paths leads to a meaningfully different life one year from now.`,
    ),
});
