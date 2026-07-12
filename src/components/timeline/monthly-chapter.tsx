import {
  chapterAccentFor,
  type ChapterAccent,
} from "@/components/timeline/chapter-accent";
import { ChapterWhatChanged } from "@/components/timeline/chapter-what-changed";
import { ChapterSurface } from "@/components/timeline/chapter-surface";
import type { MonthlyIdentityNarrative } from "@/lib/monthly-identity-narrative";
import {
  isMonthInProgress,
  type ChapterStory,
} from "@/lib/timeline-chapter-story";

type MonthlyChapterProps = {
  narrative: MonthlyIdentityNarrative;
  /** Derived story pieces for this month; null degrades to narrative-only sections. */
  story: ChapterStory | null;
};

/**
 * "July 2026" → "July": the year already lives in the card header, and the
 * comparison labels read as prose ("Beginning of July").
 */
function monthNameOf(month: string): string {
  return month.split(" ")[0];
}

/**
 * Section header for the chapter's inner cards: an optional colored glyph
 * beside a serif title — the same voice as the hero headline, one tier down,
 * so each section reads as a chapter heading — and a muted one-line subtitle.
 */
function CardHeader({
  glyph,
  glyphColor,
  title,
  subtitle,
}: {
  glyph?: string;
  glyphColor?: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2">
        {glyph ? (
          <span
            aria-hidden="true"
            className="text-[17px] leading-none"
            style={{ color: glyphColor }}
          >
            {glyph}
          </span>
        ) : null}
        <h2 className="font-voice text-[19px] font-medium leading-[1.3] tracking-[-0.01em] text-[#111]">
          {title}
        </h2>
      </div>
      <p className="mt-[3px] text-[13px] text-[#888888]">{subtitle}</p>
    </div>
  );
}

/** Tracked-caps tier label, as in the Tradeoff card's "Your Pattern". */
function TierLabel({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <p
      className="text-[11px] font-semibold uppercase tracking-[0.07em]"
      style={{ color }}
    >
      {children}
    </p>
  );
}

/**
 * The chapter's cover: month header, hairline, the serif accent-inked title,
 * and the one-sentence teaser. Rendered identically in the collapsed and
 * expanded states — the cover stays put while the accordion swaps what sits
 * beneath it, so opening a chapter reveals the story without reprinting the
 * cover. Everything else (the identity comparison, the situations) lives
 * only inside the opened chapter.
 */
function ChapterCover({
  narrative,
  accent,
}: {
  narrative: MonthlyIdentityNarrative;
  accent: ChapterAccent;
}) {
  // Only the dedicated cover line. Legacy narratives (written before the
  // teaser existed) show no teaser rather than borrowing the opening
  // portrait's first sentence — the portraits render inside the chapter, so
  // a borrowed line would reprint there.
  const teaser = narrative.teaser || null;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-[22px] font-bold tracking-[-0.3px] text-[#111]">
          {narrative.month}
        </h2>
        <p className="mt-1 text-[13px] text-[#999999]">
          One month of your story.
        </p>
      </div>

      <div className="border-t border-[#f0f0f0] pt-6">
        <p
          className="font-voice text-[28px] font-medium leading-[1.15] tracking-[-0.5px]"
          style={{ color: accent.title }}
        >
          {narrative.headline}
        </p>
        {teaser ? (
          <p className="mt-4 max-w-[52em] text-[15px] leading-[1.75] text-[#555555]">
            {teaser}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/**
 * The collapsed chapter card — nothing but the cover: month header, serif
 * chapter title, the one-sentence teaser, and how many stories the month
 * holds. The accordion supplies the card surface and the primary
 * "Show chapter" control.
 */
export function MonthlyChapterPreview({
  narrative,
  story,
}: {
  narrative: MonthlyIdentityNarrative;
  story: ChapterStory | null;
}) {
  const storyCount = story?.storylines.length ?? 0;
  const accent = chapterAccentFor(story?.identityShifts ?? []);

  return (
    <div>
      <ChapterCover narrative={narrative} accent={accent} />

      {storyCount > 0 ? (
        <p className="mt-5 border-t border-[#f0f0f0] pt-5 text-[13px] font-medium text-[#888888]">
          {storyCount === 1
            ? "1 story changed this month."
            : `${storyCount} stories changed this month.`}
        </p>
      ) : null}
    </div>
  );
}

/**
 * One month of the Timeline, fully opened. The cover (month, serif title,
 * teaser) stays as the chapter header, exactly as it renders collapsed —
 * never reprinted below — and the story begins immediately underneath, each
 * section on its own light nested surface under a serif heading: "The Person
 * You Were Becoming" (the AI-written identity portraits, beginning → end,
 * one continuous story rather than a checklist of traits), "What Changed"
 * (the month's situations as compact beginning → end comparisons), and the
 * closing line. The two middle sections deliberately never share content:
 * the first speaks only in identity, the second only in what happened in
 * the world.
 */
export function MonthlyChapter({ narrative, story }: MonthlyChapterProps) {
  const monthName = monthNameOf(narrative.month);

  const identityShifts = story?.identityShifts ?? [];
  const storylines = story?.storylines ?? [];
  const accent = chapterAccentFor(identityShifts);

  // The generated before/after identity portraits — the section's only
  // content since Phase 9 removed the deterministic movement bullets. A
  // month whose narrative hasn't generated yet simply has no identity
  // section until the next load stores one.
  const hasPortraits = Boolean(
    narrative.openingBeginning && narrative.openingEnd,
  );

  // Truthful tense: a completed month describes who the person became by its
  // end; the still-running month describes an identity still emerging.
  const inProgress = isMonthInProgress(narrative.month);
  const endLabel = inProgress ? "Who You're Becoming" : `End of ${monthName}`;

  return (
    <div className="flex flex-col gap-5">
      {/* The cover, unchanged from the collapsed card: opening the chapter
          keeps the cover in place and reveals the story below it. */}
      <ChapterCover narrative={narrative} accent={accent} />

      {/* 1. The chapter's centerpiece: who this person was becoming — the
          before/after identity portraits, still in motion, never a finished
          transformation. Identity language only; events belong to "What
          Changed" below. */}
      {hasPortraits ? (
        <ChapterSurface className="px-8 py-7">
          <CardHeader
            glyph="◈"
            glyphColor={accent.strong}
            title="The Person You Were Becoming"
            subtitle="Who you were when the month began — and who was emerging by its end."
          />
          {/* Standard app body type (Current Self's supporting paragraphs):
              the past state in muted ink, the emerging one in body ink. */}
          <div>
            <TierLabel color={accent.strong}>{`Beginning of ${monthName}`}</TierLabel>
            <p className="mt-2 max-w-[52em] text-[14px] leading-[1.7] text-[#777777]">
              {narrative.openingBeginning}
            </p>
          </div>
          <div
            aria-hidden="true"
            className="my-4 pl-[3px] text-[15px] leading-none text-[#c9c9d1]"
          >
            ↓
          </div>
          <div>
            <TierLabel color={accent.strong}>{endLabel}</TierLabel>
            <p className="mt-2 max-w-[52em] text-[14px] leading-[1.7] text-[#555555]">
              {narrative.openingEnd}
            </p>
          </div>
        </ChapterSurface>
      ) : null}

      {/* 2. The real-life events that carried the internal shift: compact
          beginning → end comparisons, top situations first, rest folded. */}
      {storylines.length > 0 ? (
        <ChapterSurface className="px-8 py-7">
          <CardHeader
            glyph="↗"
            glyphColor={accent.strong}
            title="What Changed"
            subtitle="The real-life events behind the shift."
          />
          <ChapterWhatChanged storylines={storylines} />
        </ChapterSurface>
      ) : null}

      {/* 3. The chapter's closing line, as a quiet observation row. */}
      {story?.closingReflection ? (
        <ChapterSurface className="px-8 py-6">
          <div className="flex items-start gap-3.5">
            <span
              aria-hidden="true"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[14px]"
              style={{ background: accent.faint, color: accent.strong }}
            >
              ✦
            </span>
            <div className="pt-0.5">
              <TierLabel color={accent.strong}>Closing Reflection</TierLabel>
              <p className="mt-1 max-w-[52em] text-[14px] leading-[1.7] text-[#555555]">
                {story.closingReflection}
              </p>
            </div>
          </div>
        </ChapterSurface>
      ) : null}
    </div>
  );
}
