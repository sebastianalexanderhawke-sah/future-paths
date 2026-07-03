"use client";

import Link from "next/link";
import { useState } from "react";

import { OverviewCard } from "@/components/overview/overview-card";
import type { FutureSelf } from "@/types/database";

// Per-slot accents. Decorative and stable per layout position so the chart
// always reads the same way; meaning lives in the label text, not the color.
const ACCENTS = [
  { color: "#6366f1", soft: "#eef2ff" },
  { color: "#22c55e", soft: "#f0fdf4" },
  { color: "#ef4444", soft: "#fff5f5" },
  { color: "#3b82f6", soft: "#eff6ff" },
  { color: "#f59e0b", soft: "#fffbeb" },
];

// Geometry lives in a fixed 800×440 coordinate space. The SVG stretches to
// fill the chart area (preserveAspectRatio="none", non-scaling strokes), and
// every HTML element — endpoint dots, waypoint dots, labels — is placed by
// converting the same coordinates to percentages, so branches, dots, and
// labels stay visually connected at any card width.
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
    bend: -26,
    labelStyle: {
      right: 20,
      top: "50%",
      transform: "translateY(-50%)",
      textAlign: "right",
    },
  },
  midRight: {
    end: [662, 240],
    bend: 24,
    labelStyle: { left: 20, top: "50%", transform: "translateY(-50%)" },
  },
  bottomLeft: {
    end: [242, 372],
    bend: -28,
    labelStyle: { right: 14, top: 14, textAlign: "right" },
  },
};

// Balanced slot sets for 1–5 futures; futures arrive sorted by percentage.
const SLOT_SETS: Record<number, (keyof typeof SLOTS)[]> = {
  1: ["midRight"],
  2: ["midLeft", "midRight"],
  3: ["topLeft", "topRight", "bottomLeft"],
  4: ["topLeft", "topRight", "midLeft", "midRight"],
  5: ["topLeft", "topRight", "midLeft", "midRight", "bottomLeft"],
};

// How far along the branch the "current progress" waypoint reaches.
// Mirrors the explorer's scale: engine likelihoods live around 10–40%,
// saturating at 45%+.
function progressFraction(pct: number): number {
  const t = Math.max(0, Math.min(1, pct / 45));
  return 0.3 + t * 0.55;
}

type BranchGeometry = {
  d: string;
  control: readonly [number, number];
  end: readonly [number, number];
};

function branchCurve(slot: Slot): BranchGeometry {
  const [ex, ey] = slot.end;
  const dx = ex - CX;
  const dy = ey - CY;
  const len = Math.hypot(dx, dy);
  const cx = (CX + ex) / 2 + (-dy / len) * slot.bend;
  const cy = (CY + ey) / 2 + (dx / len) * slot.bend;
  return {
    d: `M ${CX} ${CY} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${ex} ${ey}`,
    control: [cx, cy],
    end: slot.end,
  };
}

function pointOnCurve(geometry: BranchGeometry, t: number): [number, number] {
  const [cx, cy] = geometry.control;
  const [ex, ey] = geometry.end;
  const u = 1 - t;
  return [
    u * u * CX + 2 * u * t * cx + t * t * ex,
    u * u * CY + 2 * u * t * cy + t * t * ey,
  ];
}

function toPercent([x, y]: readonly [number, number]): React.CSSProperties {
  return { left: `${(x / VIEW_W) * 100}%`, top: `${(y / VIEW_H) * 100}%` };
}

const EASE = "200ms ease-out";

type FuturePathsCardProps = {
  futureSelves: FutureSelf[];
};

export function FuturePathsCard({ futureSelves }: FuturePathsCardProps) {
  const displayed = futureSelves.slice(0, 5);
  const slotNames = SLOT_SETS[displayed.length] ?? SLOT_SETS[5];

  // Hovered or keyboard-focused branch: it brightens, siblings recede.
  const [activeId, setActiveId] = useState<string | null>(null);

  const branchOpacity = (id: string) =>
    activeId === null || activeId === id ? 1 : 0.3;

  return (
    <OverviewCard className="px-9 pb-6 pt-7">
      <div className="mb-4 flex items-start justify-between">
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
        <div className="flex h-[320px] flex-col items-center justify-center">
          <span className="flex h-[84px] w-[84px] items-center justify-center rounded-full border border-[#ececf0] bg-white text-[15px] font-semibold text-[#111] shadow-[0_10px_36px_rgba(17,17,17,0.10),0_2px_8px_rgba(17,17,17,0.05)]">
            You
          </span>
          <p className="mt-6 max-w-[340px] text-center text-[13px] leading-relaxed text-[#999999]">
            No future paths yet. As you work through situations and
            reflections, possible futures will begin to emerge here.
          </p>
          <Link
            href="/moments/new"
            className="mt-4 text-[13px] font-medium text-[#6366f1] transition-opacity duration-150 hover:opacity-80"
          >
            Start with a situation →
          </Link>
        </div>
      ) : (
        <>
          <div className="relative h-[340px] w-full">
            {/* Quiet orbit rings behind everything — constellation depth. */}
            <div
              aria-hidden="true"
              className="absolute left-1/2 top-1/2 h-[150px] w-[150px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#eeeef2]"
            />
            <div
              aria-hidden="true"
              className="absolute left-1/2 top-1/2 h-[260px] w-[260px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#f2f2f5]"
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
                const f = progressFraction(pct);
                const isActive = activeId === futureSelf.id;
                return (
                  <g
                    key={futureSelf.id}
                    style={{
                      opacity: branchOpacity(futureSelf.id),
                      transition: `opacity ${EASE}`,
                    }}
                  >
                    {/* Full reach of the branch — quiet; vivid when active. */}
                    <path
                      d={geometry.d}
                      fill="none"
                      stroke={accent.color}
                      strokeWidth={2}
                      strokeLinecap="round"
                      opacity={isActive ? 0.5 : 0.22}
                      vectorEffect="non-scaling-stroke"
                      style={{ transition: `opacity ${EASE}` }}
                    />
                    {/* Current progress along it — bright. */}
                    <path
                      d={geometry.d}
                      fill="none"
                      stroke={accent.color}
                      strokeWidth={3}
                      strokeLinecap="round"
                      pathLength={100}
                      strokeDasharray={`${(f * 100).toFixed(1)} 100`}
                      vectorEffect="non-scaling-stroke"
                    />
                  </g>
                );
              })}
            </svg>

            {/* Progress waypoints — "you are here" on each branch. */}
            {displayed.map((futureSelf, i) => {
              const slot = SLOTS[slotNames[i]];
              const accent = ACCENTS[i % ACCENTS.length];
              const pct = Math.max(0, Math.min(100, futureSelf.percentage));
              const geometry = branchCurve(slot);
              const waypoint = pointOnCurve(geometry, progressFraction(pct));
              return (
                <span
                  key={futureSelf.id}
                  aria-hidden="true"
                  className="absolute h-[9px] w-[9px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white"
                  style={{
                    ...toPercent(waypoint),
                    border: `2px solid ${accent.color}`,
                    opacity: branchOpacity(futureSelf.id),
                    transition: `opacity ${EASE}`,
                  }}
                />
              );
            })}

            {/* Center "You" — the anchor. */}
            <div className="absolute left-1/2 top-1/2 z-10 flex h-[84px] w-[84px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[#ececf0] bg-white text-[15px] font-semibold text-[#111] shadow-[0_10px_36px_rgba(17,17,17,0.10),0_2px_8px_rgba(17,17,17,0.05)]">
              You
            </div>

            {/* Endpoints with attached labels — each one a real link. */}
            {displayed.map((futureSelf, i) => {
              const slot = SLOTS[slotNames[i]];
              const accent = ACCENTS[i % ACCENTS.length];
              const pct = Math.max(0, Math.min(100, futureSelf.percentage));
              const isActive = activeId === futureSelf.id;
              return (
                <Link
                  key={futureSelf.id}
                  href="/future-selves"
                  aria-label={`${futureSelf.name}, ${pct} percent, ${futureSelf.evidence_strength}. Explore this future.`}
                  className="absolute z-10 h-0 w-0 cursor-pointer outline-none"
                  style={{
                    ...toPercent(slot.end),
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
                  {/* Endpoint circle with soft halo; grows and glows on hover/focus. */}
                  <span
                    aria-hidden="true"
                    className="absolute h-[14px] w-[14px] rounded-full"
                    style={{
                      background: accent.color,
                      transform: `translate(-50%, -50%) scale(${isActive ? 1.3 : 1})`,
                      boxShadow: isActive
                        ? `0 0 0 6px ${accent.soft}, 0 0 18px 4px ${accent.color}66`
                        : `0 0 0 5px ${accent.soft}, 0 2px 12px ${accent.color}55`,
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
                        fontWeight: isActive ? 700 : 600,
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

          {/* Legend */}
          <div className="flex items-center justify-center gap-7 pt-4">
            <span className="flex items-center gap-2 text-[11px] text-[#999999]">
              <span
                aria-hidden="true"
                className="h-[2px] w-6 rounded-full bg-[#6366f1]/25"
              />
              Strength of path
            </span>
            <span className="flex items-center gap-2 text-[11px] text-[#999999]">
              <span
                aria-hidden="true"
                className="h-[2.5px] w-6 rounded-full bg-[#6366f1]"
              />
              Current progress
            </span>
          </div>
        </>
      )}
    </OverviewCard>
  );
}
