import Link from "next/link";

import { signOut } from "@/actions/auth";
import { MomentCard } from "@/components/moments/moment-card";
import { listMoments } from "@/lib/moments";
import { createClient } from "@/lib/supabase/server";

export default async function OverviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const momentsResult = await listMoments();
  const moments = "moments" in momentsResult ? momentsResult.moments.slice(0, 3) : [];

  return (
    <div className="flex flex-1 flex-col bg-zinc-50">
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-4">
        <div>
          <p className="text-sm text-zinc-500">Future Paths</p>
          <h1 className="text-lg font-semibold text-zinc-900">Overview</h1>
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
        <p className="text-zinc-600">
          Signed in as{" "}
          <span className="font-medium text-zinc-900">{user?.email}</span>
        </p>

        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-zinc-900">Active moments</h2>
            <Link
              href="/moments/new"
              className="text-sm text-zinc-600 underline-offset-4 hover:underline"
            >
              New moment
            </Link>
          </div>

          {moments.length === 0 ? (
            <div className="rounded-lg border border-dashed border-zinc-300 bg-white px-6 py-8 text-center">
              <p className="text-sm text-zinc-600">No active moments yet.</p>
              <Link
                href="/moments/new"
                className="mt-4 inline-block text-sm text-zinc-900 underline-offset-4 hover:underline"
              >
                Capture your first moment
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {moments.map((moment) => (
                <MomentCard key={moment.id} moment={moment} />
              ))}
              <Link
                href="/moments"
                className="text-sm text-zinc-600 underline-offset-4 hover:underline"
              >
                View all moments
              </Link>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
