import Link from "next/link";

import { OverviewCard } from "@/components/overview/overview-card";

type PageLoadErrorProps = {
  /**
   * The page's own path. Retry is a plain anchor, not a client-side Link —
   * a full request is the point, bypassing any cached route state that a
   * soft navigation might serve back.
   */
  retryHref: string;
  /** The underlying error, shown quietly so it can be reported. */
  message: string;
};

/**
 * The calm full-page state for "this page's data failed to load", in the
 * house empty-state pattern (font-voice lead → reassurance → one action).
 * It replaces a bare red sentence on a gray void that answered none of the
 * reader's questions: it says what happened, promises nothing was lost, and
 * offers the two ways forward. Same tone as the route error boundary
 * (error.tsx), which handles thrown errors; this handles returned ones.
 */
export function PageLoadError({ retryHref, message }: PageLoadErrorProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f4f4f6] px-6 py-10 text-[#111]">
      <OverviewCard className="w-full max-w-[560px] px-9 py-14">
        <div className="flex flex-col items-center text-center">
          <p className="font-voice text-[22px] font-medium tracking-[-0.3px] text-[#111]">
            This page couldn&apos;t load.
          </p>
          <p className="mt-3 max-w-[440px] text-[13px] leading-relaxed text-[#707070]">
            Everything you&apos;ve recorded is safe — this was a problem
            fetching your data, not a change to it. Trying again usually
            resolves it.
          </p>
          <div className="mt-6 flex items-center gap-5">
            <a
              href={retryHref}
              className="rounded-[10px] bg-[#111] px-[18px] py-2.5 text-[13px] font-semibold text-white transition-opacity duration-150 hover:opacity-[0.88]"
            >
              Try again
            </a>
            <Link
              href="/overview"
              className="text-[13px] font-medium text-[#707070] transition-colors duration-150 hover:text-[#111]"
            >
              Back to Overview
            </Link>
          </div>
          <p className="mt-6 max-w-[440px] text-[12px] leading-relaxed text-[#767676]">
            {message}
          </p>
        </div>
      </OverviewCard>
    </div>
  );
}
