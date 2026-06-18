import Link from "next/link";

import { CurrentSelfHomeSection } from "@/components/home/current-self-home-section";
import { FutureSelfHomeSection } from "@/components/home/future-self-home-section";
import { toFirstSentence } from "@/components/home/output-refinement";
import { MomentCard } from "@/components/moments/moment-card";
import { OverviewHeader } from "@/components/overview/overview-header";
import { OverviewPageShell } from "@/components/overview/overview-page-shell";
import { OverviewSection } from "@/components/overview/overview-section";
import {
  getLastCheckInRealityForMoments,
  getLastCheckInsForMoments,
} from "@/lib/check-ins";
import { getCurrentSelf } from "@/lib/current-self";
import { listActiveFutureSelves } from "@/lib/future-selves";
import { listArchivedMoments, listMoments } from "@/lib/moments";
import { getChosenPathsForMoments } from "@/lib/paths";
import { getUnansweredReflectionSummary } from "@/lib/reflections";
import { formatRelativeTime, isCheckInStale } from "@/lib/relative-time";
import { listRecentTimelineEvents } from "@/lib/timeline";
import type { Moment, TimelineEvent } from "@/types/database";

const ATTENTION_VISIBLE_LIMIT = 5;
const TIMELINE_VISIBLE_LIMIT = 5;
// Event types that represent an actual identity-relevant moment, not the
// procedural mechanics of creating a situation or generating options.
const IDENTITY_TIMELINE_EVENT_TYPES = new Set<TimelineEvent["event_type"]>([
  "path_chosen",
  "identity_update",
  "check_in_recorded",
]);

function formatMonthYear(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

function formatResolvedDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Check-in reality summaries are stored as "Reality: <fact>. What changed:
// <delta>." — strip the label and keep just the first clause so homepage
// entries read as a short headline, not a mini-essay.
function toCompactHeadline(text: string): string {
  return toFirstSentence(text.replace(/^reality:\s*/i, "").trim());
}

function timelineEventHeadline(event: TimelineEvent): string {
  if (event.event_type === "identity_update") {
    return toFirstSentence(event.title);
  }

  return toCompactHeadline(event.summary ?? event.title);
}

export default async function OverviewPage() {
  const [
    momentsResult,
    archivedResult,
    futuresResult,
    currentSelfResult,
    reflectionSummaryResult,
    timelineEventsResult,
  ] = await Promise.all([
    listMoments(),
    listArchivedMoments(),
    listActiveFutureSelves(3),
    getCurrentSelf(),
    getUnansweredReflectionSummary(),
    listRecentTimelineEvents(20),
  ]);

  const situations = "moments" in momentsResult ? momentsResult.moments : [];
  const resolvedSituations = "moments" in archivedResult ? archivedResult.moments : [];
  const futureSelves = "futureSelves" in futuresResult ? futuresResult.futureSelves : [];
  const currentSelf =
    "currentSelf" in currentSelfResult ? currentSelfResult.currentSelf : null;
  const unansweredCount =
    "unansweredCount" in reflectionSummaryResult
      ? reflectionSummaryResult.unansweredCount
      : 0;
  const pendingReflection =
    "pending" in reflectionSummaryResult ? reflectionSummaryResult.pending : null;
  const timelineEvents = "events" in timelineEventsResult ? timelineEventsResult.events : [];

  const momentIds = situations.map((m) => m.id);
  const [chosenPaths, lastCheckIns, lastRealities] = await Promise.all([
    getChosenPathsForMoments(momentIds),
    getLastCheckInsForMoments(momentIds),
    getLastCheckInRealityForMoments(momentIds),
  ]);

  const enrichments = Object.fromEntries(
    momentIds.map((id) => [
      id,
      {
        chosenPathTitle: chosenPaths[id],
        lastCheckIn: lastCheckIns[id] ? { created_at: lastCheckIns[id] } : undefined,
      },
    ]),
  );

  const hasAnySituations = situations.length > 0;

  // Needs attention: a small, prioritized stack — not every open thread.
  // Priority order: overdue check-ins, then a waiting forecast/reflection
  // follow-up, then situations that were never taken past "exploring."
  // Anything beyond the visible limit collapses behind "View all" instead of
  // being silently capped, so nothing is lost — just deferred.
  type AttentionItem = { key: string; label: string; href: string; priority: number };
  const attentionItems: AttentionItem[] = [];

  for (const moment of situations) {
    if (isCheckInStale(enrichments[moment.id]?.lastCheckIn?.created_at)) {
      attentionItems.push({
        key: `checkin-${moment.id}`,
        label: `Check-in overdue — ${moment.title}`,
        href: `/moments/${moment.id}#check-in`,
        priority: 0,
      });
    }
  }

  if (unansweredCount > 0 && pendingReflection) {
    attentionItems.push({
      key: `reflection-${pendingReflection.id}`,
      label: `Forecast update waiting — ${pendingReflection.moment.title}`,
      href: `/moments/${pendingReflection.moment_id}#check-in`,
      priority: 1,
    });
  }

  for (const moment of situations) {
    if (!enrichments[moment.id]?.chosenPathTitle) {
      attentionItems.push({
        key: `unresolved-${moment.id}`,
        label: `Still deciding — ${moment.title}`,
        href: `/moments/${moment.id}`,
        priority: 2,
      });
    }
  }

  attentionItems.sort((a, b) => a.priority - b.priority);
  const visibleAttentionItems = attentionItems.slice(0, ATTENTION_VISIBLE_LIMIT);
  const hiddenAttentionItems = attentionItems.slice(ATTENTION_VISIBLE_LIMIT);

  // Recent reality: the latest lived outcome per situation, as a short
  // headline + relative time — not the full check-in summary.
  const recentReality = situations
    .map((moment) => ({ moment, reality: lastRealities[moment.id] }))
    .filter(
      (entry): entry is { moment: Moment; reality: { created_at: string; reality_summary: string } } =>
        entry.reality !== undefined,
    )
    .sort((a, b) => new Date(b.reality.created_at).getTime() - new Date(a.reality.created_at).getTime())
    .slice(0, 5);

  // Timeline: identity-relevant events (a path chosen, a reality lived, an
  // identity shift detected) — not raw "situation created" entries.
  const timelineItems = timelineEvents
    .filter((event) => IDENTITY_TIMELINE_EVENT_TYPES.has(event.event_type))
    .slice(0, TIMELINE_VISIBLE_LIMIT);

  return (
    <OverviewPageShell header={<OverviewHeader />}>

      {/* 1. CURRENT SELF — who am I now? */}
      <CurrentSelfHomeSection currentSelf={currentSelf} />

      {/* 2. ACTIVE SITUATIONS — what am I navigating? */}
      {hasAnySituations ? (
        <OverviewSection
          label="Situations"
          title="What am I navigating?"
          viewAllHref="/moments"
          viewAllLabel="All situations"
        >
          <div className="flex flex-col gap-3">
            {situations.slice(0, 5).map((moment) => (
              <MomentCard
                key={moment.id}
                moment={moment}
                chosenPathTitle={enrichments[moment.id]?.chosenPathTitle}
                lastCheckIn={enrichments[moment.id]?.lastCheckIn}
              />
            ))}
          </div>
          <div className="pt-1">
            <Link
              href="/moments/new"
              className="text-sm text-zinc-500 underline-offset-4 hover:text-zinc-900 hover:underline"
            >
              + New situation
            </Link>
          </div>
        </OverviewSection>
      ) : (
        <section className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-white px-8 py-16 text-center">
          <h2 className="text-xl font-semibold text-zinc-900">
            What situation is weighing on you right now?
          </h2>
          <p className="mx-auto mt-3 max-w-sm text-sm text-zinc-500">
            Future Paths will help you think through your options and track what
            you&apos;re learning about yourself as you navigate it.
          </p>
          <Link
            href="/moments/new"
            className="mt-8 rounded-xl bg-zinc-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
          >
            Create your first situation
          </Link>
        </section>
      )}

      {/* 3. NEEDS ATTENTION — what needs action? */}
      {visibleAttentionItems.length > 0 ? (
        <OverviewSection label="Attention" title="What needs attention?">
          <ul className="flex flex-col gap-2">
            {visibleAttentionItems.map((item) => (
              <li key={item.key}>
                <Link
                  href={item.href}
                  className="block rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 hover:border-zinc-300"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          {hiddenAttentionItems.length > 0 ? (
            <details className="group">
              <summary className="cursor-pointer list-none text-sm text-zinc-400 hover:text-zinc-600 [&::-webkit-details-marker]:hidden">
                <span className="group-open:hidden">
                  View all ({hiddenAttentionItems.length} more)
                </span>
                <span className="hidden group-open:inline">Hide</span>
              </summary>
              <ul className="mt-2 flex flex-col gap-2">
                {hiddenAttentionItems.map((item) => (
                  <li key={item.key}>
                    <Link
                      href={item.href}
                      className="block rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 hover:border-zinc-300"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </OverviewSection>
      ) : null}

      {/* 4. RECENT REALITY — what changed recently? */}
      {recentReality.length > 0 ? (
        <OverviewSection label="Reality" title="What changed recently?">
          <ul className="flex flex-col gap-2">
            {recentReality.map(({ moment, reality }) => (
              <li key={moment.id}>
                <Link
                  href={`/moments/${moment.id}`}
                  className="block rounded-lg border border-zinc-200 bg-white px-4 py-2.5 hover:border-zinc-300"
                >
                  <p className="text-sm text-zinc-900">
                    {toCompactHeadline(reality.reality_summary)}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-400">
                    {formatRelativeTime(reality.created_at)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </OverviewSection>
      ) : null}

      {/* 5. FUTURE SELVES — who might I be becoming? */}
      <FutureSelfHomeSection futureSelves={futureSelves} />

      {/* 6. TIMELINE — meaningful identity events, not raw situation names */}
      {timelineItems.length > 0 ? (
        <OverviewSection label="Timeline" title="Recent chapters" viewAllHref="/timeline">
          <ul className="flex flex-col gap-2">
            {timelineItems.map((event) => {
              const headline = timelineEventHeadline(event);
              const momentId = event.metadata.moment_id;
              return (
                <li key={event.id} className="flex items-baseline gap-3">
                  <span className="w-28 shrink-0 text-xs text-zinc-400">
                    {formatMonthYear(event.occurred_at)}
                  </span>
                  {momentId ? (
                    <Link
                      href={`/moments/${momentId}`}
                      className="text-sm text-zinc-900 hover:underline underline-offset-2"
                    >
                      {headline}
                    </Link>
                  ) : (
                    <span className="text-sm text-zinc-900">{headline}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </OverviewSection>
      ) : null}

      {/* 7. RESOLVED SITUATIONS — collapsed by default */}
      {resolvedSituations.length > 0 ? (
        <section className="flex flex-col gap-3">
          <details className="group rounded-xl border border-zinc-200 bg-white">
            <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-3.5 text-sm [&::-webkit-details-marker]:hidden">
              <span className="text-zinc-500">
                Resolved situations ({resolvedSituations.length})
              </span>
              <span aria-hidden="true" className="text-zinc-400">
                <span className="group-open:hidden">↓</span>
                <span className="hidden group-open:inline">↑</span>
              </span>
            </summary>
            <ul className="flex flex-col gap-2 border-t border-zinc-100 px-5 pb-4 pt-3">
              {resolvedSituations.map((moment) => (
                <li key={moment.id} className="flex items-baseline justify-between gap-3">
                  <Link
                    href={`/moments/${moment.id}`}
                    className="text-sm text-zinc-700 hover:underline underline-offset-2"
                  >
                    {moment.title}
                  </Link>
                  <span className="shrink-0 text-xs text-zinc-400">
                    {formatResolvedDate(moment.updated_at)}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        </section>
      ) : null}

    </OverviewPageShell>
  );
}
