import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

// Source-level assertions: verify what the compact CheckInCard renders and
// what it deliberately omits. These complement live visual testing.

const CARD_SOURCE = readFileSync(
  resolve(__dirname, "check-in-card.tsx"),
  "utf-8",
);

const PAGE_SOURCE = readFileSync(
  resolve(__dirname, "../../app/(protected)/moments/[id]/page.tsx"),
  "utf-8",
);

// ---------------------------------------------------------------------------
// CheckInCard — present fields
// ---------------------------------------------------------------------------

describe("CheckInCard — present fields", () => {
  it("renders the check-in date (created_at)", () => {
    expect(CARD_SOURCE).toContain("checkIn.created_at");
  });

  it("renders the user's raw reflection text", () => {
    expect(CARD_SOURCE).toContain("checkIn.reflection");
  });

  it("renders theme badges from theme_changes", () => {
    expect(CARD_SOURCE).toContain("checkIn.theme_changes");
    expect(CARD_SOURCE).toContain("change.theme");
    expect(CARD_SOURCE).toContain("change.direction");
  });

  it("truncates the reflection to one line with line-clamp-1", () => {
    expect(CARD_SOURCE).toContain("line-clamp-1");
  });
});

// ---------------------------------------------------------------------------
// CheckInCard — removed fields
// ---------------------------------------------------------------------------

describe("CheckInCard — removed fields", () => {
  it("does NOT render the AI reality_summary", () => {
    expect(CARD_SOURCE).not.toContain("reality_summary");
  });

  it("does NOT show the 'Reality summary' label", () => {
    expect(CARD_SOURCE).not.toContain("Reality summary");
  });

  it("does NOT show the 'Identity impact' label", () => {
    expect(CARD_SOURCE).not.toContain("Identity impact");
  });
});

// ---------------------------------------------------------------------------
// /moments/[id] page — removed sections
// ---------------------------------------------------------------------------

describe("/moments/[id] page — identity updates for check-in summaries", () => {
  it("does not import IdentityUpdateCard", () => {
    expect(PAGE_SOURCE).not.toContain("IdentityUpdateCard");
  });

  it("imports listIdentityUpdatesForMoment for check-in card summaries", () => {
    expect(PAGE_SOURCE).toContain("listIdentityUpdatesForMoment");
    expect(PAGE_SOURCE).toContain("buildCheckInIdentitySummaryMap");
  });

  it("does not render a standalone identity updates section", () => {
    expect(PAGE_SOURCE).not.toContain("Identity updates");
  });
});

describe("/moments/[id] page — edit form removed", () => {
  it("does not import MomentForm", () => {
    expect(PAGE_SOURCE).not.toContain("MomentForm");
  });

  it("does not render the Edit moment section", () => {
    expect(PAGE_SOURCE).not.toContain("Edit moment");
    expect(PAGE_SOURCE).not.toContain("Edit situation");
  });
});

// ---------------------------------------------------------------------------
// /moments/[id] page — renamed labels
// ---------------------------------------------------------------------------

describe("/moments/[id] page — renamed to situation language", () => {
  it("uses 'Archive situation' label on the archive button", () => {
    expect(PAGE_SOURCE).toContain("Archive situation");
  });

  it("does not say 'Archive moment'", () => {
    expect(PAGE_SOURCE).not.toContain("Archive moment");
  });

  it("uses 'Back to situations' in the back link", () => {
    expect(PAGE_SOURCE).toContain("Back to situations");
  });

  it("uses 'removes this situation' in the archive description", () => {
    expect(PAGE_SOURCE).toContain("removes this situation");
  });

  it("uses 'Decision paths' as the paths section heading", () => {
    expect(PAGE_SOURCE).toContain("Decision paths");
  });
});

// ---------------------------------------------------------------------------
// /moments/[id] page — section order
// ---------------------------------------------------------------------------

// Section-order tests for the page now live in forecast-diff.test.ts,
// which has access to both the page and the client component source.
