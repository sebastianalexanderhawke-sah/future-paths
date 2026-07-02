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

vi.mock("@/lib/ai/explain-identity", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ai/explain-identity")>();
  return {
    ...actual,
    explainIdentities: explainIdentitiesMock,
  };
});

vi.mock("@/lib/current-self", () => ({
  requestCurrentSelfRegeneration: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => getActiveStub()!.client),
}));

const { generateFutureSelves, queueFutureSelvesGeneration, loadFutureSelfImpactByPath } =
  await import("@/lib/future-selves");

// ---------------------------------------------------------------------------
// Stub helpers
// ---------------------------------------------------------------------------

function createSupabaseStub(tableConfigs: Record<string, TableConfig>, userId = "user-1") {
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
    const chainable = ["select", "eq", "order", "limit", "in", "neq", "not"] as const;

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
      getUser: async () => ({ data: { user: { id: userId } }, error: null }),
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

  it("uses the highest-ranked identity as an Emerging fallback when nothing passes the normal threshold", async () => {
    const fallbackMatch = {
      ...MATCH,
      score: 3,
      likelihood: 8,
      evidenceStrength: "Emerging" as const,
    };
    // The normal (thresholded) call returns nothing; only the explicit
    // minLikelihood: 0 / maxResults: 1 fallback call returns the best match.
    // This proves the fallback never lowers or bypasses the real threshold —
    // it just asks the same, unmodified engine for its single top pick.
    recognizeMock.mockImplementation((..._args: unknown[]) => {
      const options = _args[1] as { minLikelihood?: number; maxResults?: number } | undefined;
      return options?.minLikelihood === 0 ? [fallbackMatch] : [];
    });
    getIdentityByIdMock.mockReturnValue(PROFILE);

    const createdRow = {
      id: "fs-new",
      user_id: "user-1",
      name: "Self-Reliant Builder",
      status: "active",
      percentage: 8,
      evidence_strength: "Emerging",
      identity_id: "self-reliant-builder",
    };
    const stub = createSupabaseStub({
      behavior_observations: OBSERVATIONS_RESPONSE,
      future_selves: [
        { data: [], error: null }, // load all existing
        { data: createdRow, error: null }, // INSERT.select().single()
        { data: [createdRow], error: null }, // listFutureSelves
      ],
      future_self_events: { error: null },
    });
    setActiveStub(stub);

    const result = await generateFutureSelves();

    expect("error" in result).toBe(false);
    expect(recognizeMock).toHaveBeenLastCalledWith(expect.anything(), {
      minLikelihood: 0,
      maxResults: 1,
    });

    const inserts = stub.calls.filter(
      (c) => c.table === "future_selves" && c.method === "insert",
    );
    expect(inserts).toHaveLength(1);
    const payload = inserts[0].args[0] as Record<string, unknown>;
    expect(payload.identity_id).toBe("self-reliant-builder");
    expect(payload.evidence_strength).toBe("Emerging");
    expect(payload.percentage).toBe(8);
  });

  it("never surfaces legacy (non-identity-linked) rows from listFutureSelves", async () => {
    const stub = createSupabaseStub({
      behavior_observations: { data: [], error: null },
      future_selves: { data: [], error: null },
    });
    setActiveStub(stub);

    await generateFutureSelves();

    const reads = stub.calls.filter(
      (c) => c.table === "future_selves" && c.method === "not",
    );
    expect(reads).toContainEqual({
      table: "future_selves",
      method: "not",
      args: ["identity_id", "is", null],
    });
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

  it("does not call the AI and keeps the existing narrative when evidence_strength tier is unchanged (Phase 6A)", async () => {
    // 22% -> 24%: both fall in the "Emerging" tier (< 30), so no regeneration
    // should occur even though the percentage moved.
    recognizeMock.mockReturnValueOnce([{ ...MATCH, likelihood: 24, evidenceStrength: "Emerging" }]);
    getIdentityByIdMock.mockReturnValueOnce(PROFILE);

    const existingRow = {
      id: "fs-1",
      user_id: "user-1",
      name: "Self-Reliant Builder",
      status: "active",
      percentage: 22,
      evidence_strength: "Emerging",
      identity_id: "self-reliant-builder",
      why_emerging: "Existing why_emerging text.",
      growth_opportunities: ["Existing growth opportunity."],
      blind_spots: ["Existing blind spot."],
      likely_evolution: "Existing likely evolution text.",
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

    // The AI is invoked with an empty list — no identity needed regeneration.
    expect(explainIdentitiesMock).toHaveBeenCalledWith([]);

    const updates = stub.calls.filter(
      (c) => c.table === "future_selves" && c.method === "update",
    );
    expect(updates).toHaveLength(1);
    const payload = updates[0].args[0] as Record<string, unknown>;
    expect(payload.percentage).toBe(24);
    expect(payload.previous_percentage).toBe(22);
    // Narrative fields are carried over unchanged from the existing row.
    expect(payload.why_emerging).toBe("Existing why_emerging text.");
    expect(payload.growth_opportunities).toEqual(["Existing growth opportunity."]);
    expect(payload.blind_spots).toEqual(["Existing blind spot."]);
    expect(payload.likely_evolution).toBe("Existing likely evolution text.");
  });

  it("does not call the AI even when evidence_strength crosses a tier boundary (Phase 6C: narratives are stable archetypes, not per-situation output)", async () => {
    // 24% (Emerging) -> 42% (Moderate): a tier change, but Phase 6C no longer
    // treats this as a narrative-changing event — only a brand-new identity does.
    recognizeMock.mockReturnValueOnce([{ ...MATCH, likelihood: 42, evidenceStrength: "Moderate" }]);
    getIdentityByIdMock.mockReturnValueOnce(PROFILE);

    const existingRow = {
      id: "fs-1",
      user_id: "user-1",
      name: "Self-Reliant Builder",
      status: "active",
      percentage: 24,
      evidence_strength: "Emerging",
      identity_id: "self-reliant-builder",
      why_emerging: "Stable why_emerging text.",
      growth_opportunities: ["Stable growth opportunity."],
      blind_spots: ["Stable blind spot."],
      likely_evolution: "Stable likely evolution text.",
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

    expect(explainIdentitiesMock).toHaveBeenCalledWith([]);

    const updates = stub.calls.filter(
      (c) => c.table === "future_selves" && c.method === "update",
    );
    const payload = updates[0].args[0] as Record<string, unknown>;
    expect(payload.percentage).toBe(42);
    expect(payload.evidence_strength).toBe("Moderate");
    // Layer 1 (evidence_strength) updated; Layer 2 narrative stayed put.
    expect(payload.why_emerging).toBe("Stable why_emerging text.");
    expect(payload.growth_opportunities).toEqual(["Stable growth opportunity."]);
  });

  describe("Phase 6C — Explorer walkthrough", () => {
    const EXPLORER_PROFILE = {
      ...PROFILE,
      id: "explorer",
      canonical_name: "Explorer",
    };

    it("Example 1: 22% -> 23%, supporting evidence slightly stronger — percentage updates, narrative unchanged", async () => {
      recognizeMock.mockReturnValueOnce([
        { ...MATCH, identityId: "explorer", canonicalName: "Explorer", likelihood: 23, evidenceStrength: "Emerging" },
      ]);
      getIdentityByIdMock.mockReturnValueOnce(EXPLORER_PROFILE);

      const existingRow = {
        id: "fs-explorer",
        user_id: "user-1",
        name: "Explorer",
        status: "active",
        percentage: 22,
        evidence_strength: "Emerging",
        identity_id: "explorer",
        why_emerging: "Explorer's existing why_emerging.",
        growth_opportunities: ["Explorer's existing growth opportunity."],
        blind_spots: ["Explorer's existing blind spot."],
        likely_evolution: "Explorer's existing likely evolution.",
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

      expect(explainIdentitiesMock).toHaveBeenCalledWith([]);

      const updates = stub.calls.filter((c) => c.table === "future_selves" && c.method === "update");
      const payload = updates[0].args[0] as Record<string, unknown>;
      expect(payload.percentage).toBe(23);
      expect(payload.why_emerging).toBe("Explorer's existing why_emerging.");
      expect(payload.growth_opportunities).toEqual(["Explorer's existing growth opportunity."]);
    });

    it("Example 2: 22% -> 39%, several new behaviors consistently reinforce the identity — percentage updates, narrative still unchanged (Phase 6C: only a brand-new identity generates a narrative)", async () => {
      recognizeMock.mockReturnValueOnce([
        { ...MATCH, identityId: "explorer", canonicalName: "Explorer", likelihood: 39, evidenceStrength: "Moderate" },
      ]);
      getIdentityByIdMock.mockReturnValueOnce(EXPLORER_PROFILE);

      const existingRow = {
        id: "fs-explorer",
        user_id: "user-1",
        name: "Explorer",
        status: "active",
        percentage: 22,
        evidence_strength: "Emerging",
        identity_id: "explorer",
        why_emerging: "Explorer's existing why_emerging.",
        growth_opportunities: ["Explorer's existing growth opportunity."],
        blind_spots: ["Explorer's existing blind spot."],
        likely_evolution: "Explorer's existing likely evolution.",
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

      expect(explainIdentitiesMock).toHaveBeenCalledWith([]);

      const updates = stub.calls.filter((c) => c.table === "future_selves" && c.method === "update");
      const payload = updates[0].args[0] as Record<string, unknown>;
      expect(payload.percentage).toBe(39);
      expect(payload.evidence_strength).toBe("Moderate");
      expect(payload.why_emerging).toBe("Explorer's existing why_emerging.");
    });

    it("Example 3: Explorer disappears — fades using existing behavior, no AI call", async () => {
      // A different identity is recognized this run; Explorer isn't, so it fades.
      recognizeMock.mockReturnValueOnce([{ ...MATCH, identityId: "other", canonicalName: "Other" }]);
      getIdentityByIdMock.mockReturnValueOnce({ ...PROFILE, id: "other", canonical_name: "Other" });

      const explorerRow = {
        id: "fs-explorer",
        user_id: "user-1",
        name: "Explorer",
        status: "active",
        percentage: 39,
        evidence_strength: "Moderate",
        identity_id: "explorer",
        why_emerging: "Explorer's existing why_emerging.",
      };
      const newRow = {
        id: "fs-other",
        user_id: "user-1",
        name: "Other",
        status: "active",
        percentage: 60,
        identity_id: "other",
      };
      const stub = createSupabaseStub({
        behavior_observations: OBSERVATIONS_RESPONSE,
        future_selves: [
          { data: [explorerRow], error: null },
          { data: newRow, error: null },
          { error: null },
          { data: [newRow], error: null },
        ],
        future_self_events: [{ error: null }, { error: null }],
      });
      setActiveStub(stub);

      await generateFutureSelves();

      // Explorer was never a candidate for regeneration — it's not in this
      // run's recognized identities at all, so no AI call references it.
      expect(explainIdentitiesMock).toHaveBeenCalledWith([
        expect.objectContaining({ match: expect.objectContaining({ identityId: "other" }) }),
      ]);

      const updates = stub.calls.filter((c) => c.table === "future_selves" && c.method === "update");
      const fadePayload = updates[0].args[0] as Record<string, unknown>;
      expect(fadePayload.status).toBe("faded");
      expect(fadePayload.percentage).toBe(0);
      // Fade never touches the narrative fields — they aren't in the update payload.
      expect(fadePayload.why_emerging).toBeUndefined();
    });

    it("Example 4: Explorer returns months later — reactivates using its existing archetype narrative, no AI call (Phase 6C)", async () => {
      recognizeMock.mockReturnValueOnce([
        { ...MATCH, identityId: "explorer", canonicalName: "Explorer", likelihood: 35, evidenceStrength: "Moderate" },
      ]);
      getIdentityByIdMock.mockReturnValueOnce(EXPLORER_PROFILE);

      const fadedRow = {
        id: "fs-explorer",
        user_id: "user-1",
        name: "Explorer",
        status: "faded",
        percentage: 0,
        evidence_strength: "Moderate",
        identity_id: "explorer",
        why_emerging: "Explorer's pre-fade why_emerging.",
      };
      const stub = createSupabaseStub({
        behavior_observations: OBSERVATIONS_RESPONSE,
        future_selves: [
          { data: [fadedRow], error: null },
          { error: null },
          { data: [{ ...fadedRow, status: "active", percentage: 35 }], error: null },
        ],
        future_self_events: { error: null },
      });
      setActiveStub(stub);

      await generateFutureSelves();

      expect(explainIdentitiesMock).toHaveBeenCalledWith([]);

      const updates = stub.calls.filter((c) => c.table === "future_selves" && c.method === "update");
      const payload = updates[0].args[0] as Record<string, unknown>;
      expect(payload.status).toBe("active");
      expect(payload.why_emerging).toBe("Explorer's pre-fade why_emerging.");

      const events = stub.calls.filter((c) => c.table === "future_self_events" && c.method === "insert");
      expect(events.map((e) => (e.args[0] as Record<string, unknown>).event_type)).toContain("returned");
    });
  });

  describe("Phase 6D — Explorer verify (created, 22% -> 28% -> 41%)", () => {
    const EXPLORER_PROFILE = {
      ...PROFILE,
      id: "explorer",
      canonical_name: "Explorer",
    };

    it("Situation 1: Explorer created for the first time — AI generates the narrative", async () => {
      recognizeMock.mockReturnValueOnce([
        { ...MATCH, identityId: "explorer", canonicalName: "Explorer", likelihood: 22, evidenceStrength: "Emerging" },
      ]);
      getIdentityByIdMock.mockReturnValueOnce(EXPLORER_PROFILE);

      const createdRow = {
        id: "fs-explorer",
        user_id: "user-1",
        name: "Explorer",
        status: "active",
        percentage: 22,
        identity_id: "explorer",
      };
      const stub = createSupabaseStub({
        behavior_observations: OBSERVATIONS_RESPONSE,
        future_selves: [
          { data: [], error: null }, // no existing row — Explorer has never appeared
          { data: createdRow, error: null }, // INSERT.select().single()
          { data: [createdRow], error: null }, // listFutureSelves
        ],
        future_self_events: { error: null },
      });
      setActiveStub(stub);

      await generateFutureSelves();

      expect(explainIdentitiesMock).toHaveBeenCalledWith([
        expect.objectContaining({ match: expect.objectContaining({ identityId: "explorer" }) }),
      ]);

      const inserts = stub.calls.filter((c) => c.table === "future_selves" && c.method === "insert");
      expect(inserts).toHaveLength(1);
      const payload = inserts[0].args[0] as Record<string, unknown>;
      expect(payload.why_emerging).toBe(FALLBACK_EXPLANATION.why_emerging);

      const events = stub.calls.filter((c) => c.table === "future_self_events" && c.method === "insert");
      expect(events.map((e) => (e.args[0] as Record<string, unknown>).event_type)).toContain("emerged");
    });

    it("Situation 2: Explorer goes from 22% -> 28% — percentage updates, narrative unchanged, no AI call", async () => {
      recognizeMock.mockReturnValueOnce([
        { ...MATCH, identityId: "explorer", canonicalName: "Explorer", likelihood: 28, evidenceStrength: "Emerging" },
      ]);
      getIdentityByIdMock.mockReturnValueOnce(EXPLORER_PROFILE);

      const existingRow = {
        id: "fs-explorer",
        user_id: "user-1",
        name: "Explorer",
        status: "active",
        percentage: 22,
        evidence_strength: "Emerging",
        identity_id: "explorer",
        why_emerging: "Explorer's archetype narrative.",
        growth_opportunities: ["Explorer's archetype growth opportunity."],
        blind_spots: ["Explorer's archetype blind spot."],
        likely_evolution: "Explorer's archetype likely evolution.",
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

      expect(explainIdentitiesMock).toHaveBeenCalledWith([]);

      const updates = stub.calls.filter((c) => c.table === "future_selves" && c.method === "update");
      const payload = updates[0].args[0] as Record<string, unknown>;
      expect(payload.percentage).toBe(28);
      expect(payload.why_emerging).toBe("Explorer's archetype narrative.");
      expect(payload.growth_opportunities).toEqual(["Explorer's archetype growth opportunity."]);
    });

    it("Situation 3: Explorer goes from 28% -> 41% (an evidence-strength tier crossing) — percentage updates, narrative unchanged, no AI call", async () => {
      recognizeMock.mockReturnValueOnce([
        { ...MATCH, identityId: "explorer", canonicalName: "Explorer", likelihood: 41, evidenceStrength: "Moderate" },
      ]);
      getIdentityByIdMock.mockReturnValueOnce(EXPLORER_PROFILE);

      const existingRow = {
        id: "fs-explorer",
        user_id: "user-1",
        name: "Explorer",
        status: "active",
        percentage: 28,
        evidence_strength: "Emerging",
        identity_id: "explorer",
        why_emerging: "Explorer's archetype narrative.",
        growth_opportunities: ["Explorer's archetype growth opportunity."],
        blind_spots: ["Explorer's archetype blind spot."],
        likely_evolution: "Explorer's archetype likely evolution.",
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

      // Even though evidence_strength moved Emerging -> Moderate, the AI is
      // never invoked once the identity already has a row.
      expect(explainIdentitiesMock).toHaveBeenCalledWith([]);

      const updates = stub.calls.filter((c) => c.table === "future_selves" && c.method === "update");
      const payload = updates[0].args[0] as Record<string, unknown>;
      expect(payload.percentage).toBe(41);
      expect(payload.evidence_strength).toBe("Moderate");
      expect(payload.why_emerging).toBe("Explorer's archetype narrative.");
    });
  });

  describe("Phase 6E — Adaptive Explorer verify (appears, 22% -> 28% -> 46%, fades, returns)", () => {
    const ADAPTIVE_EXPLORER_PROFILE = {
      ...PROFILE,
      id: "adaptive-explorer",
      canonical_name: "Adaptive Explorer",
    };

    it("Situation 1: Adaptive Explorer appears for the first time — AI generates the narrative once", async () => {
      recognizeMock.mockReturnValueOnce([
        {
          ...MATCH,
          identityId: "adaptive-explorer",
          canonicalName: "Adaptive Explorer",
          likelihood: 22,
          evidenceStrength: "Emerging",
        },
      ]);
      getIdentityByIdMock.mockReturnValueOnce(ADAPTIVE_EXPLORER_PROFILE);

      const createdRow = {
        id: "fs-adaptive-explorer",
        user_id: "user-1",
        name: "Adaptive Explorer",
        status: "active",
        percentage: 22,
        identity_id: "adaptive-explorer",
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

      await generateFutureSelves();

      expect(explainIdentitiesMock).toHaveBeenCalledWith([
        expect.objectContaining({ match: expect.objectContaining({ identityId: "adaptive-explorer" }) }),
      ]);
      const inserts = stub.calls.filter((c) => c.table === "future_selves" && c.method === "insert");
      expect((inserts[0].args[0] as Record<string, unknown>).why_emerging).toBe(
        FALLBACK_EXPLANATION.why_emerging,
      );
    });

    it("Situation 2: 22% -> 28% — only dynamic fields update, no AI call", async () => {
      recognizeMock.mockReturnValueOnce([
        {
          ...MATCH,
          identityId: "adaptive-explorer",
          canonicalName: "Adaptive Explorer",
          likelihood: 28,
          evidenceStrength: "Emerging",
        },
      ]);
      getIdentityByIdMock.mockReturnValueOnce(ADAPTIVE_EXPLORER_PROFILE);

      const existingRow = {
        id: "fs-adaptive-explorer",
        user_id: "user-1",
        name: "Adaptive Explorer",
        status: "active",
        percentage: 22,
        evidence_strength: "Emerging",
        identity_id: "adaptive-explorer",
        why_emerging: "Adaptive Explorer's archetype narrative.",
        growth_opportunities: ["Adaptive Explorer's archetype growth opportunity."],
        blind_spots: ["Adaptive Explorer's archetype blind spot."],
        likely_evolution: "Adaptive Explorer's archetype likely evolution.",
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

      expect(explainIdentitiesMock).toHaveBeenCalledWith([]);
      const updates = stub.calls.filter((c) => c.table === "future_selves" && c.method === "update");
      const payload = updates[0].args[0] as Record<string, unknown>;
      expect(payload.percentage).toBe(28);
      expect(payload.why_emerging).toBe("Adaptive Explorer's archetype narrative.");
    });

    it("Situation 3: 28% -> 46% (Emerging -> Moderate) — only dynamic fields update, no AI call", async () => {
      recognizeMock.mockReturnValueOnce([
        {
          ...MATCH,
          identityId: "adaptive-explorer",
          canonicalName: "Adaptive Explorer",
          likelihood: 46,
          evidenceStrength: "Moderate",
        },
      ]);
      getIdentityByIdMock.mockReturnValueOnce(ADAPTIVE_EXPLORER_PROFILE);

      const existingRow = {
        id: "fs-adaptive-explorer",
        user_id: "user-1",
        name: "Adaptive Explorer",
        status: "active",
        percentage: 28,
        evidence_strength: "Emerging",
        identity_id: "adaptive-explorer",
        why_emerging: "Adaptive Explorer's archetype narrative.",
        growth_opportunities: ["Adaptive Explorer's archetype growth opportunity."],
        blind_spots: ["Adaptive Explorer's archetype blind spot."],
        likely_evolution: "Adaptive Explorer's archetype likely evolution.",
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

      expect(explainIdentitiesMock).toHaveBeenCalledWith([]);
      const updates = stub.calls.filter((c) => c.table === "future_selves" && c.method === "update");
      const payload = updates[0].args[0] as Record<string, unknown>;
      expect(payload.percentage).toBe(46);
      expect(payload.evidence_strength).toBe("Moderate");
      expect(payload.why_emerging).toBe("Adaptive Explorer's archetype narrative.");
    });

    it("Situation 4: Adaptive Explorer fades — percentage/status/evidence change, narrative unchanged (never written to the fade payload)", async () => {
      recognizeMock.mockReturnValueOnce([
        { ...MATCH, identityId: "other", canonicalName: "Other" },
      ]);
      getIdentityByIdMock.mockReturnValueOnce({ ...PROFILE, id: "other", canonical_name: "Other" });

      const explorerRow = {
        id: "fs-adaptive-explorer",
        user_id: "user-1",
        name: "Adaptive Explorer",
        status: "active",
        percentage: 46,
        evidence_strength: "Moderate",
        identity_id: "adaptive-explorer",
        why_emerging: "Adaptive Explorer's archetype narrative.",
      };
      const newRow = {
        id: "fs-other",
        user_id: "user-1",
        name: "Other",
        status: "active",
        percentage: 60,
        identity_id: "other",
      };
      const stub = createSupabaseStub({
        behavior_observations: OBSERVATIONS_RESPONSE,
        future_selves: [
          { data: [explorerRow], error: null },
          { data: newRow, error: null },
          { error: null },
          { data: [newRow], error: null },
        ],
        future_self_events: [{ error: null }, { error: null }],
      });
      setActiveStub(stub);

      await generateFutureSelves();

      expect(explainIdentitiesMock).toHaveBeenCalledWith([
        expect.objectContaining({ match: expect.objectContaining({ identityId: "other" }) }),
      ]);
      const updates = stub.calls.filter((c) => c.table === "future_selves" && c.method === "update");
      const fadePayload = updates[0].args[0] as Record<string, unknown>;
      expect(fadePayload.status).toBe("faded");
      expect(fadePayload.percentage).toBe(0);
      expect(fadePayload.why_emerging).toBeUndefined();
    });

    it("Situation 5: Adaptive Explorer returns — reuses the existing narrative, no AI call", async () => {
      recognizeMock.mockReturnValueOnce([
        {
          ...MATCH,
          identityId: "adaptive-explorer",
          canonicalName: "Adaptive Explorer",
          likelihood: 30,
          evidenceStrength: "Moderate",
        },
      ]);
      getIdentityByIdMock.mockReturnValueOnce(ADAPTIVE_EXPLORER_PROFILE);

      const fadedRow = {
        id: "fs-adaptive-explorer",
        user_id: "user-1",
        name: "Adaptive Explorer",
        status: "faded",
        percentage: 0,
        evidence_strength: "Moderate",
        identity_id: "adaptive-explorer",
        why_emerging: "Adaptive Explorer's archetype narrative.",
        growth_opportunities: ["Adaptive Explorer's archetype growth opportunity."],
        blind_spots: ["Adaptive Explorer's archetype blind spot."],
        likely_evolution: "Adaptive Explorer's archetype likely evolution.",
      };
      const stub = createSupabaseStub({
        behavior_observations: OBSERVATIONS_RESPONSE,
        future_selves: [
          { data: [fadedRow], error: null },
          { error: null },
          { data: [{ ...fadedRow, status: "active", percentage: 30 }], error: null },
        ],
        future_self_events: { error: null },
      });
      setActiveStub(stub);

      await generateFutureSelves();

      expect(explainIdentitiesMock).toHaveBeenCalledWith([]);
      const updates = stub.calls.filter((c) => c.table === "future_selves" && c.method === "update");
      const payload = updates[0].args[0] as Record<string, unknown>;
      expect(payload.status).toBe("active");
      expect(payload.why_emerging).toBe("Adaptive Explorer's archetype narrative.");

      const events = stub.calls.filter((c) => c.table === "future_self_events" && c.method === "insert");
      expect(events.map((e) => (e.args[0] as Record<string, unknown>).event_type)).toContain("returned");
    });
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
// queueFutureSelvesGeneration
// ---------------------------------------------------------------------------

describe("queueFutureSelvesGeneration", () => {
  beforeEach(() => {
    recognizeMock.mockReset();
    recognizeMock.mockReturnValue([MATCH]);
    getIdentityByIdMock.mockReset();
    getIdentityByIdMock.mockReturnValue(PROFILE);
    extractAndPersistMock.mockReset();
    explainIdentitiesMock.mockReset();
  });

  it("serializes calls for the same user — the second does not start until the first resolves", async () => {
    const callOrder: string[] = [];
    let releaseFirst: () => void = () => {};
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });

    explainIdentitiesMock.mockImplementation(
      async (entries: Array<{ match: { identityId: string } }>) => {
        const callNumber = explainIdentitiesMock.mock.calls.length;
        callOrder.push(`start-${callNumber}`);
        if (callNumber === 1) {
          await firstGate;
        }
        callOrder.push(`end-${callNumber}`);
        return entries.map(({ match }) => ({
          identityId: match.identityId,
          explanation: FALLBACK_EXPLANATION,
        }));
      },
    );

    const stub = createSupabaseStub({
      behavior_observations: OBSERVATIONS_RESPONSE,
      future_selves: { data: [], error: null },
      future_self_events: { error: null },
    });
    setActiveStub(stub);

    const firstPromise = queueFutureSelvesGeneration();
    await new Promise((r) => setTimeout(r, 0));
    const secondPromise = queueFutureSelvesGeneration();
    await new Promise((r) => setTimeout(r, 0));

    // The second call must be queued behind the first — it should not have
    // reached explainIdentities yet, since the first hasn't resolved.
    expect(explainIdentitiesMock).toHaveBeenCalledTimes(1);

    releaseFirst();
    await firstPromise;
    await secondPromise;

    expect(explainIdentitiesMock).toHaveBeenCalledTimes(2);
    expect(callOrder).toEqual(["start-1", "end-1", "start-2", "end-2"]);
  });

  it("does not serialize calls for different users against each other", async () => {
    explainIdentitiesMock.mockImplementation(
      async (entries: Array<{ match: { identityId: string } }>) =>
        entries.map(({ match }) => ({
          identityId: match.identityId,
          explanation: FALLBACK_EXPLANATION,
        })),
    );

    const calls: TrackedCall[] = [];
    let getUserCallCount = 0;

    function makeBuilder(table: string) {
      const builder: Record<string, (...args: unknown[]) => unknown> = {};
      const chainable = ["select", "eq", "order", "limit", "in", "neq", "not"] as const;
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
      const response =
        table === "behavior_observations" ? OBSERVATIONS_RESPONSE : { data: [], error: null };
      builder.single = () => Promise.resolve(response);
      builder.maybeSingle = () => Promise.resolve(response);
      builder.then = (resolve: (v: unknown) => unknown, reject?: (r: unknown) => unknown) =>
        Promise.resolve(response).then(resolve, reject);
      return builder;
    }

    const client = {
      from: (table: string) => makeBuilder(table),
      auth: {
        getUser: async () => {
          getUserCallCount += 1;
          const id = getUserCallCount === 1 ? "user-A" : "user-B";
          return { data: { user: { id } }, error: null };
        },
      },
    };
    setActiveStub({ client, calls });

    // Gate user-A's explainIdentities call so it never resolves on its own —
    // if user-B's call were (incorrectly) queued behind user-A's, it would
    // never complete either, and this test would time out.
    let releaseA: () => void = () => {};
    const gateA = new Promise<void>((resolve) => {
      releaseA = resolve;
    });
    let sawB = false;
    explainIdentitiesMock.mockImplementation(
      async (entries: Array<{ match: { identityId: string } }>) => {
        if (explainIdentitiesMock.mock.calls.length === 1) {
          await gateA;
        } else {
          sawB = true;
        }
        return entries.map(({ match }) => ({
          identityId: match.identityId,
          explanation: FALLBACK_EXPLANATION,
        }));
      },
    );

    const userAPromise = queueFutureSelvesGeneration();
    await Promise.resolve();
    await Promise.resolve();
    const userBPromise = await queueFutureSelvesGeneration();

    expect("error" in userBPromise).toBe(false);
    expect(sawB).toBe(true);

    releaseA();
    await userAPromise;
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
