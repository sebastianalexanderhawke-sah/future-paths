import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import {
  layoutBranches,
  RENDER_H,
  RENDER_W,
  VIEW_CENTER,
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
    identity_id: "steady-foundation-builder",
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
  makeFuture({ id: "a", identity_id: "steady-foundation-builder", name: "The Steady Builder", percentage: 24 }),
  makeFuture({ id: "b", identity_id: "adaptive-explorer", name: "The Explorer", percentage: 12 }),
  makeFuture({ id: "c", identity_id: "community-weaver", name: "The Weaver", percentage: 31 }),
];

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
  return (html.match(/stroke="#(?:6366f1|22c55e|ef4444|3b82f6|f59e0b)"/g) ?? []).sort();
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
    // preserveAspectRatio="none" + a page-chosen box shape is what let
    // rendered angles diverge (measured 41.1° vs 58.0° for the same
    // branch). Both chart areas must carry the SAME canonical aspect ratio
    // — the Overview composition — so the viewBox→viewport map is identical
    // everywhere and other surfaces are pure enlargements of the Overview.
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

describe("layoutBranches spatial memory", () => {
  it("keeps a future on its branch when only likelihood changes", () => {
    const before = layoutBranches(futures);
    const after = layoutBranches(
      futures.map((f) => (f.id === "a" ? { ...f, percentage: 41 } : f)),
    );

    const beforeA = before.find((b) => b.futureSelf.id === "a")!;
    const afterA = after.find((b) => b.futureSelf.id === "a")!;
    // Same slot: same curve, same color, same label placement…
    expect(afterA.curve.d).toBe(beforeA.curve.d);
    expect(afterA.accent).toBe(beforeA.accent);
    expect(afterA.labelStyle).toEqual(beforeA.labelStyle);
    // …but grown further along that curve.
    expect(afterA.reach).toBeGreaterThan(beforeA.reach);
    // And nothing else moved at all.
    for (const b of before) {
      if (b.futureSelf.id === "a") continue;
      const same = after.find((x) => x.futureSelf.id === b.futureSelf.id)!;
      expect(same.curve.d).toBe(b.curve.d);
      expect(same.tip).toEqual(b.tip);
    }
  });

  it("never reshuffles branches when likelihoods swap rank order", () => {
    const swapped = futures.map((f) =>
      f.id === "b" ? { ...f, percentage: 31 } : f.id === "c" ? { ...f, percentage: 12 } : f,
    );
    const before = layoutBranches(futures);
    const after = layoutBranches(swapped);
    for (const b of before) {
      const same = after.find((x) => x.futureSelf.id === b.futureSelf.id)!;
      expect(same.curve.d).toBe(b.curve.d);
      expect(same.accent).toBe(b.accent);
    }
  });

  it("is independent of the order futures arrive in", () => {
    const reversed = layoutBranches([...futures].reverse());
    const forward = layoutBranches(futures);
    expect(reversed.map((b) => b.futureSelf.id)).toEqual(forward.map((b) => b.futureSelf.id));
    expect(reversed.map((b) => b.curve.d)).toEqual(forward.map((b) => b.curve.d));
  });
});
