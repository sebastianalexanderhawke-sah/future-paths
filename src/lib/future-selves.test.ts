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

const { generateFutureSelves, loadFutureSelfImpactByPath } = await import("@/lib/future-selves");

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
      moments: {
        data: [{ opportunity_themes: [], risk_themes: [], created_at: "2020-01-01T00:00:00.000Z" }],
        error: null,
      },
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
      moments: { data: [], error: null },
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
          core_behaviors: [],
          behavioral_evidence: [],
          growth_opportunities: ["Builds a track record of consistent output."],
          blind_spots: ["Burnout risk rises if rest stays secondary."],
          likely_evolution: "Builds something real through sustained effort.",
          themes: ["Stability", "Growth", "Independence"],
          why_emerging: "Sustained solo output across check-ins.",
        },
        {
          name: "Quietly Cutting Ties",
          summary:
            "After a painful breach of trust, nearly a year passed before a quiet decision to move on completely — no confrontation, no resolution, just a private choice to stop.",
          movement_direction: "unchanged",
          evidence_strength: "Emerging",
          core_behaviors: [],
          behavioral_evidence: [],
          growth_opportunities: ["Protects against repeated harm."],
          blind_spots: ["Relationships that could be repaired may close."],
          likely_evolution: "Known for being loyal until a line is crossed.",
          themes: ["Independence", "Stability"],
          why_emerging: "",
        },
        {
          name: "Selectively Reconnecting",
          summary:
            "Despite a strong pull toward independence and solitude, repeated moments of choosing connection suggest relationships are being let back in, carefully and on your own terms.",
          movement_direction: "unchanged",
          evidence_strength: "Emerging",
          core_behaviors: [],
          behavioral_evidence: [],
          growth_opportunities: ["Reduces isolation from a self-directed life."],
          blind_spots: ["Relationships may feel transactional."],
          likely_evolution: "A tight, carefully maintained circle.",
          themes: ["Connection", "Courage", "Independence"],
          why_emerging: "",
        },
        {
          name: "Relocating and Building Independently",
          summary:
            "Researching cities, weighing a job offer, and repeatedly choosing action over deliberation points toward a trajectory of building a life somewhere new on self-directed terms.",
          movement_direction: "positive",
          evidence_strength: "Moderate",
          core_behaviors: [],
          behavioral_evidence: [],
          growth_opportunities: ["Creates a clean break from limiting environments."],
          blind_spots: ["Existing relationships may weaken with distance."],
          likely_evolution: "Built an adult life from scratch, deliberately.",
          themes: ["Independence", "Courage", "Growth"],
          why_emerging: "Actively researching cities and a real job offer.",
        },
      ],
    });

    const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const stub = createSupabaseStub({
      moments: {
        data: [{ opportunity_themes: [], risk_themes: [], created_at: "2020-01-01T00:00:00.000Z" }],
        error: null,
      },
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

  it("drops near-duplicate trajectories within the same generation batch, keeping the stronger one", async () => {
    runStructuredGenerationMock.mockClear();

    const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    // "Builds a stable, self-reliant life" and "Builds a steady, self-reliant
    // life" overlap heavily on both theme set (Stability+Independence shared,
    // Growth unique to the first) and wording — a near-duplicate pair. The
    // unrelated "Invests in close relationships" future shares neither themes
    // nor wording with either and must survive untouched.
    runStructuredGenerationMock.mockResolvedValueOnce({
      ok: true,
      data: [
        {
          name: "Builds a stable, self-reliant life",
          summary: "Repeated choices toward independence and steady growth point toward self-reliance.",
          movement_direction: "positive",
          evidence_strength: "Moderate",
          core_behaviors: [],
          behavioral_evidence: [],
          growth_opportunities: ["Builds a track record of consistent output."],
          blind_spots: ["Burnout risk rises if rest stays secondary."],
          likely_evolution: "Builds a life on their own terms.",
          themes: ["Stability", "Independence", "Growth"],
          why_emerging: "Sustained independent output.",
        },
        {
          name: "Builds a steady, self-reliant life",
          summary: "A consistent preference for independence and stability over external validation.",
          movement_direction: "positive",
          evidence_strength: "Moderate",
          core_behaviors: [],
          behavioral_evidence: [],
          growth_opportunities: ["Reduces reliance on unstable circumstances."],
          blind_spots: ["May close off help that could've sped things up."],
          likely_evolution: "Known for being steady and self-sufficient.",
          themes: ["Stability", "Independence"],
          why_emerging: "Sustained independent output.",
        },
        {
          name: "Invests in close relationships",
          summary: "Repeated choices to prioritize a small circle of people over solitary pursuits.",
          movement_direction: "positive",
          evidence_strength: "Emerging",
          core_behaviors: [],
          behavioral_evidence: [],
          growth_opportunities: ["Builds a reliable support network."],
          blind_spots: ["Less time for solo pursuits."],
          likely_evolution: "Known for being there for the people closest to them.",
          themes: ["Connection", "Belonging"],
          why_emerging: "Repeated check-ins prioritizing close relationships.",
        },
      ],
    });

    const stub = createSupabaseStub({
      moments: {
        data: [{ opportunity_themes: [], risk_themes: [], created_at: "2020-01-01T00:00:00.000Z" }],
        error: null,
      },
      paths: { data: [], error: null },
      check_ins: { data: [], error: null },
      identity_updates: {
        // Only the first draft's theme set includes Growth, so only it gets
        // this contribution — that's what breaks the tie between the two
        // near-duplicate drafts.
        data: [{ update_type: "reality_shift", themes: ["Growth"], created_at: daysAgo(1) }],
        error: null,
      },
      future_selves: { data: [], error: null },
    });
    setActiveStub(stub);

    const result = await generateFutureSelves();
    expect("error" in result).toBe(false);

    const insertCalls = stub.calls.filter(
      (c) => c.table === "future_selves" && c.method === "insert",
    );
    const insertedNames = insertCalls.map((c) => (c.args[0] as Record<string, unknown>).name);

    // Only 2 futures should be created, not 3 — the duplicate was dropped,
    // not just left alongside its twin.
    expect(insertedNames).toHaveLength(2);
    expect(insertedNames).toContain("Builds a stable, self-reliant life");
    expect(insertedNames).not.toContain("Builds a steady, self-reliant life");
    expect(insertedNames).toContain("Invests in close relationships");
  });

  it("makes the most recently chosen path produce visible percentage movement", async () => {
    const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const secondsAgo = (seconds: number) => new Date(Date.now() - seconds * 1000).toISOString();

    const drafts = [
      {
        name: "Builds Toward Stability",
        summary: "A consistent pull toward steady, predictable circumstances.",
        movement_direction: "positive",
        evidence_strength: "Moderate",
        core_behaviors: [],
        behavioral_evidence: [],
        growth_opportunities: ["Builds a dependable foundation."],
        blind_spots: ["May avoid worthwhile risks."],
        likely_evolution: "Builds a life that rarely surprises them.",
        themes: ["Stability"],
        why_emerging: "",
      },
      {
        name: "Stays Socially Connected",
        summary: "A consistent pull toward spending time with other people.",
        movement_direction: "positive",
        evidence_strength: "Moderate",
        core_behaviors: [],
        behavioral_evidence: [],
        growth_opportunities: ["Builds a support network."],
        blind_spots: ["Less solo time."],
        likely_evolution: "Known for always making time for people.",
        themes: ["Connection"],
        why_emerging: "",
      },
    ];

    // Identical, symmetric baseline evidence for both drafts (5 reality_shift
    // updates each, 10 days old -> 0.75 decay -> 30 raw strength each) so the
    // only difference between the two runs below is the chosen path.
    const baselineIdentityUpdates = [
      ...Array.from({ length: 5 }, () => ({
        themes: ["Stability"],
        update_type: "reality_shift",
        created_at: daysAgo(10),
      })),
      ...Array.from({ length: 5 }, () => ({
        themes: ["Connection"],
        update_type: "reality_shift",
        created_at: daysAgo(10),
      })),
    ];

    async function runWith(
      chosenPaths: { themes: string[]; chosen_at: string; created_at: string }[],
    ) {
      runStructuredGenerationMock.mockResolvedValueOnce({ ok: true, data: drafts });

      const stub = createSupabaseStub({
        moments: {
        data: [{ opportunity_themes: [], risk_themes: [], created_at: "2020-01-01T00:00:00.000Z" }],
        error: null,
      },
        paths: { data: chosenPaths, error: null },
        check_ins: { data: [], error: null },
        identity_updates: { data: baselineIdentityUpdates, error: null },
        future_selves: { data: [], error: null },
      });
      setActiveStub(stub);

      await generateFutureSelves();

      const insertCalls = stub.calls.filter(
        (c) => c.table === "future_selves" && c.method === "insert",
      );
      const percentageByName = new Map(
        insertCalls.map((c) => {
          const payload = c.args[0] as Record<string, unknown>;
          return [payload.name as string, payload.percentage as number];
        }),
      );
      return percentageByName;
    }

    const without = await runWith([]);
    const with_ = await runWith([
      { themes: ["Stability"], chosen_at: secondsAgo(1), created_at: secondsAgo(1) },
    ]);

    // With no chosen path, the two symmetric futures score identically.
    expect(without.get("Builds Toward Stability")).toBe(74);
    expect(without.get("Stays Socially Connected")).toBe(74);

    // A single freshly chosen path matching only "Builds Toward Stability"
    // must produce visible movement on the very next generation — not get
    // lost against the rest of the evidence.
    expect(with_.get("Builds Toward Stability")).toBe(75);
    expect(with_.get("Stays Socially Connected")).toBe(74);
    expect(with_.get("Builds Toward Stability")!).toBeGreaterThan(
      without.get("Builds Toward Stability")!,
    );
  });

  it("accepts an archetype identity name without rewriting it", async () => {
    runStructuredGenerationMock.mockClear();

    runStructuredGenerationMock.mockResolvedValueOnce({
      ok: true,
      data: [
        {
          name: "Disciplined Solo Builder",
          summary: "Repeated independent output across check-ins.",
          movement_direction: "positive",
          evidence_strength: "Moderate",
          core_behaviors: [],
          behavioral_evidence: [],
          growth_opportunities: ["Builds a track record of consistent output."],
          blind_spots: ["Burnout risk rises if rest stays secondary."],
          likely_evolution: "Builds something real through sustained effort.",
          themes: ["Stability"],
          why_emerging: "",
        },
      ],
    });

    const stub = createSupabaseStub({
      moments: {
        data: [{ opportunity_themes: [], risk_themes: [], created_at: "2020-01-01T00:00:00.000Z" }],
        error: null,
      },
      paths: { data: [], error: null },
      check_ins: { data: [], error: null },
      identity_updates: { data: [], error: null },
      future_selves: { data: [], error: null },
    });
    setActiveStub(stub);

    await generateFutureSelves();

    const insertCalls = stub.calls.filter(
      (c) => c.table === "future_selves" && c.method === "insert",
    );
    expect(insertCalls).toHaveLength(1);
    const insertedName = (insertCalls[0].args[0] as Record<string, unknown>).name;

    // "Disciplined Solo Builder" is a valid archetype name (3 words ≤ 8) —
    // it must be stored verbatim, not rewritten.
    expect(insertedName).toBe("Disciplined Solo Builder");
  });

  it("accepts an 'Adjective Noun' archetype identity name without rewriting it", async () => {
    runStructuredGenerationMock.mockClear();

    runStructuredGenerationMock.mockResolvedValueOnce({
      ok: true,
      data: [
        {
          name: "Intentional Connector",
          summary: "Repeated choices to prioritize close relationships.",
          movement_direction: "positive",
          evidence_strength: "Emerging",
          core_behaviors: [],
          behavioral_evidence: [],
          growth_opportunities: ["Builds a reliable support network."],
          blind_spots: ["Less time for solo pursuits."],
          likely_evolution: "Known for being there for the people closest to them.",
          themes: ["Connection"],
          why_emerging: "",
        },
      ],
    });

    const stub = createSupabaseStub({
      moments: {
        data: [{ opportunity_themes: [], risk_themes: [], created_at: "2020-01-01T00:00:00.000Z" }],
        error: null,
      },
      paths: { data: [], error: null },
      check_ins: { data: [], error: null },
      identity_updates: { data: [], error: null },
      future_selves: { data: [], error: null },
    });
    setActiveStub(stub);

    await generateFutureSelves();

    const insertCalls = stub.calls.filter(
      (c) => c.table === "future_selves" && c.method === "insert",
    );
    const insertedName = (insertCalls[0].args[0] as Record<string, unknown>).name;

    // "Intentional Connector" is a valid archetype name (2 words ≤ 8) —
    // it must be stored verbatim.
    expect(insertedName).toBe("Intentional Connector");
  });

  it("rewrites a name that exceeds the 8-word limit even without an archetype shape", async () => {
    runStructuredGenerationMock.mockClear();

    runStructuredGenerationMock.mockResolvedValueOnce({
      ok: true,
      data: [
        {
          name: "Builds a quiet life around close friends and family",
          summary: "Repeated choices to prioritize a small circle of people.",
          movement_direction: "positive",
          evidence_strength: "Moderate",
          core_behaviors: [],
          behavioral_evidence: [],
          growth_opportunities: ["Builds a reliable support network."],
          blind_spots: ["Less time for solo pursuits."],
          likely_evolution: "Known for showing up for the people closest to them.",
          themes: ["Belonging"],
          why_emerging: "",
        },
      ],
    });

    const stub = createSupabaseStub({
      moments: {
        data: [{ opportunity_themes: [], risk_themes: [], created_at: "2020-01-01T00:00:00.000Z" }],
        error: null,
      },
      paths: { data: [], error: null },
      check_ins: { data: [], error: null },
      identity_updates: { data: [], error: null },
      future_selves: { data: [], error: null },
    });
    setActiveStub(stub);

    await generateFutureSelves();

    const insertCalls = stub.calls.filter(
      (c) => c.table === "future_selves" && c.method === "insert",
    );
    const insertedName = (insertCalls[0].args[0] as Record<string, unknown>).name;

    // 9 words — over the 8-word limit, so falls back to the theme archetype name.
    expect(insertedName).toBe("Belonging Seeker");
  });

  it("keeps a name unchanged when it already satisfies the trajectory naming rules", async () => {
    runStructuredGenerationMock.mockClear();

    runStructuredGenerationMock.mockResolvedValueOnce({
      ok: true,
      data: [
        {
          name: "Builds a life in a new city",
          summary: "Researching cities and weighing a real job offer.",
          movement_direction: "positive",
          evidence_strength: "Moderate",
          core_behaviors: [],
          behavioral_evidence: [],
          growth_opportunities: ["Creates a clean break from limiting environments."],
          blind_spots: ["Existing relationships may weaken with distance."],
          likely_evolution: "Built an adult life from scratch, deliberately.",
          themes: ["Growth"],
          why_emerging: "",
        },
      ],
    });

    const stub = createSupabaseStub({
      moments: {
        data: [{ opportunity_themes: [], risk_themes: [], created_at: "2020-01-01T00:00:00.000Z" }],
        error: null,
      },
      paths: { data: [], error: null },
      check_ins: { data: [], error: null },
      identity_updates: { data: [], error: null },
      future_selves: { data: [], error: null },
    });
    setActiveStub(stub);

    await generateFutureSelves();

    const insertCalls = stub.calls.filter(
      (c) => c.table === "future_selves" && c.method === "insert",
    );
    const insertedName = (insertCalls[0].args[0] as Record<string, unknown>).name;

    expect(insertedName).toBe("Builds a life in a new city");
  });

  it("removes the weaker draft when two drafts share a dominant theme pair", async () => {
    runStructuredGenerationMock.mockClear();

    const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    // Themes [Independence, Stability, Courage] vs [Independence, Stability]
    // overlap enough (2/3 Jaccard) to trip dedupeDrafts' theme gate, but very
    // different wording fails its name/summary confirm check — so this pair
    // survives dedupeDrafts and must be caught by dominant-pair distinctness
    // instead. Both lead with the same first-two themes (Independence,
    // Stability), regardless of order, so they're the same "dominant pair".
    runStructuredGenerationMock.mockResolvedValueOnce({
      ok: true,
      data: [
        {
          name: "Builds independence while staying steady",
          summary: "Repeated choices toward self-direction and steady circumstances, with growing willingness to take risks.",
          movement_direction: "positive",
          evidence_strength: "Moderate",
          core_behaviors: [],
          behavioral_evidence: [],
          growth_opportunities: ["Builds a track record of consistent output."],
          blind_spots: ["Burnout risk rises if rest stays secondary."],
          likely_evolution: "Builds something real through sustained effort.",
          themes: ["Independence", "Stability", "Courage"],
          why_emerging: "",
        },
        {
          name: "Creates more stability and structure",
          summary: "A consistent preference for steady, predictable circumstances over open possibilities.",
          movement_direction: "positive",
          evidence_strength: "Moderate",
          core_behaviors: [],
          behavioral_evidence: [],
          growth_opportunities: ["Reduces exposure to unstable circumstances."],
          blind_spots: ["May close off worthwhile risks."],
          likely_evolution: "Known for steady, predictable choices.",
          themes: ["Independence", "Stability"],
          why_emerging: "",
        },
      ],
    });

    const stub = createSupabaseStub({
      moments: {
        data: [{ opportunity_themes: [], risk_themes: [], created_at: "2020-01-01T00:00:00.000Z" }],
        error: null,
      },
      paths: { data: [], error: null },
      check_ins: { data: [], error: null },
      identity_updates: {
        // Shared by both (Independence/Stability) so it doesn't break the
        // tie on its own — the Courage-only contribution below does.
        data: [
          { update_type: "reality_shift", themes: ["Independence"], created_at: daysAgo(1) },
          { update_type: "reality_shift", themes: ["Stability"], created_at: daysAgo(1) },
          { update_type: "pattern_strengthened", themes: ["Courage"], created_at: daysAgo(1) },
        ],
        error: null,
      },
      future_selves: { data: [], error: null },
    });
    setActiveStub(stub);

    await generateFutureSelves();

    const insertCalls = stub.calls.filter(
      (c) => c.table === "future_selves" && c.method === "insert",
    );

    // Only one of the two should survive — the dominant theme pair
    // (Independence + Stability) is shared, and no replacement is created.
    expect(insertCalls).toHaveLength(1);
    expect((insertCalls[0].args[0] as Record<string, unknown>).name).toBe(
      "Builds independence while staying steady",
    );
  });

  it("keeps both drafts when their dominant theme pairs differ", async () => {
    runStructuredGenerationMock.mockClear();

    runStructuredGenerationMock.mockResolvedValueOnce({
      ok: true,
      data: [
        {
          name: "Chooses independence over certainty",
          summary: "Repeated preference for self-direction even when it means taking on more risk.",
          movement_direction: "positive",
          evidence_strength: "Moderate",
          core_behaviors: [],
          behavioral_evidence: [],
          growth_opportunities: ["Builds confidence in self-direction."],
          blind_spots: ["May take on risk others would avoid."],
          likely_evolution: "Known for choosing their own path.",
          themes: ["Independence", "Courage"],
          why_emerging: "",
        },
        {
          name: "Creates stability before taking risks",
          summary: "A consistent pattern of securing footing before pursuing new growth.",
          movement_direction: "positive",
          evidence_strength: "Moderate",
          core_behaviors: [],
          behavioral_evidence: [],
          growth_opportunities: ["Reduces exposure to unstable circumstances."],
          blind_spots: ["Growth may be slower than it could be."],
          likely_evolution: "Known for steady, deliberate growth.",
          themes: ["Stability", "Growth"],
          why_emerging: "",
        },
      ],
    });

    const stub = createSupabaseStub({
      moments: {
        data: [{ opportunity_themes: [], risk_themes: [], created_at: "2020-01-01T00:00:00.000Z" }],
        error: null,
      },
      paths: { data: [], error: null },
      check_ins: { data: [], error: null },
      identity_updates: { data: [], error: null },
      future_selves: { data: [], error: null },
    });
    setActiveStub(stub);

    await generateFutureSelves();

    const insertCalls = stub.calls.filter(
      (c) => c.table === "future_selves" && c.method === "insert",
    );
    const insertedNames = insertCalls.map((c) => (c.args[0] as Record<string, unknown>).name);

    // Independence+Courage and Stability+Growth are different dominant
    // pairs — both must survive.
    expect(insertedNames).toHaveLength(2);
    expect(insertedNames).toContain("Chooses independence over certainty");
    expect(insertedNames).toContain("Creates stability before taking risks");
  });

  it("keeps the earlier draft when dominant theme pairs tie on trajectory strength", async () => {
    runStructuredGenerationMock.mockClear();

    // Full theme sets only overlap 2/4 (Jaccard 0.5, under dedupeDrafts'
    // 0.6 gate) so dedupeDrafts leaves both alone — only dominant-pair
    // distinctness acts here. With no matching evidence for either, both
    // computeTrajectoryStrength() values are 0: an exact tie.
    runStructuredGenerationMock.mockResolvedValueOnce({
      ok: true,
      data: [
        {
          name: "Creates more stability and structure",
          summary: "A consistent preference for steady, predictable circumstances.",
          movement_direction: "positive",
          evidence_strength: "Emerging",
          core_behaviors: [],
          behavioral_evidence: [],
          growth_opportunities: ["Reduces exposure to unstable circumstances."],
          blind_spots: ["May close off worthwhile risks."],
          likely_evolution: "Known for steady, predictable choices.",
          themes: ["Independence", "Stability", "Growth"],
          why_emerging: "",
        },
        {
          name: "Builds toward steady independence and courage",
          summary: "Repeated choices that combine self-direction with a willingness to take risks.",
          movement_direction: "positive",
          evidence_strength: "Emerging",
          core_behaviors: [],
          behavioral_evidence: [],
          growth_opportunities: ["Builds confidence in self-direction."],
          blind_spots: ["May take on risk others would avoid."],
          likely_evolution: "Known for choosing their own path.",
          themes: ["Independence", "Stability", "Courage"],
          why_emerging: "",
        },
      ],
    });

    const stub = createSupabaseStub({
      moments: {
        data: [{ opportunity_themes: [], risk_themes: [], created_at: "2020-01-01T00:00:00.000Z" }],
        error: null,
      },
      paths: { data: [], error: null },
      check_ins: { data: [], error: null },
      identity_updates: { data: [], error: null },
      future_selves: { data: [], error: null },
    });
    setActiveStub(stub);

    await generateFutureSelves();

    const insertCalls = stub.calls.filter(
      (c) => c.table === "future_selves" && c.method === "insert",
    );

    expect(insertCalls).toHaveLength(1);
    expect((insertCalls[0].args[0] as Record<string, unknown>).name).toBe(
      "Creates more stability and structure",
    );
  });

  it("keeps a chosen path's effect nearly flat while still inside the current-force window, then drops sharply once it ages out of it", async () => {
    runStructuredGenerationMock.mockClear();

    const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const secondsAgo = (seconds: number) => new Date(Date.now() - seconds * 1000).toISOString();

    const drafts = [
      {
        name: "Builds Toward Stability",
        summary: "A consistent pull toward steady, predictable circumstances.",
        movement_direction: "positive",
        evidence_strength: "Moderate",
        core_behaviors: [],
        behavioral_evidence: [],
        growth_opportunities: ["Builds a dependable foundation."],
        blind_spots: ["May avoid worthwhile risks."],
        likely_evolution: "Builds a life that rarely surprises them.",
        themes: ["Stability"],
        why_emerging: "",
      },
      {
        name: "Stays Socially Connected",
        summary: "A consistent pull toward spending time with other people.",
        movement_direction: "positive",
        evidence_strength: "Moderate",
        core_behaviors: [],
        behavioral_evidence: [],
        growth_opportunities: ["Builds a support network."],
        blind_spots: ["Less solo time."],
        likely_evolution: "Known for always making time for people.",
        themes: ["Connection"],
        why_emerging: "",
      },
    ];

    // Same symmetric baseline evidence as the "fresh path" test above (5
    // reality_shift updates each, 10 days old -> 30 raw strength each), so
    // the only variable across the two runs below is the chosen path's age.
    const baselineIdentityUpdates = [
      ...Array.from({ length: 5 }, () => ({
        themes: ["Stability"],
        update_type: "reality_shift",
        created_at: daysAgo(10),
      })),
      ...Array.from({ length: 5 }, () => ({
        themes: ["Connection"],
        update_type: "reality_shift",
        created_at: daysAgo(10),
      })),
    ];

    async function runWithChosenPathAge(chosenAt: string) {
      runStructuredGenerationMock.mockResolvedValueOnce({ ok: true, data: drafts });

      const stub = createSupabaseStub({
        moments: {
        data: [{ opportunity_themes: [], risk_themes: [], created_at: "2020-01-01T00:00:00.000Z" }],
        error: null,
      },
        paths: {
          data: [{ themes: ["Stability"], chosen_at: chosenAt, created_at: chosenAt }],
          error: null,
        },
        check_ins: { data: [], error: null },
        identity_updates: { data: baselineIdentityUpdates, error: null },
        future_selves: { data: [], error: null },
      });
      setActiveStub(stub);

      await generateFutureSelves();

      const insertCalls = stub.calls.filter(
        (c) => c.table === "future_selves" && c.method === "insert",
      );
      return new Map(
        insertCalls.map((c) => {
          const payload = c.args[0] as Record<string, unknown>;
          return [payload.name as string, payload.percentage as number];
        }),
      );
    }

    const justChosen = await runWithChosenPathAge(secondsAgo(1));
    const tenDaysOld = await runWithChosenPathAge(daysAgo(10));
    const wellPastWindow = await runWithChosenPathAge(daysAgo(35));

    // Freshly chosen: same as the dedicated "fresh path" test — 75/74.
    expect(justChosen.get("Builds Toward Stability")).toBe(75);
    expect(justChosen.get("Stays Socially Connected")).toBe(74);

    // The same path, 10 days later, is still inside CURRENT_FORCE_WINDOW_DAYS
    // (21) — only the ordinary, slow evidenceDecay applies, so the split
    // barely moves from the freshly-chosen case. At integer precision both
    // round to the same value as justChosen.
    expect(tenDaysOld.get("Builds Toward Stability")).toBe(75);
    expect(tenDaysOld.get("Stays Socially Connected")).toBe(74);

    // Once the same path ages past the window entirely (35 days), it moves
    // out of currentForce and into backgroundStrength — losing
    // CURRENT_FORCE_MULTIPLIER altogether rather than fading smoothly. The
    // drop is sharp: Stability falls back to the symmetric baseline (74).
    expect(wellPastWindow.get("Builds Toward Stability")).toBe(74);
    expect(wellPastWindow.get("Stays Socially Connected")).toBe(74);
    expect(justChosen.get("Builds Toward Stability")!).toBeGreaterThan(
      wellPastWindow.get("Builds Toward Stability")!,
    );
  });

  it("lets fresh check-ins overtake a long-decayed chosen-path boost", async () => {
    runStructuredGenerationMock.mockClear();

    const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    runStructuredGenerationMock.mockResolvedValueOnce({
      ok: true,
      data: [
        {
          name: "Builds Toward Stability",
          summary: "A consistent pull toward steady, predictable circumstances.",
          movement_direction: "positive",
          evidence_strength: "Moderate",
          core_behaviors: [],
          behavioral_evidence: [],
          growth_opportunities: ["Builds a dependable foundation."],
          blind_spots: ["May avoid worthwhile risks."],
          likely_evolution: "Builds a life that rarely surprises them.",
          themes: ["Stability"],
          why_emerging: "",
        },
        {
          name: "Stays Socially Connected",
          summary: "A consistent pull toward spending time with other people.",
          movement_direction: "positive",
          evidence_strength: "Moderate",
          core_behaviors: [],
          behavioral_evidence: [],
          growth_opportunities: ["Builds a support network."],
          blind_spots: ["Less solo time."],
          likely_evolution: "Known for always making time for people.",
          themes: ["Connection"],
          why_emerging: "",
        },
      ],
    });

    const stub = createSupabaseStub({
      moments: {
        data: [{ opportunity_themes: [], risk_themes: [], created_at: "2020-01-01T00:00:00.000Z" }],
        error: null,
      },
      // The most recently chosen path is 35 days old — old enough that its
      // recency boost (3-day half-life) has decayed to a negligible amount,
      // even though it's still the single most recent chosen path on record.
      paths: {
        data: [{ themes: ["Stability"], chosen_at: daysAgo(35), created_at: daysAgo(35) }],
        error: null,
      },
      // Two fresh check-ins confirming Connection, recorded today.
      check_ins: {
        data: [
          {
            theme_changes: [{ theme: "Connection", direction: "strengthened" }],
            created_at: daysAgo(0),
          },
          {
            theme_changes: [{ theme: "Connection", direction: "strengthened" }],
            created_at: daysAgo(0),
          },
        ],
        error: null,
      },
      identity_updates: {
        data: [
          ...Array.from({ length: 5 }, () => ({
            themes: ["Stability"],
            update_type: "reality_shift",
            created_at: daysAgo(10),
          })),
          ...Array.from({ length: 5 }, () => ({
            themes: ["Connection"],
            update_type: "reality_shift",
            created_at: daysAgo(10),
          })),
        ],
        error: null,
      },
      future_selves: { data: [], error: null },
    });
    setActiveStub(stub);

    await generateFutureSelves();

    const insertCalls = stub.calls.filter(
      (c) => c.table === "future_selves" && c.method === "insert",
    );
    const percentageByName = new Map(
      insertCalls.map((c) => {
        const payload = c.args[0] as Record<string, unknown>;
        return [payload.name as string, payload.percentage as number];
      }),
    );

    // With an un-decaying flat boost, the chosen path's future would still
    // lead. With the boost almost fully decayed at 35 days, the two fresh
    // check-ins on the other future are enough to overtake it.
    expect(percentageByName.get("Stays Socially Connected")!).toBeGreaterThan(
      percentageByName.get("Builds Toward Stability")!,
    );
  });

  it("amplifies identically-weighted evidence far more when it's recent than when it's already background", async () => {
    runStructuredGenerationMock.mockClear();

    const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    // Same evidence type, same weight (reality_shift, 8), same single piece
    // of evidence each — the only difference is age: one falls inside
    // CURRENT_FORCE_WINDOW_DAYS (1 day), the other well outside it (30
    // days). If background and current force were still one pool, these two
    // would only differ by the ordinary decay curve (a small gap). Split
    // into two pools, the recent one also gets CURRENT_FORCE_MULTIPLIER,
    // producing a far larger gap than decay alone ever would.
    runStructuredGenerationMock.mockResolvedValueOnce({
      ok: true,
      data: [
        {
          name: "Builds Toward Stability",
          summary: "A consistent pull toward steady, predictable circumstances.",
          movement_direction: "positive",
          evidence_strength: "Moderate",
          core_behaviors: [],
          behavioral_evidence: [],
          growth_opportunities: ["Builds a dependable foundation."],
          blind_spots: ["May avoid worthwhile risks."],
          likely_evolution: "Builds a life that rarely surprises them.",
          themes: ["Stability"],
          why_emerging: "",
        },
        {
          name: "Stays Socially Connected",
          summary: "A consistent pull toward spending time with other people.",
          movement_direction: "positive",
          evidence_strength: "Moderate",
          core_behaviors: [],
          behavioral_evidence: [],
          growth_opportunities: ["Builds a support network."],
          blind_spots: ["Less solo time."],
          likely_evolution: "Known for always making time for people.",
          themes: ["Connection"],
          why_emerging: "",
        },
      ],
    });

    const stub = createSupabaseStub({
      moments: {
        data: [{ opportunity_themes: [], risk_themes: [], created_at: "2020-01-01T00:00:00.000Z" }],
        error: null,
      },
      paths: { data: [], error: null },
      check_ins: { data: [], error: null },
      identity_updates: {
        data: [
          { themes: ["Stability"], update_type: "reality_shift", created_at: daysAgo(1) },
          { themes: ["Connection"], update_type: "reality_shift", created_at: daysAgo(30) },
        ],
        error: null,
      },
      future_selves: { data: [], error: null },
    });
    setActiveStub(stub);

    await generateFutureSelves();

    const insertCalls = stub.calls.filter(
      (c) => c.table === "future_selves" && c.method === "insert",
    );
    const percentageByName = new Map(
      insertCalls.map((c) => {
        const payload = c.args[0] as Record<string, unknown>;
        return [payload.name as string, payload.percentage as number];
      }),
    );

    expect(percentageByName.get("Builds Toward Stability")).toBe(44);
    expect(percentageByName.get("Stays Socially Connected")).toBe(3);
  });

  it("applies continuous half-life decay (21 days) in place of the old tiered/floored decay", async () => {
    runStructuredGenerationMock.mockClear();

    const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    runStructuredGenerationMock.mockResolvedValueOnce({
      ok: true,
      data: [
        {
          name: "Fresh Evidence Future",
          summary: "A consistent pull toward steady, predictable circumstances.",
          movement_direction: "positive",
          evidence_strength: "Moderate",
          core_behaviors: [],
          behavioral_evidence: [],
          growth_opportunities: ["Builds a dependable foundation."],
          blind_spots: ["May avoid worthwhile risks."],
          likely_evolution: "Builds a life that rarely surprises them.",
          themes: ["Stability"],
          why_emerging: "",
        },
        {
          name: "Half-Life-Old Evidence Future",
          summary: "A consistent pull toward spending time with other people.",
          movement_direction: "positive",
          evidence_strength: "Moderate",
          core_behaviors: [],
          behavioral_evidence: [],
          growth_opportunities: ["Builds a support network."],
          blind_spots: ["Less solo time."],
          likely_evolution: "Known for always making time for people.",
          themes: ["Connection"],
          why_emerging: "",
        },
      ],
    });

    const stub = createSupabaseStub({
      moments: {
        data: [{ opportunity_themes: [], risk_themes: [], created_at: "2020-01-01T00:00:00.000Z" }],
        error: null,
      },
      paths: { data: [], error: null },
      check_ins: { data: [], error: null },
      identity_updates: {
        data: [
          { themes: ["Stability"], update_type: "reality_shift", created_at: daysAgo(0) },
          { themes: ["Connection"], update_type: "reality_shift", created_at: daysAgo(21) },
        ],
        error: null,
      },
      future_selves: { data: [], error: null },
    });
    setActiveStub(stub);

    await generateFutureSelves();

    const insertCalls = stub.calls.filter(
      (c) => c.table === "future_selves" && c.method === "insert",
    );
    const percentageByName = new Map(
      insertCalls.map((c) => {
        const payload = c.args[0] as Record<string, unknown>;
        return [payload.name as string, payload.percentage as number];
      }),
    );

    // Identical evidence (one reality_shift each) except one is exactly one
    // half-life (21 days) old: its effectiveStrength (40) is exactly half
    // the fresh one's (80), but independent scoring maps them to 44% vs 29%
    // — both distinct, proving continuous decay works. The old tiered scheme
    // would have put both in the same "<30 days" tier and produced 50/50.
    expect(percentageByName.get("Fresh Evidence Future")).toBe(44);
    expect(percentageByName.get("Half-Life-Old Evidence Future")).toBe(29);
  });

  it("lets a 'weakened' check-in count against a trajectory instead of for it", async () => {
    runStructuredGenerationMock.mockClear();

    const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    runStructuredGenerationMock.mockResolvedValueOnce({
      ok: true,
      data: [
        {
          name: "Stability Future",
          summary: "A consistent pull toward steady, predictable circumstances.",
          movement_direction: "negative",
          evidence_strength: "Moderate",
          core_behaviors: [],
          behavioral_evidence: [],
          growth_opportunities: ["Builds a dependable foundation."],
          blind_spots: ["May avoid worthwhile risks."],
          likely_evolution: "Builds a life that rarely surprises them.",
          themes: ["Stability"],
          why_emerging: "",
        },
        {
          name: "Connection Future",
          summary: "A consistent pull toward spending time with other people.",
          movement_direction: "positive",
          evidence_strength: "Moderate",
          core_behaviors: [],
          behavioral_evidence: [],
          growth_opportunities: ["Builds a support network."],
          blind_spots: ["Less solo time."],
          likely_evolution: "Known for always making time for people.",
          themes: ["Connection"],
          why_emerging: "",
        },
      ],
    });

    const stub = createSupabaseStub({
      moments: {
        data: [{ opportunity_themes: [], risk_themes: [], created_at: "2020-01-01T00:00:00.000Z" }],
        error: null,
      },
      paths: { data: [], error: null },
      // Same theme, opposite direction: a check-in saying Stability weakened
      // should count against that future, while one saying Connection
      // strengthened should count for it.
      check_ins: {
        data: [
          { theme_changes: [{ theme: "Stability", direction: "weakened" }], created_at: daysAgo(0) },
          {
            theme_changes: [{ theme: "Connection", direction: "strengthened" }],
            created_at: daysAgo(0),
          },
        ],
        error: null,
      },
      // Identical, symmetric baseline so the check-ins are the only variable.
      identity_updates: {
        data: [
          { themes: ["Stability"], update_type: "reality_shift", created_at: daysAgo(10) },
          { themes: ["Connection"], update_type: "reality_shift", created_at: daysAgo(10) },
        ],
        error: null,
      },
      future_selves: { data: [], error: null },
    });
    setActiveStub(stub);

    await generateFutureSelves();

    const insertCalls = stub.calls.filter(
      (c) => c.table === "future_selves" && c.method === "insert",
    );
    const percentageByName = new Map(
      insertCalls.map((c) => {
        const payload = c.args[0] as Record<string, unknown>;
        return [payload.name as string, payload.percentage as number];
      }),
    );

    // With identical baseline evidence, "weakened" pulls Stability below the
    // baseline and "strengthened" pushes Connection above it — not the old
    // behavior, where both directions added the same flat +1 regardless.
    expect(percentageByName.get("Stability Future")).toBe(32);
    expect(percentageByName.get("Connection Future")).toBe(40);
  });

  it("strengthens a future matching the situation's opportunity themes, immediately and before any path is chosen", async () => {
    runStructuredGenerationMock.mockClear();

    const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    runStructuredGenerationMock.mockResolvedValueOnce({
      ok: true,
      data: [
        {
          name: "Independence Future",
          summary: "Turning down a roommate's offer to keep full control over daily decisions.",
          movement_direction: "positive",
          evidence_strength: "Emerging",
          core_behaviors: [],
          behavioral_evidence: [],
          growth_opportunities: ["Keeps daily choices entirely their own."],
          blind_spots: ["Fewer people to share costs or chores with."],
          likely_evolution: "Years of choosing solo living over convenience could make solitude the comfortable default.",
          themes: ["Independence"],
          why_emerging: "",
        },
        {
          name: "Unrelated Future",
          summary: "Joining a weekly trivia night with the same group for months running.",
          movement_direction: "positive",
          evidence_strength: "Emerging",
          core_behaviors: [],
          behavioral_evidence: [],
          growth_opportunities: ["Builds a reliable, recurring social circle."],
          blind_spots: ["Less flexibility on weeknights."],
          likely_evolution: "Showing up every week for years could make this group feel like found family.",
          themes: ["Belonging"],
          why_emerging: "",
        },
      ],
    });

    const stub = createSupabaseStub({
      // A brand-new situation, no candidate paths generated or chosen yet —
      // its opportunity theme alone should still count as evidence, scored
      // from the moment's created_at.
      moments: {
        data: [{ opportunity_themes: ["Independence"], risk_themes: [], created_at: daysAgo(0) }],
        error: null,
      },
      paths: { data: [], error: null },
      check_ins: { data: [], error: null },
      identity_updates: { data: [], error: null },
      future_selves: { data: [], error: null },
    });
    setActiveStub(stub);

    await generateFutureSelves();

    const insertCalls = stub.calls.filter(
      (c) => c.table === "future_selves" && c.method === "insert",
    );
    const percentageByName = new Map(
      insertCalls.map((c) => {
        const payload = c.args[0] as Record<string, unknown>;
        return [payload.name as string, payload.percentage as number];
      }),
    );

    expect(percentageByName.get("Independence Future")).toBe(17);
    expect(percentageByName.get("Unrelated Future")).toBe(0);
  });

  it("weakens a future matching the situation's risk themes, instead of treating every situation as support for everything", async () => {
    runStructuredGenerationMock.mockClear();

    const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    runStructuredGenerationMock.mockResolvedValueOnce({
      ok: true,
      data: [
        {
          name: "Stability Future",
          summary: "Renewing the same lease again and keeping the same routine for another year.",
          movement_direction: "positive",
          evidence_strength: "Moderate",
          core_behaviors: [],
          behavioral_evidence: [],
          growth_opportunities: ["Keeps monthly costs predictable."],
          blind_spots: ["Fewer changes to break up the routine."],
          likely_evolution: "Settles into a life defined by routine and a fixed address.",
          themes: ["Stability"],
          why_emerging: "",
        },
        {
          name: "Connection Future",
          summary: "Hosting a small dinner with the same close friends every other week.",
          movement_direction: "positive",
          evidence_strength: "Moderate",
          core_behaviors: [],
          behavioral_evidence: [],
          growth_opportunities: ["Keeps close friendships active."],
          blind_spots: ["Less time for new acquaintances."],
          likely_evolution: "Known for a small, steady circle that always makes time for each other.",
          themes: ["Connection"],
          why_emerging: "",
        },
      ],
    });

    const stub = createSupabaseStub({
      // A new situation puts Stability specifically at risk, while leaving
      // Connection untouched — the risk theme should pull Stability Future
      // below the even baseline, not leave both futures equally supported.
      moments: {
        data: [{ opportunity_themes: [], risk_themes: ["Stability"], created_at: daysAgo(0) }],
        error: null,
      },
      paths: { data: [], error: null },
      check_ins: { data: [], error: null },
      // Identical, symmetric baseline so the risk theme is the only variable.
      identity_updates: {
        data: [
          { themes: ["Stability"], update_type: "reality_shift", created_at: daysAgo(10) },
          { themes: ["Connection"], update_type: "reality_shift", created_at: daysAgo(10) },
        ],
        error: null,
      },
      future_selves: { data: [], error: null },
    });
    setActiveStub(stub);

    await generateFutureSelves();

    const insertCalls = stub.calls.filter(
      (c) => c.table === "future_selves" && c.method === "insert",
    );
    const percentageByName = new Map(
      insertCalls.map((c) => {
        const payload = c.args[0] as Record<string, unknown>;
        return [payload.name as string, payload.percentage as number];
      }),
    );

    expect(percentageByName.get("Stability Future")).toBe(27);
    expect(percentageByName.get("Connection Future")).toBe(37);
  });

  it("lets the same situation strengthen one future while weakening another, instead of moving every future the same direction", async () => {
    const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    async function runWith(situation: {
      opportunity_themes: string[];
      risk_themes: string[];
      created_at: string;
    } | null) {
      runStructuredGenerationMock.mockResolvedValueOnce({
        ok: true,
        data: [
          {
            name: "Builds Toward Independence",
            summary: "Turning a spare room into a home office instead of taking on a roommate.",
            movement_direction: "positive",
            evidence_strength: "Moderate",
            core_behaviors: [],
            behavioral_evidence: [],
            growth_opportunities: ["Keeps full control over the space."],
            blind_spots: ["Carries the full rent alone."],
            likely_evolution: "Builds a life centered on full control over their own space and time.",
            themes: ["Independence"],
            why_emerging: "",
          },
          {
            name: "Builds Toward A Fixed Routine",
            summary: "Keeping the same gym schedule and grocery run every single week.",
            movement_direction: "positive",
            evidence_strength: "Moderate",
            core_behaviors: [],
            behavioral_evidence: [],
            growth_opportunities: ["Keeps the week predictable."],
            blind_spots: ["Little room for spontaneity."],
            likely_evolution: "Builds a life around a routine that rarely changes week to week.",
            themes: ["Stability"],
            why_emerging: "",
          },
        ],
      });

      const stub = createSupabaseStub({
        moments: {
          data: [
            situation ?? { opportunity_themes: [], risk_themes: [], created_at: daysAgo(0) },
          ],
          error: null,
        },
        paths: { data: [], error: null },
        check_ins: { data: [], error: null },
        // Identical, symmetric baseline so the situation is the only variable.
        identity_updates: {
          data: [
            { themes: ["Independence"], update_type: "reality_shift", created_at: daysAgo(10) },
            { themes: ["Stability"], update_type: "reality_shift", created_at: daysAgo(10) },
          ],
          error: null,
        },
        future_selves: { data: [], error: null },
      });
      setActiveStub(stub);

      await generateFutureSelves();

      const insertCalls = stub.calls.filter(
        (c) => c.table === "future_selves" && c.method === "insert",
      );
      return new Map(
        insertCalls.map((c) => {
          const payload = c.args[0] as Record<string, unknown>;
          return [payload.name as string, payload.percentage as number];
        }),
      );
    }

    const without = await runWith(null);
    expect(without.get("Builds Toward Independence")).toBe(37);
    expect(without.get("Builds Toward A Fixed Routine")).toBe(37);

    const withSituation = await runWith({
      opportunity_themes: ["Independence"],
      risk_themes: ["Stability"],
      created_at: daysAgo(0),
    });

    // One situation, opposite effects: Independence gains exactly what
    // Stability loses, not the same flat boost applied to both.
    expect(withSituation.get("Builds Toward Independence")!).toBeGreaterThan(37);
    expect(withSituation.get("Builds Toward A Fixed Routine")!).toBeLessThan(37);
  });

  it("keeps a growth and a risk trajectory with overlapping themes and similar wording, instead of collapsing them as near-duplicates", async () => {
    runStructuredGenerationMock.mockClear();

    // Identical theme sets (Jaccard 1.0) and overlapping wording ("Relocates
    // and grows more...", Jaccard 0.5) would trip isNearDuplicateTrajectory's
    // gates on theme and name similarity alone. The two drafts represent
    // opposite directions on the same themes — an opportunity and a risk —
    // and must both survive dedupeDrafts().
    runStructuredGenerationMock.mockResolvedValueOnce({
      ok: true,
      data: [
        {
          name: "Relocates and grows more independent",
          summary: "Researching cities and choosing to move toward a more self-directed life.",
          movement_direction: "positive",
          evidence_strength: "Moderate",
          core_behaviors: [],
          behavioral_evidence: [],
          growth_opportunities: ["Builds a life on their own terms."],
          blind_spots: ["Existing relationships may weaken with distance."],
          likely_evolution: "Builds an adult life from scratch, deliberately.",
          themes: ["Independence", "Growth"],
          why_emerging: "",
        },
        {
          name: "Relocates and grows more isolated",
          summary: "Moving away from social ties without building new ones, drifting toward isolation.",
          movement_direction: "negative",
          evidence_strength: "Emerging",
          core_behaviors: [],
          behavioral_evidence: [],
          growth_opportunities: ["Avoids relationships that weren't working anyway."],
          blind_spots: ["Risks losing touch with everyone they know."],
          likely_evolution: "Known for quietly drifting away after big changes.",
          themes: ["Independence", "Growth"],
          why_emerging: "",
        },
      ],
    });

    const stub = createSupabaseStub({
      moments: {
        data: [{ opportunity_themes: [], risk_themes: [], created_at: "2020-01-01T00:00:00.000Z" }],
        error: null,
      },
      paths: { data: [], error: null },
      check_ins: { data: [], error: null },
      identity_updates: { data: [], error: null },
      future_selves: { data: [], error: null },
    });
    setActiveStub(stub);

    await generateFutureSelves();

    const insertCalls = stub.calls.filter(
      (c) => c.table === "future_selves" && c.method === "insert",
    );
    const insertedNames = insertCalls.map((c) => (c.args[0] as Record<string, unknown>).name);

    expect(insertedNames).toHaveLength(2);
    expect(insertedNames).toContain("Relocates and grows more independent");
    expect(insertedNames).toContain("Relocates and grows more isolated");
  });

  it("keeps a growth and a risk trajectory that share a dominant theme pair, instead of collapsing them as a theme-pair collision", async () => {
    runStructuredGenerationMock.mockClear();

    // Full theme-set Jaccard is 2/4 = 0.5, under dedupeDrafts' 0.6 gate, so
    // dedupeDrafts leaves both alone. Both lead with the same first two
    // themes (Independence, Stability) though, so without a direction guard
    // enforceDominantThemePairDistinctness would treat them as a collision —
    // even though one is an opportunity and the other a risk on the same
    // territory.
    runStructuredGenerationMock.mockResolvedValueOnce({
      ok: true,
      data: [
        {
          name: "Builds toward stability and independence",
          summary: "A consistent pull toward steady, self-directed circumstances.",
          movement_direction: "positive",
          evidence_strength: "Moderate",
          core_behaviors: [],
          behavioral_evidence: [],
          growth_opportunities: ["Builds a dependable, self-directed foundation."],
          blind_spots: ["May avoid worthwhile risks."],
          likely_evolution: "Builds a life that rarely surprises them.",
          themes: ["Independence", "Stability", "Growth"],
          why_emerging: "",
        },
        {
          name: "Slowly withdraws into safety",
          summary: "A recurring pattern of avoiding anything that risks the current stability.",
          movement_direction: "negative",
          evidence_strength: "Emerging",
          core_behaviors: [],
          behavioral_evidence: [],
          growth_opportunities: ["Avoids short-term disruption."],
          blind_spots: ["May quietly abandon goals that require risk."],
          likely_evolution: "Known for choosing safety even when it costs growth.",
          themes: ["Independence", "Stability", "Courage"],
          why_emerging: "",
        },
      ],
    });

    const stub = createSupabaseStub({
      moments: {
        data: [{ opportunity_themes: [], risk_themes: [], created_at: "2020-01-01T00:00:00.000Z" }],
        error: null,
      },
      paths: { data: [], error: null },
      check_ins: { data: [], error: null },
      identity_updates: { data: [], error: null },
      future_selves: { data: [], error: null },
    });
    setActiveStub(stub);

    await generateFutureSelves();

    const insertCalls = stub.calls.filter(
      (c) => c.table === "future_selves" && c.method === "insert",
    );
    const insertedNames = insertCalls.map((c) => (c.args[0] as Record<string, unknown>).name);

    expect(insertedNames).toHaveLength(2);
    expect(insertedNames).toContain("Builds toward stability and independence");
    expect(insertedNames).toContain("Slowly withdraws into safety");
  });

  it("still removes true duplicates that share both themes, wording, and direction", async () => {
    runStructuredGenerationMock.mockClear();

    // Same setup as the growth-vs-risk dedupe test above, but both drafts
    // are "positive" this time — the direction guard must not disable
    // ordinary near-duplicate detection for same-direction drafts.
    runStructuredGenerationMock.mockResolvedValueOnce({
      ok: true,
      data: [
        {
          name: "Relocates and grows more independent",
          summary: "Researching cities and choosing to move toward a more self-directed life.",
          movement_direction: "positive",
          evidence_strength: "Moderate",
          core_behaviors: [],
          behavioral_evidence: [],
          growth_opportunities: ["Builds a life on their own terms."],
          blind_spots: ["Existing relationships may weaken with distance."],
          likely_evolution: "Builds an adult life from scratch, deliberately.",
          themes: ["Independence", "Growth"],
          why_emerging: "",
        },
        {
          name: "Relocates and grows more self-directed",
          summary: "Researching cities and choosing to move toward a more independent life.",
          movement_direction: "positive",
          evidence_strength: "Moderate",
          core_behaviors: [],
          behavioral_evidence: [],
          growth_opportunities: ["Builds confidence in self-direction."],
          blind_spots: ["Existing relationships may weaken with distance."],
          likely_evolution: "Builds a life entirely on their own terms.",
          themes: ["Independence", "Growth"],
          why_emerging: "",
        },
      ],
    });

    const stub = createSupabaseStub({
      moments: {
        data: [{ opportunity_themes: [], risk_themes: [], created_at: "2020-01-01T00:00:00.000Z" }],
        error: null,
      },
      paths: { data: [], error: null },
      check_ins: { data: [], error: null },
      identity_updates: { data: [], error: null },
      future_selves: { data: [], error: null },
    });
    setActiveStub(stub);

    const result = await generateFutureSelves();
    expect("error" in result).toBe(false);

    const insertCalls = stub.calls.filter(
      (c) => c.table === "future_selves" && c.method === "insert",
    );

    expect(insertCalls).toHaveLength(1);
  });

  it("preserves a valid existing name on a continuity-matched future during update, even when the draft has a different name", async () => {
    runStructuredGenerationMock.mockClear();

    const existingRows = [
      {
        id: "legacy-1",
        user_id: "user-1",
        name: "Disciplined Solo Builder",
        themes: ["Courage", "Stability", "Growth"],
        summary: "Setting a weekly application target while working an unrelated role.",
        percentage: 31,
        evidence_strength: "Moderate",
        status: "active",
        updated_at: "2026-06-01T00:00:00.000Z",
      },
    ];

    runStructuredGenerationMock.mockResolvedValueOnce({
      ok: true,
      data: [
        {
          name: "Stays focused on solo work",
          summary: "Continuing to apply for psychology roles while working an unrelated job.",
          movement_direction: "positive",
          evidence_strength: "Moderate",
          core_behaviors: [],
          behavioral_evidence: [],
          growth_opportunities: ["Keeps the professional goal alive."],
          blind_spots: ["Energy is split across two priorities."],
          likely_evolution: "Eventually lands in the field through sustained effort.",
          themes: ["Courage", "Stability", "Growth"],
          why_emerging: "",
        },
      ],
    });

    const stub = createSupabaseStub({
      moments: {
        data: [{ opportunity_themes: [], risk_themes: [], created_at: "2020-01-01T00:00:00.000Z" }],
        error: null,
      },
      paths: { data: [], error: null },
      check_ins: { data: [], error: null },
      identity_updates: { data: [], error: null },
      future_selves: { data: existingRows, error: null },
    });
    setActiveStub(stub);

    await generateFutureSelves();

    let updatedName: unknown;
    let pendingPayload: Record<string, unknown> | null = null;
    for (const call of stub.calls) {
      if (call.table !== "future_selves") continue;
      if (call.method === "update") {
        pendingPayload = call.args[0] as Record<string, unknown>;
      } else if (call.method === "eq" && call.args[0] === "id" && call.args[1] === "legacy-1") {
        updatedName = pendingPayload?.name;
      }
    }

    // "Disciplined Solo Builder" is a valid name (3 words ≤ 8). Continuity
    // matching preserves valid existing names regardless of the draft's
    // different wording — the existing name stays in storage.
    expect(updatedName).toBe("Disciplined Solo Builder");
  });

  it("leaves an already-valid name unchanged on a continuity-matched update", async () => {
    runStructuredGenerationMock.mockClear();

    const existingRows = [
      {
        id: "valid-1",
        user_id: "user-1",
        name: "Builds a stable, self-sufficient life",
        themes: ["Stability", "Independence"],
        summary: "A consistent preference for anchoring decisions to confirmed realities.",
        percentage: 29,
        evidence_strength: "Strong",
        status: "active",
        updated_at: "2026-06-01T00:00:00.000Z",
      },
    ];

    runStructuredGenerationMock.mockResolvedValueOnce({
      ok: true,
      data: [
        {
          name: "Some other phrasing entirely",
          summary: "Stability and independence keep reappearing across check-ins.",
          movement_direction: "positive",
          evidence_strength: "Strong",
          core_behaviors: [],
          behavioral_evidence: [],
          growth_opportunities: ["Builds a dependable foundation."],
          blind_spots: ["May avoid worthwhile risks."],
          likely_evolution: "Builds a life that rarely surprises them.",
          themes: ["Stability", "Independence"],
          why_emerging: "",
        },
      ],
    });

    const stub = createSupabaseStub({
      moments: {
        data: [{ opportunity_themes: [], risk_themes: [], created_at: "2020-01-01T00:00:00.000Z" }],
        error: null,
      },
      paths: { data: [], error: null },
      check_ins: { data: [], error: null },
      identity_updates: { data: [], error: null },
      future_selves: { data: existingRows, error: null },
    });
    setActiveStub(stub);

    await generateFutureSelves();

    let updatedName: unknown;
    let pendingPayload: Record<string, unknown> | null = null;
    for (const call of stub.calls) {
      if (call.table !== "future_selves") continue;
      if (call.method === "update") {
        pendingPayload = call.args[0] as Record<string, unknown>;
      } else if (call.method === "eq" && call.args[0] === "id" && call.args[1] === "valid-1") {
        updatedName = pendingPayload?.name;
      }
    }

    // The existing name is already valid (and continuity is supposed to
    // keep it regardless of what the model drafted this run) — it must stay
    // exactly as stored, not be replaced by the draft's different name.
    expect(updatedName).toBe("Builds a stable, self-sufficient life");
  });

  it("still preserves continuity (baseline percentage) when the existing name is valid and kept", async () => {
    runStructuredGenerationMock.mockClear();

    const existingRows = [
      {
        id: "legacy-2",
        user_id: "user-1",
        name: "Disciplined Solo Builder",
        themes: ["Courage", "Stability", "Growth"],
        summary: "Setting a weekly application target while working an unrelated role.",
        percentage: 31,
        evidence_strength: "Moderate",
        status: "active",
        updated_at: "2026-06-01T00:00:00.000Z",
      },
    ];

    runStructuredGenerationMock.mockResolvedValueOnce({
      ok: true,
      data: [
        {
          name: "Stays focused on solo work",
          summary: "Continuing to apply for psychology roles while working an unrelated job.",
          movement_direction: "positive",
          evidence_strength: "Strong",
          core_behaviors: [],
          behavioral_evidence: [],
          growth_opportunities: ["Keeps the professional goal alive."],
          blind_spots: ["Energy is split across two priorities."],
          likely_evolution: "Eventually lands in the field through sustained effort.",
          themes: ["Courage", "Stability", "Growth"],
          why_emerging: "",
        },
      ],
    });

    const stub = createSupabaseStub({
      moments: {
        data: [{ opportunity_themes: [], risk_themes: [], created_at: "2020-01-01T00:00:00.000Z" }],
        error: null,
      },
      paths: { data: [], error: null },
      check_ins: { data: [], error: null },
      identity_updates: { data: [], error: null },
      future_selves: { data: existingRows, error: null },
    });
    setActiveStub(stub);

    await generateFutureSelves();

    let payload: Record<string, unknown> | null = null;
    let matchedId: unknown;
    let pendingPayload: Record<string, unknown> | null = null;
    for (const call of stub.calls) {
      if (call.table !== "future_selves") continue;
      if (call.method === "update") {
        pendingPayload = call.args[0] as Record<string, unknown>;
      } else if (call.method === "eq" && call.args[0] === "id" && pendingPayload) {
        payload = pendingPayload;
        matchedId = call.args[1];
        pendingPayload = null;
      }
    }

    // Continuity matching still resolves this draft against the single
    // existing row (no insert happened, no second row was created), and the
    // baseline percentage still carries forward as previous_percentage.
    // "Disciplined Solo Builder" is valid (≤ 8 words) so the existing name
    // is preserved in the update.
    const insertCalls = stub.calls.filter(
      (c) => c.table === "future_selves" && c.method === "insert",
    );
    expect(insertCalls).toHaveLength(0);
    expect(matchedId).toBe("legacy-2");
    expect(payload?.previous_percentage).toBe(31);
    expect(payload?.name).toBe("Disciplined Solo Builder");
  });

  it("collapses two drafts narrating the same subject matter even when themes and dominant pairs differ enough to dodge the other checks", async () => {
    runStructuredGenerationMock.mockClear();

    const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    // Real-world example: full theme-set Jaccard is 2/4 = 0.5 (under
    // dedupeDrafts' 0.6 gate) and the dominant pairs differ
    // (Independence+Stability vs. Courage+Stability), so neither
    // dedupeDrafts() nor enforceDominantThemePairDistinctness() would catch
    // this pair. Both are nonetheless about the same underlying situation:
    // an interim job, financial pressure, and ongoing psychology
    // applications.
    runStructuredGenerationMock.mockResolvedValueOnce({
      ok: true,
      data: [
        {
          name: "Relocating and Building Independently",
          summary: "Researching multiple cities, weighing a Dallas job offer, taking any paying job to stay financially stable, and keeping psychology applications active all point toward a person who moves toward opportunity rather than waiting for certainty.",
          movement_direction: "positive",
          evidence_strength: "Strong",
          core_behaviors: [],
          behavioral_evidence: [],
          growth_opportunities: [
            "Financial pressure eases while the longer-term career search stays alive",
            "A city move could open networks and roles that aren't available locally",
            "Acting under uncertainty may build a track record of following through",
            "Independence from a single employer or location increases options over time",
          ],
          blind_spots: [
            "Splitting energy between an interim job and a psychology search could leave both feeling half-done",
            "Relocating without an established network means building from scratch socially and professionally",
            "Financial stability from a stopgap role may reduce urgency to keep the psychology search moving",
            "Repeated short-term jobs before landing a psychology role could create a resume pattern that's hard to explain",
          ],
          likely_evolution: "You may become someone who built a career and a life in a new place through a series of unglamorous interim steps — but the question is whether the psychology goal stays on the calendar or quietly gets deferred each time the interim job gets comfortable.",
          themes: ["Independence", "Stability", "Courage"],
          why_emerging: "",
        },
        {
          name: "Disciplined Solo Builder",
          summary: "Setting a specific weekly application target even while working an unrelated role signals that the psychology path hasn't been abandoned — it's being protected. This is a pattern of keeping a professional goal alive under financial pressure.",
          movement_direction: "positive",
          evidence_strength: "Moderate",
          core_behaviors: [],
          behavioral_evidence: [],
          growth_opportunities: [
            "Consistent applications maintain momentum and market awareness even during a gap",
            "Landing a psychology role after a difficult stretch may create a stronger professional identity",
            "Separating financial survival from career direction keeps both manageable",
            "A clear weekly target makes the goal measurable, not just aspirational",
          ],
          blind_spots: [
            "Working a non-psychology job while applying could stretch energy thin over months",
            "If the interim role becomes comfortable, the weekly target may quietly slip",
            "Rejection during an already stressful financial period could compound pressure",
            "The gap between graduation and a psychology role may require explanation in future interviews",
          ],
          likely_evolution: "You may become someone who eventually lands in psychology not because the path was smooth, but because you kept applying through the months when it would have been easier to stop — the risk is that the target becomes a ritual rather than a real priority.",
          themes: ["Courage", "Stability", "Growth"],
          why_emerging: "",
        },
      ],
    });

    const stub = createSupabaseStub({
      moments: {
        data: [{ opportunity_themes: [], risk_themes: [], created_at: "2020-01-01T00:00:00.000Z" }],
        error: null,
      },
      paths: { data: [], error: null },
      check_ins: { data: [], error: null },
      // Independence-only evidence gives the first draft a strength
      // advantage, so the survivor is deterministic.
      identity_updates: {
        data: [{ update_type: "reality_shift", themes: ["Independence"], created_at: daysAgo(1) }],
        error: null,
      },
      future_selves: { data: [], error: null },
    });
    setActiveStub(stub);

    const result = await generateFutureSelves();
    expect("error" in result).toBe(false);

    const insertCalls = stub.calls.filter(
      (c) => c.table === "future_selves" && c.method === "insert",
    );
    const insertedNames = insertCalls.map((c) => (c.args[0] as Record<string, unknown>).name);

    expect(insertedNames).toHaveLength(1);
    expect(insertedNames).toContain("Relocating and Building Independently");
    expect(insertedNames).not.toContain("Disciplined Solo Builder");
  });

  it("keeps two drafts about genuinely different subject matter", async () => {
    runStructuredGenerationMock.mockClear();

    runStructuredGenerationMock.mockResolvedValueOnce({
      ok: true,
      data: [
        {
          name: "Relocating and Building Independently",
          summary: "Researching multiple cities, weighing a Dallas job offer, taking any paying job to stay financially stable, and keeping psychology applications active all point toward a person who moves toward opportunity rather than waiting for certainty.",
          movement_direction: "positive",
          evidence_strength: "Strong",
          core_behaviors: [],
          behavioral_evidence: [],
          growth_opportunities: ["Financial pressure eases while the longer-term career search stays alive", "A city move could open networks and roles that aren't available locally"],
          blind_spots: ["Splitting energy between an interim job and a psychology search could leave both feeling half-done", "Relocating without an established network means building from scratch socially and professionally"],
          likely_evolution: "You may become someone who built a career and a life in a new place through a series of unglamorous interim steps — but the question is whether the psychology goal stays on the calendar or quietly gets deferred each time the interim job gets comfortable.",
          themes: ["Independence", "Stability", "Courage"],
          why_emerging: "",
        },
        {
          name: "Selectively Reconnecting",
          summary: "Despite a strong pull toward independence, repeated choices to show up socially — balancing a hangout with work, engaging in more extroverted activities — suggest connection is being chosen deliberately rather than avoided.",
          movement_direction: "positive",
          evidence_strength: "Moderate",
          core_behaviors: [],
          behavioral_evidence: [],
          growth_opportunities: ["A small, chosen social circle could provide support during a financially and professionally uncertain period", "Showing up selectively may preserve energy while still maintaining meaningful relationships"],
          blind_spots: ["Selective connection can drift into isolation if the bar for showing up keeps rising", "Relocation could reset relationships that took effort to build"],
          likely_evolution: "You may become someone with a small but reliable circle — people chosen carefully rather than accumulated — but the cost is that in lean periods, that circle may not be large enough to catch you.",
          themes: ["Connection", "Independence", "Courage"],
          why_emerging: "",
        },
      ],
    });

    const stub = createSupabaseStub({
      moments: {
        data: [{ opportunity_themes: [], risk_themes: [], created_at: "2020-01-01T00:00:00.000Z" }],
        error: null,
      },
      paths: { data: [], error: null },
      check_ins: { data: [], error: null },
      identity_updates: { data: [], error: null },
      future_selves: { data: [], error: null },
    });
    setActiveStub(stub);

    await generateFutureSelves();

    const insertCalls = stub.calls.filter(
      (c) => c.table === "future_selves" && c.method === "insert",
    );
    const insertedNames = insertCalls.map((c) => (c.args[0] as Record<string, unknown>).name);

    expect(insertedNames).toHaveLength(2);
    expect(insertedNames).toContain("Relocating and Building Independently");
    expect(insertedNames).toContain("Selectively Reconnecting");
  });

  it("keeps a growth and a risk trajectory about the same topic, since direction still overrides subject-matter similarity", async () => {
    runStructuredGenerationMock.mockClear();

    // These two share enough vocabulary ("new city", "self-directed
    // routine", "old social patterns", "distance") that subject-matter
    // similarity alone would collapse them — but one is positive and the
    // other negative, so the same risk-trajectory protection used by
    // dedupeDrafts()/enforceDominantThemePairDistinctness() must apply here
    // too.
    runStructuredGenerationMock.mockResolvedValueOnce({
      ok: true,
      data: [
        {
          name: "Builds independence after relocating",
          summary: "Moving to a new city and building a self-directed routine, choosing solitude over old social patterns and learning to rely on personal judgment.",
          movement_direction: "positive",
          evidence_strength: "Moderate",
          core_behaviors: [],
          behavioral_evidence: [],
          growth_opportunities: ["Builds confidence in personal judgment", "Creates space for a fresh routine"],
          blind_spots: ["Existing relationships may fade with distance", "Fewer built-in social safety nets"],
          likely_evolution: "Builds a life that feels chosen rather than inherited, shaped by distance from old expectations.",
          themes: ["Independence", "Courage"],
          why_emerging: "",
        },
        {
          name: "Becomes isolated after relocating",
          summary: "Moving to a new city and building a self-directed routine, but withdrawing from old social patterns and avoiding new ones forming.",
          movement_direction: "negative",
          evidence_strength: "Emerging",
          core_behaviors: [],
          behavioral_evidence: [],
          growth_opportunities: ["Avoids relationships that weren't working anyway"],
          blind_spots: ["Risks losing touch with everyone from before", "Loneliness may compound over time"],
          likely_evolution: "Becomes someone who drifts through a new city without forming real ties, mistaking distance for independence.",
          themes: ["Independence", "Courage"],
          why_emerging: "",
        },
      ],
    });

    const stub = createSupabaseStub({
      moments: {
        data: [{ opportunity_themes: [], risk_themes: [], created_at: "2020-01-01T00:00:00.000Z" }],
        error: null,
      },
      paths: { data: [], error: null },
      check_ins: { data: [], error: null },
      identity_updates: { data: [], error: null },
      future_selves: { data: [], error: null },
    });
    setActiveStub(stub);

    await generateFutureSelves();

    const insertCalls = stub.calls.filter(
      (c) => c.table === "future_selves" && c.method === "insert",
    );
    const insertedNames = insertCalls.map((c) => (c.args[0] as Record<string, unknown>).name);

    expect(insertedNames).toHaveLength(2);
    expect(insertedNames).toContain("Builds independence after relocating");
    expect(insertedNames).toContain("Becomes isolated after relocating");
  });

  it("requires a risk-led draft when a theme has materially present negative evidence (>= 2 signals)", async () => {
    runStructuredGenerationMock.mockClear();

    const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    runStructuredGenerationMock.mockResolvedValueOnce({ ok: true, data: [] });

    const stub = createSupabaseStub({
      // Two independent risk signals on "Stability": one situation tagging
      // it as a risk theme, and one weakened check-in — different sources,
      // same theme, meeting the threshold of 2.
      moments: {
        data: [
          { opportunity_themes: [], risk_themes: ["Stability"], created_at: daysAgo(5) },
          { opportunity_themes: [], risk_themes: [], created_at: daysAgo(10) },
        ],
        error: null,
      },
      paths: { data: [], error: null },
      check_ins: {
        data: [
          { theme_changes: [{ theme: "Stability", direction: "weakened" }], created_at: daysAgo(3) },
        ],
        error: null,
      },
      identity_updates: { data: [], error: null },
      future_selves: { data: [], error: null },
    });
    setActiveStub(stub);

    await generateFutureSelves();

    expect(runStructuredGenerationMock).toHaveBeenCalledTimes(1);
    const callOptions = runStructuredGenerationMock.mock.calls[0][0] as {
      overrides?: { riskFocusThemes?: string[] };
    };
    expect(callOptions.overrides?.riskFocusThemes).toEqual(["Stability"]);
  });

  it("does not require a risk-led draft when negative evidence stays below the threshold", async () => {
    runStructuredGenerationMock.mockClear();

    const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    runStructuredGenerationMock.mockResolvedValueOnce({ ok: true, data: [] });

    const stub = createSupabaseStub({
      // Only a single risk signal on "Stability" — one situation, no
      // weakened check-ins — below the threshold of 2.
      moments: {
        data: [{ opportunity_themes: [], risk_themes: ["Stability"], created_at: daysAgo(5) }],
        error: null,
      },
      paths: { data: [], error: null },
      check_ins: { data: [], error: null },
      identity_updates: { data: [], error: null },
      future_selves: { data: [], error: null },
    });
    setActiveStub(stub);

    await generateFutureSelves();

    expect(runStructuredGenerationMock).toHaveBeenCalledTimes(1);
    const callOptions = runStructuredGenerationMock.mock.calls[0][0] as {
      overrides?: { riskFocusThemes?: string[] };
    };
    expect(callOptions.overrides).toBeUndefined();
  });

  it("still generates positive futures normally when no risk threshold is met", async () => {
    runStructuredGenerationMock.mockClear();

    runStructuredGenerationMock.mockResolvedValueOnce({
      ok: true,
      data: [
        {
          name: "Builds Toward Stability",
          summary: "A consistent pull toward steady, predictable circumstances.",
          movement_direction: "positive",
          evidence_strength: "Moderate",
          core_behaviors: [],
          behavioral_evidence: [],
          growth_opportunities: ["Builds a dependable foundation."],
          blind_spots: ["May avoid worthwhile risks."],
          likely_evolution: "Builds a life that rarely surprises them.",
          themes: ["Stability"],
          why_emerging: "",
        },
      ],
    });

    const stub = createSupabaseStub({
      moments: {
        data: [{ opportunity_themes: [], risk_themes: [], created_at: "2020-01-01T00:00:00.000Z" }],
        error: null,
      },
      paths: { data: [], error: null },
      check_ins: { data: [], error: null },
      identity_updates: { data: [], error: null },
      future_selves: { data: [], error: null },
    });
    setActiveStub(stub);

    await generateFutureSelves();

    const callOptions = runStructuredGenerationMock.mock.calls[0][0] as {
      overrides?: { riskFocusThemes?: string[] };
    };
    expect(callOptions.overrides).toBeUndefined();

    const insertCalls = stub.calls.filter(
      (c) => c.table === "future_selves" && c.method === "insert",
    );
    expect(insertCalls.map((c) => (c.args[0] as Record<string, unknown>).name)).toContain(
      "Builds Toward Stability",
    );
  });

  it("preserves continuity for a persisting risk-led (negative) future across generations", async () => {
    runStructuredGenerationMock.mockClear();

    const existingRows = [
      {
        id: "risk-1",
        user_id: "user-1",
        name: "Independence Becoming Isolation",
        themes: ["Independence", "Stability"],
        summary: "A pattern of withdrawing from prior support while distancing from new ones forming.",
        percentage: 24,
        evidence_strength: "Moderate",
        status: "active",
        updated_at: "2026-06-01T00:00:00.000Z",
      },
    ];

    runStructuredGenerationMock.mockResolvedValueOnce({
      ok: true,
      data: [
        {
          name: "Independence Becoming Isolation",
          summary: "Continuing to decline invitations while leaning further into self-reliance.",
          movement_direction: "negative",
          evidence_strength: "Moderate",
          core_behaviors: [],
          behavioral_evidence: [],
          growth_opportunities: ["Avoids relationships that weren't working anyway."],
          blind_spots: ["Loneliness may compound over time.", "Support network keeps shrinking."],
          likely_evolution: "Becomes someone who mistakes distance for independence.",
          themes: ["Independence", "Stability"],
          why_emerging: "",
        },
      ],
    });

    const stub = createSupabaseStub({
      moments: {
        data: [{ opportunity_themes: [], risk_themes: [], created_at: "2020-01-01T00:00:00.000Z" }],
        error: null,
      },
      paths: { data: [], error: null },
      check_ins: { data: [], error: null },
      identity_updates: { data: [], error: null },
      future_selves: { data: existingRows, error: null },
    });
    setActiveStub(stub);

    await generateFutureSelves();

    // Matched by theme/continuity to the existing row, not inserted fresh.
    const insertCalls = stub.calls.filter(
      (c) => c.table === "future_selves" && c.method === "insert",
    );
    expect(insertCalls).toHaveLength(0);

    let updatedPayload: Record<string, unknown> | null = null;
    let matchedExistingId: unknown;
    for (const call of stub.calls) {
      if (call.table !== "future_selves") continue;
      if (call.method === "update") {
        updatedPayload = call.args[0] as Record<string, unknown>;
      } else if (call.method === "eq" && call.args[0] === "id" && call.args[1] === "risk-1") {
        matchedExistingId = call.args[1];
      }
    }

    expect(matchedExistingId).toBe("risk-1");
    expect(updatedPayload?.previous_percentage).toBe(24);
  });
});

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
