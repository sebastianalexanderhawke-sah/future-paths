import { describe, expect, it, vi } from "vitest";

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

vi.mock("@/lib/current-self", () => ({
  requestCurrentSelfRegeneration: vi.fn(),
}));

const { generateFutureSelves } = await import("@/lib/future-selves");

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

    builder.insert = (...args: unknown[]) => {
      calls.push({ table, method: "insert", args });
      return builder;
    };
    builder.update = (...args: unknown[]) => {
      calls.push({ table, method: "update", args });
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

describe("generateFutureSelves", () => {
  it("preserves existing active futures and reports failure when the model returns no drafts", async () => {
    runStructuredGenerationMock.mockResolvedValueOnce({ ok: true, data: [] });

    const stub = createSupabaseStub({
      moments: { count: 5, data: null, error: null },
      paths: { data: [], error: null },
      check_ins: { data: [], error: null },
      identity_updates: { data: [], error: null },
      future_selves: {
        data: [
          {
            id: "f1",
            user_id: "user-1",
            name: "Builds a stable, self-sufficient life",
            status: "active",
            percentage: 30,
          },
        ],
        error: null,
      },
    });
    setActiveStub(stub);

    const result = await generateFutureSelves();

    expect("error" in result).toBe(true);

    // The early return must happen before existingRows is even fetched, so
    // future_selves is never touched at all — definitely never updated/faded.
    const futureSelvesCalls = stub.calls.filter((call) => call.table === "future_selves");
    expect(futureSelvesCalls).toHaveLength(0);
  });

  it("does not fail when a brand-new user with no moments legitimately has zero drafts", async () => {
    runStructuredGenerationMock.mockClear();

    const stub = createSupabaseStub({
      moments: { count: 0, data: null, error: null },
      future_selves: { data: [], error: null },
    });
    setActiveStub(stub);

    const result = await generateFutureSelves();

    expect("error" in result).toBe(false);
    expect(runStructuredGenerationMock).not.toHaveBeenCalled();
  });

  it("carries baseline percentage forward when the model renames a trajectory", async () => {
    runStructuredGenerationMock.mockClear();

    const existingRows = [
      {
        id: "old-1",
        name: "Acts on instinct, moves on quickly",
        themes: ["Courage", "Independence"],
        summary:
          "Courage and Independence remain the two most dominant themes across path choices, check-ins, and identity updates — with repeated signals of declining misaligned opportunities, walking away from unresolved situations, and trusting internal reads over external validation.",
        percentage: 39,
        evidence_strength: "Strong",
        status: "active",
        updated_at: "2026-06-01T00:00:00.000Z",
      },
      {
        id: "old-2",
        name: "Builds a stable, self-sufficient life",
        themes: ["Stability", "Independence"],
        summary:
          "Stability has appeared consistently across path themes and identity updates, with check-ins repeatedly showing a preference for anchoring decisions to confirmed realities rather than open possibilities.",
        percentage: 29,
        evidence_strength: "Strong",
        status: "active",
        updated_at: "2026-06-01T00:00:00.000Z",
      },
      {
        id: "old-3",
        name: "Invests heavily in relationships and belonging",
        themes: ["Connection", "Belonging"],
        summary:
          "Connection and Belonging have grown in frequency across recent path themes, and check-ins show a recurring pull toward social engagement even when independence was the stated preference.",
        percentage: 21,
        evidence_strength: "Moderate",
        status: "active",
        updated_at: "2026-06-01T00:00:00.000Z",
      },
      {
        id: "old-4",
        name: "Stays curious, keeps options open",
        themes: ["Curiosity", "Reflection"],
        summary:
          "Curiosity appears consistently across path themes and identity updates, and check-ins show a pattern of questioning assumptions and declining things that don't feel aligned.",
        percentage: 11,
        evidence_strength: "Emerging",
        status: "active",
        updated_at: "2026-06-01T00:00:00.000Z",
      },
    ];

    runStructuredGenerationMock.mockResolvedValueOnce({
      ok: true,
      data: [
        {
          name: "Disciplined Solo Builder",
          summary:
            "Across multiple check-ins, a pattern of working independently on business tasks, managing competing demands, and choosing output even on difficult days suggests a trajectory toward someone who builds things largely on their own.",
          movement_direction: "positive",
          evidence_strength: "Moderate",
          benefits: ["Builds a track record of consistent output."],
          consequences: ["Burnout risk rises if rest stays secondary."],
          prediction: "Builds something real through sustained effort.",
          themes: ["Stability", "Growth", "Independence"],
          why_changed: "Sustained solo output across check-ins.",
        },
        {
          name: "Quietly Cutting Ties",
          summary:
            "After a painful breach of trust, nearly a year passed before a quiet decision to move on completely — no confrontation, no resolution, just a private choice to stop.",
          movement_direction: "unchanged",
          evidence_strength: "Emerging",
          benefits: ["Protects against repeated harm."],
          consequences: ["Relationships that could be repaired may close."],
          prediction: "Known for being loyal until a line is crossed.",
          themes: ["Independence", "Stability"],
          why_changed: "",
        },
        {
          name: "Selectively Reconnecting",
          summary:
            "Despite a strong pull toward independence and solitude, repeated moments of choosing connection suggest relationships are being let back in, carefully and on your own terms.",
          movement_direction: "unchanged",
          evidence_strength: "Emerging",
          benefits: ["Reduces isolation from a self-directed life."],
          consequences: ["Relationships may feel transactional."],
          prediction: "A tight, carefully maintained circle.",
          themes: ["Connection", "Courage", "Independence"],
          why_changed: "",
        },
        {
          name: "Relocating and Building Independently",
          summary:
            "Researching cities, weighing a job offer, and repeatedly choosing action over deliberation points toward a trajectory of building a life somewhere new on self-directed terms.",
          movement_direction: "positive",
          evidence_strength: "Moderate",
          benefits: ["Creates a clean break from limiting environments."],
          consequences: ["Existing relationships may weaken with distance."],
          prediction: "Built an adult life from scratch, deliberately.",
          themes: ["Independence", "Courage", "Growth"],
          why_changed: "Actively researching cities and a real job offer.",
        },
      ],
    });

    const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const stub = createSupabaseStub({
      moments: { count: 10, data: null, error: null },
      paths: { data: [], error: null },
      check_ins: { data: [], error: null },
      identity_updates: {
        data: [
          // Shared by all four drafts (every theme set includes Independence) —
          // on its own this would tie every draft, which is the point: trajectory
          // strength must keep summing the *other* evidence below to break the tie.
          { update_type: "reality_shift", themes: ["Independence"], created_at: daysAgo(3) },
          // Connection: only "Selectively Reconnecting".
          { update_type: "reality_shift", themes: ["Connection"], created_at: daysAgo(1) },
          // Growth: "Disciplined Solo Builder" and "Relocating and Building Independently".
          { update_type: "pattern_strengthened", themes: ["Growth"], created_at: daysAgo(1) },
          // Courage: "Relocating and Building Independently" and "Selectively Reconnecting".
          { update_type: "theme_emerging", themes: ["Courage"], created_at: daysAgo(1) },
        ],
        error: null,
      },
      future_selves: { data: existingRows, error: null },
    });
    setActiveStub(stub);

    await generateFutureSelves();

    // Reconstruct each update/insert call's (name lookup via id, percentage,
    // previous_percentage) from the stub's tracked calls.
    const byOldId = new Map(existingRows.map((row) => [row.id, row]));
    const draftNameById = new Map([
      ["old-1", "Acts on instinct, moves on quickly"],
      ["old-2", "Builds a stable, self-sufficient life"],
      ["old-3", "Invests heavily in relationships and belonging"],
      ["old-4", "Stays curious, keeps options open"],
    ]);

    const writes: { oldId: string; payload: Record<string, unknown> }[] = [];
    let pendingPayload: Record<string, unknown> | null = null;
    for (const call of stub.calls) {
      if (call.table !== "future_selves") continue;
      if (call.method === "update") {
        pendingPayload = call.args[0] as Record<string, unknown>;
      } else if (call.method === "eq" && call.args[0] === "id" && pendingPayload) {
        writes.push({ oldId: call.args[1] as string, payload: pendingPayload });
        pendingPayload = null;
      }
    }

    console.log("=== Continuity matcher result (old -> new) ===");
    for (const write of writes) {
      const old = byOldId.get(write.oldId);
      console.log({
        oldName: draftNameById.get(write.oldId),
        newName: write.payload.summary === old?.summary ? "(unchanged)" : undefined,
        baseline: old?.percentage,
        previous_percentage: write.payload.previous_percentage,
        finalPercentage: write.payload.percentage,
      });
    }

    // "Builds a stable..." (29) should be claimed by "Disciplined Solo Builder"
    // over "Quietly Cutting Ties" (same theme overlap, lower summary similarity).
    // previous_percentage still forwards the old baseline for trend tracking —
    // trajectory strength no longer derives the new percentage *from* that
    // baseline, so it isn't expected to exceed (or relate at all to) it.
    const builderMatch = writes.find((w) => w.oldId === "old-2");
    expect(builderMatch).toBeDefined();
    expect(builderMatch?.payload.previous_percentage).toBe(29);

    // "Acts on instinct..." (39) should be claimed by "Selectively Reconnecting"
    // over "Relocating and Building Independently" (higher summary similarity —
    // continuity matching is unchanged by this scoring rework).
    const actsMatch = writes.find((w) => w.oldId === "old-1");
    expect(actsMatch).toBeDefined();
    expect(actsMatch?.payload.previous_percentage).toBe(39);

    // The two old futures nothing claimed should be faded, not updated-as-matched.
    const fadeCalls = writes.filter(
      (w) => (w.oldId === "old-3" || w.oldId === "old-4") && w.payload.status === "faded",
    );
    expect(fadeCalls).toHaveLength(2);

    // Regression guard for the 25/25/25/25 equilibrium bug: with differentiated
    // evidence across the four drafts (one theme shared by all, others unique
    // to a subset), trajectory strength must produce distinct percentages
    // rather than collapsing every active future to the same share.
    const updatedPercentages = writes
      .filter((w) => w.payload.status !== "faded")
      .map((w) => w.payload.percentage as number);
    const insertCalls = stub.calls.filter(
      (c) => c.table === "future_selves" && c.method === "insert",
    );
    const insertedPercentages = insertCalls.map(
      (c) => (c.args[0] as Record<string, unknown>).percentage as number,
    );
    const allPercentages = [...updatedPercentages, ...insertedPercentages];
    expect(allPercentages).toHaveLength(4);
    expect(new Set(allPercentages).size).toBe(allPercentages.length);

    // "Selectively Reconnecting" picked up the most matching evidence (shared
    // Independence signal + its own unique Connection and Courage signals), so
    // it should outscore "Quietly Cutting Ties" (only the shared Independence
    // signal). Look up by themes, since continuity-matched updates don't carry
    // the draft's name and either draft could land as an insert or an update.
    const percentageByThemes = new Map<string, number>([
      ...writes.map((w) => [JSON.stringify(w.payload.themes), w.payload.percentage as number] as const),
      ...insertCalls.map((c) => {
        const payload = c.args[0] as Record<string, unknown>;
        return [JSON.stringify(payload.themes), payload.percentage as number] as const;
      }),
    ]);
    const selectivelyReconnectingPercentage = percentageByThemes.get(
      JSON.stringify(["Connection", "Courage", "Independence"]),
    );
    const quietlyCuttingTiesPercentage = percentageByThemes.get(
      JSON.stringify(["Independence", "Stability"]),
    );
    expect(selectivelyReconnectingPercentage).toBeGreaterThan(quietlyCuttingTiesPercentage!);
  });
});
