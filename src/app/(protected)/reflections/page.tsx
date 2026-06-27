import Link from "next/link";

import { CompletedReflectionsList } from "@/components/reflections/completed-reflections-list";
import { ReflectionPredictionCard } from "@/components/reflections/reflection-prediction-card";
import { SituationTitleExpander } from "@/components/reflections/situation-title-expander";
import { listReflectionCheckIns } from "@/lib/reflections";

const UPCOMING_PREVIEW = 3;

export default async function ReflectionsPage() {
  const result = await listReflectionCheckIns();

  if ("error" in result) {
    return (
      <div className="flex flex-1 flex-col bg-zinc-50">
        <header className="border-b border-zinc-200 bg-white px-6 py-4">
          <Link href="/overview" className="text-sm text-zinc-500 hover:text-zinc-700">
            ← Back to overview
          </Link>
          <h1 className="mt-1 text-lg font-semibold text-zinc-900">Reflections</h1>
        </header>
        <main className="mx-auto w-full max-w-2xl px-6 py-12">
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {result.error}
          </p>
        </main>
      </div>
    );
  }

  // listReflectionCheckIns returns newest-first. For the queue, the oldest
  // unanswered reflection is the active one — so reverse to find it.
  const unanswered = result.checkIns.filter((c) => !c.reflection_answer);
  // Oldest unanswered = last element of the newest-first array.
  const pending = unanswered.length > 0 ? unanswered[unanswered.length - 1] : null;
  // Upcoming = remaining unanswered in queue order (oldest-next first).
  // Slice off the last element (pending), then reverse so 2nd-oldest is first.
  const upcoming = pending
    ? unanswered.slice(0, unanswered.length - 1).reverse()
    : [];
  const upcomingPreview = upcoming.slice(0, UPCOMING_PREVIEW);
  const upcomingOverflow = Math.max(0, upcoming.length - UPCOMING_PREVIEW);
  // Completed = only reflections the user has explicitly answered.
  const completed = result.checkIns.filter((c) => !!c.reflection_answer);

  return (
    <div className="flex flex-1 flex-col bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white px-6 py-4">
        <Link href="/overview" className="text-sm text-zinc-500 hover:text-zinc-700">
          ← Back to overview
        </Link>
        <h1 className="mt-1 text-lg font-semibold text-zinc-900">Reflections</h1>
        <p className="text-sm text-zinc-500">
          Questions about what your check-ins revealed — not what happened, but what it meant.
        </p>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-col gap-10 px-6 py-12">
        <section>
          <h2 className="text-sm font-medium text-zinc-900">Waiting</h2>
          {pending ? (
            <div className="mt-4 flex flex-col gap-4">
              {/* Active reflection */}
              <article className="rounded-lg border border-zinc-200 bg-white px-5 py-5">
                <SituationTitleExpander
                  title={pending.moment.title}
                  date={new Date(pending.created_at).toLocaleDateString()}
                  summary={
                    pending.moment.current_understanding ?? pending.moment.description ?? null
                  }
                />
                <p className="mt-3 text-base font-medium text-zinc-900">
                  {pending.reflection_question}
                </p>
                <div className="mt-5">
                  <ReflectionPredictionCard
                    checkInId={pending.id}
                    identityImpact={pending.identity_impact}
                  />
                </div>
              </article>

              {/* Upcoming queue — read-only previews */}
              {upcomingPreview.length > 0 ? (
                <div>
                  <p className="mb-3 text-xs font-medium uppercase tracking-wide text-zinc-400">
                    Up next
                  </p>
                  <div className="flex flex-col gap-2">
                    {upcomingPreview.map((checkIn) => (
                      <div
                        key={checkIn.id}
                        className="rounded-lg border border-zinc-100 bg-zinc-50 px-4 py-3.5"
                      >
                        <p className="text-xs font-medium text-zinc-400">
                          {checkIn.moment.title}
                        </p>
                        <p className="mt-1 text-sm text-zinc-500">
                          {checkIn.reflection_question}
                        </p>
                      </div>
                    ))}
                    {upcomingOverflow > 0 ? (
                      <p className="px-1 text-xs text-zinc-400">
                        +{upcomingOverflow} more in queue
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="mt-4 text-sm text-zinc-500">You&apos;re up to date.</p>
          )}
        </section>

        {completed.length > 0 ? (
          <CompletedReflectionsList checkIns={completed} />
        ) : null}
      </main>
    </div>
  );
}
