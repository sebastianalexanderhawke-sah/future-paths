"use server";

import { redirect } from "next/navigation";

// Billing wiring points. No payment provider is integrated yet, so each
// action responds honestly: back to Settings with a notice instead of
// pretending to charge. When checkout launches, these bodies become the
// real session-creation calls (entitlements land in auth app_metadata via
// webhook — see src/lib/plan.ts) and the redirect targets become the
// provider's hosted pages. Keeping them as server actions now means the
// Settings buttons are real controls with a truthful response, per the
// Settings page honesty rule.

const BILLING_NOTICE_DESTINATION = "/settings?billing=unavailable#premium";

// Analytics: premium_viewed already fires from the Settings card. The
// purchase events are declared in the catalog (ANALYTICS_EVENTS.premiumPurchased,
// ANALYTICS_EVENTS.tokensPurchased) but deliberately NOT captured here — no
// purchase happens yet, and a funnel must never contain phantom conversions.
// When checkout launches, capture them via captureServerEvent in the payment
// provider's success webhook (the same place entitlements land in
// app_metadata), not in these redirect-to-provider actions.

export async function startPremiumCheckout(): Promise<void> {
  redirect(BILLING_NOTICE_DESTINATION);
}

export async function buySituationTokens(): Promise<void> {
  redirect(BILLING_NOTICE_DESTINATION);
}

export async function manageSubscription(): Promise<void> {
  redirect(BILLING_NOTICE_DESTINATION);
}
