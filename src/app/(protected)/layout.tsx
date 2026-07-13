import { redirect } from "next/navigation";

import { AnalyticsIdentity } from "@/components/analytics/analytics-identity";
import { createClient } from "@/lib/supabase/server";

// Server Actions in this segment schedule post-response AI enrichment via
// after() (check-ins, path choices, reflection answers), and after() only runs
// for the route's configured max duration. The worst case is createCheckIn's
// chain: identity update + forecast regeneration + reflection evaluation +
// Current Self — four sequential generations, each hard-capped at 30s by
// IDENTITY_ENGINE_TIMEOUT_MS (the Future Selves stages are deterministic), so
// ~120s plus DB work. 180s covers that with headroom; without this, platform
// default limits (as low as 10–15s) silently kill the pipeline mid-run.
export const maxDuration = 180;

export default async function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <>
      <AnalyticsIdentity userId={user.id} />
      {children}
    </>
  );
}
