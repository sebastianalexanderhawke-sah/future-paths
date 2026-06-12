import { describe, expect, it } from "vitest";

import { recoverForecastTitle, generateRecoveredFutures } from "@/components/home/forecast-recovery";
import { buildGroundingBundle } from "@/components/home/forecast-grounding";

describe("forecast recovery", () => {
  it("rewrites process-like business futures into concrete events", () => {
    const bundle = buildGroundingBundle({
      situationTitle: "I'm thinking about starting a business",
      contextSummary: null,
      selectedPathTitle: "Launch Now",
    });

    expect(recoverForecastTitle("Early user feedback changes the direction.", bundle)).toBe(
      "Early Feedback Changes The Product",
    );
    expect(recoverForecastTitle("Gain market insight", bundle)).toBe("Early Users Reject The Original Idea");
    expect(recoverForecastTitle("Validation creates learning", bundle)).toBe(
      "The MVP Targets A Different Audience",
    );
  });

  it("generates grounded futures from situation and reasoning when output is sparse", () => {
    const bundle = buildGroundingBundle({
      situationTitle: "I'm thinking about starting a business",
      contextSummary: "Graduation is coming up soon.",
      selectedPathTitle: "Launch Now",
    });

    const recovered = generateRecoveredFutures(
      {
        situationTitle: "I'm thinking about starting a business",
        contextSummary: "Graduation is coming up soon.",
        selectedPathTitle: "Launch Now",
        reasoningSources: [
          "Early user feedback changes the direction.",
          "Gain market insight",
          "Validation creates learning",
        ],
      },
      bundle,
    );

    expect(recovered.length).toBeGreaterThanOrEqual(2);
    expect(recovered.every((future) => future.title.length > 0)).toBe(true);
  });
});
