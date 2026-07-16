import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

// Only allow same-site relative paths as the post-auth destination. `origin`
// prefixing already prevents leaving the domain, but validating here matches
// the guard signIn uses (safeRedirectPath) and blocks path/param tampering.
function safeNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/overview";
  }
  return value;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
