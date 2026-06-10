import { describe, expect, it } from "vitest";

import { parseCrossroadOutput } from "@/lib/ai/schemas/crossroad";
import {
  normalizeCrossroadThemesInOutput,
  normalizeThemeName,
  normalizeThemesArray,
} from "@/lib/ai/schemas/theme-normalization";
import { THEME_NAMES } from "@/types/enums";

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
});
