import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

import {
  parseReflectionQuestionResult,
  reflectionQuestionOutputSchema,
} from "@/lib/reflection-question";
import { validateReflectionAnswerLength } from "@/lib/reflections-validation";

describe("CheckIn reflection fields", () => {
  const DB_SOURCE = readFileSync(resolve(__dirname, "../types/database.ts"), "utf-8");

  it("includes reflection_question and reflection_answer on CheckIn type", () => {
    expect(DB_SOURCE).toContain("reflection_question");
    expect(DB_SOURCE).toContain("reflection_answer");
  });
});

describe("parseReflectionQuestionResult", () => {
  it("returns should_reflect false for routine check-ins", () => {
    expect(
      parseReflectionQuestionResult({
        should_reflect: false,
        question: null,
      }),
    ).toEqual({ should_reflect: false, question: null });
  });

  it("returns should_reflect true and a question for meaningful check-ins", () => {
    expect(
      parseReflectionQuestionResult({
        should_reflect: true,
        question: "What surprised you most about her response?",
      }),
    ).toEqual({
      should_reflect: true,
      question: "What surprised you most about her response?",
    });
  });

  it("rejects should_reflect true without a question", () => {
    expect(() =>
      parseReflectionQuestionResult({
        should_reflect: true,
        question: null,
      }),
    ).toThrow();
  });
});

describe("reflection question generation in createCheckIn", () => {
  const CHECK_INS_SOURCE = readFileSync(resolve(__dirname, "check-ins.ts"), "utf-8");

  it("calls evaluateReflectionQuestion after forecast regeneration", () => {
    expect(CHECK_INS_SOURCE).toContain("evaluateReflectionQuestion");
    expect(CHECK_INS_SOURCE).toContain("reflection_question");
  });
});

describe("submitReflectionAnswer validation", () => {
  it("rejects answers over 2000 chars", () => {
    expect(validateReflectionAnswerLength("x".repeat(2001))).toBe(
      "Answer must be 2000 characters or fewer.",
    );
  });

  it("accepts answers up to 2000 chars", () => {
    expect(validateReflectionAnswerLength("x".repeat(2000))).toBeNull();
  });
});

describe("submitReflectionAnswer pipeline", () => {
  const REFLECTIONS_SOURCE = readFileSync(resolve(__dirname, "reflections.ts"), "utf-8");
  const ACTIONS_SOURCE = readFileSync(resolve(__dirname, "../actions/reflections.ts"), "utf-8");
  const CURRENT_SELF_SOURCE = readFileSync(resolve(__dirname, "current-self.ts"), "utf-8");

  it("updates reflection_answer on the check-in row", () => {
    expect(REFLECTIONS_SOURCE).toContain("reflection_answer");
    expect(REFLECTIONS_SOURCE).toContain('.eq("id", checkInId)');
    expect(REFLECTIONS_SOURCE).toContain('.eq("user_id", auth.userId)');
  });

  it("triggers Current Self update after storing the answer", () => {
    expect(REFLECTIONS_SOURCE).toContain("requestCurrentSelfRegeneration");
    expect(REFLECTIONS_SOURCE).toContain("checkInReflection");
  });

  it("exports submitReflectionAnswerAction server action", () => {
    expect(ACTIONS_SOURCE).toContain("submitReflectionAnswerAction");
    expect(ACTIONS_SOURCE).toContain("submitReflectionAnswerLib");
  });

  it("passes reflection QA context to Current Self generation", () => {
    expect(CURRENT_SELF_SOURCE).toContain("reflectionQA");
  });
});

describe("/reflections page", () => {
  const PAGE_SOURCE = readFileSync(
    resolve(__dirname, "../app/(protected)/reflections/page.tsx"),
    "utf-8",
  );

  it("renders waiting section, completed reflections list, and prediction card", () => {
    expect(PAGE_SOURCE).toContain("Waiting");
    expect(PAGE_SOURCE).toContain("CompletedReflectionsList");
    expect(PAGE_SOURCE).toContain("ReflectionPredictionCard");
  });
});

describe("overview Reflection Waiting section", () => {
  const OVERVIEW_SOURCE = readFileSync(
    resolve(__dirname, "../app/(protected)/overview/page.tsx"),
    "utf-8",
  );
  const SECTION_SOURCE = readFileSync(
    resolve(__dirname, "../components/home/reflection-waiting-home-section.tsx"),
    "utf-8",
  );

  it("fetches unanswered reflection summary", () => {
    expect(OVERVIEW_SOURCE).toContain("getUnansweredReflectionSummary");
  });

  it("passes pending reflection to section component", () => {
    expect(OVERVIEW_SOURCE).toContain("pendingReflection");
    expect(OVERVIEW_SOURCE).toContain("ReflectionWaitingHomeSection");
  });

  it("links to /reflections and shows pending reflection", () => {
    expect(SECTION_SOURCE).toContain("/reflections");
    expect(SECTION_SOURCE).toContain("Reflection Waiting");
    expect(SECTION_SOURCE).toContain("Answer");
  });
});

describe("reflectionQuestionOutputSchema examples", () => {
  it("models a nothing-changed check-in response", () => {
    const parsed = reflectionQuestionOutputSchema.parse({
      should_reflect: false,
      question: null,
    });
    expect(parsed.should_reflect).toBe(false);
  });

  it("models a meaningful check-in response", () => {
    const parsed = reflectionQuestionOutputSchema.parse({
      should_reflect: true,
      question: "What did this reveal about what you value?",
    });
    expect(parsed.should_reflect).toBe(true);
    expect(parsed.question).toBeTruthy();
  });
});
