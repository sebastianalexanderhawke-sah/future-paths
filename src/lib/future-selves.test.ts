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
          benefits: ["Builds a track record of consistent output."],
          consequences: ["Burnout risk rises if rest stays secondary."],
          prediction: "Builds a life on their own terms.",
          themes: ["Stability", "Independence", "Growth"],
          why_changed: "Sustained independent output.",
        },
        {
          name: "Builds a steady, self-reliant life",
          summary: "A consistent preference for independence and stability over external validation.",
          movement_direction: "positive",
          evidence_strength: "Moderate",
          benefits: ["Reduces reliance on unstable circumstances."],
          consequences: ["May close off help that could've sped things up."],
          prediction: "Known for being steady and self-sufficient.",
          themes: ["Stability", "Independence"],
          why_changed: "Sustained independent output.",
        },
        {
          name: "Invests in close relationships",
          summary: "Repeated choices to prioritize a small circle of people over solitary pursuits.",
          movement_direction: "positive",
          evidence_strength: "Emerging",
          benefits: ["Builds a reliable support network."],
          consequences: ["Less time for solo pursuits."],
          prediction: "Known for being there for the people closest to them.",
          themes: ["Connection", "Belonging"],
          why_changed: "Repeated check-ins prioritizing close relationships.",
        },
      ],
    });

    const stub = createSupabaseStub({
      moments: { count: 10, data: null, error: null },
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
        benefits: ["Builds a dependable foundation."],
        consequences: ["May avoid worthwhile risks."],
        prediction: "Builds a life that rarely surprises them.",
        themes: ["Stability"],
        why_changed: "",
      },
      {
        name: "Stays Socially Connected",
        summary: "A consistent pull toward spending time with other people.",
        movement_direction: "positive",
        evidence_strength: "Moderate",
        benefits: ["Builds a support network."],
        consequences: ["Less solo time."],
        prediction: "Known for always making time for people.",
        themes: ["Connection"],
        why_changed: "",
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

    async function runWith(chosenPaths: { themes: string[]; chosen_at: string }[]) {
      runStructuredGenerationMock.mockResolvedValueOnce({ ok: true, data: drafts });

      const stub = createSupabaseStub({
        moments: { count: 10, data: null, error: null },
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
      { themes: ["Stability"], chosen_at: secondsAgo(1) },
    ]);

    // With no chosen path, the two symmetric futures split evenly.
    expect(without.get("Builds Toward Stability")).toBe(50);
    expect(without.get("Stays Socially Connected")).toBe(50);

    // A single freshly chosen path matching only "Builds Toward Stability"
    // must produce visible movement on the very next generation — not get
    // lost against the rest of the evidence.
    expect(with_.get("Builds Toward Stability")).toBe(62);
    expect(with_.get("Stays Socially Connected")).toBe(38);
    expect(with_.get("Builds Toward Stability")!).toBeGreaterThan(
      without.get("Builds Toward Stability")!,
    );
  });

  it("rewrites an 'Adjective Adjective Noun' archetype name into trajectory phrasing", async () => {
    runStructuredGenerationMock.mockClear();

    runStructuredGenerationMock.mockResolvedValueOnce({
      ok: true,
      data: [
        {
          name: "Disciplined Solo Builder",
          summary: "Repeated independent output across check-ins.",
          movement_direction: "positive",
          evidence_strength: "Moderate",
          benefits: ["Builds a track record of consistent output."],
          consequences: ["Burnout risk rises if rest stays secondary."],
          prediction: "Builds something real through sustained effort.",
          themes: ["Stability"],
          why_changed: "",
        },
      ],
    });

    const stub = createSupabaseStub({
      moments: { count: 10, data: null, error: null },
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

    // "Disciplined Solo Builder" matches Adjective+Adjective+Noun — it must be
    // rewritten, never reach storage verbatim, and the replacement must lead
    // with a trajectory verb derived from the draft's own theme (Stability).
    expect(insertedName).not.toBe("Disciplined Solo Builder");
    expect(insertedName).toBe("Creates more stability and structure");
  });

  it("rewrites an 'Adjective Noun' archetype name into trajectory phrasing", async () => {
    runStructuredGenerationMock.mockClear();

    runStructuredGenerationMock.mockResolvedValueOnce({
      ok: true,
      data: [
        {
          name: "Intentional Connector",
          summary: "Repeated choices to prioritize close relationships.",
          movement_direction: "positive",
          evidence_strength: "Emerging",
          benefits: ["Builds a reliable support network."],
          consequences: ["Less time for solo pursuits."],
          prediction: "Known for being there for the people closest to them.",
          themes: ["Connection"],
          why_changed: "",
        },
      ],
    });

    const stub = createSupabaseStub({
      moments: { count: 10, data: null, error: null },
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

    expect(insertedName).not.toBe("Intentional Connector");
    expect(insertedName).toBe("Builds closer connections with others");
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
          benefits: ["Builds a reliable support network."],
          consequences: ["Less time for solo pursuits."],
          prediction: "Known for showing up for the people closest to them.",
          themes: ["Belonging"],
          why_changed: "",
        },
      ],
    });

    const stub = createSupabaseStub({
      moments: { count: 10, data: null, error: null },
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

    // 9 words — over the limit even though it isn't an identity-label shape.
    expect(insertedName).toBe("Builds a stronger sense of belonging");
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
          benefits: ["Creates a clean break from limiting environments."],
          consequences: ["Existing relationships may weaken with distance."],
          prediction: "Built an adult life from scratch, deliberately.",
          themes: ["Growth"],
          why_changed: "",
        },
      ],
    });

    const stub = createSupabaseStub({
      moments: { count: 10, data: null, error: null },
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
          benefits: ["Builds a track record of consistent output."],
          consequences: ["Burnout risk rises if rest stays secondary."],
          prediction: "Builds something real through sustained effort.",
          themes: ["Independence", "Stability", "Courage"],
          why_changed: "",
        },
        {
          name: "Creates more stability and structure",
          summary: "A consistent preference for steady, predictable circumstances over open possibilities.",
          movement_direction: "positive",
          evidence_strength: "Moderate",
          benefits: ["Reduces exposure to unstable circumstances."],
          consequences: ["May close off worthwhile risks."],
          prediction: "Known for steady, predictable choices.",
          themes: ["Independence", "Stability"],
          why_changed: "",
        },
      ],
    });

    const stub = createSupabaseStub({
      moments: { count: 10, data: null, error: null },
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
          benefits: ["Builds confidence in self-direction."],
          consequences: ["May take on risk others would avoid."],
          prediction: "Known for choosing their own path.",
          themes: ["Independence", "Courage"],
          why_changed: "",
        },
        {
          name: "Creates stability before taking risks",
          summary: "A consistent pattern of securing footing before pursuing new growth.",
          movement_direction: "positive",
          evidence_strength: "Moderate",
          benefits: ["Reduces exposure to unstable circumstances."],
          consequences: ["Growth may be slower than it could be."],
          prediction: "Known for steady, deliberate growth.",
          themes: ["Stability", "Growth"],
          why_changed: "",
        },
      ],
    });

    const stub = createSupabaseStub({
      moments: { count: 10, data: null, error: null },
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
          benefits: ["Reduces exposure to unstable circumstances."],
          consequences: ["May close off worthwhile risks."],
          prediction: "Known for steady, predictable choices.",
          themes: ["Independence", "Stability", "Growth"],
          why_changed: "",
        },
        {
          name: "Builds toward steady independence and courage",
          summary: "Repeated choices that combine self-direction with a willingness to take risks.",
          movement_direction: "positive",
          evidence_strength: "Emerging",
          benefits: ["Builds confidence in self-direction."],
          consequences: ["May take on risk others would avoid."],
          prediction: "Known for choosing their own path.",
          themes: ["Independence", "Stability", "Courage"],
          why_changed: "",
        },
      ],
    });

    const stub = createSupabaseStub({
      moments: { count: 10, data: null, error: null },
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

  it("decays the chosen-path recency boost quickly as the same path ages", async () => {
    runStructuredGenerationMock.mockClear();

    const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const secondsAgo = (seconds: number) => new Date(Date.now() - seconds * 1000).toISOString();

    const drafts = [
      {
        name: "Builds Toward Stability",
        summary: "A consistent pull toward steady, predictable circumstances.",
        movement_direction: "positive",
        evidence_strength: "Moderate",
        benefits: ["Builds a dependable foundation."],
        consequences: ["May avoid worthwhile risks."],
        prediction: "Builds a life that rarely surprises them.",
        themes: ["Stability"],
        why_changed: "",
      },
      {
        name: "Stays Socially Connected",
        summary: "A consistent pull toward spending time with other people.",
        movement_direction: "positive",
        evidence_strength: "Moderate",
        benefits: ["Builds a support network."],
        consequences: ["Less solo time."],
        prediction: "Known for always making time for people.",
        themes: ["Connection"],
        why_changed: "",
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
        moments: { count: 10, data: null, error: null },
        paths: { data: [{ themes: ["Stability"], chosen_at: chosenAt }], error: null },
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

    // Freshly chosen: same as the dedicated "fresh path" test — 62/38.
    expect(justChosen.get("Builds Toward Stability")).toBe(62);
    expect(justChosen.get("Stays Socially Connected")).toBe(38);

    // The same path, 10 days later, still counts as the most recently chosen
    // path (no newer one exists) and still gets a boost — but the boost's
    // own 3-day half-life has decayed it to a small fraction of its original
    // size, so the split is far closer to even than the freshly-chosen case.
    expect(tenDaysOld.get("Builds Toward Stability")).toBe(52);
    expect(tenDaysOld.get("Stays Socially Connected")).toBe(48);
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
          benefits: ["Builds a dependable foundation."],
          consequences: ["May avoid worthwhile risks."],
          prediction: "Builds a life that rarely surprises them.",
          themes: ["Stability"],
          why_changed: "",
        },
        {
          name: "Stays Socially Connected",
          summary: "A consistent pull toward spending time with other people.",
          movement_direction: "positive",
          evidence_strength: "Moderate",
          benefits: ["Builds a support network."],
          consequences: ["Less solo time."],
          prediction: "Known for always making time for people.",
          themes: ["Connection"],
          why_changed: "",
        },
      ],
    });

    const stub = createSupabaseStub({
      moments: { count: 10, data: null, error: null },
      // The most recently chosen path is 35 days old — old enough that its
      // recency boost (3-day half-life) has decayed to a negligible amount,
      // even though it's still the single most recent chosen path on record.
      paths: { data: [{ themes: ["Stability"], chosen_at: daysAgo(35) }], error: null },
      // Two fresh check-ins confirming Connection, recorded today.
      check_ins: {
        data: [
          { theme_changes: [{ theme: "Connection", direction: "up" }], created_at: daysAgo(0) },
          { theme_changes: [{ theme: "Connection", direction: "up" }], created_at: daysAgo(0) },
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

  it("scales the recency boost by thematic overlap instead of gating it as all-or-nothing", async () => {
    runStructuredGenerationMock.mockClear();

    const secondsAgo = (seconds: number) => new Date(Date.now() - seconds * 1000).toISOString();

    // The chosen path's themes are [Stability, Independence, Courage] (3
    // themes). No identity updates or check-ins, so the only contribution to
    // each future's raw strength is the ordinary chosen-path base weight
    // (identical for all three, since they all share at least one theme —
    // that part is unchanged) plus the recency boost, now scaled by overlap
    // count / path theme count instead of a flat all-or-nothing bonus.
    runStructuredGenerationMock.mockResolvedValueOnce({
      ok: true,
      data: [
        {
          name: "Builds toward stability and independence",
          summary: "Saving consistently and turning down freelance gigs that don't pay reliably, in favor of a fixed schedule.",
          movement_direction: "positive",
          evidence_strength: "Moderate",
          benefits: ["Builds a financial cushion."],
          consequences: ["Fewer spontaneous opportunities."],
          prediction: "Builds a financially predictable life with few surprises.",
          themes: ["Independence", "Stability", "Courage"], // 3/3 overlap
          why_changed: "",
        },
        {
          name: "Chooses connection without losing independence",
          summary: "Joining a weekly board game group while keeping weekends free for personal projects.",
          movement_direction: "positive",
          evidence_strength: "Moderate",
          benefits: ["Builds a casual friend group."],
          consequences: ["Less unstructured downtime."],
          prediction: "Builds a circle of friends without giving up solo time.",
          themes: ["Connection", "Independence", "Courage"], // 2/3 overlap
          why_changed: "",
        },
        {
          name: "Creates room to grow at a steady pace",
          summary: "Taking on a stretch assignment at work but capping hours to avoid burnout.",
          movement_direction: "positive",
          evidence_strength: "Moderate",
          benefits: ["Builds new skills gradually."],
          consequences: ["Slower promotion timeline."],
          prediction: "Grows skills steadily without sacrificing rest.",
          themes: ["Growth", "Stability"], // 1/3 overlap
          why_changed: "",
        },
        {
          name: "Builds a close circle of belonging",
          summary: "Hosting monthly dinners with the same small group of friends for over a year.",
          movement_direction: "positive",
          evidence_strength: "Emerging",
          benefits: ["Builds deep, lasting friendships."],
          consequences: ["Smaller social circle overall."],
          prediction: "Known for a tight, loyal circle of friends.",
          themes: ["Connection", "Belonging"], // 0/3 overlap
          why_changed: "",
        },
      ],
    });

    const stub = createSupabaseStub({
      moments: { count: 10, data: null, error: null },
      paths: {
        data: [{ themes: ["Stability", "Independence", "Courage"], chosen_at: secondsAgo(1) }],
        error: null,
      },
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

    const fullOverlap = percentageByName.get("Builds toward stability and independence")!;
    const twoThirdsOverlap = percentageByName.get("Chooses connection without losing independence")!;
    const oneThirdOverlap = percentageByName.get("Creates room to grow at a steady pace")!;
    const noOverlap = percentageByName.get("Builds a close circle of belonging")!;

    // Full overlap (3/3) outranks partial overlap (2/3).
    expect(fullOverlap).toBeGreaterThan(twoThirdsOverlap);
    // Partial overlap (2/3) outranks lesser partial overlap (1/3).
    expect(twoThirdsOverlap).toBeGreaterThan(oneThirdOverlap);
    // Partial overlap (1/3) outranks no overlap at all.
    expect(oneThirdOverlap).toBeGreaterThan(noOverlap);

    // Exact values: raw strength is base(2) + base * 0.5 * overlap, i.e.
    // [2*1.5, 2*1.333, 2*1.167, 0] = [3, 2.667, 2.333, 0], normalized to 100.
    expect(fullOverlap).toBe(37);
    expect(twoThirdsOverlap).toBe(33);
    expect(oneThirdOverlap).toBe(29);
    expect(noOverlap).toBe(1);
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
          benefits: ["Builds a life on their own terms."],
          consequences: ["Existing relationships may weaken with distance."],
          prediction: "Builds an adult life from scratch, deliberately.",
          themes: ["Independence", "Growth"],
          why_changed: "",
        },
        {
          name: "Relocates and grows more isolated",
          summary: "Moving away from social ties without building new ones, drifting toward isolation.",
          movement_direction: "negative",
          evidence_strength: "Emerging",
          benefits: ["Avoids relationships that weren't working anyway."],
          consequences: ["Risks losing touch with everyone they know."],
          prediction: "Known for quietly drifting away after big changes.",
          themes: ["Independence", "Growth"],
          why_changed: "",
        },
      ],
    });

    const stub = createSupabaseStub({
      moments: { count: 10, data: null, error: null },
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
          benefits: ["Builds a dependable, self-directed foundation."],
          consequences: ["May avoid worthwhile risks."],
          prediction: "Builds a life that rarely surprises them.",
          themes: ["Independence", "Stability", "Growth"],
          why_changed: "",
        },
        {
          name: "Slowly withdraws into safety",
          summary: "A recurring pattern of avoiding anything that risks the current stability.",
          movement_direction: "negative",
          evidence_strength: "Emerging",
          benefits: ["Avoids short-term disruption."],
          consequences: ["May quietly abandon goals that require risk."],
          prediction: "Known for choosing safety even when it costs growth.",
          themes: ["Independence", "Stability", "Courage"],
          why_changed: "",
        },
      ],
    });

    const stub = createSupabaseStub({
      moments: { count: 10, data: null, error: null },
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
          benefits: ["Builds a life on their own terms."],
          consequences: ["Existing relationships may weaken with distance."],
          prediction: "Builds an adult life from scratch, deliberately.",
          themes: ["Independence", "Growth"],
          why_changed: "",
        },
        {
          name: "Relocates and grows more self-directed",
          summary: "Researching cities and choosing to move toward a more independent life.",
          movement_direction: "positive",
          evidence_strength: "Moderate",
          benefits: ["Builds confidence in self-direction."],
          consequences: ["Existing relationships may weaken with distance."],
          prediction: "Builds a life entirely on their own terms.",
          themes: ["Independence", "Growth"],
          why_changed: "",
        },
      ],
    });

    const stub = createSupabaseStub({
      moments: { count: 10, data: null, error: null },
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

  it("corrects an invalid legacy name on a continuity-matched future during update", async () => {
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
          benefits: ["Keeps the professional goal alive."],
          consequences: ["Energy is split across two priorities."],
          prediction: "Eventually lands in the field through sustained effort.",
          themes: ["Courage", "Stability", "Growth"],
          why_changed: "",
        },
      ],
    });

    const stub = createSupabaseStub({
      moments: { count: 10, data: null, error: null },
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

    // "Disciplined Solo Builder" is an Adjective+Adjective+Noun archetype
    // label — invalid. The update must correct it using the same
    // rewriteFutureSelfName() fallback as insert, keyed off the draft's
    // themes (Courage first), not silently keep writing the legacy name.
    expect(updatedName).not.toBe("Disciplined Solo Builder");
    expect(updatedName).toBe("Trades comfort for courage");
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
          benefits: ["Builds a dependable foundation."],
          consequences: ["May avoid worthwhile risks."],
          prediction: "Builds a life that rarely surprises them.",
          themes: ["Stability", "Independence"],
          why_changed: "",
        },
      ],
    });

    const stub = createSupabaseStub({
      moments: { count: 10, data: null, error: null },
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

  it("still preserves continuity (baseline percentage) when correcting an invalid legacy name", async () => {
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
          benefits: ["Keeps the professional goal alive."],
          consequences: ["Energy is split across two priorities."],
          prediction: "Eventually lands in the field through sustained effort.",
          themes: ["Courage", "Stability", "Growth"],
          why_changed: "",
        },
      ],
    });

    const stub = createSupabaseStub({
      moments: { count: 10, data: null, error: null },
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
    // baseline percentage still carries forward as previous_percentage —
    // identical continuity behavior, just with a corrected name attached.
    const insertCalls = stub.calls.filter(
      (c) => c.table === "future_selves" && c.method === "insert",
    );
    expect(insertCalls).toHaveLength(0);
    expect(matchedId).toBe("legacy-2");
    expect(payload?.previous_percentage).toBe(31);
    expect(payload?.name).toBe("Trades comfort for courage");
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
          benefits: [
            "Financial pressure eases while the longer-term career search stays alive",
            "A city move could open networks and roles that aren't available locally",
            "Acting under uncertainty may build a track record of following through",
            "Independence from a single employer or location increases options over time",
          ],
          consequences: [
            "Splitting energy between an interim job and a psychology search could leave both feeling half-done",
            "Relocating without an established network means building from scratch socially and professionally",
            "Financial stability from a stopgap role may reduce urgency to keep the psychology search moving",
            "Repeated short-term jobs before landing a psychology role could create a resume pattern that's hard to explain",
          ],
          prediction: "You may become someone who built a career and a life in a new place through a series of unglamorous interim steps — but the question is whether the psychology goal stays on the calendar or quietly gets deferred each time the interim job gets comfortable.",
          themes: ["Independence", "Stability", "Courage"],
          why_changed: "",
        },
        {
          name: "Disciplined Solo Builder",
          summary: "Setting a specific weekly application target even while working an unrelated role signals that the psychology path hasn't been abandoned — it's being protected. This is a pattern of keeping a professional goal alive under financial pressure.",
          movement_direction: "positive",
          evidence_strength: "Moderate",
          benefits: [
            "Consistent applications maintain momentum and market awareness even during a gap",
            "Landing a psychology role after a difficult stretch may create a stronger professional identity",
            "Separating financial survival from career direction keeps both manageable",
            "A clear weekly target makes the goal measurable, not just aspirational",
          ],
          consequences: [
            "Working a non-psychology job while applying could stretch energy thin over months",
            "If the interim role becomes comfortable, the weekly target may quietly slip",
            "Rejection during an already stressful financial period could compound pressure",
            "The gap between graduation and a psychology role may require explanation in future interviews",
          ],
          prediction: "You may become someone who eventually lands in psychology not because the path was smooth, but because you kept applying through the months when it would have been easier to stop — the risk is that the target becomes a ritual rather than a real priority.",
          themes: ["Courage", "Stability", "Growth"],
          why_changed: "",
        },
      ],
    });

    const stub = createSupabaseStub({
      moments: { count: 10, data: null, error: null },
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
          benefits: ["Financial pressure eases while the longer-term career search stays alive", "A city move could open networks and roles that aren't available locally"],
          consequences: ["Splitting energy between an interim job and a psychology search could leave both feeling half-done", "Relocating without an established network means building from scratch socially and professionally"],
          prediction: "You may become someone who built a career and a life in a new place through a series of unglamorous interim steps — but the question is whether the psychology goal stays on the calendar or quietly gets deferred each time the interim job gets comfortable.",
          themes: ["Independence", "Stability", "Courage"],
          why_changed: "",
        },
        {
          name: "Selectively Reconnecting",
          summary: "Despite a strong pull toward independence, repeated choices to show up socially — balancing a hangout with work, engaging in more extroverted activities — suggest connection is being chosen deliberately rather than avoided.",
          movement_direction: "positive",
          evidence_strength: "Moderate",
          benefits: ["A small, chosen social circle could provide support during a financially and professionally uncertain period", "Showing up selectively may preserve energy while still maintaining meaningful relationships"],
          consequences: ["Selective connection can drift into isolation if the bar for showing up keeps rising", "Relocation could reset relationships that took effort to build"],
          prediction: "You may become someone with a small but reliable circle — people chosen carefully rather than accumulated — but the cost is that in lean periods, that circle may not be large enough to catch you.",
          themes: ["Connection", "Independence", "Courage"],
          why_changed: "",
        },
      ],
    });

    const stub = createSupabaseStub({
      moments: { count: 10, data: null, error: null },
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
          benefits: ["Builds confidence in personal judgment", "Creates space for a fresh routine"],
          consequences: ["Existing relationships may fade with distance", "Fewer built-in social safety nets"],
          prediction: "Builds a life that feels chosen rather than inherited, shaped by distance from old expectations.",
          themes: ["Independence", "Courage"],
          why_changed: "",
        },
        {
          name: "Becomes isolated after relocating",
          summary: "Moving to a new city and building a self-directed routine, but withdrawing from old social patterns and avoiding new ones forming.",
          movement_direction: "negative",
          evidence_strength: "Emerging",
          benefits: ["Avoids relationships that weren't working anyway"],
          consequences: ["Risks losing touch with everyone from before", "Loneliness may compound over time"],
          prediction: "Becomes someone who drifts through a new city without forming real ties, mistaking distance for independence.",
          themes: ["Independence", "Courage"],
          why_changed: "",
        },
      ],
    });

    const stub = createSupabaseStub({
      moments: { count: 10, data: null, error: null },
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
