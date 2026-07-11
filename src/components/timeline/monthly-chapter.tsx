import {
  chapterAccentFor,
  themeAccent,
  type ChapterAccent,
} from "@/components/timeline/chapter-accent";
import { ChapterStorylines } from "@/components/timeline/chapter-storylines";
import { ChapterSurface } from "@/components/timeline/chapter-surface";
import type { MonthlyIdentityNarrative } from "@/lib/monthly-identity-narrative";
import {
  composeIdentityJourney,
  splitIntoSentences,
  type ChapterStory,
  type IdentityShift,
} from "@/lib/timeline-chapter-story";

type MonthlyChapterProps = {
  narrative: MonthlyIdentityNarrative;
  /** Derived story pieces for this month; null degrades to narrative-only sections. */
  story: ChapterStory | null;
  /**
   * The previous month's story — the only honest source for "who you were
   * entering this month". Null when there is no prior evidence.
   */
  previousStory: ChapterStory | null;
};

/**
 * "July 2026" → "July": the year already lives in the card header, and the
 * comparison labels read as prose ("Beginning of July").
 */
function monthNameOf(month: string): string {
  return month.split(" ")[0];
}

/**
 * The same card-header pattern every Current Self card opens with: an
 * optional colored glyph beside a bold title, and a muted one-line subtitle.
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
            className="text-[18px] leading-none"
            style={{ color: glyphColor }}
          >
            {glyph}
          </span>
        ) : null}
        <h2 className="text-[17px] font-bold text-[#111]">{title}</h2>
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

/** The h-9 icon chip that opens every Current Self list row. */
function ThemeChip({ accent }: { accent: ChapterAccent }) {
  return (
    <span
      aria-hidden="true"
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px]"
      style={{ background: accent.faint, color: accent.mid }}
    >
      ●
    </span>
  );
}

/**
 * Compact dominant-theme badge sitting inline beside the chapter title —
 * the same status-indicator pattern as the Current Self strength badge:
 * colored dot + colored text on a pale tint of the same hue. Pure metadata.
 */
function DominantThemeBadge({
  theme,
  accent,
}: {
  theme: string;
  accent: ChapterAccent;
}) {
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium"
      style={{ background: accent.faint, color: accent.strong }}
    >
      <span
        aria-hidden="true"
        className="h-2 w-2 rounded-full"
        style={{ background: accent.mid }}
      />
      {theme}
    </span>
  );
}

/**
 * Month + subtitle header, then the serif chapter title with its inline
 * dominant-theme badge above a hairline — the exact hero anatomy of the
 * Current Self portrait card.
 */
function ChapterHero({
  narrative,
  accent,
  dominantTheme,
  children,
}: {
  narrative: MonthlyIdentityNarrative;
  accent: ChapterAccent;
  dominantTheme: string | null;
  children?: React.ReactNode;
}) {
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
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <p
            className="font-voice text-[28px] font-medium leading-[1.15] tracking-[-0.5px]"
            style={{ color: accent.title }}
          >
            {narrative.headline}
          </p>
          {dominantTheme ? (
            <DominantThemeBadge theme={dominantTheme} accent={accent} />
          ) : null}
        </div>
        {children}
      </div>
    </div>
  );
}

function StateBullets({
  label,
  labelColor,
  caption,
  bullets,
  tone,
}: {
  label: string;
  labelColor: string;
  /** Optional provenance note, e.g. where the beginning evidence comes from. */
  caption?: string;
  bullets: string[];
  /** "past" fades who you were; "present" keeps who you became in full ink. */
  tone: "past" | "present";
}) {
  return (
    <div>
      <div className="flex items-baseline gap-2">
        <TierLabel color={labelColor}>{label}</TierLabel>
        {caption ? <p className="text-[11px] text-[#b3b3bb]">{caption}</p> : null}
      </div>
      <ul className="mt-2 flex flex-col gap-1.5">
        {bullets.map((bullet) => (
          <li
            key={bullet}
            className={[
              "flex max-w-[52em] gap-2.5 text-[14px] leading-[1.6]",
              tone === "past" ? "text-[#777777]" : "text-[#333333]",
            ].join(" ")}
          >
            <span aria-hidden="true" className="text-[#c9c9d1]">
              •
            </span>
            <span>{bullet}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Each row is colored by its own theme's family (emerald for Courage, slate
// for Loneliness, …) — the color identifies the theme, never a judgment.
// Direction stays in the sign and the ink weight: rising marks are solid,
// receding marks pale, in the same family either way.
function shiftIndicator(shift: IdentityShift): {
  valueText: string;
  valueColor: string;
  barColor: string;
  accent: ChapterAccent;
} {
  const accent = themeAccent(shift.theme);
  const rising = shift.value > 0;
  return {
    valueText: rising ? `+${shift.value}` : `−${Math.abs(shift.value)}`,
    valueColor: rising ? accent.strong : accent.muted,
    barColor: rising ? accent.mid : accent.soft,
    accent,
  };
}

function IdentityShiftRow({
  shift,
  maxMagnitude,
  isLast,
}: {
  shift: IdentityShift;
  maxMagnitude: number;
  isLast: boolean;
}) {
  const magnitude = Math.abs(shift.value);
  const indicator = shiftIndicator(shift);

  return (
    <div
      className={[
        "flex items-center gap-3.5 py-3",
        isLast ? "" : "border-b border-[#f5f5f5]",
      ].join(" ")}
    >
      <ThemeChip accent={indicator.accent} />
      <span className="w-[8.5em] shrink-0 text-[14px] font-bold text-[#111]">
        {shift.theme}
      </span>
      <span
        className="w-9 shrink-0 text-right text-[13px] font-semibold tabular-nums"
        style={{ color: indicator.valueColor }}
      >
        {indicator.valueText}
      </span>
      <span className="h-[6px] max-w-[200px] flex-1 overflow-hidden rounded-full bg-[#f0f0f4]">
        <span
          className="block h-full rounded-full"
          style={{
            width: `${Math.round((magnitude / maxMagnitude) * 100)}%`,
            background: indicator.barColor,
          }}
        />
      </span>
    </div>
  );
}

const PREVIEW_SHIFT_COUNT = 3;

/**
 * The collapsed chapter card, with the Current Self hero's anatomy: month
 * header, hairline, serif chapter title with its dominant-theme badge, the
 * lead sentence, then chip rows for the biggest identity movements and how
 * many stories the month holds. The accordion supplies the card surface and
 * the "Show chapter" control.
 */
export function MonthlyChapterPreview({
  narrative,
  story,
}: {
  narrative: MonthlyIdentityNarrative;
  story: ChapterStory | null;
}) {
  const introSentence =
    splitIntoSentences(narrative.openingBeginning)[0] ??
    splitIntoSentences(narrative.openingEnd)[0] ??
    null;

  const previewShifts = (story?.identityShifts ?? []).slice(0, PREVIEW_SHIFT_COUNT);
  const storyCount = story?.storylines.length ?? 0;
  const accent = chapterAccentFor(story?.identityShifts ?? []);
  const dominantTheme = story?.identityShifts[0]?.theme ?? null;

  return (
    <ChapterHero narrative={narrative} accent={accent} dominantTheme={dominantTheme}>
      {introSentence ? (
        <p className="mt-4 max-w-[52em] text-[15px] leading-[1.75] text-[#555555]">
          {introSentence}
        </p>
      ) : null}

      {previewShifts.length > 0 ? (
        <div className="mt-6 border-t border-[#f0f0f0] pt-5">
          <TierLabel color="#999999">Identity Preview</TierLabel>
          <div className="mt-1 max-w-[340px]">
            {previewShifts.map((shift, i) => {
              const indicator = shiftIndicator(shift);
              return (
                <div
                  key={shift.theme}
                  className={[
                    "flex items-center gap-3.5 py-2.5",
                    i < previewShifts.length - 1 ? "border-b border-[#f5f5f5]" : "",
                  ].join(" ")}
                >
                  <ThemeChip accent={indicator.accent} />
                  <span className="flex-1 text-[14px] font-bold text-[#111]">
                    {shift.theme}
                  </span>
                  <span
                    className="text-[13px] font-semibold tabular-nums"
                    style={{ color: indicator.valueColor }}
                  >
                    {indicator.valueText}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {storyCount > 0 ? (
        <p className="mt-5 border-t border-[#f0f0f0] pt-5 text-[13px] font-medium text-[#888888]">
          {storyCount === 1
            ? "1 story changed this month."
            : `${storyCount} stories changed this month.`}
        </p>
      ) : null}
    </ChapterHero>
  );
}

/**
 * One month of the Timeline, fully opened: the month's outer card (supplied
 * by the accordion) is the chapter, and each section inside sits on its own
 * light nested surface, opened by the same bold-title-plus-subtitle header
 * every Current Self card uses. The chapter reads from internal change to
 * external change: hero, who you were entering vs how the month moved you
 * (evidence only — with no prior evidence the beginning honestly says the
 * recorded journey starts here), the identity shifts, the featured situation
 * with the rest folded, and the closing line.
 */
export function MonthlyChapter({ narrative, story, previousStory }: MonthlyChapterProps) {
  const monthName = monthNameOf(narrative.month);

  const identityShifts = story?.identityShifts ?? [];
  const maxMagnitude = identityShifts.reduce(
    (max, shift) => Math.max(max, Math.abs(shift.value)),
    1,
  );
  const storylines = story?.storylines ?? [];
  const accent = chapterAccentFor(identityShifts);
  const dominantTheme = identityShifts[0]?.theme ?? null;

  // Truth before symmetry: the end is this month's recorded movement; the
  // beginning is the previous month's, or nothing at all.
  const journey = composeIdentityJourney(
    identityShifts,
    previousStory?.identityShifts ?? [],
    narrative.comparison,
  );
  const hasBeginning = (journey?.beginning.length ?? 0) > 0;

  const introParagraphs = [
    narrative.openingBeginning,
    narrative.openingEnd,
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-5">
      {/* Chapter hero: same anatomy as the Current Self portrait card. */}
      <ChapterSurface className="px-8 py-7">
        <ChapterHero
          narrative={narrative}
          accent={accent}
          dominantTheme={dominantTheme}
        >
          {introParagraphs.length > 0 ? (
            <div className="mt-4 flex max-w-[52em] flex-col gap-3">
              {introParagraphs.map((paragraph) => (
                <p
                  key={paragraph}
                  className="text-[15px] leading-[1.75] text-[#555555]"
                >
                  {paragraph}
                </p>
              ))}
            </div>
          ) : null}
        </ChapterHero>
      </ChapterSurface>

      {/* 1. Recorded movement only: entering state needs prior evidence. */}
      {journey ? (
        <ChapterSurface className="px-8 py-7">
          <CardHeader
            glyph="→"
            glyphColor={accent.strong}
            title="Beginning → End"
            subtitle="Who you were entering the month, and how it left you."
          />
          {hasBeginning ? (
            <>
              <StateBullets
                label={`Beginning of ${monthName}`}
                labelColor={accent.strong}
                caption={
                  narrative.previousMonth
                    ? `where ${monthNameOf(narrative.previousMonth)} left you`
                    : undefined
                }
                bullets={journey.beginning}
                tone="past"
              />
              <div
                aria-hidden="true"
                className="my-3 pl-[3px] text-[15px] leading-none text-[#c9c9d1]"
              >
                ↓
              </div>
              <StateBullets
                label={`End of ${monthName}`}
                labelColor={accent.strong}
                bullets={journey.end}
                tone="present"
              />
            </>
          ) : (
            /* The earliest evidenced month keeps the same two-block shape as
               every other chapter, but its beginning honestly says there is
               no earlier evidence instead of inventing identity bullets. */
            <>
              <div>
                <TierLabel color={accent.strong}>{`Beginning of ${monthName}`}</TierLabel>
                <p className="mt-2 max-w-[52em] text-[14px] leading-[1.6] text-[#777777]">
                  The beginning of your recorded journey.
                </p>
                <p className="mt-1 max-w-[52em] text-[13px] leading-[1.6] text-[#b3b3bb]">
                  Reflection had not yet observed enough of your decisions to
                  describe who you were before this month.
                </p>
              </div>
              <div
                aria-hidden="true"
                className="my-3 pl-[3px] text-[15px] leading-none text-[#c9c9d1]"
              >
                ↓
              </div>
              <StateBullets
                label={`How You Left ${monthName}`}
                labelColor={accent.strong}
                bullets={journey.end}
                tone="present"
              />
            </>
          )}
        </ChapterSurface>
      ) : null}

      {/* 2. The largest psychological movements, by magnitude — not by valence. */}
      {identityShifts.length > 0 ? (
        <ChapterSurface className="px-8 py-7">
          <CardHeader
            glyph="◈"
            glyphColor={accent.strong}
            title="Identity Shifts"
            subtitle="The biggest movements in how you operate."
          />
          <div className="max-w-[520px]">
            {identityShifts.map((shift, i) => (
              <IdentityShiftRow
                key={shift.theme}
                shift={shift}
                maxMagnitude={maxMagnitude}
                isLast={i === identityShifts.length - 1}
              />
            ))}
          </div>
        </ChapterSurface>
      ) : narrative.howYouChanged.length > 0 ? (
        /* Months without check-in data have no magnitudes to plot; fall back
           to the deterministic movement statements, unranked and unjudged. */
        <ChapterSurface className="px-8 py-7">
          <CardHeader
            glyph="◈"
            glyphColor={accent.strong}
            title="Identity Shifts"
            subtitle="The biggest movements in how you operate."
          />
          <ul>
            {narrative.howYouChanged.map((change, i) => (
              <li
                key={change}
                className={[
                  "py-3 text-[14px] font-medium leading-snug text-[#111]",
                  i < narrative.howYouChanged.length - 1
                    ? "border-b border-[#f5f5f5]"
                    : "",
                ].join(" ")}
              >
                {change}
              </li>
            ))}
          </ul>
        </ChapterSurface>
      ) : null}

      {/* 3. The situations that carried the change: one featured, rest folded. */}
      {storylines.length > 0 ? (
        <div>
          <CardHeader
            glyph="↗"
            glyphColor={accent.strong}
            title="Your Life Changed"
            subtitle="The stories that carried the change."
          />
          <ChapterStorylines storylines={storylines} />
        </div>
      ) : null}

      {/* 4. The chapter's closing line, as a quiet observation row. */}
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
              <p className="font-voice mt-1 max-w-[38em] text-[15px] italic leading-[1.65] text-[#555555]">
                {story.closingReflection}
              </p>
            </div>
          </div>
        </ChapterSurface>
      ) : null}
    </div>
  );
}
