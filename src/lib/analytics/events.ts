/**
 * The product's complete analytics vocabulary — every event PostHog can
 * receive is declared here and nowhere else. Capture sites import from this
 * catalog, so a grep for any constant finds every place it fires, and a
 * dashboard can be built against names that are guaranteed stable.
 *
 * Deliberately small: meaningful product moments only. No button clicks, no
 * scrolling, no autocapture (both are disabled at init) — an event earns a
 * place here when a chart of it would change a product decision.
 *
 * Privacy: event properties carry ids and coarse flags only — never titles,
 * reflections, answers, or any other user-written content.
 */
export const ANALYTICS_EVENTS = {
  // Onboarding (/welcome)
  onboardingStarted: "onboarding_started",
  onboardingCompleted: "onboarding_completed",
  onboardingSkipped: "onboarding_skipped",

  // Situations
  situationCreated: "situation_created",
  futurePathChosen: "future_path_chosen",
  futureForecastGenerated: "future_forecast_generated",
  futureForecastViewed: "future_forecast_viewed",
  // Emerging Situations: a high-confidence "new story" suggestion was stored
  // for a situation / the user chose "Dismiss". Acceptance shows up as a
  // regular situation_created from the prefilled flow.
  emergingSituationSuggested: "emerging_situation_suggested",
  emergingSituationDismissed: "emerging_situation_dismissed",

  // Future Selves
  futureSelvesViewed: "future_selves_viewed",
  futureSelfExpanded: "future_self_expanded",

  // Timeline
  timelineViewed: "timeline_viewed",
  timelineChapterOpened: "timeline_chapter_opened",

  // Workspace
  reflectionStarted: "reflection_started",
  reflectionSaved: "reflection_saved",
  checkInCompleted: "check_in_completed",

  // Overview
  overviewViewed: "overview_viewed",

  // Premium & tokens. The *Purchased events are wired into the billing
  // actions' success paths — which don't exist until checkout launches (see
  // src/actions/billing.ts). Declared now so dashboards and funnels can be
  // built against their final names.
  premiumViewed: "premium_viewed",
  premiumPurchased: "premium_purchased",
  tokensPurchased: "tokens_purchased",

  // General auth
  signUp: "sign_up",
  signIn: "sign_in",
  signOut: "sign_out",
} as const;

export type AnalyticsEvent =
  (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

export type AnalyticsProperties = Record<
  string,
  string | number | boolean | null
>;
