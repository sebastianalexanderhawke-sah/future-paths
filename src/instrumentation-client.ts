import { initAnalyticsClient } from "@/lib/analytics/client";

// Runs once per page load, after the document loads and before hydration —
// the Next-supported place to bootstrap client analytics. All capturing is
// explicit (see src/lib/analytics/events.ts); nothing fires from here.
initAnalyticsClient();
