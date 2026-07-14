import type { CurrentFutureRendering } from "@/lib/forecast-simplification-experiment";

/**
 * Fixtures for the public landing page. They continue the walkthrough's
 * demonstration scenario ("Should I move to another city?" — see
 * walkthrough-content.ts) so a visitor meets the exact story the in-app
 * walkthrough later teaches. Everything here is openly illustrative:
 * never persisted, never mixed with user data.
 */

/** Forecasts v3 structured cards (actions present selects the structured
 *  layout — see forecast-simplification-cards.tsx). Bullets follow the
 *  product's events-not-emotions rule. */
export const LANDING_FORECAST_OPPORTUNITY: CurrentFutureRendering = {
  title: "The city becomes yours",
  timeframe: "months",
  signals: [],
  whyItMightHappen:
    "Your entries show restlessness turning into direction whenever you choose motion over waiting.",
  futureImpact:
    "A weekly routine forms that you built on purpose instead of inherited.\nYour sister's first visit turns the new apartment into a place that holds family too.",
  actions: [
    "Accept one standing weekly invitation in your first month",
    "Book the first visit home before the boxes are unpacked",
  ],
};

export const LANDING_FORECAST_RISK: CurrentFutureRendering = {
  title: "The distance becomes drift",
  timeframe: "months",
  signals: [],
  whyItMightHappen:
    "Long-distance closeness has depended on routines that the move removes all at once.",
  futureImpact:
    "Sunday dinner becomes a group chat that goes quiet by spring.\nWork expands to fill the evenings friendship used to hold.",
  actions: [
    "Put a monthly call with your sister on the calendar before you leave",
    "Treat the first lonely Sunday as a check-in, not a verdict",
  ],
};
