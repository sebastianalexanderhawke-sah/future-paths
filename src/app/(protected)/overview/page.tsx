import Link from "next/link";

import { TrackView } from "@/components/analytics/track-view";
import { AppSidebar } from "@/components/overview/app-sidebar";
import { FuturePathsCard } from "@/components/overview/future-paths-card";
import {
  NeedsAttentionCard,
  type AttentionRow,
} from "@/components/overview/needs-attention-card";
import {
  WhatsChangedCard,
  type ChangeRow,
} from "@/components/overview/whats-changed-card";
import { getLastCheckInsForMoments } from "@/lib/check-ins";
import {
  getRecentFutureSelfChanges,
  listActiveFutureSelves,
} from "@/lib/future-selves";
import { listIdentityUpdates } from "@/lib/identity-updates";
import { listMoments } from "@/lib/moments";
import { getChosenPathsForMoments } from "@/lib/paths";
import { getUnansweredReflectionSummary } from "@/lib/reflections";
import { formatRelativeTime, isCheckInStale } from "@/lib/relative-time";
import { getUserIdentity } from "@/lib/user-identity";

// How far back "since you last checked in" reaches: every What's Changed
// row — movement, lifecycle transitions, and new observations alike — stays
// in the story for a week and then steps aside.
const RECENT_CHANGE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

// The metadata voice for "Created …": recent dates speak relatively
// ("Created 2 days ago"), anything older than a week names the day
// ("Created Jul 13") — a calendar date reads better than "3 weeks ago"
// once the memory of creating it has cooled.
function formatCreatedDate(dateStr: string, now = new Date()): string {
  const diffMs = now.getTime() - new Date(dateStr).getTime();
  if (diffMs < 7 * 24 * 60 * 60 * 1000) return formatRelativeTime(dateStr, now);
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default async function OverviewPage() {
  const [
    userIdentity,
    momentsResult,
    futuresResult,
    movementRows,
    reflectionSummaryResult,
    identityUpdatesResult,
  ] = await Promise.all([
    getUserIdentity(),
    listMoments(),
    listActiveFutureSelves(5),
    // What's Changed reads entirely from future_self_events: one row per
    // future, lifecycle transitions (New / Returned / Faded) outranking
    // netted movement (Strengthened / Weakened), movement sorted by
    // absolute change — see composeFutureSelfChangeRows.
    getRecentFutureSelfChanges(RECENT_CHANGE_WINDOW_MS),
    getUnansweredReflectionSummary(),
    listIdentityUpdates(10),
  ]);

  const situations = "moments" in momentsResult ? momentsResult.moments : [];
  const futureSelves =
    "futureSelves" in futuresResult ? futuresResult.futureSelves : [];
  const reflectionSummary =
    "pending" in reflectionSummaryResult ? reflectionSummaryResult : null;
  const identityUpdates =
    "identityUpdates" in identityUpdatesResult
      ? identityUpdatesResult.identityUpdates
      : [];

  const momentIds = situations.map((m) => m.id);
  const [chosenPaths, lastCheckIns] = await Promise.all([
    getChosenPathsForMoments(momentIds),
    getLastCheckInsForMoments(momentIds),
  ]);

  const now = Date.now();

  // "New observations" is honest news, not a rolling total: only signals
  // recorded inside the recency window count, and a quiet week shows none.
  const recentUpdateCount = identityUpdates.filter(
    (update) => now - Date.parse(update.created_at) <= RECENT_CHANGE_WINDOW_MS,
  ).length;

  // Identity-only, three rows maximum (UX audit 2026-07-14): the card
  // answers "how has my identity changed since I last visited?" and nothing
  // else. Future Self movement first, then the new-observations count.
  // Situation-derived updates (reflections, check-ins, forecasts, new
  // situations, chapters) never appear here — a quiet identity week shows
  // fewer rows or the empty state, honestly.
  const changeRows: ChangeRow[] = movementRows.slice(
    0,
    recentUpdateCount > 0 ? 2 : 3,
  );
  if (recentUpdateCount > 0) {
    changeRows.push({
      key: "new-observations",
      name: "New observations",
      detail: `${recentUpdateCount} added`,
      delta: null,
      kind: "added",
    });
  }

  // ── Needs Attention: overdue check-ins, waiting reflection, open decisions ──
  type RankedAttentionRow = AttentionRow & { priority: number };
  const attentionItems: RankedAttentionRow[] = [];

  for (const moment of situations) {
    // A situation with no check-ins becomes due the same 3 days after its
    // creation, not immediately — onboarding promises the first ask comes
    // "in a few days", and a minutes-old situation must never read as
    // overdue. The label stays honest either way: a first check-in is
    // "ready", only a lapsed rhythm is "overdue".
    if (isCheckInStale(lastCheckIns[moment.id] ?? moment.created_at)) {
      const lastCheckIn = lastCheckIns[moment.id];
      attentionItems.push({
        key: `checkin-${moment.id}`,
        situationName: moment.title,
        // The row's little story: before the first check-in the date says
        // where the situation came from; after, it says how long the rhythm
        // has lapsed.
        metaLabel: lastCheckIn
          ? `Last checked in ${formatRelativeTime(lastCheckIn)}`
          : `Created ${formatCreatedDate(moment.created_at)}`,
        status: lastCheckIn ? "Check-in overdue" : "First check-in ready",
        kind: "overdue",
        href: `/moments/${moment.id}#check-in`,
        priority: 0,
      });
    }
  }
  if (reflectionSummary?.pending) {
    attentionItems.push({
      key: `reflection-${reflectionSummary.pending.id}`,
      situationName: reflectionSummary.pending.moment.title,
      // A reflection row's timestamp is the question's, not the situation's.
      metaLabel: `Asked ${formatRelativeTime(reflectionSummary.pending.created_at)}`,
      status: "Reflection available",
      kind: "reflection",
      href: "/reflections",
      priority: 1,
    });
  }
  for (const moment of situations) {
    if (!chosenPaths[moment.id]) {
      attentionItems.push({
        key: `unresolved-${moment.id}`,
        situationName: moment.title,
        metaLabel: `Created ${formatCreatedDate(moment.created_at)}`,
        status: "Still deciding",
        kind: "decision",
        href: `/moments/${moment.id}`,
        priority: 2,
      });
    }
  }
  attentionItems.sort((a, b) => a.priority - b.priority);
  const visibleAttentionItems = attentionItems.slice(0, 3);
  const hiddenAttentionCount = Math.max(0, attentionItems.length - 3);

  // Until Future Selves exist the branch map below is still a lone "You" —
  // even right after the first situation — so the header says what the page
  // is becoming instead of promising movement it can't show yet.
  const isQuietStart = futureSelves.length === 0;

  return (
    <div className="flex h-screen overflow-hidden bg-[#f4f4f6] text-[#111]">
      <AppSidebar
        activeHref="/overview"
        unansweredReflections={reflectionSummary?.unansweredCount ?? 0}
        userLabel={userIdentity.displayName ?? "Your account"}
        userInitial={userIdentity.initial}
      />

      <main id="main-content" className="flex-1 overflow-y-auto">
        <TrackView event="overview_viewed" />
        <div className="mx-auto max-w-[1200px] px-10 py-10">
          {/* Page header. The greeting owns this row: its subtitle sits
              tight underneath in a legible gray, and the New-situation
              action is the platform's quiet secondary button rather than a
              second black focal point competing with the heading. */}
          <div className="mb-10 flex items-start justify-between">
            <div>
              <h1 className="font-voice mb-1 text-[34px] font-medium tracking-[-0.5px] text-[#111]">
                {getGreeting()}
                {userIdentity.displayName ? `, ${userIdentity.displayName}` : ""}.
              </h1>
              {/* #666 (not slate-500): the subtitle sits on the #f4f4f6
                  canvas, where slate-500 dips under 4.5:1. */}
              <p className="text-[15px] text-[#666666]">
                {isQuietStart
                  ? "We're still building your story. As Reflection learns from your decisions, this page becomes a snapshot of how you're changing."
                  : "Here's where your life is moving."}
              </p>
            </div>
            <Link
              href="/moments/new"
              className="shrink-0 rounded-[10px] border border-[#ececf0] bg-white px-[18px] py-2.5 text-[13px] font-semibold text-[#333333] transition-colors duration-150 hover:bg-[#f5f5f5]"
            >
              + New situation
            </Link>
          </div>

          {/* Overview Phase 3: three full-width cards — the Future Selves
              map leads as the hero (how am I changing?), the short What's
              Changed strip follows (what moved since I was here?), and
              Needs Attention closes as a full-width list (what deserves my
              attention?). The activity summary lives on Settings as
              Reflection Activity. */}
          <div className="flex flex-col gap-8 pb-16">
            <FuturePathsCard futureSelves={futureSelves} />

            <WhatsChangedCard rows={changeRows} />

            <NeedsAttentionCard
              items={visibleAttentionItems}
              hiddenCount={hiddenAttentionCount}
              totalCount={attentionItems.length}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
