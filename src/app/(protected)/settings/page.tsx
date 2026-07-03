import packageJson from "../../../../package.json";

import { AppSidebar } from "@/components/overview/app-sidebar";
import { OverviewCard } from "@/components/overview/overview-card";
import { getUnansweredReflectionSummary } from "@/lib/reflections";
import { createClient } from "@/lib/supabase/server";
import { getUserIdentity } from "@/lib/user-identity";

// Visual implementation only: preferences below are opinionated defaults
// rendered with native inputs. Wire them to persistence when a settings
// backend exists; actions without a backend are disabled placeholders.
const NOTIFICATION_CATEGORIES = [
  {
    key: "reflection-available",
    title: "Reflection available",
    description:
      "Notify me when a new reflection is generated after a check-in.",
  },
  {
    key: "check-in-reminders",
    title: "Check-in reminders",
    description:
      "Notify me when an active situation hasn't been updated for a while.",
  },
  {
    key: "current-self-changes",
    title: "Current Self changes",
    description: "Notify me when my Current Self meaningfully changes.",
  },
  {
    key: "future-path-changes",
    title: "Future Path changes",
    description:
      "Notify me when one of my Future Paths changes significantly.",
  },
  {
    key: "monthly-chapter-ready",
    title: "Monthly chapter ready",
    description:
      "Notify me when a new monthly chapter has been generated.",
  },
];

const APPEARANCE_OPTIONS = ["Light", "Dark", "System"];

function PlaceholderAction({
  label,
  tone = "default",
}: {
  label: string;
  tone?: "default" | "danger";
}) {
  return (
    <button
      type="button"
      disabled
      title={`${label} (coming soon)`}
      className={[
        "rounded-lg border px-3.5 py-2 text-[12px] font-semibold",
        tone === "danger"
          ? "border-[#fde4e4] bg-[#fff5f5] text-[#f1a5a5]"
          : "border-[#ececf0] bg-[#f8f8fa] text-[#bbbbbb]",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

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
  const displayName = userIdentity.displayName ?? "Not set";
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
              Manage your account, notifications, and privacy.
            </p>
          </div>

          <div className="flex flex-col gap-5 pb-14">
            {/* Account */}
            <OverviewCard className="px-9 py-7">
              <div className="mb-6">
                <h2 className="text-[17px] font-bold text-[#111]">Account</h2>
                <p className="mt-[3px] text-[13px] text-[#888888]">
                  Who you are on Future Paths
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

              <div className="mt-6">
                <div className="flex items-center justify-between border-b border-[#f5f5f5] py-3.5">
                  <span className="text-[14px] font-medium text-[#111]">
                    Display Name
                  </span>
                  <span className="text-[13px] text-[#999999]">
                    {displayName}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-[#f5f5f5] py-3.5">
                  <span className="text-[14px] font-medium text-[#111]">
                    Email Address
                  </span>
                  <span className="text-[13px] text-[#999999]">{email}</span>
                </div>
                <div className="flex items-center justify-between py-3.5">
                  <span className="text-[14px] font-medium text-[#111]">
                    Change Password
                  </span>
                  <PlaceholderAction label="Change" />
                </div>
              </div>

              {/* Destructive action, clearly set apart. */}
              <div className="mt-4 flex items-center justify-between rounded-xl border border-[#fde4e4] bg-[#fffafa] px-5 py-4">
                <span>
                  <span className="block text-[14px] font-medium text-[#ef4444]">
                    Delete Account
                  </span>
                  <span className="mt-0.5 block text-[12px] text-[#999999]">
                    Permanently removes your account and all recorded history.
                  </span>
                </span>
                <PlaceholderAction label="Delete" tone="danger" />
              </div>
            </OverviewCard>

            {/* Notifications */}
            <OverviewCard className="px-9 py-7">
              <div className="mb-4">
                <h2 className="text-[17px] font-bold text-[#111]">
                  Notifications
                </h2>
                <p className="mt-[3px] text-[13px] text-[#888888]">
                  Choose what you hear about — we handle the timing
                </p>
              </div>

              <div>
                {NOTIFICATION_CATEGORIES.map((category, i) => (
                  <label
                    key={category.key}
                    className={[
                      "flex cursor-pointer items-center justify-between gap-6 py-3.5",
                      i < NOTIFICATION_CATEGORIES.length - 1
                        ? "border-b border-[#f5f5f5]"
                        : "",
                    ].join(" ")}
                  >
                    <span>
                      <span className="block text-[14px] font-medium text-[#111]">
                        {category.title}
                      </span>
                      <span className="mt-0.5 block text-[12px] text-[#999999]">
                        {category.description}
                      </span>
                    </span>
                    <input
                      type="checkbox"
                      defaultChecked
                      className="h-4 w-4 shrink-0 accent-[#6366f1]"
                    />
                  </label>
                ))}
              </div>
            </OverviewCard>

            {/* Appearance */}
            <OverviewCard className="px-9 py-7">
              <div className="mb-5">
                <h2 className="text-[17px] font-bold text-[#111]">
                  Appearance
                </h2>
                <p className="mt-[3px] text-[13px] text-[#888888]">
                  How Future Paths looks on this device
                </p>
              </div>

              <div className="flex items-center gap-8">
                {APPEARANCE_OPTIONS.map((option) => (
                  <label
                    key={option}
                    className="flex cursor-pointer items-center gap-2.5"
                  >
                    <input
                      type="radio"
                      name="appearance"
                      defaultChecked={option === "Light"}
                      className="h-4 w-4 accent-[#6366f1]"
                    />
                    <span className="text-[14px] font-medium text-[#111]">
                      {option}
                    </span>
                  </label>
                ))}
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
                Your Current Self and Future Paths are generated only from the
                situations, check-ins, and reflections you record.
              </p>
              <p className="mt-2 max-w-[52em] text-[14px] leading-[1.7] text-[#777777]">
                We never invent experiences that are not part of your history.
              </p>

              <div className="mt-6">
                <div className="flex items-center justify-between border-b border-[#f5f5f5] py-3.5">
                  <span className="text-[14px] font-medium text-[#111]">
                    Export My Data
                  </span>
                  <PlaceholderAction label="Export" />
                </div>
                <div className="flex items-center justify-between border-b border-[#f5f5f5] py-3.5">
                  <span className="text-[14px] font-medium text-[#111]">
                    Privacy Policy
                  </span>
                  <PlaceholderAction label="View" />
                </div>
                <div className="flex items-center justify-between py-3.5">
                  <span className="text-[14px] font-medium text-[#111]">
                    Terms of Service
                  </span>
                  <PlaceholderAction label="View" />
                </div>
              </div>
            </OverviewCard>

            {/* About */}
            <OverviewCard className="px-9 py-7">
              <div className="mb-4">
                <h2 className="text-[17px] font-bold text-[#111]">About</h2>
              </div>

              <div>
                <div className="flex items-center justify-between border-b border-[#f5f5f5] py-3.5">
                  <span className="text-[14px] font-medium text-[#111]">
                    Application version
                  </span>
                  <span className="text-[13px] text-[#999999]">
                    {packageJson.version}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-[#f5f5f5] py-3.5">
                  <span className="text-[14px] font-medium text-[#111]">
                    Contact Support
                  </span>
                  <PlaceholderAction label="Contact" />
                </div>
                <div className="flex items-center justify-between py-3.5">
                  <span className="text-[14px] font-medium text-[#111]">
                    Send Feedback
                  </span>
                  <PlaceholderAction label="Send" />
                </div>
              </div>
            </OverviewCard>
          </div>
        </div>
      </main>
    </div>
  );
}
