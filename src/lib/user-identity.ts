import { createClient } from "@/lib/supabase/server";

/**
 * Sidebar identity for the app shell. Display name only — never derived
 * from the email username: profile row first, then auth metadata; null
 * means greet without a name.
 */
export async function getUserIdentity(): Promise<{
  displayName: string | null;
  initial: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let displayName: string | null = null;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle();

    const metadataName = user.user_metadata?.display_name;
    displayName =
      profile?.display_name?.trim() ||
      (typeof metadataName === "string" ? metadataName.trim() : "") ||
      null;
  }

  const initial = (displayName ?? user?.email ?? "?").charAt(0).toUpperCase();
  return { displayName, initial };
}
