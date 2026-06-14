import { describe, expect, it, vi } from "vitest";

import { crossroadOutputSchema } from "@/lib/ai/schemas/crossroad";
import { tentativeTextSchema } from "@/lib/ai/schemas/shared";

// ---------------------------------------------------------------------------
// Minimal valid path factory — reused across crossroad tests below.
// ---------------------------------------------------------------------------
function makeValidPath(overrides: Record<string, unknown> = {}) {
  return {
    title: "Direct Approach",
    description: "Take a direct approach to the situation.",
    benefits: ["The outcome becomes clear.", "You gain information quickly."],
    consequences: ["The result may disappoint.", "The dynamic may shift."],
    future_shift: "You become more comfortable with directness.",
    themes: ["Courage"],
    ...overrides,
  };
}

describe("tentativeTextSchema sanitization", () => {
  it("removes a sentence-start 'you should' and re-capitalises the remainder", () => {
    const result = tentativeTextSchema.parse("You should ask her out directly tonight.");
    expect(result).toBe("Ask her out directly tonight.");
  });

  it("removes a sentence-start 'you must' and re-capitalises the remainder", () => {
    const result = tentativeTextSchema.parse("You must decide before the offer expires.");
    expect(result).toBe("Decide before the offer expires.");
  });

  it("removes a mid-sentence banned phrase, collapses whitespace, and fires console.warn", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    try {
      const input = "Consider that you have to balance work and this relationship.";
      const result = tentativeTextSchema.parse(input);

      expect(result).not.toMatch(/you have to/i);
      expect(result).not.toMatch(/\s{2,}/);
      expect(result.trim().length).toBeGreaterThan(0);

      expect(warnSpy).toHaveBeenCalledOnce();
      // Warning message should contain the original text for debugging.
      expect(warnSpy.mock.calls[0]?.[0]).toContain(input);
    } finally {
      warnSpy.mockRestore();
    }
  });

  it("passes a clean sentence through completely unchanged", () => {
    const clean = "She decides to send the message before the weekend.";
    const result = tentativeTextSchema.parse(clean);
    expect(result).toBe(clean);
  });
});

describe("crossroadOutputSchema with banned-phrase sanitization", () => {
  it("does not throw when one path benefit contains a banned phrase, and sanitizes it in place", () => {
    const input = {
      current_understanding: "You are weighing a significant decision.",
      paths: [
        makeValidPath({
          title: "Ask Her Out",
          benefits: ["You should talk to her about it soon.", "The connection becomes real."],
          themes: ["Courage"],
        }),
        makeValidPath({ title: "Friendship First", themes: ["Connection"] }),
        makeValidPath({ title: "Keep It Professional", themes: ["Stability"] }),
        makeValidPath({ title: "Wait And Observe", themes: ["Reflection"] }),
        makeValidPath({ title: "Move On", themes: ["Independence"] }),
      ],
    };

    let parsed: ReturnType<typeof crossroadOutputSchema.parse>;
    expect(() => {
      parsed = crossroadOutputSchema.parse(input);
    }).not.toThrow();

    // All 5 paths survive — nothing is dropped.
    expect(parsed!.paths).toHaveLength(5);

    // The banned phrase is replaced with a capitalised remainder.
    expect(parsed!.paths[0]?.benefits[0]).toBe("Talk to her about it soon.");
    // The second benefit is unaffected.
    expect(parsed!.paths[0]?.benefits[1]).toBe("The connection becomes real.");
  });
});
