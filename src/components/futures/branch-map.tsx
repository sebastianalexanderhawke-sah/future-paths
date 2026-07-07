"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import {
  BRANCH_STROKE,
  RENDER_H,
  RENDER_W,
  VIEW_H,
  VIEW_W,
  layoutBranches,
  type PlacedBranch,
} from "@/components/futures/branch-language";
import type { FutureSelf } from "@/types/database";

/**
 * How selecting a branch behaves — the ONLY thing the two surfaces are
 * allowed to differ on (besides the size of the chart area they give the
 * map). The overview navigates to the dedicated page; the dedicated page
 * opens the deep-dive dialog.
 */
export type BranchMapInteraction =
  | { kind: "link"; href: string }
  | {
      kind: "dialog";
      /** The future currently open in the dialog, if any — it stays fully
          present while siblings recede further than on hover. */
      openId: string | null;
      /** `trigger` is the branch's endpoint element, for focus return. */
      onOpen: (futureSelf: FutureSelf, trigger: HTMLElement | null) => void;
    };

type BranchMapProps = {
  futureSelves: FutureSelf[];
  interaction: BranchMapInteraction;
  /**
   * Width (and margin) utilities only — e.g. "max-w-[460px]" or "mt-4
   * max-w-[720px]". The map owns its own height via the canonical aspect
   * ratio; passing height utilities here would reintroduce per-page
   * stretching, which is exactly the geometry drift this component exists
   * to prevent.
   */
  widthClassName?: string;
};

function toPercent([x, y]: readonly [number, number]): React.CSSProperties {
  return { left: `${(x / VIEW_W) * 100}%`, top: `${(y / VIEW_H) * 100}%` };
}

/**
 * The canonical Future Selves visualization: "You" at the center, one curved
 * branch per possible future, reach encoding how established each future is.
 * Both the overview's Future Paths card and the dedicated Future Selves page
 * render THIS component — identical angles, ordering, geometry, colors, and
 * growth behavior everywhere; only scale and interaction differ.
 *
 * When a likelihood moves after a check-in or reflection, the branch stays
 * in its slot and the reach change animates: the stroke grows or shrinks
 * along the same curve and the endpoint dot glides with it. The tree never
 * rotates and branches never reshuffle — spatial memory holds.
 */
export function BranchMap({ futureSelves, interaction, widthClassName = "" }: BranchMapProps) {
  const router = useRouter();
  const branches = layoutBranches(futureSelves);

  // Hovered or keyboard-focused branch: it brightens, siblings recede.
  const [activeId, setActiveId] = useState<string | null>(null);
  // Endpoint elements by future id, so a click anywhere on a branch can hand
  // the dialog a focus-return target.
  const endpointRefs = useRef(new Map<string, HTMLElement>());

  const openId = interaction.kind === "dialog" ? interaction.openId : null;

  const branchOpacity = (id: string) => {
    if (openId !== null) return id === openId ? 1 : 0.2;
    return activeId === null || activeId === id ? 1 : 0.3;
  };

  const select = (branch: PlacedBranch) => {
    if (interaction.kind === "link") {
      router.push(interaction.href);
      return;
    }
    interaction.onOpen(
      branch.futureSelf,
      endpointRefs.current.get(branch.futureSelf.id) ?? null,
    );
  };

  const hoverHandlers = (id: string) => ({
    onMouseEnter: () => setActiveId(id),
    onMouseLeave: () =>
      setActiveId((current) => (current === id ? null : current)),
  });

  if (branches.length === 0) {
    // No geometry to protect here, so no aspect lock — the original
    // Overview's fixed-height empty block, exactly as it always rendered.
    return (
      <div
        className={`mx-auto flex h-[240px] w-full flex-col items-center justify-center ${widthClassName}`}
      >
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
    );
  }

  return (
    // The chart area is locked to the canonical RENDERED aspect ratio — the
    // Overview card's original 966×260 chart box — so the viewBox→viewport
    // mapping is the same on every page at every width: identical rendered
    // angles everywhere, and any other surface is a faithful enlargement of
    // the Overview. Callers choose width only.
    <div
      className={`relative mx-auto w-full ${widthClassName}`}
      style={{ aspectRatio: `${RENDER_W} / ${RENDER_H}` }}
    >
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
        {branches.map((branch) => {
          const { futureSelf, accent, curve, reach } = branch;
          const isActive = activeId === futureSelf.id;
          const isOpen = openId === futureSelf.id;
          // The grown branch is a REAL sub-path ending exactly at the node
          // center (exact Bézier split) — never a dash pattern over the full
          // curve. Dash rendering is transform- and browser-dependent
          // (Chromium dashes non-scaling-stroke paths in screen space), and
          // was measured missing the node by up to ±38px.
          const grownD = curve.segmentD(reach);
          return (
            // The whole branch is a pointer target: it selects like the
            // endpoint and shares its hover state. Keyboard access lives on
            // the endpoint element, so this stays aria-hidden via the
            // parent svg.
            <g
              key={futureSelf.id}
              onClick={() => select(branch)}
              {...hoverHandlers(futureSelf.id)}
              style={{ opacity: branchOpacity(futureSelf.id), cursor: "pointer" }}
              className="transition-opacity duration-200 ease-out motion-reduce:transition-none"
            >
              {/* Invisible wide stroke — a comfortable hit area, congruent
                  with the visible branch. */}
              <path
                d={grownD}
                fill="none"
                stroke="transparent"
                strokeWidth={16}
                vectorEffect="non-scaling-stroke"
              />
              {/* The branch: center → node center, nothing beyond it.
                  Growth animates by transitioning the path itself (CSS `d`,
                  set in style so engines that support it glide; others snap
                  to the correct geometry). */}
              <path
                d={grownD}
                fill="none"
                stroke={accent.color}
                strokeWidth={BRANCH_STROKE}
                strokeLinecap="round"
                opacity={isActive || isOpen ? 1 : 0.85}
                vectorEffect="non-scaling-stroke"
                style={{ d: `path('${grownD}')` } as React.CSSProperties}
                className="[transition:d_600ms_cubic-bezier(0.22,1,0.36,1),opacity_200ms_ease-out] motion-reduce:[transition:none]"
              />
            </g>
          );
        })}
      </svg>

      {/* Center "You" — the anchor. */}
      <div className="absolute left-1/2 top-1/2 z-10 flex h-[68px] w-[68px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[#ececf0] bg-white text-[15px] font-semibold text-[#111] shadow-[0_10px_36px_rgba(17,17,17,0.10),0_2px_8px_rgba(17,17,17,0.05)]">
        You
      </div>

      {/* Endpoints with attached labels — each one the branch's real
          interactive element. The dot glides along its branch as the
          likelihood moves. */}
      {branches.map((branch) => {
        const { futureSelf, accent, tip, labelStyle } = branch;
        const isActive = activeId === futureSelf.id;
        const positionClass =
          "absolute z-10 h-0 w-0 cursor-pointer outline-none [transition:left_600ms_cubic-bezier(0.22,1,0.36,1),top_600ms_cubic-bezier(0.22,1,0.36,1),opacity_200ms_ease-out] motion-reduce:[transition:none]";
        const positionStyle = {
          ...toPercent(tip),
          opacity: branchOpacity(futureSelf.id),
        };
        const focusHandlers = {
          ...hoverHandlers(futureSelf.id),
          onFocus: () => setActiveId(futureSelf.id),
          onBlur: () =>
            setActiveId((current) =>
              current === futureSelf.id ? null : current,
            ),
        };
        const storeRef = (element: HTMLElement | null) => {
          if (element) endpointRefs.current.set(futureSelf.id, element);
          else endpointRefs.current.delete(futureSelf.id);
        };

        const contents = (
          <>
            {/* Endpoint: colored circle in a thin white ring over a soft
                halo — the destination marker. Grows and glows on
                hover/focus. */}
            <span
              aria-hidden="true"
              className="absolute h-[18px] w-[18px] rounded-full transition-[transform,box-shadow] duration-200 ease-out motion-reduce:transition-none"
              style={{
                background: accent.color,
                transform: `translate(-50%, -50%) scale(${isActive ? 1.3 : 1})`,
                boxShadow: isActive
                  ? `0 0 0 2px #fff, 0 0 0 8px ${accent.soft}, 0 0 18px 4px ${accent.color}66`
                  : `0 0 0 2px #fff, 0 0 0 7px ${accent.soft}, 0 3px 12px ${accent.color}55`,
              }}
            />
            {/* Label anchored to the dot, extending outward. */}
            <span className="absolute block whitespace-nowrap" style={labelStyle}>
              <span
                className="block text-[15px] leading-tight transition-colors duration-200 ease-out motion-reduce:transition-none"
                style={{
                  color: isActive ? "#000" : "#111",
                  fontWeight: isActive ? 600 : 500,
                }}
              >
                {futureSelf.name}
              </span>
              <span
                className="mt-0.5 block text-[12px] font-medium"
                style={{ color: accent.color }}
              >
                {branch.pct}% • {futureSelf.evidence_strength}
              </span>
            </span>
          </>
        );

        if (interaction.kind === "link") {
          return (
            <Link
              key={futureSelf.id}
              href={interaction.href}
              ref={storeRef}
              aria-label={`${futureSelf.name}, ${branch.pct} percent, ${futureSelf.evidence_strength}. Explore this future.`}
              className={positionClass}
              style={positionStyle}
              {...focusHandlers}
              onKeyDown={(event) => {
                // Links activate on Enter natively; add Space to match
                // button expectations without breaking modified clicks.
                if (event.key === " ") {
                  event.preventDefault();
                  event.currentTarget.click();
                }
              }}
            >
              {contents}
            </Link>
          );
        }

        return (
          <button
            key={futureSelf.id}
            type="button"
            ref={storeRef}
            aria-haspopup="dialog"
            aria-label={`${futureSelf.name}, ${branch.pct} percent, ${futureSelf.evidence_strength}. Explore this future.`}
            className={positionClass}
            style={positionStyle}
            onClick={() => select(branch)}
            {...focusHandlers}
          >
            {contents}
          </button>
        );
      })}
    </div>
  );
}
