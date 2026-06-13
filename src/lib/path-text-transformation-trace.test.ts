import { describe, expect, it } from "vitest";

import { formatPathBenefitsWithTrace } from "@/components/home/path-quality";
import {
  buildPathTextTransformationTrace,
  computePathTextTransformationMetrics,
  createPathTextTransformationAudit,
} from "@/lib/path-text-transformation-trace";

describe("path text transformation trace", () => {
  it("still rewrites reflective coaching inputs during traced refinement", () => {
    const { bullets, traces } = formatPathBenefitsWithTrace(["Gain clarity"], "Direct Approach");

    expect(bullets[0]).toBe("You get a clear answer sooner.");
    expect(traces[0]?.trace.flags.preservedBypass).toBe(false);
    expect(traces[0]?.trace.flags.modified).toBe(true);
  });

  it("computes transformation metrics across path fields", () => {
    const metrics = computePathTextTransformationMetrics(
      createPathTextTransformationAudit([
        {
          pathIndex: 0,
          pathTitle: "Ask Her Out",
          fields: [
            {
              field: "benefit",
              index: 0,
              label: "Benefit #1",
              trace: buildPathTextTransformationTrace(
                "Original benefit",
                "Original benefit",
                "Original benefit",
                "Original benefit",
              ),
            },
            {
              field: "benefit",
              index: 1,
              label: "Benefit #2",
              trace: buildPathTextTransformationTrace(
                "Another benefit",
                "Another",
                "Another and see what follows",
                "Another and see what follows.",
              ),
            },
          ],
        },
      ]),
    );

    expect(metrics.totalFields).toBe(2);
    expect(metrics.preservedFields).toBe(1);
    expect(metrics.corruptedFields).toBe(1);
    expect(metrics.percentages.preserved).toBe(50);
    expect(metrics.percentages.corrupted).toBe(50);
  });
});
