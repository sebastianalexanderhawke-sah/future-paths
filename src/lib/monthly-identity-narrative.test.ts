import { beforeEach, describe, expect, it, vi } from "vitest";

type TableResponse = { data?: unknown; count?: number; error?: unknown };
type TrackedCall = { table: string; method: string; args: unknown[] };

const { runStructuredGenerationMock, getActiveStub, setActiveStub } = vi.hoisted(() => {
  let stub: { client: unknown; calls: TrackedCall[] } | null = null;
  return {
    runStructuredGenerationMock: vi.fn(),
    getActiveStub: () => stub,
    setActiveStub: (value: { client: unknown; calls: TrackedCall[] }) => {
      stub = value;
    },
  };
});

vi.mock("@/lib/ai/orchestrator", () => ({
  runStructuredGeneration: runStructuredGenerationMock,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => getActiveStub()!.client),
}));

const { loadMonthlyIdentityNarratives } = await import("@/lib/monthly-identity-narrative");

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

const ONE_MONTH_OF_DATA = {
  paths: {
    data: [
      {
        id: "path-1",
        moment_id: "moment-1",
        description: "@native-title:Apply Wider, Move Faster@\nSend more applications.",
        themes: ["Courage", "Independence"],
        chosen_at: "2026-06-01T00:00:00.000Z",
      },
    ],
    error: null,
  },
  identity_updates: {
    data: [
      {
        id: "update-1",
        moment_id: "moment-1",
        update_type: "reality_shift",
        title: "More willing to act without certainty",
        summary: "Applied before having a finished plan.",
        themes: ["Courage"],
        created_at: "2026-06-02T00:00:00.000Z",
      },
    ],
    error: null,
  },
  future_self_events: {
    data: [
      {
        future_self_id: "f1",
        event_type: "grew",
        percentage_before: 10,
        percentage_after: 46,
        created_at: "2026-06-01T00:00:05.000Z",
      },
    ],
    error: null,
  },
  future_selves: {
    data: [{ id: "f1", name: "Trades comfort for courage", themes: ["Courage"] }],
    error: null,
  },
};

const TWO_MONTHS_OF_DATA = {
  paths: {
    data: [
      {
        id: "path-1",
        moment_id: "moment-1",
        description: "@native-title:Apply Wider, Move Faster@\nSend more applications.",
        themes: ["Courage", "Independence"],
        chosen_at: "2026-06-01T00:00:00.000Z",
      },
      {
        id: "path-0",
        moment_id: "moment-0",
        description: "@native-title:Move Cities Alone@\nRelocate without waiting for company.",
        themes: ["Independence"],
        chosen_at: "2026-05-15T00:00:00.000Z",
      },
    ],
    error: null,
  },
  identity_updates: {
    data: [
      {
        id: "update-1",
        moment_id: "moment-1",
        update_type: "reality_shift",
        title: "More willing to act without certainty",
        summary: "Applied before having a finished plan.",
        themes: ["Courage"],
        created_at: "2026-06-02T00:00:00.000Z",
      },
      {
        id: "update-0",
        moment_id: "moment-0",
        update_type: "reality_shift",
        title: "Comfortable being the only one who decided",
        summary: "No one else weighed in before the move.",
        themes: ["Independence"],
        created_at: "2026-05-16T00:00:00.000Z",
      },
    ],
    error: null,
  },
  future_self_events: {
    data: [
      {
        future_self_id: "f1",
        event_type: "grew",
        percentage_before: 10,
        percentage_after: 46,
        created_at: "2026-06-01T00:00:05.000Z",
      },
      {
        future_self_id: "f1",
        event_type: "grew",
        percentage_before: 0,
        percentage_after: 20,
        created_at: "2026-05-01T00:00:05.000Z",
      },
    ],
    error: null,
  },
  future_selves: {
    data: [{ id: "f1", name: "Trades comfort for courage", themes: ["Courage"] }],
    error: null,
  },
};

describe("loadMonthlyIdentityNarratives", () => {
  beforeEach(() => {
    runStructuredGenerationMock.mockClear();
  });

  it("merges AI-generated title/summary/identity_changes with the deterministic fields from the aggregation layer", async () => {
    setActiveStub(createSupabaseStub(ONE_MONTH_OF_DATA));
    runStructuredGenerationMock.mockResolvedValueOnce({
      ok: true,
      data: [
        {
          month: "June 2026",
          title: "Acting Before Certainty",
          summary: "Financial pressure forced several difficult decisions this month.",
          identity_changes: [
            "More willing to act without certainty",
            "Less dependent on ideal conditions before starting",
            "More comfortable carrying responsibility alone",
          ],
        },
      ],
    });

    const result = await loadMonthlyIdentityNarratives();
    if (!("narratives" in result)) throw new Error("expected narratives");

    expect(result.narratives).toEqual([
      {
        month: "June 2026",
        title: "Acting Before Certainty",
        summary: "Financial pressure forced several difficult decisions this month.",
        themes: ["Courage", "Independence"],
        majorDecisions: ["Apply Wider, Move Faster"],
        futureShifts: [{ futureName: "Trades comfort for courage", delta: 36 }],
        identityChanges: [
          "More willing to act without certainty",
          "Less dependent on ideal conditions before starting",
          "More comfortable carrying responsibility alone",
        ],
        previousMonth: null,
        comparison: null,
      },
    ]);
  });

  it("calls the AI generation step with the monthly_identity_narrative profile and prompt id", async () => {
    setActiveStub(createSupabaseStub(ONE_MONTH_OF_DATA));
    runStructuredGenerationMock.mockResolvedValueOnce({
      ok: true,
      data: [{ month: "June 2026", title: "T", summary: "S", identity_changes: ["a", "b", "c"] }],
    });

    await loadMonthlyIdentityNarratives();

    expect(runStructuredGenerationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        profile: "monthly_identity_narrative",
        promptId: "monthly_identity_narrative.generate",
      }),
    );
  });

  it("returns an empty narrative list without calling the AI when there is no monthly activity", async () => {
    setActiveStub(
      createSupabaseStub({
        paths: { data: [], error: null },
        identity_updates: { data: [], error: null },
        future_self_events: { data: [], error: null },
        future_selves: { data: [], error: null },
      }),
    );

    const result = await loadMonthlyIdentityNarratives();
    if (!("narratives" in result)) throw new Error("expected narratives");

    expect(result.narratives).toEqual([]);
    expect(runStructuredGenerationMock).not.toHaveBeenCalled();
  });

  it("falls back gracefully when the model omits a month's narrative, keeping deterministic fields intact", async () => {
    setActiveStub(createSupabaseStub(ONE_MONTH_OF_DATA));
    runStructuredGenerationMock.mockResolvedValueOnce({ ok: true, data: [] });

    const result = await loadMonthlyIdentityNarratives();
    if (!("narratives" in result)) throw new Error("expected narratives");

    expect(result.narratives).toEqual([
      {
        month: "June 2026",
        title: "June 2026",
        summary: "",
        themes: ["Courage", "Independence"],
        majorDecisions: ["Apply Wider, Move Faster"],
        futureShifts: [{ futureName: "Trades comfort for courage", delta: 36 }],
        identityChanges: [],
        previousMonth: null,
        comparison: null,
      },
    ]);
  });

  it("attaches a deterministic month-over-month comparison to every month except the oldest", async () => {
    setActiveStub(createSupabaseStub(TWO_MONTHS_OF_DATA));
    runStructuredGenerationMock.mockResolvedValueOnce({
      ok: true,
      data: [
        { month: "June 2026", title: "T", summary: "S", identity_changes: [] },
        { month: "May 2026", title: "T2", summary: "S2", identity_changes: [] },
      ],
    });

    const result = await loadMonthlyIdentityNarratives();
    if (!("narratives" in result)) throw new Error("expected narratives");

    expect(result.narratives.map((n) => n.month)).toEqual(["June 2026", "May 2026"]);

    const june = result.narratives[0];
    expect(june.previousMonth).toBe("May 2026");
    expect(june.comparison).toEqual({
      increased: ["Courage", "Trades comfort for courage"],
      decreased: ["Independence"],
    });

    const may = result.narratives[1];
    expect(may.previousMonth).toBeNull();
    expect(may.comparison).toBeNull();
  });

  it("propagates an AI generation failure as an error", async () => {
    setActiveStub(createSupabaseStub(ONE_MONTH_OF_DATA));
    runStructuredGenerationMock.mockResolvedValueOnce({
      ok: false,
      error: "Generation failed.",
      fallbackAvailable: false,
    });

    const result = await loadMonthlyIdentityNarratives();

    expect(result).toEqual({ error: "Generation failed." });
  });
});
