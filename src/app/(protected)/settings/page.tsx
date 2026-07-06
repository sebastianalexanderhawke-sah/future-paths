import Link from "next/link";

import packageJson from "../../../../package.json";

import {
  DisplayNameForm,
  EmailChangeForm,
  PasswordChangeForm,
} from "@/components/settings/account-controls";
import { AppSidebar } from "@/components/overview/app-sidebar";
import { OverviewCard } from "@/components/overview/overview-card";
import { getUnansweredReflectionSummary } from "@/lib/reflections";
import { createClient } from "@/lib/supabase/server";
import { getUserIdentity } from "@/lib/user-identity";

// Honesty rule for this page: nothing renders as a control unless it works.
// Every form below performs a real action against the existing stack;
// capabilities that don't exist yet (export, deletion, notifications) are
// stated as plain text, so no toggle, button, or picker ever silently does
// nothing.

export default async function SettingsPage() {
  const supabase = await createClient();
  const [
    userIdentity,
    reflectionSummaryResult,
    {
      data: { user },
    },
  ] = await Promise.all([
    getUserIdentity(),
    getUnansweredReflectionSummary(),
    supabase.auth.getUser(),
  ]);

  const reflectionSummary =
    "pending" in reflectionSummaryResult ? reflectionSummaryResult : null;
  const email = user?.email ?? "—";

  return (
    <div className="flex h-screen overflow-hidden bg-[#f4f4f6] text-[#111]">
      <AppSidebar
        activeHref="/settings"
        unansweredReflections={reflectionSummary?.unansweredCount ?? 0}
        userLabel={userIdentity.displayName ?? "Your account"}
        userInitial={userIdentity.initial}
      />

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1120px] px-10 py-10">
          {/* Page header */}
          <div className="mb-10">
            <h1 className="mb-1.5 text-[32px] font-extrabold tracking-[-0.8px] text-[#111]">
              Settings
            </h1>
            <p className="text-[15px] text-[#999999]">
              Your account and how your data is used.
            </p>
          </div>

          <div className="flex flex-col gap-5 pb-14">
            {/* Account */}
            <OverviewCard className="px-9 py-7">
              <div className="mb-6">
                <h2 className="text-[17px] font-bold text-[#111]">Account</h2>
                <p className="mt-[3px] text-[13px] text-[#888888]">
                  Who you are here
                </p>
              </div>

              <div className="flex items-center gap-4">
                <span
                  aria-hidden="true"
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-[20px] font-semibold text-white"
                  style={{
                    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                  }}
                >
                  {userIdentity.initial}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[15px] font-semibold text-[#111]">
                    {userIdentity.displayName ?? "Your account"}
                  </span>
                  <span className="block truncate text-[13px] text-[#999999]">
                    {email}
                  </span>
                </span>
              </div>

              <div className="mt-6 max-w-[36rem]">
                <DisplayNameForm currentName={userIdentity.displayName} />
                <EmailChangeForm currentEmail={email} />
                <PasswordChangeForm />
              </div>
            </OverviewCard>

            {/* Privacy & Data */}
            <OverviewCard className="px-9 py-7">
              <div className="mb-4">
                <h2 className="text-[17px] font-bold text-[#111]">
                  Privacy &amp; Data
                </h2>
              </div>

              <p className="max-w-[52em] text-[14px] leading-[1.7] text-[#777777]">
                Your Current Self and Future Selves are generated only from the
                situations, check-ins, and reflections you record.
              </p>
              <p className="mt-2 max-w-[52em] text-[14px] leading-[1.7] text-[#777777]">
                We never invent experiences that are not part of your history,
                and your entries are never shared. The full picture — what is
                stored, what the AI processes, and how to have everything
                deleted — is in the{" "}
                <Link
                  href="/privacy"
                  className="text-[#111] underline underline-offset-4"
                >
                  Privacy Policy
                </Link>{" "}
                and{" "}
                <Link
                  href="/terms"
                  className="text-[#111] underline underline-offset-4"
                >
                  Terms of Use
                </Link>
                .
              </p>
              <p className="mt-2 max-w-[52em] text-[14px] leading-[1.7] text-[#777777]">
                Want your account and everything in it deleted during the beta?
                Reply to your beta invite email and we&apos;ll take care of it,
                usually within a few days.
              </p>
            </OverviewCard>

            {/* During the beta — honest expectation-setting, no dead controls. */}
            <OverviewCard className="px-9 py-7">
              <div className="mb-4">
                <h2 className="text-[17px] font-bold text-[#111]">
                  During the beta
                </h2>
              </div>

              <p className="max-w-[52em] text-[14px] leading-[1.7] text-[#777777]">
                A few account tools aren&apos;t in the app yet: exporting your
                data, deleting your account yourself, and notification
                preferences. They&apos;re planned — until they ship, nothing
                here will pretend to do them, and deletion is always available
                by request above.
              </p>
            </OverviewCard>

            {/* About */}
            <OverviewCard className="px-9 py-7">
              <div className="mb-4">
                <h2 className="text-[17px] font-bold text-[#111]">About</h2>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-[14px] font-medium text-[#111]">
                  Application version
                </span>
                <span className="text-[13px] text-[#999999]">
                  {packageJson.version}
                </span>
              </div>
            </OverviewCard>
          </div>
        </div>
      </main>
    </div>
  );
}
