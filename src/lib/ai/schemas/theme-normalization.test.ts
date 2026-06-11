import { describe, expect, it } from "vitest";

import { parseCheckInOutput } from "@/lib/ai/schemas/check-in";
import { parseCrossroadOutput } from "@/lib/ai/schemas/crossroad";
import { parseIdentityUpdateOutput } from "@/lib/ai/schemas/identity-update";
import {
  normalizeCheckInThemesInOutput,
  normalizeContradictionInOutput,
  normalizeContradictionSourceRefs,
  normalizeContradictionType,
  normalizeCrossroadThemesInOutput,
  normalizeFutureSelfInOutput,
  normalizeFutureSelfStage,
  normalizeIdentityPromptInOutput,
  normalizeIdentityPromptType,
  normalizeIdentityUpdateInOutput,
  normalizeIdentityUpdateType,
  normalizeThemeChangesArray,
  normalizeThemeName,
  normalizeThemesArray,
  normalizeTimelineInOutput,
} from "@/lib/ai/schemas/theme-normalization";
import { parseTimelineOutput } from "@/lib/ai/schemas/timeline";
import {
  CONTRADICTION_TYPES,
  FUTURE_SELF_STAGES,
  IDENTITY_PROMPT_TYPES,
  IDENTITY_UPDATE_TYPES,
  THEME_NAMES,
} from "@/types/enums";
import { parseContradictionOutput } from "@/lib/ai/schemas/contradiction";
import { parseFutureSelfOutput } from "@/lib/ai/schemas/future-self";
import { parseIdentityPromptOutput } from "@/lib/ai/schemas/identity-prompt";

describe("theme normalization", () => {
  it("passes through approved theme names unchanged", () => {
    for (const theme of THEME_NAMES) {
      expect(normalizeThemeName(theme)).toBe(theme);
    }
  });

  it("passes through approved future self stages unchanged", () => {
    for (const stage of FUTURE_SELF_STAGES) {
      expect(normalizeFutureSelfStage(stage)).toBe(stage);
    }
  });

  it("maps common Claude stage inventions to approved values", () => {
    expect(normalizeFutureSelfStage("developing")).toBe("emerging");
    expect(normalizeFutureSelfStage("forming")).toBe("possible");
    expect(normalizeFutureSelfStage("future self")).toBe("future_self");
  });

  it("passes through approved contradiction types unchanged", () => {
    for (const contradictionType of CONTRADICTION_TYPES) {
      expect(normalizeContradictionType(contradictionType)).toBe(contradictionType);
    }
  });

  it("maps common Claude contradiction type inventions to approved values", () => {
    expect(normalizeContradictionType("approach_avoidance")).toBe("current_vs_future");
    expect(normalizeContradictionType("values_conflict")).toBe("dual_future");
    expect(normalizeContradictionType("identity_role_conflict")).toBe("stated_vs_lived");
  });

  it("passes through approved identity prompt types unchanged", () => {
    for (const promptType of IDENTITY_PROMPT_TYPES) {
      expect(normalizeIdentityPromptType(promptType)).toBe(promptType);
    }
  });

  it("maps common Claude identity prompt type inventions to approved values", () => {
    expect(normalizeIdentityPromptType("pattern_reflection")).toBe("pattern_probe");
    expect(normalizeIdentityPromptType("tension_exploration")).toBe("theme_reflection");
    expect(normalizeIdentityPromptType("identity_signal")).toBe("pattern_probe");
  });

  it("coerces array source_refs using contradiction type", () => {
    const currentSelfId = "11111111-1111-4111-8111-111111111111";
    const futureSelfId = "22222222-2222-4222-8222-222222222222";

    expect(
      normalizeContradictionSourceRefs(
        [currentSelfId, futureSelfId],
        "current_vs_future",
      ),
    ).toEqual({
      current_self_id: currentSelfId,
      future_self_ids: [futureSelfId],
    });

    expect(
      normalizeContradictionSourceRefs([futureSelfId], "dual_future"),
    ).toEqual({
      future_self_ids: [futureSelfId],
    });
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
    expect(normalizeThemeName("Roots")).toBe("Belonging");
    expect(normalizeThemeName("Discovery")).toBe("Curiosity");
    expect(normalizeThemeName("Purpose")).toBe("Reflection");
    expect(normalizeThemeName("Adaptability")).toBe("Growth");
    expect(normalizeThemeName("Honesty")).toBe("Courage");
    expect(normalizeThemeName("Commitment")).toBe("Stability");
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

  it("normalizes timeline output themes before schema validation", () => {
    const normalized = normalizeTimelineInOutput([
      {
        title: "Stretching Into Something New",
        period_label: "2024-Q1",
        starts_at: "2024-01-01",
        ends_at: "2024-03-31",
        summary: "You may have been navigating change during this period.",
        themes: ["Roots", "Discovery"],
        evidence: [],
        strength: 5,
        includes_current_self: false,
      },
    ]);

    expect(() => parseTimelineOutput(normalized)).not.toThrow();
    expect(parseTimelineOutput(normalized)[0].themes).toEqual(["Belonging", "Curiosity"]);
  });

  it("normalizes future self output stages before schema validation", () => {
    const normalized = normalizeFutureSelfInOutput([
      {
        name: "The Builder",
        description: "You may be becoming someone who grows steadily.",
        stage: "developing",
        momentum: 80,
        themes: ["Growth"],
      },
    ]);

    expect(() => parseFutureSelfOutput(normalized)).not.toThrow();
    expect(parseFutureSelfOutput(normalized)[0].stage).toBe("emerging");
  });

  it("normalizes contradiction output before schema validation", () => {
    const normalized = normalizeContradictionInOutput([
      {
        contradiction_type: "approach_avoidance",
        title: "Two directions may compete",
        summary: "You may feel pulled between staying and moving forward.",
        pole_a: "Stay with what is familiar",
        pole_b: "Move toward a new trajectory",
        themes: ["Courage"],
        intensity: 55,
        source_refs: [
          "11111111-1111-4111-8111-111111111111",
          "22222222-2222-4222-8222-222222222222",
        ],
        signature: "test-signature",
      },
    ]);

    expect(() => parseContradictionOutput(normalized)).not.toThrow();
    expect(parseContradictionOutput(normalized)[0].contradiction_type).toBe(
      "current_vs_future",
    );
    expect(parseContradictionOutput(normalized)[0].source_refs).toEqual({
      current_self_id: "11111111-1111-4111-8111-111111111111",
      future_self_ids: ["22222222-2222-4222-8222-222222222222"],
    });
  });

  it("trims contradiction themes to at most 3 before schema validation", () => {
    const normalized = normalizeContradictionInOutput([
      {
        contradiction_type: "dual_future",
        title: "Two futures may compete",
        summary: "You may feel pulled between two trajectories.",
        pole_a: "First future",
        pole_b: "Second future",
        themes: ["Growth", "Courage", "Curiosity", "Independence"],
        intensity: 70,
        source_refs: {},
        signature: "dual_future:test",
      },
    ]);

    expect(() => parseContradictionOutput(normalized)).not.toThrow();
    expect(parseContradictionOutput(normalized)[0].themes).toEqual([
      "Growth",
      "Courage",
      "Curiosity",
    ]);
  });

  it("normalizes identity prompt output before schema validation", () => {
    const normalized = normalizeIdentityPromptInOutput([
      {
        prompt_type: "pattern_reflection",
        question: "What pattern may be emerging in your recent choices?",
        context: null,
        themes: ["Reflection"],
      },
    ]);

    expect(() => parseIdentityPromptOutput(normalized)).not.toThrow();
    expect(parseIdentityPromptOutput(normalized)[0].prompt_type).toBe("pattern_probe");
  });
});
