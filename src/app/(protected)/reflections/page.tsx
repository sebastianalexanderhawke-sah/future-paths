import Link from "next/link";

import { AppSidebar } from "@/components/overview/app-sidebar";
import { OverviewCard } from "@/components/overview/overview-card";
import { CompletedReflectionsList } from "@/components/reflections/completed-reflections-list";
import { ReflectionPredictionCard } from "@/components/reflections/reflection-prediction-card";
import { SituationTitleExpander } from "@/components/reflections/situation-title-expander";
import { getLastCheckInsForMoments } from "@/lib/check-ins";
import { listMoments } from "@/lib/moments";
import { listReflectionCheckIns, type ReflectionCheckIn } from "@/lib/reflections";
import {
  CHECK_IN_STALE_DAYS,
  formatRelativeTime,
  isCheckInStale,
} from "@/lib/relative-time";
import { getUserIdentity } from "@/lib/user-identity";
import type { Moment } from "@/types/database";

// Sections stay curated: this many rows visible, the rest behind
// "Show older" so the queue stays readable after years of use.
const VISIBLE_LIMIT = 6;

function rowBorder(isLast: boolean): string {
  return isLast ? "" : "border-b border-[#f5f5f5]";
}

function ReflectionRow({
  checkIn,
  position,
  isLast,
}: {
  checkIn: ReflectionCheckIn;
  position: number;
  isLast: boolean;
}) {
  return (
    <div className={["flex items-center gap-3.5 py-3.5", rowBorder(isLast)].join(" ")}>
      <span
        aria-hidden="true"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eef2ff] text-[13px] font-semibold text-[#6366f1]"
      >
        {position}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[14px] font-semibold text-[#111]">
          {checkIn.moment.title}
        </span>
        <span className="mt-0.5 block truncate text-[12px] text-[#888888]">
          Reflection · {checkIn.reflection_question}
        </span>
      </span>
      <span className="ml-auto shrink-0 text-[12px] font-medium text-[#999999]">
        1 question
      </span>
    </div>
  );
}

function CheckInRow({
  moment,
  lastCheckIn,
  isLast,
}: {
  moment: Moment;
  lastCheckIn: string | undefined;
  isLast: boolean;
}) {
  return (
    <div className={["flex items-center gap-3.5 py-3.5", rowBorder(isLast)].join(" ")}>
      <span
        aria-hidden="true"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fffbeb] text-[15px] font-semibold text-[#f59e0b]"
      >
        {(moment.title.charAt(0) || "•").toUpperCase()}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[14px] font-semibold text-[#111]">
          {moment.title}
        </span>
        <span className="mt-0.5 block text-[12px] text-[#888888]">
          {lastCheckIn
            ? `Check-in · last one ${formatRelativeTime(lastCheckIn)} — more than ${CHECK_IN_STALE_DAYS} days`
            : "Check-in · none yet"}
        </span>
      </span>
      <Link
        href={`/moments/${moment.id}#check-in`}
        className="ml-auto shrink-0 rounded-lg bg-[#111] px-3.5 py-2 text-[12px] font-semibold text-white transition-opacity duration-150 hover:opacity-[0.88]"
      >
        Continue
      </Link>
    </div>
  );
}

function ShowOlder({ count, children }: { count: number; children: React.ReactNode }) {
  return (
    <details className="group">
      <summary className="cursor-pointer list-none py-3 text-[13px] font-medium text-[#999999] transition-colors duration-150 hover:text-[#6366f1] [&::-webkit-details-marker]:hidden">
        <span className="group-open:hidden">▼ Show older ({count})</span>
        <span className="hidden group-open:inline">▲ Hide older</span>
      </summary>
      {children}
    </details>
  );
}

export default async function WorkspacePage() {
  const [userIdentity, reflectionsResult, momentsResult] = await Promise.all([
    getUserIdentity(),
    listReflectionCheckIns(),
    listMoments(),
  ]);

  if ("error" in reflectionsResult) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f4f4f6] px-6">
        <p className="text-[13px] text-red-600">{reflectionsResult.error}</p>
      </div>
    );
  }

  const unanswered = reflectionsResult.checkIns.filter(
    (c) => !c.reflection_answer,
  );
  const completed = reflectionsResult.checkIns.filter(
    (c) => !!c.reflection_answer,
  );

  // A reflection is the latest thinking for its situation: keep only the
  // newest unanswered one per situation (the list arrives newest-first).
  // Superseded ones stay in the database; they just don't queue here.
  const seenMoments = new Set<string>();
  const latestPerSituation = unanswered.filter((checkIn) => {
    if (seenMoments.has(checkIn.moment_id)) return false;
    seenMoments.add(checkIn.moment_id);
    return true;
  });
  const supersededCount = unanswered.length - latestPerSituation.length;

  // Longest-waiting situation is the one in progress; the rest queue behind
  // it, oldest first.
  const pending =
    latestPerSituation.length > 0
      ? latestPerSituation[latestPerSituation.length - 1]
      : null;
  const waiting = latestPerSituation.slice(0, -1).reverse();

  // Check-ins due — existing staleness rule, minus situations already
  // surfaced by a reflection, most-neglected first.
  const activeMoments =
    "moments" in momentsResult ? momentsResult.moments : [];
  const lastCheckIns = await getLastCheckInsForMoments(
    activeMoments.map((m) => m.id),
  );
  const needsCheckIn = activeMoments
    .filter(
      (moment) =>
        !seenMoments.has(moment.id) && isCheckInStale(lastCheckIns[moment.id]),
    )
    .sort((a, b) => {
      const aTime = lastCheckIns[a.id] ? new Date(lastCheckIns[a.id]).getTime() : 0;
      const bTime = lastCheckIns[b.id] ? new Date(lastCheckIns[b.id]).getTime() : 0;
      return aTime - bTime;
    });

  const visibleCheckIns = needsCheckIn.slice(0, VISIBLE_LIMIT);
  const olderCheckIns = needsCheckIn.slice(VISIBLE_LIMIT);
  const visibleWaiting = waiting.slice(0, VISIBLE_LIMIT);
  const olderWaiting = waiting.slice(VISIBLE_LIMIT);

  const hasWork = pending !== null || needsCheckIn.length > 0;

  return (
    <div className="flex h-screen overflow-hidden bg-[#f4f4f6] text-[#111]">
      <AppSidebar
        activeHref="/reflections"
        unansweredReflections={unanswered.length}
        userLabel={userIdentity.displayName ?? "Your account"}
        userInitial={userIdentity.initial}
      />

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1120px] px-10 py-10">
          {/* Page header */}
          <div className="mb-10">
            <h1 className="mb-1.5 text-[32px] font-extrabold tracking-[-0.8px] text-[#111]">
              Workspace
            </h1>
            <p className="text-[15px] text-[#999999]">
              Complete reflections, check-ins, and decisions that move your
              future forward.
            </p>
          </div>

          {!hasWork ? (
            <OverviewCard className="px-9 py-16">
              <div className="flex flex-col items-center text-center">
                <p className="text-[17px] font-semibold text-[#111]">
                  You&apos;re all caught up.
                </p>
                <p className="mt-2 text-[13px] leading-relaxed text-[#999999]">
                  Check back after new situations develop.
                </p>
              </div>
            </OverviewCard>
          ) : (
            <div className="flex flex-col gap-8 pb-14">
              {/* Continue Working — the situation leads; the task follows. */}
              {pending ? (
                <section>
                  <div className="mb-4">
                    <h2 className="text-[17px] font-bold text-[#111]">
                      Continue Working
                    </h2>
                    <p className="mt-[3px] text-[13px] text-[#999999]">
                      Pick up where you left off
                    </p>
                  </div>
                  <OverviewCard className="px-9 py-7">
                    <SituationTitleExpander
                      title={pending.moment.title}
                      date={new Date(pending.created_at).toLocaleDateString()}
                      summary={
                        pending.moment.current_understanding ??
                        pending.moment.description ??
                        null
                      }
                    />
                    <div className="mt-4 flex items-center gap-3">
                      <span className="rounded-full bg-[#eef2ff] px-3 py-1 text-[11px] font-semibold text-[#6366f1]">
                        Reflection
                      </span>
                      {waiting.length > 0 ? (
                        <span className="text-[12px] text-[#999999]">
                          {waiting.length} more situation
                          {waiting.length !== 1 ? "s" : ""} waiting
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-3 text-[17px] font-semibold leading-snug text-[#111]">
                      {pending.reflection_question}
                    </p>
                    <div className="mt-5">
                      <ReflectionPredictionCard checkInId={pending.id} />
                    </div>
                  </OverviewCard>
                </section>
              ) : null}

              {/* Needs Check-in — before reflections: check-ins generate the
                  next round of thinking. */}
              {needsCheckIn.length > 0 ? (
                <section>
                  <div className="mb-4">
                    <h2 className="text-[17px] font-bold text-[#111]">
                      Needs Check-in
                    </h2>
                    <p className="mt-[3px] text-[13px] text-[#999999]">
                      These situations haven&apos;t heard from you in a while
                    </p>
                  </div>
                  <OverviewCard className="px-8 py-4">
                    {visibleCheckIns.map((moment, i) => (
                      <CheckInRow
                        key={moment.id}
                        moment={moment}
                        lastCheckIn={lastCheckIns[moment.id]}
                        isLast={
                          olderCheckIns.length === 0 &&
                          i === visibleCheckIns.length - 1
                        }
                      />
                    ))}
                    {olderCheckIns.length > 0 ? (
                      <ShowOlder count={olderCheckIns.length}>
                        {olderCheckIns.map((moment, i) => (
                          <CheckInRow
                            key={moment.id}
                            moment={moment}
                            lastCheckIn={lastCheckIns[moment.id]}
                            isLast={i === olderCheckIns.length - 1}
                          />
                        ))}
                      </ShowOlder>
                    ) : null}
                  </OverviewCard>
                </section>
              ) : null}

              {/* Needs Reflection — one per situation, newest thinking only. */}
              {waiting.length > 0 ? (
                <section>
                  <div className="mb-4">
                    <h2 className="text-[17px] font-bold text-[#111]">
                      Needs Reflection
                    </h2>
                    <p className="mt-[3px] text-[13px] text-[#999999]">
                      Up next, in order — each unlocks when the one above is
                      answered
                    </p>
                  </div>
                  <OverviewCard className="px-8 py-4">
                    {visibleWaiting.map((checkIn, i) => (
                      <ReflectionRow
                        key={checkIn.id}
                        checkIn={checkIn}
                        position={i + 2}
                        isLast={
                          olderWaiting.length === 0 &&
                          i === visibleWaiting.length - 1
                        }
                      />
                    ))}
                    {olderWaiting.length > 0 ? (
                      <ShowOlder count={olderWaiting.length}>
                        {olderWaiting.map((checkIn, i) => (
                          <ReflectionRow
                            key={checkIn.id}
                            checkIn={checkIn}
                            position={VISIBLE_LIMIT + i + 2}
                            isLast={i === olderWaiting.length - 1}
                          />
                        ))}
                      </ShowOlder>
                    ) : null}
                  </OverviewCard>
                </section>
              ) : null}

              {supersededCount > 0 ? (
                <p className="px-1 text-[12px] text-[#bbbbbb]">
                  {supersededCount} older reflection
                  {supersededCount !== 1 ? "s" : ""} superseded by newer
                  check-ins on the same situations.
                </p>
              ) : null}
            </div>
          )}

          {/* History — quiet, self-collapsed by the existing component. */}
          {completed.length > 0 ? (
            <div className="pb-14">
              <CompletedReflectionsList checkIns={completed} />
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
