"use client";

import { useEffect, useId, useRef, useState } from "react";

import { FutureCard } from "@/components/futures/future-card";
import { OverviewCard } from "@/components/overview/overview-card";
import { asLastActive, getFadeStory } from "@/lib/future-self-story";
import type { FutureSelf, FutureSelfEvent } from "@/types/database";

type FadedFutureCardProps = {
  futureSelf: FutureSelf;
  /** This future's recorded event history, oldest first. */
  events?: FutureSelfEvent[];
};

/**
 * One faded future as its own independent section card, in the same layout
 * language as the Current Self page: bold header with a quiet subtitle, the
 * story fully visible and breathing — no accordion chrome. The identity and
 * the event stay distinct: the card body tells the fade's story (arc, why,
 * evidence), and the original Future Self card is preserved behind the
 * platform's quiet inline disclosure (the AnalysisDisclosure pattern), so
 * revisiting it feels like meeting an older version of yourself.
 */
export function FadedFutureCard({ futureSelf, events = [] }: FadedFutureCardProps) {
  const story = getFadeStory(futureSelf, events);
  const [showOriginal, setShowOriginal] = useState(false);
  const originalRef = useRef<HTMLDivElement | null>(null);
  const originalId = useId();

  // The preserved card is far taller than the disclosure link that reveals
  // it, and it mounts above that link — without this, opening it leaves the
  // reader partway down a card whose beginning is off-screen. Walking its
  // top into the viewport makes the reveal feel intentional (the page's
  // global scroll-behavior keeps it smooth, and instant under
  // prefers-reduced-motion).
  useEffect(() => {
    if (showOriginal) {
      originalRef.current?.scrollIntoView({ block: "start" });
    }
  }, [showOriginal]);

  const subtitleFacts = [
    "A path that faded",
    story.lastStrength !== null && story.lastStrength > 0
      ? `held ${story.lastStrength}%`
      : null,
    story.fadedOn,
  ].filter(Boolean);

  return (
    <OverviewCard className="px-9 py-7">
      <div className="mb-6 flex items-start justify-between gap-8">
        <div>
          <h2 className="text-[17px] font-bold text-[#111]">{futureSelf.name}</h2>
          <p className="mt-[3px] text-[13px] text-[#6b6b6b]">
            {subtitleFacts.join(" · ")}
          </p>
        </div>
        {/* The whole arc in one quiet line, off to the side. */}
        {story.trajectory.length > 1 ? (
          <p className="mt-1 shrink-0 text-[13px] tabular-nums text-[#767676]">
            {story.trajectory.join(" → ")}
          </p>
        ) : null}
      </div>

      <div className="grid gap-x-12 gap-y-6 md:grid-cols-2">
        <div>
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#aaaaaa]">
            Why this path faded
          </h3>
          <p className="mt-2.5 max-w-[52em] text-[14px] leading-[1.7] text-[#707070]">
            {story.why}
          </p>
        </div>

        {story.evidence.length > 0 ? (
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#aaaaaa]">
              {story.evidenceLabel}
            </h3>
            <ul className="mt-2.5 max-w-[52em] space-y-2">
              {story.evidence.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2.5 text-[14px] leading-[1.7] text-[#707070]"
                >
                  <span aria-hidden="true" className="mt-0.5 shrink-0 text-[#d4d4d8]">
                    —
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      {/* The identity itself, preserved as it last stood — revealed with the
          same quiet inline disclosure the Current Self analysis uses. */}
      <div className="mt-6">
        {showOriginal ? (
          <div id={originalId} ref={originalRef} className="mb-5 scroll-mt-6">
            <FutureCard futureSelf={asLastActive(futureSelf)} />
          </div>
        ) : null}
        <button
          type="button"
          aria-expanded={showOriginal}
          aria-controls={showOriginal ? originalId : undefined}
          onClick={() => setShowOriginal((current) => !current)}
          className="cursor-pointer text-[13px] font-medium text-[#7c3aed] transition-opacity duration-150 hover:opacity-80"
        >
          {showOriginal ? "Hide original Future Self" : "View original Future Self →"}
        </button>
      </div>
    </OverviewCard>
  );
}
