import { PostHog } from "posthog-node";

import type { AnalyticsEvent, AnalyticsProperties } from "@/lib/analytics/events";
import { reportError } from "@/lib/observability";

/**
 * Server side of the analytics service: events that mark durable state
 * changes (a situation created, a check-in committed, an account signed in)
 * are captured where the write happens, so they can't be lost to a closed
 * tab or a dropped connection.
 *
 * Same contract as the client half and the observability module: a missing
 * key makes every call a no-op, and nothing here ever throws — a telemetry
 * failure must never fail a user request. Each capture is flushed
 * immediately (flushAt: 1) and awaited with a short request timeout, so
 * events survive serverless instances freezing after the response.
 */

const CAPTURE_TIMEOUT_MS = 3_000;

let client: PostHog | null | undefined;

function getClient(): PostHog | null {
  if (client !== undefined) {
    return client;
  }

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) {
    client = null;
    return client;
  }

  client = new PostHog(key, {
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
    flushAt: 1,
    flushInterval: 0,
    requestTimeout: CAPTURE_TIMEOUT_MS,
  });
  return client;
}

/**
 * Capture one catalog event for a known user. `distinctId` is always the
 * Supabase user id; properties carry ids and coarse flags only — never
 * user-written content (titles, reflections, answers).
 */
export async function captureServerEvent(
  distinctId: string,
  event: AnalyticsEvent,
  properties?: AnalyticsProperties,
): Promise<void> {
  try {
    const posthog = getClient();
    if (!posthog) {
      return;
    }

    posthog.capture({ distinctId, event, ...(properties ? { properties } : {}) });
    await posthog.flush();
  } catch (error) {
    // Telemetry is best-effort by contract; the product outcome already
    // happened and must never be failed by analytics. But best-effort must
    // not mean invisible (the observability module's founding rule) — a
    // silently dead pipeline looks identical to a healthy one.
    await reportError("analytics: server capture failed", error, { event });
  }
}
