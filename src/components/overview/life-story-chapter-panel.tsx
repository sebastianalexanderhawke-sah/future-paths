import Link from "next/link";

import { CardShell } from "@/components/ui/card-shell";
import { ThemeChip } from "@/components/ui/theme-chip";
import { getThemeCssVar } from "@/lib/design/theme-colors";
import type { LifeChapter } from "@/types/database";
import type { ThemeName } from "@/types/enums";

type LifeStoryChapterPanelProps = {
  chapter: LifeChapter;
  chapterNumber: number;
};

function formatDateRange(startsAt: string, endsAt: string): string {
  const start = new Date(`${startsAt}T00:00:00`);
  const end = new Date(`${endsAt}T00:00:00`);

  return `${start.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  })} – ${end.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  })}`;
}

function getDominantTheme(themes: ThemeName[]): ThemeName | null {
  return themes[0] ?? null;
}

export function LifeStoryChapterPanel({ chapter, chapterNumber }: LifeStoryChapterPanelProps) {
  const isCurrentChapter = chapter.includes_current_self;
  const dominantTheme = getDominantTheme(chapter.themes);
  const shellVariant = isCurrentChapter ? "hero" : "elevated";

  return (
    <CardShell
      variant={shellVariant}
      className={[
        "relative overflow-hidden",
        isCurrentChapter ? "ring-1 ring-[var(--action-ring)]" : "",
      ].join(" ")}
    >
      {dominantTheme ? (
        <div
          className="absolute inset-x-0 top-0 h-1"
          style={{ backgroundColor: getThemeCssVar(dominantTheme, "primary") }}
          aria-hidden="true"
        />
      ) : null}

      <Link
        href={`/timeline/${chapter.id}`}
        className="block p-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--action-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)] sm:p-8"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-label text-ink-tertiary">Chapter {chapterNumber}</p>
            <p className="mt-1 text-body-small text-ink-secondary">{chapter.period_label}</p>
          </div>
          {isCurrentChapter ? (
            <span className="rounded-full bg-[var(--state-emerging)]/15 px-2.5 py-0.5 text-label text-[var(--state-emerging)]">
              Current chapter
            </span>
          ) : null}
        </div>

        <time
          dateTime={`${chapter.starts_at}/${chapter.ends_at}`}
          className="mt-4 block text-body-small text-ink-tertiary"
        >
          {formatDateRange(chapter.starts_at, chapter.ends_at)}
        </time>

        <h3
          className={[
            "mt-4 text-ink-primary",
            isCurrentChapter ? "text-h1" : "text-h2",
          ].join(" ")}
        >
          {chapter.title}
        </h3>

        <p className="mt-4 text-body leading-relaxed text-ink-secondary">{chapter.summary}</p>

        {chapter.themes.length > 0 ? (
          <div className="mt-5 flex flex-wrap gap-2">
            {chapter.themes.map((theme) => (
              <ThemeChip key={theme} theme={theme} />
            ))}
          </div>
        ) : null}

        {isCurrentChapter ? (
          <p className="mt-5 text-body-small text-ink-tertiary">
            Grounded in your current self and supporting evidence.
          </p>
        ) : null}
      </Link>
    </CardShell>
  );
}
