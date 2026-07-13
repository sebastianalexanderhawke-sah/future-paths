"use client";

import { useState } from "react";

import { OverviewCard } from "@/components/overview/overview-card";
import { trackEvent } from "@/lib/analytics/client";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";

export type AccordionChapter = {
  /** Month label, e.g. "June 2026" — the accordion key and rail label. */
  month: string;
  /** The cover: month, chapter title, teaser, story count. */
  preview: React.ReactNode;
  /** The opened chapter: the same cover, then the story sections. */
  full: React.ReactNode;
};

type ChapterAccordionProps = {
  /** Newest first, matching the narratives order. */
  chapters: AccordionChapter[];
};

/**
 * The Timeline's chapter browser: every month is one card on the rail,
 * collapsed to its preview by default, and at most one month is open at a
 * time — opening a chapter closes the previous one, so the page always reads
 * as a shelf of chapters with a single story unfolded.
 */
export function ChapterAccordion({ chapters }: ChapterAccordionProps) {
  const [openMonth, setOpenMonth] = useState<string | null>(null);

  return (
    <div className="relative pb-14">
      {/* The rail: a quiet vertical thread every chapter hangs from. */}
      <div
        aria-hidden="true"
        className="absolute bottom-2 left-[7px] top-2 w-[2px] rounded-full bg-[#e8e8ee]"
      />
      <div className="flex flex-col gap-10">
        {chapters.map(({ month, preview, full }) => {
          const open = openMonth === month;
          return (
            <div key={month} className="relative pl-10">
              {/* Node on the rail; the month itself lives inside the cover. */}
              <span
                aria-hidden="true"
                className="absolute left-0 top-[26px] h-4 w-4 rounded-full border-[3px] border-white bg-[#047857] shadow-[0_0_0_1px_#e8e8ee]"
              />
              <OverviewCard className="px-8 pb-7 pt-7">
                {open ? full : preview}
                {/* The app's primary action style — same control language as
                    Workspace and Situations, not a bespoke text disclosure. */}
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => {
                    if (!open) {
                      trackEvent(ANALYTICS_EVENTS.timelineChapterOpened, { month });
                    }
                    setOpenMonth(open ? null : month);
                  }}
                  className="mt-6 cursor-pointer rounded-[10px] bg-[#111] px-[18px] py-2.5 text-[13px] font-semibold text-white transition-opacity duration-150 hover:opacity-[0.88]"
                >
                  {open ? "Close chapter" : "Show chapter"}
                </button>
              </OverviewCard>
            </div>
          );
        })}
      </div>
    </div>
  );
}
