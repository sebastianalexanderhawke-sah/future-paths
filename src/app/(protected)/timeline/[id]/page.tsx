import Link from "next/link";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/overview/app-shell";
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
      <div className="flex h-screen items-center justify-center bg-[#f4f4f6] px-6">
        <p className="text-[13px] text-red-600">{result.error}</p>
      </div>
    );
  }

  const { chapter, evidence } = result;

  return (
    <AppShell activeHref="/timeline">
      {/* Page header */}
      <div className="mb-10">
        <Link
          href="/timeline"
          className="text-[13px] font-medium text-[#999999] transition-colors duration-150 hover:text-[#047857]"
        >
          ← Timeline
        </Link>
        <h1 className="mb-1.5 mt-3 text-[32px] font-extrabold tracking-[-0.8px] text-[#111]">
          Life chapter
        </h1>
      </div>

      <div className="flex max-w-2xl flex-col gap-8 pb-14">
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
      </div>
    </AppShell>
  );
}
