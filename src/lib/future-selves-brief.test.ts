import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildUserPrompt,
  buildUserPromptFromBrief,
  explainIdentitiesFromBrief,
} from "@/lib/ai/explain-identity";
import { buildIdentityBrief } from "@/lib/identity-brief";
import { getIdentityById } from "@/lib/identity-library";
import { recognizeIdentitiesWithAttribution } from "@/lib/identity-recognition";

vi.mock("@/lib/current-self", () => ({
  requestCurrentSelfRegeneration: vi.fn(),
}));

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

const { generateFutureSelves, MAX_FUTURE_SELVES } = await import(
  "@/lib/future-selves"
);
const { getFutureSelvesEngine, selectFuturesFromBrief } = await import(
  "@/lib/future-selves-brief"
);

// ---------------------------------------------------------------------------
// Supabase stub (same shape as future-selves.test.ts)
// ---------------------------------------------------------------------------

type TableResponse = { data?: unknown; error?: unknown };
type TableConfig = TableResponse | TableResponse[];
type TrackedCall = { table: string; method: string; args: unknown[] };

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
    const builder: Record<string, unknown> = {};
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
    builder.then = (resolve: (v: unknown) => unknown, reject?: (r: unknown) => unknown) =>
      Promise.resolve(resolveFor(table)).then(resolve, reject);

    return builder;
  }

  const client = {
    from: (table: string) => makeBuilder(table),
    rpc: async (name: string) => ({
      data: name === "acquire_future_selves_lock" ? true : null,
      error: null,
    }),
    auth: {
      getUser: async () => ({ data: { user: { id: userId } }, error: null }),
    },
  };

  return { client, calls };
}

async function stubClient(configs: Record<string, TableConfig>) {
  const stub = createSupabaseStub(configs);
  setActiveStub(stub);
  const { createClient } = await import("@/lib/supabase/server");
  return { stub, supabase: await createClient() };
}

// ---------------------------------------------------------------------------
// Persona: 40 observations, 8 signals, 8 situations, 3 sources — enough
// evidence that recognition grounds several identities above threshold.
// ---------------------------------------------------------------------------

const NEWEST = Date.parse("2026-01-01T00:00:00.000Z");
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const PERSONA_SIGNALS = [
  "chooses_solo_path",
  "starts_something_new",
  "takes_uncertain_risk",
  "journals_or_reflects",
  "asks_for_help",
  "maintains_commitment",
  "returns_after_setback",
  "creates_original_work",
] as const;

function personaRows() {
  const sources = ["situation_complete", "check_in", "reflection_answer"];
  return Array.from({ length: 40 }, (_, i) => ({
    id: `obs-${String(i).padStart(3, "0")}`,
    moment_id: `m${i % 8}`,
    observation: `Kept choosing the same kind of path in situation ${i % 8}.`,
    signals: [PERSONA_SIGNALS[i % PERSONA_SIGNALS.length]],
    source_type: sources[i % 3],
    extracted_at: new Date(NEWEST - (40 - i) * 12 * MS_PER_DAY).toISOString(),
  }));
}

function personaObservations() {
  return personaRows().map((row) => ({
    id: row.id,
    observation: row.observation,
    signals: row.signals as unknown as string[],
    momentId: row.moment_id,
    momentTitle: `Situation ${row.moment_id}`,
    extractedAt: row.extracted_at,
  }));
}

const MOMENT_TITLES = Array.from({ length: 8 }, (_, i) => ({
  id: `m${i}`,
  title: `Situation m${i}`,
}));

// ---------------------------------------------------------------------------
// Engine flag
// ---------------------------------------------------------------------------

describe("getFutureSelvesEngine", () => {
  const original = process.env.FUTURE_SELVES_ENGINE;

  afterEach(() => {
    if (original === undefined) delete process.env.FUTURE_SELVES_ENGINE;
    else process.env.FUTURE_SELVES_ENGINE = original;
  });

  it("defaults to the brief engine", () => {
    delete process.env.FUTURE_SELVES_ENGINE;
    expect(getFutureSelvesEngine()).toBe("brief");
  });

  it("reverts to legacy when configured", () => {
    process.env.FUTURE_SELVES_ENGINE = "legacy";
    expect(getFutureSelvesEngine()).toBe("legacy");
  });

  it("throws on an unrecognized value", () => {
    process.env.FUTURE_SELVES_ENGINE = "breif";
    expect(() => getFutureSelvesEngine()).toThrow(/Invalid FUTURE_SELVES_ENGINE/);
  });
});

// ---------------------------------------------------------------------------
// selectFuturesFromBrief
// ---------------------------------------------------------------------------

describe("selectFuturesFromBrief", () => {
  it("reports an empty ledger", async () => {
    const { supabase } = await stubClient({
      behavior_observations: { data: [], error: null },
    });

    const selection = await selectFuturesFromBrief({
      supabase,
      userId: "user-1",
      maxCount: MAX_FUTURE_SELVES,
    });

    expect(selection.kind).toBe("empty");
  });

  it("falls back when the ledger cannot be read", async () => {
    const { supabase } = await stubClient({
      behavior_observations: { data: null, error: { message: "boom" } },
    });

    const selection = await selectFuturesFromBrief({
      supabase,
      userId: "user-1",
      maxCount: MAX_FUTURE_SELVES,
    });

    expect(selection).toEqual({ kind: "fallback", reason: "brief_unavailable" });
  });

  it("falls back below the three-future minimum (sub-threshold accounts stay on legacy)", async () => {
    // One weak observation: at most one identity clears the ranking threshold.
    const { supabase } = await stubClient({
      behavior_observations: {
        data: [personaRows()[0]],
        error: null,
      },
    });

    const selection = await selectFuturesFromBrief({
      supabase,
      userId: "user-1",
      maxCount: MAX_FUTURE_SELVES,
    });

    expect(selection.kind).toBe("fallback");
  });

  it("normalizes the brief's ranked futures with presentation titles and grouped situations", async () => {
    const { supabase } = await stubClient({
      behavior_observations: { data: personaRows(), error: null },
      moments: { data: MOMENT_TITLES, error: null },
    });

    const selection = await selectFuturesFromBrief({
      supabase,
      userId: "user-1",
      maxCount: MAX_FUTURE_SELVES,
    });

    expect(selection.kind).toBe("ok");
    if (selection.kind !== "ok") return;

    expect(selection.recognized.length).toBeGreaterThanOrEqual(2);
    expect(selection.recognized.length).toBeLessThanOrEqual(5);

    for (const [index, input] of selection.recognized.entries()) {
      const future = selection.brief.rankedFutures[index];

      // Numbers come from the brief verbatim — never recomputed.
      expect(input.identityId).toBe(future.identityId);
      expect(input.likelihood).toBe(future.likelihood);
      expect(input.confidence).toBe(future.confidence);
      expect(input.dimensionBreakdown).toEqual(future.supportingDimensions);
      expect(input.narrative.kind).toBe("brief");

      // Evidence carries display titles from the presentation lookup.
      for (const observation of input.supportingObservations) {
        expect(observation.momentTitle).toBe(`Situation ${observation.momentId}`);
        expect(observation.observationText.length).toBeGreaterThan(0);
      }

      // Situation grouping: counts add up to the evidence it groups.
      const grouped = input.supportingSituations.reduce(
        (sum, situation) => sum + situation.observationCount,
        0,
      );
      expect(grouped).toBe(input.supportingObservations.length);
    }
  });
});

// ---------------------------------------------------------------------------
// Brief-mode narrative prompt
// ---------------------------------------------------------------------------

describe("explainIdentitiesFromBrief — prompt construction", () => {
  function briefEntries() {
    const brief = buildIdentityBrief(
      personaRows().map((row) => ({
        id: row.id,
        observation: row.observation,
        signals: row.signals as unknown as string[],
        momentId: row.moment_id,
        sourceType: row.source_type,
        extractedAt: row.extracted_at,
      })),
    );

    return brief.rankedFutures.flatMap((future) => {
      const profile = getIdentityById(future.identityId);
      return profile ? [{ profile, future }] : [];
    });
  }

  it("contains recognition numbers, evidence texts, and breadth counts — but no situation titles", () => {
    const entries = briefEntries();
    expect(entries.length).toBeGreaterThan(0);

    const prompt = buildUserPromptFromBrief(entries);

    expect(prompt).toContain("Recognition data");
    expect(prompt).toContain("Pattern breadth: observed across");
    expect(prompt).toContain("Kept choosing the same kind of path");
    // The legacy prompt attributes evidence to situations; the brief prompt
    // must not (the brief never inspects moments).
    expect(prompt).not.toContain("(from:");
    expect(prompt).not.toContain("Supporting situations where this pattern was observed");
  });

  it("is smaller than the legacy prompt for the same identities", () => {
    const observations = personaObservations();
    const matches = recognizeIdentitiesWithAttribution(observations);
    const legacyEntries = matches.flatMap((match) => {
      const profile = getIdentityById(match.identityId);
      return profile ? [{ profile, match }] : [];
    });

    const legacyPrompt = buildUserPrompt(legacyEntries);
    const briefPrompt = buildUserPromptFromBrief(briefEntries());

    expect(briefPrompt.length).toBeLessThan(legacyPrompt.length);
  });

  it("returns tier-appropriate fallbacks per entry in mock mode (no API key path)", async () => {
    const entries = briefEntries();
    const results = await explainIdentitiesFromBrief(entries);

    expect(results).toHaveLength(entries.length);
    for (const [index, result] of results.entries()) {
      expect(result.identityId).toBe(entries[index].future.identityId);
      expect(result.source).toBe("fallback");
      expect(result.explanation.why_emerging.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// generateFutureSelves — brief mode end to end (mock provider)
// ---------------------------------------------------------------------------

describe("generateFutureSelves — brief mode", () => {
  const original = process.env.FUTURE_SELVES_ENGINE;

  afterEach(() => {
    if (original === undefined) delete process.env.FUTURE_SELVES_ENGINE;
    else process.env.FUTURE_SELVES_ENGINE = original;
  });

  it("persists brief-selected futures without calling recognition or reading raw observations twice", async () => {
    process.env.FUTURE_SELVES_ENGINE = "brief";

    const createdRow = {
      id: "fs-created",
      user_id: "user-1",
      name: "Created",
      status: "active",
      percentage: 40,
      identity_id: "created",
    };
    const { stub } = await stubClient({
      behavior_observations: { data: personaRows(), error: null },
      moments: { data: MOMENT_TITLES, error: null },
      future_selves: [
        { data: [], error: null }, // load existing
        { data: createdRow, error: null }, // every INSERT .single()
      ],
      future_self_events: { error: null },
    });

    const result = await generateFutureSelves();
    expect("error" in result).toBe(false);

    const inserts = stub.calls.filter(
      (c) => c.table === "future_selves" && c.method === "insert",
    );
    expect(inserts.length).toBeGreaterThanOrEqual(2);

    for (const insert of inserts) {
      const payload = insert.args[0] as Record<string, unknown>;
      expect(payload.identity_id).toBeTruthy();
      expect(payload.status).toBe("active");

      // UI contract: persisted situations carry display titles.
      const situations = payload.supporting_situations as Array<Record<string, unknown>>;
      expect(situations.length).toBeGreaterThan(0);
      for (const situation of situations) {
        expect(String(situation.momentTitle)).toMatch(/^Situation m\d$/);
      }

      // behavioral_evidence carries the brief's observation texts verbatim.
      const evidence = payload.behavioral_evidence as string[];
      expect(evidence.length).toBeGreaterThan(0);
      expect(evidence[0]).toContain("Kept choosing the same kind of path");
    }

    // The consumer read the ledger exactly once (via the shared brief
    // accessor) — the legacy observation load (joined with moments(title))
    // never ran.
    const observationReads = stub.calls.filter(
      (c) => c.table === "behavior_observations" && c.method === "select",
    );
    expect(observationReads).toHaveLength(1);
    expect(String(observationReads[0].args[0])).not.toContain("moments(title)");
  });

  it("legacy env flag routes the same account through the legacy pipeline", async () => {
    process.env.FUTURE_SELVES_ENGINE = "legacy";

    const createdRow = {
      id: "fs-created",
      user_id: "user-1",
      name: "Created",
      status: "active",
      percentage: 40,
      identity_id: "created",
    };
    const { stub } = await stubClient({
      behavior_observations: { data: personaRows(), error: null },
      moments: { data: MOMENT_TITLES, error: null },
      future_selves: [
        { data: [], error: null },
        { data: createdRow, error: null },
      ],
      future_self_events: { error: null },
    });

    const result = await generateFutureSelves();
    expect("error" in result).toBe(false);

    // Legacy mode loads observations with the moments(title) join.
    const observationReads = stub.calls.filter(
      (c) => c.table === "behavior_observations" && c.method === "select",
    );
    expect(observationReads).toHaveLength(1);
    expect(String(observationReads[0].args[0])).toContain("moments(title)");
  });
});
