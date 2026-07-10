import type { CSSProperties } from "react";

import { getIdentityById } from "@/lib/identity-library";
import type { IdentityDimension } from "@/types/behavior";
import type { FutureSelf } from "@/types/database";

/**
 * The one visual language AND the one layout model for Future Selves branch
 * renderings. The overview's Future Paths card and the dedicated Future
 * Selves explorer both render through the shared BranchMap component, which
 * consumes `layoutBranches` below — so branch geometry, ordering, color,
 * and label placement are computed exactly once and can never drift apart.
 *
 * v3 "composed stages": the picture is COMPOSED, not solved. A small
 * library of hand-authored stages (one per cast size, 1–5) defines named
 * stations with roles — a protagonist with open space in front of it, a
 * challenger counterweighting it, a kin pair placed deliberately close, an
 * outlier isolated across a void. The engine's data does not position
 * futures; it CASTS them: likelihood rank chooses the protagonist and
 * challenger, compass similarity chooses which two lives share the kin
 * pair, and the whole stage mirrors to follow the protagonist's compass
 * hemisphere. Likelihood then PERFORMS within the station — it decides how
 * far along its approach a future has arrived — but never where the
 * station is. Deterministic throughout: same futures, same picture; the
 * intelligence is in the authored stages, the runtime only assigns.
 */

// Per-branch accents, assigned by stable slotKey order: one DISTINCT hue
// per future (blue, green, amber, rose, purple — the app's family 500s,
// so they harmonize with everything else). Within this visualization they
// are IDENTIFIERS, not the application's semantic feature colors: the map
// needs each future to stay recognizably itself across the tree, the
// dialog accent, and session-to-session memory, and five analogous shades
// proved too ambiguous for that job. Semantics still live in the label
// text and the stage role.
export const BRANCH_ACCENTS = [
  { color: "#3b82f6", soft: "#eff6ff" },
  { color: "#10b981", soft: "#ecfdf5" },
  { color: "#f59e0b", soft: "#fffbeb" },
  { color: "#f43f5e", soft: "#fff1f2" },
  { color: "#8b5cf6", soft: "#f5f3ff" },
] as const;

export type BranchAccent = (typeof BRANCH_ACCENTS)[number];

/** Base branch stroke weight; the rendered stroke scales with visual weight. */
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
 * A branch is a quadratic curve that DEPARTS at an angle to its chord and
 * straightens toward its destination — the same gesture for every branch in
 * the product. The control point sits early along the chord (38%) and
 * `bend` view-units perpendicular to it; since a quadratic's departure
 * tangent is start→control, this placement IS the departure direction, so
 * trajectories separate right after leaving the start. The sign of `bend`
 * picks the side; 0 degrades to a straight line. Stations author their own
 * bend, so every branch carries its own gesture.
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
  const cx = sx + 0.38 * dx + (-dy / len) * bend;
  const cy = sy + 0.38 * dy + (dx / len) * bend;

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
// Coordinate spaces
// ---------------------------------------------------------------------------

// Geometry is AUTHORED in a fixed 800×440 coordinate space and RENDERED
// through the canonical composition below. HTML elements — endpoint dots and
// labels — are placed by converting the same coordinates to percentages, so
// branches, dots, and labels stay visually connected at any rendered size.
export const VIEW_W = 800;
export const VIEW_H = 440;
export const VIEW_CENTER: readonly [number, number] = [VIEW_W / 2, VIEW_H / 2];

// The canonical RENDERED shape — the Overview card's original chart box,
// which is the product's visual source of truth: full card width × 260px in
// the 1120px shell. These are design pixels, not view units; only their
// RATIO matters. Every BranchMap locks its chart area to this aspect ratio,
// so rendered geometry is identical on every page and at every viewport
// width, and the dedicated page is a faithful enlargement of the Overview.
// Width is the ONLY thing a renderer chooses. Stages are authored with the
// vertical squash (≈0.49× relative to x) in mind — judge them on the
// rendered card, not in view coordinates.
export const RENDER_W = 966;
export const RENDER_H = 260;

// ---------------------------------------------------------------------------
// The dimension compass — casting hints, not coordinates
// ---------------------------------------------------------------------------

/**
 * Fixed bearing (degrees, math convention: 0° = right, counterclockwise) for
 * each identity dimension. A future's compass bearing is the normalized
 * weighted sum of its identity's dimension weights over these bearings.
 *
 * In the composed-stage model the compass no longer positions anything.
 * It provides the two semantic signals casting needs: WHICH pair of lives
 * is most alike (smallest circular gap → they share the kin-pair stations)
 * and which hemisphere the protagonist's life leans toward (the stage
 * mirrors to follow it). The ordering was tuned against the real identity
 * library (deterministic hill-climb over circular orderings): kindred lives
 * sit near (craftsman↔scholar 17°, mentor↔connector 20°), opposed lives far
 * (guardian↔explorer 176°). Adjust only by re-running that scoring against
 * the library.
 */
export const DIMENSION_BEARINGS: Record<IdentityDimension, number> = {
  Initiative: 0,
  "Risk Tolerance": 36,
  Vulnerability: 72,
  Adaptability: 108,
  Connection: 144,
  Reflection: 180,
  Consistency: 216,
  "Conflict Tolerance": 252,
  Curiosity: 288,
  Independence: 324,
};

const DEG = Math.PI / 180;

function normalizeDeg(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/** Resultant bearing of a weighted set of dimension directions, or null when
 *  the weights cancel to (near) zero and no direction is meaningful. */
function bearingFromWeights(
  weights: Partial<Record<IdentityDimension, number>>,
): number | null {
  let x = 0;
  let y = 0;
  for (const [dimension, weight] of Object.entries(weights)) {
    const bearing = DIMENSION_BEARINGS[dimension as IdentityDimension];
    if (bearing === undefined || typeof weight !== "number") continue;
    x += weight * Math.cos(bearing * DEG);
    y += weight * Math.sin(bearing * DEG);
  }
  if (Math.hypot(x, y) < 0.05) return null;
  return normalizeDeg(Math.atan2(y, x) / DEG);
}

/** FNV-1a — a stable, platform-independent string hash. Not randomness: the
 *  same string maps to the same angle in every session forever. */
function hashAngle(key: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return ((h >>> 0) % 3600) / 10;
}

/** Stable identity key — the same key the layout uses for ordering, accents,
 *  and tie-breaks, so a future's treatment survives regenerations. */
function slotKey(futureSelf: FutureSelf): string {
  return futureSelf.identity_id ?? futureSelf.name;
}

/**
 * The future's compass bearing, from the richest identity signal it
 * carries: library dimension weights when the identity is known, the row's
 * own persisted dimension_breakdown otherwise (legacy identities the library
 * has retired), and a stable hash of the identity key as the final fallback
 * so even a row with no dimensional data at all casts deterministically.
 */
export function identityBearing(futureSelf: FutureSelf): number {
  const identity = futureSelf.identity_id
    ? getIdentityById(futureSelf.identity_id)
    : undefined;
  if (identity) {
    const bearing = bearingFromWeights(identity.dimension_weights);
    if (bearing !== null) return bearing;
  }

  if (futureSelf.dimension_breakdown?.length) {
    const weights: Partial<Record<IdentityDimension, number>> = {};
    for (const row of futureSelf.dimension_breakdown) {
      const dimension = row.dimension;
      const weight =
        typeof row.identityWeight === "number"
          ? row.identityWeight
          : typeof row.contribution === "number"
            ? row.contribution
            : null;
      if (typeof dimension === "string" && weight !== null) {
        weights[dimension as IdentityDimension] = weight;
      }
    }
    const bearing = bearingFromWeights(weights);
    if (bearing !== null) return bearing;
  }

  return hashAngle(slotKey(futureSelf));
}

function circularGap(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return Math.min(d, 360 - d);
}

// ---------------------------------------------------------------------------
// Visual weight
// ---------------------------------------------------------------------------

/** The layout holds at most this many branches — the engine's identity cap. */
export const MAX_BRANCHES = 5;

// How established a future is, 0–1 — the map's VISUAL WEIGHT scale (stroke,
// dot size, halo, opacity) and its ARRIVAL scale (how far along its approach
// a future stands at its station). Anchored, not linear, spanning the full
// 0–100% likelihood domain so both scales stay meaningful for the product's
// lifetime. Piecewise-linear between anchors keeps every band's slope
// intentional.
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

// THE TERRITORY SYSTEM. Every station owns a bubble of influence: arrival
// maps establishedFraction onto [ARRIVAL_MIN, ARRIVAL_MAX] of the branch
// curve — a deliberately COMPACT window, so a future performs near its
// authored station and can never wander back toward the center clutter
// (where every branch converges) nor overshoot into a neighbor's ground.
// Growing likelihood still advances the node along its own unchanged
// approach — the same slide-along-the-branch motion the map has always
// animated — and still drives stroke, dot, and halo weight, so likelihood
// stays legible; but POSITION is bounded territory, whatever the data
// does. Stations are authored so that across the ENTIRE window, for every
// cast size, every pair of performed tips keeps the separations in
// TERRITORY below — pinned by stage-territory.test.ts, so no future
// coordinate edit can silently give one user's mix of likelihoods a
// crowded map.
export const ARRIVAL_MIN = 0.68;
export const ARRIVAL_MAX = 0.9;

/**
 * The territory contract, in RENDERED pixels on the canonical 966×260
 * card: minimum separations that must hold between performed tips for
 * every pair of stations on every stage, at every combination of arrivals
 * in the performance window. The kin pair is the one sanctioned closeness
 * — nearer than strangers, still never a blur. Enforced at design time by
 * stage-territory.test.ts; the runtime stays a pure lookup.
 */
export const TERRITORY = {
  /** Any two unrelated stations' performed tips. */
  minPairGap: 92,
  /** The kin pair's performed tips — nearer than strangers, never a blur. */
  minKinGap: 84,
  /** The kin pair still reads as a pair: its gap never exceeds this. */
  maxKinGap: 140,
  /** Every performed tip's distance from the "You" node center. */
  minCenterGap: 60,
} as const;

// ---------------------------------------------------------------------------
// The stage library — authored compositions
// ---------------------------------------------------------------------------

/** Casting roles. Every stage assigns each of its stations exactly one. */
export type StageRole =
  | "solo"
  | "protagonist"
  | "challenger"
  | "kin-a"
  | "kin-b"
  | "outlier";

export type Station = {
  role: StageRole;
  /** The destination — the branch's full-curve endpoint, in view coords. */
  anchor: readonly [number, number];
  /** Authored departure bow (view units, signed) — each branch's gesture. */
  bend: number;
  /** Authored label placement relative to the node — composed, not solved. */
  labelStyle: CSSProperties;
};

const LABEL_MID: CSSProperties = { top: "50%", transform: "translateY(-50%)" };

/**
 * The stages: one hand-composed scene per cast size, designed on the
 * rendered 966×260 card (remember the vertical squash) and judged as
 * pictures, not solved as constraints. Shared composition rules:
 *
 *   - REACH IS HIERARCHY. Station reach is tiered by role — full chords of
 *     ≈314 rendered px for the protagonist, ≈258 for the challenger,
 *     ≈134–248 for kin/outlier, performed at 0.68–0.90 of them — and since
 *     casting sends the two strongest futures to the two longest stations,
 *     distance tracks likelihood before any number is read. Arrival
 *     refines it within a tier.
 *   - The PROTAGONIST owns the right wing ALONE: the longest reach on the
 *     stage and no other station past mid-canvas. The eye lands there
 *     because the composition clears that entire side for it — never
 *     because it is bigger or brighter.
 *   - The CHALLENGER counterweights it from deep in the lower-left.
 *   - The KIN PAIR (4–5 casts) sits deliberately close, high on the left —
 *     near enough to read as related, the one tension the old solver used
 *     to "fix". Their labels diverge outward from the pair.
 *   - The OUTLIER (3 and 5 casts) stands apart — top-center-left when the
 *     stage is sparse, anchoring the bottom-center when it is full — with
 *     empty space around it in both.
 *   - Supporting mass runs along a DIAGONAL, never a column: kin high,
 *     challenger deep, so the left side arcs instead of stacking. Voids
 *     stay at top-center and the lower-right quadrant — intentional,
 *     load-bearing emptiness. Balance comes from counterweight (one long
 *     lever right, distributed mass left), never from even spacing. No two
 *     stations share a bend, so no two branches carry the same gesture.
 *
 * Stages are authored protagonist-right and MIRROR horizontally when the
 * protagonist's compass leans left, so the compass still whispers.
 * Adjust these by looking at the rendered card — and every adjustment must
 * keep the TERRITORY contract: stage-territory.test.ts sweeps the full
 * performance window and fails any composition that lets two futures
 * crowd each other, for any cast size, at any likelihoods.
 * (Exported for that contract test only — runtime consumes layoutBranches.)
 */
export const STAGES: Record<number, readonly Station[]> = {
  1: [
    {
      role: "solo",
      anchor: [630, 180],
      bend: -34,
      labelStyle: { left: 20, ...LABEL_MID },
    },
  ],
  2: [
    {
      role: "protagonist",
      anchor: [648, 172],
      bend: -38,
      labelStyle: { left: 20, ...LABEL_MID },
    },
    {
      role: "challenger",
      anchor: [236, 330],
      bend: 28,
      labelStyle: { right: 20, textAlign: "right", ...LABEL_MID },
    },
  ],
  3: [
    {
      role: "protagonist",
      anchor: [648, 160],
      bend: -40,
      labelStyle: { left: 20, ...LABEL_MID },
    },
    {
      role: "outlier",
      anchor: [298, 92],
      bend: 18,
      labelStyle: { right: 18, bottom: 6, textAlign: "right" },
    },
    {
      role: "challenger",
      anchor: [215, 348],
      bend: 32,
      labelStyle: { right: 18, textAlign: "right", ...LABEL_MID },
    },
  ],
  4: [
    {
      role: "protagonist",
      anchor: [658, 152],
      bend: -40,
      labelStyle: { left: 20, ...LABEL_MID },
    },
    // The kin pair performs at its stations, deliberately nearer to each
    // other than any stranger pair but never a blur: the compact arrival
    // window bounds the pair's closeness by construction across ALL
    // likelihoods (see TERRITORY + stage-territory.test.ts), and kin-b's
    // bubble stays clearly in the upper-LEFT: its dot cannot cross into
    // the top-center void even at maximum arrival, so the protagonist's
    // wing keeps its clear approach. Opposite bows splay the two
    // approaches apart instead of nesting them, and both labels aim
    // outward, away from the corridor between the pair.
    {
      role: "kin-a",
      anchor: [200, 124],
      bend: 18,
      labelStyle: { right: 16, bottom: 4, textAlign: "right" },
    },
    {
      role: "kin-b",
      anchor: [322, 58],
      bend: -10,
      labelStyle: { left: 16, bottom: 6 },
    },
    {
      role: "challenger",
      anchor: [198, 362],
      bend: 34,
      labelStyle: { right: 20, textAlign: "right", ...LABEL_MID },
    },
  ],
  5: [
    {
      role: "protagonist",
      anchor: [658, 152],
      bend: -40,
      labelStyle: { left: 20, ...LABEL_MID },
    },
    // Same kin composition as the 4-cast stage (same bounded closeness,
    // same upper-left bubble for kin-b); the challenger sits a touch
    // deeper than on the 4-cast stage so the full five-station arc still
    // reads as one diagonal sweep around the protagonist's cleared wing.
    {
      role: "kin-a",
      anchor: [200, 124],
      bend: 18,
      labelStyle: { right: 16, bottom: 4, textAlign: "right" },
    },
    {
      role: "kin-b",
      anchor: [322, 58],
      bend: -10,
      labelStyle: { left: 16, bottom: 6 },
    },
    {
      role: "challenger",
      anchor: [194, 362],
      bend: 34,
      labelStyle: { right: 20, textAlign: "right", ...LABEL_MID },
    },
    {
      role: "outlier",
      anchor: [496, 396],
      bend: -24,
      labelStyle: { left: 18, bottom: 8 },
    },
  ],
};

/** Horizontal mirror of a station: position, bow side, and label side all
 *  flip; vertical placement is unchanged. */
function mirrorStation(station: Station): Station {
  const { left, right, textAlign, ...rest } = station.labelStyle as {
    left?: number;
    right?: number;
    textAlign?: CSSProperties["textAlign"];
  } & CSSProperties;
  const labelStyle: CSSProperties =
    left !== undefined
      ? { ...rest, right: left, textAlign: "right" }
      : { ...rest, left: right };
  void textAlign;
  return {
    role: station.role,
    anchor: [VIEW_W - station.anchor[0], station.anchor[1]],
    bend: -station.bend,
    labelStyle,
  };
}

// ---------------------------------------------------------------------------
// Casting — data assigns, never positions
// ---------------------------------------------------------------------------

/**
 * Deterministic casting:
 *   - Likelihood rank casts the protagonist (highest) and challenger
 *     (second); ties break on slotKey so arrival order never matters.
 *   - Among the remaining futures, the pair with the smallest compass gap
 *     — the two most kindred lives on stage — takes the kin stations,
 *     ordered by bearing; with five cast, the future left out of that
 *     pair is the outlier. With three cast, the third future is the
 *     outlier outright.
 *   - The whole stage mirrors when the protagonist's compass leans into
 *     the left hemisphere, so direction still carries a whisper of the
 *     identity engine.
 */
function castStations(displayed: FutureSelf[]): Map<FutureSelf, Station> {
  const ranked = [...displayed].sort(
    (a, b) =>
      b.percentage - a.percentage || slotKey(a).localeCompare(slotKey(b)),
  );
  if (ranked.length === 0) return new Map();
  const stage = STAGES[ranked.length] ?? STAGES[MAX_BRANCHES];
  const mirrored = Math.cos(identityBearing(ranked[0]) * DEG) < 0;
  const byRole = new Map(stage.map((station) => [station.role, station]));
  const stationFor = (role: StageRole): Station => {
    const station = byRole.get(role)!;
    return mirrored ? mirrorStation(station) : station;
  };

  const cast = new Map<FutureSelf, Station>();
  if (ranked.length === 1) {
    cast.set(ranked[0], stationFor("solo"));
    return cast;
  }

  cast.set(ranked[0], stationFor("protagonist"));
  cast.set(ranked[1], stationFor("challenger"));
  const rest = ranked.slice(2);

  if (rest.length === 1) {
    cast.set(rest[0], stationFor("outlier"));
    return cast;
  }

  if (rest.length >= 2) {
    // The most kindred pair among the rest shares the kin stations.
    let kin: [FutureSelf, FutureSelf] = [rest[0], rest[1]];
    if (rest.length === 3) {
      let smallest = Number.POSITIVE_INFINITY;
      for (let i = 0; i < rest.length; i++) {
        for (let j = i + 1; j < rest.length; j++) {
          const gap = circularGap(
            identityBearing(rest[i]),
            identityBearing(rest[j]),
          );
          if (gap < smallest - 1e-9) {
            smallest = gap;
            kin = [rest[i], rest[j]];
          }
        }
      }
      const outlier = rest.find((f) => f !== kin[0] && f !== kin[1])!;
      cast.set(outlier, stationFor("outlier"));
    }
    // Kin stations in bearing order, slotKey breaking ties.
    const [a, b] = [...kin].sort(
      (p, q) =>
        identityBearing(p) - identityBearing(q) ||
        slotKey(p).localeCompare(slotKey(q)),
    );
    cast.set(a, stationFor("kin-a"));
    cast.set(b, stationFor("kin-b"));
  }

  return cast;
}

// ---------------------------------------------------------------------------
// The canonical layout
// ---------------------------------------------------------------------------

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
  /** The station this future was cast into. */
  role: StageRole;
  /**
   * Visual weight 0–1, from likelihood alone: drives stroke width, node
   * size, halo, and branch opacity so the strongest future draws the eye
   * first — on top of the prominence its station already grants it.
   */
  weight: number;
};

/**
 * The single canonical layout: every renderer of Future Selves branches
 * consumes this. Pure and deterministic — the same futures always produce
 * the same picture, regardless of the order they arrive in.
 *
 * What drives what:
 *   - POSITION: the authored stage for this cast size; data casts roles
 *     (likelihood rank → protagonist/challenger, compass similarity → kin
 *     pair, compass hemisphere → mirroring) but never computes a
 *     coordinate.
 *   - ARRIVAL: likelihood through establishedFraction onto the last stretch
 *     of the branch's own approach — a likelihood change slides exactly
 *     one node along its own unchanged curve. A RANK change is a scene
 *     change: the cast reassigns, and the map visibly recomposes.
 *   - WEIGHT: establishedFraction again, as stroke/dot/halo presence.
 */
export function layoutBranches(futureSelves: FutureSelf[]): PlacedBranch[] {
  const displayed = futureSelves.slice(0, MAX_BRANCHES);
  const ordered = [...displayed].sort((a, b) =>
    slotKey(a).localeCompare(slotKey(b)),
  );
  const cast = castStations(displayed);

  return ordered.map((futureSelf, i) => {
    const station = cast.get(futureSelf)!;
    const pct = Math.max(0, Math.min(100, futureSelf.percentage));
    const weight = establishedFraction(pct);
    const curve = branchCurve(VIEW_CENTER, station.anchor, station.bend);
    const reach = ARRIVAL_MIN + (ARRIVAL_MAX - ARRIVAL_MIN) * weight;
    return {
      futureSelf,
      pct,
      accent: BRANCH_ACCENTS[i % BRANCH_ACCENTS.length],
      curve,
      reach,
      tip: curve.pointAt(reach),
      labelStyle: station.labelStyle,
      role: station.role,
      weight,
    };
  });
}
