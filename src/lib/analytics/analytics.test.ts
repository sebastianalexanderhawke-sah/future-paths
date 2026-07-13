import { describe, expect, it } from "vitest";

import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { captureServerEvent } from "@/lib/analytics/server";
import {
  identifyUser,
  isFeatureEnabled,
  resetAnalyticsIdentity,
  trackEvent,
} from "@/lib/analytics/client";

// The analytics service's core contract: a curated, stable event vocabulary,
// and helpers that are safe to call from anywhere — configured or not,
// browser or not — because telemetry must never break the product.

describe("analytics event catalog", () => {
  const names = Object.values(ANALYTICS_EVENTS);

  it("keeps every event name unique", () => {
    expect(new Set(names).size).toBe(names.length);
  });

  it("uses stable snake_case names throughout", () => {
    for (const name of names) {
      expect(name).toMatch(/^[a-z]+(_[a-z]+)*$/);
    }
  });

  it("covers the launch tracking plan end to end", () => {
    for (const required of [
      "onboarding_started",
      "onboarding_completed",
      "onboarding_skipped",
      "situation_created",
      "future_path_chosen",
      "future_forecast_generated",
      "future_forecast_viewed",
      "future_selves_viewed",
      "future_self_expanded",
      "timeline_viewed",
      "timeline_chapter_opened",
      "reflection_started",
      "reflection_saved",
      "check_in_completed",
      "overview_viewed",
      "premium_viewed",
      "premium_purchased",
      "tokens_purchased",
      "sign_up",
      "sign_in",
      "sign_out",
    ]) {
      expect(names).toContain(required);
    }
  });
});

describe("captureServerEvent without configuration", () => {
  it("resolves silently when no PostHog key is set", async () => {
    // Vitest runs without NEXT_PUBLIC_POSTHOG_KEY; a capture must be a
    // no-op that neither throws nor rejects.
    await expect(
      captureServerEvent("user-1", ANALYTICS_EVENTS.signIn, { source: "test" }),
    ).resolves.toBeUndefined();
  });
});

describe("client helpers outside a browser", () => {
  it("no-op without throwing in a server/test environment", () => {
    expect(() => {
      trackEvent(ANALYTICS_EVENTS.overviewViewed);
      identifyUser("user-1");
      resetAnalyticsIdentity();
    }).not.toThrow();
    expect(isFeatureEnabled("any-flag")).toBe(false);
  });
});
