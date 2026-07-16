import Link from "next/link";

import { CurrentForecastFutureCard } from "@/components/home/forecast-simplification-cards";
import { BranchMap } from "@/components/futures/branch-map";
import {
  LANDING_FORECAST_TIMELINE,
  type LandingForecastKind,
  LANDING_FUTURE_SELF,
  LANDING_FUTURE_SELVES,
  LANDING_HERO_FORECAST,
  LANDING_PATHS,
  LANDING_SITUATION,
  LANDING_WORKSPACE,
  type LandingPath,
} from "@/components/landing/landing-content";
import { OverviewCard } from "@/components/overview/overview-card";
import { CardShell } from "@/components/ui/card-shell";
import { ThemeChip } from "@/components/ui/theme-chip";
import { Reveal } from "@/components/landing/reveal";
import { FREE_SITUATION_ALLOWANCE, TOKENS_PER_PACK } from "@/lib/plan";

/**
 * The public landing page, section by section. Every visual is the product
 * itself — the same primitives (OverviewCard, CardShell, ThemeChip, the
 * canonical BranchMap, the Forecasts v3 card) over openly illustrative
 * fixtures, so the page teaches Reflection in Reflection's own language.
 *
 * Phase 4 (one story): the page tells a single complete story — one
 * relatable situation ("Should I ask her out?") followed through Situation
 * → Future Paths → Future Forecast → Future Self → Workspace. The worked
 * example IS the product explanation; no section after it reintroduces a
 * surface the story already showed. The only post-example product beat is
 * the thing the example can't show: what a year of situations adds up to
 * (the Future Selves map).
 *
 * Motion: each section owns one language from reveal.tsx — the story reads
 * down a drawn spine ("draw") with chapters entering in sequence ("focus"),
 * the forecast unrolls ("unfold"), the identity beats grow into place
 * ("bloom"), and pricing's sibling cards arrive left to right ("stagger").
 * The hero stays still. Landing-owned type runs a step larger than the
 * app's dashboard scale; embedded product UI keeps its authentic in-app
 * sizing.
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
  // Every chapter contributes a real <h2> to the page outline: the serif
  // title when there is one, otherwise the label itself (same visual style)
  // — heading levels never skip from the hero's h1 to in-card h3/h4s.
  return (
    <div>
      {title ? (
        <>
          <p className="text-label text-ink-tertiary">{label}</p>
          <h2 className="font-voice mt-2 max-w-[24em] text-[28px] font-medium leading-[1.3] tracking-[-0.3px] text-ink-primary">
            {title}
          </h2>
        </>
      ) : (
        <h2 className="text-label text-ink-tertiary">{label}</h2>
      )}
    </div>
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
          Sibyl helps you understand how today&apos;s choices shape your
          future, one situation at a time.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link href="/signup" className={PRIMARY_BUTTON_CLASSES}>
            Start Your Journey
          </Link>
          <Link href="#example" className={SECONDARY_BUTTON_CLASSES}>
            See how it works
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
            &ldquo;{LANDING_SITUATION.title}&rdquo;
          </span>{" "}
          — Sibyl explored what might happen next:
        </p>
        <div className="mt-3">
          <CurrentForecastFutureCard future={LANDING_HERO_FORECAST} />
        </div>
        <p className="mt-3 text-[13px] text-ink-tertiary">
          Real product UI — an example, not your data.
        </p>
      </div>
    </section>
  );
}

/* ── 2. The story: one situation, start to finish ───────────────────────── */

/** One chapter of the story: a lit dot on the spine, an accent label, a
 *  sentence of narration, then the product surface itself. The narration
 *  carries the reader between surfaces — it is the page's only "how it
 *  works" copy. */
function StoryStep({
  label,
  accentVar,
  note,
  children,
}: {
  label: string;
  accentVar: string;
  note: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <Reveal>
        <span
          aria-hidden="true"
          className="absolute -left-9 top-[4px] h-[7px] w-[7px] rounded-full"
          style={{ background: `var(${accentVar})` }}
        />
        <h3 className="text-label" style={{ color: `var(${accentVar})` }}>
          {label}
        </h3>
        <p className="mt-2 max-w-[36em] text-[15px] leading-[1.7] text-ink-secondary">
          {note}
        </p>
      </Reveal>
      <div className="mt-5">{children}</div>
    </div>
  );
}

/** Marker + accent per forecast flavor, from the product's existing accent
 *  families (growth=emerald, moments=amber, futures=violet). Quiet glyphs,
 *  not icons — the observation stays the loudest thing in the row. */
const FORECAST_MARKERS: Record<
  LandingForecastKind,
  { glyph: string; accentVar: string }
> = {
  likely: { glyph: "○", accentVar: "--accent-growth" },
  watch: { glyph: "△", accentVar: "--accent-moments" },
  unexpected: { glyph: "✦", accentVar: "--accent-futures" },
};

function StoryPathCard({ path }: { path: LandingPath }) {
  return (
    <CardShell
      variant="elevated"
      className={
        path.chosen ? "ring-1 ring-[var(--state-strengthened)]/30" : "opacity-50"
      }
    >
      <div className="px-8 py-6">
        {path.chosen ? (
          <p className="mb-1 text-label text-[var(--state-strengthened)]">
            ✓ Selected
          </p>
        ) : null}
        <h4 className="font-voice text-[20px] font-medium leading-[1.3] tracking-[-0.01em] text-ink-primary">
          {path.title}
        </h4>
        <span className="mt-2 flex flex-wrap gap-1.5">
          {path.themes.map((theme) => (
            <ThemeChip key={theme} theme={theme} showDot={false} />
          ))}
        </span>
        <p className="mt-2.5 text-[15px] leading-[1.7] text-ink-secondary">
          {path.summary}
        </p>
      </div>
    </CardShell>
  );
}

export function ExampleJourneySection() {
  return (
    <section id="example" className="mx-auto w-full max-w-[680px] scroll-mt-6">
      <Reveal>
        <ChapterHeading
          label="One complete example"
          title="Follow one real decision, from first words to who it makes you."
        />
      </Reveal>

      {/* The story reads down a spine that draws itself as you scroll —
          each chapter lights its dot as it enters. */}
      <div className="relative mt-12">
        <Reveal
          effect="draw"
          className="absolute bottom-2 left-[3px] top-1 w-px bg-[#e3e3e8]"
        />
        <div className="flex flex-col gap-16 pl-9">
          <StoryStep
            label="Situation"
            accentVar="--accent-moments"
            note="It starts with a few honest sentences, written the way you'd actually say them."
          >
            <Reveal>
              <OverviewCard className="px-8 py-7">
                <h4 className="font-voice text-[24px] font-medium leading-[1.3] tracking-[-0.3px] text-ink-primary">
                  {LANDING_SITUATION.title}
                </h4>
                {LANDING_SITUATION.paragraphs.map((paragraph) => (
                  <p
                    key={paragraph}
                    className="mt-3 text-[15px] leading-[1.75] text-ink-secondary"
                  >
                    {paragraph}
                  </p>
                ))}
              </OverviewCard>
            </Reveal>
          </StoryStep>

          <StoryStep
            label="Future Paths"
            accentVar="--accent-futures"
            note="Sibyl turns the situation into genuinely different ways the next year could go — and you choose one."
          >
            <div className="flex flex-col gap-3">
              {LANDING_PATHS.map((path) => (
                <Reveal key={path.title}>
                  <StoryPathCard path={path} />
                </Reveal>
              ))}
            </div>
          </StoryStep>

          <StoryStep
            label="Future Forecast"
            accentVar="--accent-futures"
            note="Choosing a path unlocks a forecast — thoughtful observations about the weeks ahead, not fortune telling."
          >
            <Reveal effect="unfold">
              <OverviewCard className="px-8 py-7">
                <p className="text-label text-ink-primary">
                  What might happen next?
                </p>
                {/* Each observation is its own insight: a hanging semantic
                    marker + accent-toned label (the page's existing accent
                    families — growth green for likely, moments amber for
                    watch-for, futures violet for the unexpected), body text
                    aligned beneath. No dividers — the markers carry the
                    separation, so it reads as insights, not a document.
                    Calmer than the Future Paths cards on purpose: paths are
                    decisions, forecasts are observations. */}
                <div className="mt-5 flex flex-col gap-5">
                  {LANDING_FORECAST_TIMELINE.map((entry) => {
                    const marker = FORECAST_MARKERS[entry.kind];
                    return (
                      <div key={entry.text} className="flex gap-2.5">
                        <span
                          aria-hidden="true"
                          className="w-4 shrink-0 text-center text-[12px] leading-[16px]"
                          style={{ color: `var(${marker.accentVar})` }}
                        >
                          {marker.glyph}
                        </span>
                        <div className="min-w-0">
                          <p
                            className="text-label font-semibold"
                            style={{ color: `var(${marker.accentVar})` }}
                          >
                            {entry.window}
                          </p>
                          <p className="mt-1.5 text-[15px] leading-[1.65] text-ink-secondary">
                            {entry.text}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </OverviewCard>
            </Reveal>
          </StoryStep>

          <StoryStep
            label="Future Self"
            accentVar="--accent-self"
            note="One decision won't change who you are. The same decision, made a few times, will — Sibyl notices the person your choices are feeding."
          >
            <Reveal effect="bloom">
              <OverviewCard className="px-8 py-7">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <h4 className="font-voice text-[22px] font-medium leading-[1.3] text-ink-primary">
                    {LANDING_FUTURE_SELF.name}
                  </h4>
                  <span className="rounded-full bg-[var(--state-emerging)]/15 px-2.5 py-0.5 text-label font-semibold text-[var(--state-emerging)]">
                    Emerging
                  </span>
                </div>
                <p className="mt-1.5 text-[15px] leading-[1.7] text-ink-secondary">
                  {LANDING_FUTURE_SELF.line}
                </p>
                <div className="mt-4 border-t border-[#f0f0f0] pt-4">
                  <p className="text-label text-ink-tertiary">
                    Why this self is emerging
                  </p>
                  <p className="mt-1.5 text-[15px] leading-[1.7] text-ink-secondary">
                    {LANDING_FUTURE_SELF.whyEmerging}
                  </p>
                </div>
              </OverviewCard>
            </Reveal>
          </StoryStep>

          <StoryStep
            label="Workspace"
            accentVar="--accent-moments"
            note="A decision isn't the end of the story — Sibyl comes back to compare what you imagined with what actually happened."
          >
            <Reveal>
              <OverviewCard className="px-8 py-7">
                <p className="text-[13px] text-ink-tertiary">
                  {LANDING_WORKSPACE.intro}
                </p>
                <p className="mt-4 text-label text-[var(--accent-moments)]">
                  Check-in
                </p>
                <p className="mt-2 text-[17px] font-semibold text-ink-primary">
                  {LANDING_WORKSPACE.checkIn.title}
                </p>
                <p className="mt-1.5 text-[15px] leading-[1.65] text-ink-secondary">
                  {LANDING_WORKSPACE.checkIn.detail}
                </p>
              </OverviewCard>
              <p className="mt-5 max-w-[36em] text-[15px] leading-[1.7] text-ink-secondary">
                {LANDING_WORKSPACE.outro}
              </p>
            </Reveal>
          </StoryStep>
        </div>
      </div>
    </section>
  );
}

/* ── 3. Over time: the map a year of decisions draws ────────────────────── */

/** The one product beat the worked example can't show: accumulation. The
 *  self the story strengthened now leads a whole map of possibilities —
 *  the longitudinal payoff, not a re-explanation of any surface above. */
export function BecomingSection() {
  return (
    <section className="mx-auto w-full max-w-[880px]">
      <Reveal>
        <ChapterHeading
          label="Over time"
          title="One decision strengthened one future self. A year of decisions draws a map."
        />
        <p className="mt-3 max-w-[38em] text-[16px] leading-[1.7] text-ink-secondary">
          Every situation you work through feeds the same living picture — the
          futures your choices keep making more likely, and the ones quietly
          fading. This is where you watch yourself change.
        </p>
      </Reveal>
      <Reveal effect="bloom" className="mt-8">
        <OverviewCard className="px-6 py-8">
          <BranchMap
            futureSelves={LANDING_FUTURE_SELVES}
            interaction={{ kind: "link", href: "/signup" }}
            widthClassName="max-w-[880px]"
          />
          <p className="mt-6 text-center text-[13px] text-ink-tertiary">
            An illustration, not your data — your own map begins with a single
            &ldquo;You&rdquo; and grows from what you record.
          </p>
        </OverviewCard>
      </Reveal>
    </section>
  );
}

/* ── 4. Pricing ─────────────────────────────────────────────────────────── */

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
      "Full Sibyl experience",
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
      {/* The row's three sibling cards share one scroll trigger and arrive
          left to right — the page's one staggered moment. */}
      <Reveal effect="stagger" className="mt-8 grid gap-4 sm:grid-cols-3">
        {PRICING.map((plan) => (
          <OverviewCard
            key={plan.name}
            className={[
              "flex h-full flex-col px-8 py-7",
              plan.recommended ? "ring-1 ring-[var(--accent-futures)]/25" : "",
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
                  className="flex items-baseline gap-2.5 text-[15px] leading-[1.85] text-[#707070]"
                >
                  <span aria-hidden="true" className="text-[11px] text-[#c9c9d1]">
                    •
                  </span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </OverviewCard>
        ))}
      </Reveal>
      {/* Honesty over salesmanship: checkout doesn't exist yet, and saying
          so here costs nothing — discovering it after reading a price list
          is where trust would be lost. Same disclosure the Settings billing
          notice makes in-app. */}
      <p className="mt-4 text-[13px] leading-relaxed text-ink-tertiary">
        Checkout isn&apos;t open during the beta — every account has the full
        Sibyl experience free while these plans are finalized. Nothing is
        charged.
      </p>
    </section>
  );
}

/* ── 5. Final call to action ────────────────────────────────────────────── */

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
            Start Your Journey
          </Link>
          <Link href="/login" className={SECONDARY_BUTTON_CLASSES}>
            Sign In
          </Link>
        </div>
      </Reveal>
    </section>
  );
}
