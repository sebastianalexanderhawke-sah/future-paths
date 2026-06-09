import Link from "next/link";

import { signOut } from "@/actions/auth";
import { AlternateSelfCard } from "@/components/alternate-selves/alternate-self-card";
import { listAlternateSelves } from "@/lib/alternate-selves";

export default async function AlternateSelvesPage() {
  const result = await listAlternateSelves();

  if ("error" in result) {
    return (
      <div className="flex flex-1 items-center justify-center bg-zinc-50 px-6 py-12">
        <p className="text-sm text-red-600">{result.error}</p>
      </div>
    );
  }

  const { alternateSelves } = result;

  return (
    <div className="flex flex-1 flex-col bg-zinc-50">
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-4">
        <div>
          <Link href="/overview" className="text-sm text-zinc-500 hover:text-zinc-700">
            Future Paths
          </Link>
          <h1 className="text-lg font-semibold text-zinc-900">Alternate Selves</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/alternate-selves/new"
            className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
          >
            Explore past decision
          </Link>
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
        <section className="flex flex-col gap-4">
          <div>
            <h2 className="text-sm font-medium text-zinc-900">
              Who could you have become?
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Past-oriented perspectives on roads not taken — never regret, never
              advice.
            </p>
          </div>

          {alternateSelves.length === 0 ? (
            <div className="rounded-lg border border-dashed border-zinc-300 bg-white px-6 py-8 text-center text-sm text-zinc-600">
              No alternate selves yet. Enter a significant past decision to explore
              who you might have become along another path.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {alternateSelves.map((alternateSelf) => (
                <AlternateSelfCard key={alternateSelf.id} alternateSelf={alternateSelf} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
