import { beforeEach, describe, expect, it, vi } from "vitest";

import { generateDiverseCrossroadSet } from "@/lib/crossroad-generation";
import type { CrossroadOutput } from "@/lib/crossroad-generation";

vi.mock("@/lib/ai/orchestrator", () => ({
  runStructuredGeneration: vi.fn(),
}));
vi.mock("@/lib/ai/stream", () => ({
  runStreamingGeneration: vi.fn(),
}));
vi.mock("@/lib/observability", () => ({
  reportError: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/path-set-semantic-audit", () => ({
  auditPathSetDestinations: vi.fn(),
}));

import { runStructuredGeneration } from "@/lib/ai/orchestrator";
import { runStreamingGeneration } from "@/lib/ai/stream";
import { auditPathSetDestinations } from "@/lib/path-set-semantic-audit";

const mockedStructured = vi.mocked(runStructuredGeneration);
const mockedStreaming = vi.mocked(runStreamingGeneration);
const mockedSemanticAudit = vi.mocked(auditPathSetDestinations);

function makePath(
  title: string,
  description: string,
  direction: string,
  challenges_assumption = "",
) {
  return {
    title,
    description,
    direction,
    challenges_assumption,
    benefits: ["A concrete upside appears.", "Another upside appears."],
    consequences: ["A realistic risk shows up.", "Another risk shows up."],
    future_shift: "Changes how the next months unfold.",
    themes: ["Growth" as const],
  };
}

const DIVERSE_OUTPUT: CrossroadOutput = {
  current_understanding: "You are weighing what this business should become.",
  paths: [
    makePath(
      "Build A Team",
      "Hire two part-time people and shift from producing to directing.",
      "a bigger, team-led business",
    ),
    makePath(
      "Simplify The Business",
      "Cut the site down to its highest-value core so it needs less work.",
      "a smaller, calmer business",
      "That the business should keep growing.",
    ),
    makePath(
      "Change The Business Model",
      "Move from ongoing content to a paid product without weekly output.",
      "a product business",
    ),
  ],
  opportunity_themes: ["Growth"],
  risk_themes: ["Stability"],
};

const CONVERGENT_OUTPUT: CrossroadOutput = {
  ...DIVERSE_OUTPUT,
  paths: [
    makePath(
      "Hire A Freelancer",
      "Bring in one freelancer to own the content work.",
      "delegated content work",
      "That you must do everything yourself.",
    ),
    makePath(
      "Use AI Tools",
      "Set up an AI pipeline so drafts appear without daily input.",
      "delegated content work",
    ),
    makePath(
      "Stay Solo",
      "Keep the operation deliberately one-person.",
      "a deliberately solo operation",
    ),
  ],
};

function success(data: CrossroadOutput) {
  return {
    ok: true as const,
    data,
    metadata: {
      provider: "claude" as const,
      prompt_id: "crossroad.generate",
      prompt_version: "1",
      generated_at: "2026-07-10T00:00:00.000Z",
    },
  };
}

beforeEach(() => {
  mockedStructured.mockReset();
  mockedStreaming.mockReset();
  // Default: destinations judged distinct; individual tests override.
  mockedSemanticAudit.mockReset();
  mockedSemanticAudit.mockResolvedValue([]);
});

describe("generateDiverseCrossroadSet", () => {
  it("returns the first attempt without a retry when the set is diverse", async () => {
    mockedStructured.mockResolvedValueOnce(success(DIVERSE_OUTPUT));

    const result = await generateDiverseCrossroadSet({
      userId: "user-1",
      momentId: "moment-1",
    });

    expect(result.ok).toBe(true);
    expect(mockedStructured).toHaveBeenCalledTimes(1);
    expect(result.remainingDiversityIssues).toBeUndefined();
  });

  it("regenerates once with diversity feedback when the set converges", async () => {
    mockedStructured
      .mockResolvedValueOnce(success(CONVERGENT_OUTPUT))
      .mockResolvedValueOnce(success(DIVERSE_OUTPUT));

    const result = await generateDiverseCrossroadSet({
      userId: "user-1",
      momentId: "moment-1",
    });

    expect(result.ok).toBe(true);
    expect(mockedStructured).toHaveBeenCalledTimes(2);
    if (result.ok) {
      expect(result.data).toBe(DIVERSE_OUTPUT);
    }

    const retryOptions = mockedStructured.mock.calls[1]![0];
    expect(retryOptions.overrides?.diversityFeedback).toContain("Hire A Freelancer");
    expect(retryOptions.overrides?.diversityFeedback).toContain("delegated content work");
  });

  it("fails open on the first attempt when the retry errors", async () => {
    mockedStructured
      .mockResolvedValueOnce(success(CONVERGENT_OUTPUT))
      .mockResolvedValueOnce({ ok: false, error: "timeout", fallbackAvailable: true });

    const result = await generateDiverseCrossroadSet({
      userId: "user-1",
      momentId: "moment-1",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe(CONVERGENT_OUTPUT);
    }
    expect(result.remainingDiversityIssues?.length).toBeGreaterThan(0);
  });

  it("keeps the attempt with fewer issues when both are flagged", async () => {
    const worse: CrossroadOutput = {
      ...CONVERGENT_OUTPUT,
      paths: CONVERGENT_OUTPUT.paths.map((path) => ({
        ...path,
        challenges_assumption: "",
      })),
    };

    mockedStructured
      .mockResolvedValueOnce(success(worse))
      .mockResolvedValueOnce(success(CONVERGENT_OUTPUT));

    const result = await generateDiverseCrossroadSet({
      userId: "user-1",
      momentId: "moment-1",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe(CONVERGENT_OUTPUT);
    }
    expect(result.remainingDiversityIssues?.length).toBe(1);
  });

  it("regenerates when the semantic audit finds convergent destinations despite distinct labels", async () => {
    // "Build A Small Team" vs "Hire Specialist Contractors": different
    // direction labels, almost no shared vocabulary — invisible to every
    // deterministic check, caught only by meaning comparison.
    const semanticallyConvergent: CrossroadOutput = {
      ...DIVERSE_OUTPUT,
      paths: [
        makePath(
          "Build A Small Team",
          "Bring on two part-time employees and grow into a manager of people.",
          "a team-led operation",
          "That you must do everything yourself.",
        ),
        makePath(
          "Hire Specialist Contractors",
          "Engage freelancers for the content and tech so your week frees up.",
          "delegated specialist work",
        ),
        makePath(
          "Simplify The Business",
          "Cut the site down to its highest-value core.",
          "a smaller, calmer business",
        ),
      ],
    };

    mockedStructured
      .mockResolvedValueOnce(success(semanticallyConvergent))
      .mockResolvedValueOnce(success(DIVERSE_OUTPUT));
    mockedSemanticAudit
      .mockResolvedValueOnce([
        {
          kind: "convergent_destinations",
          titles: ["Build A Small Team", "Hire Specialist Contractors"],
          reason: "Both lead to other people doing the work while the user directs it.",
        },
      ])
      .mockResolvedValueOnce([]);

    const result = await generateDiverseCrossroadSet({
      userId: "user-1",
      momentId: "moment-1",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe(DIVERSE_OUTPUT);
    }
    expect(mockedStructured).toHaveBeenCalledTimes(2);

    const retryOptions = mockedStructured.mock.calls[1]![0];
    expect(retryOptions.overrides?.diversityFeedback).toContain(
      "essentially the same life one year from now",
    );
    expect(retryOptions.overrides?.diversityFeedback).toContain(
      "Hire Specialist Contractors",
    );
  });

  it("skips the semantic audit when deterministic checks already failed", async () => {
    mockedStructured
      .mockResolvedValueOnce(success(CONVERGENT_OUTPUT))
      .mockResolvedValueOnce(success(DIVERSE_OUTPUT));

    await generateDiverseCrossroadSet({ userId: "user-1", momentId: "moment-1" });

    // First attempt failed the shared-direction check, so only the clean
    // second attempt earned a semantic call.
    expect(mockedSemanticAudit).toHaveBeenCalledTimes(1);
  });

  it("streams only the first attempt", async () => {
    mockedStreaming.mockResolvedValueOnce(success(CONVERGENT_OUTPUT));
    mockedStructured.mockResolvedValueOnce(success(DIVERSE_OUTPUT));

    const onChunk = vi.fn();
    const result = await generateDiverseCrossroadSet({
      userId: "user-1",
      momentId: "moment-1",
      onChunk,
    });

    expect(mockedStreaming).toHaveBeenCalledTimes(1);
    expect(mockedStructured).toHaveBeenCalledTimes(1);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe(DIVERSE_OUTPUT);
    }
  });
});
