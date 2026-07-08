import Link from "next/link";

import { generateCurrentSelfAction } from "@/actions/current-self";
import { AnalysisDisclosure } from "@/components/current-self/analysis-disclosure";
import { IdentityStrengthBadge } from "@/components/current-self/identity-strength-badge";
import { AppSidebar } from "@/components/overview/app-sidebar";
import { OverviewCard } from "@/components/overview/overview-card";
import { getActivitySummary, getCurrentSelf } from "@/lib/current-self";
import {
  deriveIdentityConfidence,
  deriveIdentityFoundations,
} from "@/lib/current-self-hero";
import { getUnansweredReflectionSummary } from "@/lib/reflections";
import { getUserIdentity } from "@/lib/user-identity";

type CurrentSelfPageProps = {
  searchParams: Promise<{ error?: string }>;
};

// "Name\nEvidence sentence" → value name + the pattern of choices behind it.
function parseValue(value: string): { name: string; evidence: string | null } {
  const newlineIndex = value.indexOf("\n");
  if (newlineIndex === -1) {
    return { name: value, evidence: null };
  }
  return {
    name: value.slice(0, newlineIndex),
    evidence: value.slice(newlineIndex + 1),
  };
}

// "Theme\nIdentity statement\nSupporting paragraph" → the three tiers of a
// feared future, mirroring how parseValue splits a value into name + evidence.
// Degrades gracefully for legacy single-line fears (statement only) so old
// rows still render as the bold centerpiece rather than a stray label.
function parseFear(fear: string): {
  theme: string | null;
  statement: string;
  paragraph: string | null;
} {
  const parts = fear.split("\n").map((part) => part.trim());

  if (parts.length === 1) {
    return { theme: null, statement: parts[0], paragraph: null };
  }
  if (parts.length === 2) {
    return { theme: parts[0], statement: parts[1], paragraph: null };
  }
  return {
    theme: parts[0],
    statement: parts[1],
    paragraph: parts.slice(2).join("\n").trim() || null,
  };
}

// "Recurring pattern\nThe tradeoff\nReflection's observation" → the three tiers
// of the single recurring cost of this identity. Returns null when the field is
// empty (the section is omitted whenever the evidence didn't support one).
function parseTradeoff(raw: string | null | undefined): {
  pattern: string;
  tradeoff: string | null;
  observation: string | null;
} | null {
  const trimmed = raw?.trim();
  if (!trimmed) {
    return null;
  }

  const [pattern, tradeoff, ...rest] = trimmed.split("\n").map((part) => part.trim());
  if (!pattern) {
    return null;
  }

  return {
    pattern,
    tradeoff: tradeoff || null,
    observation: rest.join(" ").trim() || null,
  };
}

// Display-only: the overview cards show a single concise supporting line, so a
// multi-sentence evidence paragraph is trimmed to its first sentence here. The
// full reasoning is never changed — only what this card renders.
function firstSentence(text: string): string {
  const match = text.match(/^.*?[.!?](?=\s|$)/);
  return (match ? match[0] : text).trim();
}

export default async function CurrentSelfPage({
  searchParams,
}: CurrentSelfPageProps) {
  const { error } = await searchParams;
  const [userIdentity, result, activity, reflectionSummaryResult] =
    await Promise.all([
      getUserIdentity(),
      getCurrentSelf(),
      getActivitySummary(),
      getUnansweredReflectionSummary(),
    ]);

  if ("error" in result) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f4f4f6] px-6">
        <p className="text-[13px] text-red-600">{result.error}</p>
      </div>
    );
  }

  const { currentSelf } = result;
  const reflectionSummary =
    "pending" in reflectionSummaryResult ? reflectionSummaryResult : null;

  const portraitParagraphs = currentSelf
    ? currentSelf.summary.split(/\n\n+/).filter(Boolean)
    : [];
  // Hero leads with one memorable observation (the first portrait paragraph);
  // the rest of the portrait lives behind "Read Full Portrait".
  const leadObservation = portraitParagraphs[0] ?? null;
  const remainingPortrait = portraitParagraphs.slice(1);
  const values = (currentSelf?.values ?? []).map(parseValue);
  const afraidOfBecoming = (currentSelf?.afraid_of_becoming ?? []).map(parseFear);
  const tradeoff = parseTradeoff(currentSelf?.core_tradeoff);

  // Confidence badge: a qualitative read of how settled the portrait is, from
  // evidence volume + consistency (distinct positive-theme anchors). Derived
  // from the same evidence the rest of the page uses; never persisted.
  const confidence = deriveIdentityConfidence({
    checkInCount: activity.checkInCount,
    reflectionCount: activity.reflectionCount,
    foundationCount: deriveIdentityFoundations(currentSelf?.themes).length,
  });

  const evidenceStats = [
    { value: activity.reflectionCount, label: "reflections" },
    { value: activity.checkInCount, label: "check-ins" },
    {
      value: activity.monthsActive,
      label: `month${activity.monthsActive !== 1 ? "s" : ""} of activity`,
    },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-[#f4f4f6] text-[#111]">
      <AppSidebar
        activeHref="/current-self"
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
                Current Self
              </h1>
              <p className="text-[15px] text-[#999999]">
                Your current identity based on recent reflections, check-ins,
                and decisions.
              </p>
            </div>
            <form action={generateCurrentSelfAction}>
              <button
                type="submit"
                className="shrink-0 cursor-pointer rounded-[10px] bg-[#111] px-[18px] py-2.5 text-[13px] font-semibold text-white transition-opacity duration-150 hover:opacity-[0.88]"
              >
                Refresh Current Self
              </button>
            </form>
          </div>

          {error ? (
            <p className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
              {error}
            </p>
          ) : null}

          {!currentSelf ? (
            <OverviewCard className="px-9 py-14">
              <div className="flex flex-col items-center text-center">
                <p className="max-w-[380px] text-[13px] leading-relaxed text-[#999999]">
                  No Current Self yet. Start a situation and check in — your
                  identity portrait builds itself from what you record.
                </p>
                <Link
                  href="/moments/new"
                  className="mt-4 text-[13px] font-medium text-[#6366f1] transition-opacity duration-150 hover:opacity-80"
                >
                  Start with a situation →
                </Link>
              </div>
            </OverviewCard>
          ) : (
            <div className="flex flex-col gap-5 pb-14">
              {/* Hero — leads with what the identity is anchored to, not the
                  written portrait. The full portrait moves behind
                  "Read Full Portrait" at the bottom of the card. */}
              <OverviewCard className="px-9 pb-7 pt-7">
                <div className="mb-6">
                  <h2 className="text-[22px] font-bold tracking-[-0.3px] text-[#111]">
                    Current Self
                  </h2>
                  <p className="mt-1 text-[13px] text-[#999999]">
                    Who you are today.
                  </p>
                </div>

                {/* The portrait is the hero: one memorable observation, with
                    the strength badge reading as metadata beside the title. */}
                <div className="border-t border-[#f0f0f0] pt-6">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <p className="font-voice text-[28px] font-medium leading-[1.15] tracking-[-0.5px] text-[#111]">
                      {currentSelf.title}
                    </p>
                    <IdentityStrengthBadge
                      level={confidence.level}
                      label={confidence.label}
                      explanation={confidence.explanation}
                    />
                  </div>

                  {leadObservation ? (
                    <p className="mt-4 max-w-[52em] text-[15px] leading-[1.75] text-[#555555]">
                      {leadObservation}
                    </p>
                  ) : null}
                </div>

                <AnalysisDisclosure paragraphs={remainingPortrait} />
              </OverviewCard>

              {/* What You Value / What You Fear Becoming — complementary,
                  equal-weight sibling cards. */}
              <div className="grid grid-cols-2 gap-5">
                <OverviewCard className="flex flex-col px-8 py-7">
                  <div className="mb-6">
                    <div className="flex items-center gap-2">
                      <span
                        aria-hidden="true"
                        className="text-[18px] leading-none text-[#6366f1]"
                      >
                        ◈
                      </span>
                      <h2 className="text-[17px] font-bold text-[#111]">
                        What You Value
                      </h2>
                    </div>
                    <p className="mt-[3px] text-[13px] text-[#888888]">
                      What your repeated choices consistently protect
                    </p>
                  </div>

                  {values.length === 0 ? (
                    <p className="py-6 text-[13px] leading-relaxed text-[#888888]">
                      Not clear yet — this fills in as patterns repeat.
                    </p>
                  ) : (
                    <div>
                      {values.map(({ name, evidence }, i) => (
                        <div
                          key={`${i}-${name}`}
                          className={[
                            "flex items-start gap-3.5 py-3.5",
                            i < values.length - 1 ? "border-b border-[#f5f5f5]" : "",
                          ].join(" ")}
                        >
                          <span
                            aria-hidden="true"
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f5f5ff] text-[15px] text-[#6366f1]"
                          >
                            ◈
                          </span>
                          <div className="pt-1.5">
                            <p className="text-[14px] font-bold leading-snug text-[#111]">
                              {name}
                            </p>
                            {evidence ? (
                              <p className="mt-1 text-[13px] leading-relaxed text-[#777777]">
                                {firstSentence(evidence)}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </OverviewCard>

                <OverviewCard className="flex flex-col px-8 py-7">
                  <div className="mb-6">
                    <div className="flex items-center gap-2">
                      <span
                        aria-hidden="true"
                        className="text-[18px] leading-none text-[#ef4444]"
                      >
                        ●
                      </span>
                      <h2 className="text-[17px] font-bold text-[#111]">
                        What You Fear Becoming
                      </h2>
                    </div>
                    <p className="mt-[3px] text-[13px] text-[#888888]">
                      Not anxiety — the version of you your choices keep steering away from
                    </p>
                  </div>

                  {afraidOfBecoming.length === 0 ? (
                    <p className="py-6 text-[13px] leading-relaxed text-[#888888]">
                      Not clear yet — this fills in as patterns repeat.
                    </p>
                  ) : (
                    <div>
                      {afraidOfBecoming.map(({ theme, statement }, i) => (
                        <div
                          key={`${i}-${statement}`}
                          className={[
                            "flex items-start gap-3.5 py-3.5",
                            i < afraidOfBecoming.length - 1
                              ? "border-b border-[#f5f5f5]"
                              : "",
                          ].join(" ")}
                        >
                          <span
                            aria-hidden="true"
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#fef2f2] text-[15px] text-[#ef4444]"
                          >
                            ●
                          </span>
                          <div className="pt-1.5">
                            <p className="text-[14px] font-bold leading-snug text-[#111]">
                              {theme ?? statement}
                            </p>
                            {theme ? (
                              <p className="mt-1 text-[13px] leading-relaxed text-[#777777]">
                                {statement}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </OverviewCard>
              </div>

              {/* The Tradeoff You Live With — full-width card directly below
                  the Value/Fear grid. No icons; not expandable. Renders the
                  three existing parts of core_tradeoff (behavioral pattern,
                  recurring consequence, Reflection's observation). Omitted
                  entirely when the evidence didn't support one. */}
              {tradeoff ? (
                <OverviewCard className="px-9 py-7">
                  <div className="mb-4">
                    <div className="flex items-center gap-2">
                      <span
                        aria-hidden="true"
                        className="text-[18px] leading-none text-[#d97706]"
                      >
                        ●
                      </span>
                      <h2 className="text-[17px] font-bold text-[#111]">
                        The Tradeoff You Live With
                      </h2>
                    </div>
                    <p className="mt-[3px] text-[13px] text-[#888888]">
                      A recurring pattern Reflection has noticed.
                    </p>
                  </div>

                  <div className="flex flex-col">
                    <div className="flex items-start gap-3.5 py-4">
                      <span
                        aria-hidden="true"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#fff7ed] text-[15px] text-[#d97706]"
                      >
                        ↗
                      </span>
                      <div className="pt-0.5">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-[#b45309]">
                          Your Pattern
                        </p>
                        <p className="mt-1 max-w-[52em] text-[15px] leading-[1.6] text-[#111]">
                          {tradeoff.pattern}
                        </p>
                      </div>
                    </div>

                    {tradeoff.tradeoff ? (
                      <div className="flex items-start gap-3.5 border-t border-[#f5f5f5] py-4">
                        <span
                          aria-hidden="true"
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#fff7ed] text-[15px] text-[#d97706]"
                        >
                          ⚖
                        </span>
                        <div className="pt-0.5">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-[#b45309]">
                            The Cost
                          </p>
                          <p className="mt-1 max-w-[52em] text-[14px] leading-[1.7] text-[#555555]">
                            {tradeoff.tradeoff}
                          </p>
                        </div>
                      </div>
                    ) : null}

                    {tradeoff.observation ? (
                      <div className="flex items-start gap-3.5 border-t border-[#f5f5f5] py-4">
                        <span
                          aria-hidden="true"
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#fff7ed] text-[14px] text-[#d97706]"
                        >
                          ✦
                        </span>
                        <div className="pt-0.5">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-[#b45309]">
                            Reflection Noticed
                          </p>
                          <p className="mt-1 max-w-[52em] text-[13px] leading-relaxed text-[#888888]">
                            {tradeoff.observation}
                          </p>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </OverviewCard>
              ) : null}

              {/* Why this identity? — the evidence behind the read. */}
              <OverviewCard className="px-9 py-7">
                <div className="mb-6">
                  <h2 className="text-[17px] font-bold text-[#111]">
                    Why this identity?
                  </h2>
                  <p className="mt-[3px] text-[13px] text-[#888888]">
                    This portrait is built only from what you&apos;ve actually
                    recorded — nothing here is invented.
                  </p>
                </div>

                <div className="grid max-w-[560px] grid-cols-3 gap-5">
                  {evidenceStats.map((stat) => (
                    <div key={stat.label}>
                      <p className="text-[28px] font-extrabold leading-none tracking-[-1px] text-[#111]">
                        {stat.value}
                      </p>
                      <p className="mt-1.5 text-[12px] font-medium text-[#999999]">
                        {stat.label}
                      </p>
                    </div>
                  ))}
                </div>
              </OverviewCard>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
