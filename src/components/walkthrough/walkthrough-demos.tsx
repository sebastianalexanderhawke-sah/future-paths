import { OverviewCard } from "@/components/overview/overview-card";
import { CardShell } from "@/components/ui/card-shell";
import { ThemeChip } from "@/components/ui/theme-chip";
import {
  DEMO_CHOSEN_PATH,
  DEMO_FORECAST,
  DEMO_OVERVIEW_CHAIN,
  DEMO_PATHS,
  DEMO_QUESTIONS,
  DEMO_SITUATION,
  DEMO_TIMELINE_CHAPTER,
  DEMO_WORKSPACE,
  type DemoPath,
} from "@/components/walkthrough/walkthrough-content";

/**
 * Demonstration panels for the Interactive Walkthrough. Each one recreates
 * a real product surface with the same primitives the product uses
 * (OverviewCard, CardShell, ThemeChip, the label/serif/body type scale) but
 * renders only walkthrough-content fixtures — nothing interactive, nothing
 * persisted, no user data anywhere.
 */

/** Names the part of the product being demonstrated: a small accent-colored
 *  label over a dashed outline, so "this is the thing being taught" reads
 *  instantly without a tooltip system. */
function Highlight({
  label,
  accentVar,
  children,
}: {
  label: string;
  accentVar: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-label mb-2" style={{ color: `var(${accentVar})` }}>
        {label}
      </p>
      <div
        className="rounded-2xl border border-dashed p-2"
        style={{ borderColor: `color-mix(in srgb, var(${accentVar}) 45%, transparent)` }}
      >
        {children}
      </div>
    </div>
  );
}

function FieldShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-base text-zinc-900">
      {children}
    </div>
  );
}

/* ── Step 2: the situation editor ───────────────────────────────────────── */

export function DemoSituationEditor() {
  return (
    <Highlight label="The situation editor" accentVar="--accent-moments">
      <OverviewCard className="px-8 py-7">
        <div className="flex flex-col gap-6">
          <div>
            <h3 className="text-2xl font-semibold tracking-tight text-zinc-900">
              What should we call this situation?
            </h3>
            <div className="mt-3">
              <FieldShell>{DEMO_SITUATION.title}</FieldShell>
            </div>
          </div>
          <div>
            <h4 className="text-lg font-semibold text-zinc-900">
              Tell Reflection what&apos;s happening
            </h4>
            <div className="mt-3">
              <FieldShell>
                <span className="text-[15px] leading-[1.6]">
                  {DEMO_SITUATION.description}
                </span>
              </FieldShell>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-700">
              What kind of help are you looking for?
            </p>
            <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
              <div className="rounded-xl border border-zinc-900 bg-zinc-50 px-4 py-3">
                <span className="block text-sm font-medium text-zinc-900">
                  Explore a decision
                </span>
                <span className="mt-0.5 block text-sm text-zinc-500">
                  Help me think through what to do
                </span>
              </div>
              <div className="rounded-xl border border-zinc-200 px-4 py-3">
                <span className="block text-sm font-medium text-zinc-900">
                  Forecast the future
                </span>
                <span className="mt-0.5 block text-sm text-zinc-500">
                  Help me see what might happen next
                </span>
              </div>
            </div>
          </div>
        </div>
      </OverviewCard>
    </Highlight>
  );
}

/* ── Step 3: follow-up questions ────────────────────────────────────────── */

export function DemoQuestions() {
  return (
    <Highlight label="Follow-up questions" accentVar="--accent-moments">
      <OverviewCard className="px-8 py-7">
        <div className="flex flex-col gap-6">
          {DEMO_QUESTIONS.map((item, index) => (
            <div key={item.question}>
              <p className="text-label text-ink-tertiary">
                Question {index + 1} of {DEMO_QUESTIONS.length}
              </p>
              <p className="mt-2 text-[17px] font-medium text-zinc-900">
                {item.question}
              </p>
              <div className="mt-3 rounded-xl bg-[var(--surface-muted)] px-4 py-3 text-[15px] leading-[1.6] text-ink-secondary">
                {item.answer}
              </div>
            </div>
          ))}
        </div>
      </OverviewCard>
    </Highlight>
  );
}

/* ── Steps 4 & 5: possible paths ────────────────────────────────────────── */

function DemoPathCard({
  path,
  expanded,
  showChoice,
}: {
  path: DemoPath;
  expanded: boolean;
  showChoice: boolean;
}) {
  const isChosen = showChoice && path.chosen;
  return (
    <CardShell
      variant="elevated"
      className={isChosen ? "ring-1 ring-[var(--state-strengthened)]/30" : ""}
    >
      <div className="px-7 py-5">
        {isChosen ? (
          <p className="mb-1 text-label text-[var(--state-strengthened)]">
            ✓ Selected
          </p>
        ) : null}
        <h4 className="font-voice text-[19px] font-medium leading-[1.3] tracking-[-0.01em] text-ink-primary">
          {path.title}
        </h4>
        <span className="mt-2 flex flex-wrap gap-1.5">
          {path.themes.map((theme) => (
            <ThemeChip key={theme} theme={theme} showDot={false} />
          ))}
        </span>
        <p className="mt-2 max-w-[60em] text-body-small text-ink-secondary">
          {path.summary}
        </p>

        {expanded ? (
          <div className="mt-5 flex flex-col gap-5">
            <div className="grid gap-5 sm:grid-cols-2 sm:gap-12">
              <div>
                <p className="text-label text-[var(--state-strengthened)]">
                  Benefits
                </p>
                <ul className="mt-1 flex flex-col gap-1.5">
                  {path.benefits.map((item) => (
                    <li
                      key={item}
                      className="flex gap-2 text-body-small text-ink-secondary"
                    >
                      <span aria-hidden="true" className="text-ink-tertiary">
                        •
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-label text-[var(--state-contradiction-detected)]">
                  Trade-offs
                </p>
                <ul className="mt-1 flex flex-col gap-1.5">
                  {path.tradeOffs.map((item) => (
                    <li
                      key={item}
                      className="flex gap-2 text-body-small text-ink-secondary"
                    >
                      <span aria-hidden="true" className="text-ink-tertiary">
                        •
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="rounded-[var(--radius-whisper)] bg-[var(--surface-muted)] px-5 py-4">
              <p className="text-label text-ink-tertiary">Future you</p>
              <p className="mt-1 max-w-[60em] text-body-small text-ink-primary">
                {path.futureYou}
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </CardShell>
  );
}

export function DemoPaths() {
  return (
    <Highlight label="Possible futures" accentVar="--accent-futures">
      <div className="flex flex-col gap-3">
        {DEMO_PATHS.map((path, index) => (
          <DemoPathCard
            key={path.title}
            path={path}
            expanded={index === 0}
            showChoice={false}
          />
        ))}
      </div>
    </Highlight>
  );
}

export function DemoChosenPath() {
  return (
    <Highlight label="A path, chosen" accentVar="--accent-futures">
      <div className="flex flex-col gap-3">
        <DemoPathCard path={DEMO_CHOSEN_PATH} expanded={false} showChoice />
        {DEMO_PATHS.filter((path) => !path.chosen).map((path) => (
          <div key={path.title} className="opacity-50">
            <DemoPathCard path={path} expanded={false} showChoice={false} />
          </div>
        ))}
      </div>
    </Highlight>
  );
}

/* ── Step 6: the Future Forecast ────────────────────────────────────────── */

export function DemoForecast() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <Highlight label="Current Self" accentVar="--accent-self">
          <OverviewCard className="h-full px-7 py-6">
            <p className="text-body-small leading-[1.7] text-ink-secondary">
              {DEMO_FORECAST.currentSelf}
            </p>
          </OverviewCard>
        </Highlight>
        <Highlight label="Future Self" accentVar="--accent-futures">
          <OverviewCard className="h-full px-7 py-6">
            <p className="text-body-small leading-[1.7] text-ink-secondary">
              {DEMO_FORECAST.futureSelf}
            </p>
          </OverviewCard>
        </Highlight>
      </div>

      <Highlight label="Forecast" accentVar="--accent-futures">
        <OverviewCard className="px-7 py-6">
          <p className="text-label text-ink-primary">What might happen next?</p>
          <div className="mt-4 flex flex-col gap-4">
            {DEMO_FORECAST.timeline.map((entry) => (
              <div
                key={entry.text}
                className="border-t border-[#f0f0f0] pt-4 first:border-t-0 first:pt-0"
              >
                <p className="text-label text-ink-tertiary">{entry.window}</p>
                <p className="mt-1 text-body-small text-ink-secondary">
                  {entry.text}
                </p>
              </div>
            ))}
          </div>
        </OverviewCard>
      </Highlight>
    </div>
  );
}

/* ── Step 7: the Workspace queue ────────────────────────────────────────── */

export function DemoWorkspace() {
  const items = [
    { accent: "--accent-moments", ...DEMO_WORKSPACE.checkIn, highlight: "Check-ins" },
    { accent: "--accent-growth", ...DEMO_WORKSPACE.reflection, highlight: "Reflections" },
  ];
  return (
    <div className="flex flex-col gap-6">
      {items.map((item) => (
        <Highlight key={item.title} label={item.highlight} accentVar={item.accent}>
          <OverviewCard className="px-7 py-6">
            <p className="text-label" style={{ color: `var(${item.accent})` }}>
              {item.label}
            </p>
            <p className="mt-2 text-[15px] font-semibold text-ink-primary">
              {item.title}
            </p>
            <p className="mt-1 text-body-small text-ink-secondary">{item.detail}</p>
          </OverviewCard>
        </Highlight>
      ))}
    </div>
  );
}

/* ── Step 8: a Timeline chapter ─────────────────────────────────────────── */

export function DemoTimelineChapter() {
  const chapter = DEMO_TIMELINE_CHAPTER;
  return (
    <Highlight label="A completed chapter" accentVar="--accent-growth">
      <OverviewCard className="px-8 py-7">
        <p className="text-label text-ink-tertiary">{chapter.month}</p>
        <h3 className="font-voice mt-2 max-w-[24em] text-[24px] font-medium leading-[1.3] tracking-[-0.3px] text-ink-primary">
          {chapter.headline}
        </h3>

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div>
            <p className="text-label text-ink-tertiary">
              Beginning of {chapter.month}
            </p>
            <ul className="mt-2 flex flex-col gap-1.5">
              {chapter.beginning.map((line) => (
                <li key={line} className="text-body-small text-ink-secondary">
                  {line}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-label text-ink-tertiary">
              End of {chapter.month}
            </p>
            <ul className="mt-2 flex flex-col gap-1.5">
              {chapter.end.map((line) => (
                <li key={line} className="text-body-small text-ink-secondary">
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-6 border-t border-[#f0f0f0] pt-5">
          <p className="text-label text-ink-tertiary">Identity Shifts</p>
          <div className="mt-2 flex flex-col gap-2">
            {chapter.shifts.map((shift) => (
              <div key={shift.theme} className="flex items-center gap-3">
                <ThemeChip theme={shift.theme} />
                <span className="text-body-small font-medium text-ink-primary">
                  {shift.change}
                </span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-quote mt-6 text-ink-secondary">{chapter.closing}</p>
      </OverviewCard>
    </Highlight>
  );
}

/* ── Step 9: how everything connects ────────────────────────────────────── */

export function DemoOverviewMap() {
  return (
    <Highlight label="The whole loop" accentVar="--accent-self">
      <OverviewCard className="px-8 py-7">
        <div className="flex flex-col items-stretch">
          {DEMO_OVERVIEW_CHAIN.map((node, index) => (
            <div key={node.name} className="flex flex-col">
              {index > 0 ? (
                <span
                  aria-hidden="true"
                  className="my-1.5 self-center text-[18px] text-ink-tertiary"
                >
                  ↓
                </span>
              ) : null}
              <div className="rounded-xl bg-[var(--surface-muted)] px-5 py-4 text-center">
                <p className="text-[15px] font-semibold text-ink-primary">
                  {node.name}
                </p>
                <p className="mt-1 text-body-small text-ink-secondary">
                  {node.note}
                </p>
              </div>
            </div>
          ))}
        </div>
      </OverviewCard>
    </Highlight>
  );
}
