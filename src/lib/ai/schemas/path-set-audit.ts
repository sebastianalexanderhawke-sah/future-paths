import { z } from "zod";

// Situations v3.1 — output contract for the internal path-set destination
// audit (path_set.audit). The auditor names pairs of candidate paths whose
// roads converge on essentially the same destination, regardless of wording.
// An empty list means every pair leads somewhere meaningfully different.

export const pathSetAuditOutputSchema = z.object({
  convergent_pairs: z
    .array(
      z.object({
        path_a: z.string().trim().min(1).max(120),
        path_b: z.string().trim().min(1).max(120),
        reason: z.string().trim().max(300).default(""),
      }),
    )
    .default([]),
});

export type PathSetAuditOutput = z.output<typeof pathSetAuditOutputSchema>;

export function parsePathSetAuditOutput(data: unknown): PathSetAuditOutput {
  return pathSetAuditOutputSchema.parse(data);
}
