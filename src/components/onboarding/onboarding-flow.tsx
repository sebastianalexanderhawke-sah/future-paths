"use client";

import { useEffect, useRef, useState } from "react";

import { finishOnboardingAction } from "@/actions/onboarding";
import { trackEvent } from "@/lib/analytics/client";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import {
  SituationEntryFlow,
  type SituationEntryStage,
} from "@/components/home/situation-entry-flow";
import {
  ONBOARDING_STEP_COUNT,
  onboardingStep,
  type OnboardingPhase,
} from "@/components/onboarding/onboarding-journey";
import {
  ClosingPanel,
  FoundationsPanel,
  FutureSelvesPanel,
  WelcomePanel,
} from "@/components/onboarding/onboarding-panels";

/**
 * Launch Phase 2 onboarding: one real situation, followed end to end.
 *
 * Steps 2–5 are the live situation-entry flow — the same component the app
 * uses — locked to decision mode so every first run includes choosing a
 * Future Path and forecasting it. After the forecast (the first "wow"),
 * three short framing steps land the bigger picture: Future Selves, then
 * Current Self & Timeline, then the hand-over. This page only adds the
 * chrome (progress, a one-line caption per step, an always-available skip)
 * and the panels. Teaching happens by doing; nothing is explained before
 * the moment it appears.
 */
export function OnboardingFlow() {
  const [phase, setPhase] = useState<OnboardingPhase>("welcome");
  const [journeyStage, setJourneyStage] = useState<SituationEntryStage>("describe");
  const [momentId, setMomentId] = useState<string | null>(null);

  // Started = the flow reached the screen. Completed/skipped are captured
  // server-side by finishOnboardingAction (via the forms' outcome field),
  // where they can't be lost to the navigation that immediately follows.
  const startedFired = useRef(false);
  useEffect(() => {
    if (startedFired.current) return;
    startedFired.current = true;
    trackEvent(ANALYTICS_EVENTS.onboardingStarted);
  }, []);

  const step = onboardingStep(phase, journeyStage);

  return (
    <div className="min-h-screen bg-[#f4f4f6] text-[#111]">
      <div className="mx-auto flex min-h-screen w-full max-w-[1120px] flex-col px-6 py-8 sm:px-10">
        {/* Chrome: what this is, how far along, and the always-present exit.
            Same instrument panel as the walkthrough, so "guided" looks the
            same everywhere in the product. */}
        <header>
          <div className="flex items-center justify-between gap-4">
            <p className="text-label text-ink-tertiary">Getting started</p>
            <form action={finishOnboardingAction}>
              <input type="hidden" name="next" value="/overview" />
              <input type="hidden" name="outcome" value="skipped" />
              <button
                type="submit"
                className="cursor-pointer text-[13px] font-medium text-[#999999] transition-colors duration-150 hover:text-[#111]"
              >
                Skip for now
              </button>
            </form>
          </div>
          <div className="mt-4 flex items-center gap-4">
            <div
              className="h-1 flex-1 overflow-hidden rounded-full bg-[var(--action-soft-fill)]"
              role="progressbar"
              aria-valuemin={1}
              aria-valuemax={ONBOARDING_STEP_COUNT}
              aria-valuenow={step.number}
              aria-label="Onboarding progress"
            >
              <div
                className="h-full rounded-full bg-[var(--accent-system)] transition-[width] duration-300"
                style={{ width: `${(step.number / ONBOARDING_STEP_COUNT) * 100}%` }}
              />
            </div>
            <p className="shrink-0 text-[13px] font-medium text-[#888888]">
              Step {step.number} of {ONBOARDING_STEP_COUNT}
            </p>
          </div>
          {step.caption ? (
            <p className="mt-3 text-[13px] leading-relaxed text-[#999999]">
              {step.caption}
            </p>
          ) : null}
        </header>

        <main className="flex flex-1 flex-col py-10">
          {phase === "welcome" ? (
            <div className="mx-auto w-full max-w-[720px]">
              <WelcomePanel onBegin={() => setPhase("journey")} />
            </div>
          ) : null}

          {/* The journey stays mounted across its four stages — the flow owns
              its own stage state, streaming previews, and error recovery. */}
          {phase === "journey" ? (
            <SituationEntryFlow
              fixedGoal="decision"
              onStageChange={setJourneyStage}
              onComplete={(id) => {
                setMomentId(id);
                setPhase("future-selves");
              }}
              completeLabel="See where this leads →"
            />
          ) : null}

          {phase === "future-selves" ? (
            <div className="mx-auto w-full max-w-[960px]">
              <FutureSelvesPanel onContinue={() => setPhase("foundations")} />
            </div>
          ) : null}

          {phase === "foundations" ? (
            <div className="mx-auto w-full max-w-[840px]">
              <FoundationsPanel onContinue={() => setPhase("closing")} />
            </div>
          ) : null}

          {phase === "closing" ? (
            <div className="mx-auto w-full max-w-[840px]">
              <ClosingPanel momentId={momentId} />
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
}
