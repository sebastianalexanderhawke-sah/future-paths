import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

import { parseCheckInOutput } from "@/lib/ai/schemas/check-in";
import { parseForecastOutput } from "@/lib/ai/schemas/forecast";
import { normalizeCheckInThemeName, normalizeThemeChangesArray } from "@/lib/ai/schemas/theme-normalization";
import type { ForecastSections } from "@/components/home/forecast-utils";
import {
  computeMovementMap,
  normalizeTitle,
} from "@/lib/forecast-diff";
import {
  isDifficultCheckInTheme,
  isValidDirectionForTheme,
} from "@/lib/check-in-themes";
import { DIFFICULT_THEME_NAMES, CHECK_IN_POSITIVE_THEME_NAMES } from "@/types/enums";

describe("check-in honest themes", () => {
  it("accepts difficult themes in check-in output schema", () => {
    const parsed = parseCheckInOutput({
      reality_summary: "She chose someone else and we stopped talking.",
      theme_changes: [
        { theme: "Hurt", direction: "present" },
        { theme: "Loneliness", direction: "present" },
        { theme: "Resilience", direction: "processing" },
      ],
      identity_impact: "This may reshape how you handle rejection.",
    });

    expect(parsed.theme_changes).toHaveLength(3);
    expect(parsed.theme_changes[0]?.theme).toBe("Hurt");
  });

  it("rejects strengthened on difficult themes", () => {
    expect(() =>
      parseCheckInOutput({
        reality_summary: "Painful outcome.",
        theme_changes: [{ theme: "Hurt", direction: "strengthened" }],
        identity_impact: "Impact.",
      }),
    ).toThrow();
  });

  it("rejects present on positive themes", () => {
    expect(() =>
      parseCheckInOutput({
        reality_summary: "Good outcome.",
        theme_changes: [{ theme: "Courage", direction: "present" }],
        identity_impact: "Impact.",
      }),
    ).toThrow();
  });

  it("normalizes difficult theme synonyms", () => {
    expect(normalizeCheckInThemeName("loneliness")).toBe("Loneliness");
    expect(normalizeCheckInThemeName("grief")).toBe("Grief");
  });

  it("normalizes difficult directions", () => {
    const changes = normalizeThemeChangesArray([
      { theme: "Hurt", direction: "processing" },
    ]);
    expect(changes[0]?.direction).toBe("processing");
  });

  it("classifies difficult vs positive themes", () => {
    expect(isDifficultCheckInTheme("Hurt")).toBe(true);
    expect(isDifficultCheckInTheme("Courage")).toBe(false);
    for (const theme of DIFFICULT_THEME_NAMES) {
      expect(isDifficultCheckInTheme(theme)).toBe(true);
    }
    for (const theme of CHECK_IN_POSITIVE_THEME_NAMES) {
      expect(isDifficultCheckInTheme(theme)).toBe(false);
    }
  });

  it("validates direction sets per theme category", () => {
    expect(isValidDirectionForTheme("Hurt", "present")).toBe(true);
    expect(isValidDirectionForTheme("Hurt", "strengthened")).toBe(false);
    expect(isValidDirectionForTheme("Courage", "strengthened")).toBe(true);
    expect(isValidDirectionForTheme("Courage", "present")).toBe(false);
  });
});

describe("check-in card theme badge styling", () => {
  const CARD_SOURCE = readFileSync(
    resolve(__dirname, "../components/check-ins/check-in-card.tsx"),
    "utf-8",
  );

  it("uses different styles for difficult themes", () => {
    expect(CARD_SOURCE).toContain("isDifficultCheckInTheme");
    expect(CARD_SOURCE).toContain("state-contradiction-detected");
    expect(CARD_SOURCE).toContain("surface-muted");
  });
});

describe("forecast wild_card section", () => {
  it("includes wild_card in forecastOutputSchema", () => {
    const parsed = parseForecastOutput({
      active: [],
      hidden: [],
      blind_spots: [],
      wild_card: [
        {
          title: "A Mutual Friend Hosts An Event",
          why: "Shared friends create overlap.",
          impact: "You both show up unexpectedly.",
          signals: ["Friend plans event", "Both invited", "Same venue"],
          timeframe: "months",
        },
        {
          title: "She Reaches Out First",
          why: "Silence sometimes breaks from her side.",
          impact: "The dynamic shifts without your move.",
          signals: ["Long silence ends", "Her message arrives", "Tone is open"],
          timeframe: "months",
        },
        {
          title: "A Small Coincidence Reopens Contact",
          why: "Everyday overlap can restart things.",
          impact: "Chance encounter changes what felt settled.",
          signals: ["Same place again", "Brief conversation", "Contact resumes"],
          timeframe: "weeks",
        },
      ],
    });

    expect(parsed.wild_card).toHaveLength(3);
  });

  it("assigns wild card rank 4 in movement map", () => {
    const before: ForecastSections = {
      activeFutures: [],
      hiddenFutures: [],
      blindSpotFutures: [],
      wildCardFutures: [],
    };
    const after: ForecastSections = {
      activeFutures: [],
      hiddenFutures: [],
      blindSpotFutures: [],
      wildCardFutures: [
        {
          title: "Wild Future",
          whyItMightHappen: "x",
          signals: [],
          futureImpact: "y",
          expansion: null,
        },
      ],
    };

    const map = computeMovementMap(after, before);
    expect(map["Wild Future"]).toBe("new");
  });
});

describe("stored path cards use scannable formatting", () => {
  const PATH_CARD_SOURCE = readFileSync(
    resolve(__dirname, "../components/moments/stored-path-card.tsx"),
    "utf-8",
  );

  it("uses formatScannablePath for benefits and consequences", () => {
    expect(PATH_CARD_SOURCE).toContain("formatScannablePath");
    expect(PATH_CARD_SOURCE).toContain("scannable.benefits");
    expect(PATH_CARD_SOURCE).toContain("scannable.consequences");
  });
});

describe("check-in identity update summary pipeline", () => {
  const CHECK_INS_SOURCE = readFileSync(resolve(__dirname, "check-ins.ts"), "utf-8");
  const CARD_SOURCE = readFileSync(
    resolve(__dirname, "../components/check-ins/check-in-card.tsx"),
    "utf-8",
  );
  const PAGE_SOURCE = readFileSync(
    resolve(__dirname, "../app/(protected)/moments/[id]/page.tsx"),
    "utf-8",
  );
  const DB_SOURCE = readFileSync(resolve(__dirname, "../types/database.ts"), "utf-8");

  it("CheckIn type does not include forecast_summary", () => {
    expect(DB_SOURCE).not.toContain("forecast_summary");
  });

  it("createCheckIn does not generate forecast_summary", () => {
    expect(CHECK_INS_SOURCE).not.toContain("forecast_summary");
    expect(CHECK_INS_SOURCE).not.toContain("generateForecastSummary");
  });

  it("page fetches identity updates and builds summary map", () => {
    expect(PAGE_SOURCE).toContain("listIdentityUpdatesForMoment");
    expect(PAGE_SOURCE).toContain("buildCheckInIdentitySummaryMap");
    expect(PAGE_SOURCE).toContain("checkInIdentitySummaries");
  });

  it("CheckInCard renders identityUpdateSummary when present", () => {
    expect(CARD_SOURCE).toContain("identityUpdateSummary");
  });

  it("CheckInCard does NOT render forecast_summary", () => {
    expect(CARD_SOURCE).not.toContain("forecast_summary");
  });
});

describe("title normalization handles smart punctuation", () => {
  it("normalizes smart quotes and dashes", () => {
    expect(normalizeTitle("You\u2019re Ready")).toBe("you're ready");
    expect(normalizeTitle("Career\u2014Pivot")).toBe("career--pivot");
  });
});
