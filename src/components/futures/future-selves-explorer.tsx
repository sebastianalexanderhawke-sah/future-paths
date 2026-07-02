"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { FutureCard } from "@/components/futures/future-card";
import type { FutureSelf } from "@/types/database";

type FutureSelvesExplorerProps = {
  futureSelves: FutureSelf[];
};

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------

// Canvas sized to the maximum reach (225px) plus node + label headroom.
// The center ring and its whitespace moat keep their absolute size, so
// shrinking the canvas makes "You" proportionally MORE dominant, not less.
const SIZE = 540;
const CENTER = SIZE / 2;
const RING_RADIUS = 24;
const BRANCH_START = 46; // branches visibly begin outside the center's ring

// Absolute branch length: how established THIS future is, independent of the
// others — a branch never shrinks because a rival grew. Smoothstep curve
// tuned to where engine likelihoods actually live (~10–40%), saturating at
// 45%+ so no branch becomes gigantic. Radial distance from center:
//   10% → 107px   15% → 125px   20% → 146px   25% → 169px
//   30% → 190px   35% → 206px   40% → 218px   45%+ → 225px
// Smooth, monotonic, no jumps; ~4.5px per point through the common belt.
// Fill along the branch still shows evidence progress — two distinct
// signals on one line. Never time, never inevitability.
const LENGTH_FLOOR = 90; // 0%
const LENGTH_CEIL = 225; // 45% and above
const CURVE_END = 45;

function branchLength(pct: number): number {
  const t = Math.max(0, Math.min(1, pct / CURVE_END));
  const s = t * t * (3 - 2 * t); // smoothstep
  return LENGTH_FLOOR + s * (LENGTH_CEIL - LENGTH_FLOOR);
}

// Endpoint weight: ~30% size range across 0–100%.
function nodeRadius(pct: number, isSelected: boolean): number {
  return 7 + (pct / 100) * 2.2 + (isSelected ? 2 : 0);
}

// Preferred home bearing per archetype (0° = up, clockwise) — spatial memory.
// The layout algorithm starts from these and only bends them as far as needed
// to keep the current set of active futures evenly breathable. Deterministic,
// never random.
const IDENTITY_BEARINGS: Record<string, number> = {
  "threshold-crosser": 352,
  "relentless-grower": 25,
  "quiet-supporter": 62,
  "self-reliant-builder": 94,
  "reflective-practitioner": 118,
  "committed-achiever": 144, // Long-Haul Finisher (id is stable)
  "steady-foundation-builder": 168,
  "resilient-adapter": 196,
  "vulnerable-leader": 218,
  "community-weaver": 248,
  "deliberate-soloist": 278,
  "adaptive-explorer": 312,
};

function preferredBearing(futureSelf: FutureSelf): number {
  const known = IDENTITY_BEARINGS[futureSelf.identity_id ?? ""];
  if (known !== undefined) return known;
  let hash = 0;
  for (const ch of futureSelf.identity_id ?? futureSelf.name) {
    hash = (hash * 31 + ch.charCodeAt(0)) % 360;
  }
  return hash;
}

/**
 * Layout: starts from each future's permanent home bearing, then relaxes
 * angles until every circular gap is at least MIN_GAP degrees. Positions are
 * preserved approximately (identities keep their home direction) while the
 * landscape stays evenly breathable as futures appear and fade. Pure and
 * deterministic — the same set of futures always produces the same layout.
 */
const MIN_GAP = 34;

function resolveBearings(futures: FutureSelf[]): Map<string, number> {
  const entries = futures
    .map((f) => ({ id: f.id, bearing: preferredBearing(f) }))
    .sort((a, b) => a.bearing - b.bearing);

  const n = entries.length;
  const bearings = entries.map((e) => e.bearing);
  if (n > 1) {
    const gap = Math.min(MIN_GAP, 360 / n);
    // Circular relaxation: push apart any adjacent pair closer than the gap.
    for (let iter = 0; iter < 24; iter++) {
      let moved = false;
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        const raw = (bearings[j] - bearings[i] + 360) % 360;
        if (raw < gap - 0.01) {
          const push = (gap - raw) / 2;
          bearings[i] = (bearings[i] - push + 360) % 360;
          bearings[j] = (bearings[j] + push) % 360;
          moved = true;
        }
      }
      if (!moved) break;
    }
  }

  return new Map(entries.map((e, i) => [e.id, bearings[i]]));
}

function directionFor(bearing: number): { cos: number; sin: number } {
  const angle = ((bearing - 90) * Math.PI) / 180;
  return { cos: Math.cos(angle), sin: Math.sin(angle) };
}

function labelAnchor(cos: number): "start" | "middle" | "end" {
  if (cos > 0.35) return "start";
  if (cos < -0.35) return "end";
  return "middle";
}

// ---------------------------------------------------------------------------
// Settling animation: when the landscape changes (a future appears, fades,
// or its percentage moves), branches glide to their new bearing/length over
// ~500ms instead of snapping. New branches grow outward from the center.
// Skipped entirely under prefers-reduced-motion.
// ---------------------------------------------------------------------------

type BranchGeometry = { bearing: number; length: number };

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function shortestAngleDelta(from: number, to: number): number {
  return ((to - from + 540) % 360) - 180;
}

function useSettlingLayout(targets: Map<string, BranchGeometry>): Map<string, BranchGeometry> {
  const [current, setCurrent] = useState(targets);
  const currentRef = useRef(targets);
  currentRef.current = current;
  const isFirstRun = useRef(true);

  const targetsKey = useMemo(
    () =>
      [...targets.entries()]
        .map(([id, g]) => `${id}:${g.bearing.toFixed(1)}:${g.length.toFixed(1)}`)
        .sort()
        .join("|"),
    [targets],
  );

  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      setCurrent(targets);
      return;
    }
    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      setCurrent(targets);
      return;
    }

    const from = new Map(currentRef.current);
    const start = performance.now();
    const DURATION = 500;
    let frame: number;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION);
      const eased = easeInOutCubic(t);
      const next = new Map<string, BranchGeometry>();
      for (const [id, target] of targets) {
        // A newly appearing future grows outward from the center.
        const prev = from.get(id) ?? { bearing: target.bearing, length: BRANCH_START };
        next.set(id, {
          bearing: prev.bearing + shortestAngleDelta(prev.bearing, target.bearing) * eased,
          length: prev.length + (target.length - prev.length) * eased,
        });
      }
      setCurrent(next);
      if (t < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetsKey]);

  return current;
}

// ---------------------------------------------------------------------------
// Center
// ---------------------------------------------------------------------------

function CenterYou({ visible }: { visible: boolean }) {
  return (
    <g
      className={`transition-opacity duration-200 motion-reduce:transition-none ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      <circle cx={CENTER} cy={CENTER} r={RING_RADIUS} fill="none" stroke="#d4d4d8" strokeWidth={1.5} />
      <circle cx={CENTER} cy={CENTER} r={13} fill="#18181b" />
      <text
        x={CENTER}
        y={CENTER + 46}
        textAnchor="middle"
        fontSize={13.5}
        fontWeight={700}
        fill="#18181b"
        paintOrder="stroke"
        stroke="#fafafa"
        strokeWidth={4}
        className="select-none"
      >
        You
      </text>
    </g>
  );
}

// ---------------------------------------------------------------------------
// Explorer
// ---------------------------------------------------------------------------

export function FutureSelvesExplorer({ futureSelves }: FutureSelvesExplorerProps) {
  const active = useMemo(
    () => futureSelves.filter((f) => f.status === "active"),
    [futureSelves],
  );
  const faded = useMemo(
    () => futureSelves.filter((f) => f.status === "faded"),
    [futureSelves],
  );

  // Tree-first: nothing is selected on load. The card exists only as a
  // temporary deep dive in a modal.
  const [openId, setOpenId] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const triggerRef = useRef<SVGGElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  const openFuture = active.find((f) => f.id === openId) ?? null;

  // Intro choreography (center → branches draw → nodes → labels), ≤700ms.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  // Layout: resolved bearings + absolute establishment lengths, settled via
  // animation. Each branch's length depends only on its own percentage.
  const layoutTargets = useMemo(() => {
    const bearings = resolveBearings(active);
    const map = new Map<string, BranchGeometry>();
    for (const f of active) {
      map.set(f.id, {
        bearing: bearings.get(f.id)!,
        length: branchLength(Math.max(0, Math.min(100, f.percentage))),
      });
    }
    return map;
  }, [active]);
  const layout = useSettlingLayout(layoutTargets);

  // Modal open/close plumbing.
  const close = useCallback(() => {
    setClosing(true);
    window.setTimeout(() => {
      setClosing(false);
      setOpenId(null);
      triggerRef.current?.focus();
      triggerRef.current = null;
    }, 160);
  }, []);

  useEffect(() => {
    if (!openId) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [openId, close]);

  const trapTab = (event: React.KeyboardEvent) => {
    if (event.key !== "Tab" || !dialogRef.current) return;
    const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
      'button, summary, a[href], [tabindex]:not([tabindex="-1"])',
    );
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const fadedSection =
    faded.length > 0 ? (
      <details className="group mt-3">
        <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium text-zinc-700 [&::-webkit-details-marker]:hidden">
          <span aria-hidden="true" className="text-zinc-400">
            <span className="group-open:hidden">▶</span>
            <span className="hidden group-open:inline">▼</span>
          </span>
          Faded Futures ({faded.length})
        </summary>
        <p className="mt-2 text-sm text-zinc-500">
          Paths that once emerged but are no longer being reinforced. Active
          futures are the ones currently shaping your trajectory.
        </p>
        <div className="mt-4 flex flex-col gap-3">
          {faded.map((futureSelf) => (
            <FutureCard key={futureSelf.id} futureSelf={futureSelf} />
          ))}
        </div>
      </details>
    ) : null;

  if (active.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col items-center">
        <svg viewBox={`0 0 ${SIZE} 240`} className="w-56" aria-hidden="true">
          <g transform={`translate(0 ${120 - CENTER})`}>
            <CenterYou visible />
          </g>
        </svg>
        <p className="text-center text-sm leading-relaxed text-zinc-500">
          No active future trajectories yet.
          <br />
          As you make more decisions and complete more reflections, possible
          futures will begin to emerge.
        </p>
        {fadedSection}
      </div>
    );
  }

  const modalOpen = openFuture !== null;

  return (
    <div className="mx-auto w-full max-w-3xl">
      <h2 className="text-base font-semibold text-zinc-900">
        Which future are you becoming?
      </h2>
      <p className="mt-1 text-sm text-zinc-500">
        Each branch is a possible life. Select one to explore it.
      </p>

      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        // Height-driven on desktop so title + tree + faded section share one
        // laptop viewport; width-driven on mobile where vertical scroll is
        // natural.
        className="mx-auto mt-1 block h-auto w-full max-w-full overflow-visible lg:h-[min(62vh,540px)] lg:w-auto"
        aria-label="Map of your possible future selves. Longer branches are more established futures; the filled part of each branch shows how much current evidence reinforces it."
      >
        {active.map((futureSelf) => {
          const geometry = layout.get(futureSelf.id) ?? layoutTargets.get(futureSelf.id)!;
          const { cos, sin } = directionFor(geometry.bearing);
          const isOpen = futureSelf.id === openId;
          const isFocused = futureSelf.id === focusedId;

          const pct = Math.max(0, Math.min(100, futureSelf.percentage));
          const radius = nodeRadius(pct, isOpen);
          const end = geometry.length;

          const x1 = CENTER + cos * BRANCH_START;
          const y1 = CENTER + sin * BRANCH_START;
          const x2 = CENTER + cos * (end - radius);
          const y2 = CENTER + sin * (end - radius);
          const nodeX = CENTER + cos * end;
          const nodeY = CENTER + sin * end;

          const labelDistance = end + radius + 12;
          const labelX = CENTER + cos * labelDistance;
          const blockShift = sin < -0.35 ? -19 : sin > 0.35 ? 6 : -7;
          const labelY = CENTER + sin * labelDistance + blockShift;

          return (
            <g
              key={futureSelf.id}
              role="button"
              tabIndex={0}
              aria-haspopup="dialog"
              aria-label={`${futureSelf.name}, ${pct} percent, ${futureSelf.evidence_strength}. Press to explore this future.`}
              className={`cursor-pointer outline-none transition-opacity duration-300 motion-reduce:transition-none ${
                modalOpen
                  ? isOpen
                    ? "opacity-100"
                    : "opacity-20"
                  : "opacity-90 hover:opacity-100 focus:opacity-100"
              }`}
              onClick={(event) => {
                triggerRef.current = event.currentTarget;
                setOpenId(futureSelf.id);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  triggerRef.current = event.currentTarget;
                  setOpenId(futureSelf.id);
                }
              }}
              onFocus={() => setFocusedId(futureSelf.id)}
              onBlur={() => setFocusedId(null)}
            >
              {/* Track: the full reach of this branch — quiet. */}
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                pathLength={100}
                stroke="#e4e4e7"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeDasharray="100 100"
                strokeDashoffset={mounted ? 0 : 100}
                className="[transition:stroke-dashoffset_380ms_ease-out_100ms] motion-reduce:[transition:none]"
              />
              {/* Fill: evidence currently reinforcing this path. */}
              {pct > 0 ? (
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  pathLength={100}
                  stroke={isOpen ? "#09090b" : "#3f3f46"}
                  strokeWidth={3 + Math.min(1.5, pct / 45)}
                  strokeLinecap="round"
                  strokeDasharray={`${mounted ? pct : 0} 100`}
                  className="[transition:stroke-dasharray_450ms_ease-out_180ms,stroke_300ms] motion-reduce:[transition:none]"
                />
              ) : null}
              {/* Focus ring (keyboard) */}
              {isFocused && !modalOpen ? (
                <circle
                  cx={nodeX}
                  cy={nodeY}
                  r={radius + 6}
                  fill="none"
                  stroke="#71717a"
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                />
              ) : null}
              {/* Endpoint: scaled subtly by how established the future is. */}
              <circle
                cx={nodeX}
                cy={nodeY}
                r={radius}
                fill={isOpen ? "#09090b" : "#fafafa"}
                stroke={isOpen ? "#09090b" : "#71717a"}
                strokeWidth={2}
                opacity={mounted ? 1 : 0}
                className="[transition:fill_250ms,stroke_250ms,r_250ms,opacity_200ms_420ms] motion-reduce:[transition:none]"
              />
              {/* Label: name over metadata, always outward. */}
              <text
                x={labelX}
                y={labelY}
                textAnchor={labelAnchor(cos)}
                dominantBaseline="middle"
                paintOrder="stroke"
                stroke="#fafafa"
                strokeWidth={4}
                opacity={mounted ? 1 : 0}
                className="select-none [transition:opacity_200ms_520ms] motion-reduce:[transition:none]"
              >
                <tspan x={labelX} fontSize={14} fontWeight={600} fill="#3f3f46">
                  {futureSelf.name}
                </tspan>
                <tspan x={labelX} dy={15.5} fontSize={10.5} fill="#a1a1aa">
                  {pct}% • {futureSelf.evidence_strength}
                </tspan>
              </text>
            </g>
          );
        })}

        <CenterYou visible={mounted} />
      </svg>

      {fadedSection}

      {/* Deep dive: a temporary, centered exploration of one future. */}
      {openFuture ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
          role="presentation"
          onClick={close}
        >
          <div
            aria-hidden="true"
            className={`absolute inset-0 bg-zinc-200/50 backdrop-blur-[2px] ${
              closing ? "modal-backdrop-out" : "modal-backdrop-in"
            }`}
          />
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={openFuture.name}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={trapTab}
            className={`relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-xl shadow-xl ${
              closing ? "modal-out" : "modal-in"
            }`}
          >
            <button
              ref={closeButtonRef}
              type="button"
              aria-label={`Close ${openFuture.name}`}
              onClick={close}
              className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full text-lg leading-none text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500"
            >
              ×
            </button>
            <FutureCard futureSelf={openFuture} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
