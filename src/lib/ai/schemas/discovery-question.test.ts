import { describe, expect, it } from "vitest";

import {
  discoveryQuestionOutputSchema,
  parseDiscoveryQuestionOutput,
} from "@/lib/ai/schemas/discovery-question";

describe("discovery question schema", () => {
  it("parses valid 4-5 question payload", () => {
    const parsed = parseDiscoveryQuestionOutput({
      questions: [
        {
          question: "What is the biggest reason you're considering moving?",
          category: "Relocation",
          reason: "Primary motivation strongly influences path generation.",
        },
        {
          question: "Do you already know where you'd move?",
          category: "Relocation",
          reason: "A known destination changes what paths are realistic.",
        },
        {
          question: "What would be hardest to leave behind?",
          category: "Relocation",
          reason: "Tradeoffs reveal what the move would cost emotionally and practically.",
        },
        {
          question: "How soon would you realistically make this decision?",
          category: "Relocation",
          reason: "Timing determines whether waiting, preparing, or acting is the live path.",
        },
      ],
    });

    expect(parsed.questions).toHaveLength(4);
    expect(discoveryQuestionOutputSchema.safeParse(parsed).success).toBe(true);
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
