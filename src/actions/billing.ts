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

export async function startPremiumCheckout(): Promise<void> {
  redirect(BILLING_NOTICE_DESTINATION);
}

export async function buySituationTokens(): Promise<void> {
  redirect(BILLING_NOTICE_DESTINATION);
}

export async function manageSubscription(): Promise<void> {
  redirect(BILLING_NOTICE_DESTINATION);
}
