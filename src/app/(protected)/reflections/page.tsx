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

// Next Up answers "what should I do next?", not "here are six things" —
// the first item plus a couple reinforcing that more follows.
const NEXT_UP_LIMIT = 3;

// Coming Up previews just enough to give confidence there's more waiting;
// everything past the preview hides behind a single expansion control.
const COMING_UP_PREVIEW = 4;

// One queue, two kinds of work. The kind is metadata on the row (a badge),
// never a section — the user works downward without switching mental models.
type QueueItem =
  | { kind: "check-in"; moment: Moment }
  | { kind: "reflection"; checkIn: ReflectionCheckIn };

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
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eef2ff] text-[13px] font-semibold text-[#047857]"
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

function QueueRow({
  item,
  position,
  lastCheckIn,
  isLast,
}: {
  item: QueueItem;
  position: number;
  lastCheckIn: string | undefined;
  isLast: boolean;
}) {
  if (item.kind === "check-in") {
    return (
      <CheckInRow moment={item.moment} lastCheckIn={lastCheckIn} isLast={isLast} />
    );
  }
  return <ReflectionRow checkIn={item.checkIn} position={position} isLast={isLast} />;
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
  const waitingReflections = latestPerSituation.slice(0, -1).reverse();

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

  // The single prioritized queue: check-ins outrank reflections (a check-in
  // generates the next round of thinking) and each group keeps its existing
  // internal order — most-neglected check-in first, oldest reflection first.
  const queue: QueueItem[] = [
    ...needsCheckIn.map((moment): QueueItem => ({ kind: "check-in", moment })),
    ...waitingReflections.map(
      (checkIn): QueueItem => ({ kind: "reflection", checkIn }),
    ),
  ];

  const nextUp = queue.slice(0, NEXT_UP_LIMIT);
  const comingUp = queue.slice(NEXT_UP_LIMIT);
  const comingUpPreview = comingUp.slice(0, COMING_UP_PREVIEW);
  const comingUpRest = comingUp.slice(COMING_UP_PREVIEW);

  const hasWork = pending !== null || queue.length > 0;

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
              Pick up where you left off, then work down the queue.
            </p>
          </div>

          {!hasWork ? (
            <OverviewCard className="px-9 py-16">
              <div className="flex flex-col items-center text-center">
                <p className="text-[17px] font-semibold text-[#111]">
                  You&apos;re all caught up.
                </p>
                <p className="mt-2 max-w-[360px] text-[13px] leading-relaxed text-[#999999]">
                  Reflections and check-ins appear here as your situations
                  develop. Capture what&apos;s on your mind to get moving.
                </p>
                <Link
                  href="/moments/new"
                  className="mt-5 rounded-[10px] bg-[#111] px-[18px] py-2.5 text-[13px] font-semibold text-white transition-opacity duration-150 hover:opacity-[0.88]"
                >
                  Start with a situation
                </Link>
              </div>
            </OverviewCard>
          ) : (
            <div className="flex flex-col gap-8 pb-14">
              {/* 1. Continue — the hero. The situation leads; the task follows. */}
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
                      <span className="rounded-full bg-[#eef2ff] px-3 py-1 text-[11px] font-semibold text-[#047857]">
                        Reflection
                      </span>
                      {queue.length > 0 ? (
                        <span className="text-[12px] text-[#999999]">
                          {queue.length} more in your queue
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

              {/* 2. Next Up — one prioritized queue. Check-ins and reflections
                  interleave here as rows; the kind is a badge on the row, not
                  a section of the page. */}
              {nextUp.length > 0 ? (
                <section>
                  <div className="mb-4">
                    <h2 className="text-[17px] font-bold text-[#111]">
                      Next Up
                    </h2>
                    <p className="mt-[3px] text-[13px] text-[#999999]">
                      Just the next few — nothing else needs you yet
                    </p>
                  </div>
                  <OverviewCard className="px-8 py-4">
                    {nextUp.map((item, i) => (
                      <div
                        key={item.kind === "check-in" ? item.moment.id : item.checkIn.id}
                        className={
                          // The top item is the one to act on; the rest only
                          // reinforce that more follows, so they sit back
                          // until pointed at.
                          i === 0
                            ? undefined
                            : "opacity-70 transition-opacity duration-150 hover:opacity-100 focus-within:opacity-100"
                        }
                      >
                        <QueueRow
                          item={item}
                          position={i + 2}
                          lastCheckIn={
                            item.kind === "check-in"
                              ? lastCheckIns[item.moment.id]
                              : undefined
                          }
                          isLast={i === nextUp.length - 1}
                        />
                      </div>
                    ))}
                  </OverviewCard>
                </section>
              ) : null}

              {/* 3. Coming Up — a small preview of what's behind the queue.
                  Enough to give confidence there's more waiting, never so
                  much that it competes with Next Up. */}
              {comingUp.length > 0 ? (
                <section>
                  <div className="mb-4">
                    <h2 className="text-[17px] font-bold text-[#111]">
                      Coming Up
                    </h2>
                    <p className="mt-[3px] text-[13px] text-[#999999]">
                      Waiting for when you&apos;re ready
                    </p>
                  </div>
                  <OverviewCard className="px-8 py-4">
                    {comingUpPreview.map((item, i) => (
                      <QueueRow
                        key={
                          item.kind === "check-in"
                            ? item.moment.id
                            : item.checkIn.id
                        }
                        item={item}
                        position={NEXT_UP_LIMIT + i + 2}
                        lastCheckIn={
                          item.kind === "check-in"
                            ? lastCheckIns[item.moment.id]
                            : undefined
                        }
                        isLast={
                          comingUpRest.length === 0 &&
                          i === comingUpPreview.length - 1
                        }
                      />
                    ))}
                    {comingUpRest.length > 0 ? (
                      <details className="group">
                        <summary className="cursor-pointer list-none py-3 text-[13px] font-medium text-[#999999] transition-colors duration-150 hover:text-[#047857] [&::-webkit-details-marker]:hidden">
                          <span className="group-open:hidden">
                            Show {comingUpRest.length} more →
                          </span>
                          <span className="hidden group-open:inline">
                            ↑ Show fewer
                          </span>
                        </summary>
                        {comingUpRest.map((item, i) => (
                          <QueueRow
                            key={
                              item.kind === "check-in"
                                ? item.moment.id
                                : item.checkIn.id
                            }
                            item={item}
                            position={NEXT_UP_LIMIT + COMING_UP_PREVIEW + i + 2}
                            lastCheckIn={
                              item.kind === "check-in"
                                ? lastCheckIns[item.moment.id]
                                : undefined
                            }
                            isLast={i === comingUpRest.length - 1}
                          />
                        ))}
                      </details>
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

          {/* 4. Completed — progress lives at the end of the journey. The
              list itself stays collapsed until the user wants the history. */}
          {completed.length > 0 ? (
            <section className="pb-14">
              <div className="mb-4">
                <h2 className="text-[17px] font-bold text-[#111]">Completed</h2>
                <p className="mt-[3px] text-[13px] text-[#999999]">
                  {completed.length} reflection{completed.length !== 1 ? "s" : ""}{" "}
                  finished — your thinking so far
                </p>
              </div>
              <CompletedReflectionsList checkIns={completed} />
            </section>
          ) : null}
        </div>
      </main>
    </div>
  );
}
