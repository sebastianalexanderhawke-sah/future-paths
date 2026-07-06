import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { allowRequest } from "@/lib/rate-limit";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("allowRequest", () => {
  it("allows up to the limit within a window, then blocks", () => {
    const key = `test-block-${Date.now()}`;

    for (let i = 0; i < 5; i += 1) {
      expect(allowRequest(key, 5, 60_000)).toBe(true);
    }

    expect(allowRequest(key, 5, 60_000)).toBe(false);
    expect(allowRequest(key, 5, 60_000)).toBe(false);
  });

  it("resets after the window elapses", () => {
    const key = `test-reset-${Date.now()}`;

    expect(allowRequest(key, 1, 60_000)).toBe(true);
    expect(allowRequest(key, 1, 60_000)).toBe(false);

    vi.advanceTimersByTime(60_000);

    expect(allowRequest(key, 1, 60_000)).toBe(true);
  });

  it("tracks keys independently", () => {
    const keyA = `test-a-${Date.now()}`;
    const keyB = `test-b-${Date.now()}`;

    expect(allowRequest(keyA, 1, 60_000)).toBe(true);
    expect(allowRequest(keyA, 1, 60_000)).toBe(false);
    expect(allowRequest(keyB, 1, 60_000)).toBe(true);
  });
});
