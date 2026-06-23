import { describe, expect, it } from "vitest";

import { serializeContext } from "@/lib/ai/context/truncate";
import type { IdentityContextBundle } from "@/lib/ai/context/slices";

describe("serializeContext — mostRecentChosenPath", () => {
  const mostRecentChosenPath = {
    description: "Take the new job",
    themes: ["Stability"] as IdentityContextBundle["mostRecentChosenPath"]["themes"],
    chosen_at: "2026-06-23T16:27:12.813Z",
    future_shift: "Builds toward financial stability",
  };

  it("truncates the description but keeps the field", () => {
    const bundle: IdentityContextBundle = {
      userId: "user-1",
      profile: "future_self",
      mostRecentChosenPath: { ...mostRecentChosenPath, description: "x".repeat(1000) },
    };

    const parsed = JSON.parse(serializeContext(bundle));

    expect(parsed.mostRecentChosenPath.description.length).toBeLessThan(1000);
    expect(parsed.mostRecentChosenPath.chosen_at).toBe(mostRecentChosenPath.chosen_at);
    expect(parsed.mostRecentChosenPath.themes).toEqual(["Stability"]);
  });

  it("survives total-JSON-limit reduction when the rest of the context is huge", () => {
    // Bloat the bundle well past CONTEXT_LIMITS.TOTAL_JSON_CHARS with content
    // unrelated to the chosen path, to force both fallback reduction paths.
    const bundle: IdentityContextBundle = {
      userId: "user-1",
      profile: "future_self",
      mostRecentChosenPath,
      checkIns: Array.from({ length: 200 }, () => ({
        theme_changes: [],
        identity_impact: "x".repeat(500),
        reality_summary: "x".repeat(500),
      })),
      identityUpdates: Array.from({ length: 200 }, () => ({
        title: "x".repeat(200),
        summary: "x".repeat(500),
        themes: [],
      })),
    };

    const parsed = JSON.parse(serializeContext(bundle));

    expect(parsed.mostRecentChosenPath).toBeDefined();
    expect(parsed.mostRecentChosenPath.chosen_at).toBe(mostRecentChosenPath.chosen_at);
    expect(parsed.mostRecentChosenPath.future_shift).toBe(mostRecentChosenPath.future_shift);
  });
});
