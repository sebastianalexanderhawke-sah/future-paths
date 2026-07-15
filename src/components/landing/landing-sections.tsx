import Link from "next/link";

import { CurrentForecastFutureCard } from "@/components/home/forecast-simplification-cards";
import { BranchMap } from "@/components/futures/branch-map";
import {
  LANDING_FORECAST_OPPORTUNITY,
  LANDING_FORECAST_RISK,
} from "@/components/landing/landing-content";
import { ILLUSTRATIVE_FUTURE_SELVES } from "@/components/onboarding/future-selves-preview";
import { OverviewCard } from "@/components/overview/overview-card";
import { CardShell } from "@/components/ui/card-shell";
import { ThemeChip } from "@/components/ui/theme-chip";
import { Reveal } from "@/components/landing/reveal";
import {
  DEMO_FORECAST,
  DEMO_PATHS,
  DEMO_SITUATION,
  DEMO_WORKSPACE,
  type DemoPath,
} from "@/components/walkthrough/walkthrough-content";
import { FREE_SITUATION_ALLOWANCE, TOKENS_PER_PACK } from "@/lib/plan";

/**
 * The public landing page, section by section. Every visual is the product
 * itself — the same primitives (OverviewCard, CardShell, ThemeChip, the
 * canonical BranchMap, the Forecasts v3 card) over openly illustrative
 * fixtures, so the page teaches Reflection in Reflection's own language.
 * The walkthrough demo scenario carries the whole story.
 *
 * Phase 1.2: sections read as chapters — a small label, an editorial serif
 * line, then the content — separated by whitespace alone (no dividers, no
 * centered marketing headlines). Page 0 of the product, not a SaaS homepage.
 *
 * Phase 2: the worked example runs Situation → Future Paths → Future
 * Forecast → Workspace, ending on the check-in that shows Reflection coming
 * back to the user.
 *
 * Phase 3 (editorial motion & readability): chapters and product cards
 * follow scroll progress — approaching content grows into focus, finished
 * chapters quietly recede (see reveal.tsx) — and landing-owned type runs a
 * step larger than the app's dashboard scale for effortless reading at
 * desktop distance. Embedded product UI (the forecast card, the BranchMap)
 * keeps its authentic in-app sizing.
 */

/* ── Shared pieces ──────────────────────────────────────────────────────── */

/** The authenticated app's primary button idiom (onboarding panels,
 *  timeline disclosures), at the landing page's slightly larger editorial
 *  scale — same shape and behavior, one comfortable step up in size for
 *  reading distance. */
export const PRIMARY_BUTTON_CLASSES =
  "rounded-xl bg-zinc-900 px-7 py-3.5 text-[15px] font-medium text-white transition-colors hover:bg-zinc-700";

/** The app's quiet bordered button (settings' secondary actions), sized to
 *  sit beside the primary. */
export const SECONDARY_BUTTON_CLASSES =
  "rounded-xl border border-[#e5e5e5] bg-white px-7 py-3.5 text-[15px] font-medium text-[#333333] transition-colors hover:border-[#111] hover:text-[#111]";

/** Chapter opening: the app's label-then-serif pattern (onboarding panels,
 *  settings sections), left-aligned with the chapter's content column. */
function ChapterHeading({ label, title }: { label: string; title?: string }) {
  return (
    <div>
      <p className="text-label text-ink-tertiary">{label}</p>
      {title ? (
        <h2 className="font-voice mt-2 max-w-[24em] text-[28px] font-medium leading-[1.3] tracking-[-0.3px] text-ink-primary">
          {title}
        </h2>
      ) : null}
    </div>
  );
}

function FlowArrow({ className = "my-2" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`self-center text-[16px] text-[#c9c9d1] ${className}`}
    >
      ↓
    </span>
  );
}

/* ── 1. Hero ────────────────────────────────────────────────────────────── */

export function LandingHero() {
  return (
    <section className="grid items-center gap-12 lg:grid-cols-[1fr_minmax(0,440px)] lg:gap-16">
      <div>
        <h1 className="font-voice text-[34px] font-medium leading-[1.22] tracking-[-0.02em] text-ink-primary sm:text-[44px] sm:leading-[1.18]">
          Every decision changes who you&apos;re becoming.
        </h1>
        <p className="mt-5 max-w-[32em] text-[17px] leading-[1.7] text-ink-secondary">
          Reflection helps you understand how today&apos;s choices shape your
          future, one situation at a time.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link href="/signup" className={PRIMARY_BUTTON_CLASSES}>
            Start Your Reflection
          </Link>
          <Link href="#how-it-works" className={SECONDARY_BUTTON_CLASSES}>
            See How Reflection Works
          </Link>
        </div>
      </div>

      {/* The value proposition as an input→output demonstration: the exact
          situation someone wrote, then the forecast Reflection drew from it.
          Without the input line the card reads as decoration; with it, the
          product explains itself before the first scroll. */}
      <div className="w-full max-w-[460px]">
        <p className="text-label text-[var(--accent-futures)]">
          Example · Future Forecast
        </p>
        <p className="mt-2 text-[14px] leading-[1.65] text-ink-secondary">
          From one written situation —{" "}
          <span className="font-medium text-ink-primary">
            &ldquo;{DEMO_SITUATION.title}&rdquo;
          </span>{" "}
          — Reflection forecast a possible year ahead:
        </p>
        <div className="mt-3">
          <CurrentForecastFutureCard future={LANDING_FORECAST_OPPORTUNITY} />
        </div>
        <p className="mt-3 text-[13px] text-ink-tertiary">
          Real product UI — an example, not your data.
        </p>
      </div>
    </section>
  );
}

/* ── 2. How Reflection works ────────────────────────────────────────────── */

const HOW_IT_WORKS = [
  {
    title: "Capture a situation",
    detail: "Record a decision, challenge, or turning point.",
  },
  {
    title: "Explore possible futures",
    detail: "See where different choices could lead before making them.",
  },
  {
    title: "Watch yourself evolve",
    detail:
      "Your decisions become patterns that shape Current Self, Timeline, and Future Selves.",
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="mx-auto w-full max-w-[560px] scroll-mt-6">
      <Reveal>
        <ChapterHeading label="How it works" />
      </Reveal>
      <div className="mt-7 flex flex-col">
        {/* Each step carries its own scroll progress, so the sequence is
            felt step by step as the reader moves down the column. */}
        {HOW_IT_WORKS.map((step, index) => (
          <Reveal key={step.title} className="flex flex-col">
            {index > 0 ? <FlowArrow /> : null}
            <OverviewCard className="px-8 py-7 text-center">
              <p className="text-label text-ink-tertiary">Step {index + 1}</p>
              <h3 className="font-voice mt-2 text-[22px] font-medium leading-[1.3] text-ink-primary">
                {step.title}
              </h3>
              <p className="mt-2.5 text-[15px] leading-[1.7] text-ink-secondary">
                {step.detail}
              </p>
            </OverviewCard>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ── 3. One complete example ────────────────────────────────────────────── */

function ExamplePathCard({ path, chosen }: { path: DemoPath; chosen: boolean }) {
  return (
    <CardShell
      variant="elevated"
      className={chosen ? "ring-1 ring-[var(--state-strengthened)]/30" : "opacity-50"}
    >
      <div className="px-8 py-6">
        {chosen ? (
          <p className="mb-1 text-label text-[var(--state-strengthened)]">✓ Selected</p>
        ) : null}
        <h4 className="font-voice text-[20px] font-medium leading-[1.3] tracking-[-0.01em] text-ink-primary">
          {path.title}
        </h4>
        <span className="mt-2 flex flex-wrap gap-1.5">
          {path.themes.map((theme) => (
            <ThemeChip key={theme} theme={theme} showDot={false} />
          ))}
        </span>
        <p className="mt-2.5 text-[15px] leading-[1.7] text-ink-secondary">{path.summary}</p>
      </div>
    </CardShell>
  );
}

export function ExampleJourneySection() {
  const steps: { label: string; accentVar: string; content: React.ReactNode }[] = [
    {
      label: "Situation",
      accentVar: "--accent-moments",
      content: (
        <OverviewCard className="px-8 py-7">
          <h4 className="font-voice text-[24px] font-medium leading-[1.3] tracking-[-0.3px] text-ink-primary">
            {DEMO_SITUATION.title}
          </h4>
          <p className="mt-3 text-[15px] leading-[1.75] text-ink-secondary">
            {DEMO_SITUATION.description}
          </p>
        </OverviewCard>
      ),
    },
    {
      label: "Future Paths",
      accentVar: "--accent-futures",
      content: (
        <div className="flex flex-col gap-3">
          {DEMO_PATHS.map((path) => (
            <ExamplePathCard key={path.title} path={path} chosen={path.chosen} />
          ))}
        </div>
      ),
    },
    {
      label: "Future Forecast",
      accentVar: "--accent-futures",
      content: (
        <OverviewCard className="px-8 py-7">
          <p className="text-label text-ink-primary">What might happen next?</p>
          <div className="mt-4 flex flex-col gap-4">
            {DEMO_FORECAST.timeline.map((entry) => (
              <div
                key={entry.text}
                className="border-t border-[#f0f0f0] pt-4 first:border-t-0 first:pt-0"
              >
                <p className="text-label text-ink-tertiary">{entry.window}</p>
                <p className="mt-1.5 text-[15px] leading-[1.65] text-ink-secondary">
                  {entry.text}
                </p>
              </div>
            ))}
          </div>
          {/* Who this path feeds, folded into the forecast it belongs to —
              the "becoming" beat stays in the story without adding a step
              between the forecast and the loop back into the Workspace. */}
          <div className="mt-4 border-t border-[#f0f0f0] pt-4">
            <p className="text-label text-ink-tertiary">Future Self</p>
            <p className="mt-1.5 text-[15px] leading-[1.7] text-ink-secondary">
              {DEMO_FORECAST.futureSelf}
            </p>
          </div>
        </OverviewCard>
      ),
    },
    {
      // The example doesn't end at a reading — it ends with Reflection
      // coming back. The same scenario's check-in shows the loop that makes
      // the product ongoing rather than one-shot.
      label: "Workspace",
      accentVar: "--accent-moments",
      content: (
        <OverviewCard className="px-8 py-7">
          <p className="text-[13px] text-ink-tertiary">
            A week later, Reflection follows up
          </p>
          <p className="mt-4 text-label text-[var(--accent-moments)]">Check-in</p>
          <p className="mt-2 text-[17px] font-semibold text-ink-primary">
            {DEMO_WORKSPACE.checkIn.title}
          </p>
          <p className="mt-1.5 text-[15px] leading-[1.65] text-ink-secondary">
            {DEMO_WORKSPACE.checkIn.detail}
          </p>
        </OverviewCard>
      ),
    },
  ];

  return (
    <section className="mx-auto w-full max-w-[680px]">
      <Reveal>
        <ChapterHeading
          label="One complete example"
          title="One situation, from first words to who you're becoming."
        />
      </Reveal>
      <div className="mt-10 flex flex-col">
        {/* Each chapter of the example enters on its own scroll beat, so the
            ↓ sequence is experienced in order rather than read all at once. */}
        {steps.map((step, index) => (
          <Reveal key={step.label} className="flex flex-col">
            {index > 0 ? <FlowArrow className="my-6" /> : null}
            <div>
              <p className="text-label mb-2.5" style={{ color: `var(${step.accentVar})` }}>
                {step.label}
              </p>
              {step.content}
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ── 4. Inside Reflection ───────────────────────────────────────────────── */

function ExploreFeature({
  name,
  sentence,
  children,
}: {
  name: string;
  sentence: string;
  children: React.ReactNode;
}) {
  return (
    <Reveal>
      <h3 className="font-voice text-[22px] font-medium leading-[1.3] text-ink-primary">
        {name}
      </h3>
      <p className="mt-2 text-[16px] leading-[1.7] text-ink-secondary">{sentence}</p>
      <div className="mt-6">{children}</div>
    </Reveal>
  );
}

export function ExploreSection() {
  return (
    <section className="mx-auto w-full max-w-[880px]">
      <Reveal>
        <ChapterHeading label="Inside Reflection" title="Reflection grows with you." />
      </Reveal>

      <div className="mt-10 flex flex-col gap-16">
        <ExploreFeature
          name="Future Forecasts"
          sentence="See how today's choice changes tomorrow."
        >
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <p className="text-label mb-2 text-ink-tertiary">Things to Watch For</p>
              <CurrentForecastFutureCard future={LANDING_FORECAST_RISK} />
            </div>
            <div>
              <p className="text-label mb-2 text-ink-tertiary">Unexpected Opportunities</p>
              <CurrentForecastFutureCard future={LANDING_FORECAST_OPPORTUNITY} />
            </div>
          </div>
        </ExploreFeature>

        <ExploreFeature
          name="Future Selves"
          sentence="Recognize the person your choices are creating."
        >
          <OverviewCard className="px-6 py-8">
            <BranchMap
              futureSelves={ILLUSTRATIVE_FUTURE_SELVES}
              interaction={{ kind: "link", href: "/signup" }}
              widthClassName="max-w-[880px]"
            />
            <p className="mt-6 text-center text-[13px] text-ink-tertiary">
              An illustration, not your data — your own map begins with a single
              &ldquo;You&rdquo; and grows from what you record.
            </p>
          </OverviewCard>
        </ExploreFeature>

        <ExploreFeature
          name="Workspace"
          sentence="Keep track of the situations that still deserve your attention."
        >
          <OverviewCard className="max-w-[640px] divide-y divide-[#f5f5f5]">
            <div className="px-8 py-6">
              <p className="text-label text-[var(--accent-moments)]">Check-in</p>
              <p className="mt-2 text-[16px] font-semibold text-ink-primary">
                {DEMO_WORKSPACE.checkIn.title}
              </p>
              <p className="mt-1.5 text-[15px] leading-[1.65] text-ink-secondary">
                {DEMO_WORKSPACE.checkIn.detail}
              </p>
            </div>
            <div className="px-8 py-6">
              <p className="text-label text-[var(--accent-growth)]">Reflection</p>
              <p className="mt-2 text-[16px] font-semibold text-ink-primary">
                {DEMO_WORKSPACE.reflection.title}
              </p>
              <p className="mt-1.5 text-[15px] leading-[1.65] text-ink-secondary">
                {DEMO_WORKSPACE.reflection.detail}
              </p>
            </div>
          </OverviewCard>
        </ExploreFeature>
      </div>
    </section>
  );
}

/* ── 5. Pricing ─────────────────────────────────────────────────────────── */

const PRICING: {
  name: string;
  price: string;
  period: string | null;
  lines: string[];
  /** Quiet guidance for the undecided — a label and hairline ring in the
   *  page's existing selected-card grammar, nothing louder. */
  recommended?: boolean;
}[] = [
  {
    name: "Free",
    price: "$0",
    period: null,
    lines: [
      `${FREE_SITUATION_ALLOWANCE} active situation`,
      "Full Reflection experience",
    ],
  },
  {
    name: "Premium",
    price: "$9.99",
    period: "/month",
    lines: ["Unlimited situations"],
    recommended: true,
  },
  {
    name: "Extra Situations",
    price: "$9.99",
    period: null,
    lines: [`+${TOKENS_PER_PACK} situations`],
  },
];

export function PricingSection() {
  return (
    <section className="mx-auto w-full max-w-[880px]">
      <Reveal>
        <ChapterHeading label="Pricing" />
        <p className="mt-3 text-[16px] leading-[1.7] text-ink-secondary">
          Start free. Add more situations when you need them.
        </p>
      </Reveal>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {PRICING.map((plan) => (
          <Reveal key={plan.name} className="h-full">
            <OverviewCard
              className={[
                "flex h-full flex-col px-8 py-7",
                plan.recommended
                  ? "ring-1 ring-[var(--accent-futures)]/25"
                  : "",
              ].join(" ")}
            >
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-[16px] font-semibold text-ink-primary">{plan.name}</p>
                {plan.recommended ? (
                  <p className="text-label text-[var(--accent-futures)]">Most Popular</p>
                ) : null}
              </div>
              <p className="font-voice mt-2 text-[30px] font-medium text-ink-primary">
                {plan.price}
                {plan.period ? (
                  <span className="text-[15px] font-normal text-ink-tertiary">
                    {plan.period}
                  </span>
                ) : null}
              </p>
              <ul className="mt-3 flex-1">
                {plan.lines.map((line) => (
                  <li
                    key={line}
                    className="flex items-baseline gap-2.5 text-[15px] leading-[1.85] text-[#777777]"
                  >
                    <span aria-hidden="true" className="text-[11px] text-[#c9c9d1]">
                      •
                    </span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </OverviewCard>
          </Reveal>
        ))}
      </div>
      {/* Honesty over salesmanship: checkout doesn't exist yet, and saying
          so here costs nothing — discovering it after reading a price list
          is where trust would be lost. Same disclosure the Settings billing
          notice makes in-app. */}
      <p className="mt-4 text-[13px] leading-relaxed text-ink-tertiary">
        Checkout isn&apos;t open during the beta — every account has the full
        Reflection experience free while these plans are finalized. Nothing is
        charged.
      </p>
    </section>
  );
}

/* ── 6. Final call to action ────────────────────────────────────────────── */

export function FinalCtaSection() {
  return (
    <section className="text-center">
      <Reveal>
        <h2 className="font-voice mx-auto max-w-[18em] text-[30px] font-medium leading-[1.28] tracking-[-0.3px] text-ink-primary sm:text-[36px]">
          The future isn&apos;t built all at once.{" "}
          <span className="sm:block">
            It&apos;s built one decision at a time.
          </span>
        </h2>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/signup" className={PRIMARY_BUTTON_CLASSES}>
            Start Your Reflection
          </Link>
          <Link href="/login" className={SECONDARY_BUTTON_CLASSES}>
            Sign In
          </Link>
        </div>
      </Reveal>
    </section>
  );
}
