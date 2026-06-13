import { describe, expect, it } from "vitest";

import {
  formatScannablePath,
  limitBullets,
  normalizeBullet,
  toFirstSentence,
  toShortPhrase,
} from "@/components/home/output-refinement";
import { countPathTitleWords } from "@/components/home/path-titles";

describe("output refinement", () => {
  it("extracts a short title and one-sentence summary from verbose paths", () => {
    const formatted = formatScannablePath(
      {
        description:
          'Move forward with "I moved to Dallas" and commit to seeing it through. The opportunity works out and you decide to start a new chapter.',
        benefits: ["Career growth", "New friendships", "More independence"],
        consequences: ["Temporary loneliness", "Distance from familiar places"],
        future_shift:
          "You may become someone who is more adaptable, confident, and comfortable taking risks over time.",
        themes: ["Courage", "Growth"],
      },
      0,
    );

    expect(formatted.title).toBe("Take The Leap");
    expect(formatted.title).not.toContain("…");
    expect(countPathTitleWords(formatted.title)).toBeGreaterThanOrEqual(2);
    expect(countPathTitleWords(formatted.title)).toBeLessThanOrEqual(5);
    expect(formatted.explanation.split(/[.!?]/).filter(Boolean).length).toBeLessThanOrEqual(2);
    expect(formatted.benefits.length).toBeGreaterThanOrEqual(3);
    expect(formatted.consequences.length).toBeGreaterThanOrEqual(3);
    expect(formatted.futureYou).toBe(
      "You may become someone who is more adaptable, confident, and comfortable taking risks over time.",
    );
  });

  it("normalizes long bullets into short scan-friendly phrases", () => {
    const bullet = normalizeBullet(
      "Clarity may come from decisive action rather than prolonged uncertainty.",
    );

    expect(bullet.length).toBeLessThanOrEqual(56);
    expect(bullet.startsWith("Clarity may come from decisive action")).toBe(true);

    expect(toFirstSentence("First sentence. Second sentence.")).toBe("First sentence.");
    expect(toShortPhrase('Move forward with "Dallas role" and commit.')).toBe("Dallas role");
  });

  it("limits outcome bullets to five items", () => {
    const bullets = limitBullets([
      "One",
      "Two",
      "Three",
      "Four",
      "Five",
      "Six",
    ]);

    expect(bullets.length).toBeLessThanOrEqual(5);
  });
});
