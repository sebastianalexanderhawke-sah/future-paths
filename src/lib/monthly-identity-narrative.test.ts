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
    // `unknown` values: `then` takes function parameters, which strict
    // contravariance rejects under a `(...args: unknown[]) => unknown` index.
    const builder: Record<string, unknown> = {};

    for (const method of CHAINABLE_METHODS) {
      builder[method] = (...args: unknown[]) => {
        calls.push({ table, method, args });
        return builder;
      };
    }

    builder.upsert = (...args: unknown[]) => {
      calls.push({ table, method: "upsert", args });
      return builder;
    };
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

  it("merges AI-generated headline/opening with the deterministic how-you-changed bullets and evidence counts", async () => {
    setActiveStub(createSupabaseStub(ONE_MONTH_OF_DATA));
    runStructuredGenerationMock.mockResolvedValueOnce({
      ok: true,
      data: [
        {
          month: "June 2026",
          headline: "Decisions started getting made before certainty arrived.",
          opening_beginning: "Plans waited for a clearer picture.",
          opening_end: "Action came first and the picture filled in after.",
        },
      ],
    });

    const result = await loadMonthlyIdentityNarratives();
    if (!("narratives" in result)) throw new Error("expected narratives");

    expect(result.narratives).toEqual([
      {
        month: "June 2026",
        headline: "Decisions started getting made before certainty arrived.",
        openingBeginning: "Plans waited for a clearer picture.",
        openingEnd: "Action came first and the picture filled in after.",
        howYouChanged: ["You became more willing to act without certainty."],
        previousMonth: null,
        comparison: { traitsMorePresent: ["Courage"], traitsLessPresent: [] },
        situationCount: 1,
        checkInCount: 0,
        reflectionCount: 0,
      },
    ]);
  });

  it("calls the AI generation step with the monthly_identity_narrative profile and prompt id", async () => {
    setActiveStub(createSupabaseStub(ONE_MONTH_OF_DATA));
    runStructuredGenerationMock.mockResolvedValueOnce({
      ok: true,
      data: [
        {
          month: "June 2026",
          headline: "H",
          opening_beginning: "At the beginning of the month, B.",
          opening_end: "By the end of the month, E.",
          why_this_changed: "W",
        },
      ],
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
        headline: "June 2026",
        openingBeginning: "",
        openingEnd: "",
        howYouChanged: ["You became more willing to act without certainty."],
        previousMonth: null,
        comparison: { traitsMorePresent: ["Courage"], traitsLessPresent: [] },
        situationCount: 1,
        checkInCount: 0,
        reflectionCount: 0,
      },
    ]);
  });

  it("derives how-you-changed bullets from a comparison against the previous month once one exists", async () => {
    setActiveStub(createSupabaseStub(TWO_MONTHS_OF_DATA));
    runStructuredGenerationMock.mockResolvedValueOnce({
      ok: true,
      data: [
        {
          month: "June 2026",
          headline: "H1",
          opening_beginning: "At the beginning of the month, B1.",
          opening_end: "By the end of the month, E1.",
          why_this_changed: "W1",
        },
        {
          month: "May 2026",
          headline: "H2",
          opening_beginning: "At the beginning of the month, B2.",
          opening_end: "By the end of the month, E2.",
          why_this_changed: "W2",
        },
      ],
    });

    const result = await loadMonthlyIdentityNarratives();
    if (!("narratives" in result)) throw new Error("expected narratives");

    expect(result.narratives.map((n) => n.month)).toEqual(["June 2026", "May 2026"]);

    const june = result.narratives[0];
    expect(june.previousMonth).toBe("May 2026");
    expect(june.comparison).toEqual({
      traitsMorePresent: ["Courage"],
      traitsLessPresent: ["Independence"],
    });
    expect(june.howYouChanged).toEqual([
      "You became more willing to act without certainty.",
      "You became less comfortable making decisions alone.",
    ]);

    // The oldest month has no previous month to compare against, but still
    // derives how-you-changed bullets from its own strongest identity
    // evidence — a baseline reading, never a fabricated decline.
    const may = result.narratives[1];
    expect(may.previousMonth).toBeNull();
    expect(may.comparison).toEqual({
      traitsMorePresent: ["Independence"],
      traitsLessPresent: [],
    });
    expect(may.howYouChanged).toEqual(["You became more comfortable making decisions alone."]);
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

  it("persists generated narratives, then serves later loads without any AI call", async () => {
    // First load: nothing stored yet → generation runs and the drafts are
    // persisted per (user, month).
    const firstStub = createSupabaseStub(ONE_MONTH_OF_DATA);
    setActiveStub(firstStub);
    runStructuredGenerationMock.mockResolvedValueOnce({
      ok: true,
      data: [
        {
          month: "June 2026",
          headline: "Decisions started getting made before certainty arrived.",
          opening_beginning: "Plans waited for a clearer picture.",
          opening_end: "Action came first and the picture filled in after.",
        },
      ],
    });

    await loadMonthlyIdentityNarratives();

    const upsertCall = firstStub.calls.find(
      (call) => call.table === "monthly_identity_narratives" && call.method === "upsert",
    );
    expect(upsertCall).toBeDefined();
    const persistedRows = upsertCall!.args[0] as Array<Record<string, unknown>>;
    expect(persistedRows).toHaveLength(1);
    expect(persistedRows[0]).toMatchObject({
      user_id: "user-1",
      month: "June 2026",
      headline: "Decisions started getting made before certainty arrived.",
    });

    // Second load: the stored narrative covers every month, so no AI call is
    // made and the stored draft is rendered verbatim.
    setActiveStub(
      createSupabaseStub({
        ...ONE_MONTH_OF_DATA,
        monthly_identity_narratives: { data: persistedRows, error: null },
      }),
    );
    runStructuredGenerationMock.mockClear();

    const result = await loadMonthlyIdentityNarratives();
    if (!("narratives" in result)) throw new Error("expected narratives");

    expect(runStructuredGenerationMock).not.toHaveBeenCalled();
    expect(result.narratives[0].headline).toBe(
      "Decisions started getting made before certainty arrived.",
    );
    expect(result.narratives[0].openingBeginning).toBe("Plans waited for a clearer picture.");
  });

  it("never regenerates a stored historical month, even when its fingerprint no longer matches", async () => {
    // June 2026 is a settled past month; its stored narrative must be served
    // as-is regardless of what the evidence would fingerprint to today.
    setActiveStub(
      createSupabaseStub({
        ...ONE_MONTH_OF_DATA,
        monthly_identity_narratives: {
          data: [
            {
              month: "June 2026",
              headline: "The original June chapter.",
              opening_beginning: "It began.",
              opening_end: "It ended.",
              evidence_fingerprint: "a-fingerprint-that-no-longer-matches",
            },
          ],
          error: null,
        },
      }),
    );

    const result = await loadMonthlyIdentityNarratives();
    if (!("narratives" in result)) throw new Error("expected narratives");

    expect(runStructuredGenerationMock).not.toHaveBeenCalled();
    expect(result.narratives[0].headline).toBe("The original June chapter.");
  });

  it("regenerates the current month when its stored fingerprint is stale", async () => {
    const { currentMonthLabel } = await import("@/lib/monthly-identity-evolution");
    const nowIso = new Date().toISOString();
    const nowLabel = currentMonthLabel();

    const currentMonthData = {
      paths: {
        data: [
          {
            id: "path-1",
            moment_id: "moment-1",
            description: "@native-title:Apply Wider, Move Faster@\nSend more applications.",
            themes: ["Courage", "Independence"],
            chosen_at: nowIso,
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
            created_at: nowIso,
          },
        ],
        error: null,
      },
      future_self_events: { data: [], error: null },
      future_selves: { data: [], error: null },
      monthly_identity_narratives: {
        data: [
          {
            month: nowLabel,
            headline: "The stale current-month chapter.",
            opening_beginning: "Old beginning.",
            opening_end: "Old end.",
            evidence_fingerprint: "written-before-this-month's-newest-evidence",
          },
        ],
        error: null,
      },
    };

    const stub = createSupabaseStub(currentMonthData);
    setActiveStub(stub);
    runStructuredGenerationMock.mockResolvedValueOnce({
      ok: true,
      data: [
        {
          month: nowLabel,
          headline: "The refreshed current-month chapter.",
          opening_beginning: "New beginning.",
          opening_end: "New end.",
        },
      ],
    });

    const result = await loadMonthlyIdentityNarratives();
    if (!("narratives" in result)) throw new Error("expected narratives");

    expect(runStructuredGenerationMock).toHaveBeenCalledTimes(1);
    expect(result.narratives[0].headline).toBe("The refreshed current-month chapter.");

    const upsertCall = stub.calls.find(
      (call) => call.table === "monthly_identity_narratives" && call.method === "upsert",
    );
    expect(upsertCall).toBeDefined();
    const rows = upsertCall!.args[0] as Array<Record<string, unknown>>;
    expect(rows[0]).toMatchObject({
      month: nowLabel,
      headline: "The refreshed current-month chapter.",
    });
    expect(rows[0].evidence_fingerprint).not.toBe(
      "written-before-this-month's-newest-evidence",
    );
  });
});
