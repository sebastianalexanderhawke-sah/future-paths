import { describe, expect, it } from "vitest";

import { generateMockCrossroads } from "@/lib/mock-crossroad-generator";
import {
  auditPathSetDiversity,
  describePathSetDiversityIssues,
} from "@/lib/path-set-diversity";

function path(
  title: string,
  description: string,
  direction = "",
  challenges_assumption = "",
) {
  return {
    title,
    description,
    direction,
    challenges_assumption,
    future_shift: "Changes how the next months unfold.",
  };
}

// A set modeled on the Situations v3 "good" example: five different roads,
// one of which challenges the framing.
const DIVERSE_SET = [
  path(
    "Build A Team",
    "Hire two part-time people and shift from producing everything to directing it.",
    "a bigger, team-led business",
  ),
  path(
    "Simplify The Business",
    "Cut the site down to its highest-value core so it needs far less ongoing work.",
    "a smaller, calmer business",
    "That the business should keep growing.",
  ),
  path(
    "Change The Business Model",
    "Move from ongoing content to a paid product that does not demand weekly output.",
    "a product business instead of a content business",
  ),
  path(
    "Stay Intentionally Solo",
    "Keep the operation deliberately one-person and let that constraint set its size.",
    "a deliberately solo operation",
  ),
  path(
    "Pause Growth To Strengthen The Foundation",
    "Hold the business at its current size for a year and rebuild the systems underneath it.",
    "the same business on sturdier foundations",
  ),
];

describe("auditPathSetDiversity", () => {
  it("passes a set of genuinely different directions", () => {
    const audit = auditPathSetDiversity(DIVERSE_SET);
    expect(audit.issues).toEqual([]);
    expect(audit.ok).toBe(true);
  });

  it("flags a set below five paths so it regenerates instead of hard-failing", () => {
    const audit = auditPathSetDiversity(DIVERSE_SET.slice(0, 4));

    expect(audit.ok).toBe(false);
    expect(audit.issues).toContainEqual({ kind: "too_few_paths", count: 4 });
  });

  it("flags two paths that declare the same direction", () => {
    const audit = auditPathSetDiversity([
      ...DIVERSE_SET.slice(0, 3),
      path(
        "Hire A Freelancer",
        "Bring in one focused freelancer to own the work costing the most time.",
        "delegated content work",
      ),
      path(
        "Use AI Tools",
        "Set up an AI pipeline so drafts appear without daily input.",
        "Delegated content work",
      ),
    ]);

    expect(audit.ok).toBe(false);
    expect(audit.issues).toContainEqual({
      kind: "shared_direction",
      direction: "delegated content work",
      titles: ["Hire A Freelancer", "Use AI Tools"],
    });
  });

  it("treats reworded direction labels as the same destination", () => {
    const audit = auditPathSetDiversity([
      ...DIVERSE_SET.slice(0, 3),
      path("Path A", "First framing of the road.", "the delegated work"),
      path("Path B", "Second framing of the road.", "work, delegated"),
    ]);

    expect(audit.issues.some((issue) => issue.kind === "shared_direction")).toBe(true);
  });

  it("flags near-identical prose (degenerate duplication) even when labels differ", () => {
    const audit = auditPathSetDiversity([
      ...DIVERSE_SET.slice(0, 3),
      path(
        "Hire A Content Freelancer",
        "Bring in a freelancer to draft the weekly content and manage the publishing schedule.",
        "outsourced content",
      ),
      path(
        "Hire A Niche Content Freelancer",
        "Bring in a niche freelancer to draft the weekly content and manage the publishing schedule.",
        "specialist content help",
      ),
    ]);

    expect(audit.ok).toBe(false);
    expect(
      audit.issues.some(
        (issue) =>
          issue.kind === "implementation_variants" &&
          issue.titles.includes("Hire A Content Freelancer"),
      ),
    ).toBe(true);
  });

  it("does NOT judge destination by wording — differently-phrased paths pass the deterministic tier", () => {
    // These two converge on the same life (someone else does the work), but
    // that is a MEANING judgment: it belongs to the semantic audit, not to
    // lexical overlap. The deterministic tier must let them through.
    const audit = auditPathSetDiversity([
      ...DIVERSE_SET.slice(0, 3),
      path(
        "Build A Small Team",
        "Bring on two part-time employees and grow into a manager of people.",
        "a team-led operation",
      ),
      path(
        "Hire Specialist Contractors",
        "Engage freelancers for the content and tech so your week frees up.",
        "delegated specialist work",
      ),
    ]);

    expect(audit.ok).toBe(true);
  });

  it("requires at least one assumption-challenging path", () => {
    const noChallenge = DIVERSE_SET.map((p) => ({ ...p, challenges_assumption: "" }));
    const audit = auditPathSetDiversity(noChallenge);

    expect(audit.ok).toBe(false);
    expect(audit.issues).toContainEqual({ kind: "missing_assumption_challenge" });
  });

  it("accepts the mock generator's path set (mock mode must never trigger a retry)", () => {
    const mock = generateMockCrossroads({
      title: "should i start a business",
      description: "I want to make an app.",
    });

    expect(auditPathSetDiversity(mock.paths)).toEqual({ ok: true, issues: [] });
  });

  it("does not group paths with empty direction labels", () => {
    const unlabeled = DIVERSE_SET.map((p) => ({ ...p, direction: "" }));
    const audit = auditPathSetDiversity(unlabeled);

    expect(audit.issues.some((issue) => issue.kind === "shared_direction")).toBe(false);
  });
});

describe("describePathSetDiversityIssues", () => {
  it("renders one plain-language line per issue", () => {
    const feedback = describePathSetDiversityIssues([
      {
        kind: "shared_direction",
        direction: "delegated content work",
        titles: ["Hire A Freelancer", "Use AI Tools"],
      },
      { kind: "missing_assumption_challenge" },
    ]);

    expect(feedback).toContain('"Hire A Freelancer"');
    expect(feedback).toContain("delegated content work");
    expect(feedback).toContain("challenges_assumption");
    expect(feedback.split("\n")).toHaveLength(2);
  });

  it("renders too_few_paths as a demand for five different futures", () => {
    const feedback = describePathSetDiversityIssues([
      { kind: "too_few_paths", count: 3 },
    ]);

    expect(feedback).toContain("Only 3 paths were generated");
    expect(feedback).toContain("at least five");
  });

  it("renders semantic convergence with its reason", () => {
    const feedback = describePathSetDiversityIssues([
      {
        kind: "convergent_destinations",
        titles: ["Build A Small Team", "Hire Specialist Contractors"],
        reason: "Both lead to other people doing the work while the user directs it.",
      },
    ]);

    expect(feedback).toContain('"Build A Small Team"');
    expect(feedback).toContain("essentially the same life one year from now");
    expect(feedback).toContain("other people doing the work");
  });
});
