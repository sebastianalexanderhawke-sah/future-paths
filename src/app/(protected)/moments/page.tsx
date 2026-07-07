import Link from "next/link";

import { toFirstSentence } from "@/components/home/output-refinement";
import {
  SituationCard,
  type SituationStatus,
} from "@/components/moments/situation-card";
import { AppSidebar } from "@/components/overview/app-sidebar";
import { OverviewCard } from "@/components/overview/overview-card";
import { getLastCheckInsForMoments } from "@/lib/check-ins";
import { listArchivedMoments, listMoments } from "@/lib/moments";
import { getChosenPathsForMoments } from "@/lib/paths";
import { getUnansweredReflectionSummary } from "@/lib/reflections";
import { formatRelativeTime } from "@/lib/relative-time";
import { getUserIdentity } from "@/lib/user-identity";
import type { Moment } from "@/types/database";

// Object states, not task states — actions live on the Workspace page.
// The same three lifecycle stages the cards have always derived from
// chosen-path and check-in data. "Exploring options" is the most common
// state, so it stays neutral; color marks progress (accent for a made
// forecast, green for lived check-ins), keeping the grid calm rather than
// a wall of blue.
const STATUSES = {
  exploring: { label: "Exploring options", color: "#666666", soft: "#f4f4f6" },
  forecast: { label: "Forecast", color: "#6366f1", soft: "#eef2ff" },
  checkingIn: { label: "Checking in", color: "#22c55e", soft: "#f0fdf4" },
} satisfies Record<string, SituationStatus>;

function summarize(moment: Moment): string | null {
  return (
    toFirstSentence(moment.description ?? "", 120) ||
    toFirstSentence(moment.current_understanding ?? "", 120) ||
    null
  );
}

export default async function MomentsPage() {
  const [userIdentity, activeResult, archivedResult, reflectionSummaryResult] =
    await Promise.all([
      getUserIdentity(),
      listMoments(),
      listArchivedMoments(),
      getUnansweredReflectionSummary(),
    ]);

  if ("error" in activeResult) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f4f4f6] px-6">
        <p className="text-[13px] text-red-600">{activeResult.error}</p>
      </div>
    );
  }

  const active = activeResult.moments;
  const archived = "moments" in archivedResult ? archivedResult.moments : [];
  const reflectionSummary =
    "pending" in reflectionSummaryResult ? reflectionSummaryResult : null;

  const momentIds = active.map((m) => m.id);
  const [chosenPaths, lastCheckIns] = await Promise.all([
    getChosenPathsForMoments(momentIds),
    getLastCheckInsForMoments(momentIds),
  ]);

  const statusOf = (moment: Moment): SituationStatus => {
    if (!chosenPaths[moment.id]) return STATUSES.exploring;
    if (!lastCheckIns[moment.id]) return STATUSES.forecast;
    return STATUSES.checkingIn;
  };

  // First 8 active situations up front; the rest expand inline on demand.
  const visibleActive = active.slice(0, 8);
  const moreActive = active.slice(8);

  // Most Engaged — ranked by how far a situation has been taken through the
  // existing lifecycle (path chosen, then checking in), with the most recent
  // activity breaking ties. No counts are fetched by this page, so the rank
  // leans on milestones already loaded; no new queries, no invented scores.
  const engagementStage = (moment: Moment): number =>
    (chosenPaths[moment.id] ? 1 : 0) + (lastCheckIns[moment.id] ? 1 : 0);
  const lastActivityAt = (moment: Moment): number =>
    Math.max(
      new Date(moment.updated_at).getTime(),
      lastCheckIns[moment.id]
        ? new Date(lastCheckIns[moment.id]).getTime()
        : 0,
    );
  const mostEngaged =
    active.length >= 3
      ? [...active]
          .sort(
            (a, b) =>
              engagementStage(b) - engagementStage(a) ||
              lastActivityAt(b) - lastActivityAt(a),
          )
          .slice(0, 4)
      : [];

  const engagementLine = (moment: Moment): string => {
    if (lastCheckIns[moment.id])
      return `Path chosen · checked in ${formatRelativeTime(lastCheckIns[moment.id])}`;
    if (chosenPaths[moment.id])
      return `Path chosen · no check-ins yet`;
    return `Exploring options · updated ${formatRelativeTime(moment.updated_at)}`;
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#f4f4f6] text-[#111]">
      <AppSidebar
        activeHref="/moments"
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
                Situations
              </h1>
              <p className="text-[15px] text-[#999999]">
                The active parts of your life.
              </p>
            </div>
            <Link
              href="/moments/new"
              className="shrink-0 rounded-[10px] bg-[#111] px-[18px] py-2.5 text-[13px] font-semibold text-white transition-opacity duration-150 hover:opacity-[0.88]"
            >
              + New situation
            </Link>
          </div>

          {active.length === 0 && archived.length === 0 ? (
            <OverviewCard className="px-9 py-14">
              <div className="flex flex-col items-center text-center">
                <p className="text-[15px] font-semibold text-[#111]">
                  No situations yet.
                </p>
                <p className="mt-2 max-w-[340px] text-[13px] leading-relaxed text-[#999999]">
                  Capture a meaningful decision or crossroads to begin.
                </p>
                <Link
                  href="/moments/new"
                  className="mt-5 rounded-[10px] bg-[#111] px-[18px] py-2.5 text-[13px] font-semibold text-white transition-opacity duration-150 hover:opacity-[0.88]"
                >
                  Create your first situation
                </Link>
              </div>
            </OverviewCard>
          ) : (
            <div className="flex flex-col gap-8 pb-14">
              {/* Active Situations — the state of each, not its to-dos. */}
              <section id="active" className="scroll-mt-6">
                <div className="mb-4">
                  <h2 className="text-[17px] font-bold text-[#111]">
                    Active Situations
                  </h2>
                  <p className="mt-[3px] text-[13px] text-[#999999]">
                    Everything currently in motion
                  </p>
                </div>
                {active.length === 0 ? (
                  <OverviewCard className="px-8 py-7">
                    <p className="text-[13px] leading-relaxed text-[#888888]">
                      Nothing active right now. Start a new situation to get
                      moving.
                    </p>
                  </OverviewCard>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-5">
                      {visibleActive.map((moment) => (
                        <SituationCard
                          key={moment.id}
                          href={`/moments/${moment.id}`}
                          title={moment.title}
                          summary={summarize(moment)}
                          updatedLabel={formatRelativeTime(moment.updated_at)}
                          status={statusOf(moment)}
                        />
                      ))}
                    </div>
                    {moreActive.length > 0 ? (
                      <details className="group mt-4">
                        <summary className="cursor-pointer list-none py-1 text-[13px] font-medium text-[#999999] transition-colors duration-150 hover:text-[#6366f1] [&::-webkit-details-marker]:hidden">
                          <span className="group-open:hidden">
                            ▼ Show all active ({moreActive.length} more)
                          </span>
                          <span className="hidden group-open:inline">
                            ▲ Show fewer
                          </span>
                        </summary>
                        <div className="mt-4 grid grid-cols-2 gap-5">
                          {moreActive.map((moment) => (
                            <SituationCard
                              key={moment.id}
                              href={`/moments/${moment.id}`}
                              title={moment.title}
                              summary={summarize(moment)}
                              updatedLabel={formatRelativeTime(
                                moment.updated_at,
                              )}
                              status={statusOf(moment)}
                            />
                          ))}
                        </div>
                      </details>
                    ) : null}
                  </>
                )}
              </section>

              {/* Most Engaged — a curated shortlist, not analytics. */}
              {mostEngaged.length > 0 ? (
                <OverviewCard className="px-8 py-7">
                  <div className="mb-3">
                    <h2 className="text-[17px] font-bold text-[#111]">
                      Most Engaged
                    </h2>
                    <p className="mt-[3px] text-[13px] text-[#999999]">
                      The situations you&apos;ve invested the most attention in.
                    </p>
                  </div>
                  <div>
                    {mostEngaged.map((moment, i) => (
                      <Link
                        key={moment.id}
                        href={`/moments/${moment.id}`}
                        className={[
                          "flex items-center gap-4 py-3.5 transition-opacity duration-150 hover:opacity-80",
                          i < mostEngaged.length - 1
                            ? "border-b border-[#f5f5f5]"
                            : "",
                        ].join(" ")}
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-[14px] font-semibold text-[#111]">
                            {moment.title}
                          </span>
                          <span className="mt-0.5 block text-[12px] text-[#888888]">
                            {engagementLine(moment)}
                          </span>
                        </span>
                        {/* Lifecycle bar: captured → path chosen → checking in. */}
                        <span
                          aria-hidden="true"
                          className="ml-auto flex shrink-0 gap-1"
                        >
                          {[0, 1, 2].map((step) => (
                            <span
                              key={step}
                              className={[
                                "h-[3px] w-4 rounded-full",
                                step <= engagementStage(moment)
                                  ? "bg-[#6366f1]"
                                  : "bg-[#ececf0]",
                              ].join(" ")}
                            />
                          ))}
                        </span>
                        <span
                          aria-hidden="true"
                          className="shrink-0 text-[16px] text-[#cccccc]"
                        >
                          ›
                        </span>
                      </Link>
                    ))}
                  </div>
                </OverviewCard>
              ) : null}

              {/* Resolved — collapsed by default, lighter, read-only. */}
              {archived.length > 0 ? (
                <details
                  id="resolved"
                  className="group scroll-mt-6 rounded-2xl border border-[#f0f0f2] bg-white shadow-[0_1px_2px_rgba(17,17,17,0.02),0_12px_32px_rgba(17,17,17,0.04)]"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between px-8 py-6 [&::-webkit-details-marker]:hidden">
                    <div>
                      <h2 className="text-[17px] font-bold text-[#111]">
                        Resolved Situations ({archived.length})
                      </h2>
                      <p className="mt-[3px] text-[13px] text-[#999999]">
                        Completed and archived
                      </p>
                    </div>
                    <span className="text-[13px] font-medium text-[#999999]">
                      <span className="group-open:hidden">▼ Show resolved</span>
                      <span className="hidden group-open:inline">
                        ▲ Hide resolved
                      </span>
                    </span>
                  </summary>
                  <div className="border-t border-[#f5f5f5] px-8 pb-4">
                    {archived.map((moment, i) => (
                      <div
                        key={moment.id}
                        className={[
                          "flex items-center justify-between gap-4 py-3.5",
                          i < archived.length - 1
                            ? "border-b border-[#f7f7f9]"
                            : "",
                        ].join(" ")}
                      >
                        <span className="min-w-0 truncate text-[14px] font-medium text-[#999999]">
                          {moment.title}
                        </span>
                        <span className="shrink-0 text-[12px] text-[#bbbbbb]">
                          Resolved {formatRelativeTime(moment.updated_at)}
                        </span>
                      </div>
                    ))}
                  </div>
                </details>
              ) : null}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
