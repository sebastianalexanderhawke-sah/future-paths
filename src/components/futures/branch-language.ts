import type { CSSProperties } from "react";

import type { FutureSelf } from "@/types/database";

/**
 * The one visual language AND the one layout model for Future Selves branch
 * renderings. The overview's Future Paths card and the dedicated Future
 * Selves explorer both render through the shared BranchMap component, which
 * consumes `layoutBranches` below — so branch angle, ordering, side,
 * curvature, node position, color, and label placement are computed exactly
 * once and can never drift apart. The overview card is the canonical design;
 * the dedicated page is the same picture at a larger scale.
 */

// Per-slot accents. Decorative and stable per layout position so the picture
// always reads the same way; meaning lives in the label text, not the color.
export const BRANCH_ACCENTS = [
  { color: "#6366f1", soft: "#eef2ff" },
  { color: "#22c55e", soft: "#f0fdf4" },
  { color: "#ef4444", soft: "#fff5f5" },
  { color: "#3b82f6", soft: "#eff6ff" },
  { color: "#f59e0b", soft: "#fffbeb" },
] as const;

export type BranchAccent = (typeof BRANCH_ACCENTS)[number];

/** Shared motion: calm, quick settle for hover/focus state changes. */
export const BRANCH_EASE = "200ms ease-out";

/** Branch stroke weight, identical in both renderings. */
export const BRANCH_STROKE = 3;

export type BranchCurve = {
  /** SVG path data: a single quadratic curve from start to end. */
  d: string;
  /** Point on the curve at t ∈ [0, 1]. */
  pointAt(t: number): [number, number];
  /**
   * SVG path data for the sub-curve [0, t] — an exact de Casteljau split,
   * so the returned path terminates precisely at pointAt(t). Renderers
   * stroke THIS to draw a branch grown to t, instead of dashing the full
   * curve: dash rendering is browser- and transform-dependent (Chromium
   * computes dashes in screen space under vector-effect:
   * non-scaling-stroke), while a real sub-path ends at the node center by
   * construction in every engine.
   */
  segmentD(t: number): string;
};

/**
 * A branch is a quadratic curve bowed perpendicular to its chord — the same
 * gesture for every branch in the product. `bend` is the bow in view units;
 * its sign picks the side. A bend of 0 degrades to a straight line.
 */
export function branchCurve(
  start: readonly [number, number],
  end: readonly [number, number],
  bend: number,
): BranchCurve {
  const [sx, sy] = start;
  const [ex, ey] = end;
  const dx = ex - sx;
  const dy = ey - sy;
  const len = Math.hypot(dx, dy) || 1;
  const cx = (sx + ex) / 2 + (-dy / len) * bend;
  const cy = (sy + ey) / 2 + (dx / len) * bend;

  const pointAt = (t: number): [number, number] => {
    const u = 1 - t;
    return [
      u * u * sx + 2 * u * t * cx + t * t * ex,
      u * u * sy + 2 * u * t * cy + t * t * ey,
    ];
  };

  return {
    d: `M ${sx.toFixed(1)} ${sy.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}`,
    pointAt,
    segmentD(t: number): string {
      const tt = Math.max(0, Math.min(1, t));
      // De Casteljau: the sub-curve's control point is lerp(S, C, t) and its
      // endpoint is the curve point itself.
      const c1x = sx + (cx - sx) * tt;
      const c1y = sy + (cy - sy) * tt;
      const [px, py] = pointAt(tt);
      return `M ${sx.toFixed(1)} ${sy.toFixed(1)} Q ${c1x.toFixed(1)} ${c1y.toFixed(1)} ${px.toFixed(1)} ${py.toFixed(1)}`;
    },
  };
}

// ---------------------------------------------------------------------------
// Canonical layout model
// ---------------------------------------------------------------------------

// Geometry is AUTHORED in a fixed 800×440 coordinate space — the Overview
// card's original one, unchanged — and RENDERED through the canonical
// composition below. HTML elements — endpoint dots and labels — are placed
// by converting the same coordinates to percentages, so branches, dots, and
// labels stay visually connected at any rendered size.
export const VIEW_W = 800;
export const VIEW_H = 440;
export const VIEW_CENTER: readonly [number, number] = [VIEW_W / 2, VIEW_H / 2];

// The canonical RENDERED shape — the Overview card's original chart box,
// which is the product's visual source of truth: full card width × 260px in
// the 1120px shell (1120 − 80 column padding − 72 card padding − 2 border =
// 966). These are design pixels, not view units; only their RATIO matters.
// Every BranchMap locks its chart area to this aspect ratio, so the authored
// space is compressed vertically by the same fixed amount everywhere:
// rendered angles are identical on every page and at every viewport width,
// and the dedicated page is a faithful enlargement of the Overview — never a
// reshaping of it. Width is the ONLY thing a renderer chooses.
//
// Do NOT re-derive these from any other surface. An earlier revision set the
// ratio to 800/264 (a 968×320 box) — a composition the Overview never had —
// which silently made the Overview chart ~23% taller. The Overview owns the
// composition; other pages inherit it.
export const RENDER_W = 966;
export const RENDER_H = 260;

type Slot = {
  /** Branch endpoint in view coordinates. */
  end: readonly [number, number];
  /** Perpendicular bow of the branch — gives each line its own gesture. */
  bend: number;
  /** Where the label block sits relative to its endpoint dot. */
  labelStyle: CSSProperties;
};

// Hand-curated layout — each slot is a permanent visual home, chosen by eye
// rather than calculated. These are the Overview card's ORIGINAL slots: the
// composition is deliberately a little irregular (no perfectly opposite
// pairs, staggered heights, one slot left open at the bottom right) so the
// eye travels around it naturally. This picture is the product's canonical
// design — adjust it by looking at the Overview card, not by doing math, and
// never redesign it to suit another surface.
const SLOTS: Record<string, Slot> = {
  topLeft: {
    end: [192, 84],
    bend: 30,
    labelStyle: { right: 16, bottom: 12, textAlign: "right" },
  },
  topRight: {
    end: [616, 72],
    bend: -26,
    labelStyle: { left: 16, bottom: 12 },
  },
  midLeft: {
    end: [148, 268],
    bend: -34,
    labelStyle: {
      right: 20,
      top: "50%",
      transform: "translateY(-50%)",
      textAlign: "right",
    },
  },
  midRight: {
    end: [662, 240],
    bend: 32,
    labelStyle: { left: 20, top: "50%", transform: "translateY(-50%)" },
  },
  bottomLeft: {
    end: [242, 372],
    bend: -28,
    labelStyle: { right: 14, top: 14, textAlign: "right" },
  },
};

// The Overview's original curated slot sets for 1–5 futures. Not nested —
// when a future emerges or fades the picture may recompose (accepted; see
// the spatial-memory notes on slotKey below, which cover the common case of
// likelihood changes within a stable set).
const SLOT_SETS: Record<number, (keyof typeof SLOTS)[]> = {
  1: ["midRight"],
  2: ["midLeft", "midRight"],
  3: ["topLeft", "topRight", "bottomLeft"],
  4: ["topLeft", "topRight", "midLeft", "midRight"],
  5: ["topLeft", "topRight", "midLeft", "midRight", "bottomLeft"],
};

/** The layout holds at most this many branches — the engine's identity cap. */
export const MAX_BRANCHES = 5;

// How established a future is → how far its branch reaches. Anchored, not
// linear, and spanning the full 0–100% likelihood domain so growth stays
// visually meaningful for the product's lifetime: today's engine outputs
// (10–30%) land just past the midpoint, 40–50% futures clearly outreach
// them, 60%+ reads as established, and only a certainty touches the rim.
// Piecewise-linear between anchors keeps every band's slope intentional.
const REACH_ANCHORS: readonly (readonly [number, number])[] = [
  [0, 0.18],
  [20, 0.55],
  [30, 0.65],
  [50, 0.8],
  [60, 0.86],
  [100, 1],
];

export function establishedFraction(pct: number): number {
  const p = Math.max(0, Math.min(100, pct));
  for (let i = 1; i < REACH_ANCHORS.length; i++) {
    const [x1, y1] = REACH_ANCHORS[i];
    if (p <= x1) {
      const [x0, y0] = REACH_ANCHORS[i - 1];
      return y0 + ((p - x0) / (x1 - x0)) * (y1 - y0);
    }
  }
  return 1;
}

// Slot assignment key. Stable across likelihood changes and regenerations
// (identity_id survives both), so a check-in or reflection can only ever
// grow or shrink a branch along its own curve — never move it to a
// different slot, rotate the tree, or reshuffle siblings. Spatial memory is
// the point: the same identity always lives in the same place, in the same
// color, on both the overview and the dedicated page.
function slotKey(futureSelf: FutureSelf): string {
  return futureSelf.identity_id ?? futureSelf.name;
}

export type PlacedBranch = {
  futureSelf: FutureSelf;
  /** Likelihood clamped to 0–100. */
  pct: number;
  accent: BranchAccent;
  curve: BranchCurve;
  /** How far along the curve the branch has grown, 0–1. */
  reach: number;
  /** Endpoint dot position in view coordinates. */
  tip: readonly [number, number];
  /** Where the label block sits relative to its endpoint dot. */
  labelStyle: CSSProperties;
};

/**
 * The single canonical layout: every renderer of Future Selves branches
 * consumes this. Pure and deterministic — the same futures always produce
 * the same picture, regardless of the order they arrive in.
 */
export function layoutBranches(futureSelves: FutureSelf[]): PlacedBranch[] {
  const displayed = futureSelves.slice(0, MAX_BRANCHES);
  const ordered = [...displayed].sort((a, b) =>
    slotKey(a).localeCompare(slotKey(b)),
  );
  const slotNames = SLOT_SETS[ordered.length] ?? SLOT_SETS[MAX_BRANCHES];

  return ordered.map((futureSelf, i) => {
    const slot = SLOTS[slotNames[i]];
    const curve = branchCurve(VIEW_CENTER, slot.end, slot.bend);
    const pct = Math.max(0, Math.min(100, futureSelf.percentage));
    const reach = establishedFraction(pct);
    return {
      futureSelf,
      pct,
      accent: BRANCH_ACCENTS[i % BRANCH_ACCENTS.length],
      curve,
      reach,
      tip: curve.pointAt(reach),
      labelStyle: slot.labelStyle,
    };
  });
}
