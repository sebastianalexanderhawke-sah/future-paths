/**
 * Cross-site request guard for the hand-rolled streaming API routes.
 *
 * Server Actions get Next.js's built-in Origin check for free; plain route
 * handlers do not. These routes authenticate via cookies and take side effects
 * (creating situations, consuming AI quota), so a cross-site POST from a page
 * the victim is logged into could drive junk work on their account and burn
 * their AI budget. Supabase's default SameSite=Lax cookies already blunt this,
 * but that is an implicit default the app never sets — this makes the
 * protection explicit and independent of cookie configuration.
 *
 * Decision order:
 *   1. Sec-Fetch-Site (sent by all modern browsers, not forgeable by page JS):
 *      allow only same-origin or a direct navigation ("none").
 *   2. Fallback for the rare client that omits it: compare the Origin host to
 *      the request Host. A missing Origin is treated as a same-origin / non-
 *      browser call (browsers always send Origin on cross-origin POST).
 */
export function isSameOriginRequest(request: Request): boolean {
  const secFetchSite = request.headers.get("sec-fetch-site");
  if (secFetchSite) {
    return secFetchSite === "same-origin" || secFetchSite === "none";
  }

  const origin = request.headers.get("origin");
  if (!origin) {
    return true;
  }

  try {
    const originHost = new URL(origin).host;
    const host =
      request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    return Boolean(host) && originHost === host;
  } catch {
    return false;
  }
}

/**
 * Standard 403 for a rejected cross-site request. Shared so all routes answer
 * identically.
 */
export function crossOriginRejection(): Response {
  return Response.json(
    { error: "Cross-origin requests are not allowed." },
    { status: 403 },
  );
}
