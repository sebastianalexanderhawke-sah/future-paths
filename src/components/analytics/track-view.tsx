"use client";

import { useEffect, useRef } from "react";

import { trackEvent } from "@/lib/analytics/client";
import type { AnalyticsEvent, AnalyticsProperties } from "@/lib/analytics/events";

type TrackViewProps = {
  event: AnalyticsEvent;
  properties?: AnalyticsProperties;
};

/**
 * Fires one "viewed" event when the surface it sits on actually reaches the
 * user's screen — mounted by the handful of pages and sections whose views
 * the catalog tracks. Renders nothing; fires at most once per mount.
 */
export function TrackView({ event, properties }: TrackViewProps) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    trackEvent(event, properties);
    // Intentionally mount-only: a re-render with new props is still the same
    // view of the same surface.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
