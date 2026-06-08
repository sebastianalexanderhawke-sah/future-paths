import Link from "next/link";

import { signOut } from "@/actions/auth";
import { MomentCard } from "@/components/moments/moment-card";
import { listMoments } from "@/lib/moments";

export default async function MomentsPage() {
  const result = await listMoments();

  if ("error" in result) {
    return (
      <div className="flex flex-1 items-center justify-center bg-zinc-50 px-6 py-12">
        <p className="text-sm text-red-600">{result.error}</p>
      </div>
    );
  }

  const { moments } = result;

  return (
    <div className="flex flex-1 flex-col bg-zinc-50">
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-4">
        <div>
          <Link href="/overview" className="text-sm text-zinc-500 hover:text-zinc-700">
            Future Paths
          </Link>
          <h1 className="text-lg font-semibold text-zinc-900">Moments</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/moments/new"
            className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
          >
            New moment
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

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-6 py-12">
        {moments.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-300 bg-white px-6 py-12 text-center">
            <p className="text-zinc-600">No moments yet.</p>
            <p className="mt-2 text-sm text-zinc-500">
              Capture a meaningful decision or crossroads to begin.
            </p>
            <Link
              href="/moments/new"
              className="mt-6 inline-block rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
            >
              Create your first moment
            </Link>
          </div>
        ) : (
          moments.map((moment) => <MomentCard key={moment.id} moment={moment} />)
        )}
      </main>
    </div>
  );
}
