import { describe, expect, it, vi } from "vitest";

type TableResponse = { data?: unknown; count?: number; error?: unknown };
type TrackedCall = { table: string; method: string; args: unknown[] };

const { getActiveStub, setActiveStub } = vi.hoisted(() => {
  let stub: { client: unknown; calls: TrackedCall[] } | null = null;
  return {
    getActiveStub: () => stub,
    setActiveStub: (value: { client: unknown; calls: TrackedCall[] }) => {
      stub = value;
    },
  };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => getActiveStub()!.client),
}));

const { loadMonthlyIdentityEvolution } = await import("@/lib/monthly-identity-evolution");

const CHAINABLE_METHODS = ["select", "eq", "order", "limit", "in", "neq"] as const;

function createSupabaseStub(tableResponses: Record<string, TableResponse>) {
  const calls: TrackedCall[] = [];

  function makeBuilder(table: string) {
    const response = tableResponses[table] ?? { data: [], error: null };
    const builder: Record<string, (...args: unknown[]) => unknown> = {};

    for (const method of CHAINABLE_METHODS) {
      builder[method] = (...args: unknown[]) => {
        calls.push({ table, method, args });
        return builder;
      };
    }

    builder.single = () => Promise.resolve(response);
    builder.maybeSingle = () => Promise.resolve(response);
    builder.then = (
      resolve: (value: unknown) => unknown,
      reject?: (reason: unknown) => unknown,
    ) => Promise.resolve(response).then(resolve, reject);

    return builder;
  }

  const client = {
    from: (table: string) => makeBuilder(table),
    auth: {
      getUser: async () => ({ data: { user: { id: "user-1" } }, error: null }),
    },
  };

  return { client, calls };
}

describe("loadMonthlyIdentityEvolution", () => {
  it("groups paths, identity updates, and future-self events into one object per calendar month", async () => {
    const stub = createSupabaseStub({
      paths: {
        data: [
          {
            id: "path-may",
            moment_id: "moment-1",
            description: "@native-title:Reached Out To Old Friends@\nText three old friends.",
            themes: ["Connection"],
            chosen_at: "2026-05-10T12:00:00.000Z",
          },
          {
            id: "path-june",
            moment_id: "moment-2",
            description: "@native-title:Apply Wider, Move Faster@\nSend more applications.",
            themes: ["Courage", "Independence"],
            chosen_at: "2026-06-01T09:00:00.000Z",
          },
        ],
        error: null,
      },
      identity_updates: {
        data: [
          {
            id: "update-may",
            moment_id: "moment-1",
            update_type: "reality_shift",
            title: "More open to connection",
            summary: "Reaching out felt easier than expected.",
            themes: ["Connection"],
            created_at: "2026-05-15T12:00:00.000Z",
          },
        ],
        error: null,
      },
      future_self_events: {
        data: [
          {
            future_self_id: "f1",
            event_type: "grew",
            percentage_before: 20,
            percentage_after: 32,
            created_at: "2026-05-16T12:00:00.000Z",
          },
        ],
        error: null,
      },
      future_selves: {
        data: [{ id: "f1", name: "Selectively Reconnecting", themes: ["Connection"] }],
        error: null,
      },
    });
    setActiveStub(stub);

    const result = await loadMonthlyIdentityEvolution();
    if (!("months" in result)) throw new Error("expected months");

    expect(result.months).toHaveLength(2);
    expect(result.months.map((m) => m.month)).toEqual(["June 2026", "May 2026"]);

    const may = result.months.find((m) => m.month === "May 2026")!;
    expect(may.dominantThemes).toEqual(["Connection"]);
    expect(may.majorDecisions).toEqual(["Reached Out To Old Friends"]);
    expect(may.futureShifts).toEqual([{ futureName: "Selectively Reconnecting", delta: 12 }]);
    expect(may.identityChangeEvidence.identityUpdates).toHaveLength(1);
    expect(may.identityChangeEvidence.chosenPaths).toHaveLength(1);

    const june = result.months.find((m) => m.month === "June 2026")!;
    expect(june.majorDecisions).toEqual(["Apply Wider, Move Faster"]);
    expect(june.futureShifts).toEqual([]);
  });

  it("ranks major decisions: future-self impact first, identity-update reference second, newest third", async () => {
    const stub = createSupabaseStub({
      paths: {
        data: [
          {
            id: "path-a",
            moment_id: "moment-a",
            description: "Path A description.",
            themes: ["Stability"],
            chosen_at: "2026-06-01T00:00:00.000Z",
          },
          {
            id: "path-b",
            moment_id: "moment-b",
            description: "Path B description.",
            themes: ["Growth"],
            chosen_at: "2026-06-10T00:00:00.000Z",
          },
          {
            id: "path-c",
            moment_id: "moment-c",
            description: "Path C description.",
            themes: ["Courage"],
            chosen_at: "2026-06-20T00:00:00.000Z",
          },
        ],
        error: null,
      },
      // path-b is "referenced" by an identity update sharing its moment_id.
      identity_updates: {
        data: [
          {
            id: "update-b",
            moment_id: "moment-b",
            update_type: "reality_shift",
            title: "Update for B",
            summary: "Summary",
            themes: ["Growth"],
            created_at: "2026-06-11T00:00:00.000Z",
          },
        ],
        error: null,
      },
      // path-a produced a future_self_event in the run immediately after it
      // was chosen (before path-b was chosen).
      future_self_events: {
        data: [
          {
            future_self_id: "f1",
            event_type: "grew",
            percentage_before: 10,
            percentage_after: 20,
            created_at: "2026-06-01T00:00:05.000Z",
          },
        ],
        error: null,
      },
      future_selves: {
        data: [{ id: "f1", name: "Future One", themes: ["Stability"] }],
        error: null,
      },
    });
    setActiveStub(stub);

    const result = await loadMonthlyIdentityEvolution();
    if (!("months" in result)) throw new Error("expected months");

    const june = result.months.find((m) => m.month === "June 2026")!;
    // path-a (impact) first, path-b (identity-update reference) second,
    // path-c (newest of the rest) third.
    expect(june.majorDecisions).toEqual(["Path A description.", "Path B description.", "Path C description."]);
  });

  it("caps major decisions at 5 even when more chosen paths exist in the month", async () => {
    const paths = Array.from({ length: 7 }, (_, i) => ({
      id: `path-${i}`,
      moment_id: `moment-${i}`,
      description: `Path number ${i}.`,
      themes: ["Stability"],
      chosen_at: `2026-06-${String(i + 1).padStart(2, "0")}T00:00:00.000Z`,
    }));

    const stub = createSupabaseStub({
      paths: { data: paths, error: null },
      identity_updates: { data: [], error: null },
      future_self_events: { data: [], error: null },
      future_selves: { data: [], error: null },
    });
    setActiveStub(stub);

    const result = await loadMonthlyIdentityEvolution();
    if (!("months" in result)) throw new Error("expected months");

    expect(result.months[0].majorDecisions).toHaveLength(5);
    // Newest-first fallback tier: path-6 (June 7) before path-0 (June 1).
    expect(result.months[0].majorDecisions[0]).toBe("Path number 6.");
  });

  it("aggregates future-self events into a net delta per future, sorted by absolute movement, capped at 5", async () => {
    const events = [
      { future_self_id: "f1", event_type: "grew", percentage_before: 30, percentage_after: 45, created_at: "2026-06-05T00:00:00.000Z" },
      { future_self_id: "f1", event_type: "grew", percentage_before: 45, percentage_after: 50, created_at: "2026-06-15T00:00:00.000Z" },
      { future_self_id: "f2", event_type: "faded", percentage_before: 25, percentage_after: 0, created_at: "2026-06-06T00:00:00.000Z" },
    ];

    const stub = createSupabaseStub({
      paths: { data: [], error: null },
      identity_updates: { data: [], error: null },
      future_self_events: { data: events, error: null },
      future_selves: {
        data: [
          { id: "f1", name: "Future One", themes: ["Stability"] },
          { id: "f2", name: "Future Two", themes: ["Courage"] },
        ],
        error: null,
      },
    });
    setActiveStub(stub);

    const result = await loadMonthlyIdentityEvolution();
    if (!("months" in result)) throw new Error("expected months");

    expect(result.months[0].futureShifts).toEqual([
      { futureName: "Future Two", delta: -25 },
      { futureName: "Future One", delta: 20 },
    ]);
  });

  it("keeps the top 4 dominant themes by frequency across chosen paths, identity updates, and future themes", async () => {
    const stub = createSupabaseStub({
      paths: {
        data: [
          { id: "p1", moment_id: "m1", description: "d", themes: ["Stability", "Courage"], chosen_at: "2026-06-01T00:00:00.000Z" },
          { id: "p2", moment_id: "m2", description: "d", themes: ["Stability"], chosen_at: "2026-06-02T00:00:00.000Z" },
        ],
        error: null,
      },
      identity_updates: {
        data: [
          { id: "u1", moment_id: "m1", update_type: "reality_shift", title: "t", summary: "s", themes: ["Stability", "Growth"], created_at: "2026-06-03T00:00:00.000Z" },
        ],
        error: null,
      },
      future_self_events: {
        data: [{ future_self_id: "f1", event_type: "grew", percentage_before: 1, percentage_after: 2, created_at: "2026-06-04T00:00:00.000Z" }],
        error: null,
      },
      future_selves: {
        data: [{ id: "f1", name: "Future One", themes: ["Independence", "Belonging"] }],
        error: null,
      },
    });
    setActiveStub(stub);

    const result = await loadMonthlyIdentityEvolution();
    if (!("months" in result)) throw new Error("expected months");

    // Stability appears 3x, Courage/Growth/Independence/Belonging 1x each —
    // top 4 keeps Stability plus the first three runner-ups in pooled order.
    expect(result.months[0].dominantThemes).toEqual(["Stability", "Courage", "Growth", "Independence"]);
  });

  it("groups check-ins by calendar month and carries their evidence through unchanged", async () => {
    const stub = createSupabaseStub({
      paths: { data: [], error: null },
      identity_updates: { data: [], error: null },
      future_self_events: { data: [], error: null },
      future_selves: { data: [], error: null },
      check_ins: {
        data: [
          {
            id: "check-in-may",
            reflection: "Felt unsure about reaching out.",
            reality_summary: "Stayed quiet most of the month.",
            theme_changes: [{ theme: "Loneliness", direction: "present" }],
            identity_impact: "Avoided initiating contact.",
            created_at: "2026-05-20T00:00:00.000Z",
          },
          {
            id: "check-in-june",
            reflection: "Reached out without overthinking it.",
            reality_summary: "Texted two old friends.",
            theme_changes: [{ theme: "Connection", direction: "strengthened" }],
            identity_impact: "Initiated contact more easily.",
            created_at: "2026-06-05T00:00:00.000Z",
          },
        ],
        error: null,
      },
    });
    setActiveStub(stub);

    const result = await loadMonthlyIdentityEvolution();
    if (!("months" in result)) throw new Error("expected months");

    expect(result.months.map((m) => m.month)).toEqual(["June 2026", "May 2026"]);

    const june = result.months.find((m) => m.month === "June 2026")!;
    expect(june.identityChangeEvidence.checkIns).toEqual([
      {
        id: "check-in-june",
        reflection: "Reached out without overthinking it.",
        realitySummary: "Texted two old friends.",
        identityImpact: "Initiated contact more easily.",
        themeChanges: [{ theme: "Connection", direction: "strengthened" }],
        createdAt: "2026-06-05T00:00:00.000Z",
      },
    ]);

    const may = result.months.find((m) => m.month === "May 2026")!;
    expect(may.identityChangeEvidence.checkIns).toHaveLength(1);
    expect(may.identityChangeEvidence.checkIns[0].id).toBe("check-in-may");
  });

  it("returns an empty months array when the account has no relevant activity", async () => {
    const stub = createSupabaseStub({
      paths: { data: [], error: null },
      identity_updates: { data: [], error: null },
      future_self_events: { data: [], error: null },
      future_selves: { data: [], error: null },
    });
    setActiveStub(stub);

    const result = await loadMonthlyIdentityEvolution();
    if (!("months" in result)) throw new Error("expected months");

    expect(result.months).toEqual([]);
  });
});
