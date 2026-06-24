import Link from "next/link";

import { signOut } from "@/actions/auth";
import { MonthlyIdentityNarrativeCard } from "@/components/timeline/monthly-identity-narrative-card";
import { loadMonthlyIdentityNarratives } from "@/lib/monthly-identity-narrative";

export default async function TimelinePage() {
  const result = await loadMonthlyIdentityNarratives();

  if ("error" in result) {
    return (
      <div className="flex flex-1 items-center justify-center bg-zinc-50 px-6 py-12">
        <p className="text-sm text-red-600">{result.error}</p>
      </div>
    );
  }

  const { narratives } = result;

  return (
    <div className="flex flex-1 flex-col bg-zinc-50">
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-4">
        <div>
          <Link href="/overview" className="text-sm text-zinc-500 hover:text-zinc-700">
            Future Paths
          </Link>
          <h1 className="text-lg font-semibold text-zinc-900">Timeline</h1>
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
        <section className="flex flex-col gap-4">
          <div>
            <h2 className="text-sm font-medium text-zinc-900">Monthly chapters</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Who you became each month — not a log of what happened.
            </p>
          </div>

          {narratives.length === 0 ? (
            <div className="rounded-lg border border-dashed border-zinc-300 bg-white px-6 py-8 text-center text-sm text-zinc-600">
              No monthly chapters yet. Capture moments, choose paths, and check in —
              your first chapter appears once a month of activity accumulates.
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {narratives.map((narrative) => (
                <MonthlyIdentityNarrativeCard key={narrative.month} narrative={narrative} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
