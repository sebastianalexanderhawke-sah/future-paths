import { describe, expect, it } from "vitest";

import {
  classifySituation,
  DECISION_MODE_QUESTION_COUNT,
  planNextDiscoveryQuestion,
  selectContextQuestions,
  selectQuestionsForGoal,
  type ContextQuestion,
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

describe("selectQuestionsForGoal", () => {
  const makeQuestions = (count: number): ContextQuestion[] =>
    Array.from({ length: count }, (_, i) => ({
      id: `q-${i}`,
      prompt: `Question ${i + 1}`,
      category: "Custom" as const,
    }));

  it("returns exactly 1 question for decision mode regardless of input count", () => {
    const questions = selectQuestionsForGoal(makeQuestions(5), "decision");
    expect(questions).toHaveLength(DECISION_MODE_QUESTION_COUNT);
    expect(questions[0]?.prompt).toBe("Question 1");
  });

  it("returns the first (highest-priority) question for decision mode", () => {
    const input = makeQuestions(4);
    const result = selectQuestionsForGoal(input, "decision");
    expect(result[0]?.id).toBe("q-0");
  });

  it("returns all questions unchanged for forecast mode", () => {
    const input = makeQuestions(5);
    const result = selectQuestionsForGoal(input, "forecast");
    expect(result).toHaveLength(5);
    expect(result).toEqual(input);
  });

  it("handles empty input gracefully for decision mode", () => {
    const result = selectQuestionsForGoal([], "decision");
    expect(result).toHaveLength(0);
  });

  it("context summary for decision mode includes the single question answer", () => {
    const questions = selectQuestionsForGoal(makeQuestions(5), "decision");
    const answers: Record<string, string> = { "q-0": "We last spoke about 6 months ago." };
    const lines = questions
      .map((q) => {
        const answer = answers[q.id]?.trim();
        return answer ? `${q.prompt}\n${answer}` : null;
      })
      .filter((line): line is string => line !== null);
    const summary = lines.join("\n\n");
    expect(summary).toContain("Question 1");
    expect(summary).toContain("We last spoke about 6 months ago.");
  });
});
