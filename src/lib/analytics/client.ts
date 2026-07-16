import posthog from "posthog-js";

import type { AnalyticsEvent, AnalyticsProperties } from "@/lib/analytics/events";

/**
 * Browser side of the analytics service. Initialized once from
 * src/instrumentation-client.ts; every helper is a guarded no-op when the
 * key is absent (local dev, tests) or when running outside a browser, and
 * none of them can throw — analytics must never break the product.
 *
 * Philosophy: PostHog's automatic collection is switched OFF (autocapture,
 * pageviews, session recording). Only the events in
 * src/lib/analytics/events.ts are ever sent, each from an explicit call
 * site. Session replay and feature flags are prepared for, not enabled:
 * flip `disable_session_recording` below when replay is wanted, and read
 * flags through isFeatureEnabled().
 */

let initialized = false;

export function initAnalyticsClient(): void {
  if (initialized || typeof window === "undefined") {
    return;
  }

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;

  if (!key) {
    return;
  }

  try {
    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
      // Only the curated catalog, from explicit call sites.
      autocapture: false,
      capture_pageview: false,
      capture_pageleave: false,
      // Replay-ready but off: reflections are personal writing, so recording
      // stays a deliberate future decision, not a default.
      disable_session_recording: true,
      persistence: "localStorage+cookie",
    });
    initialized = true;
  } catch {
    // A broken analytics bootstrap must never take the app down with it.
  }
}

function isReady(): boolean {
  return initialized && typeof window !== "undefined";
}

/** Capture one catalog event. Safe to call anywhere, anytime. */
export function trackEvent(
  event: AnalyticsEvent,
  properties?: AnalyticsProperties,
): void {
  if (!isReady()) return;
  try {
    posthog.capture(event, properties);
  } catch {
    // Never let telemetry surface as a product error.
  }
}

/**
 * Ties this browser's events to the signed-in account. The distinct id is
 * the Supabase user id — never the email or display name, matching the
 * product's privacy patterns.
 */
export function identifyUser(userId: string): void {
  if (!isReady()) return;
  try {
    if (posthog.get_distinct_id() !== userId) {
      posthog.identify(userId);
    }
  } catch {
    // Never let telemetry surface as a product error.
  }
}

/** Clears the identity on sign-out so the next session starts anonymous. */
export function resetAnalyticsIdentity(): void {
  if (!isReady()) return;
  try {
    posthog.reset();
  } catch {
    // Never let telemetry surface as a product error.
  }
}

/**
 * Feature-flag read, ready for when flags are configured in PostHog.
 * Defaults to false whenever analytics is off or the flag is unknown.
 */
export function isFeatureEnabled(flag: string): boolean {
  if (!isReady()) return false;
  try {
    return posthog.isFeatureEnabled(flag) === true;
  } catch {
    return false;
  }
}
