import { cookies } from "next/headers";

// Marks that a forecast was just generated for a moment, on this same visit,
// so the moment page can hold off on showing the check-in form. Implemented
// as a short-lived, path-scoped cookie (rather than a query param) so the
// signal survives redirects and client-side navigation reliably.
const COOKIE_PREFIX = "ff-just-generated-";
const MAX_AGE_SECONDS = 600;

export async function markForecastJustGenerated(momentId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(`${COOKIE_PREFIX}${momentId}`, "1", {
    maxAge: MAX_AGE_SECONDS,
    path: `/moments/${momentId}`,
    httpOnly: true,
    sameSite: "lax",
  });
}

export async function wasForecastJustGenerated(momentId: string): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get(`${COOKIE_PREFIX}${momentId}`)?.value === "1";
}
