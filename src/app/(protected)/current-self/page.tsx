import Link from "next/link";

import { generateCurrentSelfAction } from "@/actions/current-self";
import { AnalysisDisclosure } from "@/components/current-self/analysis-disclosure";
import { AppSidebar } from "@/components/overview/app-sidebar";
import { OverviewCard } from "@/components/overview/overview-card";
import { getActivitySummary, getCurrentSelf } from "@/lib/current-self";
import { listIdentityUpdates } from "@/lib/identity-updates";
import { getUnansweredReflectionSummary } from "@/lib/reflections";
import { getUserIdentity } from "@/lib/user-identity";

type CurrentSelfPageProps = {
  searchParams: Promise<{ error?: string }>;
};

// "Name\nEvidence sentence" → value name + the pattern of choices behind it.
function parseValue(value: string): { name: string; evidence: string | null } {
  const newlineIndex = value.indexOf("\n");
  if (newlineIndex === -1) {
    return { name: value, evidence: null };
  }
  return {
    name: value.slice(0, newlineIndex),
    evidence: value.slice(newlineIndex + 1),
  };
}

function monthLabel(dateString: string): string {
  const date = new Date(dateString);
  const month = date.toLocaleString("en-US", { month: "long" });
  return date.getFullYear() === new Date().getFullYear()
    ? month
    : `${month} ${date.getFullYear()}`;
}

export default async function CurrentSelfPage({
  searchParams,
}: CurrentSelfPageProps) {
  const { error } = await searchParams;
  const [userIdentity, result, activity, reflectionSummaryResult, updatesResult] =
    await Promise.all([
      getUserIdentity(),
      getCurrentSelf(),
      getActivitySummary(),
      getUnansweredReflectionSummary(),
      listIdentityUpdates(3),
    ]);

  if ("error" in result) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f4f4f6] px-6">
        <p className="text-[13px] text-red-600">{result.error}</p>
      </div>
    );
  }

  const { currentSelf } = result;
  const reflectionSummary =
    "pending" in reflectionSummaryResult ? reflectionSummaryResult : null;
  const identityUpdates =
    "identityUpdates" in updatesResult ? updatesResult.identityUpdates : [];

  const paragraphs = currentSelf
    ? currentSelf.summary.split(/\n\n+/).filter(Boolean)
    : [];
  const conciseSummary = paragraphs[0] ?? null;
  const remainingParagraphs = paragraphs.slice(1);
  const recentGrowth = currentSelf?.recent_growth ?? [];
  const values = (currentSelf?.values ?? []).map(parseValue);
  const afraidOfBecoming = currentSelf?.afraid_of_becoming ?? [];

  // Oldest → newest so the chain reads chronologically, ending at today.
  const timelineSteps = [...identityUpdates].reverse().map((update) => ({
    key: update.id,
    label: monthLabel(update.created_at),
    title: update.title,
  }));

  const evidenceStats = [
    { value: activity.reflectionCount, label: "reflections" },
    { value: activity.checkInCount, label: "check-ins" },
    {
      value: activity.monthsActive,
      label: `month${activity.monthsActive !== 1 ? "s" : ""} of activity`,
    },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-[#f4f4f6] text-[#111]">
      <AppSidebar
        activeHref="/current-self"
        unansweredReflections={reflectionSummary?.unansweredCount ?? 0}
        userLabel={userIdentity.displayName ?? "Your account"}
        userInitial={userIdentity.initial}
      />

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1120px] px-10 py-10">
          {/* Page header */}
          <div className="mb-10 flex items-start justify-between">
            <div>
              <h1 className="mb-1.5 text-[32px] font-extrabold tracking-[-0.8px] text-[#111]">
                Current Self
              </h1>
              <p className="text-[15px] text-[#999999]">
                Your current identity based on recent reflections, check-ins,
                and decisions.
              </p>
            </div>
            <form action={generateCurrentSelfAction}>
              <button
                type="submit"
                className="shrink-0 cursor-pointer rounded-[10px] bg-[#111] px-[18px] py-2.5 text-[13px] font-semibold text-white transition-opacity duration-150 hover:opacity-[0.88]"
              >
                Refresh Current Self
              </button>
            </form>
          </div>

          {error ? (
            <p className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
              {error}
            </p>
          ) : null}

          {!currentSelf ? (
            <OverviewCard className="px-9 py-14">
              <div className="flex flex-col items-center text-center">
                <p className="max-w-[380px] text-[13px] leading-relaxed text-[#999999]">
                  No Current Self yet. Start a situation and check in — your
                  identity portrait builds itself from what you record.
                </p>
                <Link
                  href="/moments/new"
                  className="mt-4 text-[13px] font-medium text-[#6366f1] transition-opacity duration-150 hover:opacity-80"
                >
                  Start with a situation →
                </Link>
              </div>
            </OverviewCard>
          ) : (
            <div className="flex flex-col gap-5 pb-14">
              {/* Hero — the identity statement leads. */}
              <OverviewCard className="px-9 pb-7 pt-7">
                <div className="mb-5">
                  <h2 className="text-[22px] font-bold tracking-[-0.3px] text-[#111]">
                    Current Self
                  </h2>
                  <p className="mt-1 text-[13px] text-[#999999]">
                    Who you are right now
                  </p>
                </div>

                <p className="font-voice max-w-[22em] text-[34px] font-medium leading-[1.25] tracking-[-0.5px] text-[#111]">
                  {currentSelf.title}
                </p>

                {conciseSummary ? (
                  <p className="mt-4 max-w-[52em] text-[14px] leading-[1.7] text-[#777777]">
                    {conciseSummary}
                  </p>
                ) : null}

                <AnalysisDisclosure paragraphs={remainingParagraphs} />
              </OverviewCard>

              {/* What You Value / What You Fear Becoming — complementary,
                  equal-weight sibling cards. */}
              <div className="grid grid-cols-2 gap-5">
                <OverviewCard className="flex flex-col px-8 py-7">
                  <div className="mb-6">
                    <div className="flex items-center gap-2">
                      <span
                        aria-hidden="true"
                        className="text-[18px] leading-none text-[#6366f1]"
                      >
                        ◈
                      </span>
                      <h2 className="text-[17px] font-bold text-[#111]">
                        What You Value
                      </h2>
                    </div>
                    <p className="mt-[3px] text-[13px] text-[#888888]">
                      What your repeated choices consistently protect
                    </p>
                  </div>

                  {values.length === 0 ? (
                    <p className="py-6 text-[13px] leading-relaxed text-[#888888]">
                      Not clear yet — this fills in as patterns repeat.
                    </p>
                  ) : (
                    <div>
                      {values.map(({ name, evidence }, i) => (
                        <div
                          key={`${i}-${name}`}
                          className={[
                            "flex items-start gap-3.5 py-3.5",
                            i < values.length - 1 ? "border-b border-[#f5f5f5]" : "",
                          ].join(" ")}
                        >
                          <span
                            aria-hidden="true"
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f5f5ff] text-[15px] text-[#6366f1]"
                          >
                            ◈
                          </span>
                          <div className="pt-1.5">
                            <p className="text-[14px] font-bold leading-snug text-[#111]">
                              {name}
                            </p>
                            {evidence ? (
                              <p className="mt-1 text-[13px] leading-relaxed text-[#777777]">
                                {evidence}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </OverviewCard>

                <OverviewCard className="flex flex-col px-8 py-7">
                  <div className="mb-6">
                    <div className="flex items-center gap-2">
                      <span
                        aria-hidden="true"
                        className="text-[18px] leading-none text-[#94a3b8]"
                      >
                        ○
                      </span>
                      <h2 className="text-[17px] font-bold text-[#111]">
                        What You Fear Becoming
                      </h2>
                    </div>
                    <p className="mt-[3px] text-[13px] text-[#888888]">
                      Not anxiety — the identity your choices move away from
                    </p>
                  </div>

                  {afraidOfBecoming.length === 0 ? (
                    <p className="py-6 text-[13px] leading-relaxed text-[#888888]">
                      Not clear yet — this fills in as patterns repeat.
                    </p>
                  ) : (
                    <div>
                      {afraidOfBecoming.map((item, i) => (
                        <div
                          key={item}
                          className={[
                            "flex items-start gap-3.5 py-3.5",
                            i < afraidOfBecoming.length - 1
                              ? "border-b border-[#f5f5f5]"
                              : "",
                          ].join(" ")}
                        >
                          <span
                            aria-hidden="true"
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f8fafc] text-[15px] text-[#94a3b8]"
                          >
                            ○
                          </span>
                          <p className="pt-1.5 text-[14px] font-medium leading-snug text-[#111]">
                            {item}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </OverviewCard>
              </div>

              {/* Your Biggest Tension — the emotional center of the page. */}
              {currentSelf.core_tension ? (
                <OverviewCard className="bg-[#f8f7ff] px-9 py-9">
                  <p className="text-[13px] font-semibold uppercase tracking-[0.06em] text-[#6366f1]">
                    Your Biggest Tension
                  </p>
                  <p className="font-voice mt-3 max-w-[36em] text-[26px] font-medium leading-[1.4] tracking-[-0.3px] text-[#111]">
                    {currentSelf.core_tension}
                  </p>
                </OverviewCard>
              ) : null}

              {/* What's Changing — how the identity is currently evolving. */}
              <OverviewCard className="px-9 py-7">
                <div className="mb-6">
                  <div className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="text-[20px] leading-none text-[#22c55e]"
                    >
                      ↗
                    </span>
                    <h2 className="text-[17px] font-bold text-[#111]">
                      What&apos;s Changing
                    </h2>
                  </div>
                  <p className="mt-[3px] text-[13px] text-[#888888]">
                    How your identity is changing right now
                  </p>
                </div>

                {recentGrowth.length === 0 ? (
                  <p className="py-6 text-[13px] leading-relaxed text-[#888888]">
                    Nothing has shifted yet. Keep checking in and movement
                    will show up here.
                  </p>
                ) : (
                  <div>
                    {recentGrowth.map((item, i) => (
                      <div
                        key={item}
                        className={[
                          "flex items-start gap-3.5 py-3.5",
                          i < recentGrowth.length - 1
                            ? "border-b border-[#f5f5f5]"
                            : "",
                        ].join(" ")}
                      >
                        <span
                          aria-hidden="true"
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f0fdf4] text-[16px] text-[#22c55e]"
                        >
                          ↑
                        </span>
                        <p className="pt-1.5 text-[14px] leading-snug text-[#111]">
                          {item}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </OverviewCard>

              {/* Why this identity? — the evidence behind the read. */}
              <OverviewCard className="px-9 py-7">
                <div className="mb-6">
                  <h2 className="text-[17px] font-bold text-[#111]">
                    Why this identity?
                  </h2>
                  <p className="mt-[3px] text-[13px] text-[#888888]">
                    This portrait is built only from what you&apos;ve actually
                    recorded — nothing here is invented.
                  </p>
                </div>

                <div className="grid max-w-[560px] grid-cols-3 gap-5">
                  {evidenceStats.map((stat) => (
                    <div key={stat.label}>
                      <p className="text-[28px] font-extrabold leading-none tracking-[-1px] text-[#111]">
                        {stat.value}
                      </p>
                      <p className="mt-1.5 text-[12px] font-medium text-[#999999]">
                        {stat.label}
                      </p>
                    </div>
                  ))}
                </div>
              </OverviewCard>

              {/* Identity Timeline — compact evolution, not the full page. */}
              <OverviewCard className="px-9 py-7">
                <div className="mb-6 flex items-start justify-between">
                  <div>
                    <h2 className="text-[17px] font-bold text-[#111]">
                      Identity Timeline
                    </h2>
                    <p className="mt-[3px] text-[13px] text-[#888888]">
                      How your Current Self has evolved
                    </p>
                  </div>
                  <Link
                    href="/timeline"
                    className="text-[13px] font-medium text-[#999999] transition-colors duration-150 hover:text-[#6366f1]"
                  >
                    View full timeline →
                  </Link>
                </div>

                <div>
                  {timelineSteps.map((step) => (
                    <div key={step.key}>
                      <div className="flex items-baseline gap-4">
                        <span className="w-[96px] shrink-0 text-[12px] font-semibold text-[#999999]">
                          {step.label}
                        </span>
                        <span className="text-[14px] font-medium text-[#111]">
                          {step.title}
                        </span>
                      </div>
                      <div
                        aria-hidden="true"
                        className="py-1 pl-[112px] text-[13px] leading-none text-[#cccccc]"
                      >
                        ↓
                      </div>
                    </div>
                  ))}
                  <div className="flex items-baseline gap-4">
                    <span className="w-[96px] shrink-0 text-[12px] font-semibold text-[#6366f1]">
                      Today
                    </span>
                    <span className="text-[15px] font-semibold text-[#111]">
                      {currentSelf.title}
                    </span>
                  </div>
                  {timelineSteps.length === 0 ? (
                    <p className="mt-3 text-[13px] text-[#999999]">
                      As you keep reflecting, earlier versions of you will
                      appear here.
                    </p>
                  ) : null}
                </div>
              </OverviewCard>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
