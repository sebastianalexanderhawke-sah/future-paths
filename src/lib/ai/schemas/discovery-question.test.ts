import { describe, expect, it } from "vitest";

import {
  discoveryQuestionOutputSchema,
  parseDiscoveryQuestionOutput,
} from "@/lib/ai/schemas/discovery-question";

function makeQuestion(index: number, category = "Relocation") {
  return {
    question: `Question ${index + 1}?`,
    category,
    reason: `Reason ${index + 1}.`,
  };
}

describe("discovery question schema", () => {
  it("parses valid 5-question payload", () => {
    const parsed = parseDiscoveryQuestionOutput({
      questions: Array.from({ length: 5 }, (_, i) => makeQuestion(i)),
    });

    expect(parsed.questions).toHaveLength(5);
    expect(discoveryQuestionOutputSchema.safeParse(parsed).success).toBe(true);
  });

  it("parses valid 6-question payload", () => {
    const parsed = parseDiscoveryQuestionOutput({
      questions: Array.from({ length: 6 }, (_, i) => makeQuestion(i)),
    });

    expect(parsed.questions).toHaveLength(6);
    expect(discoveryQuestionOutputSchema.safeParse(parsed).success).toBe(true);
  });

  it("rejects payload with 4 questions (below minimum)", () => {
    expect(() =>
      parseDiscoveryQuestionOutput({
        questions: Array.from({ length: 4 }, (_, i) => makeQuestion(i)),
      }),
    ).toThrow();
  });

  it("rejects payload with 7 questions (above maximum)", () => {
    expect(() =>
      parseDiscoveryQuestionOutput({
        questions: Array.from({ length: 7 }, (_, i) => makeQuestion(i)),
      }),
    ).toThrow();
  });

  it("rejects payload with 3 questions", () => {
    expect(() =>
      parseDiscoveryQuestionOutput({
        questions: [
          {
            question: "What attracts you most about the new role?",
            category: "Career",
            reason: "Motivation separates growth paths from escape paths.",
          },
          {
            question: "What would you lose by staying where you are?",
            category: "Career",
            reason: "Opportunity cost clarifies whether staying is truly safe.",
          },
          {
            question: "Do you have a deadline to decide?",
            category: "Career",
            reason: "Timing changes whether negotiation or immediate action is realistic.",
          },
        ],
      }),
    ).toThrow();
  });

  it("rejects payload with invalid category", () => {
    expect(() =>
      parseDiscoveryQuestionOutput({
        questions: [
          {
            question: "What outcome would tell you this is working?",
            category: "Wellness",
            reason: "Success criteria shape which health paths are worth pursuing.",
          },
          {
            question: "What has stopped you from acting on this before?",
            category: "Health",
            reason: "Past blockers reveal recurring constraints in generated paths.",
          },
          {
            question: "Who supports you when health decisions get hard?",
            category: "Health",
            reason: "Support systems change feasibility of sustained paths.",
          },
          {
            question: "Is there a timeline or event driving this decision?",
            category: "Health",
            reason: "Timing pressure affects which paths are urgent versus gradual.",
          },
        ],
      }),
    ).toThrow();
  });
});
