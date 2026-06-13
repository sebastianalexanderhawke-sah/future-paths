import { describe, expect, it } from "vitest";

import { formatPathFutureYou, resolveFutureYou } from "@/components/home/path-quality";
import {
  computeFutureShiftPreservationMetrics,
  createFutureShiftPreservationAudit,
} from "@/lib/future-shift-preservation";

describe("future shift preservation", () => {
  const earlyInterestShift =
    "You may become someone who acts on interest early rather than waiting for certainty to arrive on its own.";
  const relationalGroundworkShift =
    "You may become someone who builds relational groundwork before making a move and becomes better at reading mutual interest.";

  it("preserves complete Claude future_shift text over title templates", () => {
    expect(formatPathFutureYou("Ask Her Out", earlyInterestShift)).toBe(earlyInterestShift);
    expect(formatPathFutureYou("Friendship First", relationalGroundworkShift)).toBe(
      relationalGroundworkShift,
    );
  });

  it("still falls back for reflective coaching fragments", () => {
    expect(formatPathFutureYou("Wait And Observe", "Gain clarity.")).toBe(
      "More deliberate before acting on uncertainty.",
    );
    expect(
      formatPathFutureYou("Wait And Observe", "This path may gradually reveal whether the connection is real.", [
        "Stability",
      ]),
    ).toBe("More deliberate before acting on uncertainty.");
  });

  it("computes future shift preservation metrics", () => {
    const preserved = resolveFutureYou("Ask Her Out", earlyInterestShift);
    const fallback = resolveFutureYou("Wait And Observe", "Gain clarity.");

    const metrics = computeFutureShiftPreservationMetrics(
      createFutureShiftPreservationAudit([
        {
          pathIndex: 0,
          pathTitle: "Ask Her Out",
          rawFutureShift: earlyInterestShift,
          validationResult: preserved.validation,
          displayedFutureShift: preserved.futureYou,
          status: preserved.status,
        },
        {
          pathIndex: 1,
          pathTitle: "Wait And Observe",
          rawFutureShift: "Gain clarity.",
          validationResult: fallback.validation,
          displayedFutureShift: fallback.futureYou,
          status: fallback.status,
        },
      ]),
    );

    expect(metrics.preservedFutureShifts).toBe(1);
    expect(metrics.fallbackFutureShifts).toBe(1);
    expect(metrics.percentages.preservedFutureShifts).toBe(50);
    expect(metrics.percentages.fallbackFutureShifts).toBe(50);
  });
});
