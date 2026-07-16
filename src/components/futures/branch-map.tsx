"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import {
  BRANCH_STROKE,
  RENDER_H,
  RENDER_W,
  VIEW_CENTER,
  VIEW_H,
  VIEW_W,
  layoutBranches,
  type PlacedBranch,
} from "@/components/futures/branch-language";
import { FutureIcon } from "@/components/icons";
import type { FutureSelf } from "@/types/database";

/**
 * How selecting a branch behaves — the ONLY thing the two surfaces are
 * allowed to differ on (besides the size of the chart area they give the
 * map). The overview navigates to the dedicated page; the dedicated page
 * opens the deep-dive dialog.
 */
export type BranchMapInteraction =
  | {
      kind: "link";
      href: string;
      /** When set, selecting a branch deep-links to
          `{href}?{selectParam}={futureSelf.id}` — the dedicated page with
          that future's card already open. A plain string, never a
          function: this prop crosses the server→client boundary. */
      selectParam?: string;
    }
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
 * The canonical Future Selves visualization — the composed stage: "You" at
 * the center, one curved branch per possible future, each cast into an
 * authored station (protagonist, challenger, kin pair, outlier — see
 * branch-language.ts). The composition is designed, not solved: the leading
 * future owns the open side of the card, kindred lives stand deliberately
 * close, and one region always stays empty. Visual weight — stroke, marker
 * size, arrival ring, opacity — follows likelihood on top of the prominence
 * the stage grants. Both the overview's Future Paths card and the dedicated
 * Future Selves page render THIS component — identical geometry, ordering,
 * colors, and motion everywhere; only scale and interaction differ.
 *
 * When a likelihood moves after a check-in or reflection WITHOUT changing
 * rank order, the future advances or retreats along its own unchanged
 * approach. A rank change recasts the scene — a deliberate, visible
 * recomposition.
 */
export function BranchMap({ futureSelves, interaction, widthClassName = "" }: BranchMapProps) {
  const router = useRouter();
  const branches = layoutBranches(futureSelves);
  // The strongest future carries the most visual weight; its label leads too.
  const leadingPct = branches.reduce((max, b) => Math.max(max, b.pct), 0);

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

  const linkHref = (futureSelf: FutureSelf): string => {
    if (interaction.kind !== "link") return "";
    return interaction.selectParam
      ? `${interaction.href}?${interaction.selectParam}=${futureSelf.id}`
      : interaction.href;
  };

  const select = (branch: PlacedBranch) => {
    if (interaction.kind === "link") {
      router.push(linkHref(branch.futureSelf));
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
        <span className="font-voice flex h-[68px] w-[68px] items-center justify-center rounded-full border border-[#ececf0] bg-white text-[16px] font-medium text-[#111] shadow-[0_10px_36px_rgba(17,17,17,0.10),0_2px_8px_rgba(17,17,17,0.05)]">
          You
        </span>
        <p className="mt-4 max-w-[380px] text-center text-[13px] leading-relaxed text-[#707070]">
          Every situation can lead in a different direction. As you choose
          paths and check in on how they&apos;re going, the people you may be
          becoming branch out from here — each one growing stronger or fading
          with what you actually do.
        </p>
        <Link
          href="/moments"
          className="mt-4 rounded-md px-1 text-[13px] font-medium text-[#7c3aed] transition-opacity duration-150 hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--action-ring)] focus-visible:ring-offset-2"
        >
          Explore a situation →
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
      {/* Orbit rings: quiet reference marks that sit UNDERNEATH the
          visualization — they are not layout guides and no station
          references them. Two TRUE circles, perfectly concentric and
          evenly spaced (radii 62px and 124px at the canonical 966×260
          chart — equal 62px intervals from the center), so the backdrop
          reads as a calm instrument. The authored stages range well past
          them horizontally: destinations stand in open space, not inside
          a bubble. */}
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 aspect-square h-[47.69%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#eeeef2]"
      />
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 aspect-square h-[95.38%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#f2f2f5]"
      />

      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        {/* Each branch fades in from the center and arrives saturated at
            its destination — the journey gains conviction as it travels.
            User-space gradients along the center→tip chord, so the ramp
            follows the branch at any rendered size. */}
        <defs>
          {branches.map(({ futureSelf, accent, tip }) => (
            <linearGradient
              key={futureSelf.id}
              id={`branch-grad-${futureSelf.id}`}
              gradientUnits="userSpaceOnUse"
              x1={VIEW_CENTER[0]}
              y1={VIEW_CENTER[1]}
              x2={tip[0]}
              y2={tip[1]}
            >
              <stop offset="0" stopColor={accent.color} stopOpacity={0.22} />
              <stop offset="1" stopColor={accent.color} />
            </linearGradient>
          ))}
        </defs>
        {branches.map((branch) => {
          const { futureSelf, accent, curve, reach, weight } = branch;
          const isActive = activeId === futureSelf.id;
          const isOpen = openId === futureSelf.id;
          // Visual weight: the likeliest futures carry the heaviest, most
          // present strokes; emerging ones stay light. Screen-space pixels
          // (non-scaling-stroke), so the hierarchy holds at every size.
          const strokeWidth = BRANCH_STROKE - 1 + 3 * weight;
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
                stroke={`url(#branch-grad-${futureSelf.id})`}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                opacity={isActive || isOpen ? 1 : 0.62 + 0.3 * weight}
                vectorEffect="non-scaling-stroke"
                style={{ d: `path('${grownD}')` } as React.CSSProperties}
                className="[transition:d_600ms_cubic-bezier(0.22,1,0.36,1),stroke-width_600ms_cubic-bezier(0.22,1,0.36,1),opacity_200ms_ease-out] motion-reduce:[transition:none]"
              />
            </g>
          );
        })}
      </svg>

      {/* Center "You" — the point of departure, speaking in the same
          serif voice as the destinations. */}
      <div className="font-voice absolute left-1/2 top-1/2 z-10 flex h-[68px] w-[68px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[#ececf0] bg-white text-[16px] font-medium text-[#111] shadow-[0_10px_36px_rgba(17,17,17,0.10),0_2px_8px_rgba(17,17,17,0.05)]">
        You
      </div>

      {/* Destination markers with attached signposts — each one the
          branch's real interactive element. The marker glides along its
          branch as the likelihood moves. */}
      {branches.map((branch) => {
        const { futureSelf, accent, tip, labelStyle, weight } = branch;
        const isActive = activeId === futureSelf.id;
        const isOpen = openId === futureSelf.id;
        // Hover, keyboard focus, or the open dialog all "light" the
        // destination: ring widens and saturates, emblem fills, name
        // underlines — one shared arrival language for every affordance.
        const isLit = isActive || isOpen;
        const isLeading = branch.pct === leadingPct;
        // Marker core and arrival ring scale with the future's
        // establishment, so the map's hierarchy reads before any label is.
        const dotSize = 13 + 9 * weight;
        const ringSize = dotSize + 12 + 2 * weight + (isLit ? 4 : 0);
        const positionClass =
          "group absolute z-10 h-0 w-0 cursor-pointer outline-none [transition:left_600ms_cubic-bezier(0.22,1,0.36,1),top_600ms_cubic-bezier(0.22,1,0.36,1),opacity_200ms_ease-out] motion-reduce:[transition:none]";
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
            {/* Keyboard focus ring: the "lit" hover treatment alone is too
                subtle to satisfy focus visibility, so keyboard focus draws
                the platform's ink ring around the waypoint. */}
            <span
              aria-hidden="true"
              className="absolute hidden rounded-full border-2 group-focus-visible:block"
              style={{
                width: ringSize + 10,
                height: ringSize + 10,
                borderColor: "var(--action-ring)",
                transform: "translate(-50%, -50%)",
              }}
            />
            {/* Waypoint core: the accent point in a thin white ring, lifted
                by a soft tinted shadow. The place itself. */}
            <span
              aria-hidden="true"
              className="absolute rounded-full transition-[transform,box-shadow,width,height] duration-200 ease-out motion-reduce:transition-none"
              style={{
                width: dotSize,
                height: dotSize,
                background: accent.color,
                transform: `translate(-50%, -50%) scale(${isLit ? 1.18 : 1})`,
                boxShadow: `0 0 0 2px #fff, 0 2px ${Math.round(7 + 6 * weight)}px ${accent.color}${isLit ? "59" : "40"}`,
              }}
            />
            {/* Arrival ring: a detached hairline circle with clear air
                between it and the core — the cartographic mark for a
                surveyed place, not a graph node's halo. It widens and
                saturates when the destination is lit; the CHOSEN one (its
                dialog open) holds a slightly firmer, deeper ring than a
                passing hover — clearly selected, same colors, no louder. */}
            <span
              aria-hidden="true"
              className="absolute rounded-full border transition-[width,height,border-color] duration-200 ease-out motion-reduce:transition-none"
              style={{
                width: ringSize,
                height: ringSize,
                borderWidth: isOpen ? 1.5 : 1,
                borderColor: `${accent.color}${isOpen ? "b3" : isLit ? "8c" : "4d"}`,
                transform: "translate(-50%, -50%)",
              }}
            />
            {/* Signpost anchored to the marker, extending outward: the
                destination's emblem chip leading its name — set in the
                product's serif voice, the same voice that titles this
                future in its own card — over a quiet tracked caption.
                The chip always leads (emblem → text), the same reading
                order at every station. */}
            <span
              className="absolute flex items-center gap-2.5 whitespace-nowrap"
              style={labelStyle}
            >
              <span
                aria-hidden="true"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] transition-colors duration-200 ease-out motion-reduce:transition-none"
                style={{
                  background: isLit ? accent.color : accent.soft,
                  color: isLit ? "#ffffff" : accent.color,
                }}
              >
                <FutureIcon identityId={futureSelf.identity_id} size={15} />
              </span>
              <span className="block">
                <span
                  className="font-voice block leading-tight tracking-[-0.01em] transition-colors duration-200 ease-out motion-reduce:transition-none"
                  style={{
                    fontSize: isLeading ? 16 : 15,
                    fontWeight: 500,
                    color: isLit ? "#000" : isLeading ? "#111" : "#52525b",
                    textDecorationLine: isLit ? "underline" : "none",
                    textDecorationColor: `${accent.color}66`,
                    textDecorationThickness: 1,
                    textUnderlineOffset: 4,
                  }}
                >
                  {futureSelf.name}
                </span>
                <span className="mt-0.5 block text-[11px] font-semibold uppercase tracking-[0.08em]">
                  <span style={{ color: accent.text }}>{branch.pct}%</span>
                  <span className="text-[#71717a]">
                    {" "}
                    · {futureSelf.evidence_strength}
                  </span>
                </span>
              </span>
            </span>
          </>
        );

        if (interaction.kind === "link") {
          return (
            <Link
              key={futureSelf.id}
              href={linkHref(futureSelf)}
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
