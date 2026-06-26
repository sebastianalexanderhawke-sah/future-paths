// TEMPORARY: local screenshot only — delete before commit
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const access_token = searchParams.get("access_token");
  const refresh_token = searchParams.get("refresh_token");
  if (!access_token || !refresh_token) return new NextResponse("missing tokens", { status: 400 });
  const response = NextResponse.redirect(new URL("/overview", request.url));
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { cookies: { getAll() { return []; }, setAll(s) { s.forEach(({ name, value, options }) => response.cookies.set(name, value, options)); } } });
  await supabase.auth.setSession({ access_token, refresh_token });
  return response;
}
