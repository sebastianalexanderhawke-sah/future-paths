"use client";

import { useState } from "react";

import type { ReflectionCheckIn } from "@/lib/reflections";
import { SituationTitleExpander } from "@/components/reflections/situation-title-expander";

const RECENT_COUNT = 5;

type CompletedReflectionsListProps = {
  checkIns: ReflectionCheckIn[];
};

export function CompletedReflectionsList({ checkIns }: CompletedReflectionsListProps) {
  const [showingAll, setShowingAll] = useState(false);

  const olderCount = Math.max(0, checkIns.length - RECENT_COUNT);
  const visible = showingAll ? checkIns : checkIns.slice(0, RECENT_COUNT);

  return (
    <div className="flex flex-col gap-4">
      {visible.map((checkIn) => {
        const summary =
          checkIn.moment.current_understanding ?? checkIn.moment.description ?? null;
        return (
          <article
            key={checkIn.id}
            className="rounded-lg border border-zinc-200 bg-white px-5 py-5"
          >
            <SituationTitleExpander
              title={checkIn.moment.title}
              date={new Date(checkIn.created_at).toLocaleDateString()}
              summary={summary}
            />
            <p className="mt-3 text-sm font-medium text-zinc-900">
              {checkIn.reflection_question}
            </p>
            <div className="mt-4 rounded-lg border border-zinc-100 bg-zinc-50 px-4 py-3">
              <p className="text-xs text-zinc-400">Predicted answer</p>
              <p className="mt-1 text-sm text-zinc-600">{checkIn.identity_impact}</p>
            </div>
            {checkIn.reflection_answer ? (
              <div className="mt-3">
                <p className="text-xs text-zinc-400">Your answer</p>
                <p className="mt-1 text-sm text-zinc-900">{checkIn.reflection_answer}</p>
              </div>
            ) : null}
          </article>
        );
      })}

      {olderCount > 0 ? (
        <button
          type="button"
          onClick={() => setShowingAll((s) => !s)}
          className="text-left text-sm text-zinc-500 hover:text-zinc-700"
        >
          {showingAll ? "Show fewer" : `View older reflections (${olderCount})`}
        </button>
      ) : null}
    </div>
  );
}
