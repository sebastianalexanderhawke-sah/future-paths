import Link from "next/link";
import { redirect } from "next/navigation";

import { UpdatePasswordForm } from "@/components/auth/update-password-form";
import { createClient } from "@/lib/supabase/server";

// Landing page for the password-recovery email link: the auth callback has
// already exchanged the recovery code for a session, so an unauthenticated
// visitor here means the link expired or was already used.
export default async function UpdatePasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?error=recovery_link_expired");
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 py-16">
      <div className="flex w-full max-w-sm flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-700">
            Future Paths
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Choose a new password
          </h1>
          <p className="text-sm text-zinc-600">
            You&rsquo;re signed in — set a new password to finish.
          </p>
        </div>

        <UpdatePasswordForm />
      </div>
    </div>
  );
}
