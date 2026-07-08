import { describe, expect, it, vi } from "vitest";

const { getActiveStub, setActiveStub } = vi.hoisted(() => {
  let stub: { row: unknown } | null = null;
  return {
    getActiveStub: () => stub,
    setActiveStub: (value: { row: unknown }) => {
      stub = value;
    },
  };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => {
    const builder: Record<string, unknown> = {};
    builder.select = () => builder;
    builder.eq = () => builder;
    builder.maybeSingle = () => Promise.resolve({ data: getActiveStub()!.row, error: null });

    return {
      from: () => builder,
      auth: {
        getUser: async () => ({ data: { user: { id: "user-1" } }, error: null }),
      },
    };
  }),
}));

const { getCurrentSelf } = await import("@/lib/current-self");

describe("getCurrentSelf — legacy row normalization", () => {
  it("does not throw when values/afraid_of_becoming/core_tension columns are missing entirely", async () => {
    setActiveStub({
      row: {
        id: "cs-1",
        user_id: "user-1",
        title: "A steady builder",
        summary: "Someone who moves before certainty arrives.",
        themes: ["Growth", "Independence"],
        recent_growth: ["Trusting your own judgment more"],
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
        // values, afraid_of_becoming, core_tension intentionally absent —
        // a row read before this migration was applied to the live schema.
      },
    });

    const result = await getCurrentSelf();

    expect("error" in result).toBe(false);
    if ("error" in result) {
      return;
    }

    expect(result.currentSelf).not.toBeNull();
    expect(Array.isArray(result.currentSelf?.values)).toBe(true);
    expect(Array.isArray(result.currentSelf?.afraid_of_becoming)).toBe(true);
  });

  it("infers values and fears from themes when the row has none stored", async () => {
    setActiveStub({
      row: {
        id: "cs-2",
        user_id: "user-1",
        title: "A steady builder",
        summary: "Someone who moves before certainty arrives.",
        themes: ["Growth", "Independence"],
        values: null,
        afraid_of_becoming: null,
        core_tension: null,
        recent_growth: [],
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      },
    });

    const result = await getCurrentSelf();

    expect("error" in result).toBe(false);
    if ("error" in result) {
      return;
    }

    expect(result.currentSelf?.values?.length).toBeGreaterThan(0);
    expect(result.currentSelf?.afraid_of_becoming?.length).toBeGreaterThan(0);
    expect(result.currentSelf?.values?.some((v) => v.startsWith("Growth\n"))).toBe(true);
  });

  it("leaves real stored values and fears untouched", async () => {
    setActiveStub({
      row: {
        id: "cs-3",
        user_id: "user-1",
        title: "A steady builder",
        summary: "Someone who moves before certainty arrives.",
        themes: ["Growth", "Independence"],
        values: ["Freedom\nYou repeatedly choose autonomy."],
        afraid_of_becoming: ["Settling for comfort before growth."],
        core_tension: "You want freedom. You also want stability.",
        recent_growth: [],
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      },
    });

    const result = await getCurrentSelf();

    expect("error" in result).toBe(false);
    if ("error" in result) {
      return;
    }

    expect(result.currentSelf?.values).toEqual(["Freedom\nYou repeatedly choose autonomy."]);
    expect(result.currentSelf?.afraid_of_becoming).toEqual([
      "Settling for comfort before growth.",
    ]);
  });
});
