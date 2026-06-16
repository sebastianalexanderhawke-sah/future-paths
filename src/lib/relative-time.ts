const SECOND_MS = 1000;
const MINUTE_MS = 60 * SECOND_MS;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export const CHECK_IN_STALE_DAYS = 3;

/**
 * Returns a human-readable relative time string for a past date,
 * e.g. "today", "1 day ago", "5 days ago", "2 weeks ago".
 */
export function formatRelativeTime(dateStr: string, now = new Date()): string {
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();

  if (diffMs < DAY_MS) return "today";
  if (diffMs < 2 * DAY_MS) return "1 day ago";
  if (diffMs < 7 * DAY_MS) return `${Math.floor(diffMs / DAY_MS)} days ago`;
  if (diffMs < 14 * DAY_MS) return "1 week ago";
  if (diffMs < 4 * 7 * DAY_MS)
    return `${Math.floor(diffMs / (7 * DAY_MS))} weeks ago`;
  if (diffMs < 60 * DAY_MS) return "1 month ago";
  return `${Math.floor(diffMs / (30 * DAY_MS))} months ago`;
}

/**
 * Returns true when a situation needs a check-in:
 * either no check-in has ever been made, or the last one was more than
 * CHECK_IN_STALE_DAYS days ago.
 */
export function isCheckInStale(
  lastCheckInDate: string | null | undefined,
  now = new Date(),
): boolean {
  if (!lastCheckInDate) return true;
  const diffMs = now.getTime() - new Date(lastCheckInDate).getTime();
  return diffMs > CHECK_IN_STALE_DAYS * DAY_MS;
}
