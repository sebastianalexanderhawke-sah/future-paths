import Link from "next/link";

import { generateFutureSelvesAction } from "@/actions/future-selves";
import { signOut } from "@/actions/auth";
import { FutureCard } from "@/components/futures/future-card";
import { listFutureSelves } from "@/lib/future-selves";

type FutureSelvesPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function FutureSelvesPage({ searchParams }: FutureSelvesPageProps) {
  const { error } = await searchParams;
  const result = await listFutureSelves();

  if ("error" in result) {
    return (
      <div className="flex flex-1 items-center justify-center bg-zinc-50 px-6 py-12">
        <p className="text-sm text-red-600">{result.error}</p>
      </div>
    );
  }

  const activeFutures = result.futureSelves.filter(
    (futureSelf) => futureSelf.status === "active",
  );
  const fadedFutures = result.futureSelves.filter(
    (futureSelf) => futureSelf.status === "faded",
  );

  return (
    <div className="flex flex-1 flex-col bg-zinc-50">
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-4">
        <div>
          <Link href="/overview" className="text-sm text-zinc-500 hover:text-zinc-700">
            Future Paths
          </Link>
          <h1 className="text-lg font-semibold text-zinc-900">Future Selves</h1>
        </div>
        <div className="flex items-center gap-3">
          <form action={generateFutureSelvesAction}>
            <button
              type="submit"
              className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
            >
              Refresh futures
            </button>
          </form>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-50"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-12">
        {error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <section className="flex flex-col gap-4">
          <div>
            <h2 className="text-sm font-medium text-zinc-900">Active futures</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Identity trajectories that may be emerging from your patterns.
            </p>
          </div>

          {activeFutures.length === 0 ? (
            <div className="rounded-lg border border-dashed border-zinc-300 bg-white px-6 py-8 text-center text-sm text-zinc-600">
              No Future Selves yet. Capture moments and check in, then refresh to
              discover emerging trajectories.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {activeFutures.map((futureSelf) => (
                <FutureCard key={futureSelf.id} futureSelf={futureSelf} />
              ))}
            </div>
          )}
        </section>

        {fadedFutures.length > 0 ? (
          <section className="flex flex-col gap-4">
            <div>
              <h2 className="text-sm font-medium text-zinc-900">Faded futures</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Trajectories that may have quieted for now.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              {fadedFutures.map((futureSelf) => (
                <FutureCard key={futureSelf.id} futureSelf={futureSelf} />
              ))}
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
