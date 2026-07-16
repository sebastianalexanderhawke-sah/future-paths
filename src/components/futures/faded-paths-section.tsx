"use client";

import { useId, useState } from "react";

import { FadedFutureCard } from "@/components/futures/faded-future-card";
import { OverviewCard } from "@/components/overview/overview-card";
import type { FutureSelf, FutureSelfEvent } from "@/types/database";

type FadedPathsSectionProps = {
  /** Faded futures only, in display order. */
  futureSelves: FutureSelf[];
  /** Recorded evolution events per future_self_id, oldest first. */
  eventsByFutureSelf?: Record<string, FutureSelfEvent[]>;
};

/**
 * The page's ONE level of progressive disclosure for faded futures: a quiet
 * section card that says how many paths have faded, with a single inline
 * toggle. Expanding it renders every faded future immediately as a normal
 * sibling card in the page column — the cards themselves hide nothing
 * behind further accordions. Collapse exists to keep the page short, never
 * to bury the story.
 */
export function FadedPathsSection({
  futureSelves,
  eventsByFutureSelf = {},
}: FadedPathsSectionProps) {
  const [open, setOpen] = useState(false);
  const contentId = useId();

  if (futureSelves.length === 0) {
    return null;
  }

  const count = futureSelves.length;

  return (
    <>
      <OverviewCard className="px-9 py-7">
        <h2 className="text-[22px] font-bold tracking-[-0.3px] text-[#111]">
          Paths That Have Faded
        </h2>
        <p className="mt-1 text-[13px] text-[#707070]">
          {count === 1
            ? "One path has faded over time."
            : `${count} paths have faded over time.`}{" "}
          Still part of your story, and able to return.
        </p>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={open ? contentId : undefined}
          onClick={() => setOpen((current) => !current)}
          className="mt-4 inline-flex cursor-pointer items-center gap-1.5 rounded-[10px] bg-[#111] px-[18px] py-2.5 text-[13px] font-semibold text-white transition-opacity duration-150 hover:opacity-[0.88] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--action-ring)] focus-visible:ring-offset-2"
        >
          {/* The platform's one disclosure mark — a turning chevron, not
              text-glyph arrows. */}
          <svg
            viewBox="0 0 16 16"
            aria-hidden="true"
            className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ease-out motion-reduce:transition-none ${
              open ? "rotate-180" : ""
            }`}
          >
            <path
              d="M4 6l4 4 4-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {open ? "Hide faded paths" : "Show faded paths"}
        </button>
      </OverviewCard>

      {open ? (
        // display:contents wrapper: gives the disclosure a real
        // aria-controls target without disturbing the page column layout.
        <div id={contentId} className="contents">
          {futureSelves.map((futureSelf) => (
            <div key={futureSelf.id} className="reveal-in">
              <FadedFutureCard
                futureSelf={futureSelf}
                events={eventsByFutureSelf[futureSelf.id] ?? []}
              />
            </div>
          ))}
        </div>
      ) : null}
    </>
  );
}
