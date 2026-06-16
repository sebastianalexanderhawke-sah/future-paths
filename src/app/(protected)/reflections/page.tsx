import Link from "next/link";

import { ReflectionAnswerForm } from "@/components/reflections/reflection-answer-form";
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

  const pending = result.checkIns.filter((checkIn) => !checkIn.reflection_answer);
  const answered = result.checkIns.filter((checkIn) => checkIn.reflection_answer);

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
        {pending.length > 0 ? (
          <section>
            <h2 className="text-sm font-medium text-zinc-900">Waiting for your reflection</h2>
            <div className="mt-4 flex flex-col gap-4">
              {pending.map((checkIn) => (
                <article
                  key={checkIn.id}
                  className="rounded-lg border border-zinc-200 bg-white px-4 py-4"
                >
                  <p className="text-xs text-zinc-400">
                    {checkIn.moment.title} · {new Date(checkIn.created_at).toLocaleDateString()}
                  </p>
                  <p className="mt-2 line-clamp-1 text-sm text-zinc-600">{checkIn.reflection}</p>
                  <p className="mt-3 text-sm font-medium text-zinc-900">
                    {checkIn.reflection_question}
                  </p>
                  <div className="mt-4">
                    <ReflectionAnswerForm checkInId={checkIn.id} />
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {answered.length > 0 ? (
          <section>
            <h2 className="text-sm font-medium text-zinc-900">Past reflections</h2>
            <div className="mt-4 flex flex-col gap-3">
              {answered.map((checkIn) => (
                <article
                  key={checkIn.id}
                  className="rounded-lg border border-zinc-200 bg-white px-4 py-3"
                >
                  <p className="text-xs text-zinc-400">
                    {checkIn.moment.title} · {new Date(checkIn.created_at).toLocaleDateString()}
                  </p>
                  <p className="mt-2 text-sm text-zinc-700">{checkIn.reflection_question}</p>
                  <p className="mt-2 text-sm text-zinc-900">{checkIn.reflection_answer}</p>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {pending.length === 0 && answered.length === 0 ? (
          <p className="text-sm text-zinc-500">No reflection questions yet.</p>
        ) : null}
      </main>
    </div>
  );
}
