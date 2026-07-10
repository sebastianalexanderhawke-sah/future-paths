import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/ai/providers", () => ({
  getIdentityAIProvider: vi.fn(),
}));
vi.mock("@/lib/ai/usage", () => ({
  getUsageTracker: vi.fn(() => ({ track: vi.fn().mockResolvedValue(undefined) })),
}));
vi.mock("@/lib/observability", () => ({
  reportError: vi.fn().mockResolvedValue(undefined),
}));

import { getIdentityAIProvider } from "@/lib/ai/providers";
import { auditPathSetDestinations } from "@/lib/path-set-semantic-audit";

const mockedGetProvider = vi.mocked(getIdentityAIProvider);

const PATHS = [
  {
    title: "Build A Small Team",
    description: "Bring on two part-time employees.",
    direction: "a team-led operation",
    future_shift: "Directs work instead of doing it.",
  },
  {
    title: "Hire Specialist Contractors",
    description: "Engage freelancers for content and tech.",
    direction: "delegated specialist work",
    future_shift: "Reviews contractor output weekly.",
  },
  {
    title: "Simplify The Business",
    description: "Cut the site down to its core.",
    direction: "a smaller, calmer business",
    future_shift: "Maintains three resources instead of a pipeline.",
  },
];

function providerReturning(data: unknown, ok = true) {
  return {
    id: "claude" as const,
    completeStructured: vi.fn().mockResolvedValue(
      ok
        ? {
            ok: true,
            data,
            metadata: {
              provider: "claude",
              prompt_id: "path_set.audit",
              prompt_version: "1",
              generated_at: "2026-07-10T00:00:00.000Z",
            },
          }
        : { ok: false, error: "timeout", fallbackAvailable: true },
    ),
  };
}

beforeEach(() => {
  mockedGetProvider.mockReset();
});

describe("auditPathSetDestinations", () => {
  it("maps reported pairs onto convergent_destinations issues", async () => {
    mockedGetProvider.mockReturnValue(
      providerReturning({
        convergent_pairs: [
          {
            path_a: "build a small team",
            path_b: "Hire Specialist Contractors",
            reason: "Both lead to others doing the work.",
          },
        ],
      }),
    );

    const issues = await auditPathSetDestinations({ userId: "user-1", paths: PATHS });

    expect(issues).toEqual([
      {
        kind: "convergent_destinations",
        titles: ["Build A Small Team", "Hire Specialist Contractors"],
        reason: "Both lead to others doing the work.",
      },
    ]);
  });

  it("drops pairs that reference titles not in the candidate set", async () => {
    mockedGetProvider.mockReturnValue(
      providerReturning({
        convergent_pairs: [
          { path_a: "Invented Path", path_b: "Simplify The Business", reason: "..." },
          { path_a: "Simplify The Business", path_b: "Simplify The Business", reason: "..." },
        ],
      }),
    );

    const issues = await auditPathSetDestinations({ userId: "user-1", paths: PATHS });
    expect(issues).toEqual([]);
  });

  it("fails open when the audit call errors", async () => {
    mockedGetProvider.mockReturnValue(providerReturning(null, false));

    const issues = await auditPathSetDestinations({ userId: "user-1", paths: PATHS });
    expect(issues).toEqual([]);
  });

  it("fails open when provider resolution throws", async () => {
    mockedGetProvider.mockImplementation(() => {
      throw new Error("misconfigured");
    });

    const issues = await auditPathSetDestinations({ userId: "user-1", paths: PATHS });
    expect(issues).toEqual([]);
  });

  it("skips the call entirely for fewer than two paths", async () => {
    const issues = await auditPathSetDestinations({
      userId: "user-1",
      paths: PATHS.slice(0, 1),
    });

    expect(issues).toEqual([]);
    expect(mockedGetProvider).not.toHaveBeenCalled();
  });
});
