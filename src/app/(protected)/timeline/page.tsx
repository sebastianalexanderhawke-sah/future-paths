import Link from "next/link";

import { deleteTimelineDevAction, generateTimelineAction } from "@/actions/timeline";
import { signOut } from "@/actions/auth";
import { LifeChapterCard } from "@/components/timeline/life-chapter-card";
import { listLifeChapters } from "@/lib/life-chapters";

type TimelinePageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function TimelinePage({ searchParams }: TimelinePageProps) {
  const { error } = await searchParams;
  const result = await listLifeChapters();

  if ("error" in result) {
    return (
      <div className="flex flex-1 items-center justify-center bg-zinc-50 px-6 py-12">
        <p className="text-sm text-red-600">{result.error}</p>
      </div>
    );
  }

  const chapters = [...result.chapters].sort((a, b) => a.sort_order - b.sort_order);
  const showDevReset = process.env.NODE_ENV !== "production";

  return (
    <div className="flex flex-1 flex-col bg-zinc-50">
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-4">
        <div>
          <Link href="/overview" className="text-sm text-zinc-500 hover:text-zinc-700">
            Future Paths
          </Link>
          <h1 className="text-lg font-semibold text-zinc-900">Timeline</h1>
        </div>
        <div className="flex items-center gap-3">
          <form action={generateTimelineAction}>
            <button
              type="submit"
              className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
            >
              Generate timeline
            </button>
          </form>
          {showDevReset ? (
            <form action={deleteTimelineDevAction}>
              <button
                type="submit"
                className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-700 transition-colors hover:bg-red-50"
              >
                Delete Timeline (Dev)
              </button>
            </form>
          ) : null}
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
            <h2 className="text-sm font-medium text-zinc-900">Life chapters</h2>
            <p className="mt-1 text-sm text-zinc-500">
              A personal identity story composed of meaningful periods — not a
              chronological log of actions.
            </p>
          </div>

          {chapters.length === 0 ? (
            <div className="rounded-lg border border-dashed border-zinc-300 bg-white px-6 py-8 text-center text-sm text-zinc-600">
              No life chapters yet. Capture moments, check in, and reflect — then
              generate your timeline when enough identity signal has accumulated.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {chapters.map((chapter) => (
                <LifeChapterCard key={chapter.id} chapter={chapter} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
