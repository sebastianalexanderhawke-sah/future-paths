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

const MONTHLY_OVERVIEW_LIMIT = 3;

function formatResolvedDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function toCompactHeadline(text: string): string {
  return toFirstSentence(text.replace(/^reality:\s*/i, "").trim());
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

// Feed dot colors (cream card context — visible on #f0efeb)
const FEED_DOT_COLORS = ["#22c55e", "#22c55e", "#60a5fa", "#f59e0b"];
const FEED_SITUATION_TAG_COLORS = [
  "#1a8044",
  "#1a8044",
  "#1a58c0",
  "#b87416",
];

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
  const resolvedSituations =
    "moments" in archivedResult ? archivedResult.moments : [];
  const futureSelves =
    "futureSelves" in futuresResult ? futuresResult.futureSelves : [];
  const currentSelf =
    "currentSelf" in currentSelfResult ? currentSelfResult.currentSelf : null;
  const pendingReflection =
    "pending" in reflectionSummaryResult
      ? reflectionSummaryResult.pending
      : null;

  const monthlyNarratives =
    "narratives" in narrativesResult
      ? narrativesResult.narratives.slice(0, MONTHLY_OVERVIEW_LIMIT)
      : [];

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
        lastCheckIn: lastCheckIns[id]
          ? { created_at: lastCheckIns[id] }
          : undefined,
      },
    ]),
  );

  const hasAnySituations = situations.length > 0;
  const checkInCount = momentIds.filter((id) => !!lastCheckIns[id]).length;

  type AttentionItem = {
    key: string;
    label: string;
    situationName: string;
    href: string;
    priority: number;
  };
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
  const visibleAttentionItems = attentionItems.slice(0, 3);
  const hiddenAttentionCount = Math.max(0, attentionItems.length - 3);

  const recentReality = situations
    .map((moment) => ({ moment, reality: lastRealities[moment.id] }))
    .filter(
      (
        entry,
      ): entry is {
        moment: Moment;
        reality: { created_at: string; reality_summary: string };
      } => entry.reality !== undefined,
    )
    .sort(
      (a, b) =>
        new Date(b.reality.created_at).getTime() -
        new Date(a.reality.created_at).getTime(),
    )
    .slice(0, 4);

  const now = new Date();
  const currentMonthResolved = resolvedSituations.filter((m) => {
    const d = new Date(m.updated_at);
    return (
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear()
    );
  });

  const greeting = getGreeting();
  const latestNarrative = monthlyNarratives[0] ?? null;

  return (
    <OverviewPageShell header={<OverviewHeader />}>

      {/* ── Greeting ──────────────────────────────────────────── */}
      <div
        id="top"
        style={{
          textAlign: "center",
          maxWidth: "800px",
          margin: "0 auto",
          padding: "72px 40px 60px",
          scrollMarginTop: "72px",
        }}
      >
        <p
          style={{
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "#8b7cf8",
            marginBottom: "24px",
            fontFamily:
              "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
          }}
        >
          {greeting.toUpperCase()}
        </p>

        <h1
          style={{
            fontSize: "64px",
            fontWeight: 800,
            color: "#fff",
            letterSpacing: "-2.8px",
            lineHeight: 1.0,
            margin: 0,
            fontFamily:
              "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
          }}
        >
          Here&apos;s where things stand{" "}
          <span style={{ color: "#8b7cf8" }}>today</span>
        </h1>

        <p
          style={{
            fontSize: "16px",
            color: "#222",
            marginTop: "20px",
            fontFamily:
              "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
          }}
        >
          Your journey. Your choices. Your future.
        </p>

        <div
          style={{
            marginTop: "56px",
            height: "1px",
            background:
              "linear-gradient(to right, transparent, #141414, transparent)",
          }}
        />
      </div>

      {/* ── Cards stack ───────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "14px",
          padding: "0 40px 80px",
          maxWidth: "1120px",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
        }}
      >

        {/* Card 1: Current Self */}
        <CurrentSelfHomeSection currentSelf={currentSelf} />

        {/* Card 2: Situations */}
        {hasAnySituations ? (
          <OverviewSection id="situations">
            <div
              style={{
                background: "#f4f0ff",
                borderRadius: "22px",
                overflow: "hidden",
                position: "relative",
                color: "#0a0a0a",
              }}
            >
              {/* Arrow button */}
              <Link
                href="/moments"
                style={{
                  position: "absolute",
                  top: "28px",
                  right: "28px",
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  background: "#fff",
                  border: "1px solid rgba(0,0,0,0.08)",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  textDecoration: "none",
                  fontSize: "15px",
                  color: "#111",
                }}
              >
                →
              </Link>

              {/* Top grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 200px 200px",
                  gap: "16px",
                  padding: "32px 36px 24px",
                }}
              >
                {/* Left: title + desc */}
                <div style={{ paddingRight: "48px" }}>
                  {/* Tag */}
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      background: "#ede8ff",
                      borderRadius: "10px",
                      padding: "5px 12px",
                      marginBottom: "20px",
                    }}
                  >
                    <span
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        background: "#8b7cf8",
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        letterSpacing: "0.13em",
                        textTransform: "uppercase",
                        color: "#6d5ce6",
                      }}
                    >
                      Situations
                    </span>
                  </div>
                  <p
                    style={{
                      fontSize: "24px",
                      fontWeight: 700,
                      color: "#111",
                      lineHeight: 1.25,
                      letterSpacing: "-0.4px",
                      marginBottom: "8px",
                    }}
                  >
                    {situations.length} active situation
                    {situations.length !== 1 ? "s" : ""} shaping your path.
                  </p>
                  <p style={{ fontSize: "13px", color: "#888", lineHeight: 1.5 }}>
                    You&apos;re navigating key areas of your life. Stay
                    consistent with check-ins.
                  </p>
                </div>

                {/* Stat: Active */}
                <div
                  style={{
                    background: "#fff",
                    border: "1px solid #d8d0f8",
                    borderRadius: "14px",
                    padding: "22px 24px",
                    textAlign: "center",
                  }}
                >
                  <p
                    style={{
                      fontSize: "10px",
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: "#a0a0c0",
                      marginBottom: "8px",
                    }}
                  >
                    Active
                  </p>
                  <p
                    style={{
                      fontSize: "48px",
                      fontWeight: 800,
                      color: "#f59e0b",
                      letterSpacing: "-1.5px",
                      lineHeight: 1,
                      marginBottom: "4px",
                    }}
                  >
                    {situations.length}
                  </p>
                  <p style={{ fontSize: "11px", color: "#a0a0c0" }}>
                    situations open
                  </p>
                </div>

                {/* Stat: Check-ins */}
                <div
                  style={{
                    background: "#fff",
                    border: "1px solid #d8d0f8",
                    borderRadius: "14px",
                    padding: "22px 24px",
                    textAlign: "center",
                  }}
                >
                  <p
                    style={{
                      fontSize: "10px",
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: "#a0a0c0",
                      marginBottom: "8px",
                    }}
                  >
                    Check-ins
                  </p>
                  <p
                    style={{
                      fontSize: "48px",
                      fontWeight: 800,
                      color: "#22c55e",
                      letterSpacing: "-1.5px",
                      lineHeight: 1,
                      marginBottom: "4px",
                    }}
                  >
                    {checkInCount}
                  </p>
                  <p style={{ fontSize: "11px", color: "#a0a0c0" }}>
                    total recorded
                  </p>
                </div>
              </div>

              {/* Divider */}
              <div style={{ height: "1px", background: "#e0d8f8" }} />

              {/* Situation rows */}
              {situations.slice(0, 5).map((moment, i) => {
                const overdue = isCheckInStale(
                  enrichments[moment.id]?.lastCheckIn?.created_at,
                );
                return (
                  <div key={moment.id}>
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

              {/* Footer */}
              <Link
                href="/moments"
                style={{
                  display: "block",
                  padding: "14px 36px",
                  fontSize: "14px",
                  color: "#9090c0",
                  textDecoration: "none",
                  borderTop: "1px solid #e8e0f8",
                }}
              >
                View all situations ↓
              </Link>
            </div>
          </OverviewSection>
        ) : null}

        {/* Two-column grid: Needs Attention + Reflection */}
        {(visibleAttentionItems.length > 0 || pendingReflection) ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "14px",
            }}
          >
            {/* Left: Needs Attention */}
            {visibleAttentionItems.length > 0 ? (
              <div
                style={{
                  background: "#fffbf0",
                  borderRadius: "22px",
                  overflow: "hidden",
                  color: "#0a0a0a",
                  padding: "28px",
                }}
              >
                {/* Tag */}
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    background: "#fff8e0",
                    borderRadius: "10px",
                    padding: "5px 12px",
                    marginBottom: "20px",
                  }}
                >
                  <span style={{ fontSize: "12px", color: "#f59e0b" }}>⚑</span>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      letterSpacing: "0.13em",
                      textTransform: "uppercase",
                      color: "#c97c1a",
                    }}
                  >
                    Needs Attention
                  </span>
                </div>

                <p
                  style={{
                    fontSize: "22px",
                    fontWeight: 700,
                    color: "#111",
                    lineHeight: 1.2,
                    letterSpacing: "-0.4px",
                    marginBottom: "6px",
                  }}
                >
                  What needs your attention.
                </p>
                <p
                  style={{
                    fontSize: "13px",
                    color: "#888",
                    marginBottom: "20px",
                  }}
                >
                  {attentionItems.length} situation
                  {attentionItems.length !== 1 ? "s" : ""} overdue for a
                  check-in.
                </p>

                {/* Attention items */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  {visibleAttentionItems.map((item) => (
                    <Link
                      key={item.key}
                      href={item.href}
                      style={{
                        background: "#fff9e6",
                        border: "1px solid #eedcb0",
                        borderRadius: "11px",
                        padding: "11px 14px",
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        textDecoration: "none",
                        transition: "border-color 0.15s",
                      }}
                    >
                      <span
                        style={{
                          width: "6px",
                          height: "6px",
                          borderRadius: "50%",
                          background: "#f59e0b",
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          fontSize: "13px",
                          color: "#5c4400",
                          flex: 1,
                          minWidth: 0,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.situationName}
                        {" — "}
                        <span style={{ color: "#888" }}>{item.label}</span>
                      </span>
                      <span style={{ color: "#f59e0b", opacity: 0.5, fontSize: "12px" }}>→</span>
                    </Link>
                  ))}
                </div>

                {hiddenAttentionCount > 0 ? (
                  <div
                    style={{
                      textAlign: "center",
                      paddingTop: "14px",
                      marginTop: "8px",
                      borderTop: "1px solid #eedcb0",
                      fontSize: "11px",
                      color: "#b8a070",
                    }}
                  >
                    <Link
                      href="/moments"
                      style={{ color: "inherit", textDecoration: "none" }}
                    >
                      + {hiddenAttentionCount} more situation
                      {hiddenAttentionCount !== 1 ? "s" : ""} need a check-in
                    </Link>
                  </div>
                ) : null}
              </div>
            ) : (
              /* placeholder if no attention items but reflection exists */
              <div />
            )}

            {/* Right: Reflection Waiting */}
            <ReflectionWaitingHomeSection pending={pendingReflection} />
          </div>
        ) : null}

        {/* Card 4: What's Been Happening */}
        {recentReality.length > 0 ? (
          <OverviewSection>
            <div
              style={{
                background: "#f0efeb",
                borderRadius: "22px",
                overflow: "hidden",
                color: "#0a0a0a",
                padding: "32px 36px",
              }}
            >
              {/* Tag */}
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "#e6f4ed",
                  borderRadius: "10px",
                  padding: "5px 12px",
                  marginBottom: "24px",
                }}
              >
                <span
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: "#22c55e",
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    letterSpacing: "0.13em",
                    textTransform: "uppercase",
                    color: "#1a8044",
                  }}
                >
                  What&apos;s Been Happening
                </span>
              </div>

              {/* Feed rows */}
              <div>
                {recentReality.map(({ moment, reality }, i) => {
                  const isLast = i === recentReality.length - 1;
                  const dotColor = FEED_DOT_COLORS[i % FEED_DOT_COLORS.length]!;
                  const tagColor =
                    FEED_SITUATION_TAG_COLORS[
                      i % FEED_SITUATION_TAG_COLORS.length
                    ]!;
                  return (
                    <Link
                      key={moment.id}
                      href={`/moments/${moment.id}`}
                      style={{
                        display: "block",
                        padding: "15px 0",
                        borderBottom: isLast ? "none" : "1px solid #e8e5dd",
                        textDecoration: "none",
                        transition: "opacity 0.15s",
                      }}
                    >
                      {/* Top row: dot + timestamp + situation tag */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          marginBottom: "6px",
                        }}
                      >
                        <span
                          style={{
                            width: "7px",
                            height: "7px",
                            borderRadius: "50%",
                            background: dotColor,
                            flexShrink: 0,
                          }}
                        />
                        <span
                          style={{
                            fontSize: "10px",
                            color: "#bbb",
                            fontWeight: 600,
                            textTransform: "uppercase",
                            letterSpacing: "0.08em",
                          }}
                        >
                          {formatRelativeTime(reality.created_at)}
                        </span>
                        <span
                          style={{
                            marginLeft: "auto",
                            fontSize: "10px",
                            color: tagColor,
                            fontWeight: 600,
                            textTransform: "uppercase",
                            letterSpacing: "0.06em",
                          }}
                        >
                          {moment.title}
                        </span>
                      </div>

                      {/* Reality text */}
                      <p
                        style={{
                          fontSize: "14px",
                          color: "#666",
                          lineHeight: 1.6,
                          paddingLeft: "15px",
                        }}
                      >
                        {toCompactHeadline(reality.reality_summary)}
                      </p>
                    </Link>
                  );
                })}
              </div>

              <Link
                href="/moments"
                style={{
                  display: "inline-block",
                  marginTop: "14px",
                  fontSize: "12px",
                  color: "#bbb",
                  textDecoration: "none",
                }}
              >
                View all updates →
              </Link>
            </div>
          </OverviewSection>
        ) : null}

        {/* Future Selves */}
        <FutureSelfHomeSection futureSelves={futureSelves} />

        {/* Card 5: Your Journey (Timeline) */}
        {latestNarrative ? (
          <OverviewSection id="timeline">
            <div
              style={{
                background: "#f0efeb",
                borderRadius: "22px",
                overflow: "hidden",
                color: "#0a0a0a",
              }}
            >
              {/* Arrow */}
              <Link
                href="/timeline"
                style={{
                  position: "absolute",
                  top: "28px",
                  right: "28px",
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  background: "#fff",
                  border: "1px solid rgba(0,0,0,0.08)",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  textDecoration: "none",
                  fontSize: "15px",
                  color: "#111",
                }}
              >
                →
              </Link>

              {/* Top content */}
              <div style={{ padding: "32px 36px" }}>
                {/* Tag */}
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    background: "#e4edfb",
                    borderRadius: "10px",
                    padding: "5px 12px",
                    marginBottom: "24px",
                  }}
                >
                  <span
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: "#60a5fa",
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      letterSpacing: "0.13em",
                      textTransform: "uppercase",
                      color: "#1a5fc9",
                    }}
                  >
                    Your Journey
                  </span>
                </div>

                {/* Period row */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    marginBottom: "20px",
                  }}
                >
                  <div
                    style={{ flex: 1, height: "1px", background: "#dedad0" }}
                  />
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      color: "#bbb",
                      letterSpacing: "0.1em",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {latestNarrative.month}
                  </span>
                  <div
                    style={{ flex: 1, height: "1px", background: "#dedad0" }}
                  />
                </div>

                {/* Summary */}
                <p
                  style={{
                    fontSize: "15px",
                    color: "#555",
                    lineHeight: 1.7,
                    marginBottom: "6px",
                  }}
                >
                  {latestNarrative.headline}
                </p>

                {latestNarrative.openingBeginning ? (
                  <p
                    style={{
                      fontSize: "13px",
                      color: "#aaa",
                      lineHeight: 1.6,
                      marginBottom: "24px",
                    }}
                  >
                    {toFirstSentence(latestNarrative.openingBeginning)}
                  </p>
                ) : (
                  <div style={{ marginBottom: "24px" }} />
                )}

                {/* Stats row */}
                <div
                  style={{ display: "flex", gap: "28px", alignItems: "baseline" }}
                >
                  {[
                    {
                      num: latestNarrative.situationCount,
                      label: "SITUATIONS",
                      color: "#22c55e",
                    },
                    {
                      num: latestNarrative.checkInCount,
                      label: "CHECK-INS",
                      color: "#60a5fa",
                    },
                    {
                      num: latestNarrative.reflectionCount,
                      label: "REFLECTIONS",
                      color: "#8b7cf8",
                    },
                  ].map(({ num, label, color }) => (
                    <div key={label}>
                      <span
                        style={{
                          fontSize: "30px",
                          fontWeight: 800,
                          color,
                          letterSpacing: "-0.8px",
                          lineHeight: 1,
                        }}
                      >
                        {num}
                      </span>
                      <span
                        style={{
                          fontSize: "9px",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          color: "#ccc",
                          letterSpacing: "0.08em",
                          marginLeft: "6px",
                        }}
                      >
                        {label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Divider */}
              <div style={{ height: "1px", background: "#e8e5dd" }} />

              {/* Resolved section */}
              <div style={{ padding: "20px 36px" }}>
                <p
                  style={{
                    fontSize: "9px",
                    color: "#ccc",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    marginBottom: "12px",
                  }}
                >
                  Resolved This Month
                </p>

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
                          i < currentMonthResolved.length - 1
                            ? "1px solid #e8e5dd"
                            : "none",
                        textDecoration: "none",
                      }}
                    >
                      {/* Check circle */}
                      <span
                        style={{
                          width: "17px",
                          height: "17px",
                          borderRadius: "50%",
                          background: "#e6f4ed",
                          border: "1px solid #9cd4b0",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          fontSize: "8px",
                          color: "#22c55e",
                        }}
                      >
                        ✓
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p
                          style={{
                            fontSize: "13px",
                            color: "#666",
                            fontWeight: 500,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {moment.title}
                        </p>
                        <p
                          style={{ fontSize: "11px", color: "#bbb" }}
                        >
                          {formatResolvedDate(moment.updated_at)}
                        </p>
                      </div>
                    </Link>
                  ))
                ) : (
                  <p style={{ fontSize: "13px", color: "#bbb" }}>
                    Nothing resolved this month yet
                  </p>
                )}

                <Link
                  href="/timeline"
                  style={{
                    display: "inline-block",
                    marginTop: "14px",
                    fontSize: "12px",
                    color: "#bbb",
                    textDecoration: "none",
                  }}
                >
                  View full timeline →
                </Link>
              </div>
            </div>
          </OverviewSection>
        ) : null}
      </div>
    </OverviewPageShell>
  );
}
