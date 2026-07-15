import Link from "next/link";

import { AppSidebar } from "@/components/overview/app-sidebar";
import { OverviewCard } from "@/components/overview/overview-card";
import { CompletedReflectionsList } from "@/components/reflections/completed-reflections-list";
import { ReflectionPredictionCard } from "@/components/reflections/reflection-prediction-card";
import { SituationTitleExpander } from "@/components/reflections/situation-title-expander";
import { PageLoadError } from "@/components/ui/page-load-error";
import { getLastCheckInsForMoments } from "@/lib/check-ins";
import { listMoments } from "@/lib/moments";
import { listReflectionCheckIns, type ReflectionCheckIn } from "@/lib/reflections";
import { formatRelativeTime, isCheckInStale } from "@/lib/relative-time";
import { getUserIdentity } from "@/lib/user-identity";
import type { Moment } from "@/types/database";

// Each section shows just enough rows to work from; everything past the
// preview hides behind a single expansion control, as before.
const LIST_PREVIEW = 4;

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

/**
 * The reason line answers "why is this ready for a check-in?" — either
 * enough time has passed for the situation (and the forecasts built on it)
 * to have drifted, or Reflection has never seen how it's going at all.
 */
function checkInReason(lastCheckIn: string | undefined): string {
  return lastCheckIn
    ? `Last check-in ${formatRelativeTime(lastCheckIn)} — enough time has passed for this to have changed.`
    : "No check-ins yet — Reflection can learn something new about this situation.";
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
          {checkInReason(lastCheckIn)}
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

/** The same folded-list control the queue used: preview, then one control. */
function ShowMoreSummary({ count }: { count: number }) {
  return (
    <summary className="cursor-pointer list-none py-3 text-[13px] font-medium text-[#999999] transition-colors duration-150 hover:text-[#047857] [&::-webkit-details-marker]:hidden">
      <span className="group-open:hidden">Show {count} more →</span>
      <span className="hidden group-open:inline">↑ Show fewer</span>
    </summary>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-[17px] font-bold text-[#111]">{title}</h2>
      <p className="mt-[3px] text-[13px] text-[#888888]">{subtitle}</p>
    </div>
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
      <PageLoadError retryHref="/reflections" message={reflectionsResult.error} />
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

  // The longest-waiting reflection opens the Reflections section expanded,
  // question and answer box ready; the rest queue behind it, oldest first.
  const pending =
    latestPerSituation.length > 0
      ? latestPerSituation[latestPerSituation.length - 1]
      : null;
  const waitingReflections = latestPerSituation.slice(0, -1).reverse();
  const waitingPreview = waitingReflections.slice(0, LIST_PREVIEW);
  const waitingRest = waitingReflections.slice(LIST_PREVIEW);

  // Check-ins due — existing staleness rule, minus situations already
  // surfaced by a reflection, prioritized most-neglected first.
  const activeMoments =
    "moments" in momentsResult ? momentsResult.moments : [];
  const lastCheckIns = await getLastCheckInsForMoments(
    activeMoments.map((m) => m.id),
  );
  const needsCheckIn = activeMoments
    // Never-checked-in situations become due 3 days after creation rather
    // than instantly, matching both the row's own reason line ("enough time
    // has passed") and onboarding's "in a few days" promise. Checking in
    // earlier stays available on the situation page itself.
    .filter(
      (moment) =>
        !seenMoments.has(moment.id) &&
        isCheckInStale(lastCheckIns[moment.id] ?? moment.created_at),
    )
    .sort((a, b) => {
      const aTime = lastCheckIns[a.id] ? new Date(lastCheckIns[a.id]).getTime() : 0;
      const bTime = lastCheckIns[b.id] ? new Date(lastCheckIns[b.id]).getTime() : 0;
      return aTime - bTime;
    });
  const checkInPreview = needsCheckIn.slice(0, LIST_PREVIEW);
  const checkInRest = needsCheckIn.slice(LIST_PREVIEW);

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
              Check in on what&apos;s changed, then continue your reflections.
            </p>
          </div>

          {!hasWork ? (
            // Two quiet states share this card: a workspace that has never
            // had anything to do (no situations to draw work from) and one
            // that is simply caught up. The first explains what the page is
            // for; the second promises what will arrive.
            activeMoments.length === 0 && completed.length === 0 ? (
              <OverviewCard className="px-9 py-16">
                <div className="flex flex-col items-center text-center">
                  <p className="font-voice text-[22px] font-medium tracking-[-0.3px] text-[#111]">
                    Your workspace is waiting for its first situation.
                  </p>
                  <p className="mt-3 max-w-[440px] text-[13px] leading-relaxed text-[#999999]">
                    This is where Reflection brings the work to you — a
                    check-in when a situation has had time to move, a question
                    worth sitting with after something meaningful happens.
                    Start a situation and this page begins filling on its own.
                  </p>
                  <Link
                    href="/moments/new"
                    className="mt-6 rounded-[10px] bg-[#111] px-[18px] py-2.5 text-[13px] font-semibold text-white transition-opacity duration-150 hover:opacity-[0.88]"
                  >
                    Create your first situation
                  </Link>
                </div>
              </OverviewCard>
            ) : (
              <OverviewCard className="px-9 py-16">
                <div className="flex flex-col items-center text-center">
                  <p className="text-[17px] font-semibold text-[#111]">
                    You&apos;re all caught up.
                  </p>
                  <p className="mt-2 max-w-[400px] text-[13px] leading-relaxed text-[#999999]">
                    New reflections and check-ins will appear here as your
                    situations evolve — once enough time passes for something
                    to have changed, Reflection will ask about it.
                  </p>
                  <Link
                    href="/moments"
                    className="mt-5 text-[13px] font-medium text-[#999999] transition-colors duration-150 hover:text-[#047857]"
                  >
                    Revisit your situations →
                  </Link>
                </div>
              </OverviewCard>
            )
          ) : (
            <div className="flex flex-col gap-8 pb-14">
              {/* 1. Check-ins — reality first: what may have moved since the
                  last visit. Each row says why it's ready. */}
              {needsCheckIn.length > 0 ? (
                <section>
                  <SectionHeader
                    title="Check-ins"
                    subtitle="Situations that may have changed since you last visited them."
                  />
                  <OverviewCard className="px-8 py-4">
                    {checkInPreview.map((moment, i) => (
                      <CheckInRow
                        key={moment.id}
                        moment={moment}
                        lastCheckIn={lastCheckIns[moment.id]}
                        isLast={
                          checkInRest.length === 0 &&
                          i === checkInPreview.length - 1
                        }
                      />
                    ))}
                    {checkInRest.length > 0 ? (
                      <details className="group">
                        <ShowMoreSummary count={checkInRest.length} />
                        {checkInRest.map((moment, i) => (
                          <CheckInRow
                            key={moment.id}
                            moment={moment}
                            lastCheckIn={lastCheckIns[moment.id]}
                            isLast={i === checkInRest.length - 1}
                          />
                        ))}
                      </details>
                    ) : null}
                  </OverviewCard>
                </section>
              ) : null}

              {/* 2. Reflections — the active one opens the section, question
                  and answer box ready; the rest wait as compact rows. */}
              {pending ? (
                <section>
                  <SectionHeader
                    title="Reflections"
                    subtitle="Situations waiting for deeper thought."
                  />
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
                      {waitingReflections.length > 0 ? (
                        <span className="text-[12px] text-[#999999]">
                          {waitingReflections.length} more waiting below
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

                  {waitingReflections.length > 0 ? (
                    <OverviewCard className="mt-4 px-8 py-4">
                      {waitingPreview.map((checkIn, i) => (
                        <ReflectionRow
                          key={checkIn.id}
                          checkIn={checkIn}
                          position={i + 2}
                          isLast={
                            waitingRest.length === 0 &&
                            i === waitingPreview.length - 1
                          }
                        />
                      ))}
                      {waitingRest.length > 0 ? (
                        <details className="group">
                          <ShowMoreSummary count={waitingRest.length} />
                          {waitingRest.map((checkIn, i) => (
                            <ReflectionRow
                              key={checkIn.id}
                              checkIn={checkIn}
                              position={LIST_PREVIEW + i + 2}
                              isLast={i === waitingRest.length - 1}
                            />
                          ))}
                        </details>
                      ) : null}
                    </OverviewCard>
                  ) : null}
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

          {/* 3. Completed — progress lives at the end of the journey. The
              list itself stays collapsed until the user wants the history. */}
          {completed.length > 0 ? (
            <section className="pb-14">
              <div className="mb-4">
                <h2 className="text-[17px] font-bold text-[#111]">Completed</h2>
                <p className="mt-[3px] text-[13px] text-[#888888]">
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
