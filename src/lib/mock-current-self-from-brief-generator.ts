import type { CurrentSelfFromBriefDraft } from "@/lib/ai/schemas/current-self";
import { SIGNAL_DEFINITIONS } from "@/lib/behavior-signals";
import type { IdentityBrief } from "@/lib/identity-brief";

/**
 * Deterministic mock draft for current_self.generate_from_brief — the
 * brief-based sibling of generateMockCurrentSelf. Development-only content:
 * it satisfies the output schema (3 values, 1–3 fears, 1–3 growth items,
 * newline encodings) and stays derived from the brief so mock portraits
 * still track the user's actual ledger. Returns null when the brief carries
 * no evidenced signal, mirroring the nullable production contract.
 */
export function generateMockCurrentSelfFromBrief(
  brief: IdentityBrief,
): CurrentSelfFromBriefDraft | null {
  const top = brief.topSignals;

  if (brief.summary.totalObservations === 0 || top.length === 0) {
    return null;
  }

  const label = (slug: (typeof top)[number]["signal"]) =>
    SIGNAL_DEFINITIONS[slug].label.toLowerCase();

  const strongest = top[0];

  // Values: dominant sides of evidenced relations first, then strongest
  // signals, padded with the signal list rotated so 3 items always exist.
  const valueSources = [
    ...brief.signalRelations
      .filter((relation) => relation.dominant !== null)
      .map((relation) => relation.dominant!),
    ...top.map((signal) => signal.signal),
  ];
  const seen = new Set<string>();
  const distinctValueSlugs = valueSources.filter((slug) => {
    if (seen.has(slug)) return false;
    seen.add(slug);
    return true;
  });

  const values = Array.from({ length: 3 }, (_, index) => {
    const slug = distinctValueSlugs[index % distinctValueSlugs.length];
    const name = SIGNAL_DEFINITIONS[slug].label;
    return `${name}\nWhen something competes with this, this is the side that keeps winning. The same choice shows up across different kinds of decisions, not one repeated situation.`;
  });

  const opposing = brief.signalRelations.find((relation) => relation.opposing !== null);
  const afraidTheme = opposing ? SIGNAL_DEFINITIONS[opposing.opposing!].label : "Settling";
  const afraid_of_becoming = [
    `${afraidTheme}\nBecoming someone whose days are decided by the option not taken.\nYour recorded choices keep moving in the other direction, and each repetition puts more distance between you and that version of yourself.`,
  ];

  const balanced = brief.signalRelations.find(
    (relation) => relation.opposingStrength > 0,
  );
  const core_tension = balanced
    ? `You keep choosing ${label(balanced.signals[0])}. You also keep returning to ${label(balanced.signals[1])}. Your recorded decisions keep asking you to pick one.`
    : `You keep choosing ${label(strongest.signal)}, and it keeps costing you something you also care about.`;

  const core_tradeoff =
    strongest.stage === "established" || strongest.stage === "defining"
      ? `You keep returning to ${label(strongest.signal)}.\nThat repetition is why the pattern is now part of who you are, but it also means the alternative rarely gets a real hearing. Some options stopped being considered a while ago.\nThis pattern recurs across your recorded history, not in any single decision.`
      : null;

  const growthPool = [
    ...brief.recentChanges.emerged.map(
      (slug) => `Recently you've started ${label(slug)}, and it's beginning to look like a pattern rather than an exception.`,
    ),
    ...brief.recentChanges.strengthened.map(
      (slug) => `You're leaning further into ${label(slug)} than you were before.`,
    ),
    ...brief.recentChanges.weakened.map(
      (slug) => `You're reaching for ${label(slug)} less often than you used to.`,
    ),
  ];
  const recent_growth = growthPool.length
    ? growthPool.slice(0, 3)
    : [`You're continuing to build on ${label(strongest.signal)}.`];

  return {
    title: SIGNAL_DEFINITIONS[strongest.signal].label,
    summary: `You keep resolving the same kind of decision the same way, and that repetition has quietly become part of who you are. What looks like a series of separate choices reads, from a distance, as one continuing one.\n\nYou decide by moving, and you trust what the pattern of your own choices keeps telling you.`,
    values,
    afraid_of_becoming,
    core_tension,
    core_tradeoff,
    recent_growth,
  };
}
