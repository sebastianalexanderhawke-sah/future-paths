import Link from "next/link";

import { CompletedReflectionsList } from "@/components/reflections/completed-reflections-list";
import { ReflectionPredictionCard } from "@/components/reflections/reflection-prediction-card";
import { SituationTitleExpander } from "@/components/reflections/situation-title-expander";
import { listReflectionCheckIns } from "@/lib/reflections";

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
  // All check-ins except the currently active pending one go into the completed list.
  // This includes both answered reflections and queued-but-not-yet-active ones.
  const completed = result.checkIns.filter((c) => c.id !== pending?.id);

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
            <div className="mt-4">
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
            </div>
          ) : (
            <p className="mt-4 text-sm text-zinc-500">You&apos;re up to date.</p>
          )}
        </section>

        {completed.length > 0 ? (
          <section>
            <h2 className="text-sm font-medium text-zinc-900">Completed</h2>
            <div className="mt-4">
              <CompletedReflectionsList checkIns={completed} />
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
