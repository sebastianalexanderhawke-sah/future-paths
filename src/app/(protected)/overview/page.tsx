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
import { getFutureSelfTrend } from "@/lib/future-self-trend";
import { listActiveFutureSelves, listFutureSelves } from "@/lib/future-selves";
import { listIdentityUpdates } from "@/lib/identity-updates";
import { listMoments } from "@/lib/moments";
import { getChosenPathsForMoments } from "@/lib/paths";
import { getUnansweredReflectionSummary } from "@/lib/reflections";
import { isCheckInStale } from "@/lib/relative-time";
import { getUserIdentity } from "@/lib/user-identity";

// How far back "since you last checked in" reaches for one-off events (a
// path fading, new observations landing). Active-path movement carries its
// own since-last-run snapshot; fades and additions only carry timestamps, so
// they stay in the story for a week and then step aside.
const RECENT_CHANGE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

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
    fadedResult,
    reflectionSummaryResult,
    identityUpdatesResult,
  ] = await Promise.all([
    getUserIdentity(),
    listMoments(),
    listActiveFutureSelves(5),
    // Weakening rarely survives as a "down" delta on an active row — when a
    // path truly weakens the engine fades it out of the active set entirely
    // (see the What's Changed assembly below). Read recent fades so the card
    // can tell that side of the story too.
    listFutureSelves({ status: "faded", limit: 8 }),
    getUnansweredReflectionSummary(),
    listIdentityUpdates(10),
  ]);

  const situations = "moments" in momentsResult ? momentsResult.moments : [];
  const futureSelves =
    "futureSelves" in futuresResult ? futuresResult.futureSelves : [];
  const fadedSelves = "futureSelves" in fadedResult ? fadedResult.futureSelves : [];
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

  // ── What's Changed: a three-second summary of movement ───────────────
  // Compact by design: name, one-word qualifier, signed delta. WHY things
  // moved is Pattern Emerging's job; this card never explains.
  const movers = futureSelves
    .map((futureSelf) => ({ futureSelf, trend: getFutureSelfTrend(futureSelf) }))
    .filter(({ trend }) => trend.direction === "up" || trend.direction === "down")
    .sort((a, b) => Math.abs(b.trend.delta) - Math.abs(a.trend.delta));

  const now = Date.now();

  // Recent fades join as "Faded" rows so the card can tell that side of the
  // story — but with NO delta number. A fade is a lifecycle event (the path
  // thinned out of the recognized set, or a library update retired it), not
  // an evidence-driven score drop, and rendering its last-held strength as
  // "-31%" read as the identity model collapsing. The previous_percentage
  // filter still gates out rows that never held any strength.
  const fadeMovementRows = fadedSelves
    .filter(
      (futureSelf) =>
        now - Date.parse(futureSelf.updated_at) <= RECENT_CHANGE_WINDOW_MS,
    )
    .slice(0, 2)
    .flatMap((futureSelf) => {
      const lastStrength = futureSelf.previous_percentage;
      if (lastStrength === null || lastStrength <= 0) return [];
      return [
        {
          key: futureSelf.id,
          name: futureSelf.name,
          detail: "Faded",
          delta: null,
          kind: "down" as const,
        },
      ];
    });

  const movementRows = [
    ...movers.map(({ futureSelf, trend }) => ({
      key: futureSelf.id,
      name: futureSelf.name,
      detail: trend.direction === "up" ? "Strengthened" : "Weakened",
      delta: Math.round(trend.delta),
      kind: trend.direction === "up" ? ("up" as const) : ("down" as const),
    })),
    ...fadeMovementRows,
  ].sort((a, b) => Math.abs(b.delta ?? 0) - Math.abs(a.delta ?? 0));

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
    if (isCheckInStale(lastCheckIns[moment.id])) {
      attentionItems.push({
        key: `checkin-${moment.id}`,
        situationName: moment.title,
        status: "Check-in overdue",
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

  // Before anything has been recorded, the page can't yet show where life is
  // moving — the header says what it is becoming instead of overpromising.
  const isQuietStart = situations.length === 0 && futureSelves.length === 0;

  return (
    <div className="flex h-screen overflow-hidden bg-[#f4f4f6] text-[#111]">
      <AppSidebar
        activeHref="/overview"
        unansweredReflections={reflectionSummary?.unansweredCount ?? 0}
        userLabel={userIdentity.displayName ?? "Your account"}
        userInitial={userIdentity.initial}
      />

      <main className="flex-1 overflow-y-auto">
        <TrackView event="overview_viewed" />
        <div className="mx-auto max-w-[1120px] px-10 py-10">
          {/* Page header */}
          <div className="mb-10 flex items-start justify-between">
            <div>
              <h1 className="font-voice mb-1.5 text-[34px] font-medium tracking-[-0.5px] text-[#111]">
                {getGreeting()}
                {userIdentity.displayName ? `, ${userIdentity.displayName}` : ""}.
              </h1>
              <p className="text-[15px] text-[#9ca3af]">
                {isQuietStart
                  ? "We're still building your story. As Reflection learns from your decisions, this page becomes a snapshot of how you're changing."
                  : "Here's where your life is moving."}
              </p>
            </div>
            <Link
              href="/moments/new"
              className="shrink-0 rounded-xl bg-[#111] px-[18px] py-2.5 text-[13px] font-semibold text-white transition-opacity duration-150 hover:opacity-[0.88]"
            >
              + New situation
            </Link>
          </div>

          {/* Overview Phase 2: three cards, two questions — Future Selves
              (how am I changing?), then What's Changed + Needs Attention
              (what deserves my attention?). The activity summary lives on
              Settings as Reflection Activity; with the fourth card gone the
              remaining pair breathes wider (gap-8) instead of the page
              pretending a card is missing. */}
          <div className="flex flex-col gap-8 pb-16">
            <FuturePathsCard futureSelves={futureSelves} />

            <div className="grid grid-cols-2 gap-8">
              <WhatsChangedCard rows={changeRows} />
              <NeedsAttentionCard
                items={visibleAttentionItems}
                hiddenCount={hiddenAttentionCount}
                totalCount={attentionItems.length}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
