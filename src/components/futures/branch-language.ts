/**
 * The one visual language for Future Selves branch renderings. The overview's
 * Future Paths card and the dedicated Future Selves explorer both draw from
 * this module, so branch color, thickness, curvature, and motion can never
 * drift apart again. The overview card is the reference implementation; the
 * dedicated page is its expanded form.
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

/** Shared motion: calm, quick settle for hover/focus state changes. */
export const BRANCH_EASE = "200ms ease-out";

/** Branch stroke weight, identical in both renderings. */
export const BRANCH_STROKE = 3;

export type BranchCurve = {
  /** SVG path data: a single quadratic curve from start to end. */
  d: string;
  /** Point on the curve at t ∈ [0, 1]. */
  pointAt(t: number): [number, number];
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

  return {
    d: `M ${sx.toFixed(1)} ${sy.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}`,
    pointAt(t: number): [number, number] {
      const u = 1 - t;
      return [
        u * u * sx + 2 * u * t * cx + t * t * ex,
        u * u * sy + 2 * u * t * cy + t * t * ey,
      ];
    },
  };
}
