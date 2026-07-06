import { describe, expect, it, vi } from "vitest";

type TableResponse = { data?: unknown; count?: number; error?: unknown };

const { getActiveStub, setActiveStub } = vi.hoisted(() => {
  let stub: unknown = null;
  return {
    getActiveStub: () => stub,
    setActiveStub: (value: unknown) => {
      stub = value;
    },
  };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => getActiveStub()),
}));

const { buildIdentityContext } = await import("@/lib/ai/context/builder");

const CHAINABLE_METHODS = ["select", "eq", "order", "limit", "in", "neq", "not"] as const;

function createSupabaseStub(tableResponses: Record<string, TableResponse>) {
  function makeBuilder(table: string) {
    const response = tableResponses[table] ?? { data: [], error: null };
    // `unknown` values: `then` takes function parameters, which strict
    // contravariance rejects under a `(...args: unknown[]) => unknown` index.
    const builder: Record<string, unknown> = {};

    for (const method of CHAINABLE_METHODS) {
      builder[method] = () => builder;
    }

    builder.maybeSingle = () => Promise.resolve(response);
    builder.then = (
      resolve: (value: unknown) => unknown,
      reject?: (reason: unknown) => unknown,
    ) => Promise.resolve(response).then(resolve, reject);

    return builder;
  }

  return {
    from: (table: string) => makeBuilder(table),
    auth: {
      getUser: async () => ({ data: { user: { id: "user-1" } }, error: null }),
    },
  };
}

describe("buildIdentityContext — future_self profile", () => {
  it("surfaces the most recently chosen path as a dedicated top-level field", async () => {
    setActiveStub(
      createSupabaseStub({
        moments: { count: 3, data: null, error: null },
        check_ins: { count: 2, data: [], error: null },
        identity_updates: { data: [], error: null },
        paths: {
          data: [
            {
              themes: ["Stability"],
              chosen_at: "2026-06-23T16:27:12.813Z",
              description: "Take the new job",
              future_shift: "Builds toward financial stability",
            },
            {
              themes: ["Connection"],
              chosen_at: "2026-06-01T00:00:00.000Z",
              description: "Stay close to family",
              future_shift: "Builds toward closer relationships",
            },
          ],
          error: null,
        },
        future_selves: { data: [], error: null },
        current_self: { data: null, error: null },
      }),
    );

    const context = await buildIdentityContext({ userId: "user-1", profile: "future_self" });

    expect("error" in context).toBe(false);
    if ("error" in context) return;

    // Dedicated field, not just folded into the flattened theme history.
    expect(context.mostRecentChosenPath).toEqual({
      description: "Take the new job",
      themes: ["Stability"],
      chosen_at: "2026-06-23T16:27:12.813Z",
      future_shift: "Builds toward financial stability",
    });

    // Existing context (the full theme history) is preserved, not replaced.
    expect(context.pathThemes).toEqual(["Stability", "Connection"]);
  });

  it("omits the field when the user has no chosen paths", async () => {
    setActiveStub(
      createSupabaseStub({
        moments: { count: 0, data: null, error: null },
        check_ins: { count: 0, data: [], error: null },
        identity_updates: { data: [], error: null },
        paths: { data: [], error: null },
        future_selves: { data: [], error: null },
        current_self: { data: null, error: null },
      }),
    );

    const context = await buildIdentityContext({ userId: "user-1", profile: "future_self" });

    expect("error" in context).toBe(false);
    if ("error" in context) return;

    expect(context.mostRecentChosenPath).toBeUndefined();
    expect(context.pathThemes).toEqual([]);
  });
});
