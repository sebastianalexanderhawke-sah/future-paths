"use client";

import { useEffect } from "react";

import { identifyUser } from "@/lib/analytics/client";

/**
 * Rendered by the protected layout: ties this browser's analytics to the
 * signed-in account (Supabase user id only — never email or name). Renders
 * nothing. identifyUser is itself idempotent, so remounts are free.
 */
export function AnalyticsIdentity({ userId }: { userId: string }) {
  useEffect(() => {
    identifyUser(userId);
  }, [userId]);

  return null;
}
