import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "@/types/database";

function redirectWithCookies(
  url: URL,
  supabaseResponse: NextResponse,
) {
  const redirectResponse = NextResponse.redirect(url);

  supabaseResponse.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie);
  });

  return redirectResponse;
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          supabaseResponse = NextResponse.next({ request });

          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (user && (pathname === "/login" || pathname === "/signup")) {
    return redirectWithCookies(new URL("/overview", request.url), supabaseResponse);
  }

  // Fail closed: every route requires a session UNLESS it is explicitly public.
  // This replaces a hand-maintained list of protected prefixes (which had
  // already fallen out of date — /settings, /reflections, /welcome were
  // missing) so a newly added authenticated route is protected by default
  // rather than only if someone remembers to list it here. The `(protected)`
  // layout's own getUser() check remains the authoritative gate; this is the
  // edge-level defense-in-depth in front of it.
  if (!user && !isPublicPath(pathname)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    return redirectWithCookies(loginUrl, supabaseResponse);
  }

  return supabaseResponse;
}

// The complete public surface: the marketing landing page, the auth screens,
// the legal pages, and the /auth/* callback (which runs before a session
// exists). Everything else requires a signed-in user.
const PUBLIC_PATHS = new Set([
  "/",
  "/login",
  "/signup",
  "/forgot-password",
  "/update-password",
  "/privacy",
  "/terms",
]);

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.has(pathname) || pathname.startsWith("/auth/");
}
