import type { CSSProperties } from "react";
import { describe, expect, it } from "vitest";

import {
  ARRIVAL_MAX,
  ARRIVAL_MIN,
  RENDER_H,
  RENDER_W,
  STAGES,
  TERRITORY,
  VIEW_CENTER,
  VIEW_H,
  VIEW_W,
  branchCurve,
  establishedFraction,
  type Station,
} from "@/components/futures/branch-language";

/**
 * THE TERRITORY CONTRACT. Every future path owns a bubble of influence:
 * whatever likelihoods a user's data produces — 1 path or 5, packed
 * together or spread apart — every performed tip must keep clear of every
 * other station's bubble, of the "You" node, and of the canvas edges.
 *
 * This suite is the enforcement half of the system (the authored stages
 * are the composition half): it sweeps every stage's every station pair
 * across the ENTIRE reachable arrival window, independently per station —
 * i.e. every possible combination of user likelihoods — and fails any
 * composition that lets two futures crowd each other. The runtime stays a
 * pure lookup; space is guaranteed at design time, for all users at once.
 *
 * Mirrored stages are exact horizontal reflections, so every distance here
 * is mirror-invariant — sweeping the authored orientation covers both.
 */

const SX = RENDER_W / VIEW_W;
const SY = RENDER_H / VIEW_H;

// The reachable window: establishedFraction floors at 0.18 (a 0% future),
// so performed reach spans [floor, ARRIVAL_MAX] — sweep exactly that.
const REACH_FLOOR = ARRIVAL_MIN + (ARRIVAL_MAX - ARRIVAL_MIN) * establishedFraction(0);
const STEPS = 24;

function reachAt(i: number): number {
  return REACH_FLOOR + ((ARRIVAL_MAX - REACH_FLOOR) * i) / STEPS;
}

function renderedGap(a: readonly [number, number], b: readonly [number, number]): number {
  return Math.hypot((a[0] - b[0]) * SX, (a[1] - b[1]) * SY);
}

const curveFor = (s: Station) => branchCurve(VIEW_CENTER, s.anchor, s.bend);

/** Worst-case (minimum) rendered gap between two stations' performed tips
 *  over every combination of arrivals in the window. */
function minPairGap(a: Station, b: Station): number {
  const ca = curveFor(a);
  const cb = curveFor(b);
  let min = Number.POSITIVE_INFINITY;
  for (let i = 0; i <= STEPS; i++) {
    const pa = ca.pointAt(reachAt(i));
    for (let j = 0; j <= STEPS; j++) {
      min = Math.min(min, renderedGap(pa, cb.pointAt(reachAt(j))));
    }
  }
  return min;
}

const isKinPair = (a: Station, b: Station) =>
  [a.role, b.role].sort().join("+") === "kin-a+kin-b";

// Label geometry, rendered px: 28px icon chip + gap + a LONG name
// ("The Self-Reliant Builder" scale), two text lines tall.
const LABEL_W = 216;
const LABEL_H = 34;

type Box = { x0: number; x1: number; y0: number; y1: number };

function labelBoxAt(station: Station, tip: readonly [number, number]): Box {
  const x = tip[0] * SX;
  const y = tip[1] * SY;
  const s = station.labelStyle as {
    left?: number;
    right?: number;
    bottom?: number;
  } & CSSProperties;
  const x0 = s.left !== undefined ? x + s.left : x - (s.right ?? 0) - LABEL_W;
  const y0 = s.bottom !== undefined ? y - s.bottom - LABEL_H : y - LABEL_H / 2;
  return { x0, x1: x0 + LABEL_W, y0, y1: y0 + LABEL_H };
}

function boxesOverlap(a: Box, b: Box): boolean {
  return a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
}

// Labels may spill into the card's 36px padding, never past it; and never
// off the top/bottom of the chart box.
const X_GRACE = 36;

describe.each(Object.entries(STAGES).map(([n, s]) => [Number(n), s] as const))(
  "stage %i honors the territory contract",
  (castSize, stations) => {
    const pairs: [Station, Station][] = [];
    for (let i = 0; i < stations.length; i++) {
      for (let j = i + 1; j < stations.length; j++) {
        pairs.push([stations[i], stations[j]]);
      }
    }

    it("keeps every pair of performed tips apart at every likelihood combination", () => {
      for (const [a, b] of pairs) {
        const min = minPairGap(a, b);
        const floor = isKinPair(a, b) ? TERRITORY.minKinGap : TERRITORY.minPairGap;
        expect(
          min,
          `${a.role} ↔ ${b.role} worst-case gap ${min.toFixed(1)}px`,
        ).toBeGreaterThanOrEqual(floor);
      }
    });

    it("keeps every performed tip clear of the You node", () => {
      for (const s of stations) {
        const curve = curveFor(s);
        for (let i = 0; i <= STEPS; i++) {
          const d = renderedGap(curve.pointAt(reachAt(i)), VIEW_CENTER);
          expect(
            d,
            `${s.role} at reach ${reachAt(i).toFixed(2)} sits ${d.toFixed(1)}px from You`,
          ).toBeGreaterThanOrEqual(TERRITORY.minCenterGap);
        }
      }
    });

    it("keeps every label on the card and off every other label", () => {
      for (const s of stations) {
        const curve = curveFor(s);
        for (let i = 0; i <= STEPS; i++) {
          const box = labelBoxAt(s, curve.pointAt(reachAt(i)));
          expect(box.x0, `${s.role} label left edge`).toBeGreaterThanOrEqual(-X_GRACE);
          expect(box.x1, `${s.role} label right edge`).toBeLessThanOrEqual(RENDER_W + X_GRACE);
          expect(box.y0, `${s.role} label top edge`).toBeGreaterThanOrEqual(0);
          expect(box.y1, `${s.role} label bottom edge`).toBeLessThanOrEqual(RENDER_H);
        }
      }
      // Pairwise: sweep both stations' windows; boxes must never touch.
      for (const [a, b] of pairs) {
        const ca = curveFor(a);
        const cb = curveFor(b);
        for (let i = 0; i <= STEPS; i++) {
          const boxA = labelBoxAt(a, ca.pointAt(reachAt(i)));
          for (let j = 0; j <= STEPS; j++) {
            const boxB = labelBoxAt(b, cb.pointAt(reachAt(j)));
            expect(
              boxesOverlap(boxA, boxB),
              `${a.role} and ${b.role} labels overlap at reaches ${reachAt(i).toFixed(2)}/${reachAt(j).toFixed(2)}`,
            ).toBe(false);
          }
        }
      }
    });

    it("is a real stage", () => {
      expect(stations.length).toBe(castSize);
    });
  },
);
