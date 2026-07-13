"use client";

import { resetAnalyticsIdentity } from "@/lib/analytics/client";

type SignOutFormProps = {
  /** The signOut server action, passed down from the server component. */
  action: () => Promise<void>;
  children: React.ReactNode;
};

/**
 * The sidebar's sign-out form, with one client-side addition: the analytics
 * identity is cleared as the form submits, so the next person on this
 * browser starts anonymous. The server action still owns the actual
 * sign-out (and captures the sign_out event durably).
 */
export function SignOutForm({ action, children }: SignOutFormProps) {
  return (
    <form action={action} onSubmit={() => resetAnalyticsIdentity()}>
      {children}
    </form>
  );
}
