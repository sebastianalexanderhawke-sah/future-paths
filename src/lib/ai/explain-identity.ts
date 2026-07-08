import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

import {
  getAnthropicApiKey,
  getClaudeModel,
  getGenerationTimeoutMs,
  resolveProviderForMode,
} from "@/lib/ai/config";
import type { IdentityProfile } from "@/lib/identity-library";
import type {
  DimensionContribution,
  IdentityMatchWithAttribution,
  ObservationContribution,
  SituationContribution,
} from "@/lib/identity-recognition";
import type { FutureSelfEvidenceStrength } from "@/types/enums";

/**
 * The narrative layer of one Future Self, encoded into the existing
 * future_selves columns (newline-encoded multi-part strings, the same idiom
 * current_self uses for values/fears/tradeoff):
 *
 * - why_emerging — "Why this future is becoming more likely": exactly three
 *   evidence bullets, one per line, newline-separated.
 * - growth_opportunities — legacy column, no longer generated or rendered;
 *   persisted as [] on regeneration.
 * - blind_spots — "The Cost of Becoming Them": a single prose paragraph in a
 *   one-element array (pre-v2 rows hold three short risk labels instead).
 * - likely_evolution — "Where this path leads" narrative, then a newline,
 *   then the card's closing reflective question (always the last line).
 */
export type IdentityExplanation = {
  why_emerging: string;
  growth_opportunities: string[];
  blind_spots: string[];
  likely_evolution: string;
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
  | "format_upgrade"
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
  narrative_source?: string | null;
  narrative_evidence_strength?: string | null;
  likely_evolution?: string | null;
};

/**
 * Decides whether an identity's Layer 2 narrative (why_emerging,
 * growth_opportunities, blind_spots, likely_evolution) needs to be
 * generated this run, or whether the existing narrative stays as-is.
 *
 * Layer 1 (percentage, confidence, dimension_breakdown, supporting
 * observations/situations, evidence_strength, trend) is recomputed by the
 * recognition engine and persisted every run regardless of this decision —
 * see generateFutureSelves.
 *
 * Future Selves narratives are stable future-identity portraits, not
 * per-situation output, so stability is the default: percentage movement,
 * reactivation after fading, and ordinary situations never regenerate. A
 * narrative regenerates in exactly four cases:
 *
 *   1. "new" — the identity has no row at all.
 *   2. "fallback_repair" — the stored narrative came from the hard-coded
 *      fallback (the AI call failed when it was written). Without this, a
 *      transient failure at first emergence made generic boilerplate the
 *      identity's permanent narrative.
 *   3. "format_upgrade" — the stored narrative predates the v2 "possible
 *      lives" format. A v2 narrative always carries its closing reflective
 *      question as a final newline-separated line of likely_evolution, so a
 *      stored narrative without a newline is pre-v2 and regenerates once.
 *   4. "evidence_tier_increased" — the evidence tier is now HIGHER than the
 *      tier the narrative was written at (Emerging → Moderate → Strong).
 *      A narrative written at Emerging says the evidence is limited; once
 *      the identity is Strong that framing contradicts the numbers shown
 *      beside it. Only increases regenerate — a decrease (evidence decaying)
 *      does not — so tier oscillation around a boundary can never cause
 *      regeneration churn: each identity regenerates at most twice over its
 *      lifetime on this path.
 */
export function needsExplanationRegeneration(
  existing: ExistingNarrativeRow | undefined,
  currentEvidenceStrength: FutureSelfEvidenceStrength,
): ExplanationRegenerationDecision {
  if (!existing) {
    return { regenerate: true, reason: "new" };
  }

  if (existing.narrative_source === "fallback") {
    return { regenerate: true, reason: "fallback_repair" };
  }

  if (
    typeof existing.likely_evolution === "string" &&
    !existing.likely_evolution.includes("\n")
  ) {
    return { regenerate: true, reason: "format_upgrade" };
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

// The model responds in the v2 "possible lives" shape; the mapping below
// encodes it into the existing IdentityExplanation columns. Caps are headroom,
// not targets (the prompt asks for less) — the model overshoots in large
// batches, and a few long sentences shouldn't discard an otherwise valid batch.
const explanationItemSchema = z.object({
  identity_id: z.string().trim().min(1),
  becoming_likely: z.array(z.string().trim().min(1).max(260)).min(2).max(4),
  cost_of_becoming: z.string().trim().min(1).max(1200),
  where_path_leads: z.string().trim().min(1).max(1200),
  reflective_question: z.string().trim().min(1).max(320),
});

// The v2 fields are prose paragraphs; the card's format contract (question =
// last newline-separated line of likely_evolution, one bullet per line of
// why_emerging) requires each part to be single-line.
function singleLine(text: string): string {
  return text.replace(/\s*\n+\s*/g, " ").trim();
}

const batchResponseSchema = z.object({
  identities: z.array(explanationItemSchema),
});

// ---------------------------------------------------------------------------
// Fallback
// ---------------------------------------------------------------------------

export function fallbackExplanation(
  evidenceStrength?: FutureSelfEvidenceStrength,
): IdentityExplanation {
  if (evidenceStrength === "Emerging") {
    return {
      why_emerging: [
        "A small number of recent choices have started pointing in this direction.",
        "The pattern has appeared in more than one situation, though not yet across many.",
        "Nothing you've recorded so far pushes against it.",
      ].join("\n"),
      growth_opportunities: [],
      blind_spots: [
        "Every future asks for something, and this one would be no exception — the price would come from the same place as the strength, paid slowly, in trades small enough to feel reasonable one at a time. It's too early to say exactly what this version of you would give up; that becomes visible as the pattern repeats.",
      ],
      likely_evolution:
        "It's early. If the recent pattern keeps repeating, your days would begin to reorganize around it — quietly at first, in small choices that start to point the same way, long before anyone else would call it who you are.\nIf this direction kept pulling at you, would you follow it on purpose — or only notice it years later?",
    };
  }

  return {
    why_emerging: [
      "This pattern has repeated across several of your recorded situations.",
      "Your recent decisions keep resolving in the direction this future points.",
      "The behavior shows up in different contexts, not just one recurring one.",
    ].join("\n"),
    growth_opportunities: [],
    blind_spots: [
      "Becoming this version of yourself would cost something real, and the cost would come from the same strengths that built it — paid gradually, in trades that each feel reasonable on the day you make them. What exactly this life would ask you to give up becomes clearer as more of your decisions are recorded.",
    ],
    likely_evolution:
      "A person shaped by this becomes recognizable for it — it slowly decides what they take on, how they spend ordinary days, and what the people around them come to count on them for.\nIf this became your life, what would you hope you never lost along the way?",
  };
}

function fallbackResults(
  entries: Array<{ profile: IdentityProfile; match: IdentityMatchWithAttribution }>,
): IdentityExplanationResult[] {
  return entries.map(({ match }) => ({
    identityId: match.identityId,
    explanation: fallbackExplanation(match.evidenceStrength),
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

function buildSystemPrompt(): string {
  return `You write Future Selves — believable versions of one person ten years from now, grown from their actual recorded behavior.

These future identities were recognized deterministically from the user's behavioral data. Your role is strictly interpretive — you never invent identities, rename them, or adjust any numerical values. Each identity answers exactly one question: "If nothing changes, who does this person slowly become?"

Write like a letter from ten years in the future: emotionally honest, psychologically insightful, calm, vivid, deeply human. Never melodramatic, never manipulative, never moralizing. Never imply one future is objectively better than another — every future contains both beauty and sacrifice. Address the user as "you". This is a possible life, not a personality assessment, and it must never read like one: no traits, no types, no diagnoses. When someone finishes reading, they should think "I understand exactly who I would become if I kept living like this" — and feel either "I could actually become this person" or "I really don't want to become this version of myself". Both reactions are success; steering them toward either is failure.

Multiple futures coexisting is normal — one person could grow into any of them. But they are DIFFERENT LIVES, not different descriptions of the same person: if all the futures in this response sat around one table, they must read as completely different people — different things matter to them, different people rely on them, their ordinary Tuesdays look nothing alike. Distinctness is a hard requirement: no sentence you write should be transplantable to another identity in this response, and no two futures may reduce to the same trait ("ambitious", "independent", "resilient") wearing different names. Vary sentence openers across identities — if two begin the same way, rewrite one.

Return a JSON object with exactly this shape:

{
  "identities": [
    {
      "identity_id": "<exactly as provided — no changes>",
      "becoming_likely": ["<exactly 3 short evidence bullets>"],
      "cost_of_becoming": "<one prose paragraph>",
      "where_path_leads": "<one prose paragraph>",
      "reflective_question": "<one question>"
    }
  ]
}

Rules for each field:
- identity_id: copy exactly from the input. Any change makes the result unusable.
- becoming_likely: exactly 3 bullets, rendered under "Why this future is becoming more likely". Each is one concise sentence (8–16 words) naming a RECURRING pattern observed across multiple situations — the register of "You repeatedly choose ownership over certainty." or "You keep returning to difficult work after setbacks." Evidence, not personality traits, not summaries: every bullet must be traceable to the supporting observations and situations provided, and must describe repetition ("repeatedly", "keep", "consistently"), never a one-time event. Second person, present tense, no hedging. Single line each — no newline characters anywhere.
- cost_of_becoming: one prose paragraph (3–5 sentences, at most 700 characters), rendered under "The Cost of Becoming Them". This is the emotional center of the card. It reveals what this person slowly loses by becoming this version of themselves — and the loss must grow out of the SAME strengths that build the future, never out of a separate flaw. Quiet, believable, cumulative — the register of "One day you'll realize every time someone offered to help, you said 'I've got it.' At first it made you capable. Eventually it made you alone." Never catastrophic, never a warning, never advice, never a failure — a hidden price, paid gradually. Banned: bullet lists, one-word risk labels ("Burnout", "Isolation", "Overthinking"), the words "risk" and "blind spot". No newline characters.
- where_path_leads: one prose paragraph (3–5 sentences, at most 700 characters), rendered under "Where this path leads". Describe the LIFE this person gradually builds — what becomes important to them, how the people around them come to experience them, what ordinary days turn into — so the reader feels like meeting that future version of themselves. Ground it in this user's actual evidence: project their specific situations forward, so another person with the same future identity but different evidence would get a visibly different life. Write about the person, never the pattern: sentences about patterns continuing, identities strengthening, evidence accumulating, or choices repeating are system mechanics and are banned ("If these patterns continue", "this identity will strengthen" must not appear). Never mention the measurement machinery: the words "score", "dimension", "percentage", "likelihood", and "evidence strength" must not appear — the user sees the life, never the instrument. Do not open more than one of these in the same response with the same construction. No newline characters.
- reflective_question: exactly one question (at most 200 characters) that closes the card. It must make the reader decide whether they actually WANT this future, by naming the real trade this specific life makes — the register of "Would you still choose this path if success required trusting other people as much as yourself?" or "At what point does freedom stop feeling like distance?". Unique to this identity: it must not be reusable under any other identity in this response, and generic questions ("Is this what you want?") are banned. Genuinely open — not rhetorical, not leading, not moralizing. Must end with "?". No newline characters.

When an identity's evidence strength is "Emerging", let becoming_likely acknowledge that the pattern is young — real, but seen in only a few situations so far. where_path_leads stays a person-level portrait even for Emerging identities — temper it by describing a quieter or earlier version of the future person, never by discussing evidence quantity or pattern mechanics. Keep the tone confident and observational — never hedging or apologetic ("might", "possibly", "hard to say", "not sure yet"). This is a distinct framing from Moderate or Strong identities, not a weaker version of the same portrait.

Include one entry per identity provided — do not add or omit any. Do not use generic coaching language. Be specific to the evidence provided. Do not add fields beyond those specified.`;
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
Description: ${profile.short_description}

Typical behaviors:
${behaviors}

Recognition data (report these values exactly — do not change them):
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

function buildUserPrompt(
  entries: Array<{ profile: IdentityProfile; match: IdentityMatchWithAttribution }>,
): string {
  const total = entries.length;
  const label = total === 1 ? "identity" : "identities";
  const blocks = entries
    .map(({ profile, match }, i) => buildIdentityBlock(i, total, profile, match))
    .join("\n\n");

  return `${total} recognized ${label} to explain:\n\n${blocks}\n\nReturn the JSON object with explanations for all ${total} ${label}.`;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Generates explanations for all recognized identities in a single AI request.
 *
 * Always returns one result per entry. If the AI response is missing an entry
 * or the entire request fails, affected entries receive a fallback explanation
 * so generation never blocks.
 */
export async function explainIdentities(
  entries: Array<{ profile: IdentityProfile; match: IdentityMatchWithAttribution }>,
): Promise<IdentityExplanationResult[]> {
  if (entries.length === 0) {
    return [];
  }

  const providerMode = resolveProviderForMode();

  if (providerMode === "mock") {
    return fallbackResults(entries);
  }

  const apiKey = getAnthropicApiKey();
  if (!apiKey) {
    return fallbackResults(entries);
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
        // Sized for a 5-identity batch of possible-life portraits (evidence
        // bullets, cost paragraph, life paragraph, closing question per
        // identity) — 2048 truncated the older, smaller format already.
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
        messages: [{ role: "user", content: buildUserPrompt(entries) }],
      },
      { signal: controller.signal },
    );

    clearTimeout(timeout);

    console.log(
      `[ai-usage] ${JSON.stringify({
        promptId: "explain_identity.batch",
        provider: "claude",
        success: true,
        durationMs: Date.now() - startedAt,
        entryCount: entries.length,
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
      console.warn("[explainIdentities] Empty response — using fallback narratives.");
      return fallbackResults(entries);
    }

    const raw = extractJson(text);
    const parsed = batchResponseSchema.parse(raw);

    // Index by identity_id so we can merge back in input order.
    // Any identity the model omitted gets a fallback — partial failures
    // don't block the rest. The v2 response shape is encoded here into the
    // existing columns (see the IdentityExplanation doc comment).
    const byIdentityId = new Map(
      parsed.identities.map((item) => [
        item.identity_id,
        {
          why_emerging: item.becoming_likely.map(singleLine).join("\n"),
          growth_opportunities: [],
          blind_spots: [singleLine(item.cost_of_becoming)],
          likely_evolution: `${singleLine(item.where_path_leads)}\n${singleLine(item.reflective_question)}`,
        } satisfies IdentityExplanation,
      ]),
    );

    return entries.map(({ match }) => {
      const explanation = byIdentityId.get(match.identityId);
      return explanation
        ? { identityId: match.identityId, explanation, source: "ai" as const }
        : {
            identityId: match.identityId,
            explanation: fallbackExplanation(match.evidenceStrength),
            source: "fallback" as const,
          };
    });
  } catch (error) {
    // Failures degrade to fallback narratives (repaired on a later run via
    // narrative_source) — keep the diagnostic that explains why.
    const detail =
      error instanceof z.ZodError
        ? JSON.stringify(error.issues)
        : error instanceof Error
          ? error.message
          : String(error);
    console.error(`[explainIdentities] Generation failed — using fallback narratives: ${detail}`);
    return fallbackResults(entries);
  }
}
