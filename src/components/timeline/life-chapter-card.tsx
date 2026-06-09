import Link from "next/link";

import type { LifeChapter } from "@/types/database";

type LifeChapterCardProps = {
  chapter: LifeChapter;
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

export function LifeChapterCard({ chapter }: LifeChapterCardProps) {
  return (
    <Link
      href={`/timeline/${chapter.id}`}
      className="block rounded-lg border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-300"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-zinc-400">{chapter.period_label}</p>
        <p className="text-xs text-zinc-400">
          {formatDateRange(chapter.starts_at, chapter.ends_at)}
        </p>
      </div>
      <h3 className="mt-2 text-sm font-medium text-zinc-900">{chapter.title}</h3>
      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-zinc-600">
        {chapter.summary}
      </p>

      {chapter.themes.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
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
    </Link>
  );
}
