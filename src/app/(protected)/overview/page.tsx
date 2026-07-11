import Link from "next/link";

import { AppSidebar } from "@/components/overview/app-sidebar";
import { FuturePathsCard } from "@/components/overview/future-paths-card";
import {
  NeedsAttentionCard,
  type AttentionRow,
} from "@/components/overview/needs-attention-card";
import { PatternEmergingCard } from "@/components/overview/pattern-emerging-card";
import {
  WhatsChangedCard,
  type ChangeRow,
} from "@/components/overview/whats-changed-card";
import { getLastCheckInsForMoments } from "@/lib/check-ins";
import { getRecentFocusAreas } from "@/lib/focus-areas";
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

  // A fade IS the strongest weakening: the engine retires a weakening path
  // in one step (status "faded", percentage 0) instead of letting it
  // decline visibly, so recent fades join as ordinary "Faded" rows whose
  // delta is the strength the path last held. Without them the card would
  // almost never show anything weakening.
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
          delta: -Math.round(lastStrength),
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

  // Three rows maximum, the observations row included.
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

  // ── Pattern Emerging: strongest active future, told as a story ───────
  // The card derives its own momentum from the row's trend; the page only
  // tallies where recent attention went (themes on the user's own recent
  // check-ins and chosen paths) for the Your Focus section.
  const topFutureSelf = futureSelves[0] ?? null;
  const focusAreas = topFutureSelf ? await getRecentFocusAreas() : [];

  return (
    <div className="flex h-screen overflow-hidden bg-[#f4f4f6] text-[#111]">
      <AppSidebar
        activeHref="/overview"
        unansweredReflections={reflectionSummary?.unansweredCount ?? 0}
        userLabel={userIdentity.displayName ?? "Your account"}
        userInitial={userIdentity.initial}
      />

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1120px] px-10 py-10">
          {/* Page header */}
          <div className="mb-10 flex items-start justify-between">
            <div>
              <h1 className="font-voice mb-1.5 text-[34px] font-medium tracking-[-0.5px] text-[#111]">
                {getGreeting()}
                {userIdentity.displayName ? `, ${userIdentity.displayName}` : ""}.
              </h1>
              <p className="text-[15px] text-[#9ca3af]">
                Here&apos;s where your life is moving.
              </p>
            </div>
            <Link
              href="/moments/new"
              className="shrink-0 rounded-xl bg-[#111] px-[18px] py-2.5 text-[13px] font-semibold text-white transition-opacity duration-150 hover:opacity-[0.88]"
            >
              + New situation
            </Link>
          </div>

          <div className="flex flex-col gap-6 pb-14">
            <FuturePathsCard futureSelves={futureSelves} />

            <div className="grid grid-cols-2 gap-6">
              <WhatsChangedCard rows={changeRows} />
              <NeedsAttentionCard
                items={visibleAttentionItems}
                hiddenCount={hiddenAttentionCount}
                totalCount={attentionItems.length}
              />
            </div>

            {topFutureSelf ? (
              <PatternEmergingCard
                futureSelf={topFutureSelf}
                focusAreas={focusAreas}
              />
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}
