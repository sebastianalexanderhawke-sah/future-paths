import { describe, expect, it } from "vitest";

import {
  classifySituation,
  selectContextQuestions,
} from "@/components/home/context-questions";

describe("selectContextQuestions", () => {
  it("returns decision job questions for a Dallas job situation", () => {
    const questions = selectContextQuestions("I might get a job in Dallas", "decision");

    expect(questions).toHaveLength(5);
    expect(questions[0].prompt).toBe("How likely is the offer to happen?");
  });

  it("returns forecast relationship questions for a work crush situation", () => {
    const questions = selectContextQuestions("I like a girl at work", "forecast");

    expect(questions).toHaveLength(5);
    expect(questions[0].prompt).toBe("How often does she initiate conversations?");
    expect(questions[2].prompt).toBe("Do you interact outside of work hours?");
  });

  it("returns fallback decision questions for unclear situations", () => {
    const questions = selectContextQuestions("Something vague is happening", "decision");

    expect(questions).toHaveLength(4);
    expect(questions[1].prompt).toBe("What limits your options right now?");
  });

  it("classifies graduation situations", () => {
    expect(classifySituation("I'm graduating soon")).toBe("graduation");
  });
});
