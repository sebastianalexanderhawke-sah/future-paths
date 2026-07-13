import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

import {
  getAnthropicApiKey,
  getClaudeModel,
  getGenerationTimeoutMs,
  resolveProviderForMode,
} from "@/lib/ai/config";
import type { RankedFuture } from "@/lib/identity-brief";
import type { IdentityProfile } from "@/lib/identity-library";
import type {
  DimensionContribution,
  IdentityMatchWithAttribution,
  ObservationContribution,
  SituationContribution,
} from "@/lib/identity-recognition";
import type { FutureSelfEvidenceStrength } from "@/types/enums";

/**
 * The AI-personalized layer of one Future Self (Phase 6 — the library is
 * fully deterministic, so this is ALL the AI ever writes):
 *
 * - why_emerging — "Why Reflection Believes This": exactly three evidence
 *   bullets, one per line, newline-separated.
 * - personalized_summary — the one "why is this emerging right now"
 *   sentence, rendered between the archetype quote and the Likelihood row
 *   and persisted as future_selves.summary.
 *
 * Everything else on the card (quote, becomes, strengthens, tradeoffs) is
 * permanent editorial copy in the identity library — never AI output, never
 * regenerated. Persistence writes those sections from the library on every
 * run (see generateFutureSelves).
 */
export type IdentityExplanation = {
  why_emerging: string;
  personalized_summary: string;
};

export type IdentityExplanationSource = "ai" | "fallback";

export type IdentityExplanationResult = {
  identityId: string;
  explanation: IdentityExplanation;
  /**
   * Whether this explanation came from real AI generation or the hard-coded
   * fallback. Persisted as future_selves.narrative_source so a fallback
   * narrative is repaired on a later run instead of becoming permanent.
   */
  source: IdentityExplanationSource;
};

// ---------------------------------------------------------------------------
// Regeneration decision
// ---------------------------------------------------------------------------

export type ExplanationRegenerationReason =
  | "new"
  | "fallback_repair"
  | "identity_renamed"
  | "personalization_missing"
  | "evidence_tier_increased"
  | "stable";

export type ExplanationRegenerationDecision = {
  regenerate: boolean;
  reason: ExplanationRegenerationReason;
};

const EVIDENCE_TIER_RANK: Record<FutureSelfEvidenceStrength, number> = {
  Emerging: 0,
  Moderate: 1,
  Strong: 2,
};

function evidenceTierRank(value: string | null | undefined): number | null {
  if (value && value in EVIDENCE_TIER_RANK) {
    return EVIDENCE_TIER_RANK[value as FutureSelfEvidenceStrength];
  }
  return null;
}

export type ExistingNarrativeRow = {
  name?: string | null;
  summary?: string | null;
  narrative_source?: string | null;
  narrative_evidence_strength?: string | null;
};

/**
 * Decides whether an identity's AI-personalized layer (why_emerging and the
 * personalized summary sentence) needs to be generated this run, or whether
 * the existing one stays as-is.
 *
 * Layer 1 (percentage, confidence, dimension_breakdown, supporting
 * observations/situations, evidence_strength, trend) is recomputed by the
 * recognition engine and persisted every run regardless of this decision,
 * and the permanent curated sections are rewritten from the library every
 * run — neither ever involves this function.
 *
 * Personalization is stable by default: percentage movement, reactivation
 * after fading, and ordinary situations never regenerate. It regenerates in
 * exactly five cases:
 *
 *   1. "new" — the identity has no row at all.
 *   2. "fallback_repair" — the stored personalization came from the
 *      hard-coded fallback (the AI call failed when it was written).
 *      Without this, a transient failure at first emergence made generic
 *      boilerplate permanent.
 *   3. "identity_renamed" — the row's stored name differs from the
 *      identity's current canonical_name: a rename epoch. The persistence
 *      step rewrites name to canonical_name in the same run, so this fires
 *      exactly once per rename and can never loop.
 *   4. "personalization_missing" — the row's summary is empty or still
 *      holds the library short_description, meaning the personalized
 *      sentence has never been written (the Phase 5 migration state). After
 *      regeneration the summary holds the personalized sentence and can
 *      never equal the library description again.
 *   5. "evidence_tier_increased" — the evidence tier is now HIGHER than the
 *      tier the personalization was written at (Emerging → Moderate →
 *      Strong). Evidence bullets written at Emerging call the pattern
 *      young; once the identity is Strong that framing contradicts the
 *      numbers beside it. Only increases regenerate — a decrease (evidence
 *      decaying) does not — so tier oscillation around a boundary can never
 *      cause churn.
 */
export function needsExplanationRegeneration(
  existing: ExistingNarrativeRow | undefined,
  currentEvidenceStrength: FutureSelfEvidenceStrength,
  currentCanonicalName?: string,
  libraryShortDescription?: string,
): ExplanationRegenerationDecision {
  if (!existing) {
    return { regenerate: true, reason: "new" };
  }

  if (existing.narrative_source === "fallback") {
    return { regenerate: true, reason: "fallback_repair" };
  }

  if (
    typeof existing.name === "string" &&
    existing.name.length > 0 &&
    typeof currentCanonicalName === "string" &&
    currentCanonicalName.length > 0 &&
    existing.name !== currentCanonicalName
  ) {
    return { regenerate: true, reason: "identity_renamed" };
  }

  const summary = existing.summary?.trim();
  if (!summary || summary === libraryShortDescription) {
    return { regenerate: true, reason: "personalization_missing" };
  }

  const writtenAtRank = evidenceTierRank(existing.narrative_evidence_strength);
  const currentRank = evidenceTierRank(currentEvidenceStrength);

  if (writtenAtRank !== null && currentRank !== null && currentRank > writtenAtRank) {
    return { regenerate: true, reason: "evidence_tier_increased" };
  }

  return { regenerate: false, reason: "stable" };
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

// The model personalizes, it never narrates — one "why now" sentence plus
// the evidence bullets, nothing else. Caps are headroom, not targets.
const personalizationItemSchema = z.object({
  identity_id: z.string().trim().min(1),
  emerging_summary: z.string().trim().min(1).max(300),
  becoming_likely: z.array(z.string().trim().min(1).max(260)).min(2).max(4),
});

// The model's fields are prose; the format contract (one evidence bullet per
// line of why_emerging, a single-line summary) requires each part to be
// single-line.
function singleLine(text: string): string {
  return text.replace(/\s*\n+\s*/g, " ").trim();
}

// Items are validated individually, not as one array schema: the model
// occasionally returns an otherwise-valid batch with one field missing on one
// identity, and a whole-batch parse turned that single bad item into fallback
// results for every identity in the request. An invalid item simply never
// reaches the by-id map, so only that identity falls back (the same path an
// omitted identity already takes).
const batchResponseSchema = z.object({
  identities: z.array(z.unknown()),
});

// ---------------------------------------------------------------------------
// Fallback
// ---------------------------------------------------------------------------

export function fallbackExplanation(
  evidenceStrength?: FutureSelfEvidenceStrength,
): IdentityExplanation {
  // Source "fallback" marks the row for repair on a later run.
  if (evidenceStrength === "Emerging") {
    return {
      personalized_summary:
        "A few of your recent choices have started pointing this way.",
      why_emerging: [
        "A small number of recent choices have started pointing in this direction.",
        "The pattern has appeared in more than one situation, though not yet across many.",
        "Nothing you've recorded so far pushes against it.",
      ].join("\n"),
    };
  }

  return {
    personalized_summary: "Your recorded choices keep pointing in this direction.",
    why_emerging: [
      "This pattern has repeated across several of your recorded situations.",
      "Your recent decisions keep resolving in the direction this future points.",
      "The behavior shows up in different contexts, not just one recurring one.",
    ].join("\n"),
  };
}

/** What the batch runner needs to know about each identity: enough to merge
 *  results back in order and to build a tier-appropriate fallback. */
type ExplanationTarget = {
  identityId: string;
  evidenceStrength: FutureSelfEvidenceStrength;
};

function fallbackResults(targets: ExplanationTarget[]): IdentityExplanationResult[] {
  return targets.map((target) => ({
    identityId: target.identityId,
    explanation: fallbackExplanation(target.evidenceStrength),
    source: "fallback",
  }));
}

// ---------------------------------------------------------------------------
// JSON extraction
// ---------------------------------------------------------------------------

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced?.[1]) return JSON.parse(fenced[1].trim());

    const start = trimmed.indexOf("{");
    if (start >= 0) return JSON.parse(trimmed.slice(start));

    throw new Error("Response did not contain JSON.");
  }
}

// ---------------------------------------------------------------------------
// Prompt builders
// ---------------------------------------------------------------------------

/**
 * The one system prompt. Identity cards are fixed editorial content — the
 * model must never write, rewrite, or summarize the card. It personalizes
 * exactly two things: the "why now" sentence and the evidence bullets.
 */
function buildSystemPrompt(): string {
  return `You connect a user's recorded behavior to Future Self identities that were recognized deterministically from their behavioral data. The identity cards themselves are fixed editorial content — you never write, rewrite, or summarize the card. Your entire job is to show this user why each identity fits THEM, right now.

WRITE PLAINLY: simple, clear, everyday language. No poetic or abstract writing, no imagery, no metaphors. Address the user as "you". Do not mention the measurement machinery: "score", "dimension", "percentage", "likelihood", and "evidence strength" must not appear. No psychology vocabulary.

Return a JSON object with exactly this shape:

{
  "identities": [
    {
      "identity_id": "<exactly as provided — no changes>",
      "emerging_summary": "<one short sentence>",
      "becoming_likely": ["<exactly 3 short evidence bullets>"]
    }
  ]
}

Rules for each field:
- identity_id: copy exactly from the input. Any change makes the result unusable.
- emerging_summary: ONE short sentence (at most ~20 words) telling the user why this future self is currently emerging from their recorded behavior — a bridge between their actual recent choices and this identity. Grounded in the evidence provided, but general enough to survive any single situation ending ("You keep taking on the projects nobody assigned you" — not "Because of the kitchen renovation"). Present tense, addressed to "you", no hedging, never a question, and never a restatement of the identity's own description.
- becoming_likely: exactly 3 bullets, rendered under "Why Reflection Believes This". This is where the claim gets proven — the ONLY field built from the user's concrete world. Each bullet is one concise sentence (8–16 words) naming a RECURRING choice-pattern observed across the user's recorded situations, reflections, and check-ins, and each must visibly exercise the identity's dominant trait. Evidence, not personality traits, not summaries: every bullet must be traceable to the supporting observations and situations provided, and must describe repetition, never a one-time event. Show the repetition through content — a count, a span of time, a return after failure, the same choice made in different arenas — not through stock adverb openers: across one entry's three bullets use three different sentence shapes, and never default to the "You repeatedly / You keep / You consistently" trio. Always addressed to the user — "you"/"your" or an implied subject — never "she", "he", or "they". Present tense, no hedging. Single line each — no newline characters anywhere.

When an entry's evidence strength is "Emerging", let becoming_likely acknowledge that the pattern is young — real, but seen in only a few situations so far. Keep the tone confident and observational, never hedging.

No bullet or sentence you write may be transplantable to another entry in this response. Include one entry per identity provided — do not add or omit any. Do not add fields beyond those specified.`;
}

function formatDimensions(dims: DimensionContribution[]): string {
  return dims
    .slice(0, 5)
    .map(
      (d) =>
        `  ${d.dimension}: weight ${d.identityWeight.toFixed(1)}, user score ${d.userScore.toFixed(1)}, contribution ${d.contribution.toFixed(1)}`,
    )
    .join("\n");
}

function formatObservations(obs: ObservationContribution[]): string {
  return obs
    .slice(0, 5)
    .map((o) => `  - "${o.observationText}" (from: ${o.momentTitle})`)
    .join("\n");
}

function formatSituations(sits: SituationContribution[]): string {
  return sits
    .slice(0, 5)
    .map(
      (s) =>
        `  - ${s.momentTitle} (${s.observationCount} observation${s.observationCount !== 1 ? "s" : ""})`,
    )
    .join("\n");
}

function buildIdentityBlock(
  index: number,
  total: number,
  profile: IdentityProfile,
  match: IdentityMatchWithAttribution,
): string {
  const behaviors = profile.typical_behaviors.map((b, i) => `  ${i + 1}. ${b}`).join("\n");
  const supportingDims = match.dimensionBreakdown.filter((d) => d.contribution > 0);
  const opposingDims = match.opposingDimensions;

  const supportingObsText = match.supportingObservations.length
    ? formatObservations(match.supportingObservations)
    : "  None recorded yet.";

  const situationsText = match.supportingSituations.length
    ? formatSituations(match.supportingSituations)
    : "  None recorded yet.";

  const opposingObsText = match.opposingObservations.length
    ? match.opposingObservations
        .slice(0, 3)
        .map((o) => `  - "${o.observationText}"`)
        .join("\n")
    : "  None.";

  const opposingDimsText = opposingDims.length
    ? opposingDims
        .slice(0, 3)
        .map((d) => `  ${d.dimension}: contribution ${d.contribution.toFixed(1)}`)
        .join("\n")
    : "  None.";

  return `--- Identity ${index + 1} of ${total} ---
identity_id: ${match.identityId}
Name: ${profile.canonical_name}
Dominant trait (personalize toward this trait): ${profile.trait}
Description: ${profile.short_description}

Typical behaviors:
${behaviors}

Recognition data (context only — never mention these values):
  Likelihood: ${match.likelihood}%
  Confidence: ${match.confidence}%
  Evidence strength: ${match.evidenceStrength}

Supporting dimensions (${supportingDims.length} contributing positively):
${supportingDims.length ? formatDimensions(supportingDims) : "  None."}

Supporting behavioral observations (${match.supportingObservations.length} total):
${supportingObsText}

Supporting situations where this pattern was observed:
${situationsText}

Opposing dimensions (working against this pattern):
${opposingDimsText}

Opposing observations:
${opposingObsText}`;
}

// Exported for tests and prompt-size measurement only — production callers
// go through explainIdentities / explainIdentitiesFromBrief.
export function buildUserPrompt(
  entries: Array<{ profile: IdentityProfile; match: IdentityMatchWithAttribution }>,
): string {
  const total = entries.length;
  const label = total === 1 ? "identity" : "identities";
  const blocks = entries
    .map(({ profile, match }, i) => buildIdentityBlock(i, total, profile, match))
    .join("\n\n");

  return `${total} recognized ${label} to personalize:\n\n${blocks}\n\nReturn the JSON object with entries for all ${total} ${label}.`;
}

// ---------------------------------------------------------------------------
// Brief-based prompt builders (Behavior Engine v4, phase 5)
// ---------------------------------------------------------------------------
//
// The brief-mode counterpart of buildIdentityBlock: the same block structure,
// built from RankedFuture's re-exposed attribution instead of a live
// IdentityMatchWithAttribution. Two deliberate differences:
//   - evidence lines carry no situation titles (the brief never inspects
//     moments; observation texts are written to stand alone), and
//   - the per-situation list is replaced by the uncapped breadth counts.
// The system prompt is shared — the personalization rules must stay
// identical across both modes.

export type BriefExplanationEntry = {
  profile: IdentityProfile;
  future: RankedFuture;
};

function formatBriefEvidence(evidence: RankedFuture["supportingEvidence"]): string {
  if (!evidence?.length) return "  None recorded yet.";
  return evidence
    .slice(0, 5)
    .map((item) => `  - "${item.observation}"`)
    .join("\n");
}

function buildIdentityBlockFromBrief(
  index: number,
  total: number,
  profile: IdentityProfile,
  future: RankedFuture,
): string {
  const behaviors = profile.typical_behaviors.map((b, i) => `  ${i + 1}. ${b}`).join("\n");
  const supportingDims = future.supportingDimensions ?? [];
  const opposingDims = future.opposingDimensions ?? [];
  const opposingEvidence = future.opposingEvidence ?? [];

  const situationCount = future.supportingSituationCount ?? 0;
  const observationCount = future.supportingObservationCount ?? 0;

  return `--- Identity ${index + 1} of ${total} ---
identity_id: ${future.identityId}
Name: ${profile.canonical_name}
Dominant trait (personalize toward this trait): ${profile.trait}
Description: ${profile.short_description}

Typical behaviors:
${behaviors}

Recognition data (context only — never mention these values):
  Likelihood: ${future.likelihood}%
  Confidence: ${future.confidence}%
  Evidence strength: ${future.evidenceStrength}

Supporting dimensions (${supportingDims.length} contributing positively):
${supportingDims.length ? formatDimensions(supportingDims) : "  None."}

Supporting behavioral observations (top ${Math.min(future.supportingEvidence?.length ?? 0, 5)} of ${observationCount} total):
${formatBriefEvidence(future.supportingEvidence)}

Pattern breadth: observed across ${situationCount} distinct situation${situationCount !== 1 ? "s" : ""}.

Opposing dimensions (working against this pattern):
${
  opposingDims.length
    ? opposingDims
        .slice(0, 3)
        .map((d) => `  ${d.dimension}: contribution ${d.contribution.toFixed(1)}`)
        .join("\n")
    : "  None."
}

Opposing observations:
${
  opposingEvidence.length
    ? opposingEvidence
        .slice(0, 3)
        .map((item) => `  - "${item.observation}"`)
        .join("\n")
    : "  None."
}`;
}

// Exported for tests and prompt-size measurement only.
export function buildUserPromptFromBrief(entries: BriefExplanationEntry[]): string {
  const total = entries.length;
  const label = total === 1 ? "identity" : "identities";
  const blocks = entries
    .map(({ profile, future }, i) => buildIdentityBlockFromBrief(i, total, profile, future))
    .join("\n\n");

  return `${total} recognized ${label} to personalize:\n\n${blocks}\n\nReturn the JSON object with entries for all ${total} ${label}.`;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Generates the personalized layer for all recognized identities in a single
 * AI request. Always returns one result per entry, in entry order. If the AI
 * response is missing an entry or the entire request fails, affected entries
 * receive a fallback so generation never blocks.
 */
export async function explainIdentities(
  entries: Array<{ profile: IdentityProfile; match: IdentityMatchWithAttribution }>,
): Promise<IdentityExplanationResult[]> {
  if (entries.length === 0) {
    return [];
  }

  return runPersonalizationBatch({
    targets: entries.map(({ match }) => ({
      identityId: match.identityId,
      evidenceStrength: match.evidenceStrength,
    })),
    userPrompt: buildUserPrompt(entries),
    promptId: "explain_identity.personalize",
  });
}

/**
 * Brief-mode personalization (Behavior Engine v4, phase 5): identical batch
 * semantics, fallback behavior, and system prompt as explainIdentities, but
 * the per-identity evidence block is built from RankedFuture's attribution —
 * the consumer never touches raw observations or the recognition engine.
 */
export async function explainIdentitiesFromBrief(
  entries: BriefExplanationEntry[],
): Promise<IdentityExplanationResult[]> {
  if (entries.length === 0) {
    return [];
  }

  return runPersonalizationBatch({
    targets: entries.map(({ future }) => ({
      identityId: future.identityId,
      evidenceStrength: future.evidenceStrength,
    })),
    userPrompt: buildUserPromptFromBrief(entries),
    promptId: "explain_identity.personalize_from_brief",
  });
}

async function runPersonalizationBatch(input: {
  targets: ExplanationTarget[];
  userPrompt: string;
  promptId: string;
}): Promise<IdentityExplanationResult[]> {
  const { targets, userPrompt, promptId } = input;

  const providerMode = resolveProviderForMode();

  if (providerMode === "mock") {
    return fallbackResults(targets);
  }

  const apiKey = getAnthropicApiKey();
  if (!apiKey) {
    return fallbackResults(targets);
  }

  const model = getClaudeModel();
  const startedAt = Date.now();

  try {
    const client = new Anthropic({ apiKey });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), getGenerationTimeoutMs());

    const response = await client.messages.create(
      {
        model,
        // Sized for a 5-identity batch (one sentence + three bullets each)
        // with generous headroom.
        max_tokens: 8192,
        temperature: 0.3,
        // Static system prompt marked as a cacheable prefix — cost only,
        // never affects output. See claude-provider for the same pattern.
        system: [
          {
            type: "text",
            text: buildSystemPrompt(),
            cache_control: { type: "ephemeral" },
          },
        ],
        messages: [{ role: "user", content: userPrompt }],
      },
      { signal: controller.signal },
    );

    clearTimeout(timeout);

    console.log(
      `[ai-usage] ${JSON.stringify({
        promptId,
        provider: "claude",
        success: true,
        durationMs: Date.now() - startedAt,
        entryCount: targets.length,
        inputTokens: response.usage?.input_tokens,
        outputTokens: response.usage?.output_tokens,
        cacheCreationInputTokens: response.usage?.cache_creation_input_tokens ?? undefined,
        cacheReadInputTokens: response.usage?.cache_read_input_tokens ?? undefined,
      })}`,
    );

    const text = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();

    if (!text) {
      console.warn("[explainIdentities] Empty response — using fallbacks.");
      return fallbackResults(targets);
    }

    const raw = extractJson(text);
    const parsed = batchResponseSchema.parse(raw);

    // Index by identity_id so we can merge back in input order. Any identity
    // the model omitted OR returned malformed gets a fallback — partial
    // failures don't block the rest.
    const byIdentityId = new Map<string, IdentityExplanation>();
    for (const rawItem of parsed.identities) {
      const item = personalizationItemSchema.safeParse(rawItem);
      if (!item.success) {
        console.warn(
          `[explainIdentities] Dropping malformed item — it falls back alone: ${JSON.stringify(item.error.issues)}`,
        );
        continue;
      }
      byIdentityId.set(item.data.identity_id, {
        why_emerging: item.data.becoming_likely.map(singleLine).join("\n"),
        personalized_summary: singleLine(item.data.emerging_summary),
      } satisfies IdentityExplanation);
    }

    return targets.map((target) => {
      const explanation = byIdentityId.get(target.identityId);
      return explanation
        ? { identityId: target.identityId, explanation, source: "ai" as const }
        : {
            identityId: target.identityId,
            explanation: fallbackExplanation(target.evidenceStrength),
            source: "fallback" as const,
          };
    });
  } catch (error) {
    // Failures degrade to fallbacks (repaired on a later run via
    // narrative_source) — keep the diagnostic that explains why.
    const detail =
      error instanceof z.ZodError
        ? JSON.stringify(error.issues)
        : error instanceof Error
          ? error.message
          : String(error);
    console.error(`[explainIdentities] Generation failed — using fallbacks: ${detail}`);
    return fallbackResults(targets);
  }
}
