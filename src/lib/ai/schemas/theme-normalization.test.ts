import { describe, expect, it } from "vitest";

import { parseCheckInOutput } from "@/lib/ai/schemas/check-in";
import { parseCrossroadOutput } from "@/lib/ai/schemas/crossroad";
import { parseIdentityUpdateOutput } from "@/lib/ai/schemas/identity-update";
import {
  normalizeCheckInThemesInOutput,
  normalizeCrossroadThemesInOutput,
  normalizeIdentityUpdateInOutput,
  normalizeIdentityUpdateType,
  normalizeThemeChangesArray,
  normalizeThemeName,
  normalizeThemesArray,
} from "@/lib/ai/schemas/theme-normalization";
import { IDENTITY_UPDATE_TYPES, THEME_NAMES } from "@/types/enums";

describe("theme normalization", () => {
  it("passes through approved theme names unchanged", () => {
    for (const theme of THEME_NAMES) {
      expect(normalizeThemeName(theme)).toBe(theme);
    }
  });

  it("maps common Claude inventions to approved themes", () => {
    expect(normalizeThemeName("boundaries")).toBe("Independence");
    expect(normalizeThemeName("self-protection")).toBe("Independence");
    expect(normalizeThemeName("closure")).toBe("Stability");
    expect(normalizeThemeName("communication")).toBe("Connection");
    expect(normalizeThemeName("uncertainty")).toBe("Reflection");
    expect(normalizeThemeName("self-discovery")).toBe("Curiosity");
    expect(normalizeThemeName("healing")).toBe("Growth");
    expect(normalizeThemeName("identity-shift")).toBe("Growth");
  });

  it("deduplicates and caps normalized theme arrays", () => {
    expect(
      normalizeThemesArray([
        "communication",
        "Connection",
        "boundaries",
        "Independence",
        "Growth",
        "Curiosity",
      ]),
    ).toEqual(["Connection", "Independence", "Growth"]);
  });

  it("normalizes crossroad output themes before schema validation", () => {
    const normalized = normalizeCrossroadThemesInOutput({
      current_understanding: "You may be weighing what comes next.",
      paths: [
        {
          description: "One direction.",
          benefits: ["Benefit one.", "Benefit two."],
          consequences: ["Consequence one.", "Consequence two."],
          future_shift: "You may grow.",
          themes: ["communication", "boundaries"],
        },
        {
          description: "Another direction.",
          benefits: ["Benefit one.", "Benefit two."],
          consequences: ["Consequence one.", "Consequence two."],
          future_shift: "You may reflect.",
          themes: ["uncertainty", "patience"],
        },
        {
          description: "Third direction.",
          benefits: ["Benefit one.", "Benefit two."],
          consequences: ["Consequence one.", "Consequence two."],
          future_shift: "You may explore.",
          themes: ["self-discovery", "healing"],
        },
        {
          description: "Fourth direction.",
          benefits: ["Benefit one.", "Benefit two."],
          consequences: ["Consequence one.", "Consequence two."],
          future_shift: "You may connect.",
          themes: ["Connection", "Belonging"],
        },
        {
          description: "Fifth direction.",
          benefits: ["Benefit one.", "Benefit two."],
          consequences: ["Consequence one.", "Consequence two."],
          future_shift: "You may lead.",
          themes: ["identity-shift", "Leadership"],
        },
      ],
    });

    expect(() => parseCrossroadOutput(normalized)).not.toThrow();
    const parsed = parseCrossroadOutput(normalized);

    expect(parsed.paths[0].themes).toEqual(["Connection", "Independence"]);
    expect(parsed.paths[1].themes).toEqual(["Reflection", "Stability"]);
    expect(parsed.paths[2].themes).toEqual(["Curiosity", "Growth"]);
  });

  it("fills missing theme change directions before schema validation", () => {
    expect(
      normalizeThemeChangesArray([
        { theme: "Growth" },
        { theme: "Connection", direction: "weakened" },
      ]),
    ).toEqual([
      { theme: "Growth", direction: "strengthened" },
      { theme: "Connection", direction: "weakened" },
    ]);
  });

  it("normalizes check-in output theme_changes before schema validation", () => {
    const normalized = normalizeCheckInThemesInOutput({
      reality_summary: "You may be noticing a shift in how this path feels.",
      theme_changes: [
        { theme: "communication" },
        { theme: "Growth", direction: "emerging" },
      ],
      identity_impact: "This may suggest movement toward a more independent pattern.",
    });

    expect(() => parseCheckInOutput(normalized)).not.toThrow();
    expect(parseCheckInOutput(normalized).theme_changes).toEqual([
      { theme: "Connection", direction: "strengthened" },
      { theme: "Growth", direction: "emerging" },
    ]);
  });

  it("passes through approved identity update types unchanged", () => {
    for (const updateType of IDENTITY_UPDATE_TYPES) {
      expect(normalizeIdentityUpdateType(updateType)).toBe(updateType);
    }
  });

  it("maps common Claude identity update type inventions to approved values", () => {
    expect(normalizeIdentityUpdateType("shift")).toBe("reality_shift");
    expect(normalizeIdentityUpdateType("emerging_pattern")).toBe("theme_emerging");
    expect(normalizeIdentityUpdateType("pattern")).toBe("pattern_strengthened");
    expect(normalizeIdentityUpdateType("strengthened")).toBe("pattern_strengthened");
  });

  it("normalizes identity update output before schema validation", () => {
    const normalized = normalizeIdentityUpdateInOutput({
      update_type: "shift",
      title: "Intention may meet reality",
      summary: "This check-in may suggest prediction is meeting outcome.",
      themes: ["communication", "Growth"],
    });

    expect(() => parseIdentityUpdateOutput(normalized)).not.toThrow();
    expect(parseIdentityUpdateOutput(normalized)).toEqual({
      update_type: "reality_shift",
      title: "Intention may meet reality",
      summary: "This check-in may suggest prediction is meeting outcome.",
      themes: ["Connection", "Growth"],
    });
  });
});
