import type { Metadata } from "next";
import Link from "next/link";

import { OverviewCard } from "@/components/overview/overview-card";
import { Button } from "@/components/ui/button";
import {
  DEMO_SITUATION,
  WALKTHROUGH_STEP_COUNT,
  WALKTHROUGH_STEPS,
} from "@/components/walkthrough/walkthrough-content";
import {
  DemoChosenPath,
  DemoForecast,
  DemoOverviewMap,
  DemoPaths,
  DemoQuestions,
  DemoSituationEditor,
  DemoTimelineChapter,
  DemoWorkspace,
} from "@/components/walkthrough/walkthrough-demos";

export const metadata: Metadata = {
  title: "Interactive Walkthrough — Reflection",
};

type WalkthroughPageProps = {
  searchParams: Promise<Record<string, string | undefined>>;
};

/**
 * The Interactive Walkthrough: nine server-rendered teaching steps driven by
 * ?step=N, so Back/Next are plain links, the browser back button works, and
 * there is no client state to leak. Every panel renders fixture content from
 * walkthrough-content.ts — the page performs no reads or writes against the
 * user's data, so entering and leaving changes nothing in the account.
 */
export default async function WalkthroughPage({ searchParams }: WalkthroughPageProps) {
  const { step: rawStep } = await searchParams;
  const parsed = Number.parseInt(rawStep ?? "1", 10);
  const stepNumber = Number.isFinite(parsed)
    ? Math.min(Math.max(parsed, 1), WALKTHROUGH_STEP_COUNT)
    : 1;
  const step = WALKTHROUGH_STEPS[stepNumber - 1]!;

  const isFirst = stepNumber === 1;
  const isLast = stepNumber === WALKTHROUGH_STEP_COUNT;
  const nextHref = isLast
    ? "/settings"
    : `/settings/walkthrough?step=${stepNumber + 1}`;
  const backHref = `/settings/walkthrough?step=${stepNumber - 1}`;

  return (
    <div className="min-h-screen bg-[#f4f4f6] text-[#111]">
      <div className="mx-auto flex min-h-screen w-full max-w-[840px] flex-col px-6 py-8 sm:px-10">
        {/* Chrome: what this is, where you are, and the always-available exit. */}
        <header>
          <div className="flex items-center justify-between gap-4">
            <p className="text-label text-ink-tertiary">Interactive Walkthrough</p>
            <Link
              href="/settings"
              className="text-[13px] font-medium text-[#999999] transition-colors duration-150 hover:text-[#111]"
            >
              Skip Walkthrough
            </Link>
          </div>
          <div className="mt-4 flex items-center gap-4">
            <div
              className="h-1 flex-1 overflow-hidden rounded-full bg-[var(--action-soft-fill)]"
              role="progressbar"
              aria-valuemin={1}
              aria-valuemax={WALKTHROUGH_STEP_COUNT}
              aria-valuenow={stepNumber}
              aria-label="Walkthrough progress"
            >
              <div
                className="h-full rounded-full bg-[var(--accent-system)] transition-[width] duration-300"
                style={{ width: `${(stepNumber / WALKTHROUGH_STEP_COUNT) * 100}%` }}
              />
            </div>
            <p className="shrink-0 text-[13px] font-medium text-[#888888]">
              Step {stepNumber} of {WALKTHROUGH_STEP_COUNT}
            </p>
          </div>
        </header>

        {/* Teaching copy, then the demonstration surface it refers to. */}
        <main className="flex flex-1 flex-col gap-8 py-10">
          <div>
            <p className="text-label" style={{ color: `var(${step.accentVar})` }}>
              {step.kicker}
            </p>
            <h1 className="font-voice mt-2 text-[28px] font-medium leading-[1.25] tracking-[-0.4px] text-ink-primary">
              {step.title}
            </h1>
            {step.paragraphs.map((paragraph) => (
              <p
                key={paragraph}
                className="mt-3 max-w-[46em] text-[15px] leading-[1.7] text-ink-secondary"
              >
                {paragraph}
              </p>
            ))}
          </div>

          {stepNumber === 1 ? <WelcomePanel /> : null}
          {stepNumber === 2 ? <DemoSituationEditor /> : null}
          {stepNumber === 3 ? <DemoQuestions /> : null}
          {stepNumber === 4 ? <DemoPaths /> : null}
          {stepNumber === 5 ? <DemoChosenPath /> : null}
          {stepNumber === 6 ? <DemoForecast /> : null}
          {stepNumber === 7 ? <DemoWorkspace /> : null}
          {stepNumber === 8 ? <DemoTimelineChapter /> : null}
          {stepNumber === 9 ? <DemoOverviewMap /> : null}
        </main>

        <footer className="flex items-center justify-between gap-4 border-t border-[#ececf0] pt-6 pb-2">
          {isFirst ? (
            <span aria-hidden="true" />
          ) : (
            <Button href={backHref} variant="secondary">
              Back
            </Button>
          )}
          <Button href={nextHref}>{step.nextLabel ?? "Next →"}</Button>
        </footer>
      </div>
    </div>
  );
}

/** Step 1 has nothing to demonstrate yet — it sets the frame: one example
 *  situation, followed to the end, with an explicit no-touching-your-data
 *  promise. */
function WelcomePanel() {
  return (
    <OverviewCard className="px-8 py-7">
      <p className="text-label text-ink-tertiary">The example you&apos;ll follow</p>
      <p className="text-quote mt-3 text-ink-primary">
        “{DEMO_SITUATION.title}”
      </p>
      <p className="mt-4 max-w-[46em] text-body-small leading-[1.7] text-ink-secondary">
        One situation, start to finish: describing it, answering Reflection&apos;s
        questions, exploring the paths it becomes, forecasting a chosen path,
        and seeing how check-ins turn it into your Timeline. About 2–3 minutes.
      </p>
    </OverviewCard>
  );
}
