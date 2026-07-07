"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  BRANCH_ACCENTS as ACCENTS,
  BRANCH_EASE as EASE,
  BRANCH_STROKE,
  branchCurve as sharedBranchCurve,
  type BranchCurve as SharedBranchCurve,
} from "@/components/futures/branch-language";
import { OverviewCard } from "@/components/overview/overview-card";
import type { FutureSelf } from "@/types/database";

// Geometry lives in a fixed 800×440 coordinate space. The SVG stretches to
// fill the chart area (preserveAspectRatio="none", non-scaling strokes), and
// every HTML element — endpoint dots and labels — is placed by converting
// the same coordinates to percentages, so branches, dots, and labels stay
// visually connected at any card width.
const VIEW_W = 800;
const VIEW_H = 440;
const CX = VIEW_W / 2;
const CY = VIEW_H / 2;

type Slot = {
  /** Branch endpoint in view coordinates. */
  end: readonly [number, number];
  /** Perpendicular bow of the branch — gives each line its own gesture. */
  bend: number;
  /** Where the label block sits relative to its endpoint dot. */
  labelStyle: React.CSSProperties;
};

// Hand-curated layout — each future has a permanent visual home, chosen by
// eye rather than calculated. The composition is deliberately a little
// irregular (no perfectly opposite pairs, staggered heights, one slot left
// open at the bottom right) so the eye travels around it naturally. Adjust
// these by looking at the card, not by doing math.
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

// Curated slot sets for 1–5 futures; futures arrive sorted by percentage.
const SLOT_SETS: Record<number, (keyof typeof SLOTS)[]> = {
  1: ["midRight"],
  2: ["midLeft", "midRight"],
  3: ["topLeft", "topRight", "bottomLeft"],
  4: ["topLeft", "topRight", "midLeft", "midRight"],
  5: ["topLeft", "topRight", "midLeft", "midRight", "bottomLeft"],
};

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

function establishedFraction(pct: number): number {
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

// Branch curvature comes from the shared branch language, so the overview
// card and the dedicated explorer always bow their branches the same way.
function branchCurve(slot: Slot): SharedBranchCurve {
  return sharedBranchCurve([CX, CY], slot.end, slot.bend);
}

function toPercent([x, y]: readonly [number, number]): React.CSSProperties {
  return { left: `${(x / VIEW_W) * 100}%`, top: `${(y / VIEW_H) * 100}%` };
}

type FuturePathsCardProps = {
  futureSelves: FutureSelf[];
};

export function FuturePathsCard({ futureSelves }: FuturePathsCardProps) {
  const router = useRouter();
  const displayed = futureSelves.slice(0, 5);
  const slotNames = SLOT_SETS[displayed.length] ?? SLOT_SETS[5];

  // Hovered or keyboard-focused branch: it brightens, siblings recede.
  const [activeId, setActiveId] = useState<string | null>(null);

  const branchOpacity = (id: string) =>
    activeId === null || activeId === id ? 1 : 0.3;

  return (
    <OverviewCard className="px-9 pb-5 pt-6">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h2 className="text-[22px] font-bold tracking-[-0.3px] text-[#111]">
            Future Paths
          </h2>
          <p className="mt-1 text-[13px] text-[#999999]">
            Where you&apos;re headed
          </p>
        </div>
        <Link
          href="/future-selves"
          className="text-[13px] font-medium text-[#999999] transition-colors duration-150 hover:text-[#6366f1]"
        >
          Explore all futures →
        </Link>
      </div>

      {displayed.length === 0 ? (
        <div className="flex h-[240px] flex-col items-center justify-center">
          <span className="flex h-[68px] w-[68px] items-center justify-center rounded-full border border-[#ececf0] bg-white text-[15px] font-semibold text-[#111] shadow-[0_10px_36px_rgba(17,17,17,0.10),0_2px_8px_rgba(17,17,17,0.05)]">
            You
          </span>
          <p className="mt-4 max-w-[340px] text-center text-[13px] leading-relaxed text-[#999999]">
            No future paths yet. As you work through situations and reflections,
            possible futures will begin to emerge here.
          </p>
          <Link
            href="/moments/new"
            className="mt-4 text-[13px] font-medium text-[#6366f1] transition-opacity duration-150 hover:opacity-80"
          >
            Start with a situation →
          </Link>
        </div>
      ) : (
        <div className="relative h-[260px] w-full">
          {/* Quiet orbit rings behind everything — constellation depth. */}
          <div
            aria-hidden="true"
            className="absolute left-1/2 top-1/2 h-[124px] w-[124px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#eeeef2]"
          />
          <div
            aria-hidden="true"
            className="absolute left-1/2 top-1/2 h-[212px] w-[212px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#f2f2f5]"
          />

          <svg
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
            preserveAspectRatio="none"
            className="absolute inset-0 h-full w-full"
            aria-hidden="true"
          >
            {displayed.map((futureSelf, i) => {
              const slot = SLOTS[slotNames[i]];
              const accent = ACCENTS[i % ACCENTS.length];
              const pct = Math.max(0, Math.min(100, futureSelf.percentage));
              const geometry = branchCurve(slot);
              const reach = establishedFraction(pct) * 100;
              const isActive = activeId === futureSelf.id;
              return (
                // The whole branch is a click target: it navigates like the
                // endpoint link and shares its hover state. Keyboard access
                // lives on the endpoint <Link>, so this stays aria-hidden
                // via the parent svg.
                <g
                  key={futureSelf.id}
                  onClick={() => router.push("/future-selves")}
                  onMouseEnter={() => setActiveId(futureSelf.id)}
                  onMouseLeave={() =>
                    setActiveId((current) =>
                      current === futureSelf.id ? null : current,
                    )
                  }
                  style={{
                    opacity: branchOpacity(futureSelf.id),
                    transition: `opacity ${EASE}`,
                    cursor: "pointer",
                  }}
                >
                  {/* Invisible wide stroke — a comfortable hit area. */}
                  <path
                    d={geometry.d}
                    fill="none"
                    stroke="transparent"
                    strokeWidth={16}
                    pathLength={100}
                    strokeDasharray={`${reach.toFixed(1)} 100`}
                    vectorEffect="non-scaling-stroke"
                  />
                  {/* The branch: center → endpoint, nothing beyond it. */}
                  <path
                    d={geometry.d}
                    fill="none"
                    stroke={accent.color}
                    strokeWidth={3}
                    strokeLinecap="round"
                    pathLength={100}
                    strokeDasharray={`${reach.toFixed(1)} 100`}
                    opacity={isActive ? 1 : 0.85}
                    vectorEffect="non-scaling-stroke"
                    style={{ transition: `opacity ${EASE}` }}
                  />
                </g>
              );
            })}
          </svg>

          {/* Center "You" — the anchor. */}
          <div className="absolute left-1/2 top-1/2 z-10 flex h-[68px] w-[68px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[#ececf0] bg-white text-[15px] font-semibold text-[#111] shadow-[0_10px_36px_rgba(17,17,17,0.10),0_2px_8px_rgba(17,17,17,0.05)]">
            You
          </div>

          {/* Endpoints with attached labels — each one a real link. */}
          {displayed.map((futureSelf, i) => {
            const slot = SLOTS[slotNames[i]];
            const accent = ACCENTS[i % ACCENTS.length];
            const pct = Math.max(0, Math.min(100, futureSelf.percentage));
            const geometry = branchCurve(slot);
            const tip = pointOnCurve(geometry, establishedFraction(pct));
            const isActive = activeId === futureSelf.id;
            return (
              <Link
                key={futureSelf.id}
                href="/future-selves"
                aria-label={`${futureSelf.name}, ${pct} percent, ${futureSelf.evidence_strength}. Explore this future.`}
                className="absolute z-10 h-0 w-0 cursor-pointer outline-none"
                style={{
                  ...toPercent(tip),
                  opacity: branchOpacity(futureSelf.id),
                  transition: `opacity ${EASE}`,
                }}
                onMouseEnter={() => setActiveId(futureSelf.id)}
                onMouseLeave={() =>
                  setActiveId((current) =>
                    current === futureSelf.id ? null : current,
                  )
                }
                onFocus={() => setActiveId(futureSelf.id)}
                onBlur={() =>
                  setActiveId((current) =>
                    current === futureSelf.id ? null : current,
                  )
                }
                onKeyDown={(event) => {
                  // Links activate on Enter natively; add Space to match
                  // button expectations without breaking modified clicks.
                  if (event.key === " ") {
                    event.preventDefault();
                    event.currentTarget.click();
                  }
                }}
              >
                {/* Endpoint: colored circle in a thin white ring over a soft
                      halo — the destination marker. Grows and glows on
                      hover/focus. */}
                <span
                  aria-hidden="true"
                  className="absolute h-[18px] w-[18px] rounded-full"
                  style={{
                    background: accent.color,
                    transform: `translate(-50%, -50%) scale(${isActive ? 1.3 : 1})`,
                    boxShadow: isActive
                      ? `0 0 0 2px #fff, 0 0 0 8px ${accent.soft}, 0 0 18px 4px ${accent.color}66`
                      : `0 0 0 2px #fff, 0 0 0 7px ${accent.soft}, 0 3px 12px ${accent.color}55`,
                    transition: `transform ${EASE}, box-shadow ${EASE}`,
                  }}
                />
                {/* Label anchored to the dot, extending outward. */}
                <span
                  className="absolute block whitespace-nowrap"
                  style={slot.labelStyle}
                >
                  <span
                    className="block text-[15px] leading-tight"
                    style={{
                      color: isActive ? "#000" : "#111",
                      fontWeight: isActive ? 600 : 500,
                      transition: `color ${EASE}`,
                    }}
                  >
                    {futureSelf.name}
                  </span>
                  <span
                    className="mt-0.5 block text-[12px] font-medium"
                    style={{ color: accent.color }}
                  >
                    {pct}% • {futureSelf.evidence_strength}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </OverviewCard>
  );
}
