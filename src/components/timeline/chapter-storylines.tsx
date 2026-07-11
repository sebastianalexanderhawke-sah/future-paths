"use client";

import { useState } from "react";

import { ChapterSurface } from "@/components/timeline/chapter-surface";
import type { ChapterStoryline } from "@/lib/timeline-chapter-story";

type ChapterStorylinesProps = {
  /** Already ranked most-meaningful first; the first entry is the featured situation. */
  storylines: ChapterStoryline[];
};

function StageLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#b3b3bb]">
      {children}
    </p>
  );
}

/**
 * One situation, told as its own story on its own elevated surface — nested
 * inside the month's chapter card. The beginning and end sit side by side
 * with the arrow between them, so the first thing the card communicates is
 * progression, not prose; on narrow screens the columns stack and the arrow
 * turns downward.
 */
function StorylineCard({ storyline }: { storyline: ChapterStoryline }) {
  return (
    <ChapterSurface className="px-6 py-5">
      <p className="text-[15px] font-bold leading-snug text-[#111]">
        {storyline.title}
      </p>

      {storyline.beginning ? (
        <div className="mt-3.5 flex flex-col gap-3 sm:grid sm:grid-cols-[1fr_auto_1fr] sm:items-start sm:gap-5">
          <div>
            <StageLabel>Beginning</StageLabel>
            <p className="mt-1 text-[14px] leading-[1.6] text-[#777777]">
              {storyline.beginning}
            </p>
          </div>
          <div
            aria-hidden="true"
            className="text-[14px] leading-none text-[#c9c9d1] sm:pt-6"
          >
            <span className="hidden sm:inline">⟶</span>
            <span className="sm:hidden">↓</span>
          </div>
          <div>
            <StageLabel>End</StageLabel>
            {storyline.end.map((line) => (
              <p
                key={line}
                className="mt-1 text-[14px] leading-[1.6] text-[#333333]"
              >
                {line}
              </p>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-3.5">
          <StageLabel>End</StageLabel>
          {storyline.end.map((line) => (
            <p
              key={line}
              className="mt-1 max-w-[48em] text-[14px] leading-[1.6] text-[#333333]"
            >
              {line}
            </p>
          ))}
        </div>
      )}
    </ChapterSurface>
  );
}

/**
 * Progressive disclosure around one featured situation: the month's
 * biggest storyline is always visible; the rest stay folded behind a single
 * "Show N more chapters" control so large months stay calm.
 */
export function ChapterStorylines({ storylines }: ChapterStorylinesProps) {
  const [expanded, setExpanded] = useState(false);

  if (storylines.length === 0) {
    return null;
  }

  const [featured, ...rest] = storylines;

  return (
    <div className="flex flex-col gap-4">
      <StorylineCard storyline={featured} />

      {expanded
        ? rest.map((storyline) => (
            <StorylineCard key={storyline.momentId} storyline={storyline} />
          ))
        : null}

      {rest.length > 0 ? (
        /* The app's primary action style — the same control language as the
           chapter's own Show/Close button, Workspace, and Situations. */
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((current) => !current)}
          className="mt-1 cursor-pointer self-start rounded-[10px] bg-[#111] px-[18px] py-2.5 text-[13px] font-semibold text-white transition-opacity duration-150 hover:opacity-[0.88]"
        >
          {expanded
            ? "Hide stories"
            : `Show ${rest.length} more ${rest.length === 1 ? "story" : "stories"}`}
        </button>
      ) : null}
    </div>
  );
}
