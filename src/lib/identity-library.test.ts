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

  it("carries every retired v3 id forward to a successor", () => {
    // The v3 epoch's live ids. Each must live on in exactly one Phase 4
    // profile's legacy_ids, or the library swap fades active rows — the
    // 2026-07-09 regression this mechanism exists to prevent.
    const retiredV3Ids = [
      "the-builder",
      "the-explorer",
      "the-mentor",
      "the-craftsman",
      "the-guardian",
      "the-connector",
      "the-competitor",
      "the-reformer",
      "the-scholar",
      "the-creator",
    ];
    const allLegacyIds = new Set(
      IDENTITY_LIBRARY.flatMap((profile) => profile.legacy_ids ?? []),
    );
    for (const retired of retiredV3Ids) {
      expect(allLegacyIds.has(retired), `${retired} has no successor`).toBe(true);
    }
  });
});

// Phase 4 contract: a library of 20–30 Future Selves, each built around one
// dominant neutral trait, named in 2–3 human words, selected with at most
// one per dominant dimension.
describe("identity library — Phase 4 trait invariants", () => {
  it("holds between 20 and 30 Future Selves", () => {
    expect(IDENTITY_LIBRARY.length).toBeGreaterThanOrEqual(20);
    expect(IDENTITY_LIBRARY.length).toBeLessThanOrEqual(30);
  });

  it("gives every Future Self a unique dominant trait", () => {
    const traits = IDENTITY_LIBRARY.map((profile) => profile.trait);
    expect(new Set(traits).size).toBe(traits.length);
    for (const trait of traits) {
      expect(trait.trim().length).toBeGreaterThan(0);
    }
  });

  it("keeps canonical names unique", () => {
    const names = IDENTITY_LIBRARY.map((profile) => profile.canonical_name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('names every Future Self in 2–3 words with no "The..." prefix', () => {
    for (const profile of IDENTITY_LIBRARY) {
      const words = profile.canonical_name.split(/\s+/);
      expect(
        words.length,
        `${profile.canonical_name}: expected 2–3 words`,
      ).toBeGreaterThanOrEqual(2);
      expect(words.length, `${profile.canonical_name}: expected 2–3 words`).toBeLessThanOrEqual(
        3,
      );
      expect(
        words[0].toLowerCase(),
        `${profile.canonical_name}: must not start with "The"`,
      ).not.toBe("the");
    }
  });

  it("declares the dimension with the largest absolute weight as dominant", () => {
    for (const profile of IDENTITY_LIBRARY) {
      const entries = Object.entries(profile.dimension_weights);
      expect(entries.length).toBeGreaterThan(0);

      const dominantAbs = Math.abs(
        profile.dimension_weights[profile.dominant_dimension] ?? 0,
      );
      expect(
        dominantAbs,
        `${profile.canonical_name}: dominant_dimension carries no weight`,
      ).toBeGreaterThan(0);

      for (const [dimension, weight] of entries) {
        if (dimension === profile.dominant_dimension) continue;
        // Strictly largest — a tie would make the dedup key ambiguous.
        expect(
          Math.abs(weight!),
          `${profile.canonical_name}: ${dimension} ties or beats the dominant dimension`,
        ).toBeLessThan(dominantAbs);
      }
    }
  });

  it("writes every quote as one plain single-line sentence", () => {
    for (const profile of IDENTITY_LIBRARY) {
      expect(profile.identity_statement).not.toContain("\n");
      expect(profile.identity_statement.trim().endsWith(".")).toBe(true);
    }
  });

  it("lists 3–5 observable typical behaviors per Future Self", () => {
    for (const profile of IDENTITY_LIBRARY) {
      expect(profile.typical_behaviors.length).toBeGreaterThanOrEqual(3);
      expect(profile.typical_behaviors.length).toBeLessThanOrEqual(5);
    }
  });

  it("never names a Future Self after the product itself", () => {
    for (const profile of IDENTITY_LIBRARY) {
      expect(profile.canonical_name).not.toContain("Reflection");
      expect(profile.trait).not.toBe("Reflection");
    }
  });
});

// Phases 5.1–5.3: every archetype carries permanent, hand-written card
// content. These sections are editorial copy, never AI output — the pinned
// shape here is what the card and the persistence pipeline both rely on.
describe("identity library — curated narratives (Phases 5.1–5.3)", () => {
  it("curates every archetype — the library is fully deterministic", () => {
    for (const profile of IDENTITY_LIBRARY) {
      expect(profile.curated_narrative, `${profile.id} is not curated`).toBeDefined();
    }
  });

  const curatedProfiles = IDENTITY_LIBRARY.filter((p) => p.curated_narrative);

  it("gives every curated identity exactly 3 becomes paragraphs, 3 strengthens, 3 tradeoffs", () => {
    for (const profile of curatedProfiles) {
      const curated = profile.curated_narrative!;
      expect(curated.becomes).toHaveLength(3);
      expect(curated.strengthens).toHaveLength(3);
      expect(curated.tradeoffs).toHaveLength(3);
    }
  });

  it("keeps every curated line non-empty, single-line, and sentence-terminated", () => {
    for (const profile of curatedProfiles) {
      const curated = profile.curated_narrative!;
      for (const line of [...curated.becomes, ...curated.strengthens, ...curated.tradeoffs]) {
        expect(line.trim().length, `${profile.id}: empty line`).toBeGreaterThan(0);
        expect(line, `${profile.id}: newline inside a line`).not.toContain("\n");
        expect(/[.!?]$/.test(line.trim()), `${profile.id}: "${line}" lacks terminal punctuation`).toBe(true);
      }
    }
  });

  it("keeps becomes paragraphs short — one or two sentences each", () => {
    for (const profile of curatedProfiles) {
      for (const paragraph of profile.curated_narrative!.becomes) {
        // Sentence terminators followed by a space approximate sentence
        // count; em-dash clauses don't count.
        const sentences = paragraph.split(/[.!?]\s+/).filter(Boolean).length;
        expect(
          sentences,
          `${profile.id}: becomes paragraph has ${sentences} sentences: "${paragraph}"`,
        ).toBeLessThanOrEqual(2);
      }
    }
  });

  it("never mentions percentages, dimensions, or psychology", () => {
    const banned = /(%|\bpercent|\bdimension|\bpsycholog|\blikelihood\b|\bscore\b)/i;
    for (const profile of curatedProfiles) {
      const curated = profile.curated_narrative!;
      for (const line of [...curated.becomes, ...curated.strengthens, ...curated.tradeoffs]) {
        expect(banned.test(line), `${profile.id}: "${line}"`).toBe(false);
      }
    }
  });

  it("never repeats a bullet or paragraph across archetypes — every identity reads distinct", () => {
    const allLines = curatedProfiles.flatMap((profile) => {
      const curated = profile.curated_narrative!;
      return [...curated.becomes, ...curated.strengthens, ...curated.tradeoffs];
    });
    expect(new Set(allLines).size).toBe(allLines.length);
  });
});
