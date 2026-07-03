import { AppSidebar } from "@/components/overview/app-sidebar";
import { OverviewCard } from "@/components/overview/overview-card";
import { MonthlyIdentityNarrativeCard } from "@/components/timeline/monthly-identity-narrative-card";
import { loadMonthlyIdentityNarratives } from "@/lib/monthly-identity-narrative";
import { getUnansweredReflectionSummary } from "@/lib/reflections";
import { getUserIdentity } from "@/lib/user-identity";

export default async function TimelinePage() {
  const [userIdentity, result, reflectionSummaryResult] = await Promise.all([
    getUserIdentity(),
    loadMonthlyIdentityNarratives(),
    getUnansweredReflectionSummary(),
  ]);

  if ("error" in result) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f4f4f6] px-6">
        <p className="text-[13px] text-red-600">{result.error}</p>
      </div>
    );
  }

  const { narratives } = result;
  const reflectionSummary =
    "pending" in reflectionSummaryResult ? reflectionSummaryResult : null;

  return (
    <div className="flex h-screen overflow-hidden bg-[#f4f4f6] text-[#111]">
      <AppSidebar
        activeHref="/timeline"
        unansweredReflections={reflectionSummary?.unansweredCount ?? 0}
        userLabel={userIdentity.displayName ?? "Your account"}
        userInitial={userIdentity.initial}
      />

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1120px] px-10 py-10">
          {/* Page header */}
          <div className="mb-10">
            <h1 className="mb-1.5 text-[32px] font-extrabold tracking-[-0.8px] text-[#111]">
              Timeline
            </h1>
            <p className="text-[15px] text-[#999999]">
              Your personal evolution, one chapter at a time.
            </p>
          </div>

          {narratives.length === 0 ? (
            <OverviewCard className="px-9 py-14">
              <div className="flex flex-col items-center text-center">
                <p className="text-[15px] font-semibold text-[#111]">
                  No monthly chapters yet.
                </p>
                <p className="mt-2 max-w-[400px] text-[13px] leading-relaxed text-[#999999]">
                  Capture moments, choose paths, and check in — your first
                  chapter appears once a month of activity accumulates.
                </p>
              </div>
            </OverviewCard>
          ) : (
            /* The rail: a quiet vertical thread every chapter hangs from. */
            <div className="relative pb-14">
              <div
                aria-hidden="true"
                className="absolute bottom-2 left-[7px] top-2 w-[2px] rounded-full bg-[#e8e8ee]"
              />
              <div className="flex flex-col gap-12">
                {narratives.map((narrative) => (
                  <section key={narrative.month} className="relative pl-10">
                    {/* Node on the rail, with the month as its label. */}
                    <span
                      aria-hidden="true"
                      className="absolute left-0 top-[3px] h-4 w-4 rounded-full border-[3px] border-white bg-[#6366f1] shadow-[0_0_0_1px_#e8e8ee]"
                    />
                    <p className="text-[13px] font-semibold text-[#999999]">
                      {narrative.month}
                    </p>
                    <div className="mt-3">
                      <MonthlyIdentityNarrativeCard narrative={narrative} />
                    </div>
                  </section>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
