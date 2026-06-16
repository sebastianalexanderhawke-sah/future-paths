import { describe, expect, it } from "vitest";

import { buildCheckInIdentitySummaryMap } from "@/lib/check-in-identity-summary";
import type { CheckIn, IdentityUpdate } from "@/types/database";

function makeCheckIn(id: string, createdAt: string): CheckIn {
  return {
    id,
    user_id: "user-1",
    moment_id: "moment-1",
    path_id: "path-1",
    reflection: "Reflection",
    reality_summary: "Summary",
    theme_changes: [],
    identity_impact: "Impact",
    created_at: createdAt,
  };
}

function makeIdentityUpdate(
  checkInId: string,
  summary: string,
  createdAt: string,
): IdentityUpdate {
  return {
    id: `update-${checkInId}`,
    user_id: "user-1",
    moment_id: "moment-1",
    check_in_id: checkInId,
    update_type: "reality_shift",
    title: "Shift",
    summary,
    themes: ["Reflection"],
    created_at: createdAt,
  };
}

describe("buildCheckInIdentitySummaryMap", () => {
  it("maps check-in id to first sentence of linked identity update", () => {
    const checkIn = makeCheckIn("ci-1", "2026-01-01T10:00:00Z");
    const update = makeIdentityUpdate(
      "ci-1",
      "You may be moving toward clarity. A second sentence follows.",
      "2026-01-01T10:00:05Z",
    );

    const map = buildCheckInIdentitySummaryMap([checkIn], [update]);
    expect(map["ci-1"]).toBe("You may be moving toward clarity.");
  });

  it("returns null when no associated identity update exists", () => {
    const checkIn = makeCheckIn("ci-1", "2026-01-01T10:00:00Z");
    const map = buildCheckInIdentitySummaryMap([checkIn], []);
    expect(map["ci-1"]).toBeNull();
  });
});
