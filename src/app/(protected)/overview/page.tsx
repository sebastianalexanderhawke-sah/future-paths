import Link from "next/link";

import { AppSidebar } from "@/components/overview/app-sidebar";
import { FuturePathsCard } from "@/components/overview/future-paths-card";
import {
  NeedsAttentionCard,
  type AttentionRow,
} from "@/components/overview/needs-attention-card";
import {
  PatternEmergingCard,
  type PatternImpactRow,
} from "@/components/overview/pattern-emerging-card";
import {
  SinceLastVisitCard,
  type SinceLastVisitItem,
} from "@/components/overview/since-last-visit-card";
import {
  WhatsChangedCard,
  type ChangeRow,
} from "@/components/overview/whats-changed-card";
import { getLastCheckInsForMoments } from "@/lib/check-ins";
import { getCurrentSelf } from "@/lib/current-self";
import { getFutureSelfTrend } from "@/lib/future-self-trend";
import { listActiveFutureSelves } from "@/lib/future-selves";
import { listIdentityUpdates } from "@/lib/identity-updates";
import { listMoments } from "@/lib/moments";
import { getLatestSettledChapter } from "@/lib/monthly-identity-narrative";
import { getChosenPathsForMoments } from "@/lib/paths";
import { getUnansweredReflectionSummary } from "@/lib/reflections";
import { isCheckInStale } from "@/lib/relative-time";
import { getUserIdentity } from "@/lib/user-identity";

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
    reflectionSummaryResult,
    identityUpdatesResult,
    currentSelfResult,
    latestChapter,
  ] = await Promise.all([
    getUserIdentity(),
    listMoments(),
    listActiveFutureSelves(5),
    getUnansweredReflectionSummary(),
    listIdentityUpdates(5),
    getCurrentSelf(),
    getLatestSettledChapter(),
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
  const currentSelf =
    "currentSelf" in currentSelfResult ? currentSelfResult.currentSelf : null;

  const momentIds = situations.map((m) => m.id);
  const [chosenPaths, lastCheckIns] = await Promise.all([
    getChosenPathsForMoments(momentIds),
    getLastCheckInsForMoments(momentIds),
  ]);

  // ── What's Changed: Future Self movement + new observations ──────────
  const movers = futureSelves
    .map((futureSelf) => ({ futureSelf, trend: getFutureSelfTrend(futureSelf) }))
    .filter(({ trend }) => trend.direction === "up" || trend.direction === "down")
    .sort((a, b) => Math.abs(b.trend.delta) - Math.abs(a.trend.delta));

  const changeRows: ChangeRow[] = movers
    .slice(0, identityUpdates.length > 0 ? 2 : 3)
    .map(({ futureSelf, trend }) => ({
      key: futureSelf.id,
      name: futureSelf.name,
      detail: trend.direction === "up" ? "Strengthened" : "Weakened",
      delta: Math.round(trend.delta),
      kind: trend.direction === "up" ? ("up" as const) : ("down" as const),
    }));

  if (identityUpdates.length > 0) {
    changeRows.push({
      key: "new-observations",
      name: "New observations",
      detail: `${identityUpdates.length} added`,
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
        statusColor: "#ef4444",
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
      statusColor: "#f59e0b",
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
        statusColor: "#3b82f6",
        href: `/moments/${moment.id}`,
        priority: 2,
      });
    }
  }
  attentionItems.sort((a, b) => a.priority - b.priority);
  const visibleAttentionItems = attentionItems.slice(0, 3);
  const hiddenAttentionCount = Math.max(0, attentionItems.length - 3);

  // ── Pattern Emerging: strongest active future + recent movement ──────
  const topFutureSelf = futureSelves[0] ?? null;
  const patternImpacts: PatternImpactRow[] = movers
    .slice(0, 3)
    .map(({ futureSelf, trend }) => ({
      key: futureSelf.id,
      name: futureSelf.name,
      delta: Math.round(trend.delta),
    }));

  // ── Since your last visit: outcome digest ────────────────────────────
  // Every candidate carries its own timestamp; the client component shows
  // only what happened after the reader was last here. Outcomes, never
  // mechanics — one calm card, one line per change.
  const sinceLastVisitItems: SinceLastVisitItem[] = [];
  if (reflectionSummary?.pending) {
    sinceLastVisitItems.push({
      key: "reflection-waiting",
      text: "A new reflection is waiting for you.",
      href: "/reflections",
      at: reflectionSummary.pending.created_at,
    });
  }
  if (currentSelf) {
    sinceLastVisitItems.push({
      key: "current-self",
      text: "Your Current Self evolved.",
      href: "/current-self",
      at: currentSelf.updated_at,
    });
  }
  const topMover = movers[0];
  if (topMover) {
    sinceLastVisitItems.push({
      key: `future-${topMover.futureSelf.id}`,
      text:
        topMover.trend.direction === "up"
          ? `${topMover.futureSelf.name} became more likely.`
          : `${topMover.futureSelf.name} became less likely.`,
      href: "/future-selves",
      at: topMover.futureSelf.updated_at,
    });
  }
  if (latestChapter) {
    sinceLastVisitItems.push({
      key: `chapter-${latestChapter.month}`,
      text: `Your Timeline has a new chapter: ${latestChapter.month}.`,
      href: "/timeline",
      at: latestChapter.generatedAt,
    });
  }

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
              <h1 className="mb-1.5 text-[32px] font-extrabold tracking-[-0.8px] text-[#111]">
                {getGreeting()}
                {userIdentity.displayName ? `, ${userIdentity.displayName}` : ""}.
              </h1>
              <p className="text-[15px] text-[#999999]">
                Here&apos;s where your life is moving.
              </p>
            </div>
            <Link
              href="/moments/new"
              className="shrink-0 rounded-[10px] bg-[#111] px-[18px] py-2.5 text-[13px] font-semibold text-white transition-opacity duration-150 hover:opacity-[0.88]"
            >
              + New situation
            </Link>
          </div>

          <div className="flex flex-col gap-5 pb-14">
            <SinceLastVisitCard items={sinceLastVisitItems} />

            <FuturePathsCard futureSelves={futureSelves} />

            <div className="grid grid-cols-2 gap-5">
              <WhatsChangedCard rows={changeRows} />
              <NeedsAttentionCard
                items={visibleAttentionItems}
                hiddenCount={hiddenAttentionCount}
              />
            </div>

            {topFutureSelf ? (
              <PatternEmergingCard
                futureSelf={topFutureSelf}
                impacts={patternImpacts}
              />
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}
