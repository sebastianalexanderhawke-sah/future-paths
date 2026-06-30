import { beforeEach, describe, expect, it, vi } from "vitest";

type TableResponse = { data?: unknown; error?: unknown };
type TableConfig = TableResponse | TableResponse[];
type TrackedCall = { table: string; method: string; args: unknown[] };

const {
  extractAndPersistMock,
  recognizeMock,
  getIdentityByIdMock,
  explainIdentitiesMock,
  getActiveStub,
  setActiveStub,
} = vi.hoisted(() => {
  let stub: { client: unknown; calls: TrackedCall[] } | null = null;
  return {
    extractAndPersistMock: vi.fn(async () => {}),
    recognizeMock: vi.fn(() => []),
    getIdentityByIdMock: vi.fn(),
    explainIdentitiesMock: vi.fn(),
    getActiveStub: () => stub,
    setActiveStub: (value: { client: unknown; calls: TrackedCall[] }) => {
      stub = value;
    },
  };
});

vi.mock("@/lib/behavior-extraction", () => ({
  extractAndPersistBehaviorObservations: extractAndPersistMock,
}));

vi.mock("@/lib/identity-recognition", () => ({
  recognizeIdentitiesWithAttribution: recognizeMock,
}));

vi.mock("@/lib/identity-library", () => ({
  getIdentityById: getIdentityByIdMock,
}));

vi.mock("@/lib/ai/explain-identity", () => ({
  explainIdentities: explainIdentitiesMock,
}));

vi.mock("@/lib/current-self", () => ({
  requestCurrentSelfRegeneration: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => getActiveStub()!.client),
}));

const { generateFutureSelves, loadFutureSelfImpactByPath } = await import("@/lib/future-selves");

// ---------------------------------------------------------------------------
// Stub helpers
// ---------------------------------------------------------------------------

function createSupabaseStub(tableConfigs: Record<string, TableConfig>) {
  const calls: TrackedCall[] = [];
  const counters: Record<string, number> = {};

  function resolveFor(table: string): TableResponse {
    const config = tableConfigs[table] ?? { data: [], error: null };
    if (!Array.isArray(config)) return config;
    const i = counters[table] ?? 0;
    counters[table] = i + 1;
    return config[Math.min(i, config.length - 1)];
  }

  function makeBuilder(table: string) {
    const builder: Record<string, (...args: unknown[]) => unknown> = {};
    const chainable = ["select", "eq", "order", "limit", "in", "neq"] as const;

    for (const method of chainable) {
      builder[method] = (...args: unknown[]) => {
        calls.push({ table, method, args });
        return builder;
      };
    }
    builder.insert = (...args: unknown[]) => {
      calls.push({ table, method: "insert", args });
      return builder;
    };
    builder.update = (...args: unknown[]) => {
      calls.push({ table, method: "update", args });
      return builder;
    };
    builder.single = () => Promise.resolve(resolveFor(table));
    builder.maybeSingle = () => Promise.resolve(resolveFor(table));
    builder.then = (
      resolve: (v: unknown) => unknown,
      reject?: (r: unknown) => unknown,
    ) => Promise.resolve(resolveFor(table)).then(resolve, reject);

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

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const PROFILE = {
  id: "self-reliant-builder",
  canonical_name: "Self-Reliant Builder",
  short_description: "Builds capability and makes decisions independently.",
  dimension_weights: { Independence: 1.0 },
  typical_behaviors: ["Takes on challenges without asking for help"],
};

const MATCH = {
  identityId: "self-reliant-builder",
  canonicalName: "Self-Reliant Builder",
  score: 15,
  likelihood: 60,
  confidence: 70,
  evidenceStrength: "Moderate" as const,
  matchedDimensions: ["Independence"],
  dimensionBreakdown: [],
  opposingDimensions: [],
  supportingObservations: [],
  opposingObservations: [],
  supportingSituations: [],
};

const FALLBACK_EXPLANATION = {
  why_emerging: "This identity pattern is appearing across your recent situations.",
  growth_opportunities: ["Engage deliberately in situations that call for this pattern."],
  blind_spots: ["Watch for moments when this pattern creates friction with other values."],
  likely_evolution: "If these patterns continue, this identity may become more consistent.",
};

const OBSERVATIONS_RESPONSE = {
  data: [
    {
      id: "obs-1",
      observation: "Solved the problem alone",
      signals: ["independence"],
      moment_id: "moment-1",
      extracted_at: "2026-06-01T00:00:00Z",
      moments: { title: "Work challenge" },
    },
  ],
  error: null,
};

// ---------------------------------------------------------------------------
// generateFutureSelves
// ---------------------------------------------------------------------------

describe("generateFutureSelves", () => {
  beforeEach(() => {
    recognizeMock.mockReset();
    recognizeMock.mockReturnValue([]);
    getIdentityByIdMock.mockReset();
    extractAndPersistMock.mockReset();
    explainIdentitiesMock.mockReset();
    // Default: return a fallback explanation for every entry, keyed by identityId.
    explainIdentitiesMock.mockImplementation(
      async (entries: Array<{ match: { identityId: string } }>) =>
        entries.map(({ match }) => ({ identityId: match.identityId, explanation: FALLBACK_EXPLANATION })),
    );
  });

  it("returns existing active futures unchanged when no behavior observations exist", async () => {
    const existingFuture = {
      id: "fs-1",
      user_id: "user-1",
      name: "Self-Reliant Builder",
      status: "active",
      percentage: 55,
    };
    const stub = createSupabaseStub({
      behavior_observations: { data: [], error: null },
      future_selves: { data: [existingFuture], error: null },
    });
    setActiveStub(stub);

    const result = await generateFutureSelves();

    expect("error" in result).toBe(false);
    expect(
      "futureSelves" in result && (result as { futureSelves: unknown[] }).futureSelves,
    ).toHaveLength(1);
    const writes = stub.calls.filter(
      (c) => c.table === "future_selves" && (c.method === "insert" || c.method === "update"),
    );
    expect(writes).toHaveLength(0);
  });

  it("returns existing active futures unchanged when identity recognition produces no matches", async () => {
    const existingFuture = {
      id: "fs-1",
      user_id: "user-1",
      name: "Self-Reliant Builder",
      status: "active",
      percentage: 55,
    };
    const stub = createSupabaseStub({
      behavior_observations: OBSERVATIONS_RESPONSE,
      future_selves: { data: [existingFuture], error: null },
    });
    setActiveStub(stub);

    // recognizeMock already returns [] from beforeEach
    const result = await generateFutureSelves();

    expect("error" in result).toBe(false);
    const writes = stub.calls.filter(
      (c) => c.table === "future_selves" && (c.method === "insert" || c.method === "update"),
    );
    expect(writes).toHaveLength(0);
  });

  it("inserts a new future self and records an emerged event when an identity is recognized for the first time", async () => {
    recognizeMock.mockReturnValueOnce([MATCH]);
    getIdentityByIdMock.mockReturnValueOnce(PROFILE);

    const createdRow = {
      id: "fs-new",
      user_id: "user-1",
      name: "Self-Reliant Builder",
      status: "active",
      percentage: 60,
      identity_id: "self-reliant-builder",
    };
    const stub = createSupabaseStub({
      behavior_observations: OBSERVATIONS_RESPONSE,
      future_selves: [
        { data: [], error: null },            // load all existing
        { data: createdRow, error: null },    // INSERT.select().single()
        { data: [createdRow], error: null },  // listFutureSelves
      ],
      future_self_events: { error: null },
    });
    setActiveStub(stub);

    const result = await generateFutureSelves();

    expect("error" in result).toBe(false);

    const inserts = stub.calls.filter(
      (c) => c.table === "future_selves" && c.method === "insert",
    );
    expect(inserts).toHaveLength(1);
    const payload = inserts[0].args[0] as Record<string, unknown>;
    expect(payload.name).toBe("Self-Reliant Builder");
    expect(payload.identity_id).toBe("self-reliant-builder");
    expect(payload.status).toBe("active");

    const events = stub.calls.filter(
      (c) => c.table === "future_self_events" && c.method === "insert",
    );
    expect(events).toHaveLength(1);
    const event = events[0].args[0] as Record<string, unknown>;
    expect(event.event_type).toBe("emerged");
    expect(event.percentage_before).toBeNull();
    expect(event.percentage_after).toBe(60);
  });

  it("updates an existing active future and records a grew event when its likelihood increases", async () => {
    recognizeMock.mockReturnValueOnce([{ ...MATCH, likelihood: 75 }]);
    getIdentityByIdMock.mockReturnValueOnce(PROFILE);

    const existingRow = {
      id: "fs-1",
      user_id: "user-1",
      name: "Self-Reliant Builder",
      status: "active",
      percentage: 60,
      evidence_strength: "Moderate",
      identity_id: "self-reliant-builder",
    };
    const stub = createSupabaseStub({
      behavior_observations: OBSERVATIONS_RESPONSE,
      future_selves: [
        { data: [existingRow], error: null },
        { error: null },
        { data: [existingRow], error: null },
      ],
      future_self_events: { error: null },
    });
    setActiveStub(stub);

    await generateFutureSelves();

    const updates = stub.calls.filter(
      (c) => c.table === "future_selves" && c.method === "update",
    );
    expect(updates).toHaveLength(1);
    const payload = updates[0].args[0] as Record<string, unknown>;
    expect(payload.percentage).toBe(75);
    expect(payload.previous_percentage).toBe(60);

    const events = stub.calls.filter(
      (c) => c.table === "future_self_events" && c.method === "insert",
    );
    expect(events).toHaveLength(1);
    const event = events[0].args[0] as Record<string, unknown>;
    expect(event.event_type).toBe("grew");
    expect(event.percentage_before).toBe(60);
    expect(event.percentage_after).toBe(75);
  });

  it("updates an existing active future without recording any event when likelihood does not increase", async () => {
    recognizeMock.mockReturnValueOnce([{ ...MATCH, likelihood: 50 }]);
    getIdentityByIdMock.mockReturnValueOnce(PROFILE);

    const existingRow = {
      id: "fs-1",
      user_id: "user-1",
      name: "Self-Reliant Builder",
      status: "active",
      percentage: 60,
      evidence_strength: "Moderate",
      identity_id: "self-reliant-builder",
    };
    const stub = createSupabaseStub({
      behavior_observations: OBSERVATIONS_RESPONSE,
      future_selves: [
        { data: [existingRow], error: null },
        { error: null },
        { data: [existingRow], error: null },
      ],
      future_self_events: { error: null },
    });
    setActiveStub(stub);

    await generateFutureSelves();

    const updates = stub.calls.filter(
      (c) => c.table === "future_selves" && c.method === "update",
    );
    expect(updates).toHaveLength(1);

    const events = stub.calls.filter(
      (c) => c.table === "future_self_events" && c.method === "insert",
    );
    expect(events).toHaveLength(0);
  });

  it("restores a faded future to active and records a returned event when the identity is recognized again", async () => {
    recognizeMock.mockReturnValueOnce([MATCH]);
    getIdentityByIdMock.mockReturnValueOnce(PROFILE);

    const fadedRow = {
      id: "fs-1",
      user_id: "user-1",
      name: "Self-Reliant Builder",
      status: "faded",
      percentage: 20,
      evidence_strength: "Emerging",
      identity_id: "self-reliant-builder",
    };
    const stub = createSupabaseStub({
      behavior_observations: OBSERVATIONS_RESPONSE,
      future_selves: [
        { data: [fadedRow], error: null },
        { error: null },
        { data: [{ ...fadedRow, status: "active", percentage: 60 }], error: null },
      ],
      future_self_events: { error: null },
    });
    setActiveStub(stub);

    await generateFutureSelves();

    const updates = stub.calls.filter(
      (c) => c.table === "future_selves" && c.method === "update",
    );
    expect(updates).toHaveLength(1);
    const payload = updates[0].args[0] as Record<string, unknown>;
    expect(payload.status).toBe("active");
    expect(payload.percentage).toBe(60);

    const events = stub.calls.filter(
      (c) => c.table === "future_self_events" && c.method === "insert",
    );
    expect(events).toHaveLength(1);
    const event = events[0].args[0] as Record<string, unknown>;
    expect(event.event_type).toBe("returned");
  });

  it("fades an active future whose identity is not in the recognized set", async () => {
    const otherMatch = {
      ...MATCH,
      identityId: "community-weaver",
      canonicalName: "Community Weaver",
    };
    const otherProfile = {
      ...PROFILE,
      id: "community-weaver",
      canonical_name: "Community Weaver",
    };
    recognizeMock.mockReturnValueOnce([otherMatch]);
    getIdentityByIdMock.mockReturnValueOnce(otherProfile);

    const unmatchedActiveRow = {
      id: "fs-old",
      user_id: "user-1",
      name: "Self-Reliant Builder",
      status: "active",
      percentage: 45,
      identity_id: "self-reliant-builder",
    };
    const newRow = {
      id: "fs-new",
      user_id: "user-1",
      name: "Community Weaver",
      status: "active",
      percentage: 60,
      identity_id: "community-weaver",
    };
    const stub = createSupabaseStub({
      behavior_observations: OBSERVATIONS_RESPONSE,
      future_selves: [
        { data: [unmatchedActiveRow], error: null }, // load all existing
        { data: newRow, error: null },               // INSERT community-weaver
        { error: null },                              // UPDATE (fade) self-reliant-builder
        { data: [newRow], error: null },             // listFutureSelves
      ],
      future_self_events: [
        { error: null }, // emerged for community-weaver
        { error: null }, // faded for self-reliant-builder
      ],
    });
    setActiveStub(stub);

    await generateFutureSelves();

    const updates = stub.calls.filter(
      (c) => c.table === "future_selves" && c.method === "update",
    );
    expect(updates).toHaveLength(1);
    const fadePayload = updates[0].args[0] as Record<string, unknown>;
    expect(fadePayload.status).toBe("faded");
    expect(fadePayload.percentage).toBe(0);
    expect(fadePayload.previous_percentage).toBe(45);

    const events = stub.calls.filter(
      (c) => c.table === "future_self_events" && c.method === "insert",
    );
    const eventTypes = events.map((e) => (e.args[0] as Record<string, unknown>).event_type);
    expect(eventTypes).toContain("emerged");
    expect(eventTypes).toContain("faded");
  });

  it("matches a legacy row by canonical name and updates it rather than inserting a duplicate", async () => {
    recognizeMock.mockReturnValueOnce([MATCH]);
    getIdentityByIdMock.mockReturnValueOnce(PROFILE);

    const legacyRow = {
      id: "fs-legacy",
      user_id: "user-1",
      name: "Self-Reliant Builder",
      status: "active",
      percentage: 40,
      evidence_strength: "Emerging",
      identity_id: null,
    };
    const stub = createSupabaseStub({
      behavior_observations: OBSERVATIONS_RESPONSE,
      future_selves: [
        { data: [legacyRow], error: null },
        { error: null },
        { data: [legacyRow], error: null },
      ],
      future_self_events: { error: null },
    });
    setActiveStub(stub);

    await generateFutureSelves();

    const inserts = stub.calls.filter(
      (c) => c.table === "future_selves" && c.method === "insert",
    );
    expect(inserts).toHaveLength(0);

    const updates = stub.calls.filter(
      (c) => c.table === "future_selves" && c.method === "update",
    );
    expect(updates).toHaveLength(1);
    const payload = updates[0].args[0] as Record<string, unknown>;
    expect(payload.identity_id).toBe("self-reliant-builder");
    expect(payload.percentage).toBe(60);
  });

  it("calls extraction when a momentId is provided and no observations exist yet for that moment", async () => {
    const stub = createSupabaseStub({
      behavior_observations: [
        { data: [], error: null }, // check existing for momentId — none found
        { data: [], error: null }, // load all observations
      ],
      future_selves: { data: [], error: null },
    });
    setActiveStub(stub);

    await generateFutureSelves("moment-1");

    expect(extractAndPersistMock).toHaveBeenCalledTimes(1);
    expect(extractAndPersistMock).toHaveBeenCalledWith("user-1", "moment-1");
  });

  it("skips extraction when momentId is provided but observations already exist for that moment", async () => {
    const stub = createSupabaseStub({
      behavior_observations: [
        { data: [{ id: "obs-existing" }], error: null }, // check existing — found
        { data: [], error: null },                        // load all
      ],
      future_selves: { data: [], error: null },
    });
    setActiveStub(stub);

    await generateFutureSelves("moment-1");

    expect(extractAndPersistMock).not.toHaveBeenCalled();
  });

  it("still persists the identity when explainIdentities returns a fallback explanation", async () => {
    recognizeMock.mockReturnValueOnce([MATCH]);
    getIdentityByIdMock.mockReturnValueOnce(PROFILE);
    // explainIdentitiesMock already returns fallback explanations from beforeEach

    const createdRow = {
      id: "fs-new",
      user_id: "user-1",
      name: "Self-Reliant Builder",
      status: "active",
      percentage: 60,
      identity_id: "self-reliant-builder",
    };
    const stub = createSupabaseStub({
      behavior_observations: OBSERVATIONS_RESPONSE,
      future_selves: [
        { data: [], error: null },
        { data: createdRow, error: null },
        { data: [createdRow], error: null },
      ],
      future_self_events: { error: null },
    });
    setActiveStub(stub);

    const result = await generateFutureSelves();

    expect("error" in result).toBe(false);
    const inserts = stub.calls.filter(
      (c) => c.table === "future_selves" && c.method === "insert",
    );
    expect(inserts).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// loadFutureSelfImpactByPath
// ---------------------------------------------------------------------------

describe("loadFutureSelfImpactByPath", () => {
  it("attributes the first generation run after a chosen path to that path, with current future names", async () => {
    const stub = createSupabaseStub({
      paths: {
        data: [{ id: "path-1", chosen_at: "2026-06-23T23:29:43.000Z" }],
        error: null,
      },
      future_self_events: {
        data: [
          {
            future_self_id: "f1",
            event_type: "grew",
            percentage_before: 33,
            percentage_after: 35,
            created_at: "2026-06-23T23:29:44.000Z",
          },
          {
            future_self_id: "f2",
            event_type: "faded",
            percentage_before: 20,
            percentage_after: 0,
            created_at: "2026-06-23T23:29:44.500Z",
          },
        ],
        error: null,
      },
      future_selves: {
        data: [
          { id: "f1", name: "Relocating and Building Independently" },
          { id: "f2", name: "Quietly Cutting Ties" },
        ],
        error: null,
      },
    });
    setActiveStub(stub);

    const impact = await loadFutureSelfImpactByPath();

    expect(impact.get("path-1")).toEqual([
      {
        futureSelfId: "f1",
        name: "Relocating and Building Independently",
        eventType: "grew",
        percentageBefore: 33,
        percentageAfter: 35,
        delta: 2,
      },
      {
        futureSelfId: "f2",
        name: "Quietly Cutting Ties",
        eventType: "faded",
        percentageBefore: 20,
        percentageAfter: 0,
        delta: -20,
      },
    ]);
  });

  it("excludes a later generation run that belongs to the next chosen path", async () => {
    const stub = createSupabaseStub({
      paths: {
        data: [
          { id: "path-1", chosen_at: "2026-06-23T20:00:00.000Z" },
          { id: "path-2", chosen_at: "2026-06-23T23:00:00.000Z" },
        ],
        error: null,
      },
      future_self_events: {
        data: [
          // Belongs to path-1's window (right after it, well before path-2).
          {
            future_self_id: "f1",
            event_type: "grew",
            percentage_before: 10,
            percentage_after: 15,
            created_at: "2026-06-23T20:00:05.000Z",
          },
          // Belongs to path-2's window, not path-1's, despite being the
          // overall "next" event chronologically.
          {
            future_self_id: "f2",
            event_type: "grew",
            percentage_before: 30,
            percentage_after: 40,
            created_at: "2026-06-23T23:00:02.000Z",
          },
        ],
        error: null,
      },
      future_selves: {
        data: [
          { id: "f1", name: "Future One" },
          { id: "f2", name: "Future Two" },
        ],
        error: null,
      },
    });
    setActiveStub(stub);

    const impact = await loadFutureSelfImpactByPath();

    expect(impact.get("path-1")).toEqual([
      {
        futureSelfId: "f1",
        name: "Future One",
        eventType: "grew",
        percentageBefore: 10,
        percentageAfter: 15,
        delta: 5,
      },
    ]);
    expect(impact.get("path-2")).toEqual([
      {
        futureSelfId: "f2",
        name: "Future Two",
        eventType: "grew",
        percentageBefore: 30,
        percentageAfter: 40,
        delta: 10,
      },
    ]);
  });

  it("only attributes the first generation run, not a later, separate run in the same window", async () => {
    const stub = createSupabaseStub({
      paths: {
        data: [{ id: "path-1", chosen_at: "2026-06-23T20:00:00.000Z" }],
        error: null,
      },
      future_self_events: {
        data: [
          // First run, right after the path was chosen.
          {
            future_self_id: "f1",
            event_type: "grew",
            percentage_before: 10,
            percentage_after: 15,
            created_at: "2026-06-23T20:00:05.000Z",
          },
          // A second, unrelated run more than the run-gap threshold later
          // (e.g. triggered by a check-in), with no other chosen path yet.
          {
            future_self_id: "f2",
            event_type: "grew",
            percentage_before: 30,
            percentage_after: 40,
            created_at: "2026-06-23T20:05:00.000Z",
          },
        ],
        error: null,
      },
      future_selves: {
        data: [
          { id: "f1", name: "Future One" },
          { id: "f2", name: "Future Two" },
        ],
        error: null,
      },
    });
    setActiveStub(stub);

    const impact = await loadFutureSelfImpactByPath();

    expect(impact.get("path-1")).toEqual([
      {
        futureSelfId: "f1",
        name: "Future One",
        eventType: "grew",
        percentageBefore: 10,
        percentageAfter: 15,
        delta: 5,
      },
    ]);
  });

  it("returns an empty map when no generation ran after the path was chosen", async () => {
    const stub = createSupabaseStub({
      paths: { data: [{ id: "path-1", chosen_at: "2026-06-23T20:00:00.000Z" }], error: null },
      future_self_events: { data: [], error: null },
      future_selves: { data: [], error: null },
    });
    setActiveStub(stub);

    const impact = await loadFutureSelfImpactByPath();

    expect(impact.size).toBe(0);
  });
});
