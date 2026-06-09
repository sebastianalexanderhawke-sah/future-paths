import Link from "next/link";

import { detectContradictionsAction } from "@/actions/contradictions";
import { signOut } from "@/actions/auth";
import { ContradictionCard } from "@/components/contradictions/contradiction-card";
import { listContradictions } from "@/lib/contradictions";

type ContradictionsPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function ContradictionsPage({
  searchParams,
}: ContradictionsPageProps) {
  const { error } = await searchParams;
  const result = await listContradictions();

  if ("error" in result) {
    return (
      <div className="flex flex-1 items-center justify-center bg-zinc-50 px-6 py-12">
        <p className="text-sm text-red-600">{result.error}</p>
      </div>
    );
  }

  const activeContradictions = result.contradictions.filter(
    (contradiction) => contradiction.status === "active",
  );
  const inactiveContradictions = result.contradictions.filter(
    (contradiction) => contradiction.status !== "active",
  );

  return (
    <div className="flex flex-1 flex-col bg-zinc-50">
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-4">
        <div>
          <Link href="/overview" className="text-sm text-zinc-500 hover:text-zinc-700">
            Future Paths
          </Link>
          <h1 className="text-lg font-semibold text-zinc-900">Contradictions</h1>
        </div>
        <div className="flex items-center gap-3">
          <form action={detectContradictionsAction}>
            <button
              type="submit"
              className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
            >
              Detect contradictions
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
            <h2 className="text-sm font-medium text-zinc-900">Active tensions</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Identity tensions surfaced from your current self, futures, and
              reflections — tentative, never judgmental.
            </p>
          </div>

          {activeContradictions.length === 0 ? (
            <div className="rounded-lg border border-dashed border-zinc-300 bg-white px-6 py-8 text-center text-sm text-zinc-600">
              No active contradictions yet. Generate your Current Self, answer an
              identity prompt or check in twice, then detect tensions.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {activeContradictions.map((contradiction) => (
                <ContradictionCard key={contradiction.id} contradiction={contradiction} />
              ))}
            </div>
          )}
        </section>

        {inactiveContradictions.length > 0 ? (
          <section className="flex flex-col gap-4">
            <div>
              <h2 className="text-sm font-medium text-zinc-900">Resolved or faded</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Tensions that no longer appear in the latest detection pass
              </p>
            </div>

            <div className="flex flex-col gap-3">
              {inactiveContradictions.map((contradiction) => (
                <ContradictionCard key={contradiction.id} contradiction={contradiction} />
              ))}
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
