import { describe, expect, it } from "vitest";

import {
  classifySituation,
  planNextDiscoveryQuestion,
  selectContextQuestions,
} from "@/components/home/context-questions";

describe("selectContextQuestions", () => {
  it("returns dynamic job questions without assuming an offer", () => {
    const questions = selectContextQuestions("I might get a job in Dallas", "decision");

    expect(questions.length).toBeGreaterThanOrEqual(4);
    expect(questions.some((question) => question.prompt === "How likely is the offer to happen?")).toBe(
      false,
    );
  });

  it("returns forecast relationship questions for a work crush situation", () => {
    const first = planNextDiscoveryQuestion({
      title: "I like a girl at work",
      goal: "forecast",
    });

    expect(first?.category).toBe("Relationships");
    expect(first?.prompt).toBe("Have you spent time together one-on-one?");
  });

  it("returns fallback decision questions for unclear situations", () => {
    const questions = selectContextQuestions("Something vague is happening", "decision");

    expect(questions.length).toBeGreaterThanOrEqual(4);
    expect(questions[0]?.category).toBe("Custom");
  });

  it("classifies graduation situations", () => {
    expect(classifySituation("I'm graduating soon")).toBe("graduation");
  });
});
