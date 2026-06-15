import { describe, expect, it } from "vitest";

import {
  buildContextSummary,
  classifySituation,
  planNextDiscoveryQuestion,
  selectContextQuestions,
  selectQuestionsForGoal,
  type ContextQuestion,
} from "@/components/home/context-questions";
import { loadDiscoveryQuestionContext } from "@/lib/ai/context/builder";

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

  it("returns all questions unchanged for decision mode", () => {
    const input = makeQuestions(5);
    const result = selectQuestionsForGoal(input, "decision");
    expect(result).toHaveLength(5);
    expect(result).toEqual(input);
  });

  it("returns all questions unchanged for forecast mode", () => {
    const input = makeQuestions(6);
    const result = selectQuestionsForGoal(input, "forecast");
    expect(result).toHaveLength(6);
    expect(result).toEqual(input);
  });

  it("handles empty input gracefully for both modes", () => {
    expect(selectQuestionsForGoal([], "decision")).toHaveLength(0);
    expect(selectQuestionsForGoal([], "forecast")).toHaveLength(0);
  });

  it("preserves question order for both modes", () => {
    const input = makeQuestions(5);
    expect(selectQuestionsForGoal(input, "decision")[0]?.id).toBe("q-0");
    expect(selectQuestionsForGoal(input, "forecast")[0]?.id).toBe("q-0");
  });
});

describe("buildContextSummary", () => {
  const makeQuestions = (count: number): ContextQuestion[] =>
    Array.from({ length: count }, (_, i) => ({
      id: `q-${i}`,
      prompt: `Question ${i + 1}`,
      category: "Custom" as const,
    }));

  it("returns null when there are no answers and no additionalContext", () => {
    const result = buildContextSummary(makeQuestions(3), {});
    expect(result).toBeNull();
  });

  it("returns Q&A pairs joined by double newlines when no additionalContext", () => {
    const questions = makeQuestions(2);
    const answers = { "q-0": "Answer 1", "q-1": "Answer 2" };
    const result = buildContextSummary(questions, answers);
    expect(result).toBe("Question 1\nAnswer 1\n\nQuestion 2\nAnswer 2");
  });

  it("prepends additionalContext before Q&A when present", () => {
    const questions = makeQuestions(1);
    const answers = { "q-0": "Some answer." };
    const result = buildContextSummary(questions, answers, "Background info here.");
    expect(result).toBe("Background info here.\n\nQuestion 1\nSome answer.");
    expect(result!.indexOf("Background info here.")).toBeLessThan(result!.indexOf("Question 1"));
  });

  it("returns only additionalContext when there are no Q&A answers", () => {
    const result = buildContextSummary(makeQuestions(3), {}, "Just context, no answers.");
    expect(result).toBe("Just context, no answers.");
  });

  it("omits additionalContext cleanly when it is empty or whitespace-only", () => {
    const questions = makeQuestions(1);
    const answers = { "q-0": "An answer." };
    expect(buildContextSummary(questions, answers, "")).toBe("Question 1\nAn answer.");
    expect(buildContextSummary(questions, answers, "   ")).toBe("Question 1\nAn answer.");
    expect(buildContextSummary(questions, answers, undefined)).toBe("Question 1\nAn answer.");
  });

  it("skips unanswered questions", () => {
    const questions = makeQuestions(3);
    const answers = { "q-0": "First answer.", "q-2": "Third answer." };
    const result = buildContextSummary(questions, answers);
    expect(result).toContain("Question 1\nFirst answer.");
    expect(result).toContain("Question 3\nThird answer.");
    expect(result).not.toContain("Question 2");
  });
});

describe("loadDiscoveryQuestionContext (context bundle)", () => {
  const baseBundle = { userId: "user-1", profile: "discovery_question" as const };

  it("sets discoveryAdditionalContext on the bundle when additionalContext override is provided", () => {
    const bundle = loadDiscoveryQuestionContext(baseBundle, {
      userId: "user-1",
      profile: "discovery_question",
      overrides: {
        situationText: "I like someone at work",
        additionalContext: "We've been colleagues for two years and have had lunch a few times.",
      },
    });

    expect(bundle.discoveryAdditionalContext).toBe(
      "We've been colleagues for two years and have had lunch a few times.",
    );
  });

  it("leaves discoveryAdditionalContext undefined when no additionalContext override is given", () => {
    const bundle = loadDiscoveryQuestionContext(baseBundle, {
      userId: "user-1",
      profile: "discovery_question",
      overrides: {
        situationText: "I like someone at work",
      },
    });

    expect(bundle.discoveryAdditionalContext).toBeUndefined();
  });

  it("leaves discoveryAdditionalContext undefined when additionalContext is empty string", () => {
    const bundle = loadDiscoveryQuestionContext(baseBundle, {
      userId: "user-1",
      profile: "discovery_question",
      overrides: {
        situationText: "I like someone at work",
        additionalContext: "   ",
      },
    });

    expect(bundle.discoveryAdditionalContext).toBeUndefined();
  });

  it("still sets moment.title from situationText", () => {
    const bundle = loadDiscoveryQuestionContext(baseBundle, {
      userId: "user-1",
      profile: "discovery_question",
      overrides: {
        situationText: "I like someone at work",
        additionalContext: "Some background.",
      },
    });

    expect(bundle.moment?.title).toBe("I like someone at work");
  });
});
