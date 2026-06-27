import Link from "next/link";

import { CurrentSelfHomeSection } from "@/components/home/current-self-home-section";
import { FutureSelfHomeSection } from "@/components/home/future-self-home-section";
import { toFirstSentence } from "@/components/home/output-refinement";
import { ReflectionWaitingHomeSection } from "@/components/home/reflection-waiting-home-section";
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
import { loadMonthlyIdentityNarratives } from "@/lib/monthly-identity-narrative";
import { getChosenPathsForMoments } from "@/lib/paths";
import { getUnansweredReflectionSummary } from "@/lib/reflections";
import { formatRelativeTime, isCheckInStale } from "@/lib/relative-time";
import type { Moment } from "@/types/database";

const ATTENTION_VISIBLE_LIMIT = 5;
const MONTHLY_OVERVIEW_LIMIT = 3;

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

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

const FEED_DOT_COLORS = [
  { border: "#34D399", bg: "#071512" },
  { border: "#38BDF8", bg: "#060C18" },
  { border: "#FB7185", bg: "#140810" },
  { border: "#F59E0B", bg: "#100900" },
];

const ATTENTION_DOT_COLORS = ["#F59E0B", "#F59E0B", "#F59E0B"];

export default async function OverviewPage() {
  const [
    momentsResult,
    archivedResult,
    futuresResult,
    currentSelfResult,
    reflectionSummaryResult,
    narrativesResult,
  ] = await Promise.all([
    listMoments(),
    listArchivedMoments(),
    listActiveFutureSelves(3),
    getCurrentSelf(),
    getUnansweredReflectionSummary(),
    loadMonthlyIdentityNarratives(),
  ]);

  const situations = "moments" in momentsResult ? momentsResult.moments : [];
  const resolvedSituations = "moments" in archivedResult ? archivedResult.moments : [];
  const futureSelves = "futureSelves" in futuresResult ? futuresResult.futureSelves : [];
  const currentSelf =
    "currentSelf" in currentSelfResult ? currentSelfResult.currentSelf : null;
  const pendingReflection =
    "pending" in reflectionSummaryResult ? reflectionSummaryResult.pending : null;

  const monthlyNarratives = "narratives" in narrativesResult ? narrativesResult.narratives.slice(0, MONTHLY_OVERVIEW_LIMIT) : [];

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

  // Count situations that have at least one check-in for the stat box
  const checkInCount = momentIds.filter((id) => !!lastCheckIns[id]).length;

  // Needs attention: a small, prioritized stack — not every open thread.
  // Priority order: overdue check-ins, then a waiting forecast/reflection
  // follow-up, then situations that were never taken past "exploring."
  // Anything beyond the visible limit collapses behind "View all" instead of
  // being silently capped, so nothing is lost — just deferred.
  type AttentionItem = { key: string; label: string; situationName: string; href: string; priority: number };
  const attentionItems: AttentionItem[] = [];

  for (const moment of situations) {
    if (isCheckInStale(enrichments[moment.id]?.lastCheckIn?.created_at)) {
      attentionItems.push({
        key: `checkin-${moment.id}`,
        label: "Check-in overdue",
        situationName: moment.title,
        href: `/moments/${moment.id}#check-in`,
        priority: 0,
      });
    }
  }

  for (const moment of situations) {
    if (!enrichments[moment.id]?.chosenPathTitle) {
      attentionItems.push({
        key: `unresolved-${moment.id}`,
        label: "Still deciding",
        situationName: moment.title,
        href: `/moments/${moment.id}`,
        priority: 2,
      });
    }
  }

  attentionItems.sort((a, b) => a.priority - b.priority);
  // Hard limit: show max 3 attention items on overview (per spec)
  const visibleAttentionItems = attentionItems.slice(0, 3);
  const hiddenAttentionCount = Math.max(0, attentionItems.length - 3);

  // Recent reality: the latest lived outcome per situation, as a short
  // headline + relative time — not the full check-in summary.
  const recentReality = situations
    .map((moment) => ({ moment, reality: lastRealities[moment.id] }))
    .filter(
      (entry): entry is { moment: Moment; reality: { created_at: string; reality_summary: string } } =>
        entry.reality !== undefined,
    )
    .sort((a, b) => new Date(b.reality.created_at).getTime() - new Date(a.reality.created_at).getTime())
    .slice(0, 4);

  // Resolved this month (for the timeline section)
  const now = new Date();
  const currentMonthResolved = resolvedSituations.filter((m) => {
    const d = new Date(m.updated_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const greeting = getGreeting();
  const latestNarrative = monthlyNarratives[0] ?? null;

  return (
    <OverviewPageShell header={<OverviewHeader />}>

      {/* ── Greeting ─────────────────────────────────────────── */}
      <div
        style={{
          textAlign: "center",
          paddingTop: "48px",
          paddingBottom: "52px",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <p
          style={{
            fontSize: "10px",
            color: "#222",
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            marginBottom: "10px",
          }}
        >
          {greeting}
        </p>
        <h1
          style={{
            fontSize: "30px",
            fontWeight: 700,
            color: "#C8C8C8",
            letterSpacing: "-0.8px",
            lineHeight: 1.15,
            margin: 0,
          }}
        >
          Here&apos;s where things
          <br />
          stand{" "}
          <span style={{ color: "#fff", fontWeight: 700 }}>today</span>
        </h1>
        {/* Divider */}
        <div
          style={{
            marginTop: "32px",
            height: "1px",
            background: "linear-gradient(to right, transparent, #15151E, transparent)",
          }}
        />
      </div>

      {/* ── Section 1: Current Self ───────────────────────────── */}
      <CurrentSelfHomeSection currentSelf={currentSelf} />

      {/* ── Section 2: Your Situations ───────────────────────── */}
      {hasAnySituations ? (
        <OverviewSection
          label="Situations"
          title="What you're navigating"
          viewAllHref="/moments"
          viewAllLabel="All situations →"
        >
          {/* Stats row */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "10px",
              marginBottom: "10px",
            }}
          >
            {/* Active count */}
            <Link
              href="/moments"
              style={{
                backgroundColor: "#0E0900",
                border: "1px solid #201400",
                borderRadius: "16px",
                padding: "20px",
                cursor: "pointer",
                textDecoration: "none",
                display: "block",
                transition: "border-color 0.2s",
              }}
              className="hover:border-[#222]"
            >
              <p
                style={{
                  fontSize: "9px",
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  color: "#553300",
                  textTransform: "uppercase",
                  marginBottom: "8px",
                  fontFamily: "system-ui, -apple-system, sans-serif",
                }}
              >
                Active
              </p>
              <p
                style={{
                  fontSize: "36px",
                  fontWeight: 800,
                  color: "#F59E0B",
                  letterSpacing: "-1.2px",
                  lineHeight: 1,
                  marginBottom: "4px",
                }}
              >
                {situations.length}
              </p>
              <p
                style={{
                  fontSize: "11px",
                  color: "#553300",
                  opacity: 0.4,
                  fontFamily: "system-ui, -apple-system, sans-serif",
                }}
              >
                situations open
              </p>
            </Link>

            {/* Check-ins count */}
            <Link
              href="/moments"
              style={{
                backgroundColor: "#060E08",
                border: "1px solid #0A1E0E",
                borderRadius: "16px",
                padding: "20px",
                cursor: "pointer",
                textDecoration: "none",
                display: "block",
                transition: "border-color 0.2s",
              }}
              className="hover:border-[#222]"
            >
              <p
                style={{
                  fontSize: "9px",
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  color: "#0E2830",
                  textTransform: "uppercase",
                  marginBottom: "8px",
                  fontFamily: "system-ui, -apple-system, sans-serif",
                }}
              >
                Check-ins
              </p>
              <p
                style={{
                  fontSize: "36px",
                  fontWeight: 800,
                  color: "#34D399",
                  letterSpacing: "-1.2px",
                  lineHeight: 1,
                  marginBottom: "4px",
                }}
              >
                {checkInCount}
              </p>
              <p
                style={{
                  fontSize: "11px",
                  color: "#0E2830",
                  opacity: 0.4,
                  fontFamily: "system-ui, -apple-system, sans-serif",
                }}
              >
                total recorded
              </p>
            </Link>
          </div>

          {/* Situations list card */}
          <div
            style={{
              backgroundColor: "#0C0C0C",
              border: "1px solid #141414",
              borderRadius: "16px",
              overflow: "hidden",
              transition: "border-color 0.2s",
            }}
            className="hover:border-[#222]"
          >
            {/* Card header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "14px 18px",
                borderBottom: "1px solid #0F0F0F",
              }}
            >
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  color: "#252525",
                  textTransform: "uppercase",
                  fontFamily: "system-ui, -apple-system, sans-serif",
                }}
              >
                Recent Situations
              </span>
              <Link
                href="/moments"
                style={{
                  fontSize: "11px",
                  color: "#1E1E1E",
                  textDecoration: "none",
                  fontFamily: "system-ui, -apple-system, sans-serif",
                }}
                className="hover:text-[#555]"
              >
                All →
              </Link>
            </div>

            {/* Rows */}
            {situations.slice(0, 5).map((moment, i) => {
              const isLast = i === Math.min(situations.length, 5) - 1;
              const overdue = isCheckInStale(enrichments[moment.id]?.lastCheckIn?.created_at);
              return (
                <div
                  key={moment.id}
                  style={{
                    borderBottom: isLast ? "none" : "1px solid #0A0A0A",
                  }}
                >
                  <MomentCard
                    moment={moment}
                    chosenPathTitle={enrichments[moment.id]?.chosenPathTitle}
                    lastCheckIn={enrichments[moment.id]?.lastCheckIn}
                    variant="dark"
                    dotColorIndex={i}
                    isOverdue={overdue}
                  />
                </div>
              );
            })}

            {/* Add situation row */}
            <Link
              href="/situations/new"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "12px 18px",
                color: "#181818",
                fontSize: "12px",
                cursor: "pointer",
                textDecoration: "none",
                borderTop: "1px solid #0A0A0A",
                fontFamily: "system-ui, -apple-system, sans-serif",
                transition: "color 0.15s",
              }}
              className="hover:text-[#444]"
            >
              {/* Dashed circle */}
              <span
                style={{
                  width: "18px",
                  height: "18px",
                  borderRadius: "50%",
                  border: "1px dashed currentColor",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  fontSize: "12px",
                  lineHeight: 1,
                }}
              >
                +
              </span>
              Add a situation
            </Link>
          </div>
        </OverviewSection>
      ) : null}

      {/* ── Section 3: Needs Attention + Reflection ──────────── */}
      {(visibleAttentionItems.length > 0 || pendingReflection) ? (
        <OverviewSection label="Attention" title="What needs you">
          {/* Attention card */}
          {visibleAttentionItems.length > 0 ? (
            <div
              style={{
                backgroundColor: "#0F0C00",
                border: "1px solid #1C1600",
                borderRadius: "16px",
                padding: "22px",
                marginBottom: "10px",
                transition: "border-color 0.2s",
              }}
              className="hover:border-[#222]"
            >
              {/* Header row */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  marginBottom: "14px",
                }}
              >
                <span
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    backgroundColor: "#F59E0B",
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: "9px",
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    color: "#3A2800",
                    textTransform: "uppercase",
                    fontFamily: "system-ui, -apple-system, sans-serif",
                  }}
                >
                  Needs Attention
                </span>
              </div>

              {/* Items (max 3) */}
              {visibleAttentionItems.map((item) => (
                <Link
                  key={item.key}
                  href={item.href}
                  style={{
                    backgroundColor: "#130F00",
                    border: "1px solid #1E1800",
                    borderRadius: "12px",
                    padding: "10px 14px",
                    marginBottom: "8px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    textDecoration: "none",
                    transition: "border-color 0.15s",
                  }}
                  className="hover:border-[#2A2200]"
                >
                  <span
                    style={{
                      width: "5px",
                      height: "5px",
                      borderRadius: "50%",
                      backgroundColor: "#F59E0B",
                      opacity: 0.6,
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontSize: "12px",
                      color: "#3A2C00",
                      flex: 1,
                      fontFamily: "system-ui, -apple-system, sans-serif",
                    }}
                  >
                    {item.label}{" "}
                    <span style={{ color: "#5C4400", fontWeight: 600 }}>
                      {item.situationName}
                    </span>
                  </span>
                  <span style={{ color: "#F59E0B", opacity: 0.5, fontSize: "12px" }}>→</span>
                </Link>
              ))}

              {/* View all link */}
              {hiddenAttentionCount > 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    paddingTop: "10px",
                    borderTop: "1px solid #181200",
                  }}
                >
                  <Link
                    href="/moments"
                    style={{
                      fontSize: "11px",
                      color: "#2A2000",
                      textDecoration: "none",
                      fontFamily: "system-ui, -apple-system, sans-serif",
                    }}
                  >
                    View all ({hiddenAttentionCount} more) →
                  </Link>
                </div>
              ) : null}
            </div>
          ) : null}

          {/* Reflection card */}
          <ReflectionWaitingHomeSection pending={pendingReflection} />
        </OverviewSection>
      ) : null}

      {/* ── Section 4: What's Been Happening ─────────────────── */}
      {recentReality.length > 0 ? (
        <OverviewSection
          label="Reality"
          title="What's been happening"
          viewAllHref="/moments"
          viewAllLabel="View all →"
        >
          <div
            style={{
              backgroundColor: "#0C0C0C",
              border: "1px solid #141414",
              borderRadius: "16px",
              padding: "22px",
              transition: "border-color 0.2s",
            }}
            className="hover:border-[#222]"
          >
            {/* Inner header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
              }}
            >
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  color: "#252525",
                  textTransform: "uppercase",
                  fontFamily: "system-ui, -apple-system, sans-serif",
                }}
              >
                Latest Updates
              </span>
              <Link
                href="/moments"
                style={{
                  fontSize: "11px",
                  color: "#1E1E1E",
                  textDecoration: "none",
                  fontFamily: "system-ui, -apple-system, sans-serif",
                }}
                className="hover:text-[#555]"
              >
                All →
              </Link>
            </div>

            {/* Feed */}
            <div style={{ position: "relative", paddingLeft: "22px" }}>
              {/* Vertical spine */}
              <div
                style={{
                  position: "absolute",
                  left: "6px",
                  top: "6px",
                  bottom: "6px",
                  width: "1px",
                  background: "linear-gradient(to bottom, #1E1E2A, #16162A)",
                }}
              />

              {recentReality.map(({ moment, reality }, i) => {
                const isLast = i === recentReality.length - 1;
                const dot = FEED_DOT_COLORS[i % FEED_DOT_COLORS.length]!;
                return (
                  <Link
                    key={moment.id}
                    href={`/moments/${moment.id}`}
                    style={{
                      position: "relative",
                      display: "block",
                      marginBottom: isLast ? 0 : "20px",
                      textDecoration: "none",
                    }}
                  >
                    {/* Dot */}
                    <span
                      style={{
                        position: "absolute",
                        left: "-20px",
                        top: "4px",
                        width: "10px",
                        height: "10px",
                        borderRadius: "50%",
                        border: `2px solid ${dot.border}`,
                        backgroundColor: dot.bg,
                        display: "block",
                      }}
                    />

                    {/* Timestamp */}
                    <p
                      style={{
                        fontSize: "9px",
                        color: "#1E1E2E",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                        marginBottom: "5px",
                        fontFamily: "system-ui, -apple-system, sans-serif",
                      }}
                    >
                      {formatRelativeTime(reality.created_at)}
                    </p>

                    {/* Reality text */}
                    <p
                      style={{
                        fontSize: "13px",
                        color: "#404055",
                        lineHeight: 1.65,
                        fontFamily: "system-ui, -apple-system, sans-serif",
                      }}
                    >
                      {toCompactHeadline(reality.reality_summary)}
                    </p>

                    {/* Situation tag */}
                    <p
                      style={{
                        fontSize: "9px",
                        color: "#1A1A28",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        marginTop: "5px",
                        fontFamily: "system-ui, -apple-system, sans-serif",
                      }}
                    >
                      {moment.title}
                    </p>
                  </Link>
                );
              })}
            </div>
          </div>
        </OverviewSection>
      ) : null}

      {/* ── Section 5: Who You Might Become ─────────────────── */}
      <FutureSelfHomeSection futureSelves={futureSelves} />

      {/* ── Section 6: Your Journey ──────────────────────────── */}
      {latestNarrative ? (
        <OverviewSection
          label="Timeline"
          title="Your journey"
          viewAllHref="/timeline"
          viewAllLabel="Full timeline →"
        >
          <div
            style={{
              backgroundColor: "#0C0C0C",
              border: "1px solid #141414",
              borderRadius: "16px",
              overflow: "hidden",
              transition: "border-color 0.2s",
            }}
            className="hover:border-[#222]"
          >
            {/* Top section */}
            <div style={{ padding: "22px" }}>
              {/* Period row */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  marginBottom: "16px",
                }}
              >
                <div style={{ flex: 1, height: "1px", backgroundColor: "#131320" }} />
                <span
                  style={{
                    fontSize: "10px",
                    color: "#1E1E30",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    whiteSpace: "nowrap",
                    fontFamily: "system-ui, -apple-system, sans-serif",
                  }}
                >
                  {latestNarrative.month}
                </span>
                <div style={{ flex: 1, height: "1px", backgroundColor: "#131320" }} />
              </div>

              {/* Summary */}
              <p
                style={{
                  fontSize: "14px",
                  color: "#404055",
                  lineHeight: 1.7,
                  marginBottom: "4px",
                  fontFamily: "system-ui, -apple-system, sans-serif",
                }}
              >
                {latestNarrative.headline}
              </p>

              {latestNarrative.openingBeginning ? (
                <p
                  style={{
                    fontSize: "12px",
                    color: "#252530",
                    lineHeight: 1.6,
                    marginBottom: "20px",
                    fontFamily: "system-ui, -apple-system, sans-serif",
                  }}
                >
                  {toFirstSentence(latestNarrative.openingBeginning)}
                </p>
              ) : (
                <div style={{ marginBottom: "20px" }} />
              )}

              {/* Stats grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: "8px",
                }}
              >
                {[
                  { num: latestNarrative.situationCount, label: "Situations", color: "#34D399" },
                  { num: latestNarrative.checkInCount, label: "Check-ins", color: "#38BDF8" },
                  { num: latestNarrative.reflectionCount, label: "Reflections", color: "#A78BFA" },
                ].map(({ num, label, color }) => (
                  <div
                    key={label}
                    style={{
                      backgroundColor: "#090909",
                      border: "1px solid #0F0F0F",
                      borderRadius: "12px",
                      padding: "14px 16px",
                    }}
                  >
                    <p
                      style={{
                        fontSize: "26px",
                        fontWeight: 800,
                        letterSpacing: "-0.6px",
                        marginBottom: "4px",
                        color,
                        lineHeight: 1,
                      }}
                    >
                      {num}
                    </p>
                    <p
                      style={{
                        fontSize: "9px",
                        color: "#161625",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        fontFamily: "system-ui, -apple-system, sans-serif",
                      }}
                    >
                      {label}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Divider */}
            <div style={{ height: "1px", backgroundColor: "#0D0D18" }} />

            {/* Resolved section */}
            <div style={{ padding: "18px 22px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "8px",
                }}
              >
                <span
                  style={{
                    fontSize: "9px",
                    color: "#161625",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    fontFamily: "system-ui, -apple-system, sans-serif",
                  }}
                >
                  Resolved This Month
                </span>
                <span
                  style={{
                    fontSize: "11px",
                    color: "#34D399",
                    fontWeight: 700,
                    fontFamily: "system-ui, -apple-system, sans-serif",
                  }}
                >
                  {currentMonthResolved.length} closed
                </span>
              </div>

              {currentMonthResolved.length > 0 ? (
                currentMonthResolved.map((moment, i) => (
                  <Link
                    key={moment.id}
                    href={`/moments/${moment.id}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "10px 0",
                      borderBottom:
                        i < currentMonthResolved.length - 1 ? "1px solid #0D0D18" : "none",
                      textDecoration: "none",
                    }}
                  >
                    {/* Check circle */}
                    <span
                      style={{
                        width: "16px",
                        height: "16px",
                        borderRadius: "50%",
                        backgroundColor: "#071512",
                        border: "1px solid #0C2518",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        fontSize: "8px",
                        color: "#34D399",
                      }}
                    >
                      ✓
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          fontSize: "12px",
                          color: "#1E1E28",
                          fontWeight: 500,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          fontFamily: "system-ui, -apple-system, sans-serif",
                        }}
                      >
                        {moment.title}
                      </p>
                      <p
                        style={{
                          fontSize: "10px",
                          color: "#141420",
                          fontFamily: "system-ui, -apple-system, sans-serif",
                        }}
                      >
                        {formatResolvedDate(moment.updated_at)}
                      </p>
                    </div>
                  </Link>
                ))
              ) : (
                <p
                  style={{
                    fontSize: "11px",
                    color: "#1A1A28",
                    fontFamily: "system-ui, -apple-system, sans-serif",
                    paddingTop: "6px",
                  }}
                >
                  Nothing resolved this month yet
                </p>
              )}
            </div>
          </div>
        </OverviewSection>
      ) : null}

      {/* Bottom spacing */}
      <div style={{ height: "48px" }} />

    </OverviewPageShell>
  );
}
