import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import {
  identityBearing,
  layoutBranches,
  RENDER_H,
  RENDER_W,
  TERRITORY,
  VIEW_CENTER,
  VIEW_H,
  VIEW_W,
} from "@/components/futures/branch-language";
import type { FutureSelf } from "@/types/database";

// BranchMap calls useRouter at render time; outside a running Next app there
// is no router context, so provide an inert one.
vi.mock("next/navigation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/navigation")>();
  return {
    ...actual,
    useRouter: () => ({
      push: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
    }),
  };
});

const { FuturePathsCard } = await import("@/components/overview/future-paths-card");
const { FutureSelvesExplorer } = await import("@/components/futures/future-selves-explorer");

function makeFuture(overrides: Partial<FutureSelf>): FutureSelf {
  return {
    id: "fs-1",
    user_id: "u-1",
    name: "The Steady Builder",
    summary: "Builds durable things slowly.",
    percentage: 24,
    previous_percentage: 18,
    evidence_strength: "emerging" as FutureSelf["evidence_strength"],
    core_behaviors: ["Ships weekly"],
    behavioral_evidence: ["Finished the migration"],
    growth_opportunities: [],
    blind_spots: ["May over-invest in process"],
    likely_evolution: "Becomes someone who finishes.",
    themes: [],
    why_emerging: "Recent consistency",
    status: "active" as FutureSelf["status"],
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    identity_id: "the-craftsman",
    confidence: 0.6,
    dimension_breakdown: null,
    supporting_observations: null,
    supporting_situations: null,
    opposing_observations: null,
    narrative_source: "ai",
    narrative_evidence_strength: null,
    ...overrides,
  };
}

const futures = [
  makeFuture({ id: "a", identity_id: "the-craftsman", name: "The Sure Hand", percentage: 24 }),
  makeFuture({ id: "b", identity_id: "the-explorer", name: "The Threshold Crosser", percentage: 12 }),
  makeFuture({ id: "c", identity_id: "the-connector", name: "The Bridge Builder", percentage: 31 }),
];

// Rendered-space helper: distances are judged in the canonical rendered
// composition, not in the vertically-squashed view space.
const SCALE_X = RENDER_W / VIEW_W;
const SCALE_Y = RENDER_H / VIEW_H;

function renderedGap(a: readonly [number, number], b: readonly [number, number]): number {
  return Math.hypot((a[0] - b[0]) * SCALE_X, (a[1] - b[1]) * SCALE_Y);
}

function angularGap(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return Math.min(d, 360 - d);
}

// Every branch curve starts at the shared view center, so this pulls exactly
// the branch geometry out of a rendered page — nothing else matches.
const CENTER_PREFIX = `M ${VIEW_CENTER[0].toFixed(1)} ${VIEW_CENTER[1].toFixed(1)}`;
const BRANCH_PATH_PATTERN = new RegExp(
  `d="${CENTER_PREFIX.replace(/\./g, "\\.")}[^"]*"`,
  "g",
);

function branchPaths(html: string): string[] {
  return (html.match(BRANCH_PATH_PATTERN) ?? []).sort();
}

/** Parses the endpoint of a quadratic path "M x y Q cx cy ex ey". */
function pathEndpoint(d: string): [number, number] {
  const nums = d.match(/-?[\d.]+/g)!.map(Number);
  return [nums[4], nums[5]];
}

function endpointPositions(html: string): string[] {
  return (html.match(/left:\s*[\d.]+%;\s*top:\s*[\d.]+%/g) ?? []).sort();
}

function accentStrokes(html: string): string[] {
  return (html.match(/stroke="#(?:3b82f6|10b981|f59e0b|f43f5e|8b5cf6)"/g) ?? []).sort();
}

describe("Overview and Future Selves render one canonical layout", () => {
  const overviewHtml = renderToString(createElement(FuturePathsCard, { futureSelves: futures }));
  const explorerHtml = renderToString(createElement(FutureSelvesExplorer, { futureSelves: futures }));

  it("draws identical branch geometry (angles, curvature, sides)", () => {
    const paths = branchPaths(overviewHtml);
    expect(paths.length).toBeGreaterThan(0);
    expect(branchPaths(explorerHtml)).toEqual(paths);
  });

  it("renders growth as real sub-paths — dash rendering is banned", () => {
    // Dash-drawn "growth" is browser- and transform-dependent (Chromium
    // dashes non-scaling-stroke paths in screen space, displacing the branch
    // end from the node by up to ±38px). Growth must live in the path data.
    expect(overviewHtml).not.toContain("stroke-dasharray");
    expect(explorerHtml).not.toContain("stroke-dasharray");
    // And the renderer really strokes the model's exact split sub-paths.
    for (const b of layoutBranches(futures)) {
      const grown = `d="${b.curve.segmentD(b.reach)}"`;
      expect(overviewHtml).toContain(grown);
      expect(explorerHtml).toContain(grown);
    }
  });

  it("locks both pages to the canonical rendered aspect ratio", () => {
    const aspect = new RegExp(`aspect-ratio:\\s*${RENDER_W}\\s*/\\s*${RENDER_H}`);
    expect(overviewHtml).toMatch(aspect);
    expect(explorerHtml).toMatch(aspect);
  });

  it("terminates every branch exactly at its node center", () => {
    for (const b of layoutBranches(futures)) {
      const [ex, ey] = pathEndpoint(b.curve.segmentD(b.reach));
      // segmentD formats to one decimal; the split itself is exact.
      expect(Math.abs(ex - b.tip[0])).toBeLessThanOrEqual(0.05);
      expect(Math.abs(ey - b.tip[1])).toBeLessThanOrEqual(0.05);
      // The unformatted split endpoint IS pointAt(reach).
      expect(b.curve.pointAt(b.reach)).toEqual(b.tip);
    }
  });

  it("places endpoint nodes identically", () => {
    const positions = endpointPositions(overviewHtml);
    expect(positions.length).toBe(futures.length);
    expect(endpointPositions(explorerHtml)).toEqual(positions);
  });

  it("colors branches identically", () => {
    expect(accentStrokes(explorerHtml)).toEqual(accentStrokes(overviewHtml));
  });

  it("labels every future identically on both surfaces", () => {
    for (const f of futures) {
      expect(overviewHtml).toContain(f.name);
      expect(explorerHtml).toContain(f.name);
    }
  });
});

describe("the canonical composition is the Overview's original design", () => {
  // The Overview (Home) card is the product's visual source of truth; the
  // dedicated page is an enlargement of it, never the other way around.
  // These pins encode the authored 800×440 space and the full-width × 260px
  // chart box (966×260 at the 1120px shell). If a refactor changes these
  // numbers, it has changed the product's design — that is a bug, not a
  // cleanup.

  it("keeps the Overview's authored space and rendered chart shape", () => {
    expect([VIEW_W, VIEW_H]).toEqual([800, 440]);
    expect(RENDER_W / RENDER_H).toBeCloseTo(966 / 260, 10);
  });
});

describe("composed stage casting", () => {
  // The layout is a composition, not a solver: authored stages define
  // stations with roles; the data casts them. These tests pin the CASTING
  // rules and the stage-library invariants, never exact coordinates — the
  // stages are design, adjusted by eye on the rendered card.

  // Ranks: guardian (protagonist), explorer (challenger); of the remaining
  // three, scholar↔craftsman are the most kindred pair on the compass
  // (17° apart), leaving builder as the outlier.
  const five = [
    makeFuture({ id: "g", identity_id: "the-guardian", name: "The Promise Keeper", percentage: 30 }),
    makeFuture({ id: "e", identity_id: "the-explorer", name: "The Threshold Crosser", percentage: 25 }),
    makeFuture({ id: "s", identity_id: "the-scholar", name: "The Quiet Authority", percentage: 18 }),
    makeFuture({ id: "c", identity_id: "the-craftsman", name: "The Sure Hand", percentage: 15 }),
    makeFuture({ id: "b", identity_id: "the-builder", name: "The Self-Reliant Builder", percentage: 12 }),
  ];

  it("casts roles from likelihood rank and compass similarity", () => {
    const placed = layoutBranches(five);
    const roleOf = (id: string) => placed.find((b) => b.futureSelf.id === id)!.role;
    expect(roleOf("g")).toBe("protagonist");
    expect(roleOf("e")).toBe("challenger");
    expect([roleOf("s"), roleOf("c")].sort()).toEqual(["kin-a", "kin-b"]);
    expect(roleOf("b")).toBe("outlier");
  });

  it("keeps the kin pair reading as a pair, inside the territory contract", () => {
    // The one tension the old solver forbade: two kindred lives standing
    // deliberately near. Under the territory system, "near" is a BAND, not
    // a strict minimum: the kin gap stays within [minKinGap, maxKinGap] —
    // recognizably a pair, never a blur — while every pair on stage
    // (kin included) honors its territory floor. Exhaustive sweeps across
    // all likelihood combinations live in stage-territory.test.ts.
    const placed = layoutBranches(five);
    const byRole = (role: string) => placed.find((b) => b.role === role)!;
    const kinGap = renderedGap(byRole("kin-a").tip, byRole("kin-b").tip);
    expect(kinGap).toBeGreaterThanOrEqual(TERRITORY.minKinGap);
    expect(kinGap).toBeLessThanOrEqual(TERRITORY.maxKinGap);
    for (let i = 0; i < placed.length; i++) {
      for (let j = i + 1; j < placed.length; j++) {
        const gap = renderedGap(placed[i].tip, placed[j].tip);
        const kinPair =
          [placed[i].role, placed[j].role].sort().join("+") === "kin-a+kin-b";
        expect(gap).toBeGreaterThanOrEqual(
          kinPair ? TERRITORY.minKinGap : TERRITORY.minPairGap,
        );
      }
    }
  });

  it("tiers reach by role: the protagonist stands farthest, the challenger second", () => {
    // Distance is hierarchy. At EQUAL likelihoods (equal arrival), tip
    // distance from You is decided purely by the authored stations — and
    // the stations must place the two strongest roles on the two longest
    // reaches, with clear air between the tiers.
    const equal = five.map((f) => ({ ...f, percentage: 20 }));
    const placed = layoutBranches(equal);
    const distance = (role: string) =>
      renderedGap(
        placed.find((b) => b.role === role)!.tip,
        VIEW_CENTER,
      );
    const protagonist = distance("protagonist");
    const challenger = distance("challenger");
    const supporting = ["kin-a", "kin-b", "outlier"].map(distance);
    expect(protagonist).toBeGreaterThan(challenger * 1.15);
    for (const s of supporting) {
      expect(challenger).toBeGreaterThan(s);
    }
  });

  it("mirrors the stage to follow the protagonist's compass hemisphere", () => {
    // The mentor's compass leans left (bearing ≈ 149°); the builder's leans
    // right (≈ 342°). Whoever leads pulls the whole stage to their side.
    const mentorLed = layoutBranches([
      makeFuture({ id: "m", identity_id: "the-mentor", percentage: 40 }),
      makeFuture({ id: "b", identity_id: "the-builder", percentage: 20 }),
    ]);
    const builderLed = layoutBranches([
      makeFuture({ id: "m", identity_id: "the-mentor", percentage: 20 }),
      makeFuture({ id: "b", identity_id: "the-builder", percentage: 40 }),
    ]);
    const protagonistTip = (placed: typeof mentorLed) =>
      placed.find((p) => p.role === "protagonist")!.tip;
    expect(protagonistTip(mentorLed)[0]).toBeLessThan(VIEW_CENTER[0]);
    expect(protagonistTip(builderLed)[0]).toBeGreaterThan(VIEW_CENTER[0]);
  });

  it("always produces the identical layout for the same identity state", () => {
    const first = layoutBranches(five);
    const second = layoutBranches(five.map((f) => ({ ...f })));
    expect(second.map((b) => b.curve.d)).toEqual(first.map((b) => b.curve.d));
    expect(second.map((b) => b.tip)).toEqual(first.map((b) => b.tip));
    expect(second.map((b) => b.role)).toEqual(first.map((b) => b.role));
    expect(second.map((b) => b.labelStyle)).toEqual(first.map((b) => b.labelStyle));
  });

  it("derives kinship from the identity compass", () => {
    const craftsman = makeFuture({ id: "a", identity_id: "the-craftsman" });
    const scholar = makeFuture({ id: "b", identity_id: "the-scholar" });
    const explorer = makeFuture({ id: "c", identity_id: "the-explorer" });
    const guardian = makeFuture({ id: "d", identity_id: "the-guardian" });
    // Deep-mastery lives are neighbors; a rooted life and a roaming life
    // face away from each other.
    expect(angularGap(identityBearing(craftsman), identityBearing(scholar))).toBeLessThan(60);
    expect(
      angularGap(identityBearing(guardian), identityBearing(explorer)),
    ).toBeGreaterThan(120);
  });

  it("gives heavier futures more visual weight", () => {
    const placed = layoutBranches(futures);
    const byPct = [...placed].sort((a, b) => a.pct - b.pct);
    for (let i = 1; i < byPct.length; i++) {
      expect(byPct[i].weight).toBeGreaterThan(byPct[i - 1].weight);
    }
  });

  it("gives rows without library identities a stable deterministic home", () => {
    // A retired identity id with a persisted dimension breakdown steers by
    // that breakdown; Reflection alone points at Reflection's bearing.
    const legacyWithBreakdown = makeFuture({
      id: "a",
      identity_id: "steady-foundation-builder",
      dimension_breakdown: [{ dimension: "Reflection", identityWeight: 1 }],
    });
    expect(identityBearing(legacyWithBreakdown)).toBeCloseTo(180, 6);

    // No identity data at all: a stable hash — arbitrary but identical
    // forever, never random.
    const bare = makeFuture({ id: "b", identity_id: null, name: "The Legacy Path" });
    const bearing = identityBearing(bare);
    expect(bearing).toBeGreaterThanOrEqual(0);
    expect(bearing).toBeLessThan(360);
    expect(identityBearing({ ...bare })).toBe(bearing);
  });
});

describe("stage memory", () => {
  const base = [
    makeFuture({ id: "a", identity_id: "the-guardian", name: "The Promise Keeper", percentage: 40 }),
    makeFuture({ id: "b", identity_id: "the-explorer", name: "The Threshold Crosser", percentage: 25 }),
    makeFuture({ id: "c", identity_id: "the-creator", name: "The Original Voice", percentage: 12 }),
  ];

  it("advances a future along its own approach when likelihood grows within the same cast", () => {
    const before = layoutBranches(base);
    const after = layoutBranches(
      base.map((f) => (f.id === "b" ? { ...f, percentage: 30 } : f)),
    );

    const beforeB = before.find((p) => p.futureSelf.id === "b")!;
    const afterB = after.find((p) => p.futureSelf.id === "b")!;
    // Same station: same curve, same role, same color, same label…
    expect(afterB.curve.d).toBe(beforeB.curve.d);
    expect(afterB.role).toBe(beforeB.role);
    expect(afterB.accent).toBe(beforeB.accent);
    expect(afterB.labelStyle).toEqual(beforeB.labelStyle);
    // …but further arrived along that approach.
    expect(afterB.reach).toBeGreaterThan(beforeB.reach);
    // And nothing else moved at all.
    for (const p of before) {
      if (p.futureSelf.id === "b") continue;
      const same = after.find((x) => x.futureSelf.id === p.futureSelf.id)!;
      expect(same.curve.d).toBe(p.curve.d);
      expect(same.tip).toEqual(p.tip);
    }
  });

  it("recasts the scene when the leading future changes", () => {
    // A rank change is a scene change, not a drift: the new leader takes
    // the protagonist station and the map visibly recomposes.
    const overtaken = layoutBranches(
      base.map((f) => (f.id === "b" ? { ...f, percentage: 55 } : f)),
    );
    const roleOf = (id: string) =>
      overtaken.find((p) => p.futureSelf.id === id)!.role;
    expect(roleOf("b")).toBe("protagonist");
    expect(roleOf("a")).toBe("challenger");
  });

  it("is independent of the order futures arrive in", () => {
    const reversed = layoutBranches([...base].reverse());
    const forward = layoutBranches(base);
    expect(reversed.map((b) => b.futureSelf.id)).toEqual(forward.map((b) => b.futureSelf.id));
    expect(reversed.map((b) => b.curve.d)).toEqual(forward.map((b) => b.curve.d));
    expect(reversed.map((b) => b.role)).toEqual(forward.map((b) => b.role));
  });
});
