import { describe, expect, it } from "vitest";

import { IDENTITY_LIBRARY } from "@/lib/identity-library";

// Continuity matching resolves a stored identity_id against exactly one
// profile: first by live id, then via legacy_ids (retired library epochs).
// These invariants keep that resolution deterministic — a legacy id claimed
// by two profiles, or one that is also a live id, would make row carry-over
// depend on library order.
describe("identity library — legacy id continuity invariants", () => {
  const liveIds = new Set(IDENTITY_LIBRARY.map((profile) => profile.id));

  it("never reuses a live identity id as a legacy id", () => {
    for (const profile of IDENTITY_LIBRARY) {
      for (const legacyId of profile.legacy_ids ?? []) {
        expect(liveIds.has(legacyId)).toBe(false);
      }
    }
  });

  it("maps each legacy id to at most one profile", () => {
    const allLegacyIds = IDENTITY_LIBRARY.flatMap((profile) => profile.legacy_ids ?? []);
    expect(new Set(allLegacyIds).size).toBe(allLegacyIds.length);
  });

  it("keeps live ids unique", () => {
    expect(liveIds.size).toBe(IDENTITY_LIBRARY.length);
  });
});
