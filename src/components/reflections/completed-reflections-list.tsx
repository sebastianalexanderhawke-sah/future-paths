"use client";

import { useState } from "react";

import type { ReflectionCheckIn } from "@/lib/reflections";
import { SituationTitleExpander } from "@/components/reflections/situation-title-expander";

const RECENT_COUNT = 5;

type CompletedReflectionsListProps = {
  checkIns: ReflectionCheckIn[];
};

function ReflectionCard({ checkIn }: { checkIn: ReflectionCheckIn }) {
  const summary =
    checkIn.moment.current_understanding ?? checkIn.moment.description ?? null;
  return (
    <article className="rounded-lg border border-zinc-200 bg-white px-5 py-5">
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
}

export function CompletedReflectionsList({ checkIns }: CompletedReflectionsListProps) {
  const [archiveOpen, setArchiveOpen] = useState(false);

  const recent = checkIns.slice(0, RECENT_COUNT);
  const older = checkIns.slice(RECENT_COUNT);

  return (
    <div className="flex flex-col gap-10">
      <section>
        <h2 className="text-sm font-medium text-zinc-900">Recent reflections</h2>
        <div className="mt-4 flex flex-col gap-4">
          {recent.map((checkIn) => (
            <ReflectionCard key={checkIn.id} checkIn={checkIn} />
          ))}
        </div>
      </section>

      {older.length > 0 ? (
        <section>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-zinc-900">Reflection archive</h2>
            <button
              type="button"
              onClick={() => setArchiveOpen((o) => !o)}
              className="text-sm text-zinc-500 hover:text-zinc-700"
            >
              {archiveOpen ? "Collapse ↑" : "Expand ↓"}
            </button>
          </div>
          {archiveOpen ? (
            <div className="mt-4 flex flex-col gap-4">
              {older.map((checkIn) => (
                <ReflectionCard key={checkIn.id} checkIn={checkIn} />
              ))}
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
