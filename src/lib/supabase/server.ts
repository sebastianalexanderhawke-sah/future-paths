import { cache } from "react";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "@/types/database";

async function createUncachedClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Called from a Server Component where cookies cannot be set.
          }
        },
      },
    },
  );
}

/**
 * Request-scoped Supabase client.
 *
 * React's cache() memoizes per request, so every call site in one request
 * shares a single client instead of constructing one each time. On top of
 * that, auth.getUser() is memoized on the shared client: a page render that
 * previously validated the same JWT against Supabase Auth 5–8 times (layout,
 * page, and each lib helper's requireUser) now validates it exactly once.
 *
 * Security is unchanged: the memo lives inside one request (cookies — and
 * therefore the token — cannot change mid-request through this client's
 * read path), so the cached result can never leak across users or requests.
 * RLS is unaffected — every query still carries the caller's own token.
 * Explicit-JWT calls (auth.getUser(jwt)) bypass the memo. Outside a request
 * scope, cache() is a passthrough and behavior matches the uncached client.
 */
export const createClient = cache(async () => {
  const supabase = await createUncachedClient();
  const uncachedGetUser = supabase.auth.getUser.bind(supabase.auth);
  let memoizedUser: ReturnType<typeof uncachedGetUser> | null = null;

  supabase.auth.getUser = ((jwt?: string) => {
    if (jwt !== undefined) {
      return uncachedGetUser(jwt);
    }
    memoizedUser ??= uncachedGetUser();
    return memoizedUser;
  }) as typeof supabase.auth.getUser;

  return supabase;
});
