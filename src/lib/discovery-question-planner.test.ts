import { describe, expect, it } from "vitest";

import {
  classifySituation,
  planDiscoveryQuestionSession,
  planNextDiscoveryQuestion,
  selectContextQuestions,
} from "@/components/home/context-questions";

describe("discovery question planner", () => {
  it("asks relocation-specific first question for moving cities", () => {
    const first = planNextDiscoveryQuestion({
      title: "I'm thinking about moving cities",
      goal: "decision",
    });

    expect(first?.category).toBe("Relocation");
    expect(first?.question).toBe("What is the biggest reason you're considering moving?");
    expect(first?.isGeneric).toBe(false);
  });

  it("asks relationship-specific first question for a work crush", () => {
    const first = planNextDiscoveryQuestion({
      title: "I like this girl at work",
      goal: "forecast",
    });

    expect(first?.category).toBe("Relationships");
    expect(first?.question).toBe("Have you spent time together one-on-one?");
  });

  it("asks business-specific first question for starting a business", () => {
    const first = planNextDiscoveryQuestion({
      title: "I'm thinking about starting a business",
      goal: "decision",
    });

    expect(first?.category).toBe("Business");
    expect(first?.question).toBe("Do you already have customers?");
  });

  it("does not ask about offer likelihood without an offer in the situation", () => {
    const session = selectContextQuestions("I'm thinking about moving cities", "decision");

    expect(session.some((question) => /offer to happen/i.test(question.prompt))).toBe(false);
  });

  it("does not ask about offer likelihood for a job mention without an offer", () => {
    const first = planNextDiscoveryQuestion({
      title: "I might get a job in Dallas",
      goal: "decision",
    });

    expect(first?.prompt).not.toBe("How likely is the offer to happen?");
  });

  it("evolves later questions from previous answers", () => {
    const first = planNextDiscoveryQuestion({
      title: "I'm thinking about moving cities",
      goal: "decision",
    });
    const second = planNextDiscoveryQuestion({
      title: "I'm thinking about moving cities",
      goal: "decision",
      previousAnswers: [
        {
          questionId: first!.id,
          question: first!.question,
          category: first!.category,
          answer: "I want better weather and a lower cost of living.",
        },
      ],
    });

    expect(second?.id).not.toBe(first?.id);
    expect(second?.question).not.toBe(first?.question);
  });

  it("plans a full discovery session", () => {
    const session = planDiscoveryQuestionSession({
      title: "I like this girl at work",
      goal: "forecast",
    });

    expect(session.length).toBeGreaterThanOrEqual(4);
    expect(session[0]?.category).toBe("Relationships");
  });

  it("classifies graduation situations", () => {
    expect(classifySituation("I'm graduating soon")).toBe("graduation");
  });

  it("returns fallback questions for unclear situations", () => {
    const session = selectContextQuestions("Something vague is happening", "decision");

    expect(session.length).toBeGreaterThanOrEqual(4);
    expect(session.every((question) => question.category === "Custom")).toBe(true);
  });
});
