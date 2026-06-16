import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

import type { ForecastSections } from "@/components/home/forecast-utils";
import {
  buildCheckInForecastSummary,
  computeForecastDiff,
  computeMovementMap,
  flattenFutures,
  normalizeTitle,
} from "@/lib/forecast-diff";
import type { Forecast } from "@/types/database";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSections(titles: {
  active?: string[];
  hidden?: string[];
  blind?: string[];
}): ForecastSections {
  const toFuture = (title: string) => ({
    title,
    whyItMightHappen: "x",
    signals: [],
    futureImpact: "y",
    expansion: null,
  });
  return {
    activeFutures: (titles.active ?? []).map(toFuture),
    hiddenFutures: (titles.hidden ?? []).map(toFuture),
    blindSpotFutures: (titles.blind ?? []).map(toFuture),
    wildCardFutures: [],
  };
}

// ---------------------------------------------------------------------------
// computeForecastDiff
// ---------------------------------------------------------------------------

describe("computeForecastDiff", () => {
  // NOTE: disappeared/appeared sets contain NORMALISED (lowercase, trimmed) titles.
  it("identifies disappeared futures not present in current", () => {
    const previous = makeSections({ active: ["A", "B", "C"] });
    const current = makeSections({ active: ["B", "C", "D"] });
    const { disappeared, appeared } = computeForecastDiff(previous, current);
    expect(disappeared).toEqual(new Set(["a"]));
    expect(appeared).toEqual(new Set(["d"]));
  });

  it("identifies appeared futures not present in previous", () => {
    const previous = makeSections({ active: ["X"] });
    const current = makeSections({ active: ["X", "Y", "Z"] });
    const { disappeared, appeared } = computeForecastDiff(previous, current);
    expect(disappeared.size).toBe(0);
    expect(appeared).toEqual(new Set(["y", "z"]));
  });

  it("returns empty sets when all futures stay the same", () => {
    const sections = makeSections({ active: ["A", "B"], hidden: ["C"] });
    const { disappeared, appeared } = computeForecastDiff(sections, sections);
    expect(disappeared.size).toBe(0);
    expect(appeared.size).toBe(0);
  });

  it("treats futures from different sections as equal when titles match", () => {
    const previous = makeSections({ active: ["Cross-section future"] });
    const current = makeSections({ hidden: ["Cross-section future"] });
    const { disappeared, appeared } = computeForecastDiff(previous, current);
    expect(disappeared.size).toBe(0);
    expect(appeared.size).toBe(0);
  });

  it("handles complete turnover", () => {
    const previous = makeSections({ active: ["Old 1", "Old 2"] });
    const current = makeSections({ active: ["New 1", "New 2", "New 3"] });
    const { disappeared, appeared } = computeForecastDiff(previous, current);
    expect(disappeared).toEqual(new Set(["old 1", "old 2"]));
    expect(appeared).toEqual(new Set(["new 1", "new 2", "new 3"]));
  });

  it("marks disappeared futures (normalised key) for 'No longer likely' rendering", () => {
    const previous = makeSections({ active: ["She Texts You First"] });
    const current = makeSections({ active: ["Things Stay As They Are"] });
    const { disappeared } = computeForecastDiff(previous, current);
    // Sets now use normalised keys
    expect(disappeared.has("she texts you first")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// flattenFutures
// ---------------------------------------------------------------------------

describe("flattenFutures", () => {
  it("returns active → hidden → blind spot order", () => {
    const sections = makeSections({
      active: ["A1", "A2"],
      hidden: ["H1"],
      blind: ["B1", "B2", "B3"],
    });
    const flat = flattenFutures(sections);
    expect(flat.map((f) => f.title)).toEqual(["A1", "A2", "H1", "B1", "B2", "B3"]);
  });

  it("top 3 are from active futures when there are enough", () => {
    const sections = makeSections({ active: ["A1", "A2", "A3", "A4"], hidden: ["H1"] });
    const flat = flattenFutures(sections);
    expect(flat.slice(0, 3).map((f) => f.title)).toEqual(["A1", "A2", "A3"]);
  });
});

// ---------------------------------------------------------------------------
// normalizeTitle
// ---------------------------------------------------------------------------

describe("normalizeTitle", () => {
  it("lowercases the title", () => {
    expect(normalizeTitle("Dallas Offer Becomes Concrete")).toBe(
      "dallas offer becomes concrete",
    );
  });

  it("trims leading and trailing whitespace", () => {
    expect(normalizeTitle("  Dallas Offer Becomes Concrete  ")).toBe(
      "dallas offer becomes concrete",
    );
  });

  it("matches after normalising both sides", () => {
    const a = "Dallas Offer Becomes Concrete";
    const b = " dallas offer becomes concrete ";
    expect(normalizeTitle(a)).toBe(normalizeTitle(b));
  });

  it("handles already-lowercase strings unchanged", () => {
    expect(normalizeTitle("already lowercase")).toBe("already lowercase");
  });

  it("normalises smart single quotes to apostrophe", () => {
    expect(normalizeTitle("You\u2019re Ready")).toBe("you're ready");
  });

  it("normalises smart double quotes to straight double quotes", () => {
    expect(normalizeTitle("\u201CHello\u201D")).toBe('"hello"');
  });

  it("normalises em dash to double hyphen", () => {
    expect(normalizeTitle("Career\u2014Pivot")).toBe("career--pivot");
  });

  it("normalises en dash to single hyphen", () => {
    expect(normalizeTitle("2024\u20132025")).toBe("2024-2025");
  });

  it("smart-quote variant of a title matches its straight-quote version", () => {
    const a = "You\u2019re Moving Forward";
    const b = "You're Moving Forward";
    expect(normalizeTitle(a)).toBe(normalizeTitle(b));
  });
});

// ---------------------------------------------------------------------------
// computeMovementMap — Fix 3: concrete before/after pair
// ---------------------------------------------------------------------------

describe("computeMovementMap — concrete before/after pair (Fix 3)", () => {
  it("correctly computes down/up/new for a swapped + new future", () => {
    // Before: "Future A" in activeFutures (rank 1), "Future B" in hiddenFutures (rank 2)
    // After:  "Future A" in hiddenFutures (rank 2), "Future B" in activeFutures (rank 1),
    //         "Future C" in blindSpotFutures (rank 3, new)
    const before = makeSections({
      active: ["Future A"],
      hidden: ["Future B"],
    });
    const after = makeSections({
      active: ["Future B"],
      hidden: ["Future A"],
      blind: ["Future C"],
    });

    const map = computeMovementMap(after, before);

    expect(map["Future A"]).toBe("down"); // was rank 1, now rank 2
    expect(map["Future B"]).toBe("up"); // was rank 2, now rank 1
    expect(map["Future C"]).toBe("new"); // not in previous
  });
});

// ---------------------------------------------------------------------------
// computeMovementMap — normalisation
// ---------------------------------------------------------------------------

describe("computeMovementMap — title normalisation", () => {
  it("treats different casing as the same title (neutral, not new)", () => {
    const before = makeSections({ active: ["Dallas Offer Becomes Concrete"] });
    const after = makeSections({ active: ["dallas offer becomes concrete"] });
    const map = computeMovementMap(after, before);
    expect(map["dallas offer becomes concrete"]).toBe("neutral");
  });

  it("treats leading/trailing whitespace variants as the same title", () => {
    const before = makeSections({ active: [" Future A "] });
    const after = makeSections({ active: ["Future A"] });
    const map = computeMovementMap(after, before);
    expect(map["Future A"]).toBe("neutral");
  });

  it("treats title-case to lowercase move as section change, not 'new'", () => {
    const before = makeSections({ active: ["Career Pivot Is Imminent"] });
    const after = makeSections({ hidden: ["career pivot is imminent"] });
    const map = computeMovementMap(after, before);
    // Same title (normalised), but moved from active→hidden → "down"
    expect(map["career pivot is imminent"]).toBe("down");
  });
});

describe("computeMovementMap", () => {
  it("marks futures not in previous as 'new'", () => {
    const previous = makeSections({ active: ["Old"] });
    const current = makeSections({ active: ["Old", "Fresh"] });
    const map = computeMovementMap(current, previous);
    expect(map["Fresh"]).toBe("new");
    expect(map["Old"]).toBe("neutral");
  });

  it("marks futures that moved to a higher section rank as 'up'", () => {
    const previous = makeSections({ hidden: ["Climber"] });
    const current = makeSections({ active: ["Climber"] });
    const map = computeMovementMap(current, previous);
    expect(map["Climber"]).toBe("up");
  });

  it("marks futures that moved to a lower section rank as 'down'", () => {
    const previous = makeSections({ active: ["Fader"] });
    const current = makeSections({ hidden: ["Fader"] });
    const map = computeMovementMap(current, previous);
    expect(map["Fader"]).toBe("down");
  });

  it("marks futures in the same section as 'neutral'", () => {
    const sections = makeSections({ active: ["Steady"], hidden: ["Also Steady"] });
    const map = computeMovementMap(sections, sections);
    expect(map["Steady"]).toBe("neutral");
    expect(map["Also Steady"]).toBe("neutral");
  });

  it("returns all 'neutral' when previous is null", () => {
    const current = makeSections({ active: ["A"], hidden: ["B"] });
    const map = computeMovementMap(current, null);
    expect(Object.values(map).every((v) => v === "neutral")).toBe(true);
  });

  it("covers all futures in current section", () => {
    const previous = makeSections({ active: ["A"] });
    const current = makeSections({ active: ["A", "B"], hidden: ["C"] });
    const map = computeMovementMap(current, previous);
    expect(Object.keys(map)).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// buildCheckInForecastSummary
// ---------------------------------------------------------------------------

function makeMinimalForecast(
  id: string,
  generated_at: string,
  sections: ForecastSections,
): Forecast {
  return {
    id,
    user_id: "user-1",
    moment_id: "moment-1",
    path_id: null,
    sections_json: sections as unknown as Record<string, unknown>,
    situation_summary: "",
    generated_at,
    created_at: generated_at,
  };
}

describe("buildCheckInForecastSummary", () => {
  const t0 = "2024-01-01T10:00:00Z"; // Forecast V1 generated before any check-in
  const t1 = "2024-01-02T12:00:00Z"; // Check-in submitted
  const t2 = "2024-01-02T12:01:00Z"; // Forecast V2 generated shortly after

  const v1Sections = makeSections({ active: ["A", "B"] });
  const v2Sections = makeSections({ active: ["A", "C"], hidden: ["D"] });

  const forecastV1 = makeMinimalForecast("f1", t0, v1Sections);
  const forecastV2 = makeMinimalForecast("f2", t2, v2Sections);

  const checkIn = { id: "ci-1", created_at: t1 };

  it("returns 'Forecast generated' when no previous forecast exists before the check-in", () => {
    // Only one forecast, generated AFTER the check-in time
    const singleForecast = makeMinimalForecast("f1", t2, v1Sections);
    const result = buildCheckInForecastSummary(checkIn, [singleForecast]);
    expect(result).toBe("Forecast generated");
  });

  it("shows appeared count when new futures exist", () => {
    const result = buildCheckInForecastSummary(checkIn, [forecastV1, forecastV2]);
    // C and D appeared (B and one in blind-spot disappeared)
    expect(result).toContain("appeared");
  });

  it("shows resolved count when futures disappeared", () => {
    const result = buildCheckInForecastSummary(checkIn, [forecastV1, forecastV2]);
    expect(result).toContain("resolved");
  });

  it("returns 'Forecast unchanged' when nothing changed", () => {
    const sameForecast = makeMinimalForecast("f2", t2, v1Sections);
    const result = buildCheckInForecastSummary(checkIn, [forecastV1, sameForecast]);
    expect(result).toBe("Forecast unchanged");
  });

  it("returns null when no forecasts at all", () => {
    const result = buildCheckInForecastSummary(checkIn, []);
    expect(result).toBeNull();
  });

  it("returns null when no forecast after the check-in time", () => {
    // Forecast generated BEFORE the check-in
    const earlyForecast = makeMinimalForecast("f1", "2024-01-01T08:00:00Z", v1Sections);
    const result = buildCheckInForecastSummary(
      { id: "ci-1", created_at: "2024-01-02T10:00:00Z" },
      [earlyForecast],
    );
    expect(result).toBeNull();
  });

  it("uses · as separator between summary parts", () => {
    const movedSections = makeSections({ active: ["A"], hidden: ["B"], blind: ["C", "D"] });
    const movedV2 = makeMinimalForecast("f2", t2, movedSections);
    const result = buildCheckInForecastSummary(checkIn, [forecastV1, movedV2]);
    // Should be non-null and contain parts
    if (result && result !== "Forecast unchanged" && result !== "Forecast generated") {
      expect(result).toContain(" · ");
    }
  });
});

// ---------------------------------------------------------------------------
// Page source assertions: section order, removed elements, labels
// ---------------------------------------------------------------------------

const PAGE_SOURCE = readFileSync(
  resolve(__dirname, "../app/(protected)/moments/[id]/page.tsx"),
  "utf-8",
);

const FORECAST_SOURCE = readFileSync(
  resolve(__dirname, "../components/moments/situation-forecast-section.tsx"),
  "utf-8",
);

const PATH_CARD_SOURCE = readFileSync(
  resolve(__dirname, "../components/moments/stored-path-card.tsx"),
  "utf-8",
);

const CHECK_IN_CARD_SOURCE = readFileSync(
  resolve(__dirname, "../components/check-ins/check-in-card.tsx"),
  "utf-8",
);

describe("StoredPathCard — path title decoding", () => {
  it("imports and uses formatScannablePath for display fields", () => {
    expect(PATH_CARD_SOURCE).toContain("formatScannablePath");
  });

  it("uses scannable title from formatScannablePath", () => {
    expect(PATH_CARD_SOURCE).toContain("scannable.title");
  });

  it("renders benefits and consequences lists from scannable path", () => {
    expect(PATH_CARD_SOURCE).toContain("scannable.benefits");
    expect(PATH_CARD_SOURCE).toContain("scannable.consequences");
  });

  it("renders future you from scannable path", () => {
    expect(PATH_CARD_SOURCE).toContain("scannable.futureYou");
  });

  it("chosen path shows 'Your path' badge", () => {
    expect(PATH_CARD_SOURCE).toContain("Your path");
  });

  it("labels future_shift section as 'Future you' not 'Future shift'", () => {
    expect(PATH_CARD_SOURCE).toContain("Future you");
    expect(PATH_CARD_SOURCE).not.toContain("Future shift");
  });

  it("strips trailing colons from future_shift at render time", () => {
    expect(PATH_CARD_SOURCE).toContain('replace(/[:;,\\s]+$/, "")');
  });
});

describe("StoredPathCard — ChosenPathCard + OtherPathCard decode titles cleanly", () => {
  it("ChosenPathCard is exported", () => {
    expect(PATH_CARD_SOURCE).toContain("export function ChosenPathCard");
  });

  it("OtherPathCard is exported", () => {
    expect(PATH_CARD_SOURCE).toContain("export function OtherPathCard");
  });
});

describe("/moments/[id] page — section order", () => {
  // Skip past import declarations by starting search from the JSX return block
  const JSX_START = PAGE_SOURCE.indexOf("return (");

  it("Situation summary appears before Decision paths in JSX", () => {
    const summaryPos = PAGE_SOURCE.indexOf("Situation summary", JSX_START);
    const pathsPos = PAGE_SOURCE.indexOf("Decision paths", JSX_START);
    expect(summaryPos).toBeGreaterThan(0);
    expect(pathsPos).toBeGreaterThan(0);
    expect(summaryPos).toBeLessThan(pathsPos);
  });

  it("Decision paths appears before SituationForecastSection usage in JSX", () => {
    const pathsPos = PAGE_SOURCE.indexOf("Decision paths", JSX_START);
    const forecastPos = PAGE_SOURCE.indexOf("<SituationForecastSection", JSX_START);
    expect(pathsPos).toBeGreaterThan(0);
    expect(forecastPos).toBeGreaterThan(0);
    expect(pathsPos).toBeLessThan(forecastPos);
  });

  it("SituationForecastSection appears before Archive in JSX", () => {
    const forecastPos = PAGE_SOURCE.indexOf("<SituationForecastSection", JSX_START);
    const archivePos = PAGE_SOURCE.indexOf("Archive situation", JSX_START);
    expect(forecastPos).toBeLessThan(archivePos);
  });
});

describe("/moments/[id] page — other paths are collapsible", () => {
  it("uses <details> for other paths", () => {
    expect(PAGE_SOURCE).toContain("See other paths considered");
  });
});

describe("CurrentForecastFutureCard — movement indicators", () => {
  const CARD_FILE_SOURCE = readFileSync(
    resolve(__dirname, "../components/home/forecast-simplification-cards.tsx"),
    "utf-8",
  );

  it("accepts movement prop", () => {
    expect(CARD_FILE_SOURCE).toContain("movement?:");
  });

  it("defines up/down/neutral/new indicators", () => {
    expect(CARD_FILE_SOURCE).toContain("up:");
    expect(CARD_FILE_SOURCE).toContain("down:");
    expect(CARD_FILE_SOURCE).toContain("neutral:");
    expect(CARD_FILE_SOURCE).toContain("new:");
  });

  it("renders ↑ for up", () => {
    expect(CARD_FILE_SOURCE).toContain("↑");
  });

  it("renders ↓ for down", () => {
    expect(CARD_FILE_SOURCE).toContain("↓");
  });

  it("renders − for neutral", () => {
    expect(CARD_FILE_SOURCE).toContain('"−"');
  });

  it("'new' movement shows only the arrow symbol, not the word 'New'", () => {
    // The 'new' entry in MOVEMENT_INDICATOR must not contain ' New'
    const newEntry = CARD_FILE_SOURCE.match(/new:\s*\{[^}]+\}/)?.[0] ?? "";
    expect(newEntry).not.toContain("New");
  });

  it("indicator appears AFTER the title (right of title, not left)", () => {
    const summaryStart = CARD_FILE_SOURCE.indexOf("<summary");
    const summaryEnd = CARD_FILE_SOURCE.indexOf("</summary>");
    const titlePos = CARD_FILE_SOURCE.indexOf("{future.title}", summaryStart);
    const indicatorPos = CARD_FILE_SOURCE.indexOf("indicator.symbol", summaryStart);
    // Both must be inside the summary
    expect(titlePos).toBeGreaterThan(summaryStart);
    expect(titlePos).toBeLessThan(summaryEnd);
    expect(indicatorPos).toBeGreaterThan(summaryStart);
    expect(indicatorPos).toBeLessThan(summaryEnd);
    // Indicator must come AFTER title
    expect(indicatorPos).toBeGreaterThan(titlePos);
  });
});

describe("SituationForecastSection — forecast heading", () => {
  it("uses 'What might happen next?' heading", () => {
    expect(FORECAST_SOURCE).toContain("What might happen next?");
  });

  it("shows 'No longer likely' for disappeared futures", () => {
    expect(FORECAST_SOURCE).toContain("No longer likely");
  });

  it("shows 'New' badge for appeared futures", () => {
    // The badge renders the text "New" surrounded by whitespace in JSX.
    // Search for the diff.appeared.has pattern to confirm it's diff-gated.
    expect(FORECAST_SOURCE).toContain("diff?.appeared.has");
    // And the label text itself (normalise whitespace for cross-platform)
    expect(FORECAST_SOURCE.replace(/\s+/g, " ")).toContain("> New <");
  });

  it("collapses futures beyond top 3", () => {
    expect(FORECAST_SOURCE).toContain("See all futures");
  });

  it("captures snapshot to sessionStorage before submit", () => {
    expect(FORECAST_SOURCE).toContain('"forecast-before-checkin"');
    expect(FORECAST_SOURCE).toContain("sessionStorage");
  });

  it("transitions clear after timeout", () => {
    expect(FORECAST_SOURCE).toContain("TRANSITION_MS");
    expect(FORECAST_SOURCE).toContain("3000");
  });
});

describe("CheckIn type — no forecast_summary field", () => {
  const DB_TYPES_SOURCE = readFileSync(
    resolve(__dirname, "../types/database.ts"),
    "utf-8",
  );
  it("CheckIn type does not include forecast_summary", () => {
    expect(DB_TYPES_SOURCE).not.toContain("forecast_summary");
  });
});

describe("check-ins lib — no forecast summary generation", () => {
  const CHECK_INS_SOURCE = readFileSync(
    resolve(__dirname, "check-ins.ts"),
    "utf-8",
  );
  it("does not import Anthropic SDK for forecast summary", () => {
    expect(CHECK_INS_SOURCE).not.toContain("generateForecastSummary");
  });
  it("does not reference forecast_summary column", () => {
    expect(CHECK_INS_SOURCE).not.toContain("forecast_summary");
  });
});

describe("CheckInCard — identity update summary line", () => {
  it("renders identityUpdateSummary prop when present", () => {
    expect(CHECK_IN_CARD_SOURCE).toContain("identityUpdateSummary");
  });

  it("does not render forecast_summary", () => {
    expect(CHECK_IN_CARD_SOURCE).not.toContain("forecast_summary");
  });

  it("does not render identity_impact in the card", () => {
    expect(CHECK_IN_CARD_SOURCE).not.toContain("checkIn.identity_impact");
  });

  it("uses muted secondary text for identity update summary", () => {
    expect(CHECK_IN_CARD_SOURCE).toContain("text-ink-secondary");
  });
});

describe("Wild card futures — visual distinction", () => {
  const FORECAST_RESULT_SOURCE = readFileSync(
    resolve(__dirname, "../components/home/future-forecast-result.tsx"),
    "utf-8",
  );
  const SITUATION_FORECAST_SOURCE = readFileSync(
    resolve(__dirname, "../components/moments/situation-forecast-section.tsx"),
    "utf-8",
  );
  const CARD_SHELL_SOURCE = readFileSync(
    resolve(__dirname, "../components/ui/card-shell.tsx"),
    "utf-8",
  );
  const FORECAST_CARDS_SOURCE = readFileSync(
    resolve(__dirname, "../components/home/forecast-simplification-cards.tsx"),
    "utf-8",
  );

  it("wild card section header has visual marker on main forecast view", () => {
    expect(FORECAST_RESULT_SOURCE).toContain("Wild Card Futures");
    expect(FORECAST_RESULT_SOURCE).toContain("titlePrefix");
    expect(FORECAST_RESULT_SOURCE).toContain("🃏");
  });

  it("wild card section header has visual marker on situation detail page", () => {
    expect(SITUATION_FORECAST_SOURCE).toContain("Wild Card Futures");
    expect(SITUATION_FORECAST_SOURCE).toContain("🃏");
  });

  it("wild card cards use wildcard CardShell variant", () => {
    expect(CARD_SHELL_SOURCE).toContain("wildcard");
    expect(FORECAST_CARDS_SOURCE).toContain('cardVariant = "elevated"');
    expect(FORECAST_RESULT_SOURCE).toContain('cardVariant="wildcard"');
    expect(SITUATION_FORECAST_SOURCE).toContain('cardVariant="wildcard"');
  });
});

describe("CheckInCard — theme badges", () => {
  it("renders each theme_change as a separate chip", () => {
    expect(CHECK_IN_CARD_SOURCE).toContain("change.theme");
    expect(CHECK_IN_CARD_SOURCE).toContain("change.direction");
  });

  it("uses a flex-wrap container with gap for badge layout", () => {
    expect(CHECK_IN_CARD_SOURCE).toContain("flex flex-wrap gap-2");
  });

  it("each badge has pill styling", () => {
    expect(CHECK_IN_CARD_SOURCE).toContain("rounded-full");
  });
});
