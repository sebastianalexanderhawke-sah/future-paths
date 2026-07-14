import Link from "next/link";

import packageJson from "../../../../package.json";

import { signOut } from "@/actions/auth";
import {
  DisplayNameForm,
  EmailChangeForm,
  PasswordChangeForm,
} from "@/components/settings/account-controls";
import { AppearanceControl } from "@/components/settings/appearance-control";
import { PremiumSection } from "@/components/settings/premium-section";
import { ReflectionActivityCard } from "@/components/settings/reflection-activity";
import { AppSidebar } from "@/components/overview/app-sidebar";
import { OverviewCard } from "@/components/overview/overview-card";
import { Button } from "@/components/ui/button";
import { getPlanStatus } from "@/lib/plan";
import { getEngagementActivity } from "@/lib/recent-activity";
import { getUnansweredReflectionSummary } from "@/lib/reflections";
import { createClient } from "@/lib/supabase/server";
import { getUserIdentity } from "@/lib/user-identity";

// Honesty rule for this page: nothing renders as a control unless it works.
// Every form below performs a real action against the existing stack;
// capabilities that don't exist yet (export, deletion, notifications) are
// stated as plain text, so no toggle, button, or picker ever silently does
// nothing.

type SettingsPageProps = {
  searchParams: Promise<{ billing?: string }>;
};

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const supabase = await createClient();
  const [
    userIdentity,
    reflectionSummaryResult,
    planStatus,
    { billing },
    {
      data: { user },
    },
    engagementActivity,
  ] = await Promise.all([
    getUserIdentity(),
    getUnansweredReflectionSummary(),
    getPlanStatus(),
    searchParams,
    supabase.auth.getUser(),
    // Overview Phase 2: the activity summary lives here now — product usage
    // and personal statistics belong with the profile.
    getEngagementActivity(),
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
              Your account, your experience, and how Reflection works.
            </p>
          </div>

          <div className="flex flex-col gap-5 pb-14">
            {/* Account — who you are here */}
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
              </div>
            </OverviewCard>

            {/* Reflection Premium — the account's plan and usage */}
            <PremiumSection
              plan={planStatus}
              showBillingNotice={billing === "unavailable"}
            />

            {/* Security — how you get in */}
            <OverviewCard className="px-9 py-7">
              <div className="mb-4">
                <h2 className="text-[17px] font-bold text-[#111]">Security</h2>
                <p className="mt-[3px] text-[13px] text-[#888888]">
                  How you sign in
                </p>
              </div>

              <div className="max-w-[36rem]">
                <PasswordChangeForm />

                <div className="flex items-center justify-between gap-4 border-t border-[#f0f0f0] py-3.5">
                  <div>
                    <p className="text-[14px] font-medium text-[#111]">
                      Sign out
                    </p>
                    <p className="mt-1 text-[13px] leading-[1.6] text-[#999999]">
                      Ends your session on this device.
                    </p>
                  </div>
                  <form action={signOut}>
                    <button
                      type="submit"
                      className="shrink-0 cursor-pointer rounded-lg border border-[#e5e5e5] bg-white px-4 py-2 text-[13px] font-medium text-[#333333] transition-colors hover:border-[#111] hover:text-[#111]"
                    >
                      Sign out
                    </button>
                  </form>
                </div>
              </div>
            </OverviewCard>

            {/* Appearance — the one experience setting that exists */}
            <OverviewCard className="px-9 py-7">
              <div className="mb-5">
                <h2 className="text-[17px] font-bold text-[#111]">Appearance</h2>
                <p className="mt-[3px] text-[13px] text-[#888888]">
                  How Reflection looks on this device
                </p>
              </div>

              <div className="max-w-[36rem]">
                <AppearanceControl />
                <p className="mt-3 text-[13px] leading-[1.6] text-[#999999]">
                  System follows your operating system&apos;s preference. Your
                  choice is remembered between sessions.
                </p>
              </div>
            </OverviewCard>

            {/* Interactive Walkthrough — the primary way to learn the product */}
            <OverviewCard className="px-9 py-7">
              <div className="mb-4">
                <h2 className="text-[17px] font-bold text-[#111]">
                  Interactive Walkthrough
                </h2>
                <p className="mt-[3px] text-[13px] text-[#888888]">
                  Learn by doing, not by reading
                </p>
              </div>

              <p className="max-w-[52em] text-[14px] leading-[1.7] text-[#777777]">
                Learn how Reflection works from beginning to end by following
                one example situation — from writing it down to watching it
                become part of a Timeline. It uses demonstration content only
                and never touches your own situations.
              </p>
              <div className="mt-5 flex items-center gap-5">
                <Button href="/settings/walkthrough">Start Walkthrough →</Button>
                <p className="text-[13px] text-[#999999]">
                  Estimated time: 2–3 minutes
                </p>
              </div>
            </OverviewCard>

            {/* Privacy — short and plain; the full documents carry the detail */}
            <OverviewCard className="px-9 py-7">
              <div className="mb-4">
                <h2 className="text-[17px] font-bold text-[#111]">Privacy</h2>
                <p className="mt-[3px] text-[13px] text-[#888888]">
                  Your writing is private
                </p>
              </div>

              <p className="max-w-[52em] text-[14px] leading-[1.7] text-[#777777]">
                Reflection only uses the situations, check-ins, and reflections
                you choose to record.
              </p>
              <div className="mt-4 flex items-center gap-6">
                <Link
                  href="/privacy"
                  className="text-[13px] font-medium text-[#333333] transition-colors duration-150 hover:text-[#111]"
                >
                  Privacy Policy →
                </Link>
                <Link
                  href="/terms"
                  className="text-[13px] font-medium text-[#333333] transition-colors duration-150 hover:text-[#111]"
                >
                  Terms of Use →
                </Link>
              </div>
            </OverviewCard>

            {/* Reflection Activity — usage statistics, relocated from the
                Overview (Phase 2): the profile is where personal statistics
                belong. */}
            <ReflectionActivityCard
              items={engagementActivity.items}
              consistency={engagementActivity.consistency}
              weeklyCounts={engagementActivity.weeklyCounts}
            />

            {/* During the beta — honest expectation-setting, no dead controls. */}
            <OverviewCard className="px-9 py-7">
              <div className="mb-4">
                <h2 className="text-[17px] font-bold text-[#111]">
                  During the beta
                </h2>
                <p className="mt-[3px] text-[13px] text-[#888888]">
                  What&apos;s not here yet
                </p>
              </div>

              <p className="max-w-[52em] text-[14px] leading-[1.7] text-[#777777]">
                A few account tools aren&apos;t in the app yet: exporting your
                data, deleting your account yourself, and notification
                preferences. They&apos;re planned — until they ship, nothing
                here will pretend to do them. Want your account and everything
                in it deleted? Reply to your beta invite email and we&apos;ll
                take care of it, usually within a few days.
              </p>
            </OverviewCard>

            {/* About */}
            <OverviewCard className="px-9 py-7">
              <div className="mb-4">
                <h2 className="text-[17px] font-bold text-[#111]">About</h2>
                <p className="mt-[3px] text-[13px] text-[#888888]">
                  This application
                </p>
              </div>

              <div className="flex items-center justify-between py-2.5">
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
