import Link from "next/link";

import { dismissEmergingSituationAction } from "@/actions/emerging-situations";
import type { EmergingSituationSuggestion } from "@/types/database";

type EmergingSituationCalloutProps = {
  momentId: string;
  suggestion: EmergingSituationSuggestion;
};

/**
 * A small dismissible notice that Reflection thinks this situation's recent
 * entries have become a different story. Deliberately quieter than the work
 * cards around it: it suggests, never insists, and never creates anything —
 * "Start new situation" only opens the creation flow with the suggested
 * title and description prefilled for the user to edit.
 */
export function EmergingSituationCallout({
  momentId,
  suggestion,
}: EmergingSituationCalloutProps) {
  const startHref = `/moments/new?title=${encodeURIComponent(
    suggestion.title,
  )}&context=${encodeURIComponent(suggestion.description)}`;

  return (
    <div className="rounded-2xl border border-[#e0e7ff] bg-[#eef2ff]/60 px-6 py-5">
      <h2 className="text-[14px] font-semibold text-[#111]">
        Reflection noticed a new story emerging.
      </h2>
      <p className="mt-1 max-w-[52em] text-[13px] leading-relaxed text-[#666666]">
        Your recent entries seem to be about a different chapter than this
        situation originally began with.
      </p>
      <div className="mt-3.5 flex items-center gap-3">
        <Link
          href={startHref}
          className="rounded-[10px] bg-[#111] px-4 py-2 text-[13px] font-semibold text-white transition-opacity duration-150 hover:opacity-[0.88]"
        >
          Start new situation
        </Link>
        <form action={dismissEmergingSituationAction}>
          <input type="hidden" name="momentId" value={momentId} />
          <button
            type="submit"
            className="cursor-pointer rounded-[10px] px-3 py-2 text-[13px] font-medium text-[#888888] transition-colors duration-150 hover:text-[#111]"
          >
            Dismiss
          </button>
        </form>
      </div>
    </div>
  );
}
