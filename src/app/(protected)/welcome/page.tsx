import type { Metadata } from "next";

import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";

export const metadata: Metadata = {
  title: "Welcome — Reflection",
};

/**
 * First-run onboarding: one real situation followed from first words to a
 * forecast, then a closing step showing what it feeds. Sign-up and first
 * sign-in land here (see actions/auth.ts); finishing or skipping records
 * onboarding_completed_at so no one is routed back. The page itself stays
 * reachable at /welcome for anyone who wants the guided start again —
 * everything it creates is real data, entered by the user.
 */
export default function WelcomePage() {
  return <OnboardingFlow />;
}
