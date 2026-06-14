import { describe, expect, it } from "vitest";

import {
  formatPathBenefits,
  formatPathConsequences,
  formatPathFutureYou,
  formatPathOutcomes,
  formatPathSummary,
  isCompleteSentence,
  isReflectivePathContent,
  shouldPreservePathSentence,
  summarizeToCompleteSentence,
} from "@/components/home/path-quality";

describe("path quality", () => {
  it("rewrites reflective coaching inputs into event outcomes", () => {
    expect(isReflectivePathContent("Gain clarity")).toBe(true);
    expect(isReflectivePathContent("Better understand your feelings")).toBe(true);

    const outcomes = formatPathOutcomes(["Gain clarity"], ["Reflect further"]);
    expect(outcomes).toEqual([
      "You get a clear answer sooner.",
      "The situation stays unresolved for longer.",
    ]);
  });

  it("separates benefits and consequences for tradeoff comparison", () => {
    const benefits = formatPathBenefits(
      ["A relationship begins", "Gain clarity"],
      "Direct Approach",
    );
    const consequences = formatPathConsequences(
      ["She may not share the same interest", "Workplace becomes awkward"],
      "Direct Approach",
    );
    const friendshipBenefits = formatPathBenefits([], "Friendship First");
    const friendshipConsequences = formatPathConsequences([], "Friendship First");

    expect(benefits.length).toBeGreaterThanOrEqual(3);
    expect(consequences.length).toBeGreaterThanOrEqual(3);
    expect(friendshipBenefits).toContain("You pick up details about her life naturally.");
    expect(friendshipConsequences).toContain("Someone else may make a move first.");
    benefits.forEach((benefit) => {
      expect(benefit.endsWith(".")).toBe(true);
      expect(isReflectivePathContent(benefit)).toBe(false);
    });
    consequences.forEach((consequence) => {
      expect(consequence.endsWith(".")).toBe(true);
      expect(isReflectivePathContent(consequence)).toBe(false);
    });
  });

  it("never returns truncated summaries or future-you fragments", () => {
    const summary = formatPathSummary(
      "You might explore building more frequent one-on-one interactions outside the office and see",
      ["Clearer read on whether the connection could become romantic"],
      "Direct Approach",
    );

    expect(summary).not.toContain("…");
    expect(isCompleteSentence(summary)).toBe(true);

    const futureYou = formatPathFutureYou(
      "Wait And Observe",
      "This path may gradually reveal whether the connection is real.",
      ["Stability"],
    );

    expect(futureYou).toBe(
      "More deliberate before acting on uncertainty.",
    );
    expect(futureYou).not.toContain("gradually reveal");
  });

  it("summarizes long fragments into complete sentences", () => {
    const sentence = summarizeToCompleteSentence(
      "Clearer read on whether the connection could become romantic or stay platonic over time",
    );

    expect(sentence).not.toContain("…");
    expect(isCompleteSentence(sentence)).toBe(true);
  });

  it("preserves complete Claude sentences unchanged during refinement", () => {
    const signalConsequence =
      "She may not pick up on the signals, leaving you no clearer than before.";
    const interestConsequence =
      "She may not share the interest or connection you assumed, making the setup feel forced.";
    const explanation =
      "Invite her to a specific activity outside of work — coffee, lunch, or an event — making your interest clear with a direct ask.";

    expect(shouldPreservePathSentence(signalConsequence)).toBe(true);
    expect(shouldPreservePathSentence(interestConsequence)).toBe(true);
    expect(shouldPreservePathSentence(explanation)).toBe(true);

    expect(formatPathConsequences([signalConsequence], "Ask Her Out")).toContain(
      signalConsequence,
    );
    expect(formatPathConsequences([interestConsequence], "Ask Her Out")).toContain(
      interestConsequence,
    );
    expect(formatPathSummary(explanation, [], "Ask Her Out")).toBe(explanation);
  });

  it("preserves complete sentences with verbs not previously in VERB_PATTERN", () => {
    const s1 = "A genuine friendship forms that survives regardless of romantic outcome.";
    const s2 =
      "Any relationship that develops begins on a legally and professionally informed footing.";
    const s3 = "The group setting provides social cover if the moment does not land.";
    const s4 =
      "If the moment lands well, it may lead directly to plans between just the two of you.";

    expect(shouldPreservePathSentence(s1)).toBe(true);
    expect(shouldPreservePathSentence(s2)).toBe(true);
    expect(shouldPreservePathSentence(s3)).toBe(true);
    expect(shouldPreservePathSentence(s4)).toBe(true);

    expect(formatPathOutcomes([s1], [])).toEqual([s1]);
    expect(formatPathOutcomes([s2], [])).toEqual([s2]);
    expect(formatPathOutcomes([s3], [])).toEqual([s3]);
    expect(formatPathOutcomes([s4], [])).toEqual([s4]);
  });

  it("preserves sentences with 'begins' and does not apply overly-broad OUTCOME_REWRITES", () => {
    const sentence = "A romantic relationship begins before the moment passes.";
    expect(shouldPreservePathSentence(sentence)).toBe(true);
    const outcomes = formatPathOutcomes([sentence], []);
    expect(outcomes).toContain(sentence);
    expect(outcomes).not.toContain("A relationship begins.");
  });

  it("preserves sentences ending in a stranded preposition 'to' and does not truncate them", () => {
    const sentence = "A direct approach may signal confidence she responds well to.";
    expect(shouldPreservePathSentence(sentence)).toBe(true);
    const outcomes = formatPathOutcomes([sentence], []);
    expect(outcomes).toContain(sentence);
    expect(outcomes[0]).not.toMatch(/responds well\.?$/);
  });

  it("preserves sentences ending in 'you' and does not truncate them", () => {
    const sentence =
      "If the moment lands well, it may lead directly to plans between just the two of you.";
    expect(shouldPreservePathSentence(sentence)).toBe(true);
    const outcomes = formatPathOutcomes([sentence], []);
    expect(outcomes).toContain(sentence);
    expect(outcomes[0]).not.toMatch(/two of\.?$/);
  });

  it("preserves substantive Claude future_shift statements unchanged", () => {
    const earlyInterestShift =
      "You may become someone who acts on interest early rather than waiting for certainty to arrive on its own.";
    const relationalGroundworkShift =
      "You may become someone who builds relational groundwork before making a move and becomes better at reading mutual interest.";

    expect(formatPathFutureYou("Ask Her Out", earlyInterestShift)).toBe(earlyInterestShift);
    expect(formatPathFutureYou("Friendship First", relationalGroundworkShift)).toBe(
      relationalGroundworkShift,
    );
  });
});
