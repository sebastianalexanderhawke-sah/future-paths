import type { SituationEntryStage } from "@/components/home/situation-entry-flow";

/**
 * The onboarding journey: one real situation followed from first words to a
 * forecast, then three short framing steps — Future Selves (the long-term
 * vision), Current Self & Timeline (the understanding that sharpens), and
 * the hand-over into the app. Eight steps, under three minutes.
 *
 * Steps 2–5 ARE the live situation-entry flow — onboarding teaches by
 * having the user actually do the thing, so this model only maps the flow's
 * own stages onto chrome (step number + one whispered caption). Features
 * are never explained before the moment they appear.
 */
export type OnboardingPhase =
  | "welcome"
  | "journey"
  | "future-selves"
  | "foundations"
  | "closing";

export const ONBOARDING_STEP_COUNT = 8;

export type OnboardingStep = {
  /** 1-based position for the progress bar. */
  number: number;
  /**
   * One short line under the progress bar introducing what the user is
   * looking at — the only teaching copy the chrome adds. Null when the
   * step's own panel carries the framing.
   */
  caption: string | null;
};

export function onboardingStep(
  phase: OnboardingPhase,
  journeyStage: SituationEntryStage,
): OnboardingStep {
  switch (phase) {
    case "welcome":
      return { number: 1, caption: null };
    case "future-selves":
      return { number: 6, caption: null };
    case "foundations":
      return { number: 7, caption: null };
    case "closing":
      return { number: 8, caption: null };
    case "journey":
      break;
  }

  switch (journeyStage) {
    case "describe":
      return {
        number: 2,
        caption: "Start with something real — a decision you're weighing right now.",
      };
    case "questions":
      return {
        number: 3,
        caption: "Reflection reads what you wrote and asks only what it needs to understand.",
      };
    case "paths":
      return {
        number: 4,
        caption:
          "Each option is a Future Path — a different life a year from now. Choose the one you'd actually take.",
      };
    case "forecast":
      return {
        number: 5,
        caption:
          "Your first Future Forecast — possible futures drawn from your real situation. A different path would have produced different ones.",
      };
  }
}
