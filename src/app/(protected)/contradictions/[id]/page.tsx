import Link from "next/link";
import { notFound } from "next/navigation";

import { signOut } from "@/actions/auth";
import { getContradiction } from "@/lib/contradictions";

type ContradictionDetailPageProps = {
  params: Promise<{ id: string }>;
};

const EVENT_LABELS = {
  detected: "Detected",
  intensified: "Intensified",
  softened: "Softened",
  resolved: "Resolved",
  faded: "Faded",
} as const;

export default async function ContradictionDetailPage({
  params,
}: ContradictionDetailPageProps) {
  const { id } = await params;
  const result = await getContradiction(id);

  if ("error" in result) {
    if (result.error === "Contradiction not found.") {
      notFound();
    }

    return (
      <div className="flex flex-1 items-center justify-center bg-zinc-50 px-6 py-12">
        <p className="text-sm text-red-600">{result.error}</p>
      </div>
    );
  }

  const { contradiction, events } = result;

  return (
    <div className="flex flex-1 flex-col bg-zinc-50">
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-4">
        <div>
          <Link
            href="/contradictions"
            className="text-sm text-zinc-500 hover:text-zinc-700"
          >
            Contradictions
          </Link>
          <h1 className="text-lg font-semibold text-zinc-900">Identity tension</h1>
        </div>
        <form action={signOut}>
          <button
            type="submit"
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            Sign out
          </button>
        </form>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-12">
        <article className="rounded-lg border border-zinc-200 bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-zinc-400 capitalize">{contradiction.status}</p>
            <p className="text-xs text-zinc-400">Intensity {contradiction.intensity}</p>
          </div>
          <h2 className="mt-2 text-sm font-medium text-zinc-900">{contradiction.title}</h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-600">{contradiction.summary}</p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg bg-zinc-50 p-3">
              <p className="text-xs font-medium text-zinc-500">One side</p>
              <p className="mt-2 text-sm text-zinc-700">{contradiction.pole_a}</p>
            </div>
            <div className="rounded-lg bg-zinc-50 p-3">
              <p className="text-xs font-medium text-zinc-500">Another side</p>
              <p className="mt-2 text-sm text-zinc-700">{contradiction.pole_b}</p>
            </div>
          </div>

          {contradiction.themes.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {contradiction.themes.map((theme) => (
                <span
                  key={theme}
                  className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600"
                >
                  {theme}
                </span>
              ))}
            </div>
          ) : null}
        </article>

        {events.length > 0 ? (
          <section className="flex flex-col gap-4">
            <div>
              <h3 className="text-sm font-medium text-zinc-900">History</h3>
              <p className="mt-1 text-sm text-zinc-500">
                How this tension has changed over time
              </p>
            </div>

            <div className="flex flex-col gap-3">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="rounded-lg border border-zinc-200 bg-white p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-zinc-900">
                      {EVENT_LABELS[event.event_type]}
                    </p>
                    <p className="text-xs text-zinc-400">
                      {new Date(event.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {event.summary ? (
                    <p className="mt-2 text-sm text-zinc-600">{event.summary}</p>
                  ) : null}
                  {event.intensity_after !== null ? (
                    <p className="mt-2 text-xs text-zinc-400">
                      Intensity {event.intensity_before ?? "—"} → {event.intensity_after}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
