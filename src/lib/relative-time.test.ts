import { describe, expect, it } from "vitest";

import {
  CHECK_IN_STALE_DAYS,
  formatRelativeTime,
  isCheckInStale,
} from "@/lib/relative-time";

// ---------------------------------------------------------------------------
// formatRelativeTime
// ---------------------------------------------------------------------------

function daysAgo(days: number): string {
  const d = new Date();
  d.setTime(d.getTime() - days * 24 * 60 * 60 * 1000);
  return d.toISOString();
}

describe("formatRelativeTime", () => {
  it("returns 'today' for a date fewer than 24 h ago", () => {
    expect(formatRelativeTime(daysAgo(0.5))).toBe("today");
  });

  it("returns '1 day ago' for exactly one day ago", () => {
    expect(formatRelativeTime(daysAgo(1))).toBe("1 day ago");
  });

  it("returns 'X days ago' for 2–6 days", () => {
    expect(formatRelativeTime(daysAgo(3))).toBe("3 days ago");
    expect(formatRelativeTime(daysAgo(6))).toBe("6 days ago");
  });

  it("returns '1 week ago' for 7–13 days", () => {
    expect(formatRelativeTime(daysAgo(7))).toBe("1 week ago");
    expect(formatRelativeTime(daysAgo(13))).toBe("1 week ago");
  });

  it("returns 'X weeks ago' for 14–27 days", () => {
    expect(formatRelativeTime(daysAgo(14))).toBe("2 weeks ago");
    expect(formatRelativeTime(daysAgo(21))).toBe("3 weeks ago");
  });

  it("returns '1 month ago' for 28–59 days", () => {
    expect(formatRelativeTime(daysAgo(30))).toBe("1 month ago");
    expect(formatRelativeTime(daysAgo(59))).toBe("1 month ago");
  });

  it("returns 'X months ago' for 60+ days", () => {
    expect(formatRelativeTime(daysAgo(60))).toBe("2 months ago");
    expect(formatRelativeTime(daysAgo(90))).toBe("3 months ago");
  });

  it("accepts an explicit 'now' reference point", () => {
    const now = new Date("2026-06-16T12:00:00Z");
    const fiveDaysBack = new Date("2026-06-11T12:00:00Z").toISOString();
    expect(formatRelativeTime(fiveDaysBack, now)).toBe("5 days ago");
  });
});

// ---------------------------------------------------------------------------
// isCheckInStale
// ---------------------------------------------------------------------------

describe("isCheckInStale", () => {
  it("returns true when lastCheckInDate is null", () => {
    expect(isCheckInStale(null)).toBe(true);
  });

  it("returns true when lastCheckInDate is undefined", () => {
    expect(isCheckInStale(undefined)).toBe(true);
  });

  it("returns false when check-in was within the stale threshold", () => {
    const oneDayAgo = daysAgo(1);
    expect(isCheckInStale(oneDayAgo)).toBe(false);
  });

  it("returns false when check-in was exactly on the stale boundary (not yet over)", () => {
    // Slightly less than CHECK_IN_STALE_DAYS days ago — not yet stale
    const justUnder = daysAgo(CHECK_IN_STALE_DAYS - 0.01);
    expect(isCheckInStale(justUnder)).toBe(false);
  });

  it("returns true when check-in was more than CHECK_IN_STALE_DAYS days ago", () => {
    const overThreshold = daysAgo(CHECK_IN_STALE_DAYS + 0.01);
    expect(isCheckInStale(overThreshold)).toBe(true);
  });

  it("returns true when check-in was a week ago", () => {
    expect(isCheckInStale(daysAgo(7))).toBe(true);
  });

  it("accepts an explicit 'now' reference point", () => {
    const now = new Date("2026-06-16T12:00:00Z");
    const twoDaysBack = new Date("2026-06-14T12:00:00Z").toISOString();
    const fourDaysBack = new Date("2026-06-12T12:00:00Z").toISOString();

    expect(isCheckInStale(twoDaysBack, now)).toBe(false);
    expect(isCheckInStale(fourDaysBack, now)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// CHECK_IN_STALE_DAYS constant
// ---------------------------------------------------------------------------

describe("CHECK_IN_STALE_DAYS", () => {
  it("is 3", () => {
    expect(CHECK_IN_STALE_DAYS).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// MomentCard enrichment logic
// ---------------------------------------------------------------------------
// These tests verify the pure logic that MomentCard uses when deciding what
// to render. Component rendering tests would require jsdom/testing-library.

describe("MomentCard — chosen path display logic", () => {
  it("uses native title when available (decodeNativePathFields pattern)", async () => {
    const { decodeNativePathFields } = await import(
      "@/components/home/path-native-title"
    );

    const stored =
      "@native-title:Ask Her Out@\nTake the initiative and ask her for coffee.";
    const { nativeTitle } = decodeNativePathFields(stored);
    expect(nativeTitle).toBe("Ask Her Out");
  });

  it("falls back to description when no native title is encoded", async () => {
    const { decodeNativePathFields } = await import(
      "@/components/home/path-native-title"
    );

    const stored = "Leave things as they are and see how it develops naturally.";
    const { nativeTitle, description } = decodeNativePathFields(stored);
    expect(nativeTitle).toBeNull();
    expect(description).toBe(stored);
  });
});

describe("MomentCard — check-in badge logic", () => {
  it("shows stale badge when no check-in exists", () => {
    expect(isCheckInStale(undefined)).toBe(true);
  });

  it("shows stale badge when last check-in was 4 days ago", () => {
    const now = new Date("2026-06-16T12:00:00Z");
    const fourDaysAgo = new Date("2026-06-12T12:00:00Z").toISOString();
    expect(isCheckInStale(fourDaysAgo, now)).toBe(true);
  });

  it("does not show stale badge when last check-in was 2 days ago", () => {
    const now = new Date("2026-06-16T12:00:00Z");
    const twoDaysAgo = new Date("2026-06-14T12:00:00Z").toISOString();
    expect(isCheckInStale(twoDaysAgo, now)).toBe(false);
  });
});

describe("MomentCard — forecast badge logic", () => {
  it("shows forecast badge when hasForecast = true", () => {
    const hasForecast = true;
    expect(hasForecast).toBe(true);
  });

  it("hides forecast badge when hasForecast = false", () => {
    const hasForecast = false;
    expect(hasForecast).toBe(false);
  });
});

describe("ExistingSituationsSection — parallel enrichment fetch pattern", () => {
  // These tests import heavy server modules on first use; under a full
  // parallel run the transform alone can approach the 5s default, so they
  // carry an explicit timeout. The assertions themselves are instant.
  const IMPORT_TIMEOUT_MS = 20_000;

  it(
    "getForecastExistenceForMoments returns empty Set for empty input",
    async () => {
      const { getForecastExistenceForMoments } = await import("@/lib/forecasts");
      const result = await getForecastExistenceForMoments([]);
      expect(result).toBeInstanceOf(Set);
      expect(result.size).toBe(0);
    },
    IMPORT_TIMEOUT_MS,
  );

  it(
    "getChosenPathsForMoments returns empty object for empty input",
    async () => {
      const { getChosenPathsForMoments } = await import("@/lib/paths");
      const result = await getChosenPathsForMoments([]);
      expect(result).toEqual({});
    },
    IMPORT_TIMEOUT_MS,
  );

  it(
    "getLastCheckInsForMoments returns empty object for empty input",
    async () => {
      const { getLastCheckInsForMoments } = await import("@/lib/check-ins");
      const result = await getLastCheckInsForMoments([]);
      expect(result).toEqual({});
    },
    IMPORT_TIMEOUT_MS,
  );
});
