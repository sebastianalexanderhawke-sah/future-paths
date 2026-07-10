import type { CurrentSelfFromBriefDraft } from "@/lib/ai/schemas/current-self";
import { IdentityEngineConfigError } from "@/lib/ai/config";
import { SIGNAL_DEFINITIONS, type SignalSlug } from "@/lib/behavior-signals";
import type { IdentityBrief, RankedFuture } from "@/lib/identity-brief";
import type { MockCurrentSelfDraft } from "@/lib/mock-current-self-generator";
import type { IdentityDimension } from "@/types/behavior";
import type { CheckInThemeName } from "@/types/enums";

// ---------------------------------------------------------------------------
// Behavior Engine v4 — Phase 4: Current Self migration boundary
// ---------------------------------------------------------------------------
//
// Everything specific to brief-based Current Self generation that is NOT the
// prompt lives here: the engine flag (the reversible migration boundary), the
// deterministic theme derivation (audit gap G1), and the development-only
// shadow comparator. The Identity Brief itself is untouched — this module is
// a consumer.

// ---------------------------------------------------------------------------
// Engine flag
// ---------------------------------------------------------------------------

export type CurrentSelfEngine = "brief" | "legacy";

/**
 * Which pipeline generates Current Self. Defaults to the Identity Brief;
 * CURRENT_SELF_ENGINE=legacy reverts to the raw-context pipeline wholesale.
 * A present-but-unrecognized value throws rather than silently picking an
 * engine (same policy as IDENTITY_ENGINE_MODE).
 *
 * Independent of the flag, generateCurrentSelf falls back to legacy for any
 * user whose ledger is empty — extraction failures and mock-mode development
 * accounts (where extraction returns no observations) keep working unchanged.
 */
export function getCurrentSelfEngine(): CurrentSelfEngine {
  const raw = process.env.CURRENT_SELF_ENGINE?.trim();

  if (!raw) {
    return "brief";
  }

  if (raw === "brief" || raw === "legacy") {
    return raw;
  }

  throw new IdentityEngineConfigError(
    `Invalid CURRENT_SELF_ENGINE "${raw}". Expected "brief" or "legacy".`,
  );
}

/**
 * Development-only shadow comparison: when enabled, each generation also runs
 * the other engine and logs a structural diff. Never enabled in production —
 * it doubles AI spend per regeneration and exists only for migration
 * validation.
 */
export function isCurrentSelfShadowCompareEnabled(): boolean {
  return (
    process.env.CURRENT_SELF_SHADOW_COMPARE?.trim() === "true" &&
    process.env.NODE_ENV !== "production"
  );
}

// ---------------------------------------------------------------------------
// Current Self's view of the brief
// ---------------------------------------------------------------------------

/**
 * Hides the v4.3 identity-attribution payload from Current Self's prompt
 * context. rankedFutures are directional context only for the portrait
 * (its prompt says "never mention them"), and the attribution fields exist
 * for the Future Selves migration — stripping them keeps the Current Self
 * prompt byte-identical to pre-v4.3 and its token cost flat. Pure
 * filter/hide per the consumer rule: nothing is computed here.
 */
export function stripRankedFutureAttribution(brief: IdentityBrief): IdentityBrief {
  return {
    ...brief,
    rankedFutures: brief.rankedFutures.map(
      (future): RankedFuture => ({
        identityId: future.identityId,
        canonicalName: future.canonicalName,
        score: future.score,
        likelihood: future.likelihood,
        confidence: future.confidence,
        evidenceStrength: future.evidenceStrength,
        matchedDimensions: future.matchedDimensions,
      }),
    ),
  };
}

// ---------------------------------------------------------------------------
// Theme derivation (audit gap G1)
// ---------------------------------------------------------------------------
//
// The portrait's themes field (4–6 entries of the check-in vocabulary) was
// the one output the model can no longer produce: the brief context carries
// no theme names to copy and no vocabulary list. Themes are display metadata,
// not evidence.
//
// Consumer-rule compliance: this is a RENAME, not reasoning. The brief's
// topSignals are already ranked by the Behavior Engine; this walk translates
// them into the display vocabulary through a static table, dedupes, caps,
// and pads — filter, reorder, rename. No scores are computed here, and no
// identity semantics are created: the same information, in theme words.
// If a second consumer ever needs themes, promote this mapping into the
// brief itself (v4.3 candidate) rather than duplicating it.

// Dimension-level fallback mapping. Only dimensions a signal touches with
// POSITIVE weight contribute — avoids_conflict must not surface "Courage".
const DIMENSION_THEME: Record<IdentityDimension, CheckInThemeName> = {
  Independence: "Independence",
  Connection: "Connection",
  Initiative: "Growth",
  Reflection: "Reflection",
  Adaptability: "Growth",
  Curiosity: "Curiosity",
  Consistency: "Stability",
  "Risk Tolerance": "Courage",
  Vulnerability: "Connection",
  "Conflict Tolerance": "Courage",
};

// Signal-level overrides where the behavior names something more specific
// than its dimensions — including every negative-weight signal, which would
// otherwise map to nothing (their dimension weights are negative).
const SIGNAL_THEME_OVERRIDES: Partial<Record<SignalSlug, CheckInThemeName[]>> = {
  creates_original_work: ["Creativity"],
  shares_original_work: ["Creativity", "Courage"],
  guides_someones_growth: ["Leadership", "Connection"],
  returns_after_setback: ["Resilience"],
  leaves_completed_chapter: ["Acceptance", "Growth"],
  prioritizes_relationships: ["Belonging", "Connection"],
  seeks_collaboration: ["Belonging", "Connection"],
  declines_risky_opportunity: ["Stability"],
  resists_change: ["Stability"],
  avoids_conflict: ["Stability"],
  defers_to_others: ["Belonging"],
};

// The portrait schema requires 4–6 themes; sparse ledgers pad from this
// fixed priority order (skipping themes already present).
const THEME_PADDING: CheckInThemeName[] = [
  "Growth",
  "Reflection",
  "Curiosity",
  "Connection",
  "Stability",
  "Courage",
];

const THEME_COUNT_MIN = 4;
const THEME_COUNT_MAX = 6;

function themesForSignal(slug: SignalSlug): CheckInThemeName[] {
  const override = SIGNAL_THEME_OVERRIDES[slug];
  if (override) {
    return override;
  }

  return SIGNAL_DEFINITIONS[slug].dimensions
    .filter(({ weight }) => weight > 0)
    .map(({ dimension }) => DIMENSION_THEME[dimension]);
}

/**
 * Deterministic 4–6 themes: walk the brief's topSignals in the engine's own
 * strength order, rename each into its display themes, dedupe, cap at 6,
 * pad from a fixed order when the ledger is sparse. Same brief ⇒ same
 * themes; the ordering is the brief's, never recomputed here.
 */
export function deriveThemesFromBrief(brief: IdentityBrief): CheckInThemeName[] {
  const themes: CheckInThemeName[] = [];

  for (const signal of brief.topSignals) {
    for (const theme of themesForSignal(signal.signal)) {
      if (themes.length >= THEME_COUNT_MAX) break;
      if (!themes.includes(theme)) {
        themes.push(theme);
      }
    }
    if (themes.length >= THEME_COUNT_MAX) break;
  }

  for (const padding of THEME_PADDING) {
    if (themes.length >= THEME_COUNT_MIN) break;
    if (!themes.includes(padding)) {
      themes.push(padding);
    }
  }

  return themes;
}

// ---------------------------------------------------------------------------
// Shadow comparison (development only)
// ---------------------------------------------------------------------------

/** First line of a newline-encoded item ("Name\n…" → "Name"). */
function firstLine(value: string): string {
  return value.split("\n")[0]?.trim() ?? "";
}

export type CurrentSelfDraftComparison = {
  title: { legacy: string; brief: string };
  summaryParagraphs: { legacy: number; brief: number };
  valueNames: { legacy: string[]; brief: string[] };
  fearThemes: { legacy: string[]; brief: string[] };
  coreTensionLength: { legacy: number; brief: number };
  coreTradeoffPresent: { legacy: boolean; brief: boolean };
  recentGrowthCount: { legacy: number; brief: number };
  themes: { legacy: string[]; brief: string[] };
};

/**
 * Structural diff of the two engines' drafts, for the development shadow log.
 * Prose quality can't be diffed mechanically — this surfaces what CAN be:
 * which values/fears each engine chose, and whether any section vanished.
 * The full drafts are logged beside it for human review.
 */
export function compareCurrentSelfDrafts(
  legacy: MockCurrentSelfDraft,
  brief: CurrentSelfFromBriefDraft,
  briefThemes: CheckInThemeName[],
): CurrentSelfDraftComparison {
  return {
    title: { legacy: legacy.title, brief: brief.title },
    summaryParagraphs: {
      legacy: legacy.summary.split(/\n\s*\n/).length,
      brief: brief.summary.split(/\n\s*\n/).length,
    },
    valueNames: {
      legacy: legacy.values.map(firstLine),
      brief: brief.values.map(firstLine),
    },
    fearThemes: {
      legacy: legacy.afraid_of_becoming.map(firstLine),
      brief: brief.afraid_of_becoming.map(firstLine),
    },
    coreTensionLength: {
      legacy: legacy.core_tension.length,
      brief: brief.core_tension.length,
    },
    coreTradeoffPresent: {
      legacy: Boolean(legacy.core_tradeoff?.trim()),
      brief: Boolean(brief.core_tradeoff?.trim()),
    },
    recentGrowthCount: {
      legacy: legacy.recent_growth.length,
      brief: brief.recent_growth.length,
    },
    themes: { legacy: legacy.themes, brief: briefThemes },
  };
}
