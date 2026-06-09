import Link from "next/link";
import { notFound } from "next/navigation";

import { signOut } from "@/actions/auth";
import { ChapterEvidence } from "@/components/timeline/chapter-evidence";
import { getLifeChapter } from "@/lib/life-chapters";

type TimelineDetailPageProps = {
  params: Promise<{ id: string }>;
};

function formatDateRange(startsAt: string, endsAt: string): string {
  const start = new Date(`${startsAt}T00:00:00`);
  const end = new Date(`${endsAt}T00:00:00`);

  return `${start.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })} – ${end.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
}

export default async function TimelineDetailPage({ params }: TimelineDetailPageProps) {
  const { id } = await params;
  const result = await getLifeChapter(id);

  if ("error" in result) {
    if (result.error === "Life chapter not found.") {
      notFound();
    }

    return (
      <div className="flex flex-1 items-center justify-center bg-zinc-50 px-6 py-12">
        <p className="text-sm text-red-600">{result.error}</p>
      </div>
    );
  }

  const { chapter, evidence } = result;

  return (
    <div className="flex flex-1 flex-col bg-zinc-50">
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-4">
        <div>
          <Link href="/timeline" className="text-sm text-zinc-500 hover:text-zinc-700">
            Timeline
          </Link>
          <h1 className="text-lg font-semibold text-zinc-900">Life chapter</h1>
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
            <p className="text-xs text-zinc-400">{chapter.period_label}</p>
            <p className="text-xs text-zinc-400">
              {formatDateRange(chapter.starts_at, chapter.ends_at)}
            </p>
          </div>
          <h2 className="mt-2 text-sm font-medium text-zinc-900">{chapter.title}</h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-600">{chapter.summary}</p>

          {chapter.themes.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {chapter.themes.map((theme) => (
                <span
                  key={theme}
                  className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600"
                >
                  {theme}
                </span>
              ))}
            </div>
          ) : null}

          {chapter.includes_current_self ? (
            <p className="mt-4 text-xs text-zinc-500">
              This chapter includes your present Current Self as framing for the most
              recent period.
            </p>
          ) : null}
        </article>

        <ChapterEvidence evidence={evidence} />
      </main>
    </div>
  );
}
